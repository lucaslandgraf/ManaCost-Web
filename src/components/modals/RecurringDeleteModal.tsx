import React from 'react';
import { X, CalendarX2, Trash2 } from 'lucide-react';

interface RecurringDeleteModalProps {
  isOpen: boolean;
  description: string;
  onClose: () => void;
  onDeleteCurrentOnly: () => void;
  onDeleteFutureAndCancel: () => void;
}

export const RecurringDeleteModal: React.FC<RecurringDeleteModalProps> = ({
  isOpen,
  description,
  onClose,
  onDeleteCurrentOnly,
  onDeleteFutureAndCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in select-none">
      <div className="w-full max-w-sm bg-[#0B0F19] border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col space-y-4">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <h3 className="text-base font-bold text-slate-100">Item Recorrente</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Mensagem Explicativa */}
        <p className="text-xs text-slate-300 leading-relaxed">
          <strong className="text-white font-bold">"{description}"</strong> repete-se todos os meses. Como deseja excluir?
        </p>

        {/* Botões de Ação */}
        <div className="space-y-2 pt-2">
          {/* Opção 1: Cancelar e apagar futuros */}
          <button
            type="button"
            onClick={onDeleteFutureAndCancel}
            className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 text-xs font-bold transition text-center"
          >
            <Trash2 size={14} className="shrink-0" />
            <span>Cancelar assinatura e apagar dos meses futuros</span>
          </button>

          {/* Opção 2: Apenas deste mês */}
          <button
            type="button"
            onClick={onDeleteCurrentOnly}
            className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-[#131927] border border-white/10 text-slate-200 hover:text-white hover:bg-slate-800 text-xs font-bold transition text-center"
          >
            <CalendarX2 size={14} className="shrink-0 text-emerald-400" />
            <span>Excluir apenas deste mês</span>
          </button>

          {/* Opção 3: Cancelar */}
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 transition"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};