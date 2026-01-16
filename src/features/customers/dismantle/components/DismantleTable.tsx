
import React from 'react';
import { Dismantle, ItemStatus } from '../../../../types';
import { SortConfig } from '../../../../hooks/useSortableData';
import { CustomerSortableHeader } from '../../components/CustomerSortableHeader';
import { EyeIcon } from '../../../../components/icons/EyeIcon';
import { InboxIcon } from '../../../../components/icons/InboxIcon';
import { Checkbox } from '../../../../components/ui/Checkbox';
import { useLongPress } from '../../../../hooks/useLongPress';
import { TrashIcon } from '../../../../components/icons/TrashIcon';
import { StatusBadge } from '../../../../components/ui/StatusBadge';

interface DismantleTableProps {
    dismantles: Dismantle[];
    onDetailClick: (dismantle: Dismantle) => void;
    onDeleteClick: (id: string) => void;
    sortConfig: SortConfig<Dismantle> | null;
    requestSort: (key: keyof Dismantle) => void;
    selectedDismantleIds: string[];
    onSelectOne: (id: string) => void;
    onSelectAll: (event: React.ChangeEvent<HTMLInputElement>) => void;
    isBulkSelectMode: boolean;
    onEnterBulkMode: () => void;
}

export const DismantleTable: React.FC<DismantleTableProps> = ({ 
    dismantles, 
    onDetailClick, 
    onDeleteClick,
    sortConfig, 
    requestSort, 
    selectedDismantleIds, 
    onSelectOne, 
    onSelectAll, 
    isBulkSelectMode, 
    onEnterBulkMode 
}) => {
    const longPressHandlers = useLongPress(onEnterBulkMode, 500);

    const handleRowClick = (d: Dismantle) => {
        if (isBulkSelectMode) onSelectOne(d.id);
        else onDetailClick(d);
    };

    return (
        <table className="min-w-full divide-y divide-gray-200">
            <thead className="sticky top-0 z-10 bg-gray-50 shadow-sm">
                <tr>
                    {isBulkSelectMode && (
                        <th scope="col" className="px-6 py-3 w-10"><Checkbox checked={selectedDismantleIds.length === dismantles.length && dismantles.length > 0} onChange={onSelectAll} aria-label="Pilih semua data dismantle" /></th>
                    )}
                    <CustomerSortableHeader columnKey="docNumber" sortConfig={sortConfig} requestSort={requestSort}>No. Dokumen</CustomerSortableHeader>
                    <CustomerSortableHeader columnKey="dismantleDate" sortConfig={sortConfig} requestSort={requestSort}>Tanggal</CustomerSortableHeader>
                    <th scope="col" className="px-6 py-3 text-sm font-semibold tracking-wider text-left text-gray-500">Aset & Pelanggan</th>
                    <CustomerSortableHeader columnKey="technician" sortConfig={sortConfig} requestSort={requestSort}>Teknisi</CustomerSortableHeader>
                    <CustomerSortableHeader columnKey="status" sortConfig={sortConfig} requestSort={requestSort}>Status</CustomerSortableHeader>
                    <th className="relative px-6 py-3"><span className="sr-only">Aksi</span></th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {dismantles.length > 0 ? (
                    dismantles.map((d) => (
                        <tr key={d.id} {...longPressHandlers} onClick={() => handleRowClick(d)} className={`transition-colors cursor-pointer ${selectedDismantleIds.includes(d.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                            {isBulkSelectMode && <td className="px-6 py-4 align-top" onClick={(e) => e.stopPropagation()}><Checkbox checked={selectedDismantleIds.includes(d.id)} onChange={() => onSelectOne(d.id)} /></td>}
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-bold text-gray-900">{d.docNumber}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-xs text-gray-500">{new Date(d.dismantleDate).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'})}</div>
                            </td>
                             <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{d.assetName}</div>
                                <div className="text-xs text-gray-500">dari {d.customerName}</div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-800 whitespace-nowrap">{d.technician}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <StatusBadge status={d.status === ItemStatus.IN_PROGRESS ? 'Menunggu Penerimaan' : d.status} />
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-right whitespace-nowrap">
                                 <div className="flex items-center justify-end space-x-2">
                                    <button onClick={(e) => { e.stopPropagation(); onDetailClick(d); }} className="p-2 text-slate-400 hover:text-tm-primary hover:bg-blue-50 rounded-full transition-colors" title="Lihat Detail"><EyeIcon className="w-5 h-5"/></button>
                                    <button onClick={(e) => { e.stopPropagation(); onDeleteClick(d.id); }} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors" title="Hapus"><TrashIcon className="w-5 h-5"/></button>
                                </div>
                            </td>
                        </tr>
                    ))
                ) : (
                    <tr><td colSpan={isBulkSelectMode ? 7 : 6} className="px-6 py-12 text-center text-gray-500"><div className="flex flex-col items-center"><InboxIcon className="w-12 h-12 text-gray-400" /><h3 className="mt-2 text-sm font-medium text-gray-900">Tidak Ada Data Dismantle</h3><p className="mt-1 text-sm text-gray-500">Ubah filter atau mulai proses dismantle baru.</p></div></td></tr>
                )}
            </tbody>
        </table>
    );
};
