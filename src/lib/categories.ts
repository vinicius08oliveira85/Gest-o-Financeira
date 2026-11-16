/**
 * Categorias como lista editável.
 *
 * O app sempre aceitou categoria como texto livre no lançamento. O CRUD apenas
 * mantém uma lista de nomes sugeridos; os lançamentos continuam guardando
 * `category` como string (sem FK), então renomear/excluir precisa atualizar os
 * registros existentes — isso é feito no App, com os dados já carregados.
 */

export const MAX_CATEGORY_LENGTH = 40;

export type CategoryError = 'empty' | 'duplicate' | 'unchanged' | null;

export type CategoryUpdate = {
  list: string[];
  error: CategoryError;
};

/** Apara espaços, colapsa espaços internos e limita o tamanho. */
export function normalizeCategoryName(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().slice(0, MAX_CATEGORY_LENGTH);
}

/** Chave de comparação: categorias não diferenciam maiúsculas/minúsculas. */
function categoryKey(name: string): string {
  return normalizeCategoryName(name).toLocaleLowerCase('pt-BR');
}

/**
 * Opções mostradas nos seletores: a lista salva pelo usuário + as categorias que
 * já existem nos lançamentos (inclusive de versões anteriores ao CRUD).
 */
export function mergeCategoryOptions(
  stored: readonly string[],
  derived: readonly string[]
): string[] {
  const byKey = new Map<string, string>();
  for (const raw of [...stored, ...derived]) {
    const name = normalizeCategoryName(raw);
    if (!name) continue;
    const key = categoryKey(name);
    if (!byKey.has(key)) byKey.set(key, name);
  }
  return Array.from(byKey.values()).sort((a, b) => a.localeCompare(b, 'pt-BR'));
}

export function addCategoryToList(list: readonly string[], raw: string): CategoryUpdate {
  const name = normalizeCategoryName(raw);
  if (!name) return { list: [...list], error: 'empty' };
  const key = categoryKey(name);
  if (list.some((item) => categoryKey(item) === key)) {
    return { list: [...list], error: 'duplicate' };
  }
  return {
    list: [...list, name].sort((a, b) => a.localeCompare(b, 'pt-BR')),
    error: null,
  };
}

export function renameCategoryInList(
  list: readonly string[],
  from: string,
  rawNext: string
): CategoryUpdate {
  const name = normalizeCategoryName(rawNext);
  const previous = normalizeCategoryName(from);
  if (!name) return { list: [...list], error: 'empty' };
  if (categoryKey(name) === categoryKey(previous)) {
    return { list: [...list], error: 'unchanged' };
  }
  if (list.some((item) => categoryKey(item) === categoryKey(name))) {
    return { list: [...list], error: 'duplicate' };
  }
  // A categoria pode vir só dos lançamentos (texto livre antigo): nesse caso o
  // nome novo precisa entrar na lista, senão o rename se perde ao apagar o
  // último lançamento que a usava.
  const exists = list.some((item) => categoryKey(item) === categoryKey(previous));
  const next = exists
    ? list.map((item) => (categoryKey(item) === categoryKey(previous) ? name : item))
    : [...list, name];
  return { list: next.sort((a, b) => a.localeCompare(b, 'pt-BR')), error: null };
}

export function removeCategoryFromList(list: readonly string[], name: string): string[] {
  const key = categoryKey(name);
  return list.filter((item) => categoryKey(item) !== key);
}

/** Categoria citada mas ainda não salva na lista (texto livre antigo). */
export function isCategoryListed(list: readonly string[], name: string): boolean {
  const key = categoryKey(name);
  return list.some((item) => categoryKey(item) === key);
}
