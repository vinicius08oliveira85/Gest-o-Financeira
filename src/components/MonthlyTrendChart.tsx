import { useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import { formatCurrency } from '../lib/format';
import { averageCardUsage, type CardLimitPoint, type MonthTrendPoint } from '../lib/monthlyTrend';

type MonthlyTrendChartProps = {
  data: MonthTrendPoint[];
};

const W = 640;
const H = 244;
const PAD_L = 46;
const PAD_R = 10;
const PAD_T = 14;
const PAD_B = 30;

/** Cores de fallback para cartões sem cor definida (visíveis no claro e no escuro) */
const LIMIT_PALETTE = ['#818cf8', '#fbbf24', '#f472b6', '#a78bfa', '#f97316', '#a3e635'];

function limitColor(card: CardLimitPoint, index: number): string {
  return card.color ?? LIMIT_PALETTE[index % LIMIT_PALETTE.length];
}

function compactCurrency(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1000) {
    const k = (v / 1000).toFixed(1).replace(/\.0$/, '').replace('.', ',');
    return `R$ ${k}k`;
  }
  return formatCurrency(v);
}

/** Faixas de uso do limite — mesmas do CardItem (>=90% vermelho, >=70% âmbar, senão verde) */
function usageStyle(usage: number): { bar: string; text: string } {
  if (usage >= 90) return { bar: 'bg-red-500', text: 'text-red-600 dark:text-red-400' };
  if (usage >= 70) return { bar: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' };
  return { bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' };
}

/**
 * Célula de percentual de uso: barra mini + valor colorido (ou '—' sem limite),
 * com o detalhamento por cartão abaixo (quando o mês tem cartões com limite).
 * Uso ≥ 90% ganha um ponto vermelho de alerta.
 */
function UsageCell({ usage, cards = [] }: { usage: number | null; cards?: CardLimitPoint[] }) {
  const perCard = cards.filter((c) => c.limit > 0);
  const risky = usage !== null && usage >= 90;
  return (
    <span className="inline-flex flex-col items-end gap-0.5">
      {usage === null ? (
        <span className="text-slate-300 dark:text-slate-600">—</span>
      ) : (
        <span
          className="inline-flex items-center justify-end gap-1.5"
          title={`${usage.toFixed(1).replace('.', ',')}% do limite usado`}
        >
          {risky && (
            <span
              className="inline-block w-1.5 h-1.5 rounded-full bg-red-500 shrink-0"
              title="Uso acima de 90% do limite"
              aria-hidden
            />
          )}
          <span className="inline-block w-10 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0">
            <span
              className={`block h-full rounded-full ${usageStyle(usage).bar}`}
              style={{ width: `${Math.min(usage, 100)}%` }}
            />
          </span>
          <span className={`font-semibold ${usageStyle(usage).text}`}>{Math.round(usage)}%</span>
        </span>
      )}
      {perCard.map((c) => {
        const u = (c.spending / c.limit) * 100;
        const style = usageStyle(u);
        return (
          <span
            key={c.cardId}
            className="inline-flex items-center justify-end gap-1.5 max-w-full"
            title={`${c.name}: ${u.toFixed(1).replace('.', ',')}% do limite`}
          >
            <span className="truncate max-w-[72px] text-slate-400 dark:text-slate-500">
              {c.name}
            </span>
            <span className="inline-block w-8 h-1 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0">
              <span
                className={`block h-full rounded-full ${style.bar}`}
                style={{ width: `${Math.min(u, 100)}%` }}
              />
            </span>
            <span className={`font-medium ${style.text}`}>{Math.round(u)}%</span>
          </span>
        );
      })}
    </span>
  );
}

/** Séries de linha fixas (saldo e gasto no cartão) — usadas no desenho e no destaque do hover */
const lineSeries = [
  {
    key: 'saldo',
    label: 'Saldo',
    stroke: 'stroke-slate-400 dark:stroke-slate-500',
    dot: 'fill-slate-400 dark:fill-slate-500',
    get: (p: MonthTrendPoint) => p.saldo,
  },
  {
    key: 'card',
    label: 'Cartão',
    stroke: 'stroke-sky-400 dark:stroke-sky-500',
    dot: 'fill-sky-400 dark:fill-sky-500',
    get: (p: MonthTrendPoint) => p.cardSpending,
  },
];

type HoverState = { index: number; x: number; y: number; flip: boolean } | null;

export function MonthlyTrendChart({ data }: MonthlyTrendChartProps) {
  const [hover, setHover] = useState<HoverState>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const n = data.length;
  const hasData = data.some(
    (p) => p.entradas > 0 || p.saidas > 0 || p.cardSpending > 0 || p.cardLimit > 0
  );

  if (n === 0 || !hasData) {
    return (
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Sem lançamentos nos últimos {n} meses para exibir a evolução.
      </p>
    );
  }

  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;
  const baseY = PAD_T + plotH;
  const maxV = Math.max(
    1,
    ...data.flatMap((p) => [p.entradas, p.saidas, Math.abs(p.saldo), p.cardSpending, p.cardLimit])
  );
  const y = (v: number) => baseY - (v / maxV) * plotH;

  const slotW = plotW / n;
  const barW = Math.min(slotW * 0.26, 30);
  const gap = barW * 0.3;

  const gridlines = [0, 0.5, 1].map((f) => ({ v: maxV * f, y: baseY - f * plotH }));
  const currentIndex = n - 1;
  const avgUsage = averageCardUsage(data);
  const monthsWithUsage = data.filter((p) => p.cardUsage !== null).length;
  const overLimitCount = data.filter((p) => (p.cardUsage ?? 0) >= 90).length;

  // Cartões únicos na janela (cada um vira uma linha tracejada de limite)
  const cardsInWindow: CardLimitPoint[] = [];
  const colorById = new Map<string, string>();
  {
    for (const p of data) {
      for (const cl of p.cardLimits) {
        if (!colorById.has(cl.cardId)) {
          colorById.set(cl.cardId, limitColor(cl, cardsInWindow.length));
          cardsInWindow.push(cl);
        }
      }
    }
  }

  const hoverPoint = hover ? data[hover.index] : null;
  const hoverCx = hover ? PAD_L + slotW * hover.index + slotW / 2 : 0;
  const activeIndex = hover?.index ?? currentIndex;
  const dimOpacity = hover ? 0.55 : 0.72;

  const handlePointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const scaleX = W / rect.width;
    const vx = (e.clientX - rect.left) * scaleX;
    if (vx < PAD_L - 4 || vx > W - PAD_R + 4) {
      setHover(null);
      return;
    }
    const index = Math.min(n - 1, Math.max(0, Math.floor((vx - PAD_L) / slotW)));
    const x = e.clientX - rect.left;
    const yPx = e.clientY - rect.top;
    setHover({ index, x, y: yPx, flip: x > rect.width - 232 });
  };

  /** Move o destaque de mês (teclado) e reposiciona o balão no centro do mês. */
  const moveHover = (index: number) => {
    const i = Math.min(n - 1, Math.max(0, index));
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0) {
      setHover({ index: i, x: 0, y: 0, flip: false });
      return;
    }
    const scaleX = rect.width / W;
    const x = (PAD_L + slotW * i + slotW / 2) * scaleX;
    setHover({ index: i, x, y: 120, flip: x > rect.width - 232 });
  };

  const handleKeyDown = (e: ReactKeyboardEvent<SVGSVGElement>) => {
    const current = hover?.index ?? n - 1;
    switch (e.key) {
      case 'ArrowRight':
        e.preventDefault();
        moveHover(current + 1);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        moveHover(current - 1);
        break;
      case 'Home':
        e.preventDefault();
        moveHover(0);
        break;
      case 'End':
        e.preventDefault();
        moveHover(n - 1);
        break;
      default:
        break;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-2xs text-slate-500 dark:text-slate-400">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-sm bg-emerald-500" aria-hidden />
          Entradas
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-sm bg-red-500" aria-hidden />
          Saídas
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-3 h-0.5 bg-slate-400 dark:bg-slate-500" aria-hidden />
          Saldo (finalizado)
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-3 h-0.5 bg-sky-400 dark:bg-sky-500" aria-hidden />
          Cartão (faturas)
        </span>
        {cardsInWindow.map((card, ci) => (
          <span key={card.cardId} className="inline-flex items-center gap-1">
            <span
              className="inline-block w-3 h-0"
              style={{ borderTop: `2px dashed ${limitColor(card, ci)}` }}
              aria-hidden
            />
            {card.name}
          </span>
        ))}
      </div>

      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto select-none rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:focus-visible:ring-slate-500"
          role="img"
          aria-label="Gráfico de evolução mensal de entradas, saídas, gastos no cartão e limite por cartão. Use as setas do teclado para navegar entre os meses."
          tabIndex={0}
          aria-keyshortcuts="ArrowLeft ArrowRight Home End"
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHover(null)}
          onKeyDown={handleKeyDown}
        >
          {/* Linhas de grade + valores compactos */}
          {gridlines.map((g) => (
            <g key={g.v}>
              <line
                x1={PAD_L}
                x2={W - PAD_R}
                y1={g.y}
                y2={g.y}
                strokeWidth={g.v === 0 ? 1.5 : 1}
                strokeDasharray={g.v === 0 ? undefined : '4 4'}
                className={
                  g.v === 0
                    ? 'stroke-slate-300 dark:stroke-slate-600'
                    : 'stroke-slate-200 dark:stroke-slate-700/70'
                }
              />
              <text
                x={PAD_L - 5}
                y={g.y + 3}
                textAnchor="end"
                fontSize={9}
                className="fill-slate-400 dark:fill-slate-500"
              >
                {compactCurrency(g.v)}
              </text>
            </g>
          ))}

          {/* Barras por mês */}
          {data.map((p, i) => {
            const cx = PAD_L + slotW * i + slotW / 2;
            const xEnt = cx - gap / 2 - barW;
            const xSai = cx + gap / 2;
            const hEnt = y(p.entradas);
            const hSai = y(p.saidas);
            const opacity = i === activeIndex ? 1 : dimOpacity;
            return (
              <g key={`${p.year}-${p.month}`} opacity={opacity}>
                <g>
                  <title>
                    {`${p.label}/${String(p.year).slice(2)} · Entradas: ${formatCurrency(p.entradas)}`}
                  </title>
                  <rect
                    x={xEnt}
                    y={hEnt}
                    width={barW}
                    height={Math.max(0, baseY - hEnt)}
                    rx={3}
                    className="fill-emerald-500"
                  />
                </g>
                <g>
                  <title>
                    {`${p.label}/${String(p.year).slice(2)} · Saídas: ${formatCurrency(p.saidas)}`}
                  </title>
                  <rect
                    x={xSai}
                    y={hSai}
                    width={barW}
                    height={Math.max(0, baseY - hSai)}
                    rx={3}
                    className="fill-red-500"
                  />
                </g>
              </g>
            );
          })}

          {/* Linhas + pontos (saldo e gasto no cartão) */}
          {lineSeries.map((s) => (
            <g key={s.key}>
              <polyline
                points={data
                  .map((p, i) => {
                    const cx = PAD_L + slotW * i + slotW / 2;
                    return `${cx},${y(s.get(p))}`;
                  })
                  .join(' ')}
                fill="none"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                className={s.stroke}
              />
              {data.map((p, i) => {
                const cx = PAD_L + slotW * i + slotW / 2;
                return (
                  <g key={`${s.key}-${p.year}-${p.month}`}>
                    <title>
                      {`${p.label}/${String(p.year).slice(2)} · ${s.label}: ${formatCurrency(
                        s.get(p)
                      )}`}
                    </title>
                    <circle cx={cx} cy={y(s.get(p))} r={3} className={s.dot} />
                  </g>
                );
              })}
            </g>
          ))}

          {/* Linhas tracejadas de limite por cartão */}
          {cardsInWindow.map((card, ci) => {
            const color = limitColor(card, ci);
            const pts = data
              .map((p, i) => {
                const cl = p.cardLimits.find((c) => c.cardId === card.cardId);
                return cl && cl.limit > 0
                  ? ({ p, i, cl } as { p: MonthTrendPoint; i: number; cl: CardLimitPoint })
                  : null;
              })
              .filter(
                (x): x is { p: MonthTrendPoint; i: number; cl: CardLimitPoint } => x !== null
              );
            if (pts.length === 0) return null;
            const pointsStr = pts
              .map(({ i, cl }) => {
                const cx = PAD_L + slotW * i + slotW / 2;
                return `${cx},${y(cl.limit)}`;
              })
              .join(' ');
            return (
              <g key={card.cardId}>
                {/* Sublinhado claro: mantém visíveis linhas escuras (ex.: slate-800) no dark mode */}
                <polyline
                  points={pointsStr}
                  fill="none"
                  strokeWidth={4}
                  stroke="rgba(148,163,184,0.15)"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                <polyline
                  points={pointsStr}
                  fill="none"
                  stroke={color}
                  strokeWidth={1.5}
                  strokeDasharray="5 4"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                {pts.map(({ i, p, cl }) => (
                  <g key={`${card.cardId}-${p.year}-${p.month}`}>
                    <title>
                      {`${p.label}/${String(p.year).slice(2)} · ${card.name} (limite): ${formatCurrency(
                        cl.limit
                      )}`}
                    </title>
                    <circle
                      cx={PAD_L + slotW * i + slotW / 2}
                      cy={y(cl.limit)}
                      r={2}
                      fill={color}
                    />
                  </g>
                ))}
              </g>
            );
          })}

          {/* Destaque do mês sob o cursor: linha-guia + anéis nas séries */}
          {hover && hoverPoint && (
            <g pointerEvents="none">
              <line
                x1={hoverCx}
                x2={hoverCx}
                y1={PAD_T}
                y2={baseY}
                strokeWidth={1}
                strokeDasharray="3 3"
                className="stroke-slate-400/80 dark:stroke-slate-500/80"
              />
              {lineSeries.map((s) => (
                <circle
                  key={s.key}
                  cx={hoverCx}
                  cy={y(s.get(hoverPoint))}
                  r={4.5}
                  fill="none"
                  strokeWidth={1.5}
                  className={s.stroke}
                />
              ))}
              {hoverPoint.cardLimits
                .filter((cl) => cl.limit > 0)
                .map((cl) => (
                  <circle
                    key={`ring-${cl.cardId}`}
                    cx={hoverCx}
                    cy={y(cl.limit)}
                    r={4}
                    fill="none"
                    strokeWidth={1.5}
                    stroke={colorById.get(cl.cardId) ?? '#818cf8'}
                  />
                ))}
            </g>
          )}

          {/* Rótulos dos meses */}
          {data.map((p, i) => {
            const cx = PAD_L + slotW * i + slotW / 2;
            const isCurrent = i === currentIndex;
            return (
              <text
                key={`l-${p.year}-${p.month}`}
                x={cx}
                y={baseY + 18}
                textAnchor="middle"
                fontSize={10}
                className={
                  isCurrent
                    ? 'fill-slate-700 dark:fill-slate-200 font-semibold'
                    : 'fill-slate-400 dark:fill-slate-500'
                }
              >
                {p.label}
              </text>
            );
          })}
        </svg>

        {/* Balão interativo que segue o cursor */}
        {hover && hoverPoint && (
          <div
            role="status"
            className="pointer-events-none absolute z-10 w-max max-w-[240px] rounded-lg border border-slate-600/60 bg-slate-900/95 px-3 py-2 text-3xs text-slate-100 shadow-xl backdrop-blur-sm dark:bg-slate-800/95 dark:border-slate-500/60"
            style={{
              left: hover.flip ? hover.x - 12 : hover.x + 14,
              top: hover.y > 96 ? hover.y - 46 : hover.y + 18,
              transform: hover.flip ? 'translateX(-100%)' : undefined,
            }}
          >
            <p className="mb-1 text-2xs font-semibold capitalize">
              {new Date(hoverPoint.year, hoverPoint.month, 1).toLocaleDateString('pt-BR', {
                month: 'long',
                year: 'numeric',
              })}
            </p>
            <div className="space-y-0.5">
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-sm bg-emerald-500"
                    aria-hidden
                  />
                  Entradas
                </span>
                <span className="font-semibold text-emerald-400">
                  {formatCurrency(hoverPoint.entradas)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="inline-block w-1.5 h-1.5 rounded-sm bg-red-500" aria-hidden />
                  Saídas
                </span>
                <span className="font-semibold text-red-400">
                  {formatCurrency(hoverPoint.saidas)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="inline-block w-3 h-0.5 bg-slate-400" aria-hidden />
                  Saldo
                </span>
                <span
                  className={`font-semibold ${
                    hoverPoint.saldo >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {formatCurrency(hoverPoint.saldo)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="inline-block w-3 h-0.5 bg-sky-400" aria-hidden />
                  Cartão
                </span>
                <span className="font-semibold text-sky-400">
                  {formatCurrency(hoverPoint.cardSpending)}
                </span>
              </div>
              {hoverPoint.cardLimit > 0 && (
                <div className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <span
                      className="inline-block w-3 h-0 border-t-2 border-dashed border-blue-400"
                      aria-hidden
                    />
                    Limite
                  </span>
                  <span className="font-semibold text-blue-400">
                    {formatCurrency(hoverPoint.cardLimit)}
                  </span>
                </div>
              )}
              {hoverPoint.cardUsage !== null && (
                <div className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <span
                      className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400"
                      aria-hidden
                    />
                    Uso do limite
                  </span>
                  <span className="font-semibold text-blue-400">
                    {Math.round(hoverPoint.cardUsage)}%
                  </span>
                </div>
              )}
              {hoverPoint.cardLimits
                .filter((cl) => cl.limit > 0)
                .map((cl) => (
                  <div key={`t-${cl.cardId}`} className="flex items-center justify-between gap-4">
                    <span className="flex items-center gap-1.5 text-slate-300 truncate max-w-[130px]">
                      <span
                        className="inline-block w-2 h-0 shrink-0"
                        style={{ borderTop: `2px dashed ${colorById.get(cl.cardId) ?? '#818cf8'}` }}
                        aria-hidden
                      />
                      {cl.name}
                    </span>
                    <span className="font-medium text-slate-100">{formatCurrency(cl.limit)}</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-3xs text-slate-600 dark:text-slate-400">
          <thead>
            <tr className="text-left text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              <th className="py-1 pr-2 font-semibold">Mês</th>
              <th className="py-1 px-2 font-semibold text-right">Entradas</th>
              <th className="py-1 px-2 font-semibold text-right">Saídas</th>
              <th className="py-1 px-2 font-semibold text-right">Cartão</th>
              <th className="py-1 px-2 font-semibold text-right">Limite</th>
              <th className="py-1 px-2 font-semibold text-right">Uso</th>
              <th className="py-1 pl-2 font-semibold text-right">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {data.map((p, i) => (
              <tr
                key={`r-${p.year}-${p.month}`}
                className={
                  i === currentIndex
                    ? 'font-semibold text-slate-900 dark:text-slate-100'
                    : undefined
                }
              >
                <td className="py-1 pr-2 capitalize">
                  {p.label}/{String(p.year).slice(2)}
                  {i === currentIndex && (
                    <span className="ml-1 text-4xs font-medium text-emerald-600 dark:text-emerald-400 uppercase">
                      atual
                    </span>
                  )}
                </td>
                <td className="py-1 px-2 text-right text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(p.entradas)}
                </td>
                <td className="py-1 px-2 text-right text-red-600 dark:text-red-400">
                  {formatCurrency(p.saidas)}
                </td>
                <td className="py-1 px-2 text-right text-sky-600 dark:text-sky-400">
                  {formatCurrency(p.cardSpending)}
                </td>
                <td className="py-1 px-2 text-right text-blue-600 dark:text-blue-400">
                  {formatCurrency(p.cardLimit)}
                </td>
                <td className="py-1 px-2 text-right">
                  <UsageCell usage={p.cardUsage} cards={p.cardLimits} />
                </td>
                <td
                  className={`py-1 pl-2 text-right ${
                    p.saldo >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {formatCurrency(p.saldo)}
                </td>
              </tr>
            ))}
          </tbody>
          {avgUsage !== null && (
            <tfoot>
              <tr className="border-t border-slate-200 dark:border-slate-700">
                <td
                  colSpan={5}
                  className="py-1.5 pr-2 font-medium text-slate-500 dark:text-slate-400"
                  title="Média do percentual de uso nos meses com limite cadastrado"
                >
                  Média de uso
                  {monthsWithUsage !== data.length && ` (${monthsWithUsage} meses com limite)`}
                  {overLimitCount > 0 && ` · ${overLimitCount} acima de 90%`}
                </td>
                <td className="py-1.5 px-2 text-right">
                  <UsageCell usage={avgUsage} />
                </td>
                <td className="py-1.5 pl-2" />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
