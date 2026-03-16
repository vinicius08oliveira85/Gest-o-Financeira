import { useState, useEffect, useMemo, useCallback } from 'react';
import type { Entry, FilterType } from '../types';
import { ENTRIES_STORAGE_KEY } from '../constants';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { logError } from '../lib/logger';
import {
  fetchEntries,
  insertEntry,
  insertEntriesBatch,
  updateEntry,
  updateEntryIsPaid,
  deleteEntry as deleteEntryDb,
} from '../lib/entriesDb';
import { generateMissingRecurringCopies } from '../lib/recurringEntries';

export function useEntries() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [currentMonth, setCurrentMonth] = useState<number>(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const [isLoading, setIsLoading] = useState(true);
  const [isMigrating, setIsMigrating] = useState(false);
  const [useSupabaseSync, setUseSupabaseSync] = useState(false);
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (isSupabaseConfigured()) {
        try {
          const data = await fetchEntries();
          if (!cancelled) {
            setEntries(data);
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
                    if (!cancelled) setEntries(refetched);
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
              if (!cancelled) setEntries(JSON.parse(saved));
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
            setEntries(JSON.parse(saved));
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
      setShowOfflineBanner(false);
    } catch (e) {
      logError('Failed to refetch entries', e);
      setShowOfflineBanner(true);
    }
  }, []);

  useEffect(() => {
    if (!useSupabaseSync || !supabase) return;
    let cancelled = false;
    const channel = supabase
      .channel('entries-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entries' }, async () => {
        if (cancelled) return;
        try {
          const data = await fetchEntries();
          if (!cancelled) setEntries(data);
        } catch (e) {
          logError('Realtime: failed to refetch entries', e);
        }
      })
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [useSupabaseSync]);

  useEffect(() => {
    if (!isSupabaseConfigured() || !useSupabaseSync) {
      localStorage.setItem(ENTRIES_STORAGE_KEY, JSON.stringify(entries));
    }
  }, [entries, useSupabaseSync]);

  const filteredEntries = useMemo(() => {
    const byPeriod = entries.filter((d) => {
      const date = new Date(d.dueDate);
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

    return result;
  }, [entries, filter, selectedCategory, currentMonth, currentYear]);

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

  const getSaldoForMonth = useCallback(
    (month: number, year: number) => {
      const inPeriod = (d: Entry) => {
        const date = new Date(d.dueDate);
        return date.getMonth() === month && date.getFullYear() === year;
      };
      const entradas = entries
        .filter((d) => d.type === 'cash' && d.isPaid && inPeriod(d))
        .reduce((acc, d) => acc + d.amount, 0);
      const saidas = entries
        .filter((d) => d.type === 'debt' && d.isPaid && inPeriod(d))
        .reduce((acc, d) => acc + d.amount, 0);
      return entradas - saidas;
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

  function addOrUpdateEntry(entry: Entry, isEdit: boolean) {
    if (isEdit) {
      const previous = entries;
      setEntries(entries.map((e) => (e.id === entry.id ? entry : e)));
      if (useSupabaseSync) {
        updateEntry(entry).catch((err) => {
          logError('Erro ao salvar no Supabase', err);
          setSaveError('Falha ao salvar. Tente de novo.');
          setEntries(previous);
        });
      }
    } else {
      const newList = [entry, ...entries];
      setEntries(newList);
      if (useSupabaseSync) {
        insertEntry(entry)
          .then(async () => {
            if (entry.isRecurring) {
              const copies = generateMissingRecurringCopies(newList);
              if (copies.length > 0) {
                await insertEntriesBatch(copies);
                setEntries((prev) => [...prev, ...copies]);
              }
            }
          })
          .catch((err) => {
            logError('Erro ao salvar no Supabase', err);
            setSaveError('Falha ao salvar. Tente de novo.');
            setEntries((prev) => prev.filter((e) => e.id !== entry.id));
          });
      } else if (entry.isRecurring) {
        const copies = generateMissingRecurringCopies(newList);
        if (copies.length > 0) setEntries((prev) => [...prev, ...copies]);
      }
    }
  }

  const togglePaid = useCallback(
    (id: string) => {
      const entry = entries.find((e) => e.id === id);
      if (!entry) return;
      const nextPaid = !entry.isPaid;
      const previous = entries;
      setEntries(entries.map((e) => (e.id === id ? { ...e, isPaid: nextPaid } : e)));
      if (useSupabaseSync) {
        updateEntryIsPaid(id, nextPaid).catch((err) => {
          logError('Erro ao atualizar no Supabase', err);
          setSaveError('Falha ao atualizar. Tente de novo.');
          setEntries(previous);
        });
      }
    },
    [entries, useSupabaseSync]
  );

  const deleteEntry = useCallback(
    (id: string) => {
      const entry = entries.find((e) => e.id === id);
      if (!entry) return;
      setEntries(entries.filter((e) => e.id !== id));
      if (useSupabaseSync) {
        deleteEntryDb(id).catch((err) => {
          logError('Erro ao excluir no Supabase', err);
          setSaveError('Falha ao excluir. Tente de novo.');
          setEntries((prev) => [...prev, entry]);
        });
      }
    },
    [entries, useSupabaseSync]
  );

  const updateRecurringApplyToAll = useCallback(
    (updatedEntry: Entry) => {
      const modelId = updatedEntry.recurrenceTemplateId ?? updatedEntry.id;
      const toUpdate = entries.filter(
        (e) => e.id === modelId || e.recurrenceTemplateId === modelId
      );
      const merged = toUpdate.map((e) => ({
        ...e,
        name: updatedEntry.name,
        amount: updatedEntry.amount,
        category: updatedEntry.category,
        tag: updatedEntry.tag,
      }));
      setEntries(
        entries.map((e) => {
          const u = merged.find((m) => m.id === e.id);
          return u ?? e;
        })
      );
      if (useSupabaseSync) {
        Promise.all(merged.map((u) => updateEntry(u))).catch((err) => {
          logError('Erro ao atualizar recorrentes no Supabase', err);
          setSaveError('Falha ao salvar. Tente de novo.');
        });
      }
    },
    [entries, useSupabaseSync]
  );

  const deleteRecurringModel = useCallback(
    (id: string, deleteAllCopies: boolean) => {
      const entry = entries.find((e) => e.id === id);
      if (!entry) return;
      const toRemove =
        deleteAllCopies && entry.isRecurring && !entry.recurrenceTemplateId
          ? entries.filter((e) => e.id === id || e.recurrenceTemplateId === id)
          : [entry];
      const ids = new Set(toRemove.map((e) => e.id));
      setEntries(entries.filter((e) => !ids.has(e.id)));
      if (useSupabaseSync) {
        Promise.all(toRemove.map((e) => deleteEntryDb(e.id))).catch((err) => {
          logError('Erro ao excluir no Supabase', err);
          setSaveError('Falha ao excluir. Tente de novo.');
          setEntries((prev) => [...prev, ...toRemove]);
        });
      }
    },
    [entries, useSupabaseSync]
  );

  return {
    entries,
    setEntries,
    filter,
    setFilter,
    selectedCategory,
    setSelectedCategory,
    currentMonth,
    currentYear,
    goToPreviousMonth,
    goToNextMonth,
    filteredEntries,
    totalEntradasLancadas,
    totalSaidasLancadas,
    saldo,
    entradasCount,
    saidasCount,
    isLoading,
    isMigrating,
    useSupabaseSync,
    showOfflineBanner,
    setShowOfflineBanner,
    saveError,
    setSaveError,
    addOrUpdateEntry,
    togglePaid,
    deleteEntry,
    updateRecurringApplyToAll,
    deleteRecurringModel,
    availableCategories,
    refetchEntries,
    getSaldoForMonth,
  };
}
