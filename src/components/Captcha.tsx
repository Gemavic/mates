import React, { useEffect, useRef, useState } from 'react';

/**
 * Cloudflare Turnstile widget.
 *
 * WHY: anonymous sign-ins are enabled on this project, which Supabase
 * warns can be scripted to inflate monthly active users and the bill.
 * Captcha is the recommended mitigation.
 *
 * SAFE TO DEPLOY BEFORE THE KEY EXISTS. If VITE_TURNSTILE_SITE_KEY is
 * unset this renders nothing and reports a null token, so auth carries
 * on exactly as it does today. It activates the moment the env var is
 * set and the app is rebuilt.
 *
 * ORDER OF OPERATIONS matters when turning this on:
 *   1. set VITE_TURNSTILE_SITE_KEY in Vercel and redeploy
 *   2. confirm the widget renders on the signup form
 *   3. only THEN enable captcha in Supabase
 * Doing 3 first makes Supabase demand a token the form is not yet
 * sending, and every signup fails.
 */

export const TURNSTILE_SITE_KEY: string | undefined =
  import.meta.env.VITE_TURNSTILE_SITE_KEY;

export const isCaptchaEnabled = (): boolean => !!TURNSTILE_SITE_KEY;

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
      remove: (id?: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

const SCRIPT_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

let scriptPromise: Promise<void> | null = null;

const loadScript = (): Promise<void> => {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    if (window.turnstile) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SCRIPT_SRC}"]`
    );
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('turnstile failed')));
      return;
    }
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('turnstile failed to load'));
    document.head.appendChild(script);
  });
  return scriptPromise;
};

interface CaptchaProps {
  /** Receives the token, or null when it expires or fails. */
  onToken: (token: string | null) => void;
  className?: string;
}

export const Captcha: React.FC<CaptchaProps> = ({ onToken, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;

    let cancelled = false;

    loadScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (token: string) => onToken(token),
          'expired-callback': () => onToken(null),
          'error-callback': () => {
            setFailed(true);
            onToken(null);
          },
          theme: 'light',
          size: 'flexible',
        });
      })
      .catch(() => {
        if (!cancelled) {
          setFailed(true);
          onToken(null);
        }
      });

    return () => {
      cancelled = true;
      try {
        if (widgetIdRef.current && window.turnstile) {
          window.turnstile.remove(widgetIdRef.current);
        }
      } catch {
        // widget already gone
      }
    };
    // onToken is intentionally excluded: re-rendering the widget on every
    // parent render would reset the challenge mid-attempt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!TURNSTILE_SITE_KEY) return null;

  return (
    <div className={className}>
      <div ref={containerRef} />
      {failed && (
        <p className="text-xs text-red-600 mt-1">
          Verification could not load. Please refresh and try again.
        </p>
      )}
    </div>
  );
};
