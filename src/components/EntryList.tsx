import React, { useMemo } from 'react';
import { AnimatePresence } from 'motion/react';
import { Filter } from 'lucide-react';
import type { Entry } from '../types';
import { EntryItem } from './EntryItem';

type EntryListProps = {
  entries: Entry[];
  onTogglePaid: (id: string) => void;
  onEdit: (entry?: Entry) => void;
  onDeleteRequest: (id: string) => void;
  pendingPaidId?: string | null;
  compact?: boolean;
  /** Agrupa os itens por data de vencimento com um cabeçalho por dia */
  groupByDate?: boolean;
};

function groupEntriesByDate(entries: Entry[]): Map<string, Entry[]> {
  const map = new Map<string, Entry[]>();
  for (const entry of entries) {
    const key = entry.dueDate;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(entry);
  }
  const sortedKeys = Array.from(map.keys()).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );
  const result = new Map<string, Entry[]>();
  for (const key of sortedKeys) {
    result.set(key, map.get(key)!);
  }
  return result;
}

function formatDateGroupLabel(isoDate: string): string {
  const d = new Date(isoDate + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
}

export function EntryList({
  entries,
  onTogglePaid,
  onEdit,
  onDeleteRequest,
  pendingPaidId = null,
  compact = false,
  groupByDate = false,
}: EntryListProps) {
  const groupedByDate = useMemo(
    () => (groupByDate && entries.length > 0 ? groupEntriesByDate(entries) : null),
    [entries, groupByDate]
  );

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-600 overflow-hidden">
      <AnimatePresence mode="popLayout">
        {entries.length > 0 ? (
          groupedByDate ? (
            <div className="divide-y divide-slate-100 dark:divide-slate-600">
              {Array.from(groupedByDate.entries()).map(([dateKey, dayEntries]) => (
                <div key={dateKey}>
                  <div className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-700/80 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider border-b border-slate-100 dark:border-slate-600">
                    {formatDateGroupLabel(dateKey)}
                  </div>
                  <div className="divide-y divide-slate-100 dark:divide-slate-600">
                    {dayEntries.map((entry) => (
                      <React.Fragment key={entry.id}>
                        <EntryItem
                          entry={entry}
                          onTogglePaid={onTogglePaid}
                          onEdit={onEdit}
                          onDeleteRequest={onDeleteRequest}
                          pendingPaidId={pendingPaidId}
                          compact={compact}
                        />
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-600">
              {entries.map((entry) => (
                <React.Fragment key={entry.id}>
                  <EntryItem
                    entry={entry}
                    onTogglePaid={onTogglePaid}
                    onEdit={onEdit}
                    onDeleteRequest={onDeleteRequest}
                    pendingPaidId={pendingPaidId}
                    compact={compact}
                  />
                </React.Fragment>
              ))}
            </div>
          )
        ) : (
          <div className="p-12 text-center">
            <div className="bg-slate-50 dark:bg-slate-700 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Filter className="text-slate-300 dark:text-slate-500 w-8 h-8" />
            </div>
            <h3 className="text-slate-900 dark:text-slate-100 font-medium">
              Nenhum registro encontrado
            </h3>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Tente mudar o filtro ou adicione um novo registro.
            </p>
            <button
              type="button"
              onClick={() => onEdit()}
              className="mt-4 px-4 py-2.5 rounded-xl font-medium bg-slate-900 dark:bg-emerald-600 text-white hover:bg-slate-800 dark:hover:bg-emerald-500 transition-colors text-sm"
            >
              Adicionar primeiro lançamento
            </button>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
