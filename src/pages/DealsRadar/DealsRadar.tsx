// src/pages/DealsRadar/DealsRadar.tsx
import React, { useState } from 'react';
import { Scale, Tag, BookOpen, Receipt, ShoppingBag } from 'lucide-react';
import { PriceComparisonTab } from './PriceComparisonTab';
import { FlyerDealsTab } from './FlyerDealsTab';
import { WeeklyFlyersTab } from './WeeklyFlyersTab';
import { SefazTab } from './SefazTab';
import { useBasket } from '../../context/BasketContext';
import { BasketModal } from '../../components/modals/BasketModal';


export type RadarTab = 'matches' | 'catalog' | 'flyers' | 'sefaz';

export const DealsRadar: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<RadarTab>('matches');
  const [basketOpen, setBasketOpen] = useState(false);
  const { totalItems } = useBasket();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#F8FAFC]">Radar de Ofertas</h1>
          <p className="text-xs text-[#64748B] mt-1">
            Compare preços, encartes e notas fiscais de Londrina
          </p>
        </div>

        {totalItems > 0 && (
          <button
            onClick={() => setBasketOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#10B981]/15 border border-[#10B981]/40 text-[#10B981] text-xs font-bold hover:bg-[#10B981]/25 transition-all shadow-lg shadow-[#10B981]/10"
          >
            <ShoppingBag size={14} />
            Cesta ({totalItems})
          </button>
        )}
      </div>

      {/* Abas Superiores */}
      <div className="flex items-center gap-2 p-1 bg-[#131927] border border-[#1E293B] rounded-xl w-fit">
        <button
          onClick={() => setCurrentTab('matches')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            currentTab === 'matches'
              ? 'bg-[#10B981] text-[#0B0F19]'
              : 'text-[#94A3B8] hover:text-[#F8FAFC]'
          }`}
        >
          <Scale size={14} /> Comparativo
        </button>
        <button
          onClick={() => setCurrentTab('catalog')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            currentTab === 'catalog'
              ? 'bg-[#10B981] text-[#0B0F19]'
              : 'text-[#94A3B8] hover:text-[#F8FAFC]'
          }`}
        >
          <Tag size={14} /> Ofertas
        </button>
        <button
          onClick={() => setCurrentTab('flyers')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            currentTab === 'flyers'
              ? 'bg-[#10B981] text-[#0B0F19]'
              : 'text-[#94A3B8] hover:text-[#F8FAFC]'
          }`}
        >
          <BookOpen size={14} /> Encartes
        </button>
        <button
          onClick={() => setCurrentTab('sefaz')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            currentTab === 'sefaz'
              ? 'bg-[#10B981] text-[#0B0F19]'
              : 'text-[#94A3B8] hover:text-[#F8FAFC]'
          }`}
        >
          <Receipt size={14} /> SEFAZ-PR
        </button>
      </div>

      {/* Renderização Condicional */}
      {currentTab === 'matches' && <PriceComparisonTab />}
      {currentTab === 'catalog' && <FlyerDealsTab />}
      {currentTab === 'flyers' && <WeeklyFlyersTab />}
      {currentTab === 'sefaz' && <SefazTab />}

      {/* Modal da Cesta Inteligente */}
      <BasketModal isOpen={basketOpen} onClose={() => setBasketOpen(false)} />
    </div>
  );
};