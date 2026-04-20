-- Garante coluna updated_at antes do trigger (evita 42703: record "new" has no field "updated_at").

alter table public.entries add column if not exists updated_at timestamptz;

update public.entries
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;

alter table public.entries
  alter column updated_at set default now();

alter table public.entries
  alter column updated_at set not null;

create or replace function public.entries_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$$;

drop trigger if exists trg_entries_updated_at on public.entries;
create trigger trg_entries_updated_at
  before insert or update on public.entries
  for each row
  execute function public.entries_set_updated_at();
