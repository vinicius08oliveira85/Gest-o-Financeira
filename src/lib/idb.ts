/**
 * Camada fina sobre o IndexedDB.
 *
 * Duas garantias estruturais:
 *
 * 1. Uma única conexão compartilhada. Uma nova `IDBDatabase` por operação vazava
 *    conexões e tornava cada escrita dependente do ciclo de vida da anterior.
 *    A conexão é memorizada e fechada automaticamente quando outra aba solicita
 *    uma versão superior (`versionchange`).
 *
 * 2. Escritas em lote são atômicas. `idbReplaceAll` executa o `clear` e todos os
 *    `put` dentro de uma única transação `readwrite`, resolvendo apenas em
 *    `transaction.oncomplete`. Um `clear` seguido de N `put` em transações
 *    separadas expõe um intervalo em que o store fica vazio; se a página fechar
 *    ou a escrita seguinte sobrescrever a anterior nesse intervalo, os dados são
 *    perdidos.
 */

const DB_NAME = 'gestao-financeira-db';
const DB_VERSION = 1;

/**
 * Chave reservada dentro de cada store para persistir a versão do schema.
 * Reservada porque `idbGetAll` a exclui: caso contrário o marcador voltaria para
 * `readStored` como se fosse um registro de dados do usuário.
 */
const VERSION_RECORD_ID = 'version';

export type StoreName =
  | 'entries'
  | 'goals'
  | 'cards'
  | 'cardExpenses'
  | 'suppressedRecurring'
  | 'onboarding'
  | 'dismissedAlerts'
  | 'schemaVersion'
  | 'trendMonths';

interface StoredRecord<T> {
  id: string;
  data: T;
  updatedAt: number;
  version: number;
}

/** Conexão compartilhada. `null` enquanto não houver uma promessa em voo. */
let dbPromise: Promise<IDBDatabase> | null = null;

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'));
  });
}

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  const pending = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      for (const store of [
        'entries',
        'goals',
        'cards',
        'cardExpenses',
        'suppressedRecurring',
        'onboarding',
        'dismissedAlerts',
        'schemaVersion',
        'trendMonths',
      ] as StoreName[]) {
        if (!db.objectStoreNames.contains(store)) db.createObjectStore(store);
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      // Outra aba pediu `DB_VERSION` superior: libera a conexão para o upgrade.
      db.onversionchange = () => {
        db.close();
        if (dbPromise === pending) dbPromise = null;
      };
      resolve(db);
    };

    // Falha de abertura não pode ficar memorizada: a próxima chamada tentaria
    // reutilizar uma promessa já rejeitada e nunca abriria a conexão.
    request.onerror = () => {
      if (dbPromise === pending) dbPromise = null;
      reject(request.error ?? new Error('Failed to open IndexedDB'));
    };
  });

  dbPromise = pending;
  return pending;
}

/**
 * Serializa escritas por store. Transações do IndexedDB já são ordenadas entre
 * si, mas `writeStored` é chamado sem `await` por vários hooks: sem esta fila,
 * dois lotes concorrentes podem se intercalar e o lote mais antigo sobrescrever
 * o mais novo.
 */
const writeQueues = new Map<StoreName, Promise<unknown>>();

function enqueueWrite<T>(store: StoreName, task: () => Promise<T>): Promise<T> {
  const previous = writeQueues.get(store) ?? Promise.resolve();
  // `.then(task, task)` para que uma tarefa rejeitada não trave a fila.
  const result = previous.then(task, task);
  // A fila guarda apenas o encadeamento, nunca a rejeição.
  writeQueues.set(
    store,
    result.catch(() => undefined)
  );
  return result;
}

/** Executa `task` numa transação `readwrite` e resolve apenas quando ela confirma. */
function runWriteTransaction(
  store: StoreName,
  task: (objectStore: IDBObjectStore) => void
): Promise<void> {
  return enqueueWrite(store, () =>
    openDB().then(
      (db) =>
        new Promise<void>((resolve, reject) => {
          const tx = db.transaction(store, 'readwrite');
          const objectStore = tx.objectStore(store);

          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error ?? new Error(`IndexedDB write failed on "${store}"`));
          tx.onabort = () =>
            reject(tx.error ?? new DOMException('Transaction aborted', 'AbortError'));

          try {
            task(objectStore);
          } catch (error) {
            try {
              tx.abort();
            } catch {
              // A transação pode já estar encerrada; o erro original é o que importa.
            }
            reject(error);
          }
        })
    )
  );
}

export async function idbGet<T>(store: StoreName, id: string): Promise<T | null> {
  const db = await openDB();
  const tx = db.transaction(store, 'readonly');
  const result = await requestToPromise<StoredRecord<T> | undefined>(
    tx.objectStore(store).get(id) as IDBRequest<StoredRecord<T> | undefined>
  );
  return result ? result.data : null;
}

export async function idbGetAll<T>(store: StoreName): Promise<T[]> {
  const db = await openDB();
  const tx = db.transaction(store, 'readonly');
  const records = await requestToPromise<StoredRecord<T>[]>(
    tx.objectStore(store).getAll() as IDBRequest<StoredRecord<T>[]>
  );
  return records.filter((record) => record.id !== VERSION_RECORD_ID).map((record) => record.data);
}

export function idbPut<T>(store: StoreName, id: string, data: T, version = 1): Promise<void> {
  const updatedAt = Date.now();
  return runWriteTransaction(store, (objectStore) => {
    // Os stores são criados sem `keyPath`, então a chave precisa ser informada
    // como argumento separado. Omitir a chave num store sem `keyPath` lança
    // `DataError` e a escrita é sempre rejeitada.
    objectStore.put({ id, data, updatedAt, version } as StoredRecord<T>, id);
  });
}

export function idbDelete(store: StoreName, id: string): Promise<void> {
  return runWriteTransaction(store, (objectStore) => {
    objectStore.delete(id);
  });
}

export function idbClear(store: StoreName): Promise<void> {
  return runWriteTransaction(store, (objectStore) => {
    objectStore.clear();
  });
}

/**
 * Substitui todo o conteúdo de um store por `items` de forma atômica.
 *
 * Quando `schemaVersion` é informado, o marcador de versão é gravado na mesma
 * transação, de modo que os dados e a versão que os descreve nunca podem ficar
 * inconsistentes entre si.
 */
export function idbReplaceAll<T>(
  store: StoreName,
  items: Array<{ id: string; data: T }>,
  schemaVersion?: number
): Promise<void> {
  const updatedAt = Date.now();
  return runWriteTransaction(store, (objectStore) => {
    objectStore.clear();
    for (const { id, data } of items) {
      objectStore.put({ id, data, updatedAt, version: 1 } as StoredRecord<T>, id);
    }
    if (schemaVersion !== undefined) {
      objectStore.put(
        {
          id: VERSION_RECORD_ID,
          data: { version: schemaVersion } as unknown as T,
          updatedAt,
          version: 1,
        } as StoredRecord<T>,
        VERSION_RECORD_ID
      );
    }
  });
}

export async function idbGetVersion(store: StoreName): Promise<number> {
  const record = await idbGet<{ version: number }>(store, VERSION_RECORD_ID);
  return record?.version ?? 0;
}

export function idbSetVersion(store: StoreName, version: number): Promise<void> {
  return idbPut(store, VERSION_RECORD_ID, { version });
}

/**
 * Move dados de `localStorage` para o IndexedDB na primeira execução.
 *
 * São aceitos três formatos: array direto, envelope `{version, data, updatedAt}`
 * — que é o que o fallback de `localStorage` gravava — e objeto único com `id`.
 *
 * A chave de origem só é removida depois que todas as escritas concluírem. A
 * versão anterior removia a chave mesmo quando nada tinha sido gravado — por
 * exemplo quando o valor não tinha `id`, o `idbPut` era silenciosamente
 * ignorado e o dado era perdido sem cópia.
 */
export async function migrateFromLocalStorage(): Promise<void> {
  const stores: { key: string; store: StoreName }[] = [
    { key: 'personal-debts', store: 'entries' },
    { key: 'gestao-financeira-goals', store: 'goals' },
    { key: 'gestao-financeira-cards', store: 'cards' },
    { key: 'gestao-financeira-card-expenses', store: 'cardExpenses' },
    { key: 'gestao-financeira-suppressed-recurring-slots', store: 'suppressedRecurring' },
    { key: 'gestao-financeira-onboarding', store: 'onboarding' },
    { key: 'gestao-financeira-dismissed-alerts', store: 'dismissedAlerts' },
    { key: 'gestao-financeira-trend-months', store: 'trendMonths' },
  ];

  for (const { key, store } of stores) {
    let raw: string | null;
    try {
      raw = localStorage.getItem(key);
    } catch {
      continue;
    }
    if (!raw) continue;

    let items: unknown[] | null = null;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        items = parsed;
      } else if (parsed && typeof parsed === 'object') {
        const envelope = parsed as { data?: unknown; id?: unknown };
        if (Array.isArray(envelope.data)) {
          items = envelope.data;
        } else if (typeof envelope.id === 'string' && envelope.id) {
          items = [parsed];
        }
      }
    } catch {
      // JSON inválido: preserva a chave em vez de descartar.
      continue;
    }

    if (!items) continue;

    // `failed` mantém a origem caso alguma escrita não conclua, para que a
    // próxima execução tente de novo.
    let failed = false;
    for (const item of items) {
      if (!item || typeof item !== 'object') continue;
      const record = item as Record<string, unknown>;
      const id = typeof record.id === 'string' && record.id ? record.id : crypto.randomUUID();
      try {
        await idbPut(store, id, { ...record, id });
      } catch {
        failed = true;
      }
    }

    if (!failed) {
      try {
        localStorage.removeItem(key);
      } catch {
        // Sem escrita em disco disponível; a cópia no IndexedDB já é a fonte.
      }
    }
  }
}

/** Fecha a conexão compartilhada. Usado em testes e no descarte explícito. */
export async function idbClose(): Promise<void> {
  const pending = dbPromise;
  dbPromise = null;
  if (!pending) return;
  try {
    (await pending).close();
  } catch {
    // Nada a fazer: a conexão já está encerrada.
  }
}
