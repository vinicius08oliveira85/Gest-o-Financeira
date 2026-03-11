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
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
};

export function FilterBar({
  filter,
  onFilterChange,
  filteredCount,
  totalCount,
  categories,
  selectedCategory,
  onCategoryChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-col gap-3 mb-2">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex bg-white p-1.5 rounded-full border border-slate-200 shadow-sm w-full sm:w-auto overflow-x-auto">
          {FILTER_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => onFilterChange(value)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                filter === value
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="text-xs sm:text-sm text-slate-500 font-medium text-center sm:text-right">
          Mostrando {filteredCount} de {totalCount} registros
        </div>
      </div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 text-xs text-slate-500">
        <span className="font-medium">Categoria:</span>
        <select
          value={selectedCategory}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="w-full sm:min-w-[160px] sm:w-auto rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs sm:text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500"
        >
          <option value="all">Todas</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
