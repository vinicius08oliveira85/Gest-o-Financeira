-- Vincula lançamento à meta (depósito/saque na meta)
alter table public.entries
  add column if not exists goal_id text;

create index if not exists idx_entries_goal_id on public.entries(goal_id);
