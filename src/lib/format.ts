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
function escapeCsvCell(value: string | number): string {
  const str = String(value);
  const sanitized = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  if (sanitized.includes('"') || sanitized.includes(',') || sanitized.includes('\n')) {
    return `"${sanitized.replace(/"/g, '""')}"`;
  }
  return sanitized;
}

export type ExportCSVOptions = {
  /** Sufixo do nome do arquivo (ex: '_mes_atual') */
  filenameSuffix?: string;
};

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
  const csvContent = csvLines.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  const suffix = options?.filenameSuffix ?? '';
  link.setAttribute(
    'download',
    `lancamentos_${new Date().toISOString().split('T')[0]}${suffix}.csv`
  );
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
