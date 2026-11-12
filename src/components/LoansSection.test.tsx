import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { LoansSection } from './LoansSection';
import type { Loan } from '../types';

// Congela o relógio em 08/11/2026 para que vencido/próximo não dependam da data real.
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 10, 8));
});
afterEach(() => {
  vi.useRealTimers();
});

function loan(overrides: Partial<Loan> & { id: string; name: string; amount: number }): Loan {
  return {
    sourceType: 'pessoa_fisica',
    dueDate: '2026-12-01',
    paid: false,
    createdAt: 1,
    ...overrides,
  };
}

const noop = () => {};

const loans: Loan[] = [
  loan({ id: 'overdue', name: 'Vencido', amount: 100, dueDate: '2026-11-01' }),
  loan({ id: 'up1', name: 'Próximo 1', amount: 200, dueDate: '2026-11-15' }),
  loan({ id: 'up2', name: 'Próximo 2', amount: 300, dueDate: '2026-11-20' }),
  loan({ id: 'up3', name: 'Próximo 3', amount: 400, dueDate: '2026-11-25' }),
  loan({ id: 'up4', name: 'Próximo 4', amount: 500, dueDate: '2026-11-30' }),
  loan({
    id: 'paid-past',
    name: 'Pago antigo',
    amount: 1000,
    dueDate: '2026-10-01',
    paid: true,
    sourceType: 'trabalhador',
  }),
];

function card(label: string) {
  const el = screen.getByText(label, { exact: false }).closest('.neu-card') as HTMLElement;
  return el;
}

describe('LoansSection', () => {
  it('mostra o total em aberto e o total já pago', () => {
    render(
      <LoansSection
        loans={loans}
        onNewLoan={noop}
        onEditLoan={noop}
        onOpenInstallments={noop}
        onSettleLoan={noop}
        onUndoSettlement={noop}
      />
    );

    // Em aberto: 100 + 200 + 300 + 400 + 500 = 1500. Já pago: 1000.
    expect(within(card('Em aberto')).getByText('R$ 1.500,00')).toBeTruthy();
    expect(within(card('Já pago')).getByText('R$ 1.000,00')).toBeTruthy();
  });

  it('soma por origem apenas o que está em aberto', () => {
    render(
      <LoansSection
        loans={loans}
        onNewLoan={noop}
        onEditLoan={noop}
        onOpenInstallments={noop}
        onSettleLoan={noop}
        onUndoSettlement={noop}
      />
    );

    // Pessoa física em aberto: 100+200+300+400+500 = 1500.
    expect(within(card('Pessoa física · a pagar')).getByText('R$ 1.500,00')).toBeTruthy();
    // Trabalhador só tem o pago, então em aberto é zero.
    expect(within(card('Empréstimo do trabalhador · a pagar')).getByText('R$ 0,00')).toBeTruthy();
  });

  it('lista até 3 próximos vencimentos, em ordem, sem pagos nem vencidos', () => {
    render(
      <LoansSection
        loans={loans}
        onNewLoan={noop}
        onEditLoan={noop}
        onOpenInstallments={noop}
        onSettleLoan={noop}
        onUndoSettlement={noop}
      />
    );

    const heading = screen.getByText('Próximos vencimentos');
    const list = heading.parentElement as HTMLElement;
    const items = within(list)
      .getAllByRole('listitem')
      .map((li) => li.textContent);

    expect(items).toHaveLength(3);
    expect(items[0]).toContain('Próximo 1');
    expect(items[1]).toContain('Próximo 2');
    expect(items[2]).toContain('Próximo 3');
    // Fora do bloco, a lista geral ainda mostra todos; aqui só conferimos o bloco.
    expect(within(list).queryByText(/Próximo 4/)).toBeNull();
    expect(within(list).queryByText(/Pago antigo/)).toBeNull();
    expect(within(list).queryByText(/Vencido/)).toBeNull();
  });

  it('marca como vencido só o que não foi pago e tem data passada', () => {
    render(
      <LoansSection
        loans={loans}
        onNewLoan={noop}
        onEditLoan={noop}
        onOpenInstallments={noop}
        onSettleLoan={noop}
        onUndoSettlement={noop}
      />
    );

    const overdueItem = screen.getByText('Vencido').closest('li') as HTMLElement;
    expect(overdueItem.className).toContain('ring-red-400');
    expect(within(overdueItem).getByText('Vencido e não pago')).toBeTruthy();

    // Pago com data passada não é destacado como vencido.
    const paidItem = screen.getByText('Pago antigo').closest('li') as HTMLElement;
    expect(paidItem.className).not.toContain('ring-red-400');
    expect(within(paidItem).queryByText('Vencido e não pago')).toBeNull();

    // Próximo vencimento não é destacado.
    const upcomingItem = screen.getByText('Próximo 1').closest('li') as HTMLElement;
    expect(upcomingItem.className).not.toContain('ring-red-400');
  });

  it('não mostra o bloco de vencimentos quando não há nenhum em aberto futuro', () => {
    render(
      <LoansSection
        loans={[loan({ id: 'x', name: 'Só vencido', amount: 50, dueDate: '2026-10-01' })]}
        onNewLoan={noop}
        onEditLoan={noop}
        onOpenInstallments={noop}
        onSettleLoan={noop}
        onUndoSettlement={noop}
      />
    );

    expect(screen.queryByText('Próximos vencimentos')).toBeNull();
  });

  it('mostra o valor mensal da parcela do empréstimo parcelado', () => {
    const parcelado = loan({
      id: 'parcelado',
      name: 'Parcelado',
      amount: 300,
      dueDate: '2026-11-20',
      installmentsCount: 3,
      installments: [
        { number: 1, amount: 100, dueDate: '2026-11-20', paid: false },
        { number: 2, amount: 100, dueDate: '2026-12-20', paid: false },
        { number: 3, amount: 100, dueDate: '2027-01-20', paid: false },
      ],
    });

    const pagamentoUnico = loan({
      id: 'unico',
      name: 'Pagamento único',
      amount: 400,
      dueDate: '2026-11-25',
    });

    render(
      <LoansSection
        loans={[parcelado, pagamentoUnico]}
        onNewLoan={noop}
        onEditLoan={noop}
        onOpenInstallments={noop}
        onSettleLoan={noop}
        onUndoSettlement={noop}
      />
    );

    const item = screen.getByText('Parcelado').closest('li') as HTMLElement;
    expect((item.textContent ?? '').replace(/\u00a0/g, ' ')).toContain('Parcela mensal: R$ 100,00');

    // Pagamento único não tem valor mensal: só o parcelado mostra a linha.
    const unico = screen.getByText('Pagamento único').closest('li') as HTMLElement;
    expect(unico.textContent).not.toContain('Parcela mensal');
  });

  it('mostra o valor da próxima parcela, não o saldo do empréstimo', () => {
    const parcelado = loan({
      id: 'parcelado',
      name: 'Parcelado',
      amount: 300,
      dueDate: '2026-11-20',
      installmentsCount: 3,
      installments: [
        { number: 1, amount: 100, dueDate: '2026-11-20', paid: false },
        { number: 2, amount: 100, dueDate: '2026-12-20', paid: false },
        { number: 3, amount: 100, dueDate: '2027-01-20', paid: false },
      ],
    });

    render(
      <LoansSection
        loans={[parcelado]}
        onNewLoan={noop}
        onEditLoan={noop}
        onOpenInstallments={noop}
        onSettleLoan={noop}
        onUndoSettlement={noop}
      />
    );

    const list = screen.getByText('Próximos vencimentos').parentElement as HTMLElement;
    const item = within(list).getAllByRole('listitem')[0];

    // A parcela de novembro é R$ 100 — não o saldo de R$ 300 do empréstimo.
    // `textContent` cru usa espaço não separável na moeda; normaliza antes.
    const text = (item.textContent ?? '').replace(/\u00a0/g, ' ');
    expect(text).toContain('R$ 100,00');
    expect(text).not.toContain('R$ 300,00');
  });
});
