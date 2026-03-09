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

/** Escapa um valor para uso em CSV (aspas e vírgulas). */
function escapeCsvCell(value: string | number): string {
  const str = String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportEntriesToCSV(entries: Entry[]): void {
  if (entries.length === 0) return;

  const headers = ['Tipo', 'Nome', 'Valor', 'Vencimento', 'Status'];
  const rows = entries.map((d) => [
    d.type === 'debt' ? 'Saída' : 'Entrada',
    d.name,
    d.amount.toString(),
    d.dueDate,
    d.isPaid ? 'Finalizado' : 'Pendente',
  ]);

  const csvLines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((r) => r.map(escapeCsvCell).join(',')),
  ];
  const csvContent = csvLines.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `lancamentos_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
