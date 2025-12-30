
import React from 'react';
import { Asset, AssetStatus, PreviewData, ActivityLogEntry } from '../../../types';
import { ClickableLink } from '../../../components/ui/ClickableLink';
import { ArrowUpIcon } from '../../../components/icons/ArrowUpIcon';
import { ArrowDownIcon } from '../../../components/icons/ArrowDownIcon';
import { getAssetStatusClass } from '../../../utils/statusUtils';

// Helper Map
const statusMap: Record<string, string> = {
    [AssetStatus.IN_STORAGE]: 'Disimpan',
    [AssetStatus.IN_USE]: 'Digunakan',
    [AssetStatus.UNDER_REPAIR]: 'Dalam Perbaikan',
    [AssetStatus.DAMAGED]: 'Rusak',
};

// --- Stock Item Assets Preview ---
interface StockItemAssetsPreviewProps {
    assets: Asset[];
    name: string;
    status: string;
    onShowPreview: (data: PreviewData) => void;
}

export const StockItemAssetsPreview: React.FC<StockItemAssetsPreviewProps> = ({ assets, name, status, onShowPreview }) => {
    const statusLabel = status === 'ALL' ? 'Total' : statusMap[status] || status;
    const title = `Aset ${statusLabel}: ${name}`;

    return (
        <div>
            <h4 className="mb-4 text-lg font-semibold text-gray-900">{title} ({assets.length})</h4>
            <ul className="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar -mx-2 px-2">
                {assets.length > 0 ? assets.map(asset => (
                    <li key={asset.id} className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex-1 min-w-0">
                            <ClickableLink onClick={() => onShowPreview({ type: 'asset', id: asset.id })}>
                                <span className="font-bold text-gray-800">{asset.id}</span>
                            </ClickableLink>
                            <p className="text-xs text-gray-500 font-mono mt-1 truncate" title={`SN: ${asset.serialNumber}`}>
                                SN: {asset.serialNumber}
                            </p>
                        </div>
                        <div className="flex-shrink-0 mt-2 sm:mt-0">
                            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getAssetStatusClass(asset.status as AssetStatus)}`}>
                                {statusMap[asset.status as string] || asset.status}
                            </span>
                        </div>
                    </li>
                )) : <p className="py-8 text-sm text-center text-gray-500">Tidak ada aset yang cocok.</p>}
            </ul>
        </div>
    );
};

// --- Stock History Preview ---
type Movement = ActivityLogEntry & { direction: 'IN' | 'OUT', assetId: string };

interface StockHistoryPreviewProps {
    assets: Asset[];
    title: string;
    onShowPreview: (data: PreviewData) => void;
}

export const StockHistoryPreview: React.FC<StockHistoryPreviewProps> = ({ assets, title, onShowPreview }) => {
    const movements: Movement[] = assets
        .flatMap(asset => 
            asset.activityLog
                .filter(log => ['Aset Dicatat', 'Serah Terima Internal', 'Instalasi Pelanggan', 'Dismantle Selesai'].includes(log.action))
                .map(log => {
                    let direction: 'IN' | 'OUT' = 'IN';
                    if (['Serah Terima Internal', 'Instalasi Pelanggan'].includes(log.action)) {
                        direction = 'OUT';
                    }
                    return { ...log, direction, assetId: asset.id };
                })
        )
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return (
        <div>
            <h4 className="mb-4 pb-2 text-lg font-semibold text-gray-900 border-b">{title} ({movements.length} Transaksi)</h4>
            <ul className="space-y-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
                {movements.length > 0 ? movements.map(log => {
                    const isOut = log.direction === 'OUT';
                    const DirectionIcon = isOut ? ArrowUpIcon : ArrowDownIcon;
                    const colorClass = isOut ? 'text-amber-600' : 'text-green-600';
                    const bgClass = isOut ? 'bg-amber-100' : 'bg-green-100';

                    return (
                        <li key={log.id} className="flex items-start gap-3 p-3 text-sm border-b">
                            <div className={`flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-full ${bgClass} ${colorClass}`}>
                                <DirectionIcon className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold text-gray-800">{log.action}</span>
                                    <span className="text-xs font-medium text-gray-500">{new Date(log.timestamp).toLocaleDateString('id-ID', {day: '2-digit', month: 'short', year:'numeric'})}</span>
                                </div>
                                <p className="text-xs text-gray-600 mt-0.5">{log.details}</p>
                                <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-500">
                                    <ClickableLink onClick={() => onShowPreview({type: 'asset', id: log.assetId})}>{log.assetId}</ClickableLink>
                                    {log.referenceId && (
                                        <ClickableLink onClick={() => onShowPreview({type: log.referenceId?.startsWith('HO') ? 'handover' : log.referenceId?.startsWith('DSM') ? 'dismantle' : 'request', id: log.referenceId!})}>
                                            Ref: {log.referenceId}
                                        </ClickableLink>
                                    )}
                                </div>
                            </div>
                        </li>
                    )
                }) : <p className="py-8 text-sm text-center text-gray-500">Tidak ada riwayat pergerakan stok.</p>}
            </ul>
        </div>
    );
};
