// POST /api/delete-account
//
// The privacy policy has promised since launch that a member can delete
// their account and its data from account settings. Until now there was no
// control, no endpoint and no function. This is the endpoint.
//
// Order matters:
//   1. Verify the member's session. Nobody deletes anyone else.
//   2. Require the literal confirmation "DELETE" in the body, so a stray
//      request cannot do this.
//   3. scrub_my_account() - removes the rows the auth cascade would miss,
//      anonymises support tickets, writes the anonymised deletion log, and
//      refuses staff accounts.
//   4. Remove every storage object under <uid>/ in every user bucket.
//      Deleting storage.objects rows in SQL would leave the files on disk;
//      the Storage API is the only thing that actually removes them.
//   5. auth.admin.deleteUser - cascades every table with an ON DELETE
//      CASCADE foreign key to auth.users, which is all of them except the
//      few deliberately SET NULL (disputes, audit, support).
//
// If step 4 fails partway, step 5 still runs: a member who asked to be
// deleted must not be left with an account because one photo would not go.
// The failure is logged with the prefix so it can be swept by hand.
//
// Required env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

const BUCKETS = [
  'profile-photos', 'chat-media', 'feed-media', 'mail-attachments',
  'verification-documents', 'verification-docs', 'user-uploads', 'chat-exclusive',
];

async function whoIs(req, SUPABASE_URL, SERVICE_KEY) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return null;
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${token}` },
  });
  if (!r.ok) return null;
  const u = await r.json();
  return u?.id ? { id: u.id, token } : null;
}

async function listAll(SUPABASE_URL, SERVICE_KEY, bucket, prefix) {
  const names = [];
  let offset = 0;
  for (;;) {
    const r = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${bucket}`, {
      method: 'POST',
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix, limit: 1000, offset }),
    });
    if (!r.ok) return names; // bucket may not exist; nothing to remove
    const rows = await r.json();
    if (!Array.isArray(rows) || rows.length === 0) break;
    for (const row of rows) if (row?.name) names.push(`${prefix}${row.name}`);
    if (rows.length < 1000) break;
    offset += rows.length;
  }
  return names;
}

async function removeAll(SUPABASE_URL, SERVICE_KEY, bucket, names) {
  for (let i = 0; i < names.length; i += 100) {
    const chunk = names.slice(i, i + 100);
    const r = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}`, {
      method: 'DELETE',
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefixes: chunk }),
    });
    if (!r.ok) throw new Error(`storage delete failed for ${bucket}: ${r.status}`);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) return res.status(503).json({ error: 'not_configured' });

  const user = await whoIs(req, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  if (!user) return res.status(401).json({ error: 'not_signed_in' });

  if (String(req.body?.confirm ?? '') !== 'DELETE') {
    return res.status(400).json({ error: 'confirmation_required' });
  }

  // Step 3 - as the member, so auth.uid() inside the function is them.
  const scrubResp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/scrub_my_account`, {
    method: 'POST',
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${user.token}`, 'Content-Type': 'application/json' },
    body: '{}',
  });
  const scrub = await scrubResp.json().catch(() => null);
  if (!scrubResp.ok || !scrub?.success) {
    const code = scrub?.error || 'scrub_failed';
    return res.status(code === 'staff_account' ? 403 : 500).json({ error: code });
  }

  // Step 4 - storage.
  const prefix = scrub.storage_prefix;
  const storageErrors = [];
  for (const bucket of BUCKETS) {
    try {
      const names = await listAll(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, bucket, prefix);
      if (names.length) await removeAll(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, bucket, names);
    } catch (err) {
      storageErrors.push(`${bucket}: ${err.message}`);
    }
  }
  if (storageErrors.length) {
    console.error('delete-account: storage cleanup incomplete for prefix', prefix, storageErrors);
  }

  // Step 5 - the auth user. Cascades the rest.
  const del = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${user.id}`, {
    method: 'DELETE',
    headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
  });
  if (!del.ok) {
    console.error('delete-account: auth delete failed', del.status, await del.text().catch(() => ''));
    return res.status(500).json({ error: 'delete_failed' });
  }

  return res.status(200).json({ deleted: true, storageCleaned: storageErrors.length === 0 });
}
