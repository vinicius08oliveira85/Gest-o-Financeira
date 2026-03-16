import React, { useState, useCallback } from 'react';
import type { Entry, EntryType } from '../types';
import { generateInstallmentEntries } from '../lib/installments';

export function useEntryForm(
  onSubmit: (entry: Entry, isEdit: boolean) => void,
  onClose: () => void,
  options?: { onEditRecurring?: (entry: Entry) => void }
) {
  const onEditRecurring = options?.onEditRecurring;
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [type, setType] = useState<EntryType>('debt');
  const [category, setCategory] = useState('');
  const [tag, setTag] = useState('');
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentsCount, setInstallmentsCount] = useState('2');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceCount, setRecurrenceCount] = useState('');

  function closeForm() {
    setName('');
    setAmount('');
    setDueDate('');
    setType('debt');
    setCategory('');
    setTag('');
    setIsInstallment(false);
    setInstallmentsCount('2');
    setIsRecurring(false);
    setRecurrenceCount('');
    setEditingEntry(null);
    onClose();
  }

  const openForm = useCallback((entry?: Entry) => {
    if (entry) {
      setEditingEntry(entry);
      setName(entry.name);
      setAmount(entry.amount.toString());
      setDueDate(entry.dueDate);
      setType(entry.type);
      setCategory(entry.category ?? '');
      setTag(entry.tag ?? '');
      setIsInstallment(false);
      setInstallmentsCount('2');
      setIsRecurring(entry.isRecurring ?? false);
      setRecurrenceCount(entry.recurrenceCount != null ? String(entry.recurrenceCount) : '');
    } else {
      setEditingEntry(null);
      setName('');
      setAmount('');
      setDueDate('');
      setType('debt');
      setCategory('');
      setTag('');
      setIsInstallment(false);
      setInstallmentsCount('2');
      setIsRecurring(false);
      setRecurrenceCount('');
    }
  }, []);

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
        category: category || undefined,
        tag: tag || undefined,
        isRecurring: isRecurring || undefined,
        recurrenceCount: isRecurring
          ? recurrenceCount
            ? parseInt(recurrenceCount, 10)
            : null
          : editingEntry.recurrenceCount,
        recurrenceTemplateId: editingEntry.recurrenceTemplateId,
      };
      const isRecurringEdit =
        editingEntry.isRecurring === true || !!editingEntry.recurrenceTemplateId;
      if (isRecurringEdit && onEditRecurring) {
        onEditRecurring(updated);
        closeForm();
      } else {
        onSubmit(updated, true);
        closeForm();
      }
    } else {
      if (isInstallment) {
        const count = parseInt(installmentsCount, 10);
        if (Number.isNaN(count) || count <= 1) {
          // se inválido, cai para criação simples
          const single: Entry = {
            id: crypto.randomUUID(),
            name,
            amount: parseFloat(amount),
            dueDate,
            isPaid: false,
            type,
            createdAt: Date.now(),
            category: category || undefined,
            tag: tag || undefined,
          };
          onSubmit(single, false);
        } else {
          const entries = generateInstallmentEntries({
            name,
            amountPerInstallment: parseFloat(amount),
            firstDueDate: dueDate,
            type,
            category: category || undefined,
            tag: tag || undefined,
            count,
          });
          for (const entry of entries) {
            onSubmit(entry, false);
          }
        }
      } else {
        const newEntry: Entry = {
          id: crypto.randomUUID(),
          name,
          amount: parseFloat(amount),
          dueDate,
          isPaid: false,
          type,
          createdAt: Date.now(),
          category: category || undefined,
          tag: tag || undefined,
          isRecurring: isRecurring || undefined,
          recurrenceCount: isRecurring
            ? recurrenceCount
              ? parseInt(recurrenceCount, 10)
              : null
            : undefined,
          recurrenceTemplateId: undefined,
        };
        onSubmit(newEntry, false);
      }
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
    isInstallment,
    setIsInstallment,
    installmentsCount,
    setInstallmentsCount,
    category,
    setCategory,
    tag,
    setTag,
    isRecurring,
    setIsRecurring,
    recurrenceCount,
    setRecurrenceCount,
    closeForm,
    openForm,
    handleSubmit,
  };
}
