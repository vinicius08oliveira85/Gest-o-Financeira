import React, { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';
import {
  hasStoredPassword,
  setPassword,
  verifyPassword,
  MIN_PASSWORD_LENGTH_EXPORT,
} from '../lib/password';

type PasswordGateProps = {
  onUnlock: () => void;
};

export function PasswordGate({ onUnlock }: PasswordGateProps) {
  const [needsSetup, setNeedsSetup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    setNeedsSetup(!hasStoredPassword());
    setChecking(false);
  }, []);

  const handleSetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const senha = (form.elements.namedItem('senha') as HTMLInputElement).value;
    const confirmar = (form.elements.namedItem('confirmar') as HTMLInputElement).value;

    if (senha.length < MIN_PASSWORD_LENGTH_EXPORT) {
      setError(`Senha deve ter no mínimo ${MIN_PASSWORD_LENGTH_EXPORT} caracteres`);
      return;
    }
    if (senha !== confirmar) {
      setError('As senhas não conferem');
      return;
    }
    try {
      await setPassword(senha);
      onUnlock();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao cadastrar senha');
    }
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const senha = (form.elements.namedItem('senha') as HTMLInputElement).value;
    if (!senha) {
      setError('Digite a senha');
      return;
    }
    const ok = await verifyPassword(senha);
    if (ok) {
      onUnlock();
    } else {
      setError('Senha incorreta');
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen neu-bg flex items-center justify-center p-4">
        <div className="text-slate-500 dark:text-slate-400">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen neu-bg flex items-center justify-center p-[var(--page-px)]">
      <div className="w-full max-w-[min(100%,28rem)]">
        <div className="neu-surface-lg rounded-2xl card-pad">
          <div className="flex justify-center mb-6">
            <div className="neu-icon-badge-emerald p-4 rounded-2xl">
              <Lock className="text-emerald-500 dark:text-emerald-400 w-10 h-10" />
            </div>
          </div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100 text-center mb-1">
            Gestão Financeira
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm text-center mb-6">
            {needsSetup
              ? 'Cadastre uma senha para proteger o acesso'
              : 'Digite a senha para acessar'}
          </p>

          {error && <div className="mb-4 neu-feedback-error">{error}</div>}

          {needsSetup ? (
            <form onSubmit={handleSetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                  Nova senha
                </label>
                <input
                  type="password"
                  name="senha"
                  autoComplete="new-password"
                  required
                  minLength={MIN_PASSWORD_LENGTH_EXPORT}
                  placeholder="Mínimo 4 caracteres"
                  className="w-full neu-input rounded-xl px-4 py-3 text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                  Confirmar senha
                </label>
                <input
                  type="password"
                  name="confirmar"
                  autoComplete="new-password"
                  required
                  minLength={MIN_PASSWORD_LENGTH_EXPORT}
                  placeholder="Repita a senha"
                  className="w-full neu-input rounded-xl px-4 py-3 text-slate-900 dark:text-slate-100"
                />
              </div>
              <button
                type="submit"
                className="w-full neu-btn-primary py-3 rounded-xl font-semibold"
              >
                Cadastrar e entrar
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1.5">
                  Senha
                </label>
                <input
                  type="password"
                  name="senha"
                  autoComplete="current-password"
                  required
                  placeholder="Digite sua senha"
                  className="w-full neu-input rounded-xl px-4 py-3 text-slate-900 dark:text-slate-100"
                />
              </div>
              <button
                type="submit"
                className="w-full neu-btn-primary py-3 rounded-xl font-semibold"
              >
                Entrar
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
