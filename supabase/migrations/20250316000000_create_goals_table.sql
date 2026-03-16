-- Tabela public.goals para metas por mês/ano
-- Execute no Supabase Dashboard (SQL Editor) se não usar CLI.

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  target_amount numeric(12,2) not null default 0,
  current_amount numeric(12,2) not null default 0,
  category text,
  month smallint not null,
  year smallint not null,
  constraint goals_month_year_check check (month >= 0 and month <= 11 and year >= 2000 and year <= 2100)
);

create index if not exists idx_goals_month_year on public.goals(month, year);
