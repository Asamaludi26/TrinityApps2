
import React, { useState, useMemo } from 'react';
import { Asset, AssetStatus, PreviewData } from '../../../types';
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
import { getAssetStatusClass } from '../../../utils/statusUtils';
import { calculateAssetDepreciation } from '../../../utils/depreciation';
import { PreviewRow } from './PreviewRow';

// --- Sub-Components ---

const RepairStatusCard: React.FC<{ asset: Asset }> = ({ asset }) => {
    const repairInfo = useMemo(() => {
        const reportLog = [...(asset.activityLog || [])].reverse().find(log => log.action === 'Kerusakan Dilaporkan');
        const startLog = [...(asset.activityLog || [])].reverse().find(log => log.action === 'Proses Perbaikan Dimulai');

        const originalReport = reportLog?.details.match(/deskripsi: "(.*?)"/)?.[1] || 'Tidak ada deskripsi.';
        const reporter = reportLog?.user || 'N/A';
        const reportDate = reportLog ? new Date(reportLog.timestamp).toLocaleString('id-ID') : 'N/A';
        
        const technician = startLog?.details.match(/oleh (.*?)\./)?.[1] || null;
        const estimatedDate = startLog?.details.match(/selesai: (.*?)\./)?.[1] || null;

        return { originalReport, reporter, reportDate, technician, estimatedDate };
    }, [asset.activityLog]);

    const isUnderRepair = asset.status === AssetStatus.UNDER_REPAIR;

    return (
        <div className={`p-4 rounded-lg border-l-4 ${isUnderRepair ? 'bg-blue-50 border-blue-500' : 'bg-amber-50 border-amber-500'}`}>
            <div className="flex items-center gap-3 mb-3">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${isUnderRepair ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
                    {isUnderRepair ? <SpinnerIcon className="animate-spin" /> : <WrenchIcon />}
                </div>
                <h3 className="text-lg font-bold text-gray-800">
                    Status Perbaikan: <span className={isUnderRepair ? 'text-blue-700' : 'text-amber-700'}>{isUnderRepair ? 'Dalam Perbaikan' : 'Menunggu Aksi Admin'}</span>
                </h3>
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6 text-sm">
                <PreviewRow label="Dilaporkan oleh" value={repairInfo.reporter} />
                <PreviewRow label="Tanggal Laporan" value={repairInfo.reportDate} />
                <PreviewRow label="Deskripsi Laporan" fullWidth>
                    <p className="italic text-gray-600">"{repairInfo.originalReport}"</p>
                </PreviewRow>
                {isUnderRepair && (
                    <>
                        <PreviewRow label="Ditangani oleh" value={repairInfo.technician || 'N/A'} />
                        <PreviewRow label="Estimasi Selesai" value={repairInfo.estimatedDate || 'N/A'} />
                    </>
                )}
            </dl>
        </div>
    );
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

// --- Main Asset Preview Component ---

interface AssetPreviewProps {
    asset: Asset;
    canViewPrice: boolean;
    onShowPreview: (data: PreviewData) => void;
    getCustomerName: (id: string) => string;
}

export const AssetPreview: React.FC<AssetPreviewProps> = ({ asset, canViewPrice, onShowPreview, getCustomerName }) => {
    const [activeTab, setActiveTab] = useState<'details' | 'history' | 'attachments'>('details');

    const getLogIcon = (action: string) => {
        const iconClass = "w-4 h-4 text-blue-800";
        if (action.includes('Dicatat')) return <RegisterIcon className={iconClass} />;
        if (action.includes('Serah Terima')) return <HandoverIcon className={iconClass} />;
        if (action.includes('Instalasi')) return <CustomerIcon className={iconClass} />;
        if (action.includes('Dismantle')) return <DismantleIcon className={iconClass} />;
        if (action.includes('Diperbarui')) return <PencilIcon className={iconClass} />;
        if (action.includes('Status')) return <TagIcon className={iconClass} />;
        if (action.includes('Kerusakan Dilaporkan')) return <WrenchIcon className={iconClass} />;
        if (action.includes('Perbaikan Dimulai')) return <SpinnerIcon className={`${iconClass} animate-spin`} />;
        if (action.includes('Perbaikan Selesai')) return <CheckIcon className={iconClass} />;
        return <InfoIcon className={iconClass} />;
    };

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
                {[AssetStatus.DAMAGED, AssetStatus.UNDER_REPAIR, AssetStatus.OUT_FOR_REPAIR].includes(asset.status as AssetStatus) && (
                    <div className="mb-6"><RepairStatusCard asset={asset} /></div>
                )}
                {activeTab === 'details' && (
                    <div className="space-y-6">
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
                                <PreviewRow label="Dicatat oleh" value={asset.recordedBy} fullWidth />
                                <PreviewRow label="Catatan" value={asset.notes} fullWidth />
                            </dl>
                        </div>
                    </div>
                )}
                {activeTab === 'history' && (
                        <ol className="relative ml-4 border-l border-gray-200">                  
                        {asset.activityLog.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).map((log) => (
                        <li key={log.id} className="mb-6 ml-6">
                            <span className="absolute flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full -left-4 ring-4 ring-white">
                                {getLogIcon(log.action)}
                            </span>
                            <time className="block mb-1 text-xs font-normal leading-none text-gray-500">{new Date(log.timestamp).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}</time>
                            <h3 className="text-sm font-semibold text-gray-900">{log.action}</h3>
                            <p className="text-sm font-normal text-gray-600">
                                {log.details} oleh <ClickableLink onClick={() => onShowPreview({ type: 'user', id: log.user })}>{log.user}</ClickableLink>.
                            </p>
                            {log.referenceId && (
                                <div className="mt-1.5">
                                    <ClickableLink onClick={() => onShowPreview({ type: log.referenceId?.startsWith('HO') ? 'handover' : log.referenceId?.startsWith('DSM') ? 'dismantle' : 'request', id: log.referenceId! })} title={`Lihat detail untuk ${log.referenceId}`}>
                                        Lihat Dokumen: {log.referenceId}
                                    </ClickableLink>
                                </div>
                            )}
                        </li>
                        ))}
                    </ol>
                )}
                {activeTab === 'attachments' && (
                    <div className="space-y-3">
                        {asset.attachments.length > 0 ? asset.attachments.map(att => (
                            <div key={att.id} className="flex items-center justify-between p-3 text-sm bg-gray-50 border rounded-lg">
                                <div>
                                    <p className="font-semibold text-gray-800">{att.name}</p>
                                    <p className="text-xs text-gray-500">{att.type === 'image' ? 'Gambar' : 'Dokumen PDF'}</p>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <a href={att.url} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-500 rounded-full hover:bg-gray-200" title="Lihat"><EyeIcon className="w-4 h-4" /></a>
                                    <a href={att.url} download={att.name} className="p-2 text-gray-500 rounded-full hover:bg-gray-200" title="Unduh"><DownloadIcon className="w-4 h-4" /></a>
                                </div>
                            </div>
                        )) : <p className="text-sm text-center text-gray-500 py-4">Tidak ada lampiran.</p>}
                    </div>
                )}
            </div>
        </div>
    );
};
