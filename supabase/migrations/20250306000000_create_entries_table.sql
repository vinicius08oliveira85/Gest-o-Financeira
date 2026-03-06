-- Gestão Financeira: tabela public.entries
-- Execute este SQL no Supabase Dashboard (SQL Editor) se a migração via CLI/MCP não foi aplicada.

create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  amount numeric(12,2) not null,
  due_date date not null,
  is_paid boolean not null default false,
  type text not null check (type in ('debt', 'cash')),
  created_at timestamptz not null default now()
);

create index if not exists idx_entries_type on public.entries(type);
create index if not exists idx_entries_is_paid on public.entries(is_paid);
create index if not exists idx_entries_due_date on public.entries(due_date);
