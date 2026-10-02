import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  idbGetAll,
  idbPut,
  idbGet,
  idbGetVersion,
  idbReplaceAll,
  idbClose,
  migrateFromLocalStorage,
} from './idb';
import { PASSWORD_STORAGE_KEY } from '../constants';

const DB_NAME = 'gestao-financeira-db';

interface Debt {
  id: string;
  description: string;
}

function deleteDatabase(): Promise<void> {
  return new Promise((resolve) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}

describe('idb', () => {
  beforeEach(async () => {
    await idbClose();
    await deleteDatabase();
    localStorage.clear();
  });

  afterEach(async () => {
    await idbClose();
    await deleteDatabase();
    localStorage.clear();
  });

  it('reaproveita uma única conexão entre operações', async () => {
    const openSpy = vi.spyOn(indexedDB, 'open');

    await idbPut('entries', 'a', { value: 1 });
    await idbGet('entries', 'a');
    await idbGetAll('entries');
    await idbPut('entries', 'b', { value: 2 });
    await idbGetAll('entries');

    expect(openSpy).toHaveBeenCalledTimes(1);
    openSpy.mockRestore();
  });

  it('não devolve o marcador de versão como se fosse um registro', async () => {
    await idbReplaceAll('entries', [{ id: 'a', data: { value: 1 } }], 1);

    const records = await idbGetAll<{ value: number }>('entries');

    expect(records).toEqual([{ value: 1 }]);
    expect(records).not.toContainEqual({ version: 1 });
  });

  it('persiste a versão do schema junto com os dados', async () => {
    await idbReplaceAll('entries', [{ id: 'a', data: { value: 1 } }], 7);

    await expect(idbGetVersion('entries')).resolves.toBe(7);
  });

  it('substitui o conteúdo anterior em vez de acumular', async () => {
    await idbReplaceAll('entries', [
      { id: 'a', data: { value: 1 } },
      { id: 'b', data: { value: 2 } },
    ]);
    await idbReplaceAll('entries', [{ id: 'c', data: { value: 3 } }]);

    const records = await idbGetAll<{ value: number }>('entries');

    expect(records).toEqual([{ value: 3 }]);
  });

  it('não intercala escritas concorrentes no mesmo store', async () => {
    const batchA = ['a1', 'a2', 'a3'].map((id) => ({ id, data: { id } }));
    const batchB = ['b1', 'b2', 'b3'].map((id) => ({ id, data: { id } }));

    await Promise.all([idbReplaceAll('entries', batchA), idbReplaceAll('entries', batchB)]);

    const records = await idbGetAll<{ id: string }>('entries');

    // Uma mistura indicaria interleaving: parte de A e parte de B.
    expect(records).toHaveLength(3);
    const prefixes = new Set(records.map((record) => record.id.charAt(0)));
    expect(prefixes.size).toBe(1);
  });

  it('preserva chaves em formato desconhecido durante a migration', async () => {
    // Formato do hash de senha: objeto sem `id`.
    localStorage.setItem(
      PASSWORD_STORAGE_KEY,
      JSON.stringify({ salt: 'c2FsdA==', hash: 'aGFzaA==', iterations: 150000 })
    );

    await migrateFromLocalStorage();

    // Regressão: a versão anterior removia a chave mesmo sem gravar nada,
    // apagando a senha sem cópia.
    expect(localStorage.getItem(PASSWORD_STORAGE_KEY)).not.toBeNull();
  });

  it('não migra nem remove a chave da senha', async () => {
    const stored = JSON.stringify({ salt: 'c2FsdA==', hash: 'aGFzaA==', iterations: 150000 });
    localStorage.setItem(PASSWORD_STORAGE_KEY, stored);

    await migrateFromLocalStorage();

    expect(localStorage.getItem(PASSWORD_STORAGE_KEY)).toBe(stored);
  });

  it('remove a chave de origem após migrar com sucesso', async () => {
    localStorage.setItem('personal-debts', JSON.stringify([{ id: 'e1', description: 'Aluguel' }]));

    await migrateFromLocalStorage();

    expect(localStorage.getItem('personal-debts')).toBeNull();
    await expect(idbGet<Debt>('entries', 'e1')).resolves.toEqual({
      id: 'e1',
      description: 'Aluguel',
    });
  });

  it('migra o envelope {version, data, updatedAt} do fallback de localStorage', async () => {
    // Formato real de quem usou o app enquanto o IndexedDB estava inativo.
    localStorage.setItem(
      'personal-debts',
      JSON.stringify({
        version: 1,
        data: [{ id: 'e1', description: 'Aluguel' }],
        updatedAt: 1_700_000_000_000,
      })
    );

    await migrateFromLocalStorage();

    expect(localStorage.getItem('personal-debts')).toBeNull();
    await expect(idbGet<Debt>('entries', 'e1')).resolves.toEqual({
      id: 'e1',
      description: 'Aluguel',
    });
  });

  it('atribui id a itens sem id durante a migration, em vez de descartá-los', async () => {
    localStorage.setItem('personal-debts', JSON.stringify([{ description: 'Sem id' }]));

    await migrateFromLocalStorage();

    const records = await idbGetAll<{ id: string; description: string }>('entries');

    expect(records).toHaveLength(1);
    expect(records[0].description).toBe('Sem id');
    expect(records[0].id).toBeTruthy();
    expect(localStorage.getItem('personal-debts')).toBeNull();
  });
});
