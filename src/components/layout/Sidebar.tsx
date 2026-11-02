// src/components/layout/Sidebar.tsx
import React from 'react';
import { Home, Tag, QrCode, Receipt, Plane, ShoppingBag } from 'lucide-react';

export type NavTab = 'dashboard' | 'deals' | 'bills' | 'trips';

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
  const menuItems = [
    { id: 'dashboard', label: 'Início', icon: Home },
    { id: 'deals', label: 'Ofertas', icon: Tag },
  ] as const;

  const secondaryItems = [
    { id: 'bills', label: 'Boletos', icon: Receipt },
    { id: 'trips', label: 'Viagens', icon: Plane },
  ] as const;

  return (
    <aside className="hidden md:flex flex-col w-64 bg-[#0B0F19] border-r border-[#1E293B] h-screen sticky top-0 p-5">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-2 mb-8">
        <div className="w-9 h-9 rounded-xl bg-[#10B981] flex items-center justify-center text-[#0B0F19]">
          <ShoppingBag size={20} strokeWidth={2.5} />
        </div>
        <span className="font-extrabold text-lg tracking-tight text-[#F8FAFC]">ManaCost</span>
      </div>

      {/* Navegação Primária */}
      <nav className="flex flex-col gap-1.5 flex-1">
        {menuItems.map((item) => {
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

        {/* Botão Scanner QR em Destaque */}
        <button
          onClick={onOpenScanner}
          className="flex items-center gap-3 px-4 py-3 my-2 rounded-xl text-sm font-bold bg-[#10B981] text-[#0B0F19] hover:bg-[#34D399] transition-all shadow-lg shadow-[#10B981]/20"
        >
          <QrCode size={18} strokeWidth={2.5} />
          Scanner QR
        </button>

        {secondaryItems.map((item) => {
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