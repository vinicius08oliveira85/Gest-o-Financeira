import { logError, logWarn } from './logger';
import {
  idbGetAll,
  idbClear,
  idbReplaceAll,
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
  'gestao-financeira-trend-months': 'trendMonths',
};

// `gestao-financeira-pw` fica de fora de propósito. O hash da senha é lido de
// forma síncrona por `password.ts`, que só conversa com `localStorage`. A
// migration movia o hash para o IndexedDB e apagava a chave original, deixando o
// registro órfão num store que ninguém lê: a trava de tela deixava de existir
// silenciosamente após a migration. Manter a chave no localStorage preserva o
// comportamento sem custo de sincronização.

export type StoredData<T> = {
  version: number;
  data: T[];
  updatedAt: number;
};

export type Migration<T> = (data: T[]) => T[];

const IDB_PROBE_DB = 'gestao-financeira-db-probe';

let idbAvailable: boolean | null = null;

async function checkIDBAvailable(): Promise<boolean> {
  if (idbAvailable !== null) return idbAvailable;

  idbAvailable = await new Promise<boolean>((resolve) => {
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(IDB_PROBE_DB, 1);
    } catch {
      resolve(false);
      return;
    }

    request.onupgradeneeded = () => {
      // Só precisamos da conexão; nenhum store é necessário.
    };
    request.onsuccess = () => {
      request.result.close();
      const cleanup = indexedDB.deleteDatabase(IDB_PROBE_DB);
      cleanup.onerror = () => {};
      cleanup.onblocked = () => {};
      resolve(true);
    };
    request.onerror = () => resolve(false);
    request.onblocked = () => resolve(false);
  });

  return idbAvailable;
}

if (typeof document !== 'undefined') {
  // Uma falha transitória (aba em background, quotas) deixaria o app preso no
  // fallback de `localStorage` para sempre. Reavalia ao voltar para foreground.
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) idbAvailable = null;
  });
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
      // IndexedDB empty - check localStorage as fallback (data might not be migrated yet)
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
      // Uma única transação: o `clear` e os `put` não podem ser observados
      // separadamente por uma leitura concorrente nem separados por um
      // encerramento abrupto no meio da gravação.
      const records = data.map((item) => {
        const id = (item as { id?: string }).id ?? crypto.randomUUID();
        return { id, data: { ...item, id } as T };
      });
      await idbReplaceAll(store, records, STORAGE_SCHEMA_VERSION);
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
