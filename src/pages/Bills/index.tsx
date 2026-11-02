import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  Share2,
  Check,
  Edit2,
  Trash2,
  Copy,
  Calendar,
  Repeat,
  X,
  Play,
  Pause,
} from 'lucide-react';
import { supabase } from '../../services/supabase';

interface BillToPay {
  id: string;
  title: string;
  amount: number;
  due_date: string;
  is_paid: boolean;
  barcode_or_pix?: string | null;
}

interface RecurringBill {
  id: string;
  description: string;
  amount: number;
  due_day: number;
  type?: 'income' | 'expense';
  category_id: string | null;
  is_active: boolean;
  categories?: { name: string } | null;
}

export const Bills: React.FC = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'bills' | 'recurring'>('bills');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showAllPending, setShowAllPending] = useState(false);

  // Estados de Boletos / Contas a Pagar
  const [bills, setBills] = useState<BillToPay[]>([]);
  const [loadingBills, setLoadingBills] = useState(false);
  const [billModalOpen, setBillModalOpen] = useState(false);
  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const [billTitle, setBillTitle] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [billDate, setBillDate] = useState('');
  const [billPix, setBillPix] = useState('');

  // Estados de Contas Recorrentes
  const [recurring, setRecurring] = useState<RecurringBill[]>([]);
  const [loadingRecurring, setLoadingRecurring] = useState(false);
  const [recModalOpen, setRecModalOpen] = useState(false);
  const [editingRecId, setEditingRecId] = useState<string | null>(null);
  const [recDesc, setRecDesc] = useState('');
  const [recAmount, setRecAmount] = useState('');
  const [recDueDay, setRecDueDay] = useState('10');
  const [recType, setRecType] = useState<'expense' | 'income'>('expense');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
      }
    });
  }, []);

  useEffect(() => {
    if (userId) {
      fetchBills(userId);
      fetchRecurring();
    }
  }, [userId]);

  const changeMonth = (delta: number) => {
    const next = new Date(selectedDate);
    next.setMonth(next.getMonth() + delta);
    setSelectedDate(next);
  };

  const formatMonthTitle = (date: Date) => {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
    ];
    return `${months[date.getMonth()]} de ${date.getFullYear()}`;
  };

  // --- CARREGAMENTO ---
  const fetchBills = async (uid: string = userId || '') => {
    if (!uid) return;
    setLoadingBills(true);
    try {
      const { data, error } = await supabase
        .from('bills_to_pay')
        .select('*')
        .eq('user_id', uid)
        .order('is_paid', { ascending: true })
        .order('due_date', { ascending: true });

      if (error) throw error;
      setBills(data || []);
    } catch (err: any) {
      console.warn('Erro ao carregar contas:', err.message);
    } finally {
      setLoadingBills(false);
    }
  };

  const fetchRecurring = async () => {
    setLoadingRecurring(true);
    try {
      const { data, error } = await supabase
        .from('recurring_bills')
        .select('id, description, amount, due_day, category_id, is_active, type, categories(name)')
        .order('due_day', { ascending: true });

      if (error) throw error;
      setRecurring((data as unknown as RecurringBill[]) || []);
    } catch (err: any) {
      console.warn('Erro ao carregar assinaturas:', err.message);
    } finally {
      setLoadingRecurring(false);
    }
  };

  // --- AÇÕES DE CONTAS A PAGAR ---
  const toggleBillStatus = async (item: BillToPay) => {
    const nextStatus = !item.is_paid;
    setBills((prev) =>
      prev.map((b) => (b.id === item.id ? { ...b, is_paid: nextStatus } : b))
    );

    try {
      const { error } = await supabase
        .from('bills_to_pay')
        .update({ is_paid: nextStatus })
        .eq('id', item.id);

      if (error) throw error;

      if (nextStatus && userId) {
        const confirmar = window.confirm(
          `Deseja lançar a despesa de R$ ${Number(item.amount).toFixed(2)} no extrato do mês de vencimento?`
        );
        if (confirmar) {
          await supabase.from('transactions').insert([
            {
              user_id: userId,
              description: item.title,
              amount: item.amount,
              type: 'expense',
              date: item.due_date || new Date().toISOString().split('T')[0],
              is_settled: true,
              budget_bucket: 'needs',
            },
          ]);
        }
      }
      fetchBills();
    } catch (err: any) {
      alert('Erro ao atualizar estado da conta: ' + err.message);
      fetchBills();
    }
  };

  const handleSaveBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    const parsedAmount = parseFloat(billAmount.replace(',', '.'));
    if (!billTitle.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Informe um título e valor válidos.');
      return;
    }
    if (!billDate) {
      alert('Informe a data de vencimento.');
      return;
    }

    try {
      const payload = {
        title: billTitle.trim(),
        amount: parsedAmount,
        due_date: billDate,
        barcode_or_pix: billPix.trim() || null,
      };

      if (editingBillId) {
        const { error } = await supabase
          .from('bills_to_pay')
          .update(payload)
          .eq('id', editingBillId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('bills_to_pay').insert([
          {
            user_id: userId,
            ...payload,
            is_paid: false,
          },
        ]);
        if (error) throw error;
      }

      setBillModalOpen(false);
      setEditingBillId(null);
      setBillTitle('');
      setBillAmount('');
      setBillDate('');
      setBillPix('');
      fetchBills();
    } catch (err: any) {
      alert('Erro ao gravar conta: ' + err.message);
    }
  };

  const handleDeleteBill = async (id: string, title: string) => {
    if (!window.confirm(`Remover "${title}" das contas a pagar?`)) return;
    try {
      await supabase.from('bills_to_pay').delete().eq('id', id);
      fetchBills();
    } catch (err: any) {
      alert('Erro ao remover: ' + err.message);
    }
  };

  // --- AÇÕES DE RECORRENTES ---
  const handleSaveRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    const parsedAmount = parseFloat(recAmount.replace(',', '.'));
    const parsedDay = parseInt(recDueDay, 10);

    if (!recDesc.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Informe uma descrição e valor válidos.');
      return;
    }
    if (isNaN(parsedDay) || parsedDay < 1 || parsedDay > 31) {
      alert('O dia deve ser entre 1 e 31.');
      return;
    }

    try {
      if (editingRecId) {
        const { error } = await supabase
          .from('recurring_bills')
          .update({
            description: recDesc.trim(),
            amount: parsedAmount,
            due_day: parsedDay,
            type: recType,
          })
          .eq('id', editingRecId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('recurring_bills').insert([
          {
            user_id: userId,
            description: recDesc.trim(),
            amount: parsedAmount,
            due_day: parsedDay,
            type: recType,
            is_active: true,
          },
        ]);
        if (error) throw error;
      }

      setRecModalOpen(false);
      setEditingRecId(null);
      setRecDesc('');
      setRecAmount('');
      setRecDueDay('10');
      fetchRecurring();
    } catch (err: any) {
      alert('Erro ao gravar assinatura: ' + err.message);
    }
  };

  const toggleRecurringActive = async (bill: RecurringBill) => {
    const nextStatus = !bill.is_active;
    try {
      const { error } = await supabase
        .from('recurring_bills')
        .update({ is_active: nextStatus })
        .eq('id', bill.id);
      if (error) throw error;
      fetchRecurring();
    } catch (err: any) {
      alert('Erro ao atualizar: ' + err.message);
    }
  };

  const handleDeleteRecurring = async (id: string, desc: string) => {
    if (!window.confirm(`Deseja remover a assinatura "${desc}"?`)) return;
    try {
      await supabase.from('recurring_bills').delete().eq('id', id);
      fetchRecurring();
    } catch (err: any) {
      alert('Erro ao excluir: ' + err.message);
    }
  };

  // --- FILTROS E CÁLCULOS ---
  const targetYear = selectedDate.getFullYear();
  const targetMonth = selectedDate.getMonth();

  const filteredBills = bills.filter((b) => {
    if (showAllPending) return !b.is_paid;
    if (!b.due_date) return false;
    const parts = b.due_date.split('-');
    if (parts.length !== 3) return false;
    const bYear = parseInt(parts[0], 10);
    const bMonth = parseInt(parts[1], 10) - 1;
    return bYear === targetYear && bMonth === targetMonth;
  });

  const totalPending = filteredBills
    .filter((b) => !b.is_paid)
    .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

  const totalPaid = filteredBills
    .filter((b) => b.is_paid)
    .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

  const handleShareWhatsApp = () => {
    const labelHeader = showAllPending
      ? 'TODAS AS CONTAS PENDENTES'
      : `CONTAS DE ${formatMonthTitle(selectedDate).toUpperCase()}`;

    let text = `*LEMBRETE: CONTAS A PAGAR - ${labelHeader}*\n`;
    text += `Pendente: R$ ${totalPending.toFixed(2).replace('.', ',')}\n`;
    text += `Pago: R$ ${totalPaid.toFixed(2).replace('.', ',')}\n\n`;

    filteredBills.forEach((b) => {
      const dFormat = b.due_date ? b.due_date.split('-').reverse().join('/') : '';
      const icon = b.is_paid ? '[OK]' : '[PENDENTE]';
      text += `${icon} *${b.title}* - R$ ${Number(b.amount).toFixed(2).replace('.', ',')} (Venc: ${dFormat})\n`;
      if (b.barcode_or_pix) text += `   └ Chave/Cód: ${b.barcode_or_pix}\n`;
    });

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">Boletos & Fixas</h1>
          <p className="text-xs text-slate-400 mt-1">
            Gestão de faturas, compromissos avulsos e assinaturas mensais
          </p>
        </div>

        {/* Alternador de Abas */}
        <div className="flex bg-[#131927] border border-white/5 rounded-xl p-1 shrink-0">
          <button
            onClick={() => setActiveTab('bills')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'bills'
                ? 'bg-emerald-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Contas a Pagar
          </button>
          <button
            onClick={() => setActiveTab('recurring')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'recurring'
                ? 'bg-emerald-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Repeat className="w-4 h-4" />
            Assinaturas Fixas
          </button>
        </div>
      </div>

      {activeTab === 'bills' ? (
        <>
          {/* Navegador de Mês & Filtro Pendentes */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#131927] border border-white/5 rounded-2xl p-3">
            {!showAllPending ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => changeMonth(-1)}
                  className="p-1.5 rounded-lg bg-[#0B0F19] text-slate-400 hover:text-white border border-white/5"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-slate-200 px-2">
                  {formatMonthTitle(selectedDate)}
                </span>
                <button
                  onClick={() => changeMonth(1)}
                  className="p-1.5 rounded-lg bg-[#0B0F19] text-slate-400 hover:text-white border border-white/5"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-amber-400 text-xs font-bold px-2">
                <Clock className="w-4 h-4" />
                Todas as Contas Pendentes
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAllPending(!showAllPending)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                  showAllPending
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                    : 'bg-[#0B0F19] border-white/5 text-slate-400 hover:text-slate-200'
                }`}
              >
                {showAllPending ? 'Ver por Mês' : 'Todas Pendentes'}
              </button>
              <button
                onClick={handleShareWhatsApp}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#0B0F19] border border-white/5 text-slate-300 hover:text-white transition"
              >
                <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                WhatsApp
              </button>
              <button
                onClick={() => {
                  setEditingBillId(null);
                  setBillTitle('');
                  setBillAmount('');
                  setBillDate(new Date().toISOString().split('T')[0]);
                  setBillPix('');
                  setBillModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition"
              >
                <Plus className="w-4 h-4" />
                Nova Conta
              </button>
            </div>
          </div>

          {/* Cards de Resumo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-[#131927] border border-white/5 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold tracking-wider uppercase text-slate-400">Total Pendente</p>
                <p className="text-2xl font-black text-rose-400 mt-1">
                  R$ {totalPending.toFixed(2).replace('.', ',')}
                </p>
              </div>
              <div className="p-3 bg-rose-500/10 rounded-xl text-rose-400">
                <Clock className="w-6 h-6" />
              </div>
            </div>

            <div className="bg-[#131927] border border-white/5 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold tracking-wider uppercase text-slate-400">Total Pago</p>
                <p className="text-2xl font-black text-emerald-400 mt-1">
                  R$ {totalPaid.toFixed(2).replace('.', ',')}
                </p>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
                <Check className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* Lista de Contas */}
          {loadingBills ? (
            <div className="py-16 text-center text-xs text-slate-500">A carregar contas a pagar...</div>
          ) : filteredBills.length === 0 ? (
            <div className="bg-[#131927] border border-white/5 rounded-2xl p-12 text-center text-slate-500">
              <Check className="w-10 h-10 mx-auto mb-2 text-slate-600 stroke-1" />
              <p className="text-sm font-bold text-slate-300">Nenhuma conta pendente</p>
              <p className="text-xs text-slate-500 mt-1">
                Todas as faturas deste período estão em dia ou não foram cadastradas.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBills.map((item) => {
                const dFormat = item.due_date ? item.due_date.split('-').reverse().join('/') : '';
                return (
                  <div
                    key={item.id}
                    className={`bg-[#131927] border rounded-2xl p-4 transition ${
                      item.is_paid ? 'border-white/5 opacity-60' : 'border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          onClick={() => toggleBillStatus(item)}
                          className={`w-6 h-6 rounded-lg border flex items-center justify-center transition shrink-0 ${
                            item.is_paid
                              ? 'bg-emerald-500 border-emerald-500 text-slate-950'
                              : 'bg-[#0B0F19] border-slate-700 hover:border-slate-500'
                          }`}
                        >
                          {item.is_paid && <Check className="w-4 h-4 stroke-[3]" />}
                        </button>

                        <div className="min-w-0">
                          <h4
                            className={`text-sm font-bold truncate ${
                              item.is_paid ? 'text-slate-400 line-through' : 'text-slate-100'
                            }`}
                          >
                            {item.title}
                          </h4>
                          <p className="text-xs text-slate-400 mt-0.5">Vencimento: {dFormat}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 shrink-0">
                        <span
                          className={`text-base font-extrabold ${
                            item.is_paid ? 'text-emerald-400' : 'text-slate-100'
                          }`}
                        >
                          R$ {Number(item.amount).toFixed(2).replace('.', ',')}
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingBillId(item.id);
                              setBillTitle(item.title);
                              setBillAmount(String(item.amount));
                              setBillDate(item.due_date);
                              setBillPix(item.barcode_or_pix || '');
                              setBillModalOpen(true);
                            }}
                            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteBill(item.id, item.title)}
                            className="p-2 text-rose-400 hover:text-rose-300 rounded-lg hover:bg-rose-500/10 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Linha Digitável / Pix */}
                    {item.barcode_or_pix && (
                      <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between gap-3 bg-[#0B0F19]/60 px-3 py-2 rounded-xl">
                        <span className="text-[11px] text-slate-400 font-mono truncate">
                          {item.barcode_or_pix}
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(item.barcode_or_pix || '');
                            alert('Código/Chave copiado!');
                          }}
                          className="flex items-center gap-1 text-[11px] font-bold text-sky-400 hover:text-sky-300 shrink-0"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          Copiar
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* ABA DE ASSINATURAS FIXAS / RECORRENTES */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-100">Contas Recorrentes Mensais</h2>
              <p className="text-xs text-slate-400">
                Entradas e saídas automáticas configuradas para todos os meses
              </p>
            </div>
            <button
              onClick={() => {
                setEditingRecId(null);
                setRecDesc('');
                setRecAmount('');
                setRecDueDay('10');
                setRecType('expense');
                setRecModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition"
            >
              <Plus className="w-4 h-4" />
              Nova Assinatura
            </button>
          </div>

          {loadingRecurring ? (
            <div className="py-16 text-center text-xs text-slate-500">A carregar assinaturas...</div>
          ) : recurring.length === 0 ? (
            <div className="bg-[#131927] border border-white/5 rounded-2xl p-12 text-center text-slate-500">
              <Repeat className="w-10 h-10 mx-auto mb-2 text-slate-600 stroke-1" />
              <p className="text-sm font-bold text-slate-300">Nenhuma assinatura fixa</p>
              <p className="text-xs text-slate-500 mt-1">
                Adicione aluguer, internet ou planos mensais para alimentar o orçamento.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recurring.map((item) => (
                <div
                  key={item.id}
                  className={`bg-[#131927] border rounded-2xl p-4 flex flex-col justify-between transition ${
                    item.is_active ? 'border-white/5' : 'border-white/5 opacity-50'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h4 className="text-sm font-bold text-slate-100 truncate">{item.description}</h4>
                      <button
                        onClick={() => toggleRecurringActive(item)}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold transition ${
                          item.is_active
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {item.is_active ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                        {item.is_active ? 'Ativa' : 'Pausada'}
                      </button>
                    </div>

                    <p className="text-xs text-slate-400">
                      Todo dia {item.due_day} • {item.categories?.name || 'Geral'}
                    </p>

                    <p
                      className={`text-xl font-extrabold mt-3 ${
                        item.type === 'income' ? 'text-emerald-400' : 'text-slate-100'
                      }`}
                    >
                      {item.type === 'income' ? '+ ' : '- '}R$ {Number(item.amount).toFixed(2).replace('.', ',')}
                    </p>
                  </div>

                  <div className="pt-3 mt-3 border-t border-white/5 flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        setEditingRecId(item.id);
                        setRecDesc(item.description);
                        setRecAmount(String(item.amount));
                        setRecDueDay(String(item.due_day));
                        setRecType(item.type || 'expense');
                        setRecModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteRecurring(item.id, item.description)}
                      className="p-1.5 text-rose-400 hover:text-rose-300 rounded-lg hover:bg-rose-500/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL CONTA A PAGAR (BOLETO) */}
      {billModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#0B0F19] border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-100">
                {editingBillId ? 'Editar Conta a Pagar' : 'Nova Conta a Pagar'}
              </h3>
              <button
                onClick={() => setBillModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBill} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Descrição
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Aluguer, Luz (Copel), Fatura Cartão"
                  value={billTitle}
                  onChange={(e) => setBillTitle(e.target.value)}
                  className="w-full bg-[#131927] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Valor (R$)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="0,00"
                    value={billAmount}
                    onChange={(e) => setBillAmount(e.target.value)}
                    className="w-full bg-[#131927] border border-white/10 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Vencimento
                  </label>
                  <input
                    type="date"
                    required
                    value={billDate}
                    onChange={(e) => setBillDate(e.target.value)}
                    className="w-full bg-[#131927] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Chave Pix ou Código de Barras (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Cole a chave Pix ou linha digitável"
                  value={billPix}
                  onChange={(e) => setBillPix(e.target.value)}
                  className="w-full bg-[#131927] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBillModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[#131927] text-slate-400 hover:text-white border border-white/5 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 text-xs transition"
                >
                  Gravar Conta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ASSINATURA FIXA */}
      {recModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-[#0B0F19] border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-100">
                {editingRecId ? 'Editar Assinatura' : 'Nova Assinatura Fixa'}
              </h3>
              <button
                onClick={() => setRecModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRecurring} className="space-y-4">
              <div className="grid grid-cols-2 gap-2 bg-[#131927] p-1 rounded-xl border border-white/5">
                <button
                  type="button"
                  onClick={() => setRecType('expense')}
                  className={`py-2 rounded-lg text-xs font-bold transition ${
                    recType === 'expense'
                      ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      : 'text-slate-400'
                  }`}
                >
                  Despesa
                </button>
                <button
                  type="button"
                  onClick={() => setRecType('income')}
                  className={`py-2 rounded-lg text-xs font-bold transition ${
                    recType === 'income'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-400'
                  }`}
                >
                  Receita
                </button>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Descrição
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Aluguer, Spotify, Ginásio, Salário"
                  value={recDesc}
                  onChange={(e) => setRecDesc(e.target.value)}
                  className="w-full bg-[#131927] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Valor Mensal (R$)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="0,00"
                    value={recAmount}
                    onChange={(e) => setRecAmount(e.target.value)}
                    className="w-full bg-[#131927] border border-white/10 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Dia Vencimento
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={recDueDay}
                    onChange={(e) => setRecDueDay(e.target.value)}
                    className="w-full bg-[#131927] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRecModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-[#131927] text-slate-400 hover:text-white border border-white/5 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 text-xs transition"
                >
                  Gravar Assinatura
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};