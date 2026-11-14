import { describe, it, expect } from 'vitest';
import {
  addMonthsISO,
  buildInstallments,
  buildInstallmentsForPeriod,
  dateInMonth,
  detachEntryFromLoan,
  formatDiscountPeriod,
  getDiscountPeriod,
  getEndingDiscounts,
  getInstallmentsToCancel,
  getLoanItemsForMonth,
  getLoanInterest,
  getLoanMonthImpactPosted,
  getLoanMonthPaidInterest,
  getLoanMonthPendingAmount,
  getLoanPostedAmount,
  getLoanMonthTotal,
  getLoanMonthlyImpact,
  getLoanPaidAmount,
  getLoanPaidInterest,
  getLoanPayableAmount,
  getLoanTotals,
  getMonthlyInstallments,
  getNextDueDate,
  getNextOpenItem,
  getOpenAmount,
  isInstallmentLoan,
  monthsBetweenMonths,
  updateInstallmentAmount,
} from './loans';
import type { Entry, Loan, LoanInstallment } from '../types';
import { LOANS_CATEGORY } from '../constants';

describe('getNextOpenItem', () => {
  it('devolve a parcela mais próxima com o valor dela, não o saldo', () => {
    const parcelado = loan({
      id: 'p',
      amount: 300,
      installmentsCount: 3,
      installments: [
        { number: 1, amount: 100, dueDate: '2026-12-10', paid: true },
        { number: 2, amount: 100, dueDate: '2027-01-10', paid: false },
        { number: 3, amount: 100, dueDate: '2026-11-10', paid: false },
      ],
    });

    expect(getNextOpenItem(parcelado)).toEqual({ dueDate: '2026-11-10', amount: 100 });
  });

  it('ignora parcelas canceladas e quitações', () => {
    const cancelada = loan({
      id: 'c',
      amount: 200,
      installmentsCount: 2,
      installments: [
        { number: 1, amount: 100, dueDate: '2026-11-10', paid: false, cancelled: true },
        { number: 2, amount: 100, dueDate: '2026-12-10', paid: false },
      ],
    });
    expect(getNextOpenItem(cancelada)).toEqual({ dueDate: '2026-12-10', amount: 100 });

    const quitado = loan({
      id: 'q',
      settlement: { amount: 90, date: '2026-11-01', cancelledNumbers: [1] },
    });
    expect(getNextOpenItem(quitado)).toBeNull();
  });

  it('devolve o pagamento único quando não é parcelado', () => {
    const unico = loan({ id: 'u', amount: 500, dueDate: '2026-11-20' });
    expect(getNextOpenItem(unico)).toEqual({ dueDate: '2026-11-20', amount: 500 });
    expect(getNextOpenItem(loan({ id: 'pago', amount: 500, paid: true }))).toBeNull();
  });
});

function loan(overrides: Partial<Loan> & { id: string }): Loan {
  return {
    name: 'Empréstimo',
    amount: 1000,
    sourceType: 'pessoa_fisica',
    dueDate: '2026-11-10',
    paid: false,
    createdAt: 1,
    ...overrides,
  };
}

describe('addMonthsISO', () => {
  it('avança mês a mês mantendo o dia', () => {
    expect(addMonthsISO('2026-11-10', 2)).toBe('2027-01-10');
  });

  it('ajusta para o último dia do mês quando o dia não existe', () => {
    expect(addMonthsISO('2026-01-31', 1)).toBe('2026-02-28');
  });
});

describe('período do desconto', () => {
  it('conta os meses incluindo início e fim', () => {
    expect(monthsBetweenMonths('2026-11', '2027-01')).toBe(3);
    expect(monthsBetweenMonths('2026-11', '2027-11')).toBe(13);
    expect(monthsBetweenMonths('2027-01', '2026-12')).toBe(0);
  });

  it('ajusta o dia ao último dia do mês', () => {
    expect(dateInMonth('2026-02', 31)).toBe('2026-02-28');
    expect(dateInMonth('2026-11', 10)).toBe('2026-11-10');
  });

  it('gera uma parcela por mês do período de desconto', () => {
    const installments = buildInstallmentsForPeriod(1000, '2026-11', '2027-01', 10);

    expect(installments).toHaveLength(3);
    expect(installments.map((i) => i.dueDate)).toEqual(['2026-11-10', '2026-12-10', '2027-01-10']);
    expect(installments.reduce((sum, i) => sum + i.amount, 0)).toBeCloseTo(1000, 2);
  });

  it('preserva as parcelas pagas ao encurtar o período', () => {
    const previous: LoanInstallment[] = [
      { number: 1, amount: 100, dueDate: '2026-11-10', paid: true, entryId: 'e1' },
      { number: 2, amount: 100, dueDate: '2026-12-10', paid: true, entryId: 'e2' },
      { number: 3, amount: 100, dueDate: '2027-01-10', paid: false },
      { number: 4, amount: 100, dueDate: '2027-02-10', paid: false },
    ];

    // Encurtar de 4 para 2 meses para o empréstimo em 2 parcelas: as pagas ficam.
    const curto = buildInstallmentsForPeriod(400, '2026-11', '2026-12', 10, previous);
    expect(curto.map((i) => i.number)).toEqual([1, 2]);
    expect(curto.every((i) => i.paid)).toBe(true);

    // Mesmo pedindo um período menor que as parcelas pagas, elas não são apagadas.
    const todasPagas = previous.map((i) => ({ ...i, paid: true, entryId: `e${i.number}` }));
    const menorQuePagas = buildInstallmentsForPeriod(400, '2026-11', '2026-12', 10, todasPagas);
    expect(menorQuePagas.map((i) => i.number)).toEqual([1, 2, 3, 4]);
    expect(menorQuePagas.map((i) => i.entryId)).toEqual(['e1', 'e2', 'e3', 'e4']);
  });

  it('mantém uma parcela paga distante ao encurtar o período', () => {
    const previous = buildInstallments(600, 6, '2026-11-10').map((i) =>
      i.number === 6 ? { ...i, paid: true, entryId: 'e6' } : i
    );

    const curto = buildInstallmentsForPeriod(600, '2026-11', '2027-01', 10, previous);
    expect(curto).toHaveLength(6);
    expect(curto[5]).toMatchObject({ number: 6, paid: true, entryId: 'e6' });
    expect(curto.slice(0, 5).reduce((sum, i) => sum + i.amount, 0)).toBeCloseTo(500, 2);
  });

  it('mostra o período registrado e deduz o das parcelas antigas', () => {
    const withPeriod = loan({ id: 'p', discountStart: '2026-11', discountEnd: '2027-01' });
    expect(getDiscountPeriod(withPeriod)).toEqual({ start: '2026-11', end: '2027-01' });
    expect(formatDiscountPeriod(withPeriod)).toBe('nov/2026 até jan/2027');

    const legacy = loan({
      id: 'l',
      installmentsCount: 2,
      installments: buildInstallments(100, 2, '2026-12-05'),
    });
    expect(formatDiscountPeriod(legacy)).toBe('dez/2026 até jan/2027');

    expect(formatDiscountPeriod(loan({ id: 'n' }))).toBeNull();
    expect(formatDiscountPeriod(loan({ id: 's', discountStart: '2026-11' }))).toBe(
      'nov/2026 em diante'
    );
  });

  it('estende o período exibido até a última parcela paga', () => {
    // Período encurtado para jan/2027, mas a 4ª parcela (abr/2027) já foi paga.
    const encurtado = loan({
      id: 'e',
      discountStart: '2026-11',
      discountEnd: '2027-01',
      installmentsCount: 4,
      installments: [
        { number: 1, amount: 100, dueDate: '2026-11-10', paid: true },
        { number: 2, amount: 100, dueDate: '2026-12-10', paid: true },
        { number: 3, amount: 100, dueDate: '2027-01-10', paid: false },
        { number: 4, amount: 100, dueDate: '2027-04-10', paid: true },
      ],
    });

    expect(getDiscountPeriod(encurtado)).toEqual({ start: '2026-11', end: '2027-04' });
    expect(formatDiscountPeriod(encurtado)).toBe('nov/2026 até abr/2027');

    // Sem parcela além do fim registrado, o período não muda.
    const dentro = loan({ ...encurtado, installments: encurtado.installments!.slice(0, 3) });
    expect(getDiscountPeriod(dentro)).toEqual({ start: '2026-11', end: '2027-01' });
  });
});

describe('parcelas canceladas', () => {
  const base = loan({
    id: 'canc',
    amount: 900,
    installmentsCount: 3,
    installments: buildInstallments(900, 3, '2026-11-10').map((i) =>
      i.number === 2 ? { ...i, cancelled: true } : i
    ),
  });

  it('saem do valor em aberto e dos vencimentos próximos', () => {
    expect(getLoanTotals([base], '2026-11-10')).toEqual({ open: 600, overdue: 0 });
    expect(getNextDueDate(base)).toBe('2026-11-10');
  });

  it('continuam canceladas ao editar o empréstimo', () => {
    const rebuilt = buildInstallments(900, 3, '2026-11-10', base.installments);
    expect(rebuilt[1]).toMatchObject({ cancelled: true });
  });
});

describe('getLoanItemsForMonth', () => {
  const today = '2026-11-10';
  const installmentLoan = loan({
    id: 'parc',
    name: 'Carro',
    amount: 600,
    installmentsCount: 3,
    installments: [
      { number: 1, amount: 200, dueDate: '2026-11-10', paid: true, entryId: 'e1' },
      { number: 2, amount: 200, dueDate: '2026-11-20', paid: false },
      { number: 3, amount: 200, dueDate: '2026-12-10', paid: false, cancelled: true },
    ],
  });

  it('lista só os compromissos do mês ainda sem lançamento', () => {
    const items = getLoanItemsForMonth([installmentLoan], 10, 2026, today);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      label: 'Carro · parcela 2/3',
      status: 'pending',
      amount: 200,
    });
  });

  it('marca atrasado, cancelado e empréstimo único em aberto', () => {
    const overdue = getLoanItemsForMonth([installmentLoan], 10, 2026, '2026-11-25');
    expect(overdue[0].status).toBe('overdue');

    const cancelledItems = getLoanItemsForMonth([installmentLoan], 11, 2026, today);
    expect(cancelledItems[0].status).toBe('cancelled');

    const single = loan({ id: 'unico', name: 'Moto', amount: 500, dueDate: '2026-11-15' });
    expect(getLoanItemsForMonth([single], 10, 2026, today)).toMatchObject([
      { label: 'Moto', status: 'pending', amount: 500 },
    ]);
    expect(getLoanItemsForMonth([single], 9, 2026, today)).toHaveLength(0);
  });
});

describe('quitação', () => {
  const today = '2026-11-10';
  const settled = loan({
    id: 'quit',
    name: 'Carro',
    amount: 900,
    installmentsCount: 3,
    paid: true,
    installments: [
      { number: 1, amount: 300, dueDate: '2026-10-10', paid: true, entryId: 'e1' },
      { number: 2, amount: 300, dueDate: '2026-11-10', paid: false, cancelled: true },
      { number: 3, amount: 300, dueDate: '2026-12-10', paid: false, cancelled: true },
    ],
    settlement: { amount: 550, date: '2026-11-10', entryId: 'e2', cancelledNumbers: [2, 3] },
  });

  it('zera o saldo em aberto e registra o valor pago à vista', () => {
    expect(getOpenAmount(settled)).toBe(0);
    expect(getLoanTotals([settled], today)).toEqual({ open: 0, overdue: 0 });
    // Já pago = parcela paga (300) + valor da quitação (550).
    expect(getLoanPaidAmount(settled)).toBe(850);
  });

  it('não lista as parcelas canceladas pela quitação em Lançamentos', () => {
    expect(getLoanItemsForMonth([settled], 10, 2026, today)).toHaveLength(0);
    expect(getLoanItemsForMonth([settled], 11, 2026, today)).toHaveLength(0);
  });

  it('cancela só as parcelas em aberto', () => {
    const open = loan({
      id: 'aberto',
      amount: 900,
      installmentsCount: 3,
      installments: [
        { number: 1, amount: 300, dueDate: '2026-10-10', paid: true },
        { number: 2, amount: 300, dueDate: '2026-11-10', paid: false },
        { number: 3, amount: 300, dueDate: '2026-12-10', paid: false, cancelled: true },
      ],
    });
    expect(getInstallmentsToCancel(open).map((i) => i.number)).toEqual([2]);
  });

  it('soma o total do mês sem contar canceladas', () => {
    const items = getLoanItemsForMonth(
      [
        loan({ id: 'a', name: 'A', amount: 100, dueDate: '2026-11-05' }),
        loan({ id: 'b', name: 'B', amount: 250, dueDate: '2026-11-20' }),
      ],
      10,
      2026,
      today
    );
    expect(getLoanMonthTotal(items)).toBe(350);
    expect(getLoanMonthTotal(items.filter((i) => i.status === 'overdue'))).toBe(100);
  });
});

describe('getEndingDiscounts', () => {
  const today = '2026-11-10';

  it('lista só descontos com saldo que terminam nos próximos 2 meses', () => {
    const endingNow = loan({ id: 'agora', discountStart: '2026-11', discountEnd: '2026-11' });
    const nextMonth = loan({ id: 'proximo', discountStart: '2026-12', discountEnd: '2026-12' });
    const later = loan({ id: 'longe', discountStart: '2026-11', discountEnd: '2027-06' });
    const finished = loan({
      id: 'quitado',
      paid: true,
      discountStart: '2026-11',
      discountEnd: '2026-12',
    });
    const noPeriod = loan({ id: 'sem' });

    expect(
      getEndingDiscounts([endingNow, nextMonth, later, finished, noPeriod], today).map(
        (d) => d.loan.id
      )
    ).toEqual(['agora', 'proximo']);
  });

  it('considera o último mês das parcelas quando não há período registrado', () => {
    const legacy = loan({
      id: 'legado',
      installmentsCount: 2,
      installments: buildInstallments(200, 2, '2026-11-05'),
    });
    const discounts = getEndingDiscounts([legacy], today);

    expect(discounts).toHaveLength(1);
    expect(discounts[0].end).toBe('2026-12');
  });
});

describe('buildInstallments', () => {
  it('divide o total sem perder centavos e vence mês a mês', () => {
    const installments = buildInstallments(1000, 3, '2026-11-10');

    expect(installments.map((i) => i.amount)).toEqual([333.34, 333.33, 333.33]);
    expect(installments.reduce((sum, i) => sum + i.amount, 0)).toBeCloseTo(1000, 2);
    expect(installments.map((i) => i.dueDate)).toEqual(['2026-11-10', '2026-12-10', '2027-01-10']);
    expect(installments.every((i) => !i.paid)).toBe(true);
  });

  it('com valor de parcela informado, todas saem com esse valor (juros)', () => {
    const installments = buildInstallments(1000, 3, '2026-11-10', [], 450);

    expect(installments.map((i) => i.amount)).toEqual([450, 450, 450]);
    // O total pago passa a ser maior que o valor contratado: a diferença é o juro.
    expect(installments.reduce((sum, i) => sum + i.amount, 0)).toBe(1350);
  });

  it('não sobrescreve parcelas já pagas quando o valor da parcela é informado', () => {
    const previous = buildInstallments(900, 3, '2026-11-10').map((i) =>
      i.number === 1 ? { ...i, paid: true, entryId: 'e1' } : i
    );
    const rebuilt = buildInstallments(1000, 3, '2026-11-10', previous, 450);

    expect(rebuilt[0]).toMatchObject({ amount: 300, paid: true, entryId: 'e1' });
    expect(rebuilt[1].amount).toBe(450);
    expect(rebuilt[2].amount).toBe(450);
  });

  it('preserva os valores ajustados parcela a parcela quando pedido', () => {
    const previous: LoanInstallment[] = [
      { number: 1, amount: 300, dueDate: '2026-11-10', paid: true },
      { number: 2, amount: 350, dueDate: '2026-12-10', paid: false },
      { number: 3, amount: 280, dueDate: '2027-01-10', paid: false },
    ];
    const rebuilt = buildInstallments(1000, 3, '2026-12-05', previous, 450, true);

    // Valores mantidos; só os vencimentos passam a seguir a nova data — a parcela
    // 1 já paga continua exatamente como estava (data inclusive).
    expect(rebuilt.map((i) => i.amount)).toEqual([300, 350, 280]);
    expect(rebuilt.map((i) => i.dueDate)).toEqual(['2026-11-10', '2027-01-05', '2027-02-05']);
  });

  it('sem preservar, o valor informado ainda iguala todas as parcelas', () => {
    const previous: LoanInstallment[] = [
      { number: 1, amount: 300, dueDate: '2026-11-10', paid: false },
      { number: 2, amount: 350, dueDate: '2026-12-10', paid: false },
    ];
    expect(buildInstallments(1000, 2, '2026-11-10', previous, 450).map((i) => i.amount)).toEqual([
      450, 450,
    ]);
  });

  it('mantém parcelas já pagas ao editar o empréstimo', () => {
    const previous = buildInstallments(300, 3, '2026-11-10').map((i) =>
      i.number === 1 ? { ...i, paid: true, paidDate: '2026-11-10', entryId: 'e1' } : i
    );
    const rebuilt = buildInstallments(300, 3, '2027-01-15', previous);

    expect(rebuilt[0]).toMatchObject({ paid: true, entryId: 'e1', dueDate: '2026-11-10' });
    expect(rebuilt[1].paid).toBe(false);
    expect(rebuilt[1].dueDate).toBe('2027-02-15');
  });
});

describe('juros do parcelamento', () => {
  const comJuros = loan({
    id: 'juros',
    amount: 1000,
    installmentsCount: 3,
    installments: buildInstallments(1000, 3, '2026-11-10', [], 450),
  });

  it('o total pago é a soma das parcelas, maior que o valor contratado', () => {
    expect(getLoanPayableAmount(comJuros)).toBe(1350);
    expect(getLoanInterest(comJuros)).toBe(350);
    expect(getOpenAmount(comJuros)).toBe(1350);
  });

  it('sem juros o total pago é o próprio valor contratado', () => {
    const semJuros = loan({
      id: 'sem',
      amount: 900,
      installmentsCount: 3,
      installments: buildInstallments(900, 3, '2026-11-10'),
    });
    expect(getLoanPayableAmount(semJuros)).toBe(900);
    expect(getLoanInterest(semJuros)).toBe(0);
  });

  it('no pagamento único não há juros escondidos', () => {
    expect(getLoanPayableAmount(loan({ id: 'u', amount: 500 }))).toBe(500);
    expect(getLoanInterest(loan({ id: 'u', amount: 500 }))).toBe(0);
  });

  it('não cobra parcela cancelada no total nem nos juros', () => {
    const comCancelada = loan({
      id: 'cancelada',
      amount: 1000,
      installmentsCount: 3,
      installments: [
        { number: 1, amount: 450, dueDate: '2026-11-10', paid: false },
        { number: 2, amount: 450, dueDate: '2026-12-10', paid: false },
        { number: 3, amount: 450, dueDate: '2027-01-10', paid: false, cancelled: true },
      ],
    });

    expect(getLoanPayableAmount(comCancelada)).toBe(900);
    expect(getLoanInterest(comCancelada)).toBe(0);
  });

  it('usa o valor da quitação no lugar do saldo que ela cancelou', () => {
    const quitado = loan({
      id: 'quitado',
      amount: 1200,
      installmentsCount: 3,
      paid: true,
      installments: [
        { number: 1, amount: 500, dueDate: '2026-11-10', paid: true, entryId: 'e1' },
        { number: 2, amount: 500, dueDate: '2026-12-10', paid: false, cancelled: true },
        { number: 3, amount: 500, dueDate: '2027-01-10', paid: false, cancelled: true },
      ],
      settlement: { amount: 900, date: '2026-11-12', entryId: 'e2', cancelledNumbers: [2, 3] },
    });

    // 500 pago + 900 da quitação (com desconto) = 1.400; juros de 200.
    expect(getLoanPayableAmount(quitado)).toBe(1400);
    expect(getLoanInterest(quitado)).toBe(200);
    expect(getLoanPaidAmount(quitado)).toBe(1400);
  });

  it('rateia o juros pago na proporção do que já saiu do caixa', () => {
    const comUmaPaga = loan({
      id: 'uma',
      amount: 1000,
      installmentsCount: 3,
      installments: [
        { number: 1, amount: 450, dueDate: '2026-11-10', paid: true, entryId: 'e1' },
        { number: 2, amount: 450, dueDate: '2026-12-10', paid: false },
        { number: 3, amount: 450, dueDate: '2027-01-10', paid: false },
      ],
    });

    // 450 de 1.350 = 1/3 dos 350 de juros contratados.
    expect(getLoanPaidInterest(comUmaPaga)).toBe(116.67);
    expect(getLoanPaidInterest(comJuros)).toBe(0);

    const todasPagas = loan({
      ...comUmaPaga,
      installments: comUmaPaga.installments!.map((i) => ({ ...i, paid: true })),
    });
    expect(getLoanPaidInterest(todasPagas)).toBe(getLoanInterest(todasPagas));
  });

  it('conta os juros pagos no mês do vencimento quando não há lançamento à mão', () => {
    const parcelado = loan({
      id: 'mes',
      amount: 1000,
      installmentsCount: 3,
      installments: [
        { number: 1, amount: 450, dueDate: '2026-11-10', paid: true, paidDate: '2026-11-10' },
        // Paga em janeiro, mas a saída é criada no mês do vencimento (dezembro).
        { number: 2, amount: 450, dueDate: '2026-12-10', paid: true, paidDate: '2027-01-05' },
        { number: 3, amount: 450, dueDate: '2027-01-10', paid: false },
      ],
    });

    // 450 de 1.350 = 116,67 de juros em cada mês com parcela paga.
    expect(getLoanMonthPaidInterest([parcelado], 10, 2026)).toBe(116.67);
    expect(getLoanMonthPaidInterest([parcelado], 11, 2026)).toBe(116.67);
    expect(getLoanMonthPaidInterest([parcelado], 0, 2027)).toBe(0);
  });

  it('segue o mês do lançamento quando a data da saída é movida', () => {
    const comLancamentoMovido = loan({
      id: 'movido',
      amount: 1000,
      installmentsCount: 3,
      installments: [
        { number: 1, amount: 450, dueDate: '2026-11-10', paid: true, entryId: 'e1' },
        { number: 2, amount: 450, dueDate: '2026-12-10', paid: true, entryId: 'e2' },
        { number: 3, amount: 450, dueDate: '2027-01-10', paid: false },
      ],
    });
    const entries: Entry[] = [
      {
        id: 'e1',
        name: 'Parcela 1',
        amount: 450,
        dueDate: '2026-11-10',
        isPaid: true,
        type: 'debt',
        createdAt: 1,
        category: LOANS_CATEGORY,
      },
      // A saída da 2ª parcela foi movida para janeiro.
      {
        id: 'e2',
        name: 'Parcela 2',
        amount: 450,
        dueDate: '2027-01-05',
        isPaid: true,
        type: 'debt',
        createdAt: 1,
        category: LOANS_CATEGORY,
      },
    ];

    expect(getLoanMonthPaidInterest([comLancamentoMovido], 10, 2026, entries)).toBe(116.67);
    expect(getLoanMonthPaidInterest([comLancamentoMovido], 11, 2026, entries)).toBe(0);
    expect(getLoanMonthPaidInterest([comLancamentoMovido], 0, 2027, entries)).toBe(116.67);
  });

  it('conta os juros da quitação no mês em que ela foi feita', () => {
    const quitado = loan({
      id: 'quit',
      amount: 1000,
      settlement: { amount: 1400, date: '2026-12-20', entryId: 'e1', cancelledNumbers: [1, 2] },
    });

    expect(getLoanMonthPaidInterest([quitado], 11, 2026)).toBe(400);
    expect(getLoanMonthPaidInterest([quitado], 10, 2026)).toBe(0);

    // Quitação com a saída movida para janeiro: o juro acompanha o lançamento.
    const entradas: Entry[] = [
      {
        id: 'e1',
        name: 'Quitação',
        amount: 1400,
        dueDate: '2027-01-03',
        isPaid: true,
        type: 'debt',
        createdAt: 1,
        category: LOANS_CATEGORY,
      },
    ];
    expect(getLoanMonthPaidInterest([quitado], 11, 2026, entradas)).toBe(0);
    expect(getLoanMonthPaidInterest([quitado], 0, 2027, entradas)).toBe(400);
  });

  it('não conta juros de empréstimo sem juros', () => {
    const semJuros = loan({
      id: 'sem',
      amount: 900,
      installmentsCount: 3,
      installments: buildInstallments(900, 3, '2026-11-10'),
      paid: true,
    });
    expect(getLoanPaidInterest(semJuros)).toBe(0);
  });

  it('no pagamento único quitado o total é só a quitação', () => {
    const unicoQuitado = loan({
      id: 'u2',
      amount: 800,
      paid: true,
      settlement: { amount: 700, date: '2026-11-12' },
    });

    expect(getLoanPayableAmount(unicoQuitado)).toBe(700);
    expect(getLoanInterest(unicoQuitado)).toBe(0);
  });
});

describe('getMonthlyInstallments', () => {
  it('devolve o valor fixo das parcelas', () => {
    const loja = loan({
      id: 'fixo',
      amount: 1000,
      installmentsCount: 3,
      installments: buildInstallments(1000, 3, '2026-11-10', [], 450),
    });
    expect(getMonthlyInstallments(loja)).toEqual({
      amount: 450,
      varies: false,
      min: 450,
      max: 450,
    });
  });

  it('devolve a faixa quando as parcelas têm valores diferentes', () => {
    const variavel = loan({
      id: 'variavel',
      amount: 600,
      installmentsCount: 3,
      installments: [
        { number: 1, amount: 200, dueDate: '2026-11-10', paid: true },
        { number: 2, amount: 350, dueDate: '2026-12-10', paid: false },
        { number: 3, amount: 300, dueDate: '2027-01-10', paid: false, cancelled: true },
      ],
    });
    // A parcela cancelada fica de fora da faixa.
    expect(getMonthlyInstallments(variavel)).toEqual({
      amount: 200,
      varies: true,
      min: 200,
      max: 350,
    });
  });

  it('não devolve valor mensal para pagamento único', () => {
    expect(getMonthlyInstallments(loan({ id: 'unico', amount: 500 }))).toBeNull();
  });
});

describe('getLoanMonthlyImpact', () => {
  it('soma parcelas do mês pagas e em aberto, ignorando canceladas', () => {
    const parcelado = loan({
      id: 'p',
      amount: 1200,
      installmentsCount: 3,
      installments: [
        { number: 1, amount: 500, dueDate: '2026-11-10', paid: true, entryId: 'e1' },
        { number: 2, amount: 350, dueDate: '2026-11-20', paid: false },
        { number: 3, amount: 300, dueDate: '2026-12-10', paid: false, cancelled: true },
      ],
    });

    expect(getLoanMonthlyImpact([parcelado], 10, 2026)).toBe(850);
  });

  it('conta pagamento único e quitação pela data certa, sem duplicar', () => {
    const unico = loan({ id: 'u', amount: 400, dueDate: '2026-11-25' });
    const quitado = loan({
      id: 'q',
      amount: 1000,
      dueDate: '2026-11-05',
      settlement: { amount: 600, date: '2026-11-12' },
    });

    // 400 (único) + 600 (quitação de novembro); o valor original do quitado fica de fora.
    expect(getLoanMonthlyImpact([unico, quitado], 10, 2026)).toBe(1000);
    expect(getLoanMonthlyImpact([unico], 11, 2026)).toBe(0);
  });
});

describe('getLoanMonthPendingAmount', () => {
  it('soma as parcelas em aberto do mês e ignora as já pagas', () => {
    const parcelado = loan({
      id: 'p',
      amount: 1200,
      installmentsCount: 3,
      installments: [
        { number: 1, amount: 500, dueDate: '2026-11-10', paid: true, entryId: 'e1' },
        { number: 2, amount: 350, dueDate: '2026-11-20', paid: false },
        { number: 3, amount: 300, dueDate: '2026-12-10', paid: false },
      ],
    });
    const unico = loan({ id: 'u', amount: 500, dueDate: '2026-11-25' });

    // 350 (parcela 2) + 500 (pagamento único); a paga e a de dezembro ficam fora.
    expect(getLoanMonthPendingAmount([parcelado, unico], 10, 2026, '2026-11-13')).toBe(850);
  });

  it('não soma parcelas canceladas nem meses sem compromisso', () => {
    const parcelado = loan({
      id: 'p',
      amount: 600,
      installmentsCount: 2,
      installments: [
        { number: 1, amount: 300, dueDate: '2026-11-10', paid: false, cancelled: true },
        { number: 2, amount: 300, dueDate: '2026-12-10', paid: false },
      ],
    });

    expect(getLoanMonthPendingAmount([parcelado], 10, 2026, '2026-11-13')).toBe(0);
    expect(getLoanMonthPendingAmount([parcelado], 0, 2027, '2026-11-13')).toBe(0);
  });
});

describe('updateInstallmentAmount', () => {
  const base = loan({
    id: 'p',
    amount: 900,
    installmentsCount: 3,
    installments: [
      { number: 1, amount: 300, dueDate: '2026-11-10', paid: true, entryId: 'e1' },
      { number: 2, amount: 300, dueDate: '2026-12-10', paid: false },
      { number: 3, amount: 300, dueDate: '2027-01-10', paid: false, cancelled: true },
    ],
  });

  it('troca só o valor da parcela pedida, preservando pagamento e vencimento', () => {
    const next = updateInstallmentAmount(base, 2, 350);

    expect(next.installments![1]).toMatchObject({ amount: 350, dueDate: '2026-12-10' });
    expect(next.installments![0]).toEqual(base.installments![0]);
    expect(next.installments![2]).toEqual(base.installments![2]);
    // Só a parcela 2 está em aberto (1 paga, 3 cancelada).
    expect(getOpenAmount(next)).toBe(350);
    // A parcela 3 está cancelada, então o total (650) fica abaixo do contratado
    // e não há juros a mostrar.
    expect(getLoanInterest(next)).toBe(0);
  });

  it('arredonda para centavos e ignora valor inválido', () => {
    expect(updateInstallmentAmount(base, 2, 350.555).installments![1].amount).toBe(350.56);
    expect(updateInstallmentAmount(base, 2, 0)).toBe(base);
  });
});

describe('getLoanTotals com parcelas', () => {
  const installmentLoan = loan({
    id: 'parcelado',
    amount: 1000,
    dueDate: '2026-11-10',
    installmentsCount: 4,
    installments: buildInstallments(1000, 4, '2026-11-10').map((i) =>
      i.number <= 2 ? { ...i, paid: true, paidDate: '2026-11-10' } : i
    ),
  });

  it('considera só as parcelas em aberto', () => {
    expect(isInstallmentLoan(installmentLoan)).toBe(true);
    expect(getLoanTotals([installmentLoan], '2026-11-10')).toEqual({ open: 500, overdue: 0 });
  });

  it('marca como vencida apenas a parcela em aberto já vencida', () => {
    expect(getLoanTotals([installmentLoan], '2027-01-15')).toEqual({ open: 500, overdue: 250 });
  });

  it('o já pago soma as parcelas quitadas', () => {
    expect(getLoanPaidAmount(installmentLoan)).toBe(500);
  });

  it('o próximo vencimento é o da primeira parcela em aberto', () => {
    expect(getNextDueDate(installmentLoan)).toBe('2027-01-10');
  });

  it('empréstimo único continua somando o valor inteiro', () => {
    const single = loan({ id: 'unico', amount: 400, dueDate: '2026-11-01' });
    expect(getLoanTotals([single], '2026-11-10')).toEqual({ open: 400, overdue: 400 });
    expect(getLoanPaidAmount(single)).toBe(0);
  });
});

describe('saídas de empréstimo lançadas no mês', () => {
  function saida(overrides: Partial<Entry> & { id: string }): Entry {
    return {
      name: 'Parcela',
      amount: 450,
      dueDate: '2026-11-10',
      isPaid: true,
      type: 'debt',
      createdAt: 1,
      category: LOANS_CATEGORY,
      ...overrides,
    };
  }

  it('conta só os lançamentos de empréstimo do mês', () => {
    const entries = [
      saida({ id: 'e1' }),
      saida({ id: 'e2', amount: 100, category: 'Mercado' }),
      saida({ id: 'e3', amount: 300, dueDate: '2026-12-10' }),
      saida({ id: 'e4', amount: 200, type: 'cash' }),
    ];

    expect(getLoanPostedAmount(entries, 10, 2026)).toBe(450);
  });

  it('soma o que está lançado e o que ainda vai vencer, sem contar duas vezes', () => {
    const emprestimo = loan({
      id: 'p',
      amount: 900,
      installmentsCount: 3,
      installments: [
        { number: 1, amount: 300, dueDate: '2026-11-10', paid: true, entryId: 'e1' },
        { number: 2, amount: 300, dueDate: '2026-11-10', paid: false },
        { number: 3, amount: 300, dueDate: '2026-12-10', paid: false },
      ],
    });
    const entries = [saida({ id: 'e1', amount: 300 })];

    // Novembro: 300 já lançado + 300 da parcela em aberto do mês.
    expect(getLoanMonthImpactPosted(entries, [emprestimo], 10, 2026, '2026-11-20')).toBe(600);
    // Dezembro: só a parcela em aberto (nada lançado ainda).
    expect(getLoanMonthImpactPosted(entries, [emprestimo], 11, 2026, '2026-11-20')).toBe(300);
  });

  it('não distorce as demais saídas quando a parcela é paga em outro mês', () => {
    const emprestimo = loan({
      id: 'q',
      amount: 900,
      installmentsCount: 2,
      installments: [
        { number: 1, amount: 450, dueDate: '2026-11-10', paid: true, entryId: 'e1' },
        { number: 2, amount: 450, dueDate: '2026-12-10', paid: true, entryId: 'e2' },
      ],
    });
    // A parcela de dezembro foi paga em novembro: o dinheiro saiu em novembro.
    const entries = [
      saida({ id: 'e1' }),
      saida({ id: 'e2', dueDate: '2026-11-25' }),
      saida({ id: 'e3', amount: 200, category: 'Mercado' }),
    ];

    const totalNov = 450 + 450 + 200;
    const impactoNov = getLoanMonthImpactPosted(entries, [emprestimo], 10, 2026, '2026-11-30');
    expect(impactoNov).toBe(900);
    // Demais saídas nunca ficam negativas: sobram os 200 de mercado.
    expect(totalNov - impactoNov).toBe(200);
    // Dezembro não ganha uma "parcela fantasma" que nunca foi lançada no mês.
    expect(getLoanMonthImpactPosted(entries, [emprestimo], 11, 2026, '2026-11-30')).toBe(0);
  });
});

describe('detachEntryFromLoan — saída excluída não deixa parcela órfã', () => {
  it('devolve a parcela paga para pendente e reabre o empréstimo', () => {
    const parcelado = loan({
      id: 'orf',
      amount: 1000,
      paid: true,
      installmentsCount: 2,
      installments: [
        {
          number: 1,
          amount: 500,
          dueDate: '2026-11-10',
          paid: true,
          paidDate: '2026-11-10',
          entryId: 'e1',
        },
        {
          number: 2,
          amount: 500,
          dueDate: '2026-12-10',
          paid: true,
          paidDate: '2026-11-20',
          entryId: 'e2',
        },
      ],
    });

    const next = detachEntryFromLoan(parcelado, 'e2');

    expect(next).not.toBeNull();
    expect(next!.paid).toBe(false);
    expect(next!.installments?.[1]).toMatchObject({
      paid: false,
      paidDate: undefined,
      entryId: undefined,
    });
    // A outra parcela continua paga e com o lançamento dela.
    expect(next!.installments?.[0]).toMatchObject({ paid: true, entryId: 'e1' });
    // Valor excluído volta a contar como pendente no mês do vencimento.
    expect(getLoanMonthPendingAmount([next!], 11, 2026, '2026-11-15')).toBe(500);
  });

  it('desfaz a quitação quando a saída dela é excluída', () => {
    const quitado = loan({
      id: 'quit-orf',
      amount: 1000,
      paid: true,
      installmentsCount: 2,
      settlement: {
        amount: 1200,
        date: '2026-11-20',
        entryId: 'q1',
        cancelledNumbers: [1, 2],
      },
      installments: [
        { number: 1, amount: 500, dueDate: '2026-11-10', paid: false, cancelled: true },
        { number: 2, amount: 500, dueDate: '2026-12-10', paid: false, cancelled: true },
      ],
    });

    const next = detachEntryFromLoan(quitado, 'q1');

    expect(next).not.toBeNull();
    expect(next!.settlement).toBeUndefined();
    expect(next!.installments?.every((i) => i.cancelled === false)).toBe(true);
    expect(next!.paid).toBe(false);
    expect(getOpenAmount(next!)).toBe(1000);
  });

  it('não mexe no empréstimo quando o lançamento é de outra coisa', () => {
    const parcelado = loan({
      id: 'sem-vinculo',
      installmentsCount: 2,
      installments: [
        { number: 1, amount: 500, dueDate: '2026-11-10', paid: true, entryId: 'e1' },
        { number: 2, amount: 500, dueDate: '2026-12-10', paid: false },
      ],
    });

    expect(detachEntryFromLoan(parcelado, 'outro-lancamento')).toBeNull();
    // Parcela pendente com `entryId` antigo também não é considerada vínculo.
    const comVinculoAntigo = loan({
      id: 'pendente',
      installmentsCount: 1,
      installments: [{ number: 1, amount: 500, dueDate: '2026-11-10', paid: false, entryId: 'e1' }],
    });
    expect(detachEntryFromLoan(comVinculoAntigo, 'e1')).toBeNull();
  });
});
