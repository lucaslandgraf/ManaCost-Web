import React, { useState, useEffect } from 'react';
import {
  X,
  Target,
  Shield,
  Database,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
} from 'lucide-react';
import { supabase } from '../../services/supabase';

interface SettingsModalProps {
  visible?: boolean;
  isOpen?: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  visible,
  isOpen,
  onClose,
  onSaved,
}) => {
  const show = visible ?? isOpen ?? true;

  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Metas orçamentárias
  const [useFixed, setUseFixed] = useState(false);
  const [needsPct, setNeedsPct] = useState('50');
  const [wantsPct, setWantsPct] = useState('30');
  const [savingsPct, setSavingsPct] = useState('20');

  const [fixedNeeds, setFixedNeeds] = useState('0');
  const [fixedWants, setFixedWants] = useState('0');
  const [fixedSavings, setFixedSavings] = useState('0');

  // Segurança e utilitários
  const [newPassword, setNewPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [generatingBackup, setGeneratingBackup] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        setUserEmail(user.email ?? null);
      }
    });
  }, []);

  useEffect(() => {
    if (show && userId) {
      loadProfileSettings(userId);
      setNewPassword('');
      setFeedbackMsg(null);
    }
  }, [show, userId]);

  const loadProfileSettings = async (uid: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('rule_needs_pct, rule_wants_pct, rule_savings_pct, use_fixed_targets, fixed_needs_val, fixed_wants_val, fixed_savings_val')
        .eq('id', uid)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setUseFixed(Boolean(data.use_fixed_targets));
        setNeedsPct(String(data.rule_needs_pct ?? 50));
        setWantsPct(String(data.rule_wants_pct ?? 30));
        setSavingsPct(String(data.rule_savings_pct ?? 20));

        setFixedNeeds(String(data.fixed_needs_val ?? 0));
        setFixedWants(String(data.fixed_wants_val ?? 0));
        setFixedSavings(String(data.fixed_savings_val ?? 0));
      }
    } catch (err: any) {
      console.warn('Erro ao carregar configurações:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBudget = async () => {
    setFeedbackMsg(null);
    if (!useFixed) {
      const n = Number(needsPct) || 0;
      const w = Number(wantsPct) || 0;
      const s = Number(savingsPct) || 0;
      const total = n + w + s;

      if (total !== 100) {
        setFeedbackMsg({
          type: 'error',
          text: `A soma das percentagens deve totalizar 100%. (Soma atual: ${total}%)`,
        });
        return;
      }
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          use_fixed_targets: useFixed,
          rule_needs_pct: Number(needsPct) || 0,
          rule_wants_pct: Number(wantsPct) || 0,
          rule_savings_pct: Number(savingsPct) || 0,
          fixed_needs_val: Number(fixedNeeds) || 0,
          fixed_wants_val: Number(fixedWants) || 0,
          fixed_savings_val: Number(fixedSavings) || 0,
        });

      if (error) throw error;

      setFeedbackMsg({ type: 'success', text: 'Metas orçamentárias atualizadas com sucesso!' });
      if (onSaved) onSaved();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Erro ao guardar configurações.' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (newPassword.trim().length < 6) {
      setFeedbackMsg({ type: 'error', text: 'A nova palavra-passe deve ter no mínimo 6 caracteres.' });
      return;
    }

    setUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword.trim(),
      });

      if (error) throw error;

      setFeedbackMsg({ type: 'success', text: 'Palavra-passe alterada com sucesso!' });
      setNewPassword('');
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: err.message || 'Falha ao atualizar palavra-passe.' });
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleBackup = async () => {
    if (!userId) return;
    setGeneratingBackup(true);
    try {
      const [txRes, purRes, billsRes] = await Promise.all([
        supabase.from('transactions').select('*').eq('user_id', userId),
        supabase.from('purchases').select('*, purchase_items(*)').eq('user_id', userId),
        supabase.from('recurring_bills').select('*').eq('user_id', userId),
      ]);

      const backupData = {
        exported_at: new Date().toISOString(),
        user_id: userId,
        transactions: txRes.data || [],
        purchases: purRes.data || [],
        recurring_bills: billsRes.data || [],
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `manacost_backup_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', text: 'Falha ao descarregar cópia de segurança.' });
    } finally {
      setGeneratingBackup(false);
    }
  };

  const handleLogout = async () => {
    if (window.confirm('Tem a certeza de que deseja terminar a sessão nesta conta?')) {
      await supabase.auth.signOut();
      window.location.reload();
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg bg-[#0B0F19] border border-white/10 rounded-2xl flex flex-col shadow-2xl overflow-hidden max-h-[90vh]">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-[#131927]">
          <div>
            <h3 className="text-base font-bold text-slate-100">Ajustes & Conta</h3>
            <p className="text-[11px] text-slate-400">Parâmetros orçamentários e segurança</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Mensagem de Feedback */}
        {feedbackMsg && (
          <div
            className={`mx-5 mt-4 p-3 rounded-xl border flex items-center gap-2 text-xs ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}
          >
            {feedbackMsg.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        <div className="p-5 overflow-y-auto space-y-6 flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-16 gap-2 text-xs text-slate-400">
              <Loader2 size={16} className="animate-spin text-emerald-400" />
              A carregar configurações...
            </div>
          ) : (
            <>
              {/* Secção 1: Metas Orçamentárias */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Target size={14} className="text-emerald-400" />
                  <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400">
                    Metas & Tetos de Gastos
                  </span>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#131927] border border-white/5 mb-4">
                  <div>
                    <p className="text-xs font-bold text-slate-200">Definir limites em R$ fixos</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {useFixed
                        ? 'Tetos estipulados em Reais por bucket.'
                        : 'Metas calculadas proporcionalmente à sua renda (50/30/20).'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUseFixed(!useFixed)}
                    className={`w-11 h-6 rounded-full transition-colors relative ${
                      useFixed ? 'bg-emerald-500' : 'bg-[#1E293B]'
                    }`}
                  >
                    <span
                      className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                        useFixed ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {!useFixed ? (
                  <div className="space-y-3">
                    <p className="text-[11px] text-slate-400">
                      Distribuição percentual (a soma deve ser 100%):
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-[#38BDF8] block mb-1">
                          Necessidades (%)
                        </label>
                        <input
                          type="number"
                          value={needsPct}
                          onChange={(e) => setNeedsPct(e.target.value)}
                          className="w-full bg-[#131927] border border-white/5 rounded-xl p-2.5 text-xs text-slate-100 font-bold focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-[#F59E0B] block mb-1">
                          Desejos (%)
                        </label>
                        <input
                          type="number"
                          value={wantsPct}
                          onChange={(e) => setWantsPct(e.target.value)}
                          className="w-full bg-[#131927] border border-white/5 rounded-xl p-2.5 text-xs text-slate-100 font-bold focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-emerald-400 block mb-1">
                          Reserva (%)
                        </label>
                        <input
                          type="number"
                          value={savingsPct}
                          onChange={(e) => setSavingsPct(e.target.value)}
                          className="w-full bg-[#131927] border border-white/5 rounded-xl p-2.5 text-xs text-slate-100 font-bold focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-[11px] text-slate-400">Valores máximos estipulados para o mês:</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-[#38BDF8] block mb-1">
                          Necessidades (R$)
                        </label>
                        <input
                          type="number"
                          value={fixedNeeds}
                          onChange={(e) => setFixedNeeds(e.target.value)}
                          className="w-full bg-[#131927] border border-white/5 rounded-xl p-2.5 text-xs text-slate-100 font-bold focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-[#F59E0B] block mb-1">
                          Desejos (R$)
                        </label>
                        <input
                          type="number"
                          value={fixedWants}
                          onChange={(e) => setFixedWants(e.target.value)}
                          className="w-full bg-[#131927] border border-white/5 rounded-xl p-2.5 text-xs text-slate-100 font-bold focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-emerald-400 block mb-1">
                          Reserva (R$)
                        </label>
                        <input
                          type="number"
                          value={fixedSavings}
                          onChange={(e) => setFixedSavings(e.target.value)}
                          className="w-full bg-[#131927] border border-white/5 rounded-xl p-2.5 text-xs text-slate-100 font-bold focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleSaveBudget}
                  disabled={saving}
                  className="mt-4 w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2"
                >
                  {saving && <Loader2 size={14} className="animate-spin" />}
                  {saving ? 'A guardar...' : 'Guardar Metas Orçamentárias'}
                </button>
              </div>

              {/* Linha Divisória */}
              <div className="h-px bg-white/5" />

              {/* Secção 2: Segurança da Conta */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Shield size={14} className="text-[#38BDF8]" />
                  <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400">
                    Segurança da Conta
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mb-3">
                  Altere a palavra-passe de acesso à aplicação
                </p>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Lock size={14} className="absolute left-3 top-3 text-slate-500" />
                    <input
                      type="password"
                      placeholder="Nova palavra-passe (mín. 6 caracteres)"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-[#131927] border border-white/5 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <button
                    onClick={handleUpdatePassword}
                    disabled={updatingPassword}
                    className="px-4 py-2 bg-[#131927] border border-sky-500/30 text-sky-400 hover:bg-sky-500/10 font-bold text-xs rounded-xl transition"
                  >
                    {updatingPassword ? '...' : 'Atualizar'}
                  </button>
                </div>
              </div>

              {/* Linha Divisória */}
              <div className="h-px bg-white/5" />

              {/* Secção 3: Cópia de Segurança */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Database size={14} className="text-emerald-400" />
                  <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400">
                    Cópia de Segurança
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mb-3">
                  Transfere todos os seus lançamentos, compras e contas recorrentes em ficheiro JSON
                </p>

                <button
                  onClick={handleBackup}
                  disabled={generatingBackup}
                  className="w-full py-2.5 bg-[#131927] border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2"
                >
                  {generatingBackup ? <Loader2 size={14} className="animate-spin" /> : <Database size={14} />}
                  {generatingBackup ? 'A exportar dados...' : 'Exportar Dados (.json)'}
                </button>
              </div>

              {/* Linha Divisória */}
              <div className="h-px bg-white/5" />

              {/* Secção 4: Sessão & Conta */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <LogOut size={14} className="text-rose-400" />
                  <span className="text-[10px] font-bold tracking-wider uppercase text-slate-400">
                    Sessão & Conta
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mb-3">
                  Sessão ativa com o e-mail: <strong className="text-slate-200">{userEmail}</strong>
                </p>

                <button
                  onClick={handleLogout}
                  className="w-full py-2.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2"
                >
                  <LogOut size={14} />
                  Terminar Sessão
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};