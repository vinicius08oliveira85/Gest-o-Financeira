import { logError, logWarn } from './logger';
import {
  idbGetAll,
  idbPut,
  idbClear,
  idbGetVersion,
  idbSetVersion,
  migrateFromLocalStorage,
  type StoreName,
} from './idb';

export const STORAGE_SCHEMA_VERSION = 1;

const STORE_MAP: Record<string, StoreName> = {
  'personal-debts': 'entries',
  'gestao-financeira-goals': 'goals',
  'gestao-financeira-cards': 'cards',
  'gestao-financeira-card-expenses': 'cardExpenses',
  'gestao-financeira-suppressed-recurring-slots': 'suppressedRecurring',
  'gestao-financeira-onboarding': 'onboarding',
  'gestao-financeira-dismissed-alerts': 'dismissedAlerts',
  'gestao-financeira-pw': 'password',
  'gestao-financeira-trend-months': 'trendMonths',
};

export type StoredData<T> = {
  version: number;
  data: T[];
  updatedAt: number;
};

export type Migration<T> = (data: T[]) => T[];

let idbAvailable: boolean | null = null;

async function checkIDBAvailable(): Promise<boolean> {
  if (idbAvailable !== null) return idbAvailable;
  try {
    const db = await indexedDB.open('gestao-financeira-db-test', 1);
    db.onerror = () => {
      idbAvailable = false;
    };
    db.onsuccess = () => {
      idbAvailable = true;
      db.result.close();
      indexedDB.deleteDatabase('gestao-financeira-db-test');
    };
    await new Promise<void>((resolve, reject) => {
      db.onerror = () => reject(db.error);
      db.onsuccess = () => resolve();
    });
  } catch {
    idbAvailable = false;
  }
  return idbAvailable ?? false;
}

function getStoreName(key: string): StoreName {
  return STORE_MAP[key] ?? (key as StoreName);
}

export async function readStored<T>(key: string, migrations: Migration<T>[] = []): Promise<T[]> {
  const useIDB = await checkIDBAvailable();
  const store = getStoreName(key);

  if (useIDB) {
    try {
      const currentVersion = await idbGetVersion(store);
      const allRecords = await idbGetAll<T>(store);
      if (allRecords.length > 0) {
        return runMigrations(allRecords, currentVersion, migrations);
      }
    } catch (e) {
      logWarn(`IDB read failed for ${key}, falling back to localStorage`, e);
    }
  }

  // Fallback to localStorage
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];

    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      return runMigrations(parsed, 0, migrations);
    }

    if (parsed && typeof parsed === 'object' && 'version' in parsed && 'data' in parsed) {
      const stored = parsed as StoredData<T>;
      return runMigrations(stored.data, stored.version, migrations);
    }

    logWarn(`Unexpected storage format for ${key}, resetting`);
    return [];
  } catch (e) {
    logError(`Failed to read storage ${key}`, e);
    return [];
  }
}

export async function writeStored<T>(key: string, data: T[]): Promise<void> {
  const useIDB = await checkIDBAvailable();
  const store = getStoreName(key);

  if (useIDB) {
    try {
      await idbClear(store);
      for (const item of data) {
        const id = (item as { id?: string }).id ?? crypto.randomUUID();
        await idbPut(store, id, { ...item, id } as T);
      }
      await idbSetVersion(store, STORAGE_SCHEMA_VERSION);
      return;
    } catch (e) {
      logWarn(`IDB write failed for ${key}, falling back to localStorage`, e);
    }
  }

  // Fallback to localStorage
  try {
    const payload: StoredData<T> = {
      version: STORAGE_SCHEMA_VERSION,
      data,
      updatedAt: Date.now(),
    };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (e) {
    logError(`Failed to write storage ${key}`, e);
  }
}

function runMigrations<T>(data: T[], fromVersion: number, migrations: Migration<T>[]): T[] {
  let result = data;
  for (let v = fromVersion; v < migrations.length && v < STORAGE_SCHEMA_VERSION; v++) {
    try {
      result = migrations[v](result);
    } catch (e) {
      logError(`Migration v${v + 1} failed`, e);
    }
  }
  return result;
}

export async function clearStorage(key: string): Promise<void> {
  const useIDB = await checkIDBAvailable();
  const store = getStoreName(key);

  if (useIDB) {
    try {
      await idbClear(store);
      return;
    } catch (e) {
      logWarn(`IDB clear failed for ${key}`, e);
    }
  }
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export async function getStorageVersion(key: string): Promise<number> {
  const useIDB = await checkIDBAvailable();
  const store = getStoreName(key);

  if (useIDB) {
    try {
      return await idbGetVersion(store);
    } catch {
      // fall through
    }
  }
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && 'version' in parsed) {
      return Number(parsed.version) || 0;
    }
    return 0;
  } catch {
    return 0;
  }
}

export async function setSchemaVersion(version: number): Promise<void> {
  const useIDB = await checkIDBAvailable();
  if (useIDB) {
    try {
      await idbSetVersion('schemaVersion', version);
      return;
    } catch {
      // fall through
    }
  }
  try {
    localStorage.setItem('gestao-financeira-schema-version', String(version));
  } catch {
    // ignore
  }
}

export async function getSchemaVersion(): Promise<number> {
  const useIDB = await checkIDBAvailable();
  if (useIDB) {
    try {
      return await idbGetVersion('schemaVersion');
    } catch {
      // fall through
    }
  }
  try {
    const v = localStorage.getItem('gestao-financeira-schema-version');
    return v ? Number(v) : 0;
  } catch {
    return 0;
  }
}

export async function migrateAllStores(
  migrationsMap: Record<string, Migration<unknown>[]>
): Promise<void> {
  // First, migrate any existing localStorage data to IndexedDB
  await migrateFromLocalStorage();

  for (const [key, migrations] of Object.entries(migrationsMap)) {
    const currentVersion = await getStorageVersion(key);
    if (currentVersion < STORAGE_SCHEMA_VERSION) {
      const data = await readStored(key, migrations);
      await writeStored(key, data);
      await setSchemaVersion(STORAGE_SCHEMA_VERSION);
    }
  }
}

export async function initializeStorage(): Promise<void> {
  await checkIDBAvailable();
  await migrateFromLocalStorage();
}
