import React, { useMemo } from 'react';
import { X, Trash2, Plus, Minus, MapPin, Share2, ShoppingBag } from 'lucide-react';
import { useBasket } from '../../context/BasketContext';

interface BasketModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BasketModal: React.FC<BasketModalProps> = ({ isOpen, onClose }) => {
  const { items, removeItem, updateQuantity, clearBasket, totalPrice, totalItems } = useBasket();

  const storeSplits = useMemo(() => {
    if (items.length === 0) return [];
    const map: Record<string, { total: number; count: number }> = {};

    items.forEach((item) => {
      const store = item.estabelecimento?.nome || 'Mercado Geral';
      const price = Number(item.valor) || 0;
      const qty = item.quantidade || 1;

      if (!map[store]) {
        map[store] = { total: 0, count: 0 };
      }
      map[store].total += price * qty;
      map[store].count += qty;
    });

    return Object.entries(map).map(([store_name, data]) => ({
      store_name,
      items_count: data.count,
      total_price: data.total,
    }));
  }, [items]);

  const handleShareWhatsApp = () => {
    if (items.length === 0) return;

    const itemsByStore: Record<string, typeof items> = {};
    items.forEach((item) => {
      const store = item.estabelecimento?.nome || 'Mercado Geral';
      if (!itemsByStore[store]) itemsByStore[store] = [];
      itemsByStore[store].push(item);
    });

    let message = '🛒 *Lista de Compras • ManaCost*\n\n';

    Object.entries(itemsByStore).forEach(([store, storeItems]) => {
      const storeTotal = storeItems.reduce((acc, it) => acc + it.valor * it.quantidade, 0);
      message += `📍 *${store.toUpperCase()}* (Total: R$ ${storeTotal.toFixed(2).replace('.', ',')})\n`;
      storeItems.forEach((it) => {
        message += `  • ${it.quantidade}x ${it.descricao} - R$ ${(it.valor * it.quantidade).toFixed(2).replace('.', ',')}\n`;
      });
      message += '\n';
    });

    message += `💰 *TOTAL GERAL: R$ ${totalPrice.toFixed(2).replace('.', ',')}*`;

    const encoded = encodeURIComponent(message);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-[#0B0F19] border-l border-white/10 h-full flex flex-col shadow-2xl">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-5 border-b border-white/5 bg-[#131927]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100">Cesta de Compras</h2>
              <p className="text-xs text-slate-400">
                {totalItems} {totalItems === 1 ? 'item selecionado' : 'itens selecionados'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumo por Loja */}
        {storeSplits.length > 0 && (
          <div className="p-4 border-b border-white/5 bg-[#0e1422]">
            <p className="text-[10px] font-bold text-slate-500 tracking-wider uppercase mb-2">
              Divisão por Supermercado
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {storeSplits.map((store) => (
                <div
                  key={store.store_name}
                  className="bg-[#131927] border border-white/5 rounded-lg p-2.5 min-w-[170px] shrink-0"
                >
                  <div className="flex items-center gap-1.5 text-xs text-slate-200 font-semibold truncate mb-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span className="truncate">{store.store_name}</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {store.items_count} un •{' '}
                    <span className="text-emerald-400 font-bold">
                      R$ {store.total_price.toFixed(2).replace('.', ',')}
                    </span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lista de Produtos */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <ShoppingBag className="w-12 h-12 mb-3 stroke-[1.5] text-slate-600" />
              <p className="text-sm font-semibold text-slate-300">A sua cesta está vazia</p>
              <p className="text-xs mt-1 text-slate-500">
                Adicione itens pesquisados na SEFAZ ou nas ofertas para montar o seu roteiro.
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="bg-[#131927] border border-white/5 rounded-xl p-3 flex items-center justify-between gap-3 hover:border-white/10 transition"
              >
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-semibold text-slate-100 truncate">{item.descricao}</h4>
                  <p className="text-[10px] text-slate-400 truncate mt-0.5">
                    R$ {item.valor.toFixed(2).replace('.', ',')} un • {item.estabelecimento.nome}
                  </p>
                  <p className="text-[11px] font-bold text-emerald-400 mt-1">
                    Subtotal: R$ {(item.valor * item.quantidade).toFixed(2).replace('.', ',')}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 bg-[#0B0F19] border border-white/5 rounded-lg p-1">
                  <button
                    onClick={() => updateQuantity(item.id, -1)}
                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs font-bold text-slate-200 min-w-[18px] text-center">
                    {item.quantidade}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.id, 1)}
                    className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-1 rounded text-rose-400 hover:bg-rose-500/10 ml-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Rodapé / Checkout */}
        {items.length > 0 && (
          <div className="p-4 border-t border-white/5 bg-[#131927] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Total Previsto</p>
                <p className="text-[10px] text-slate-500">{storeSplits.length} locais de compra</p>
              </div>
              <p className="text-xl font-extrabold text-emerald-400">
                R$ {totalPrice.toFixed(2).replace('.', ',')}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={clearBasket}
                className="px-3 py-2.5 rounded-xl border border-rose-500/20 text-rose-400 hover:bg-rose-500/10 text-xs font-semibold transition"
              >
                Limpar
              </button>
              <button
                onClick={handleShareWhatsApp}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition"
              >
                <Share2 className="w-4 h-4" />
                Exportar para WhatsApp
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};