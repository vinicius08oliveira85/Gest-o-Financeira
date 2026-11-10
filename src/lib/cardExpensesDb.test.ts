import { describe, it, expect, beforeEach, vi } from 'vitest';

const deleteDocumentsMatching = vi.fn();

vi.mock('./appwriteDb', () => ({
  deleteDocumentsMatching: (...args: unknown[]) => deleteDocumentsMatching(...args),
}));

import { deleteExpensesByCard } from './cardExpensesDb';

describe('deleteExpensesByCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('remove todos os gastos do cartão pela coleção card_expenses', async () => {
    deleteDocumentsMatching.mockResolvedValue(undefined);

    await expect(deleteExpensesByCard('card-1')).resolves.toBeUndefined();

    expect(deleteDocumentsMatching).toHaveBeenCalledTimes(1);
    const [collectionId, queries] = deleteDocumentsMatching.mock.calls[0];
    expect(collectionId).toBe('card_expenses');
    expect(JSON.stringify(queries)).toContain('card-1');
  });

  it('propaga erro do servidor', async () => {
    deleteDocumentsMatching.mockRejectedValue(new Error('db down'));

    await expect(deleteExpensesByCard('card-1')).rejects.toThrow('db down');
  });
});
