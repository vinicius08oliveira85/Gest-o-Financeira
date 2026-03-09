import { useState, useEffect, useMemo } from 'react';
import type { Entry, FilterType } from '../types';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  fetchEntries,
  insertEntry,
  updateEntry,
  updateEntryIsPaid,
  deleteEntry as deleteEntryDb,
} from '../lib/entriesDb';

const STORAGE_KEY = 'personal-debts';

export function useEntries() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [isLoading, setIsLoading] = useState(true);
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
          if (data.length === 0) {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
              try {
                const parsed = JSON.parse(saved) as Entry[];
                if (Array.isArray(parsed) && parsed.length > 0 && !cancelled) {
                  for (const entry of parsed) {
                    await insertEntry(entry);
                  }
                  const refetched = await fetchEntries();
                  if (!cancelled) setEntries(refetched);
                  localStorage.removeItem(STORAGE_KEY);
                }
              } catch {
                // ignore migration parse errors
              }
            }
          }
        } catch (e) {
          console.error('Failed to load entries from Supabase', e);
          if (!cancelled) {
            setUseSupabaseSync(false);
            setShowOfflineBanner(true);
          }
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) {
            try {
              if (!cancelled) setEntries(JSON.parse(saved));
            } catch {
              console.error('Failed to parse localStorage entries', e);
            }
          } else if (!cancelled) {
            setEntries([]);
          }
        } finally {
          if (!cancelled) setIsLoading(false);
        }
      } else {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          try {
            setEntries(JSON.parse(saved));
          } catch (e) {
            console.error('Failed to parse entries', e);
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

  useEffect(() => {
    if (!isSupabaseConfigured() || !useSupabaseSync) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    }
  }, [entries, useSupabaseSync]);

  const filteredEntries = useMemo(() => {
    let result = entries;
    if (filter === 'pending') result = result.filter((d) => !d.isPaid);
    else if (filter === 'paid') result = result.filter((d) => d.isPaid);
    else if (filter === 'debt') result = result.filter((d) => d.type === 'debt');
    else if (filter === 'cash') result = result.filter((d) => d.type === 'cash');
    return result;
  }, [entries, filter]);

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

  const entradasCount = useMemo(
    () => entries.filter((d) => d.type === 'cash').length,
    [entries]
  );
  const saidasCount = useMemo(
    () => entries.filter((d) => d.type === 'debt').length,
    [entries]
  );

  function addOrUpdateEntry(entry: Entry, isEdit: boolean) {
    if (isEdit) {
      const previous = entries;
      setEntries(entries.map((e) => (e.id === entry.id ? entry : e)));
      if (useSupabaseSync) {
        updateEntry(entry).catch((err) => {
          console.error('Erro ao salvar no Supabase', err);
          setSaveError('Falha ao salvar. Tente de novo.');
          setEntries(previous);
        });
      }
    } else {
      setEntries([entry, ...entries]);
      if (useSupabaseSync) {
        insertEntry(entry).catch((err) => {
          console.error('Erro ao salvar no Supabase', err);
          setSaveError('Falha ao salvar. Tente de novo.');
          setEntries((prev) => prev.filter((e) => e.id !== entry.id));
        });
      }
    }
  }

  function togglePaid(id: string) {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;
    const nextPaid = !entry.isPaid;
    const previous = entries;
    setEntries(entries.map((e) => (e.id === id ? { ...e, isPaid: nextPaid } : e)));
    if (useSupabaseSync) {
      updateEntryIsPaid(id, nextPaid).catch((err) => {
        console.error('Erro ao atualizar no Supabase', err);
        setSaveError('Falha ao atualizar. Tente de novo.');
        setEntries(previous);
      });
    }
  }

  function deleteEntry(id: string) {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;
    setEntries(entries.filter((e) => e.id !== id));
    if (useSupabaseSync) {
      deleteEntryDb(id).catch((err) => {
        console.error('Erro ao excluir no Supabase', err);
        setSaveError('Falha ao excluir. Tente de novo.');
        setEntries((prev) => [...prev, entry]);
      });
    }
  }

  return {
    entries,
    setEntries,
    filter,
    setFilter,
    filteredEntries,
    totalEntradasLancadas,
    totalSaidasLancadas,
    saldo,
    entradasCount,
    saidasCount,
    isLoading,
    useSupabaseSync,
    showOfflineBanner,
    setShowOfflineBanner,
    saveError,
    setSaveError,
    addOrUpdateEntry,
    togglePaid,
    deleteEntry,
  };
}
