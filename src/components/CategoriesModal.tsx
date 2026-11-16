import { useEffect, useRef, useState } from 'react';
import { Check, Pencil, Plus, Trash2, X } from './icons';
import { ModalShell } from './ModalShell';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { MAX_CATEGORY_LENGTH, type CategoryError } from '../lib/categories';

const MODAL_TITLE_ID = 'categories-modal-title';

type Props = {
  open: boolean;
  /** Opções atuais: lista salva + categorias que já aparecem nos lançamentos. */
  categories: string[];
  /** Quantos lançamentos/gastos usam cada categoria. */
  usage: Record<string, number>;
  onAdd: (name: string) => CategoryError;
  /** Deve renomear também os lançamentos que usavam o nome antigo. */
  onRename: (from: string, to: string) => CategoryError;
  /** Deve limpar a categoria dos lançamentos que a usavam. */
  onDelete: (name: string) => void;
  onClose: () => void;
};

function errorMessage(error: CategoryError): string | null {
  if (error === 'empty') return 'Informe um nome.';
  if (error === 'duplicate') return 'Já existe uma categoria com esse nome.';
  return null;
}

export function CategoriesModal({
  open,
  categories,
  usage,
  onAdd,
  onRename,
  onDelete,
  onClose,
}: Props) {
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  useFocusTrap(contentRef, open);

  useEffect(() => {
    if (!open) return;
    setNewName('');
    setError(null);
    setEditing(null);
    setConfirmingDelete(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Escape primeiro cancela a edição/exclusão em andamento, depois fecha.
        if (editing || confirmingDelete) {
          setEditing(null);
          setConfirmingDelete(null);
          return;
        }
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, editing, confirmingDelete, onClose]);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const result = onAdd(newName);
    if (result) {
      setError(errorMessage(result));
      return;
    }
    setNewName('');
    setError(null);
  }

  function startEditing(name: string) {
    setEditing(name);
    setEditValue(name);
    setError(null);
    setConfirmingDelete(null);
  }

  function commitEdit() {
    if (!editing) return;
    const result = onRename(editing, editValue);
    if (result) {
      setError(errorMessage(result));
      return;
    }
    setEditing(null);
    setError(null);
  }

  const inputClass =
    'w-full neu-input rounded-xl px-4 py-3 text-slate-900 dark:text-slate-100 transition-all';

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      contentRef={contentRef}
      aria-labelledby={MODAL_TITLE_ID}
    >
      <div className="neu-modal-header">
        <div>
          <h2
            id={MODAL_TITLE_ID}
            className="text-lg font-semibold text-slate-900 dark:text-slate-100"
          >
            Categorias
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
            Sugestões usadas no formulário e nos filtros
          </p>
        </div>
        <button type="button" onClick={onClose} className="neu-modal-close" aria-label="Fechar">
          <X size={22} />
        </button>
      </div>

      <div className="neu-modal-body">
        <form onSubmit={handleAdd} className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <label
              htmlFor="category-new-name"
              className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5"
            >
              Nova categoria
            </label>
            <input
              id="category-new-name"
              type="text"
              value={newName}
              maxLength={MAX_CATEGORY_LENGTH}
              onChange={(e) => {
                setNewName(e.target.value);
                setError(null);
              }}
              placeholder="Ex: Mercado, Transporte..."
              autoFocus
              className={inputClass + (error ? ' border-red-400' : '')}
            />
          </div>
          <button
            type="submit"
            className="mt-[1.65rem] neu-btn-primary flex items-center gap-1.5 rounded-xl px-3 py-3 text-sm font-semibold"
          >
            <Plus size={16} />
            Adicionar
          </button>
        </form>
        {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}

        {categories.length === 0 ? (
          <p className="py-4 text-center text-xs text-slate-600 dark:text-slate-400">
            Nenhuma categoria ainda. Adicione a primeira acima.
          </p>
        ) : (
          <ul className="neu-list mt-1">
            {categories.map((name) => {
              const count = usage[name] ?? 0;
              const isEditing = editing === name;
              const isConfirming = confirmingDelete === name;
              return (
                <li
                  key={name}
                  className="neu-list-item flex flex-wrap items-center gap-2 px-3 py-2"
                >
                  {isEditing ? (
                    <>
                      <input
                        type="text"
                        value={editValue}
                        maxLength={MAX_CATEGORY_LENGTH}
                        autoFocus
                        onChange={(e) => {
                          setEditValue(e.target.value);
                          setError(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            commitEdit();
                          }
                        }}
                        aria-label={`Novo nome para ${name}`}
                        className="flex-1 min-w-0 neu-input rounded-lg px-2 py-1 text-sm text-slate-900 dark:text-slate-100"
                      />
                      <button
                        type="button"
                        onClick={commitEdit}
                        className="rounded-lg p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                        aria-label="Salvar novo nome"
                        title="Salvar novo nome"
                      >
                        <Check size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(null);
                          setError(null);
                        }}
                        className="rounded-lg p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                        aria-label="Cancelar edição"
                        title="Cancelar edição"
                      >
                        <X size={16} />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 min-w-0 truncate text-sm text-slate-800 dark:text-slate-200">
                        {name}
                      </span>
                      <span className="shrink-0 text-2xs text-slate-600 dark:text-slate-400">
                        {count === 0
                          ? 'sem uso'
                          : `${count} ${count === 1 ? 'lançamento' : 'lançamentos'}`}
                      </span>
                      {isConfirming ? (
                        <span className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              onDelete(name);
                              setConfirmingDelete(null);
                            }}
                            className="rounded-lg px-2 py-1 text-2xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            {count > 0 ? `Remover de ${count}` : 'Excluir'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingDelete(null)}
                            className="rounded-lg p-1.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                            aria-label="Cancelar exclusão"
                            title="Cancelar exclusão"
                          >
                            <X size={14} />
                          </button>
                        </span>
                      ) : (
                        <span className="flex shrink-0 items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => startEditing(name)}
                            className="rounded-lg p-1.5 text-slate-600 dark:text-slate-400 hover:text-blue-500 dark:hover:text-blue-400"
                            aria-label={`Renomear ${name}`}
                            title="Renomear"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmingDelete(name);
                              setError(null);
                            }}
                            className="rounded-lg p-1.5 text-slate-600 dark:text-slate-400 hover:text-red-500 dark:hover:text-red-400"
                            aria-label={`Excluir ${name}`}
                            title="Excluir"
                          >
                            <Trash2 size={14} />
                          </button>
                        </span>
                      )}
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <p className="text-xs text-slate-600 dark:text-slate-400">
          Renomear atualiza os lançamentos e gastos de cartão que usam o nome antigo. Excluir remove
          a categoria desses registros (eles continuam existindo). A lista fica guardada neste
          dispositivo.
        </p>
      </div>
    </ModalShell>
  );
}
