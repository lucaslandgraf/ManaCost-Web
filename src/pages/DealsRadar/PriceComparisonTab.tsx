import React, { useEffect, useState } from 'react';
import { Search, ChevronDown, ChevronUp, Plus, Check, ImageOff } from 'lucide-react';
import { fetchProductMatches } from '../../services/dealsService';
import { ProductMatch } from '../../types/database';
import { useBasket } from '../../context/BasketContext';
import { parseSearchTokens, cleanSearchText } from '../../utils/searchEngine';

export const PriceComparisonTab: React.FC = () => {
  const [matches, setMatches] = useState<ProductMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { items, addItem, removeItem } = useBasket();

  useEffect(() => {
    fetchProductMatches()
      .then(setMatches)
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const filteredMatches = matches.filter((item) => {
    const tokens = parseSearchTokens(searchTerm);
    if (tokens.length === 0) return true;
    const cleanName = cleanSearchText(item.display_name);
    return tokens.every((group) => group.some((term) => cleanName.includes(term)));
  });

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-3.5 text-[#64748B]" />
        <input
          type="text"
          placeholder="Buscar produto, ex: leite, galo, refri..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-[#131927] border border-[#1E293B] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#10B981]"
        />
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-[#94A3B8]">A carregar comparativo...</div>
      ) : filteredMatches.length === 0 ? (
        <div className="py-12 text-center text-xs text-[#64748B]">Nenhum produto encontrado.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMatches.map((item) => {
            const inBasket = items.some((i) => i.id === item.id);
            const isExpanded = expandedId === item.id;

            return (
              <div
                key={item.id}
                className="bg-[#131927] border border-[#1E293B] rounded-2xl p-4 flex flex-col justify-between"
              >
                <div>
                  {/* Foto do Produto ou Placeholder */}
                  <div className="w-full h-36 rounded-xl bg-[#0B0F19] border border-[#1E293B] mb-3 overflow-hidden flex items-center justify-center">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.display_name}
                        className="w-full h-full object-contain p-2 hover:scale-105 transition-transform"
                        loading="lazy"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-[#475569] gap-1">
                        <ImageOff size={22} />
                        <span className="text-[10px]">Sem foto</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                      {item.cheapest_store}
                    </span>
                    {item.spread > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#F43F5E]/15 text-[#F43F5E]">
                        -R$ {Number(item.spread).toFixed(2).replace('.', ',')}
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-sm text-[#F8FAFC] line-clamp-2 mb-2 min-h-[38px]">
                    {item.display_name}
                  </h3>

                  <div className="flex items-baseline gap-1 mb-3">
                    <span className="text-xs text-[#64748B]">Melhor:</span>
                    <span className="text-lg font-extrabold text-[#34D399]">
                      R$ {Number(item.min_price).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 pt-3 border-t border-[#1E293B]">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className="text-[11px] font-semibold text-[#94A3B8] hover:text-[#F8FAFC] flex items-center gap-1"
                    >
                      {item.stores_count} supermercados
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    <button
                      onClick={() => {
                        if (inBasket) {
                          removeItem(item.id);
                        } else {
                          addItem({
                            id: item.id,
                            descricao: item.display_name,
                            valor: item.min_price,
                            estabelecimento: { nome: item.cheapest_store, endereco: '' },
                          });
                        }
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        inBasket
                          ? 'bg-[#10B981]/15 text-[#10B981] border border-[#10B981]'
                          : 'bg-[#1E293B] text-[#94A3B8] hover:text-[#F8FAFC]'
                      }`}
                    >
                      {inBasket ? <Check size={14} /> : <Plus size={14} />}
                      {inBasket ? 'Na cesta' : 'Cesta'}
                    </button>
                  </div>

                  {isExpanded && item.product_match_items && (
                    <div className="pt-2 space-y-1.5 border-t border-[#1E293B]/60 text-xs">
                      {item.product_match_items.map((sub, idx) => (
                        <div key={idx} className="flex justify-between text-[#94A3B8]">
                          <span>{sub.store_name}</span>
                          <span className="font-semibold text-[#F8FAFC]">
                            R$ {Number(sub.price).toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};