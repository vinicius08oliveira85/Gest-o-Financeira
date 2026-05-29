import { AlertTriangle, Info, Target, X } from 'lucide-react';
import type { Alert, AlertType } from '../hooks/useAlerts';

function AlertIcon({ type }: { type: AlertType }) {
  switch (type) {
    case 'due-soon':
      return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />;
    case 'goal-deadline':
      return <Target className="w-4 h-4 text-orange-500 dark:text-orange-400 shrink-0" />;
    case 'concentration':
    default:
      return <Info className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />;
  }
}

type AlertsPanelProps = {
  alerts: Alert[];
  onDismiss?: (id: string) => void;
};

export function AlertsPanel({ alerts, onDismiss }: AlertsPanelProps) {
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
            className="flex items-start gap-1.5 neu-list-item px-3 py-2 text-xs text-slate-700 dark:text-slate-300"
          >
            <div className="mt-0.5">
              <AlertIcon type={alert.type} />
            </div>
            <div className="flex-1 min-w-0 space-y-0.5">
              <p className="font-semibold text-slate-900 dark:text-slate-100 text-xs">
                {alert.title}
              </p>
              <p className="text-[11px] leading-snug text-slate-600 dark:text-slate-400">
                {alert.description}
              </p>
            </div>
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
