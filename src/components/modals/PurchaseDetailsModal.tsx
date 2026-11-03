import React, { useState, useEffect } from 'react';
import {
  X,
  Edit2,
  Trash2,
  Clock,
  Tag,
  User,
  Loader2,
} from 'lucide-react';
import { supabase } from '../../services/supabase';

interface Item {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Category {
  id: string;
  name: string;
  type: string;
  rule_group?: string;
}

interface Props {
  visible?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  transactionId: string;
  description: string;
  date: string;
  amount: number;
  userMonthlyIncome?: number;
  onUpdated: () => void;
  onDeleted: () => void;
}

export const PurchaseDetailsModal: React.FC<Props> = ({
  visible,
  isOpen,
  onClose,
  transactionId,
  description,
  date,
  amount,
  userMonthlyIncome: initialIncome,
  onUpdated,
  onDeleted,
}) => {
  const show = visible ?? isOpen ?? true;

  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [monthlyIncome, setMonthlyIncome] = useState<number>(initialIncome || 0);

  const [currentDesc, setCurrentDesc] = useState(description);
  const [currentAmount, setCurrentAmount] = useState(amount);
  const [currentDate, setCurrentDate] = useState(date);
  const [currentType, setCurrentType] = useState<'expense' | 'income'>('expense');
  const [repeatsMonthly, setRepeatsMonthly] = useState(false);

  // Estados de Edição
  const [editDesc, setEditDesc] = useState(description);
  const [editAmount, setEditAmount] = useState(amount.toString());
  const [editDate, setEditDate] = useState(date);
  const [editRepeats, setEditRepeats] = useState(false);
  const [selectedBucket, setSelectedBucket] = useState<'needs' | 'wants' | 'savings'>('needs');

  // Terceiros / Responsabilidade
  const [isForSomeone, setIsForSomeone] = useState(false);
  const [personName, setPersonName] = useState('');
  const [splitStatus, setSplitStatus] = useState<'pending' | 'settled' | 'gift'>('pending');

  const [showLifeTime, setShowLifeTime] = useState(false);

  useEffect(() => {
    if (show && transactionId) {
      setIsEditing(false);
      setShowLifeTime(false);
      fetchTransactionDetails();
      fetchCategories();
      fetchProfileRules();
    }
  }, [show, transactionId]);

  const fetchProfileRules = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('monthly_income')
        .eq('id', user.id)
        .maybeSingle();

      if (data?.monthly_income && !initialIncome) {
        setMonthlyIncome(Number(data.monthly_income));
      }
    } catch (e) {
      console.warn('Erro ao carregar regras:', e);
    }
  };

  const fetchCategories = async () => {
    const { data } = await supabase
      .from('categories')
      .select('id, name, type, rule_group')
      .order('name');
    setCategories(data || []);
  };

  const fetchTransactionDetails = async () => {
    setLoading(true);
    try {
      const { data: txData } = await supabase
        .from('transactions')
        .select('*, categories(id, name, type, rule_group)')
        .eq('id', transactionId)
        .single();

      if (txData) {
        setCurrentDesc(txData.description || description);
        setCurrentAmount(txData.amount || amount);
        setCurrentDate(txData.date || date);
        setCurrentType(txData.type || 'expense');
        setSelectedCatId(txData.category_id || null);
        setRepeatsMonthly(Boolean(txData.repeats_monthly));

        setEditDesc(txData.description || description);
        setEditAmount(String(txData.amount || amount));
        setEditDate(txData.date || date);
        setEditRepeats(Boolean(txData.repeats_monthly));

        if (txData.budget_bucket) {
          setSelectedBucket(txData.budget_bucket);
        }

        if (txData.spent_for_name) {
          setIsForSomeone(true);
          setPersonName(txData.spent_for_name);
          setSplitStatus(txData.split_status || 'pending');
        } else {
          setIsForSomeone(false);
          setPersonName('');
          setSplitStatus('pending');
        }
      }

      // Procura compra NFC-e correspondente para carregar itens
      let targetPurchaseId = txData?.purchase_id;
      if (!targetPurchaseId && (txData?.description || description).startsWith('NFC-e:')) {
        const cleanStoreName = (txData?.description || description).replace('NFC-e:', '').trim();
        const { data: matchedPurchase } = await supabase
          .from('purchases')
          .select('id')
          .ilike('store_name', `%${cleanStoreName}%`)
          .order('purchase_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        targetPurchaseId = matchedPurchase?.id;
      }

      if (targetPurchaseId) {
        const { data: itemsData } = await supabase
          .from('purchase_items')
          .select('id, name, quantity, unit_price, total_price')
          .eq('purchase_id', targetPurchaseId);
        setItems(itemsData || []);
      } else {
        const { data: directItems } = await supabase
          .from('purchase_items')
          .select('id, name, quantity, unit_price, total_price')
          .eq('transaction_id', transactionId);
        setItems(directItems || []);
      }
    } catch (err) {
      console.warn('Erro ao carregar detalhes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    const parsedAmount = parseFloat(editAmount.replace(',', '.'));
    if (!editDesc.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Informe uma descrição e um valor válidos.');
      return;
    }

    setSaving(true);
    try {
      const finalSpentFor = isForSomeone ? personName.trim() : null;
      const finalSplitStatus = isForSomeone ? splitStatus : 'none';

      const { error } = await supabase
        .from('transactions')
        .update({
          description: editDesc.trim(),
          amount: parsedAmount,
          date: editDate,
          category_id: selectedCatId,
          spent_for_name: finalSpentFor,
          split_status: finalSplitStatus,
          repeats_monthly: editRepeats,
          budget_bucket: currentType === 'expense' ? selectedBucket : null,
        })
        .eq('id', transactionId);

      if (error) throw error;

      setCurrentDesc(editDesc.trim());
      setCurrentAmount(parsedAmount);
      setCurrentDate(editDate);
      setIsEditing(false);
      onUpdated();
    } catch (err: any) {
      alert(`Erro ao atualizar: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Deseja remover "${currentDesc}"?`)) return;

    try {
      await supabase.from('transactions').delete().eq('id', transactionId);
      onDeleted();
      onClose();
    } catch (err: any) {
      alert(`Erro ao excluir: ${err.message}`);
    }
  };

  if (!show) return null;

  const isIncome = currentType === 'income';
  const totalItemsBruto = items.reduce((acc, it) => acc + Number(it.total_price || 0), 0);
  const economiaDesconto = Math.max(0, totalItemsBruto - Number(currentAmount));

  // Equivalência de Horas de Trabalho
  const baseIncome = monthlyIncome > 0 ? monthlyIncome : (initialIncome || 0);
  const hourlyRate = baseIncome > 0 ? baseIncome / 160 : 0;
  const totalHoursDecimal = hourlyRate > 0 ? Number(currentAmount) / hourlyRate : 0;
  const workHours = Math.floor(totalHoursDecimal);
  const workMinutes = Math.round((totalHoursDecimal - workHours) * 60);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg bg-[#0B0F19] border border-white/10 rounded-2xl flex flex-col shadow-2xl overflow-hidden max-h-[90vh]">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-[#131927]">
          <div>
            <h3 className="text-base font-bold text-slate-100">
              {isIncome ? 'Detalhe da Receita' : 'Detalhe do Lançamento'}
            </h3>
            <p className="text-[11px] text-slate-400">
              {currentDate ? currentDate.split('-').reverse().join('/') : ''}
              {repeatsMonthly ? ' • Assinatura Mensal' : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          {isEditing ? (
            /* Modo Edição Completo */
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Descrição
                </label>
                <input
                  type="text"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full bg-[#131927] border border-white/10 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
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
                    value={editAmount}
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-full bg-[#131927] border border-white/10 rounded-xl p-3 text-xs text-slate-100 font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                    Data
                  </label>
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full bg-[#131927] border border-white/10 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {!isIncome && (
                <div>
                  <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                    Regra Orçamental
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedBucket('needs')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition ${
                        selectedBucket === 'needs'
                          ? 'bg-[#38BDF8]/15 border-[#38BDF8] text-[#38BDF8]'
                          : 'bg-[#131927] border-white/5 text-slate-400'
                      }`}
                    >
                      Necessidades
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedBucket('wants')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition ${
                        selectedBucket === 'wants'
                          ? 'bg-amber-500/15 border-amber-500 text-amber-400'
                          : 'bg-[#131927] border-white/5 text-slate-400'
                      }`}
                    >
                      Desejos
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedBucket('savings')}
                      className={`p-2.5 rounded-xl border text-xs font-bold transition ${
                        selectedBucket === 'savings'
                          ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400'
                          : 'bg-[#131927] border-white/5 text-slate-400'
                      }`}
                    >
                      Reserva
                    </button>
                  </div>
                </div>
              )}

              {/* Categorias com scrollbar dark */}
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                  Categoria
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1.5 bg-[#131927] rounded-xl border border-white/5 custom-scrollbar">
                  {categories
                    .filter((c) => c.type === currentType)
                    .map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedCatId(c.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          selectedCatId === c.id
                            ? 'bg-emerald-500 text-slate-950 font-bold'
                            : 'bg-[#0B0F19] text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        {c.name}
                      </button>
                    ))}
                </div>
              </div>

              {/* Bloco de Terceiro / Pagador ou Beneficiário */}
              <div className="p-3.5 bg-[#131927] border border-white/5 rounded-xl space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="editIsForSomeone"
                    checked={isForSomeone}
                    onChange={(e) => setIsForSomeone(e.target.checked)}
                    className="rounded border-white/10 bg-[#0B0F19] text-emerald-500 focus:ring-0"
                  />
                  <label htmlFor="editIsForSomeone" className="text-xs font-bold text-slate-200 cursor-pointer flex items-center gap-1.5">
                    <User size={13} className="text-sky-400" />
                    {isIncome ? 'Informar pagador ou origem' : 'Despesa dividida ou para terceiro'}
                  </label>
                </div>

                {isForSomeone && (
                  <div className="space-y-2.5 pt-1">
                    <div>
                      <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                        {isIncome ? 'Nome de quem pagou' : 'Nome do terceiro / amigo'}
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Leticia, João, Trabalho Extra"
                        value={personName}
                        onChange={(e) => setPersonName(e.target.value)}
                        className="w-full bg-[#0B0F19] border border-white/10 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                      />
                    </div>

                    {!isIncome && (
                      <div>
                        <label className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                          Situação do Acerto
                        </label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {[
                            { id: 'pending', label: 'Pendente' },
                            { id: 'settled', label: 'Reembolsado' },
                            { id: 'gift', label: 'Presente' },
                          ].map((st) => (
                            <button
                              key={st.id}
                              type="button"
                              onClick={() => setSplitStatus(st.id as any)}
                              className={`py-1.5 rounded-lg text-[11px] font-semibold border transition ${
                                splitStatus === st.id
                                  ? 'bg-amber-500/15 border-amber-500 text-amber-400'
                                  : 'bg-[#0B0F19] border-white/5 text-slate-400'
                              }`}
                            >
                              {st.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Repetição Mensal */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="editRepeatsCheck"
                  checked={editRepeats}
                  onChange={(e) => setEditRepeats(e.target.checked)}
                  className="rounded border-white/10 bg-[#131927] text-emerald-500 focus:ring-0"
                />
                <label htmlFor="editRepeatsCheck" className="text-xs text-slate-300 cursor-pointer">
                  Repetir automaticamente todos os meses
                </label>
              </div>

              {/* Botões Gravar / Cancelar */}
              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  disabled={saving}
                  className="flex-1 py-2.5 bg-[#131927] text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-800 transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="flex-2 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  {saving ? 'A guardar...' : 'Gravar Alterações'}
                </button>
              </div>
            </div>
          ) : (
            /* Modo Visualização */
            <>
              {/* Card de Valor */}
              <div className="bg-[#131927] border border-white/5 rounded-2xl p-5 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  VALOR {isIncome ? 'RECEBIDO' : 'TOTAL'}
                </p>
                <p
                  className={`text-3xl font-black mt-1 ${
                    isIncome ? 'text-emerald-400' : 'text-slate-100'
                  }`}
                >
                  {isIncome ? '+ ' : '- '}R$ {Number(currentAmount).toFixed(2).replace('.', ',')}
                </p>
                <p className="text-sm font-semibold text-slate-300 mt-2">{currentDesc}</p>
              </div>

              {/* Banner de Terceiros */}
              {isForSomeone && personName && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User size={15} />
                    <span>
                      {isIncome
                        ? `Origem: ${personName}`
                        : splitStatus === 'pending'
                        ? `Aguardando acerto com: ${personName}`
                        : splitStatus === 'settled'
                        ? `Reembolsado por: ${personName}`
                        : `Presente / Pago para: ${personName}`}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-500/20">
                    {splitStatus}
                  </span>
                </div>
              )}

              {/* Custo em Horas de Trabalho */}
              <div
                onClick={() => setShowLifeTime(!showLifeTime)}
                className={`p-3.5 rounded-xl border cursor-pointer transition ${
                  showLifeTime
                    ? 'bg-amber-500/10 border-amber-500/30'
                    : 'bg-[#131927] border-white/5 hover:border-white/10'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-slate-200 font-bold">
                    <Clock size={14} className="text-amber-400" />
                    <span>Equivalência em Horas de Trabalho</span>
                  </div>
                  <span className="text-[11px] text-sky-400 font-semibold">
                    {showLifeTime ? 'Ocultar' : 'Calcular'}
                  </span>
                </div>

                {showLifeTime && (
                  <div className="mt-2.5 pt-2.5 border-t border-white/5 text-xs text-slate-300">
                    {baseIncome > 0 ? (
                      <>
                        <p>
                          Equivale a{' '}
                          <strong className="text-amber-400">
                            {workHours > 0 ? `${workHours}h ` : ''}
                            {workMinutes}min
                          </strong>{' '}
                          de esforço profissional.
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Com base em R$ {baseIncome.toFixed(2).replace('.', ',')}/mês (~R${' '}
                          {hourlyRate.toFixed(2).replace('.', ',')}/h).
                        </p>
                      </>
                    ) : (
                      <p className="text-[11px] text-slate-400">
                        Configure a sua renda no Perfil para calcular as horas de trabalho.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Ações */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 hover:bg-sky-500/20 text-xs font-bold transition"
                >
                  <Edit2 size={13} />
                  Editar
                </button>
                <button
                  onClick={handleDelete}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20 text-xs font-bold transition"
                >
                  <Trash2 size={13} />
                  Excluir
                </button>
              </div>

              {/* Itens do Cupom Fiscal */}
              {!isIncome && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Itens da Nota Fiscal
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {items.length} produto(s)
                    </span>
                  </div>

                  {loading ? (
                    <div className="flex items-center justify-center py-8 gap-2 text-xs text-slate-400">
                      <Loader2 size={14} className="animate-spin text-emerald-400" />
                      A procurar produtos da nota...
                    </div>
                  ) : items.length > 0 ? (
                    <div className="bg-[#131927] border border-white/5 rounded-xl divide-y divide-white/5 overflow-hidden">
                      <div className="max-h-60 overflow-y-auto custom-scrollbar">
                        {items.map((it) => (
                          <div key={it.id} className="p-3 flex items-center justify-between text-xs hover:bg-white/[0.02]">
                            <div className="min-w-0 pr-3">
                              <p className="font-semibold text-slate-200 truncate">{it.name}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                {it.quantity} un • R$ {Number(it.unit_price).toFixed(2).replace('.', ',')} un
                              </p>
                            </div>
                            <span className="font-bold text-slate-100 shrink-0">
                              R$ {Number(it.total_price).toFixed(2).replace('.', ',')}
                            </span>
                          </div>
                        ))}
                      </div>

                      {economiaDesconto > 0.01 && (
                        <div className="p-3 bg-emerald-500/10 border-t border-emerald-500/20 flex items-center justify-between text-xs">
                          <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                            <Tag size={12} /> Economia do mercado:
                          </span>
                          <span className="text-emerald-400 font-bold">
                            - R$ {economiaDesconto.toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-6 text-center rounded-xl bg-[#131927] border border-white/5 text-xs text-slate-500">
                      Sem itens discriminados por QR Code para este registo.
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};