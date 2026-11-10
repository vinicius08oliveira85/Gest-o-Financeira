import { Query } from 'appwrite';
import { COLLECTIONS } from './appwrite';
import {
  deleteDocumentById,
  deleteDocumentsMatching,
  listAllDocuments,
  saveDocument,
  updateDocumentFields,
} from './appwriteDb';
import type { CardExpense } from '../types';
import { randomUUID } from './uuid';

export type CardExpenseRow = {
  id: string;
  card_id: string;
  name: string;
  amount: number;
  date: string;
  billing_month: number;
  billing_year: number;
  category?: string | null;
  tag?: string | null;
  installments_count?: number | null;
  installment_number?: number | null;
  parent_installment_id?: string | null;
  created_at?: string | null;
};

export function rowToExpense(row: CardExpenseRow): CardExpense {
  return {
    id: row.id,
    cardId: row.card_id,
    name: row.name,
    amount: Number(row.amount),
    date: row.date,
    billingMonth: row.billing_month,
    billingYear: row.billing_year,
    category: row.category ?? undefined,
    tag: row.tag ?? undefined,
    installmentsCount: row.installments_count ?? undefined,
    installmentNumber: row.installment_number ?? undefined,
    parentInstallmentId: row.parent_installment_id ?? undefined,
    createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
  };
}

export function expenseToRow(
  expense: Omit<CardExpense, 'id'> & { id?: string }
): Omit<CardExpenseRow, 'id' | 'created_at'> {
  return {
    card_id: expense.cardId,
    name: expense.name,
    amount: expense.amount,
    date: expense.date,
    billing_month: expense.billingMonth,
    billing_year: expense.billingYear,
    category: expense.category ?? null,
    tag: expense.tag ?? null,
    installments_count: expense.installmentsCount ?? null,
    installment_number: expense.installmentNumber ?? null,
    parent_installment_id: expense.parentInstallmentId ?? null,
  };
}

export async function fetchExpensesByCard(cardId: string): Promise<CardExpense[]> {
  const rows = await listAllDocuments<CardExpenseRow>(COLLECTIONS.cardExpenses, [
    Query.equal('card_id', cardId),
    Query.orderDesc('date'),
  ]);
  return rows.map((row) => rowToExpense({ ...row, id: row.$id }));
}

export async function fetchAllExpenses(): Promise<CardExpense[]> {
  const rows = await listAllDocuments<CardExpenseRow>(COLLECTIONS.cardExpenses, [
    Query.orderDesc('date'),
  ]);
  return rows.map((row) => rowToExpense({ ...row, id: row.$id }));
}

export async function insertExpense(expense: Omit<CardExpense, 'id'>): Promise<CardExpense> {
  const id = randomUUID();
  return upsertExpense({ ...expense, id });
}

/**
 * Inserção/atualização preservando o `id` — usado na migração do backup local.
 * `insertExpense` gera um id novo, o que criaria duplicatas a cada hydrate.
 */
export async function upsertExpense(
  expense: Omit<CardExpense, 'id'> & { id?: string }
): Promise<CardExpense> {
  const id = expense.id ?? randomUUID();
  const doc = await saveDocument<CardExpenseRow>(COLLECTIONS.cardExpenses, id, {
    ...expenseToRow(expense),
    created_at: new Date(expense.createdAt ?? Date.now()).toISOString(),
  });
  return rowToExpense({ ...doc, id: doc.$id });
}

export async function updateExpense(expense: CardExpense): Promise<CardExpense> {
  const doc = await updateDocumentFields<CardExpenseRow>(
    COLLECTIONS.cardExpenses,
    expense.id,
    expenseToRow(expense)
  );
  return rowToExpense({ ...doc, id: doc.$id });
}

export async function deleteExpense(id: string): Promise<void> {
  await deleteDocumentById(COLLECTIONS.cardExpenses, id);
}

/** Remove todos os gastos de um cartão (usado ao excluir o cartão). */
export async function deleteExpensesByCard(cardId: string): Promise<void> {
  await deleteDocumentsMatching(COLLECTIONS.cardExpenses, [Query.equal('card_id', cardId)]);
}
