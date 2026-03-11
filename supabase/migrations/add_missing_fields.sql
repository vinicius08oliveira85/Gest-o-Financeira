ALTER TABLE public.entries
ADD COLUMN category TEXT,
ADD COLUMN tag TEXT,
ADD COLUMN "installmentsCount" INTEGER,
ADD COLUMN "installmentNumber" INTEGER,
ADD COLUMN "parentInstallmentId" TEXT;