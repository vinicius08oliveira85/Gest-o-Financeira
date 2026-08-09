import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ChevronDown } from 'lucide-react';

export type NeuSelectOption = { value: string; label: string };

type NeuSelectProps = {
  value: string;
  onChange: (value: string) => void;
  options: NeuSelectOption[];
  className?: string;
  'aria-label'?: string;
};

export function NeuSelect({
  value,
  onChange,
  options,
  className = '',
  'aria-label': ariaLabel,
}: NeuSelectProps) {
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const focusOption = (index: number) => {
    optionRefs.current[index]?.focus();
  };

  // jsdom não expõe requestAnimationFrame por padrão (usado nos testes).
  const raf = (cb: () => void) =>
    typeof requestAnimationFrame === 'function' ? requestAnimationFrame(cb) : setTimeout(cb, 0);

  const openAt = (index: number) => {
    setOpen(true);
    setHighlightedIndex(index);
    raf(() => focusOption(index));
  };

  const moveHighlight = (delta: number) => {
    setHighlightedIndex((prev) => {
      const base = prev ?? 0;
      const next = Math.min(Math.max(base + delta, 0), options.length - 1);
      raf(() => focusOption(next));
      return next;
    });
  };

  const handleTriggerKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        openAt(e.key === 'ArrowDown' ? 0 : options.length - 1);
      } else {
        moveHighlight(e.key === 'ArrowDown' ? 1 : -1);
      }
    } else if ((e.key === 'Enter' || e.key === ' ') && !open) {
      e.preventDefault();
      const current = options.findIndex((o) => o.value === value);
      openAt(current >= 0 ? current : 0);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        ref={triggerRef}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleTriggerKeyDown}
        className="neu-input w-full rounded-full px-3 py-1.5 text-xs sm:text-sm flex items-center justify-between gap-2 min-w-[8rem]"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? 'neu-select-listbox' : undefined}
      >
        <span className="truncate text-left">{selected?.label ?? value}</span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <ul
          id="neu-select-listbox"
          role="listbox"
          className="neu-dropdown neu-list absolute z-50 left-0 right-0 mt-1.5 max-h-56 overflow-y-auto rounded-xl !p-1"
        >
          {options.map((opt, idx) => (
            <li key={opt.value} role="option" aria-selected={opt.value === value}>
              <button
                type="button"
                ref={(el) => {
                  optionRefs.current[idx] = el;
                }}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                  setHighlightedIndex(null);
                  triggerRef.current?.focus();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    moveHighlight(e.key === 'ArrowDown' ? 1 : -1);
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    setOpen(false);
                    setHighlightedIndex(null);
                    triggerRef.current?.focus();
                  }
                }}
                className={`neu-list-item neu-list-menu-item w-full text-left ${
                  opt.value === value ? 'neu-list-item-selected' : ''
                } ${idx === highlightedIndex ? 'neu-list-item-hover' : ''}`}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
