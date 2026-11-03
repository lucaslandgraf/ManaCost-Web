import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Clock,
  Search,
  ArrowUpDown,
  Plus,
  Check,
  Loader2,
  Navigation,
  Car,
  DollarSign,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';
import { searchSefazProducts } from '../../services/sefazService';
import type { SefazProduct } from '../../types/database';
import { useBasket } from '../../context/BasketContext';

const PRESETS = ['Gasolina Comum', 'Etanol', 'Arroz 5kg', 'Leite Integral', 'Café 500g', 'Ovos'];
const RADIUS = [5, 10, 15, 20];

export const SefazTab: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('Gasolina Comum');
  const [radius, setRadius] = useState(10);
  const [sortBy, setSortBy] = useState<'preco' | 'distancia'>('preco');
  const [results, setResults] = useState<SefazProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const { items, addItem, removeItem } = useBasket();

  // Busca inicial (reseta lista e offset)
  const handleSearch = async (termToSearch?: string) => {
    const term = (termToSearch || searchTerm).trim();
    if (!term) return;

    setLoading(true);
    setErrorMsg('');
    setHasMore(true);
    try {
      const data = await searchSefazProducts(term, radius, undefined, undefined, 0);
      setResults(data);
      if (data.length === 0 || data.length < 10) {
        setHasMore(false);
      }
    } catch {
      setErrorMsg('Não foi possível carregar notas fiscais em tempo real da SEFAZ-PR.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Carregar mais produtos (paginação)
  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    try {
      const nextOffset = results.length;
      const nextData = await searchSefazProducts(searchTerm, radius, undefined, undefined, nextOffset);

      if (nextData.length === 0) {
        setHasMore(false);
      } else {
        // Evita itens duplicados
        setResults((prev) => {
          const existingIds = new Set(prev.map((i) => i.id));
          const newItems = nextData.filter((i) => !existingIds.has(i.id));
          return [...prev, ...newItems];
        });
      }
    } catch (err) {
      console.error('Erro ao carregar mais itens:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    handleSearch();
  }, [radius]);

  const sortedResults = [...results].sort((a, b) => {
    if (sortBy === 'distancia') {
      const distA = parseFloat(a.distanciaKm || '9999');
      const distB = parseFloat(b.distanciaKm || '9999');
      return distA - distB;
    }
    return a.valor - b.valor;
  });

  const openInGoogleMaps = (item: SefazProduct) => {
    const est = item.estabelecimento;
    let queryAddress = '';

    if (est.endereco && est.endereco.trim().length > 3) {
      queryAddress = `${est.endereco}${est.bairro ? `, ${est.bairro}` : ''}, ${est.municipio || 'Londrina'} - PR`;
    } else {
      queryAddress = `${est.nome}, ${est.municipio || 'Londrina'} - PR`;
    }

    const query = encodeURIComponent(queryAddress.trim());
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  };

  return (
    <div className="space-y-5">
      {/* Barra de Pesquisa */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-3 text-[#64748B]" />
          <input
            type="text"
            placeholder="Ex: Gasolina, Arroz 5kg, Café..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full bg-[#131927] border border-white/5 rounded-xl pl-9 pr-4 py-2.5 text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-emerald-500"
          />
        </div>

        <button
          onClick={() => handleSearch()}
          disabled={loading}
          className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition flex items-center gap-1.5"
        >
          {loading && <Loader2 size={13} className="animate-spin" />}
          Buscar
        </button>
      </div>

      {/* Atalhos Rápidos */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => {
              setSearchTerm(p);
              handleSearch(p);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              searchTerm === p
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'bg-[#131927] border border-white/5 text-slate-400 hover:text-white'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Controles de Raio e Ordenação */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#131927] border border-white/5 rounded-2xl">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 font-semibold">Raio:</span>
          {RADIUS.map((r) => (
            <button
              key={r}
              onClick={() => setRadius(r)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                radius === r
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/40'
                  : 'bg-[#0B0F19] text-slate-400 border border-white/5 hover:text-white'
              }`}
            >
              {r} km
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400 font-semibold flex items-center gap-1">
            <ArrowUpDown size={11} /> Ordenar:
          </span>
          <button
            onClick={() => setSortBy('preco')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
              sortBy === 'preco'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <DollarSign size={11} />
            Menor preço
          </button>
          <button
            onClick={() => setSortBy('distancia')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
              sortBy === 'distancia'
                ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Car size={11} />
            Mais próximos
          </button>
        </div>
      </div>

      {/* Resultados */}
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
          <Loader2 size={16} className="animate-spin text-emerald-400" />
          A consultar notas fiscais recentes na SEFAZ-PR...
        </div>
      ) : errorMsg ? (
        <div className="py-8 text-center text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex items-center justify-center gap-2">
          <AlertCircle size={15} />
          {errorMsg}
        </div>
      ) : sortedResults.length === 0 ? (
        <div className="py-16 text-center text-xs text-slate-500">
          Nenhuma nota fiscal registrada com este termo no raio de {radius} km.
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {sortedResults.map((item, idx) => {
              const inBasket = items.some((i) => i.id === item.id);
              const isCheapest = idx === 0 && sortBy === 'preco';

              return (
                <div
                  key={item.id}
                  className={`bg-[#131927] border rounded-2xl p-4 flex flex-col justify-between transition ${
                    isCheapest ? 'border-emerald-500/60 shadow-lg shadow-emerald-500/5' : 'border-white/5'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <h4 className="text-xs font-bold text-slate-100 truncate">
                        {item.estabelecimento.nome}
                      </h4>
                      {isCheapest && (
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 uppercase tracking-wider shrink-0">
                          Melhor preço
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-1 mb-2 font-medium">
                      {item.descricao}
                    </p>

                    {item.estabelecimento.endereco && (
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mb-2 truncate">
                        <MapPin size={11} className="shrink-0 text-slate-600" />
                        <span className="truncate">{item.estabelecimento.endereco}</span>
                      </div>
                    )}

                    <div className="flex items-baseline justify-between pt-1">
                      <span className="text-2xl font-black text-emerald-400">
                        R$ {item.valor.toFixed(2).replace('.', ',')}
                      </span>
                      {item.distanciaKm && (
                        <span className="text-xs font-bold text-sky-400 flex items-center gap-1">
                          <Car size={11} />
                          {item.distanciaKm.includes('km') ? item.distanciaKm : `${item.distanciaKm} km`}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 mt-3 border-t border-white/5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 text-[10px] text-slate-500">
                      <Clock size={11} />
                      <span>Emitido {item.tempoRelativo}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openInGoogleMaps(item)}
                        title="Abrir endereço no Google Maps"
                        className="p-1.5 rounded-lg bg-[#0B0F19] border border-white/5 text-slate-400 hover:text-white transition"
                      >
                        <Navigation size={12} />
                      </button>

                      <button
                        onClick={() => {
                          if (inBasket) {
                            removeItem(item.id);
                          } else {
                            addItem({
                              id: item.id,
                              descricao: item.descricao,
                              valor: item.valor,
                              estabelecimento: {
                                nome: item.estabelecimento.nome,
                                endereco: item.estabelecimento.endereco,
                              },
                            });
                          }
                        }}
                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
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

          {/* Botão de Carregar Mais */}
          {hasMore && (
            <div className="flex justify-center pt-2 pb-6">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#131927] hover:bg-[#1E293B] border border-white/10 hover:border-emerald-500/40 text-xs font-bold text-slate-200 hover:text-emerald-400 rounded-xl transition shadow-lg disabled:opacity-50"
              >
                {loadingMore ? (
                  <>
                    <Loader2 size={14} className="animate-spin text-emerald-400" />
                    A carregar mais ofertas...
                  </>
                ) : (
                  <>
                    <ChevronDown size={14} />
                    Carregar mais produtos
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};