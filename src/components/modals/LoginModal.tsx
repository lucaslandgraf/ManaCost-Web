import React, { useState } from 'react';
import { X, Lock, Mail, Loader2, LogIn } from 'lucide-react';
import { supabase } from '../../services/supabase';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      if (data.session) {
        onSuccess();
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao autenticar. Verifique e-mail e senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-[#131927] border border-[#1E293B] rounded-2xl p-6 shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 border-b border-[#1E293B]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#10B981]/15 text-[#10B981]">
              <Lock size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#F8FAFC]">Entrar no ManaCost</h2>
              <p className="text-[11px] text-[#64748B]">Aceda aos seus lançamentos</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-[#94A3B8] hover:text-[#F8FAFC]">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleLogin} className="space-y-4 my-5">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-[#F43F5E]/15 border border-[#F43F5E]/30 text-[#FB7185] text-xs">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="text-[11px] text-[#94A3B8] font-semibold block mb-1">E-mail</label>
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-3 text-[#64748B]" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu-email@exemplo.com"
                className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-xl pl-10 pr-3.5 py-2 text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#10B981]"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] text-[#94A3B8] font-semibold block mb-1">Senha</label>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-3 text-[#64748B]" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-xl pl-10 pr-3.5 py-2 text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#10B981]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold bg-[#10B981] text-[#0B0F19] hover:bg-[#34D399] transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <LogIn size={15} />}
            Entrar na Conta
          </button>
        </form>
      </div>
    </div>
  );
};