import { useEffect, type ReactNode, type Ref } from 'react';
import { createPortal } from 'react-dom';

export type ModalShellProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  contentRef?: Ref<HTMLDivElement>;
  /** sm (384px) ou md (448px) */
  size?: 'sm' | 'md';
  rootClassName?: string;
  panelClassName?: string;
  'aria-labelledby'?: string;
};

export function ModalShell({
  open,
  onClose,
  children,
  contentRef,
  size = 'sm',
  rootClassName = '',
  panelClassName = '',
  'aria-labelledby': ariaLabelledBy,
}: ModalShellProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  const panelSizeClass = size === 'md' ? 'neu-modal--md' : '';

  return createPortal(
    <div className={`neu-modal-root ${rootClassName}`.trim()} role="presentation">
      <button
        type="button"
        onClick={onClose}
        className="neu-modal-backdrop"
        aria-label="Fechar"
        tabIndex={-1}
      />
      <div
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        tabIndex={-1}
        className={`neu-modal ${panelSizeClass} ${panelClassName}`.trim()}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
