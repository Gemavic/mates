// Lightweight first-party analytics.
// Captures where each session came from (UTM params or referrer) once,
// then logs page views, signups, and ad clicks to the database via a
// rate-limited RPC. Staff view the aggregates in the Staff Panel.
// No cookies, no third-party scripts, no PII beyond the signed-in user id.

import { supabaseClient } from '@/lib/supabase';

interface SessionSource {
  source: string;
  medium: string | null;
  campaign: string | null;
  referrer: string | null;
}

const SESSION_KEY = 'dates_session_id';
const SOURCE_KEY = 'dates_session_source';

function uuid(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `s-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  }
}

export function getSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = uuid();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return 'no-storage-session';
  }
}

function classifyReferrer(ref: string): { source: string; medium: string } {
  try {
    const host = new URL(ref).hostname.replace(/^www\./, '');
    if (/google\./.test(host)) return { source: 'google', medium: 'organic' };
    if (/bing\./.test(host)) return { source: 'bing', medium: 'organic' };
    if (/duckduckgo\./.test(host)) return { source: 'duckduckgo', medium: 'organic' };
    if (/facebook\.|fb\./.test(host)) return { source: 'facebook', medium: 'social' };
    if (/instagram\./.test(host)) return { source: 'instagram', medium: 'social' };
    if (/tiktok\./.test(host)) return { source: 'tiktok', medium: 'social' };
    if (/twitter\.|x\.com/.test(host)) return { source: 'x', medium: 'social' };
    if (/reddit\./.test(host)) return { source: 'reddit', medium: 'social' };
    if (/youtube\./.test(host)) return { source: 'youtube', medium: 'social' };
    if (/linkedin\./.test(host)) return { source: 'linkedin', medium: 'social' };
    return { source: host, medium: 'referral' };
  } catch {
    return { source: 'direct', medium: 'none' };
  }
}

/** Determine (once per session) where this visitor came from. */
export function getSessionSource(): SessionSource {
  try {
    const cached = sessionStorage.getItem(SOURCE_KEY);
    if (cached) return JSON.parse(cached);
  } catch {
    /* ignore */
  }

  const params = new URLSearchParams(window.location.search);
  const utmSource = params.get('utm_source');
  let result: SessionSource;

  if (utmSource) {
    result = {
      source: utmSource,
      medium: params.get('utm_medium'),
      campaign: params.get('utm_campaign'),
      referrer: document.referrer || null,
    };
  } else if (document.referrer && !document.referrer.includes(window.location.hostname)) {
    const c = classifyReferrer(document.referrer);
    result = { source: c.source, medium: c.medium, campaign: null, referrer: document.referrer };
  } else {
    result = { source: 'direct', medium: 'none', campaign: null, referrer: null };
  }

  try {
    sessionStorage.setItem(SOURCE_KEY, JSON.stringify(result));
  } catch {
    /* ignore */
  }
  return result;
}

let lastPath: string | null = null;
let lastSentAt = 0;

async function send(
  eventType: 'page_view' | 'signup' | 'ad_click',
  path: string | null,
  meta?: Record<string, unknown>
): Promise<void> {
  try {
    const src = getSessionSource();
    await supabaseClient.rpc('log_traffic_event', {
      p_event_type: eventType,
      p_session_id: getSessionId(),
      p_path: path,
      p_referrer: src.referrer,
      p_source: src.source,
      p_medium: src.medium,
      p_campaign: src.campaign,
      p_meta: meta ?? null,
    });
  } catch {
    // Analytics must never break the app
  }
}

/** Log a screen view. De-dupes repeats of the same screen within 2s. */
export function trackPageView(screen: string): void {
  const now = Date.now();
  if (screen === lastPath && now - lastSentAt < 2000) return;
  lastPath = screen;
  lastSentAt = now;
  void send('page_view', screen);
}

/** Log a completed signup (call once, right after account creation). */
export function trackSignup(): void {
  void send('signup', 'signup');
}

/** Log an ad click with its placement position and destination. */
export function trackAdClick(position: string, url?: string): void {
  void send('ad_click', window.location.hash || null, { position, url });
}
