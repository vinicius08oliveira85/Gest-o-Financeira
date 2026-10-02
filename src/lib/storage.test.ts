import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readStored, writeStored } from './storage';
import { idbClose } from './idb';

interface Debt {
  id: string;
  description: string;
}

function deleteDatabase(): Promise<void> {
  return new Promise((resolve) => {
    const request = indexedDB.deleteDatabase('gestao-financeira-db');
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
    request.onblocked = () => resolve();
  });
}

describe('storage', () => {
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

  it('faz round-trip sem devolver o marcador de versão como item', async () => {
    const debts: Debt[] = [
      { id: 'e1', description: 'Aluguel' },
      { id: 'e2', description: 'Luz' },
    ];

    await writeStored('personal-debts', debts);

    // Regressão: o marcador de versão era lido como um registro e devolvido
    // dentro da lista de dados.
    await expect(readStored<Debt>('personal-debts')).resolves.toEqual(debts);
  });

  it('devolve lista vazia depois de gravar uma lista vazia', async () => {
    await writeStored('personal-debts', [{ id: 'e1', description: 'Aluguel' }]);
    await writeStored('personal-debts', []);

    // Regressão: o store ficava só com o marcador, então length > 0 e a leitura
    // devolvia um item falso no lugar da lista vazia.
    await expect(readStored<Debt>('personal-debts')).resolves.toEqual([]);
  });

  it('atribui id persistente a itens sem id', async () => {
    const item = { description: 'Sem id' };

    await writeStored('personal-debts', [item]);
    const first = await readStored<Debt>('personal-debts');

    expect(first).toHaveLength(1);
    expect(first[0].id).toBeTruthy();

    await writeStored('personal-debts', first);
    const second = await readStored<Debt>('personal-debts');

    // Sem id estável, cada gravação geraria um novo id e o item cresceria a
    // cada leitura.
    expect(second).toHaveLength(1);
    expect(second[0].id).toBe(first[0].id);
  });

  it('não intercala gravações concorrentes da mesma chave', async () => {
    const batchA: Debt[] = ['a1', 'a2', 'a3'].map((id) => ({ id, description: id }));
    const batchB: Debt[] = ['b1', 'b2', 'b3'].map((id) => ({ id, description: id }));

    await Promise.all([
      writeStored('personal-debts', batchA),
      writeStored('personal-debts', batchB),
    ]);

    const stored = await readStored<Debt>('personal-debts');

    // Clear + puts em transações separadas deixavam o store vazio no meio do
    // caminho, produzindo lista vazia ou parcialmente sobrescrita.
    expect(stored).toHaveLength(3);
    expect(new Set(stored.map((debt) => debt.id.charAt(0))).size).toBe(1);
  });

  it('sobrescreve o conjunto anterior em vez de acumular', async () => {
    await writeStored<Debt>('personal-debts', [
      { id: 'e1', description: 'Aluguel' },
      { id: 'e2', description: 'Luz' },
    ]);
    await writeStored<Debt>('personal-debts', [{ id: 'e3', description: 'Água' }]);

    await expect(readStored<Debt>('personal-debts')).resolves.toEqual([
      { id: 'e3', description: 'Água' },
    ]);
  });
});
