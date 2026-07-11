'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { X, Camera, AlertCircle } from 'lucide-react';

interface Props {
  onResult: (text: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onResult, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  const handleClose = useCallback(() => {
    setScanning(false);
    stopCamera();
    onClose();
  }, [stopCamera, onClose]);

  useEffect(() => {
    let codeReader: import('@zxing/browser').BrowserMultiFormatReader | null = null;

    async function start() {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        codeReader = new BrowserMultiFormatReader();

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }

        // Decode continuously from the video element
        const controls = await codeReader.decodeFromVideoElement(
          videoRef.current!,
          (result) => {
            if (result && scanning) {
              setScanning(false);
              stopCamera();
              onResult(result.getText());
              onClose();
            }
          }
        );

        // Cleanup on unmount
        return () => {
          controls.stop();
        };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes('Permission') || message.includes('denied')) {
          setError('Camera permission denied. Please allow camera access and try again.');
        } else if (message.includes('NotFound') || message.includes('no device')) {
          setError('No camera found on this device.');
        } else {
          setError(`Camera error: ${message}`);
        }
      }
    }

    start();

    return () => {
      stopCamera();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative bg-white rounded-cards shadow-subtle w-full max-w-sm mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-dove/10">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-graphite" />
            <span className="text-sm font-medium text-ink">Scan Barcode / SKU</span>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-graphite hover:text-ink hover:bg-fog transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Camera View */}
        <div className="relative bg-black aspect-square">
          {error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
              <AlertCircle className="w-10 h-10 text-rust opacity-80" />
              <p className="text-white text-sm">{error}</p>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
              {/* Scanning overlay */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 border-2 border-white/70 rounded-xl relative">
                  {/* Corner marks */}
                  {['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'].map((pos, i) => (
                    <div key={i} className={`absolute w-5 h-5 border-white ${pos} ${
                      i === 0 ? 'border-t-2 border-l-2 rounded-tl' :
                      i === 1 ? 'border-t-2 border-r-2 rounded-tr' :
                      i === 2 ? 'border-b-2 border-l-2 rounded-bl' :
                      'border-b-2 border-r-2 rounded-br'
                    }`} />
                  ))}
                  {/* Scanning line animation */}
                  <div className="absolute left-0 right-0 h-0.5 bg-apricot-wash opacity-90 animate-[scan_2s_ease-in-out_infinite]"
                    style={{ top: '50%', transform: 'translateY(-50%)', animation: 'scan 2s ease-in-out infinite' }}
                  />
                </div>
              </div>
              <p className="absolute bottom-4 left-0 right-0 text-center text-white/80 text-xs">
                Point camera at barcode or QR code
              </p>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes scan {
          0%, 100% { top: 10%; }
          50% { top: 90%; }
        }
      `}</style>
    </div>
  );
}
