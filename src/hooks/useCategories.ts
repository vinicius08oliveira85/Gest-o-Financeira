import { useCallback, useState } from 'react';
import { CATEGORIES_STORAGE_KEY } from '../constants';
import { logError } from '../lib/logger';
import {
  addCategoryToList,
  normalizeCategoryName,
  removeCategoryFromList,
  renameCategoryInList,
  type CategoryError,
} from '../lib/categories';

export type CategoryMutation = { error: CategoryError };

/** Categorias salvas neste dispositivo (lista vazia quando nunca configuradas). */
export function readCategories(): string[] {
  try {
    const raw = localStorage.getItem(CATEGORIES_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is string => typeof item === 'string')
      .map(normalizeCategoryName)
      .filter(Boolean);
  } catch (e) {
    logError('Failed to read categories', e);
    return [];
  }
}

/**
 * Lista de categorias do usuário.
 *
 * Fica em localStorage pelo mesmo motivo do saldo inicial: sincronizar exigiria
 * uma coleção nova no Appwrite. As categorias já usadas em lançamentos
 * continuam aparecendo nos seletores (ver `mergeCategoryOptions`), então a
 * falta de sync não esconde dados — só a lista "curada" é por dispositivo.
 */
export function useCategories() {
  const [categories, setCategories] = useState<string[]>(readCategories);

  const persist = useCallback((next: string[]) => {
    setCategories(next);
    try {
      localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      logError('Failed to save categories', e);
    }
  }, []);

  const addCategory = useCallback(
    (name: string): CategoryMutation => {
      const { list, error } = addCategoryToList(categories, name);
      if (!error) persist(list);
      return { error };
    },
    [categories, persist]
  );

  const renameCategory = useCallback(
    (from: string, to: string): CategoryMutation => {
      const { list, error } = renameCategoryInList(categories, from, to);
      if (!error) persist(list);
      return { error };
    },
    [categories, persist]
  );

  const removeCategory = useCallback(
    (name: string) => {
      persist(removeCategoryFromList(categories, name));
    },
    [categories, persist]
  );

  return { categories, addCategory, renameCategory, removeCategory };
}
