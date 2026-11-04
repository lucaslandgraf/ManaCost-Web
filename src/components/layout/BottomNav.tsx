// src/components/layout/BottomNav.tsx
import React from 'react';
import { Home, Tag, QrCode, Receipt, Target } from 'lucide-react';
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
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-[#0B0F19]/95 backdrop-blur-md border-t border-[#1E293B] flex items-center justify-around px-1 z-30">
      <button
        onClick={() => setActiveTab('dashboard')}
        className={`flex flex-col items-center gap-1 py-1 px-2.5 ${
          activeTab === 'dashboard' ? 'text-[#10B981]' : 'text-[#64748B]'
        }`}
      >
        <Home size={18} />
        <span className="text-[10px] font-bold">Início</span>
      </button>

      <button
        onClick={() => setActiveTab('deals')}
        className={`flex flex-col items-center gap-1 py-1 px-2.5 ${
          activeTab === 'deals' ? 'text-[#10B981]' : 'text-[#64748B]'
        }`}
      >
        <Tag size={18} />
        <span className="text-[10px] font-bold">Ofertas</span>
      </button>

      {/* Botão Central Elevado */}
      <div className="relative -top-5">
        <button
          onClick={onOpenScanner}
          className="w-13 h-13 rounded-full bg-[#10B981] text-[#0B0F19] flex items-center justify-center shadow-lg shadow-[#10B981]/30 border-4 border-[#0B0F19] hover:bg-[#34D399] active:scale-95 transition-all p-3"
        >
          <QrCode size={22} strokeWidth={2.5} />
        </button>
      </div>

      <button
        onClick={() => setActiveTab('bills')}
        className={`flex flex-col items-center gap-1 py-1 px-2.5 ${
          activeTab === 'bills' ? 'text-[#10B981]' : 'text-[#64748B]'
        }`}
      >
        <Receipt size={18} />
        <span className="text-[10px] font-bold">Boletos</span>
      </button>

      <button
        onClick={() => setActiveTab('goals')}
        className={`flex flex-col items-center gap-1 py-1 px-2.5 ${
          activeTab === 'goals' ? 'text-[#10B981]' : 'text-[#64748B]'
        }`}
      >
        <Target size={18} />
        <span className="text-[10px] font-bold">Metas</span>
      </button>
    </nav>
  );
};