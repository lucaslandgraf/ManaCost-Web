import React, { useState } from 'react';
import { Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../../services/supabase';

interface ResetPasswordProps {
  onSuccess: () => void;
}

export const ResetPassword: React.FC<ResetPasswordProps> = ({ onSuccess }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (password.length < 6) {
      setErrorMsg('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('As senhas não coincidem.');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 2500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao atualizar a senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0B0F19] flex items-center justify-center p-4 relative overflow-hidden select-none">
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-sky-500/10 rounded-full blur-[128px] pointer-events-none" />

      <div className="w-full max-w-sm bg-[#131927] border border-white/10 rounded-3xl p-7 sm:p-8 shadow-2xl relative z-10">
        <div className="flex flex-col items-center mb-6">
          <img
            src="/icon.png"
            alt="ManaCost"
            className="w-14 h-14 mb-3 object-contain drop-shadow-[0_4px_16px_rgba(16,185,129,0.2)]"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">Criar Nova Senha</h1>
          <p className="text-xs text-slate-400 mt-1 font-medium text-center">
            Digite sua nova senha para acessar o ManaCost
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {success ? (
          <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs flex flex-col items-center gap-2 text-center animate-fade-in">
            <CheckCircle2 size={24} />
            <span className="font-bold">Senha atualizada com sucesso!</span>
            <span className="text-slate-400 text-[11px]">Redirecionando para o sistema...</span>
          </div>
        ) : (
          <form onSubmit={handleUpdatePassword} className="space-y-3.5">
            <div>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-3.5 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nova senha (mínimo 6 dígitos)"
                  className="w-full bg-[#0B0F19] border border-white/10 rounded-xl pl-10 pr-10 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 transition"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <div>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-3.5 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirme a nova senha"
                  className="w-full bg-[#0B0F19] border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 disabled:opacity-50 mt-2"
            >
              {loading && <Loader2 size={15} className="animate-spin text-slate-950" />}
              {loading ? 'Salvando...' : 'Salvar Nova Senha'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};