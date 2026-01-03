
import React, { useRef } from 'react';
import Modal from '../../../components/ui/Modal';
import { Asset } from '../../../types';
import { AssetLabel } from '../../../components/ui/AssetLabel';
import { PrintIcon } from '../../../components/icons/PrintIcon';

interface BulkLabelModalProps {
    isOpen: boolean;
    onClose: () => void;
    assets: Asset[];
}

export const BulkLabelModal: React.FC<BulkLabelModalProps> = ({ isOpen, onClose, assets }) => {
    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = () => {
        const printContent = printRef.current;
        if (!printContent) return;

        // Use a hidden iframe for isolated printing (Cleanest method for SPA)
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.width = '0px';
        iframe.style.height = '0px';
        iframe.style.border = 'none';
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow?.document;
        if (!doc) return;

        // Copy all styles from main document to ensure Tailwind/CSS works
        const styles = document.querySelectorAll('style, link[rel="stylesheet"]');
        let styleTags = '';
        styles.forEach(node => { styleTags += node.outerHTML; });
        
        // Professional Print CSS
        // - A4 Size
        // - 10mm margins
        // - 2 Column Grid (fits 350px width labels nicely)
        // - Break-inside avoid prevents labels from being cut in half
        const printCss = `
            <style>
                @media print {
                    @page { size: A4; margin: 10mm; }
                    body { 
                        background-color: white !important; 
                        -webkit-print-color-adjust: exact; 
                        print-color-adjust: exact;
                        font-family: sans-serif;
                    }
                    .print-container {
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        gap: 15px;
                        width: 100%;
                    }
                    .asset-label-wrapper {
                        break-inside: avoid;
                        page-break-inside: avoid;
                        display: flex;
                        justify-content: center;
                        padding: 5px;
                    }
                    /* Ensure borders print crisply */
                    * { border-color: #000 !important; }
                }
            </style>
        `;

        doc.open();
        doc.write(`
            <html>
                <head>
                    ${styleTags}
                    ${printCss}
                </head>
                <body>
                    <div class="print-container">
                        ${printContent.innerHTML}
                    </div>
                </body>
            </html>
        `);
        doc.close();

        // Wait for resources (images/fonts) to load inside iframe before printing
        iframe.onload = () => {
            setTimeout(() => {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
                // Clean up after print dialog closes (or user cancels)
                // Note: There is no reliable event for "after print", so we use a small timeout for cleanup
                // or just leave it until component unmounts. Removing it immediately might break print preview in some browsers.
                setTimeout(() => document.body.removeChild(iframe), 2000);
            }, 500);
        };
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Cetak Label Masal (${assets.length} Item)`}
            size="full" // Full size to better visualize grid
            hideDefaultCloseButton
        >
            <div className="flex flex-col h-[85vh]">
                {/* Toolbar */}
                <div className="flex justify-between items-center px-1 pb-4 border-b border-gray-200 mb-4">
                    <div>
                        <p className="text-sm text-gray-600">
                            Preview layout cetak (Kertas A4). Pastikan margin printer diatur ke 'None' atau 'Minimum'.
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            Total: {assets.length} Label | Estimasi Halaman: {Math.ceil(assets.length / 8)} lembar
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={onClose} 
                            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                        >
                            Tutup
                        </button>
                        <button 
                            onClick={handlePrint} 
                            className="inline-flex items-center gap-2 px-6 py-2 text-sm font-bold text-white bg-tm-primary rounded-lg shadow-lg hover:bg-tm-primary-hover active:scale-95 transition-all"
                        >
                            <PrintIcon className="w-4 h-4" /> Cetak Label
                        </button>
                    </div>
                </div>

                {/* Preview Area (Visual representation of A4) */}
                <div className="flex-1 overflow-y-auto bg-gray-100 p-8 border rounded-xl shadow-inner flex justify-center">
                    {/* A4 Container Simulation */}
                    <div 
                        ref={printRef} 
                        className="bg-white p-[10mm] w-[210mm] min-h-[297mm] shadow-2xl grid grid-cols-2 gap-4 content-start"
                        style={{ transform: 'scale(0.9)', transformOrigin: 'top center' }} // Scale down slightly to fit modal
                    >
                        {assets.map((asset) => (
                            <div key={asset.id} className="asset-label-wrapper flex justify-center">
                                {/* Pass clean styling via props if needed, but AssetLabel has fixed dimensions */}
                                <AssetLabel asset={asset} className="transform origin-center" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </Modal>
    );
};
