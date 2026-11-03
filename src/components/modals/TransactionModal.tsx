import React, { useState, useEffect } from 'react';
import { 
  X, Plus, Minus, Repeat, User, ArrowDownLeft, 
  Gift, Clock, CheckCircle2, Check, Loader2, Edit2 
} from 'lucide-react';
import { supabase } from '../../services/supabase';

interface Category {
  id: string;
  name: string;
  type: string;
  rule_group?: string;
}

interface Account {
  id: string;
  name: string;
}

interface BudgetRules {
  useFixed: boolean;
  needs: number;
  wants: number;
  savings: number;
}

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialType?: 'expense' | 'income';
  currentMonthDate?: Date;
  onOpenSettings?: () => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialType = 'expense',
  currentMonthDate = new Date(),
  onOpenSettings,
}) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'expense' | 'income'>(initialType);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
const [, setAccounts] = useState<Account[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [selectedBucket, setSelectedBucket] = useState<'needs' | 'wants' | 'savings'>('needs');
  const [isSettled, setIsSettled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [repeatsMonthly, setRepeatsMonthly] = useState(false);

  // Metas do Perfil
  const [budgetRules, setBudgetRules] = useState<BudgetRules>({
    useFixed: false,
    needs: 50,
    wants: 30,
    savings: 20,
  });

  // Terceiros / Rateio
  const [isForSomeone, setIsForSomeone] = useState(false);
  const [personName, setPersonName] = useState('');
  const [splitStatus, setSplitStatus] = useState<'gift' | 'pending' | 'settled'>('pending');

  useEffect(() => {
    if (isOpen) {
      setType(initialType);
      resetForm(initialType);
      loadFormData();
      loadProfileRules();
    }
  }, [isOpen, initialType]);

  const loadProfileRules = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('use_fixed_targets, rule_needs_pct, rule_wants_pct, rule_savings_pct, fixed_needs_val, fixed_wants_val, fixed_savings_val')
        .eq('id', user.id)
        .single();

      if (!error && data) {
        setBudgetRules({
          useFixed: Boolean(data.use_fixed_targets),
          needs: data.use_fixed_targets ? Number(data.fixed_needs_val ?? 0) : Number(data.rule_needs_pct ?? 50),
          wants: data.use_fixed_targets ? Number(data.fixed_wants_val ?? 0) : Number(data.rule_wants_pct ?? 30),
          savings: data.use_fixed_targets ? Number(data.fixed_savings_val ?? 0) : Number(data.rule_savings_pct ?? 20),
        });
      }
    } catch (e) {
      console.warn('Erro ao carregar regras:', e);
    }
  };

  const loadFormData = async () => {
    const { data: catData } = await supabase
      .from('categories')
      .select('id, name, type, rule_group')
      .order('name');

    const { data: accData } = await supabase
      .from('accounts')
      .select('id, name')
      .order('name');

    if (catData) setCategories(catData);
    if (accData) {
      setAccounts(accData);
      if (accData.length > 0) setSelectedAccount(accData[0].id);
    }
  };

  const resetForm = (defaultType: 'expense' | 'income' = initialType) => {
    setDescription('');
    setAmount('');
    setType(defaultType);
    setSelectedCategory(null);
    setSelectedBucket('needs');
    setIsForSomeone(false);
    setPersonName('');
    setSplitStatus('pending');
    setIsSettled(true);
    setRepeatsMonthly(false);
  };

  const handleCategorySelect = (cat: Category) => {
    setSelectedCategory(cat.id);
    if (cat.rule_group) {
      if (cat.rule_group === 'needs_50') setSelectedBucket('needs');
      else if (cat.rule_group === 'wants_30') setSelectedBucket('wants');
      else if (cat.rule_group === 'savings_20') setSelectedBucket('savings');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (!description.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Introduza uma descrição e valor válidos.');
      return;
    }

    if (isForSomeone && !personName.trim()) {
      alert('Introduza o nome da pessoa ou entidade de origem.');
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Utilizador não autenticado.');

      const year = currentMonthDate.getFullYear();
      const month = currentMonthDate.getMonth();
      const todayDay = new Date().getDate();
      const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
      const validDay = Math.min(todayDay, lastDayOfMonth);
      const targetDate = new Date(year, month, validDay).toISOString().split('T')[0];

      const finalSpentFor = isForSomeone ? personName.trim() : null;

      const payload = {
        user_id: user.id,
        description: description.trim(),
        amount: parsedAmount,
        type,
        category_id: selectedCategory,
        account_id: selectedAccount,
        budget_bucket: type === 'expense' ? selectedBucket : null,
        is_settled: isSettled,
        date: targetDate,
        spent_for_name: finalSpentFor,
        split_status: isForSomeone ? (type === 'income' ? 'none' : splitStatus) : 'none',
        repeats_monthly: repeatsMonthly,
      };

      const { error: txError } = await supabase
        .from('transactions')
        .insert(payload);

      if (txError) throw txError;

      // Se repete mensalmente, sincroniza com recurring_bills
      if (repeatsMonthly) {
        const billPayload = {
          user_id: user.id,
          description: description.trim(),
          amount: parsedAmount,
          due_day: validDay,
          category_id: selectedCategory || null,
          type: type,
          spent_for_name: finalSpentFor,
          is_active: true,
        };

        const { data: existingBill } = await supabase
          .from('recurring_bills')
          .select('id')
          .eq('user_id', user.id)
          .ilike('description', description.trim())
          .maybeSingle();

        if (existingBill) {
          await supabase.from('recurring_bills').update(billPayload).eq('id', existingBill.id);
        } else {
          await supabase.from('recurring_bills').insert(billPayload);
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Erro ao guardar o lançamento.');
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories
    .filter((c) => c.type === type)
    .filter((cat, index, self) => index === self.findIndex((t) => t.name === cat.name));

  const formatSub = (val: number) => {
    return budgetRules.useFixed ? `R$ ${val}` : `${val}%`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#0B0F19] border border-[#1E293B] rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        
        {/* Cabeçalho */}
        <div className="p-4 md:p-5 border-b border-[#1E293B] flex items-center justify-between">
          <h2 className="text-base font-bold text-[#F8FAFC]">Novo Lançamento</h2>
          <button onClick={onClose} className="p-1.5 text-[#94A3B8] hover:text-[#F8FAFC] rounded-lg bg-[#131927]">
            <X size={16} />
          </button>
        </div>

        {/* Formulário com Scroll Interno */}
        <form onSubmit={handleSave} className="p-4 md:p-5 overflow-y-auto space-y-4 flex-1">
          
          {/* Seletor Segmentado: Despesa vs Receita */}
          <div className="flex bg-[#131927] p-1 rounded-xl border border-[#1E293B]">
            <button
              type="button"
              onClick={() => {
                setType('expense');
                setSelectedCategory(null);
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                type === 'expense'
                  ? 'bg-[#F43F5E]/15 text-[#FB7185] border border-[#F43F5E]/30'
                  : 'text-[#64748B] hover:text-[#94A3B8]'
              }`}
            >
              <Minus size={14} />
              Despesa
            </button>
            <button
              type="button"
              onClick={() => {
                setType('income');
                setSelectedCategory(null);
                setIsForSomeone(false);
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
                type === 'income'
                  ? 'bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30'
                  : 'text-[#64748B] hover:text-[#94A3B8]'
              }`}
            >
              <Plus size={14} />
              Receita
            </button>
          </div>

          {/* Descrição */}
          <div>
            <label className="text-[10px] text-[#64748B] font-bold tracking-wider block mb-1.5 uppercase">
              Descrição
            </label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Supermercado, Aluguer, Salário"
              className="w-full bg-[#131927] border border-[#1E293B] rounded-xl px-3.5 py-2.5 text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#10B981]"
            />
          </div>

          {/* Valor */}
          <div>
            <label className="text-[10px] text-[#64748B] font-bold tracking-wider block mb-1.5 uppercase">
              Valor (R$)
            </label>
            <input
              type="text"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
              className="w-full bg-[#131927] border border-[#1E293B] rounded-xl px-3.5 py-2.5 text-base font-extrabold text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#10B981]"
            />
          </div>

          {/* Regra Orçamental (Apenas para despesas) */}
          {type === 'expense' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#64748B] font-bold tracking-wider uppercase">
                  Regra Orçamental ({budgetRules.useFixed ? 'R$ FIXO' : `${budgetRules.needs} • ${budgetRules.wants} • ${budgetRules.savings}`})
                </span>
                {onOpenSettings && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenSettings();
                    }}
                    className="flex items-center gap-1 text-[10px] font-bold text-[#10B981] hover:underline"
                  >
                    <Edit2 size={10} />
                    Ajustar metas
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedBucket('needs')}
                  className={`py-2 px-1 rounded-xl text-center border transition-all ${
                    selectedBucket === 'needs'
                      ? 'bg-[#38BDF8]/15 border-[#38BDF8] text-[#38BDF8]'
                      : 'bg-[#131927] border-[#1E293B] text-[#94A3B8]'
                  }`}
                >
                  <div className="text-xs font-bold">Necessidades</div>
                  <div className="text-[10px] text-[#64748B]">{formatSub(budgetRules.needs)}</div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedBucket('wants')}
                  className={`py-2 px-1 rounded-xl text-center border transition-all ${
                    selectedBucket === 'wants'
                      ? 'bg-[#F59E0B]/15 border-[#F59E0B] text-[#F59E0B]'
                      : 'bg-[#131927] border-[#1E293B] text-[#94A3B8]'
                  }`}
                >
                  <div className="text-xs font-bold">Desejos</div>
                  <div className="text-[10px] text-[#64748B]">{formatSub(budgetRules.wants)}</div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedBucket('savings')}
                  className={`py-2 px-1 rounded-xl text-center border transition-all ${
                    selectedBucket === 'savings'
                      ? 'bg-[#10B981]/15 border-[#10B981] text-[#10B981]'
                      : 'bg-[#131927] border-[#1E293B] text-[#94A3B8]'
                  }`}
                >
                  <div className="text-xs font-bold">Reserva</div>
                  <div className="text-[10px] text-[#64748B]">{formatSub(budgetRules.savings)}</div>
                </button>
              </div>
            </div>
          )}

          {/* Categorias */}
          <div>
            <label className="text-[10px] text-[#64748B] font-bold tracking-wider block mb-1.5 uppercase">
              Categoria
            </label>
            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
              {filteredCategories.map((c) => {
                const isSelected = selectedCategory === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleCategorySelect(c)}
                    className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all border ${
                      isSelected
                        ? 'bg-[#10B981]/15 border-[#10B981] text-[#10B981] font-bold'
                        : 'bg-[#131927] border-[#1E293B] text-[#94A3B8] hover:text-[#F8FAFC]'
                    }`}
                  >
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Repetir Mensalmente */}
          <div
            onClick={() => setRepeatsMonthly(!repeatsMonthly)}
            className="flex items-center gap-2 cursor-pointer py-1"
          >
            <div
              className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                repeatsMonthly ? 'bg-[#10B981] border-[#10B981]' : 'border-[#64748B] bg-[#131927]'
              }`}
            >
              {repeatsMonthly && <Check size={11} className="text-[#0B0F19] stroke-[3]" />}
            </div>
            <Repeat size={14} className="text-[#94A3B8]" />
            <span className="text-xs text-[#CBD5E1]">Repetir automaticamente todos os meses</span>
          </div>

          {/* Terceiros / Origem */}
          <div className="bg-[#131927] border border-[#1E293B] rounded-xl p-3 space-y-2">
            <div
              onClick={() => setIsForSomeone(!isForSomeone)}
              className="flex items-center gap-2 cursor-pointer"
            >
              <div
                className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                  isForSomeone ? 'bg-[#10B981] border-[#10B981]' : 'border-[#64748B] bg-[#0B0F19]'
                }`}
              >
                {isForSomeone && <Check size={11} className="text-[#0B0F19] stroke-[3]" />}
              </div>
              {type === 'expense' ? (
                <>
                  <User size={14} className="text-[#94A3B8]" />
                  <span className="text-xs text-[#CBD5E1]">Despesa dividida ou para terceiro</span>
                </>
              ) : (
                <>
                  <ArrowDownLeft size={14} className="text-[#94A3B8]" />
                  <span className="text-xs text-[#CBD5E1]">Informar pagador ou origem</span>
                </>
              )}
            </div>

            {isForSomeone && (
              <div className="pt-2 space-y-2 border-t border-[#1E293B]">
                <input
                  type="text"
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  placeholder={type === 'expense' ? "Nome da pessoa (ex: Letícia, Amigo)" : "Quem pagou (ex: Empresa X, João)"}
                  className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-lg px-3 py-2 text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#10B981]"
                />

                {type === 'expense' && (
                  <div className="grid grid-cols-3 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setSplitStatus('gift')}
                      className={`flex flex-col items-center py-1.5 rounded-lg border text-[10px] font-bold ${
                        splitStatus === 'gift'
                          ? 'bg-[#38BDF8]/15 border-[#38BDF8] text-[#38BDF8]'
                          : 'bg-[#0B0F19] border-[#1E293B] text-[#64748B]'
                      }`}
                    >
                      <Gift size={12} className="mb-0.5" />
                      Oferecido
                    </button>
                    <button
                      type="button"
                      onClick={() => setSplitStatus('pending')}
                      className={`flex flex-col items-center py-1.5 rounded-lg border text-[10px] font-bold ${
                        splitStatus === 'pending'
                          ? 'bg-[#F59E0B]/15 border-[#F59E0B] text-[#F59E0B]'
                          : 'bg-[#0B0F19] border-[#1E293B] text-[#64748B]'
                      }`}
                    >
                      <Clock size={12} className="mb-0.5" />
                      Pendente
                    </button>
                    <button
                      type="button"
                      onClick={() => setSplitStatus('settled')}
                      className={`flex flex-col items-center py-1.5 rounded-lg border text-[10px] font-bold ${
                        splitStatus === 'settled'
                          ? 'bg-[#10B981]/15 border-[#10B981] text-[#10B981]'
                          : 'bg-[#0B0F19] border-[#1E293B] text-[#64748B]'
                      }`}
                    >
                      <CheckCircle2 size={12} className="mb-0.5" />
                      Acertado
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Efetivado ou Pendente */}
          <div
            onClick={() => setIsSettled(!isSettled)}
            className="flex items-center gap-2 cursor-pointer py-1"
          >
            <div
              className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                isSettled ? 'bg-[#10B981] border-[#10B981]' : 'border-[#64748B] bg-[#131927]'
              }`}
            >
              {isSettled && <Check size={11} className="text-[#0B0F19] stroke-[3]" />}
            </div>
            <span className="text-xs text-[#CBD5E1]">
              {isSettled ? 'Lançamento já efetivado' : 'Deixar pendente no extrato'}
            </span>
          </div>

          {/* Botões de Ação */}
          <div className="flex gap-3 pt-3 border-t border-[#1E293B]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-[#131927] border border-[#1E293B] text-[#94A3B8] hover:text-[#F8FAFC]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-[2] py-2.5 rounded-xl text-xs font-bold bg-[#10B981] text-[#0B0F19] hover:bg-[#34D399] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {loading ? 'A guardar...' : 'Guardar Lançamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};