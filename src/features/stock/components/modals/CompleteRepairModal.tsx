import React, { useState, useEffect } from 'react';
import { Asset, AssetCondition } from '../../../../types';
import Modal from '../../../../components/ui/Modal';
import { SpinnerIcon } from '../../../../components/icons/SpinnerIcon';
import { CustomSelect } from '../../../../components/ui/CustomSelect';

interface CompleteRepairModalProps {
    isOpen: boolean;
    onClose: () => void;
    asset: Asset | null;
    onSubmit: (asset: Asset, data: { newCondition: AssetCondition; repairNotes: string; repairCost: number | null, actionsTaken: string[] }) => void;
}

export const CompleteRepairModal: React.FC<CompleteRepairModalProps> = ({ isOpen, onClose, asset, onSubmit }) => {
    const [newCondition, setNewCondition] = useState<AssetCondition>(AssetCondition.GOOD);
    const [repairNotes, setRepairNotes] = useState('');
    const [repairCost, setRepairCost] = useState<number | ''>('');
    const [actionsTaken, setActionsTaken] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setNewCondition(AssetCondition.GOOD);
            setRepairNotes('');
            setRepairCost('');
            setActionsTaken('');
        }
    }, [isOpen]);

    const conditionOptions = [
        { value: AssetCondition.GOOD, label: 'Baik' },
        { value: AssetCondition.USED_OKAY, label: 'Bekas Layak Pakai' },
    ];
    
    const handleSubmit = () => {
        if (!asset) return;
        setIsLoading(true);
        setTimeout(() => {
            onSubmit(asset, { 
                newCondition,
                repairNotes,
                repairCost: repairCost === '' ? null : Number(repairCost),
                actionsTaken: actionsTaken.split(',').map(s => s.trim()).filter(Boolean)
            });
            setIsLoading(false);
            onClose();
        }, 1000);
    };

    if (!asset) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Selesaikan Perbaikan: ${asset.name}`}
            size="lg"
            hideDefaultCloseButton
            footerContent={
                <>
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Batal</button>
                    <button onClick={handleSubmit} disabled={isLoading} className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-success rounded-lg shadow-sm hover:bg-green-700 disabled:bg-green-300">
                        {isLoading && <SpinnerIcon className="w-4 h-4 mr-2" />}
                        Konfirmasi Selesai
                    </button>
                </>
            }
        >
            <div className="space-y-6">
                <p className="text-sm text-gray-600">Aset akan dikembalikan ke status "Digunakan". Harap isi detail penyelesaian perbaikan.</p>
                <div>
                    <label htmlFor="new-condition" className="block text-sm font-medium text-gray-700">Kondisi Baru</label>
                    <div className="mt-1">
                        <CustomSelect options={conditionOptions} value={newCondition} onChange={(v) => setNewCondition(v as AssetCondition)} />
                    </div>
                </div>
                 <div>
                    <label htmlFor="actions-taken" className="block text-sm font-medium text-gray-700">Tindakan yang Diambil (pisahkan dengan koma)</label>
                    <textarea
                        id="actions-taken"
                        rows={2}
                        value={actionsTaken}
                        onChange={(e) => setActionsTaken(e.target.value)}
                        className="block w-full px-3 py-2 mt-1 text-gray-900 placeholder:text-gray-400 bg-gray-50 border border-gray-300 rounded-lg shadow-sm sm:text-sm focus:ring-tm-accent focus:border-tm-accent"
                        placeholder="Contoh: Ganti kapasitor, Bersihkan debu"
                    ></textarea>
                </div>
                <div>
                    <label htmlFor="repair-notes-complete" className="block text-sm font-medium text-gray-700">Catatan Penyelesaian</label>
                    <textarea
                        id="repair-notes-complete"
                        rows={3}
                        value={repairNotes}
                        onChange={(e) => setRepairNotes(e.target.value)}
                        className="block w-full px-3 py-2 mt-1 text-gray-900 placeholder:text-gray-400 bg-gray-50 border border-gray-300 rounded-lg shadow-sm sm:text-sm focus:ring-tm-accent focus:border-tm-accent"
                        placeholder="Contoh: Komponen X berhasil diganti, unit berfungsi normal."
                    ></textarea>
                </div>
                 <div>
                    <label htmlFor="repair-cost" className="block text-sm font-medium text-gray-700">Biaya Perbaikan (Rp) - Opsional</label>
                    <input
                        type="number"
                        id="repair-cost"
                        value={repairCost}
                        onChange={(e) => setRepairCost(e.target.value === '' ? '' : Number(e.target.value))}
                        className="block w-full px-3 py-2 mt-1 text-gray-900 placeholder:text-gray-400 bg-gray-50 border border-gray-300 rounded-lg shadow-sm sm:text-sm focus:ring-tm-accent focus:border-tm-accent"
                        placeholder="Contoh: 50000"
                    />
                </div>
            </div>
        </Modal>
    );
};
