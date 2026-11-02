import React, { useEffect, useState } from 'react';
import { ExternalLink, BookOpen, Instagram } from 'lucide-react';
import { fetchWeeklyFlyers } from '../../services/dealsService';
import { WeeklyFlyer } from '../../types/database';

export const WeeklyFlyersTab: React.FC = () => {
  const [flyers, setFlyers] = useState<WeeklyFlyer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWeeklyFlyers()
      .then(setFlyers)
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="py-12 text-center text-xs text-[#94A3B8]">A carregar folhetos oficiais...</div>
      ) : flyers.length === 0 ? (
        <div className="py-12 text-center text-xs text-[#64748B]">Nenhum encarte cadastrado.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {flyers.map((flyer) => (
            <div
              key={flyer.id}
              className="bg-[#131927] border border-[#1E293B] rounded-2xl p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-xl bg-[#10B981]/15 text-[#10B981]">
                    {flyer.category === 'instagram' ? <Instagram size={18} /> : <BookOpen size={18} />}
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#1E293B] text-[#94A3B8] uppercase">
                    {flyer.category}
                  </span>
                </div>
                <h3 className="font-bold text-base text-[#F8FAFC]">{flyer.store_name}</h3>
                <span className="text-xs text-[#64748B]">Londrina/PR</span>
              </div>

              <div className="pt-4 mt-4 border-t border-[#1E293B]">
                <a
                  href={flyer.flyer_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold bg-[#10B981] text-[#0B0F19] hover:bg-[#34D399] transition-all"
                >
                  {flyer.category === 'instagram' ? 'Abrir no Instagram' : 'Ver folheto'}
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};