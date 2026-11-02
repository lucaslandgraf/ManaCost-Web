import React, { useEffect, useState } from 'react';
import { Search, Plus, Check, ImageOff } from 'lucide-react';
import { fetchFlyerDeals } from '../../services/dealsService';
import { FlyerDeal } from '../../types/database';
import { useBasket } from '../../context/BasketContext';

const STORES = ['Todas as lojas', 'Super Muffato', 'Hiper Condor', 'Super Angeloni', 'Atacadão'];

export const FlyerDealsTab: React.FC = () => {
  const [deals, setDeals] = useState<FlyerDeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStore, setSelectedStore] = useState('Todas as lojas');
  const { items, addItem, removeItem } = useBasket();

  useEffect(() => {
    setLoading(true);
    fetchFlyerDeals(0, search, 'Todos', selectedStore === 'Todas as lojas' ? 'Todas' : selectedStore)
      .then(setDeals)
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [search, selectedStore]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-3.5 text-[#64748B]" />
        <input
          type="text"
          placeholder="Buscar em ofertas, ex: carne, cerveja, sabão..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-[#131927] border border-[#1E293B] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#10B981]"
        />
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {STORES.map((s) => (
          <button
            key={s}
            onClick={() => setSelectedStore(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              selectedStore === s
                ? 'bg-[#1E293B] text-[#F8FAFC] border border-[#334155]'
                : 'bg-[#131927] text-[#94A3B8] border border-[#1E293B] hover:text-[#F8FAFC]'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-[#94A3B8]">A carregar encartes da semana...</div>
      ) : deals.length === 0 ? (
        <div className="py-12 text-center text-xs text-[#64748B]">Nenhuma oferta encontrada.</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {deals.map((deal) => {
            const inBasket = items.some((i) => i.id === deal.id);
            return (
              <div
                key={deal.id}
                className="bg-[#131927] border border-[#1E293B] rounded-2xl p-3 flex flex-col justify-between overflow-hidden"
              >
                <div>
                  {/* Foto do Produto */}
                  <div className="w-full h-32 rounded-xl bg-[#0B0F19] border border-[#1E293B] mb-2.5 overflow-hidden flex items-center justify-center relative">
                    {deal.image_url ? (
                      <img
                        src={deal.image_url}
                        alt={deal.product_name}
                        className="w-full h-full object-contain p-2 hover:scale-105 transition-transform"
                        loading="lazy"
                        onError={(e) => {
                          // Fallback se o link da foto estiver corrompido
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-[#475569] gap-1">
                        <ImageOff size={20} />
                        <span className="text-[10px]">Sem foto</span>
                      </div>
                    )}
                  </div>

                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#10B981]/15 text-[#10B981] inline-block mb-1.5">
                    {deal.store_name}
                  </span>
                  <h4 className="text-xs font-semibold text-[#F8FAFC] line-clamp-2 mb-2 min-h-[32px]">
                    {deal.product_name}
                  </h4>
                  <div className="text-base font-extrabold text-[#34D399] mb-3">
                    R$ {Number(deal.deal_price).toFixed(2).replace('.', ',')}
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (inBasket) {
                      removeItem(deal.id);
                    } else {
                      addItem({
                        id: deal.id,
                        descricao: deal.product_name,
                        valor: deal.deal_price,
                        estabelecimento: { nome: deal.store_name, endereco: '' },
                      });
                    }
                  }}
                  className={`flex items-center justify-center gap-1.5 w-full py-1.5 rounded-lg text-xs font-bold transition-all ${
                    inBasket
                      ? 'bg-[#10B981]/15 text-[#10B981] border border-[#10B981]'
                      : 'bg-[#1E293B] text-[#94A3B8] hover:text-[#F8FAFC]'
                  }`}
                >
                  {inBasket ? <Check size={14} /> : <Plus size={14} />}
                  {inBasket ? 'Na cesta' : 'Cesta'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};