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
