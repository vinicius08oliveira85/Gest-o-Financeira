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
  const now = new Date();
  const iso = (dt: Date) =>
    `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (isoDate === iso(now)) return 'Hoje';
  if (isoDate === iso(yesterday)) return 'Ontem';
  if (isoDate === iso(tomorrow)) return 'Amanhã';
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
}

export function EntryList({
  entries,
  onTogglePaid,
  onEdit,
  onDeleteRequest,
  compact = false,
  groupByDate = false,
}: EntryListProps) {
  const groupedByDate = useMemo(
    () => (groupByDate && entries.length > 0 ? groupEntriesByDate(entries) : null),
    [entries, groupByDate]
  );

  return (
    <div className="neu-surface rounded-2xl overflow-hidden p-1.5">
      <AnimatePresence mode="popLayout">
        {entries.length > 0 ? (
          groupedByDate ? (
            <div className="neu-list">
              {Array.from(groupedByDate.entries()).map(([dateKey, dayEntries]) => (
                <div key={dateKey} className="space-y-1">
                  <div className="neu-sticky-label mx-0.5 px-3 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider rounded-lg">
                    {formatDateGroupLabel(dateKey)}
                  </div>
                  <div className="space-y-1">
                    {dayEntries.map((entry) => (
                      <React.Fragment key={entry.id}>
                        <EntryItem
                          entry={entry}
                          onTogglePaid={onTogglePaid}
                          onEdit={onEdit}
                          onDeleteRequest={onDeleteRequest}
                          compact={compact}
                        />
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="neu-list">
              {entries.map((entry) => (
                <React.Fragment key={entry.id}>
                  <EntryItem
                    entry={entry}
                    onTogglePaid={onTogglePaid}
                    onEdit={onEdit}
                    onDeleteRequest={onDeleteRequest}
                    compact={compact}
                  />
                </React.Fragment>
              ))}
            </div>
          )
        ) : (
          <div className="empty-state card-pad">
            <div className="neu-inset w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
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
              className="mt-4 neu-btn-primary px-4 py-2.5 rounded-xl font-medium text-sm"
            >
              Adicionar primeiro lançamento
            </button>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
