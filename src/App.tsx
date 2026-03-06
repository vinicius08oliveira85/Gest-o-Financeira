import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  Pencil,
  Filter,
  TrendingDown,
  Calendar,
  DollarSign,
  ArrowUpRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Entry, FilterType, EntryType } from './types';
import { isSupabaseConfigured } from './lib/supabase';
import {
  fetchEntries,
  insertEntry,
  updateEntry,
  updateEntryIsPaid,
  deleteEntry as deleteEntryDb,
} from './lib/entriesDb';

export default function App() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [type, setType] = useState<EntryType>('debt');

  // Quando o load do Supabase falha: persistir em localStorage nesta sessão e mostrar banner
  const [useSupabaseSync, setUseSupabaseSync] = useState(true);
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);

  // Load data: Supabase first; fallback to localStorage. One-time migration from localStorage to Supabase when Supabase is empty.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (isSupabaseConfigured()) {
        try {
          const data = await fetchEntries();
          if (!cancelled) setEntries(data);
          // One-time migration: if Supabase empty and localStorage has data, insert and then reload
          if (data.length === 0) {
            const saved = localStorage.getItem('personal-debts');
            if (saved) {
              try {
                const parsed = JSON.parse(saved) as Entry[];
                if (Array.isArray(parsed) && parsed.length > 0 && !cancelled) {
                  for (const entry of parsed) {
                    await insertEntry(entry);
                  }
                  const refetched = await fetchEntries();
                  if (!cancelled) setEntries(refetched);
                  localStorage.removeItem('personal-debts');
                }
              } catch {
                // ignore migration parse errors
              }
            }
          }
        } catch (e) {
          console.error('Failed to load entries from Supabase', e);
          if (!cancelled) {
            setUseSupabaseSync(false);
            setShowOfflineBanner(true);
          }
          const saved = localStorage.getItem('personal-debts');
          if (saved) {
            try {
              if (!cancelled) setEntries(JSON.parse(saved));
            } catch {
              console.error('Failed to parse localStorage entries', e);
            }
          } else if (!cancelled) {
            setEntries([]);
          }
        }
      } else {
        const saved = localStorage.getItem('personal-debts');
        if (saved) {
          try {
            setEntries(JSON.parse(saved));
          } catch (e) {
            console.error('Failed to parse entries', e);
          }
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // Save to localStorage when Supabase is not configured or when load failed (offline fallback)
  useEffect(() => {
    if (!isSupabaseConfigured() || !useSupabaseSync) {
      localStorage.setItem('personal-debts', JSON.stringify(entries));
    }
  }, [entries, useSupabaseSync]);

  const handleAddEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !amount || !dueDate) return;

    if (editingEntry) {
      const updated: Entry = {
        ...editingEntry,
        name,
        amount: parseFloat(amount),
        dueDate,
        type,
      };
      setEntries(entries.map(entry =>
        entry.id === editingEntry.id ? updated : entry
      ));
      closeForm();
      if (useSupabaseSync) updateEntry(updated).catch((err) => console.error('Erro ao salvar no Supabase', err));
    } else {
      const newEntry: Entry = {
        id: crypto.randomUUID(),
        name,
        amount: parseFloat(amount),
        dueDate,
        isPaid: false,
        type,
        createdAt: Date.now(),
      };
      setEntries([newEntry, ...entries]);
      closeForm();
      if (useSupabaseSync) insertEntry(newEntry).catch((err) => console.error('Erro ao salvar no Supabase', err));
    }
  };

  const closeForm = () => {
    setName('');
    setAmount('');
    setDueDate('');
    setType('debt');
    setEditingEntry(null);
    setIsFormOpen(false);
  };

  const handleEdit = (entry: Entry) => {
    setEditingEntry(entry);
    setName(entry.name);
    setAmount(entry.amount.toString());
    setDueDate(entry.dueDate);
    setType(entry.type);
    setIsFormOpen(true);
  };

  const togglePaid = (id: string) => {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;
    const nextPaid = !entry.isPaid;
    setEntries(entries.map((e) => (e.id === id ? { ...e, isPaid: nextPaid } : e)));
    if (useSupabaseSync) updateEntryIsPaid(id, nextPaid).catch((err) => console.error('Erro ao atualizar no Supabase', err));
  };

  const deleteEntry = (id: string) => {
    setEntries(entries.filter((entry) => entry.id !== id));
    if (useSupabaseSync) deleteEntryDb(id).catch((err) => console.error('Erro ao excluir no Supabase', err));
  };

  const filteredEntries = useMemo(() => {
    let result = entries;
    if (filter === 'pending') result = result.filter(d => !d.isPaid);
    else if (filter === 'paid') result = result.filter(d => d.isPaid);
    else if (filter === 'debt') result = result.filter(d => d.type === 'debt');
    else if (filter === 'cash') result = result.filter(d => d.type === 'cash');
    return result;
  }, [entries, filter]);

  const totalDebts = useMemo(() => 
    entries.filter(d => d.type === 'debt' && !d.isPaid).reduce((acc, d) => acc + d.amount, 0)
  , [entries]);

  const totalCash = useMemo(() => 
    entries.filter(d => d.type === 'cash').reduce((acc, d) => acc + d.amount, 0)
  , [entries]);

  const balance = totalCash - totalDebts;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const exportToCSV = () => {
    if (entries.length === 0) return;

    const headers = ['Tipo', 'Nome', 'Valor', 'Vencimento', 'Status'];
    const rows = entries.map(d => [
      d.type === 'debt' ? 'Dívida' : 'Caixa',
      d.name,
      d.amount.toString(),
      d.dueDate,
      d.isPaid ? 'Pago/Recebido' : 'Pendente'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `dividas_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-slate-900 font-sans selection:bg-emerald-100">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-500 p-2 rounded-lg">
              <TrendingDown className="text-white w-5 h-5" />
            </div>
            <h1 className="font-semibold text-lg tracking-tight">Gestão Financeira</h1>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={exportToCSV}
              className="hidden sm:flex text-slate-500 hover:text-slate-900 px-4 py-2 rounded-full text-sm font-medium items-center gap-2 transition-colors"
            >
              Exportar CSV
            </button>
            <button 
              onClick={() => setIsFormOpen(true)}
              className="bg-slate-900 text-white px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-sm"
            >
              <Plus size={18} />
              Novo Registro
            </button>
          </div>
        </div>
      </header>

      {showOfflineBanner && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center justify-between gap-4 max-w-5xl mx-auto">
          <p className="text-sm text-amber-800">
            Conexão com o servidor indisponível. Exibindo dados salvos neste dispositivo.
          </p>
          <button
            type="button"
            onClick={() => setShowOfflineBanner(false)}
            className="text-amber-700 hover:text-amber-900 font-medium text-sm whitespace-nowrap"
          >
            Dispensar
          </button>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Caixa Disponível</span>
              <div className="bg-emerald-50 p-2 rounded-full">
                <ArrowUpRight className="text-emerald-500 w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-light tracking-tight text-emerald-600">{formatCurrency(totalCash)}</div>
            <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
              <span>{entries.filter(d => d.type === 'cash').length} entradas registradas</span>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Dívidas Pendentes</span>
              <div className="bg-red-50 p-2 rounded-full">
                <TrendingDown className="text-red-500 w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-light tracking-tight text-red-600">{formatCurrency(totalDebts)}</div>
            <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
              <span>{entries.filter(d => d.type === 'debt' && !d.isPaid).length} dívidas em aberto</span>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className={`p-6 rounded-2xl shadow-sm border ${balance >= 0 ? 'bg-slate-900 border-slate-800' : 'bg-red-900 border-red-800'}`}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Saldo Final</span>
              <div className="bg-white/10 p-2 rounded-full">
                <DollarSign className="text-white w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-light tracking-tight text-white">{formatCurrency(balance)}</div>
            <div className="mt-4 w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(Math.max((totalCash / (totalCash + totalDebts || 1)) * 100, 0), 100)}%` }}
                className="h-full bg-emerald-400"
              />
            </div>
          </motion.div>
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
          <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm w-full sm:w-auto overflow-x-auto">
            {(['all', 'pending', 'paid', 'debt', 'cash'] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`whitespace-nowrap px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  filter === f 
                    ? 'bg-slate-900 text-white shadow-sm' 
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {f === 'all' ? 'Todos' : f === 'pending' ? 'Pendentes' : f === 'paid' ? 'Pagos' : f === 'debt' ? 'Dívidas' : 'Caixa'}
              </button>
            ))}
          </div>

          <div className="text-sm text-slate-500 font-medium">
            Mostrando {filteredEntries.length} de {entries.length} registros
          </div>
        </div>

        {/* Entry List */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <AnimatePresence mode="popLayout">
            {filteredEntries.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {filteredEntries.map((entry) => (
                  <motion.div
                    key={entry.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="group flex items-center p-4 hover:bg-slate-50 transition-colors"
                  >
                    <button 
                      onClick={() => togglePaid(entry.id)}
                      className={`mr-4 transition-colors ${entry.isPaid ? 'text-emerald-500' : 'text-slate-300 hover:text-slate-400'}`}
                    >
                      {entry.isPaid ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                    </button>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className={`font-medium truncate ${entry.isPaid ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                          {entry.name}
                        </h3>
                        {entry.type === 'cash' && (
                          <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded">Caixa</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Calendar size={12} />
                          {entry.type === 'debt' ? 'Vence em' : 'Data:'} {formatDate(entry.dueDate)}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          entry.isPaid 
                            ? 'bg-emerald-50 text-emerald-600' 
                            : entry.type === 'debt' && new Date(entry.dueDate) < new Date() 
                              ? 'bg-red-50 text-red-600'
                              : 'bg-slate-100 text-slate-600'
                        }`}>
                          {entry.isPaid ? (entry.type === 'debt' ? 'Pago' : 'Recebido') : (entry.type === 'debt' && new Date(entry.dueDate) < new Date() ? 'Atrasado' : 'Pendente')}
                        </span>
                      </div>
                    </div>

                    <div className="text-right mr-4">
                      <div className={`font-semibold ${entry.isPaid ? 'text-slate-400' : entry.type === 'cash' ? 'text-emerald-600' : 'text-red-600'}`}>
                        {entry.type === 'cash' ? '+' : '-'}{formatCurrency(entry.amount)}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={() => handleEdit(entry)}
                        className="p-2 text-slate-300 hover:text-blue-500"
                      >
                        <Pencil size={18} />
                      </button>
                      <button 
                        onClick={() => deleteEntry(entry.id)}
                        className="p-2 text-slate-300 hover:text-red-500"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Filter className="text-slate-300 w-8 h-8" />
                </div>
                <h3 className="text-slate-900 font-medium">Nenhum registro encontrado</h3>
                <p className="text-slate-500 text-sm mt-1">Tente mudar o filtro ou adicione um novo registro.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Modal Form */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeForm}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white w-full max-w-md rounded-3xl shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-xl font-semibold">{editingEntry ? 'Editar Registro' : 'Novo Registro'}</h2>
                <button 
                  onClick={closeForm}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <Plus size={24} className="rotate-45" />
                </button>
              </div>
              
              <form onSubmit={handleAddEntry} className="p-6 space-y-4">
                <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
                  <button
                    type="button"
                    onClick={() => setType('debt')}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${type === 'debt' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-500'}`}
                  >
                    Dívida
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('cash')}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${type === 'cash' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}
                  >
                    Caixa / Entrada
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Nome do Registro</label>
                  <input 
                    type="text" 
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={type === 'debt' ? "Ex: Aluguel, Cartão..." : "Ex: Salário, Venda..."}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-500/20 focus:border-slate-500 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Valor (R$)</label>
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
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Data</label>
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
                    className={`w-full text-white py-4 rounded-2xl font-semibold transition-all shadow-lg active:scale-[0.98] ${type === 'debt' ? 'bg-red-600 hover:bg-red-700 shadow-red-100' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100'}`}
                  >
                    Salvar {type === 'debt' ? 'Dívida' : 'Entrada'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Action Button for Mobile */}
      <div className="fixed bottom-6 right-6 md:hidden">
        <button 
          onClick={() => setIsFormOpen(true)}
          className="bg-emerald-500 text-white w-14 h-14 rounded-full shadow-xl flex items-center justify-center hover:bg-emerald-600 transition-colors"
        >
          <Plus size={28} />
        </button>
      </div>
    </div>
  );
}
