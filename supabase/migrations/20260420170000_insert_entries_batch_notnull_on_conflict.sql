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
