import React, { useState } from 'react';
import type { Entry, EntryType } from '../types';

export function useEntryForm(
  onSubmit: (entry: Entry, isEdit: boolean) => void,
  onClose: () => void
) {
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [type, setType] = useState<EntryType>('debt');

  function closeForm() {
    setName('');
    setAmount('');
    setDueDate('');
    setType('debt');
    setEditingEntry(null);
    onClose();
  }

  function openForm(entry?: Entry) {
    if (entry) {
      setEditingEntry(entry);
      setName(entry.name);
      setAmount(entry.amount.toString());
      setDueDate(entry.dueDate);
      setType(entry.type);
    } else {
      setEditingEntry(null);
      setName('');
      setAmount('');
      setDueDate('');
      setType('debt');
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !amount || !dueDate) return;

    if (editingEntry) {
      const updated: Entry = {
        ...editingEntry,
        name,
        amount: parseFloat(amount),
        dueDate,
        type,
      };
      onSubmit(updated, true);
      closeForm();
    } else {
      const newEntry: Entry = {
        id: crypto.randomUUID(),
        name,
        amount: parseFloat(amount),
        dueDate,
        isPaid: false,
        type,
        createdAt: Date.now(),
      };
      onSubmit(newEntry, false);
      closeForm();
    }
  }

  return {
    editingEntry,
    name,
    setName,
    amount,
    setAmount,
    dueDate,
    setDueDate,
    type,
    setType,
    closeForm,
    openForm,
    handleSubmit,
  };
}
