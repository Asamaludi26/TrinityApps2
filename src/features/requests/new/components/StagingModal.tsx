
import React, { useMemo, useState } from 'react';
import { Request, AssetCategory } from '../../../../types';
import Modal from '../../../../components/ui/Modal';
import { ArchiveBoxIcon } from '../../../../components/icons/ArchiveBoxIcon';
import { ExclamationTriangleIcon } from '../../../../components/icons/ExclamationTriangleIcon';
import { BsFileEarmarkText, BsCheckCircleFill } from 'react-icons/bs';

interface StagingModalProps {
    isOpen: boolean;
    onClose: () => void;
    request: Request | null;
    categories: AssetCategory[];
    onProceed: (itemToRegister: any) => void;
}

// Utility: Safe rounding
const safeRound = (num: number): number => {
    return Math.round((num + Number.EPSILON) * 10000) / 10000;
};

export const StagingModal: React.FC<StagingModalProps> = ({
    isOpen,
    onClose,
    request,
    categories,
    onProceed
}) => {
    const [selectedItemId, setSelectedItemId] = useState<number | null>(null);

    // Logic: Filter & Calculate Items
    const stagingItems = useMemo(() => {
        if (!request) return [];
        
        return request.items.filter(item => {
            const status = request.itemStatuses?.[item.id];
            
            // FILTER KRITIS: 
            // 1. Skip item yang ditolak (rejected)
            // 2. Skip item yang dialokasikan dari stok (stock_allocated) -> Tidak perlu registrasi baru!
            if (status?.status === 'rejected') return false;
            if (status?.status === 'stock_allocated') return false;
            
            return true; 
        }).map(item => {
            // Kalkulasi Defensive
            const itemStatus = request.itemStatuses?.[item.id];
            
            // Priority: Approved Qty > Original Qty (Jika tidak ada record approval)
            const approvedQty = itemStatus?.approvedQuantity ?? item.quantity;
            
            // Ambil data yang sudah teregistrasi (default 0 jika undefined)
            const registeredQty = request.partiallyRegisteredItems?.[item.id] || 0;
            
            // Hitung sisa (Pastikan tidak negatif dan aman dari float error)
            const remainingQty = Math.max(0, safeRound(approvedQty - registeredQty));
            
            const isCompleted = remainingQty === 0;

            // Lookup Kategori & Tipe (Defensive Check)
            const category = categories.find(c => c.id.toString() === item.categoryId?.toString());
            const type = category?.types.find(t => t.id.toString() === item.typeId?.toString());

            return {
                ...item,
                derived: {
                    approvedQty,
                    registeredQty,
                    remainingQty,
                    isCompleted,
                    categoryName: category?.name || '-',
                    typeName: type?.name || '-',
                }
            };
        });
    }, [request, categories]);

    const handleProceed = () => {
        if (!request || !selectedItemId) return;
        const item = request.items.find(i => i.id === selectedItemId);
        if (item) {
            onProceed(item);
        }
    };

    if (!request) return null;

    // Hitung item yang di-skip (Stok) untuk info visual
    const stockItemsCount = request.items.filter(i => request.itemStatuses?.[i.id]?.status === 'stock_allocated').length;

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title="Pencatatan Aset (Staging)" 
            size="xl" 
            hideDefaultCloseButton 
            footerContent={
                <div className="flex justify-end gap-3 w-full">
                     <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Batal</button>
                     <button 
                        onClick={handleProceed} 
                        disabled={!selectedItemId} 
                        className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-tm-primary rounded-lg shadow-sm hover:bg-tm-primary-hover disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                        Lanjut Catat Aset
                    </button>
                </div>
            }
        >
            <div className="space-y-4">
                 <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-3">
                    <ArchiveBoxIcon className="w-6 h-6 text-tm-primary flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-bold text-tm-primary text-sm">Pilih Barang yang Diterima (Pengadaan Baru)</h4>
                        <p className="text-sm text-blue-800 mt-1">
                            Pilih item dari daftar di bawah untuk dicatat sebagai aset baru. Item yang diambil dari stok gudang tidak perlu dicatat lagi di sini.
                        </p>
                    </div>
                </div>

                {stagingItems.length > 0 ? (
                    <div className="border border-slate-200 rounded-lg overflow-x-auto">
                        <table className="w-full text-sm text-left min-w-[900px]">
                            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="p-3 w-10 text-center">Pilih</th>
                                    <th className="p-3 w-10 text-center">No.</th>
                                    <th className="p-3">Kategori & Tipe</th>
                                    <th className="p-3">Nama Barang / Model</th>
                                    <th className="p-3">Brand</th>
                                    <th className="p-3 text-center">Qty (Sisa)</th>
                                    <th className="p-3">No. Dokumen Request</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {stagingItems.map((item, index) => {
                                    const { approvedQty, remainingQty, isCompleted, categoryName, typeName } = item.derived;
                                    
                                    return (
                                        <tr 
                                            key={item.id} 
                                            className={`hover:bg-slate-50 transition-colors cursor-pointer ${isCompleted ? 'bg-gray-50 opacity-60 cursor-not-allowed' : selectedItemId === item.id ? 'bg-blue-50/60' : 'bg-white'}`} 
                                            onClick={() => !isCompleted && setSelectedItemId(item.id)}
                                        >
                                            <td className="p-3 text-center">
                                                <div className="flex items-center justify-center">
                                                     <input 
                                                        type="radio" 
                                                        name="stagingItem"
                                                        checked={selectedItemId === item.id}
                                                        onChange={() => setSelectedItemId(item.id)}
                                                        disabled={isCompleted}
                                                        className="w-4 h-4 text-tm-primary border-gray-300 focus:ring-tm-primary cursor-pointer disabled:cursor-not-allowed"
                                                        onClick={(e) => e.stopPropagation()}
                                                     />
                                                </div>
                                            </td>
                                            <td className="p-3 text-center text-slate-500 font-medium">
                                                {index + 1}
                                            </td>
                                            <td className="p-3">
                                                <div className="text-slate-800 font-medium">{categoryName}</div>
                                                <div className="text-slate-500 text-xs">{typeName}</div>
                                            </td>
                                            <td className="p-3 font-semibold text-slate-800">
                                                {item.itemName}
                                                {isCompleted && <span className="ml-2 text-[9px] text-green-600 bg-green-100 px-1.5 py-0.5 rounded font-bold border border-green-200">SELESAI</span>}
                                            </td>
                                            <td className="p-3 text-slate-600">{item.itemTypeBrand}</td>
                                            <td className="p-3 text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className={`font-bold px-2 py-0.5 rounded text-xs ${remainingQty > 0 ? 'text-amber-700 bg-amber-100' : 'text-slate-400 bg-slate-100'}`}>
                                                        Sisa: {remainingQty}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 mt-0.5">dari {approvedQty} unit</span>
                                                </div>
                                            </td>
                                            
                                            <td className="p-3 text-slate-600">
                                                 <div className="flex items-center gap-2">
                                                     <BsFileEarmarkText className="text-slate-400 w-3 h-3" />
                                                     <span className="font-mono font-medium text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-xs">
                                                        {request.docNumber || request.id}
                                                     </span>
                                                 </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center p-8 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                        {stockItemsCount > 0 ? (
                            <>
                                <BsCheckCircleFill className="w-12 h-12 text-green-500 mb-3" />
                                <h3 className="text-lg font-bold text-slate-800">Semua Item Tersedia dari Stok</h3>
                                <p className="text-sm text-slate-500 mt-1 max-w-md">
                                    {stockItemsCount} item dalam request ini diambil dari stok gudang (Stock Allocated). Anda tidak perlu melakukan pencatatan aset baru. Silakan lanjutkan ke proses Handover.
                                </p>
                            </>
                        ) : (
                             <>
                                <ExclamationTriangleIcon className="w-10 h-10 text-slate-300 mb-2" />
                                <p className="text-sm text-slate-500">Tidak ada item yang perlu dicatat (Pengadaan Baru) dalam request ini.</p>
                             </>
                        )}
                    </div>
                )}
                
                {stockItemsCount > 0 && stagingItems.length > 0 && (
                    <p className="text-xs text-green-700 bg-green-50 p-2 rounded text-center border border-green-100">
                        <BsCheckCircleFill className="inline w-3 h-3 mr-1"/> 
                        {stockItemsCount} item lainnya telah dialokasikan dari stok (disembunyikan).
                    </p>
                )}
            </div>
        </Modal>
    );
};
