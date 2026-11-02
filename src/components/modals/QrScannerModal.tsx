import React, { useEffect, useRef, useState } from 'react';
import { X, Receipt, Search, Camera, Loader2, CheckCircle } from 'lucide-react';
import type { IScannerControls } from '@zxing/browser';
import { supabase } from '../../services/supabase';

interface QrScannerModalProps {
  onClose: () => void;
  onSuccess?: () => void;
}

interface ParseNfceResponse {
  error?: string;
  store_name?: string;
  total_amount?: string | number;
}

export const QrScannerModal: React.FC<QrScannerModalProps> = ({ onClose, onSuccess }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successData, setSuccessData] = useState<{ store: string; total: string } | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerControlsRef = useRef<IScannerControls | null>(null);
  const scannedRef = useRef(false);

  const stopCamera = () => {
    scannerControlsRef.current?.stop();
    scannerControlsRef.current = null;

    const stream = videoRef.current?.srcObject;
    if (stream instanceof MediaStream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    setCameraActive(false);
  };

  const handleProcessCode = async (dataToProcess?: string) => {
    setErrorMsg('');
    const rawData = (dataToProcess ?? code).trim();
    if (!rawData) return;

    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data, error } = await supabase.functions.invoke<ParseNfceResponse>('parse-nfce', {
        body: { raw_data: rawData, user_id: user?.id || 'anonymous-user' },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const total = data?.total_amount ?? '0,00';
      setSuccessData({
        store: data?.store_name || 'Estabelecimento',
        total: typeof total === 'number' ? total.toFixed(2).replace('.', ',') : total,
      });
      onSuccess?.();
    } catch (error) {
      console.error('Erro ao processar nota fiscal:', error);
      setErrorMsg(
        error instanceof Error
          ? error.message
          : 'Falha ao processar nota fiscal na SEFAZ-PR.'
      );
    } finally {
      setLoading(false);
      stopCamera();
    }
  };

  useEffect(() => {
    if (!cameraActive) return;

    let cancelled = false;
    let controls: IScannerControls | null = null;

    const startReader = async () => {
      const videoElement = videoRef.current;
      if (!videoElement) {
        throw new Error('Pré-visualização da câmara indisponível.');
      }

      const { BrowserQRCodeReader } = await import('@zxing/browser');
      if (cancelled) return;
      const codeReader = new BrowserQRCodeReader();
      controls = await codeReader.decodeFromVideoDevice(undefined, videoElement, (result) => {
        if (!result || cancelled || scannedRef.current) return;

        scannedRef.current = true;
        const scannedText = result.getText();
        setCode(scannedText);
        setCameraActive(false);
        void handleProcessCode(scannedText);
      });

      if (cancelled) {
        controls.stop();
      } else {
        scannerControlsRef.current = controls;
      }
    };

    void startReader().catch((error: unknown) => {
      if (cancelled) return;
      console.error('Erro ao inicializar a câmara:', error);
      setErrorMsg('Não foi possível inicializar a câmara. Verifique a permissão do navegador.');
      setCameraActive(false);
    });

    return () => {
      cancelled = true;
      controls?.stop();
      scannerControlsRef.current?.stop();
      scannerControlsRef.current = null;

      const stream = videoRef.current?.srcObject;
      if (stream instanceof MediaStream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraActive]);

  const startCamera = () => {
    setErrorMsg('');
    scannedRef.current = false;
    setCameraActive(true);
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#131927] border border-[#1E293B] rounded-2xl p-6 shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 border-b border-[#1E293B]">
          <h2 className="text-lg font-bold text-[#F8FAFC]">Scanner de cupom fiscal</h2>
          <button onClick={handleClose} className="p-1 text-[#94A3B8] hover:text-[#F8FAFC]">
            <X size={18} />
          </button>
        </div>

        {successData ? (
          <div className="my-6 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#10B981]/15 text-[#10B981] flex items-center justify-center mx-auto">
              <CheckCircle size={24} />
            </div>
            <h3 className="text-base font-bold text-[#F8FAFC]">Nota registrada!</h3>
            <p className="text-xs text-[#94A3B8]">
              {successData.store} • R$ {successData.total}
            </p>
            <button
              onClick={handleClose}
              className="mt-4 px-6 py-2 rounded-xl text-xs font-bold bg-[#10B981] text-[#0B0F19]"
            >
              Concluir
            </button>
          </div>
        ) : (
          <>
            <div className="my-5 flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                <Receipt size={22} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#F8FAFC]">Ler cupom fiscal</h3>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  Cole o link da NFC-e, a chave de 44 números ou aponte a câmara ao QR Code.
                </p>
              </div>
            </div>

            {cameraActive && (
              <div className="mb-4 relative rounded-xl overflow-hidden border border-[#10B981] bg-black h-48 flex items-center justify-center">
                <video ref={videoRef} className="w-full h-full object-cover" />
                <button
                  onClick={stopCamera}
                  className="absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white"
                  aria-label="Parar leitura do QR Code"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            <div className="space-y-4">
              <input
                type="text"
                placeholder="https://www.fazenda.pr.gov.br/... ou 4125 0111 2345 ..."
                value={code}
                onChange={(event) => setCode(event.target.value)}
                disabled={loading}
                className="w-full bg-[#0B0F19] border border-[#1E293B] rounded-xl px-3.5 py-2.5 text-xs text-[#F8FAFC] placeholder-[#64748B] focus:outline-none focus:border-[#10B981]"
              />

              {errorMsg && (
                <p role="alert" className="text-[11px] text-[#F43F5E] bg-[#F43F5E]/10 p-2 rounded-lg">
                  {errorMsg}
                </p>
              )}

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => void handleProcessCode()}
                  disabled={loading || cameraActive || !code.trim()}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold bg-[#10B981] text-[#0B0F19] hover:bg-[#34D399] transition-all disabled:opacity-50"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                  Consultar nota
                </button>

                <button
                  onClick={startCamera}
                  disabled={loading || cameraActive}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold bg-[#1E293B] text-[#F8FAFC] hover:bg-[#334155] border border-[#334155] transition-all disabled:opacity-50"
                >
                  <Camera size={14} />
                  Ler QR Code
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
