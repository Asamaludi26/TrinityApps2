
import React, { useState, useMemo, useRef } from 'react';
import { Asset, AssetStatus, PreviewData, AssetCondition, ActivityLogEntry } from '../../../types';
import { ClickableLink } from '../../../components/ui/ClickableLink';
import { RegisterIcon } from '../../../components/icons/RegisterIcon';
import { HandoverIcon } from '../../../components/icons/HandoverIcon';
import { CustomerIcon } from '../../../components/icons/CustomerIcon';
import { DismantleIcon } from '../../../components/icons/DismantleIcon';
import { TagIcon } from '../../../components/icons/TagIcon';
import { WrenchIcon } from '../../../components/icons/WrenchIcon';
import { SpinnerIcon } from '../../../components/icons/SpinnerIcon';
import { CheckIcon } from '../../../components/icons/CheckIcon';
import { InfoIcon } from '../../../components/icons/InfoIcon';
import { PencilIcon } from '../../../components/icons/PencilIcon';
import { CopyIcon } from '../../../components/icons/CopyIcon';
import { EyeIcon } from '../../../components/icons/EyeIcon';
import { DownloadIcon } from '../../../components/icons/DownloadIcon';
import { DollarIcon } from '../../../components/icons/DollarIcon';
import { ArchiveBoxIcon } from '../../../components/icons/ArchiveBoxIcon';
import { getAssetStatusClass } from '../../../utils/statusUtils';
import { calculateAssetDepreciation } from '../../../utils/depreciation';
import { PreviewRow } from './PreviewRow';
import { useNotification } from '../../../providers/NotificationProvider'; 
import { AssetLabel } from '../../../components/ui/AssetLabel'; 
import { BsRulers, BsClockHistory, BsFileEarmarkText, BsPersonBadge, BsFilePdf, BsImage, BsFileEarmark, BsLightningFill } from 'react-icons/bs';

// Stores Integration
import { useAssetStore } from '../../../stores/useAssetStore';
import { useMasterDataStore } from '../../../stores/useMasterDataStore';
import { useTransactionStore } from '../../../stores/useTransactionStore';
import { useAuthStore } from '../../../stores/useAuthStore'; // Added Auth Store

declare var html2canvas: any;

// --- Sub-Components ---

const SmartContextCard: React.FC<{ 
    asset: Asset, 
    onShowPreview: (data: PreviewData) => void,
    showSensitiveData: boolean 
}> = ({ asset, onShowPreview, showSensitiveData }) => {
    // Access Stores for Context Lookup
    const customers = useMasterDataStore(s => s.customers);
    const users = useMasterDataStore(s => s.users);
    const maintenances = useTransactionStore(s => s.maintenances);
    const installations = useTransactionStore(s => s.installations);

    // 1. Context: Customer Installation
    if (asset.status === AssetStatus.IN_USE && asset.currentUser?.startsWith('CUST-')) {
        const customer = customers.find(c => c.id === asset.currentUser);
        // Find latest installation doc for this customer that includes this asset
        const installationDoc = installations.find(i => 
            i.customerId === asset.currentUser && 
            (i.assetsInstalled.some(ai => ai.assetId === asset.id) || i.materialsUsed?.some(mi => mi.materialAssetId === asset.id))
        );

        return (
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 shadow-sm animate-fade-in-up">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><CustomerIcon className="w-5 h-5"/></div>
                    <div className="flex-1">
                        <h4 className="text-sm font-bold text-blue-900">Terpasang di Pelanggan</h4>
                        {customer ? (
                            <div className="mt-1 text-sm text-blue-800">
                                <p className="font-semibold">{customer.name}</p>
                                <p className="text-xs opacity-80">{customer.address}</p>
                                <div className="mt-2 flex gap-2">
                                    <button onClick={() => onShowPreview({ type: 'customer', id: customer.id })} className="text-xs bg-white px-2 py-1 rounded border border-blue-200 hover:bg-blue-100 font-medium transition-colors">
                                        Lihat Profil Pelanggan
                                    </button>
                                    {installationDoc && (
                                        <button onClick={() => onShowPreview({ type: 'installation', id: installationDoc.id })} className="text-xs bg-white px-2 py-1 rounded border border-blue-200 hover:bg-blue-100 font-medium transition-colors flex items-center gap-1">
                                            <BsFileEarmarkText/> Lihat Dokumen Instalasi
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <p className="text-xs text-red-500 mt-1">Data pelanggan ({asset.currentUser}) tidak ditemukan.</p>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // 2. Context: Internal User (Staff)
    // RESTRICTION: Only show this detailed card to Admins.
    if (asset.status === AssetStatus.IN_USE && showSensitiveData) {
        const user = users.find(u => u.name === asset.currentUser);
        return (
            <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 shadow-sm animate-fade-in-up">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg"><BsPersonBadge className="w-5 h-5"/></div>
                    <div className="flex-1">
                        <h4 className="text-sm font-bold text-indigo-900">Digunakan Oleh Staff</h4>
                        <div className="mt-1 text-sm text-indigo-800">
                            <p className="font-semibold">{asset.currentUser}</p>
                            {user && <p className="text-xs opacity-80">{user.role} - {user.email}</p>}
                            <p className="text-xs mt-1 text-indigo-600 italic">Lokasi: {asset.location || 'Tidak spesifik'}</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 3. Context: Maintenance / Repair
    if (asset.status === AssetStatus.UNDER_REPAIR || asset.status === AssetStatus.OUT_FOR_REPAIR || asset.status === AssetStatus.DAMAGED) {
        // Find active maintenance ticket
        const activeMnt = maintenances.find(m => 
            m.status !== 'Selesai' && 
            (m.assets?.some(a => a.assetId === asset.id) || m.problemDescription.includes(asset.name))
        );

        const isExternal = asset.status === AssetStatus.OUT_FOR_REPAIR;
        const colorClass = isExternal ? 'purple' : (asset.status === AssetStatus.DAMAGED ? 'red' : 'amber');
        
        return (
            <div className={`p-4 rounded-xl bg-${colorClass}-50 border border-${colorClass}-200 shadow-sm animate-fade-in-up`}>
                <div className="flex items-start gap-3">
                    <div className={`p-2 bg-${colorClass}-100 text-${colorClass}-600 rounded-lg`}>
                        <WrenchIcon className="w-5 h-5"/>
                    </div>
                    <div className="flex-1">
                        <h4 className={`text-sm font-bold text-${colorClass}-900`}>
                            {asset.status === AssetStatus.DAMAGED ? 'Rusak / Menunggu Perbaikan' : 
                             isExternal ? 'Sedang di Vendor (Eksternal)' : 'Dalam Perbaikan (Internal)'}
                        </h4>
                        
                        {activeMnt ? (
                             <div className={`mt-2 text-xs text-${colorClass}-800`}>
                                <p><strong>Tiket:</strong> {activeMnt.docNumber}</p>
                                <p><strong>Teknisi:</strong> {activeMnt.technician}</p>
                                <p className="mt-1 italic line-clamp-1">"{activeMnt.problemDescription}"</p>
                                <button onClick={() => onShowPreview({ type: 'maintenance', id: activeMnt.id })} className="mt-2 text-xs bg-white px-2 py-1 rounded border hover:opacity-80 font-medium transition-colors flex items-center gap-1">
                                    <BsFileEarmarkText/> Lihat Laporan
                                </button>
                            </div>
                        ) : (
                            <p className={`text-xs mt-1 text-${colorClass}-700 italic`}>Belum ada tiket maintenance aktif.</p>
                        )}
                    </div>
                </div>
            </div>
        );
    }
    
    // 4. Context: In Storage (Aging info) - Only for Admin
    if (asset.status === AssetStatus.IN_STORAGE && showSensitiveData) {
        // Calculate days in storage since last status change
        const lastActivity = [...asset.activityLog].reverse().find(a => a.action.includes('Status') || a.action.includes('Dicatat'));
        const lastDate = lastActivity ? new Date(lastActivity.timestamp) : new Date(asset.registrationDate);
        const daysInStorage = Math.floor((new Date().getTime() - lastDate.getTime()) / (1000 * 3600 * 24));
        
        return (
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 shadow-sm animate-fade-in-up">
                 <div className="flex items-start gap-3">
                    <div className="p-2 bg-gray-200 text-gray-600 rounded-lg"><BsClockHistory className="w-5 h-5"/></div>
                    <div>
                         <h4 className="text-sm font-bold text-gray-800">Tersedia di Gudang</h4>
                         <p className="text-xs text-gray-600 mt-1">
                             Lokasi: <span className="font-semibold">{asset.location}</span> {asset.locationDetail && `(${asset.locationDetail})`}
                         </p>
                         <p className="text-xs text-gray-500 mt-1">
                             Aging: <strong>{daysInStorage} hari</strong> sejak aktivitas terakhir.
                         </p>
                    </div>
                 </div>
            </div>
        )
    }

    return null;
};

const DepreciationCard: React.FC<{ asset: Asset }> = ({ asset }) => {
    const depreciation = useMemo(() => calculateAssetDepreciation(asset), [asset]);

    if (!depreciation) return null;

    return (
        <div className="p-4 mt-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
                <DollarIcon className="w-5 h-5 text-green-700" />
                <h3 className="text-sm font-bold text-green-800">Estimasi Nilai Aset (Depresiasi)</h3>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
                 <div>
                    <p className="text-xs text-green-600">Nilai Perolehan</p>
                    <p className="font-semibold text-gray-800">Rp {depreciation.initialValue.toLocaleString('id-ID')}</p>
                 </div>
                 <div>
                    <p className="text-xs text-green-600">Nilai Buku Saat Ini</p>
                    <p className="font-bold text-green-800 text-lg">Rp {depreciation.currentValue.toLocaleString('id-ID')}</p>
                 </div>
                 <div>
                    <p className="text-xs text-green-600">Umur Ekonomis</p>
                    <p className="text-gray-800">{depreciation.usefulLifeYears} Tahun ({depreciation.monthsPassed} bulan berjalan)</p>
                 </div>
                 <div>
                    <p className="text-xs text-green-600">Penyusutan per Bulan</p>
                    <p className="text-gray-800">Rp {depreciation.monthlyDepreciation.toLocaleString('id-ID')}</p>
                 </div>
            </div>
            {depreciation.isFullyDepreciated && (
                <div className="mt-3 px-2 py-1 text-xs font-semibold text-red-700 bg-red-100 rounded inline-block">
                    Aset telah habis masa manfaat ekonomisnya
                </div>
            )}
        </div>
    );
};

// --- Asset Label Card Wrapper ---
const AssetLabelCard: React.FC<{ asset: Asset }> = ({ asset }) => {
    const labelRef = useRef<HTMLDivElement>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const addNotification = useNotification();

    const handleDownloadLabel = async () => {
        if (!labelRef.current || typeof html2canvas === 'undefined') {
            addNotification('Library visualisasi belum siap.', 'error');
            return;
        }

        setIsProcessing(true);
        try {
            const canvas = await html2canvas(labelRef.current, {
                scale: 3, 
                useCORS: true,
                backgroundColor: '#ffffff'
            });
            
            const image = canvas.toDataURL("image/png");
            const link = document.createElement("a");
            link.href = image;
            link.download = `LABEL_${asset.id}.png`;
            link.click();
            addNotification('Label aset berhasil diunduh.', 'success');
        } catch (error) {
            console.error(error);
            addNotification('Gagal membuat gambar label.', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="mt-8 border-t pt-6 bg-gray-50/50 rounded-xl p-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                 <div>
                    <h3 className="text-base font-bold text-gray-800">Label Aset Digital</h3>
                    <p className="text-xs text-gray-500">Gunakan untuk identifikasi fisik aset.</p>
                 </div>
                 <div className="flex gap-2 mt-2 sm:mt-0 no-print">
                     <button 
                        onClick={handleDownloadLabel} 
                        disabled={isProcessing}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 disabled:opacity-50 transition-all"
                    >
                        {isProcessing ? <SpinnerIcon className="w-3.5 h-3.5" /> : <DownloadIcon className="w-3.5 h-3.5" />}
                        Unduh PNG
                     </button>
                 </div>
            </div>
            
            <div className="flex justify-center p-4 bg-gray-200/50 rounded-xl border border-gray-200 border-dashed">
                {/* Use the new Reusable Component, wrapped in a div for ref capture */}
                <div ref={labelRef}>
                    <AssetLabel asset={asset} />
                </div>
            </div>
            <p className="text-center text-[10px] text-gray-400 mt-2 no-print">
                Tips: Gunakan kertas stiker label ukuran 70mm x 40mm atau cetak pada kertas A4 lalu gunting.
            </p>
        </div>
    );
};

// --- Timeline Item Helper ---
const getLogStyle = (action: string) => {
    if (action.includes('Dicatat') || action.includes('Baru')) return { icon: RegisterIcon, bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-200' };
    if (action.includes('Serah Terima') || action.includes('Handover')) return { icon: HandoverIcon, bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' };
    if (action.includes('Instalasi')) return { icon: CustomerIcon, bg: 'bg-indigo-100', text: 'text-indigo-600', border: 'border-indigo-200' };
    if (action.includes('Dismantle')) return { icon: DismantleIcon, bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-200' };
    if (action.includes('Kerusakan')) return { icon: WrenchIcon, bg: 'bg-red-100', text: 'text-red-600', border: 'border-red-200' };
    if (action.includes('Perbaikan')) return { icon: SpinnerIcon, bg: 'bg-amber-100', text: 'text-amber-600', border: 'border-amber-200' };
    if (action.includes('Status')) return { icon: TagIcon, bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' };
    return { icon: InfoIcon, bg: 'bg-gray-50', text: 'text-gray-500', border: 'border-gray-200' };
};

// --- Main Asset Preview Component ---

interface AssetPreviewProps {
    asset: Asset;
    canViewPrice: boolean;
    onShowPreview: (data: PreviewData) => void;
    getCustomerName: (id: string) => string;
}

export const AssetPreview: React.FC<AssetPreviewProps> = ({ asset, canViewPrice, onShowPreview, getCustomerName }) => {
    const [activeTab, setActiveTab] = useState<'details' | 'history' | 'attachments'>('details');
    const allAssets = useAssetStore((state) => state.assets); // Access store for calculation
    const currentUser = useAuthStore((state) => state.currentUser);

    // SECURITY: Determine if user can see sensitive/operation details
    const isOpsAdmin = currentUser?.role === 'Admin Logistik' || currentUser?.role === 'Super Admin';
    
    // Logic: Identify if this is a "Potongan" (Child Asset)
    const isPotongan = asset.id.includes('-PART-') || asset.name.includes('(Potongan)');

    // Kalkulasi Stok Model yang Sama
    const stockStats = useMemo(() => {
        const sameModelAssets = allAssets.filter(a => a.name === asset.name && a.brand === asset.brand);
        const inStorageCount = sameModelAssets.filter(a => a.status === AssetStatus.IN_STORAGE).length;
        const totalCount = sameModelAssets.length;
        
        // Cek apakah item ini terukur (Measurement)
        const isMeasurement = asset.initialBalance !== undefined && asset.currentBalance !== undefined;
        
        return {
            inStorage: inStorageCount,
            total: totalCount,
            isMeasurement
        };
    }, [allAssets, asset]);

    // Calculate Measurement Progress for Staff View
    const measurementPercent = useMemo(() => {
        if (stockStats.isMeasurement && asset.initialBalance && asset.initialBalance > 0) {
            return Math.round(((asset.currentBalance || 0) / asset.initialBalance) * 100);
        }
        return 0;
    }, [asset, stockStats.isMeasurement]);

    return (
        <div>
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <button onClick={() => setActiveTab('details')} className={`py-3 px-1 border-b-2 text-sm font-medium ${activeTab === 'details' ? 'border-tm-primary text-tm-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Detail</button>
                    <button onClick={() => setActiveTab('history')} className={`py-3 px-1 border-b-2 text-sm font-medium ${activeTab === 'history' ? 'border-tm-primary text-tm-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Riwayat</button>
                    <button onClick={() => setActiveTab('attachments')} className={`py-3 px-1 border-b-2 text-sm font-medium ${activeTab === 'attachments' ? 'border-tm-primary text-tm-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Lampiran</button>
                </nav>
            </div>
            <div className="py-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                
                {activeTab === 'details' && (
                    <div className="space-y-6">
                        {/* SMART CONTEXT CARD */}
                        <SmartContextCard asset={asset} onShowPreview={onShowPreview} showSensitiveData={isOpsAdmin} />

                         {/* STOCK INFO CARD - ONLY FOR OPS ADMIN & NOT FOR POTONGAN */}
                        {isOpsAdmin && !isPotongan && (
                            <div className={`flex items-start gap-4 p-4 rounded-xl border ${stockStats.inStorage > 0 ? 'bg-blue-50/50 border-blue-200' : 'bg-red-50/50 border-red-200'}`}>
                                <div className={`p-2 rounded-full ${stockStats.inStorage > 0 ? 'bg-blue-100 text-blue-600' : 'bg-red-100 text-red-600'}`}>
                                    <ArchiveBoxIcon className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <h4 className={`text-sm font-bold ${stockStats.inStorage > 0 ? 'text-blue-800' : 'text-red-800'}`}>
                                        Statistik Stok Gudang
                                    </h4>
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-6 mt-1">
                                        <div className="text-xs text-gray-600">
                                            Unit Sejenis Tersedia: <strong className="text-gray-900">{stockStats.inStorage}</strong> / {stockStats.total}
                                        </div>
                                        {stockStats.isMeasurement && (
                                            <div className="flex items-center gap-1.5 text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                                <BsRulers className="w-3 h-3"/>
                                                <span>Sisa Isi Unit Ini: <strong>{asset.currentBalance?.toLocaleString('id-ID')}</strong> (Awal: {asset.initialBalance?.toLocaleString('id-ID')})</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* MEASUREMENT INFO CARD - FOR POTONGAN ITEMS */}
                        {stockStats.isMeasurement && (
                            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded">
                                        <BsRulers className="w-4 h-4"/>
                                    </div>
                                    <h4 className="text-sm font-bold text-gray-800">Status Fisik Unit Ini</h4>
                                </div>
                                
                                <div className="space-y-3">
                                    <div className="flex justify-between items-end text-sm">
                                        <span className="text-gray-500">Sisa Pemakaian:</span>
                                        <div className="text-right">
                                            <span className="font-bold text-gray-900 text-lg">{asset.currentBalance?.toLocaleString('id-ID')}</span>
                                            <span className="text-gray-500 text-xs ml-1">/ {asset.initialBalance?.toLocaleString('id-ID')}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-500 ${
                                                measurementPercent < 20 ? 'bg-red-500' : 
                                                measurementPercent < 50 ? 'bg-amber-400' : 
                                                'bg-green-500'
                                            }`}
                                            style={{ width: `${measurementPercent}%` }}
                                        ></div>
                                    </div>
                                    
                                    <p className="text-xs text-gray-400 text-center italic">
                                        {measurementPercent < 20 ? 'Unit ini hampir habis. Harap lapor jika perlu restock.' : 'Kondisi isi masih mencukupi.'}
                                    </p>
                                </div>
                            </div>
                        )}

                        <div>
                            <h3 className="text-base font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">Informasi Dasar</h3>
                            <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                                <PreviewRow label="ID Aset" value={asset.id} />
                                <PreviewRow label="Kategori" value={asset.category} />
                                <PreviewRow label="Tipe" value={asset.type} />
                                <PreviewRow label="Brand" value={asset.brand} />
                                <PreviewRow label="Nomor Seri">
                                    <div className="flex items-center gap-2 font-mono">
                                        <span>{asset.serialNumber || '-'}</span>
                                        {asset.serialNumber && <button onClick={() => navigator.clipboard.writeText(asset.serialNumber!)} title="Salin" className="text-gray-400 hover:text-tm-primary"><CopyIcon className="w-3 h-3"/></button>}
                                    </div>
                                </PreviewRow>
                                <PreviewRow label="MAC Address">
                                    <div className="flex items-center gap-2 font-mono">
                                        <span>{asset.macAddress || '-'}</span>
                                            {asset.macAddress && <button onClick={() => navigator.clipboard.writeText(asset.macAddress!)} title="Salin" className="text-gray-400 hover:text-tm-primary"><CopyIcon className="w-3 h-3"/></button>}
                                    </div>
                                </PreviewRow>
                            </dl>
                        </div>
                        {canViewPrice && (
                            <div>
                                <h3 className="text-base font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">Informasi Pembelian</h3>
                                <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                                    <PreviewRow label="Tgl Pembelian" value={asset.purchaseDate} />
                                    <PreviewRow label="Harga Beli" value={asset.purchasePrice ? `Rp ${asset.purchasePrice.toLocaleString('id-ID')}` : '-'} />
                                    <PreviewRow label="Vendor" value={asset.vendor} />
                                    <PreviewRow label="Akhir Garansi" value={asset.warrantyEndDate} />
                                    <PreviewRow label="No. PO" value={<ClickableLink onClick={() => onShowPreview({type: 'request', id: asset.poNumber!})}>{asset.poNumber}</ClickableLink>} />
                                    <PreviewRow label="No. Invoice" value={asset.invoiceNumber} />
                                </dl>
                                <DepreciationCard asset={asset} />
                            </div>
                        )}
                        <div>
                            <h3 className="text-base font-semibold text-gray-800 border-b border-gray-200 pb-2 mb-4">Status & Lokasi</h3>
                            <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
                                <PreviewRow label="Status Saat Ini" value={<span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getAssetStatusClass(asset.status as AssetStatus)}`}>{asset.status}</span>} />
                                <PreviewRow label="Kondisi" value={asset.condition} />
                                <PreviewRow label="Lokasi" value={asset.location} />
                                <PreviewRow label="Detail Lokasi" value={asset.locationDetail} />
                                
                                {/* HIDE USER for NON-ADMINS unless it's external customer */}
                                {(isOpsAdmin || asset.currentUser?.startsWith('TMI-')) && (
                                    <PreviewRow label="Pengguna Saat Ini">
                                        {asset.currentUser?.startsWith('TMI-') ? (
                                            <ClickableLink onClick={() => onShowPreview({type: 'customer', id: asset.currentUser!})}>
                                                {getCustomerName(asset.currentUser)}
                                            </ClickableLink>
                                        ) : asset.currentUser ? (
                                            <ClickableLink onClick={() => onShowPreview({type: 'user', id: asset.currentUser!})}>
                                                {asset.currentUser}
                                            </ClickableLink>
                                        ) : '-'}
                                    </PreviewRow>
                                )}

                                <PreviewRow label="Dicatat oleh" value={asset.recordedBy} fullWidth />
                                <PreviewRow label="Catatan" value={asset.notes} fullWidth />
                            </dl>
                        </div>
                        
                        {/* New Asset Label Section */}
                        <AssetLabelCard asset={asset} />
                    </div>
                )}
                
                {/* IMPROVED HISTORY TAB */}
                {activeTab === 'history' && (
                    <div className="relative border-l-2 border-gray-200 ml-4 space-y-8">
                        {asset.activityLog.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((log) => {
                            const { icon: LogIcon, bg, text, border } = getLogStyle(log.action);
                            
                            // Determine link target based on referenceId format
                            const getLinkTarget = (refId: string) => {
                                if (refId.startsWith('HO')) return 'handover';
                                if (refId.startsWith('DSM')) return 'dismantle';
                                if (refId.startsWith('RO') || refId.startsWith('RL') || refId.startsWith('RR')) return 'request';
                                if (refId.startsWith('INST')) return 'installation';
                                if (refId.startsWith('MNT')) return 'maintenance';
                                return null;
                            };
                            
                            const linkType = log.referenceId ? getLinkTarget(log.referenceId) : null;

                            return (
                                <div key={log.id} className="relative ml-6">
                                    {/* Timeline Dot */}
                                    <div className={`absolute -left-[37px] top-1 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-white ${border} ${text}`}>
                                        <LogIcon className="h-4 w-4" />
                                    </div>
                                    
                                    {/* Content Card */}
                                    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2">
                                            <h3 className="text-sm font-bold text-gray-900">{log.action}</h3>
                                            <time className="text-xs text-gray-400 font-mono">
                                                {new Date(log.timestamp).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}
                                            </time>
                                        </div>
                                        
                                        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100/50 mb-3">
                                            {log.details}
                                        </div>
                                        
                                        <div className="flex items-center justify-between mt-2">
                                            <div className="flex items-center gap-2 text-xs">
                                                <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-[10px]">
                                                    {log.user.charAt(0)}
                                                </div>
                                                <span className="font-medium text-gray-500">{log.user}</span>
                                            </div>
                                            
                                            {log.referenceId && linkType && (
                                                <button 
                                                    onClick={() => onShowPreview({ type: linkType as any, id: log.referenceId! })} 
                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 hover:text-blue-800 transition-colors"
                                                >
                                                    <BsFileEarmarkText className="w-3 h-3"/>
                                                    Buka Dokumen: {log.referenceId}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {asset.activityLog.length === 0 && (
                            <div className="ml-6 py-8 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                <InfoIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                Belum ada riwayat aktivitas.
                            </div>
                        )}
                    </div>
                )}

                {/* IMPROVED ATTACHMENTS TAB */}
                {activeTab === 'attachments' && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {asset.attachments.length > 0 ? asset.attachments.map(att => (
                            <div key={att.id} className="group relative bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                                <div className="aspect-w-16 aspect-h-10 bg-gray-100 flex items-center justify-center overflow-hidden">
                                    {att.type === 'image' ? (
                                        <img src={att.url} alt={att.name} className="object-cover w-full h-32 group-hover:scale-105 transition-transform duration-500" />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                                            <BsFilePdf className="w-10 h-10 mb-2" />
                                            <span className="text-[10px] uppercase font-bold">Dokumen</span>
                                        </div>
                                    )}
                                </div>
                                <div className="p-3">
                                    <p className="text-xs font-semibold text-gray-800 truncate mb-2" title={att.name}>{att.name}</p>
                                    <div className="flex gap-2">
                                        <a href={att.url} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-bold text-gray-600 bg-gray-50 rounded hover:bg-gray-100 hover:text-tm-primary transition-colors border border-gray-200">
                                            <EyeIcon className="w-3 h-3" /> Lihat
                                        </a>
                                        <a href={att.url} download={att.name} className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-bold text-gray-600 bg-gray-50 rounded hover:bg-gray-100 hover:text-tm-primary transition-colors border border-gray-200">
                                            <DownloadIcon className="w-3 h-3" /> Unduh
                                        </a>
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="col-span-full py-12 text-center text-gray-500 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                <BsImage className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                                <p>Tidak ada lampiran.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
