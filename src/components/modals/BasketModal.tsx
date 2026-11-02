// src/components/modals/BasketModal.tsx
import React, { useMemo } from 'react';
import { X, MapPin, Trash2, Plus, Minus, Share2 } from 'lucide-react';
import { useBasket } from '../../context/BasketContext';

interface BasketModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BasketModal: React.FC<BasketModalProps> = ({ isOpen, onClose }) => {
  const { items, removeItem, updateQuantity, clearBasket, totalPrice } = useBasket();

  // 1. Agrupamento e cálculo por supermercado
  const storeSplits = useMemo(() => {
    if (items.length === 0) return [];

    const map: Record<string, { total: number; count: number }> = {};

    items.forEach((item: any) => {
      const store =
        item.estabelecimento?.nome ||
        item.cheapest_store ||
        item.store_name ||
        'Supermercado';
      const price = Number(item.valor ?? item.min_price) || 0;
      const qty = Number(item.quantidade) || 1;

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

  // 2. Exportação de texto formatado para WhatsApp ou Clipboard
  const handleShareList = async () => {
    if (items.length === 0) return;

    const itemsByStore: Record<string, any[]> = {};
    items.forEach((item: any) => {
      const store =
        item.estabelecimento?.nome ||
        item.cheapest_store ||
        item.store_name ||
        'Geral';
      if (!itemsByStore[store]) itemsByStore[store] = [];
      itemsByStore[store].push(item);
    });

    let message = '🛒 *Lista de Compras • ManaCost*\n\n';

    Object.entries(itemsByStore).forEach(([store, storeItems]) => {
      const storeTotal = storeItems.reduce((acc, it) => {
        const p = Number(it.valor ?? it.min_price) || 0;
        const q = Number(it.quantidade) || 1;
        return acc + p * q;
      }, 0);

      message += `📍 *${store.toUpperCase()}* (Total: R$ ${storeTotal.toFixed(2).replace('.', ',')})\n`;

      storeItems.forEach((it) => {
        const p = Number(it.valor ?? it.min_price) || 0;
        const q = Number(it.quantidade) || 1;
        const name = it.descricao || it.display_name || 'Item';
        message += `  • ${q}x ${name} - R$ ${(p * q).toFixed(2).replace('.', ',')}\n`;
      });
      message += '\n';
    });

    message += `💰 *TOTAL GERAL: R$ ${totalPrice.toFixed(2).replace('.', ',')}*`;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Lista de Compras', text: message });
      } catch (_) {
        // Fallback para clipboard
        await navigator.clipboard.writeText(message);
        alert('Lista copiada para a área de transferência!');
      }
    } else {
      await navigator.clipboard.writeText(message);
      alert('Lista copiada para a área de transferência!');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#131927] border border-[#1E293B] rounded-2xl p-6 shadow-2xl relative flex flex-col max-h-[85vh]">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between pb-4 border-b border-[#1E293B]">
          <div>
            <h2 className="text-lg font-bold text-[#F8FAFC]">Cesta de Compras</h2>
            <p className="text-xs text-[#64748B]">Divisão prática e roteiro por supermercado</p>
          </div>
          <button onClick={onClose} className="p-1 text-[#94A3B8] hover:text-[#F8FAFC]">
            <X size={18} />
          </button>
        </div>

        {/* Resumo por Loja (Chips horizontais) */}
        {storeSplits.length > 0 && (
          <div className="py-3 border-b border-[#1E293B] space-y-2">
            <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider block">
              Divisão de Compras por Loja
            </span>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {storeSplits.map((split) => (
                <div
                  key={split.store_name}
                  className="bg-[#0B0F19] border border-[#1E293B] rounded-xl px-3 py-2 shrink-0"
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#F8FAFC]">
                    <MapPin size={12} className="text-[#10B981]" />
                    {split.store_name}
                  </div>
                  <div className="text-[11px] text-[#94A3B8] mt-0.5">
                    {split.items_count} {split.items_count === 1 ? 'item' : 'itens'} •{' '}
                    <span className="font-bold text-[#34D399]">
                      R$ {split.total_price.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lista de Itens com scroll próprio */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#94A3B8] font-semibold">
              Itens selecionados ({items.length})
            </span>
            {items.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('Deseja limpar todos os itens da cesta?')) clearBasket();
                }}
                className="text-xs text-[#F43F5E] hover:underline"
              >
                Limpar Tudo
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#64748B]">
              A sua cesta está vazia no momento.
            </div>
          ) : (
            items.map((item: any) => {
              const price = Number(item.valor ?? item.min_price) || 0;
              const store =
                item.estabelecimento?.nome ||
                item.cheapest_store ||
                item.store_name ||
                'Supermercado';
              const name = item.descricao || item.display_name || 'Produto';
              const qty = Number(item.quantidade) || 1;

              return (
                <div
                  key={item.id}
                  className="bg-[#0B0F19] border border-[#1E293B] rounded-xl p-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-[#F8FAFC] truncate">{name}</h4>
                    <p className="text-[11px] text-[#64748B]">
                      R$ {price.toFixed(2).replace('.', ',')} un • {store}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-[#131927] border border-[#1E293B] rounded-lg">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="p-1 hover:text-[#10B981] text-[#94A3B8]"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="px-2 text-xs font-bold text-[#F8FAFC]">{qty}</span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="p-1 hover:text-[#10B981] text-[#94A3B8]"
                      >
                        <Plus size={13} />
                      </button>
                    </div>

                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-1.5 rounded-lg bg-[#F43F5E]/10 text-[#F43F5E] hover:bg-[#F43F5E]/20"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Rodapé com Total e Botão de Ação */}
        {items.length > 0 && (
          <div className="pt-4 border-t border-[#1E293B] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-[#94A3B8] block">Total Geral</span>
                <span className="text-[11px] text-[#64748B]">
                  {storeSplits.length} {storeSplits.length === 1 ? 'loja' : 'lojas diferentes'}
                </span>
              </div>
              <span className="text-xl font-extrabold text-[#34D399]">
                R$ {totalPrice.toFixed(2).replace('.', ',')}
              </span>
            </div>

            <button
              onClick={handleShareList}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold bg-[#10B981] text-[#0B0F19] hover:bg-[#34D399] transition-all"
            >
              <Share2 size={14} /> Exportar Lista / WhatsApp
            </button>
          </div>
        )}
      </div>
    </div>
  );
};