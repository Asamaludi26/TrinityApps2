
import React from 'react';
import { Handover } from '../../../types';
import { SortConfig } from '../../../hooks/useSortableData';
import { SortIcon } from '../../../components/icons/SortIcon';
import { SortAscIcon } from '../../../components/icons/SortAscIcon';
import { SortDescIcon } from '../../../components/icons/SortDescIcon';
import { EyeIcon } from '../../../components/icons/EyeIcon';
import { TrashIcon } from '../../../components/icons/TrashIcon';
import { InboxIcon } from '../../../components/icons/InboxIcon';
import { Checkbox } from '../../../components/ui/Checkbox';
import { useLongPress } from '../../../hooks/useLongPress';
import { StatusBadge } from '../../../components/ui/StatusBadge';

interface HandoverTableProps {
    handovers: Handover[];
    onDetailClick: (handover: Handover) => void;
    onDeleteClick: (id: string) => void;
    sortConfig: SortConfig<Handover> | null;
    requestSort: (key: keyof Handover) => void;
    selectedHandoverIds: string[];
    onSelectOne: (id: string) => void;
    onSelectAll: (event: React.ChangeEvent<HTMLInputElement>) => void;
    isBulkSelectMode: boolean;
    onEnterBulkMode: () => void;
}

const SortableHeader: React.FC<{
    children: React.ReactNode;
    columnKey: keyof Handover;
    sortConfig: SortConfig<Handover> | null;
    requestSort: (key: keyof Handover) => void;
}> = ({ children, columnKey, sortConfig, requestSort }) => {
    const isSorted = sortConfig?.key === columnKey;
    const direction = isSorted ? sortConfig.direction : undefined;

    return (
        <th scope="col" className="px-6 py-3 text-sm font-semibold tracking-wider text-left text-gray-500 cursor-pointer group hover:bg-gray-50 transition-colors" onClick={() => requestSort(columnKey)}>
            <div className="flex items-center gap-1">
                <span>{children}</span>
                <span className="opacity-50 group-hover:opacity-100">
                     {isSorted ? (direction === 'ascending' ? <SortAscIcon className="w-4 h-4 text-tm-accent" /> : <SortDescIcon className="w-4 h-4 text-tm-accent" />) : <SortIcon className="w-4 h-4 text-gray-400" />}
                </span>
            </div>
        </th>
    );
};

export const HandoverTable: React.FC<HandoverTableProps> = ({ 
    handovers, onDetailClick, onDeleteClick, sortConfig, requestSort, 
    selectedHandoverIds, onSelectOne, onSelectAll, isBulkSelectMode, onEnterBulkMode 
}) => {
    const longPressHandlers = useLongPress(onEnterBulkMode, 500);

    return (
        <table className="min-w-full divide-y divide-gray-200">
            <thead className="sticky top-0 z-10 bg-gray-50 shadow-sm">
                <tr>
                    {isBulkSelectMode && (
                        <th scope="col" className="px-6 py-3 w-10">
                            <Checkbox checked={selectedHandoverIds.length === handovers.length && handovers.length > 0} onChange={onSelectAll} />
                        </th>
                    )}
                    <SortableHeader columnKey="docNumber" sortConfig={sortConfig} requestSort={requestSort}>No. Dokumen</SortableHeader>
                    <SortableHeader columnKey="handoverDate" sortConfig={sortConfig} requestSort={requestSort}>Tanggal</SortableHeader>
                    <th scope="col" className="px-6 py-3 text-sm font-semibold tracking-wider text-left text-gray-500">Pihak Terlibat</th>
                    <th scope="col" className="px-6 py-3 text-sm font-semibold tracking-wider text-left text-gray-500">Detail Barang</th>
                    <SortableHeader columnKey="status" sortConfig={sortConfig} requestSort={requestSort}>Status</SortableHeader>
                    <th className="relative px-6 py-3"><span className="sr-only">Aksi</span></th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {handovers.length > 0 ? (
                    handovers.map((ho) => (
                        <tr key={ho.id} {...longPressHandlers} onClick={() => isBulkSelectMode ? onSelectOne(ho.id) : onDetailClick(ho)} className={`transition-colors cursor-pointer ${selectedHandoverIds.includes(ho.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                            {isBulkSelectMode && (
                                <td className="px-6 py-4 align-top" onClick={(e) => e.stopPropagation()}><Checkbox checked={selectedHandoverIds.includes(ho.id)} onChange={() => onSelectOne(ho.id)} /></td>
                            )}
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-bold text-gray-900">{ho.docNumber}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-xs text-gray-500">{new Date(ho.handoverDate).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'})}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{ho.menyerahkan}</div>
                                <div className="text-xs text-gray-500">ke {ho.penerima}</div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                                <div className="font-medium text-gray-800">{ho.items.length} item</div>
                                <div className="text-xs truncate text-gray-500 max-w-[200px]" title={ho.items[0]?.itemName}>
                                    {ho.items[0]?.itemName}{ho.items.length > 1 ? ', ...' : ''}
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <StatusBadge status={ho.status} />
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-right whitespace-nowrap">
                                <div className="flex items-center justify-end space-x-2">
                                    <button onClick={(e) => { e.stopPropagation(); onDetailClick(ho); }} className="p-2 text-slate-400 hover:text-tm-primary hover:bg-blue-50 rounded-full transition-colors"><EyeIcon className="w-5 h-5"/></button>
                                    <button onClick={(e) => { e.stopPropagation(); onDeleteClick(ho.id); }} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"><TrashIcon className="w-5 h-5"/></button>
                                </div>
                            </td>
                        </tr>
                    ))
                ) : (
                    <tr><td colSpan={isBulkSelectMode ? 7 : 6} className="px-6 py-12 text-center text-gray-500"><div className="flex flex-col items-center"><InboxIcon className="w-12 h-12 text-gray-400" /><h3 className="mt-2 text-sm font-medium text-gray-900">Tidak Ada Data Handover</h3></div></td></tr>
                )}
            </tbody>
        </table>
    );
};
