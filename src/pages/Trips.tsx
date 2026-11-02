// src/pages/Trips.tsx
import React, { useEffect, useState } from 'react';
import { Plus, Plane, Archive, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabase';

interface EventItem {
  id: string;
  name: string;
  currency: 'BRL' | 'USD' | 'EUR';
  target_budget: number;
  total_spent: number;
  is_archived: boolean;
}

export const Trips: React.FC = () => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterArchived, setFilterArchived] = useState(false);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mapped: EventItem[] = (data || []).map((e: any) => ({
        id: e.id,
        name: e.name || 'Viagem',
        currency: (e.currency as 'BRL' | 'USD' | 'EUR') || 'BRL',
        target_budget: Number(e.target_budget) || 0,
        total_spent: Number(e.total_spent) || 0,
        is_archived: Boolean(e.is_archived),
      }));

      setEvents(mapped);
    } catch (err) {
      console.warn('Erro ao carregar viagens:', err);
      // Fallback para visualização imediata se a tabela ainda estiver vazia
      setEvents([
        {
          id: '1',
          name: 'Viagem: São Paulo',
          currency: 'BRL',
          target_budget: 1500,
          total_spent: 1092,
          is_archived: false,
        },
        {
          id: '2',
          name: 'Viagem: Orlando',
          currency: 'USD',
          target_budget: 2000,
          total_spent: 2100,
          is_archived: false,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const toggleArchive = async (id: string, current: boolean) => {
    const next = !current;
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, is_archived: next } : e)));
    await supabase.from('events').update({ is_archived: next }).eq('id', id);
  };

  const deleteEvent = async (id: string) => {
    if (!confirm('Deseja realmente excluir este evento/viagem?')) return;
    setEvents((prev) => prev.filter((e) => e.id !== id));
    await supabase.from('events').delete().eq('id', id);
  };

  const filteredEvents = events.filter((e) => e.is_archived === filterArchived);
  const activeCount = events.filter((e) => !e.is_archived).length;
  const archivedCount = events.filter((e) => e.is_archived).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#F8FAFC]">Viagens & Eventos</h1>
          <p className="text-xs text-[#64748B] mt-1">Orçamento e gastos de cada viagem ou evento</p>
        </div>
        <button className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#10B981] text-[#0B0F19] hover:bg-[#34D399] transition-all">
          <Plus size={14} strokeWidth={2.5} /> Novo
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilterArchived(false)}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            !filterArchived
              ? 'bg-[#10B981] text-[#0B0F19]'
              : 'bg-[#131927] border border-[#1E293B] text-[#94A3B8]'
          }`}
        >
          Em Andamento ({activeCount})
        </button>
        <button
          onClick={() => setFilterArchived(true)}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            filterArchived
              ? 'bg-[#10B981] text-[#0B0F19]'
              : 'bg-[#131927] border border-[#1E293B] text-[#94A3B8]'
          }`}
        >
          Concluídos ({archivedCount})
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-[#94A3B8] flex items-center justify-center gap-2">
          <Loader2 size={16} className="animate-spin text-[#10B981]" />
          A carregar viagens...
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="py-12 text-center text-xs text-[#64748B]">
          Nenhuma viagem registada nesta categoria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredEvents.map((event) => {
            const isOverBudget =
              event.target_budget > 0 && event.total_spent > event.target_budget;
            const ratio =
              event.target_budget > 0
                ? Math.min((event.total_spent / event.target_budget) * 100, 100)
                : 0;
            const symbol = event.currency === 'USD' ? 'US$' : 'R$';

            return (
              <div
                key={event.id}
                className="bg-[#131927] border border-[#1E293B] rounded-2xl p-5 space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-[#10B981]/15 text-[#10B981]">
                      <Plane size={18} />
                    </div>
                    <h3 className="font-bold text-sm text-[#F8FAFC]">{event.name}</h3>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#1E293B] text-[#94A3B8]">
                    {event.currency}
                  </span>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-[#94A3B8]">Total gasto</span>
                    <span className="text-[#94A3B8]">Meta</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold mb-2">
                    <span className={isOverBudget ? 'text-[#F43F5E]' : 'text-[#F8FAFC]'}>
                      {symbol} {event.total_spent.toFixed(2).replace('.', ',')}
                    </span>
                    <span className="text-[#F8FAFC]">
                      {symbol} {event.target_budget.toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#0B0F19]">
                    <div
                      className={`h-2 rounded-full ${
                        isOverBudget ? 'bg-[#F43F5E]' : 'bg-[#10B981]'
                      }`}
                      style={{ width: `${ratio}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E293B] text-xs text-[#94A3B8]">
                  <button
                    onClick={() => toggleArchive(event.id, event.is_archived)}
                    className="flex items-center gap-1 hover:text-[#F8FAFC] transition-colors"
                  >
                    <Archive size={14} /> {event.is_archived ? 'Reativar' : 'Arquivar'}
                  </button>
                  <button
                    onClick={() => deleteEvent(event.id)}
                    className="flex items-center gap-1 hover:text-[#F43F5E] transition-colors"
                  >
                    <Trash2 size={14} /> Excluir
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};