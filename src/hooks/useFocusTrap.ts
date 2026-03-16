import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.hasAttribute('disabled') && el.offsetParent !== null
  );
}

export function useFocusTrap(containerRef: RefObject<HTMLElement | null>, isActive: boolean): void {
  const previousActiveElement = useRef<Element | null>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    previousActiveElement.current = document.activeElement;

    const focusable = getFocusableElements(container);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (first) {
      (first as HTMLElement).focus();
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;
      if (focusable.length === 0) return;

      const current = document.activeElement;
      if (e.shiftKey) {
        if (current === first) {
          e.preventDefault();
          (last as HTMLElement).focus();
        }
      } else {
        if (current === last) {
          e.preventDefault();
          (first as HTMLElement).focus();
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown);
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      if (previousActiveElement.current && previousActiveElement.current instanceof HTMLElement) {
        previousActiveElement.current.focus();
      }
    };
  }, [isActive, containerRef]);
}
