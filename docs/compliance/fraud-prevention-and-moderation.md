# Fraud Prevention & Content Moderation Overview — Dates (dates.care)

Effective: July 2026 · For payment processor underwriting

## Account integrity
- **Email-verified registration** via Supabase Auth; passwords enforced
  with strength validation.
- **Photo verification** distinguishes verified users with a badge.
- **Staff review tools**: a protected staff panel supports account review,
  suspension, and permanent removal.

## Payment fraud controls
- **Server-side ledger.** All balances and entitlements live in a
  Postgres ledger protected by Row Level Security. Clients cannot write
  balances; every mutation is an atomic, logged, server-side function.
- **Server-side pricing.** Product prices are defined on the server; the
  client can only reference a product id.
- **Idempotent crediting.** Every payment is credited exactly once against
  a unique payment reference; webhook replays cannot double-credit.
- **Signed payment notifications.** Payment webhooks are verified with
  HMAC-SHA512 signatures before any account is credited.
- **Complete audit trail.** Every credit grant and spend is recorded in an
  append-only transaction log with reason, amount, balance-after, and
  timestamp — available as evidence in any dispute.

## Content moderation
- **Automated content screening** on uploads and messages.
- **One-tap reporting** on profiles and conversations, feeding a staff
  review queue.
- **Published policies**: Community/Consent Policy, Misconduct Policy,
  Acceptable Use Policy — all user-facing and linked in-app.
- **Enforcement ladder**: warning → suspension → termination, at staff
  discretion for severe violations.

## Chargeback posture
- Current payment rail (cryptocurrency invoices) carries zero chargeback
  exposure by design.
- For card processing we commit to: recognizable billing descriptors,
  immediate purchase confirmations, an easy self-serve cancellation path,
  a clear refund policy (published in-app), and dispute responses within
  7 days supported by ledger evidence and account activity logs.
