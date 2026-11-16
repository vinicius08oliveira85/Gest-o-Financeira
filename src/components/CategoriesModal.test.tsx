import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CategoriesModal } from './CategoriesModal';

function setup(overrides: Partial<Parameters<typeof CategoriesModal>[0]> = {}) {
  const props = {
    open: true,
    categories: ['Mercado', 'Saúde'],
    usage: { Mercado: 3, Saúde: 0 },
    onAdd: vi.fn(() => null),
    onRename: vi.fn(() => null),
    onDelete: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
  render(<CategoriesModal {...props} />);
  return props;
}

describe('CategoriesModal', () => {
  it('lista categorias com a contagem de uso', () => {
    setup();
    expect(screen.getByText('Mercado')).toBeInTheDocument();
    expect(screen.getByText('3 lançamentos')).toBeInTheDocument();
    expect(screen.getByText('sem uso')).toBeInTheDocument();
  });

  it('adiciona uma categoria nova e limpa o campo', () => {
    const props = setup();
    const input = screen.getByLabelText('Nova categoria');
    fireEvent.change(input, { target: { value: ' Transporte ' } });
    fireEvent.click(screen.getByRole('button', { name: /adicionar/i }));

    expect(props.onAdd).toHaveBeenCalledWith(' Transporte ');
    expect(input).toHaveValue('');
  });

  it('mostra o erro devolvido ao tentar duplicar', () => {
    setup({ onAdd: vi.fn(() => 'duplicate' as const) });
    fireEvent.change(screen.getByLabelText('Nova categoria'), { target: { value: 'mercado' } });
    fireEvent.click(screen.getByRole('button', { name: /adicionar/i }));

    expect(screen.getByText('Já existe uma categoria com esse nome.')).toBeInTheDocument();
  });

  it('renomeia pelo botão de editar', () => {
    const props = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Renomear Mercado' }));
    const input = screen.getByLabelText('Novo nome para Mercado');
    fireEvent.change(input, { target: { value: 'Feira' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar novo nome' }));

    expect(props.onRename).toHaveBeenCalledWith('Mercado', 'Feira');
  });

  it('confirma a exclusão avisando quantos registros usam a categoria', () => {
    const props = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Excluir Mercado' }));

    const confirm = screen.getByRole('button', { name: 'Remover de 3' });
    fireEvent.click(confirm);

    expect(props.onDelete).toHaveBeenCalledWith('Mercado');
  });

  it('cancela a exclusão sem chamar onDelete', () => {
    const props = setup();
    fireEvent.click(screen.getByRole('button', { name: 'Excluir Mercado' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar exclusão' }));

    expect(props.onDelete).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Renomear Mercado' })).toBeInTheDocument();
  });
});
