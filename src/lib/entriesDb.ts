import { Query } from 'appwrite';
import { COLLECTIONS } from './appwrite';
import {
  deleteDocumentById,
  getDocumentOrNull,
  listAllDocuments,
  runInBatches,
  saveDocument,
  updateDocumentFields,
} from './appwriteDb';
import type { Entry, EntryType } from '../types';

export type EntryRow = {
  id: string;
  name: string;
  amount: number;
  due_date: string;
  is_paid: boolean;
  type: string;
  created_at: string;
  category?: string | null;
  tag?: string | null;
  installments_count?: number | null;
  installment_number?: number | null;
  parent_installment_id?: string | null;
  is_recurring?: boolean | null;
  recurrence_count?: number | null;
  recurrence_template_id?: string | null;
  goal_id?: string | null;
  paid_date?: string | null;
  card_id?: string | null;
  is_card_invoice?: boolean | null;
  invoice_payment_due_date?: string | null;
  updated_at?: string | null;
  revision?: number | null;
};

export function rowToEntry(row: EntryRow): Entry {
  return {
    id: row.id,
    name: row.name,
    amount: Number(row.amount),
    dueDate: row.due_date,
    isPaid: row.is_paid,
    type: row.type as EntryType,
    createdAt: new Date(row.created_at).getTime(),
    category: row.category ?? undefined,
    tag: row.tag ?? undefined,
    installmentsCount: row.installments_count ?? undefined,
    installmentNumber: row.installment_number ?? undefined,
    parentInstallmentId: row.parent_installment_id ?? undefined,
    isRecurring: row.is_recurring ?? undefined,
    recurrenceCount: row.recurrence_count ?? undefined,
    recurrenceTemplateId: row.recurrence_template_id ?? undefined,
    goalId: row.goal_id ?? undefined,
    paidDate: row.paid_date ?? undefined,
    cardId: row.card_id ?? undefined,
    isCardInvoice: row.is_card_invoice ?? undefined,
    invoicePaymentDueDate: row.invoice_payment_due_date ?? undefined,
    updatedAt: row.updated_at
      ? new Date(row.updated_at).getTime()
      : new Date(row.created_at).getTime(),
    revision: row.revision != null ? Number(row.revision) : 0,
  };
}

export function entryToRow(entry: Entry): Omit<EntryRow, 'created_at' | 'id'> {
  const base: Omit<
    EntryRow,
    'created_at' | 'id' | 'is_recurring' | 'recurrence_count' | 'recurrence_template_id' | 'goal_id'
  > = {
    name: entry.name,
    amount: entry.amount,
    due_date: entry.dueDate,
    is_paid: entry.isPaid,
    type: entry.type,
    category: entry.category ?? null,
    tag: entry.tag ?? null,
    installments_count: entry.installmentsCount ?? null,
    installment_number: entry.installmentNumber ?? null,
    parent_installment_id: entry.parentInstallmentId ?? null,
  };
  // Colunas adicionadas por migration: só inclui quando têm valor
  // para evitar 400 caso a coluna ainda não exista no banco
  const extended: Partial<EntryRow> = {};
  if (entry.isRecurring != null) extended.is_recurring = entry.isRecurring;
  if (entry.recurrenceCount != null) extended.recurrence_count = entry.recurrenceCount;
  if (entry.recurrenceTemplateId != null)
    extended.recurrence_template_id = entry.recurrenceTemplateId;
  if (entry.goalId != null) extended.goal_id = entry.goalId;
  if (entry.paidDate != null) extended.paid_date = entry.paidDate;
  if (entry.cardId != null) extended.card_id = entry.cardId;
  if (entry.isCardInvoice != null) extended.is_card_invoice = entry.isCardInvoice;
  if (entry.invoicePaymentDueDate != null)
    extended.invoice_payment_due_date = entry.invoicePaymentDueDate;
  return {
    ...base,
    ...extended,
    updated_at: new Date(entry.updatedAt ?? entry.createdAt).toISOString(),
    revision: entry.revision ?? 0,
  };
}

/** Marca o lançamento como alterado agora (para o merge `updated_at` no servidor). */
export function bumpEntryUpdatedAt(entry: Entry): Entry {
  return { ...entry, updatedAt: Date.now() };
}

/**
 * Busca todos os lançamentos no Appwrite. A paginação por cursor fica em
 * `listAllDocuments` (o Appwrite devolve no máximo 5000 por requisição).
 */
export async function fetchEntries(): Promise<Entry[]> {
  const rows = await listAllDocuments<EntryRow>(COLLECTIONS.entries, [
    // Mais recentes primeiro; o desempate por `$id` evita repetir/pular linhas
    // com o mesmo `created_at`.
    Query.orderDesc('created_at'),
  ]);
  return rows.map((row) => rowToEntry({ ...row, id: row.$id }));
}

function entryToBatchRow(entry: Entry): Record<string, unknown> {
  const row = entryToRow(entry);
  return {
    id: entry.id,
    ...row,
    created_at: new Date(entry.createdAt).toISOString(),
  };
}

export async function insertEntriesBatch(entries: Entry[]): Promise<void> {
  if (entries.length === 0) return;
  await runInBatches(entries, async (entry) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...row } = entryToBatchRow(entry);
    await saveDocument(COLLECTIONS.entries, entry.id, { ...row, revision: 1 });
  });
}

/**
 * Sincronização delta: `changedEntries` são os corpos a inserir/atualizar (merge por id + revision);
 * `deletedIds` são os ids que o cliente removeu explicitamente — somente esses são apagados no servidor
 * (evita "delete cego" de registros criados em outros dispositivos).
 */
export async function syncEntriesDelta(
  _presentIds: string[],
  changedEntries: Entry[],
  deletedIds: string[] = []
): Promise<void> {
  // `presentIds` é ignorado de propósito: registros que existem no servidor mas
  // não no snapshot local podem ter sido criados em outro dispositivo e não
  // devem ser apagados. Só os ids enviados explicitamente saem da nuvem.
  await runInBatches(deletedIds, (id) => deleteDocumentById(COLLECTIONS.entries, id));

  await runInBatches(changedEntries, async (entry) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...row } = entryToBatchRow(entry);
    const existing = await getDocumentOrNull<EntryRow & { $id: string }>(
      COLLECTIONS.entries,
      entry.id
    );
    if (!existing) {
      await saveDocument(COLLECTIONS.entries, entry.id, { ...row, revision: 1 });
      return;
    }
    const currentRevision = Number(existing.revision ?? 0);
    // Controle otimista: se o servidor já avançou (outro dispositivo escreveu),
    // a alteração é descartada aqui e o próximo refetch mostra a versão dele.
    if ((entry.revision ?? 0) !== currentRevision) return;
    await updateDocumentFields(COLLECTIONS.entries, entry.id, {
      ...row,
      revision: currentRevision + 1,
    });
  });
}
