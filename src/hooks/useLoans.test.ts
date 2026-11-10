import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useLoans } from './useLoans';
import type { Loan } from '../types';
import { LOANS_STORAGE_KEY } from '../constants';

const cloudLoan: Loan = {
  id: 'cloud',
  name: 'Empréstimo Cloud',
  amount: 1000,
  sourceType: 'pessoa_fisica',
  dueDate: '2026-12-10',
  paid: false,
  createdAt: 1,
};

const otherLoan: Loan = {
  id: 'other',
  name: 'Empréstimo Trabalhador',
  amount: 500,
  sourceType: 'trabalhador',
  dueDate: '2026-12-20',
  paid: true,
  createdAt: 2,
};

vi.mock('../lib/appwrite', () => ({
  isCloudConfigured: vi.fn(),
  appwrite: null,
}));

vi.mock('../lib/loansDb', () => ({
  fetchLoans: vi.fn(),
  upsertLoan: vi.fn(),
  deleteLoan: vi.fn(),
}));

function setStored(data: Loan[]) {
  localStorage.setItem(
    LOANS_STORAGE_KEY,
    JSON.stringify({ version: 1, data, updatedAt: Date.now() })
  );
}

async function renderLoaded(configured: boolean) {
  const { isCloudConfigured } = await import('../lib/appwrite');
  vi.mocked(isCloudConfigured).mockReturnValue(configured);
  const hook = renderHook(() => useLoans());
  await waitFor(() => expect(hook.result.current.isLoadingLoans).toBe(false), { timeout: 2000 });
  return hook;
}

describe('useLoans', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('sem Appwrite: cadastra, edita e exclui apenas localmente', async () => {
    const { upsertLoan: upsertDb, deleteLoan: deleteDb } = await import('../lib/loansDb');
    const { result } = await renderLoaded(false);

    act(() => {
      result.current.upsertLoan({
        name: 'Novo',
        amount: 300,
        sourceType: 'pessoa_fisica',
        dueDate: '2026-11-30',
        paid: false,
      });
    });
    expect(result.current.loans).toHaveLength(1);
    const id = result.current.loans[0].id;
    expect(result.current.loans[0].name).toBe('Novo');

    act(() => {
      result.current.upsertLoan({
        id,
        name: 'Editado',
        amount: 400,
        sourceType: 'trabalhador',
        dueDate: '2026-12-01',
        paid: true,
      });
    });
    expect(result.current.loans).toHaveLength(1);
    expect(result.current.loans[0]).toMatchObject({ id, name: 'Editado', amount: 400, paid: true });

    act(() => {
      result.current.deleteLoan(id);
    });
    expect(result.current.loans).toHaveLength(0);
    expect(upsertDb).not.toHaveBeenCalled();
    expect(deleteDb).not.toHaveBeenCalled();
  });

  it('com Appwrite: cadastro otimista é trocado pelo registro salvo', async () => {
    const { fetchLoans, upsertLoan: upsertDb } = await import('../lib/loansDb');
    vi.mocked(fetchLoans).mockResolvedValue([]);
    vi.mocked(upsertDb).mockImplementation(
      async (l) =>
        ({
          ...l,
          id: l.id ?? 'server-id',
          createdAt: 99,
        }) as Loan
    );
    const { result } = await renderLoaded(true);

    act(() => {
      result.current.upsertLoan({
        name: 'Novo',
        amount: 300,
        sourceType: 'pessoa_fisica',
        dueDate: '2026-11-30',
        paid: false,
      });
    });

    await waitFor(() => expect(upsertDb).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.loans[0]?.createdAt).toBe(99));
    expect(result.current.loans).toHaveLength(1);
  });

  it('com Appwrite: edição e exclusão chamam o banco', async () => {
    const {
      fetchLoans,
      upsertLoan: upsertDb,
      deleteLoan: deleteDb,
    } = await import('../lib/loansDb');
    vi.mocked(fetchLoans).mockResolvedValue([cloudLoan]);
    vi.mocked(upsertDb).mockImplementation(async (l) => ({ ...cloudLoan, ...l }) as Loan);
    vi.mocked(deleteDb).mockResolvedValue(undefined);
    const { result } = await renderLoaded(true);

    act(() => {
      result.current.upsertLoan({
        id: 'cloud',
        name: 'Alterado',
        amount: 1200,
        sourceType: 'trabalhador',
        dueDate: '2026-12-10',
        paid: true,
      });
    });
    await waitFor(() =>
      expect(upsertDb).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'cloud', name: 'Alterado' })
      )
    );
    expect(result.current.loans[0].name).toBe('Alterado');

    act(() => {
      result.current.deleteLoan('cloud');
    });
    await waitFor(() => expect(deleteDb).toHaveBeenCalledWith('cloud'));
    expect(result.current.loans.find((l) => l.id === 'cloud')).toBeUndefined();
  });

  it('com Appwrite: falha ao cadastrar remove só o item novo, sem apagar outros', async () => {
    const { fetchLoans, upsertLoan: upsertDb } = await import('../lib/loansDb');
    vi.mocked(fetchLoans).mockResolvedValue([cloudLoan]);
    const rejects: Array<(e: Error) => void> = [];
    vi.mocked(upsertDb).mockImplementation(
      () =>
        new Promise((_, reject) => {
          rejects.push(reject);
        })
    );
    const { result } = await renderLoaded(true);

    act(() => {
      result.current.upsertLoan({
        name: 'Novo',
        amount: 300,
        sourceType: 'pessoa_fisica',
        dueDate: '2026-11-30',
        paid: false,
      });
    });
    expect(result.current.loans).toHaveLength(2);

    // Outra alteração enquanto a requisição ainda está em andamento.
    act(() => {
      result.current.upsertLoan({
        id: 'cloud',
        name: 'Mudança concorrente',
        amount: 1000,
        sourceType: 'pessoa_fisica',
        dueDate: '2026-12-10',
        paid: false,
      });
    });

    // Rejeita só o primeiro salvamento (o cadastro de 'Novo').
    await act(async () => {
      rejects[0](new Error('offline'));
    });

    await waitFor(() => expect(result.current.loans.map((l) => l.name)).not.toContain('Novo'));
    expect(result.current.loans.map((l) => l.name)).toContain('Mudança concorrente');
    expect(result.current.loans).toHaveLength(1);
  });

  it('com Appwrite: falha ao editar restaura só o item editado', async () => {
    const { fetchLoans, upsertLoan: upsertDb } = await import('../lib/loansDb');
    vi.mocked(fetchLoans).mockResolvedValue([cloudLoan, otherLoan]);
    let rejectSave: (e: Error) => void = () => {};
    vi.mocked(upsertDb).mockImplementation(
      () =>
        new Promise((_, reject) => {
          rejectSave = reject;
        })
    );
    const { result } = await renderLoaded(true);

    act(() => {
      result.current.upsertLoan({
        id: 'cloud',
        name: 'Tentativa',
        amount: 2000,
        sourceType: 'trabalhador',
        dueDate: '2026-12-10',
        paid: true,
      });
    });
    expect(result.current.loans.find((l) => l.id === 'cloud')?.name).toBe('Tentativa');

    await act(async () => {
      rejectSave(new Error('offline'));
    });

    await waitFor(() =>
      expect(result.current.loans.find((l) => l.id === 'cloud')?.name).toBe('Empréstimo Cloud')
    );
    expect(result.current.loans.find((l) => l.id === 'other')).toEqual(otherLoan);
  });

  it('com Appwrite: falha ao excluir devolve o item e mantém as outras mudanças', async () => {
    const { fetchLoans, deleteLoan: deleteDb } = await import('../lib/loansDb');
    vi.mocked(fetchLoans).mockResolvedValue([cloudLoan, otherLoan]);
    let rejectDelete: (e: Error) => void = () => {};
    vi.mocked(deleteDb).mockImplementation(
      () =>
        new Promise((_, reject) => {
          rejectDelete = reject;
        })
    );
    const { result } = await renderLoaded(true);

    act(() => {
      result.current.deleteLoan('cloud');
    });
    expect(result.current.loans.map((l) => l.id)).toEqual(['other']);

    await act(async () => {
      rejectDelete(new Error('offline'));
    });

    await waitFor(() => expect(result.current.loans.map((l) => l.id)).toContain('cloud'));
    expect(result.current.loans.map((l) => l.id)).toContain('other');
    expect(result.current.loans).toHaveLength(2);
  });

  it('com Appwrite: nuvem fora do ar carrega o espelho local', async () => {
    const { fetchLoans } = await import('../lib/loansDb');
    vi.mocked(fetchLoans).mockRejectedValue(new Error('offline'));
    setStored([otherLoan]);

    const { result } = await renderLoaded(true);

    expect(result.current.loans.map((l) => l.id)).toEqual(['other']);
  });
});
