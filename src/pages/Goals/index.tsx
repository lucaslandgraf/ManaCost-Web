import React, { useState, useEffect, useCallback } from 'react';
import {
  Target,
  Plus,
  Clock,
  ChevronRight,
  X,
  FileSpreadsheet,
  Share2,
  Trash2,
  Edit2,
  Check,
  CheckSquare,
  Square,
  PlusCircle,
  Loader2,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { supabase } from '../../services/supabase';
import { calculateGoalProjection } from '../../components/utils/goalMath';

export interface FinancialGoal {
  id: string;
  user_id: string;
  title: string;
  category: string;
  target_amount: number;
  current_amount: number;
  monthly_contribution: number;
  annual_interest_rate: number;
  target_date?: string;
  is_completed: boolean;
  created_at?: string;
}

export interface GoalChecklistItem {
  id: string;
  goal_id: string;
  title: string;
  is_done: boolean;
  cost_estimate?: number;
}

const CATEGORIES = ['Carro', 'Casa/Ap', 'Viagem', 'Eletrónico', 'Reserva', 'Geral'];

export const Goals: React.FC = () => {
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [loading, setLoading] = useState(true);

  // Modais
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [depositModalVisible, setDepositModalVisible] = useState(false);
  const [editContribModalVisible, setEditContribModalVisible] = useState(false);

  const [selectedGoal, setSelectedGoal] = useState<FinancialGoal | null>(null);
  const [checklist, setChecklist] = useState<GoalChecklistItem[]>([]);
  const [newChecklistText, setNewChecklistText] = useState('');

  // Aportes e Edições
  const [depositInput, setDepositInput] = useState('');
  const [newContribInput, setNewContribInput] = useState('');

  // Formulário Nova Meta
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Geral');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [monthlyContribution, setMonthlyContribution] = useState('');
  const [useCDI, setUseCDI] = useState(false);
  const [linkToRecurring, setLinkToRecurring] = useState(true);
  const [saving, setSaving] = useState(false);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const fetchGoals = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('financial_goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGoals(data || []);

      if (selectedGoal) {
        const updated = (data || []).find((g: FinancialGoal) => g.id === selectedGoal.id);
        if (updated) setSelectedGoal(updated);
      }
    } catch (err: any) {
      console.warn('Erro ao carregar metas:', err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedGoal]);

  const fetchChecklist = async (goalId: string) => {
    const { data } = await supabase
      .from('goal_checklists')
      .select('*')
      .eq('goal_id', goalId)
      .order('created_at', { ascending: true });
    setChecklist(data || []);
  };

  useEffect(() => {
    void fetchGoals();

    const channel = supabase
      .channel('goals-web-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'financial_goals' }, () => {
        void fetchGoals();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchGoals]);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const numTarget = parseFloat(targetAmount.replace(',', '.'));
    const numMonthly = parseFloat(monthlyContribution.replace(',', '.'));
    const numCurrent = currentAmount ? parseFloat(currentAmount.replace(',', '.')) : 0;

    if (!title.trim() || isNaN(numTarget) || numTarget <= 0 || isNaN(numMonthly) || numMonthly <= 0) {
      alert('Preencha o título, o valor alvo e o aporte mensal com valores válidos.');
      return;
    }

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado.');

      const rate = useCDI ? 10.75 : 0;

      // 1. Cria a meta principal
      const { data: newGoal, error: goalErr } = await supabase
        .from('financial_goals')
        .insert([{
          user_id: user.id,
          title: title.trim(),
          category,
          target_amount: numTarget,
          current_amount: numCurrent,
          monthly_contribution: numMonthly,
          annual_interest_rate: rate,
        }])
        .select()
        .single();

      if (goalErr) throw goalErr;

      // 2. Se selecionado, cadastra automaticamente em recurring_bills
      if (linkToRecurring && newGoal) {
        const { data: catReserva } = await supabase
          .from('categories')
          .select('id')
          .ilike('name', '%Invest%')
          .limit(1)
          .maybeSingle();

        await supabase.from('recurring_bills').insert([{
          user_id: user.id,
          description: `Aporte: ${title.trim()}`,
          amount: numMonthly,
          due_day: 10,
          type: 'expense',
          category_id: catReserva?.id || null,
          goal_id: newGoal.id,
          is_active: true,
        }]);
      }

      // 3. Checklists padrão conforme a categoria
      if (category === 'Carro') {
        await supabase.from('goal_checklists').insert([
          { goal_id: newGoal.id, title: 'Simular seguro e IPVA' },
          { goal_id: newGoal.id, title: 'Laudo de vistoria cautelar' },
        ]);
      } else if (category === 'Casa/Ap') {
        await supabase.from('goal_checklists').insert([
          { goal_id: newGoal.id, title: 'Reserva para ITBI e Cartório (~5%)' },
          { goal_id: newGoal.id, title: 'Avaliação de custos de condomínio' },
        ]);
      }

      setCreateModalVisible(false);
      setTitle('');
      setTargetAmount('');
      setCurrentAmount('');
      setMonthlyContribution('');
      setUseCDI(false);
      setLinkToRecurring(true);
      void fetchGoals();
    } catch (err: any) {
      alert(`Erro ao salvar meta: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAddDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal) return;
    const addedVal = parseFloat(depositInput.replace(',', '.'));
    if (isNaN(addedVal) || addedVal <= 0) {
      alert('Informe um valor positivo para guardar.');
      return;
    }

    const newAmount = Number(selectedGoal.current_amount) + addedVal;

    try {
      const { error } = await supabase
        .from('financial_goals')
        .update({ current_amount: newAmount })
        .eq('id', selectedGoal.id);

      if (error) throw error;

      setSelectedGoal({ ...selectedGoal, current_amount: newAmount });
      setDepositModalVisible(false);
      setDepositInput('');
      void fetchGoals();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

  const handleUpdateMonthlyContribution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal) return;
    const newContrib = parseFloat(newContribInput.replace(',', '.'));
    if (isNaN(newContrib) || newContrib <= 0) {
      alert('Informe um valor de aporte mensal válido.');
      return;
    }

    try {
      // 1. Atualiza na tabela da meta
      const { error: goalErr } = await supabase
        .from('financial_goals')
        .update({ monthly_contribution: newContrib })
        .eq('id', selectedGoal.id);

      if (goalErr) throw goalErr;

      // 2. Sincroniza a conta fixa vinculada
      await supabase
        .from('recurring_bills')
        .update({ amount: newContrib })
        .eq('goal_id', selectedGoal.id);

      setSelectedGoal({ ...selectedGoal, monthly_contribution: newContrib });
      setEditContribModalVisible(false);
      setNewContribInput('');
      void fetchGoals();
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

  const handleAddChecklistItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistText.trim() || !selectedGoal) return;
    try {
      const { data, error } = await supabase
        .from('goal_checklists')
        .insert([{ goal_id: selectedGoal.id, title: newChecklistText.trim(), is_done: false }])
        .select()
        .single();

      if (error) throw error;
      setChecklist([...checklist, data]);
      setNewChecklistText('');
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
    }
  };

  const handleToggleChecklist = async (item: GoalChecklistItem) => {
    const updated = !item.is_done;
    setChecklist(checklist.map((c) => (c.id === item.id ? { ...c, is_done: updated } : c)));
    await supabase.from('goal_checklists').update({ is_done: updated }).eq('id', item.id);
  };

  const handleDeleteChecklistItem = async (id: string) => {
    setChecklist(checklist.filter((c) => c.id !== id));
    await supabase.from('goal_checklists').delete().eq('id', id);
  };

  const handleDeleteGoal = async (goalId: string, goalTitle: string) => {
    if (!window.confirm(`Deseja remover permanentemente a meta "${goalTitle}"?`)) return;

    try {
      await supabase.from('goal_checklists').delete().eq('goal_id', goalId);
      await supabase.from('recurring_bills').delete().eq('goal_id', goalId);
      await supabase.from('financial_goals').delete().eq('id', goalId);

      setDetailModalVisible(false);
      setSelectedGoal(null);
      void fetchGoals();
    } catch (err: any) {
      alert(`Erro ao remover: ${err.message}`);
    }
  };

  const handleExportExcel = (goal: FinancialGoal) => {
    const proj = calculateGoalProjection(
      Number(goal.target_amount),
      Number(goal.current_amount),
      Number(goal.monthly_contribution),
      Number(goal.annual_interest_rate)
    );

    const rows: any[] = [
      { Propriedade: 'Meta', Detalhe: goal.title },
      { Propriedade: 'Categoria', Detalhe: goal.category },
      { Propriedade: 'Valor Alvo', Detalhe: Number(goal.target_amount) },
      { Propriedade: 'Saldo Atual Guardado', Detalhe: Number(goal.current_amount) },
      { Propriedade: 'Aporte Mensal Previsto', Detalhe: Number(goal.monthly_contribution) },
      { Propriedade: 'Tempo Estimado', Detalhe: proj.yearsMonthsText },
      { Propriedade: 'Data Prevista de Conquista', Detalhe: proj.completionDate.toLocaleDateString('pt-BR') },
      { Propriedade: 'Rendimento Acumulado Estimado (R$)', Detalhe: Number(proj.totalInterest.toFixed(2)) },
      { Propriedade: '', Detalhe: '' },
      { Propriedade: 'CHECKLIST DE PROVIDÊNCIAS', Detalhe: 'STATUS' },
      ...checklist.map((c) => ({ Propriedade: c.title, Detalhe: c.is_done ? 'CONCLUÍDO' : 'PENDENTE' })),
    ];

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Planejamento de Meta');
    XLSX.writeFile(workbook, `Meta_${goal.title.replace(/\s+/g, '_')}.xlsx`);
  };

  const handleShareWhatsApp = (goal: FinancialGoal) => {
    const proj = calculateGoalProjection(
      Number(goal.target_amount),
      Number(goal.current_amount),
      Number(goal.monthly_contribution),
      Number(goal.annual_interest_rate)
    );

    let msg = `🎯 *PLANO DE META: ${goal.title.toUpperCase()}*\n`;
    msg += `Categoria: ${goal.category}\n`;
    msg += `Alvo: R$ ${Number(goal.target_amount).toFixed(2)}\n`;
    msg += `Guardado: R$ ${Number(goal.current_amount).toFixed(2)}\n`;
    msg += `Aporte Mensal: R$ ${Number(goal.monthly_contribution).toFixed(2)}\n`;
    msg += `⏱ *Estimativa de Conclusão:* ${proj.yearsMonthsText} (${proj.completionDate.toLocaleDateString('pt-BR')})\n`;
    if (proj.totalInterest > 0) {
      msg += `📈 Rendimento estimado: R$ ${proj.totalInterest.toFixed(2)}\n`;
    }

    if (checklist.length > 0) {
      msg += `\n📋 *Checklist:*\n`;
      checklist.forEach((c) => {
        msg += `${c.is_done ? '✅' : '⬜'} ${c.title}\n`;
      });
    }

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[#F8FAFC]">Metas & Simulador</h1>
          <p className="mt-1 text-xs text-[#64748B]">
            Projeção de objetivos financeiros, aportes programados e checklists
          </p>
        </div>

        <button
          onClick={() => setCreateModalVisible(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-emerald-400 transition"
        >
          <Plus size={15} />
          Nova Meta
        </button>
      </div>

      {/* Lista de Metas */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2 text-xs text-slate-400">
          <Loader2 size={16} className="animate-spin text-emerald-400" />
          Carregando metas planejadas...
        </div>
      ) : goals.length === 0 ? (
        <div className="bg-[#131927] border border-white/5 rounded-2xl p-12 text-center text-slate-500">
          <Target className="w-10 h-10 mx-auto mb-2 text-slate-600 stroke-1" />
          <p className="text-sm font-bold text-slate-300">Nenhuma meta cadastrada ainda</p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Crie metas para aquisições ou reservas financeiras e acompanhe o ritmo de conquista.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
  {goals.map((goal) => {
    const proj = calculateGoalProjection(
      Number(goal.target_amount),
      Number(goal.current_amount),
      Number(goal.monthly_contribution),
      Number(goal.annual_interest_rate)
    );
    const progress = Math.min((Number(goal.current_amount) / Number(goal.target_amount)) * 100, 100);

    return (
      <div
        key={goal.id}
        onClick={() => {
          setSelectedGoal(goal);
          void fetchChecklist(goal.id);
          setDetailModalVisible(true);
        }}
        className="bg-[#131927] border border-white/5 hover:border-emerald-500/30 rounded-2xl p-5 space-y-4 cursor-pointer transition"
      >
        {/* Cabeçalho com Ícone e Tag de Tempo */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Target size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-100 truncate">{goal.title}</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {goal.category} • {formatCurrency(Number(goal.monthly_contribution))}/mês
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[10px] font-bold shrink-0">
            <Clock size={11} />
            <span>{proj.yearsMonthsText}</span>
          </div>
        </div>

        {/* Barra de Progresso e Valores */}
        <div className="space-y-2 pt-1">
          <div className="w-full h-2 bg-[#0B0F19] rounded-full overflow-hidden border border-white/5">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="flex items-baseline justify-between pt-1">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Guardado</span>
              <p className="text-sm font-black text-emerald-400 mt-0.5">
                {formatCurrency(Number(goal.current_amount))}{' '}
                <span className="text-[10px] font-normal text-slate-400">({progress.toFixed(1)}%)</span>
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Meta Estipulada</span>
              <p className="text-sm font-black text-slate-200 mt-0.5">
                {formatCurrency(Number(goal.target_amount))}
              </p>
            </div>
          </div>
        </div>

        {/* Rodapé com Data de Conclusão */}
        <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs text-slate-400">
          <span>
            Previsão:{' '}
            <strong className="text-emerald-400 font-bold">
              {proj.completionDate.toLocaleDateString('pt-BR')}
            </strong>
          </span>
          <ChevronRight size={14} className="text-slate-500" />
        </div>
      </div>
    );
  })}
</div>
      )}

      {/* MODAL 1: CRIAR NOVA META */}
      {createModalVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-[#0B0F19] border border-white/10 rounded-2xl p-6 shadow-2xl max-h-[92vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Target size={16} className="text-emerald-400" />
                Nova Meta Financeira
              </h3>
              <button onClick={() => setCreateModalVisible(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateGoal} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">
                  Nome do Objetivo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carro Novo, Computador, Viagem"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-[#131927] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">
                  Categoria
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`px-3 py-1 rounded-xl text-xs font-semibold transition border ${
                        category === cat
                          ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 font-bold'
                          : 'bg-[#131927] border-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">
                  Valor Total do Objetivo (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="Ex: 3000.00"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  className="w-full bg-[#131927] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">
                    Já Guardado (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={currentAmount}
                    onChange={(e) => setCurrentAmount(e.target.value)}
                    className="w-full bg-[#131927] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1 uppercase tracking-wider">
                    Aporte Mensal (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="Ex: 150.00"
                    value={monthlyContribution}
                    onChange={(e) => setMonthlyContribution(e.target.value)}
                    className="w-full bg-[#131927] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Toggles CDI & Contas Fixas */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => setUseCDI(!useCDI)}
                  className={`w-full p-2.5 rounded-xl border text-left text-xs transition flex items-center gap-2 ${
                    useCDI
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-[#131927] border-white/5 text-slate-400'
                  }`}
                >
                  {useCDI ? <CheckSquare size={15} /> : <Square size={15} />}
                  <span>Considerar rendimento de 100% CDI (~10.75% a.a.)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLinkToRecurring(!linkToRecurring)}
                  className={`w-full p-2.5 rounded-xl border text-left text-xs transition flex items-center gap-2 ${
                    linkToRecurring
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-[#131927] border-white/5 text-slate-400'
                  }`}
                >
                  {linkToRecurring ? <CheckSquare size={15} /> : <Square size={15} />}
                  <span>
                    Criar conta fixa mensal automática ({monthlyContribution ? `R$ ${monthlyContribution}` : 'aporte'})
                  </span>
                </button>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setCreateModalVisible(false)}
                  className="flex-1 py-2.5 bg-[#131927] text-slate-400 text-xs font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-2 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  {saving ? 'Salvando...' : 'Salvar Meta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: DETALHES DA META & CHECKLIST */}
      {detailModalVisible && selectedGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg bg-[#0B0F19] border border-white/10 rounded-2xl p-6 shadow-2xl max-h-[92vh] overflow-y-auto custom-scrollbar space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div>
                <h3 className="text-base font-bold text-slate-100">{selectedGoal.title}</h3>
                <p className="text-xs text-slate-400">
                  {selectedGoal.category} • Alvo: {formatCurrency(Number(selectedGoal.target_amount))}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDeleteGoal(selectedGoal.id, selectedGoal.title)}
                  className="p-1.5 text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                  title="Excluir meta"
                >
                  <Trash2 size={15} />
                </button>
                <button onClick={() => setDetailModalVisible(false)} className="text-slate-400 hover:text-white">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Card Resumo do Aporte Dinâmico */}
            <div className="bg-[#131927] rounded-xl p-4 border border-white/5 space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Já Acumulado
                  </span>
                  <p className="text-2xl font-black text-emerald-400 mt-0.5">
                    {formatCurrency(Number(selectedGoal.current_amount))}
                  </p>
                </div>
                <button
                  onClick={() => setDepositModalVisible(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition"
                >
                  <PlusCircle size={14} />
                  Guardar Dinheiro
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Aporte Mensal Atual
                  </span>
                  <p className="text-sm font-bold text-slate-100 mt-0.5">
                    {formatCurrency(Number(selectedGoal.monthly_contribution))}/mês
                  </p>
                </div>
                <button
                  onClick={() => {
                    setNewContribInput(String(selectedGoal.monthly_contribution));
                    setEditContribModalVisible(true);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20 text-sky-400 hover:bg-sky-500/20 text-xs font-bold transition"
                >
                  <Edit2 size={12} />
                  Alterar Aporte
                </button>
              </div>
            </div>

            {/* Ações de Relatório */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleExportExcel(selectedGoal)}
                className="py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition"
              >
                <FileSpreadsheet size={14} />
                Exportar Excel (.xlsx)
              </button>
              <button
                onClick={() => handleShareWhatsApp(selectedGoal)}
                className="py-2.5 bg-[#131927] border border-sky-500/30 text-sky-400 hover:bg-[#1E293B] font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition"
              >
                <Share2 size={14} />
                Compartilhar
              </button>
            </div>

            {/* Checklist de Providências */}
            <div className="space-y-2 pt-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Checklist de Providências
              </span>

              <form onSubmit={handleAddChecklistItem} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Novo item (ex: comparar marcas, seguro...)"
                  value={newChecklistText}
                  onChange={(e) => setNewChecklistText(e.target.value)}
                  className="flex-1 bg-[#131927] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl"
                >
                  <Plus size={15} />
                </button>
              </form>

              <div className="bg-[#131927] rounded-xl p-3 border border-white/5 space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                {checklist.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-2 p-1.5 rounded hover:bg-white/[0.02]">
                    <div
                      onClick={() => handleToggleChecklist(item)}
                      className="flex items-center gap-2 flex-1 cursor-pointer"
                    >
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          item.is_done ? 'bg-emerald-500 border-emerald-500 text-slate-950' : 'border-slate-600'
                        }`}
                      >
                        {item.is_done && <Check size={11} strokeWidth={3} />}
                      </div>
                      <span className={`text-xs ${item.is_done ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                        {item.title}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteChecklistItem(item.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 transition"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                {checklist.length === 0 && (
                  <p className="text-center text-xs text-slate-500 py-3">
                    Nenhum item adicionado ao checklist desta meta.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MINI-MODAL: GUARDAR DINHEIRO NA META */}
      {depositModalVisible && selectedGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm bg-[#0B0F19] border border-white/10 rounded-2xl p-5 shadow-2xl space-y-3">
            <h4 className="text-sm font-bold text-slate-100">Guardar Dinheiro na Meta</h4>
            <p className="text-xs text-slate-400">Quanto deseja somar ao valor já guardado?</p>

            <form onSubmit={handleAddDeposit} className="space-y-3">
              <input
                type="number"
                step="0.01"
                autoFocus
                required
                placeholder="Ex: 200.00"
                value={depositInput}
                onChange={(e) => setDepositInput(e.target.value)}
                className="w-full bg-[#131927] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 font-bold focus:outline-none focus:border-emerald-500"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setDepositModalVisible(false)}
                  className="flex-1 py-2 rounded-xl bg-[#131927] text-slate-400 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MINI-MODAL: ALTERAR APORTE MENSAL */}
      {editContribModalVisible && selectedGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm bg-[#0B0F19] border border-white/10 rounded-2xl p-5 shadow-2xl space-y-3">
            <h4 className="text-sm font-bold text-slate-100">Alterar Aporte Mensal</h4>
            <p className="text-xs text-slate-400">
              Isto recalculará a previsão e atualizará a conta fixa vinculada.
            </p>

            <form onSubmit={handleUpdateMonthlyContribution} className="space-y-3">
              <input
                type="number"
                step="0.01"
                autoFocus
                required
                placeholder="Ex: 300.00"
                value={newContribInput}
                onChange={(e) => setNewContribInput(e.target.value)}
                className="w-full bg-[#131927] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 font-bold focus:outline-none focus:border-emerald-500"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditContribModalVisible(false)}
                  className="flex-1 py-2 rounded-xl bg-[#131927] text-slate-400 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition"
                >
                  Atualizar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};