-- RLS para public.goals (mesmo modelo anon do entries)
-- Idempotente: remove políticas existentes antes de recriar.

alter table public.goals enable row level security;

drop policy if exists "goals_anon_select" on public.goals;
create policy "goals_anon_select"
  on public.goals for select
  to anon
  using (true);

drop policy if exists "goals_anon_insert" on public.goals;
create policy "goals_anon_insert"
  on public.goals for insert
  to anon
  with check (true);

drop policy if exists "goals_anon_update" on public.goals;
create policy "goals_anon_update"
  on public.goals for update
  to anon
  using (true)
  with check (true);

drop policy if exists "goals_anon_delete" on public.goals;
create policy "goals_anon_delete"
  on public.goals for delete
  to anon
  using (true);
