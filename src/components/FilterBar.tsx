import { Search, ChevronDown, SlidersHorizontal, X } from 'lucide-react';
import type { FilterType } from '../types';
import { NeuSelect } from './NeuSelect';

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
    <div className="section-stack">
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-[var(--inline-gap)]">
        <div className="relative flex-1 sm:max-w-[min(100%,12.5rem)]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar..."
            className={`w-full neu-input rounded-full pl-9 py-1.5 sm:py-2 text-sm sm:text-base transition-all ${
              searchQuery ? 'pr-8' : 'pr-3'
            }`}
            aria-label="Buscar por nome ou valor"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Limpar busca"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <div className="neu-inset flex p-1 sm:p-1.5 rounded-full w-full sm:w-auto overflow-x-auto">
          {FILTER_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                onFilterChange(value);
                if (value === 'all') onCategoryChange('all');
              }}
              className={`whitespace-nowrap px-3 py-1 sm:px-4 sm:py-1.5 rounded-full text-sm font-medium transition-all ${
                filter === value
                  ? 'neu-filter-active'
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
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-[var(--inline-gap)] flex-wrap mt-[var(--section-gap)]">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">Ordenar:</span>
            <NeuSelect
              value={sortBy}
              onChange={(v) => onSortByChange(v as SortByOption)}
              aria-label="Ordenar por"
              options={[
                { value: 'dueDate', label: 'Data' },
                { value: 'amount', label: 'Valor' },
                { value: 'name', label: 'Nome' },
              ]}
            />
            <NeuSelect
              value={sortOrder}
              onChange={(v) => onSortOrderChange(v as SortOrderOption)}
              aria-label="Ordem"
              options={[
                { value: 'desc', label: 'Decrescente' },
                { value: 'asc', label: 'Crescente' },
              ]}
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium">Categoria:</span>
            <NeuSelect
              value={selectedCategory}
              onChange={onCategoryChange}
              aria-label="Filtrar por categoria"
              className="w-full sm:min-w-[min(100%,10rem)] sm:w-auto"
              options={[
                { value: 'all', label: 'Todas' },
                ...categories.map((cat) => ({ value: cat, label: cat })),
              ]}
            />
          </div>
        </div>
      </details>
    </div>
  );
}
