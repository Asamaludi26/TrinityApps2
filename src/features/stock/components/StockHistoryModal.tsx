
import React, { useMemo } from 'react';
import { StockMovement } from '../../../types';
import Modal from '../../../components/ui/Modal';
import { useAssetStore } from '../../../stores/useAssetStore'; // Access to categories for unit lookup

export const StockHistoryModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    itemName: string; 
    itemBrand: string;
    movements: StockMovement[] 
}> = ({ isOpen, onClose, itemName, itemBrand, movements }) => {
    
    // Access categories to determine if item is measurement based
    const categories = useAssetStore((state) => state.categories);

    const unitInfo = useMemo(() => {
        let isMeasurement = false;
        let baseUnit = 'Unit';
        
        for (const cat of categories) {
            for (const typ of cat.types) {
                const model = typ.standardItems?.find(m => m.name === itemName && m.brand === itemBrand);
                if (model) {
                    if (model.bulkType === 'measurement') {
                        isMeasurement = true;
                        baseUnit = model.baseUnitOfMeasure || 'Meter';
                    } else {
                        baseUnit = model.unitOfMeasure || typ.unitOfMeasure || 'Unit';
                    }
                    break;
                }
            }
            if (isMeasurement) break;
        }
        return { isMeasurement, baseUnit };
    }, [categories, itemName, itemBrand]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Kartu Stok: ${itemName}`} size="lg" hideDefaultCloseButton={false}>
            <div className="p-1 mb-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700 flex justify-between px-4 py-2">
                <span>Brand: <strong>{itemBrand}</strong></span>
                <span>Saldo Akhir: <strong>{movements.length > 0 ? movements[0].balanceAfter.toLocaleString('id-ID') : 0} {unitInfo.baseUnit}</strong></span>
            </div>
            
            <div className="overflow-x-auto border rounded-lg max-h-[60vh] custom-scrollbar">
                <table className="min-w-full text-sm divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Tanggal</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Tipe</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Referensi</th>
                            <th className="px-4 py-3 text-right font-medium text-gray-500">Masuk ({unitInfo.baseUnit})</th>
                            <th className="px-4 py-3 text-right font-medium text-gray-500">Keluar ({unitInfo.baseUnit})</th>
                            <th className="px-4 py-3 text-right font-medium text-gray-500">Saldo</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Ket.</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {movements.length > 0 ? movements.map(m => {
                            const isIncoming = m.type.startsWith('IN_');
                            const typeLabel = m.type.replace('IN_', '').replace('OUT_', '').replace('_', ' ');
                            return (
                                <tr key={m.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-2 whitespace-nowrap">{new Date(m.date).toLocaleDateString('id-ID', {day:'2-digit', month:'short', year:'2-digit'})} <span className="text-xs text-gray-400">{new Date(m.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span></td>
                                    <td className="px-4 py-2 whitespace-nowrap"><span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${isIncoming ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{typeLabel}</span></td>
                                    <td className="px-4 py-2 font-mono text-xs">{m.referenceId || '-'}</td>
                                    <td className="px-4 py-2 text-right font-semibold text-green-600">{isIncoming ? m.quantity.toLocaleString('id-ID') : '-'}</td>
                                    <td className="px-4 py-2 text-right font-semibold text-red-600">{!isIncoming ? m.quantity.toLocaleString('id-ID') : '-'}</td>
                                    <td className="px-4 py-2 text-right font-bold text-gray-800">{m.balanceAfter.toLocaleString('id-ID')}</td>
                                    <td className="px-4 py-2 text-xs text-gray-500 truncate max-w-[150px]" title={m.notes}>{m.notes || '-'}</td>
                                </tr>
                            )
                        }) : (
                             <tr><td colSpan={7} className="py-8 text-center text-gray-500">Belum ada riwayat transaksi.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </Modal>
    );
}
