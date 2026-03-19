-- RLS para public.credit_cards e public.card_expenses (mesmo modelo anon do entries/goals)
-- Idempotente: remove políticas existentes antes de recriar.

alter table public.credit_cards enable row level security;
alter table public.card_expenses enable row level security;

-- credit_cards
drop policy if exists "credit_cards_anon_select" on public.credit_cards;
create policy "credit_cards_anon_select"
  on public.credit_cards for select
  to anon
  using (true);

drop policy if exists "credit_cards_anon_insert" on public.credit_cards;
create policy "credit_cards_anon_insert"
  on public.credit_cards for insert
  to anon
  with check (true);

drop policy if exists "credit_cards_anon_update" on public.credit_cards;
create policy "credit_cards_anon_update"
  on public.credit_cards for update
  to anon
  using (true)
  with check (true);

drop policy if exists "credit_cards_anon_delete" on public.credit_cards;
create policy "credit_cards_anon_delete"
  on public.credit_cards for delete
  to anon
  using (true);

-- card_expenses
drop policy if exists "card_expenses_anon_select" on public.card_expenses;
create policy "card_expenses_anon_select"
  on public.card_expenses for select
  to anon
  using (true);

drop policy if exists "card_expenses_anon_insert" on public.card_expenses;
create policy "card_expenses_anon_insert"
  on public.card_expenses for insert
  to anon
  with check (true);

drop policy if exists "card_expenses_anon_update" on public.card_expenses;
create policy "card_expenses_anon_update"
  on public.card_expenses for update
  to anon
  using (true)
  with check (true);

drop policy if exists "card_expenses_anon_delete" on public.card_expenses;
create policy "card_expenses_anon_delete"
  on public.card_expenses for delete
  to anon
  using (true);
