import { Query } from 'appwrite';
import { APPWRITE_DATABASE_ID, COLLECTIONS, databases, type CollectionId } from './appwrite';

/** Documento devolvido pelo Appwrite (já sem os campos de sistema `$...`). */
export type DocData = Record<string, unknown> & { $id: string };

const PAGE_SIZE = 200;
/** Trava de segurança para não paginar indefinidamente em caso de resposta repetida. */
const MAX_PAGES = 200;
/** Requisições simultâneas nas gravações em lote (Appwrite não tem bulk de documentos). */
const WRITE_CONCURRENCY = 6;

export class CloudNotConfiguredError extends Error {
  constructor() {
    super('Appwrite não configurado');
    this.name = 'CloudNotConfiguredError';
  }
}

type AppwriteLikeError = { code?: number; type?: string; message?: string };

export function isNotFoundError(error: unknown): boolean {
  const e = error as AppwriteLikeError;
  return e?.code === 404 || e?.type === 'document_not_found';
}

function requireDatabases() {
  if (!databases) throw new CloudNotConfiguredError();
  return databases;
}

/**
 * Lista todos os documentos da coleção, paginando por cursor.
 *
 * O Appwrite devolve no máximo 5000 documentos por requisição e usa 25 por
 * padrão; sem paginação a lista seria truncada em silêncio a partir do limite.
 */
export async function listAllDocuments<T>(
  collectionId: CollectionId | string,
  queries: string[] = []
): Promise<(T & { $id: string })[]> {
  const db = requireDatabases();
  const docs: (T & { $id: string })[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const pageQueries = [
      ...queries,
      Query.limit(PAGE_SIZE),
      Query.orderAsc('$id'),
      ...(cursor ? [Query.cursorAfter(cursor)] : []),
    ];
    const result = await db.listDocuments({
      databaseId: APPWRITE_DATABASE_ID,
      collectionId,
      queries: pageQueries,
    });
    const pageDocs = result.documents as unknown as DocData[];
    docs.push(...(pageDocs as unknown as (T & { $id: string })[]));
    if (pageDocs.length < PAGE_SIZE) break;
    cursor = pageDocs[pageDocs.length - 1].$id;
  }

  return docs;
}

/** Documento por id ou `null` quando ele não existe. */
export async function getDocumentOrNull<T>(
  collectionId: CollectionId | string,
  documentId: string
): Promise<(T & { $id: string }) | null> {
  const db = requireDatabases();
  try {
    const doc = await db.getDocument({
      databaseId: APPWRITE_DATABASE_ID,
      collectionId,
      documentId,
    });
    return doc as unknown as T & { $id: string };
  } catch (error) {
    if (isNotFoundError(error)) return null;
    throw error;
  }
}

/** Cria o documento ou substitui o existente com o mesmo id. */
export async function saveDocument<T>(
  collectionId: CollectionId | string,
  documentId: string,
  data: Record<string, unknown>
): Promise<T & { $id: string }> {
  const db = requireDatabases();
  const doc = await db.upsertDocument({
    databaseId: APPWRITE_DATABASE_ID,
    collectionId,
    documentId,
    data,
  });
  return doc as unknown as T & { $id: string };
}

/** Atualiza apenas os campos enviados (patch), mantendo o resto do documento. */
export async function updateDocumentFields<T>(
  collectionId: CollectionId | string,
  documentId: string,
  data: Record<string, unknown>
): Promise<T & { $id: string }> {
  const db = requireDatabases();
  const doc = await db.updateDocument({
    databaseId: APPWRITE_DATABASE_ID,
    collectionId,
    documentId,
    data,
  });
  return doc as unknown as T & { $id: string };
}

/** Remove o documento; id inexistente não é erro (a intenção já está cumprida). */
export async function deleteDocumentById(
  collectionId: CollectionId | string,
  documentId: string
): Promise<void> {
  const db = requireDatabases();
  try {
    await db.deleteDocument({
      databaseId: APPWRITE_DATABASE_ID,
      collectionId,
      documentId,
    });
  } catch (error) {
    if (isNotFoundError(error)) return;
    throw error;
  }
}

/** Executa tarefas em lotes paralelos limitados (respeita o rate limit da API). */
export async function runInBatches<T>(
  items: T[],
  worker: (item: T) => Promise<void>,
  concurrency = WRITE_CONCURRENCY
): Promise<void> {
  for (let i = 0; i < items.length; i += concurrency) {
    await Promise.all(items.slice(i, i + concurrency).map((item) => worker(item)));
  }
}

/** Remove todos os documentos que casam com as queries informadas. */
export async function deleteDocumentsMatching(
  collectionId: CollectionId | string,
  queries: string[]
): Promise<void> {
  const docs = await listAllDocuments<DocData>(collectionId, queries);
  await runInBatches(docs, (doc) => deleteDocumentById(collectionId, doc.$id));
}

/** Coleções usadas pelo app (atalho para os helpers acima). */
export const collection = COLLECTIONS;
