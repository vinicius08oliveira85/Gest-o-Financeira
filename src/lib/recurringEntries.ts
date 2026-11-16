import type { Entry } from '../types';
import { parseDateLocal } from './format';

const MAX_RECURRENCE_MONTHS = 24;
const DEFAULT_RECURRENCE_MONTHS = 12;

function sameMonthYear(d: Date, month: number, year: number): boolean {
  return d.getMonth() === month && d.getFullYear() === year;
}

/**
 * Id determinístico de uma cópia recorrente (modelo + mês). Duas cópias do mesmo
 * mês geradas em dispositivos diferentes caem no MESMO documento (`saveDocument`
 * é upsert), em vez de virarem duas linhas duplicadas no servidor.
 *
 * Formato seguro para o Appwrite: até 36 caracteres, só alfanumérico e hífen.
 */
export function recurringCopyId(templateId: string, dueDateIso: string): string {
  const d = parseDateLocal(dueDateIso);
  const slot = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
  // FNV-1a de 32 bits sobre o id do modelo (dois seeds reduzem colisões).
  const hash = (seed: number) => {
    let h = seed;
    for (let i = 0; i < templateId.length; i++) {
      h ^= templateId.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(36);
  };
  return `rc-${hash(0x811c9dc5)}${hash(0x2545f491)}-${slot}`;
}

export function recurringSlotKey(templateId: string, dueDateIso: string): string {
  const d = parseDateLocal(dueDateIso);
  return `${templateId}|${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function copyDueDateForMonth(
  baseDueDate: string,
  targetMonth: number,
  targetYear: number
): string {
  const base = parseDateLocal(baseDueDate);
  const day = base.getDate();
  const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
  const safeDay = Math.min(day, lastDay);
  const d = new Date(targetYear, targetMonth, safeDay);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/**
 * Gera cópias de lançamentos recorrentes (modelos) para os meses futuros que ainda não possuem cópia.
 * Retorna apenas as novas entradas a serem inseridas.
 */
export function generateMissingRecurringCopies(
  entries: Entry[],
  suppressedSlots?: ReadonlySet<string>
): Entry[] {
  const models = entries.filter((e) => e.isRecurring === true && !e.recurrenceTemplateId);
  const newCopies: Entry[] = [];
  const limitMonths = DEFAULT_RECURRENCE_MONTHS;

  for (const model of models) {
    const modelDate = parseDateLocal(model.dueDate);
    const startMonth = modelDate.getMonth();
    const startYear = modelDate.getFullYear();
    const count = model.recurrenceCount ?? limitMonths;
    const maxMonths = Math.min(count, MAX_RECURRENCE_MONTHS);

    let generated = 0;
    let m = startMonth;
    let y = startYear;

    for (let i = 0; i < maxMonths; i++) {
      m += 1;
      if (m > 11) {
        m = 0;
        y += 1;
      }
      const dueDate = copyDueDateForMonth(model.dueDate, m, y);
      if (suppressedSlots?.has(recurringSlotKey(model.id, dueDate))) continue;

      const alreadyExists = entries.some((e) => {
        if (e.recurrenceTemplateId !== model.id) return false;
        const d = parseDateLocal(e.dueDate);
        return sameMonthYear(d, m, y);
      });
      if (alreadyExists) continue;

      const now = Date.now();
      newCopies.push({
        id: recurringCopyId(model.id, dueDate),
        name: model.name,
        amount: model.amount,
        dueDate,
        isPaid: false,
        type: model.type,
        createdAt: now,
        updatedAt: now,
        category: model.category,
        tag: model.tag,
        isRecurring: false,
        recurrenceCount: undefined,
        recurrenceTemplateId: model.id,
      });
      generated++;
      if (model.recurrenceCount != null && generated >= model.recurrenceCount) break;
    }
  }

  return newCopies;
}

/**
 * Remove cópias recorrentes duplicadas do mesmo modelo/mês, criadas antes do id
 * determinístico (cada dispositivo gerava um id aleatório). Mantém uma — de
 * preferência a que já tem id determinístico — e devolve os ids descartados
 * para que o próximo sync os apague no servidor.
 */
export function dedupeRecurringCopies(entries: Entry[]): {
  entries: Entry[];
  removedIds: string[];
} {
  const groups = new Map<string, Entry[]>();
  for (const entry of entries) {
    if (!entry.recurrenceTemplateId) continue;
    const d = parseDateLocal(entry.dueDate);
    const key = `${entry.recurrenceTemplateId}|${d.getFullYear()}-${d.getMonth()}`;
    const group = groups.get(key);
    if (group) group.push(entry);
    else groups.set(key, [entry]);
  }

  const removedIds: string[] = [];
  const keep = new Set<string>();
  for (const group of groups.values()) {
    if (group.length === 1) continue;
    const preferred =
      group.find((e) => e.id === recurringCopyId(e.recurrenceTemplateId!, e.dueDate)) ??
      [...group].sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id))[0];
    keep.add(preferred.id);
    for (const entry of group) {
      if (entry.id !== preferred.id) removedIds.push(entry.id);
    }
  }

  if (removedIds.length === 0) return { entries, removedIds };
  const removed = new Set(removedIds);
  return { entries: entries.filter((e) => !removed.has(e.id)), removedIds };
}
