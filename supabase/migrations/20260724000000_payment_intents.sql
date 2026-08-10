-- Tracks every payment attempt from the moment an invoice is created,
-- through every status NOWPayments reports (waiting, confirming, sending,
-- finished, failed, expired, etc.) — not just the final 'finished' state.
-- Previously the webhook silently discarded every non-'finished' update
-- with no database record at all, so there was no way to show a pending
-- or failed transaction anywhere; this fixes that gap directly.

create table if not exists public.app_payment_intents (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  order_id            text not null,
  kind                text not null check (kind in ('credits', 'sub')),
  product_id          text not null,
  amount_usd          numeric not null,
  provider_payment_id text,
  status              text not null default 'pending'
                        check (status in
                          ('pending', 'waiting', 'confirming', 'sending',
                           'partially_paid', 'finished', 'failed',
                           'expired', 'refunded')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists idx_payment_intents_user_created
  on public.app_payment_intents (user_id, created_at desc);

create index if not exists idx_payment_intents_order_status
  on public.app_payment_intents (order_id, status);

-- provider_payment_id, once known, uniquely identifies one real payment
-- attempt — order_id alone can legitimately repeat if someone buys the
-- same package more than once over time.
create unique index if not exists idx_payment_intents_provider_id
  on public.app_payment_intents (provider_payment_id)
  where provider_payment_id is not null;

alter table public.app_payment_intents enable row level security;

drop policy if exists "payment intents: read own" on public.app_payment_intents;
create policy "payment intents: read own" on public.app_payment_intents
  for select to authenticated
  using (user_id = auth.uid());

-- Only the server (service role, used by create-payment and crypto-webhook)
-- ever writes here — never the browser directly.
revoke insert, update, delete on public.app_payment_intents from authenticated, anon;
