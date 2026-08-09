import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { changePassword, MIN_PASSWORD_LENGTH_EXPORT } from '../lib/password';
import { ModalShell } from './ModalShell';

const CHANGE_PASSWORD_TITLE_ID = 'change-password-modal-title';

type ChangePasswordModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function ChangePasswordModal({ open, onClose, onSuccess }: ChangePasswordModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const successTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  // Ao fechar/reabrir, zera estados e cancela o timeout pendente de sucesso
  // (senão o onSuccess disparava com o modal já fechado).
  useEffect(() => {
    if (successTimeoutRef.current) {
      window.clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = null;
    }
    setError(null);
    setSuccess(false);
  }, [open]);

  useEffect(
    () => () => {
      if (successTimeoutRef.current) window.clearTimeout(successTimeoutRef.current);
    },
    []
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const atual = (form.elements.namedItem('atual') as HTMLInputElement).value;
    const nova = (form.elements.namedItem('nova') as HTMLInputElement).value;
    const confirmar = (form.elements.namedItem('confirmar') as HTMLInputElement).value;

    if (!atual) {
      setError('Digite a senha atual');
      return;
    }
    if (nova.length < MIN_PASSWORD_LENGTH_EXPORT) {
      setError(`Nova senha deve ter no mínimo ${MIN_PASSWORD_LENGTH_EXPORT} caracteres`);
      return;
    }
    if (nova !== confirmar) {
      setError('Nova senha e confirmar não conferem');
      return;
    }
    const ok = await changePassword(atual, nova);
    if (ok) {
      setSuccess(true);
      setError(null);
      if (successTimeoutRef.current) window.clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = window.setTimeout(() => {
        onSuccess();
        onClose();
        setSuccess(false);
        successTimeoutRef.current = null;
      }, 800);
    } else {
      setError('Senha atual incorreta');
    }
  };

  return (
    <ModalShell open={open} onClose={onClose} size="md" aria-labelledby={CHANGE_PASSWORD_TITLE_ID}>
      <div className="neu-modal-header">
        <h2
          id={CHANGE_PASSWORD_TITLE_ID}
          className="text-xl font-semibold text-slate-900 dark:text-slate-100"
        >
          Alterar senha
        </h2>
        <button type="button" onClick={onClose} className="neu-modal-close" aria-label="Fechar">
          <X size={24} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="neu-modal-body">
        {error && <div className="neu-feedback-error">{error}</div>}
        {success && <div className="neu-feedback-success">Senha alterada com sucesso.</div>}

        <div>
          <label
            htmlFor="change-password-atual"
            className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5"
          >
            Senha atual
          </label>
          <input
            id="change-password-atual"
            type="password"
            name="atual"
            autoComplete="current-password"
            required
            placeholder="Digite a senha atual"
            className="w-full neu-input rounded-xl px-4 py-3 text-slate-900 dark:text-slate-100 transition-all"
          />
        </div>
        <div>
          <label
            htmlFor="change-password-nova"
            className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5"
          >
            Nova senha
          </label>
          <input
            id="change-password-nova"
            type="password"
            name="nova"
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD_LENGTH_EXPORT}
            placeholder={`Mínimo ${MIN_PASSWORD_LENGTH_EXPORT} caracteres`}
            className="w-full neu-input rounded-xl px-4 py-3 text-slate-900 dark:text-slate-100 transition-all"
          />
        </div>
        <div>
          <label
            htmlFor="change-password-confirmar"
            className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5"
          >
            Confirmar nova senha
          </label>
          <input
            id="change-password-confirmar"
            type="password"
            name="confirmar"
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD_LENGTH_EXPORT}
            placeholder="Repita a nova senha"
            className="w-full neu-input rounded-xl px-4 py-3 text-slate-900 dark:text-slate-100 transition-all"
          />
        </div>
        <div className="pt-2">
          <button
            type="submit"
            disabled={success}
            className="w-full neu-btn-primary py-3 rounded-xl font-semibold disabled:opacity-70"
          >
            Alterar senha
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
