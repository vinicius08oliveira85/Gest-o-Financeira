export type EntryType = 'debt' | 'cash';

export interface Entry {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  isPaid: boolean; // For cash, this could mean "received"
  type: EntryType;
  createdAt: number;
  /** Última alteração lógica (ms); usado no merge de sincronização com o Supabase */
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
