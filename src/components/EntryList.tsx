import React from 'react';
import { AnimatePresence } from 'motion/react';
import { Filter } from 'lucide-react';
import type { Entry } from '../types';
import { EntryItem } from './EntryItem';

type EntryListProps = {
  entries: Entry[];
  onTogglePaid: (id: string) => void;
  onEdit: (entry: Entry) => void;
  onDeleteRequest: (id: string) => void;
  compact?: boolean;
};

export function EntryList({
  entries,
  onTogglePaid,
  onEdit,
  onDeleteRequest,
  compact = false,
}: EntryListProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <AnimatePresence mode="popLayout">
        {entries.length > 0 ? (
          <div className="divide-y divide-slate-100">
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
        ) : (
          <div className="p-12 text-center">
            <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Filter className="text-slate-300 w-8 h-8" />
            </div>
            <h3 className="text-slate-900 font-medium">Nenhum registro encontrado</h3>
            <p className="text-slate-500 text-sm mt-1">
              Tente mudar o filtro ou adicione um novo registro.
            </p>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
