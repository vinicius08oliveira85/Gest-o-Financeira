import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { ReportsPanel } from './ReportsPanel';
import { TREND_MONTHS_KEY } from '../constants';
import type { Entry, Loan } from '../types';

function loan(): Loan {
  return {
    id: 'l1',
    name: 'Carro',
    amount: 600,
    sourceType: 'pessoa_fisica',
    dueDate: '2025-03-10',
    paid: false,
    createdAt: 1,
    installmentsCount: 2,
    installments: [
      { number: 1, amount: 300, dueDate: '2025-03-10', paid: false },
      { number: 2, amount: 400, dueDate: '2025-04-10', paid: false },
    ],
  };
}

describe('ReportsPanel', () => {
  afterEach(() => {
    localStorage.removeItem(TREND_MONTHS_KEY);
    vi.restoreAllMocks();
  });

  it('mostra 6 meses por padrão na evolução', () => {
    render(<ReportsPanel entries={[]} month={2} year={2025} />);

    expect(screen.getByText('Últimos 6 meses (entradas e saídas lançadas)')).toBeInTheDocument();
  });

  it('troca a janela para 12 meses e persiste a escolha', () => {
    render(<ReportsPanel entries={[]} month={2} year={2025} />);

    fireEvent.click(screen.getByRole('button', { name: '12m' }));

    expect(screen.getByText('Últimos 12 meses (entradas e saídas lançadas)')).toBeInTheDocument();
    expect(localStorage.getItem(TREND_MONTHS_KEY)).toBe('12');
  });

  it('respeita a janela persistida ao montar', () => {
    localStorage.setItem(TREND_MONTHS_KEY, '3');

    render(<ReportsPanel entries={[]} month={2} year={2025} />);

    expect(screen.getByText('Últimos 3 meses (entradas e saídas lançadas)')).toBeInTheDocument();
  });

  it('ignora janela persistida inválida e usa 6 meses', () => {
    localStorage.setItem(TREND_MONTHS_KEY, 'abc');

    render(<ReportsPanel entries={[]} month={2} year={2025} />);

    expect(screen.getByText('Últimos 6 meses (entradas e saídas lançadas)')).toBeInTheDocument();
  });

  it('exporta a evolução em CSV ao clicar em Exportar', () => {
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<ReportsPanel entries={[]} month={2} year={2025} />);

    // Nome exato: o cabeçalho ganhou um segundo botão "Exportar" (relatórios completos)
    fireEvent.click(screen.getByRole('button', { name: 'Exportar' }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(blob.type).toBe('text/csv;charset=utf-8;');
  });

  it('conta as parcelas de empréstimo em aberto como saídas do mês', () => {
    render(<ReportsPanel entries={[]} month={2} year={2025} loans={[loan()]} />);

    const card = screen.getByText('Total saídas').closest('div') as HTMLElement;
    const text = (card.textContent ?? '').replace(/\u00a0/g, ' ');
    // R$ 300,00 no total e como pendente (nada foi pago).
    expect(text).toContain('R$ 300,00');
    expect(text).toContain('R$ 0,00 finalizadas');
    expect(screen.getByText('Empréstimos')).toBeInTheDocument();
  });

  it('mostra o peso dos empréstimos nas saídas separado do resto', () => {
    const entrada: Entry = {
      id: 'e1',
      name: 'Conta de luz',
      amount: 200,
      dueDate: '2025-03-15',
      isPaid: true,
      type: 'debt',
      createdAt: 1,
    };

    render(<ReportsPanel entries={[entrada]} month={2} year={2025} loans={[loan()]} />);

    expect(screen.getByText('Empréstimos nas saídas do mês')).toBeInTheDocument();
    // 300 de 500 em saídas = 60%; os outros 200 são as demais saídas.
    expect(screen.getByText('60% das saídas')).toBeInTheDocument();
    const demais = (screen.getByText('Demais saídas').parentElement?.textContent ?? '').replace(
      /\u00a0/g,
      ' '
    );
    expect(demais).toContain('R$ 200,00');
  });

  it('mostra os juros pagos no mês junto do peso dos empréstimos', () => {
    const comJuros: Loan = {
      id: 'j1',
      name: 'Carro',
      amount: 1000,
      sourceType: 'pessoa_fisica',
      dueDate: '2025-03-10',
      paid: false,
      createdAt: 1,
      installmentsCount: 3,
      installments: [
        {
          number: 1,
          amount: 450,
          dueDate: '2025-03-10',
          paid: true,
          paidDate: '2025-03-10',
          entryId: 'e1',
        },
        { number: 2, amount: 450, dueDate: '2025-04-10', paid: false },
        { number: 3, amount: 450, dueDate: '2025-05-10', paid: false },
      ],
    };

    render(<ReportsPanel entries={[]} month={2} year={2025} loans={[comJuros]} />);

    // 450 de 1.350 = 116,67 de juros já pagos em março.
    const linha = (screen.getByText('Juros pagos no mês').parentElement?.textContent ?? '').replace(
      /\u00a0/g,
      ' '
    );
    expect(linha).toContain('R$ 116,67');
  });

  it('exporta o relatório completo (KPIs + categorias) em CSV', () => {
    let capturedParts: BlobPart[] = [];
    const RealBlob = global.Blob;
    vi.spyOn(global, 'Blob').mockImplementation(function (
      parts?: BlobPart[],
      opts?: BlobPropertyBag
    ) {
      capturedParts = parts ? [...parts] : [];
      return new RealBlob(parts ?? [], opts);
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    render(<ReportsPanel entries={[]} month={2} year={2025} />);

    fireEvent.click(screen.getByRole('button', { name: /relatórios completos/i }));

    expect(capturedParts.length).toBeGreaterThan(0);
    const content = String(capturedParts[0]);
    expect(content.startsWith('\uFEFF')).toBe(true);
    expect(content).toContain('Relatório de março de 2025');
    expect(content).toContain('Métrica,Valor,Mês anterior,Variação %');
    expect(content).toContain('Categorias (saídas)');
    expect(content).toContain('Categorias (entradas)');
  });
});
