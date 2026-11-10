import { useEffect, useState, useCallback } from 'react';
import type { WishlistItem } from '../types';
import { WISHLIST_STORAGE_KEY } from '../constants';
import { isCloudConfigured } from '../lib/appwrite';
import { logError } from '../lib/logger';
import {
  fetchWishlist,
  upsertWishlistItem as upsertWishlistItemDb,
  deleteWishlistItem as deleteWishlistItemDb,
} from '../lib/wishlistDb';
import { randomUUID } from '../lib/uuid';
import { readStored, writeStored } from '../lib/storage';
import { mergeUnconfirmed } from '../lib/recovery';

export function useWishlist() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [useCloudSync, setUseAppwriteSync] = useState(false);
  const [isLoadingWishlist, setIsLoadingWishlist] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (isCloudConfigured()) {
        try {
          const data = await fetchWishlist();
          // Lê o espelho local ANTES de sobrescrever, para não perder itens que
          // existem só neste dispositivo (ex.: tabela criada depois do primeiro uso).
          const saved = await readStored<WishlistItem>(WISHLIST_STORAGE_KEY);
          const localOnly = saved.filter((i) => !data.some((d) => d.id === i.id));

          if (!cancelled) {
            setItems(data);
            setUseAppwriteSync(true);
          }
          if (localOnly.length > 0 && !cancelled) {
            for (const item of localOnly) {
              try {
                await upsertWishlistItemDb(item);
              } catch (e) {
                logError('Migration wishlist item failed', e);
              }
            }
            const refetched = await fetchWishlist();
            if (!cancelled) setItems(mergeUnconfirmed(refetched, localOnly));
          }
        } catch (e) {
          logError('Failed to load wishlist from Appwrite', e);
          if (!cancelled) setUseAppwriteSync(false);
          const saved = await readStored<WishlistItem>(WISHLIST_STORAGE_KEY);
          if (saved.length > 0 && !cancelled) setItems(saved);
        } finally {
          if (!cancelled) setIsLoadingWishlist(false);
        }
      } else {
        const saved = await readStored<WishlistItem>(WISHLIST_STORAGE_KEY);
        if (saved.length > 0) setItems(saved);
        setIsLoadingWishlist(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isLoadingWishlist) return;
    writeStored(WISHLIST_STORAGE_KEY, items);
  }, [items, isLoadingWishlist]);

  const upsertItem = useCallback(
    (item: Omit<WishlistItem, 'id' | 'createdAt'> & { id?: string }) => {
      if (useCloudSync) {
        const optimisticId = item.id ?? randomUUID();
        const previousItem = items.find((i) => i.id === optimisticId);
        const optimistic: WishlistItem = {
          ...item,
          id: optimisticId,
          createdAt: previousItem?.createdAt ?? Date.now(),
        };
        setItems((list) =>
          previousItem
            ? list.map((x) => (x.id === optimisticId ? optimistic : x))
            : [...list, optimistic]
        );
        upsertWishlistItemDb({ ...item, id: optimisticId })
          .then((saved) => {
            setItems((list) => list.map((x) => (x.id === optimisticId ? saved : x)));
          })
          .catch((err) => {
            logError('Failed to save wishlist item to Appwrite', err);
            // Reverte só este item, sem apagar outras alterações feitas enquanto salvava.
            setItems((list) =>
              previousItem
                ? list.map((x) => (x.id === optimisticId ? previousItem : x))
                : list.filter((x) => x.id !== optimisticId)
            );
          });
      } else {
        setItems((prev) => {
          if (item.id) {
            return prev.map((i) =>
              i.id === item.id ? ({ ...i, ...item, id: item.id } as WishlistItem) : i
            );
          }
          return [...prev, { ...item, id: randomUUID(), createdAt: Date.now() } as WishlistItem];
        });
      }
    },
    [items, useCloudSync]
  );

  const deleteItem = useCallback(
    (id: string) => {
      const removed = items.find((x) => x.id === id);
      setItems((list) => list.filter((x) => x.id !== id));
      if (useCloudSync) {
        deleteWishlistItemDb(id).catch((err) => {
          logError('Failed to delete wishlist item from Appwrite', err);
          // Devolve só o item removido, sem sobrescrever outras mudanças.
          if (removed) setItems((list) => [...list, removed]);
        });
      }
    },
    [items, useCloudSync]
  );

  return {
    wishlistItems: items,
    upsertWishlistItem: upsertItem,
    deleteWishlistItem: deleteItem,
    isLoadingWishlist,
  };
}
