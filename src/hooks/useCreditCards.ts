import { useEffect, useState, useCallback } from 'react';
import type { CreditCard } from '../types';
import { CARDS_STORAGE_KEY } from '../constants';
import { isSupabaseConfigured } from '../lib/supabase';
import { logError } from '../lib/logger';
import { fetchCards, upsertCard as upsertCardDb, deleteCard as deleteCardDb } from '../lib/cardsDb';
import { randomUUID } from '../lib/uuid';
import { readStored, writeStored } from '../lib/storage';
import { mergeUnconfirmed } from '../lib/recovery';

export function useCreditCards() {
  const [cards, setCards] = useState<CreditCard[]>([]);
  const [useSupabaseSync, setUseSupabaseSync] = useState(false);
  const [isLoadingCards, setIsLoadingCards] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (isSupabaseConfigured()) {
        try {
          const data = await fetchCards();
          // Lê o espelho local ANTES de sobrescrever o estado: quando a nuvem devolveva
          // ao menos uma linha, os cartões que existiam só neste dispositivo sumiam.
          const saved = await readStored<CreditCard>(CARDS_STORAGE_KEY);
          const localOnly = saved.filter((c) => !data.some((d) => d.id === c.id));

          if (!cancelled) {
            setCards(data);
            setUseSupabaseSync(true);
          }
          if (localOnly.length > 0 && !cancelled) {
            for (const c of localOnly) {
              try {
                await upsertCardDb(c);
              } catch (e) {
                logError('Migration card failed', e);
              }
            }
            const refetched = await fetchCards();
            if (!cancelled) {
              // O que o servidor recusou continua visível e no espelho local.
              setCards(mergeUnconfirmed(refetched, localOnly));
            }
          }
        } catch (e) {
          logError('Failed to load cards from Supabase', e);
          if (!cancelled) setUseSupabaseSync(false);
          const saved = await readStored<CreditCard>(CARDS_STORAGE_KEY);
          if (saved.length > 0 && !cancelled) setCards(saved);
        } finally {
          if (!cancelled) setIsLoadingCards(false);
        }
      } else {
        const saved = await readStored<CreditCard>(CARDS_STORAGE_KEY);
        if (saved.length > 0) setCards(saved);
        setIsLoadingCards(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Espelho local sempre ativo: nada é gravado antes do hydrate (o estado inicial
   * `[]` apagava o backup) e o espelho acompanha o estado mesmo em modo nuvem,
   * para que um reload após falha de sync não restaure uma cópia velha.
   */
  useEffect(() => {
    if (isLoadingCards) return;
    writeStored(CARDS_STORAGE_KEY, cards);
  }, [cards, isLoadingCards]);

  const upsertCard = useCallback(
    (card: Omit<CreditCard, 'id'> & { id?: string }) => {
      if (useSupabaseSync) {
        const prev = cards;
        const optimisticId = card.id ?? randomUUID();
        const optimistic: CreditCard = { ...(card as Omit<CreditCard, 'id'>), id: optimisticId };
        setCards((c) =>
          card.id ? c.map((x) => (x.id === card.id ? optimistic : x)) : [...c, optimistic]
        );
        upsertCardDb({ ...card, id: optimisticId })
          .then((saved) => {
            setCards((c) => c.map((x) => (x.id === optimisticId ? saved : x)));
          })
          .catch((err) => {
            logError('Failed to save card to Supabase', err);
            setCards(prev);
          });
      } else {
        setCards((prev) => {
          if (card.id) {
            return prev.map((c) => (c.id === card.id ? (card as CreditCard) : c));
          }
          const id = randomUUID();
          const createdAt = new Date().toISOString();
          return [...prev, { ...(card as Omit<CreditCard, 'id'>), id, createdAt }];
        });
      }
    },
    [cards, useSupabaseSync]
  );

  const deleteCard = useCallback(
    (id: string) => {
      const previous = cards;
      setCards((c) => c.filter((x) => x.id !== id));
      if (useSupabaseSync) {
        deleteCardDb(id).catch((err) => {
          logError('Failed to delete card from Supabase', err);
          setCards(previous);
        });
      }
    },
    [cards, useSupabaseSync]
  );

  return {
    cards,
    upsertCard,
    deleteCard,
    isLoadingCards,
  };
}
