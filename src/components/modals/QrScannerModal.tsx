import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Camera,
  Keyboard,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ScanLine,
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { supabase } from '../../services/supabase';

interface Props {
  onClose: () => void;
  onSuccess?: () => void;
  eventId?: string;
}

export const QrScannerModal: React.FC<Props> = ({ onClose, onSuccess, eventId }) => {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{ store: string; total: string } | null>(null);

  const [manualMode, setManualMode] = useState(false);
  const [accessKey, setAccessKey] = useState('');

  // Identificador único para evitar colisões entre re-renderizações
  const containerIdRef = useRef(`qr-reader-${Math.random().toString(36).substring(2, 9)}`);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isTerminatedRef = useRef<boolean>(false);
  const [cameraActive, setCameraActive] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id);
    });
  }, []);

  // Encerramento total e imediato de qualquer stream da câmara
  const stopAllMediaTracks = async () => {
    isTerminatedRef.current = true;

    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        // Ignora erros ao parar
      }
      scannerRef.current = null;
    }

    // Paragem forçada de todas as faixas ativas no DOM
    const videos = document.querySelectorAll('video');
    videos.forEach((vid) => {
      if (vid.srcObject instanceof MediaStream) {
        vid.srcObject.getTracks().forEach((track) => {
          track.stop();
          track.enabled = false;
        });
        vid.srcObject = null;
      }
    });

    setCameraActive(false);
  };

  const handleSafeClose = async () => {
    await stopAllMediaTracks();
    onClose();
  };

  const processReceipt = async (qrData: string) => {
    if (loading || !userId) return;
    setLoading(true);
    setErrorMessage(null);

    await stopAllMediaTracks();

    try {
      const { data, error } = await supabase.functions.invoke('parse-nfce', {
        body: {
          raw_data: qrData,
          user_id: userId,
          event_id: eventId || null,
        },
      });

      if (error) {
        let msg = error.message;
        try {
          if ('context' in error && typeof (error as any).context?.json === 'function') {
            const body = await (error as any).context.json();
            if (body?.message || body?.error) msg = body.message || body.error;
          }
        } catch {}
        setErrorMessage(msg || 'Falha ao processar nota fiscal.');
      } else if (data?.already_registered) {
        setErrorMessage(data.message || 'Esta nota fiscal já consta no sistema.');
      } else if (!data?.success) {
        setErrorMessage(data?.error || 'O servidor não confirmou a importação.');
      } else {
        const storeName = data?.store_name ?? 'Mercado';
        const totalAmount = Number(data?.total_amount ?? 0).toFixed(2);

        setSuccessData({
          store: storeName,
          total: totalAmount,
        });

        if (onSuccess) onSuccess();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha na comunicação com o servidor.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (manualMode || successData) return;

    isTerminatedRef.current = false;
    const currentContainerId = containerIdRef.current;

    const startScanner = async () => {
      const containerEl = document.getElementById(currentContainerId);
      if (!containerEl) return;
      containerEl.innerHTML = '';

      const html5QrCode = new Html5Qrcode(currentContainerId);

      try {
        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: (w, h) => {
              const edge = Math.floor(Math.min(w, h) * 0.75);
              return { width: edge, height: edge };
            },
          },
          (decodedText) => {
            if (!isTerminatedRef.current) {
              processReceipt(decodedText);
            }
          },
          () => {}
        );

        if (isTerminatedRef.current) {
          if (html5QrCode.isScanning) {
            await html5QrCode.stop();
          }
          html5QrCode.clear();
        } else {
          scannerRef.current = html5QrCode;
          setCameraActive(true);
        }
      } catch (err) {
        console.warn('Falha ao inicializar câmara:', err);
        if (!isTerminatedRef.current) setCameraActive(false);
      }
    };

    const timer = setTimeout(startScanner, 250);

    return () => {
      isTerminatedRef.current = true;
      clearTimeout(timer);
      stopAllMediaTracks();
    };
  }, [manualMode, successData, userId]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = accessKey.replace(/\D/g, '');
    if (cleanKey.length !== 44) {
      alert('A chave de acesso deve conter exatamente 44 dígitos.');
      return;
    }
    processReceipt(cleanKey);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-[#0B0F19] border border-white/10 rounded-2xl flex flex-col shadow-2xl overflow-hidden relative">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-[#131927]">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <ScanLine className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Scanner de Nota Fiscal</h3>
              <p className="text-[10px] text-slate-400">
                {eventId ? 'Vinculando gasto à viagem' : 'NFC-e Estadual (SEFAZ)'}
              </p>
            </div>
          </div>
          <button
            onClick={handleSafeClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Ecrã de Sucesso */}
        {successData ? (
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h4 className="text-base font-bold text-slate-100">Nota Fiscal Importada!</h4>
              <p className="text-xs text-slate-400 mt-1">{successData.store}</p>
              <p className="text-2xl font-black text-emerald-400 mt-2">
                R$ {successData.total.replace('.', ',')}
              </p>
            </div>
            <button
              onClick={handleSafeClose}
              className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition"
            >
              Concluído
            </button>
          </div>
        ) : manualMode ? (
          /* Modo Manual */
          <form onSubmit={handleManualSubmit} className="p-6 space-y-4">
            <div>
              <label className="text-[10px] font-bold tracking-wider uppercase text-slate-400 block mb-1">
                Chave de Acesso da NFC-e (44 dígitos)
              </label>
              <textarea
                rows={3}
                required
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
                placeholder="4126 ... 0000 0000"
                className="w-full bg-[#131927] border border-white/10 rounded-xl p-3 text-xs text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Localizada logo abaixo do código de barras da nota.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setManualMode(false);
                  setErrorMessage(null);
                }}
                className="flex-1 py-2.5 bg-[#131927] text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-800 transition"
              >
                Usar Câmara
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl transition"
              >
                {loading ? 'A consultar...' : 'Consultar Nota'}
              </button>
            </div>
          </form>
        ) : (
          /* Modo Câmara com Container Flexível sem corte */
          <div className="p-5 flex flex-col items-center">
            <div className="relative w-full rounded-2xl overflow-hidden bg-black border border-white/10 flex items-center justify-center min-h-[260px]">
              <div
                id={containerIdRef.current}
                className="w-full [&_video]:w-full [&_video]:h-auto [&_video]:max-h-[300px] [&_video]:object-cover"
              />

              {!cameraActive && !loading && (
                <div className="absolute inset-0 bg-[#0B0F19]/90 flex flex-col items-center justify-center p-4 text-center">
                  <Camera className="w-8 h-8 text-slate-500 mb-2" />
                  <p className="text-xs text-slate-300 font-semibold">A iniciar câmara...</p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Autorize o acesso à câmara no navegador ou use a entrada manual.
                  </p>
                </div>
              )}

              {loading && (
                <div className="absolute inset-0 bg-[#0B0F19]/90 flex flex-col items-center justify-center p-4 text-center z-20">
                  <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-2" />
                  <p className="text-xs text-slate-200 font-bold">A processar na SEFAZ...</p>
                  <p className="text-[10px] text-slate-400 mt-1">A extrair itens e valores do cupão</p>
                </div>
              )}
            </div>

            {errorMessage && (
              <div className="mt-3 w-full p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="text-[11px]">{errorMessage}</span>
              </div>
            )}

            <button
              onClick={async () => {
                await stopAllMediaTracks();
                setManualMode(true);
                setErrorMessage(null);
              }}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-[#131927] border border-white/10 hover:border-white/20 text-slate-300 font-semibold text-xs rounded-xl transition"
            >
              <Keyboard className="w-3.5 h-3.5 text-sky-400" />
              Digitar chave de 44 dígitos
            </button>
          </div>
        )}
      </div>
    </div>
  );
};