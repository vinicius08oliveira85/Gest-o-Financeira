import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

describe('ConfirmDeleteModal', () => {
  it('clicar em Cancelar chama onClose', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    render(<ConfirmDeleteModal open message="Excluir?" onConfirm={onConfirm} onClose={onClose} />);

    const cancelButton = screen.getByRole('button', { name: /cancelar/i });
    fireEvent.click(cancelButton);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('clicar em Excluir chama onConfirm e onClose', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    render(
      <ConfirmDeleteModal
        open
        message="Excluir?"
        confirmLabel="Excluir"
        onConfirm={onConfirm}
        onClose={onClose}
      />
    );

    const confirmButton = screen.getByRole('button', { name: /excluir/i });
    fireEvent.click(confirmButton);

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
