import { Plus, TrendingDown, Lock } from 'lucide-react';

type HeaderProps = {
  onExportCSV: () => void;
  onNewEntry: () => void;
  onOpenChangePassword: () => void;
};

export function Header({
  onExportCSV,
  onNewEntry,
  onOpenChangePassword,
}: HeaderProps) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-500 p-2 rounded-lg">
            <TrendingDown className="text-white w-5 h-5" />
          </div>
          <h1 className="font-semibold text-lg tracking-tight">Gestão Financeira</h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenChangePassword}
            className="flex text-slate-500 hover:text-slate-900 px-3 py-2 rounded-full text-sm font-medium items-center gap-2 transition-colors"
            title="Alterar senha"
          >
            <Lock size={18} />
            <span className="hidden sm:inline">Alterar senha</span>
          </button>
          <button
            onClick={onExportCSV}
            className="hidden sm:flex text-slate-500 hover:text-slate-900 px-4 py-2 rounded-full text-sm font-medium items-center gap-2 transition-colors"
          >
            Exportar CSV
          </button>
          <button
            onClick={onNewEntry}
            className="bg-slate-900 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-sm"
          >
            <Plus size={18} />
            Novo Registro
          </button>
        </div>
      </div>
    </header>
  );
}
