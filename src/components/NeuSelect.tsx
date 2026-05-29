import { useEffect, useRef, useState } from 'react';
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
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="neu-input w-full rounded-full px-3 py-1.5 text-xs sm:text-sm flex items-center justify-between gap-2 min-w-[8rem]"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span className="truncate text-left">{selected?.label ?? value}</span>
        <ChevronDown
          size={14}
          className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <ul
          role="listbox"
          className="neu-dropdown neu-list absolute z-50 left-0 right-0 mt-1.5 max-h-56 overflow-y-auto rounded-xl !p-1"
        >
          {options.map((opt) => (
            <li key={opt.value} role="option" aria-selected={opt.value === value}>
              <button
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`neu-list-item neu-list-menu-item w-full text-left ${
                  opt.value === value ? 'neu-list-item-selected' : ''
                }`}
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
