import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { Entry, FilterType } from '../types';
import { ENTRIES_STORAGE_KEY } from '../constants';
import { isSupabaseConfigured } from '../lib/supabase';
import { logError } from '../lib/logger';
import { parseDateLocal } from '../lib/format';
import {
  fetchEntries,
  insertEntriesBatch,
  syncEntriesDelta,
  bumpEntryUpdatedAt,
} from '../lib/entriesDb';
import { generateMissingRecurringCopies, copyDueDateForMonth } from '../lib/recurringEntries';

export function useEntries() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'dueDate' | 'amount' | 'name'>('dueDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [isLoading, setIsLoading] = useState(true);
  const [isMigrating, setIsMigrating] = useState(false);
  const [useSupabaseSync, setUseSupabaseSync] = useState(false);
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const entriesRef = useRef<Entry[]>([]);
  entriesRef.current = entries;
  /** Ids alterados localmente desde o último sync bem-sucedido (payload delta). */
  const dirtyEntryIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (isSupabaseConfigured()) {
        try {
          const data = await fetchEntries();
          if (!cancelled) {
            setEntries(data);
            dirtyEntryIdsRef.current.clear();
            setUseSupabaseSync(true);
          }
          const copies = generateMissingRecurringCopies(data);
          if (copies.length > 0 && !cancelled) {
            try {
              await insertEntriesBatch(copies);
              if (!cancelled) setEntries((prev) => [...prev, ...copies]);
            } catch (e) {
              logError('Failed to insert recurring copies', e);
            }
          }
          if (data.length === 0) {
            const saved = localStorage.getItem(ENTRIES_STORAGE_KEY);
            if (saved) {
              try {
                const parsed = JSON.parse(saved) as Entry[];
                if (Array.isArray(parsed) && parsed.length > 0 && !cancelled) {
                  if (!cancelled) setIsMigrating(true);
                  try {
                    await insertEntriesBatch(parsed);
                    const refetched = await fetchEntries();
                    if (!cancelled) {
                      setEntries(refetched);
                      dirtyEntryIdsRef.current.clear();
                    }
                    localStorage.removeItem(ENTRIES_STORAGE_KEY);
                  } finally {
                    if (!cancelled) setIsMigrating(false);
                  }
                }
              } catch {
                if (!cancelled) setIsMigrating(false);
                // ignore migration parse errors
              }
            }
          }
        } catch (e) {
          logError('Failed to load entries from Supabase', e);
          if (!cancelled) {
            setUseSupabaseSync(false);
            setShowOfflineBanner(true);
          }
          const saved = localStorage.getItem(ENTRIES_STORAGE_KEY);
          if (saved) {
            try {
              if (!cancelled) {
                const parsed = JSON.parse(saved) as Entry[];
                setEntries(parsed);
                dirtyEntryIdsRef.current = new Set(parsed.map((e) => e.id));
              }
            } catch {
              logError('Failed to parse localStorage entries', e);
            }
          } else if (!cancelled) {
            setEntries([]);
          }
        } finally {
          if (!cancelled) setIsLoading(false);
        }
      } else {
        const saved = localStorage.getItem(ENTRIES_STORAGE_KEY);
        if (saved) {
          try {
            const parsed = JSON.parse(saved) as Entry[];
            setEntries(parsed);
            dirtyEntryIdsRef.current = new Set(parsed.map((e) => e.id));
          } catch (e) {
            logError('Failed to parse entries', e);
          }
        }
        setIsLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const refetchEntries = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    try {
      const data = await fetchEntries();
      setEntries(data);
      dirtyEntryIdsRef.current.clear();
      setShowOfflineBanner(false);
    } catch (e) {
      logError('Failed to refetch entries', e);
      setShowOfflineBanner(true);
    }
  }, []);

  const saveEntriesLocal = useCallback(() => {
    try {
      localStorage.setItem(ENTRIES_STORAGE_KEY, JSON.stringify(entriesRef.current));
    } catch (e) {
      logError('Failed to save entries to localStorage', e);
      setSaveError('Não foi possível salvar localmente.');
    }
  }, []);

  const syncEntriesWithSupabase = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    setIsSyncing(true);
    setSaveError(null);
    try {
      const localSnapshot = entriesRef.current;
      const presentIds = localSnapshot.map((e) => e.id);
      const dirty = dirtyEntryIdsRef.current;
      const changedEntries = localSnapshot.filter((e) => dirty.has(e.id));
      await syncEntriesDelta(presentIds, changedEntries);
      let merged = await fetchEntries();
      const copies = generateMissingRecurringCopies(merged);
      if (copies.length > 0) {
        await insertEntriesBatch(copies);
        merged = await fetchEntries();
      }
      setEntries(merged);
      dirtyEntryIdsRef.current.clear();
      setUseSupabaseSync(true);
      setShowOfflineBanner(false);
    } catch (e) {
      logError('Falha na sincronização com Supabase', e);
      setSaveError('Falha ao sincronizar. Tente de novo.');
      setShowOfflineBanner(true);
      throw e;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    setSearchQuery('');
  }, [currentMonth, currentYear]);

  const filteredEntries = useMemo(() => {
    const byPeriod = entries.filter((d) => {
      const date = parseDateLocal(d.dueDate);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    let result = byPeriod;
    if (filter === 'pending') result = result.filter((d) => !d.isPaid);
    else if (filter === 'paid') result = result.filter((d) => d.isPaid);
    else if (filter === 'debt') result = result.filter((d) => d.type === 'debt');
    else if (filter === 'cash') result = result.filter((d) => d.type === 'cash');

    if (selectedCategory !== 'all') {
      result = result.filter((d) => d.category === selectedCategory);
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (d) => d.name.toLowerCase().includes(q) || String(d.amount).includes(q)
      );
    }

    const mult = sortOrder === 'asc' ? 1 : -1;
    result = [...result].sort((a, b) => {
      if (sortBy === 'dueDate') {
        return mult * (new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      }
      if (sortBy === 'amount') {
        return mult * (a.amount - b.amount);
      }
      return mult * a.name.localeCompare(b.name, 'pt-BR');
    });

    return result;
  }, [
    entries,
    filter,
    selectedCategory,
    searchQuery,
    sortBy,
    sortOrder,
    currentMonth,
    currentYear,
  ]);

  const entriesDoMes = useMemo(
    () =>
      entries.filter((d) => {
        const date = parseDateLocal(d.dueDate);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      }),
    [entries, currentMonth, currentYear]
  );

  const totalEntradasLancadas = useMemo(
    () => entries.filter((d) => d.type === 'cash').reduce((acc, d) => acc + d.amount, 0),
    [entries]
  );

  const totalSaidasLancadas = useMemo(
    () => entries.filter((d) => d.type === 'debt').reduce((acc, d) => acc + d.amount, 0),
    [entries]
  );

  const saldo = useMemo(() => {
    const entradasFinalizadas = entries
      .filter((d) => d.type === 'cash' && d.isPaid)
      .reduce((acc, d) => acc + d.amount, 0);
    const saidasFinalizadas = entries
      .filter((d) => d.type === 'debt' && d.isPaid)
      .reduce((acc, d) => acc + d.amount, 0);
    return entradasFinalizadas - saidasFinalizadas;
  }, [entries]);

  // Depósito na meta (cash+goalId) abate do caixa → conta como saída do mês
  // Saque da meta  (debt+goalId) retorna ao caixa → conta como entrada do mês
  const totalEntradasLancadasMes = useMemo(
    () =>
      entriesDoMes
        .filter((d) => (d.goalId ? d.type === 'debt' : d.type === 'cash'))
        .reduce((acc, d) => acc + d.amount, 0),
    [entriesDoMes]
  );

  const totalSaidasLancadasMes = useMemo(
    () =>
      entriesDoMes
        .filter((d) => (d.goalId ? d.type === 'cash' : d.type === 'debt'))
        .reduce((acc, d) => acc + d.amount, 0),
    [entriesDoMes]
  );

  const saldoMes = useMemo(() => {
    const entradasFinalizadas = entriesDoMes
      .filter((d) => d.isPaid && (d.goalId ? d.type === 'debt' : d.type === 'cash'))
      .reduce((acc, d) => acc + d.amount, 0);
    const saidasFinalizadas = entriesDoMes
      .filter((d) => d.isPaid && (d.goalId ? d.type === 'cash' : d.type === 'debt'))
      .reduce((acc, d) => acc + d.amount, 0);
    return entradasFinalizadas - saidasFinalizadas;
  }, [entriesDoMes]);

  const entradasCountMes = useMemo(
    () => entriesDoMes.filter((d) => (d.goalId ? d.type === 'debt' : d.type === 'cash')).length,
    [entriesDoMes]
  );
  const saidasCountMes = useMemo(
    () => entriesDoMes.filter((d) => (d.goalId ? d.type === 'cash' : d.type === 'debt')).length,
    [entriesDoMes]
  );

  const totalEntradasFinalizadasMes = useMemo(
    () =>
      entriesDoMes
        .filter((d) => d.isPaid && (d.goalId ? d.type === 'debt' : d.type === 'cash'))
        .reduce((acc, d) => acc + d.amount, 0),
    [entriesDoMes]
  );

  const totalEntradasPendentesMes = useMemo(
    () =>
      entriesDoMes
        .filter((d) => !d.isPaid && (d.goalId ? d.type === 'debt' : d.type === 'cash'))
        .reduce((acc, d) => acc + d.amount, 0),
    [entriesDoMes]
  );

  const totalSaidasFinalizadasMes = useMemo(
    () =>
      entriesDoMes
        .filter((d) => d.isPaid && (d.goalId ? d.type === 'cash' : d.type === 'debt'))
        .reduce((acc, d) => acc + d.amount, 0),
    [entriesDoMes]
  );

  const totalSaidasPendentesMes = useMemo(
    () =>
      entriesDoMes
        .filter((d) => !d.isPaid && (d.goalId ? d.type === 'cash' : d.type === 'debt'))
        .reduce((acc, d) => acc + d.amount, 0),
    [entriesDoMes]
  );

  const getSaldoForMonth = useCallback(
    (month: number, year: number) => {
      const inPeriod = (d: Entry) => {
        const date = parseDateLocal(d.dueDate);
        return date.getMonth() === month && date.getFullYear() === year;
      };
      const entradas = entries
        .filter(
          (d) => d.isPaid && inPeriod(d) && (d.goalId ? d.type === 'debt' : d.type === 'cash')
        )
        .reduce((acc, d) => acc + d.amount, 0);
      const saidas = entries
        .filter(
          (d) => d.isPaid && inPeriod(d) && (d.goalId ? d.type === 'cash' : d.type === 'debt')
        )
        .reduce((acc, d) => acc + d.amount, 0);
      return entradas - saidas;
    },
    [entries]
  );

  const getMetaBalanceForGoal = useCallback(
    (goalId: string) => {
      return entries
        .filter((e) => e.goalId === goalId && e.isPaid)
        .reduce((sum, e) => sum + (e.type === 'cash' ? e.amount : -e.amount), 0);
    },
    [entries]
  );

  const entradasCount = useMemo(() => entries.filter((d) => d.type === 'cash').length, [entries]);
  const saidasCount = useMemo(() => entries.filter((d) => d.type === 'debt').length, [entries]);

  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    for (const entry of entries) {
      if (entry.category) {
        set.add(entry.category);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [entries]);

  function goToPreviousMonth() {
    setCurrentMonth((prev) => {
      if (prev === 0) {
        setCurrentYear((y) => y - 1);
        return 11;
      }
      return prev - 1;
    });
  }

  function goToNextMonth() {
    setCurrentMonth((prev) => {
      if (prev === 11) {
        setCurrentYear((y) => y + 1);
        return 0;
      }
      return prev + 1;
    });
  }

  function goToCurrentMonth() {
    const now = new Date();
    setCurrentMonth(now.getMonth());
    setCurrentYear(now.getFullYear());
  }

  function addOrUpdateEntry(entry: Entry, isEdit: boolean): Promise<void> {
    if (isEdit) {
      dirtyEntryIdsRef.current.add(entry.id);
      setEntries((prev) => prev.map((e) => (e.id === entry.id ? bumpEntryUpdatedAt(entry) : e)));
      return Promise.resolve();
    }
    const stamped = bumpEntryUpdatedAt(entry);
    dirtyEntryIdsRef.current.add(stamped.id);
    setEntries((prev) => {
      const newList = [stamped, ...prev];
      if (!stamped.isRecurring) return newList;
      const copies = generateMissingRecurringCopies(newList);
      for (const c of copies) {
        dirtyEntryIdsRef.current.add(c.id);
      }
      return copies.length > 0 ? [...newList, ...copies] : newList;
    });
    return Promise.resolve();
  }

  const togglePaid = useCallback((id: string) => {
    dirtyEntryIdsRef.current.add(id);
    setEntries((prev) =>
      prev.map((e) => {
        if (e.id !== id) return e;
        const nextPaid = !e.isPaid;
        const paidDate = nextPaid ? new Date().toISOString().slice(0, 10) : undefined;
        return bumpEntryUpdatedAt({ ...e, isPaid: nextPaid, paidDate });
      })
    );
  }, []);

  const deleteEntry = useCallback((id: string) => {
    dirtyEntryIdsRef.current.delete(id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const updateRecurringApplyToAll = useCallback((updatedEntry: Entry) => {
    setEntries((prev) => {
      const modelId = updatedEntry.recurrenceTemplateId ?? updatedEntry.id;
      const toUpdate = prev.filter((e) => e.id === modelId || e.recurrenceTemplateId === modelId);
      const merged = toUpdate.map((e) => {
        const isModel = e.id === modelId;
        const dueDate = isModel
          ? updatedEntry.dueDate
          : (() => {
              const d = parseDateLocal(e.dueDate);
              return copyDueDateForMonth(updatedEntry.dueDate, d.getMonth(), d.getFullYear());
            })();
        return bumpEntryUpdatedAt({
          ...e,
          name: updatedEntry.name,
          amount: updatedEntry.amount,
          dueDate,
          category: updatedEntry.category,
          tag: updatedEntry.tag,
        });
      });
      for (const m of merged) {
        dirtyEntryIdsRef.current.add(m.id);
      }
      return prev.map((e) => {
        const u = merged.find((m) => m.id === e.id);
        return u ?? e;
      });
    });
  }, []);

  const deleteRecurringModel = useCallback((id: string, deleteAllCopies: boolean) => {
    setEntries((prev) => {
      const entry = prev.find((e) => e.id === id);
      if (!entry) return prev;
      const toRemove =
        deleteAllCopies && entry.isRecurring && !entry.recurrenceTemplateId
          ? prev.filter((e) => e.id === id || e.recurrenceTemplateId === id)
          : [entry];
      const ids = new Set(toRemove.map((e) => e.id));
      for (const rid of ids) {
        dirtyEntryIdsRef.current.delete(rid);
      }
      return prev.filter((e) => !ids.has(e.id));
    });
  }, []);

  return {
    entries,
    setEntries,
    filter,
    setFilter,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    selectedCategory,
    setSelectedCategory,
    currentMonth,
    currentYear,
    goToPreviousMonth,
    goToNextMonth,
    goToCurrentMonth,
    filteredEntries,
    entriesDoMes,
    totalEntradasLancadas,
    totalSaidasLancadas,
    saldo,
    entradasCount,
    saidasCount,
    totalEntradasLancadasMes,
    totalSaidasLancadasMes,
    saldoMes,
    entradasCountMes,
    saidasCountMes,
    totalEntradasFinalizadasMes,
    totalEntradasPendentesMes,
    totalSaidasFinalizadasMes,
    totalSaidasPendentesMes,
    isLoading,
    isMigrating,
    useSupabaseSync,
    showOfflineBanner,
    setShowOfflineBanner,
    saveError,
    setSaveError,
    addOrUpdateEntry,
    togglePaid,
    pendingPaidId: null,
    deleteEntry,
    updateRecurringApplyToAll,
    deleteRecurringModel,
    availableCategories,
    refetchEntries,
    getSaldoForMonth,
    getMetaBalanceForGoal,
    saveEntriesLocal,
    syncEntriesWithSupabase,
    isSyncing,
    entriesSyncAvailable: isSupabaseConfigured(),
  };
}
