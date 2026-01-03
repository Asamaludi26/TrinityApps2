
import React, { useEffect, useRef, useState } from 'react';
import { Asset } from '../../types';

declare var QRCode: any;
declare var JsBarcode: any;

interface AssetLabelProps {
    asset: Asset;
    className?: string;
    scale?: number; // Option to increase render scale
}

export const AssetLabel: React.FC<AssetLabelProps> = ({ asset, className = '' }) => {
    const barcodeRef = useRef<SVGSVGElement>(null);
    const [qrImage, setQrImage] = useState<string>('');

    useEffect(() => {
        // 1. Generate High-Res QR Code
        // Optimization: Minified JSON Payload for less density & faster scanning
        // i = id, t = type (a = asset)
        const qrData = JSON.stringify({
            t: 'a', 
            i: asset.id 
        });
        
        if (typeof QRCode !== 'undefined') {
            QRCode.toDataURL(qrData, {
                width: 300, // Higher resolution source
                margin: 1,
                color: { dark: '#000000', light: '#ffffff' },
                errorCorrectionLevel: 'H' // High error correction (tahan goresan/kotoran)
            }, (err: any, url: string) => {
                if (!err) setQrImage(url);
            });
        }

        // 2. Generate Barcode (Vector SVG for infinite scaling)
        if (barcodeRef.current && typeof JsBarcode !== 'undefined') {
            try {
                JsBarcode(barcodeRef.current, asset.id, {
                    format: "CODE128",
                    lineColor: "#000",
                    width: 2, // Thicker bars
                    height: 40,
                    displayValue: false, // Hide text below barcode (we handle it manually)
                    margin: 0,
                    background: "transparent"
                });
            } catch (e) {
                console.error("Barcode failed", e);
            }
        }
    }, [asset.id]);

    return (
        <div className={`relative bg-white border-[3px] border-black p-4 shadow-sm print:shadow-none print:border-black overflow-hidden flex flex-col justify-between select-none ${className}`}
             style={{ 
                 width: '350px', 
                 height: '200px', 
                 pageBreakInside: 'avoid',
                 boxSizing: 'border-box'
             }}>
            
            {/* Header: Company Branding */}
            <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-2">
                <div>
                    <h4 className="font-black text-gray-900 text-xs tracking-wider uppercase leading-none">PT. TRINITI MEDIA INDONESIA</h4>
                    <p className="text-[9px] text-gray-600 font-bold uppercase tracking-[0.2em] mt-1">Property Tag</p>
                </div>
                <div className="bg-black text-white text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase">
                    Do Not Remove
                </div>
            </div>
            
            {/* Main Content: Info & QR */}
            <div className="flex gap-4 flex-1 min-h-0 items-center">
                {/* QR Area - Fixed Size */}
                <div className="flex-shrink-0 w-[80px] h-[80px] bg-white flex items-center justify-center border border-gray-100">
                     {qrImage && (
                        <img 
                            src={qrImage} 
                            alt="QR" 
                            className="w-full h-full object-contain rendering-pixelated" 
                        />
                     )}
                </div>
                
                {/* Text Info Area - Flexible */}
                <div className="flex-1 flex flex-col min-w-0 justify-center h-full">
                    <div className="mb-2">
                        <p className="text-[9px] text-gray-500 uppercase font-bold leading-none mb-0.5">Asset Name</p>
                        <p className="text-sm font-bold text-gray-900 truncate leading-tight block w-full">{asset.name}</p>
                    </div>
                     <div className="mb-1">
                        <p className="text-[9px] text-gray-500 uppercase font-bold leading-none mb-0.5">Asset ID</p>
                        <p className="text-lg font-black text-gray-900 leading-none tracking-tight">{asset.id}</p>
                    </div>
                </div>
            </div>

            {/* Footer: Barcode & SN */}
            <div className="mt-2 pt-1 border-t-2 border-black flex flex-col items-center justify-end w-full">
                <div className="w-full h-8 overflow-hidden flex items-center justify-center">
                    <svg ref={barcodeRef} className="h-full w-full object-cover"></svg>
                </div>
                <p className="text-[10px] font-mono font-bold text-gray-600 truncate mt-0.5 w-full text-center">
                    SN: {asset.serialNumber || 'N/A'}
                </p>
            </div>
        </div>
    );
};
