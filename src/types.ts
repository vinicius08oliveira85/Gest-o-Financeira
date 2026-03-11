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
}
