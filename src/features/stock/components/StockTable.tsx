
import React, { useState } from 'react';
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
import { BsRulers, BsLightningFill, BsBoxSeam, BsInfoCircle, BsFileEarmarkText } from 'react-icons/bs';
import Modal from '../../../components/ui/Modal'; // Import Modal

const DEFAULT_UNIT_THRESHOLD = 5;
const DEFAULT_MEASUREMENT_THRESHOLD = 2; 

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
    // State for Usage Detail Modal
    const [usageModalItem, setUsageModalItem] = useState<StockItem | null>(null);

    // Helper for large number formatting
    const formatMetric = (val: number) => {
        return val.toLocaleString('id-ID'); 
    };

    return (
        <>
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <StockSortableHeader columnKey="name" sortConfig={sortConfig} requestStockSort={requestStockSort}>Nama Aset</StockSortableHeader>
                        <th scope="col" className="px-6 py-3 text-sm font-semibold tracking-wider text-center text-gray-500">Ambang Batas</th>
                        <th scope="col" className="px-6 py-3 text-sm font-semibold tracking-wider text-center text-gray-500">Di Gudang</th>
                        <StockSortableHeader columnKey="valueInStorage" sortConfig={sortConfig} requestStockSort={requestStockSort} className="text-right">Nilai Stok (Rp)</StockSortableHeader>
                        <th scope="col" className="px-6 py-3 text-sm font-semibold tracking-wider text-center text-gray-500">Digunakan</th>
                        <th scope="col" className="px-6 py-3 text-sm font-semibold tracking-wider text-center text-gray-500">Rusak</th>
                        <th scope="col" className="px-6 py-3 text-sm font-semibold tracking-wider text-center text-gray-500">Total Aset</th>
                        <th scope="col" className="relative px-6 py-3"><span className="sr-only">Aksi</span></th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {stockItems.length > 0 ? (
                        stockItems.map(item => {
                            const key = `${item.name}|${item.brand}`;
                            const isMeasurement = item.isMeasurement;
                            const isBulk = item.trackingMethod === 'bulk';
                            
                            // --- DISPLAY UNIT LOGIC ---
                            const displayUnit = isMeasurement ? (item.baseUnit || 'Meter') : (item.unitOfMeasure || 'Unit');
                            const containerUnit = item.unitOfMeasure || 'Unit';

                            // --- THRESHOLD LOGIC ---
                            const customThreshold = thresholds[key];
                            const defaultThreshold = isMeasurement ? DEFAULT_MEASUREMENT_THRESHOLD : DEFAULT_UNIT_THRESHOLD;
                            const activeThreshold = customThreshold ?? defaultThreshold;
                            const isCustomSet = customThreshold !== undefined;

                            // --- STOCK CALCULATION LOGIC ---
                            const contentStockLevel = isMeasurement ? item.storageBalance : item.inStorage;
                            const contentCapacityLevel = isMeasurement ? item.grandTotalBalance : item.total;
                            
                            const physicalCount = item.inStorage;
                            
                            const isOutOfStock = physicalCount === 0;
                            const isLowStock = !isOutOfStock && physicalCount <= activeThreshold;
                            
                            const storagePercentage = contentCapacityLevel > 0 ? (contentStockLevel / contentCapacityLevel) * 100 : 0;
                            const barColorClass = isOutOfStock ? 'bg-danger/80' : isLowStock ? 'bg-warning/80' : 'bg-success/80';
                            const rowClass = isOutOfStock ? 'bg-red-50/50' : isLowStock ? 'bg-amber-50/50' : '';
                            
                            return (
                                <tr key={key} className={`${rowClass} hover:bg-gray-50 transition-colors`}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <ClickableLink onClick={() => setActivePage('registration', { name: item.name, brand: item.brand })} className="text-sm font-semibold text-gray-900 !no-underline group-hover:!underline">
                                                {item.name}
                                            </ClickableLink>
                                            
                                            {/* Type Badge */}
                                            {isBulk ? (
                                                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full flex items-center gap-1 uppercase tracking-wide border ${isMeasurement ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                                                    {isMeasurement ? <BsRulers className="w-3 h-3"/> : <BsLightningFill className="w-3 h-3"/>}
                                                    {isMeasurement ? 'Meteran' : 'Bulk'}
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 text-[10px] font-bold text-gray-600 bg-gray-100 rounded-full border border-gray-200 uppercase tracking-wide">
                                                    Unit
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">{item.brand} &bull; {item.category}</div>
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
                                            <div onClick={() => { setTempThreshold(String(activeThreshold)); setEditingThresholdKey(key); }} className="group relative flex flex-col items-center justify-center cursor-pointer">
                                                 <div className={`px-2 py-1 font-semibold rounded-md transition-colors ${isCustomSet ? 'text-gray-900 bg-gray-100 group-hover:bg-gray-200' : 'text-gray-500 bg-gray-50 group-hover:bg-gray-100 italic'}`}>
                                                    {activeThreshold}
                                                </div>
                                                <span className="text-[9px] text-gray-400 mt-0.5 uppercase font-bold tracking-wide">
                                                    {containerUnit}
                                                </span>
                                                <PencilIcon className="absolute top-1/2 -translate-y-1/2 right-2 w-3 h-3 text-gray-400 transition-opacity opacity-0 group-hover:opacity-100" />
                                            </div>
                                        )}
                                    </td>
                                    
                                    {/* KOLOM: DI GUDANG */}
                                    <td className="px-6 py-4 text-sm font-medium text-center whitespace-nowrap">
                                        <ClickableLink onClick={() => onShowPreview({ type: 'stockItemAssets', id: `${item.name}|${item.brand}|${AssetStatus.IN_STORAGE}` })} className="flex flex-col items-center justify-center gap-1.5 !text-gray-800">
                                            <div className={`flex items-center gap-2 font-bold ${isOutOfStock ? 'text-danger-text' : isLowStock ? 'text-warning-text' : 'text-success-text'}`}>
                                                {isMeasurement ? <BsRulers className="w-4 h-4"/> : <ArchiveBoxIcon className="w-4 h-4"/>}
                                                <span className="text-base">{formatMetric(contentStockLevel)}</span>
                                                <span className="text-xs font-normal text-gray-500">{displayUnit}</span>
                                            </div>
                                            <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden" title={`${storagePercentage.toFixed(0)}% dari total kapasitas`}>
                                                <div className={`h-full rounded-full ${barColorClass}`} style={{ width: `${Math.min(storagePercentage, 100)}%` }}></div>
                                            </div>
                                            
                                            {isMeasurement && (
                                                <span className={`text-[10px] ${isLowStock ? 'text-amber-700 font-bold' : 'text-gray-400'}`}>
                                                    ({item.inStorage} {containerUnit})
                                                </span>
                                            )}
                                        </ClickableLink>
                                    </td>
                                    
                                    <td className="px-6 py-4 text-sm font-medium text-right text-gray-800 whitespace-nowrap">{item.valueInStorage.toLocaleString('id-ID')}</td>
                                    
                                    {/* KOLOM: DIGUNAKAN */}
                                    <td className="px-6 py-4 text-sm font-medium text-center text-gray-800 whitespace-nowrap">
                                        {isBulk || isMeasurement ? (
                                            // BUTTON TRIGGER MODAL
                                            <button 
                                                onClick={() => setUsageModalItem(item)}
                                                disabled={item.inUseBalance === 0}
                                                className={`flex flex-col items-center justify-center gap-0.5 w-full rounded-lg py-1 px-2 transition-colors ${item.inUseBalance > 0 ? 'hover:bg-blue-50 cursor-pointer group' : 'cursor-default opacity-60'}`}
                                            >
                                                <div className={`flex items-center gap-2 ${item.inUseBalance > 0 ? 'text-blue-700' : 'text-gray-400'}`}>
                                                    <UsersIcon className="w-4 h-4"/>
                                                    <span className="font-bold text-base">
                                                        {formatMetric(item.inUseBalance)} 
                                                    </span>
                                                    {item.inUseBalance > 0 && <BsInfoCircle className="w-3 h-3 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />}
                                                </div>
                                                <span className="text-xs font-normal text-gray-500">{displayUnit}</span>
                                            </button>
                                        ) : (
                                            // INDIVIDUAL UNIT
                                            <ClickableLink onClick={() => onShowPreview({ type: 'stockItemAssets', id: `${item.name}|${item.brand}|${AssetStatus.IN_USE}` })} className="flex flex-col items-center justify-center gap-0.5 !text-gray-800">
                                                <div className="flex items-center gap-2">
                                                    <UsersIcon className="w-4 h-4 text-gray-400"/>
                                                    <span>
                                                        {formatMetric(item.inUse)} 
                                                        <span className="text-xs font-normal text-gray-500 ml-1">{displayUnit}</span>
                                                    </span>
                                                </div>
                                            </ClickableLink>
                                        )}
                                    </td>

                                    {/* KOLOM: RUSAK */}
                                    <td className="px-6 py-4 text-sm font-medium text-center text-gray-800 whitespace-nowrap">
                                        <ClickableLink onClick={() => onShowPreview({ type: 'stockItemAssets', id: `${item.name}|${item.brand}|${AssetStatus.DAMAGED}` })} className="flex flex-col items-center justify-center gap-0.5 !text-gray-800">
                                            <div className="flex items-center gap-2">
                                                <WrenchIcon className="w-4 h-4 text-gray-400"/>
                                                <span>
                                                    {formatMetric(isMeasurement ? item.damagedBalance : item.damaged)}
                                                    <span className="text-xs font-normal text-gray-500 ml-1">{displayUnit}</span>
                                                </span>
                                            </div>
                                             {isMeasurement && item.damaged > 0 && (
                                                <span className="text-[10px] text-gray-400">
                                                    ({item.damaged} {containerUnit})
                                                </span>
                                            )}
                                        </ClickableLink>
                                    </td>

                                    {/* KOLOM: TOTAL ASET */}
                                    <td className="px-6 py-4 text-sm font-bold text-center text-gray-900 whitespace-nowrap">
                                        <ClickableLink onClick={() => onShowPreview({ type: 'stockItemAssets', id: `${item.name}|${item.brand}|ALL` })} className="!text-gray-900">
                                            <div className="flex flex-col items-center">
                                                <span>
                                                    {formatMetric(contentCapacityLevel)} <span className="text-xs font-normal text-gray-500">{displayUnit}</span>
                                                </span>
                                                {isMeasurement && (
                                                    <span className="text-[10px] font-normal text-gray-500">
                                                        (Total {item.total} {containerUnit})
                                                    </span>
                                                )}
                                            </div>
                                        </ClickableLink>
                                    </td>

                                    <td className="px-6 py-4 text-sm font-medium text-right whitespace-nowrap">
                                        <div className="flex items-center justify-end space-x-2">
                                            <button onClick={() => onOpenHistory(item.name, item.brand)} className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors bg-gray-100 rounded-md shadow-sm hover:bg-gray-200"><HistoryIcon className="w-4 h-4" />Riwayat</button>
                                            <button 
                                                onClick={() => setActivePage('request', { 
                                                    prefillItems: [{ 
                                                        name: item.name, 
                                                        brand: item.brand, 
                                                        currentStock: physicalCount, 
                                                        threshold: activeThreshold
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

            {/* MODAL DETAIL PENGGUNAAN (MEASUREMENT/BULK) */}
            {usageModalItem && (
                <Modal 
                    isOpen={!!usageModalItem} 
                    onClose={() => setUsageModalItem(null)} 
                    title={`Detail Penggunaan: ${usageModalItem.name}`}
                    size="lg"
                    hideDefaultCloseButton={false}
                >
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                             <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">Total Digunakan</p>
                                <p className="text-xl font-bold text-tm-primary mt-1">
                                    {formatMetric(usageModalItem.inUseBalance)} 
                                    <span className="text-sm font-normal text-gray-600 ml-1">{usageModalItem.isMeasurement ? (usageModalItem.baseUnit || 'Meter') : (usageModalItem.unitOfMeasure || 'Unit')}</span>
                                </p>
                             </div>
                             <div className="text-right">
                                <p className="text-xs text-gray-500 uppercase tracking-wider font-bold">Brand</p>
                                <p className="font-semibold text-gray-800">{usageModalItem.brand}</p>
                             </div>
                        </div>

                        <div className="overflow-hidden border rounded-lg">
                            <table className="min-w-full text-sm divide-y divide-gray-200">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-semibold text-gray-600">No. Dokumen</th>
                                        <th className="px-4 py-3 text-center font-semibold text-gray-600">Tipe</th>
                                        <th className="px-4 py-3 text-right font-semibold text-gray-600">Jumlah</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {usageModalItem.usageDetails && usageModalItem.usageDetails.length > 0 ? (
                                        usageModalItem.usageDetails.map((usage, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50">
                                                <td className="px-4 py-3 text-gray-800 font-mono text-xs flex items-center gap-2">
                                                    <BsFileEarmarkText className="text-gray-400"/>
                                                    {usage.docNumber}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${usage.type === 'install' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                                        {usage.type === 'install' ? 'Instalasi' : 'Maintenance'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right font-semibold text-gray-900">
                                                    {usage.qty}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan={3} className="px-4 py-8 text-center text-gray-500 italic">
                                                Belum ada riwayat penggunaan tercatat.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </Modal>
            )}
        </>
    );
};
