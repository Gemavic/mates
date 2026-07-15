// Client helper: start a hosted crypto checkout via /api/create-payment.
// The server owns all pricing; this only sends a product id and redirects
// the browser to the NOWPayments invoice page. Crediting happens via the
// signed webhook after real blockchain confirmation — never from the client.

import { supabaseClient } from '@/lib/supabase';

export type CheckoutKind = 'credits' | 'sub';

export interface CheckoutResult {
  ok: boolean;
  error?: string;
}

/** Map a credit package to its catalog id (accepts base or bonus-inclusive counts). */
export function resolveCreditPackageId(credits: number): string | null {
  if (credits === 50 || credits === 60) return 'starter';
  if (credits === 100 || credits === 125) return 'popular';
  if (credits === 450 || credits === 500) return 'premium';
  return null;
}

export async function startCryptoCheckout(
  kind: CheckoutKind,
  id: string
): Promise<CheckoutResult> {
  try {
    const { data } = await supabaseClient.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) return { ok: false, error: 'Please sign in to make a payment.' };

    const resp = await fetch('/api/create-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ kind, id }),
    });

    const json = await resp.json().catch(() => null);
    if (!resp.ok || !json?.invoice_url) {
      const message =
        json?.error === 'payments_not_configured'
          ? 'Payments are not yet enabled. Please try again later.'
          : 'Could not start checkout. Please try again.';
      return { ok: false, error: message };
    }

    window.location.href = json.invoice_url;
    return { ok: true };
  } catch {
    return { ok: false, error: 'Could not start checkout. Please try again.' };
  }
}
