// src/pages/Bills.tsx
import React, { useEffect, useState } from 'react';
import { Plus, Share2, FileSpreadsheet, CheckCircle2, Circle, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabase';
import { useMonth } from '../context/MonthContext';

interface Bill {
  id: string;
  title: string;
  dueDate: string;
  amount: number;
  paid: boolean;
}

export const Bills: React.FC = () => {
  const { currentDate, formattedMonth } = useMonth();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBills = async () => {
    setLoading(true);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const startDate = new Date(year, month, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

    try {
      // 1. Procura despesas do mês na tabela transactions
      const { data, error } = await supabase
        .from('transactions')
        .select('id, description, amount, date, is_settled, type')
        .eq('type', 'expense')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });

      if (error) throw error;

      const mapped: Bill[] = (data || []).map((t: any) => ({
        id: t.id,
        title: t.description,
        dueDate: t.date ? t.date.split('-').reverse().slice(0, 2).join(' ') : 'Sem data',
        amount: Number(t.amount) || 0,
        paid: Boolean(t.is_settled),
      }));

      setBills(mapped);
    } catch (err) {
      console.warn('Erro ao carregar contas a pagar:', err);
      setBills([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
  }, [currentDate]);

  const toggleBill = async (id: string, currentPaid: boolean) => {
    const nextPaid = !currentPaid;
    setBills((prev) => prev.map((b) => (b.id === id ? { ...b, paid: nextPaid } : b)));

    await supabase.from('transactions').update({ is_settled: nextPaid }).eq('id', id);
  };

  const deleteBill = async (id: string) => {
    if (!confirm('Deseja realmente remover esta conta?')) return;
    setBills((prev) => prev.filter((b) => b.id !== id));
    await supabase.from('transactions').delete().eq('id', id);
  };

  const pendingTotal = bills.filter((b) => !b.paid).reduce((sum, b) => sum + b.amount, 0);
  const paidTotal = bills.filter((b) => b.paid).reduce((sum, b) => sum + b.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#F8FAFC]">Boletos & Contas a Pagar</h1>
        <p className="text-xs text-[#64748B] mt-1">Vencimentos de {formattedMonth}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#131927] border border-[#1E293B] rounded-2xl p-5">
          <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider block mb-1">
            Pendente
          </span>
          <span className="text-2xl font-extrabold text-[#F43F5E]">
            R$ {pendingTotal.toFixed(2).replace('.', ',')}
          </span>
        </div>

        <div className="bg-[#131927] border border-[#1E293B] rounded-2xl p-5">
          <span className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider block mb-1">
            Pago
          </span>
          <span className="text-2xl font-extrabold text-[#10B981]">
            R$ {paidTotal.toFixed(2).replace('.', ',')}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#10B981] text-[#0B0F19] hover:bg-[#34D399] transition-all">
          <Plus size={14} strokeWidth={2.5} /> Nova Conta
        </button>
        <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#131927] border border-[#1E293B] text-[#F8FAFC] hover:border-[#10B981]">
          <Share2 size={14} /> Enviar
        </button>
        <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-[#131927] border border-[#1E293B] text-[#F8FAFC] hover:border-[#10B981]">
          <FileSpreadsheet size={14} /> Excel
        </button>
      </div>

      <div className="space-y-2.5">
        {loading ? (
          <div className="py-12 text-center text-xs text-[#94A3B8] flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin text-[#10B981]" />
            A carregar vencimentos...
          </div>
        ) : bills.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#64748B]">
            Nenhuma conta registada para o mês selecionado.
          </div>
        ) : (
          bills.map((bill) => (
            <div
              key={bill.id}
              className="bg-[#131927] border border-[#1E293B] rounded-xl p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleBill(bill.id, bill.paid)}
                  className="text-[#10B981] hover:scale-105 transition-transform"
                >
                  {bill.paid ? (
                    <CheckCircle2 size={20} className="text-[#10B981]" />
                  ) : (
                    <Circle size={20} className="text-[#64748B]" />
                  )}
                </button>
                <div>
                  <h4
                    className={`text-sm font-semibold ${
                      bill.paid ? 'line-through text-[#64748B]' : 'text-[#F8FAFC]'
                    }`}
                  >
                    {bill.title}
                  </h4>
                  <span className="text-[11px] text-[#64748B]">Vence em {bill.dueDate}</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <span className="text-sm font-bold text-[#F8FAFC] block">
                    R$ {bill.amount.toFixed(2).replace('.', ',')}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      bill.paid ? 'bg-[#10B981]/15 text-[#10B981]' : 'bg-[#F59E0B]/15 text-[#F59E0B]'
                    }`}
                  >
                    {bill.paid ? 'PAGO' : 'PENDENTE'}
                  </span>
                </div>
                <button
                  onClick={() => deleteBill(bill.id)}
                  className="text-[#64748B] hover:text-[#F43F5E] p-1 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};