
import React, { useMemo, useState } from 'react';
import { Request, AssetCategory } from '../../../../types';
import Modal from '../../../../components/ui/Modal';
import { ArchiveBoxIcon } from '../../../../components/icons/ArchiveBoxIcon';
import { ExclamationTriangleIcon } from '../../../../components/icons/ExclamationTriangleIcon';

interface StagingModalProps {
    isOpen: boolean;
    onClose: () => void;
    request: Request | null;
    categories: AssetCategory[];
    onProceed: (itemToRegister: any) => void;
}

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
            // Skip item yang ditolak secara eksplisit
            const status = request.itemStatuses?.[item.id];
            if (status?.status === 'rejected') return false;
            return true; 
        }).map(item => {
            // Kalkulasi Defensive
            const itemStatus = request.itemStatuses?.[item.id];
            
            // Priority: Approved Qty > Original Qty (Jika tidak ada record approval)
            const approvedQty = itemStatus?.approvedQuantity ?? item.quantity;
            
            // Ambil data yang sudah teregistrasi (default 0 jika undefined)
            const registeredQty = request.partiallyRegisteredItems?.[item.id] || 0;
            
            // Hitung sisa (Pastikan tidak negatif)
            const remainingQty = Math.max(0, approvedQty - registeredQty);
            
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
                        <h4 className="font-bold text-tm-primary text-sm">Pilih Barang yang Diterima</h4>
                        <p className="text-sm text-blue-800 mt-1">
                            Pilih <strong>satu</strong> item dari daftar di bawah untuk dicatat. Item yang sudah lengkap akan ditandai selesai.
                        </p>
                    </div>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-x-auto">
                    <table className="w-full text-sm text-left min-w-[900px]">
                        <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                            <tr>
                                <th className="p-3 w-10 text-center">Pilih</th>
                                <th className="p-3">Kategori</th>
                                <th className="p-3">Tipe Aset</th>
                                <th className="p-3">Model / Nama Barang</th>
                                <th className="p-3">Brand</th>
                                <th className="p-3 text-center">Qty (Approve/Sisa)</th>
                                <th className="p-3">Vendor</th>
                                <th className="p-3">Tanggal Beli</th>
                                <th className="p-3">Dokumen</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {stagingItems.length > 0 ? stagingItems.map((item) => {
                                const { approvedQty, remainingQty, isCompleted, categoryName, typeName } = item.derived;
                                
                                // Access Purchase Details (Safe Access)
                                const details = request.purchaseDetails?.[item.id];
                                
                                return (
                                    <tr 
                                        key={item.id} 
                                        className={`hover:bg-slate-50 transition-colors cursor-pointer ${isCompleted ? 'bg-gray-50 opacity-60 cursor-not-allowed' : 'bg-white'}`} 
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
                                        <td className="p-3 text-slate-600 text-xs font-medium">{categoryName}</td>
                                        <td className="p-3 text-slate-600 text-xs">{typeName}</td>
                                        <td className="p-3 font-semibold text-slate-800">
                                            {item.itemName}
                                            {isCompleted && <span className="ml-2 text-[9px] text-green-600 bg-green-100 px-1.5 py-0.5 rounded font-bold border border-green-200">SELESAI</span>}
                                        </td>
                                        <td className="p-3 text-slate-600">{item.itemTypeBrand}</td>
                                        <td className="p-3 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="text-xs text-slate-500">Total: {approvedQty}</span>
                                                <span className={`font-bold px-2 py-0.5 rounded text-xs mt-0.5 ${remainingQty > 0 ? 'text-amber-700 bg-amber-100' : 'text-slate-400'}`}>
                                                    Sisa: {remainingQty}
                                                </span>
                                            </div>
                                        </td>
                                        {/* Purchase Details Columns with fallback */}
                                        <td className="p-3 text-slate-600 text-xs">{details?.vendor || '-'}</td>
                                        <td className="p-3 text-slate-600 text-xs">
                                             <div className="flex flex-col gap-1">
                                                <span>{details?.purchaseDate ? new Date(details.purchaseDate).toLocaleDateString('id-ID') : '-'}</span>
                                             </div>
                                        </td>
                                        <td className="p-3 text-slate-600 text-xs">
                                             <div className="flex flex-col gap-1">
                                                 {details?.poNumber ? (
                                                     <span className="font-bold bg-slate-100 px-1 rounded border border-slate-200 w-fit">{details.poNumber}</span>
                                                 ) : '-'}
                                             </div>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                     <td colSpan={9} className="p-8 text-center text-slate-500 italic flex flex-col items-center justify-center w-full">
                                        <ExclamationTriangleIcon className="w-8 h-8 text-slate-300 mb-2" />
                                        Tidak ada item valid untuk dicatat dalam request ini.
                                     </td>
                                 </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                
                <p className="text-xs text-slate-500 text-center italic mt-2">
                    Catatan: Item yang berstatus "Ditolak" tidak akan muncul dalam daftar ini.
                </p>
            </div>
        </Modal>
    );
};
