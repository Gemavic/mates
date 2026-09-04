// api/_catalog.js — the ONE server-side definition of what is for sale,
// what it costs, and how many credits it grants.
//
// This used to live in two places: a CATALOG in create-payment.js that set
// the price, and a separate CREDIT_PACKAGES map in crypto-webhook.js that
// decided how many credits to hand over. They drifted. The webhook was
// granting 60 / 125 / 500 credits while the app was advertising and
// charging for 75 / 160 / 650 — every buyer was short-changed by 15, 35 or
// 150 credits, and nothing in either file could have caught it, because
// neither file could see the other's numbers.
//
// Now there is one object. The price and the grant are the same two fields
// of the same record, so they cannot disagree again.
//
// These numbers must match getCreditPackages() in src/lib/creditSystem.tsx,
// which is what members see on the Credits screen.

export const CATALOG = {
  credits: {
    starter: {
      usd: 12.99,
      base: 65,
      bonus: 10,
      get credits() { return this.base + this.bonus; },
      label: 'Starter — 65 credits + 10 bonus',
    },
    popular: {
      usd: 18.99,
      base: 130,
      bonus: 30,
      get credits() { return this.base + this.bonus; },
      label: 'Popular — 130 credits + 30 bonus',
    },
    premium: {
      usd: 50.99,
      base: 580,
      bonus: 70,
      get credits() { return this.base + this.bonus; },
      label: 'Premium — 580 credits + 70 bonus',
    },
  },
  sub: {
    silver: { usd: 19.99, label: 'Silver monthly subscription' },
    gold: { usd: 39.99, label: 'Gold monthly subscription' },
    platinum: { usd: 79.99, label: 'Platinum monthly subscription' },
    elite: { usd: 149.99, label: 'Elite monthly subscription' },
  },
};

export const TIERS = Object.keys(CATALOG.sub);

export function creditsFor(packageId) {
  const pack = CATALOG.credits[packageId];
  return pack ? pack.credits : null;
}

export function priceFor(kind, id) {
  return CATALOG[kind]?.[id]?.usd ?? null;
}
