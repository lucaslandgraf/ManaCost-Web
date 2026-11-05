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
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  X,
} from 'lucide-react';
import { useMonth } from '../context/MonthContext';
import { supabase } from '../services/supabase';
import { TransactionModal } from '../components/modals/TransactionModal';
import { PurchaseDetailsModal } from '../components/modals/PurchaseDetailsModal';
import { RecurringDeleteModal } from '../components/modals/RecurringDeleteModal';

type TransactionType = 'income' | 'expense';

interface DashboardTransaction {
  id: string;
  description: string;
  amount: number;
  date: string | null;
  type: TransactionType;
  is_settled?: boolean;
  repeats_monthly?: boolean;
  spent_for_name?: string | null;
  category_name?: string;
}

const ITEMS_PER_PAGE = 20;

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

  // Estado de paginação do extrato
  const [currentPage, setCurrentPage] = useState(1);

  // Modal de Detalhes da Compra / Lançamento
  const [selectedTx, setSelectedTx] = useState<DashboardTransaction | null>(null);

  // Modal de Exclusão de Recorrência
  const [recurringItemToDelete, setRecurringItemToDelete] = useState<DashboardTransaction | null>(null);

  // Seleção múltipla para exclusão em lote
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setErrorMsg('');

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
    const startDate = `${monthKey}-01`;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const endDate = `${monthKey}-${String(lastDay).padStart(2, '0')}`;

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const { data: existingData, error: txError } = await supabase
        .from('transactions')
        .select('id, description, amount, date, type, is_settled, repeats_monthly, spent_for_name, categories(name)')
        .in('type', ['income', 'expense'])
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (txError) throw txError;

      let currentItems = existingData || [];

      if (user) {
        const { data: activeBills } = await supabase
          .from('recurring_bills')
          .select('id, description, amount, due_day, category_id, type, spent_for_name')
          .eq('user_id', user.id)
          .eq('is_active', true);

        if (activeBills && activeBills.length > 0) {
          const uniqueActiveBills = activeBills.filter((bill: any, index: number, self: any[]) =>
            index === self.findIndex((b: any) =>
              b.description?.trim().toLowerCase() === bill.description?.trim().toLowerCase()
            )
          );

          const dismissed: string[] = JSON.parse(
            localStorage.getItem(`dismissed_recurring_${user.id}_${monthKey}`) || '[]'
          );
          const dismissedSet = new Set(dismissed.map((d) => d.toLowerCase()));

          const existingDescriptions = new Set(
            currentItems.map((tx: any) => tx.description?.trim().toLowerCase())
          );

          const toAutoInsert: any[] = [];

          for (const bill of uniqueActiveBills) {
            const cleanDesc = bill.description?.trim().toLowerCase() || '';
            const normalizedBill = cleanDesc.replace(/^aporte:\s*/i, '').trim();
            const isAlreadyInTransactions = Array.from(existingDescriptions).some((desc) => {
              const normalizedDesc = (desc || '').replace(/^aporte:\s*/i, '').trim();
              return desc === cleanDesc || normalizedDesc === normalizedBill;
            });

            if (!isAlreadyInTransactions && !dismissedSet.has(cleanDesc)) {
              const validDay = Math.min(bill.due_day || 1, lastDay);
              const targetDate = `${monthKey}-${String(validDay).padStart(2, '0')}`;

              toAutoInsert.push({
                user_id: user.id,
                description: bill.description.trim(),
                amount: bill.amount,
                type: bill.type || 'expense',
                category_id: bill.category_id || null,
                date: targetDate,
                is_settled: false,
                spent_for_name: bill.spent_for_name || null,
                split_status: 'none',
                repeats_monthly: true,
              });

              existingDescriptions.add(cleanDesc);
            }
          }

          if (toAutoInsert.length > 0) {
            const { data: insertedData, error: insError } = await supabase
              .from('transactions')
              .insert(toAutoInsert)
              .select('id, description, amount, date, type, is_settled, repeats_monthly, spent_for_name, categories(name)');

            if (!insError && insertedData) {
              currentItems = [...insertedData, ...currentItems];
            }
          }
        }
      }

      const mappedTransactions: DashboardTransaction[] = currentItems.map((t: any) => ({
        id: String(t.id),
        description: t.description?.trim() || 'Movimento sem descrição',
        amount: Number(t.amount) || 0,
        date: t.date,
        type: t.type,
        is_settled: t.is_settled ?? true,
        repeats_monthly: Boolean(t.repeats_monthly),
        spent_for_name: t.spent_for_name || null,
        category_name: t.categories?.name || 'Geral',
      }));

      setTransactions(mappedTransactions);
      setSelectedIds(new Set());
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
    setCurrentPage(1);
    setIsSelectionMode(false);
    setSelectedIds(new Set());
    void fetchTransactions();
  }, [fetchTransactions]);

  const toggleSettled = async (id: string, currentStatus?: boolean, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newStatus = !currentStatus;
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, is_settled: newStatus } : t))
    );
    await supabase.from('transactions').update({ is_settled: newStatus }).eq('id', id);
  };

  const handleDeleteClick = async (transaction: DashboardTransaction, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const { data: recBill } = await supabase
      .from('recurring_bills')
      .select('id, is_active')
      .ilike('description', transaction.description.trim())
      .maybeSingle();

    const isRecurring = Boolean(transaction.repeats_monthly || recBill);

    if (isRecurring) {
      setRecurringItemToDelete(transaction);
      return;
    }

    if (!window.confirm(`Deseja remover "${transaction.description}"?`)) return;
    setTransactions((prev) => prev.filter((t) => t.id !== transaction.id));
    await supabase.from('transactions').delete().eq('id', transaction.id);
  };

  const handleDeleteCurrentOnly = async () => {
    if (!recurringItemToDelete) return;
    const item = recurringItemToDelete;
    setRecurringItemToDelete(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (user && item.date) {
      const monthKey = item.date.substring(0, 7);
      const storageKey = `dismissed_recurring_${user.id}_${monthKey}`;
      const dismissed: string[] = JSON.parse(localStorage.getItem(storageKey) || '[]');
      dismissed.push(item.description.trim().toLowerCase());
      localStorage.setItem(storageKey, JSON.stringify(dismissed));
    }

    setTransactions((prev) => prev.filter((t) => t.id !== item.id));
    await supabase.from('transactions').delete().eq('id', item.id);
  };

  const handleDeleteFutureAndCancel = async () => {
    if (!recurringItemToDelete) return;
    const item = recurringItemToDelete;
    setRecurringItemToDelete(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();

      await supabase
        .from('recurring_bills')
        .delete()
        .ilike('description', item.description.trim());

      await supabase.from('transactions').delete().eq('id', item.id);

      if (user && item.date) {
        await supabase
          .from('transactions')
          .delete()
          .eq('user_id', user.id)
          .ilike('description', item.description.trim())
          .gt('date', item.date)
          .eq('is_settled', false);
      }

      setTransactions((prev) => prev.filter((t) => t.id !== item.id));
    } catch (err) {
      console.error('Erro ao excluir recorrência:', err);
    }
  };

  // Funções de Seleção Múltipla
  const toggleSelectId = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAllCurrentPage = () => {
    const pageIds = paginatedTransactions.map((t) => t.id);
    const allSelected = pageIds.every((id) => selectedIds.has(id));

    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleDeleteSelected = async () => {
    const idsToDelete = Array.from(selectedIds);
    if (idsToDelete.length === 0) return;

    if (!window.confirm(`Tem certeza que deseja excluir os ${idsToDelete.length} lançamentos selecionados? Assinaturas selecionadas também serão canceladas para não voltarem.`)) {
      return;
    }

    setIsBatchDeleting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      // Identifica os itens que foram selecionados
      const itemsToDelete = transactions.filter((t) => selectedIds.has(t.id));
      const descriptions = itemsToDelete.map((t) => t.description.trim());

      // 1. Apaga do recurring_bills para evitar que o molde ressuscite o item
      if (descriptions.length > 0) {
        await supabase
          .from('recurring_bills')
          .delete()
          .in('description', descriptions);
      }

      // 2. Apaga os registros da tabela transactions
      const { error } = await supabase
        .from('transactions')
        .delete()
        .in('id', idsToDelete);

      if (error) throw error;

      // 3. Remove também transações futuras não efetivadas com essas descrições
      if (user && descriptions.length > 0) {
        await supabase
          .from('transactions')
          .delete()
          .eq('user_id', user.id)
          .in('description', descriptions)
          .gte('date', `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-01`)
          .eq('is_settled', false);
      }

      setTransactions((prev) => prev.filter((t) => !selectedIds.has(t.id)));
      setSelectedIds(new Set());
      setIsSelectionMode(false);
    } catch (err: any) {
      alert(`Falha ao excluir selecionados: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setIsBatchDeleting(false);
    }
  };

  const incomeTotal = transactions
    .filter((t) => t.type === 'income')
    .reduce((total, t) => total + t.amount, 0);
  const expenseTotal = transactions
    .filter((t) => t.type === 'expense')
    .reduce((total, t) => total + t.amount, 0);
  const balance = incomeTotal - expenseTotal;

  const totalPages = Math.ceil(transactions.length / ITEMS_PER_PAGE) || 1;
  const paginatedTransactions = transactions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  const isAllPageSelected =
    paginatedTransactions.length > 0 &&
    paginatedTransactions.every((transaction) => selectedIds.has(transaction.id));

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
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-[#F8FAFC]">Extrato de Movimentos</h2>
            <span className="text-xs font-semibold text-[#64748B]">{transactions.length} lançamento(s)</span>
          </div>

          {/* Botão de Alternar Modo de Seleção */}
          {transactions.length > 0 && (
            <div className="flex items-center gap-2">
              {isSelectionMode ? (
                <>
                  <button
                    onClick={handleSelectAllCurrentPage}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#0B0F19] border border-white/10 text-slate-300 hover:text-white transition"
                  >
                    {isAllPageSelected ? <CheckSquare size={13} className="text-emerald-400" /> : <Square size={13} />}
                    {isAllPageSelected ? 'Desmarcar Página' : 'Selecionar Página'}
                  </button>
                  <button
                    onClick={() => {
                      setIsSelectionMode(false);
                      setSelectedIds(new Set());
                    }}
                    className="p-1 text-slate-400 hover:text-white rounded-lg transition"
                    title="Cancelar seleção"
                  >
                    <X size={16} />
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsSelectionMode(true)}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#0B0F19] border border-white/5 text-slate-400 hover:text-slate-200 transition"
                >
                  Selecionar Vários
                </button>
              )}
            </div>
          )}
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
          <>
            <div className="divide-y divide-[#1E293B]/60">
              {paginatedTransactions.map((transaction) => {
                const isIncome = transaction.type === 'income';
                const isChecked = selectedIds.has(transaction.id);

                return (
                  <div
                    key={transaction.id}
                    onClick={() => {
                      if (isSelectionMode) {
                        toggleSelectId(transaction.id);
                      } else {
                        setSelectedTx(transaction);
                      }
                    }}
                    className={`flex items-center justify-between gap-4 py-3 hover:bg-[#1E293B]/30 px-2 rounded-xl transition cursor-pointer ${
                      isChecked ? 'bg-[#1E293B]/40' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Checkbox em modo de seleção */}
                      {isSelectionMode && (
                        <button
                          type="button"
                          onClick={(e) => toggleSelectId(transaction.id, e)}
                          className="shrink-0 p-1 text-slate-400 hover:text-white"
                        >
                          {isChecked ? (
                            <CheckSquare size={16} className="text-emerald-400" />
                          ) : (
                            <Square size={16} className="text-slate-500" />
                          )}
                        </button>
                      )}

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
                          onClick={(e) => toggleSettled(transaction.id, transaction.is_settled, e)}
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

                      {!isSelectionMode && (
                        <button
                          onClick={(e) => handleDeleteClick(transaction, e)}
                          className="p-1 text-[#64748B] hover:text-[#F43F5E] transition"
                          title="Excluir lançamento"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Barra de Navegação de Páginas */}
            {transactions.length > ITEMS_PER_PAGE && (
              <div className="flex items-center justify-between pt-4 mt-2 border-t border-[#1E293B]/60 text-xs text-[#94A3B8]">
                <span>
                  Exibindo {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
                  {Math.min(currentPage * ITEMS_PER_PAGE, transactions.length)} de{' '}
                  {transactions.length}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-xl bg-[#0B0F19] border border-white/5 text-slate-300 hover:text-white disabled:opacity-40 disabled:hover:text-slate-300 transition"
                    title="Página anterior"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <span className="font-semibold text-slate-200 px-1 text-[11px]">
                    {currentPage} / {totalPages}
                  </span>

                  <button
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-xl bg-[#0B0F19] border border-white/5 text-slate-300 hover:text-white disabled:opacity-40 disabled:hover:text-slate-300 transition"
                    title="Próxima página"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* Barra Flutuante de Ação em Lote */}
      {isSelectionMode && selectedIds.size > 0 && (
        <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-50 bg-[#131927] border border-rose-500/30 shadow-2xl rounded-2xl px-5 py-3 flex items-center gap-4 animate-fade-in">
          <div className="text-xs">
            <span className="font-bold text-slate-100">{selectedIds.size}</span>
            <span className="text-slate-400 ml-1">selecionado(s)</span>
          </div>

          <div className="h-4 w-px bg-white/10" />

          <button
            onClick={handleDeleteSelected}
            disabled={isBatchDeleting}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-slate-950 font-bold text-xs transition disabled:opacity-50"
          >
            {isBatchDeleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            {isBatchDeleting ? 'Excluindo...' : 'Excluir Selecionados'}
          </button>
        </div>
      )}

      {/* Modal de Criação Rápida */}
      <TransactionModal
        isOpen={isTxModalOpen}
        initialType={txModalType}
        currentMonthDate={currentDate}
        onClose={() => setIsTxModalOpen(false)}
        onSuccess={() => {
          void fetchTransactions();
        }}
      />

      {/* Modal de Detalhes da Compra / Lançamento */}
      {selectedTx && (
        <PurchaseDetailsModal
          visible={Boolean(selectedTx)}
          transactionId={selectedTx.id}
          description={selectedTx.description}
          date={selectedTx.date || ''}
          amount={selectedTx.amount}
          userMonthlyIncome={incomeTotal > 0 ? incomeTotal : undefined}
          onClose={() => setSelectedTx(null)}
          onUpdated={() => {
            void fetchTransactions();
          }}
          onDeleted={(deletedId?: string) => {
            if (deletedId) {
              setTransactions((prev) => prev.filter((t) => t.id !== deletedId));
            } else {
              void fetchTransactions();
            }
          }}
        />
      )}

      {/* Modal de Exclusão de Recorrência */}
      <RecurringDeleteModal
        isOpen={Boolean(recurringItemToDelete)}
        description={recurringItemToDelete?.description || ''}
        onClose={() => setRecurringItemToDelete(null)}
        onDeleteCurrentOnly={handleDeleteCurrentOnly}
        onDeleteFutureAndCancel={handleDeleteFutureAndCancel}
      />
    </div>
  );
};