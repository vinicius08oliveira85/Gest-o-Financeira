import { Check, ExternalLink, Pencil, Plus, Undo2 } from './icons';
import type { WishlistItem } from '../types';
import { EmptyState } from './EmptyState';
import { formatCurrency, formatDate } from '../lib/format';
import { getWishlistTotals, normalizeWishlistUrl } from '../lib/wishlist';

type Props = {
  items: WishlistItem[];
  onNewItem: () => void;
  onEditItem: (item: WishlistItem) => void;
  /** `purchased = true` registra a compra (e abate o valor do saldo). */
  onTogglePurchased: (item: WishlistItem, purchased: boolean) => void;
};

export function WishlistSection({ items, onNewItem, onEditItem, onTogglePurchased }: Props) {
  const { pending, purchased } = getWishlistTotals(items);
  const pendingItems = items.filter((i) => !i.purchased).sort((a, b) => a.createdAt - b.createdAt);
  const purchasedItems = items
    .filter((i) => i.purchased)
    .sort(
      (a, b) =>
        (b.purchasedAt ?? '').localeCompare(a.purchasedAt ?? '') || b.createdAt - a.createdAt
    );

  return (
    <div className="section-stack">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Lista de desejos
        </h2>
        {items.length > 0 && (
          <button type="button" onClick={onNewItem} className="neu-btn-primary btn-action">
            <Plus size={16} />
            Novo item
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <EmptyState
          variant="wishlist"
          title="Nenhum item na lista"
          description="Anote o que você quer comprar, com valor e link, e marque quando comprar para abater o valor do saldo."
          actionLabel="Adicionar item"
          onAction={onNewItem}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="neu-card p-4">
              <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                A comprar ({pendingItems.length})
              </p>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {formatCurrency(pending)}
              </p>
            </div>
            <div className="neu-card p-4">
              <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Já comprado ({purchasedItems.length})
              </p>
              <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                {formatCurrency(purchased)}
              </p>
            </div>
          </div>

          <p className="info-bar">
            “Comprei” registra uma saída paga hoje em Lançamentos e abate o valor do saldo do mês.
          </p>

          {pendingItems.length > 0 && (
            <ul className="flex flex-col gap-2">
              {pendingItems.map((item) => {
                const link = normalizeWishlistUrl(item.url);
                return (
                  <li key={item.id} className="neu-card p-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 dark:text-slate-100 truncate">
                        {item.name}
                      </p>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {formatCurrency(item.amount)}
                      </p>
                      {link && (
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-0.5 inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
                        >
                          <ExternalLink size={13} />
                          Abrir link
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onTogglePurchased(item, true)}
                        className="neu-btn-primary px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                        aria-label={`Marcar ${item.name} como comprado`}
                      >
                        <Check size={14} />
                        Comprei
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditItem(item)}
                        className="neu-btn-secondary p-2 rounded-xl"
                        aria-label={`Editar ${item.name}`}
                      >
                        <Pencil size={16} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {purchasedItems.length > 0 && (
            <div className="section-stack">
              <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Comprados
              </p>
              <ul className="flex flex-col gap-2">
                {purchasedItems.map((item) => (
                  <li
                    key={item.id}
                    className="neu-card p-4 flex items-start justify-between gap-3 opacity-80"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-slate-500 dark:text-slate-400 truncate line-through">
                        {item.name}
                      </p>
                      <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                        {formatCurrency(item.amount)}
                        {item.purchasedAt ? ` · ${formatDate(item.purchasedAt)}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onTogglePurchased(item, false)}
                        className="neu-btn-secondary px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                        aria-label={`Desfazer compra de ${item.name}`}
                      >
                        <Undo2 size={14} />
                        Desfazer
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditItem(item)}
                        className="neu-btn-secondary p-2 rounded-xl"
                        aria-label={`Editar ${item.name}`}
                      >
                        <Pencil size={16} />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
