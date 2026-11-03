import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Loader2, Plus, Check, Tag, X, ChevronDown, Database, Clock } from 'lucide-react';
import {
  fetchFlyerDeals,
  fetchAvailableCategories,
  fetchLastUpdateDate,
  CATALOG_PAGE_SIZE,
} from '../../services/dealsService';
import type { FlyerDeal } from '../../types/database';
import { useBasket } from '../../context/BasketContext';
import { ProductImageWithFallback } from '../../components/ui/ProductImageWithFallback';
import { cleanSearchText } from '../../utils/searchEngine';

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

function formatUpdateLabel(dateString: string | null): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const timeStr = date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return isToday
    ? `Hoje às ${timeStr}`
    : `${date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} às ${timeStr}`;
}

export const FlyerDealsTab: React.FC = () => {
  const [deals, setDeals] = useState<FlyerDeal[]>([]);
  const [totalInDb, setTotalInDb] = useState<number>(0);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [search, setSearch] = useState('');
  const [selectedStore, setSelectedStore] = useState<string>('Todas as lojas');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas as Categorias');

  const [categorySearch, setCategorySearch] = useState('');
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const { items, addItem, removeItem } = useBasket();

  useEffect(() => {
    (async () => {
      const [cats, updateDate] = await Promise.all([
        fetchAvailableCategories(),
        fetchLastUpdateDate(),
      ]);
      setCategories(cats);
      if (updateDate) {
        setLastUpdated(formatUpdateLabel(updateDate));
      }
    })();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsCategoryOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadData = async (
    searchTerm: string,
    store: string,
    category: string,
    reset = true
  ) => {
    if (reset) {
      setLoading(true);
      setHasMore(true);
    } else {
      setLoadingMore(true);
    }

    try {
      const offset = reset ? 0 : deals.length;
      const { deals: newDeals, totalCount } = await fetchFlyerDeals(offset, searchTerm, category, store);

      if (reset) {
        setDeals(newDeals);
        setTotalInDb(totalCount);
      } else {
        setDeals((prev) => [...prev, ...newDeals]);
      }

      setHasMore(newDeals.length === CATALOG_PAGE_SIZE && (offset + newDeals.length) < totalCount);
    } catch (err) {
      console.error('Erro ao carregar ofertas:', err);
      if (reset) setDeals([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      loadData(search, selectedStore, selectedCategory, true);
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, selectedStore, selectedCategory]);

  const handleLoadMore = () => {
    if (!loading && !loadingMore && hasMore) {
      loadData(search, selectedStore, selectedCategory, false);
    }
  };

  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return categories;
    const clean = cleanSearchText(categorySearch);
    return categories.filter((c) => cleanSearchText(c).includes(clean));
  }, [categories, categorySearch]);

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
      {/* Barra de Pesquisa e Filtro de Categoria */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-3.5 text-[#64748B]" />
          <input
            type="text"
            placeholder="Buscar por nome em todas as ofertas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#131927] border border-white/5 rounded-xl pl-9 pr-4 py-2.5 text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Seletor Pesquisável de Categoria */}
        <div ref={dropdownRef} className="relative w-full sm:w-64">
          <button
            type="button"
            onClick={() => setIsCategoryOpen(!isCategoryOpen)}
            className="w-full bg-[#131927] border border-white/5 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-200 flex items-center justify-between hover:border-white/10 transition"
          >
            <div className="flex items-center gap-2 truncate pr-2">
              <Tag size={13} className="text-emerald-400 shrink-0" />
              <span className="truncate">{selectedCategory}</span>
            </div>
            <ChevronDown size={14} className="text-slate-400 shrink-0" />
          </button>

          {isCategoryOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-72 bg-[#131927] border border-white/10 rounded-2xl shadow-2xl p-2 z-40 animate-fade-in divide-y divide-white/5">
              <div className="pb-2">
                <input
                  type="text"
                  placeholder="Filtrar categoria..."
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  autoFocus
                  className="w-full bg-[#0B0F19] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="max-h-56 overflow-y-auto pt-1 space-y-0.5 custom-scrollbar pr-1">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('Todas as Categorias');
                    setIsCategoryOpen(false);
                    setCategorySearch('');
                  }}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    selectedCategory === 'Todas as Categorias'
                      ? 'bg-emerald-500 text-slate-950 font-bold'
                      : 'text-slate-300 hover:bg-[#0B0F19]'
                  }`}
                >
                  Todas as Categorias
                </button>

                {filteredCategories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat);
                      setIsCategoryOpen(false);
                      setCategorySearch('');
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold transition truncate ${
                      selectedCategory === cat
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'text-slate-300 hover:bg-[#0B0F19]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}

                {filteredCategories.length === 0 && (
                  <p className="px-3 py-2 text-xs text-slate-500">Nenhuma categoria encontrada.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Lista Horizontal de Supermercados */}
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

      {/* Grade de Produtos */}
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
          <Loader2 size={16} className="animate-spin text-emerald-400" />
          A carregar ofertas do banco de dados...
        </div>
      ) : deals.length === 0 ? (
        <div className="py-16 text-center text-xs text-slate-500">
          Nenhuma oferta encontrada para os filtros selecionados.
        </div>
      ) : (
        <div className="space-y-4">
          {/* Informações de Quantidade e Última Atualização */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold text-slate-400 px-1">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Database size={12} className="text-emerald-400" />
                <span>
                  Exibindo <strong className="text-slate-100">{deals.length}</strong> de{' '}
                  <strong className="text-emerald-400">{totalInDb.toLocaleString('pt-BR')}</strong> ofertas cadastradas
                </span>
              </div>

              {lastUpdated && (
                <div className="flex items-center gap-1 text-slate-500 border-l border-white/10 pl-3">
                  <Clock size={11} className="text-sky-400" />
                  <span>Atualizado: {lastUpdated}</span>
                </div>
              )}
            </div>

            {selectedCategory !== 'Todas as Categorias' && (
              <button
                onClick={() => setSelectedCategory('Todas as Categorias')}
                className="text-emerald-400 hover:underline flex items-center gap-1"
              >
                Limpar categoria ({selectedCategory}) <X size={11} />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {deals.map((item) => {
              const inBasket = items.some((b) => b.id === item.id);

              return (
                <div
                  key={item.id}
                  className="bg-[#131927] border border-white/5 rounded-2xl p-4 flex gap-3 transition hover:border-white/10"
                >
                  <div className="w-20 h-20 rounded-xl bg-[#0B0F19] border border-white/5 overflow-hidden shrink-0">
                    <ProductImageWithFallback
                      uri={item.image_url}
                      category={item.category}
                      name={item.product_name}
                    />
                  </div>

                  <div className="min-w-0 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getStoreBadgeColor(
                            item.store_name
                          )}`}
                        >
                          {item.store_name}
                        </span>
                        {item.category && (
                          <span className="text-[10px] text-slate-500 font-medium truncate">
                            {item.category}
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs font-bold text-slate-100 line-clamp-2 leading-tight">
                        {item.product_name}
                      </h4>
                    </div>

                    <div className="mt-2 flex items-baseline justify-between">
                      <div>
                        <span className="text-[9px] text-slate-500 block">Valor anunciado</span>
                        <span className="text-lg font-black text-emerald-400">
                          R$ {Number(item.deal_price).toFixed(2).replace('.', ',')}
                        </span>
                      </div>

                      <button
                        onClick={() => {
                          if (inBasket) {
                            removeItem(item.id);
                          } else {
                            addItem({
                              id: item.id,
                              descricao: item.product_name,
                              valor: item.deal_price,
                              estabelecimento: {
                                nome: item.store_name,
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
              );
            })}
          </div>

          {/* Botão para carregar mais ofertas */}
          {hasMore && (
            <div className="pt-4 pb-2 flex justify-center">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#131927] border border-white/10 text-xs font-bold text-slate-200 hover:text-white hover:bg-slate-800 transition shadow-lg"
              >
                {loadingMore ? (
                  <Loader2 size={14} className="animate-spin text-emerald-400" />
                ) : (
                  <ChevronDown size={14} className="text-emerald-400" />
                )}
                {loadingMore
                  ? 'Carregando mais produtos...'
                  : `Carregar mais ofertas (${deals.length} de ${totalInDb.toLocaleString('pt-BR')})`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};