-- Período do desconto do empréstimo (início e fim), no formato YYYY-MM.
-- No parcelado o período define as parcelas; no empréstimo do trabalhador ele
-- registra de quando até quando o valor é descontado do salário.

alter table public.loans
  add column if not exists discount_start text;

alter table public.loans
  add column if not exists discount_end text;

-- Atualiza o cache de schema do PostgREST para as colunas aparecerem imediatamente.
notify pgrst, 'reload schema';
