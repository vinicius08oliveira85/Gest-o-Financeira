import { logError, logWarn } from './logger';

export const STORAGE_SCHEMA_VERSION = 1;
const SCHEMA_KEY = 'gestao-financeira-schema-version';

export type StoredData<T> = {
  version: number;
  data: T[];
  updatedAt: number;
};

export type Migration<T> = (data: T[]) => T[];

export function readStored<T>(key: string, migrations: Migration<T>[] = []): T[] {
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

export function writeStored<T>(key: string, data: T[]): void {
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

export function clearStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function getStorageVersion(key: string): number {
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

export function setSchemaVersion(version: number): void {
  try {
    localStorage.setItem(SCHEMA_KEY, String(version));
  } catch {
    // ignore
  }
}

export function getSchemaVersion(): number {
  try {
    const v = localStorage.getItem(SCHEMA_KEY);
    return v ? Number(v) : 0;
  } catch {
    return 0;
  }
}

export function migrateAllStores(migrationsMap: Record<string, Migration<unknown>[]>): void {
  for (const [key, migrations] of Object.entries(migrationsMap)) {
    const currentVersion = getStorageVersion(key);
    if (currentVersion < STORAGE_SCHEMA_VERSION) {
      const data = readStored(key, migrations);
      writeStored(key, data);
      setSchemaVersion(STORAGE_SCHEMA_VERSION);
    }
  }
}
