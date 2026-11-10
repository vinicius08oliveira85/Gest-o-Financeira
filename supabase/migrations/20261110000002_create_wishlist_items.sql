-- Tabela public.wishlist_items para a aba "Lista de desejos".
-- purchased_at: data (ISO) em que o item foi marcado como comprado.
-- entry_id: lançamento de saída criado ao marcar a compra (permite desfazer),
-- sem FK porque entries.id é text em instalações antigas.
-- Execute no Supabase Dashboard (SQL Editor) se não usar CLI.

create table if not exists public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  amount numeric(12,2) not null default 0,
  url text,
  purchased boolean not null default false,
  purchased_at date,
  entry_id text,
  created_at timestamptz not null default now()
);

create index if not exists idx_wishlist_items_created_at
  on public.wishlist_items(created_at);

-- RLS: mesmo modelo anon de entries/goals/loans (app sem auth)
alter table public.wishlist_items enable row level security;

drop policy if exists "wishlist_items_anon_select" on public.wishlist_items;
create policy "wishlist_items_anon_select"
  on public.wishlist_items for select
  to anon
  using (true);

drop policy if exists "wishlist_items_anon_insert" on public.wishlist_items;
create policy "wishlist_items_anon_insert"
  on public.wishlist_items for insert
  to anon
  with check (true);

drop policy if exists "wishlist_items_anon_update" on public.wishlist_items;
create policy "wishlist_items_anon_update"
  on public.wishlist_items for update
  to anon
  using (true)
  with check (true);

drop policy if exists "wishlist_items_anon_delete" on public.wishlist_items;
create policy "wishlist_items_anon_delete"
  on public.wishlist_items for delete
  to anon
  using (true);

-- Atualiza o cache de schema do PostgREST para a tabela aparecer imediatamente.
notify pgrst, 'reload schema';
