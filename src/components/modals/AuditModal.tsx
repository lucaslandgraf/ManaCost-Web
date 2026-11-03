import React, { useEffect, useState, useMemo } from 'react';
import {
  X,
  Calendar,
  SlidersHorizontal,
  FileSpreadsheet,
  Share2,
  FileText,
  Loader2,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../../services/supabase';
import { useMonth } from '../../context/MonthContext';

interface AuditModalProps {
  onClose: () => void;
}

type PeriodPreset =
  | 'current_month'
  | 'prev_month'
  | 'next_month'
  | 'last_3m'
  | 'current_year'
  | 'prev_year'
  | 'custom';

type OperationType = 'all' | 'expense' | 'income';
type ResponsibilityType = 'all' | 'mine' | 'third_party';

export const AuditModal: React.FC<AuditModalProps> = ({ onClose }) => {
  const { currentDate } = useMonth();
  const [loading, setLoading] = useState(true);
  const [rawTransactions, setRawTransactions] = useState<any[]>([]);

  // Filtros analíticos
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('current_month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [opType, setOpType] = useState<OperationType>('all');
  const [respType, setRespType] = useState<ResponsibilityType>('all');
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  // Regras do perfil
  const [budgetRules, setBudgetRules] = useState({
    needsPct: 50,
    wantsPct: 30,
    savingsPct: 20,
  });

  // 1. Configurar datas iniciais com base no MonthContext
  useEffect(() => {
    applyPeriodPreset('current_month', currentDate);
    loadProfileRules();
  }, [currentDate]);

  const loadProfileRules = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from('profiles')
        .select('rule_needs_pct, rule_wants_pct, rule_savings_pct')
        .eq('id', user.id)
        .maybeSingle();

      if (profile) {
        setBudgetRules({
          needsPct: Number(profile.rule_needs_pct ?? 50),
          wantsPct: Number(profile.rule_wants_pct ?? 30),
          savingsPct: Number(profile.rule_savings_pct ?? 20),
        });
      }
    } catch (err) {
      console.warn('Erro ao carregar regras:', err);
    }
  };

  const applyPeriodPreset = (preset: PeriodPreset, refDate = new Date()) => {
    setPeriodPreset(preset);
    const y = refDate.getFullYear();
    const m = refDate.getMonth();

    const formatDateIso = (d: Date) => d.toISOString().split('T')[0];

    if (preset === 'current_month') {
      const start = new Date(y, m, 1);
      const end = new Date(y, m + 1, 0);
      setStartDate(formatDateIso(start));
      setEndDate(formatDateIso(end));
      setShowCustomPicker(false);
    } else if (preset === 'prev_month') {
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0);
      setStartDate(formatDateIso(start));
      setEndDate(formatDateIso(end));
      setShowCustomPicker(false);
    } else if (preset === 'next_month') {
      const start = new Date(y, m + 1, 1);
      const end = new Date(y, m + 2, 0);
      setStartDate(formatDateIso(start));
      setEndDate(formatDateIso(end));
      setShowCustomPicker(false);
    } else if (preset === 'last_3m') {
      const start = new Date(y, m - 2, 1);
      const end = new Date(y, m + 1, 0);
      setStartDate(formatDateIso(start));
      setEndDate(formatDateIso(end));
      setShowCustomPicker(false);
    } else if (preset === 'current_year') {
      const start = new Date(y, 0, 1);
      const end = new Date(y, 11, 31);
      setStartDate(formatDateIso(start));
      setEndDate(formatDateIso(end));
      setShowCustomPicker(false);
    } else if (preset === 'prev_year') {
      const start = new Date(y - 1, 0, 1);
      const end = new Date(y - 1, 11, 31);
      setStartDate(formatDateIso(start));
      setEndDate(formatDateIso(end));
      setShowCustomPicker(false);
    } else if (preset === 'custom') {
      setShowCustomPicker(true);
    }
  };

  // 2. Consulta dos lançamentos no Supabase baseada no intervalo ativo
  useEffect(() => {
    if (!startDate || !endDate) return;

    const fetchAuditTransactions = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('transactions')
          .select('id, description, amount, type, date, is_settled, spent_for_name, split_status, budget_bucket, categories(name, rule_group)')
          .eq('user_id', user.id)
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date', { ascending: false });

        if (error) throw error;
        setRawTransactions(data || []);
      } catch (err: any) {
        console.warn('Erro ao carregar dados:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAuditTransactions();
  }, [startDate, endDate]);

  // 3. Aplicação dos filtros em memória (Operação e Responsabilidade)
  const filteredData = useMemo(() => {
    return rawTransactions.filter((tx) => {
      // Filtro Tipo Operação
      if (opType !== 'all' && tx.type !== opType) return false;

      // Filtro Responsabilidade
      const isThirdParty = Boolean(tx.spent_for_name && tx.spent_for_name.trim().length > 0);
      if (respType === 'mine' && isThirdParty) return false;
      if (respType === 'third_party' && !isThirdParty) return false;

      return true;
    });
  }, [rawTransactions, opType, respType]);

  // 4. Cálculos analíticos consolidados
  const { totalIncome, totalExpense, spentNeeds, spentWants, spentSavings, categoryRanking } = useMemo(() => {
    let income = 0;
    let expense = 0;
    let needs = 0;
    let wants = 0;
    let savings = 0;
    const catMap: Record<string, number> = {};

    filteredData.forEach((tx) => {
      const val = Number(tx.amount || 0);
      const catName = tx.categories?.name || 'Geral';
      const ruleGroup = tx.categories?.rule_group;

      if (tx.type === 'income') {
        income += val;
      } else {
        // Se for gasto de terceiros já reembolsado, não soma no custo próprio caso esteja em Meus Gastos
        if (respType === 'mine' && tx.split_status === 'settled') return;
        expense += val;

        // Categorias de custo
        catMap[catName] = (catMap[catName] || 0) + val;

        // Regra 50/30/20
        if (tx.budget_bucket === 'needs' || ruleGroup === 'needs_50') needs += val;
        else if (tx.budget_bucket === 'wants' || ruleGroup === 'wants_30') wants += val;
        else if (tx.budget_bucket === 'savings' || ruleGroup === 'savings_20') savings += val;
        else needs += val;
      }
    });

    const ranking = Object.entries(catMap)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 3);

    return {
      totalIncome: income,
      totalExpense: expense,
      spentNeeds: needs,
      spentWants: wants,
      spentSavings: savings,
      categoryRanking: ranking,
    };
  }, [filteredData, respType]);

  const finalBalance = totalIncome - totalExpense;
  const expenseBase = totalExpense > 0 ? totalExpense : 1;
  const pctNeeds = Math.round((spentNeeds / expenseBase) * 100);
  const pctWants = Math.round((spentWants / expenseBase) * 100);
  const pctSavings = Math.round((spentSavings / expenseBase) * 100);

  const formatBrl = (val: number) =>
    `R$ ${val.toFixed(2).replace('.', ',')}`;

  const formatPeriodBadge = () => {
    if (!startDate || !endDate) return '';
    const d1 = startDate.split('-').reverse().join('/');
    const d2 = endDate.split('-').reverse().join('/');
    return `${d1} até ${d2}`;
  };

  // 5. Exportações analíticas
  const handleExportExcel = () => {
    if (filteredData.length === 0) return alert('Sem lançamentos no período.');

    const rows: any[] = filteredData.map((t) => ({
      Data: t.date,
      Descrição: t.description,
      Tipo: t.type === 'income' ? 'Receita' : 'Despesa',
      'Valor (R$)': Number(t.amount) || 0,
      Categoria: t.categories?.name || 'Geral',
      Responsável: t.spent_for_name ? `Terceiro (${t.spent_for_name})` : 'Próprio',
      Status: t.is_settled ? 'Efetivado' : 'Pendente',
    }));

    rows.push(
      { Data: '', Descrição: '', Tipo: '', 'Valor (R$)': '' },
      { Data: 'RESUMO', Descrição: 'TOTAL ENTRADAS', 'Valor (R$)': totalIncome },
      { Data: 'RESUMO', Descrição: 'TOTAL SAÍDAS', 'Valor (R$)': totalExpense },
      { Data: 'RESUMO', Descrição: 'SALDO FINAL', 'Valor (R$)': finalBalance }
    );

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Auditoria Financeira');
    XLSX.writeFile(wb, `Auditoria_${startDate}_a_${endDate}.xlsx`);
  };

  const handleExportCSV = () => {
    if (filteredData.length === 0) return alert('Sem lançamentos no período.');
    const headers = ['Data', 'Descricao', 'Tipo', 'Valor', 'Categoria', 'Responsavel'];
    const rows = filteredData.map((t) => [
      t.date,
      `"${t.description.replace(/"/g, '""')}"`,
      t.type === 'income' ? 'Receita' : 'Despesa',
      Number(t.amount || 0).toFixed(2),
      `"${(t.categories?.name || 'Geral').replace(/"/g, '""')}"`,
      t.spent_for_name ? `"${t.spent_for_name}"` : '"Proprio"',
    ]);

    const csvContent = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Auditoria_${startDate}_a_${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleShareWhatsApp = () => {
    let msg = `📊 *RELATÓRIO & AUDITORIA - MANACOST*\n`;
    msg += `🗓 *Período:* ${formatPeriodBadge()}\n\n`;
    msg += `🟢 *Receitas:* +${formatBrl(totalIncome)}\n`;
    msg += `🔴 *Despesas:* -${formatBrl(totalExpense)}\n`;
    msg += `💰 *Saldo Final:* ${formatBrl(finalBalance)}\n\n`;
    msg += `🎯 *Aderência à Regra 50 • 30 • 20:*\n`;
    msg += `• Necessidades: ${formatBrl(spentNeeds)} (${pctNeeds}%)\n`;
    msg += `• Desejos: ${formatBrl(spentWants)} (${pctWants}%)\n`;
    msg += `• Reserva: ${formatBrl(spentSavings)} (${pctSavings}%)\n\n`;

    if (categoryRanking.length > 0) {
      msg += `🏆 *Principais Categorias:*\n`;
      categoryRanking.forEach((cat, idx) => {
        msg += `${idx + 1}. ${cat.name}: ${formatBrl(cat.total)}\n`;
      });
      msg += `\n`;
    }

    msg += `_Total de lançamentos avaliados: ${filteredData.length}_`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-xl bg-[#0B0F19] border border-white/10 rounded-3xl flex flex-col shadow-2xl overflow-hidden max-h-[94vh]">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-5 border-b border-white/5 bg-[#131927]">
          <div>
            <h3 className="text-base sm:text-lg font-black text-slate-100">Relatórios & Auditoria</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Fechamento analítico e conciliação de contas</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Corpo do Modal com Scroll */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          {/* 1. SELETOR DE INTERVALO DE COMPETÊNCIA */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Intervalo de Competência
              </span>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[10px] font-semibold">
                <Calendar size={11} />
                <span>{formatPeriodBadge()}</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {[
                { label: 'Mês Atual', val: 'current_month' },
                { label: 'Mês Anterior', val: 'prev_month' },
                { label: 'Mês Seguinte', val: 'next_month' },
                { label: 'Últimos 3M', val: 'last_3m' },
                { label: 'Ano Atual', val: 'current_year' },
                { label: 'Ano Anterior', val: 'prev_year' },
              ].map((p) => (
                <button
                  key={p.val}
                  onClick={() => applyPeriodPreset(p.val as PeriodPreset, currentDate)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                    periodPreset === p.val
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 font-bold'
                      : 'bg-[#131927] border-white/5 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}

              <button
                onClick={() => applyPeriodPreset('custom')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                  periodPreset === 'custom'
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 font-bold'
                    : 'bg-[#131927] border-white/5 text-slate-400 hover:text-slate-200'
                }`}
              >
                <SlidersHorizontal size={12} />
                Personalizado
              </button>
            </div>

            {showCustomPicker && (
              <div className="grid grid-cols-2 gap-2.5 pt-1 animate-fade-in">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">De:</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-[#131927] border border-white/10 rounded-xl p-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Até:</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-[#131927] border border-white/10 rounded-xl p-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 2. TIPO DE OPERAÇÃO */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Tipo de Operação
            </span>
            <div className="flex gap-1.5">
              {[
                { label: 'Todas', val: 'all' },
                { label: 'Apenas Saídas', val: 'expense' },
                { label: 'Apenas Entradas', val: 'income' },
              ].map((op) => (
                <button
                  key={op.val}
                  onClick={() => setOpType(op.val as OperationType)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                    opType === op.val
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 font-bold'
                      : 'bg-[#131927] border-white/5 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {op.label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. RESPONSABILIDADE / ACERTOS */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Responsabilidade / Acertos
            </span>
            <div className="flex gap-1.5">
              {[
                { label: 'Geral', val: 'all' },
                { label: 'Meus Gastos', val: 'mine' },
                { label: 'Gastos p/ Terceiros', val: 'third_party' },
              ].map((res) => (
                <button
                  key={res.val}
                  onClick={() => setRespType(res.val as ResponsibilityType)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                    respType === res.val
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 font-bold'
                      : 'bg-[#131927] border-white/5 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {res.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="py-12 flex items-center justify-center gap-2 text-xs text-slate-400">
              <Loader2 size={16} className="animate-spin text-emerald-400" />
              Consolidando lançamentos analíticos...
            </div>
          ) : (
            <>
              {/* 4. CARDS DE RESUMO (RECEITAS, DESPESAS, SALDO) */}
              <div className="grid grid-cols-3 gap-2 bg-[#131927] border border-white/5 rounded-2xl p-4 text-center">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Receitas
                  </span>
                  <p className="text-sm sm:text-base font-black text-emerald-400 mt-1">
                    +{formatBrl(totalIncome)}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Despesas
                  </span>
                  <p className="text-sm sm:text-base font-black text-rose-400 mt-1">
                    -{formatBrl(totalExpense)}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Saldo Final
                  </span>
                  <p className="text-sm sm:text-base font-black text-sky-400 mt-1">
                    {formatBrl(finalBalance)}
                  </p>
                </div>
              </div>

              {/* 5. ADERÊNCIA À REGRA 50 • 30 • 20 */}
              <div className="bg-[#131927] border border-white/5 rounded-2xl p-4 space-y-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Aderência à Regra {budgetRules.needsPct} • {budgetRules.wantsPct} • {budgetRules.savingsPct}
                </span>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-slate-400 text-[11px] block">Necessidades</span>
                    <span className="text-slate-100 font-bold block mt-0.5">
                      {formatBrl(spentNeeds)}{' '}
                      <span className="text-slate-400 text-[10px] font-normal">({pctNeeds}%)</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Desejos</span>
                    <span className="text-slate-100 font-bold block mt-0.5">
                      {formatBrl(spentWants)}{' '}
                      <span className="text-slate-400 text-[10px] font-normal">({pctWants}%)</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[11px] block">Reserva</span>
                    <span className="text-slate-100 font-bold block mt-0.5">
                      {formatBrl(spentSavings)}{' '}
                      <span className="text-slate-400 text-[10px] font-normal">({pctSavings}%)</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* 6. PRINCIPAIS CATEGORIAS DE CUSTO */}
              <div className="bg-[#131927] border border-white/5 rounded-2xl p-4 space-y-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Principais Categorias de Custo
                </span>

                {categoryRanking.length === 0 ? (
                  <p className="text-xs text-slate-500 py-1">Nenhuma despesa classificada no filtro.</p>
                ) : (
                  <div className="space-y-2">
                    {categoryRanking.map((cat, idx) => (
                      <div key={cat.name} className="flex items-center justify-between text-xs">
                        <span className="text-slate-200 font-semibold truncate pr-2">
                          {idx + 1}. {cat.name}
                        </span>
                        <span className="text-rose-400 font-bold shrink-0">
                          {formatBrl(cat.total)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* 7. BOTÕES DE EXPORTAÇÃO */}
          <div className="space-y-2 pt-2">
            <button
              onClick={handleExportExcel}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-2xl flex items-center justify-center gap-2 transition shadow-lg shadow-emerald-500/10"
            >
              <FileSpreadsheet size={15} />
              Exportar Planilha Excel (.xlsx)
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleShareWhatsApp}
                className="py-2.5 bg-[#131927] border border-sky-500/20 text-sky-400 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 hover:bg-[#1E293B] transition"
              >
                <Share2 size={13} />
                Partilhar Texto
              </button>
              <button
                onClick={handleExportCSV}
                className="py-2.5 bg-[#131927] border border-white/10 text-slate-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 hover:bg-[#1E293B] transition"
              >
                <FileText size={13} />
                Exportar CSV
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};