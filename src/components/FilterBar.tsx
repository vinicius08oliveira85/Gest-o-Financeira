import type { FilterType } from '../types';

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'paid', label: 'Finalizados' },
  { value: 'debt', label: 'Saídas' },
  { value: 'cash', label: 'Entradas' },
];

type FilterBarProps = {
  filter: FilterType;
  onFilterChange: (f: FilterType) => void;
  filteredCount: number;
  totalCount: number;
};

export function FilterBar({
  filter,
  onFilterChange,
  filteredCount,
  totalCount,
}: FilterBarProps) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
      <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm w-full sm:w-auto overflow-x-auto">
        {FILTER_OPTIONS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => onFilterChange(value)}
            className={`whitespace-nowrap px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              filter === value
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="text-sm text-slate-500 font-medium">
        Mostrando {filteredCount} de {totalCount} registros
      </div>
    </div>
  );
}
