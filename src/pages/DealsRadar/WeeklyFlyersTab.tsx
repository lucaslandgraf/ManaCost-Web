import React, { useState, useEffect } from 'react';
import { BookOpen, ExternalLink, X, Loader2, Store } from 'lucide-react';
import { fetchWeeklyFlyers } from '../../services/dealsService';
import type { WeeklyFlyer } from '../../types/database';

const FALLBACK_FLYER_URLS: Record<string, string> = {
  'Super Muffato': 'https://www.supermuffato.com.br/lojas-fisicas?tab=encartes&loja=26',
  'Max Atacadista': 'https://www.maxatacadista.com.br/lojas/encartes-e-videos/?loja=110',
  'Hiper Condor': 'https://institucional.condor.com.br/ofertas/cidade/londrina',
  'Super Angeloni': 'https://docs.google.com/gview?embedded=true&url=https://statics.angeloni.com.br/encartes/Tematica/SemanalAngeloni_PR.pdf',
  'Santarém Supermercado': 'https://www.instagram.com/supermercados_santarem/',
  'Almeida Mercados': 'https://www.tiendeo.com.br/londrina/almeida-mercados',
  'Viscardi': 'https://www.instagram.com/viscardioficial/',
  'Atacadão Tiradentes': 'https://www.atacadao.com.br/loja/londrina-tiradentes',
  'Tonhão Maxi': 'https://www.supermercadostonhaomaxi.com/encarte',
  'Super Golff': 'https://supergolff.com.br/ofertas#book/',
  'Amigão Supermercados': 'https://drive.google.com/drive/folders/10nVHbmCOmeRQlmS3HTAbCRGGSlBw6E27',
  'Carrefour': 'https://www.tiendeo.com.br/Encartes-Catalogos/carrefour',
};

export const WeeklyFlyersTab: React.FC = () => {
  const [flyers, setFlyers] = useState<WeeklyFlyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<{ name: string; url: string } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchWeeklyFlyers();
        if (data && data.length > 0) {
          setFlyers(data);
        } else {
          setFlyers(
            Object.entries(FALLBACK_FLYER_URLS).map(([store_name, flyer_url], idx) => ({
              id: String(idx + 1),
              store_name,
              flyer_url,
              category: flyer_url.includes('instagram') ? 'instagram' : 'encarte',
              badge_color: '#10B981',
            })) as WeeklyFlyer[]
          );
        }
      } catch {
        setFlyers([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleOpenFlyer = (item: WeeklyFlyer) => {
    const url = item.flyer_url || FALLBACK_FLYER_URLS[item.store_name];
    if (!url) return;

    if (item.category === 'instagram' || url.includes('instagram.com') || url.includes('drive.google.com')) {
      window.open(url, '_blank');
      return;
    }

    setPreview({ name: item.store_name, url });
  };

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
          <Loader2 size={16} className="animate-spin text-emerald-400" />
          A carregar encartes da semana...
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {flyers.map((item) => (
            <div
              key={item.id}
              onClick={() => handleOpenFlyer(item)}
              className="p-4 rounded-2xl bg-[#131927] border border-white/5 hover:border-white/10 hover:bg-[#1E293B]/20 transition cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[#0B0F19] border border-white/5 flex items-center justify-center shrink-0">
                  <Store size={16} className="text-emerald-400" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-100 truncate">{item.store_name}</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {item.category === 'instagram' ? 'Rede Social' : 'Encarte Oficial'}
                  </p>
                </div>
              </div>
              <ExternalLink size={14} className="text-slate-500 shrink-0" />
            </div>
          ))}
        </div>
      )}

      {/* Modal Iframe de Visualização */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-4xl h-[85vh] bg-[#0B0F19] border border-white/10 rounded-2xl flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-white/5 bg-[#131927]">
              <div className="flex items-center gap-2">
                <BookOpen size={16} className="text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-100">{preview.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={preview.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-[#0B0F19] border border-white/5 text-slate-300 hover:text-white"
                >
                  <ExternalLink size={12} />
                  Abrir no navegador
                </a>
                <button
                  onClick={() => setPreview(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <iframe
              src={preview.url}
              title={preview.name}
              className="flex-1 w-full h-full border-none bg-white"
            />
          </div>
        </div>
      )}
    </div>
  );
};