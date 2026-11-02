// src/pages/DealsRadar/SefazTab.tsx
import React, { useState, useEffect } from 'react';
import { MapPin, Clock, Search, ArrowUpDown, Plus, Check, Loader2, Navigation } from 'lucide-react';
import { searchSefazPrices } from '../../services/sefazService';
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
  const [errorMsg, setErrorMsg] = useState('');

  const { items, addItem, removeItem } = useBasket();

  const handleSearch = async (termToSearch?: string) => {
    const term = (termToSearch || searchTerm).trim();
    if (!term) return;

    setLoading(true);
    setErrorMsg('');
    try {
      const data = await searchSefazPrices(term, radius);
      setResults(data);
    } catch {
      setErrorMsg('Não foi possível carregar notas fiscais em tempo real da SEFAZ-PR.');
      setResults([]);
    } finally {
      setLoading(false);
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
    const query = encodeURIComponent(
      `${item.estabelecimento.nome}, ${item.estabelecimento.endereco || ''}, Londrina - PR`
    );
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Barra de Pesquisa */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-3.5 text-[#64748B]" />
          <input
            type="text"
            placeholder="Ex: Gasolina, Arroz 5kg, Café..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="w-full bg-[#131927] border border-[#1E293B] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#10B981]"
          />
        </div>
        <button
          onClick={() => handleSearch()}
          className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#10B981] text-[#0B0F19] hover:bg-[#34D399] transition-all"
        >
          Buscar
        </button>
      </div>

      {/* Atalhos Pré-definidos */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => {
              setSearchTerm(p);
              handleSearch(p);
            }}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              searchTerm === p
                ? 'bg-[#10B981] text-[#0B0F19]'
                : 'bg-[#131927] border border-[#1E293B] text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Controlos de Raio e Ordenação */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#64748B] font-semibold">Raio:</span>
          {RADIUS.map((r) => (
            <button
              key={r}
              onClick={() => setRadius(r)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                radius === r
                  ? 'bg-[#10B981]/15 text-[#10B981] border border-[#10B981]'
                  : 'bg-[#131927] border border-[#1E293B] text-[#94A3B8]'
              }`}
            >
              {r} km
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#64748B] font-semibold flex items-center gap-1">
            <ArrowUpDown size={12} /> Ordenar:
          </span>
          <button
            onClick={() => setSortBy('preco')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              sortBy === 'preco'
                ? 'bg-[#1E293B] text-[#34D399] border border-[#34D399]/40'
                : 'text-[#94A3B8]'
            }`}
          >
            Menor preço
          </button>
          <button
            onClick={() => setSortBy('distancia')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              sortBy === 'distancia'
                ? 'bg-[#1E293B] text-[#38BDF8] border border-[#38BDF8]/40'
                : 'text-[#94A3B8]'
            }`}
          >
            Mais próximos
          </button>
        </div>
      </div>

      {/* Área de Resultados */}
      {loading ? (
        <div className="py-16 text-center text-xs text-[#94A3B8] flex items-center justify-center gap-2">
          <Loader2 size={18} className="animate-spin text-[#10B981]" />
          Consultando notas fiscais recentes na SEFAZ-PR...
        </div>
      ) : errorMsg ? (
        <div className="py-12 text-center text-xs text-[#F43F5E] bg-[#F43F5E]/10 border border-[#F43F5E]/20 rounded-xl p-4">
          {errorMsg}
        </div>
      ) : sortedResults.length === 0 ? (
        <div className="py-16 text-center text-xs text-[#64748B]">
          Nenhuma nota fiscal registada com este termo no raio selecionado.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedResults.map((item, idx) => {
            const inBasket = items.some((i) => i.id === item.id);
            const isFirst = idx === 0 && sortBy === 'preco';

            return (
              <div
                key={item.id}
                className={`bg-[#131927] border rounded-2xl p-5 space-y-3 flex flex-col justify-between ${
                  isFirst ? 'border-[#10B981]/60' : 'border-[#1E293B]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className="text-xs font-bold text-[#F8FAFC] line-clamp-1">
                      {item.estabelecimento.nome}
                    </h4>
                    {isFirst && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#10B981]/15 text-[#10B981]">
                        Melhor preço
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-[#94A3B8] line-clamp-1 mb-2">
                    {item.descricao}
                  </p>

                  {item.estabelecimento.endereco && (
                    <div className="flex items-center gap-1.5 text-[11px] text-[#64748B] mb-2 truncate">
                      <MapPin size={12} className="shrink-0" />
                      <span className="truncate">{item.estabelecimento.endereco}</span>
                    </div>
                  )}

                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-2xl font-extrabold text-[#34D399]">
                      R$ {item.valor.toFixed(2).replace('.', ',')}
                    </span>
                    {item.distanciaKm && (
                      <span className="text-xs font-semibold text-[#38BDF8]">
                        {item.distanciaKm} km
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#1E293B] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 text-[10px] text-[#64748B]">
                    <Clock size={11} />
                    <span>{item.tempoRelativo}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openInGoogleMaps(item)}
                      title="Abrir no Google Maps"
                      className="p-1.5 rounded-lg bg-[#0B0F19] border border-[#1E293B] text-[#94A3B8] hover:text-[#F8FAFC]"
                    >
                      <Navigation size={13} />
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
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        inBasket
                          ? 'bg-[#10B981]/15 text-[#10B981] border border-[#10B981]'
                          : 'bg-[#1E293B] text-[#94A3B8] hover:text-[#F8FAFC]'
                      }`}
                    >
                      {inBasket ? <Check size={13} /> : <Plus size={13} />}
                      {inBasket ? 'Na cesta' : 'Cesta'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};