import React, { useEffect, useState, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  BarChart2,
  Settings,
  LogIn,
  LogOut,
  Calendar,
} from 'lucide-react';
import { useMonth } from '../../context/MonthContext'; //[cite: 28]
import { supabase } from '../../services/supabase'; //[cite: 28]
import { LoginModal } from '../modals/LoginModal'; //[cite: 28]

interface HeaderProps {
  onOpenAudit: () => void;
  onOpenSettings: () => void;
  currentTab?: string;
}

const MONTHS = [
  { label: 'Jan', index: 0 },
  { label: 'Fev', index: 1 },
  { label: 'Mar', index: 2 },
  { label: 'Abr', index: 3 },
  { label: 'Mai', index: 4 },
  { label: 'Jun', index: 5 },
  { label: 'Jul', index: 6 },
  { label: 'Ago', index: 7 },
  { label: 'Set', index: 8 },
  { label: 'Out', index: 9 },
  { label: 'Nov', index: 10 },
  { label: 'Dez', index: 11 },
]; //[cite: 11]

export const Header: React.FC<HeaderProps> = ({ onOpenAudit, onOpenSettings, currentTab }) => {
  const { currentDate, formattedMonth, nextMonth, prevMonth, setMonthYear } = useMonth();
  const [user, setUser] = useState<any>(null); //[cite: 28]
  const [loginOpen, setLoginOpen] = useState(false); //[cite: 28]

  // Estado do Popover Seletor de Mês
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(currentDate.getFullYear());
  const popoverRef = useRef<HTMLDivElement>(null);

  // Exibe o seletor no Dashboard e também em Boletos
  const showMonthSelector = currentTab === 'dashboard' || currentTab === 'bills';

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user); //[cite: 28]
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null); //[cite: 28]
    });

    return () => {
      authListener.subscription.unsubscribe(); //[cite: 28]
    };
  }, []);

  // Sincroniza o ano interno do popover sempre que abrir ou mudar a data
  useEffect(() => {
    setPickerYear(currentDate.getFullYear());
  }, [currentDate, isPickerOpen]);

  // Fecha o dropdown ao clicar fora ou pressionar Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsPickerOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsPickerOpen(false);
    };

    if (isPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPickerOpen]);

  const handleLogout = async () => {
    if (confirm('Tem a certeza de que deseja encerrar a sessão?')) { //[cite: 28]
      await supabase.auth.signOut(); //[cite: 28]
      window.location.reload(); //[cite: 28]
    }
  };

  const handleSelectMonth = (monthIndex: number) => {
    setMonthYear(pickerYear, monthIndex);
    setIsPickerOpen(false);
  };

  const handleGoToCurrentMonth = () => {
    const now = new Date();
    setMonthYear(now.getFullYear(), now.getMonth());
    setIsPickerOpen(false);
  };

  return (
    <>
      <header className="h-16 px-4 md:px-6 flex items-center justify-between border-b border-[#1E293B] bg-[#0B0F19] relative z-30 select-none">
        <div className="flex items-center gap-2">
          {showMonthSelector && (
            <div className="relative" ref={popoverRef}>
              {/* Pílula do Mês no Header */}
              <div className="flex items-center bg-[#131927] border border-[#1E293B] hover:border-emerald-500/40 rounded-xl px-1 py-0.5 transition shadow-sm">
                <button
                  type="button"
                  onClick={prevMonth}
                  title="Mês anterior"
                  className="p-1.5 hover:text-[#10B981] text-[#94A3B8] transition-colors rounded-lg hover:bg-white/5"
                >
                  <ChevronLeft size={15} />
                </button>

                <button
                  type="button"
                  onClick={() => setIsPickerOpen((prev) => !prev)}
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-black text-[#F8FAFC] hover:text-[#10B981] transition-colors"
                >
                  <span>{formattedMonth}</span>
                  <ChevronDown
                    size={12}
                    className={`text-[#10B981] transition-transform duration-200 ${
                      isPickerOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                <button
                  type="button"
                  onClick={nextMonth}
                  title="Próximo mês"
                  className="p-1.5 hover:text-[#10B981] text-[#94A3B8] transition-colors rounded-lg hover:bg-white/5"
                >
                  <ChevronRight size={15} />
                </button>
              </div>

              {/* Popover Dropdown de Seleção de Período */}
              {isPickerOpen && (
                <div className="absolute left-0 top-full mt-2 w-72 bg-[#0B0F19] border border-white/10 rounded-2xl p-4 shadow-2xl backdrop-blur-xl animate-fade-in z-50">
                  {/* Controle de Ano */}
                  <div className="flex items-center justify-between bg-[#131927] border border-white/5 rounded-xl px-2 py-1 mb-3">
                    <button
                      type="button"
                      onClick={() => setPickerYear((y) => y - 1)}
                      className="p-1 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-white/5 transition"
                      title="Ano anterior"
                    >
                      <ChevronLeft size={16} />
                    </button>

                    <span className="text-sm font-black text-slate-100">{pickerYear}</span>

                    <button
                      type="button"
                      onClick={() => setPickerYear((y) => y + 1)}
                      className="p-1 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-white/5 transition"
                      title="Próximo ano"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>

                  {/* Grade dos 12 Meses */}
                  <div className="grid grid-cols-4 gap-1.5 mb-3">
                    {MONTHS.map((m) => {
                      const isSelected =
                        currentDate.getMonth() === m.index &&
                        currentDate.getFullYear() === pickerYear;

                      return (
                        <button
                          key={m.index}
                          type="button"
                          onClick={() => handleSelectMonth(m.index)}
                          className={`py-2 rounded-xl text-xs font-bold transition border ${
                            isSelected
                              ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400'
                              : 'bg-[#131927] border-white/5 text-slate-400 hover:text-slate-100 hover:border-white/15'
                          }`}
                        >
                          {m.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Atalho para o Mês Atual */}
                  <button
                    type="button"
                    onClick={handleGoToCurrentMonth}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold transition"
                  >
                    <Calendar size={13} />
                    <span>Ir para Mês Atual</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Lado Direito do Header (Sem e-mail exposto) */}
        <div className="flex items-center gap-2">
          {user ? (
            <button
              onClick={handleLogout}
              title="Sair"
              className="p-2 rounded-xl bg-[#131927] border border-[#1E293B] text-[#F43F5E] hover:bg-[#1E293B] transition-colors"
            >
              <LogOut size={16} />
            </button>
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
            title="Relatórios & Auditoria"
            className="p-2 rounded-xl bg-[#131927] border border-[#1E293B] text-[#94A3B8] hover:text-[#F8FAFC] transition-colors"
          >
            <BarChart2 size={16} />
          </button>

          <button
            onClick={onOpenSettings}
            title="Configurações"
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