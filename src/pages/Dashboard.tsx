import React, { useEffect, useState, useCallback } from 'react';
import { ArrowDownLeft, ArrowUpRight, Loader2, Wallet, Plus, Minus } from 'lucide-react';
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
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);

const formatDate = (date: string | null) => {
  if (!date) return 'Data não informada';
  return new Date(`${date}T00:00:00`).toLocaleDateString('pt-BR');
};

export const Dashboard: React.FC = () => {
  const { currentDate, formattedMonth } = useMonth();
  const [transactions, setTransactions] = useState<DashboardTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txModalType, setTxModalType] = useState<'income' | 'expense'>('expense');

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
        .select('id, description, amount, date, type')
        .in('type', ['income', 'expense'])
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      if (error) throw error;

      const mappedTransactions: DashboardTransaction[] = (data || []).map((transaction) => ({
        id: String(transaction.id),
        description: transaction.description?.trim() || 'Movimento sem descrição',
        amount: Number(transaction.amount) || 0,
        date: transaction.date,
        type: transaction.type,
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
  }, [fetchTransactions]);

  const incomeTotal = transactions
    .filter((transaction) => transaction.type === 'income')
    .reduce((total, transaction) => total + transaction.amount, 0);
  const expenseTotal = transactions
    .filter((transaction) => transaction.type === 'expense')
    .reduce((total, transaction) => total + transaction.amount, 0);
  const balance = incomeTotal - expenseTotal;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#F8FAFC]">Visão geral</h1>
          <p className="mt-1 text-xs text-[#64748B]">Resumo financeiro de {formattedMonth}</p>
        </div>

        {/* Botões de Ação Rápida */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setTxModalType('income');
              setIsTxModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#10B981]/15 border border-[#10B981]/30 text-[#10B981] text-xs font-bold hover:bg-[#10B981]/25 transition-all"
          >
            <Plus size={14} />
            Receita
          </button>

          <button
            onClick={() => {
              setTxModalType('expense');
              setIsTxModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#F43F5E]/15 border border-[#F43F5E]/30 text-[#FB7185] text-xs font-bold hover:bg-[#F43F5E]/25 transition-all"
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
          <p className="text-2xl font-extrabold text-[#10B981]">{formatCurrency(incomeTotal)}</p>
        </div>

        <div className="rounded-2xl border border-[#1E293B] bg-[#131927] p-5">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#94A3B8]">
            <ArrowUpRight size={16} className="text-[#F43F5E]" />
            Saídas
          </div>
          <p className="text-2xl font-extrabold text-[#F43F5E]">{formatCurrency(expenseTotal)}</p>
        </div>

        <div className="rounded-2xl border border-[#1E293B] bg-[#131927] p-5">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#94A3B8]">
            <Wallet size={16} className="text-[#38BDF8]" />
            Saldo do mês
          </div>
          <p className={`text-2xl font-extrabold ${balance < 0 ? 'text-[#F43F5E]' : 'text-[#F8FAFC]'}`}>
            {formatCurrency(balance)}
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-[#1E293B] bg-[#131927] p-5">
        <h2 className="mb-4 text-sm font-bold text-[#F8FAFC]">Movimentos recentes</h2>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-xs text-[#94A3B8]">
            <Loader2 size={16} className="animate-spin text-[#10B981]" />
            Carregando movimentos...
          </div>
        ) : errorMsg ? (
          <p role="alert" className="rounded-lg bg-[#F43F5E]/10 p-3 text-xs text-[#F43F5E]">
            Não foi possível carregar os movimentos: {errorMsg}
          </p>
        ) : transactions.length === 0 ? (
          <p className="py-8 text-center text-xs text-[#64748B]">
            Nenhum movimento registrado neste mês.
          </p>
        ) : (
          <div className="divide-y divide-[#1E293B]">
            {transactions.slice(0, 5).map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-[#F8FAFC]">
                    {transaction.description}
                  </p>
                  <p className="mt-1 text-[11px] text-[#64748B]">{formatDate(transaction.date)}</p>
                </div>
                <p
                  className={`shrink-0 text-xs font-bold ${
                    transaction.type === 'income' ? 'text-[#10B981]' : 'text-[#F43F5E]'
                  }`}
                >
                  {transaction.type === 'income' ? '+' : '-'}
                  {formatCurrency(transaction.amount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modal de Registo de Transações */}
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