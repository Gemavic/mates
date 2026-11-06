// /api/notify-event — a phone notification when a member gets a new message
// or a new like while they are not on Dates.care.
//
// Until now only calls and Care Blog articles sent push notifications, so a
// member who had left the site never heard about a message or a like - and
// reported "I was not notified although I never signed out".
//
// Called by the database, not by a browser: triggers on mail_messages and
// user_likes post here through pg_net with the shared key from Vault (the
// same one the article notifier uses). Nothing else can trigger a send.
//
// Privacy: the notification names the sender's first name but never shows
// the message itself on a lock screen.
//
// Required Vercel environment variables (already set for the other push
// routes): VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY.

import webpush from 'web-push';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// A burst of messages from the same person is one notification, not ten.
const MESSAGE_QUIET_MS = 2 * 60 * 1000;
// Likes come in clusters while someone browses; at most one alert per window.
const LIKE_QUIET_MS = 30 * 60 * 1000;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'not_configured' });
  }

  const svc = {
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  };
  const get = async (path) => {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { headers: svc });
    return r.ok ? r.json().catch(() => []) : [];
  };
  const rpc = async (name, args) => {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
      method: 'POST', headers: svc, body: JSON.stringify(args ?? {}),
    });
    const body = await r.json().catch(() => null);
    return r.ok ? body : null;
  };

  try {
    const key = req.headers['x-notify-key'];
    const ok = await rpc('article_notify_key_matches', { p_key: typeof key === 'string' ? key : '' });
    if (ok !== true) return res.status(403).json({ error: 'forbidden' });

    const { type, id } = req.body || {};
    if (!UUID.test(String(id || ''))) return res.status(400).json({ error: 'invalid_id' });

    let recipientId = null;
    let settingKey = null;
    let payload = null;

    if (type === 'message') {
      const [m] = await get(`mail_messages?id=eq.${id}&select=id,thread_id,sender_id,created_at,gift_id,sticker_id&limit=1`);
      if (!m) return res.status(404).json({ error: 'not_found' });
      const [t] = await get(`mail_threads?id=eq.${m.thread_id}&select=participant1_id,participant2_id&limit=1`);
      if (!t) return res.status(404).json({ error: 'no_thread' });
      recipientId = t.participant1_id === m.sender_id ? t.participant2_id : t.participant1_id;

      // Only the first of a quick run of messages from the same person.
      const since = new Date(new Date(m.created_at).getTime() - MESSAGE_QUIET_MS).toISOString();
      const earlier = await get(
        `mail_messages?thread_id=eq.${m.thread_id}&sender_id=eq.${m.sender_id}` +
        `&created_at=gte.${encodeURIComponent(since)}&created_at=lt.${encodeURIComponent(m.created_at)}&select=id&limit=1`
      );
      if (earlier.length) return res.status(200).json({ sent: 0, reason: 'burst' });

      const [sender] = await get(`user_profiles?user_id=eq.${m.sender_id}&select=first_name,full_name&limit=1`);
      const name = (sender?.first_name || String(sender?.full_name || '').split(' ')[0] || 'Someone').trim();
      settingKey = 'push_messages';
      payload = {
        title: m.gift_id ? `${name} sent you a gift` : `New message from ${name}`,
        body: 'Open Dates.care to read and reply.',
        url: '/#mail',
        tag: `thread-${m.thread_id}`,
      };
    } else if (type === 'like') {
      const [l] = await get(`user_likes?id=eq.${id}&select=id,user_id,target_user_id,like_type,created_at&limit=1`);
      if (!l || !l.target_user_id || l.target_user_id === l.user_id) return res.status(200).json({ sent: 0 });
      // A "pass" is a no - never tell anyone about it.
      if (l.like_type === 'pass') return res.status(200).json({ sent: 0, reason: 'pass' });
      recipientId = l.target_user_id;

      const since = new Date(new Date(l.created_at).getTime() - LIKE_QUIET_MS).toISOString();
      const earlier = await get(
        `user_likes?target_user_id=eq.${recipientId}&like_type=neq.pass` +
        `&created_at=gte.${encodeURIComponent(since)}&created_at=lt.${encodeURIComponent(l.created_at)}&select=id&limit=1`
      );
      if (earlier.length) return res.status(200).json({ sent: 0, reason: 'recent_like_alert' });

      settingKey = 'push_likes';
      payload = {
        title: l.like_type === 'blink' ? 'Someone blinked at you' : 'Someone new likes you',
        body: 'Open Dates.care to see who.',
        url: '/#likes',
        tag: 'likes',
      };
    } else {
      return res.status(400).json({ error: 'unknown_type' });
    }

    if (!recipientId) return res.status(200).json({ sent: 0 });

    // Someone on the site right now already sees it there.
    const [profile] = await get(`user_profiles?user_id=eq.${recipientId}&select=is_online,last_active&limit=1`);
    if (profile?.is_online && profile?.last_active && Date.now() - new Date(profile.last_active).getTime() < 3 * 60 * 1000) {
      return res.status(200).json({ sent: 0, reason: 'online' });
    }

    // On unless the member switched it off (no row means never changed: on).
    const [settings] = await get(`user_notification_settings?user_id=eq.${recipientId}&select=${settingKey}&limit=1`);
    if (settings && settings[settingKey] === false) return res.status(200).json({ sent: 0, reason: 'opted_out' });

    const subs = await get(`push_subscriptions?user_id=eq.${recipientId}&select=endpoint,p256dh_key,auth_key`);
    if (!subs.length) return res.status(200).json({ sent: 0, reason: 'no_device' });

    webpush.setVapidDetails('mailto:admin@dates.care', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    const body = JSON.stringify(payload);
    let sent = 0;
    const dead = [];
    for (const s of subs) {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh_key, auth: s.auth_key } }, body);
        sent++;
      } catch (err) {
        if (err?.statusCode === 410 || err?.statusCode === 404) dead.push(s.endpoint);
      }
    }
    for (const endpoint of dead) {
      await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}`, {
        method: 'DELETE', headers: svc,
      }).catch(() => {});
    }
    return res.status(200).json({ sent, devices: subs.length, removed: dead.length });
  } catch (err) {
    console.error('notify-event failed:', err);
    return res.status(500).json({ error: 'failed' });
  }
}
