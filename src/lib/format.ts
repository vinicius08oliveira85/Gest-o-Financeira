import type { Entry } from '../types';

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

/**
 * Interpreta uma string ISO (YYYY-MM-DD) como meio-dia no horário local,
 * evitando o deslocamento de fuso horário que ocorre quando o JS parseia
 * datas sem hora como meia-noite UTC.
 */
export function parseDateLocal(dateStr: string): Date {
  return new Date(dateStr + 'T12:00:00');
}

/**
 * Retorna a data de hoje no formato ISO (YYYY-MM-DD) usando getters locais,
 * evitando que toISOString() retorne a data UTC (que pode ser diferente da local).
 */
export function todayLocalISO(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}

/**
 * Escapa um valor para uso em CSV: aspas, vírgulas e injeção de fórmulas
 * (Excel/LibreOffice). Células que começam com =, +, -, @, tab ou CR recebem
 * um apóstrofo na frente para não serem interpretadas como fórmula.
 */
export function escapeCsvCell(value: string | number): string {
  const str = String(value);
  const startsWithFormulaChar = /^[=+@\t\r]/.test(str);
  // Sinal de menos só vira fórmula quando não é um número negativo legítimo
  // (ex.: '-123.45' fica como número no Excel; '-2+3' é sanitizado).
  const startsWithDashNotNumber = /^-/.test(str) && !/^-?\d+(\.\d+)?$/.test(str);
  const sanitized = startsWithFormulaChar || startsWithDashNotNumber ? `'${str}` : str;
  if (sanitized.includes('"') || sanitized.includes(',') || sanitized.includes('\n')) {
    return `"${sanitized.replace(/"/g, '""')}"`;
  }
  return sanitized;
}

export type ExportCSVOptions = {
  /** Sufixo do nome do arquivo (ex: '_mes_atual') */
  filenameSuffix?: string;
};

/**
 * Dispara o download de um conteúdo CSV (espera BOM UTF-8 já incluído).
 * Helper compartilhado entre a exportação de lançamentos, evolução e relatórios.
 */
export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportEntriesToCSV(entries: Entry[], options?: ExportCSVOptions): void {
  if (entries.length === 0) return;

  const headers = [
    'Tipo',
    'Nome',
    'Valor',
    'Vencimento',
    'Status',
    'Data Pgto',
    'Categoria',
    'Tag',
    'Parcelas',
  ];
  const rows = entries.map((d) => {
    const parcelas =
      d.installmentsCount != null && d.installmentNumber != null
        ? `${d.installmentNumber}/${d.installmentsCount}`
        : '';
    return [
      d.type === 'debt' ? 'Saída' : 'Entrada',
      d.name,
      d.amount.toString(),
      d.dueDate,
      d.isPaid ? 'Finalizado' : 'Pendente',
      d.paidDate ? formatDate(d.paidDate) : '',
      d.category ?? '',
      d.tag ?? '',
      parcelas,
    ];
  });

  const csvLines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((r) => r.map(escapeCsvCell).join(',')),
  ];
  // BOM UTF-8 (\uFEFF) para o Excel abrir os acentos ("Saída"/"Fatura") corretamente.
  const csvContent = '\uFEFF' + csvLines.join('\n');
  const suffix = options?.filenameSuffix ?? '';
  downloadCsv(csvContent, `lancamentos_${new Date().toISOString().split('T')[0]}${suffix}.csv`);
}
