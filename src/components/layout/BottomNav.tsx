import React, { useState } from 'react';
import {
  Home,
  Tag,
  QrCode,
  Receipt,
  MoreHorizontal,
  Plane,
  Target,
  TrendingUp,
  X,
} from 'lucide-react';
import type { NavTab } from './Sidebar';

interface BottomNavProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  onOpenScanner: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenScanner,
}) => {
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  const handleSelectTab = (tab: NavTab) => {
    setActiveTab(tab);
    setMoreMenuOpen(false);
  };

  const isMoreActive =
    activeTab === 'trips' || activeTab === 'goals' || activeTab === 'simulator';

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#0B0F19]/95 backdrop-blur-md border-t border-[#1E293B] flex items-center justify-around px-2 z-40 select-none">
        {/* Início */}
        <button
          onClick={() => handleSelectTab('dashboard')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 transition ${
            activeTab === 'dashboard' ? 'text-[#10B981]' : 'text-[#64748B]'
          }`}
        >
          <Home size={18} />
          <span className="text-[10px] font-bold">Início</span>
        </button>

        {/* Ofertas */}
        <button
          onClick={() => handleSelectTab('deals')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 transition ${
            activeTab === 'deals' ? 'text-[#10B981]' : 'text-[#64748B]'
          }`}
        >
          <Tag size={18} />
          <span className="text-[10px] font-bold">Ofertas</span>
        </button>

        {/* Botão Central Scanner QR */}
        <div className="relative -top-5">
          <button
            onClick={onOpenScanner}
            className="w-13 h-13 rounded-full bg-[#10B981] text-[#0B0F19] flex items-center justify-center shadow-lg shadow-[#10B981]/30 border-4 border-[#0B0F19] hover:bg-[#34D399] active:scale-95 transition-all p-3"
          >
            <QrCode size={22} strokeWidth={2.5} />
          </button>
        </div>

        {/* Boletos */}
        <button
          onClick={() => handleSelectTab('bills')}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 transition ${
            activeTab === 'bills' ? 'text-[#10B981]' : 'text-[#64748B]'
          }`}
        >
          <Receipt size={18} />
          <span className="text-[10px] font-bold">Boletos</span>
        </button>

        {/* Mais (Abre Viagens, Metas e Simulador) */}
        <button
          onClick={() => setMoreMenuOpen(true)}
          className={`flex flex-col items-center gap-1 py-1 px-2.5 transition ${
            isMoreActive ? 'text-[#10B981]' : 'text-[#64748B]'
          }`}
        >
          <MoreHorizontal size={18} />
          <span className="text-[10px] font-bold">Mais</span>
        </button>
      </nav>

      {/* Menu 'Mais Opções' Flutuante para Telas Menores */}
      {moreMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end p-4 md:hidden animate-fade-in"
          onClick={() => setMoreMenuOpen(false)}
        >
          <div
            className="w-full bg-[#0B0F19] border border-white/10 rounded-3xl p-5 space-y-4 mb-2 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="text-sm font-bold text-slate-100">Recursos Adicionais</h3>
              <button
                onClick={() => setMoreMenuOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {/* Metas */}
              <button
                onClick={() => handleSelectTab('goals')}
                className={`flex items-center gap-3 p-3 rounded-2xl border transition ${
                  activeTab === 'goals'
                    ? 'bg-[#131927] border-[#10B981]/40 text-[#10B981]'
                    : 'bg-[#131927] border-white/5 text-slate-300'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Target size={18} />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-100">Metas & Simulador</p>
                  <p className="text-[10px] text-slate-500">Projeção de objetivos e aportes</p>
                </div>
              </button>

              {/* Viagens */}
              <button
                onClick={() => handleSelectTab('trips')}
                className={`flex items-center gap-3 p-3 rounded-2xl border transition ${
                  activeTab === 'trips'
                    ? 'bg-[#131927] border-[#10B981]/40 text-[#10B981]'
                    : 'bg-[#131927] border-white/5 text-slate-300'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
                  <Plane size={18} />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-100">Viagens & Eventos</p>
                  <p className="text-[10px] text-slate-500">Planejamento e estimativas</p>
                </div>
              </button>

              {/* Simulador CDI */}
              <button
                onClick={() => handleSelectTab('simulator')}
                className={`flex items-center gap-3 p-3 rounded-2xl border transition ${
                  activeTab === 'simulator'
                    ? 'bg-[#131927] border-[#10B981]/40 text-[#10B981]'
                    : 'bg-[#131927] border-white/5 text-slate-300'
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                  <TrendingUp size={18} />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-100">Simulador de Rendimentos</p>
                  <p className="text-[10px] text-slate-500">Renda Fixa e CDI vs Poupança</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};