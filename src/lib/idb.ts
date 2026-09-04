const DB_NAME = 'gestao-financeira-db';
const DB_VERSION = 1;

export type StoreName =
  | 'entries'
  | 'goals'
  | 'cards'
  | 'cardExpenses'
  | 'suppressedRecurring'
  | 'onboarding'
  | 'dismissedAlerts'
  | 'password'
  | 'schemaVersion'
  | 'trendMonths';

interface StoredRecord<T> {
  id: string;
  data: T;
  updatedAt: number;
  version: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const stores: StoreName[] = [
        'entries',
        'goals',
        'cards',
        'cardExpenses',
        'suppressedRecurring',
        'onboarding',
        'dismissedAlerts',
        'password',
        'schemaVersion',
        'trendMonths',
      ];
      for (const store of stores) {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: 'id' });
        }
      }
    };
  });
}

export async function idbGet<T>(store: StoreName, id: string): Promise<T | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(id);
    req.onsuccess = () => resolve(req.result?.data ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function idbGetAll<T>(store: StoreName): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve((req.result ?? []).map((r: StoredRecord<T>) => r.data));
    req.onerror = () => reject(req.error);
  });
}

export async function idbPut<T>(store: StoreName, id: string, data: T, version = 1): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const record: StoredRecord<T> = {
      id,
      data,
      updatedAt: Date.now(),
      version,
    };
    const req = tx.objectStore(store).put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function idbDelete(store: StoreName, id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function idbClear(store: StoreName): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function idbGetVersion(store: StoreName, id = 'version'): Promise<number> {
  const record = await idbGet<{ version: number }>(store, id);
  return record?.version ?? 0;
}

export async function idbSetVersion(
  store: StoreName,
  version: number,
  id = 'version'
): Promise<void> {
  await idbPut(store, id, { version });
}

export async function migrateFromLocalStorage(): Promise<void> {
  const stores: { key: string; store: StoreName }[] = [
    { key: 'personal-debts', store: 'entries' },
    { key: 'gestao-financeira-goals', store: 'goals' },
    { key: 'gestao-financeira-cards', store: 'cards' },
    { key: 'gestao-financeira-card-expenses', store: 'cardExpenses' },
    { key: 'gestao-financeira-suppressed-recurring-slots', store: 'suppressedRecurring' },
    { key: 'gestao-financeira-onboarding', store: 'onboarding' },
    { key: 'gestao-financeira-dismissed-alerts', store: 'dismissedAlerts' },
    { key: 'gestao-financeira-pw', store: 'password' },
    { key: 'gestao-financeira-trend-months', store: 'trendMonths' },
  ];

  for (const { key, store } of stores) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item.id) {
              await idbPut(store, item.id, item);
            }
          }
        } else if (parsed && typeof parsed === 'object' && parsed.id) {
          await idbPut(store, parsed.id, parsed);
        }
        localStorage.removeItem(key);
      }
    } catch {
      // ignore migration errors
    }
  }
}
