
import React, { useMemo, useState } from 'react';
import Modal from './Modal';
import { Asset, AssetStatus } from '../../types';
import { ArchiveBoxIcon } from '../icons/ArchiveBoxIcon';
import { CheckIcon } from '../icons/CheckIcon';
import { SearchIcon } from '../icons/SearchIcon';
import { BsRulers } from 'react-icons/bs';

interface MaterialAllocationModalProps {
    isOpen: boolean;
    onClose: () => void;
    itemName: string;
    brand: string;
    assets: Asset[]; // All assets from store
    onSelect: (assetId: string) => void;
    currentSelectedId?: string;
}

export const MaterialAllocationModal: React.FC<MaterialAllocationModalProps> = ({ 
    isOpen, onClose, itemName, brand, assets, onSelect, currentSelectedId 
}) => {
    const [searchQuery, setSearchQuery] = useState('');

    const availableStock = useMemo(() => {
        return assets
            .filter(a => 
                a.name === itemName && 
                a.brand === brand && 
                a.status === AssetStatus.IN_STORAGE
            )
            .sort((a, b) => new Date(a.registrationDate).getTime() - new Date(b.registrationDate).getTime()); // Default FIFO sort
    }, [assets, itemName, brand]);

    const filteredStock = useMemo(() => {
        if (!searchQuery) return availableStock;
        const q = searchQuery.toLowerCase();
        return availableStock.filter(a => 
            a.id.toLowerCase().includes(q) || 
            (a.location && a.location.toLowerCase().includes(q))
        );
    }, [availableStock, searchQuery]);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Pilih Sumber Stok: ${itemName}`}
            size="lg"
            hideDefaultCloseButton
            footerContent={
                <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">
                    Batal
                </button>
            }
        >
            <div className="space-y-4">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800 flex items-start gap-2">
                    <ArchiveBoxIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-bold">Mode Alokasi Manual</p>
                        <p className="text-xs mt-1">Pilih ID Aset spesifik (Drum/Box) yang akan digunakan. Jika tidak dipilih, sistem akan menggunakan metode FIFO (Masuk Pertama Keluar Pertama).</p>
                    </div>
                </div>

                <div className="relative">
                    <SearchIcon className="absolute w-4 h-4 text-gray-400 left-3 top-1/2 -translate-y-1/2" />
                    <input 
                        type="text" 
                        placeholder="Cari ID Aset atau Lokasi..." 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-tm-primary focus:border-tm-primary"
                    />
                </div>

                <div className="overflow-hidden border border-gray-200 rounded-lg max-h-64 overflow-y-auto custom-scrollbar">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID Aset</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lokasi</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tgl Masuk</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Sisa Saldo</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200 text-sm">
                            {filteredStock.length > 0 ? (
                                filteredStock.map(asset => {
                                    const balance = asset.currentBalance ?? asset.initialBalance ?? 1;
                                    const isSelected = currentSelectedId === asset.id;
                                    
                                    return (
                                        <tr key={asset.id} className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}>
                                            <td className="px-4 py-3 font-mono text-gray-700 font-medium">{asset.id}</td>
                                            <td className="px-4 py-3 text-gray-600">{asset.location || '-'}</td>
                                            <td className="px-4 py-3 text-gray-500">{new Date(asset.registrationDate).toLocaleDateString('id-ID')}</td>
                                            <td className="px-4 py-3 text-right font-bold text-gray-800 flex items-center justify-end gap-1">
                                                {balance.toLocaleString('id-ID')} <BsRulers className="w-3 h-3 text-gray-400" />
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {isSelected ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-bold text-blue-700 bg-blue-100 rounded-full border border-blue-200">
                                                        <CheckIcon className="w-3 h-3" /> Terpilih
                                                    </span>
                                                ) : (
                                                    <button 
                                                        onClick={() => { onSelect(asset.id); onClose(); }}
                                                        className="text-xs bg-white border border-gray-300 px-3 py-1.5 rounded hover:bg-gray-50 hover:text-tm-primary transition-colors shadow-sm font-medium"
                                                    >
                                                        Pilih
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500 italic">
                                        Tidak ada stok tersedia untuk material ini.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </Modal>
    );
};
