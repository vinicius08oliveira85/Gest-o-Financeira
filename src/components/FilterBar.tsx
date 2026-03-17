import { Search, ChevronDown, SlidersHorizontal } from 'lucide-react';
import type { FilterType } from '../types';

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Pendentes' },
  { value: 'paid', label: 'Finalizados' },
  { value: 'debt', label: 'Saídas' },
  { value: 'cash', label: 'Entradas' },
];

export type SortByOption = 'dueDate' | 'amount' | 'name';
export type SortOrderOption = 'asc' | 'desc';

type FilterBarProps = {
  filter: FilterType;
  onFilterChange: (f: FilterType) => void;
  filteredCount: number;
  totalCount: number;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  sortBy: SortByOption;
  onSortByChange: (s: SortByOption) => void;
  sortOrder: SortOrderOption;
  onSortOrderChange: (s: SortOrderOption) => void;
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
};

export function FilterBar({
  filter,
  onFilterChange,
  filteredCount,
  totalCount,
  searchQuery,
  onSearchChange,
  sortBy,
  onSortByChange,
  sortOrder,
  onSortOrderChange,
  categories,
  selectedCategory,
  onCategoryChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-col gap-3 mb-2">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
        <div className="relative flex-1 sm:max-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por nome ou valor"
            className="w-full rounded-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 pl-9 pr-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500/20 dark:focus:ring-emerald-500/20 focus:border-slate-500 dark:focus:border-emerald-500"
            aria-label="Buscar por nome ou valor"
          />
        </div>
        <div className="flex bg-white dark:bg-slate-800 p-1.5 rounded-full border border-slate-200 dark:border-slate-600 shadow-sm w-full sm:w-auto overflow-x-auto">
          {FILTER_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                onFilterChange(value);
                if (value === 'all') onCategoryChange('all');
              }}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                filter === value
                  ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium text-center sm:text-right">
          Mostrando {filteredCount} de {totalCount} registros
        </div>
      </div>
      <details className="group">
        <summary className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 cursor-pointer list-none py-1 hover:text-slate-700 dark:hover:text-slate-300 [&::-webkit-details-marker]:hidden">
          <SlidersHorizontal size={14} />
          Filtros avançados
          <ChevronDown size={14} className="transition-transform group-open:rotate-180" />
        </summary>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap mt-3 pl-0">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">Ordenar:</span>
            <select
              value={sortBy}
              onChange={(e) => onSortByChange(e.target.value as SortByOption)}
              className="rounded-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs sm:text-sm text-slate-700 dark:text-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20 dark:focus:ring-emerald-500/20"
            >
              <option value="dueDate">Data</option>
              <option value="amount">Valor</option>
              <option value="name">Nome</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => onSortOrderChange(e.target.value as SortOrderOption)}
              className="rounded-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs sm:text-sm text-slate-700 dark:text-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20 dark:focus:ring-emerald-500/20"
            >
              <option value="desc">Decrescente</option>
              <option value="asc">Crescente</option>
            </select>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">Categoria:</span>
            <select
              value={selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="w-full sm:min-w-[160px] sm:w-auto rounded-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs sm:text-sm text-slate-700 dark:text-slate-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500/20 dark:focus:ring-emerald-500/20 focus:border-slate-500 dark:focus:border-emerald-500"
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
      </details>
    </div>
  );
}
