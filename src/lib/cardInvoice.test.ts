import { describe, it, expect } from 'vitest';
import {
  getInvoiceClosingDate,
  getInvoiceDueDate,
  buildInvoiceEntry,
  buildInstallmentCardExpenses,
  findInvoiceEntriesForCard,
  findInvoiceEntryForCycle,
  planInvoiceSync,
  preserveInvoiceState,
} from './cardInvoice';
import type { CardExpense, CreditCard, Entry } from '../types';

const card: CreditCard = {
  id: 'c1',
  name: 'Visa',
  limitAmount: 5000,
  closingDay: 25,
  dueDay: 5,
};

describe('getInvoiceClosingDate', () => {
  it('retorna o dia de fechamento no mês de cobrança', () => {
    expect(getInvoiceClosingDate(2, 2025, 25)).toBe('2025-03-25');
  });

  it('ajusta quando o dia não existe no mês', () => {
    expect(getInvoiceClosingDate(1, 2025, 31)).toBe('2025-02-28');
  });
});

describe('getInvoiceDueDate', () => {
  it('vence no mês seguinte ao ciclo', () => {
    expect(getInvoiceDueDate(2, 2025, 5)).toBe('2025-04-05');
  });
});

describe('findInvoiceEntryForCycle', () => {
  const invoiceEntry = (overrides: Partial<Entry> = {}): Entry => ({
    id: 'inv-1',
    name: 'Fatura Visa',
    amount: 100,
    dueDate: '2025-03-25',
    isPaid: false,
    type: 'debt',
    createdAt: 1,
    cardId: 'c1',
    isCardInvoice: true,
    ...overrides,
  });

  // Ciclo março/2025 (billingMonth 2): fecha 25/03, vence 05/04.
  it('encontra pela data de fechamento (dueDate = closing)', () => {
    const e = invoiceEntry({ invoicePaymentDueDate: '2025-04-05' });
    expect(findInvoiceEntryForCycle([e], 'c1', 2, 2025, 25, 5)?.id).toBe('inv-1');
  });

  it('encontra pela data de vencimento (invoicePaymentDueDate = due)', () => {
    const e = invoiceEntry({ dueDate: '2025-03-20', invoicePaymentDueDate: '2025-04-05' });
    expect(findInvoiceEntryForCycle([e], 'c1', 2, 2025, 25, 5)?.id).toBe('inv-1');
  });

  it('encontra faturas legadas (sem invoicePaymentDueDate, dueDate = vencimento)', () => {
    const e = invoiceEntry({ dueDate: '2025-04-05', invoicePaymentDueDate: undefined });
    expect(findInvoiceEntryForCycle([e], 'c1', 2, 2025, 25, 5)?.id).toBe('inv-1');
  });

  it('não encontra quando não há fatura do ciclo', () => {
    expect(findInvoiceEntryForCycle([], 'c1', 2, 2025, 25, 5)).toBeUndefined();
  });

  it('ignora faturas de outro cartão', () => {
    const e = invoiceEntry({ cardId: 'c2' });
    expect(findInvoiceEntryForCycle([e], 'c1', 2, 2025, 25, 5)).toBeUndefined();
  });

  it('não casa com fatura de outro ciclo (meses diferentes)', () => {
    const e = invoiceEntry({ dueDate: '2025-04-25', invoicePaymentDueDate: '2025-05-05' });
    expect(findInvoiceEntryForCycle([e], 'c1', 2, 2025, 25, 5)).toBeUndefined();
  });
});

describe('buildInvoiceEntry', () => {
  it('lança a fatura na data de vencimento', () => {
    const e = buildInvoiceEntry(card, 2, 2025, 1200);
    expect(e.dueDate).toBe('2025-04-05');
    expect(e.invoicePaymentDueDate).toBe('2025-04-05');
    expect(e.amount).toBe(1200);
    expect(e.isCardInvoice).toBe(true);
    expect(e.type).toBe('debt');
  });

  it('não confunde ciclos consecutivos (cada um vence no mês seguinte)', () => {
    const nov = buildInvoiceEntry(card, 10, 2026, 350);
    const dez = buildInvoiceEntry(card, 11, 2026, 200);

    expect(nov.dueDate).toBe('2026-12-05');
    expect(dez.dueDate).toBe('2027-01-05');
    expect(findInvoiceEntryForCycle([nov, dez], 'c1', 10, 2026, 25, 5)?.id).toBe(nov.id);
    expect(findInvoiceEntryForCycle([nov, dez], 'c1', 11, 2026, 25, 5)?.id).toBe(dez.id);
  });
});

describe('buildInstallmentCardExpenses', () => {
  const base = {
    cardId: 'c1',
    name: 'Notebook',
    totalAmount: 3000,
    date: '2026-01-15',
    closingDay: 25,
    count: 3,
    category: 'Tecnologia',
    tag: 'cartao',
    parentId: 'p1',
  };

  it('gera N parcelas com valores iguais, datas mensais e numeração', () => {
    const rows = buildInstallmentCardExpenses(base);
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.amount)).toEqual([1000, 1000, 1000]);
    expect(rows.map((r) => r.date)).toEqual(['2026-01-15', '2026-02-15', '2026-03-15']);
    expect(rows.map((r) => r.installmentNumber)).toEqual([1, 2, 3]);
    expect(rows.every((r) => r.installmentsCount === 3)).toBe(true);
    expect(rows.every((r) => r.parentInstallmentId === 'p1')).toBe(true);
  });

  it('divide o total em centavos exatos (soma das parcelas = total)', () => {
    const rows = buildInstallmentCardExpenses({ ...base, totalAmount: 100, count: 3 });
    expect(rows.map((r) => r.amount)).toEqual([33.34, 33.33, 33.33]);
    const sumCents = rows.reduce((sum, r) => sum + Math.round(r.amount * 100), 0);
    expect(sumCents).toBe(10000);
  });

  it('não "vaza" o dia 31 para meses curtos', () => {
    const rows = buildInstallmentCardExpenses({ ...base, date: '2026-01-31', count: 3 });
    expect(rows.map((r) => r.date)).toEqual(['2026-01-31', '2026-02-28', '2026-03-31']);
  });

  it('respeita ano bissexto (fevereiro/2024 tem 29 dias)', () => {
    const rows = buildInstallmentCardExpenses({ ...base, date: '2024-01-31', count: 2 });
    expect(rows.map((r) => r.date)).toEqual(['2024-01-31', '2024-02-29']);
  });

  it('faz a virada de ano em dezembro', () => {
    const rows = buildInstallmentCardExpenses({ ...base, date: '2026-12-10', count: 3 });
    expect(rows.map((r) => r.date)).toEqual(['2026-12-10', '2027-01-10', '2027-02-10']);
  });

  it('aloca cada parcela na fatura correta (compra após o fechamento vai para o mês seguinte)', () => {
    const rows = buildInstallmentCardExpenses({
      ...base,
      date: '2026-01-30',
      closingDay: 25,
      count: 2,
    });
    expect(rows[0].billingMonth).toBe(1); // fevereiro (0-indexado)
    expect(rows[0].billingYear).toBe(2026);
    expect(rows[1].billingMonth).toBe(2); // março
    expect(rows[1].billingYear).toBe(2026);
  });

  it('parcela única não marca installmentsCount/installmentNumber', () => {
    const rows = buildInstallmentCardExpenses({ ...base, count: 1, parentId: undefined });
    expect(rows).toHaveLength(1);
    expect(rows[0].amount).toBe(3000);
    expect(rows[0].installmentsCount).toBeUndefined();
    expect(rows[0].installmentNumber).toBeUndefined();
    expect(rows[0].parentInstallmentId).toBeUndefined();
  });
});

describe('preserveInvoiceState', () => {
  const existing: Entry = {
    id: 'inv-1',
    name: 'Fatura Visa — março de 2025',
    amount: 500,
    dueDate: '2025-04-05',
    invoicePaymentDueDate: '2025-04-05',
    isPaid: true,
    paidDate: '2025-04-03',
    type: 'debt',
    createdAt: 111,
    cardId: 'c1',
    isCardInvoice: true,
  };

  it('mantém pagamento e data de criação ao regravar a fatura com novo total', () => {
    const next = buildInvoiceEntry(card, 2, 2025, 900, existing.id);
    const merged = preserveInvoiceState(next, existing);

    expect(merged.id).toBe('inv-1');
    expect(merged.amount).toBe(900);
    expect(merged.isPaid).toBe(true);
    expect(merged.paidDate).toBe('2025-04-03');
    expect(merged.createdAt).toBe(111);
  });

  it('sem fatura anterior, devolve a nova pendente', () => {
    const next = buildInvoiceEntry(card, 2, 2025, 900);
    const merged = preserveInvoiceState(next, undefined);

    expect(merged.isPaid).toBe(false);
    expect(merged.paidDate).toBeUndefined();
    expect(merged.createdAt).toBe(next.createdAt);
  });
});

describe('planInvoiceSync', () => {
  const invoiceCard: CreditCard = {
    id: 'c1',
    name: 'Visa',
    limitAmount: 5000,
    closingDay: 25,
    dueDay: 5,
  };

  const expense = (amount: number, overrides: Partial<CardExpense> = {}): CardExpense => ({
    id: `x${amount}`,
    cardId: 'c1',
    name: 'Mercado',
    amount,
    date: '2026-11-10',
    billingMonth: 10,
    billingYear: 2026,
    createdAt: 1,
    ...overrides,
  });

  // Fatura do ciclo nov/2026: vence 05/12/2026.
  const invoice = (overrides: Partial<Entry> = {}): Entry => ({
    ...buildInvoiceEntry(invoiceCard, 10, 2026, 600),
    ...overrides,
  });

  it('atualiza o valor da fatura quando o gasto é editado', () => {
    const inv = invoice();
    const actions = planInvoiceSync([inv], [expense(500)], [expense(600)]);

    expect(actions).toEqual([{ type: 'update', entry: inv, amount: 500 }]);
  });

  it('mantém o pagamento e a data de criação ao atualizar uma fatura paga', () => {
    const inv = invoice({ isPaid: true, paidDate: '2026-12-01' });
    const actions = planInvoiceSync([inv], [expense(500)], [expense(600)]);

    expect(actions[0]).toMatchObject({ type: 'update', amount: 500 });
    expect(actions[0].entry.isPaid).toBe(true);
    expect(actions[0].entry.paidDate).toBe('2026-12-01');
  });

  it('acompanha a exclusão de uma parcela do gasto parcelado', () => {
    const inv = invoice();
    const actions = planInvoiceSync([inv], [expense(400)], [expense(600)]);

    expect(actions).toEqual([{ type: 'update', entry: inv, amount: 400 }]);
  });

  it('remove a fatura em aberto quando o ciclo fica sem gastos', () => {
    const inv = invoice();
    expect(planInvoiceSync([inv], [], [expense(600)])).toEqual([{ type: 'delete', entry: inv }]);
  });

  it('mantém a fatura paga como histórico quando o ciclo zera', () => {
    const inv = invoice({ isPaid: true, paidDate: '2026-12-01' });
    expect(planInvoiceSync([inv], [], [expense(600)])).toEqual([]);
  });

  it('não escreve nada quando a soma continua igual', () => {
    const inv = invoice();
    expect(planInvoiceSync([inv], [expense(600)], [expense(600)])).toEqual([]);
  });

  it('não apaga a fatura quando os gastos ainda não carregaram', () => {
    // Lista vazia dos dois lados = nada observado, não "ciclo zerado".
    expect(planInvoiceSync([invoice()], [], [])).toEqual([]);
  });

  it('ignora gastos de outro cartão ou de outro ciclo', () => {
    const inv = invoice();
    expect(
      planInvoiceSync(
        [inv],
        [expense(600, { cardId: 'c2' }), expense(600, { billingMonth: 9 })],
        []
      )
    ).toEqual([]);
  });

  it('não mexe em ciclo que nunca teve fatura registrada', () => {
    expect(planInvoiceSync([], [expense(600)], [expense(400)])).toEqual([]);
  });
});

describe('findInvoiceEntriesForCard', () => {
  const invoiceOf = (cardId: string, month: number, overrides: Partial<Entry> = {}): Entry => ({
    ...buildInvoiceEntry({ ...card, id: cardId }, month, 2026, 600),
    ...overrides,
  });

  it('devolve as faturas do cartão em todos os ciclos, pagas ou em aberto', () => {
    const open = invoiceOf('c1', 10);
    const paid = invoiceOf('c1', 9, { isPaid: true, paidDate: '2026-10-05' });

    expect(findInvoiceEntriesForCard([open, paid], 'c1')).toEqual([open, paid]);
  });

  it('ignora faturas de outro cartão e lançamentos comuns do mesmo cartão', () => {
    const mine = invoiceOf('c1', 10);
    const otherCard = invoiceOf('c2', 10);
    const commonEntry: Entry = {
      id: 'e1',
      name: 'Aluguel',
      amount: 100,
      dueDate: '2026-11-05',
      isPaid: false,
      type: 'debt',
      createdAt: 1,
      cardId: 'c1',
    };

    expect(findInvoiceEntriesForCard([mine, otherCard, commonEntry], 'c1')).toEqual([mine]);
  });

  it('sem faturas registradas, devolve lista vazia', () => {
    expect(findInvoiceEntriesForCard([], 'c1')).toEqual([]);
  });
});
