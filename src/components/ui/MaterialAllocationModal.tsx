
import React, { useMemo, useState } from 'react';
import Modal from './Modal';
import { Asset, AssetStatus, User } from '../../types';
import { ArchiveBoxIcon } from '../icons/ArchiveBoxIcon';
import { CheckIcon } from '../icons/CheckIcon';
import { SearchIcon } from '../icons/SearchIcon';
import { BsRulers, BsPersonBadge, BsBuilding, BsExclamationCircle } from 'react-icons/bs';

interface MaterialAllocationModalProps {
    isOpen: boolean;
    onClose: () => void;
    itemName: string;
    brand: string;
    assets: Asset[]; // All assets from store
    onSelect: (asset: Asset) => void; // Changed to return full Asset object
    currentSelectedId?: string;
    currentUser: User; // User Login Context (Admin/Staff)
    ownerName?: string; // Target Owner Context (Teknisi yang dipilih di form)
}

export const MaterialAllocationModal: React.FC<MaterialAllocationModalProps> = ({ 
    isOpen, onClose, itemName, brand, assets, onSelect, currentSelectedId, currentUser, ownerName
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    // Mode: 'personal' (Stok Teknisi) atau 'warehouse' (Gudang Utama - Admin Only)
    const [sourceMode, setSourceMode] = useState<'personal' | 'warehouse'>('personal');

    const isAdmin = currentUser.role === 'Admin Logistik' || currentUser.role === 'Super Admin';
    
    // Tentukan siapa pemilik stok yang sedang dilihat
    // Jika ownerName ada (dari form), gunakan itu. Jika tidak, fallback ke currentUser (login)
    const effectiveOwnerName = ownerName || currentUser.name;

    const availableStock = useMemo(() => {
        // Normalisasi input pencarian agar case-insensitive
        const targetName = itemName.trim().toLowerCase();
        const targetBrand = brand.trim().toLowerCase();
        const targetOwner = effectiveOwnerName.trim().toLowerCase();

        return assets
            .filter(a => {
                // 1. Validasi Nama Barang & Brand
                const assetName = a.name.toLowerCase();
                const assetBrand = (a.brand || '').toLowerCase();
                
                // Flexible match: Nama harus mengandung kata kunci item (atau exact match)
                const isItemMatch = assetName.includes(targetName) || targetName.includes(assetName);
                const isBrandMatch = !targetBrand || assetBrand.includes(targetBrand);

                if (!isItemMatch || !isBrandMatch) return false;

                // 2. Filter Berdasarkan Mode Sumber
                if (sourceMode === 'personal') {
                    // Cari stok yang dipegang teknisi yang dipilih
                    const assetUser = (a.currentUser || '').toLowerCase();
                    
                    // Logic: Match Nama User
                    const isOwner = assetUser === targetOwner;
                    
                    // Status yang valid untuk stok di tangan teknisi:
                    // IN_CUSTODY = Dipegang (belum terpasang)
                    // IN_USE = Bisa jadi alat kerja atau stok lama yang belum diupdate statusnya
                    const isValidStatus = a.status === AssetStatus.IN_CUSTODY || a.status === AssetStatus.IN_USE;

                    return isOwner && isValidStatus;
                } else {
                    // Mode Warehouse: Hanya cari yang di Gudang Utama
                    return a.status === AssetStatus.IN_STORAGE;
                }
            })
            .sort((a, b) => {
                // Prioritaskan sisa saldo terkecil (menghabiskan sisa potong) untuk efisiensi
                const balanceA = a.currentBalance ?? a.initialBalance ?? 0;
                const balanceB = b.currentBalance ?? b.initialBalance ?? 0;
                return balanceA - balanceB;
            });
    }, [assets, itemName, brand, sourceMode, effectiveOwnerName]);

    const filteredStock = useMemo(() => {
        if (!searchQuery) return availableStock;
        const q = searchQuery.toLowerCase();
        return availableStock.filter(a => 
            a.id.toLowerCase().includes(q) || 
            (a.location && a.location.toLowerCase().includes(q)) ||
            (a.serialNumber && a.serialNumber.toLowerCase().includes(q))
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
                {/* Source Switcher (Only visible for Admins who might need to switch context) */}
                {isAdmin && (
                    <div className="flex p-1 bg-gray-100 rounded-lg mb-2">
                        <button 
                            onClick={() => setSourceMode('personal')}
                            className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-bold rounded-md transition-all ${sourceMode === 'personal' ? 'bg-white text-tm-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <BsPersonBadge /> Stok Teknisi ({effectiveOwnerName})
                        </button>
                        <button 
                            onClick={() => setSourceMode('warehouse')}
                            className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-bold rounded-md transition-all ${sourceMode === 'warehouse' ? 'bg-white text-tm-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <BsBuilding /> Gudang Utama
                        </button>
                    </div>
                )}

                <div className={`p-3 border rounded-lg text-sm flex items-start gap-3 ${sourceMode === 'personal' ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                    <div className={`p-2 rounded-full ${sourceMode === 'personal' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
                        <ArchiveBoxIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="font-bold">{sourceMode === 'personal' ? `Menggunakan Stok: ${effectiveOwnerName}` : 'Mengambil dari Gudang'}</p>
                        <p className="text-xs mt-1 leading-relaxed opacity-90">
                            {sourceMode === 'personal' 
                                ? `Menampilkan material "${itemName}" yang saat ini tercatat dipegang oleh ${effectiveOwnerName}.` 
                                : `Menampilkan material "${itemName}" yang tersedia di Gudang Utama.`}
                        </p>
                    </div>
                </div>

                <div className="relative">
                    <SearchIcon className="absolute w-4 h-4 text-gray-400 left-3 top-1/2 -translate-y-1/2" />
                    <input 
                        type="text" 
                        placeholder="Cari ID Aset, Serial Number, atau Lokasi..." 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-tm-primary focus:border-tm-primary transition-all"
                    />
                </div>

                <div className="overflow-hidden border border-gray-200 rounded-lg max-h-64 overflow-y-auto custom-scrollbar">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID Aset / SN</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lokasi / Status</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Sisa Saldo</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200 text-sm">
                            {filteredStock.length > 0 ? (
                                filteredStock.map(asset => {
                                    const balance = asset.currentBalance ?? asset.initialBalance ?? 1;
                                    const isSelected = currentSelectedId === asset.id;
                                    const isMeasurement = asset.initialBalance !== undefined;
                                    
                                    return (
                                        <tr key={asset.id} className={`hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}>
                                            <td className="px-4 py-3">
                                                <div className="font-mono text-gray-700 font-bold text-xs">{asset.id}</div>
                                                {asset.serialNumber && <div className="text-[10px] text-gray-500">SN: {asset.serialNumber}</div>}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="text-gray-800 text-xs font-medium">{asset.location || '-'}</div>
                                                <div className="text-[10px] text-gray-500 uppercase inline-block bg-gray-100 px-1.5 rounded mt-0.5">{asset.status}</div>
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-gray-800">
                                                <div className="flex items-center justify-end gap-1">
                                                    {balance.toLocaleString('id-ID')} 
                                                    {isMeasurement && <BsRulers className="w-3 h-3 text-gray-400" />}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {isSelected ? (
                                                    <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-bold text-blue-700 bg-blue-100 rounded-full border border-blue-200">
                                                        <CheckIcon className="w-3 h-3" /> Terpilih
                                                    </span>
                                                ) : (
                                                    <button 
                                                        onClick={() => { onSelect(asset); onClose(); }}
                                                        className="text-xs bg-white border border-gray-300 px-3 py-1.5 rounded hover:bg-tm-primary hover:text-white hover:border-tm-primary transition-all shadow-sm font-medium"
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
                                    <td colSpan={4} className="px-4 py-12 text-center">
                                        <div className="flex flex-col items-center justify-center text-gray-400">
                                            <BsExclamationCircle className="w-8 h-8 mb-2 opacity-50" />
                                            <p className="text-sm font-medium text-gray-600">Stok Tidak Ditemukan</p>
                                            <p className="text-xs mt-1 max-w-xs mx-auto text-gray-500">
                                                {sourceMode === 'personal' 
                                                    ? `Teknisi ${effectiveOwnerName} tidak memiliki stok "${itemName}" dengan status Dipegang/Custody.` 
                                                    : "Stok gudang kosong untuk item ini."}
                                            </p>
                                        </div>
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
