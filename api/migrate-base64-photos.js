// /api/migrate-base64-photos — one-time cleanup for photos uploaded before
// the storage fix: finds rows where photo_url is still a base64 data URL
// (rather than a real storage URL), decodes and uploads each to the
// profile-photos bucket, then updates the row to point at the new real
// URL. Idempotent — anything already a real http(s) URL is left alone,
// so this is always safe to run again (e.g. to pick up rows added between
// calls, or to resume after hitting the per-call batch limit).
//
// Admin-only: verifies the caller's own account has is_admin = true before
// doing anything, the same check used for staff-access approvals.
//
// Batched to stay within serverless execution limits — processes up to
// BATCH_SIZE rows per call and reports how many remain, so the caller
// (the Staff Panel button) can just keep calling this until remaining=0.

const BATCH_SIZE = 15;

function dataUrlToBuffer(dataUrl) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  const [, mimeType, base64] = match;
  return { buffer: Buffer.from(base64, 'base64'), mimeType };
}

async function migrateRow(table, row, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) {
  const decoded = dataUrlToBuffer(row.photo_url);
  if (!decoded) return { id: row.id, ok: false, error: 'not_a_data_url' };

  const ext = decoded.mimeType.includes('png') ? 'png'
    : decoded.mimeType.includes('webp') ? 'webp'
    : 'jpg';
  const path = `${row.user_id}/migrated-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const uploadResp = await fetch(
    `${SUPABASE_URL}/storage/v1/object/profile-photos/${path}`,
    {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': decoded.mimeType,
        'x-upsert': 'false',
        'Cache-Control': '31536000',
      },
      body: decoded.buffer,
    }
  );

  if (!uploadResp.ok) {
    const errText = await uploadResp.text().catch(() => '');
    return { id: row.id, ok: false, error: `upload_failed: ${errText.slice(0, 200)}` };
  }

  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/profile-photos/${path}`;

  const updateResp = await fetch(
    `${SUPABASE_URL}/rest/v1/${table}?id=eq.${row.id}`,
    {
      method: 'PATCH',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ photo_url: publicUrl }),
    }
  );

  if (!updateResp.ok) {
    return { id: row.id, ok: false, error: 'db_update_failed_after_upload' };
  }

  return { id: row.id, ok: true, newUrl: publicUrl };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'not_configured' });
  }

  try {
    // Authenticate and require admin
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'not_signed_in' });

    const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${token}` },
    });
    if (!userResp.ok) return res.status(401).json({ error: 'invalid_session' });
    const user = await userResp.json();
    if (!user?.id) return res.status(401).json({ error: 'invalid_session' });

    const accountResp = await fetch(
      `${SUPABASE_URL}/rest/v1/app_credit_accounts?user_id=eq.${user.id}&select=is_admin`,
      { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } }
    );
    const accountRows = await accountResp.json().catch(() => []);
    if (!accountRows?.[0]?.is_admin) {
      return res.status(403).json({ error: 'not_admin' });
    }

    // Find a batch of unmigrated rows across both tables
    const results = { migrated: [], failed: [] };
    let processedThisBatch = 0;

    for (const table of ['user_photos', 'user_profiles']) {
      if (processedThisBatch >= BATCH_SIZE) break;

      const remaining = BATCH_SIZE - processedThisBatch;
      const rowsResp = await fetch(
        `${SUPABASE_URL}/rest/v1/${table}?photo_url=like.data:*&select=id,user_id,photo_url&limit=${remaining}`,
        { headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` } }
      );
      const rows = await rowsResp.json().catch(() => []);
      if (!Array.isArray(rows)) continue;

      for (const row of rows) {
        const result = await migrateRow(table, row, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        if (result.ok) {
          results.migrated.push({ table, id: result.id });
        } else {
          results.failed.push({ table, id: result.id, error: result.error });
        }
        processedThisBatch++;
      }
    }

    // Check how many are left across both tables so the caller knows
    // whether to call again
    let remainingCount = 0;
    for (const table of ['user_photos', 'user_profiles']) {
      const countResp = await fetch(
        `${SUPABASE_URL}/rest/v1/${table}?photo_url=like.data:*&select=id`,
        {
          headers: {
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            Prefer: 'count=exact',
          },
        }
      );
      const contentRange = countResp.headers.get('content-range');
      const total = contentRange ? parseInt(contentRange.split('/')[1], 10) || 0 : 0;
      remainingCount += total;
    }

    return res.status(200).json({
      migrated_count: results.migrated.length,
      failed_count: results.failed.length,
      failed: results.failed,
      remaining: remainingCount,
    });
  } catch (err) {
    console.error('migrate-base64-photos error:', err);
    return res.status(500).json({ error: 'internal_error' });
  }
}
