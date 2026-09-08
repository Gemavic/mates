-- The Help page's contact form used to invent a ticket id with Math.random()
-- and send nothing. A member reporting a scam or an underage account was
-- told "Support Ticket Created!" and nothing happened.
--
-- Tickets now land here, written only by the server (service role). The id
-- the member sees is the real row. Members cannot read this table: it holds
-- other people's names and complaints.

create table if not exists public.support_tickets (
  id            uuid primary key default gen_random_uuid(),
  ticket_ref    text not null unique,
  user_id       uuid references auth.users(id) on delete set null,
  name          text not null,
  email         text not null,
  subject       text not null,
  message       text not null,
  status        text not null default 'open' check (status in ('open','answered','closed')),
  ip_hash       text,
  user_agent    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists support_tickets_created_idx on public.support_tickets (created_at desc);
create index if not exists support_tickets_email_idx on public.support_tickets (lower(email));

alter table public.support_tickets enable row level security;
revoke all on public.support_tickets from anon, authenticated;

-- Staff can read and update tickets from the staff panel; nobody else can.
create policy "staff read tickets" on public.support_tickets
  for select to authenticated
  using (public.can_moderate(auth.uid()));

create policy "staff update tickets" on public.support_tickets
  for update to authenticated
  using (public.can_moderate(auth.uid()))
  with check (public.can_moderate(auth.uid()));

grant select, update on public.support_tickets to authenticated;
