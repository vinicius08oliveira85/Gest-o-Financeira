import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LoanModal } from './LoanModal';

function fillBasicFields() {
  fireEvent.change(screen.getByLabelText('Descrição'), {
    target: { value: 'Empréstimo do carro' },
  });
  fireEvent.change(screen.getByLabelText('Valor (R$)'), { target: { value: '1200' } });
}

describe('LoanModal', () => {
  it('não inventa período de desconto no pagamento à vista', () => {
    const onSave = vi.fn();
    render(<LoanModal open loan={null} onSave={onSave} onClose={() => {}} />);

    fillBasicFields();
    fireEvent.click(screen.getByRole('button', { name: 'Salvar empréstimo' }));

    expect(onSave).toHaveBeenCalledTimes(1);
    const saved = onSave.mock.calls[0][0];
    // Antes o formulário gravava um período de 12 meses que o usuário não escolheu.
    expect(saved.discountStart).toBeUndefined();
    expect(saved.discountEnd).toBeUndefined();
    expect(saved.installments).toBeUndefined();
    expect(saved.installmentsCount).toBeUndefined();
  });

  it('no parcelado gera uma parcela por mês do período de desconto', () => {
    const onSave = vi.fn();
    render(<LoanModal open loan={null} onSave={onSave} onClose={() => {}} />);

    fillBasicFields();
    fireEvent.click(screen.getByRole('button', { name: 'Parcelado' }));
    fireEvent.change(screen.getByLabelText('Início'), { target: { value: '2026-11' } });
    fireEvent.change(screen.getByLabelText('Fim'), { target: { value: '2027-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar empréstimo' }));

    const saved = onSave.mock.calls[0][0];
    expect(saved.installmentsCount).toBe(3);
    expect(saved.installments).toHaveLength(3);
    expect(
      saved.installments.reduce((sum: number, i: { amount: number }) => sum + i.amount, 0)
    ).toBe(1200);
    expect(saved.discountStart).toBe('2026-11');
    expect(saved.discountEnd).toBe('2027-01');
  });

  it('recusa fim anterior ao início no pagamento à vista', () => {
    const onSave = vi.fn();
    render(<LoanModal open loan={null} onSave={onSave} onClose={() => {}} />);

    fillBasicFields();
    fireEvent.change(screen.getByLabelText('Início'), { target: { value: '2026-12' } });
    fireEvent.change(screen.getByLabelText('Fim'), { target: { value: '2026-11' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar empréstimo' }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('O fim precisa ser depois do início')).toBeInTheDocument();
  });
});
