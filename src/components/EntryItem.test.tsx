import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EntryItem } from './EntryItem';
import type { Entry } from '../types';

function entry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: 'e1',
    name: 'Compras da semana',
    amount: 120,
    dueDate: '2026-11-10',
    isPaid: false,
    type: 'debt',
    createdAt: 1,
    category: 'Mercado',
    ...overrides,
  };
}

const baseProps = {
  onTogglePaid: () => {},
  onEdit: () => {},
  onDeleteRequest: () => {},
};

describe('EntryItem — chip de categoria', () => {
  it('mostra o chip com ícone e aplica o filtro ao clicar', () => {
    const onSelectCategory = vi.fn();
    render(
      <EntryItem
        entry={entry()}
        {...baseProps}
        selectedCategory="all"
        onSelectCategory={onSelectCategory}
      />
    );

    const chip = screen.getByRole('button', { name: 'Mercado' });
    expect(chip).toHaveAttribute('aria-pressed', 'false');
    expect(chip).toHaveClass('neu-chip');
    expect(chip.querySelector('svg')).not.toBeNull();
    expect(chip).toHaveAttribute('title', 'Filtrar por Mercado');

    fireEvent.click(chip);

    expect(onSelectCategory).toHaveBeenCalledWith('Mercado');
  });

  it('destaca a categoria filtrada e limpa o filtro no segundo clique', () => {
    const onSelectCategory = vi.fn();
    render(
      <EntryItem
        entry={entry()}
        {...baseProps}
        selectedCategory="Mercado"
        onSelectCategory={onSelectCategory}
      />
    );

    const chip = screen.getByRole('button', { name: 'Mercado' });
    expect(chip).toHaveAttribute('aria-pressed', 'true');
    expect(chip).toHaveClass('neu-chip-active');
    expect(chip).toHaveAttribute('title', 'Remover filtro de categoria');

    fireEvent.click(chip);

    expect(onSelectCategory).toHaveBeenCalledWith('all');
  });

  it('usa o ícone Filled só quando a categoria está ativa', () => {
    const { rerender } = render(
      <EntryItem
        entry={entry()}
        {...baseProps}
        selectedCategory="all"
        onSelectCategory={() => {}}
      />
    );
    const inativo = screen.getByRole('button', { name: 'Mercado' }).querySelector('svg')!.innerHTML;

    rerender(
      <EntryItem
        entry={entry()}
        {...baseProps}
        selectedCategory="Mercado"
        onSelectCategory={() => {}}
      />
    );
    const ativo = screen.getByRole('button', { name: 'Mercado' }).querySelector('svg')!.innerHTML;

    // Variantes diferentes do Fluent: Regular (contorno) x Filled (preenchida).
    expect(ativo).not.toBe(inativo);
  });

  it('sem ação de filtro, o chip é apenas informativo', () => {
    render(<EntryItem entry={entry()} {...baseProps} />);

    expect(screen.queryByRole('button', { name: 'Mercado' })).toBeNull();
    expect(screen.getByText('Mercado')).toBeTruthy();
  });
});
