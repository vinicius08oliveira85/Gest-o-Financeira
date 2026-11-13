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

  it('usa o valor da parcela informado e mostra o total com juros', () => {
    const onSave = vi.fn();
    render(<LoanModal open loan={null} onSave={onSave} onClose={() => {}} />);

    fillBasicFields();
    fireEvent.click(screen.getByRole('button', { name: 'Parcelado' }));
    fireEvent.change(screen.getByLabelText('Início'), { target: { value: '2026-11' } });
    fireEvent.change(screen.getByLabelText('Fim'), { target: { value: '2027-01' } });
    fireEvent.change(screen.getByLabelText('Valor da parcela'), { target: { value: '450' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar empréstimo' }));

    const saved = onSave.mock.calls[0][0];
    expect(saved.amount).toBe(1200);
    expect(saved.installments.map((i: { amount: number }) => i.amount)).toEqual([450, 450, 450]);
    // 3x 450 = 1350: os R$ 150 a mais são juros sobre os R$ 1.200 contratados.
    const preview = (screen.queryByText(/juros de/)?.textContent ?? '').replace(/\u00a0/g, ' ');
    expect(preview).toContain('3x de R$ 450,00 = R$ 1.350,00');
    expect(preview).toContain('juros de R$ 150,00');
  });

  it('preserva a quitação ao editar um empréstimo quitado', () => {
    const onSave = vi.fn();
    const settlement = {
      amount: 600,
      date: '2026-11-12',
      entryId: 'e2',
      cancelledNumbers: [2, 3],
    };
    const quitado = {
      id: 'q',
      name: 'Quitado',
      amount: 1000,
      sourceType: 'pessoa_fisica' as const,
      dueDate: '2026-11-10',
      paid: true,
      createdAt: 1,
      installmentsCount: 3,
      discountStart: '2026-11',
      discountEnd: '2027-01',
      installments: [
        { number: 1, amount: 350, dueDate: '2026-11-10', paid: true, entryId: 'e1' },
        { number: 2, amount: 350, dueDate: '2026-12-10', paid: false, cancelled: true },
        { number: 3, amount: 350, dueDate: '2027-01-10', paid: false, cancelled: true },
      ],
      settlement,
    };

    render(<LoanModal open loan={quitado} onSave={onSave} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar empréstimo' }));

    const saved = onSave.mock.calls[0][0];
    expect(saved.settlement).toEqual(settlement);
    expect(saved.paid).toBe(true);
  });

  it('não perde as parcelas pagas ao encurtar o período', () => {
    const onSave = vi.fn();
    const comPagas = {
      id: 'p',
      name: 'Carro',
      amount: 1200,
      sourceType: 'pessoa_fisica' as const,
      dueDate: '2026-11-10',
      paid: false,
      createdAt: 1,
      installmentsCount: 6,
      discountStart: '2026-11',
      discountEnd: '2027-04',
      installments: [
        { number: 1, amount: 200, dueDate: '2026-11-10', paid: true, entryId: 'e1' },
        { number: 2, amount: 200, dueDate: '2026-12-10', paid: true, entryId: 'e2' },
        { number: 3, amount: 200, dueDate: '2027-01-10', paid: false },
        { number: 4, amount: 200, dueDate: '2027-02-10', paid: true, entryId: 'e4' },
        { number: 5, amount: 200, dueDate: '2027-03-10', paid: false },
        { number: 6, amount: 200, dueDate: '2027-04-10', paid: false },
      ],
    };

    render(<LoanModal open loan={comPagas} onSave={onSave} onClose={() => {}} />);
    // Encurta de abr/2027 para jan/2027: 3 meses, mas a parcela 4 já foi paga.
    fireEvent.change(screen.getByLabelText('Fim'), { target: { value: '2027-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar empréstimo' }));

    const saved = onSave.mock.calls[0][0];
    expect(saved.installments.map((i: { number: number }) => i.number)).toEqual([1, 2, 3, 4]);
    expect(saved.installments[3]).toMatchObject({ number: 4, paid: true, entryId: 'e4' });
  });

  it('mostra o período real quando parcelas pagas passam do fim registrado', () => {
    // Fim registrado em jan/2027, mas a parcela de abr/2027 já foi paga.
    const comPagas = {
      id: 'p',
      name: 'Carro',
      amount: 1200,
      sourceType: 'pessoa_fisica' as const,
      dueDate: '2026-11-10',
      paid: false,
      createdAt: 1,
      installmentsCount: 4,
      discountStart: '2026-11',
      discountEnd: '2027-01',
      installments: [
        { number: 1, amount: 300, dueDate: '2026-11-10', paid: true, entryId: 'e1' },
        { number: 2, amount: 300, dueDate: '2026-12-10', paid: true, entryId: 'e2' },
        { number: 3, amount: 300, dueDate: '2027-01-10', paid: false },
        { number: 4, amount: 300, dueDate: '2027-04-10', paid: true, entryId: 'e4' },
      ],
    };

    render(<LoanModal open loan={comPagas} onSave={vi.fn()} onClose={() => {}} />);

    // O campo continua com o período salvo; o aviso diz até onde as pagas vão.
    expect((screen.getByLabelText('Fim') as HTMLInputElement).value).toBe('2027-01');
    const aviso = (screen.getByText(/continuam no empréstimo/).textContent ?? '').replace(
      /\u00a0/g,
      ' '
    );
    expect(aviso).toContain('Desconto até abr/2027');
    expect(aviso).toContain('3 parcelas já pagas');
  });

  it('mantém os valores ajustados de cada parcela ao salvar o empréstimo', () => {
    const onSave = vi.fn();
    const comAjustes = {
      id: 'a',
      name: 'Carro',
      amount: 1000,
      sourceType: 'pessoa_fisica' as const,
      dueDate: '2026-11-10',
      paid: false,
      createdAt: 1,
      installmentsCount: 3,
      discountStart: '2026-11',
      discountEnd: '2027-01',
      installments: [
        { number: 1, amount: 300, dueDate: '2026-11-10', paid: false },
        { number: 2, amount: 350, dueDate: '2026-12-10', paid: false },
        { number: 3, amount: 280, dueDate: '2027-01-10', paid: false },
      ],
    };

    render(<LoanModal open loan={comAjustes} onSave={onSave} onClose={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Salvar empréstimo' }));

    const saved = onSave.mock.calls[0][0];
    expect(saved.installments.map((i: { amount: number }) => i.amount)).toEqual([300, 350, 280]);
  });

  it('iguala todas as parcelas quando o valor da parcela é digitado', () => {
    const onSave = vi.fn();
    const comAjustes = {
      id: 'a',
      name: 'Carro',
      amount: 1000,
      sourceType: 'pessoa_fisica' as const,
      dueDate: '2026-11-10',
      paid: false,
      createdAt: 1,
      installmentsCount: 3,
      discountStart: '2026-11',
      discountEnd: '2027-01',
      installments: [
        { number: 1, amount: 300, dueDate: '2026-11-10', paid: false },
        { number: 2, amount: 350, dueDate: '2026-12-10', paid: false },
        { number: 3, amount: 280, dueDate: '2027-01-10', paid: false },
      ],
    };

    render(<LoanModal open loan={comAjustes} onSave={onSave} onClose={() => {}} />);
    fireEvent.change(screen.getByLabelText('Valor da parcela'), { target: { value: '400' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar empréstimo' }));

    const saved = onSave.mock.calls[0][0];
    expect(saved.installments.map((i: { amount: number }) => i.amount)).toEqual([400, 400, 400]);
  });

  it('recusa valor de parcela inválido no parcelado', () => {
    const onSave = vi.fn();
    render(<LoanModal open loan={null} onSave={onSave} onClose={() => {}} />);

    fillBasicFields();
    fireEvent.click(screen.getByRole('button', { name: 'Parcelado' }));
    fireEvent.change(screen.getByLabelText('Início'), { target: { value: '2026-11' } });
    fireEvent.change(screen.getByLabelText('Fim'), { target: { value: '2027-01' } });
    fireEvent.change(screen.getByLabelText('Valor da parcela'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar empréstimo' }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('Informe um valor válido')).toBeInTheDocument();
  });

  it('abre o valor da parcela preenchido quando o empréstimo já tem juros', () => {
    const comJuros = {
      id: 'p',
      name: 'Carro',
      amount: 1000,
      sourceType: 'pessoa_fisica' as const,
      dueDate: '2026-11-10',
      paid: false,
      createdAt: 1,
      installmentsCount: 3,
      discountStart: '2026-11',
      discountEnd: '2027-01',
      installments: [
        { number: 1, amount: 450, dueDate: '2026-11-10', paid: false },
        { number: 2, amount: 450, dueDate: '2026-12-10', paid: false },
        { number: 3, amount: 450, dueDate: '2027-01-10', paid: false },
      ],
    };

    render(<LoanModal open loan={comJuros} onSave={() => {}} onClose={() => {}} />);

    expect(screen.getByLabelText('Valor da parcela')).toHaveValue('450,00');
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
