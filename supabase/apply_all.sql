-- ============================================================================
-- Gestão Financeira — aplicação de todas as migrações no SQL Editor
-- Projeto Supabase: nxfalfasnktodzqpclid
--
-- Cole este arquivo inteiro no SQL Editor do Supabase e execute uma vez.
-- Todas as instruções são idempotentes; rodar de novo é seguro.
-- Gerado a partir de supabase/migrations/ (não editar manualmente).
-- ============================================================================

-- ===== 20250306000000_create_entries_table.sql =====
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

-- ===== 20250309000000_entries_rls_policies.sql =====
-- RLS para public.entries: permite que o cliente anon leia e escreva
-- (app sem auth; no futuro pode-se adicionar user_id e filtrar por auth.uid())
-- Idempotente: remove políticas existentes antes de recriar.

alter table public.entries enable row level security;

drop policy if exists "entries_anon_select" on public.entries;
create policy "entries_anon_select"
  on public.entries for select
  to anon
  using (true);

drop policy if exists "entries_anon_insert" on public.entries;
create policy "entries_anon_insert"
  on public.entries for insert
  to anon
  with check (true);

drop policy if exists "entries_anon_update" on public.entries;
create policy "entries_anon_update"
  on public.entries for update
  to anon
  using (true)
  with check (true);

drop policy if exists "entries_anon_delete" on public.entries;
create policy "entries_anon_delete"
  on public.entries for delete
  to anon
  using (true);

-- ===== 20250316000000_create_goals_table.sql =====
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

-- ===== 20250316000001_goals_rls_policies.sql =====
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

-- ===== 20250316000002_insert_entries_batch_rpc.sql =====
-- RPC para inserir múltiplos entries em uma única chamada (migração em lote).
-- entries_json: array JSON de objetos com chaves em snake_case.
-- Inserção usa apenas colunas base (id, name, amount, due_date, is_paid, type, created_at).
-- Colunas opcionais (category, tag, installments_count, installment_number, parent_installment_id) são inseridas se existirem na tabela.

create or replace function public.insert_entries_batch(entries_json jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r jsonb;
begin
  for r in select * from jsonb_array_elements(entries_json)
  loop
    insert into public.entries (
      id,
      name,
      amount,
      due_date,
      is_paid,
      type,
      created_at,
      category,
      tag,
      installments_count,
      installment_number,
      parent_installment_id
    )
    values (
      (r->>'id')::uuid,
      nullif(r->>'name', '')::text,
      coalesce((r->>'amount')::numeric, 0),
      (r->>'due_date')::date,
      coalesce((r->>'is_paid')::boolean, false),
      nullif(r->>'type', '')::text,
      coalesce((r->>'created_at')::timestamptz, now()),
      nullif(r->>'category', '')::text,
      nullif(r->>'tag', '')::text,
      (r->>'installments_count')::integer,
      (r->>'installment_number')::integer,
      nullif(r->>'parent_installment_id', '')::text
    );
  end loop;
end;
$$;

grant execute on function public.insert_entries_batch(jsonb) to anon;
grant execute on function public.insert_entries_batch(jsonb) to authenticated;

-- ===== 20250316000003_entries_optional_columns_snake.sql =====
-- Colunas opcionais em snake_case para public.entries (para insert_entries_batch e cliente).
-- Execute se a tabela entries só tiver as colunas base; ignore se já tiver category, tag etc.

alter table public.entries
  add column if not exists category text,
  add column if not exists tag text,
  add column if not exists installments_count integer,
  add column if not exists installment_number integer,
  add column if not exists parent_installment_id text;

-- ===== 20250317000000_goals_target_date.sql =====
-- Data alvo da meta (atingir até)
alter table public.goals
  add column if not exists target_date date;

-- ===== 20250317000001_entries_recurring.sql =====
-- Campos para lançamentos recorrentes
alter table public.entries
  add column if not exists is_recurring boolean not null default false,
  add column if not exists recurrence_count integer,
  add column if not exists recurrence_template_id text;

create index if not exists idx_entries_recurrence_template_id
  on public.entries(recurrence_template_id);

-- ===== 20250317000002_insert_entries_batch_recurring.sql =====
-- Incluir colunas de recorrência no RPC insert_entries_batch
create or replace function public.insert_entries_batch(entries_json jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r jsonb;
begin
  for r in select * from jsonb_array_elements(entries_json)
  loop
    insert into public.entries (
      id,
      name,
      amount,
      due_date,
      is_paid,
      type,
      created_at,
      category,
      tag,
      installments_count,
      installment_number,
      parent_installment_id,
      is_recurring,
      recurrence_count,
      recurrence_template_id
    )
    values (
      (r->>'id')::uuid,
      nullif(r->>'name', '')::text,
      coalesce((r->>'amount')::numeric, 0),
      (r->>'due_date')::date,
      coalesce((r->>'is_paid')::boolean, false),
      nullif(r->>'type', '')::text,
      coalesce((r->>'created_at')::timestamptz, now()),
      nullif(r->>'category', '')::text,
      nullif(r->>'tag', '')::text,
      (r->>'installments_count')::integer,
      (r->>'installment_number')::integer,
      nullif(r->>'parent_installment_id', '')::text,
      coalesce((r->>'is_recurring')::boolean, false),
      (r->>'recurrence_count')::integer,
      nullif(r->>'recurrence_template_id', '')::text
    );
  end loop;
end;
$$;

grant execute on function public.insert_entries_batch(jsonb) to anon;
grant execute on function public.insert_entries_batch(jsonb) to authenticated;

-- ===== 20250318000000_entries_goal_id.sql =====
-- Vincula lançamento à meta (depósito/saque na meta)
alter table public.entries
  add column if not exists goal_id text;

create index if not exists idx_entries_goal_id on public.entries(goal_id);

-- ===== 20250318000001_insert_entries_batch_goal_id.sql =====
-- Incluir goal_id no RPC insert_entries_batch
create or replace function public.insert_entries_batch(entries_json jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r jsonb;
begin
  for r in select * from jsonb_array_elements(entries_json)
  loop
    insert into public.entries (
      id,
      name,
      amount,
      due_date,
      is_paid,
      type,
      created_at,
      category,
      tag,
      installments_count,
      installment_number,
      parent_installment_id,
      is_recurring,
      recurrence_count,
      recurrence_template_id,
      goal_id
    )
    values (
      (r->>'id')::uuid,
      nullif(r->>'name', '')::text,
      coalesce((r->>'amount')::numeric, 0),
      (r->>'due_date')::date,
      coalesce((r->>'is_paid')::boolean, false),
      nullif(r->>'type', '')::text,
      coalesce((r->>'created_at')::timestamptz, now()),
      nullif(r->>'category', '')::text,
      nullif(r->>'tag', '')::text,
      (r->>'installments_count')::integer,
      (r->>'installment_number')::integer,
      nullif(r->>'parent_installment_id', '')::text,
      coalesce((r->>'is_recurring')::boolean, false),
      (r->>'recurrence_count')::integer,
      nullif(r->>'recurrence_template_id', '')::text,
      nullif(r->>'goal_id', '')::text
    );
  end loop;
end;
$$;

grant execute on function public.insert_entries_batch(jsonb) to anon;
grant execute on function public.insert_entries_batch(jsonb) to authenticated;

-- ===== 20250319000000_create_credit_cards_table.sql =====
-- Tabelas para o módulo de cartão de crédito
-- Execute no Supabase Dashboard (SQL Editor) se não usar CLI.

create table if not exists public.credit_cards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  limit_amount numeric(12,2) not null default 0,
  closing_day integer not null default 25,
  due_day integer not null default 5,
  color text,
  created_at timestamptz default now()
);

create table if not exists public.card_expenses (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.credit_cards(id) on delete cascade,
  name text not null,
  amount numeric(12,2) not null,
  date date not null,
  billing_month integer not null,
  billing_year integer not null,
  category text,
  tag text,
  installments_count integer,
  installment_number integer,
  parent_installment_id uuid,
  created_at timestamptz default now()
);

alter table public.entries
  add column if not exists card_id uuid references public.credit_cards(id),
  add column if not exists is_card_invoice boolean default false;

-- ===== 20250319000001_credit_cards_rls_policies.sql =====
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

-- ===== 20260420120000_sync_entries_snapshot_rpc.sql =====
-- Sincronização em uma única transação: remove órfãos no servidor e faz upsert do snapshot local.
-- Mesmo formato JSON que insert_entries_batch (snake_case + created_at), incluindo paid_date, card_id e is_card_invoice.

alter table public.entries add column if not exists paid_date date;

create or replace function public.sync_entries_snapshot(entries_json jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.entries e
  where not exists (
    select 1
    from jsonb_array_elements(coalesce(entries_json, '[]'::jsonb)) as j(elem)
    where (j.elem->>'id')::uuid = e.id
  );

  insert into public.entries (
    id,
    name,
    amount,
    due_date,
    is_paid,
    type,
    created_at,
    category,
    tag,
    installments_count,
    installment_number,
    parent_installment_id,
    is_recurring,
    recurrence_count,
    recurrence_template_id,
    goal_id,
    paid_date,
    card_id,
    is_card_invoice
  )
  select
    (elem->>'id')::uuid,
    coalesce(nullif(elem->>'name', ''), 'Sem nome'),
    coalesce((elem->>'amount')::numeric, 0),
    coalesce((elem->>'due_date')::date, current_date),
    coalesce((elem->>'is_paid')::boolean, false),
    coalesce(nullif(elem->>'type', ''), 'debt'),
    coalesce((elem->>'created_at')::timestamptz, now()),
    nullif(elem->>'category', '')::text,
    nullif(elem->>'tag', '')::text,
    (elem->>'installments_count')::integer,
    (elem->>'installment_number')::integer,
    nullif(elem->>'parent_installment_id', '')::text,
    coalesce((elem->>'is_recurring')::boolean, false),
    (elem->>'recurrence_count')::integer,
    nullif(elem->>'recurrence_template_id', '')::text,
    nullif(elem->>'goal_id', '')::text,
    nullif(elem->>'paid_date', '')::date,
    nullif(elem->>'card_id', '')::uuid,
    coalesce((elem->>'is_card_invoice')::boolean, false)
  from jsonb_array_elements(coalesce(entries_json, '[]'::jsonb)) as t(elem)
  on conflict (id) do update set
    name = excluded.name,
    amount = excluded.amount,
    due_date = excluded.due_date,
    is_paid = excluded.is_paid,
    type = excluded.type,
    created_at = excluded.created_at,
    category = excluded.category,
    tag = excluded.tag,
    installments_count = excluded.installments_count,
    installment_number = excluded.installment_number,
    parent_installment_id = excluded.parent_installment_id,
    is_recurring = excluded.is_recurring,
    recurrence_count = excluded.recurrence_count,
    recurrence_template_id = excluded.recurrence_template_id,
    goal_id = excluded.goal_id,
    paid_date = excluded.paid_date,
    card_id = excluded.card_id,
    is_card_invoice = excluded.is_card_invoice;
end;
$$;

grant execute on function public.sync_entries_snapshot(jsonb) to anon;
grant execute on function public.sync_entries_snapshot(jsonb) to authenticated;

-- ===== 20260420140000_entries_updated_at_sync_merge.sql =====
-- Versão lógica dos lançamentos: merge no sync (revisão mais recente vence em conflito de id).
-- Mantém delete por snapshot (ids ausentes do JSON continuam sendo removidos no servidor).

alter table public.entries add column if not exists updated_at timestamptz;

update public.entries
set updated_at = created_at
where updated_at is null;

alter table public.entries
  alter column updated_at set default now(),
  alter column updated_at set not null;

create or replace function public.insert_entries_batch(entries_json jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r jsonb;
begin
  for r in select * from jsonb_array_elements(entries_json)
  loop
    insert into public.entries (
      id,
      name,
      amount,
      due_date,
      is_paid,
      type,
      created_at,
      category,
      tag,
      installments_count,
      installment_number,
      parent_installment_id,
      is_recurring,
      recurrence_count,
      recurrence_template_id,
      goal_id,
      updated_at
    )
    values (
      (r->>'id')::uuid,
      nullif(r->>'name', '')::text,
      coalesce((r->>'amount')::numeric, 0),
      (r->>'due_date')::date,
      coalesce((r->>'is_paid')::boolean, false),
      nullif(r->>'type', '')::text,
      coalesce((r->>'created_at')::timestamptz, now()),
      nullif(r->>'category', '')::text,
      nullif(r->>'tag', '')::text,
      (r->>'installments_count')::integer,
      (r->>'installment_number')::integer,
      nullif(r->>'parent_installment_id', '')::text,
      coalesce((r->>'is_recurring')::boolean, false),
      (r->>'recurrence_count')::integer,
      nullif(r->>'recurrence_template_id', '')::text,
      nullif(r->>'goal_id', '')::text,
      coalesce((r->>'updated_at')::timestamptz, (r->>'created_at')::timestamptz, now())
    );
  end loop;
end;
$$;

grant execute on function public.insert_entries_batch(jsonb) to anon;
grant execute on function public.insert_entries_batch(jsonb) to authenticated;

create or replace function public.sync_entries_snapshot(entries_json jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.entries e
  where not exists (
    select 1
    from jsonb_array_elements(coalesce(entries_json, '[]'::jsonb)) as j(elem)
    where (j.elem->>'id')::uuid = e.id
  );

  insert into public.entries as ent (
    id,
    name,
    amount,
    due_date,
    is_paid,
    type,
    created_at,
    category,
    tag,
    installments_count,
    installment_number,
    parent_installment_id,
    is_recurring,
    recurrence_count,
    recurrence_template_id,
    goal_id,
    paid_date,
    card_id,
    is_card_invoice,
    updated_at
  )
  select
    (elem->>'id')::uuid,
    coalesce(nullif(elem->>'name', ''), 'Sem nome'),
    coalesce((elem->>'amount')::numeric, 0),
    coalesce((elem->>'due_date')::date, current_date),
    coalesce((elem->>'is_paid')::boolean, false),
    coalesce(nullif(elem->>'type', ''), 'debt'),
    coalesce((elem->>'created_at')::timestamptz, now()),
    nullif(elem->>'category', '')::text,
    nullif(elem->>'tag', '')::text,
    (elem->>'installments_count')::integer,
    (elem->>'installment_number')::integer,
    nullif(elem->>'parent_installment_id', '')::text,
    coalesce((elem->>'is_recurring')::boolean, false),
    (elem->>'recurrence_count')::integer,
    nullif(elem->>'recurrence_template_id', '')::text,
    nullif(elem->>'goal_id', '')::text,
    nullif(elem->>'paid_date', '')::date,
    nullif(elem->>'card_id', '')::uuid,
    coalesce((elem->>'is_card_invoice')::boolean, false),
    coalesce((elem->>'updated_at')::timestamptz, (elem->>'created_at')::timestamptz, now())
  from jsonb_array_elements(coalesce(entries_json, '[]'::jsonb)) as t(elem)
  on conflict (id) do update set
    name = case
      when excluded.updated_at >= ent.updated_at then excluded.name
      else ent.name
    end,
    amount = case
      when excluded.updated_at >= ent.updated_at then excluded.amount
      else ent.amount
    end,
    due_date = case
      when excluded.updated_at >= ent.updated_at then excluded.due_date
      else ent.due_date
    end,
    is_paid = case
      when excluded.updated_at >= ent.updated_at then excluded.is_paid
      else ent.is_paid
    end,
    type = case
      when excluded.updated_at >= ent.updated_at then excluded.type
      else ent.type
    end,
    created_at = case
      when excluded.updated_at >= ent.updated_at then excluded.created_at
      else ent.created_at
    end,
    category = case
      when excluded.updated_at >= ent.updated_at then excluded.category
      else ent.category
    end,
    tag = case
      when excluded.updated_at >= ent.updated_at then excluded.tag
      else ent.tag
    end,
    installments_count = case
      when excluded.updated_at >= ent.updated_at then excluded.installments_count
      else ent.installments_count
    end,
    installment_number = case
      when excluded.updated_at >= ent.updated_at then excluded.installment_number
      else ent.installment_number
    end,
    parent_installment_id = case
      when excluded.updated_at >= ent.updated_at then excluded.parent_installment_id
      else ent.parent_installment_id
    end,
    is_recurring = case
      when excluded.updated_at >= ent.updated_at then excluded.is_recurring
      else ent.is_recurring
    end,
    recurrence_count = case
      when excluded.updated_at >= ent.updated_at then excluded.recurrence_count
      else ent.recurrence_count
    end,
    recurrence_template_id = case
      when excluded.updated_at >= ent.updated_at then excluded.recurrence_template_id
      else ent.recurrence_template_id
    end,
    goal_id = case
      when excluded.updated_at >= ent.updated_at then excluded.goal_id
      else ent.goal_id
    end,
    paid_date = case
      when excluded.updated_at >= ent.updated_at then excluded.paid_date
      else ent.paid_date
    end,
    card_id = case
      when excluded.updated_at >= ent.updated_at then excluded.card_id
      else ent.card_id
    end,
    is_card_invoice = case
      when excluded.updated_at >= ent.updated_at then excluded.is_card_invoice
      else ent.is_card_invoice
    end,
    updated_at = case
      when excluded.updated_at >= ent.updated_at then excluded.updated_at
      else ent.updated_at
    end;
end;
$$;

grant execute on function public.sync_entries_snapshot(jsonb) to anon;
grant execute on function public.sync_entries_snapshot(jsonb) to authenticated;

-- ===== 20260420150000_sync_entries_delta_rpc.sql =====
-- Sincronização delta: reconcilia exclusões com a lista completa de ids locais
-- e envia apenas o corpo dos lançamentos alterados (changes_json).

create or replace function public.sync_entries_delta(
  present_ids uuid[],
  changes_json jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.entries e
  where not (e.id = any(coalesce(present_ids, array[]::uuid[])));

  insert into public.entries as ent (
    id,
    name,
    amount,
    due_date,
    is_paid,
    type,
    created_at,
    category,
    tag,
    installments_count,
    installment_number,
    parent_installment_id,
    is_recurring,
    recurrence_count,
    recurrence_template_id,
    goal_id,
    paid_date,
    card_id,
    is_card_invoice,
    updated_at
  )
  select
    (elem->>'id')::uuid,
    coalesce(nullif(elem->>'name', ''), 'Sem nome'),
    coalesce((elem->>'amount')::numeric, 0),
    coalesce((elem->>'due_date')::date, current_date),
    coalesce((elem->>'is_paid')::boolean, false),
    coalesce(nullif(elem->>'type', ''), 'debt'),
    coalesce((elem->>'created_at')::timestamptz, now()),
    nullif(elem->>'category', '')::text,
    nullif(elem->>'tag', '')::text,
    (elem->>'installments_count')::integer,
    (elem->>'installment_number')::integer,
    nullif(elem->>'parent_installment_id', '')::text,
    coalesce((elem->>'is_recurring')::boolean, false),
    (elem->>'recurrence_count')::integer,
    nullif(elem->>'recurrence_template_id', '')::text,
    nullif(elem->>'goal_id', '')::text,
    nullif(elem->>'paid_date', '')::date,
    nullif(elem->>'card_id', '')::uuid,
    coalesce((elem->>'is_card_invoice')::boolean, false),
    coalesce((elem->>'updated_at')::timestamptz, (elem->>'created_at')::timestamptz, now())
  from jsonb_array_elements(coalesce(changes_json, '[]'::jsonb)) as t(elem)
  on conflict (id) do update set
    name = case
      when excluded.updated_at >= ent.updated_at then excluded.name
      else ent.name
    end,
    amount = case
      when excluded.updated_at >= ent.updated_at then excluded.amount
      else ent.amount
    end,
    due_date = case
      when excluded.updated_at >= ent.updated_at then excluded.due_date
      else ent.due_date
    end,
    is_paid = case
      when excluded.updated_at >= ent.updated_at then excluded.is_paid
      else ent.is_paid
    end,
    type = case
      when excluded.updated_at >= ent.updated_at then excluded.type
      else ent.type
    end,
    created_at = case
      when excluded.updated_at >= ent.updated_at then excluded.created_at
      else ent.created_at
    end,
    category = case
      when excluded.updated_at >= ent.updated_at then excluded.category
      else ent.category
    end,
    tag = case
      when excluded.updated_at >= ent.updated_at then excluded.tag
      else ent.tag
    end,
    installments_count = case
      when excluded.updated_at >= ent.updated_at then excluded.installments_count
      else ent.installments_count
    end,
    installment_number = case
      when excluded.updated_at >= ent.updated_at then excluded.installment_number
      else ent.installment_number
    end,
    parent_installment_id = case
      when excluded.updated_at >= ent.updated_at then excluded.parent_installment_id
      else ent.parent_installment_id
    end,
    is_recurring = case
      when excluded.updated_at >= ent.updated_at then excluded.is_recurring
      else ent.is_recurring
    end,
    recurrence_count = case
      when excluded.updated_at >= ent.updated_at then excluded.recurrence_count
      else ent.recurrence_count
    end,
    recurrence_template_id = case
      when excluded.updated_at >= ent.updated_at then excluded.recurrence_template_id
      else ent.recurrence_template_id
    end,
    goal_id = case
      when excluded.updated_at >= ent.updated_at then excluded.goal_id
      else ent.goal_id
    end,
    paid_date = case
      when excluded.updated_at >= ent.updated_at then excluded.paid_date
      else ent.paid_date
    end,
    card_id = case
      when excluded.updated_at >= ent.updated_at then excluded.card_id
      else ent.card_id
    end,
    is_card_invoice = case
      when excluded.updated_at >= ent.updated_at then excluded.is_card_invoice
      else ent.is_card_invoice
    end,
    updated_at = case
      when excluded.updated_at >= ent.updated_at then excluded.updated_at
      else ent.updated_at
    end;
end;
$$;

grant execute on function public.sync_entries_delta(uuid[], jsonb) to anon;
grant execute on function public.sync_entries_delta(uuid[], jsonb) to authenticated;

-- ===== 20260420160000_entries_server_revision_occ.sql =====
-- Revisão no servidor (OCC): `revision` incrementada só quando o cliente envia a revisão esperada.
-- `updated_at` no servidor via trigger (clock_timestamp) em todo insert/update na tabela.

-- Trigger usa NEW.updated_at: garantir coluna mesmo se migrações anteriores não rodaram neste projeto.
alter table public.entries add column if not exists updated_at timestamptz;

update public.entries
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;

alter table public.entries
  alter column updated_at set default now();

alter table public.entries add column if not exists revision bigint;

update public.entries set revision = 1 where revision is null;

alter table public.entries
  alter column revision set default 1,
  alter column revision set not null;

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

create or replace function public.insert_entries_batch(entries_json jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  i int;
  n int;
  r jsonb;
begin
  n := jsonb_array_length(coalesce(entries_json, '[]'::jsonb));
  for i in 0 .. n - 1
  loop
    r := (coalesce(entries_json, '[]'::jsonb))->i;
    insert into public.entries (
      id,
      name,
      amount,
      due_date,
      is_paid,
      type,
      created_at,
      category,
      tag,
      installments_count,
      installment_number,
      parent_installment_id,
      is_recurring,
      recurrence_count,
      recurrence_template_id,
      goal_id,
      paid_date,
      card_id,
      is_card_invoice,
      revision
    )
    values (
      (r->>'id')::uuid,
      nullif(r->>'name', '')::text,
      coalesce((r->>'amount')::numeric, 0),
      (r->>'due_date')::date,
      coalesce((r->>'is_paid')::boolean, false),
      nullif(r->>'type', '')::text,
      coalesce((r->>'created_at')::timestamptz, now()),
      nullif(r->>'category', '')::text,
      nullif(r->>'tag', '')::text,
      (r->>'installments_count')::integer,
      (r->>'installment_number')::integer,
      nullif(r->>'parent_installment_id', '')::text,
      coalesce((r->>'is_recurring')::boolean, false),
      (r->>'recurrence_count')::integer,
      nullif(r->>'recurrence_template_id', '')::text,
      nullif(r->>'goal_id', '')::text,
      nullif(r->>'paid_date', '')::date,
      nullif(r->>'card_id', '')::uuid,
      coalesce((r->>'is_card_invoice')::boolean, false),
      1::bigint
    );
  end loop;
end;
$$;

grant execute on function public.insert_entries_batch(jsonb) to anon;
grant execute on function public.insert_entries_batch(jsonb) to authenticated;

create or replace function public.sync_entries_delta(
  present_ids uuid[],
  changes_json jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  i int;
  n int;
  e jsonb;
  rid uuid;
  exp_rev bigint;
  cur_rev bigint;
begin
  delete from public.entries x
  where not (x.id = any(coalesce(present_ids, array[]::uuid[])));

  n := jsonb_array_length(coalesce(changes_json, '[]'::jsonb));
  for i in 0 .. n - 1
  loop
    e := (coalesce(changes_json, '[]'::jsonb))->i;
    rid := (e->>'id')::uuid;
    exp_rev := coalesce((e->>'revision')::bigint, 0);

    select v.revision into cur_rev from public.entries v where v.id = rid;
    if not found then
      insert into public.entries (
        id,
        name,
        amount,
        due_date,
        is_paid,
        type,
        created_at,
        category,
        tag,
        installments_count,
        installment_number,
        parent_installment_id,
        is_recurring,
        recurrence_count,
        recurrence_template_id,
        goal_id,
        paid_date,
        card_id,
        is_card_invoice,
        revision
      )
      values (
        rid,
        coalesce(nullif(e->>'name', ''), 'Sem nome'),
        coalesce((e->>'amount')::numeric, 0),
        coalesce((e->>'due_date')::date, current_date),
        coalesce((e->>'is_paid')::boolean, false),
        coalesce(nullif(e->>'type', ''), 'debt'),
        coalesce((e->>'created_at')::timestamptz, now()),
        nullif(e->>'category', '')::text,
        nullif(e->>'tag', '')::text,
        (e->>'installments_count')::integer,
        (e->>'installment_number')::integer,
        nullif(e->>'parent_installment_id', '')::text,
        coalesce((e->>'is_recurring')::boolean, false),
        (e->>'recurrence_count')::integer,
        nullif(e->>'recurrence_template_id', '')::text,
        nullif(e->>'goal_id', '')::text,
        nullif(e->>'paid_date', '')::date,
        nullif(e->>'card_id', '')::uuid,
        coalesce((e->>'is_card_invoice')::boolean, false),
        1::bigint
      );
    elsif exp_rev = cur_rev then
      update public.entries u
      set
        name = coalesce(nullif(e->>'name', ''), 'Sem nome'),
        amount = coalesce((e->>'amount')::numeric, 0),
        due_date = coalesce((e->>'due_date')::date, current_date),
        is_paid = coalesce((e->>'is_paid')::boolean, false),
        type = coalesce(nullif(e->>'type', ''), 'debt'),
        created_at = coalesce((e->>'created_at')::timestamptz, u.created_at),
        category = nullif(e->>'category', '')::text,
        tag = nullif(e->>'tag', '')::text,
        installments_count = (e->>'installments_count')::integer,
        installment_number = (e->>'installment_number')::integer,
        parent_installment_id = nullif(e->>'parent_installment_id', '')::text,
        is_recurring = coalesce((e->>'is_recurring')::boolean, false),
        recurrence_count = (e->>'recurrence_count')::integer,
        recurrence_template_id = nullif(e->>'recurrence_template_id', '')::text,
        goal_id = nullif(e->>'goal_id', '')::text,
        paid_date = nullif(e->>'paid_date', '')::date,
        card_id = nullif(e->>'card_id', '')::uuid,
        is_card_invoice = coalesce((e->>'is_card_invoice')::boolean, false),
        revision = cur_rev + 1
      where u.id = rid;
    end if;
  end loop;
end;
$$;

grant execute on function public.sync_entries_delta(uuid[], jsonb) to anon;
grant execute on function public.sync_entries_delta(uuid[], jsonb) to authenticated;

create or replace function public.sync_entries_snapshot(entries_json jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  i int;
  n int;
  e jsonb;
  rid uuid;
  exp_rev bigint;
  cur_rev bigint;
begin
  delete from public.entries x
  where not exists (
    select 1
    from jsonb_array_elements(coalesce(entries_json, '[]'::jsonb)) as j(elem)
    where (j.elem->>'id')::uuid = x.id
  );

  n := jsonb_array_length(coalesce(entries_json, '[]'::jsonb));
  for i in 0 .. n - 1
  loop
    e := (coalesce(entries_json, '[]'::jsonb))->i;
    rid := (e->>'id')::uuid;
    exp_rev := coalesce((e->>'revision')::bigint, 0);

    select v.revision into cur_rev from public.entries v where v.id = rid;
    if not found then
      insert into public.entries (
        id,
        name,
        amount,
        due_date,
        is_paid,
        type,
        created_at,
        category,
        tag,
        installments_count,
        installment_number,
        parent_installment_id,
        is_recurring,
        recurrence_count,
        recurrence_template_id,
        goal_id,
        paid_date,
        card_id,
        is_card_invoice,
        revision
      )
      values (
        rid,
        coalesce(nullif(e->>'name', ''), 'Sem nome'),
        coalesce((e->>'amount')::numeric, 0),
        coalesce((e->>'due_date')::date, current_date),
        coalesce((e->>'is_paid')::boolean, false),
        coalesce(nullif(e->>'type', ''), 'debt'),
        coalesce((e->>'created_at')::timestamptz, now()),
        nullif(e->>'category', '')::text,
        nullif(e->>'tag', '')::text,
        (e->>'installments_count')::integer,
        (e->>'installment_number')::integer,
        nullif(e->>'parent_installment_id', '')::text,
        coalesce((e->>'is_recurring')::boolean, false),
        (e->>'recurrence_count')::integer,
        nullif(e->>'recurrence_template_id', '')::text,
        nullif(e->>'goal_id', '')::text,
        nullif(e->>'paid_date', '')::date,
        nullif(e->>'card_id', '')::uuid,
        coalesce((e->>'is_card_invoice')::boolean, false),
        1::bigint
      );
    elsif exp_rev = cur_rev then
      update public.entries u
      set
        name = coalesce(nullif(e->>'name', ''), 'Sem nome'),
        amount = coalesce((e->>'amount')::numeric, 0),
        due_date = coalesce((e->>'due_date')::date, current_date),
        is_paid = coalesce((e->>'is_paid')::boolean, false),
        type = coalesce(nullif(e->>'type', ''), 'debt'),
        created_at = coalesce((e->>'created_at')::timestamptz, u.created_at),
        category = nullif(e->>'category', '')::text,
        tag = nullif(e->>'tag', '')::text,
        installments_count = (e->>'installments_count')::integer,
        installment_number = (e->>'installment_number')::integer,
        parent_installment_id = nullif(e->>'parent_installment_id', '')::text,
        is_recurring = coalesce((e->>'is_recurring')::boolean, false),
        recurrence_count = (e->>'recurrence_count')::integer,
        recurrence_template_id = nullif(e->>'recurrence_template_id', '')::text,
        goal_id = nullif(e->>'goal_id', '')::text,
        paid_date = nullif(e->>'paid_date', '')::date,
        card_id = nullif(e->>'card_id', '')::uuid,
        is_card_invoice = coalesce((e->>'is_card_invoice')::boolean, false),
        revision = cur_rev + 1
      where u.id = rid;
    end if;
  end loop;
end;
$$;

grant execute on function public.sync_entries_snapshot(jsonb) to anon;
grant execute on function public.sync_entries_snapshot(jsonb) to authenticated;

-- ===== 20260420170000_insert_entries_batch_notnull_on_conflict.sql =====
-- Corrige 400 em insert_entries_batch: name/type NOT NULL e idempotência (ON CONFLICT DO NOTHING).

create or replace function public.insert_entries_batch(entries_json jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  i int;
  n int;
  r jsonb;
begin
  n := jsonb_array_length(coalesce(entries_json, '[]'::jsonb));
  for i in 0 .. n - 1
  loop
    r := (coalesce(entries_json, '[]'::jsonb))->i;
    insert into public.entries (
      id,
      name,
      amount,
      due_date,
      is_paid,
      type,
      created_at,
      category,
      tag,
      installments_count,
      installment_number,
      parent_installment_id,
      is_recurring,
      recurrence_count,
      recurrence_template_id,
      goal_id,
      paid_date,
      card_id,
      is_card_invoice,
      revision
    )
    values (
      (r->>'id')::uuid,
      coalesce(nullif(trim(r->>'name'), ''), 'Sem nome'),
      coalesce((r->>'amount')::numeric, 0),
      coalesce((r->>'due_date')::date, current_date),
      coalesce((r->>'is_paid')::boolean, false),
      case
        when lower(nullif(trim(r->>'type'), '')) = 'cash' then 'cash'::text
        else 'debt'::text
      end,
      coalesce((r->>'created_at')::timestamptz, now()),
      nullif(trim(r->>'category'), '')::text,
      nullif(trim(r->>'tag'), '')::text,
      (r->>'installments_count')::integer,
      (r->>'installment_number')::integer,
      nullif(trim(r->>'parent_installment_id'), '')::text,
      coalesce((r->>'is_recurring')::boolean, false),
      (r->>'recurrence_count')::integer,
      nullif(trim(r->>'recurrence_template_id'), '')::text,
      nullif(trim(r->>'goal_id'), '')::text,
      nullif(trim(r->>'paid_date'), '')::date,
      nullif(trim(r->>'card_id'), '')::uuid,
      coalesce((r->>'is_card_invoice')::boolean, false),
      1::bigint
    )
    on conflict (id) do nothing;
  end loop;
end;
$$;

grant execute on function public.insert_entries_batch(jsonb) to anon;
grant execute on function public.insert_entries_batch(jsonb) to authenticated;

-- ===== 20260420180000_entries_ensure_updated_at_column.sql =====
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

-- ===== 20260420190000_entries_invoice_payment_due_date.sql =====
-- Data de vencimento do pagamento da fatura (mês seguinte ao ciclo), separada de due_date (fechamento no ciclo).

alter table public.entries add column if not exists invoice_payment_due_date date;

create or replace function public.insert_entries_batch(entries_json jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  i int;
  n int;
  r jsonb;
begin
  n := jsonb_array_length(coalesce(entries_json, '[]'::jsonb));
  for i in 0 .. n - 1
  loop
    r := (coalesce(entries_json, '[]'::jsonb))->i;
    insert into public.entries (
      id,
      name,
      amount,
      due_date,
      is_paid,
      type,
      created_at,
      category,
      tag,
      installments_count,
      installment_number,
      parent_installment_id,
      is_recurring,
      recurrence_count,
      recurrence_template_id,
      goal_id,
      paid_date,
      card_id,
      is_card_invoice,
      invoice_payment_due_date,
      revision
    )
    values (
      (r->>'id')::uuid,
      coalesce(nullif(trim(r->>'name'), ''), 'Sem nome'),
      coalesce((r->>'amount')::numeric, 0),
      coalesce((r->>'due_date')::date, current_date),
      coalesce((r->>'is_paid')::boolean, false),
      case
        when lower(nullif(trim(r->>'type'), '')) = 'cash' then 'cash'::text
        else 'debt'::text
      end,
      coalesce((r->>'created_at')::timestamptz, now()),
      nullif(trim(r->>'category'), '')::text,
      nullif(trim(r->>'tag'), '')::text,
      (r->>'installments_count')::integer,
      (r->>'installment_number')::integer,
      nullif(trim(r->>'parent_installment_id'), '')::text,
      coalesce((r->>'is_recurring')::boolean, false),
      (r->>'recurrence_count')::integer,
      nullif(trim(r->>'recurrence_template_id'), '')::text,
      nullif(trim(r->>'goal_id'), '')::text,
      nullif(trim(r->>'paid_date'), '')::date,
      nullif(trim(r->>'card_id'), '')::uuid,
      coalesce((r->>'is_card_invoice')::boolean, false),
      nullif(trim(r->>'invoice_payment_due_date'), '')::date,
      1::bigint
    )
    on conflict (id) do nothing;
  end loop;
end;
$$;

grant execute on function public.insert_entries_batch(jsonb) to anon;
grant execute on function public.insert_entries_batch(jsonb) to authenticated;

create or replace function public.sync_entries_delta(
  present_ids uuid[],
  changes_json jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  i int;
  n int;
  e jsonb;
  rid uuid;
  exp_rev bigint;
  cur_rev bigint;
begin
  delete from public.entries x
  where not (x.id = any(coalesce(present_ids, array[]::uuid[])));

  n := jsonb_array_length(coalesce(changes_json, '[]'::jsonb));
  for i in 0 .. n - 1
  loop
    e := (coalesce(changes_json, '[]'::jsonb))->i;
    rid := (e->>'id')::uuid;
    exp_rev := coalesce((e->>'revision')::bigint, 0);

    select v.revision into cur_rev from public.entries v where v.id = rid;
    if not found then
      insert into public.entries (
        id,
        name,
        amount,
        due_date,
        is_paid,
        type,
        created_at,
        category,
        tag,
        installments_count,
        installment_number,
        parent_installment_id,
        is_recurring,
        recurrence_count,
        recurrence_template_id,
        goal_id,
        paid_date,
        card_id,
        is_card_invoice,
        invoice_payment_due_date,
        revision
      )
      values (
        rid,
        coalesce(nullif(e->>'name', ''), 'Sem nome'),
        coalesce((e->>'amount')::numeric, 0),
        coalesce((e->>'due_date')::date, current_date),
        coalesce((e->>'is_paid')::boolean, false),
        coalesce(nullif(e->>'type', ''), 'debt'),
        coalesce((e->>'created_at')::timestamptz, now()),
        nullif(e->>'category', '')::text,
        nullif(e->>'tag', '')::text,
        (e->>'installments_count')::integer,
        (e->>'installment_number')::integer,
        nullif(e->>'parent_installment_id', '')::text,
        coalesce((e->>'is_recurring')::boolean, false),
        (e->>'recurrence_count')::integer,
        nullif(e->>'recurrence_template_id', '')::text,
        nullif(e->>'goal_id', '')::text,
        nullif(e->>'paid_date', '')::date,
        nullif(e->>'card_id', '')::uuid,
        coalesce((e->>'is_card_invoice')::boolean, false),
        nullif(e->>'invoice_payment_due_date', '')::date,
        1::bigint
      );
    elsif exp_rev = cur_rev then
      update public.entries u
      set
        name = coalesce(nullif(e->>'name', ''), 'Sem nome'),
        amount = coalesce((e->>'amount')::numeric, 0),
        due_date = coalesce((e->>'due_date')::date, current_date),
        is_paid = coalesce((e->>'is_paid')::boolean, false),
        type = coalesce(nullif(e->>'type', ''), 'debt'),
        created_at = coalesce((e->>'created_at')::timestamptz, u.created_at),
        category = nullif(e->>'category', '')::text,
        tag = nullif(e->>'tag', '')::text,
        installments_count = (e->>'installments_count')::integer,
        installment_number = (e->>'installment_number')::integer,
        parent_installment_id = nullif(e->>'parent_installment_id', '')::text,
        is_recurring = coalesce((e->>'is_recurring')::boolean, false),
        recurrence_count = (e->>'recurrence_count')::integer,
        recurrence_template_id = nullif(e->>'recurrence_template_id', '')::text,
        goal_id = nullif(e->>'goal_id', '')::text,
        paid_date = nullif(e->>'paid_date', '')::date,
        card_id = nullif(e->>'card_id', '')::uuid,
        is_card_invoice = coalesce((e->>'is_card_invoice')::boolean, false),
        invoice_payment_due_date = nullif(e->>'invoice_payment_due_date', '')::date,
        revision = cur_rev + 1
      where u.id = rid;
    end if;
  end loop;
end;
$$;

grant execute on function public.sync_entries_delta(uuid[], jsonb) to anon;
grant execute on function public.sync_entries_delta(uuid[], jsonb) to authenticated;

create or replace function public.sync_entries_snapshot(entries_json jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  i int;
  n int;
  e jsonb;
  rid uuid;
  exp_rev bigint;
  cur_rev bigint;
begin
  delete from public.entries x
  where not exists (
    select 1
    from jsonb_array_elements(coalesce(entries_json, '[]'::jsonb)) as j(elem)
    where (j.elem->>'id')::uuid = x.id
  );

  n := jsonb_array_length(coalesce(entries_json, '[]'::jsonb));
  for i in 0 .. n - 1
  loop
    e := (coalesce(entries_json, '[]'::jsonb))->i;
    rid := (e->>'id')::uuid;
    exp_rev := coalesce((e->>'revision')::bigint, 0);

    select v.revision into cur_rev from public.entries v where v.id = rid;
    if not found then
      insert into public.entries (
        id,
        name,
        amount,
        due_date,
        is_paid,
        type,
        created_at,
        category,
        tag,
        installments_count,
        installment_number,
        parent_installment_id,
        is_recurring,
        recurrence_count,
        recurrence_template_id,
        goal_id,
        paid_date,
        card_id,
        is_card_invoice,
        invoice_payment_due_date,
        revision
      )
      values (
        rid,
        coalesce(nullif(e->>'name', ''), 'Sem nome'),
        coalesce((e->>'amount')::numeric, 0),
        coalesce((e->>'due_date')::date, current_date),
        coalesce((e->>'is_paid')::boolean, false),
        coalesce(nullif(e->>'type', ''), 'debt'),
        coalesce((e->>'created_at')::timestamptz, now()),
        nullif(e->>'category', '')::text,
        nullif(e->>'tag', '')::text,
        (e->>'installments_count')::integer,
        (e->>'installment_number')::integer,
        nullif(e->>'parent_installment_id', '')::text,
        coalesce((e->>'is_recurring')::boolean, false),
        (e->>'recurrence_count')::integer,
        nullif(e->>'recurrence_template_id', '')::text,
        nullif(e->>'goal_id', '')::text,
        nullif(e->>'paid_date', '')::date,
        nullif(e->>'card_id', '')::uuid,
        coalesce((e->>'is_card_invoice')::boolean, false),
        nullif(e->>'invoice_payment_due_date', '')::date,
        1::bigint
      );
    elsif exp_rev = cur_rev then
      update public.entries u
      set
        name = coalesce(nullif(e->>'name', ''), 'Sem nome'),
        amount = coalesce((e->>'amount')::numeric, 0),
        due_date = coalesce((e->>'due_date')::date, current_date),
        is_paid = coalesce((e->>'is_paid')::boolean, false),
        type = coalesce(nullif(e->>'type', ''), 'debt'),
        created_at = coalesce((e->>'created_at')::timestamptz, u.created_at),
        category = nullif(e->>'category', '')::text,
        tag = nullif(e->>'tag', '')::text,
        installments_count = (e->>'installments_count')::integer,
        installment_number = (e->>'installment_number')::integer,
        parent_installment_id = nullif(e->>'parent_installment_id', '')::text,
        is_recurring = coalesce((e->>'is_recurring')::boolean, false),
        recurrence_count = (e->>'recurrence_count')::integer,
        recurrence_template_id = nullif(e->>'recurrence_template_id', '')::text,
        goal_id = nullif(e->>'goal_id', '')::text,
        paid_date = nullif(e->>'paid_date', '')::date,
        card_id = nullif(e->>'card_id', '')::uuid,
        is_card_invoice = coalesce((e->>'is_card_invoice')::boolean, false),
        invoice_payment_due_date = nullif(e->>'invoice_payment_due_date', '')::date,
        revision = cur_rev + 1
      where u.id = rid;
    end if;
  end loop;
end;
$$;

grant execute on function public.sync_entries_snapshot(jsonb) to anon;
grant execute on function public.sync_entries_snapshot(jsonb) to authenticated;

-- ===== 20260807000000_sync_entries_delta_safe_merge.sql =====
-- Sincronização delta segura: NÃO apaga mais registros do servidor que não existam no
-- snapshot local ("delete cego" causava perda de dados em uso multi-dispositivo).
-- A deleção agora é explícita: o cliente envia os ids removidos em `deleted_ids`
-- (default vazio = chamadas antigas de 2 parâmetros continuam funcionando sem deletar nada).
-- O merge por id + revision permanece idempotente.

create or replace function public.sync_entries_delta(
  present_ids uuid[],
  changes_json jsonb,
  deleted_ids uuid[] default '{}'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  i int;
  n int;
  e jsonb;
  rid uuid;
  exp_rev bigint;
  cur_rev bigint;
begin
  -- `present_ids` é ignorado propositalmente: registros que existem no servidor mas não
  -- no snapshot local podem ter sido criados em outro dispositivo e NÃO devem ser apagados.
  -- Somente ids enviados explicitamente em `deleted_ids` são removidos.

  delete from public.entries x
  where x.id = any(coalesce(deleted_ids, array[]::uuid[]));

  n := jsonb_array_length(coalesce(changes_json, '[]'::jsonb));
  for i in 0 .. n - 1
  loop
    e := (coalesce(changes_json, '[]'::jsonb))->i;
    rid := (e->>'id')::uuid;
    exp_rev := coalesce((e->>'revision')::bigint, 0);

    select v.revision into cur_rev from public.entries v where v.id = rid;
    if not found then
      insert into public.entries (
        id,
        name,
        amount,
        due_date,
        is_paid,
        type,
        created_at,
        category,
        tag,
        installments_count,
        installment_number,
        parent_installment_id,
        is_recurring,
        recurrence_count,
        recurrence_template_id,
        goal_id,
        paid_date,
        card_id,
        is_card_invoice,
        invoice_payment_due_date,
        revision
      )
      values (
        rid,
        coalesce(nullif(e->>'name', ''), 'Sem nome'),
        coalesce((e->>'amount')::numeric, 0),
        coalesce((e->>'due_date')::date, current_date),
        coalesce((e->>'is_paid')::boolean, false),
        coalesce(nullif(e->>'type', ''), 'debt'),
        coalesce((e->>'created_at')::timestamptz, now()),
        nullif(e->>'category', '')::text,
        nullif(e->>'tag', '')::text,
        (e->>'installments_count')::integer,
        (e->>'installment_number')::integer,
        nullif(e->>'parent_installment_id', '')::text,
        coalesce((e->>'is_recurring')::boolean, false),
        (e->>'recurrence_count')::integer,
        nullif(e->>'recurrence_template_id', '')::text,
        nullif(e->>'goal_id', '')::text,
        nullif(e->>'paid_date', '')::date,
        nullif(e->>'card_id', '')::uuid,
        coalesce((e->>'is_card_invoice')::boolean, false),
        nullif(e->>'invoice_payment_due_date', '')::date,
        1::bigint
      );
    elsif exp_rev = cur_rev then
      update public.entries u
      set
        name = coalesce(nullif(e->>'name', ''), 'Sem nome'),
        amount = coalesce((e->>'amount')::numeric, 0),
        due_date = coalesce((e->>'due_date')::date, current_date),
        is_paid = coalesce((e->>'is_paid')::boolean, false),
        type = coalesce(nullif(e->>'type', ''), 'debt'),
        created_at = coalesce((e->>'created_at')::timestamptz, u.created_at),
        category = nullif(e->>'category', '')::text,
        tag = nullif(e->>'tag', '')::text,
        installments_count = (e->>'installments_count')::integer,
        installment_number = (e->>'installment_number')::integer,
        parent_installment_id = nullif(e->>'parent_installment_id', '')::text,
        is_recurring = coalesce((e->>'is_recurring')::boolean, false),
        recurrence_count = (e->>'recurrence_count')::integer,
        recurrence_template_id = nullif(e->>'recurrence_template_id', '')::text,
        goal_id = nullif(e->>'goal_id', '')::text,
        paid_date = nullif(e->>'paid_date', '')::date,
        card_id = nullif(e->>'card_id', '')::uuid,
        is_card_invoice = coalesce((e->>'is_card_invoice')::boolean, false),
        invoice_payment_due_date = nullif(e->>'invoice_payment_due_date', '')::date,
        revision = cur_rev + 1
      where u.id = rid;
    end if;
  end loop;
end;
$$;

grant execute on function public.sync_entries_delta(uuid[], jsonb, uuid[]) to anon;
grant execute on function public.sync_entries_delta(uuid[], jsonb, uuid[]) to authenticated;

-- ===== 20260807000001_drop_unsafe_sync_entries_delta_2args.sql =====
-- Remove a sobrecarga antiga de public.sync_entries_delta(uuid[], jsonb).
--
-- A migração 20260807000000 criou a versão segura com 3 argumentos e valor padrão
-- em `deleted_ids`, mas a função de 2 argumentos continuou existindo. No PostgreSQL,
-- uma chamada com 2 argumentos resolve para a sobrecarga exata, não para a versão
-- com default — ou seja, clientes antigos (inclusive PWA em cache) ainda executavam
-- o "delete cego" e podiam apagar lançamentos criados em outro dispositivo.
--
-- Com a sobrecarga removida, chamadas antigas de 2 argumentos passam a usar a versão
-- segura, cujo `deleted_ids` default é vazio.

drop function if exists public.sync_entries_delta(uuid[], jsonb);

-- Atualiza o cache de schema do PostgREST para refletir a remoção imediatamente.
notify pgrst, 'reload schema';

-- ===== 20260807000002_drop_unsafe_sync_entries_snapshot.sql =====
-- Remove o RPC antigo de snapshot.
--
-- `sync_entries_snapshot(entries_json)` apagava do servidor todo lançamento que não
-- estivesse no array enviado. Como o RPC é exposto ao papel `anon`, qualquer cliente
-- com a chave pública podia chamá-lo com `[]` e apagar a tabela inteira. O app atual
-- não usa mais esse RPC (a sincronização é feita por `sync_entries_delta` com
-- `deleted_ids` explícito), então ele é removido para eliminar esse risco.

drop function if exists public.sync_entries_snapshot(jsonb);

notify pgrst, 'reload schema';


-- ===== 20260808000000_create_loans_table.sql =====
-- Tabela public.loans para o módulo de empréstimos
-- source_type: 'pessoa_fisica' | 'trabalhador' (de onde será pago)

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

-- ===== 20261108000000_delete_goal_with_entries_rpc.sql =====
-- Exclusão atômica de meta: remove os lançamentos vinculados e a própria meta
-- numa única transação. Se qualquer parte falhar, nada é removido.

create or replace function public.delete_goal_with_entries(p_goal_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.entries where goal_id = p_goal_id::text;
  delete from public.goals where id = p_goal_id;
end;
$$;

grant execute on function public.delete_goal_with_entries(uuid) to anon;
grant execute on function public.delete_goal_with_entries(uuid) to authenticated;
