import React, { useEffect, useState, useCallback } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Loader2,
  Wallet,
  Plus,
  Minus,
  ShoppingCart,
  TrendingUp,
  Car,
  Home,
  Utensils,
  Activity,
  Zap,
  CreditCard,
  CheckCircle2,
  Clock,
  Trash2,
} from 'lucide-react';
import { useMonth } from '../context/MonthContext';
import { supabase } from '../services/supabase';
import { TransactionModal } from '../components/modals/TransactionModal';

type TransactionType = 'income' | 'expense';

interface DashboardTransaction {
  id: string;
  description: string;
  amount: number;
  date: string | null;
  type: TransactionType;
  is_settled?: boolean;
  spent_for_name?: string | null;
  category_name?: string;
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);

const formatDate = (date: string | null) => {
  if (!date) return 'Data não informada';
  return date.split('-').reverse().join('/');
};

const getTransactionIcon = (desc: string) => {
  const text = desc.toLowerCase();
  if (
    text.includes('mercado') ||
    text.includes('supermercado') ||
    text.includes('muffato') ||
    text.includes('condor') ||
    text.includes('nfc-e') ||
    text.includes('atacadao')
  ) {
    return <ShoppingCart size={15} className="text-[#38BDF8]" />;
  }
  if (text.includes('salário') || text.includes('salario') || text.includes('receita') || text.includes('pix')) {
    return <TrendingUp size={15} className="text-[#10B981]" />;
  }
  if (text.includes('uber') || text.includes('combustivel') || text.includes('posto') || text.includes('transporte')) {
    return <Car size={15} className="text-[#F59E0B]" />;
  }
  if (text.includes('aluguel') || text.includes('condomínio') || text.includes('moradia')) {
    return <Home size={15} className="text-[#A855F7]" />;
  }
  if (text.includes('restaurante') || text.includes('ifood') || text.includes('lanche') || text.includes('burger')) {
    return <Utensils size={15} className="text-[#EC4899]" />;
  }
  if (text.includes('farmacia') || text.includes('saude') || text.includes('medico')) {
    return <Activity size={15} className="text-[#EF4444]" />;
  }
  if (text.includes('internet') || text.includes('luz') || text.includes('energia') || text.includes('copel')) {
    return <Zap size={15} className="text-[#FBBF24]" />;
  }
  return <CreditCard size={15} className="text-[#94A3B8]" />;
};

export const Dashboard: React.FC = () => {
  const { currentDate, formattedMonth } = useMonth();
  const [transactions, setTransactions] = useState<DashboardTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txModalType, setTxModalType] = useState<TransactionType>('expense');

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('id, description, amount, date, type, is_settled, spent_for_name, categories(name)')
        .in('type', ['income', 'expense'])
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedTransactions: DashboardTransaction[] = (data || []).map((t: any) => ({
        id: String(t.id),
        description: t.description?.trim() || 'Movimento sem descrição',
        amount: Number(t.amount) || 0,
        date: t.date,
        type: t.type,
        is_settled: t.is_settled ?? true,
        spent_for_name: t.spent_for_name || null,
        category_name: t.categories?.name || 'Geral',
      }));

      setTransactions(mappedTransactions);
    } catch (error) {
      console.error('Erro ao carregar movimentos do painel:', error);
      setTransactions([]);
      setErrorMsg(
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar os movimentos deste mês.'
      );
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    void fetchTransactions();

    // Escuta em tempo real adições feitas pelo telemóvel ou scanner
    const channel = supabase
      .channel('dashboard-transactions-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        () => {
          void fetchTransactions();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [fetchTransactions]);

  const toggleSettled = async (id: string, currentStatus?: boolean) => {
    const newStatus = !currentStatus;
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, is_settled: newStatus } : t))
    );
    await supabase.from('transactions').update({ is_settled: newStatus }).eq('id', id);
  };

  const handleDeleteTransaction = async (id: string, desc: string) => {
    if (!window.confirm(`Deseja remover "${desc}"?`)) return;
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    await supabase.from('transactions').delete().eq('id', id);
  };

  const incomeTotal = transactions
    .filter((t) => t.type === 'income')
    .reduce((total, t) => total + t.amount, 0);
  const expenseTotal = transactions
    .filter((t) => t.type === 'expense')
    .reduce((total, t) => total + t.amount, 0);
  const balance = incomeTotal - expenseTotal;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#F8FAFC]">Visão Geral</h1>
          <p className="mt-1 text-xs text-[#64748B]">Resumo financeiro de {formattedMonth}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setTxModalType('income');
              setIsTxModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#10B981]/15 border border-[#10B981]/30 text-[#10B981] text-xs font-bold hover:bg-[#10B981]/25 transition-all"
          >
            <Plus size={14} />
            Receita
          </button>

          <button
            onClick={() => {
              setTxModalType('expense');
              setIsTxModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F43F5E]/15 border border-[#F43F5E]/30 text-[#FB7185] text-xs font-bold hover:bg-[#F43F5E]/25 transition-all"
          >
            <Minus size={14} />
            Despesa
          </button>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3" aria-label="Resumo financeiro">
        <div className="rounded-2xl border border-[#1E293B] bg-[#131927] p-5">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#94A3B8]">
            <ArrowDownLeft size={16} className="text-[#10B981]" />
            Entradas
          </div>
          <p className="text-2xl font-black text-[#10B981]">{formatCurrency(incomeTotal)}</p>
        </div>

        <div className="rounded-2xl border border-[#1E293B] bg-[#131927] p-5">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#94A3B8]">
            <ArrowUpRight size={16} className="text-[#F43F5E]" />
            Saídas
          </div>
          <p className="text-2xl font-black text-[#F43F5E]">{formatCurrency(expenseTotal)}</p>
        </div>

        <div className="rounded-2xl border border-[#1E293B] bg-[#131927] p-5">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#94A3B8]">
            <Wallet size={16} className="text-[#38BDF8]" />
            Saldo do mês
          </div>
          <p className={`text-2xl font-black ${balance < 0 ? 'text-[#F43F5E]' : 'text-[#F8FAFC]'}`}>
            {formatCurrency(balance)}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-[#1E293B] bg-[#131927] p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#F8FAFC]">Extrato de Movimentos</h2>
          <span className="text-xs font-semibold text-[#64748B]">{transactions.length} lançamento(s)</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-xs text-[#94A3B8]">
            <Loader2 size={16} className="animate-spin text-[#10B981]" />
            Carregando movimentos...
          </div>
        ) : errorMsg ? (
          <p role="alert" className="rounded-xl bg-[#F43F5E]/10 border border-[#F43F5E]/20 p-3 text-xs text-[#F43F5E]">
            {errorMsg}
          </p>
        ) : transactions.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#64748B]">
            Nenhum movimento registrado neste mês.
          </div>
        ) : (
          <div className="divide-y divide-[#1E293B]/60">
            {transactions.map((transaction) => {
              const isIncome = transaction.type === 'income';
              return (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between gap-4 py-3 hover:bg-[#1E293B]/20 px-2 rounded-xl transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-[#0B0F19] border border-white/5 flex items-center justify-center shrink-0">
                      {getTransactionIcon(transaction.description)}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-[#F8FAFC]">
                        {transaction.description}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#64748B]">
                        {transaction.category_name} • {formatDate(transaction.date)}
                        {transaction.spent_for_name && (
                          <span className="ml-2 text-amber-400 font-semibold">
                            (Para: {transaction.spent_for_name})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p
                        className={`text-xs font-black ${
                          isIncome ? 'text-[#10B981]' : 'text-[#F8FAFC]'
                        }`}
                      >
                        {isIncome ? '+' : '-'} {formatCurrency(transaction.amount)}
                      </p>
                      <button
                        onClick={() => toggleSettled(transaction.id, transaction.is_settled)}
                        className={`mt-0.5 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded flex items-center gap-1 ml-auto ${
                          transaction.is_settled
                            ? 'bg-[#10B981]/15 text-[#10B981]'
                            : 'bg-amber-500/15 text-amber-400'
                        }`}
                      >
                        {transaction.is_settled ? (
                          <>
                            <CheckCircle2 size={10} /> Efetivado
                          </>
                        ) : (
                          <>
                            <Clock size={10} /> Pendente
                          </>
                        )}
                      </button>
                    </div>

                    <button
                      onClick={() => handleDeleteTransaction(transaction.id, transaction.description)}
                      className="p-1 text-[#64748B] hover:text-[#F43F5E] transition"
                      title="Excluir lançamento"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <TransactionModal
        isOpen={isTxModalOpen}
        initialType={txModalType}
        currentMonthDate={currentDate}
        onClose={() => setIsTxModalOpen(false)}
        onSuccess={() => {
          void fetchTransactions();
        }}
      />
    </div>
  );
};