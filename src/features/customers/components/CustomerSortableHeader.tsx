
import React, { PropsWithChildren } from 'react';
import { SortConfig } from '../../../hooks/useSortableData';
import { SortIcon } from '../../../components/icons/SortIcon';
import { SortAscIcon } from '../../../components/icons/SortAscIcon';
import { SortDescIcon } from '../../../components/icons/SortDescIcon';

interface CustomerSortableHeaderProps<T> {
    columnKey: keyof T;
    sortConfig: SortConfig<T> | null;
    requestSort: (key: keyof T) => void;
    className?: string;
}

export const CustomerSortableHeader = <T,>({ 
    children, 
    columnKey, 
    sortConfig, 
    requestSort, 
    className = ""
}: PropsWithChildren<CustomerSortableHeaderProps<T>>) => {
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
