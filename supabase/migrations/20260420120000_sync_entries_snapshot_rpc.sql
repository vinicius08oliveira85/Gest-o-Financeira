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
