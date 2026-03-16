export type EntryType = 'debt' | 'cash';

export interface Entry {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  isPaid: boolean; // For cash, this could mean "received"
  type: EntryType;
  createdAt: number;
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
}

export type FilterType = 'all' | 'pending' | 'paid' | 'debt' | 'cash';

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  category?: string;
  month: number;
  year: number;
  /** Data alvo (atingir até), ISO date */
  targetDate?: string;
}
