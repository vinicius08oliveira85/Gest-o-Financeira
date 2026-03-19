-- Tabelas para o módulo de cartão de crédito
-- Execute no Supabase Dashboard (SQL Editor) se não usar CLI.

create table if not exists public.credit_cards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  limit_amount numeric(12,2) not null default 0,
  closing_day integer not null default 25,
  due_day integer not null default 5,
  color text,
  created_at timestamptz default now()
);

create table if not exists public.card_expenses (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.credit_cards(id) on delete cascade,
  name text not null,
  amount numeric(12,2) not null,
  date date not null,
  billing_month integer not null,
  billing_year integer not null,
  category text,
  tag text,
  installments_count integer,
  installment_number integer,
  parent_installment_id uuid,
  created_at timestamptz default now()
);

alter table public.entries
  add column if not exists card_id uuid references public.credit_cards(id),
  add column if not exists is_card_invoice boolean default false;
