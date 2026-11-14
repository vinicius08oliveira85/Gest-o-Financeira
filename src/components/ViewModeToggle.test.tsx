import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ViewModeToggle } from './ViewModeToggle';

describe('ViewModeToggle', () => {
  it('marca a visão ativa e troca para a outra ao clicar', () => {
    const onChange = vi.fn();
    render(<ViewModeToggle viewMode="list" onChange={onChange} />);

    const lista = screen.getByRole('button', { name: 'Lista' });
    const calendario = screen.getByRole('button', { name: 'Calendário' });

    expect(lista).toHaveAttribute('aria-pressed', 'true');
    expect(lista).toHaveClass('neu-filter-active');
    expect(calendario).toHaveAttribute('aria-pressed', 'false');
    expect(calendario).not.toHaveClass('neu-filter-active');

    fireEvent.click(calendario);

    expect(onChange).toHaveBeenCalledWith('calendar');
  });

  it('com o calendário ativo, o destaque fica nele', () => {
    render(<ViewModeToggle viewMode="calendar" onChange={() => {}} />);

    expect(screen.getByRole('button', { name: 'Calendário' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: 'Lista' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('troca o glifo para Filled quando a visão fica ativa', () => {
    const { rerender } = render(<ViewModeToggle viewMode="list" onChange={() => {}} />);
    const listaAtiva = screen
      .getByRole('button', { name: 'Lista' })
      .querySelector('svg')!.innerHTML;

    rerender(<ViewModeToggle viewMode="calendar" onChange={() => {}} />);

    // Mesmo ícone (Lista) em duas variantes: Filled x Regular.
    const listaInativa = screen
      .getByRole('button', { name: 'Lista' })
      .querySelector('svg')!.innerHTML;
    expect(listaInativa).not.toBe(listaAtiva);

    const calendarioAtivo = screen
      .getByRole('button', { name: 'Calendário' })
      .querySelector('svg')!.innerHTML;
    rerender(<ViewModeToggle viewMode="list" onChange={() => {}} />);
    const calendarioInativo = screen
      .getByRole('button', { name: 'Calendário' })
      .querySelector('svg')!.innerHTML;
    expect(calendarioInativo).not.toBe(calendarioAtivo);
  });

  it('cada botão tem um ícone e o rótulo acessível', () => {
    render(<ViewModeToggle viewMode="list" onChange={() => {}} />);

    for (const nome of ['Lista', 'Calendário']) {
      const botao = screen.getByRole('button', { name: nome });
      expect(botao.querySelector('svg')).not.toBeNull();
    }
  });
});
