
import React from 'react';
import { Maintenance, ItemStatus } from '../../../../types';
import { SortConfig } from '../../../../hooks/useSortableData';
import { CustomerSortableHeader } from '../../components/CustomerSortableHeader';
import { EyeIcon } from '../../../../components/icons/EyeIcon';
import { InboxIcon } from '../../../../components/icons/InboxIcon';

interface MaintenanceTableProps {
    maintenances: Maintenance[];
    onDetailClick: (maintenance: Maintenance) => void;
    sortConfig: SortConfig<Maintenance> | null;
    requestSort: (key: keyof Maintenance) => void;
}

const getStatusClass = (status: ItemStatus) => {
    switch (status) {
        case ItemStatus.COMPLETED: return 'bg-success-light text-success-text';
        case ItemStatus.IN_PROGRESS: return 'bg-info-light text-info-text';
        default: return 'bg-gray-100 text-gray-800';
    }
};

export const MaintenanceTable: React.FC<MaintenanceTableProps> = ({ 
    maintenances, 
    onDetailClick, 
    sortConfig, 
    requestSort 
}) => {
    return (
        <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
                <tr>
                    <CustomerSortableHeader columnKey="docNumber" sortConfig={sortConfig} requestSort={requestSort}>No. Dokumen / Tanggal</CustomerSortableHeader>
                    <CustomerSortableHeader columnKey="customerName" sortConfig={sortConfig} requestSort={requestSort}>Pelanggan & Aset</CustomerSortableHeader>
                    <CustomerSortableHeader columnKey="technician" sortConfig={sortConfig} requestSort={requestSort}>Teknisi</CustomerSortableHeader>
                    <CustomerSortableHeader columnKey="status" sortConfig={sortConfig} requestSort={requestSort}>Status</CustomerSortableHeader>
                    <th className="relative px-6 py-3"><span className="sr-only">Aksi</span></th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {maintenances.length > 0 ? (
                    maintenances.map(m => (
                        <tr key={m.id} onClick={() => onDetailClick(m)} className="cursor-pointer hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-semibold text-gray-900">{m.docNumber}</div><div className="text-xs text-gray-500">{new Date(m.maintenanceDate).toLocaleDateString('id-ID')}</div></td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{m.customerName}</div>
                                <div className="text-xs text-gray-500 truncate max-w-[200px]" title={(m.assets || []).map(a => a.assetName).join(', ')}>
                                    {(m.assets || []).map(a => a.assetName).join(', ')}
                                </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-800 whitespace-nowrap">{m.technician}</td>
                            <td className="px-6 py-4 whitespace-nowrap"><span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusClass(m.status)}`}>{m.status}</span></td>
                            <td className="px-6 py-4 text-sm font-medium text-right"><button className="p-2 text-gray-500 rounded-full hover:bg-info-light hover:text-info-text"><EyeIcon className="w-5 h-5"/></button></td>
                        </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                            <div className="flex flex-col items-center">
                                <InboxIcon className="w-12 h-12 text-gray-400" />
                                <h3 className="mt-2 text-sm font-medium text-gray-900">Tidak Ada Data Maintenance</h3>
                                <p className="mt-1 text-sm text-gray-500">Ubah filter atau buat laporan baru.</p>
                            </div>
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
    );
};
