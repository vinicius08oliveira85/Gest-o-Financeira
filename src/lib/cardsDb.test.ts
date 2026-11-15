import { describe, it, expect, vi, beforeEach } from 'vitest';

const deleteDocumentsMatching = vi.fn();
const deleteDocumentById = vi.fn();

vi.mock('./appwriteDb', () => ({
  deleteDocumentsMatching: (...args: unknown[]) => deleteDocumentsMatching(...args),
  deleteDocumentById: (...args: unknown[]) => deleteDocumentById(...args),
  listAllDocuments: vi.fn(),
  saveDocument: vi.fn(),
}));

import { deleteCard } from './cardsDb';

describe('deleteCard (cardsDb)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deleteDocumentsMatching.mockResolvedValue(undefined);
    deleteDocumentById.mockResolvedValue(undefined);
  });

  it('apaga os gastos do cartão no servidor antes do cartão', async () => {
    await deleteCard('card-1');

    const [expensesCollection, expensesQueries] = deleteDocumentsMatching.mock.calls[0];
    expect(expensesCollection).toBe('card_expenses');
    expect(JSON.stringify(expensesQueries)).toContain('card-1');

    // O cartão só sai depois de gastos e faturas.
    expect(deleteDocumentById).toHaveBeenCalledTimes(1);
    expect(deleteDocumentById).toHaveBeenCalledWith('credit_cards', 'card-1');
  });

  it('apaga as faturas registradas do cartão no servidor', async () => {
    await deleteCard('card-1');

    const [entriesCollection, entriesQueries] = deleteDocumentsMatching.mock.calls[1];
    expect(entriesCollection).toBe('entries');
    const query = JSON.stringify(entriesQueries);
    expect(query).toContain('card-1');
    expect(query).toContain('is_card_invoice');
  });

  it('propaga o erro e mantém o cartão para poder tentar de novo', async () => {
    deleteDocumentsMatching.mockRejectedValue(new Error('permission denied'));

    await expect(deleteCard('card-1')).rejects.toThrow('permission denied');
    expect(deleteDocumentById).not.toHaveBeenCalled();
  });
});
