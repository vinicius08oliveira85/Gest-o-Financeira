import { describe, it, expect, beforeEach, vi } from 'vitest';
import { deleteExpensesByCard } from './cardExpensesDb';

// Supabase mockável (null quando "não configurado") via live binding.
const mockState = vi.hoisted(() => ({
  from: vi.fn(),
  del: vi.fn(),
  eq: vi.fn(),
  supabaseValue: null as unknown,
}));

vi.mock('../lib/supabase', () => ({
  get supabase() {
    return mockState.supabaseValue;
  },
}));

describe('deleteExpensesByCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.from.mockReturnValue({ delete: mockState.del });
    mockState.del.mockReturnValue({ eq: mockState.eq });
    mockState.supabaseValue = { from: mockState.from };
  });

  it('remove todos os gastos do cartão via delete em massa', async () => {
    mockState.eq.mockResolvedValue({ error: null });

    await expect(deleteExpensesByCard('card-1')).resolves.toBeUndefined();

    expect(mockState.from).toHaveBeenCalledWith('card_expenses');
    expect(mockState.del).toHaveBeenCalled();
    expect(mockState.eq).toHaveBeenCalledWith('card_id', 'card-1');
  });

  it('propaga erro do servidor', async () => {
    mockState.eq.mockResolvedValue({ error: new Error('db down') });

    await expect(deleteExpensesByCard('card-1')).rejects.toThrow('db down');
  });

  it('não faz nada quando o Supabase não está configurado', async () => {
    mockState.supabaseValue = null;

    await expect(deleteExpensesByCard('card-1')).resolves.toBeUndefined();
    expect(mockState.from).not.toHaveBeenCalled();
  });
});
