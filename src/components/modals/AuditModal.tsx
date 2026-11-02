import React from 'react';
import { X, Download } from 'lucide-react';

interface AuditModalProps {
  onClose: () => void;
}

export const AuditModal: React.FC<AuditModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#131927] border border-[#1E293B] rounded-2xl p-6 shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 border-b border-[#1E293B]">
          <h2 className="text-lg font-bold text-[#F8FAFC]">Relatórios & Auditoria</h2>
          <button onClick={onClose} className="p-1 text-[#94A3B8] hover:text-[#F8FAFC]">
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 my-5">
          <div className="bg-[#0B0F19] p-3 rounded-xl border border-[#1E293B]">
            <span className="text-[11px] text-[#94A3B8] font-medium block">Entradas</span>
            <span className="text-sm font-bold text-[#10B981]">+R$ 777,00</span>
          </div>
          <div className="bg-[#0B0F19] p-3 rounded-xl border border-[#1E293B]">
            <span className="text-[11px] text-[#94A3B8] font-medium block">Saídas</span>
            <span className="text-sm font-bold text-[#F43F5E]">-R$ 263,97</span>
          </div>
          <div className="bg-[#0B0F19] p-3 rounded-xl border border-[#1E293B]">
            <span className="text-[11px] text-[#94A3B8] font-medium block">Saldo</span>
            <span className="text-sm font-bold text-[#F8FAFC]">R$ 513,03</span>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
            Regra 50/30/20 em Nov 2026
          </h3>
          <div className="bg-[#0B0F19] p-3 rounded-xl border border-[#1E293B] space-y-2 text-xs">
            <div className="flex justify-between text-[#F8FAFC]">
              <span>Necessidades (50%)</span>
              <span className="font-semibold">R$ 203,15 de R$ 388,50</span>
            </div>
            <div className="flex justify-between text-[#F8FAFC]">
              <span>Desejos & Lazer (20%)</span>
              <span className="font-semibold">R$ 60,82 de R$ 155,40</span>
            </div>
            <div className="flex justify-between text-[#F8FAFC]">
              <span>Reserva & Investimentos (30%)</span>
              <span className="font-semibold">R$ 127,00 de R$ 233,10</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-[#1E293B]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#1E293B] text-[#94A3B8] hover:text-[#F8FAFC]"
          >
            Fechar
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#10B981] text-[#0B0F19] hover:bg-[#34D399]">
            <Download size={14} />
            Exportar movimentos (CSV)
          </button>
        </div>
      </div>
    </div>
  );
};