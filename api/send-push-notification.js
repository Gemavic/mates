// /api/send-push-notification — sends a real Web Push notification to
// every subscribed device for a target user. Called server-side only,
// either by another API route (e.g. after a new message is saved) or,
// for testing, directly by the signed-in user to themselves.
//
// Required Vercel environment variables:
//   VAPID_PUBLIC_KEY   (same value as VITE_VAPID_PUBLIC_KEY on the client)
//   VAPID_PRIVATE_KEY  (server-only — never exposed to the client)
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY

import webpush from 'web-push';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const {
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY,
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
  } = process.env;

  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'not_configured' });
  }

  try {
    // Authenticate the caller
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'not_signed_in' });

    const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${token}` },
    });
    if (!userResp.ok) return res.status(401).json({ error: 'invalid_session' });
    const caller = await userResp.json();
    if (!caller?.id) return res.status(401).json({ error: 'invalid_session' });

    const { targetUserId, title, body, url } = req.body || {};
    if (!targetUserId || !title) {
      return res.status(400).json({ error: 'missing_target_or_title' });
    }

    // targetUserId is interpolated into PostgREST query strings below. Anything
    // other than a plain uuid could smuggle in extra "&" filters and rewrite
    // the authorisation check into one that always matches.
    const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (typeof targetUserId !== 'string' || !UUID.test(targetUserId)) {
      return res.status(400).json({ error: 'invalid_target' });
    }

    // Sending to yourself is always allowed (the "send me a test notification"
    // button in Settings).
    //
    // Sending to someone else is allowed ONLY when the server can verify a
    // reason for it. Right now the single reason is an incoming call: there
    // must be a call_invites row that is still ringing, created by this caller,
    // addressed to this target, in the last two minutes. That check is done
    // here with the service role - the client cannot assert it.
    //
    // Without this, "notify any user" would be an open spam relay: anyone with
    // an account could push arbitrary text to any member's lock screen.
    if (targetUserId !== caller.id) {
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      const inviteResp = await fetch(
        `${SUPABASE_URL}/rest/v1/call_invites` +
          `?caller_id=eq.${caller.id}` +
          `&callee_id=eq.${targetUserId}` +
          `&status=eq.ringing` +
          `&created_at=gt.${encodeURIComponent(twoMinutesAgo)}` +
          `&select=id&limit=1`,
        {
          headers: {
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
        }
      );
      const invites = await inviteResp.json().catch(() => []);

      if (!Array.isArray(invites) || invites.length === 0) {
        return res.status(403).json({ error: 'not_authorized_for_target' });
      }
    }

    webpush.setVapidDetails('mailto:support@dates.care', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    const subsResp = await fetch(
      `${SUPABASE_URL}/rest/v1/push_subscriptions?user_id=eq.${targetUserId}`,
      {
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
      }
    );
    const subscriptions = await subsResp.json().catch(() => []);

    if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
      return res.status(200).json({ sent: 0, message: 'no_subscriptions' });
    }

    // tag/requireInteraction/vibrate let a ringing call behave like a call -
    // it stays on screen until acted on, and replaces itself rather than
    // stacking one notification per retry.
    const { tag, requireInteraction, vibrate } = req.body || {};
    const payload = JSON.stringify({
      title,
      body: body || '',
      url: url || '/',
      tag,
      requireInteraction: !!requireInteraction,
      vibrate,
    });
    let sent = 0;

    for (const sub of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh_key, auth: sub.auth_key },
          },
          payload
        );
        sent++;
      } catch (err) {
        // 410/404 means the subscription is dead (browser data cleared,
        // uninstalled, etc.) — clean it up so future sends don't retry it
        if (err.statusCode === 410 || err.statusCode === 404) {
          await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?id=eq.${sub.id}`, {
            method: 'DELETE',
            headers: {
              apikey: SUPABASE_SERVICE_ROLE_KEY,
              Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            },
          });
        } else {
          console.error('Push send failed for subscription', sub.id, err.message);
        }
      }
    }

    return res.status(200).json({ sent, total: subscriptions.length });
  } catch (err) {
    console.error('send-push-notification error:', err);
    return res.status(500).json({ error: 'internal_error' });
  }
}
