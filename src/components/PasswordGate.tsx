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
      <div className="min-h-screen bg-[#F5F5F5] dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="text-slate-500 dark:text-slate-400">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-600 p-8">
          <div className="flex justify-center mb-6">
            <div className="bg-slate-900 dark:bg-slate-700 p-4 rounded-2xl">
              <Lock className="text-white w-10 h-10" />
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

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-sm">
              {error}
            </div>
          )}

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
                  className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500/20 dark:focus:ring-emerald-500/20 focus:border-slate-500 dark:focus:border-emerald-500"
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
                  className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500/20 dark:focus:ring-emerald-500/20 focus:border-slate-500 dark:focus:border-emerald-500"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-slate-900 dark:bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-slate-800 dark:hover:bg-emerald-500 transition-colors"
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
                  className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl px-4 py-3 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-500/20 dark:focus:ring-emerald-500/20 focus:border-slate-500 dark:focus:border-emerald-500"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-slate-900 dark:bg-emerald-600 text-white py-3 rounded-xl font-semibold hover:bg-slate-800 dark:hover:bg-emerald-500 transition-colors"
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
