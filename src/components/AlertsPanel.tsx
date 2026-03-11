import { AlertTriangle, Info } from 'lucide-react';
import type { Alert } from '../hooks/useAlerts';

type AlertsPanelProps = {
  alerts: Alert[];
};

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  if (alerts.length === 0) return null;

  return (
    <section className="mt-4 space-y-3">
      <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
        Alertas inteligentes
      </h2>
      <div className="space-y-2">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-xs text-slate-700"
          >
            <div className="mt-0.5">
              {alert.type === 'due-soon' ? (
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              ) : (
                <Info className="w-4 h-4 text-slate-400" />
              )}
            </div>
            <div className="space-y-0.5">
              <p className="font-semibold text-slate-900 text-xs">
                {alert.title}
              </p>
              <p className="text-[11px] leading-snug text-slate-600">
                {alert.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

