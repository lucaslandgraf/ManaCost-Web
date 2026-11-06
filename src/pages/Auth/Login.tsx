import React, { useState } from 'react';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { supabase } from '../../services/supabase';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setFeedback({ type: 'error', text: 'Por favor, preencha o e-mail e a senha.' });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setFeedback({ type: 'error', text: 'E-mail ou senha incorretos.' });
        } else if (error.message.includes('Email not confirmed')) {
          setFeedback({ type: 'error', text: 'Este usuário ainda não tem o e-mail confirmado.' });
        } else {
          setFeedback({ type: 'error', text: error.message });
        }
      }
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Ocorreu uma falha ao iniciar sessão.' });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setFeedback({
        type: 'error',
        text: 'Introduza o seu e-mail no campo acima e clique novamente nesta opção.',
      });
      return;
    }

    setLoading(true);
    setFeedback(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        if (error.message.includes('For security purposes') || error.message.includes('after')) {
          const match = error.message.match(/\d+/);
          const seconds = match ? match[0] : 'alguns';
          setFeedback({
            type: 'error',
            text: `Por motivos de segurança, aguarde ${seconds} segundos antes de solicitar um novo e-mail.`,
          });
          return;
        }

        setFeedback({ type: 'error', text: error.message });
        return;
      }

      setFeedback({
        type: 'success',
        text: 'Se o e-mail estiver cadastrado, você receberá as instruções para redefinir a senha.',
      });
    } catch (err: any) {
      setFeedback({ type: 'error', text: err.message || 'Falha ao solicitar redefinição.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0B0F19] flex items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Luzes de ambientação escuras */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/10 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-sky-500/10 rounded-full blur-[128px] pointer-events-none" />

      {/* Cartão Central (Layout Web) */}
      <div className="w-full max-w-sm bg-[#131927] border border-white/10 rounded-3xl p-7 sm:p-8 shadow-2xl relative z-10">
        
        {/* Ícone e Títulos */}
        <div className="flex flex-col items-center mb-6">
          <img
            src="/icon.png"
            alt="ManaCost"
            className="w-14 h-14 mb-3 object-contain drop-shadow-[0_4px_16px_rgba(16,185,129,0.2)]"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">ManaCost</h1>
          <p className="text-xs text-slate-400 mt-1 font-medium">Gestão e controle financeiro</p>
        </div>

        {/* Mensagem de Feedback */}
        {feedback && (
          <div
            className={`mb-4 p-3 rounded-xl border flex items-center gap-2 text-xs leading-relaxed animate-fade-in ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 size={15} className="shrink-0" />
            ) : (
              <AlertCircle size={15} className="shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-3.5">
          {/* E-mail */}
          <div>
            <div className="relative">
              <Mail size={15} className="absolute left-3.5 top-3.5 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-mail"
                autoCapitalize="none"
                className="w-full bg-[#0B0F19] border border-white/10 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
          </div>

          {/* Senha */}
          <div>
            <div className="relative">
              <Lock size={15} className="absolute left-3.5 top-3.5 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Senha"
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

          {/* Botão Entrar */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 disabled:opacity-50 mt-1"
          >
            {loading && <Loader2 size={15} className="animate-spin text-slate-950" />}
            {loading ? 'A autenticar...' : 'Entrar'}
          </button>
        </form>

        {/* Link Esqueceu sua senha? */}
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={loading}
            className="text-xs text-sky-400 hover:text-sky-300 font-semibold transition"
          >
            Esqueceu sua senha?
          </button>
        </div>
      </div>
    </div>
  );
};