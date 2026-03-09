-- RLS para public.entries: permite que o cliente anon leia e escreva
-- (app sem auth; no futuro pode-se adicionar user_id e filtrar por auth.uid())

alter table public.entries enable row level security;

create policy "entries_anon_select"
  on public.entries for select
  to anon
  using (true);

create policy "entries_anon_insert"
  on public.entries for insert
  to anon
  with check (true);

create policy "entries_anon_update"
  on public.entries for update
  to anon
  using (true)
  with check (true);

create policy "entries_anon_delete"
  on public.entries for delete
  to anon
  using (true);
