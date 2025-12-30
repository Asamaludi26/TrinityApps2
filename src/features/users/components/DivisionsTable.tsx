
import React from 'react';
import { Division } from '../../../types';
import { Checkbox } from '../../../components/ui/Checkbox';
import { SortConfig } from '../../../hooks/useSortableData';
import { SortIcon } from '../../../components/icons/SortIcon';
import { SortAscIcon } from '../../../components/icons/SortAscIcon';
import { SortDescIcon } from '../../../components/icons/SortDescIcon';
import { PencilIcon } from '../../../components/icons/PencilIcon';
import { TrashIcon } from '../../../components/icons/TrashIcon';
import { useLongPress } from '../../../hooks/useLongPress';

interface DivisionsTableProps {
    divisions: (Division & { memberCount: number; totalAssets: number })[];
    sortConfig: SortConfig<Division & { memberCount: number; totalAssets: number }> | null;
    requestSort: (key: keyof (Division & { memberCount: number; totalAssets: number })) => void;
    isBulkSelectMode: boolean;
    selectedDivisionIds: number[];
    onSelectOne: (id: number) => void;
    onSelectAll: (ids: number[]) => void;
    onEdit: (division: Division) => void;
    onDelete: (division: Division) => void;
    onDetail: (division: Division) => void;
    onEnterBulkMode: () => void;
}

const SortableDivisionHeader: React.FC<any> = ({ children, columnKey, sortConfig, requestSort, className }) => {
    const isSorted = sortConfig?.key === columnKey;
    const direction = isSorted ? sortConfig.direction : undefined;
    const getSortIcon = () => {
        if (!isSorted) return <SortIcon className="w-4 h-4 text-gray-400" />;
        if (direction === 'ascending') return <SortAscIcon className="w-4 h-4 text-tm-accent" />;
        return <SortDescIcon className="w-4 h-4 text-tm-accent" />;
    };
    return (
        <th scope="col" className={`px-6 py-3 text-sm font-semibold tracking-wider text-left text-gray-500 ${className}`}>
            <button onClick={() => requestSort(columnKey)} className="flex items-center space-x-1 group">
                <span>{children}</span>
                <span className="opacity-50 group-hover:opacity-100">{getSortIcon()}</span>
            </button>
        </th>
    );
};

export const DivisionsTable: React.FC<DivisionsTableProps> = ({
    divisions, sortConfig, requestSort,
    isBulkSelectMode, selectedDivisionIds, onSelectOne, onSelectAll,
    onEdit, onDelete, onDetail, onEnterBulkMode
}) => {
    const longPressHandlers = useLongPress(onEnterBulkMode, 500);

    return (
        <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
                <tr>
                    {isBulkSelectMode && <th className="px-6 py-3"><Checkbox checked={selectedDivisionIds.length > 0 && selectedDivisionIds.length === divisions.length} onChange={e => onSelectAll(e.target.checked ? divisions.map(d => d.id) : [])} /></th>}
                    <SortableDivisionHeader columnKey="name" sortConfig={sortConfig} requestSort={requestSort}>Nama Divisi</SortableDivisionHeader>
                    <SortableDivisionHeader columnKey="memberCount" sortConfig={sortConfig} requestSort={requestSort}>Jumlah Anggota</SortableDivisionHeader>
                    <SortableDivisionHeader columnKey="totalAssets" sortConfig={sortConfig} requestSort={requestSort}>Total Aset</SortableDivisionHeader>
                    <th className="relative px-6 py-3"><span className="sr-only">Aksi</span></th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {divisions.map(division => (
                    <tr key={division.id} {...longPressHandlers} onClick={() => isBulkSelectMode ? onSelectOne(division.id) : onDetail(division)} className={`cursor-pointer transition-colors ${selectedDivisionIds.includes(division.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                        {isBulkSelectMode && <td className="px-6 py-4" onClick={e => e.stopPropagation()}><Checkbox checked={selectedDivisionIds.includes(division.id)} onChange={() => onSelectOne(division.id)} /></td>}
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900 whitespace-nowrap">{division.name}</td>
                        <td className="px-6 py-4 text-sm text-center text-gray-700 whitespace-nowrap">{division.memberCount}</td>
                        <td className="px-6 py-4 text-sm text-center text-gray-700 whitespace-nowrap">{division.totalAssets}</td>
                        <td className="px-6 py-4 text-sm font-medium text-right whitespace-nowrap">
                            <div className="flex items-center justify-end space-x-2">
                                <button onClick={(e) => { e.stopPropagation(); onEdit(division); }} className="p-2 text-gray-500 rounded-full hover:bg-yellow-100 hover:text-yellow-600"><PencilIcon className="w-4 h-4"/></button>
                                <button onClick={(e) => { e.stopPropagation(); onDelete(division); }} className="p-2 text-gray-500 rounded-full hover:bg-red-100 hover:text-red-600"><TrashIcon className="w-4 h-4"/></button>
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};
