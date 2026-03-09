import React from 'react';
import { Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { EntryType } from '../types';

type ModalFormProps = {
  isOpen: boolean;
  isEditing: boolean;
  name: string;
  setName: (v: string) => void;
  amount: string;
  setAmount: (v: string) => void;
  dueDate: string;
  setDueDate: (v: string) => void;
  type: EntryType;
  setType: (v: EntryType) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
};

export function ModalForm({
  isOpen,
  isEditing,
  name,
  setName,
  amount,
  setAmount,
  dueDate,
  setDueDate,
  type,
  setType,
  onSubmit,
  onClose,
}: ModalFormProps) {
  return (
    <AnimatePresence>
      {isOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white w-full max-w-md rounded-3xl shadow-2xl relative z-10 overflow-hidden"
        >
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {isEditing ? 'Editar Registro' : 'Novo Registro'}
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <Plus size={24} className="rotate-45" />
            </button>
          </div>

          <form onSubmit={onSubmit} className="p-6 space-y-4">
            <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
              <button
                type="button"
                onClick={() => setType('cash')}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                  type === 'cash' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'
                }`}
              >
                Entrada
              </button>
              <button
                type="button"
                onClick={() => setType('debt')}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${
                  type === 'debt' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500'
                }`}
              >
                Saída
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Nome do Registro
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={
                  type === 'debt' ? 'Ex: Aluguel, Cartão...' : 'Ex: Salário, Venda...'
                }
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Valor (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Data
                </label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition-all"
                />
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                className={`w-full text-white py-4 rounded-2xl font-semibold transition-all shadow-lg active:scale-[0.98] ${
                  type === 'debt'
                    ? 'bg-red-600 hover:bg-red-700 shadow-red-100'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100'
                }`}
              >
                Salvar {type === 'debt' ? 'Saída' : 'Entrada'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
}
