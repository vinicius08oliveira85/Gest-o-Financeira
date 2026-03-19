import { useEffect, useState, useCallback } from 'react';
import type { CreditCard } from '../types';
import { CARDS_STORAGE_KEY } from '../constants';
import { isSupabaseConfigured } from '../lib/supabase';
import { logError } from '../lib/logger';
import { fetchCards, upsertCard as upsertCardDb, deleteCard as deleteCardDb } from '../lib/cardsDb';

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
            const saved = localStorage.getItem(CARDS_STORAGE_KEY);
            if (saved) {
              try {
                const parsed = JSON.parse(saved) as CreditCard[];
                if (Array.isArray(parsed) && parsed.length > 0 && !cancelled) {
                  for (const c of parsed) {
                    try {
                      await upsertCardDb(c);
                    } catch (e) {
                      logError('Migration card failed', e);
                    }
                  }
                  const refetched = await fetchCards();
                  if (!cancelled) setCards(refetched);
                  localStorage.removeItem(CARDS_STORAGE_KEY);
                }
              } catch {
                // ignore parse errors
              }
            }
          }
        } catch (e) {
          logError('Failed to load cards from Supabase', e);
          if (!cancelled) setUseSupabaseSync(false);
          const saved = localStorage.getItem(CARDS_STORAGE_KEY);
          if (saved) {
            try {
              if (!cancelled) setCards(JSON.parse(saved));
            } catch {
              logError('Failed to parse localStorage cards', e);
            }
          }
        } finally {
          if (!cancelled) setIsLoadingCards(false);
        }
      } else {
        try {
          const raw = localStorage.getItem(CARDS_STORAGE_KEY);
          if (raw) {
            const parsed = JSON.parse(raw) as CreditCard[];
            if (Array.isArray(parsed)) setCards(parsed);
          }
        } catch {
          // ignore
        }
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
      localStorage.setItem(CARDS_STORAGE_KEY, JSON.stringify(cards));
    }
  }, [cards, useSupabaseSync]);

  const upsertCard = useCallback(
    (card: Omit<CreditCard, 'id'> & { id?: string }) => {
      if (useSupabaseSync) {
        const prev = cards;
        const optimisticId = card.id ?? crypto.randomUUID();
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
          const id = crypto.randomUUID();
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
