import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { InitialBalanceModal } from './InitialBalanceModal';

describe('InitialBalanceModal', () => {
  it('fecha com Escape sem salvar', () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    render(<InitialBalanceModal open initialBalance={0} onSave={onSave} onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(onClose).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('salva o valor digitado', () => {
    const onSave = vi.fn();
    render(<InitialBalanceModal open initialBalance={0} onSave={onSave} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Valor'), { target: { value: '1.250,50' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar saldo inicial' }));

    expect(onSave).toHaveBeenCalledWith(1250.5);
  });

  it('campo vazio limpa o saldo inicial', () => {
    const onSave = vi.fn();
    render(<InitialBalanceModal open initialBalance={500} onSave={onSave} onClose={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Valor'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar saldo inicial' }));

    expect(onSave).toHaveBeenCalledWith(0);
  });
});
