import React from 'react';
import { AssetStatus, Page, PreviewData } from '../../../types';
import { SortConfig } from '../../../hooks/useSortableData';
import { ClickableLink } from '../../../components/ui/ClickableLink';
import { InboxIcon } from '../../../components/icons/InboxIcon';
import { SortIcon } from '../../../components/icons/SortIcon';
import { SortAscIcon } from '../../../components/icons/SortAscIcon';
import { SortDescIcon } from '../../../components/icons/SortDescIcon';
import { ArchiveBoxIcon } from '../../../components/icons/ArchiveBoxIcon';
import { UsersIcon } from '../../../components/icons/UsersIcon';
import { WrenchIcon } from '../../../components/icons/WrenchIcon';
import { HistoryIcon } from '../../../components/icons/HistoryIcon';
import { RequestIcon } from '../../../components/icons/RequestIcon';
import { PencilIcon } from '../../../components/icons/PencilIcon';
import { CheckIcon } from '../../../components/icons/CheckIcon';
import { StockItem } from '../StockOverviewPage';

const LOW_STOCK_DEFAULT = 5;

const StockSortableHeader: React.FC<{
    children: React.ReactNode;
    columnKey: keyof StockItem;
    sortConfig: SortConfig<StockItem> | null;
    requestStockSort: (key: keyof StockItem) => void;
    className?: string;
}> = ({ children, columnKey, sortConfig, requestStockSort, className }) => {
    const isSorted = sortConfig?.key === columnKey;
    const direction = isSorted ? sortConfig.direction : undefined;

    const getSortIcon = () => {
        if (!isSorted) return <SortIcon className="w-4 h-4 text-gray-400" />;
        if (direction === 'ascending') return <SortAscIcon className="w-4 h-4 text-tm-accent" />;
        return <SortDescIcon className="w-4 h-4 text-tm-accent" />;
    };

    return (
        <th scope="col" className={`px-6 py-3 text-sm font-semibold tracking-wider text-left text-gray-500 ${className}`}>
            <button onClick={() => requestStockSort(columnKey)} className="flex items-center space-x-1 group">
                <span>{children}</span>
                <span className="opacity-50 group-hover:opacity-100">{getSortIcon()}</span>
            </button>
        </th>
    );
};

interface StockTableProps {
    stockItems: StockItem[];
    sortConfig: SortConfig<StockItem> | null;
    requestStockSort: (key: keyof StockItem) => void;
    thresholds: Record<string, number>;
    onThresholdChange: (key: string, value: number) => void;
    editingThresholdKey: string | null;
    setEditingThresholdKey: (key: string | null) => void;
    tempThreshold: string;
    setTempThreshold: (value: string) => void;
    onOpenHistory: (name: string, brand: string) => void;
    onShowPreview: (data: PreviewData) => void;
    setActivePage: (page: Page, filters?: any) => void;
}

export const StockTable: React.FC<StockTableProps> = ({ 
    stockItems, 
    sortConfig, 
    requestStockSort, 
    thresholds, 
    onThresholdChange, 
    editingThresholdKey,
    setEditingThresholdKey,
    tempThreshold,
    setTempThreshold,
    onOpenHistory, 
    onShowPreview, 
    setActivePage 
}) => {
     const formatValue = (val: number) => {
        if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(1)}M`;
        if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(0)}jt`;
        if (val >= 1000) return `${(val / 1000).toFixed(0)}rb`;
        return val.toString();
    };

    return (
        <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
                <tr>
                    <StockSortableHeader columnKey="name" sortConfig={sortConfig} requestStockSort={requestStockSort}>Nama Aset</StockSortableHeader>
                    <th scope="col" className="px-6 py-3 text-sm font-semibold tracking-wider text-center text-gray-500">Ambang Batas</th>
                    <th scope="col" className="px-6 py-3 text-sm font-semibold tracking-wider text-center text-gray-500">Di Gudang</th>
                    <StockSortableHeader columnKey="valueInStorage" sortConfig={sortConfig} requestStockSort={requestStockSort} className="text-right">Nilai Stok (Rp)</StockSortableHeader>
                    <th scope="col" className="px-6 py-3 text-sm font-semibold tracking-wider text-center text-gray-500">Digunakan</th>
                    <th scope="col" className="px-6 py-3 text-sm font-semibold tracking-wider text-center text-gray-500">Rusak</th>
                    <th scope="col" className="px-6 py-3 text-sm font-semibold tracking-wider text-center text-gray-500">Total</th>
                    <th scope="col" className="relative px-6 py-3"><span className="sr-only">Aksi</span></th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {stockItems.length > 0 ? (
                    stockItems.map(item => {
                        const key = `${item.name}|${item.brand}`;
                        const threshold = thresholds[key] ?? LOW_STOCK_DEFAULT;
                        const isOutOfStock = item.inStorage === 0;
                        const isLowStock = !isOutOfStock && item.inStorage <= threshold;
                        
                        const storagePercentage = item.total > 0 ? (item.inStorage / item.total) * 100 : 0;
                        const barColorClass = isOutOfStock ? 'bg-danger/80' : isLowStock ? 'bg-warning/80' : 'bg-success/80';
                        
                        const rowClass = isOutOfStock ? 'bg-red-50/50' : isLowStock ? 'bg-amber-50/50' : '';

                        return (
                            <tr key={key} className={`${rowClass} hover:bg-gray-50 transition-colors`}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                        <ClickableLink onClick={() => setActivePage('registration', { name: item.name, brand: item.brand })} className="text-sm font-semibold text-gray-900 !no-underline group-hover:!underline">
                                            {item.name}
                                        </ClickableLink>
                                        {item.trackingMethod === 'bulk' ? (
                                            <span className="px-2 py-0.5 text-xs font-semibold text-purple-800 bg-purple-100 rounded-full">Material</span>
                                        ) : (
                                            <span className="px-2 py-0.5 text-xs font-semibold text-gray-700 bg-gray-100 rounded-full">Device</span>
                                        )}
                                    </div>
                                    <div className="text-xs text-gray-500">{item.brand} &bull; {item.category}</div>
                                </td>
                                <td className="px-6 py-4 text-sm text-center whitespace-nowrap">
                                    {editingThresholdKey === key ? (
                                        <div className="flex items-center justify-center gap-1">
                                            <input
                                                type="number" value={tempThreshold}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    if (value === '' || (parseInt(value, 10) >= 0)) setTempThreshold(value);
                                                }}
                                                autoFocus
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        onThresholdChange(key, parseInt(tempThreshold, 10) || 0);
                                                        setEditingThresholdKey(null);
                                                    } else if (e.key === 'Escape') setEditingThresholdKey(null);
                                                }}
                                                className="w-16 h-8 text-sm font-semibold text-center text-gray-900 bg-white border border-tm-primary rounded-md shadow-sm outline-none ring-2 ring-tm-accent"
                                            />
                                            <button onClick={() => { onThresholdChange(key, parseInt(tempThreshold, 10) || 0); setEditingThresholdKey(null); }} className="p-1.5 text-success-text bg-success-light rounded-md hover:bg-green-200"><CheckIcon className="w-4 h-4" /></button>
                                        </div>
                                    ) : (
                                        <div onClick={() => { setTempThreshold(String(threshold)); setEditingThresholdKey(key); }} className="group relative flex items-center justify-center w-16 h-8 px-2 py-1 mx-auto font-semibold text-gray-800 transition-colors rounded-md cursor-pointer hover:bg-gray-200">
                                            <span>{threshold}</span>
                                            <PencilIcon className="absolute w-3 h-3 text-gray-500 transition-opacity opacity-0 right-1 group-hover:opacity-100" />
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4 text-sm font-medium text-center whitespace-nowrap">
                                    <ClickableLink onClick={() => onShowPreview({ type: 'stockItemAssets', id: `${item.name}|${item.brand}|${AssetStatus.IN_STORAGE}` })} className="flex flex-col items-center justify-center gap-1.5 !text-gray-800">
                                        <div className={`flex items-center gap-2 font-bold ${isOutOfStock ? 'text-danger-text' : isLowStock ? 'text-warning-text' : 'text-success-text'}`}>
                                            <ArchiveBoxIcon className="w-4 h-4"/><span className="text-base">{item.inStorage}</span><span className="text-xs font-normal text-gray-500">{item.unitOfMeasure}</span>
                                        </div>
                                        <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden" title={`${storagePercentage.toFixed(0)}% dari total`}><div className={`h-full rounded-full ${barColorClass}`} style={{ width: `${storagePercentage}%` }}></div></div>
                                    </ClickableLink>
                                </td>
                                <td className="px-6 py-4 text-sm font-medium text-right text-gray-800 whitespace-nowrap">{item.valueInStorage.toLocaleString('id-ID')}</td>
                                <td className="px-6 py-4 text-sm font-medium text-center text-gray-800 whitespace-nowrap"><ClickableLink onClick={() => onShowPreview({ type: 'stockItemAssets', id: `${item.name}|${item.brand}|${AssetStatus.IN_USE}` })} className="flex items-center justify-center gap-2 !text-gray-800"><UsersIcon className="w-4 h-4"/><span>{item.inUse} <span className="text-xs font-normal text-gray-500">{item.unitOfMeasure}</span></span></ClickableLink></td>
                                <td className="px-6 py-4 text-sm font-medium text-center text-gray-800 whitespace-nowrap"><ClickableLink onClick={() => onShowPreview({ type: 'stockItemAssets', id: `${item.name}|${item.brand}|${AssetStatus.DAMAGED}` })} className="flex items-center justify-center gap-2 !text-gray-800"><WrenchIcon className="w-4 h-4"/><span>{item.damaged} <span className="text-xs font-normal text-gray-500">{item.unitOfMeasure}</span></span></ClickableLink></td>
                                <td className="px-6 py-4 text-sm font-bold text-center text-gray-900 whitespace-nowrap"><ClickableLink onClick={() => onShowPreview({ type: 'stockItemAssets', id: `${item.name}|${item.brand}|ALL` })} className="!text-gray-900">{item.total} <span className="text-xs font-normal text-gray-500">{item.unitOfMeasure}</span></ClickableLink></td>
                                <td className="px-6 py-4 text-sm font-medium text-right whitespace-nowrap">
                                    <div className="flex items-center justify-end space-x-2">
                                        <button onClick={() => onOpenHistory(item.name, item.brand)} className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors bg-gray-100 rounded-md shadow-sm hover:bg-gray-200"><HistoryIcon className="w-4 h-4" />Riwayat</button>
                                        <button 
                                            onClick={() => setActivePage('request', { 
                                                prefillItems: [{ 
                                                    name: item.name, 
                                                    brand: item.brand, 
                                                    currentStock: item.inStorage,
                                                    threshold: threshold 
                                                }] 
                                            })} 
                                            className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white rounded-md shadow-sm transition-colors ${(isOutOfStock || isLowStock) ? 'bg-amber-500 hover:bg-amber-600' : 'bg-tm-accent hover:bg-tm-primary'}`}
                                        >
                                            <RequestIcon className="w-4 h-4" />
                                            Request
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })
                ) : (
                    <tr><td colSpan={8} className="px-6 py-12 text-center text-gray-500"><div className="flex flex-col items-center"><InboxIcon className="w-12 h-12 text-gray-400" /><h3 className="mt-2 text-sm font-medium text-gray-900">Tidak Ada Data Stok</h3><p className="mt-1 text-sm text-gray-500">Ubah filter atau catat aset baru untuk memulai.</p></div></td></tr>
                )}
            </tbody>
        </table>
    );
};
