import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  Loader2,
  ChevronDown,
  ChevronUp,
  Plus,
  Check,
  Award,
  Store,
  Filter,
} from 'lucide-react';
import { fetchProductMatches } from '../../services/dealsService';
import type { ProductMatch, MatchItem } from '../../types/database';
import { useBasket } from '../../context/BasketContext';
import { cleanSearchText, parseSearchTokens } from '../../utils/searchEngine';
import { ProductImageWithFallback } from '../../components/ui/ProductImageWithFallback';

const STORES_LIST = [
  'Todas as lojas',
  'Super Muffato',
  'Hiper Condor',
  'Super Angeloni',
  'Atacadão',
  'Santarém',
  'Viscardi',
  'Almeida Mercados',
  'Amigão Supermercados',
  'Carrefour',
];

const MACRO_CATEGORIES = [
  'Todos os Departamentos',
  'Açougue & Carnes',
  'Bebidas & Cervejas',
  'Laticínios & Frios',
  'Mercearia & Alimentos',
  'Hortifruti',
  'Limpeza',
  'Higiene & Cuidados',
  'Padaria & Matinais',
] as const;

export function matchMacroCategory(category: string, rawCategory: string = '', productName: string = ''): boolean {
  if (category === 'Todos os Departamentos' || category === 'Todos') return true;
  const text = `${rawCategory} ${productName}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  switch (category) {
    case 'Açougue & Carnes':
      return /(carne|bovino|suino|frango|peixe|costela|acem|alcatra|bacon|linguica|file|picanha|bife|salmao|tilapia|pernil|coxa|sobrecoxa|hamburguer|steak|cordeiro)/.test(text);
    case 'Bebidas & Cervejas':
      return /(bebida|cerveja|refrigerante|suco|refresco|agua|vinho|cha|energetico|vodka|whisky|chopp|heineken|coca|guarana|pepsi)/.test(text);
    case 'Laticínios & Frios':
      return /(leite|queijo|mussarela|iogurte|manteiga|requeijao|presunto|mortadela|salame|nata|creme de leite|condensado|frescal|parmesao)/.test(text);
    case 'Mercearia & Alimentos':
      return /(arroz|feijao|oleo|azeite|farinha|macarrao|molho|acucar|sal|cafe|adocante|achocolatado|conserva|milho|ervilha|atum|sardinha|maionese|ketchup|mostarda|biscoito|bolacha|tempero)/.test(text);
    case 'Hortifruti':
      return /(fruta|verdura|legume|abobrinha|limao|tomate|batata|cebola|banana|maca|laranja|alho|alface|cenoura|manga|mamao|uva|abacaxi)/.test(text);
    case 'Limpeza':
      return /(limpeza|detergente|sabao|amaciante|desinfetante|pinho|agua sanitaria|alvejante|esponja|multiuso|papel higienico|papel toalha|lustra)/.test(text);
    case 'Higiene & Cuidados':
      return /(shampoo|condicionador|sabonete|creme dental|escova|desodorante|absorvente|fralda|hidratante|barbear|fio dental)/.test(text);
    case 'Padaria & Matinais':
      return /(pao|bolo|torrada|cereal|aveia|granola|geleia|margarina|croissant)/.test(text);
    default:
      return true;
  }
}

export const PriceComparisonTab: React.FC = () => {
  const [matches, setMatches] = useState<ProductMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos os Departamentos');
  const [selectedStore, setSelectedStore] = useState<string>('Todas as lojas');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Controle do dropdown customizado
  const [isDeptOpen, setIsDeptOpen] = useState(false);
  const deptDropdownRef = useRef<HTMLDivElement>(null);

  const { items, addItem, removeItem } = useBasket();

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await fetchProductMatches();
        setMatches(data);
      } catch (err) {
        console.error('Erro ao carregar comparativo:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Fechar dropdown de departamento ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (deptDropdownRef.current && !deptDropdownRef.current.contains(e.target as Node)) {
        setIsDeptOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredMatches = useMemo(() => {
    const tokenGroups = parseSearchTokens(search);

    return matches.filter((item) => {
      // 1. Filtro Departamental
      const matchesCategory = matchMacroCategory(selectedCategory, item.category || '', item.display_name);

      // 2. Busca por texto e sinônimos
      let matchesSearch = true;
      if (tokenGroups.length > 0) {
        const cleanName = cleanSearchText(item.display_name);
        matchesSearch = tokenGroups.every((options) =>
          options.some((term) => cleanName.includes(term))
        );
      }

      // 3. Filtro por Loja Vencedora (cheapest_store)
      let matchesStore = true;
      if (selectedStore !== 'Todas as lojas') {
        let storeKey = selectedStore.toLowerCase();
        if (storeKey.includes('muffato')) storeKey = 'muffato';
        else if (storeKey.includes('condor')) storeKey = 'condor';
        else if (storeKey.includes('angeloni')) storeKey = 'angeloni';
        else if (storeKey.includes('atacad')) storeKey = 'atacad';
        else if (storeKey.includes('amigão') || storeKey.includes('amigao')) storeKey = 'amig';
        else if (storeKey.includes('carrefour')) storeKey = 'carrefour';
        else if (storeKey.includes('santarem') || storeKey.includes('santarém')) storeKey = 'santar';
        else if (storeKey.includes('viscardi')) storeKey = 'viscardi';
        else if (storeKey.includes('almeida')) storeKey = 'almeida';

        matchesStore = (item.cheapest_store || '').toLowerCase().includes(storeKey);
      }

      return matchesCategory && matchesSearch && matchesStore;
    });
  }, [matches, selectedCategory, search, selectedStore]);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const getStoreBadgeColor = (storeName: string) => {
    const name = storeName.toLowerCase();
    if (name.includes('condor')) return 'text-sky-400 bg-sky-500/15 border-sky-500/30';
    if (name.includes('muffato')) return 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30';
    if (name.includes('angeloni')) return 'text-amber-400 bg-amber-500/15 border-amber-500/30';
    if (name.includes('atacad')) return 'text-orange-400 bg-orange-500/15 border-orange-500/30';
    if (name.includes('santarem') || name.includes('santarém')) return 'text-pink-400 bg-pink-500/15 border-pink-500/30';
    if (name.includes('almeida')) return 'text-purple-400 bg-purple-500/15 border-purple-500/30';
    if (name.includes('viscardi')) return 'text-rose-400 bg-rose-500/15 border-rose-500/30';
    return 'text-slate-400 bg-slate-800 border-white/5';
  };

  return (
    <div className="space-y-4">
      {/* Barra de Busca e Dropdown Customizado de Departamentos */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-3.5 text-[#64748B]" />
          <input
            type="text"
            placeholder="Buscar produto, ex: café, arroz, leite, azeite..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#131927] border border-white/5 rounded-xl pl-9 pr-4 py-2.5 text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Dropdown Customizado (Substitui o select nativo quadrado) */}
        <div ref={deptDropdownRef} className="relative w-full sm:w-64">
          <button
            type="button"
            onClick={() => setIsDeptOpen(!isDeptOpen)}
            className="w-full bg-[#131927] border border-white/5 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-slate-200 flex items-center justify-between hover:border-white/10 transition"
          >
            <div className="flex items-center gap-2 truncate pr-2">
              <Filter size={13} className="text-emerald-400 shrink-0" />
              <span className="truncate">{selectedCategory}</span>
            </div>
            <ChevronDown
              size={14}
              className={`text-slate-400 shrink-0 transition-transform duration-200 ${
                isDeptOpen ? 'rotate-180 text-emerald-400' : ''
              }`}
            />
          </button>

          {isDeptOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-full bg-[#131927] border border-white/10 rounded-2xl shadow-2xl p-1.5 z-40 animate-fade-in custom-scrollbar max-h-64 overflow-y-auto">
              <div className="space-y-1">
                {MACRO_CATEGORIES.map((dept) => {
                  const isSelected = selectedCategory === dept;
                  return (
                    <button
                      key={dept}
                      type="button"
                      onClick={() => {
                        setSelectedCategory(dept);
                        setIsDeptOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition ${
                        isSelected
                          ? 'bg-emerald-500 text-slate-950 font-bold'
                          : 'text-slate-300 hover:bg-[#0B0F19] hover:text-white'
                      }`}
                    >
                      {dept}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Barra de Seleção de Supermercados */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {STORES_LIST.map((store) => (
          <button
            key={store}
            onClick={() => setSelectedStore(store)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition border ${
              selectedStore === store
                ? 'bg-emerald-500 text-slate-950 border-emerald-500 font-bold'
                : 'bg-[#131927] border-white/5 text-slate-400 hover:text-white'
            }`}
          >
            {store}
          </button>
        ))}
      </div>

      {/* Lista de Resultados */}
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
          <Loader2 size={16} className="animate-spin text-emerald-400" />
          A carregar comparativo de preços...
        </div>
      ) : filteredMatches.length === 0 ? (
        <div className="py-16 text-center text-xs text-slate-500">
          Nenhum produto comparativo encontrado para os filtros selecionados.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredMatches.map((item) => {
            const isExpanded = expandedId === item.id;
            const inBasket = items.some((b) => b.id === item.id);

            const bestByStoreMap = new Map<string, MatchItem>();
            (item.product_match_items || []).forEach((deal) => {
              const existing = bestByStoreMap.get(deal.store_name);
              if (!existing || Number(deal.price) < Number(existing.price)) {
                bestByStoreMap.set(deal.store_name, deal);
              }
            });

            const sortedDeals = Array.from(bestByStoreMap.values()).sort(
              (a, b) => Number(a.price) - Number(b.price)
            );

            return (
              <div
                key={item.id}
                className="bg-[#131927] border border-white/5 rounded-2xl p-4 flex flex-col justify-between transition hover:border-white/10"
              >
                <div>
                  <div className="flex gap-3">
                    <div className="w-20 h-20 rounded-xl bg-[#0B0F19] border border-white/5 overflow-hidden shrink-0">
                      <ProductImageWithFallback
                        uri={item.image_url}
                        category={item.category}
                        name={item.display_name}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getStoreBadgeColor(
                            item.cheapest_store
                          )}`}
                        >
                          {item.cheapest_store}
                        </span>

                        {item.spread > 0 && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 text-rose-400">
                            -R$ {Number(item.spread).toFixed(2).replace('.', ',')}
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs font-bold text-slate-100 line-clamp-2 leading-tight">
                        {item.display_name}
                      </h4>

                      <div className="mt-2 flex items-baseline justify-between">
                        <div>
                          <span className="text-[9px] text-slate-500 block">Melhor opção</span>
                          <span className="text-lg font-black text-emerald-400">
                            R$ {Number(item.min_price).toFixed(2).replace('.', ',')}
                          </span>
                        </div>

                        <button
                          onClick={() => {
                            if (inBasket) {
                              removeItem(item.id);
                            } else {
                              addItem({
                                id: item.id,
                                descricao: item.display_name,
                                valor: item.min_price,
                                estabelecimento: {
                                  nome: item.cheapest_store,
                                  endereco: '',
                                },
                              });
                            }
                          }}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                            inBasket
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-[#0B0F19] border border-white/5 text-slate-300 hover:text-white'
                          }`}
                        >
                          {inBasket ? <Check size={12} /> : <Plus size={12} />}
                          {inBasket ? 'Na cesta' : 'Cesta'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleExpand(item.id)}
                    className="w-full mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400 hover:text-slate-200 transition"
                  >
                    <span>
                      {isExpanded ? 'Ocultar comparativo' : `Comparar em ${sortedDeals.length} mercados`}
                    </span>
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>

                {isExpanded && (
                  <div className="mt-2.5 pt-2.5 border-t border-white/5 space-y-1.5 bg-[#0B0F19] -mx-4 -mb-4 p-3 rounded-b-2xl">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                      Preço nos Supermercados:
                    </span>
                    {sortedDeals.map((storeDeal, idx) => {
                      const isWinner = idx === 0;
                      return (
                        <div
                          key={storeDeal.id || idx}
                          className={`flex items-center justify-between p-1.5 rounded-lg text-xs ${
                            isWinner ? 'bg-emerald-500/10 text-emerald-400 font-bold' : 'text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate pr-2">
                            {isWinner ? <Award size={12} /> : <Store size={12} className="text-slate-600" />}
                            <span className="truncate">{storeDeal.store_name}</span>
                          </div>
                          <span className="shrink-0 font-semibold">
                            R$ {Number(storeDeal.price).toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};