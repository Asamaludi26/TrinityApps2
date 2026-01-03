
import React, { useEffect, useRef, useState } from 'react';
import Modal from './Modal';
import { CheckIcon } from '../icons/CheckIcon';
import { parseScanData } from '../../utils/scanner';
import { ParsedScanResult } from '../../types';
import { useNotification } from '../../providers/NotificationProvider';

declare var Html5Qrcode: any;
declare var Html5QrcodeSupportedFormats: any;

interface GlobalScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (parsedData: ParsedScanResult) => void;
}

export const GlobalScannerModal: React.FC<GlobalScannerModalProps> = ({ isOpen, onClose, onScanSuccess }) => {
  const scannerRef = useRef<any>(null);
  const addNotification = useNotification();
  const [isSuccess, setIsSuccess] = useState(false);
  const [scanResult, setScanResult] = useState<ParsedScanResult | null>(null);

  useEffect(() => {
    let html5QrCode: any = null;

    if (isOpen && typeof Html5Qrcode !== "undefined") {
      setIsSuccess(false);
      setScanResult(null);

      // Ensure the element exists before initializing
      const elementId = "global-qr-reader";
      const element = document.getElementById(elementId);
      if (!element) return;

      try {
        html5QrCode = new Html5Qrcode(elementId);
        scannerRef.current = html5QrCode;

        const successCallback = (decodedText: string, decodedResult: any) => {
            // Pause logic to prevent multiple scans
            if (html5QrCode && html5QrCode.isScanning) {
                html5QrCode.pause(); 
                
                const parsed = parseScanData(decodedText);
                setScanResult(parsed);
                setIsSuccess(true);

                // Stop safely
                html5QrCode.stop()
                    .then(() => {
                        html5QrCode.clear();
                        setTimeout(() => onScanSuccess(parsed), 600);
                    })
                    .catch((err: any) => {
                        console.warn("Error stopping scanner after success:", err);
                        // Even if stop fails, proceed to callback
                        setTimeout(() => onScanSuccess(parsed), 600);
                    });
            }
        };

        const config = {
            fps: 10,
            qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const qrboxSize = Math.floor(minEdge * 0.7);
            return { width: qrboxSize, height: qrboxSize };
            },
            formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.EAN_8,
            ],
            experimentalFeatures: {
            useBarCodeDetectorIfSupported: true,
            },
        };

        html5QrCode
            .start(
            { facingMode: "environment" },
            config,
            successCallback,
            (errorMessage: string) => {
                // Ignore parse errors, they are noisy
            } 
            )
            .catch((err: any) => {
                // Handle "play() request was interrupted" specifically
                if (err?.name === "NotAllowedError") {
                    addNotification("Gagal memulai kamera. Pastikan izin telah diberikan.", "error");
                } else if (err?.message?.includes("interrupted") || err?.name === "AbortError") {
                    // This error is expected if the modal is closed quickly during initialization
                    console.debug("Scanner initialization interrupted");
                } else {
                    console.warn("Unable to start scanning.", err);
                }
            });

      } catch (e) {
          console.error("Failed to initialize Html5Qrcode", e);
      }
    }

    return () => {
      if (html5QrCode) {
          // If scanning, stop it. If starting, the start catch block handles it.
          // Note: Html5Qrcode.isScanning is the flag to check.
          if (html5QrCode.isScanning) {
            html5QrCode.stop().then(() => html5QrCode.clear()).catch((err: any) => console.warn("Cleanup stop error:", err));
          } else {
            // If not scanning but instance exists (e.g. stopped or failed start), clear to remove video element
            try { html5QrCode.clear(); } catch(e) {}
          }
      }
    };
  }, [isOpen, onScanSuccess, onClose, addNotification]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Pindai Kode QR atau Barcode"
      size="md"
    >
      <div className="relative w-full aspect-square rounded-lg overflow-hidden bg-black">
        <div id="global-qr-reader" className="w-full h-full"></div>
        {isSuccess && scanResult ? (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white text-center p-4 animate-fade-in-up z-20">
            <CheckIcon className="w-16 h-16 text-green-400 mb-4" />
            <h3 className="text-lg font-bold">Pindai Berhasil</h3>
            {scanResult.name && (
              <p className="mt-2 text-base">{scanResult.name}</p>
            )}
            {scanResult.id && (
              <p className="text-sm font-mono text-gray-300">{scanResult.id}</p>
            )}
            {scanResult.serialNumber && !scanResult.id && (
              <p className="text-sm font-mono text-gray-300">
                SN: {scanResult.serialNumber}
              </p>
            )}
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
            <div className="relative w-[70%] h-[70%]">
              <div className="absolute inset-0 border-4 rounded-lg border-white/50"></div>
              <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 rounded-tl-lg border-white"></div>
              <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 rounded-tr-lg border-white"></div>
              <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 rounded-bl-lg border-white"></div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 rounded-br-lg border-white"></div>
            </div>
          </div>
        )}
      </div>
      <p className="mt-4 text-sm text-center text-gray-600">
        Posisikan Kode QR atau Barcode di dalam kotak.
      </p>
    </Modal>
  );
};
