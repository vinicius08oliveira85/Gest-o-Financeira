import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NeuSelect } from './NeuSelect';

const options = [
  { value: 'dueDate', label: 'Data' },
  { value: 'amount', label: 'Valor' },
  { value: 'name', label: 'Nome' },
];

describe('NeuSelect', () => {
  it('ArrowDown no botão abre a lista', () => {
    render(
      <NeuSelect value="dueDate" onChange={() => {}} options={options} aria-label="Ordenar por" />
    );

    const trigger = screen.getByRole('button', { name: /ordenar por/i });
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });

    expect(screen.getByRole('listbox')).toBeTruthy();
  });

  it('clicar numa opção seleciona e fecha a lista', () => {
    const onChange = vi.fn();
    render(
      <NeuSelect value="dueDate" onChange={onChange} options={options} aria-label="Ordenar por" />
    );

    const trigger = screen.getByRole('button', { name: /ordenar por/i });
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });

    fireEvent.click(screen.getByRole('button', { name: 'Valor' }));

    expect(onChange).toHaveBeenCalledWith('amount');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('Escape fecha a lista sem selecionar', () => {
    const onChange = vi.fn();
    render(
      <NeuSelect value="dueDate" onChange={onChange} options={options} aria-label="Ordenar por" />
    );

    const trigger = screen.getByRole('button', { name: /ordenar por/i });
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    expect(screen.getByRole('listbox')).toBeTruthy();

    fireEvent.keyDown(trigger, { key: 'Escape' });

    expect(screen.queryByRole('listbox')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });
});
