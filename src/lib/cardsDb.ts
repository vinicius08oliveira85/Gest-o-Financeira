import { Query } from 'appwrite';
import { COLLECTIONS } from './appwrite';
import {
  deleteDocumentById,
  deleteDocumentsMatching,
  listAllDocuments,
  saveDocument,
} from './appwriteDb';
import type { CreditCard } from '../types';
import { randomUUID } from './uuid';

export type CreditCardRow = {
  id: string;
  name: string;
  limit_amount: number;
  closing_day: number;
  due_day: number;
  color?: string | null;
  created_at?: string | null;
};

export function rowToCard(row: CreditCardRow): CreditCard {
  return {
    id: row.id,
    name: row.name,
    limitAmount: Number(row.limit_amount),
    closingDay: row.closing_day,
    dueDay: row.due_day,
    color: row.color ?? undefined,
    createdAt: row.created_at ?? undefined,
  };
}

export function cardToRow(
  card: Omit<CreditCard, 'id'> & { id?: string }
): Omit<CreditCardRow, 'id'> {
  return {
    name: card.name,
    limit_amount: card.limitAmount,
    closing_day: card.closingDay,
    due_day: card.dueDay,
    color: card.color ?? null,
    created_at: card.createdAt ?? new Date().toISOString(),
  };
}

export async function fetchCards(): Promise<CreditCard[]> {
  const rows = await listAllDocuments<CreditCardRow>(COLLECTIONS.creditCards, [
    Query.orderAsc('created_at'),
  ]);
  return rows.map((row) => rowToCard({ ...row, id: row.$id }));
}

export async function upsertCard(
  card: Omit<CreditCard, 'id'> & { id?: string }
): Promise<CreditCard> {
  const id = card.id ?? randomUUID();
  const doc = await saveDocument<CreditCardRow>(COLLECTIONS.creditCards, id, cardToRow(card));
  return rowToCard({ ...doc, id: doc.$id });
}

/**
 * Remove o cartão e o que só existe por causa dele, na ordem que permite repetir:
 * primeiro os gastos do ciclo, depois as faturas registradas (`entries` com
 * `card_id`) e só então o cartão. Sem essa cascata no servidor, excluir o cartão
 * em outro dispositivo deixava gastos fantasmas nos relatórios e faturas
 * apontando para um cartão inexistente.
 */
export async function deleteCard(id: string): Promise<void> {
  await deleteDocumentsMatching(COLLECTIONS.cardExpenses, [Query.equal('card_id', id)]);
  await deleteDocumentsMatching(COLLECTIONS.entries, [
    Query.equal('card_id', id),
    Query.equal('is_card_invoice', true),
  ]);
  await deleteDocumentById(COLLECTIONS.creditCards, id);
}
