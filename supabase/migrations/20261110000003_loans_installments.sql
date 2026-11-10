-- Empréstimos parcelados.
-- installments: lista de parcelas (number, amount, dueDate, paid, paidDate, entryId).
-- installments_count: número de parcelas (null = pagamento único).

alter table public.loans
  add column if not exists installments_count integer;

alter table public.loans
  add column if not exists installments jsonb;

-- Atualiza o cache de schema do PostgREST para as colunas aparecerem imediatamente.
notify pgrst, 'reload schema';
