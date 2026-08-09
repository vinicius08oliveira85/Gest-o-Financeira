/**
 * Máscara de moeda pt-BR para campos de entrada.
 *
 * Mantém o que o usuário digita: separador decimal por vírgula, milhar por ponto
 * e no máximo 2 casas decimais. Ex.: "1234,56" -> "1.234,56"; "1234.56" -> "1.234,56".
 */
export function maskCurrencyInput(raw: string): string {
  if (!raw) return '';
  const s = raw.replace(/[^\d.,]/g, '');
  const commaIdx = s.lastIndexOf(',');
  const dotIdx = s.lastIndexOf('.');
  const decIdx = Math.max(commaIdx, dotIdx);
  const hasDec = decIdx !== -1;

  let intPart = hasDec ? s.slice(0, decIdx) : s;
  let decPart = hasDec ? s.slice(decIdx + 1) : '';
  intPart = intPart.replace(/\D/g, '').replace(/^0+(?=\d)/, '');
  decPart = decPart.replace(/\D/g, '').slice(0, 2);

  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return hasDec ? `${grouped},${decPart}` : grouped;
}

/**
 * Interpreta um valor digitado (com a máscara pt-BR ou formatos alternativos)
 * e devolve o número, ou null se inválido/vazio.
 * Aceita "1.234,56", "1234,56", "1234.56" e "1500".
 */
export function parseCurrencyInput(value: string): number | null {
  const trimmed = (value ?? '').trim().replace(/\s/g, '');
  if (!trimmed) return null;

  let normalized: string;
  const hasComma = trimmed.includes(',');
  const hasDot = trimmed.includes('.');
  if (hasComma) {
    normalized = trimmed.replace(/\./g, '').replace(',', '.');
  } else if (hasDot) {
    const lastDot = trimmed.lastIndexOf('.');
    normalized = trimmed.slice(0, lastDot).replace(/\./g, '') + '.' + trimmed.slice(lastDot + 1);
  } else {
    normalized = trimmed;
  }

  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

/** Formata um número para uso como valor inicial de um input mascarado (ex.: "1.500,00"). */
export function formatCurrencyForInput(value: number): string {
  if (!Number.isFinite(value)) return '';
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
