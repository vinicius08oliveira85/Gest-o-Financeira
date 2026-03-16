import type { Entry } from '../types';

const MAX_RECURRENCE_MONTHS = 24;
const DEFAULT_RECURRENCE_MONTHS = 12;

function sameMonthYear(d: Date, month: number, year: number): boolean {
  return d.getMonth() === month && d.getFullYear() === year;
}

function copyDueDateForMonth(baseDueDate: string, targetMonth: number, targetYear: number): string {
  const base = new Date(baseDueDate);
  const day = base.getDate();
  const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
  const safeDay = Math.min(day, lastDay);
  const d = new Date(targetYear, targetMonth, safeDay);
  return d.toISOString().slice(0, 10);
}

/**
 * Gera cópias de lançamentos recorrentes (modelos) para os meses futuros que ainda não possuem cópia.
 * Retorna apenas as novas entradas a serem inseridas.
 */
export function generateMissingRecurringCopies(entries: Entry[]): Entry[] {
  const models = entries.filter((e) => e.isRecurring === true && !e.recurrenceTemplateId);
  const newCopies: Entry[] = [];
  const limitMonths = DEFAULT_RECURRENCE_MONTHS;

  for (const model of models) {
    const modelDate = new Date(model.dueDate);
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
      const alreadyExists = entries.some((e) => {
        if (e.recurrenceTemplateId !== model.id) return false;
        const d = new Date(e.dueDate);
        return sameMonthYear(d, m, y);
      });
      if (alreadyExists) continue;

      const dueDate = copyDueDateForMonth(model.dueDate, m, y);
      newCopies.push({
        id: crypto.randomUUID(),
        name: model.name,
        amount: model.amount,
        dueDate,
        isPaid: false,
        type: model.type,
        createdAt: Date.now(),
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
