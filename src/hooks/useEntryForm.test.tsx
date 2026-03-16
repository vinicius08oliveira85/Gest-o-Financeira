import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useEntryForm } from './useEntryForm';
import type { Entry } from '../types';

describe('useEntryForm', () => {
  it('openForm(undefined) reseta campos', async () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();
    const { result } = renderHook(() => useEntryForm(onSubmit, onClose));

    await act(async () => {
      result.current.openForm({
        id: '1',
        name: 'Test',
        amount: 100,
        dueDate: '2025-03-15',
        isPaid: false,
        type: 'debt',
        createdAt: Date.now(),
      });
    });

    expect(result.current.name).toBe('Test');
    expect(result.current.amount).toBe('100');

    await act(async () => {
      result.current.openForm(undefined);
    });

    expect(result.current.name).toBe('');
    expect(result.current.amount).toBe('');
    expect(result.current.editingEntry).toBeNull();
  });

  it('openForm(entry) preenche campos', async () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();
    const entry: Entry = {
      id: 'e1',
      name: 'Aluguel',
      amount: 1500,
      dueDate: '2025-04-01',
      isPaid: false,
      type: 'debt',
      createdAt: Date.now(),
      category: 'Moradia',
    };

    const { result } = renderHook(() => useEntryForm(onSubmit, onClose));

    await act(async () => {
      result.current.openForm(entry);
    });

    expect(result.current.name).toBe('Aluguel');
    expect(result.current.amount).toBe('1500');
    expect(result.current.dueDate).toBe('2025-04-01');
    expect(result.current.type).toBe('debt');
    expect(result.current.category).toBe('Moradia');
    expect(result.current.editingEntry).toEqual(entry);
  });

  it('submit com dados preenchidos chama onSubmit com o entry esperado', async () => {
    const onSubmit = vi.fn();
    const onClose = vi.fn();
    const { result } = renderHook(() => useEntryForm(onSubmit, onClose));

    await act(async () => {
      result.current.openForm(undefined);
    });
    await act(async () => {
      result.current.setName('Receita');
      result.current.setAmount('200');
      result.current.setDueDate('2025-03-20');
      result.current.setType('cash');
    });

    await act(async () => {
      result.current.handleSubmit({
        preventDefault: () => {},
      } as React.FormEvent<HTMLFormElement>);
    });

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const [entry, isEdit] = onSubmit.mock.calls[0];
    expect(entry.name).toBe('Receita');
    expect(entry.amount).toBe(200);
    expect(entry.dueDate).toBe('2025-03-20');
    expect(entry.type).toBe('cash');
    expect(isEdit).toBe(false);
  });
});
