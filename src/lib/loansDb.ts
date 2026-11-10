import { Query } from 'appwrite';
import { COLLECTIONS } from './appwrite';
import { deleteDocumentById, listAllDocuments, saveDocument } from './appwriteDb';
import type { Loan, LoanInstallment } from '../types';
import { randomUUID } from './uuid';

/**
 * Linha do empréstimo no Appwrite. Arrays/objetos (parcelas e quitação) são
 * guardados como JSON em atributos de texto — o Appwrite não tem atributo JSON
 * livre como o `jsonb` do Postgres.
 */
export type LoanRow = {
  id: string;
  name: string;
  amount: number;
  source_type: Loan['sourceType'];
  source_name?: string | null;
  due_date: string;
  paid: boolean;
  discount_start?: string | null;
  discount_end?: string | null;
  installments_count?: number | null;
  /** Parcelas serializadas em JSON */
  installments?: string | null;
  /** Quitação serializada em JSON */
  settlement?: string | null;
  created_at?: string | null;
};

function parseJson<T>(value: unknown): T | undefined {
  if (typeof value !== 'string' || !value) return undefined;
  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}

export function rowToLoan(row: LoanRow): Loan {
  const installments = parseJson<LoanInstallment[]>(row.installments);
  const settlement = parseJson<NonNullable<Loan['settlement']>>(row.settlement);
  return {
    id: row.id,
    name: row.name,
    amount: Number(row.amount),
    sourceType: row.source_type,
    sourceName: row.source_name ?? undefined,
    dueDate: row.due_date,
    paid: row.paid ?? false,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
    discountStart: row.discount_start ?? undefined,
    discountEnd: row.discount_end ?? undefined,
    installmentsCount: row.installments_count ?? undefined,
    installments: Array.isArray(installments)
      ? installments.map((i) => ({ ...i, amount: Number(i.amount) }))
      : undefined,
    settlement: settlement ? { ...settlement, amount: Number(settlement.amount) } : undefined,
  };
}

export function loanToRow(
  loan: Omit<Loan, 'id' | 'createdAt'>
): Omit<LoanRow, 'id' | 'created_at'> {
  return {
    name: loan.name,
    amount: loan.amount,
    source_type: loan.sourceType,
    source_name: loan.sourceName?.trim() ? loan.sourceName.trim() : null,
    due_date: loan.dueDate,
    paid: loan.paid,
    discount_start: loan.discountStart ?? null,
    discount_end: loan.discountEnd ?? null,
    installments_count: loan.installmentsCount ?? null,
    installments: loan.installments ? JSON.stringify(loan.installments) : null,
    settlement: loan.settlement ? JSON.stringify(loan.settlement) : null,
  };
}

export async function fetchLoans(): Promise<Loan[]> {
  const rows = await listAllDocuments<LoanRow>(COLLECTIONS.loans, [Query.orderAsc('created_at')]);
  return rows.map((row) => rowToLoan({ ...row, id: row.$id }));
}

export async function upsertLoan(
  loan: Omit<Loan, 'id' | 'createdAt'> & { id?: string; createdAt?: number }
): Promise<Loan> {
  const id = loan.id ?? randomUUID();
  const doc = await saveDocument<LoanRow>(COLLECTIONS.loans, id, {
    ...loanToRow(loan),
    created_at: new Date(loan.createdAt ?? Date.now()).toISOString(),
  });
  return rowToLoan({ ...doc, id: doc.$id });
}

export async function deleteLoan(id: string): Promise<void> {
  await deleteDocumentById(COLLECTIONS.loans, id);
}
