import { TrendingDown, TrendingUp } from 'lucide-react';

type DeltaBadgeProps = {
  current: number;
  previous: number;
  /** Inverte a semântica de cor (ex.: subir saída é ruim). */
  invert?: boolean;
  /** Variante para fundo escuro (texto claro). */
  light?: boolean;
  className?: string;
};

export function DeltaBadge({
  current,
  previous,
  invert = false,
  light = false,
  className = '',
}: DeltaBadgeProps) {
  if (previous === 0) return null;
  const pct = ((current - previous) / previous) * 100;
  const isUp = pct >= 0;
  const isGood = invert ? !isUp : isUp;
  const cls = isGood
    ? light
      ? 'text-emerald-300'
      : 'text-emerald-600 dark:text-emerald-400'
    : light
      ? 'text-red-300'
      : 'text-red-600 dark:text-red-400';
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-2xs font-semibold ${cls} ${className}`}
      title="Comparado ao mês anterior"
    >
      {isUp ? <TrendingUp size={11} aria-hidden /> : <TrendingDown size={11} aria-hidden />}
      {Math.abs(pct).toFixed(1)}%
    </span>
  );
}
