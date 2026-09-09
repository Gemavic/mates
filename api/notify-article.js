// /api/notify-article — tells members who opted in that a new Care Blog
// piece is out. Called by the database, not by a browser: the scheduled
// publisher (publish_next_article, pg_cron) posts here with a shared key
// from Vault right after it publishes. Nothing else can trigger a send.
//
// Required Vercel environment variables (already set for the other push
// route): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY.

import webpush from 'web-push';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'not_configured' });
  }

  const svc = {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  };
  const rpc = async (name, args) => {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
      method: 'POST', headers: svc, body: JSON.stringify(args ?? {}),
    });
    const body = await r.json().catch(() => null);
    return r.ok ? body : null;
  };

  try {
    // The key lives in Vault and is checked by the database, so it is
    // never in this file or in an environment variable.
    const key = req.headers['x-notify-key'];
    const ok = await rpc('article_notify_key_matches', { p_key: typeof key === 'string' ? key : '' });
    if (ok !== true) return res.status(403).json({ error: 'forbidden' });

    const articleId = req.body?.article_id;
    if (typeof articleId !== 'string' || !UUID.test(articleId)) {
      return res.status(400).json({ error: 'invalid_article' });
    }

    const artResp = await fetch(
      `${SUPABASE_URL}/rest/v1/blog_articles?id=eq.${articleId}&published=eq.true&select=id,title,excerpt,slug,notified_at&limit=1`,
      { headers: svc }
    );
    const [article] = (await artResp.json().catch(() => [])) || [];
    if (!article) return res.status(404).json({ error: 'not_published' });
    if (article.notified_at) return res.status(200).json({ sent: 0, reason: 'already_notified' });

    const targets = (await rpc('article_push_targets')) || [];
    webpush.setVapidDetails('mailto:admin@dates.care', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    const payload = JSON.stringify({
      title: 'New on the Care Blog',
      body: article.title,
      url: article.slug ? `/#care-blog?a=${encodeURIComponent(article.slug)}` : '/#care-blog',
      tag: 'care-blog',
    });

    let sent = 0;
    const dead = [];
    for (const t of targets) {
      try {
        await webpush.sendNotification(
          { endpoint: t.endpoint, keys: { p256dh: t.p256dh_key, auth: t.auth_key } },
          payload
        );
        sent++;
      } catch (err) {
        if (err?.statusCode === 410 || err?.statusCode === 404) dead.push(t.endpoint);
      }
    }

    // Subscriptions the push service says are gone.
    for (const endpoint of dead) {
      await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}`, {
        method: 'DELETE', headers: svc,
      }).catch(() => {});
    }

    await fetch(`${SUPABASE_URL}/rest/v1/blog_articles?id=eq.${articleId}`, {
      method: 'PATCH', headers: { ...svc, Prefer: 'return=minimal' },
      body: JSON.stringify({ notified_at: new Date().toISOString() }),
    }).catch(() => {});

    return res.status(200).json({ sent, targets: targets.length, removed: dead.length });
  } catch (err) {
    console.error('notify-article failed:', err);
    return res.status(500).json({ error: 'failed' });
  }
}
