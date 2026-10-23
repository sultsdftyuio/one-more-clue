-- One row per paid Dodo payment for a case. Written only by the payment
-- webhook (service role); players can read their own rows.

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  case_id text not null,
  payment_id text not null unique,
  status text not null default 'paid' check (status in ('paid', 'refunded')),
  amount integer,          -- smallest currency unit, as Dodo reports it
  currency text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists purchases_user_id_idx on public.purchases (user_id);

alter table public.purchases enable row level security;

create policy "Players can read their own purchases"
  on public.purchases for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- No insert, update or delete policies: only the service role writes here.

create or replace function public.purchases_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger purchases_touch_updated_at
  before update on public.purchases
  for each row execute function public.purchases_touch_updated_at();
