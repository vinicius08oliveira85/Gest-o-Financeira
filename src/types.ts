export type EntryType = 'debt' | 'cash';

export interface Entry {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  isPaid: boolean; // For cash, this could mean "received"
  type: EntryType;
  createdAt: number;
}

export type FilterType = 'all' | 'pending' | 'paid' | 'debt' | 'cash';
