
import React, { useMemo, useState } from 'react';
import Modal from './Modal';
import { Asset, AssetStatus, User } from '../../types';
import { ArchiveBoxIcon } from '../icons/ArchiveBoxIcon';
import { CheckIcon } from '../icons/CheckIcon';
import { SearchIcon } from '../icons/SearchIcon';
import { 
    BsRulers, 
    BsPersonBadge, 
    BsBuilding, 
    BsExclamationCircle, 
    BsStarFill, 
    BsBoxSeam
} from 'react-icons/bs';

interface MaterialAllocationModalProps {
    isOpen: boolean;
    onClose: () => void;
    itemName: string;
    brand: string;
    assets: Asset[]; // All assets from store
    onSelect: (asset: Asset) => void;
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
    const effectiveOwnerName = ownerName || currentUser.name;

    // --- SMART LOGIC ---
    const availableStock = useMemo(() => {
        const targetName = itemName.trim().toLowerCase();
        const targetBrand = brand.trim().toLowerCase();
        const targetOwner = effectiveOwnerName.trim().toLowerCase();

        const filtered = assets
            .filter(a => {
                // 1. Validasi Nama & Brand
                const assetName = a.name.toLowerCase();
                const assetBrand = (a.brand || '').toLowerCase();
                const isItemMatch = assetName.includes(targetName) || targetName.includes(assetName);
                const isBrandMatch = !targetBrand || assetBrand.includes(targetBrand);

                if (!isItemMatch || !isBrandMatch) return false;

                // 2. Filter Berdasarkan Mode Sumber
                if (sourceMode === 'personal') {
                    const assetUser = (a.currentUser || '').toLowerCase();
                    const isOwner = assetUser === targetOwner;
                    const isValidStatus = a.status === AssetStatus.IN_CUSTODY || a.status === AssetStatus.IN_USE;
                    return isOwner && isValidStatus;
                } else {
                    return a.status === AssetStatus.IN_STORAGE;
                }
            })
            // 3. Logic Sort Cerdas (FIFO Priority)
            // Aset lama (tanggal masuk lebih awal) muncul duluan agar stok lama terpakai.
            .sort((a, b) => {
                // Utamakan yang ada isinya (>0)
                const balA = a.currentBalance ?? a.initialBalance ?? 0;
                const balB = b.currentBalance ?? b.initialBalance ?? 0;
                if (balA > 0 && balB <= 0) return -1;
                if (balA <= 0 && balB > 0) return 1;

                // FIFO (First In First Out)
                return new Date(a.registrationDate).getTime() - new Date(b.registrationDate).getTime();
            });
            
        return filtered;
    }, [assets, itemName, brand, sourceMode, effectiveOwnerName]);

    const filteredStock = useMemo(() => {
        let results = availableStock;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            results = results.filter(a => 
                a.id.toLowerCase().includes(q) || 
                (a.location && a.location.toLowerCase().includes(q)) ||
                (a.serialNumber && a.serialNumber.toLowerCase().includes(q))
            );
        }
        return results;
    }, [availableStock, searchQuery]);

    // Recommend the first valid item (FIFO Logic)
    const recommendedId = filteredStock.length > 0 ? filteredStock[0].id : null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Pilih Sumber Stok`}
            size="3xl"
            hideDefaultCloseButton
            footerContent={
                <div className="flex justify-between items-center w-full">
                    <p className="text-xs text-gray-500 italic font-medium">
                        *Menampilkan stok berdasarkan metode FIFO (First-In-First-Out)
                    </p>
                    <button onClick={onClose} className="px-6 py-2.5 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-xl shadow-sm hover:bg-gray-50 transition-all font-sans">
                        Batal
                    </button>
                </div>
            }
        >
            <div className="space-y-6">
                
                {/* Header Info Item */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-gray-50 p-5 rounded-2xl border border-gray-200 gap-4 shadow-sm">
                    <div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Item yang dialokasikan</p>
                        <h3 className="font-display font-bold text-gray-900 text-xl leading-tight">{itemName}</h3>
                        <p className="text-sm font-medium text-gray-600 mt-0.5">{brand}</p>
                    </div>
                    {/* Source Switcher */}
                    {isAdmin && (
                        <div className="flex bg-white p-1.5 rounded-xl border border-gray-200 shadow-sm shrink-0">
                            <button 
                                onClick={() => setSourceMode('personal')}
                                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${sourceMode === 'personal' ? 'bg-tm-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                            >
                                <BsPersonBadge className="w-3.5 h-3.5" /> Stok Teknisi
                            </button>
                            <button 
                                onClick={() => setSourceMode('warehouse')}
                                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${sourceMode === 'warehouse' ? 'bg-tm-primary text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                            >
                                <BsBuilding className="w-3.5 h-3.5" /> Gudang Utama
                            </button>
                        </div>
                    )}
                </div>

                {/* Search Bar */}
                <div className="relative group">
                    <SearchIcon className="absolute w-5 h-5 text-gray-400 left-4 top-1/2 -translate-y-1/2 group-focus-within:text-tm-primary transition-colors" />
                    <input 
                        type="text" 
                        placeholder="Cari ID Aset, Serial Number, atau Lokasi..." 
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3.5 text-sm font-medium border border-gray-200 rounded-xl bg-white shadow-sm focus:ring-2 focus:ring-tm-primary/20 focus:border-tm-primary transition-all outline-none font-sans"
                    />
                </div>

                {/* Stock List (Grid Layout for 3xl Modal) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[65vh] overflow-y-auto custom-scrollbar p-1">
                    {filteredStock.length > 0 ? (
                        filteredStock.map((asset, index) => {
                            const balance = asset.currentBalance ?? asset.initialBalance ?? 1;
                            const initial = asset.initialBalance ?? 1;
                            const isMeasurement = asset.initialBalance !== undefined;
                            const percentage = isMeasurement ? Math.min(100, Math.max(0, (balance / initial) * 100)) : 100;
                            
                            const isSelected = currentSelectedId === asset.id;
                            const isRecommended = asset.id === recommendedId && !isSelected;
                            const isEmpty = balance <= 0;

                            return (
                                <div 
                                    key={asset.id} 
                                    onClick={() => {
                                        if (!isEmpty) {
                                            onSelect(asset);
                                            onClose();
                                        }
                                    }}
                                    className={`
                                        group relative flex flex-col justify-between p-5 rounded-2xl border-2 transition-all duration-200 h-full
                                        ${isSelected 
                                            ? 'border-tm-primary bg-blue-50/60 shadow-md ring-2 ring-tm-primary/10' 
                                            : isEmpty 
                                                ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed' 
                                                : 'border-gray-200 bg-white hover:border-tm-primary/50 hover:shadow-lg cursor-pointer'
                                        }
                                    `}
                                >
                                    {/* Recommendation Badge */}
                                    {isRecommended && !isEmpty && (
                                        <div className="absolute -top-3 right-4 bg-amber-100 text-amber-800 text-[10px] font-bold px-3 py-1 rounded-full border border-amber-200 flex items-center gap-1 shadow-sm z-10">
                                            <BsStarFill className="text-amber-500" /> Rekomendasi
                                        </div>
                                    )}

                                    {/* Top: Asset Info */}
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${isSelected ? 'bg-tm-primary text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-blue-50 group-hover:text-tm-primary transition-colors'}`}>
                                            <ArchiveBoxIcon className="w-6 h-6" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="font-display font-bold text-gray-900 text-base truncate">{asset.id}</p>
                                                {asset.serialNumber && (
                                                    <span className="text-[10px] font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded border border-gray-200 truncate max-w-[100px]">
                                                        SN: {asset.serialNumber}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className="text-xs font-medium text-gray-500 flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded-md">
                                                    <BsBuilding className="w-3 h-3"/> {asset.location || '-'}
                                                </span>
                                                <span className="text-xs text-gray-400">•</span>
                                                <span className="text-xs text-gray-500">{new Date(asset.registrationDate).toLocaleDateString('id-ID', {month: 'short', year: '2-digit'})}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bottom: Balance & Action */}
                                    <div className="flex items-end justify-between pt-3 border-t border-gray-100 mt-auto">
                                        <div className="flex-1 mr-4">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Sisa Saldo</p>
                                            <div className="flex items-baseline gap-1">
                                                <p className={`font-display text-2xl font-bold leading-none ${isEmpty ? 'text-red-500' : 'text-gray-900'}`}>
                                                    {balance.toLocaleString('id-ID')}
                                                </p>
                                                <span className="text-xs text-gray-500 font-medium">
                                                    {isMeasurement ? <BsRulers className="inline w-3 h-3"/> : <BsBoxSeam className="inline w-3 h-3"/>}
                                                </span>
                                            </div>
                                            
                                            {/* Progress Bar for Measurement */}
                                            {isMeasurement && (
                                                <div className="mt-2 w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full rounded-full ${percentage < 30 ? 'bg-red-500' : 'bg-emerald-500'}`} 
                                                        style={{ width: `${percentage}%` }}
                                                    ></div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="shrink-0">
                                            {isSelected ? (
                                                <div className="w-9 h-9 bg-tm-primary text-white rounded-full flex items-center justify-center shadow-lg transform scale-110">
                                                    <CheckIcon className="w-5 h-5" />
                                                </div>
                                            ) : (
                                                <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all ${isEmpty ? 'border-gray-200 text-gray-300' : 'border-gray-300 text-gray-300 group-hover:border-tm-primary group-hover:text-tm-primary group-hover:bg-blue-50'}`}>
                                                    <div className={`w-3.5 h-3.5 rounded-full ${isEmpty ? '' : 'bg-current opacity-0 group-hover:opacity-100'}`}></div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 text-center bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                            <BsExclamationCircle className="w-12 h-12 text-gray-300 mb-4" />
                            <h4 className="font-display font-bold text-gray-700 text-lg">Stok Tidak Ditemukan</h4>
                            <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">
                                {sourceMode === 'personal' 
                                    ? `Tidak ada stok "${itemName}" yang tercatat dipegang oleh ${effectiveOwnerName}.` 
                                    : `Stok gudang kosong untuk "${itemName}" atau tidak sesuai pencarian.`}
                            </p>
                            {isAdmin && (
                                <button 
                                    onClick={() => setSourceMode(sourceMode === 'personal' ? 'warehouse' : 'personal')}
                                    className="mt-6 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-bold text-tm-primary hover:bg-blue-50 transition-colors shadow-sm"
                                >
                                    Cek di {sourceMode === 'personal' ? 'Gudang Utama' : 'Stok Teknisi'}?
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};
