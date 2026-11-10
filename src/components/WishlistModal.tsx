import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { WishlistItem } from '../types';
import { ModalShell } from './ModalShell';
import {
  formatCurrencyForInput,
  maskCurrencyInput,
  parseCurrencyInput,
} from '../lib/currencyInput';
import { normalizeWishlistUrl } from '../lib/wishlist';

const MODAL_TITLE_ID = 'wishlist-modal-title';

type Props = {
  open: boolean;
  item: WishlistItem | null;
  onSave: (item: Omit<WishlistItem, 'id' | 'createdAt'> & { id?: string }) => void;
  onRequestDelete?: (item: WishlistItem) => void;
  onClose: () => void;
};

export function WishlistModal({ open, item, onSave, onRequestDelete, onClose }: Props) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [url, setUrl] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setName(item?.name ?? '');
    setAmount(item ? formatCurrencyForInput(item.amount) : '');
    setUrl(item?.url ?? '');
    setErrors({});
  }, [item, open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Nome obrigatório';
    const value = parseCurrencyInput(amount);
    if (value === null || value <= 0) errs.amount = 'Informe um valor válido';
    // Aceita "www.loja.com/item" (sem esquema) e prefixa https:// ao salvar;
    // exige um host com ponto para não virar um link inútil.
    const link = normalizeWishlistUrl(url);
    if (link && !/^https?:\/\/[^\s/]+\.[^\s/]+/i.test(link)) {
      errs.url = 'Informe um link válido (ex: www.loja.com/produto)';
    }
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    onSave({
      id: item?.id,
      name: name.trim(),
      amount: value ?? 0,
      url: link,
      // Editar um item não pode desfazer uma compra já registrada
      purchased: item?.purchased ?? false,
      purchasedAt: item?.purchasedAt,
      entryId: item?.entryId,
    });
    onClose();
  }

  const inputClass =
    'w-full neu-input rounded-xl px-4 py-3 text-slate-900 dark:text-slate-100 transition-all';
  const labelClass =
    'block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5';
  const errorClass = 'mt-1 text-xs text-red-500 dark:text-red-400';

  return (
    <ModalShell open={open} onClose={onClose} aria-labelledby={MODAL_TITLE_ID}>
      <div className="neu-modal-header">
        <h2
          id={MODAL_TITLE_ID}
          className="text-lg font-semibold text-slate-900 dark:text-slate-100"
        >
          {item ? 'Editar item' : 'Novo item desejado'}
        </h2>
        <button type="button" onClick={onClose} className="neu-modal-close" aria-label="Fechar">
          <X size={22} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="neu-modal-body">
        <div>
          <label htmlFor="wishlist-name" className={labelClass}>
            Nome do item
          </label>
          <input
            id="wishlist-name"
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Notebook"
            className={inputClass + (errors.name ? ' border-red-400' : '')}
          />
          {errors.name && <p className={errorClass}>{errors.name}</p>}
        </div>

        <div>
          <label htmlFor="wishlist-amount" className={labelClass}>
            Valor (R$)
          </label>
          <input
            id="wishlist-amount"
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(maskCurrencyInput(e.target.value))}
            placeholder="3.500,00"
            className={inputClass + (errors.amount ? ' border-red-400' : '')}
          />
          {errors.amount && <p className={errorClass}>{errors.amount}</p>}
        </div>

        <div>
          <label htmlFor="wishlist-url" className={labelClass}>
            Link (opcional)
          </label>
          <input
            id="wishlist-url"
            type="text"
            inputMode="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="www.loja.com/produto"
            className={inputClass + (errors.url ? ' border-red-400' : '')}
          />
          {errors.url && <p className={errorClass}>{errors.url}</p>}
        </div>

        <div className="flex flex-col gap-2 pt-1">
          <button
            type="submit"
            className="w-full neu-btn-primary py-3 rounded-2xl font-semibold text-sm active:scale-[0.98]"
          >
            Salvar item
          </button>
          {item && onRequestDelete && (
            <button
              type="button"
              onClick={() => {
                onRequestDelete(item);
                onClose();
              }}
              className="w-full neu-btn-danger-soft py-2.5 rounded-2xl font-medium text-sm"
            >
              Excluir item
            </button>
          )}
        </div>
      </form>
    </ModalShell>
  );
}
