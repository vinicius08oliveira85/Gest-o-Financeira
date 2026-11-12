export type EntryType = 'debt' | 'cash';

export interface Entry {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  isPaid: boolean; // For cash, this could mean "received"
  type: EntryType;
  createdAt: number;
  /** Última alteração lógica (ms); usado no merge de sincronização com o Appwrite */
  updatedAt?: number;
  /** Revisão otimista vinda do servidor (incrementa a cada escrita aplicada); 0 = novo local ainda não persistido */
  revision?: number;
  category?: string;
  tag?: string;
  installmentsCount?: number;
  installmentNumber?: number;
  parentInstallmentId?: string;
  /** Modelo recorrente; cópias geradas têm recurrenceTemplateId = id do modelo */
  isRecurring?: boolean;
  /** Quantidade de repetições (null = indefinido) */
  recurrenceCount?: number | null;
  /** Preenchido nas cópias: id do lançamento modelo */
  recurrenceTemplateId?: string;
  /** Lançamento de depósito/saque na meta; preenchido quando o valor compõe a meta */
  goalId?: string;
  /** Data do pagamento efetivo, ISO date (preenchida quando isPaid = true) */
  paidDate?: string;
  /** FK para CreditCard quando o lançamento representa uma fatura gerada */
  cardId?: string;
  /** true quando o lançamento é uma fatura de cartão gerada automaticamente */
  isCardInvoice?: boolean;
  /** Data de vencimento do pagamento (mês seguinte ao ciclo); dueDate é o fechamento no ciclo */
  invoicePaymentDueDate?: string;
}

export type FilterType = 'all' | 'pending' | 'paid' | 'debt' | 'cash';

export interface CreditCard {
  id: string;
  name: string;
  limitAmount: number;
  /** Dia do mês em que a fatura fecha (ex: 25) */
  closingDay: number;
  /** Dia do mês em que a fatura vence no mês seguinte (ex: 5) */
  dueDay: number;
  color?: string;
  createdAt?: string;
}

export interface CardExpense {
  id: string;
  cardId: string;
  name: string;
  amount: number;
  /** Data da compra, ISO date */
  date: string;
  /** Mês da fatura (0-11) */
  billingMonth: number;
  /** Ano da fatura */
  billingYear: number;
  category?: string;
  tag?: string;
  installmentsCount?: number;
  installmentNumber?: number;
  parentInstallmentId?: string;
  createdAt: number;
}

/** De onde vem o dinheiro para pagar o empréstimo */
export type LoanSourceType = 'pessoa_fisica' | 'trabalhador';

/** Parcela de um empréstimo parcelado */
export interface LoanInstallment {
  /** 1-based */
  number: number;
  amount: number;
  /** Vencimento da parcela, ISO date */
  dueDate: string;
  paid: boolean;
  /** Parcela cancelada: não conta como em aberto nem gera lançamento */
  cancelled?: boolean;
  /** Data do pagamento, ISO date */
  paidDate?: string;
  /** id do lançamento de saída criado ao marcar a parcela como paga (permite desmarcar) */
  entryId?: string;
}

/** Quitação antecipada: paga o saldo de uma vez e cancela as parcelas seguintes. */
export interface LoanSettlement {
  /** Valor efetivamente pago à vista */
  amount: number;
  /** Data do pagamento, ISO date */
  date: string;
  /** id do lançamento de saída criado na quitação */
  entryId?: string;
  /** Parcelas canceladas pela quitação (permite desfazer) */
  cancelledNumbers?: number[];
}

export interface Loan {
  id: string;
  name: string;
  /** Valor contratado do empréstimo (sem juros); a soma das parcelas pode ser maior */
  amount: number;
  sourceType: LoanSourceType;
  /** Nome da pessoa ou da empresa que empresta (opcional) */
  sourceName?: string;
  /** Data prevista para o pagamento, ISO date */
  dueDate: string;
  /** Já foi pago (num parcelado: todas as parcelas pagas) */
  paid: boolean;
  createdAt: number;
  /** Mês em que o desconto começa, YYYY-MM */
  discountStart?: string;
  /** Mês em que o desconto termina, YYYY-MM (ausente = segue até quitar) */
  discountEnd?: string;
  /** Número de parcelas; ausente ou 1 = pagamento único */
  installmentsCount?: number;
  /** Parcelas geradas quando `installmentsCount` > 1 */
  installments?: LoanInstallment[];
  /** Preenchido quando o empréstimo foi quitado antecipadamente */
  settlement?: LoanSettlement;
}

/** Item da lista de desejos (o que se pretende comprar) */
export interface WishlistItem {
  id: string;
  name: string;
  amount: number;
  /** Link do produto/site (opcional) */
  url?: string;
  /** true quando já foi comprado */
  purchased: boolean;
  /** Data da compra, ISO date */
  purchasedAt?: string;
  /** id do lançamento de saída criado ao marcar como comprado (permite desfazer) */
  entryId?: string;
  createdAt: number;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  category?: string;
  /** Data alvo (atingir até), ISO date */
  targetDate?: string;
  /** Data de criação ISO date, para ordenação */
  createdAt?: string;
}
