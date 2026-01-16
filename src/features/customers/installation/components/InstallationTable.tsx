
import React from 'react';
import { Installation } from '../../../../types';
import { SortConfig } from '../../../../hooks/useSortableData';
import { CustomerSortableHeader } from '../../components/CustomerSortableHeader';
import { EyeIcon } from '../../../../components/icons/EyeIcon';
import { InboxIcon } from '../../../../components/icons/InboxIcon';
import { StatusBadge } from '../../../../components/ui/StatusBadge';

interface InstallationTableProps {
    installations: Installation[];
    onDetailClick: (installation: Installation) => void;
    sortConfig: SortConfig<Installation> | null;
    requestSort: (key: keyof Installation) => void;
}

export const InstallationTable: React.FC<InstallationTableProps> = ({ 
    installations, 
    onDetailClick, 
    sortConfig, 
    requestSort 
}) => {
    return (
        <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 shadow-sm sticky top-0 z-10">
                <tr>
                    <CustomerSortableHeader columnKey="docNumber" sortConfig={sortConfig} requestSort={requestSort}>No. Dokumen</CustomerSortableHeader>
                    <CustomerSortableHeader columnKey="installationDate" sortConfig={sortConfig} requestSort={requestSort}>Tanggal</CustomerSortableHeader>
                    <CustomerSortableHeader columnKey="customerName" sortConfig={sortConfig} requestSort={requestSort}>Pelanggan</CustomerSortableHeader>
                    <CustomerSortableHeader columnKey="technician" sortConfig={sortConfig} requestSort={requestSort}>Teknisi</CustomerSortableHeader>
                    <CustomerSortableHeader columnKey="status" sortConfig={sortConfig} requestSort={requestSort}>Status</CustomerSortableHeader>
                    <th className="relative px-6 py-3"><span className="sr-only">Aksi</span></th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {installations.length > 0 ? (
                    installations.map(inst => (
                        <tr key={inst.id} onClick={() => onDetailClick(inst)} className="cursor-pointer hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-bold text-gray-900">{inst.docNumber}</div>
                            </td>
                             <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-xs text-gray-500">{new Date(inst.installationDate).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'})}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{inst.customerName}</div>
                                <div className="text-xs text-gray-500">{inst.customerId}</div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-800 whitespace-nowrap">{inst.technician}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <StatusBadge status={inst.status} />
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-right">
                                <button className="p-2 text-slate-400 rounded-full hover:bg-blue-50 hover:text-tm-primary transition-colors"><EyeIcon className="w-5 h-5"/></button>
                            </td>
                        </tr>
                    ))
                ) : (
                    <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                            <div className="flex flex-col items-center">
                                <InboxIcon className="w-12 h-12 text-gray-400" />
                                <h3 className="mt-2 text-sm font-medium text-gray-900">Tidak Ada Data Instalasi</h3>
                                <p className="mt-1 text-sm text-gray-500">Ubah filter atau buat laporan baru.</p>
                            </div>
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
    );
};
