import { useEffect, useState, useCallback } from 'react';
import type { CreditCard } from '../types';
import { CARDS_STORAGE_KEY } from '../constants';
import { isSupabaseConfigured } from '../lib/supabase';
import { logError } from '../lib/logger';
import { fetchCards, upsertCard as upsertCardDb, deleteCard as deleteCardDb } from '../lib/cardsDb';
import { randomUUID } from '../lib/uuid';
import { readStored, writeStored } from '../lib/storage';

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
          if (!cancelled) {
            setCards(data);
            setUseSupabaseSync(true);
          }
          if (data.length === 0) {
            const saved = await readStored<CreditCard>(CARDS_STORAGE_KEY);
            if (saved.length > 0 && !cancelled) {
              // Só remove o backup local se TODOS os upserts derem certo —
              // falha parcial não pode apagar cartões que ficaram só no dispositivo.
              let migrationFailed = false;
              for (const c of saved) {
                try {
                  await upsertCardDb(c);
                } catch (e) {
                  migrationFailed = true;
                  logError('Migration card failed', e);
                }
              }
              const refetched = await fetchCards();
              if (!cancelled) setCards(refetched);
              if (!migrationFailed) {
                // Migration successful, data now in Supabase
              }
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

  useEffect(() => {
    if (!isSupabaseConfigured() || !useSupabaseSync) {
      writeStored(CARDS_STORAGE_KEY, cards);
    }
  }, [cards, useSupabaseSync]);

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
