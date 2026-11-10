import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useCreditCards } from './useCreditCards';
import type { CreditCard } from '../types';
import { CARDS_STORAGE_KEY } from '../constants';

const mockCards: CreditCard[] = [
  {
    id: 'c1',
    name: 'Cartão Principal',
    limitAmount: 5000,
    closingDay: 10,
    dueDay: 15,
  },
];

const cloudCard: CreditCard = {
  id: 'cloud',
  name: 'Cartão Cloud',
  limitAmount: 1000,
  closingDay: 5,
  dueDay: 20,
};

const localCard: CreditCard = {
  id: 'local',
  name: 'Cartão Local',
  limitAmount: 2000,
  closingDay: 8,
  dueDay: 25,
};

vi.mock('../lib/appwrite', () => ({
  isCloudConfigured: vi.fn(),
  appwrite: null,
}));

vi.mock('../lib/cardsDb', () => ({
  fetchCards: vi.fn(),
  upsertCard: vi.fn(),
  deleteCard: vi.fn(),
}));

function setStored(data: CreditCard[]) {
  localStorage.setItem(
    CARDS_STORAGE_KEY,
    JSON.stringify({ version: 1, data, updatedAt: Date.now() })
  );
}

describe('useCreditCards', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('sem Appwrite: carrega do armazenamento local', async () => {
    const { isCloudConfigured } = await import('../lib/appwrite');
    vi.mocked(isCloudConfigured).mockReturnValue(false);
    setStored(mockCards);

    const { result } = renderHook(() => useCreditCards());

    await waitFor(() => expect(result.current.isLoadingCards).toBe(false), { timeout: 2000 });

    expect(result.current.cards).toHaveLength(1);
    expect(result.current.cards[0].name).toBe('Cartão Principal');
  });

  it('com Appwrite: chama fetchCards e seta cards', async () => {
    const { isCloudConfigured } = await import('../lib/appwrite');
    const { fetchCards } = await import('../lib/cardsDb');
    vi.mocked(isCloudConfigured).mockReturnValue(true);
    vi.mocked(fetchCards).mockResolvedValue(mockCards);

    const { result } = renderHook(() => useCreditCards());

    await waitFor(() => expect(result.current.isLoadingCards).toBe(false), { timeout: 2000 });

    expect(fetchCards).toHaveBeenCalled();
    expect(result.current.cards).toHaveLength(1);
  });

  it('não sobrescreve o backup local com [] durante o hydrate na nuvem', async () => {
    const { isCloudConfigured } = await import('../lib/appwrite');
    const { fetchCards } = await import('../lib/cardsDb');
    vi.mocked(isCloudConfigured).mockReturnValue(true);
    vi.mocked(fetchCards).mockResolvedValue(mockCards);
    setStored(mockCards);

    const { result } = renderHook(() => useCreditCards());

    await waitFor(() => expect(result.current.isLoadingCards).toBe(false), { timeout: 2000 });

    const raw = localStorage.getItem(CARDS_STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw as string).data).toHaveLength(1);
  });

  it('com Appwrite: migra cartões locais ausentes da resposta da nuvem', async () => {
    const { isCloudConfigured } = await import('../lib/appwrite');
    const { fetchCards, upsertCard } = await import('../lib/cardsDb');
    vi.mocked(isCloudConfigured).mockReturnValue(true);
    vi.mocked(fetchCards)
      .mockResolvedValueOnce([cloudCard])
      .mockResolvedValue([cloudCard, localCard]);
    vi.mocked(upsertCard).mockImplementation(async (c) => ({ ...c, id: c.id as string }));
    setStored([cloudCard, localCard]);

    const { result } = renderHook(() => useCreditCards());

    await waitFor(() => expect(result.current.isLoadingCards).toBe(false), { timeout: 2000 });

    expect(upsertCard).toHaveBeenCalledWith(expect.objectContaining({ id: 'local' }));
    expect(result.current.cards.map((c) => c.id)).toEqual(
      expect.arrayContaining(['cloud', 'local'])
    );
  });

  it('com Appwrite: mantém cartão local visível quando o upsert falha', async () => {
    const { isCloudConfigured } = await import('../lib/appwrite');
    const { fetchCards, upsertCard } = await import('../lib/cardsDb');
    vi.mocked(isCloudConfigured).mockReturnValue(true);
    vi.mocked(fetchCards).mockResolvedValue([cloudCard]);
    vi.mocked(upsertCard).mockRejectedValue(new Error('offline'));
    setStored([cloudCard, localCard]);

    const { result } = renderHook(() => useCreditCards());

    await waitFor(() => expect(result.current.isLoadingCards).toBe(false), { timeout: 2000 });

    expect(result.current.cards.map((c) => c.id)).toEqual(
      expect.arrayContaining(['cloud', 'local'])
    );
    const raw = localStorage.getItem(CARDS_STORAGE_KEY);
    expect(JSON.parse(raw as string).data).toHaveLength(2);
  });
});
