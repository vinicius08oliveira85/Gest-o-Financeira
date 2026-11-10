import { describe, it, expect, vi, beforeEach } from 'vitest';

const deleteDocumentsMatching = vi.fn();
const deleteDocumentById = vi.fn();

vi.mock('./appwriteDb', () => ({
  deleteDocumentsMatching: (...args: unknown[]) => deleteDocumentsMatching(...args),
  deleteDocumentById: (...args: unknown[]) => deleteDocumentById(...args),
  listAllDocuments: vi.fn(),
  saveDocument: vi.fn(),
}));

import { deleteGoal } from './goalsDb';

describe('deleteGoal (goalsDb)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('remove os lançamentos da meta e depois a meta', async () => {
    deleteDocumentsMatching.mockResolvedValue(undefined);
    deleteDocumentById.mockResolvedValue(undefined);

    await deleteGoal('goal-1');

    const [entriesCollection, queries] = deleteDocumentsMatching.mock.calls[0];
    expect(entriesCollection).toBe('entries');
    expect(JSON.stringify(queries)).toContain('goal-1');
    expect(deleteDocumentById).toHaveBeenCalledWith('goals', 'goal-1');
  });

  it('propaga o erro do banco para que a tela não remova a meta', async () => {
    deleteDocumentsMatching.mockRejectedValue(new Error('permission denied'));

    await expect(deleteGoal('goal-1')).rejects.toThrow('permission denied');
    expect(deleteDocumentById).not.toHaveBeenCalled();
  });
});
