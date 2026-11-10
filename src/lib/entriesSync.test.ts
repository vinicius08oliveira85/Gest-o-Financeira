import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Entry } from '../types';

const getDocumentOrNull = vi.fn();
const saveDocument = vi.fn();
const updateDocumentFields = vi.fn();
const deleteDocumentById = vi.fn();

vi.mock('./appwriteDb', () => ({
  getDocumentOrNull: (...args: unknown[]) => getDocumentOrNull(...args),
  saveDocument: (...args: unknown[]) => saveDocument(...args),
  updateDocumentFields: (...args: unknown[]) => updateDocumentFields(...args),
  deleteDocumentById: (...args: unknown[]) => deleteDocumentById(...args),
  listAllDocuments: vi.fn(),
  runInBatches: async (items: unknown[], worker: (item: unknown) => Promise<void>) => {
    for (const item of items) await worker(item);
  },
}));

import { syncEntriesDelta, insertEntriesBatch } from './entriesDb';

function entry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: 'e1',
    name: 'Aluguel',
    amount: 100,
    dueDate: '2026-11-10',
    isPaid: false,
    type: 'debt',
    createdAt: 1,
    ...overrides,
  };
}

describe('syncEntriesDelta (Appwrite)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('apaga apenas os ids removidos explicitamente', async () => {
    await syncEntriesDelta(['a', 'b'], [], ['b']);

    expect(deleteDocumentById).toHaveBeenCalledTimes(1);
    expect(deleteDocumentById).toHaveBeenCalledWith('entries', 'b');
  });

  it('cria o documento com revision 1 quando ainda não existe na nuvem', async () => {
    getDocumentOrNull.mockResolvedValue(null);
    saveDocument.mockResolvedValue({ $id: 'e1' });

    await syncEntriesDelta(['e1'], [entry()], []);

    expect(saveDocument).toHaveBeenCalledTimes(1);
    const [, id, data] = saveDocument.mock.calls[0];
    expect(id).toBe('e1');
    expect(data).toMatchObject({ name: 'Aluguel', revision: 1, due_date: '2026-11-10' });
    expect(updateDocumentFields).not.toHaveBeenCalled();
  });

  it('atualiza quando a revision local bate com a do servidor', async () => {
    getDocumentOrNull.mockResolvedValue({ $id: 'e1', revision: 3 });
    updateDocumentFields.mockResolvedValue({ $id: 'e1' });

    await syncEntriesDelta(['e1'], [entry({ revision: 3, isPaid: true })], []);

    expect(updateDocumentFields).toHaveBeenCalledTimes(1);
    const [, id, data] = updateDocumentFields.mock.calls[0];
    expect(id).toBe('e1');
    expect(data).toMatchObject({ is_paid: true, revision: 4 });
  });

  it('não sobrescreve quando outro dispositivo já avançou a revision', async () => {
    getDocumentOrNull.mockResolvedValue({ $id: 'e1', revision: 7 });

    await syncEntriesDelta(['e1'], [entry({ revision: 3 })], []);

    expect(updateDocumentFields).not.toHaveBeenCalled();
    expect(saveDocument).not.toHaveBeenCalled();
  });
});

describe('insertEntriesBatch (Appwrite)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('grava cada lançamento com created_at e revision 1', async () => {
    saveDocument.mockResolvedValue({ $id: 'e1' });

    await insertEntriesBatch([entry({ createdAt: Date.UTC(2026, 10, 10) })]);

    const [, id, data] = saveDocument.mock.calls[0];
    expect(id).toBe('e1');
    expect(data).toMatchObject({
      revision: 1,
      created_at: new Date(Date.UTC(2026, 10, 10)).toISOString(),
    });
    expect(data).not.toHaveProperty('id');
  });
});
