import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';
import { ThemeProvider } from './contexts/ThemeContext';
import { buildInvoiceEntry } from './lib/cardInvoice';
import { CARDS_STORAGE_KEY, CARD_EXPENSES_STORAGE_KEY, ENTRIES_STORAGE_KEY } from './constants';
import { clearStorage, writeStored } from './lib/storage';
import type { CardExpense, CreditCard } from './types';

/** A nuvem fica fora do teste: os hooks reais usam o armazenamento local. */
vi.mock('./lib/appwrite', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./lib/appwrite')>();
  return { ...actual, isCloudConfigured: () => false };
});

vi.mock('./hooks/useAlerts', () => ({ useAlerts: () => ({ alerts: [] }) }));

vi.mock('./hooks/useOnboarding', () => ({
  useOnboarding: () => ({
    showNewEntryHint: false,
    showMonthNavHint: false,
    showReportsHint: false,
    completeStep: vi.fn(),
    skip: vi.fn(),
  }),
}));

const card: CreditCard = {
  id: 'c1',
  name: 'Nubank',
  limitAmount: 3000,
  closingDay: 25,
  dueDay: 5,
};

const expense: CardExpense = {
  id: 'x1',
  cardId: card.id,
  name: 'Mercado do mês',
  amount: 600,
  date: '2026-11-10',
  billingMonth: 10,
  billingYear: 2026,
  createdAt: 1,
};

/** Nome do lançamento que o app cria ao registrar a fatura de novembro. */
const invoiceName = buildInvoiceEntry(card, 10, 2026, 600).name;

/** `formatCurrency` usa NBSP entre "R$" e o valor. */
const textOf = (el: Element | null) => (el?.textContent ?? '').replace(/\u00a0/g, ' ');

const rowOf = (text: HTMLElement | null) => text?.closest('.neu-list-item') ?? null;

const renderApp = () =>
  render(
    <ThemeProvider>
      <App />
    </ThemeProvider>
  );

/** Abre dezembro, mês em que a fatura do ciclo de novembro é lançada. */
function openDecember() {
  fireEvent.click(screen.getByRole('button', { name: 'Lançamentos' }));
  fireEvent.click(screen.getByRole('button', { name: 'Próximo mês' }));
}

/** Registra a fatura de novembro pelo painel do cartão e abre o lançamento. */
async function registerInvoiceAndOpenDecember() {
  fireEvent.click(screen.getByRole('button', { name: 'Cartões' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Fatura' }, { timeout: 3000 }));
  openDecember();
}

/** Volta ao ciclo de novembro e exclui o único gasto dele, confirmando no modal. */
async function deleteOnlyExpenseOfNovember() {
  fireEvent.click(screen.getByRole('button', { name: 'Mês anterior' }));
  fireEvent.click(screen.getByRole('button', { name: 'Cartões' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Gastos' }, { timeout: 3000 }));
  fireEvent.click(await screen.findByTitle('Editar gasto'));
  fireEvent.click(await screen.findByRole('button', { name: 'Excluir gasto' }, { timeout: 3000 }));
  fireEvent.click(await screen.findByRole('button', { name: 'Excluir' }, { timeout: 3000 }));
}

describe('App · fatura do cartão ao excluir o gasto do ciclo', () => {
  beforeEach(async () => {
    sessionStorage.clear();
    // O armazenamento é compartilhado entre os testes: sem limpar, a fatura paga do
    // cenário anterior apareceria como "Paga" no painel do cartão deste cenário.
    await clearStorage(ENTRIES_STORAGE_KEY);
    await writeStored<CreditCard>(CARDS_STORAGE_KEY, [card]);
    await writeStored<CardExpense>(CARD_EXPENSES_STORAGE_KEY, [expense]);
    // Relógio fixo: o gasto semeado é do ciclo de novembro de 2026.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-11-10T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('mantém a fatura paga, com o valor, quando o gasto do ciclo é excluído', async () => {
    renderApp();
    expect(await screen.findByText(/Fluxo de Caixa/i)).toBeInTheDocument();

    await registerInvoiceAndOpenDecember();
    const pendingRow = rowOf(await screen.findByText(invoiceName, {}, { timeout: 3000 }));
    expect(textOf(pendingRow)).toContain('R$ 600,00');
    expect(textOf(pendingRow)).toContain('Pendente');

    // Marca a fatura como paga.
    fireEvent.click(screen.getByRole('button', { name: 'Finalizar (marcar como pago)' }));
    const paidRow = rowOf(await screen.findByText(invoiceName));
    expect(textOf(paidRow)).toContain('Finalizado');
    expect(textOf(paidRow)).toContain('R$ 600,00');

    await deleteOnlyExpenseOfNovember();

    // Sem gastos no ciclo a fatura em aberto sairia do fluxo; a paga fica como
    // histórico, ainda com o valor que foi pago — o dinheiro já saiu do caixa.
    openDecember();
    const afterRow = rowOf(await screen.findByText(invoiceName, {}, { timeout: 3000 }));
    expect(textOf(afterRow)).toContain('R$ 600,00');
    expect(textOf(afterRow)).toContain('Finalizado');
  });

  it('tira a fatura em aberto do fluxo quando o ciclo fica sem gastos', async () => {
    renderApp();
    expect(await screen.findByText(/Fluxo de Caixa/i)).toBeInTheDocument();

    await registerInvoiceAndOpenDecember();
    const pendingRow = rowOf(await screen.findByText(invoiceName, {}, { timeout: 3000 }));
    expect(textOf(pendingRow)).toContain('R$ 600,00');
    expect(textOf(pendingRow)).toContain('Pendente');

    await deleteOnlyExpenseOfNovember();
    openDecember();

    // Fatura em aberto de um ciclo que zerou não deve ficar como lançamento de R$ 0,00.
    await waitFor(() => expect(screen.queryByText(invoiceName)).toBeNull(), { timeout: 3000 });
    expect(screen.queryByText(/600,00/)).toBeNull();

    // E o cartão deixa de ter fatura registrada para o ciclo.
    fireEvent.click(screen.getByRole('button', { name: 'Cartões' }));
    expect(screen.queryByRole('button', { name: 'Atualizar' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Paga' })).toBeNull();
  });
});
