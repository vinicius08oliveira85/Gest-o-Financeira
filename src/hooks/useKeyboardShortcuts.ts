import { useEffect, useCallback } from 'react';

type ShortcutHandler = (event: KeyboardEvent) => void;

interface Shortcut {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: ShortcutHandler;
  description?: string;
  preventDefault?: boolean;
}

function matchesShortcut(event: KeyboardEvent, shortcut: Shortcut): boolean {
  if (event.key.toLowerCase() !== shortcut.key.toLowerCase()) return false;
  if (shortcut.ctrl && !event.ctrlKey) return false;
  if (shortcut.meta && !event.metaKey) return false;
  if (shortcut.shift && !event.shiftKey) return false;
  if (shortcut.alt && !event.altKey) return false;
  return true;
}

export function useKeyboardShortcuts(shortcuts: Shortcut[]): void {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Ignore shortcuts when typing in inputs, textareas, or contenteditable
      const target = event.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
      if (isInput) return;

      for (const shortcut of shortcuts) {
        if (matchesShortcut(event, shortcut)) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }
          shortcut.handler(event);
          break;
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export function createShortcut(
  key: string,
  handler: ShortcutHandler,
  options: Partial<Omit<Shortcut, 'key' | 'handler'>> = {}
): Shortcut {
  return { key, handler, ...options };
}
