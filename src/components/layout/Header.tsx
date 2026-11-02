import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, BarChart2, Settings, LogIn, LogOut } from 'lucide-react';
import { useMonth } from '../../context/MonthContext';
import { supabase } from '../../services/supabase';
import { LoginModal } from '../modals/LoginModal';

interface HeaderProps {
  onOpenAudit: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenAudit, onOpenSettings }) => {
  const { formattedMonth, nextMonth, prevMonth } = useMonth();
  const [user, setUser] = useState<any>(null);
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    if (confirm('Tem a certeza de que deseja encerrar a sessão?')) {
      await supabase.auth.signOut();
      window.location.reload();
    }
  };

  return (
    <>
      <header className="h-16 px-4 md:px-6 flex items-center justify-between border-b border-[#1E293B] bg-[#0B0F19]">
        <div className="flex items-center gap-2">
          {/* Seletor de Mês */}
          <div className="flex items-center bg-[#131927] border border-[#1E293B] rounded-xl px-2 py-1">
            <button
              onClick={prevMonth}
              className="p-1 hover:text-[#10B981] text-[#94A3B8] transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-2 text-xs font-bold text-[#F8FAFC]">{formattedMonth}</span>
            <button
              onClick={nextMonth}
              className="p-1 hover:text-[#10B981] text-[#94A3B8] transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#64748B] hidden md:inline truncate max-w-[150px]">
                {user.email}
              </span>
              <button
                onClick={handleLogout}
                title="Sair"
                className="p-2 rounded-xl bg-[#131927] border border-[#1E293B] text-[#F43F5E] hover:bg-[#1E293B] transition-colors"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setLoginOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#10B981]/15 border border-[#10B981]/40 text-[#10B981] text-xs font-bold hover:bg-[#10B981]/25 transition-all"
            >
              <LogIn size={14} />
              Entrar
            </button>
          )}

          <button
            onClick={onOpenAudit}
            className="p-2 rounded-xl bg-[#131927] border border-[#1E293B] text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
          >
            <BarChart2 size={16} />
          </button>

          <button
            onClick={onOpenSettings}
            className="p-2 rounded-xl bg-[#131927] border border-[#1E293B] text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
          >
            <Settings size={16} />
          </button>
        </div>
      </header>

      <LoginModal
        isOpen={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSuccess={() => window.location.reload()}
      />
    </>
  );
};