import { escapeCsvCell } from './format';

export type ReportsTotals = {
  entradas: number;
  saidas: number;
  saldo: number;
  prevEntradas: number;
  prevSaidas: number;
  prevSaldo: number;
};

export type ReportsCategories = {
  saidas: Record<string, number>;
  entradas: Record<string, number>;
};

export type ReportsCardTotal = {
  name: string;
  total: number;
  limit: number;
};

export type ReportsCsvInput = {
  /** Rótulo do mês em pt-BR, ex.: "fevereiro de 2025" */
  monthLabel: string;
  totals: ReportsTotals;
  categories: ReportsCategories;
  /** Faturas do mês por cartão; vazio omite a seção. */
  cards: ReportsCardTotal[];
};

const money = (n: number) => n.toFixed(2);

/**
 * Variação percentual vs. o mês anterior, com a mesma regra do DeltaBadge:
 * sem base (anterior = 0) fica em branco em vez de dividir por zero.
 */
function variation(current: number, previous: number): string {
  if (previous === 0) return '';
  return (((current - previous) / previous) * 100).toFixed(1);
}

function sectionTitle(title: string): string {
  return escapeCsvCell(title);
}

/**
 * Gera o CSV do relatório completo do mês (KPIs com comparativo, categorias de
 * saídas e entradas com % do total e faturas por cartão). Mesmo formato da
 * exportação de lançamentos e da evolução: separador vírgula, BOM UTF-8 e
 * células escapadas contra injeção de fórmula (Excel/LibreOffice).
 */
export function buildReportsCsv({
  monthLabel,
  totals,
  categories,
  cards,
}: ReportsCsvInput): string {
  const lines: string[] = [];

  lines.push(sectionTitle(`Relatório de ${monthLabel}`));
  lines.push('');

  // KPIs
  lines.push(sectionTitle('Resumo do mês'));
  lines.push(['Métrica', 'Valor', 'Mês anterior', 'Variação %'].map(escapeCsvCell).join(','));
  const kpis: Array<[string, number, number]> = [
    ['Total entradas', totals.entradas, totals.prevEntradas],
    ['Total saídas', totals.saidas, totals.prevSaidas],
    ['Saldo do mês', totals.saldo, totals.prevSaldo],
  ];
  for (const [label, current, previous] of kpis) {
    lines.push(
      [label, money(current), money(previous), variation(current, previous)]
        .map(escapeCsvCell)
        .join(',')
    );
  }
  lines.push('');

  // Categorias (saídas)
  lines.push(sectionTitle('Categorias (saídas)'));
  lines.push(['Categoria', 'Valor', '% do total'].map(escapeCsvCell).join(','));
  const saidasTotal = Object.values(categories.saidas).reduce((sum, v) => sum + v, 0);
  for (const [cat, value] of Object.entries(categories.saidas).sort((a, b) => b[1] - a[1])) {
    lines.push(
      [cat, money(value), saidasTotal > 0 ? ((value / saidasTotal) * 100).toFixed(1) : '0.0']
        .map(escapeCsvCell)
        .join(',')
    );
  }
  lines.push('');

  // Categorias (entradas)
  lines.push(sectionTitle('Categorias (entradas)'));
  lines.push(['Categoria', 'Valor', '% do total'].map(escapeCsvCell).join(','));
  const entradasTotal = Object.values(categories.entradas).reduce((sum, v) => sum + v, 0);
  for (const [cat, value] of Object.entries(categories.entradas).sort((a, b) => b[1] - a[1])) {
    lines.push(
      [cat, money(value), entradasTotal > 0 ? ((value / entradasTotal) * 100).toFixed(1) : '0.0']
        .map(escapeCsvCell)
        .join(',')
    );
  }
  lines.push('');

  // Faturas do mês (opcional)
  if (cards.length > 0) {
    lines.push(sectionTitle('Faturas do mês'));
    lines.push(['Cartão', 'Fatura', 'Limite', 'Uso %'].map(escapeCsvCell).join(','));
    for (const card of cards) {
      const usage = card.limit > 0 ? ((card.total / card.limit) * 100).toFixed(1) : '';
      lines.push(
        [card.name, money(card.total), money(card.limit), usage].map(escapeCsvCell).join(',')
      );
    }
  }

  // BOM UTF-8 (\uFEFF) para o Excel abrir os acentos corretamente.
  return '\uFEFF' + lines.join('\n');
}
