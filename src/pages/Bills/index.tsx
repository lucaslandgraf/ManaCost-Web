import React, { useState, useEffect, useCallback } from 'react';
import {
  ReceiptText,
  Repeat,
  Plus,
  CheckCircle2,
  Clock,
  Trash2,
  Edit2,
  Share2,
  FileSpreadsheet,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Zap,
} from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useMonth } from '../../context/MonthContext';

export interface BillToPay {
  id: string;
  title: string;
  amount: number;
  due_date: string;
  is_paid: boolean;
  barcode_or_pix?: string | null;
}

export interface RecurringBill {
  id: string;
  description: string;
  amount: number;
  due_day: number;
  type?: 'income' | 'expense';
  category_id: string | null;
  goal_id?: string | null;
  is_active: boolean;
  categories?: { name: string } | null;
}

export const Bills: React.FC = () => {
  const { currentDate } = useMonth();
  const [activeTab, setActiveTab] = useState<'checklist' | 'recurring'>('checklist');

  // Estado das Contas a Pagar (Checklist)
  const [bills, setBills] = useState<BillToPay[]>([]);
  const [loadingBills, setLoadingBills] = useState(false);
  const [showAllPending, setShowAllPending] = useState(false);
  const [selectedMonthDate, setSelectedMonthDate] = useState<Date>(new Date(currentDate));

  // Modais e formulários de Conta a Pagar
  const [billModalOpen, setBillModalOpen] = useState(false);
  const [editingBillId, setEditingBillId] = useState<string | null>(null);
  const [billTitle, setBillTitle] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [billDueDate, setBillDueDate] = useState('');
  const [billBarcode, setBillBarcode] = useState('');
  const [savingBill, setSavingBill] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Estado das Assinaturas Recorrentes
  const [recurringBills, setRecurringBills] = useState<RecurringBill[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string; type: string }[]>([]);
  const [loadingRecurring, setLoadingRecurring] = useState(false);

  // Modais e formulários de Recorrentes
  const [recModalOpen, setRecModalOpen] = useState(false);
  const [editingRecId, setEditingRecId] = useState<string | null>(null);
  const [recDesc, setRecDesc] = useState('');
  const [recAmount, setRecAmount] = useState('');
  const [recDueDay, setRecDueDay] = useState('10');
  const [recType, setRecType] = useState<'expense' | 'income'>('expense');
  const [recCatId, setRecCatId] = useState<string | null>(null);
  const [savingRec, setSavingRec] = useState(false);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatMonthTitle = (date: Date) => {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
    ];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const changeMonth = (delta: number) => {
    const next = new Date(selectedMonthDate);
    next.setMonth(next.getMonth() + delta);
    setSelectedMonthDate(next);
  };

  // 1. Carregar Contas a Pagar
  const fetchBills = useCallback(async () => {
    setLoadingBills(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('bills_to_pay')
        .select('*')
        .eq('user_id', user.id)
        .order('is_paid', { ascending: true })
        .order('due_date', { ascending: true });

      if (error) throw error;
      setBills(data || []);
    } catch (err: any) {
      console.warn('Erro ao carregar contas a pagar:', err.message);
    } finally {
      setLoadingBills(false);
    }
  }, []);

  // 2. Carregar Assinaturas Recorrentes e Categorias
  const fetchRecurring = useCallback(async () => {
    setLoadingRecurring(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [billsRes, catRes] = await Promise.all([
        supabase
          .from('recurring_bills')
          .select('id, description, amount, due_day, category_id, is_active, type, categories(name)')
          .eq('user_id', user.id)
          .order('due_day', { ascending: true }),
        supabase.from('categories').select('id, name, type').order('name'),
      ]);

      if (billsRes.error) throw billsRes.error;
      setRecurringBills((billsRes.data as unknown as RecurringBill[]) || []);
      setCategories(catRes.data || []);
    } catch (err: any) {
      console.warn('Erro ao carregar assinaturas:', err.message);
    } finally {
      setLoadingRecurring(false);
    }
  }, []);

  useEffect(() => {
    void fetchBills();
    void fetchRecurring();
  }, [fetchBills, fetchRecurring]);

  // Alternar estado de pagamento do boleto e registar no extrato
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

      if (nextStatus) {
        const dFormat = item.due_date ? item.due_date.split('-').reverse().join('/') : '';
        const confirmInsert = window.confirm(
          `Pretende registar "- ${formatCurrency(item.amount)}" no extrato do mês de vencimento (${dFormat})?`
        );

        if (confirmInsert) {
          const { data: { user } } = await supabase.auth.getUser();
          const targetDate = item.due_date || new Date().toISOString().split('T')[0];

          await supabase.from('transactions').insert([
            {
              user_id: user?.id,
              description: item.title,
              amount: item.amount,
              type: 'expense',
              date: targetDate,
              is_settled: true,
              budget_bucket: 'needs',
            },
          ]);
        }
      }
      void fetchBills();
    } catch (err: any) {
      alert(`Falha ao atualizar conta: ${err.message}`);
      void fetchBills();
    }
  };

  const handleSaveBill = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(billAmount.replace(',', '.'));
    if (!billTitle.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Informe um título e um montante válidos.');
      return;
    }

    if (!billDueDate) {
      alert('Informe a data de vencimento.');
      return;
    }

    setSavingBill(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = {
        title: billTitle.trim(),
        amount: parsedAmount,
        due_date: billDueDate,
        barcode_or_pix: billBarcode.trim() || null,
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
            user_id: user?.id,
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
      setBillDueDate('');
      setBillBarcode('');
      void fetchBills();
    } catch (err: any) {
      alert(`Erro ao guardar conta: ${err.message}`);
    } finally {
      setSavingBill(false);
    }
  };

  const handleDeleteBill = async (item: BillToPay) => {
    if (!window.confirm(`Deseja remover "${item.title}"?`)) return;

    try {
      await supabase.from('bills_to_pay').delete().eq('id', item.id);
      setBills((prev) => prev.filter((b) => b.id !== item.id));
    } catch (err: any) {
      alert(`Erro ao apagar: ${err.message}`);
    }
  };

  const handleCopyCode = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Alternar ativação de assinatura recorrente
  const toggleRecurringActive = async (bill: RecurringBill) => {
    const nextStatus = !bill.is_active;
    try {
      const { error } = await supabase
        .from('recurring_bills')
        .update({ is_active: nextStatus })
        .eq('id', bill.id);

      if (error) throw error;

      await supabase
        .from('transactions')
        .update({ repeats_monthly: nextStatus })
        .ilike('description', bill.description.trim());

      setRecurringBills((prev) =>
        prev.map((b) => (b.id === bill.id ? { ...b, is_active: nextStatus } : b))
      );
    } catch (err: any) {
      alert(`Erro ao alternar assinatura: ${err.message}`);
    }
  };

  const handleSaveRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(recAmount.replace(',', '.'));
    const parsedDay = parseInt(recDueDay, 10);

    if (!recDesc.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Informe uma descrição e um montante válidos.');
      return;
    }

    if (isNaN(parsedDay) || parsedDay < 1 || parsedDay > 31) {
      alert('O dia de vencimento deve situar-se entre 1 e 31.');
      return;
    }

    setSavingRec(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = {
        description: recDesc.trim(),
        amount: parsedAmount,
        due_day: parsedDay,
        category_id: recCatId,
        type: recType,
      };

      if (editingRecId) {
        const { error } = await supabase
          .from('recurring_bills')
          .update(payload)
          .eq('id', editingRecId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('recurring_bills').insert([
          {
            user_id: user?.id,
            ...payload,
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
      setRecCatId(null);
      void fetchRecurring();
    } catch (err: any) {
      alert(`Erro ao guardar assinatura: ${err.message}`);
    } finally {
      setSavingRec(false);
    }
  };

  // 1. Ao remover uma assinatura/conta fixa, limpa o molde e as pendências geradas no extrato
  const handleDeleteRecurring = async (id: string, desc: string) => {
    if (
      !window.confirm(
        `Deseja remover a assinatura "${desc}" e limpar os lançamentos pendentes gerados no extrato?`
      )
    ) {
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();

      // 1. Apaga da tabela de moldes fixos
      const { error: billError } = await supabase
        .from('recurring_bills')
        .delete()
        .eq('id', id);

      if (billError) throw billError;

      // 2. Apaga do extrato as transações geradas por esta assinatura que ainda estão pendentes
      if (user) {
        await supabase
          .from('transactions')
          .delete()
          .eq('user_id', user.id)
          .ilike('description', desc.trim())
          .eq('is_settled', false);
      }

      setRecurringBills((prev) => prev.filter((b) => b.id !== id));
      alert(`Assinatura "${desc}" e os lançamentos pendentes foram removidos com sucesso!`);
    } catch (err: any) {
      alert(`Erro ao remover: ${err.message}`);
    }
  };

  // 2. Sincronizar contas recorrentes com trava anti-duplicação de aportes
  const syncRecurringWithCurrentMonth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const year = selectedMonthDate.getFullYear();
      const month = selectedMonthDate.getMonth();
      const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      // Busca tudo o que já existe no extrato do mês
      const { data: currentTxs, error: txError } = await supabase
        .from('transactions')
        .select('description')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .lte('date', endDate);

      if (txError) throw txError;

      const existingNames = (currentTxs || []).map((t) =>
        (t.description || '').toLowerCase().trim()
      );

      // Garante uma única regra por descrição caso o banco tenha moldes repetidos
      const activeList = recurringBills
        .filter((r) => r.is_active)
        .filter(
          (bill, index, self) =>
            index ===
            self.findIndex(
              (b) =>
                b.description?.trim().toLowerCase() ===
                bill.description?.trim().toLowerCase()
            )
        );

      const toInsert: any[] = [];
      const goalsToUpdate: { goal_id: string; amount: number }[] = [];

      for (const bill of activeList) {
        const cleanDesc = bill.description.trim().toLowerCase();
        const normalizedBill = cleanDesc.replace(/^aporte:\s*/i, '').trim();

        // Checagem inteligente: confere o nome exato ou sem o prefixo "Aporte:"
        const alreadyExists = existingNames.some((existing) => {
          const normalizedExisting = existing.replace(/^aporte:\s*/i, '').trim();
          return existing === cleanDesc || normalizedExisting === normalizedBill;
        });

        if (!alreadyExists) {
          const validDay = Math.min(bill.due_day || 1, lastDay);
          const targetDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(validDay).padStart(2, '0')}`;

          toInsert.push({
            user_id: user.id,
            description: bill.description.trim(),
            amount: bill.amount,
            type: bill.type || 'expense',
            category_id: bill.category_id || null,
            date: targetDate,
            is_settled: false,
            repeats_monthly: true,
          });

          if (bill.goal_id) {
            goalsToUpdate.push({ goal_id: bill.goal_id, amount: Number(bill.amount) });
          }

          // Registra no array local para não duplicar na mesma rodada
          existingNames.push(cleanDesc);
        }
      }

      if (toInsert.length > 0) {
        const { error: insError } = await supabase.from('transactions').insert(toInsert);
        if (insError) throw insError;

        for (const item of goalsToUpdate) {
          const { data: gData } = await supabase
            .from('financial_goals')
            .select('current_amount')
            .eq('id', item.goal_id)
            .single();

          if (gData) {
            await supabase
              .from('financial_goals')
              .update({ current_amount: Number(gData.current_amount || 0) + item.amount })
              .eq('id', item.goal_id);
          }
        }

        alert(
          `${toInsert.length} lançamento(s) sincronizado(s) para ${formatMonthTitle(selectedMonthDate)}!`
        );
      } else {
        alert('Todas as contas e aportes já se encontram lançados no extrato deste mês.');
      }
    } catch (err: any) {
      alert(`Erro na sincronização: ${err.message}`);
    }
  };

  // Filtros de exibição
  const targetYear = selectedMonthDate.getFullYear();
  const targetMonth = selectedMonthDate.getMonth();

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

  // Exportar para WhatsApp
  const shareWhatsApp = () => {
    const labelHeader = showAllPending
      ? 'TODAS AS CONTAS PENDENTES'
      : `CONTAS DE ${formatMonthTitle(selectedMonthDate).toUpperCase()}`;

    let text = `📋 *LEMBRETE: CONTAS A PAGAR - ${labelHeader}*\n`;
    text += `🔴 *Pendente:* R$ ${totalPending.toFixed(2).replace('.', ',')}\n`;
    text += `🟢 *Pago:* R$ ${totalPaid.toFixed(2).replace('.', ',')}\n\n`;

    if (filteredBills.length > 0) {
      filteredBills.forEach((b) => {
        const dFormat = b.due_date ? b.due_date.split('-').reverse().join('/') : '';
        const icon = b.is_paid ? '✅' : '⏳';
        text += `${icon} *${b.title}* - R$ ${Number(b.amount).toFixed(2).replace('.', ',')} (Venc: ${dFormat})\n`;
        if (b.barcode_or_pix) text += `   └ Pix/Cód: ${b.barcode_or_pix}\n`;
      });
    } else {
      text += `Nenhuma conta encontrada neste período.\n`;
    }

    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  // Exportar para Excel (.xls)
  const exportExcel = () => {
    if (filteredBills.length === 0) {
      alert('Não existem contas filtradas para exportar.');
      return;
    }

    let excelTable = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"></head>
      <body>
        <table border="1">
          <thead>
            <tr style="background-color: #10B981; color: #ffffff; font-weight: bold;">
              <th>Estado</th>
              <th>Conta / Título</th>
              <th>Valor (R$)</th>
              <th>Vencimento</th>
              <th>Pix / Código de Barras</th>
            </tr>
          </thead>
          <tbody>
    `;

    filteredBills.forEach((b) => {
      excelTable += `
        <tr>
          <td style="color: ${b.is_paid ? '#059669' : '#dc2626'}; font-weight: bold;">${b.is_paid ? 'PAGA' : 'PENDENTE'}</td>
          <td>${b.title}</td>
          <td>${Number(b.amount || 0).toFixed(2).replace('.', ',')}</td>
          <td>${b.due_date ? b.due_date.split('-').reverse().join('/') : ''}</td>
          <td>${b.barcode_or_pix || '—'}</td>
        </tr>
      `;
    });

    excelTable += `
        <tr><td colspan="5"></td></tr>
        <tr>
          <td><strong>RESUMO</strong></td>
          <td><strong>TOTAL PENDENTE</strong></td>
          <td><strong>${totalPending.toFixed(2).replace('.', ',')}</strong></td>
          <td colspan="2"></td>
        </tr>
        <tr>
          <td><strong>RESUMO</strong></td>
          <td><strong>TOTAL PAGO</strong></td>
          <td><strong>${totalPaid.toFixed(2).replace('.', ',')}</strong></td>
          <td colspan="2"></td>
        </tr>
      </tbody></table></body></html>
    `;

    const blob = new Blob([excelTable], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Contas_${formatMonthTitle(selectedMonthDate).replace(/\s+/g, '_').toLowerCase()}.xls`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho Principal */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#F8FAFC]">Boletos & Contas</h1>
          <p className="mt-1 text-xs text-[#64748B]">
            Gestão de prazos, checklist de pagamentos e assinaturas recorrentes
          </p>
        </div>

        {/* Alternador de Abas */}
        <div className="flex items-center gap-1.5 p-1 bg-[#131927] border border-white/5 rounded-xl">
          <button
            onClick={() => setActiveTab('checklist')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'checklist'
                ? 'bg-emerald-500 text-slate-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ReceiptText size={14} />
            Contas a Pagar
          </button>
          <button
            onClick={() => setActiveTab('recurring')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
              activeTab === 'recurring'
                ? 'bg-emerald-500 text-slate-950'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Repeat size={14} />
            Assinaturas & Fixas
          </button>
        </div>
      </div>

      {activeTab === 'checklist' ? (
        /* ABA 1: CONTAS A PAGAR (CHECKLIST) */
        <div className="space-y-5">
          {/* Barra de Filtro e Mês */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-[#131927] border border-white/5 rounded-2xl">
            {!showAllPending ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => changeMonth(-1)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs font-bold text-slate-100 min-w-[140px] text-center">
                  {formatMonthTitle(selectedMonthDate)}
                </span>
                <button
                  onClick={() => changeMonth(1)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-2 py-1 text-xs font-bold text-amber-400">
                <Clock size={14} />
                <span>Exibindo todas as contas pendentes</span>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAllPending(!showAllPending)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                  showAllPending
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                    : 'bg-[#0B0F19] border-white/5 text-slate-400 hover:text-white'
                }`}
              >
                {showAllPending ? 'Ver por Mês' : 'Todas Pendentes'}
              </button>

              <button
                onClick={shareWhatsApp}
                className="p-2 rounded-xl bg-[#25D366]/15 border border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366]/25 transition"
                title="Partilhar no WhatsApp"
              >
                <Share2 size={14} />
              </button>

              <button
                onClick={exportExcel}
                className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25 transition"
                title="Exportar Excel (.xls)"
              >
                <FileSpreadsheet size={14} />
              </button>

              <button
                onClick={() => {
                  setEditingBillId(null);
                  setBillTitle('');
                  setBillAmount('');
                  const y = selectedMonthDate.getFullYear();
                  const m = String(selectedMonthDate.getMonth() + 1).padStart(2, '0');
                  setBillDueDate(`${y}-${m}-10`);
                  setBillBarcode('');
                  setBillModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition"
              >
                <Plus size={14} />
                Nova Conta
              </button>
            </div>
          </div>

          {/* Cards de Resumo */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-[#131927] border border-white/5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Pendente
              </span>
              <span className="text-2xl font-black text-rose-400 mt-1 block">
                {formatCurrency(totalPending)}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#131927] border border-white/5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Total Liquidado
              </span>
              <span className="text-2xl font-black text-emerald-400 mt-1 block">
                {formatCurrency(totalPaid)}
              </span>
            </div>
          </div>

          {/* Lista de Contas */}
          <div className="rounded-2xl border border-white/5 bg-[#131927] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#F8FAFC]">Checklist de Faturas & Boletos</h2>
              <span className="text-xs font-semibold text-[#64748B]">
                {filteredBills.length} registo(s)
              </span>
            </div>

            {loadingBills ? (
              <div className="flex items-center justify-center py-12 gap-2 text-xs text-slate-400">
                <Loader2 size={16} className="animate-spin text-emerald-400" />
                A carregar contas a pagar...
              </div>
            ) : filteredBills.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#64748B]">
                {showAllPending
                  ? 'Nenhuma conta pendente no momento!'
                  : `Nenhuma conta encontrada em ${formatMonthTitle(selectedMonthDate)}.`}
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {filteredBills.map((b) => (
                  <div
                    key={b.id}
                    className={`py-3 flex flex-col gap-2 transition rounded-xl px-2 ${
                      b.is_paid ? 'opacity-60 bg-white/[0.01]' : 'hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      {/* Checkbox e Título */}
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          onClick={() => toggleBillStatus(b)}
                          className={`w-5 h-5 rounded-md flex items-center justify-center border transition shrink-0 ${
                            b.is_paid
                              ? 'bg-emerald-500 border-emerald-500 text-slate-950'
                              : 'border-slate-600 bg-[#0B0F19] hover:border-emerald-500'
                          }`}
                        >
                          {b.is_paid && <Check size={12} strokeWidth={3} />}
                        </button>

                        <div className="min-w-0">
                          <p
                            className={`text-xs font-bold truncate ${
                              b.is_paid ? 'line-through text-slate-400' : 'text-slate-100'
                            }`}
                          >
                            {b.title}
                          </p>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Vencimento: {b.due_date ? b.due_date.split('-').reverse().join('/') : '—'}
                          </p>
                        </div>
                      </div>

                      {/* Montante e Ações */}
                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className={`text-xs font-black ${
                            b.is_paid ? 'text-emerald-400' : 'text-slate-100'
                          }`}
                        >
                          {formatCurrency(b.amount)}
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingBillId(b.id);
                              setBillTitle(b.title);
                              setBillAmount(String(b.amount));
                              setBillDueDate(b.due_date);
                              setBillBarcode(b.barcode_or_pix || '');
                              setBillModalOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-sky-400 transition"
                            title="Editar conta"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteBill(b)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 transition"
                            title="Remover conta"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Linha do Código Pix / Código de Barras */}
                    {b.barcode_or_pix && (
                      <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#0B0F19] border border-white/5 text-[10px] text-slate-400 ml-8">
                        <span className="truncate font-mono">{b.barcode_or_pix}</span>
                        <button
                          onClick={() => handleCopyCode(b.id, b.barcode_or_pix!)}
                          className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#131927] border border-white/5 text-sky-400 hover:text-sky-300 transition shrink-0 font-semibold"
                        >
                          {copiedId === b.id ? (
                            <>
                              <CheckCircle2 size={10} className="text-emerald-400" /> Copiado!
                            </>
                          ) : (
                            <>
                              <Copy size={10} /> Copiar
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ABA 2: ASSINATURAS & RECORRENTES */
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-[#131927] border border-white/5 rounded-2xl">
            <div>
              <p className="text-xs font-bold text-slate-200">Lançamentos Automáticos Mensais</p>
              <p className="text-[11px] text-slate-400">
                Gera pendências fixas no extrato de todos os meses automaticamente
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={syncRecurringWithCurrentMonth}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400 hover:bg-sky-500/25 text-xs font-bold transition"
              >
                <Zap size={14} />
                Sincronizar Mês
              </button>

              <button
                onClick={() => {
                  setEditingRecId(null);
                  setRecDesc('');
                  setRecAmount('');
                  setRecDueDay('10');
                  setRecCatId(null);
                  setRecType('expense');
                  setRecModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition"
              >
                <Plus size={14} />
                Nova Assinatura
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/5 bg-[#131927] p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#F8FAFC]">Contas Fixas Cadastradas</h2>
              <span className="text-xs font-semibold text-[#64748B]">
                {recurringBills.length} registo(s)
              </span>
            </div>

            {loadingRecurring ? (
              <div className="flex items-center justify-center py-12 gap-2 text-xs text-slate-400">
                <Loader2 size={16} className="animate-spin text-emerald-400" />
                A carregar assinaturas...
              </div>
            ) : recurringBills.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#64748B]">
                Nenhuma assinatura ou conta fixa cadastrada.
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {recurringBills.map((r) => (
                  <div
                    key={r.id}
                    className={`py-3 flex items-center justify-between gap-4 px-2 rounded-xl transition ${
                      !r.is_active ? 'opacity-50 bg-white/[0.01]' : 'hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-100 truncate">{r.description}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Todo dia {r.due_day} • {r.categories?.name || 'Geral'}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`text-xs font-black ${
                          r.type === 'income' ? 'text-emerald-400' : 'text-slate-100'
                        }`}
                      >
                        {r.type === 'income' ? '+' : '-'} {formatCurrency(r.amount)}
                      </span>

                      <button
                        onClick={() => toggleRecurringActive(r)}
                        className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider transition ${
                          r.is_active
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 border border-white/5'
                        }`}
                      >
                        {r.is_active ? 'Ativa' : 'Pausada'}
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingRecId(r.id);
                            setRecDesc(r.description);
                            setRecAmount(String(r.amount));
                            setRecDueDay(String(r.due_day));
                            setRecCatId(r.category_id);
                            setRecType(r.type || 'expense');
                            setRecModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-sky-400 transition"
                          title="Editar"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteRecurring(r.id, r.description)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 transition"
                          title="Remover"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: CRIAR / EDITAR CONTA A PAGAR */}
      {billModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <form
            onSubmit={handleSaveBill}
            className="w-full max-w-md bg-[#0B0F19] border border-white/10 rounded-2xl p-5 shadow-2xl space-y-4"
          >
            <h3 className="text-base font-bold text-slate-100">
              {editingBillId ? 'Editar Conta' : 'Nova Conta a Pagar'}
            </h3>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                Descrição da Conta
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Aluguel, Luz (Copel), Fatura Cartão"
                value={billTitle}
                onChange={(e) => setBillTitle(e.target.value)}
                className="w-full bg-[#131927] border border-white/10 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Valor (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0,00"
                  value={billAmount}
                  onChange={(e) => setBillAmount(e.target.value)}
                  className="w-full bg-[#131927] border border-white/10 rounded-xl p-2.5 text-xs text-slate-100 font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Vencimento
                </label>
                <input
                  type="date"
                  required
                  value={billDueDate}
                  onChange={(e) => setBillDueDate(e.target.value)}
                  className="w-full bg-[#131927] border border-white/10 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                Código de Barras ou Chave Pix (Opcional)
              </label>
              <input
                type="text"
                placeholder="Cole a chave Pix ou linha digitável"
                value={billBarcode}
                onChange={(e) => setBillBarcode(e.target.value)}
                className="w-full bg-[#131927] border border-white/10 rounded-xl p-2.5 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBillModalOpen(false)}
                disabled={savingBill}
                className="flex-1 py-2.5 bg-[#131927] text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-800 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingBill}
                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
              >
                {savingBill && <Loader2 size={13} className="animate-spin" />}
                {savingBill ? 'A gravar...' : 'Gravar Conta'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 2: CRIAR / EDITAR ASSINATURA RECORRENTE */}
      {recModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <form
            onSubmit={handleSaveRecurring}
            className="w-full max-w-md bg-[#0B0F19] border border-white/10 rounded-2xl p-5 shadow-2xl space-y-4"
          >
            <h3 className="text-base font-bold text-slate-100">
              {editingRecId ? 'Editar Assinatura' : 'Nova Assinatura Fixa'}
            </h3>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRecType('expense')}
                className={`py-2 rounded-xl text-xs font-bold border transition ${
                  recType === 'expense'
                    ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                    : 'bg-[#131927] border-white/5 text-slate-400'
                }`}
              >
                Despesa Fixa
              </button>
              <button
                type="button"
                onClick={() => setRecType('income')}
                className={`py-2 rounded-xl text-xs font-bold border transition ${
                  recType === 'income'
                    ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                    : 'bg-[#131927] border-white/5 text-slate-400'
                }`}
              >
                Receita Fixa
              </button>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                Descrição
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Aluguel, Ginásio, Internet, Salário"
                value={recDesc}
                onChange={(e) => setRecDesc(e.target.value)}
                className="w-full bg-[#131927] border border-white/10 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Valor (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0,00"
                  value={recAmount}
                  onChange={(e) => setRecAmount(e.target.value)}
                  className="w-full bg-[#131927] border border-white/10 rounded-xl p-2.5 text-xs text-slate-100 font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Dia do Vencimento
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  required
                  placeholder="10"
                  value={recDueDay}
                  onChange={(e) => setRecDueDay(e.target.value)}
                  className="w-full bg-[#131927] border border-white/10 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                Categoria no Orçamento
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1 bg-[#131927] rounded-xl border border-white/5">
                {categories
                  .filter((c) => c.type === recType)
                  .map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setRecCatId(c.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                        recCatId === c.id
                          ? 'bg-emerald-500 text-slate-950 font-bold'
                          : 'bg-[#0B0F19] text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRecModalOpen(false)}
                disabled={savingRec}
                className="flex-1 py-2.5 bg-[#131927] text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-800 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={savingRec}
                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5"
              >
                {savingRec && <Loader2 size={13} className="animate-spin" />}
                {savingRec ? 'A gravar...' : 'Gravar Assinatura'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};