-- Campos para lançamentos recorrentes
alter table public.entries
  add column if not exists is_recurring boolean not null default false,
  add column if not exists recurrence_count integer,
  add column if not exists recurrence_template_id text;

create index if not exists idx_entries_recurrence_template_id
  on public.entries(recurrence_template_id);
