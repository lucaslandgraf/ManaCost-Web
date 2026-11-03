import React, { useMemo } from 'react';
import {
  X,
  Trash2,
  ShoppingCart,
  Store,
  FileSpreadsheet,
  FileText,
  Share2,
} from 'lucide-react';
import { useBasket } from '../../context/BasketContext';

interface BasketDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BasketDrawer: React.FC<BasketDrawerProps> = ({ isOpen, onClose }) => {
  const { items, removeItem, clearBasket } = useBasket();

  // Agrupamento por estabelecimento e cálculo de totais
  const storeBreakdown = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();

    items.forEach((item) => {
      const store = item.estabelecimento?.nome || 'Supermercado';
      const current = map.get(store) || { total: 0, count: 0 };
      const qtd = (item as any).quantidade || 1;
      map.set(store, {
        total: current.total + Number(item.valor || 0) * qtd,
        count: current.count + qtd,
      });
    });

    return Array.from(map.entries())
      .map(([store, data]) => ({ store, ...data }))
      .sort((a, b) => b.total - a.total);
  }, [items]);

  const totalOverall = useMemo(() => {
    return items.reduce((acc, item) => {
      const qtd = (item as any).quantidade || 1;
      return acc + Number(item.valor || 0) * qtd;
    }, 0);
  }, [items]);

  // Exportação nativa para CSV (com suporte a UTF-8 BOM para o Excel)
  const handleExportCSV = () => {
    if (items.length === 0) return;

    const headers = ['Produto', 'Supermercado', 'Quantidade', 'Preço Unitário (R$)', 'Subtotal (R$)'];
    const rows = items.map((item) => {
      const qtd = (item as any).quantidade || 1;
      const unit = Number(item.valor || 0);
      const subtotal = qtd * unit;
      const store = item.estabelecimento?.nome || 'Supermercado';

      const safeName = `"${item.descricao.replace(/"/g, '""')}"`;
      const safeStore = `"${store.replace(/"/g, '""')}"`;

      return [
        safeName,
        safeStore,
        qtd,
        unit.toFixed(2).replace('.', ','),
        subtotal.toFixed(2).replace('.', ','),
      ].join(';');
    });

    rows.push('');
    rows.push(`"TOTAL GERAL";"";"";"";"${totalOverall.toFixed(2).replace('.', ',')}"`);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cesta_compras_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Exportação para planilha do Excel (.xls) com formatação HTML nativa
  const handleExportExcel = () => {
    if (items.length === 0) return;

    const dateStr = new Date().toLocaleDateString('pt-BR');
    const rowsHtml = items
      .map((item) => {
        const qtd = (item as any).quantidade || 1;
        const unit = Number(item.valor || 0);
        const subtotal = qtd * unit;
        const store = item.estabelecimento?.nome || 'Supermercado';

        return `
          <tr>
            <td style="border: 1px solid #ddd; padding: 8px;">${item.descricao}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${store}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${qtd}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">R$ ${unit.toFixed(2).replace('.', ',')}</td>
            <td style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: bold;">R$ ${subtotal.toFixed(2).replace('.', ',')}</td>
          </tr>
        `;
      })
      .join('');

    const tableHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta http-equiv="content-type" content="text/plain; charset=UTF-8"/>
        </head>
        <body>
          <h2>ManaCost - Cesta de Compras (${dateStr})</h2>
          <table style="border-collapse: collapse; width: 100%;">
            <thead>
              <tr style="background-color: #10B981; color: white;">
                <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Produto</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Supermercado</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: center;">Quantidade</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: right;">Preço Unitário</th>
                <th style="border: 1px solid #ddd; padding: 10px; text-align: right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
              <tr style="background-color: #f2f2f2; font-weight: bold;">
                <td colspan="4" style="border: 1px solid #ddd; padding: 10px; text-align: right;">TOTAL:</td>
                <td style="border: 1px solid #ddd; padding: 10px; text-align: right; color: #059669;">R$ ${totalOverall.toFixed(2).replace('.', ',')}</td>
              </tr>
            </tbody>
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cesta_compras_${new Date().toISOString().slice(0, 10)}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Partilha formatada para WhatsApp
  const handleExportWhatsApp = () => {
    if (items.length === 0) return;

    let text = `🛒 *Lista de Compras - ManaCost*\n\n`;

    storeBreakdown.forEach((b) => {
      text += `🏪 *${b.store}*\n`;
      const storeItems = items.filter(
        (i) => (i.estabelecimento?.nome || 'Supermercado') === b.store
      );
      storeItems.forEach((i) => {
        const qtd = (i as any).quantidade || 1;
        text += `• ${qtd}x ${i.descricao} - R$ ${Number(i.valor).toFixed(2).replace('.', ',')}\n`;
      });
      text += `_Subtotal: R$ ${b.total.toFixed(2).replace('.', ',')}_\n\n`;
    });

    text += `💰 *Total Previsto: R$ ${totalOverall.toFixed(2).replace('.', ',')}*`;

    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Painel Lateral */}
      <div className="relative w-full max-w-md bg-[#0B0F19] border-l border-white/10 h-full flex flex-col z-10 shadow-2xl animate-fade-in">
        {/* Topo */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#131927]">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShoppingCart size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Cesta de Compras</h3>
              <p className="text-[11px] text-slate-400">
                {items.length} {items.length === 1 ? 'item selecionado' : 'itens selecionados'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Divisão por Supermercado */}
        {items.length > 0 && (
          <div className="p-3 bg-[#131927]/60 border-b border-white/5 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-1">
              Divisão por Supermercado
            </span>
            <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
              {storeBreakdown.map((b) => (
                <div
                  key={b.store}
                  className="bg-[#0B0F19] border border-white/5 rounded-xl p-2.5 shrink-0 min-w-[130px]"
                >
                  <div className="flex items-center gap-1.5 text-slate-300 text-[11px] font-semibold truncate mb-1">
                    <Store size={12} className="text-emerald-400 shrink-0" />
                    <span className="truncate">{b.store}</span>
                  </div>
                  <div className="text-xs font-black text-emerald-400">
                    R$ {b.total.toFixed(2).replace('.', ',')}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {b.count} {b.count === 1 ? 'unidade' : 'unidades'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lista de Itens com scrollbar dark */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <ShoppingCart size={40} className="mb-3 opacity-20" />
              <p className="text-sm font-semibold text-slate-300">A sua cesta está vazia</p>
              <p className="text-xs mt-1 max-w-[220px]">
                Adicione produtos no Comparativo ou nas Ofertas para calcular o seu roteiro de compras.
              </p>
            </div>
          ) : (
            items.map((item) => {
              const qtd = (item as any).quantidade || 1;
              const subtotal = Number(item.valor || 0) * qtd;

              return (
                <div
                  key={item.id}
                  className="bg-[#131927] border border-white/5 rounded-xl p-3 flex items-center justify-between gap-3 hover:border-white/10 transition"
                >
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-semibold text-white truncate leading-tight">
                      {item.descricao}
                    </h4>
                    <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                      R$ {Number(item.valor).toFixed(2).replace('.', ',')} un •{' '}
                      {item.estabelecimento?.nome || 'Supermercado'}
                    </div>
                    <div className="text-xs font-black text-emerald-400 mt-1">
                      Subtotal: R$ {subtotal.toFixed(2).replace('.', ',')}
                    </div>
                  </div>

                  <button
                    onClick={() => removeItem(item.id)}
                    title="Remover produto"
                    className="p-2 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition shrink-0"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Rodapé com Total e Botões de Exportação */}
        {items.length > 0 && (
          <div className="p-4 border-t border-white/10 bg-[#131927] space-y-3">
            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-xs text-slate-400 block">Total Previsto</span>
                <span className="text-[11px] text-slate-500">
                  {storeBreakdown.length} {storeBreakdown.length === 1 ? 'local de compra' : 'locais de compra'}
                </span>
              </div>
              <span className="text-2xl font-black text-emerald-400">
                R$ {totalOverall.toFixed(2).replace('.', ',')}
              </span>
            </div>

            {/* Linha de Exportação Excel e CSV */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleExportExcel}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#0B0F19] border border-white/10 text-xs font-semibold text-slate-300 hover:text-emerald-400 hover:border-emerald-500/40 transition"
                title="Descarregar ficheiro Excel"
              >
                <FileSpreadsheet size={14} className="text-emerald-400" />
                Exportar Excel
              </button>

              <button
                onClick={handleExportCSV}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[#0B0F19] border border-white/10 text-xs font-semibold text-slate-300 hover:text-sky-400 hover:border-sky-500/40 transition"
                title="Descarregar ficheiro CSV"
              >
                <FileText size={14} className="text-sky-400" />
                Exportar CSV
              </button>
            </div>

            {/* Limpar e WhatsApp */}
            <div className="flex gap-2">
              <button
                onClick={clearBasket}
                className="px-4 py-2.5 rounded-xl bg-[#0B0F19] border border-white/10 text-slate-400 hover:text-rose-400 text-xs font-bold transition"
              >
                Limpar
              </button>

              <button
                onClick={handleExportWhatsApp}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                <Share2 size={15} />
                Exportar para WhatsApp
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};