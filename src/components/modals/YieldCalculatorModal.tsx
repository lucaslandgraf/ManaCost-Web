import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  TrendingUp,
  Shield,
  Lock,
  AlertCircle,
  Loader2,
  Building2,
  Calendar,
} from 'lucide-react';

interface InstitutionPreset {
  id: string;
  name: string;
  cdiPct: number;
  hasIof: boolean;
  hasFgc: boolean;
  typeBadge: string;
}

const INSTITUTIONS: InstitutionPreset[] = [
  { id: 'nubank', name: 'Nubank (Caixinha)', cdiPct: 100, hasIof: true, hasFgc: true, typeBadge: 'RDB 100%' },
  { id: 'mercadopago', name: 'Mercado Pago', cdiPct: 105, hasIof: false, hasFgc: false, typeBadge: 'Conta 105%' },
  { id: 'sofisa', name: 'Sofisa Direto', cdiPct: 110, hasIof: true, hasFgc: true, typeBadge: 'CDB 110%' },
  { id: 'picpay', name: 'PicPay (Cofrinho)', cdiPct: 102, hasIof: true, hasFgc: true, typeBadge: 'CDB 102%' },
  { id: 'inter', name: 'Banco Inter', cdiPct: 100, hasIof: true, hasFgc: true, typeBadge: 'CDB 100%' },
  { id: 'c6', name: 'C6 Bank', cdiPct: 100, hasIof: true, hasFgc: true, typeBadge: 'CDB 100%' },
  { id: 'pagbank', name: 'PagBank', cdiPct: 105, hasIof: true, hasFgc: true, typeBadge: 'CDB 105%' },
];

const PRESET_DAYS = [
  { label: '7 dias', days: 7 },
  { label: '15 dias', days: 15 },
  { label: '30 dias', days: 30 },
  { label: '6 meses', days: 180 },
  { label: '1 ano', days: 360 },
  { label: '2 anos', days: 720 },
];

const IOF_RATES = [
  0.96, 0.93, 0.90, 0.86, 0.83, 0.80, 0.76, 0.73, 0.70, 0.66,
  0.63, 0.60, 0.56, 0.53, 0.50, 0.46, 0.43, 0.40, 0.36, 0.33,
  0.30, 0.26, 0.23, 0.20, 0.16, 0.13, 0.10, 0.06, 0.03,
];

interface YieldCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialAmount?: number;
}

export const YieldCalculatorModal: React.FC<YieldCalculatorModalProps> = ({
  isOpen,
  onClose,
  initialAmount = 1000,
}) => {
  const [selectedInstId, setSelectedInstId] = useState<string>('nubank');
  const [amountStr, setAmountStr] = useState(String(initialAmount || 1000));
  const [cdiPctStr, setCdiPctStr] = useState('100');
  const [baseDiRateStr, setBaseDiRateStr] = useState('10.50');
  const [daysStr, setDaysStr] = useState('30');
  const [loadingRate, setLoadingRate] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchCurrentDiRate = async () => {
      try {
        setLoadingRate(true);
        const response = await fetch(
          'https://api.bcb.gov.br/dados/serie/bcdata.sgs.4389/dados/ultimos/1?formato=json'
        );
        const data = await response.json();
        if (Array.isArray(data) && data[0]?.valor) {
          const currentRate = parseFloat(String(data[0].valor).replace(',', '.'));
          if (!isNaN(currentRate) && currentRate > 0) {
            setBaseDiRateStr(currentRate.toFixed(2));
          }
        }
      } catch (err) {
        console.warn('Falha ao obter taxa DI do BCB:', err);
      } finally {
        setLoadingRate(false);
      }
    };

    void fetchCurrentDiRate();
  }, [isOpen]);

  const selectedInst = INSTITUTIONS.find((i) => i.id === selectedInstId) || INSTITUTIONS[0];

  const handleSelectInstitution = (inst: InstitutionPreset) => {
    setSelectedInstId(inst.id);
    setCdiPctStr(String(inst.cdiPct));
  };

  const principal = Math.max(0, parseFloat(amountStr.replace(',', '.')) || 0);
  const cdiPct = Math.max(0, parseFloat(cdiPctStr.replace(',', '.')) || 0);
  const baseDiRate = Math.max(0, parseFloat(baseDiRateStr.replace(',', '.')) || 0);
  const days = Math.max(1, parseInt(daysStr, 10) || 1);

  const iofTaxRate = useMemo(() => {
    if (!selectedInst.hasIof) return 0;
    if (days >= 30) return 0;
    return IOF_RATES[days - 1] ?? 0;
  }, [days, selectedInst]);

  const irTaxRate = useMemo(() => {
    if (days <= 180) return 0.225;
    if (days <= 360) return 0.20;
    if (days <= 720) return 0.175;
    return 0.15;
  }, [days]);

  const businessDays = days <= 1 ? 1 : Math.max(1, Math.round(days * (252 / 365)));
  const effectiveAnnualGrossRate = (baseDiRate / 100) * (cdiPct / 100);

  const grossFactor = Math.pow(1 + effectiveAnnualGrossRate, businessDays / 252) - 1;
  const grossProfit = principal * grossFactor;

  const iofAmount = grossProfit * iofTaxRate;
  const profitAfterIof = grossProfit - iofAmount;

  const irAmount = profitAfterIof * irTaxRate;
  const netProfit = profitAfterIof - irAmount;
  const finalTotalAmount = principal + netProfit;
  const netPercentage = principal > 0 ? (netProfit / principal) * 100 : 0;

  const yearsFraction = days / 365;
  const savingsAnnualRate = 0.0617;
  const savingsFactor = Math.pow(1 + savingsAnnualRate, yearsFraction) - 1;
  const savingsProfit = principal * savingsFactor;

  const diffProfit = netProfit - savingsProfit;

  const formatBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-black/80 backdrop-blur-md animate-fade-in select-none">
      {/* Container Adaptado para Desktop (max-w-4xl em vez de coluna estreita de celular) */}
      <div className="w-full max-w-4xl bg-[#0B0F19] border border-white/10 rounded-3xl flex flex-col shadow-2xl overflow-hidden max-h-[92vh]">
        
        {/* Topo Web */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#131927]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <TrendingUp size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Simulador de Rendimentos</h3>
              <p className="text-xs text-slate-400">Projeção líquida de Renda Fixa e Bancos Digitais vs. Poupança</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Corpo com Grid de 2 Colunas para Monitor Desktop */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* COLUNA ESQUERDA: Parâmetros & Instituições (7 cols) */}
            <div className="lg:col-span-7 space-y-5">
              
              {/* Instituições em grade de 3 colunas */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5 mb-2.5">
                  <Building2 size={12} className="text-emerald-400" />
                  Instituição Financeira
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {INSTITUTIONS.map((inst) => {
                    const isActive = inst.id === selectedInstId;
                    return (
                      <button
                        key={inst.id}
                        type="button"
                        onClick={() => handleSelectInstitution(inst)}
                        className={`p-3 rounded-xl border text-left transition ${
                          isActive
                            ? 'bg-emerald-500/15 border-emerald-500 text-white shadow-lg shadow-emerald-500/5'
                            : 'bg-[#131927] border-white/5 text-slate-400 hover:text-slate-200 hover:border-white/10'
                        }`}
                      >
                        <p className={`text-xs font-bold truncate ${isActive ? 'text-white' : 'text-slate-200'}`}>
                          {inst.name}
                        </p>
                        <div className="flex items-center justify-between mt-1.5 text-[10px]">
                          <span className={`font-semibold ${isActive ? 'text-emerald-400 font-bold' : 'text-slate-400'}`}>
                            {inst.typeBadge}
                          </span>
                          <span className={`px-1.5 py-0.2 rounded font-bold text-[9px] ${
                            inst.hasFgc ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
                          }`}>
                            {inst.hasFgc ? 'FGC' : 'Títulos'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Inputs de Valores */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-[#131927] p-3 rounded-2xl border border-white/5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Aporte Inicial (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    placeholder="1000.00"
                    className="w-full bg-[#0B0F19] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 font-black focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="bg-[#131927] p-3 rounded-2xl border border-white/5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    % do CDI
                  </label>
                  <input
                    type="number"
                    value={cdiPctStr}
                    onChange={(e) => setCdiPctStr(e.target.value)}
                    placeholder="100"
                    className="w-full bg-[#0B0F19] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="bg-[#131927] p-3 rounded-2xl border border-white/5">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Taxa DI (% a.a.)
                    </label>
                    {loadingRate ? (
                      <Loader2 size={10} className="animate-spin text-sky-400" />
                    ) : (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 text-[8px] font-black">
                        BCB
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    value={baseDiRateStr}
                    onChange={(e) => setBaseDiRateStr(e.target.value)}
                    placeholder="10.50"
                    className="w-full bg-[#0B0F19] border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-100 font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Prazo */}
              <div className="bg-[#131927] p-4 rounded-2xl border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Calendar size={12} className="text-emerald-400" />
                    Prazo de Aplicação
                  </label>
                  <span className="text-xs text-slate-400">
                    ~{businessDays} dias úteis
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    value={daysStr}
                    onChange={(e) => setDaysStr(e.target.value)}
                    className="w-24 bg-[#0B0F19] border border-emerald-500 rounded-xl px-3 py-2 text-center text-xs font-black text-slate-100 focus:outline-none"
                  />
                  <span className="text-xs text-slate-400 font-medium">dias corridos</span>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {PRESET_DAYS.map((preset) => {
                    const isActive = days === preset.days;
                    return (
                      <button
                        key={preset.days}
                        type="button"
                        onClick={() => setDaysStr(String(preset.days))}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition border ${
                          isActive
                            ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 font-bold'
                            : 'bg-[#0B0F19] border-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* COLUNA DIREITA: Resultados & Poupança (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              
              {/* Card de Resultado */}
              <div className="bg-[#131927] border border-white/5 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">{selectedInst.name}</h4>
                    <p className="text-[11px] text-slate-400">{days} dias de aplicação</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1.5 border ${
                    selectedInst.hasFgc
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                  }`}>
                    {selectedInst.hasFgc ? <Shield size={11} /> : <Lock size={11} />}
                    {selectedInst.hasFgc ? 'Garantia FGC' : 'Títulos Federais'}
                  </span>
                </div>

                <div className="text-center py-2 bg-[#0B0F19] rounded-2xl border border-white/5 p-4">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Saldo Total Final Líquido
                  </span>
                  <p className="text-3xl font-black text-slate-100 tracking-tight mt-1">
                    {formatBRL(finalTotalAmount)}
                  </p>
                  <p className="text-xs font-bold text-emerald-400 mt-1">
                    Lucro Líquido: + {formatBRL(netProfit)} ({netPercentage.toFixed(2)}%)
                  </p>
                </div>

                {/* Discriminação Fiscal */}
                <div className="space-y-2 pt-1 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Rendimento Bruto</span>
                    <span className="font-bold text-slate-200">+ {formatBRL(grossProfit)}</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <span>IOF Regressivo</span>
                      <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                        iofTaxRate === 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                      }`}>
                        {(iofTaxRate * 100).toFixed(0)}%
                      </span>
                    </div>
                    <span className={iofAmount > 0 ? 'font-bold text-rose-400' : 'text-slate-500'}>
                      {iofAmount > 0 ? `- ${formatBRL(iofAmount)}` : 'R$ 0,00'}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <span>Imposto de Renda (IR)</span>
                      <span className="px-1.5 py-0.2 rounded bg-rose-500/15 text-rose-400 text-[9px] font-bold">
                        {(irTaxRate * 100).toFixed(1)}%
                      </span>
                    </div>
                    <span className="font-bold text-rose-400">- {formatBRL(irAmount)}</span>
                  </div>
                </div>

                {days < 30 && selectedInst.hasIof && (
                  <div className="flex items-start gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-[11px] leading-relaxed">
                    <AlertCircle size={14} className="shrink-0 mt-0.5 text-rose-400" />
                    <span>Resgates antes de 30 dias deduzem IOF. Faltam {30 - days} dias para zerar.</span>
                  </div>
                )}
              </div>

              {/* Comparativo com a Poupança */}
              <div className="bg-[#131927] border border-white/5 rounded-2xl p-4.5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-200">Frente à Poupança</h4>
                  <span className="text-[10px] text-slate-500">{days} dias</span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Poupança Comum (Isenta):</span>
                    <span className="font-semibold text-slate-200">+ {formatBRL(savingsProfit)}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>{selectedInst.name} (Líquido):</span>
                    <span className="font-bold text-emerald-400">+ {formatBRL(netProfit)}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] leading-relaxed">
                  <TrendingUp size={14} className="shrink-0 mt-0.5 text-amber-400" />
                  <span>
                    {diffProfit >= 0
                      ? `Rende ${formatBRL(diffProfit)} a mais do que na poupança tradicional.`
                      : `Devido ao IOF inicial, a poupança rendeu ${formatBRL(Math.abs(diffProfit))} a mais.`}
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Rodapé Desktop */}
        <div className="p-4 border-t border-white/5 bg-[#131927] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-[#0B0F19] hover:bg-slate-800 text-slate-300 font-bold text-xs transition"
          >
            Fechar Simulação
          </button>
        </div>
      </div>
    </div>
  );
};