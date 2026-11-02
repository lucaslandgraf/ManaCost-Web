import React, { useState } from 'react';
import { X, HardDriveDownload } from 'lucide-react';

interface SettingsModalProps {
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const [proportional, setProportional] = useState(true);
  const [needs, setNeeds] = useState('50');
  const [wants, setWants] = useState('20');
  const [savings, setSavings] = useState('30');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#131927] border border-[#1E293B] rounded-2xl p-6 shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 border-b border-[#1E293B]">
          <h2 className="text-lg font-bold text-[#F8FAFC]">Ajustes & Conta</h2>
          <button onClick={onClose} className="p-1 text-[#94A3B8] hover:text-[#F8FAFC]">
            <X size={20} />
          </button>
        </div>

        <div className="my-5 space-y-4">
          <h3 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
            Metas do Orçamento
          </h3>
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#0B0F19] border border-[#1E293B]">
            <span className="text-xs text-[#F8FAFC]">Metas calculadas proporcionalmente à sua renda (50/30/20)</span>
            <button
              onClick={() => setProportional(!proportional)}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                proportional ? 'bg-[#10B981]' : 'bg-[#1E293B]'
              }`}
            >
              <div
                className={`bg-[#0B0F19] w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  proportional ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] text-[#94A3B8] block mb-1">Necessidades (%)</label>
              <input
                type="number"
                value={needs}
                onChange={(e) => setNeeds(e.target.value)}
                className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-xl px-3 py-2 text-sm text-[#F8FAFC] focus:outline-none focus:border-[#10B981]"
              />
            </div>
            <div>
              <label className="text-[11px] text-[#94A3B8] block mb-1">Desejos & Lazer (%)</label>
              <input
                type="number"
                value={wants}
                onChange={(e) => setWants(e.target.value)}
                className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-xl px-3 py-2 text-sm text-[#F8FAFC] focus:outline-none focus:border-[#10B981]"
              />
            </div>
            <div>
              <label className="text-[11px] text-[#94A3B8] block mb-1">Reserva & Inv. (%)</label>
              <input
                type="number"
                value={savings}
                onChange={(e) => setSavings(e.target.value)}
                className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-xl px-3 py-2 text-sm text-[#F8FAFC] focus:outline-none focus:border-[#10B981]"
              />
            </div>
          </div>

          <button className="w-full py-2.5 rounded-xl text-xs font-bold bg-[#10B981] text-[#0B0F19] hover:bg-[#34D399] transition-all">
            Salvar Metas Orçamentárias
          </button>
        </div>

        <div className="pt-4 border-t border-[#1E293B] space-y-3">
          <h3 className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
            Backup Integral
          </h3>
          <p className="text-xs text-[#64748B]">
            Baixa todos os seus lançamentos, boletos, viagens e metas num ficheiro para guardar com segurança.
          </p>
          <button className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-semibold bg-[#1E293B] text-[#F8FAFC] hover:bg-[#334155] border border-[#334155]">
            <HardDriveDownload size={14} />
            Gerar Backup Completo
          </button>
        </div>
      </div>
    </div>
  );
};