import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { Entry, FilterType } from '../types';
import { ENTRIES_STORAGE_KEY, RECURRING_SUPPRESSED_SLOTS_KEY } from '../constants';
import { isSupabaseConfigured } from '../lib/supabase';
import { logError } from '../lib/logger';
import { parseDateLocal, todayLocalISO } from '../lib/format';
import {
  fetchEntries,
  insertEntriesBatch,
  syncEntriesDelta,
  bumpEntryUpdatedAt,
} from '../lib/entriesDb';
import {
  generateMissingRecurringCopies,
  copyDueDateForMonth,
  recurringSlotKey,
} from '../lib/recurringEntries';
import { propagateEntryInstallmentUpdate } from '../lib/installments';
import { readStored, writeStored } from '../lib/storage';
import { mergeUnconfirmed } from '../lib/recovery';

/** Espera após a última alteração antes de gravar automaticamente no Supabase. */
const AUTO_SYNC_DEBOUNCE_MS = 1500;

function readSuppressedRecurringSlots(): Set<string> {
  try {
    const raw = localStorage.getItem(RECURRING_SUPPRESSED_SLOTS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function persistSuppressedRecurringSlots(slots: Set<string>) {
  try {
    localStorage.setItem(RECURRING_SUPPRESSED_SLOTS_KEY, JSON.stringify([...slots]));
  } catch (e) {
    logError('Failed to save suppressed recurring slots', e);
  }
}

function clearSuppressedSlotsForTemplate(slots: Set<string>, templateId: string) {
  for (const key of [...slots]) {
    if (key.startsWith(`${templateId}|`)) slots.delete(key);
  }
  persistSuppressedRecurringSlots(slots);
}

/** Busca do servidor e preenche cópias recorrentes em falta, exceto meses suprimidos pelo utilizador. */
async function fetchMergedWithRecurringRespectSuppressed(
  suppressedSlots: ReadonlySet<string>
): Promise<Entry[]> {
  let merged = await fetchEntries();
  const copies = generateMissingRecurringCopies(merged, suppressedSlots);
  if (copies.length > 0) {
    await insertEntriesBatch(copies);
    merged = await fetchEntries();
  }
  return merged;
}

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
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);
  /** Nuvem configurada mas fora do ar (falha real de fetch/push/pull). Só volta a
   * false após uma operação bem-sucedida — dispensar o banner não "religa" a nuvem. */
  const [isCloudUnavailable, setIsCloudUnavailable] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const entriesRef = useRef<Entry[]>([]);
  entriesRef.current = entries;
  /** Aplica uma nova lista mantendo entriesRef sincronizado (permite acumular várias mudanças no mesmo tick). */
  const commitEntries = useCallback((next: Entry[]) => {
    entriesRef.current = next;
    setEntries(next);
  }, []);
  /** Ids alterados localmente desde o último sync bem-sucedido (payload delta). */
  const dirtyEntryIdsRef = useRef<Set<string>>(new Set());
  /** Ids removidos localmente desde o último sync (propagação explícita de deleção, sem "delete cego"). */
  const deletedEntryIdsRef = useRef<Set<string>>(new Set());
  /** Cópias de recorrência apagadas manualmente: não voltar a gerar após salvar/sincronizar. */
  const suppressedRecurringSlotsRef = useRef<Set<string>>(readSuppressedRecurringSlots());
  /** Evita dois pushes concorrentes (autosave + botão manual + retomada de foco). */
  const syncInFlightRef = useRef(false);
  /** Timer do autosave remoto; reiniciado a cada alteração local. */
  const autoSyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * Versão de cada id pendente. Se o utilizador alterar o mesmo lançamento enquanto
   * o push está em curso, a versão muda e a alteração não é apagada pelo retorno
   * do servidor (fica pendente para o próximo sync).
   */
  const dirtyEntryVersionsRef = useRef<Map<string, number>>(new Map());

  const markEntryDirty = useCallback((id: string) => {
    dirtyEntryIdsRef.current.add(id);
    dirtyEntryVersionsRef.current.set(id, (dirtyEntryVersionsRef.current.get(id) ?? 0) + 1);
  }, []);

  const clearDirtyEntry = useCallback((id: string) => {
    dirtyEntryIdsRef.current.delete(id);
    dirtyEntryVersionsRef.current.delete(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (isSupabaseConfigured()) {
        try {
          const data = await fetchEntries();
          // Lê o espelho local ANTES de sobrescrever o estado: quando a nuvem devolve
          // ao menos uma linha, o backup local era ignorado e lançamentos que só
          // existiam neste dispositivo sumiam do nada.
          const saved = await readStored<Entry>(ENTRIES_STORAGE_KEY);
          const localOnly = saved.filter((e) => !data.some((d) => d.id === e.id));

          if (!cancelled) {
            setEntries(data);
            setIsCloudUnavailable(false);
          }
          // Ids locais ainda não confirmados pela nuvem continuam pendentes para o
          // próximo save; só os confirmados pela resposta são limpos.
          dirtyEntryIdsRef.current = new Set(localOnly.map((e) => e.id));
          dirtyEntryVersionsRef.current.clear();

          const copies = generateMissingRecurringCopies(data, suppressedRecurringSlotsRef.current);
          if (copies.length > 0 && !cancelled) {
            try {
              await insertEntriesBatch(copies);
              if (!cancelled) setEntries((prev) => [...prev, ...copies]);
            } catch (e) {
              logError('Failed to insert recurring copies', e);
            }
          }
          if (localOnly.length > 0) {
            if (!cancelled) setIsMigrating(true);
            try {
              await insertEntriesBatch(localOnly);
              const refetched = await fetchEntries();
              if (!cancelled) {
                // O que o servidor recusou continua visível e pendente.
                const merged = mergeUnconfirmed(refetched, localOnly);
                setEntries(merged);
                dirtyEntryIdsRef.current = new Set(
                  merged.filter((e) => localOnly.some((l) => l.id === e.id)).map((e) => e.id)
                );
                setIsCloudUnavailable(false);
              }
            } finally {
              if (!cancelled) setIsMigrating(false);
            }
          } else {
            dirtyEntryIdsRef.current.clear();
            dirtyEntryVersionsRef.current.clear();
          }
        } catch (e) {
          logError('Failed to load entries from Supabase', e);
          if (!cancelled) {
            setShowOfflineBanner(true);
            setIsCloudUnavailable(true);
          }
          const saved = await readStored<Entry>(ENTRIES_STORAGE_KEY);
          if (saved.length > 0 && !cancelled) {
            setEntries(saved);
            dirtyEntryIdsRef.current = new Set(saved.map((e) => e.id));
            dirtyEntryVersionsRef.current.clear();
          } else if (!cancelled) {
            setEntries([]);
          }
        } finally {
          if (!cancelled) setIsLoading(false);
        }
      } else {
        const saved = await readStored<Entry>(ENTRIES_STORAGE_KEY);
        if (saved.length > 0) {
          setEntries(saved);
          dirtyEntryIdsRef.current = new Set(saved.map((e) => e.id));
          dirtyEntryVersionsRef.current.clear();
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
    if (!isSupabaseConfigured() || syncInFlightRef.current) return;
    syncInFlightRef.current = true;
    try {
      const data = await fetchMergedWithRecurringRespectSuppressed(
        suppressedRecurringSlotsRef.current
      );
      setEntries(data);
      dirtyEntryIdsRef.current.clear();
      dirtyEntryVersionsRef.current.clear();
      setShowOfflineBanner(false);
      setIsCloudUnavailable(false);
    } catch (e) {
      logError('Failed to refetch entries', e);
      setShowOfflineBanner(true);
      setIsCloudUnavailable(true);
    } finally {
      syncInFlightRef.current = false;
    }
  }, []);

  const saveEntriesLocal = useCallback(async () => {
    try {
      await writeStored(ENTRIES_STORAGE_KEY, entriesRef.current);
    } catch (e) {
      logError('Failed to save entries to localStorage', e);
      setSaveError('Não foi possível salvar localmente.');
    }
  }, []);

  /**
   * Espelho local sempre ativo — inclusive em modo nuvem.
   *
   * Antes o autosave ficava desativado com Supabase configurado, então alterações
   * ficam só em memória até clicar em Salvar: um reload (ou queda) antes do push
   * descartava tudo. O guard de `isLoading` impede a gravação do `[]` inicial, que
   * zerava o backup antes do hydrate.
   */
  useEffect(() => {
    if (isLoading) return;
    writeStored(ENTRIES_STORAGE_KEY, entries);
  }, [entries, isLoading]);

  /** Envia alterações locais (delta) ao Supabase e atualiza o estado com o retorno do servidor. */
  const pushEntriesToSupabase = useCallback(async () => {
    if (!isSupabaseConfigured() || syncInFlightRef.current) return;

    const localSnapshot = entriesRef.current;
    const dirty = dirtyEntryIdsRef.current;
    const changedEntries = localSnapshot.filter((e) => dirty.has(e.id));
    const deletedIds = [...deletedEntryIdsRef.current];
    if (changedEntries.length === 0 && deletedIds.length === 0) return;

    syncInFlightRef.current = true;
    setIsSyncing(true);
    setSaveError(null);
    // Fotografa o que está sendo enviado: alterações feitas durante a requisição
    // não podem ser apagadas pelo retorno (possivelmente mais antigo) do servidor.
    const startedVersions = new Map(
      changedEntries.map((e) => [e.id, dirtyEntryVersionsRef.current.get(e.id) ?? 0])
    );
    const startedDeleted = new Set(deletedIds);
    try {
      const presentIds = localSnapshot.map((e) => e.id);
      await syncEntriesDelta(presentIds, changedEntries, deletedIds);
      const merged = await fetchMergedWithRecurringRespectSuppressed(
        suppressedRecurringSlotsRef.current
      );

      // Mantém a versão local do que mudou durante o push e adota a revisão do
      // servidor, para que o próximo envio passe no controle otimista (OCC).
      const overlayIds = new Set<string>();
      for (const [id, version] of startedVersions) {
        if ((dirtyEntryVersionsRef.current.get(id) ?? 0) !== version) overlayIds.add(id);
      }
      for (const id of dirtyEntryIdsRef.current) {
        if (!startedVersions.has(id)) overlayIds.add(id);
      }

      const pendingDeleted = new Set(deletedEntryIdsRef.current);
      const localById = new Map(entriesRef.current.map((e) => [e.id, e]));
      const fetchedById = new Map(merged.map((e) => [e.id, e]));
      const result = merged.filter((e) => !pendingDeleted.has(e.id));
      for (const id of overlayIds) {
        if (pendingDeleted.has(id)) continue;
        const local = localById.get(id);
        if (!local) continue;
        const fromServer = fetchedById.get(id);
        const overlay = fromServer
          ? { ...local, revision: fromServer.revision ?? local.revision }
          : local;
        const index = result.findIndex((e) => e.id === id);
        if (index >= 0) result[index] = overlay;
        else result.unshift(overlay);
      }

      // Só considera confirmado o que foi enviado e não mudou desde então.
      for (const [id, version] of startedVersions) {
        if ((dirtyEntryVersionsRef.current.get(id) ?? 0) === version) clearDirtyEntry(id);
      }
      for (const id of startedDeleted) {
        if (deletedEntryIdsRef.current.has(id)) deletedEntryIdsRef.current.delete(id);
      }

      commitEntries(result);
      setShowOfflineBanner(false);
      setIsCloudUnavailable(false);
    } catch (e) {
      logError('Falha ao gravar no Supabase', e);
      setSaveError('Falha ao salvar no Supabase. Tente de novo.');
      setShowOfflineBanner(true);
      setIsCloudUnavailable(true);
      throw e;
    } finally {
      syncInFlightRef.current = false;
      setIsSyncing(false);
    }
  }, [clearDirtyEntry, commitEntries]);

  /** Busca lançamentos do Supabase; se houver alterações pendentes, envia antes de baixar. */
  const pullEntriesFromSupabase = useCallback(async () => {
    if (!isSupabaseConfigured() || syncInFlightRef.current) return;
    if (dirtyEntryIdsRef.current.size > 0 || deletedEntryIdsRef.current.size > 0) {
      await pushEntriesToSupabase();
      return;
    }
    syncInFlightRef.current = true;
    setIsSyncing(true);
    setSaveError(null);
    try {
      const merged = await fetchMergedWithRecurringRespectSuppressed(
        suppressedRecurringSlotsRef.current
      );
      commitEntries(merged);
      dirtyEntryIdsRef.current.clear();
      dirtyEntryVersionsRef.current.clear();
      setShowOfflineBanner(false);
      setIsCloudUnavailable(false);
    } catch (e) {
      logError('Falha ao buscar lançamentos do Supabase', e);
      setSaveError('Falha ao atualizar do servidor. Tente de novo.');
      setShowOfflineBanner(true);
      setIsCloudUnavailable(true);
      throw e;
    } finally {
      syncInFlightRef.current = false;
      setIsSyncing(false);
    }
  }, [commitEntries, pushEntriesToSupabase]);

  /** Reconexão/retry: envia o que está pendente ou, se não há nada, busca o servidor. */
  const syncEntriesNow = useCallback(async () => {
    if (!isSupabaseConfigured() || syncInFlightRef.current) return;
    if (dirtyEntryIdsRef.current.size > 0 || deletedEntryIdsRef.current.size > 0) {
      await pushEntriesToSupabase();
    } else {
      await refetchEntries();
    }
  }, [pushEntriesToSupabase, refetchEntries]);

  /**
   * Autosave remoto. Sem isto os lançamentos só chegavam ao Supabase ao clicar
   * em "Salvar"; um reload antes do clique deixava o outro dispositivo sem eles.
   */
  useEffect(() => {
    if (!isSupabaseConfigured() || isLoading || isMigrating) return;
    if (dirtyEntryIdsRef.current.size === 0 && deletedEntryIdsRef.current.size === 0) return;

    if (autoSyncTimerRef.current) clearTimeout(autoSyncTimerRef.current);
    autoSyncTimerRef.current = setTimeout(() => {
      autoSyncTimerRef.current = null;
      void pushEntriesToSupabase().catch(() => {
        // O banner/saveError já informa a falha; a próxima alteração tenta de novo.
      });
    }, AUTO_SYNC_DEBOUNCE_MS);

    return () => {
      if (autoSyncTimerRef.current) {
        clearTimeout(autoSyncTimerRef.current);
        autoSyncTimerRef.current = null;
      }
    };
  }, [entries, isLoading, isMigrating, pushEntriesToSupabase]);

  /** Ao voltar para o app (foco/visibilidade/rede), grava pendências ou busca o que mudou noutro dispositivo. */
  useEffect(() => {
    if (!isSupabaseConfigured() || isLoading) return;

    const syncOnResume = () => {
      if (document.visibilityState === 'hidden' || syncInFlightRef.current) return;
      void syncEntriesNow().catch(() => {});
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') syncOnResume();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', syncOnResume);
    window.addEventListener('online', syncOnResume);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', syncOnResume);
      window.removeEventListener('online', syncOnResume);
    };
  }, [isLoading, syncEntriesNow]);

  useEffect(() => {
    setSearchQuery('');
    setFilter('all');
    setSelectedCategory('all');
  }, [currentMonth, currentYear]);

  const applyListFilters = useCallback(
    (base: Entry[]): Entry[] => {
      let result = base;
      if (filter === 'pending') result = result.filter((d) => !d.isPaid);
      else if (filter === 'paid') result = result.filter((d) => d.isPaid);
      else if (filter === 'debt') result = result.filter((d) => d.type === 'debt');
      else if (filter === 'cash') result = result.filter((d) => d.type === 'cash');

      if (selectedCategory !== 'all') {
        result = result.filter((d) => d.category === selectedCategory);
      }

      const q = searchQuery.trim().toLowerCase();
      if (q) {
        // Compara também no formato pt-BR: digitar "1.234,56" (ou "123456")
        // encontra o lançamento de 1234.56. Normaliza ambos para dígitos puros.
        const qDigits = q.replace(/\D/g, '');
        result = result.filter(
          (d) =>
            d.name.toLowerCase().includes(q) ||
            String(d.amount).includes(q) ||
            (qDigits.length > 0 && d.amount.toFixed(2).replace(/\D/g, '').includes(qDigits))
        );
      }

      const mult = sortOrder === 'asc' ? 1 : -1;
      result = [...result].sort((a, b) => {
        if (sortBy === 'dueDate') {
          return mult * (parseDateLocal(a.dueDate).getTime() - parseDateLocal(b.dueDate).getTime());
        }
        if (sortBy === 'amount') {
          return mult * (a.amount - b.amount);
        }
        return mult * a.name.localeCompare(b.name, 'pt-BR');
      });

      return result;
    },
    [filter, selectedCategory, searchQuery, sortBy, sortOrder]
  );

  /** Todos os meses: alimenta a lista da aba Lançamentos. */
  const listEntries = useMemo(() => applyListFilters(entries), [entries, applyListFilters]);

  /** Só o mês selecionado: alimenta o calendário. */
  const filteredEntries = useMemo(
    () =>
      applyListFilters(
        entries.filter((d) => {
          const date = parseDateLocal(d.dueDate);
          return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        })
      ),
    [entries, currentMonth, currentYear, applyListFilters]
  );

  const entriesDoMes = useMemo(
    () =>
      entries.filter((d) => {
        const date = parseDateLocal(d.dueDate);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      }),
    [entries, currentMonth, currentYear]
  );

  // Mesma inversão de metas da visão mensal: depósito na meta (cash+goalId) abate
  // do caixa → conta como saída; saque da meta (debt+goalId) volta → conta como entrada.
  const totalEntradasLancadas = useMemo(
    () =>
      entries
        .filter((d) => (d.goalId ? d.type === 'debt' : d.type === 'cash'))
        .reduce((acc, d) => acc + d.amount, 0),
    [entries]
  );

  const totalSaidasLancadas = useMemo(
    () =>
      entries
        .filter((d) => (d.goalId ? d.type === 'cash' : d.type === 'debt'))
        .reduce((acc, d) => acc + d.amount, 0),
    [entries]
  );

  const saldo = useMemo(() => {
    const entradasFinalizadas = entries
      .filter((d) => d.isPaid && (d.goalId ? d.type === 'debt' : d.type === 'cash'))
      .reduce((acc, d) => acc + d.amount, 0);
    const saidasFinalizadas = entries
      .filter((d) => d.isPaid && (d.goalId ? d.type === 'cash' : d.type === 'debt'))
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

  const entradasCount = useMemo(
    () => entries.filter((d) => (d.goalId ? d.type === 'debt' : d.type === 'cash')).length,
    [entries]
  );
  const saidasCount = useMemo(
    () => entries.filter((d) => (d.goalId ? d.type === 'cash' : d.type === 'debt')).length,
    [entries]
  );

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
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  }

  function goToNextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  }

  function goToCurrentMonth() {
    const now = new Date();
    setCurrentMonth(now.getMonth());
    setCurrentYear(now.getFullYear());
  }

  function addOrUpdateEntry(entry: Entry, isEdit: boolean): Promise<void> {
    if (isEdit) {
      // Se o lançamento foi excluído e agora está sendo restaurado, cancela a deleção pendente.
      deletedEntryIdsRef.current.delete(entry.id);
      markEntryDirty(entry.id);
      const updated = bumpEntryUpdatedAt(entry);
      let next = entriesRef.current.map((e) => (e.id === entry.id ? updated : e));
      if (updated.parentInstallmentId) {
        // Editar uma parcela propaga nome/valor/tipo/categoria/tag para as irmãs,
        // preservando data/status/nº de cada uma (consistente com o fluxo de cartão).
        next = propagateEntryInstallmentUpdate(next, updated);
        const siblingIds = next
          .filter(
            (e) => e.parentInstallmentId === updated.parentInstallmentId && e.id !== updated.id
          )
          .map((e) => e.id);
        for (const sid of siblingIds) {
          markEntryDirty(sid);
        }
        if (siblingIds.length > 0) {
          next = next.map((e) => (siblingIds.includes(e.id) ? bumpEntryUpdatedAt(e) : e));
        }
      }
      if (updated.isRecurring) {
        // Ao editar a recorrência (ex.: aumentar o nº de meses), gera as cópias que faltam.
        const copies = generateMissingRecurringCopies(next, suppressedRecurringSlotsRef.current);
        for (const c of copies) {
          markEntryDirty(c.id);
        }
        if (copies.length > 0) next = [...next, ...copies];
      }
      commitEntries(next);
      return Promise.resolve();
    }
    const stamped = bumpEntryUpdatedAt(entry);
    // Restauração via "desfazer" não deve ser enviada como deleção no próximo sync.
    deletedEntryIdsRef.current.delete(stamped.id);
    markEntryDirty(stamped.id);
    const base = [stamped, ...entriesRef.current];
    let next = base;
    if (stamped.isRecurring) {
      const copies = generateMissingRecurringCopies(base, suppressedRecurringSlotsRef.current);
      for (const c of copies) {
        markEntryDirty(c.id);
      }
      next = copies.length > 0 ? [...base, ...copies] : base;
    }
    commitEntries(next);
    return Promise.resolve();
  }

  const togglePaid = useCallback(
    (id: string) => {
      markEntryDirty(id);
      commitEntries(
        entriesRef.current.map((e) => {
          if (e.id !== id) return e;
          const nextPaid = !e.isPaid;
          // Data local (fuso do dispositivo), não UTC: toISOString podia gravar ontem/amanhã.
          const paidDate = nextPaid ? todayLocalISO() : undefined;
          return bumpEntryUpdatedAt({ ...e, isPaid: nextPaid, paidDate });
        })
      );
    },
    [commitEntries, markEntryDirty]
  );

  const deleteEntry = useCallback(
    (id: string) => {
      const removed = entriesRef.current.find((e) => e.id === id);
      if (removed?.isRecurring && !removed.recurrenceTemplateId) {
        clearSuppressedSlotsForTemplate(suppressedRecurringSlotsRef.current, removed.id);
      } else if (removed?.recurrenceTemplateId) {
        suppressedRecurringSlotsRef.current.add(
          recurringSlotKey(removed.recurrenceTemplateId, removed.dueDate)
        );
        persistSuppressedRecurringSlots(suppressedRecurringSlotsRef.current);
      }
      clearDirtyEntry(id);
      deletedEntryIdsRef.current.add(id);
      commitEntries(entriesRef.current.filter((e) => e.id !== id));
    },
    [clearDirtyEntry, commitEntries]
  );

  const updateRecurringApplyToAll = useCallback(
    (updatedEntry: Entry) => {
      const modelId = updatedEntry.recurrenceTemplateId ?? updatedEntry.id;
      const toUpdate = entriesRef.current.filter(
        (e) => e.id === modelId || e.recurrenceTemplateId === modelId
      );
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
        markEntryDirty(m.id);
      }
      const mergedById = new Map(merged.map((m) => [m.id, m]));
      commitEntries(entriesRef.current.map((e) => mergedById.get(e.id) ?? e));
    },
    [commitEntries, markEntryDirty]
  );

  const deleteRecurringModel = useCallback(
    (id: string, deleteAllCopies: boolean) => {
      const entry = entriesRef.current.find((e) => e.id === id);
      if (entry) {
        if (deleteAllCopies && entry.isRecurring && !entry.recurrenceTemplateId) {
          clearSuppressedSlotsForTemplate(suppressedRecurringSlotsRef.current, entry.id);
        } else if (!deleteAllCopies && entry.recurrenceTemplateId) {
          suppressedRecurringSlotsRef.current.add(
            recurringSlotKey(entry.recurrenceTemplateId, entry.dueDate)
          );
          persistSuppressedRecurringSlots(suppressedRecurringSlotsRef.current);
        } else if (!deleteAllCopies && entry.isRecurring && !entry.recurrenceTemplateId) {
          clearSuppressedSlotsForTemplate(suppressedRecurringSlotsRef.current, entry.id);
        }
      }
      const entryInCurrent = entriesRef.current.find((e) => e.id === id);
      if (!entryInCurrent) return;
      const toRemove =
        deleteAllCopies && entryInCurrent.isRecurring && !entryInCurrent.recurrenceTemplateId
          ? entriesRef.current.filter((e) => e.id === id || e.recurrenceTemplateId === id)
          : [entryInCurrent];
      const ids = new Set(toRemove.map((e) => e.id));
      for (const rid of ids) {
        clearDirtyEntry(rid);
        deletedEntryIdsRef.current.add(rid);
      }
      commitEntries(entriesRef.current.filter((e) => !ids.has(e.id)));
    },
    [clearDirtyEntry, commitEntries]
  );

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
    listEntries,
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
    showOfflineBanner,
    setShowOfflineBanner,
    isCloudUnavailable,
    saveError,
    setSaveError,
    addOrUpdateEntry,
    togglePaid,
    deleteEntry,
    updateRecurringApplyToAll,
    deleteRecurringModel,
    availableCategories,
    refetchEntries,
    syncEntriesNow,
    getSaldoForMonth,
    getMetaBalanceForGoal,
    saveEntriesLocal,
    pushEntriesToSupabase,
    pullEntriesFromSupabase,
    isSyncing,
    entriesSyncAvailable: isSupabaseConfigured(),
  };
}
