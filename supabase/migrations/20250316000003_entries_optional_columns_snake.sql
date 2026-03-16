-- Colunas opcionais em snake_case para public.entries (para insert_entries_batch e cliente).
-- Execute se a tabela entries só tiver as colunas base; ignore se já tiver category, tag etc.

alter table public.entries
  add column if not exists category text,
  add column if not exists tag text,
  add column if not exists installments_count integer,
  add column if not exists installment_number integer,
  add column if not exists parent_installment_id text;
