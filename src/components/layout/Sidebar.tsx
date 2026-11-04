import React from 'react';
import { Home, Tag, QrCode, Receipt, Plane, Target, TrendingUp } from 'lucide-react';

export type NavTab = 'dashboard' | 'deals' | 'bills' | 'trips' | 'goals' | 'simulator';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  onOpenScanner: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onOpenScanner,
}) => {
  // 3 itens ACIMA do Scanner QR
  const topItems = [
    { id: 'dashboard', label: 'Início', icon: Home },
    { id: 'deals', label: 'Ofertas', icon: Tag },
    { id: 'bills', label: 'Boletos', icon: Receipt },
  ] as const;

  // 3 itens ABAIXO do Scanner QR
  const bottomItems = [
    { id: 'trips', label: 'Viagens', icon: Plane },
    { id: 'goals', label: 'Metas', icon: Target },
    { id: 'simulator', label: 'Simulador', icon: TrendingUp },
  ] as const;

  return (
    <aside className="hidden md:flex flex-col w-64 bg-[#0B0F19] border-r border-[#1E293B] h-screen sticky top-0 p-5 select-none">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-2 mb-8">
        <img 
          src="/icon.png" 
          alt="ManaCost" 
          className="w-10 h-10 rounded-xl object-contain drop-shadow-[0_4px_12px_rgba(16,185,129,0.25)]" 
        />
        <span className="text-lg font-black tracking-tight text-white">ManaCost</span>
      </div>

      {/* Navegação Equilibrada (3 acima - QR - 3 abaixo) */}
      <nav className="flex flex-col gap-1.5 flex-1">
        {/* 1. Início, Ofertas, Boletos */}
        {topItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-[#131927] text-[#10B981] border border-[#10B981]/30'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#131927]/60'
              }`}
            >
              <Icon size={18} />
              {item.label}
            </button>
          );
        })}

        {/* 2. Botão Scanner QR Central */}
        <button
          onClick={onOpenScanner}
          className="flex items-center gap-3 px-4 py-3 my-2 rounded-xl text-sm font-bold bg-[#10B981] text-[#0B0F19] hover:bg-[#34D399] transition-all shadow-lg shadow-[#10B981]/20"
        >
          <QrCode size={18} strokeWidth={2.5} />
          Scanner QR
        </button>

        {/* 3. Viagens, Metas, Simulador */}
        {bottomItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                isActive
                  ? 'bg-[#131927] text-[#10B981] border border-[#10B981]/30'
                  : 'text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#131927]/60'
              }`}
            >
              <Icon size={18} />
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};