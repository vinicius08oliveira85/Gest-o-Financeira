-- Idempotente: não falha se as colunas já existirem
ALTER TABLE public.entries
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS tag TEXT,
  ADD COLUMN IF NOT EXISTS "installmentsCount" INTEGER,
  ADD COLUMN IF NOT EXISTS "installmentNumber" INTEGER,
  ADD COLUMN IF NOT EXISTS "parentInstallmentId" TEXT;