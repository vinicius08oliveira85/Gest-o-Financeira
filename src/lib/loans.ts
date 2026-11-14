import type { Entry, Loan, LoanInstallment } from '../types';
import { LOANS_CATEGORY } from '../constants';

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
 * Total que sai (ou saiu) do caixa pelo empréstimo: a soma das parcelas não
 * canceladas — que já incluem os juros — mais o valor da quitação, quando houve.
 * Parcela cancelada não é cobrada, então não entra no total; na quitação (que
 * substitui o saldo restante) só o valor pago à vista conta.
 */
export function getLoanPayableAmount(loan: Loan): number {
  if (isInstallmentLoan(loan)) {
    const installments = loan.installments!.reduce(
      (sum, i) => (i.cancelled ? sum : sum + i.amount),
      0
    );
    return roundMoney(installments + (loan.settlement?.amount ?? 0));
  }
  return loan.settlement ? roundMoney(loan.settlement.amount) : loan.amount;
}

/**
 * Juros embutidos no que efetivamente será pago: o total (parcelas não
 * canceladas + quitação) menos o valor contratado. Nunca negativo — quando o
 * total fica abaixo do contratado, os juros não aparecem.
 */
export function getLoanInterest(loan: Loan): number {
  return roundMoney(Math.max(0, getLoanPayableAmount(loan) - loan.amount));
}

/**
 * Juros efetivamente pagos: como o contrato não guarda a taxa, os juros são
 * rateados na mesma proporção do que já saiu do caixa (cada parcela carrega a
 * mesma fatia de juros do total). Quitação com desconto reduz o total pago e,
 * com ele, os juros pagos.
 */
export function getLoanPaidInterest(loan: Loan): number {
  const payable = getLoanPayableAmount(loan);
  const interest = getLoanInterest(loan);
  if (payable <= 0 || interest <= 0) return 0;
  const paid = getLoanPaidAmount(loan);
  return roundMoney(Math.min(interest, (paid / payable) * interest));
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
 * Saídas de empréstimo já lançadas no mês (parcelas pagas e quitação). Usa a
 * data do lançamento, não o vencimento da parcela: se a parcela foi paga em
 * outro mês, o dinheiro saiu no mês do lançamento.
 */
export function getLoanPostedAmount(entries: Entry[], month: number, year: number): number {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  return roundMoney(
    entries
      .filter(
        (entry) =>
          entry.type === 'debt' &&
          entry.category === LOANS_CATEGORY &&
          entry.dueDate.startsWith(prefix)
      )
      .reduce((sum, entry) => sum + entry.amount, 0)
  );
}

/**
 * Peso real do empréstimo nas saídas do mês: o que já está lançado (parcelas
 * pagas e quitação, no mês em que saíram) mais as parcelas do mês que ainda não
 * viraram lançamento. É a base de "Demais saídas": olhando só o vencimento, uma
 * parcela paga em outro mês fazia a subtração ficar negativa e zerava o resto.
 */
export function getLoanMonthImpactPosted(
  entries: Entry[],
  loans: Loan[],
  month: number,
  year: number,
  today: string
): number {
  return roundMoney(
    getLoanPostedAmount(entries, month, year) + getLoanMonthPendingAmount(loans, month, year, today)
  );
}

/**
 * Solta o vínculo de um lançamento que foi excluído: a parcela paga volta a
 * pendente (com vencimento no mês dela) e, se for a saída da quitação, a
 * quitação é desfeita e as parcelas canceladas por ela voltam a valer — mesma
 * regra do "Desfazer quitação". Devolve `null` quando o lançamento não pertence
 * ao empréstimo, para o chamador saber que nada mudou.
 */
export function detachEntryFromLoan(loan: Loan, entryId: string): Loan | null {
  const installments = loan.installments ?? [];
  const linked = installments.find(
    (installment) => installment.paid && installment.entryId === entryId
  );

  if (linked) {
    const nextInstallments = installments.map((installment) =>
      installment.number === linked.number
        ? { ...installment, paid: false, paidDate: undefined, entryId: undefined }
        : installment
    );
    return {
      ...loan,
      installments: nextInstallments,
      paid: nextInstallments.every((installment) => installment.paid),
    };
  }

  if (loan.settlement?.entryId === entryId) {
    const restored = loan.settlement.cancelledNumbers ?? [];
    const nextInstallments = loan.installments?.map((installment) =>
      restored.includes(installment.number) ? { ...installment, cancelled: false } : installment
    );
    return {
      ...loan,
      settlement: undefined,
      installments: nextInstallments,
      paid: nextInstallments ? nextInstallments.every((installment) => installment.paid) : false,
    };
  }

  return null;
}

/**
 * Corrige dados antigos: parcelas (ou quitação) que ficaram pagas apontando para
 * um lançamento que não existe mais. Cada vínculo quebrado é solto com
 * `detachEntryFromLoan`, devolvendo o valor ao saldo em aberto; devolve só os
 * empréstimos que mudaram, para quem chama persistir apenas esses.
 */
export function repairOrphanLoanLinks(loans: Loan[], entries: Entry[]): Loan[] {
  const entryIds = new Set(entries.map((entry) => entry.id));
  const repaired: Loan[] = [];

  for (const loan of loans) {
    const orphans = new Set<string>();
    for (const installment of loan.installments ?? []) {
      if (installment.paid && installment.entryId && !entryIds.has(installment.entryId)) {
        orphans.add(installment.entryId);
      }
    }
    if (loan.settlement?.entryId && !entryIds.has(loan.settlement.entryId)) {
      orphans.add(loan.settlement.entryId);
    }
    if (orphans.size === 0) continue;

    let current = loan;
    for (const entryId of orphans) {
      current = detachEntryFromLoan(current, entryId) ?? current;
    }
    if (current !== loan) repaired.push(current);
  }

  return repaired;
}

/**
 * Juros efetivamente pagos em um mês: a fatia de juros das parcelas pagas mais a
 * da quitação, no **mês da saída** — o mesmo em que o lançamento aparece no
 * Resumo. O mês vem do lançamento vinculado (`entryId`), então mover a data de
 * um lançamento move o juro junto; sem lançamento, vale o vencimento, que é a
 * data usada ao criar a saída da parcela. Usa o mesmo rateio do
 * `getLoanPaidInterest`, proporcional ao que saiu do caixa em cada contrato.
 */
export function getLoanMonthPaidInterest(
  loans: Loan[],
  month: number,
  year: number,
  entries: Entry[] = []
): number {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const entryMonths = new Map(entries.map((entry) => [entry.id, monthKey(entry.dueDate)]));
  let total = 0;

  for (const loan of loans) {
    const payable = getLoanPayableAmount(loan);
    const interest = getLoanInterest(loan);
    if (payable <= 0 || interest <= 0) continue;

    let paid = 0;
    for (const installment of loan.installments ?? []) {
      if (!installment.paid) continue;
      const postedMonth = installment.entryId ? entryMonths.get(installment.entryId) : undefined;
      const paidMonth = postedMonth ?? monthKey(installment.dueDate);
      if (paidMonth === prefix) paid += installment.amount;
    }
    if (loan.settlement) {
      const postedMonth = loan.settlement.entryId
        ? entryMonths.get(loan.settlement.entryId)
        : undefined;
      if ((postedMonth ?? monthKey(loan.settlement.date)) === prefix) {
        paid += loan.settlement.amount;
      }
    }

    if (paid > 0) total += (paid / payable) * interest;
  }

  return roundMoney(total);
}

/**
 * Peso do empréstimo nas saídas de um mês **pelo vencimento**: todas as parcelas
 * que vencem no mês (pagas e em aberto, sem as canceladas), o pagamento único com
 * vencimento no mês e a quitação feita no mês. Para casar com os lançamentos, use
 * `getLoanMonthImpactPosted` — esta aqui ignora o mês em que a parcela foi paga.
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
  if (loan.discountStart) {
    // Encurtar o período não apaga parcelas pagas, então elas podem passar do
    // fim registrado: o período mostrado acompanha a última parcela.
    const lastDate = isInstallmentLoan(loan)
      ? loan
          .installments!.map((i) => i.dueDate)
          .sort()
          .pop()
      : undefined;
    const lastMonth = lastDate ? monthKey(lastDate) : undefined;
    if (lastMonth && (!loan.discountEnd || lastMonth > loan.discountEnd)) {
      return { start: loan.discountStart, end: lastMonth };
    }
    return { start: loan.discountStart, end: loan.discountEnd };
  }
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
 *
 * Encurtar o período só descarta parcelas futuras: as pagas (e as canceladas)
 * sempre continuam, então o empréstimo nunca fica com menos parcelas do que a
 * última delas — do contrário o pagamento já feito desapareceria do contrato.
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
  const lastKept = previous.reduce(
    (last, p) => (p.paid || p.cancelled ? Math.max(last, p.number) : last),
    0
  );
  const totalCount = Math.min(120, Math.max(safeCount, lastKept));
  const fixedCents =
    installmentAmount !== undefined && installmentAmount > 0
      ? Math.round(installmentAmount * 100)
      : null;
  const totalCents = Math.round(total * 100);
  const baseCents = Math.floor(totalCents / totalCount);
  const remainder = totalCents - baseCents * totalCount;

  return Array.from({ length: totalCount }, (_, index) => {
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
