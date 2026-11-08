-- Tabela public.loans para o módulo de empréstimos
-- source_type: 'pessoa_fisica' | 'trabalhador' (de onde será pago)
-- Execute no Supabase Dashboard (SQL Editor) se não usar CLI.

create table if not exists public.loans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  amount numeric(12,2) not null default 0,
  source_type text not null check (source_type in ('pessoa_fisica', 'trabalhador')),
  source_name text,
  due_date date not null,
  paid boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_loans_due_date on public.loans(due_date);

-- Para tabelas criadas antes do campo "paid"
alter table public.loans add column if not exists paid boolean not null default false;

-- RLS: mesmo modelo anon do entries/goals/credit_cards (app sem auth)
alter table public.loans enable row level security;

drop policy if exists "loans_anon_select" on public.loans;
create policy "loans_anon_select"
  on public.loans for select
  to anon
  using (true);

drop policy if exists "loans_anon_insert" on public.loans;
create policy "loans_anon_insert"
  on public.loans for insert
  to anon
  with check (true);

drop policy if exists "loans_anon_update" on public.loans;
create policy "loans_anon_update"
  on public.loans for update
  to anon
  using (true)
  with check (true);

drop policy if exists "loans_anon_delete" on public.loans;
create policy "loans_anon_delete"
  on public.loans for delete
  to anon
  using (true);

notify pgrst, 'reload schema';
