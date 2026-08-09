import { AlertTriangle, CreditCard, Gauge, Info, Target, X, ChevronRight } from 'lucide-react';
import type { Alert, AlertType } from '../hooks/useAlerts';

function AlertIcon({ type }: { type: AlertType }) {
  switch (type) {
    case 'due-soon':
      return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
    case 'goal-deadline':
      return <Target className="w-4 h-4 text-orange-500 dark:text-orange-400 shrink-0" />;
    case 'card-invoice-due':
      return <CreditCard className="w-4 h-4 text-sky-500 dark:text-sky-400 shrink-0" />;
    case 'card-limit':
      return <Gauge className="w-4 h-4 text-rose-500 dark:text-rose-400 shrink-0" />;
    case 'concentration':
    default:
      return <Info className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />;
  }
}

type AlertsPanelProps = {
  alerts: Alert[];
  onDismiss?: (id: string) => void;
  /** Quando definida, o alerta vira um botão que executa a ação (ex.: navegar para a aba). */
  onAction?: (alert: Alert) => void;
};

export function AlertsPanel({ alerts, onDismiss, onAction }: AlertsPanelProps) {
  if (alerts.length === 0) return null;

  return (
    <section>
      <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
        Alertas inteligentes
      </h2>
      <div className="section-stack">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`neu-list-item px-3 py-2 text-xs text-slate-700 dark:text-slate-300 ${
              onAction ? 'transition-colors hover:bg-slate-100 dark:hover:bg-slate-800/60' : ''
            }`}
          >
            {onAction ? (
              <button
                type="button"
                onClick={() => onAction(alert)}
                className="flex items-start gap-1.5 flex-1 min-w-0 text-left group"
              >
                <div className="mt-0.5">
                  <AlertIcon type={alert.type} />
                </div>
                <div className="flex-1 min-w-0 space-y-0.5">
                  <p className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
                    {alert.title}
                  </p>
                  <p className="text-3xs leading-snug text-slate-600 dark:text-slate-400">
                    {alert.description}
                  </p>
                </div>
                <ChevronRight
                  size={14}
                  className="mt-1 shrink-0 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400 transition-colors"
                  aria-hidden
                />
              </button>
            ) : (
              <div className="flex items-start gap-1.5 flex-1 min-w-0">
                <div className="mt-0.5">
                  <AlertIcon type={alert.type} />
                </div>
                <div className="flex-1 min-w-0 space-y-0.5">
                  <p className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
                    {alert.title}
                  </p>
                  <p className="text-3xs leading-snug text-slate-600 dark:text-slate-400">
                    {alert.description}
                  </p>
                </div>
              </div>
            )}
            {onDismiss && (
              <button
                type="button"
                onClick={() => onDismiss(alert.id)}
                className="neu-modal-close shrink-0"
                aria-label="Dispensar alerta"
              >
                <X size={16} />
              </button>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
