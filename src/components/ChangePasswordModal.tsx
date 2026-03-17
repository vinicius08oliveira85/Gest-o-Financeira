import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { changePassword, MIN_PASSWORD_LENGTH_EXPORT } from '../lib/password';

const CHANGE_PASSWORD_TITLE_ID = 'change-password-modal-title';

type ChangePasswordModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function ChangePasswordModal({ open, onClose, onSuccess }: ChangePasswordModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

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
      setTimeout(() => {
        onSuccess();
        onClose();
        setSuccess(false);
      }, 800);
    } else {
      setError('Senha atual incorreta');
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 dark:bg-black/50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={CHANGE_PASSWORD_TITLE_ID}
            className="bg-white dark:bg-slate-800 w-full max-w-md rounded-3xl shadow-2xl relative z-10 overflow-hidden border border-slate-200 dark:border-slate-600"
          >
            <div className="p-6 border-b border-slate-100 dark:border-slate-600 flex items-center justify-between">
              <h2
                id={CHANGE_PASSWORD_TITLE_ID}
                className="text-xl font-semibold text-slate-900 dark:text-slate-100"
              >
                Alterar senha
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                aria-label="Fechar"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
                  {error}
                </div>
              )}
              {success && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-sm">
                  Senha alterada com sucesso.
                </div>
              )}

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
                  className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500/20 dark:focus:ring-emerald-500/20 focus:border-slate-500 dark:focus:border-emerald-500 transition-all"
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
                  className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500/20 dark:focus:ring-emerald-500/20 focus:border-slate-500 dark:focus:border-emerald-500 transition-all"
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
                  className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500/20 dark:focus:ring-emerald-500/20 focus:border-slate-500 dark:focus:border-emerald-500 transition-all"
                />
              </div>
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={success}
                  className="w-full bg-slate-900 dark:bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-slate-800 dark:hover:bg-emerald-500 transition-colors disabled:opacity-70"
                >
                  Alterar senha
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
