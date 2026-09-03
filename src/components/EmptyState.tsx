import { ReactNode } from 'react';
import { FileText, Target, CreditCard, Filter, TrendingUp, Calendar } from 'lucide-react';

type EmptyStateVariant =
  | 'entries'
  | 'entries-filtered'
  | 'goals'
  | 'cards'
  | 'expenses'
  | 'reports'
  | 'calendar';

interface EmptyStateProps {
  variant: EmptyStateVariant;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  children?: ReactNode;
  className?: string;
}

const variantConfig: Record<
  EmptyStateVariant,
  {
    icon: ReactNode;
    defaultTitle: string;
    defaultDescription: string;
    defaultActionLabel: string;
    iconColor: string;
    iconBgColor: string;
  }
> = {
  entries: {
    icon: <FileText className="w-10 h-10 text-emerald-500" />,
    defaultTitle: 'Nenhum lançamento ainda',
    defaultDescription: 'Comece registrando suas entradas e saídas para ver o fluxo de caixa aqui.',
    defaultActionLabel: 'Adicionar primeiro lançamento',
    iconColor: 'text-emerald-500',
    iconBgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
  },
  'entries-filtered': {
    icon: <Filter className="w-10 h-10 text-slate-400 dark:text-slate-500" />,
    defaultTitle: 'Nenhum registro encontrado',
    defaultDescription: 'Tente mudar o filtro ou a busca para encontrar o que procura.',
    defaultActionLabel: 'Limpar filtros',
    iconColor: 'text-slate-400 dark:text-slate-500',
    iconBgColor: 'bg-slate-100 dark:bg-slate-800',
  },
  goals: {
    icon: <Target className="w-10 h-10 text-amber-500" />,
    defaultTitle: 'Nenhuma meta definida',
    defaultDescription:
      'Crie metas financeiras para acompanhar seus objetivos de poupança ou pagamento.',
    defaultActionLabel: 'Criar primeira meta',
    iconColor: 'text-amber-500',
    iconBgColor: 'bg-amber-100 dark:bg-amber-900/30',
  },
  cards: {
    icon: <CreditCard className="w-10 h-10 text-blue-500" />,
    defaultTitle: 'Nenhum cartão cadastrado',
    defaultDescription:
      'Adicione seus cartões de crédito para acompanhar faturas e gastos parcelados.',
    defaultActionLabel: 'Adicionar cartão',
    iconColor: 'text-blue-500',
    iconBgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  expenses: {
    icon: <CreditCard className="w-10 h-10 text-violet-500" />,
    defaultTitle: 'Nenhum gasto neste cartão',
    defaultDescription: 'Registre compras para ver o detalhamento da fatura e parcelas.',
    defaultActionLabel: 'Adicionar gasto',
    iconColor: 'text-violet-500',
    iconBgColor: 'bg-violet-100 dark:bg-violet-900/30',
  },
  reports: {
    icon: <TrendingUp className="w-10 h-10 text-indigo-500" />,
    defaultTitle: 'Sem dados para relatório',
    defaultDescription: 'Adicione lançamentos e metas para visualizar gráficos e tendências.',
    defaultActionLabel: 'Adicionar lançamento',
    iconColor: 'text-indigo-500',
    iconBgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
  },
  calendar: {
    icon: <Calendar className="w-10 h-10 text-rose-500" />,
    defaultTitle: 'Nenhum lançamento neste mês',
    defaultDescription:
      'Navegue para outro mês ou adicione lançamentos para visualizar no calendário.',
    defaultActionLabel: 'Adicionar lançamento',
    iconColor: 'text-rose-500',
    iconBgColor: 'bg-rose-100 dark:bg-rose-900/30',
  },
};

export function EmptyState({
  variant,
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  children,
  className = '',
}: EmptyStateProps) {
  const config = variantConfig[variant];

  return (
    <div className={`empty-state card-pad ${className}`}>
      <div className={`empty-illustration ${config.iconBgColor} flex items-center justify-center`}>
        {config.icon}
      </div>
      <h3 className="text-slate-900 dark:text-slate-100 font-medium text-center">
        {title ?? config.defaultTitle}
      </h3>
      <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 text-center max-w-sm mx-auto">
        {description ?? config.defaultDescription}
      </p>
      {(onAction || onSecondaryAction) && (
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-2 w-full max-w-xs mx-auto">
          {onAction && (
            <button
              type="button"
              onClick={onAction}
              className="neu-btn-primary px-4 py-2.5 rounded-xl font-medium text-sm w-full sm:w-auto"
            >
              {actionLabel ?? config.defaultActionLabel}
            </button>
          )}
          {onSecondaryAction && secondaryActionLabel && (
            <button
              type="button"
              onClick={onSecondaryAction}
              className="neu-btn-toolbar px-4 py-2.5 rounded-xl font-medium text-sm w-full sm:w-auto"
            >
              {secondaryActionLabel}
            </button>
          )}
        </div>
      )}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
