import type { Loan, LoanInstallment } from '../types';

export type LoanTotals = {
  open: number;
  overdue: number;
};

/** Empréstimo parcelado (tem parcelas geradas). */
export function isInstallmentLoan(loan: Loan): boolean {
  return (loan.installmentsCount ?? 1) > 1 && (loan.installments?.length ?? 0) > 0;
}

/** Parcelas ainda em aberto (canceladas e pagas ficam de fora). */
export function getOpenInstallments(loan: Loan): LoanInstallment[] {
  return isInstallmentLoan(loan) ? loan.installments!.filter((i) => !i.paid && !i.cancelled) : [];
}

/**
 * Valor já pago do empréstimo: parcelas pagas + valor da quitação (o que saiu do
 * caixa de fato) ou, no pagamento único, o valor total quando pago.
 */
export function getLoanPaidAmount(loan: Loan): number {
  const paidInstallments = isInstallmentLoan(loan)
    ? loan.installments!.filter((i) => i.paid).reduce((sum, i) => sum + i.amount, 0)
    : 0;
  if (loan.settlement) return paidInstallments + loan.settlement.amount;
  if (isInstallmentLoan(loan)) return paidInstallments;
  return loan.paid ? loan.amount : 0;
}

/**
 * Totais de empréstimos: `open` soma o que falta pagar; `overdue` soma o que
 * está em aberto com vencimento anterior a `today` (formato ISO yyyy-mm-dd).
 *
 * Em empréstimo parcelado cada parcela conta individualmente: um empréstimo com
 * 12 parcelas e 3 pagas só entra em aberto pelas 9 restantes.
 */
export function getLoanTotals(loans: Loan[], today: string): LoanTotals {
  let open = 0;
  let overdue = 0;
  for (const loan of loans) {
    // Empréstimo quitado não tem saldo, independente das parcelas canceladas.
    if (loan.settlement) continue;
    if (isInstallmentLoan(loan)) {
      for (const installment of loan.installments!) {
        if (installment.paid || installment.cancelled) continue;
        open += installment.amount;
        if (installment.dueDate < today) overdue += installment.amount;
      }
      continue;
    }
    if (loan.paid) continue;
    open += loan.amount;
    if (loan.dueDate < today) overdue += loan.amount;
  }
  return { open, overdue };
}

/** Quanto ainda falta pagar do empréstimo (parcelas em aberto ou o valor único). */
export function getOpenAmount(loan: Loan): number {
  if (loan.settlement) return 0;
  if (isInstallmentLoan(loan)) {
    return getOpenInstallments(loan).reduce((sum, i) => sum + i.amount, 0);
  }
  return loan.paid ? 0 : loan.amount;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Total que vai sair do caixa: a soma das parcelas (que já inclui os juros) ou o
 * valor único quando não é parcelado.
 */
export function getLoanPayableAmount(loan: Loan): number {
  if (isInstallmentLoan(loan)) {
    return roundMoney(loan.installments!.reduce((sum, i) => sum + i.amount, 0));
  }
  return loan.amount;
}

/** Juros embutidos no parcelamento: o total das parcelas menos o valor contratado. */
export function getLoanInterest(loan: Loan): number {
  return roundMoney(Math.max(0, getLoanPayableAmount(loan) - loan.amount));
}

/**
 * Valor mensal das parcelas: o valor delas quando é fixo (o caso normal do
 * parcelamento, com ou sem juros) ou a faixa quando variam de uma para outra.
 * Canceladas ficam de fora; pagamento único devolve null (não é mensal).
 */
export function getMonthlyInstallments(
  loan: Loan
): { amount: number; varies: boolean; min: number; max: number } | null {
  if (!isInstallmentLoan(loan)) return null;
  const amounts = loan.installments!.filter((i) => !i.cancelled).map((i) => i.amount);
  if (amounts.length === 0) return null;
  const min = roundMoney(Math.min(...amounts));
  const max = roundMoney(Math.max(...amounts));
  return { amount: amounts[0], varies: max - min > 0.005, min, max };
}

/**
 * Troca o valor de uma parcela mantendo as outras como estão (vencimento,
 * pagamento e cancelamento são preservados): é assim que o valor real de uma
 * parcela com juros diferente das demais entra no empréstimo.
 */
export function updateInstallmentAmount(loan: Loan, number: number, amount: number): Loan {
  if (!(amount > 0)) return loan;
  const installments = (loan.installments ?? []).map((i) =>
    i.number === number ? { ...i, amount: roundMoney(amount) } : i
  );
  return { ...loan, installments };
}

/**
 * Empréstimos com saldo em aberto cujo desconto termina em até `months` meses
 * (contando o mês atual), do que termina antes para o que termina depois.
 */
export function getEndingDiscounts(
  loans: Loan[],
  today: string,
  months = 2
): { loan: Loan; end: string }[] {
  const todayMonth = monthKey(today);
  const limit = addMonthsToMonth(todayMonth, Math.max(1, months) - 1);

  return loans
    .map((loan) => ({ loan, end: getDiscountPeriod(loan)?.end }))
    .filter(
      (item): item is { loan: Loan; end: string } =>
        !!item.end && item.end >= todayMonth && item.end <= limit && getOpenAmount(item.loan) > 0
    )
    .sort((a, b) => a.end.localeCompare(b.end));
}

/**
 * Compromissos de empréstimo com vencimento no mês, ainda sem lançamento: as
 * parcelas em aberto/canceladas e o empréstimo único não pago. As parcelas
 * pagas ficam de fora porque já são lançamentos na lista de Lançamentos.
 */
export type LoanMonthItem = {
  id: string;
  loan: Loan;
  label: string;
  amount: number;
  dueDate: string;
  status: 'pending' | 'overdue' | 'cancelled';
};

export function getLoanItemsForMonth(
  loans: Loan[],
  month: number,
  year: number,
  today: string
): LoanMonthItem[] {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const items: LoanMonthItem[] = [];

  for (const loan of loans) {
    if (isInstallmentLoan(loan)) {
      const count = loan.installments!.length;
      const settledNumbers = loan.settlement?.cancelledNumbers ?? [];
      for (const installment of loan.installments!) {
        if (installment.paid || monthKey(installment.dueDate) !== prefix) continue;
        // Parcelas canceladas pela quitação não são mais compromisso do mês.
        if (settledNumbers.includes(installment.number)) continue;
        items.push({
          id: `${loan.id}-${installment.number}`,
          loan,
          label: `${loan.name} · parcela ${installment.number}/${count}`,
          amount: installment.amount,
          dueDate: installment.dueDate,
          status: installment.cancelled
            ? 'cancelled'
            : installment.dueDate < today
              ? 'overdue'
              : 'pending',
        });
      }
      continue;
    }
    if (loan.paid || monthKey(loan.dueDate) !== prefix) continue;
    items.push({
      id: loan.id,
      loan,
      label: loan.name,
      amount: loan.amount,
      dueDate: loan.dueDate,
      status: loan.dueDate < today ? 'overdue' : 'pending',
    });
  }

  return items.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

/**
 * Soma do que ainda vai sair do caixa no mês (parcelas canceladas não contam):
 * é o valor que aparece no total dos empréstimos do mês em Lançamentos.
 */
export function getLoanMonthTotal(items: LoanMonthItem[]): number {
  return items
    .filter((item) => item.status !== 'cancelled')
    .reduce((sum, item) => sum + item.amount, 0);
}

/**
 * Parcelas de empréstimo do mês que ainda NÃO viraram lançamento: é o que falta
 * somar às saídas do mês. As pagas já existem como lançamentos (e as canceladas
 * não são mais compromisso), então ficam de fora para não contar duas vezes.
 */
export function getLoanMonthPendingAmount(
  loans: Loan[],
  month: number,
  year: number,
  today: string
): number {
  return getLoanMonthTotal(getLoanItemsForMonth(loans, month, year, today));
}

/**
 * Peso do empréstimo nas saídas de um mês: todas as parcelas que vencem no mês
 * (pagas e em aberto, sem as canceladas), o empréstimo de pagamento único com
 * vencimento no mês e a quitação feita no mês.
 */
export function getLoanMonthlyImpact(loans: Loan[], month: number, year: number): number {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  let total = 0;

  for (const loan of loans) {
    if (isInstallmentLoan(loan)) {
      for (const installment of loan.installments!) {
        if (installment.cancelled || monthKey(installment.dueDate) !== prefix) continue;
        total += installment.amount;
      }
    } else if (!loan.settlement && monthKey(loan.dueDate) === prefix) {
      // Pagamento único quitado conta pela quitação abaixo, não duas vezes.
      total += loan.amount;
    }
    if (loan.settlement && monthKey(loan.settlement.date) === prefix) {
      total += loan.settlement.amount;
    }
  }

  return roundMoney(total);
}

/** Parcelas em aberto que a quitação cancela (as pagas continuam como estão). */
export function getInstallmentsToCancel(loan: Loan): LoanInstallment[] {
  return isInstallmentLoan(loan) ? loan.installments!.filter((i) => !i.paid && !i.cancelled) : [];
}

/** Próximo vencimento em aberto (parcela ou empréstimo único). */
export function getNextDueDate(loan: Loan): string {
  if (isInstallmentLoan(loan)) {
    const open = getOpenInstallments(loan);
    if (open.length === 0) return loan.dueDate;
    return open.reduce((min, i) => (i.dueDate < min ? i.dueDate : min), open[0].dueDate);
  }
  return loan.dueDate;
}

/**
 * Próximo compromisso em aberto: a parcela mais próxima de vencer (com o valor
 * DELA, não o saldo do empréstimo) ou o pagamento único. Null quando não há
 * mais nada a pagar (quitado, pago ou só com parcelas canceladas).
 */
export function getNextOpenItem(loan: Loan): { dueDate: string; amount: number } | null {
  if (loan.settlement) return null;
  if (isInstallmentLoan(loan)) {
    const open = getOpenInstallments(loan);
    if (open.length === 0) return null;
    const next = open.reduce((min, i) => (i.dueDate < min.dueDate ? i : min), open[0]);
    return { dueDate: next.dueDate, amount: next.amount };
  }
  if (loan.paid) return null;
  return { dueDate: loan.dueDate, amount: loan.amount };
}

/** Data ISO somando meses, ajustando o dia ao último dia do mês (ex.: 31/01 + 1 = 28/02). */
export function addMonthsISO(isoDate: string, months: number): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  const base = new Date(year, month - 1 + months, 1);
  const lastDay = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
  const safeDay = Math.min(day, lastDay);
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}-${String(
    safeDay
  ).padStart(2, '0')}`;
}

const MONTH_LABELS = [
  'jan',
  'fev',
  'mar',
  'abr',
  'mai',
  'jun',
  'jul',
  'ago',
  'set',
  'out',
  'nov',
  'dez',
];

/** Mês (YYYY-MM) de uma data ISO. */
export function monthKey(isoDate: string): string {
  return isoDate.slice(0, 7);
}

/** Soma meses a um mês YYYY-MM. */
export function addMonthsToMonth(month: string, months: number): string {
  const [year, monthNumber] = month.split('-').map(Number);
  const base = new Date(year, monthNumber - 1 + months, 1);
  return `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, '0')}`;
}

/** Meses do período contando o início e o fim (nov/2026 a jan/2027 = 3). */
export function monthsBetweenMonths(startMonth: string, endMonth: string): number {
  const [startYear, startMonthNumber] = startMonth.split('-').map(Number);
  const [endYear, endMonthNumber] = endMonth.split('-').map(Number);
  return (endYear - startYear) * 12 + (endMonthNumber - startMonthNumber) + 1;
}

/** 'nov/2026' a partir de 'YYYY-MM'. */
export function formatMonthLabel(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  return `${MONTH_LABELS[monthNumber - 1]}/${year}`;
}

/** Data ISO do dia informado dentro do mês, ajustada ao último dia do mês. */
export function dateInMonth(month: string, day: number): string {
  const [year, monthNumber] = month.split('-').map(Number);
  const lastDay = new Date(year, monthNumber, 0).getDate();
  const safeDay = Math.max(1, Math.min(Math.trunc(day) || 1, lastDay));
  return `${month}-${String(safeDay).padStart(2, '0')}`;
}

/**
 * Gera as parcelas a partir do período do desconto: uma parcela por mês, do mês
 * de início ao mês de fim, todas vencendo no dia informado (ajustado em meses
 * mais curtos).
 */
export function buildInstallmentsForPeriod(
  total: number,
  startMonth: string,
  endMonth: string,
  day: number,
  previous: LoanInstallment[] = [],
  installmentAmount?: number,
  keepExistingAmounts = false
): LoanInstallment[] {
  const count = Math.max(1, monthsBetweenMonths(startMonth, endMonth));
  return buildInstallments(
    total,
    count,
    dateInMonth(startMonth, day),
    previous,
    installmentAmount,
    keepExistingAmounts
  );
}

/**
 * Período do desconto do empréstimo: usa o registrado e, se não houver, deduz
 * das parcelas (do primeiro ao último vencimento).
 */
export function getDiscountPeriod(loan: Loan): { start: string; end?: string } | null {
  if (loan.discountStart) return { start: loan.discountStart, end: loan.discountEnd };
  if (isInstallmentLoan(loan)) {
    const dates = loan.installments!.map((i) => i.dueDate).sort();
    if (dates.length === 0) return null;
    return { start: monthKey(dates[0]), end: monthKey(dates[dates.length - 1]) };
  }
  return null;
}

/** Texto do período do desconto (ex.: 'nov/2026 até jan/2027'). */
export function formatDiscountPeriod(loan: Loan): string | null {
  const period = getDiscountPeriod(loan);
  if (!period) return null;
  if (!period.end || period.end === period.start) {
    return `${formatMonthLabel(period.start)} em diante`;
  }
  return `${formatMonthLabel(period.start)} até ${formatMonthLabel(period.end)}`;
}

/**
 * Gera as parcelas de um empréstimo: divide o total em centavos (a sobra vai para
 * as primeiras parcelas, então a soma fecha exatamente com o valor total) e
 * espaça os vencimentos de mês em mês a partir de `firstDueDate`.
 *
 * Parcelas já pagas em `previous` são mantidas como estão (valor, data e
 * lançamento vinculado): editar o empréstimo não pode desfazer pagamentos.
 *
 * `installmentAmount` é o valor real de cada parcela quando o parcelamento tem
 * juros: todas saem com ele, então o total pago fica maior que `total`.
 *
 * `keepExistingAmounts` mantém o valor já salvo de cada parcela (inclusive os
 * ajustes feitos uma a uma) e só reescreve vencimento: editar o empréstimo não
 * pode desfazer o valor real de cada mês.
 */
export function buildInstallments(
  total: number,
  count: number,
  firstDueDate: string,
  previous: LoanInstallment[] = [],
  installmentAmount?: number,
  keepExistingAmounts = false
): LoanInstallment[] {
  const safeCount = Math.max(1, Math.min(Math.trunc(count), 120));
  const fixedCents =
    installmentAmount !== undefined && installmentAmount > 0
      ? Math.round(installmentAmount * 100)
      : null;
  const totalCents = Math.round(total * 100);
  const baseCents = Math.floor(totalCents / safeCount);
  const remainder = totalCents - baseCents * safeCount;

  return Array.from({ length: safeCount }, (_, index) => {
    const number = index + 1;
    // Pagas e canceladas são mantidas ao editar o empréstimo.
    const keptBefore = previous.find((p) => p.number === number && (p.paid || p.cancelled));
    if (keptBefore) return keptBefore;
    const keptAmount = keepExistingAmounts ? previous.find((p) => p.number === number) : undefined;
    return {
      number,
      amount: keptAmount
        ? roundMoney(keptAmount.amount)
        : fixedCents !== null
          ? fixedCents / 100
          : (baseCents + (index < remainder ? 1 : 0)) / 100,
      dueDate: addMonthsISO(firstDueDate, index),
      paid: false,
    };
  });
}
