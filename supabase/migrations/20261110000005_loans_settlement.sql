-- Quitação antecipada do empréstimo: valor pago à vista, data, lançamento
-- gerado e as parcelas que a quitação cancelou (para permitir desfazer).
alter table public.loans
  add column if not exists settlement jsonb;

comment on column public.loans.settlement is
  'Quitação: { amount, date, entryId, cancelledNumbers[] } — null quando não quitado';
