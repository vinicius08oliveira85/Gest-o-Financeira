import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LoanInstallmentsModal } from './LoanInstallmentsModal';
import type { Loan } from '../types';

const loan: Loan = {
  id: 'p',
  name: 'Carro',
  amount: 900,
  sourceType: 'pessoa_fisica',
  dueDate: '2026-11-10',
  paid: false,
  createdAt: 1,
  installmentsCount: 3,
  discountStart: '2026-11',
  discountEnd: '2027-01',
  installments: [
    { number: 1, amount: 300, dueDate: '2026-11-10', paid: true, paidDate: '2026-11-10' },
    { number: 2, amount: 300, dueDate: '2026-12-10', paid: false },
    { number: 3, amount: 350, dueDate: '2027-01-10', paid: false },
  ],
};

const noop = () => {};

function renderModal(onChangeAmount = vi.fn()) {
  render(
    <LoanInstallmentsModal
      open
      loan={loan}
      onTogglePaid={noop}
      onChangeDueDate={noop}
      onToggleCancelled={noop}
      onChangeAmount={onChangeAmount}
      onSettleLoan={noop}
      onClose={noop}
    />
  );
  return onChangeAmount;
}

describe('LoanInstallmentsModal', () => {
  it('mostra o total com juros e a diferença sobre o valor contratado', () => {
    renderModal();

    // Parcelas somam 950 (300 + 300 + 350) sobre R$ 900 contratados: 50 de juros.
    const text = (screen.getByText(/Total com juros/).textContent ?? '').replace(/\u00a0/g, ' ');
    expect(text).toContain('R$ 950,00');
    expect(text).toContain('juros de R$ 50,00');
  });

  it('edita o valor de uma parcela', () => {
    const onChangeAmount = renderModal();

    fireEvent.click(screen.getByLabelText('Editar valor da parcela 2'));
    fireEvent.change(screen.getByLabelText('Valor da parcela 2'), { target: { value: '420' } });
    fireEvent.click(screen.getByLabelText('Salvar valor da parcela 2'));

    expect(onChangeAmount).toHaveBeenCalledWith(loan, 2, 420);
  });

  it('descarta a edição no cancelar, sem alterar o valor', () => {
    const onChangeAmount = renderModal();

    fireEvent.click(screen.getByLabelText('Editar valor da parcela 2'));
    fireEvent.change(screen.getByLabelText('Valor da parcela 2'), { target: { value: '420' } });
    fireEvent.click(screen.getByLabelText('Cancelar edição do valor da parcela 2'));

    expect(onChangeAmount).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Valor da parcela 2')).toBeNull();
  });
});
