import { Plus } from 'lucide-react';

type FloatingActionButtonProps = {
  onClick: () => void;
};

export function FloatingActionButton({ onClick }: FloatingActionButtonProps) {
  return (
    <div className="fixed bottom-6 right-6 md:hidden">
      <button
        onClick={onClick}
        className="bg-emerald-500 text-white w-14 h-14 rounded-full shadow-xl flex items-center justify-center hover:bg-emerald-600 transition-colors"
      >
        <Plus size={28} />
      </button>
    </div>
  );
}
