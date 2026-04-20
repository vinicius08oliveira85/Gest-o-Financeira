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
