-- Revisão no servidor (OCC): `revision` incrementada só quando o cliente envia a revisão esperada.
-- `updated_at` no servidor via trigger (clock_timestamp) em todo insert/update na tabela.

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
