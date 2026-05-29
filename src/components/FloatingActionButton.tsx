import { Plus } from 'lucide-react';

type FloatingActionButtonProps = {
  onClick: () => void;
};

export function FloatingActionButton({ onClick }: FloatingActionButtonProps) {
  return (
    <div className="fixed bottom-[var(--fab-offset)] right-[var(--fab-offset)] md:hidden">
      <button
        type="button"
        onClick={onClick}
        aria-label="Novo registro"
        className="neu-fab w-14 h-14 rounded-full flex items-center justify-center"
      >
        <Plus size={28} />
      </button>
    </div>
  );
}
