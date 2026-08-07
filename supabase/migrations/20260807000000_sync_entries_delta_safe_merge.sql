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
