import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { MonthlyTrendChart } from './MonthlyTrendChart';
import { buildMonthlyTrend } from '../lib/monthlyTrend';
import type { CardExpense, CreditCard, Entry } from '../types';

function entry(
  id: string,
  type: Entry['type'],
  amount: number,
  dueDate: string,
  isPaid: boolean
): Entry {
  return {
    id,
    name: 'Item',
    amount,
    dueDate,
    isPaid,
    type,
    createdAt: Date.now(),
  };
}

const rect = {
  width: 640,
  height: 244,
  left: 0,
  top: 0,
  right: 640,
  bottom: 244,
  x: 0,
  y: 0,
  toJSON: () => ({}),
} as DOMRect;

describe('MonthlyTrendChart', () => {
  /** jsdom não mede layout; mock no próprio elemento SVG (e no prototype como fallback) */
  function mockSvgRect(svg: Element) {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue(rect);
    vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue(rect);
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('mostra o tooltip com os dados do mês sob o cursor e fecha ao sair', () => {
    const entries: Entry[] = [
      entry('1', 'cash', 100, '2025-02-10', true),
      entry('2', 'debt', 40, '2025-02-15', true),
    ];
    const expenses: CardExpense[] = [
      {
        id: 'e1',
        cardId: 'c1',
        name: 'Compra',
        amount: 75,
        date: '2025-02-05',
        billingMonth: 1,
        billingYear: 2025,
        createdAt: Date.now(),
      },
    ];
    const cards: CreditCard[] = [
      { id: 'c1', name: 'Nubank', limitAmount: 1000, closingDay: 25, dueDay: 5 },
      { id: 'c2', name: 'Inter', limitAmount: 500, closingDay: 15, dueDay: 10 },
    ];

    // Janela de 3 meses terminando em março/2025 → índice 1 = fevereiro
    const data = buildMonthlyTrend(entries, 2, 2025, 3, expenses, cards);
    render(<MonthlyTrendChart data={data} />);

    const n = data.length;
    const slotW = (640 - 46 - 10) / n;
    const cxFev = 46 + slotW * 1 + slotW / 2;
    const svg = screen.getByRole('img');
    mockSvgRect(svg);

    // jsdom não implementa PointerEvent; um MouseEvent com type 'pointermove'
    // preserva clientX/clientY e o React 19 entrega no onPointerMove.
    fireEvent(svg, new MouseEvent('pointermove', { clientX: cxFev, clientY: 100, bubbles: true }));

    const tooltip = screen.getByRole('status');
    expect(within(tooltip).getByText(/fevereiro de 2025/i)).toBeInTheDocument();
    expect(within(tooltip).getByText('R$ 100,00')).toBeInTheDocument(); // entradas
    expect(within(tooltip).getByText('R$ 40,00')).toBeInTheDocument(); // saídas
    expect(within(tooltip).getByText('R$ 75,00')).toBeInTheDocument(); // cartão
    expect(within(tooltip).getByText('R$ 1.500,00')).toBeInTheDocument(); // limite total
    expect(within(tooltip).getByText('R$ 1.000,00')).toBeInTheDocument(); // limite Nubank
    expect(within(tooltip).getByText('R$ 500,00')).toBeInTheDocument(); // limite Inter
    expect(within(tooltip).getByText('Nubank')).toBeInTheDocument();
    expect(within(tooltip).getByText('Inter')).toBeInTheDocument();
    // Uso do limite no mês (75 / 1500 = 5%) — no tooltip e na tabela
    expect(within(tooltip).getByText('Uso do limite')).toBeInTheDocument();
    expect(within(tooltip).getByText('5%')).toBeInTheDocument();
    expect(within(screen.getByRole('table')).getByText('5%')).toBeInTheDocument(); // coluna Uso
    // Média de uso no rodapé: jan 0% + fev 5% + mar 0% → 1,67% → 2%
    expect(within(screen.getByRole('table')).getByText('Média de uso')).toBeInTheDocument();
    expect(within(screen.getByRole('table')).getByText('2%')).toBeInTheDocument();

    fireEvent.pointerLeave(svg);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('mostra a média de uso no rodapé ignorando meses sem limite', () => {
    const expenses: CardExpense[] = [
      {
        id: 'e1',
        cardId: 'c1',
        name: 'Compra',
        amount: 75,
        date: '2025-02-05',
        billingMonth: 1,
        billingYear: 2025,
        createdAt: Date.now(),
      },
    ];
    const cards: CreditCard[] = [
      {
        id: 'c1',
        name: 'Nubank',
        limitAmount: 1000,
        closingDay: 25,
        dueDay: 5,
        createdAt: '2025-02-01T00:00:00Z',
      },
    ];

    // jan sem limite (cartão criado em fev); fev 7,5%; mar 0% → média 3,75% → 4%
    const data = buildMonthlyTrend([], 2, 2025, 3, expenses, cards);
    render(<MonthlyTrendChart data={data} />);

    const table = screen.getByRole('table');
    expect(within(table).getByText('Média de uso (2 meses com limite)')).toBeInTheDocument();
    expect(within(table).getByText('4%')).toBeInTheDocument();
  });

  it('estado vazio usa a janela real de meses', () => {
    const data = buildMonthlyTrend([], 2, 2025, 12);
    render(<MonthlyTrendChart data={data} />);

    expect(
      screen.getByText('Sem lançamentos nos últimos 12 meses para exibir a evolução.')
    ).toBeInTheDocument();
  });

  it('com 12 meses de dados reais, o hover no último mês mostra os valores certos', () => {
    const entries: Entry[] = [
      entry('1', 'cash', 120, '2025-03-10', true),
      entry('2', 'debt', 50, '2025-03-15', true),
    ];
    const expenses: CardExpense[] = [
      {
        id: 'e1',
        cardId: 'c1',
        name: 'Compra',
        amount: 60,
        date: '2025-03-05',
        billingMonth: 2,
        billingYear: 2025,
        createdAt: Date.now(),
      },
    ];
    const cards: CreditCard[] = [
      { id: 'c1', name: 'Nubank', limitAmount: 1000, closingDay: 25, dueDay: 5 },
      { id: 'c2', name: 'Inter', limitAmount: 500, closingDay: 15, dueDay: 10 },
    ];

    // Janela de 12 meses terminando em mar/2025 (começa em abr/2024)
    const data = buildMonthlyTrend(entries, 2, 2025, 12, expenses, cards);
    expect(data).toHaveLength(12);
    render(<MonthlyTrendChart data={data} />);

    const n = data.length;
    const slotW = (640 - 46 - 10) / n;
    const cxUltimo = 46 + slotW * (n - 1) + slotW / 2; // centro do último mês (mar/25)
    const svg = screen.getByRole('img');
    mockSvgRect(svg);

    fireEvent(
      svg,
      new MouseEvent('pointermove', { clientX: cxUltimo, clientY: 120, bubbles: true })
    );

    const tooltip = screen.getByRole('status');
    expect(within(tooltip).getByText(/março de 2025/i)).toBeInTheDocument();
    expect(within(tooltip).getByText('R$ 120,00')).toBeInTheDocument(); // entradas
    expect(within(tooltip).getByText('R$ 50,00')).toBeInTheDocument(); // saídas
    expect(within(tooltip).getByText('R$ 70,00')).toBeInTheDocument(); // saldo
    expect(within(tooltip).getByText('R$ 60,00')).toBeInTheDocument(); // cartão
    expect(within(tooltip).getByText('R$ 1.500,00')).toBeInTheDocument(); // limite total
    expect(within(tooltip).getByText('4%')).toBeInTheDocument(); // uso (60/1500)
    // O primeiro mês da janela não pode aparecer no tooltip
    expect(within(tooltip).queryByText(/abril de 2024/i)).not.toBeInTheDocument();
  });

  it('navega por teclado: setas, Home e End movem o destaque entre os meses', () => {
    const entries: Entry[] = [
      entry('1', 'cash', 100, '2025-02-10', true),
      entry('2', 'cash', 50, '2025-01-10', true),
    ];
    // Janela de 3 meses terminando em mar/2025
    const data = buildMonthlyTrend(entries, 2, 2025, 3);
    render(<MonthlyTrendChart data={data} />);

    const svg = screen.getByRole('img');
    mockSvgRect(svg);

    // ArrowLeft a partir do último mês (mar, padrão) → fev
    fireEvent.keyDown(svg, { key: 'ArrowLeft' });
    expect(within(screen.getByRole('status')).getByText(/fevereiro de 2025/i)).toBeInTheDocument();

    // Home → primeiro mês da janela (jan)
    fireEvent.keyDown(svg, { key: 'Home' });
    expect(within(screen.getByRole('status')).getByText(/janeiro de 2025/i)).toBeInTheDocument();

    // End → último mês (mar)
    fireEvent.keyDown(svg, { key: 'End' });
    expect(within(screen.getByRole('status')).getByText(/março de 2025/i)).toBeInTheDocument();

    // Seta à direita além do fim não estoura (permanece no último)
    fireEvent.keyDown(svg, { key: 'ArrowRight' });
    expect(within(screen.getByRole('status')).getByText(/março de 2025/i)).toBeInTheDocument();
  });

  it('mostra o uso por cartão individual na coluna Uso', () => {
    const expenses: CardExpense[] = [
      {
        id: 'e1',
        cardId: 'c1',
        name: 'Compra',
        amount: 75,
        date: '2025-03-05',
        billingMonth: 2,
        billingYear: 2025,
        createdAt: Date.now(),
      },
    ];
    const cards: CreditCard[] = [
      { id: 'c1', name: 'Nubank', limitAmount: 1000, closingDay: 25, dueDay: 5 },
      { id: 'c2', name: 'Inter', limitAmount: 500, closingDay: 15, dueDay: 10 },
    ];

    const data = buildMonthlyTrend([], 2, 2025, 1, expenses, cards); // só mar/25
    render(<MonthlyTrendChart data={data} />);

    const table = screen.getByRole('table');
    expect(within(table).getByText('Nubank')).toBeInTheDocument();
    expect(within(table).getByText('8%')).toBeInTheDocument(); // 75/1000
    expect(within(table).getByText('Inter')).toBeInTheDocument();
    expect(within(table).getByText('0%')).toBeInTheDocument(); // 0/500
  });

  it('sinaliza risco quando o uso passa de 90% e conta no rodapé', () => {
    const expenses: CardExpense[] = [
      {
        id: 'e1',
        cardId: 'c1',
        name: 'Compra',
        amount: 1000,
        date: '2025-03-05',
        billingMonth: 2,
        billingYear: 2025,
        createdAt: Date.now(),
      },
    ];
    const cards: CreditCard[] = [
      { id: 'c1', name: 'Nubank', limitAmount: 1000, closingDay: 25, dueDay: 5 },
    ];

    const data = buildMonthlyTrend([], 2, 2025, 1, expenses, cards); // uso 100%
    render(<MonthlyTrendChart data={data} />);

    const table = screen.getByRole('table');
    // Ponto de risco na célula do mês e no rodapé (a média também passa de 90%)
    expect(within(table).getAllByTitle('Uso acima de 90% do limite')).toHaveLength(2);
    expect(within(table).getByText(/1 acima de 90%/)).toBeInTheDocument();
  });

  it('não abre o tooltip fora da área de plotagem', () => {
    const entries: Entry[] = [entry('1', 'cash', 100, '2025-03-10', true)];
    const data = buildMonthlyTrend(entries, 2, 2025, 3);
    render(<MonthlyTrendChart data={data} />);

    const svg = screen.getByRole('img');
    mockSvgRect(svg);
    // canto direito, fora do plot
    fireEvent(svg, new MouseEvent('pointermove', { clientX: 639, clientY: 100, bubbles: true }));

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
