import React, { useMemo } from 'react';
import { AnimatePresence } from 'motion/react';
import type { Entry } from '../types';
import { EntryItem } from './EntryItem';
import { EmptyState } from './EmptyState';

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
                    {dayEntries.map((entry, index) => (
                      <React.Fragment key={entry.id}>
                        <EntryItem
                          entry={entry}
                          onTogglePaid={onTogglePaid}
                          onEdit={onEdit}
                          onDeleteRequest={onDeleteRequest}
                          compact={compact}
                          staggerDelay={index * 50}
                        />
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="neu-list">
              {entries.map((entry, index) => (
                <React.Fragment key={entry.id}>
                  <EntryItem
                    entry={entry}
                    onTogglePaid={onTogglePaid}
                    onEdit={onEdit}
                    onDeleteRequest={onDeleteRequest}
                    compact={compact}
                    staggerDelay={index * 50}
                  />
                </React.Fragment>
              ))}
            </div>
          )
        ) : (
          <EmptyState
            variant={entries.length === 0 ? 'entries' : 'entries-filtered'}
            onAction={onEdit}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
