// POST /api/run-account-deletions
//
// The daily step of "delete my account". Members no longer delete anything
// with a tap: they ask, and fourteen days later - if nothing is open on the
// account and no staff hold is in place - this route retires it.
//
// It is called by the database (kick_account_deletions, pg_cron, 05:30 UTC)
// with a shared key from Vault, never by a browser. For each account that
// is due it:
//   1. calls retire_account() - writes the retention record, scrubs every
//      personal row, anonymises and bans the sign-in, keeps the row so that
//      messages, ledger lines and reports keep their foreign keys;
//   2. removes every file under <uid>/ in every user bucket. Deleting
//      storage.objects rows in SQL would leave the files on disk; the
//      Storage API is the only thing that actually removes them.
//
// Required env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

const BUCKETS = [
  'profile-photos', 'chat-media', 'feed-media', 'mail-attachments',
  'verification-documents', 'verification-docs', 'user-uploads', 'chat-exclusive',
];

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

  const svc = {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  };
  const rpc = async (name, args) => {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, { method: 'POST', headers: svc, body: JSON.stringify(args ?? {}) });
    const body = await r.json().catch(() => null);
    return r.ok ? body : null;
  };

  try {
    const key = req.headers['x-run-key'];
    const ok = await rpc('deletion_run_key_matches', { p_key: typeof key === 'string' ? key : '' });
    if (ok !== true) return res.status(403).json({ error: 'forbidden' });

    const due = (await rpc('due_account_deletions')) || [];
    const results = [];
    for (const row of due) {
      const userId = row.user_id;
      const retired = await rpc('retire_account', { p_user: userId });
      if (!retired?.success) {
        results.push({ userId, retired: false, reason: retired?.error || 'failed' });
        continue;
      }
      const prefix = retired.storage_prefix;
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
        console.error('run-account-deletions: storage cleanup incomplete for prefix', prefix, storageErrors);
      }
      results.push({ userId, retired: true, storageCleaned: storageErrors.length === 0 });
    }
    return res.status(200).json({ due: due.length, results });
  } catch (err) {
    console.error('run-account-deletions failed:', err);
    return res.status(500).json({ error: 'failed' });
  }
}
