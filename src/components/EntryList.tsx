import React from 'react';
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
};

export function EntryList({
  entries,
  onTogglePaid,
  onEdit,
  onDeleteRequest,
  pendingPaidId = null,
  compact = false,
}: EntryListProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-600 overflow-hidden">
      <AnimatePresence mode="popLayout">
        {entries.length > 0 ? (
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
