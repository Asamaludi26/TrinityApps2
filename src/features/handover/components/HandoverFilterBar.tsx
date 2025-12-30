
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { SearchIcon } from '../../../components/icons/SearchIcon';
import { FilterIcon } from '../../../components/icons/FilterIcon';
import { CloseIcon } from '../../../components/icons/CloseIcon';
import { CustomSelect } from '../../../components/ui/CustomSelect';
import { ItemStatus } from '../../../types';

interface HandoverFilterBarProps {
    searchQuery: string;
    onSearchChange: (val: string) => void;
    filters: { status: string };
    onFilterChange: (filters: { status: string }) => void;
}

export const HandoverFilterBar: React.FC<HandoverFilterBarProps> = ({
    searchQuery,
    onSearchChange,
    filters,
    onFilterChange
}) => {
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
    const filterPanelRef = useRef<HTMLDivElement>(null);
    const statusOptions = Object.values(ItemStatus).filter(s => [ItemStatus.COMPLETED, ItemStatus.IN_PROGRESS, ItemStatus.PENDING].includes(s)).map(s => ({ value: s, label: s }));

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (filterPanelRef.current && !filterPanelRef.current.contains(event.target as Node)) {
                setIsFilterPanelOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => { document.removeEventListener("mousedown", handleClickOutside); };
    }, []);

    const hasActiveFilters = !!filters.status;

    return (
        <div className="p-4 mb-4 bg-white border border-gray-200/80 rounded-xl shadow-md">
            <div className="flex flex-wrap items-center gap-4">
                {/* Search */}
                <div className="relative flex-grow">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none"><SearchIcon className="w-5 h-5 text-gray-400" /></div>
                    <input 
                        type="text" 
                        placeholder="Cari No. Dokumen, Pihak, Barang..." 
                        value={searchQuery} 
                        onChange={e => onSearchChange(e.target.value)} 
                        className="w-full h-10 py-2 pl-10 pr-4 text-sm text-gray-900 bg-gray-50 border border-gray-300 rounded-lg focus:ring-tm-accent focus:border-tm-accent" 
                    />
                </div>

                {/* Filter Button & Panel */}
                <div className="relative" ref={filterPanelRef}>
                    <button
                        onClick={() => setIsFilterPanelOpen(p => !p)}
                        className={`inline-flex items-center justify-center gap-2 w-full h-10 px-4 text-sm font-semibold transition-all duration-200 border rounded-lg shadow-sm sm:w-auto 
                            ${hasActiveFilters ? 'bg-tm-light border-tm-accent text-tm-primary' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}
                        `}
                    >
                        <FilterIcon className="w-4 h-4" /> <span>Filter</span>
                    </button>
                    {isFilterPanelOpen && (
                        <>
                            <div onClick={() => setIsFilterPanelOpen(false)} className="fixed inset-0 z-20 bg-black/25 sm:hidden" />
                            <div className="fixed top-32 inset-x-4 z-30 origin-top rounded-xl border border-gray-200 bg-white shadow-lg sm:absolute sm:top-full sm:inset-x-auto sm:right-0 sm:mt-2 sm:w-72">
                                <div className="flex items-center justify-between p-4 border-b">
                                    <h3 className="text-lg font-semibold text-gray-800">Filter Handover</h3>
                                    <button onClick={() => setIsFilterPanelOpen(false)} className="p-1 text-gray-400 rounded-full hover:bg-gray-100"><CloseIcon className="w-5 h-5"/></button>
                                </div>
                                <div className="p-4 space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                                        <div className="space-y-2">
                                            {statusOptions.map(opt => (
                                                <button key={opt.value} type="button" onClick={() => onFilterChange({ status: filters.status === opt.value ? '' : opt.value })}
                                                    className={`w-full px-3 py-2 text-sm rounded-md border text-left transition-colors ${ filters.status === opt.value ? 'bg-tm-primary border-tm-primary text-white font-semibold' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50' }`}>
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-gray-50 border-t">
                                    <button onClick={() => { onFilterChange({ status: '' }); setIsFilterPanelOpen(false); }} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Reset</button>
                                    <button onClick={() => setIsFilterPanelOpen(false)} className="px-4 py-2 text-sm font-semibold text-white bg-tm-primary rounded-lg shadow-sm hover:bg-tm-primary-hover">Tutup</button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Active Chips */}
            {hasActiveFilters && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100 animate-fade-in-up mt-3">
                    {filters.status && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-100 rounded-full">
                            Status: <span className="font-bold">{filters.status}</span>
                            <button onClick={() => onFilterChange({ status: '' })} className="p-0.5 ml-1 rounded-full hover:bg-blue-200 text-blue-500"><CloseIcon className="w-3 h-3" /></button>
                        </span>
                    )}
                    <button onClick={() => onFilterChange({ status: '' })} className="text-xs text-gray-500 hover:text-red-600 hover:underline px-2 py-1">Hapus Semua</button>
                </div>
            )}
        </div>
    );
};
