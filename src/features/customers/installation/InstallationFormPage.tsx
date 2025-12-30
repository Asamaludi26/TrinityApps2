
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Page, User, Installation, PreviewData, ItemStatus, AssetStatus } from '../../../types';
import { useSortableData } from '../../../hooks/useSortableData';
import { useGenericFilter } from '../../../hooks/useGenericFilter';
import { useNotification } from '../../../providers/NotificationProvider';
import { PaginationControls } from '../../../components/ui/PaginationControls';
import { SearchIcon } from '../../../components/icons/SearchIcon';
import { FileSignatureIcon } from '../../../components/icons/FileSignatureIcon';
import { FilterIcon } from '../../../components/icons/FilterIcon';
import { CloseIcon } from '../../../components/icons/CloseIcon';
import { CustomSelect } from '../../../components/ui/CustomSelect';
import DatePicker from '../../../components/ui/DatePicker';
import { InboxIcon } from '../../../components/icons/InboxIcon';

// Component Imports
import { InstallationTable } from './components/InstallationTable';
import InstallationDetailPage from './InstallationDetailPage';
import { InstallationForm } from './components/InstallationForm';

// Stores
import { useTransactionStore } from '../../../stores/useTransactionStore';
import { useAssetStore } from '../../../stores/useAssetStore';
import { useMasterDataStore } from '../../../stores/useMasterDataStore';
import { useAuthStore } from '../../../stores/useAuthStore';

interface InstallationFormPageProps {
    currentUser: User;
    setActivePage: (page: Page, filters?: any) => void;
    pageInitialState: { prefillCustomer?: string; openDetailForId?: string };
    onShowPreview: (data: PreviewData) => void;
}

const InstallationFormPage: React.FC<InstallationFormPageProps> = (props) => {
    const { currentUser: propUser, pageInitialState, onShowPreview, setActivePage } = props;
    const prefillCustomerId = pageInitialState?.prefillCustomer;
    const openDetailForId = pageInitialState?.openDetailForId;
    
    // Stores
    const installations = useTransactionStore((state) => state.installations);
    const addInstallation = useTransactionStore((state) => state.addInstallation);
    
    const assets = useAssetStore((state) => state.assets); // Need assets for stock lookup
    const updateAsset = useAssetStore((state) => state.updateAsset);
    const customers = useMasterDataStore((state) => state.customers);
    const updateCustomer = useMasterDataStore((state) => state.updateCustomer);
    const users = useMasterDataStore((state) => state.users);
    const divisions = useMasterDataStore((state) => state.divisions);
    
    const storeUser = useAuthStore((state) => state.currentUser);
    const currentUser = storeUser || propUser;

    const [view, setView] = useState<'list' | 'form' | 'detail'>('list');
    const [selectedInstallation, setSelectedInstallation] = useState<Installation | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const addNotification = useNotification();
    
    // Filtering Logic using Custom Hook
    const filterRules = useMemo(() => ({
        technician: (item: Installation, filterValue: string) => item.technician === filterValue,
        startDate: (item: Installation, filterValue: Date | null) => {
            if (!filterValue) return true;
            const start = new Date(filterValue); start.setHours(0,0,0,0);
            const itemDate = new Date(item.installationDate); itemDate.setHours(0,0,0,0);
            return itemDate >= start;
        },
        endDate: (item: Installation, filterValue: Date | null) => {
            if (!filterValue) return true;
            const end = new Date(filterValue); end.setHours(23,59,59,999);
            const itemDate = new Date(item.installationDate);
            return itemDate <= end;
        }
    }), []);

    const { 
        filteredData: filteredInstallations, 
        searchQuery, setSearchQuery, 
        activeFilters, setFilter, 
        resetFilters, activeFilterCount 
    } = useGenericFilter<Installation>({
        data: installations,
        searchKeys: ['docNumber', 'customerName', 'technician'],
        filters: filterRules
    });

    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
    const filterPanelRef = useRef<HTMLDivElement>(null);

     useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (filterPanelRef.current && !filterPanelRef.current.contains(event.target as Node)) {
                setIsFilterPanelOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => { document.removeEventListener("mousedown", handleClickOutside); };
    }, [filterPanelRef]);

    const technicianOptions = useMemo(() => {
         const techNames: string[] = Array.from(new Set(users.filter(u => u.divisionId === 3).map(u => u.name)));
         return techNames.map(name => ({ value: name, label: name }));
    }, [users]);

    useEffect(() => {
        if (prefillCustomerId) {
            setView('form');
        } else if (openDetailForId) {
            const installationToView = installations.find(i => i.id === openDetailForId);
            if (installationToView) {
                setSelectedInstallation(installationToView);
                setView('detail');
            } else {
                addNotification(`Laporan instalasi dengan ID ${openDetailForId} tidak ditemukan.`, 'error');
            }
        }
    }, [prefillCustomerId, openDetailForId, installations, addNotification]);

    const handleSetView = (newView: 'list' | 'form' | 'detail') => {
        if (newView === 'list') {
            setSelectedInstallation(null);
            setActivePage('customer-installation-form');
        }
        setView(newView);
    };
    
    const handleShowDetails = (installation: Installation) => {
        setSelectedInstallation(installation);
        setView('detail');
    };

    // REFACTOR: Now receives docNumber from the form component
    const handleSave = async (installationData: Omit<Installation, 'id' | 'status'>) => {
        const newInstallation: Installation = {
            ...installationData,
            id: `INST-${Date.now()}`, // Internal ID can be simple time based
            status: ItemStatus.COMPLETED,
            // docNumber is already inside installationData
        };
        
        await addInstallation(newInstallation);

        // 1. Update Assets Status (Perangkat)
        for (const item of installationData.assetsInstalled) {
            if (item.assetId) {
                await updateAsset(item.assetId, {
                    status: AssetStatus.IN_USE,
                    currentUser: installationData.customerId,
                    location: `Terpasang di: ${installationData.customerName}`,
                    activityLog: [] 
                });
            }
        }

        // 2. Update Stock for Materials (Consume Logic) & Customer Record
        if (installationData.materialsUsed && installationData.materialsUsed.length > 0) {
             const customer = customers.find(c => c.id === installationData.customerId);
             
             // A. Consume Stock
             for (const mat of installationData.materialsUsed) {
                const availableStock = assets
                    .filter(a => 
                        a.name === mat.itemName && 
                        a.brand === mat.brand && 
                        a.status === AssetStatus.IN_STORAGE
                    )
                    .sort((a, b) => new Date(a.registrationDate).getTime() - new Date(b.registrationDate).getTime());

                const qtyToConsume = Math.min(mat.quantity, availableStock.length);
                
                if (qtyToConsume > 0) {
                    const itemsToUpdate = availableStock.slice(0, qtyToConsume);
                    for (const item of itemsToUpdate) {
                         await updateAsset(item.id, {
                            status: AssetStatus.IN_USE,
                            currentUser: installationData.customerId,
                            location: `Terpasang di: ${installationData.customerName}`,
                            activityLog: [] 
                        });
                    }
                }
             }

             // B. Update Customer Record
             if (customer) {
                 const existingMaterials = customer.installedMaterials || [];
                 const updatedMaterials = [...existingMaterials];

                 installationData.materialsUsed!.forEach((newMat) => {
                    const existingMatIndex = updatedMaterials.findIndex(
                      (em) => em.itemName === newMat.itemName && em.brand === newMat.brand
                    );
                    if (existingMatIndex > -1) {
                      updatedMaterials[existingMatIndex] = {
                        ...updatedMaterials[existingMatIndex],
                        quantity: updatedMaterials[existingMatIndex].quantity + newMat.quantity,
                      };
                    } else {
                      updatedMaterials.push({
                        ...newMat,
                        installationDate: installationData.installationDate,
                      });
                    }
                 });
                 
                 await updateCustomer(customer.id, { installedMaterials: updatedMaterials });
             }
        }

        addNotification(`Berita acara instalasi ${newInstallation.docNumber} berhasil dibuat.`, 'success');
        handleSetView('list');
    };

    const { items: sortedInstallations, requestSort, sortConfig } = useSortableData<Installation>(filteredInstallations, { key: 'installationDate', direction: 'descending' });

    const paginatedInstallations = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedInstallations.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedInstallations, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(sortedInstallations.length / itemsPerPage);

    if (view === 'form') {
        return (
            <div className="p-4 sm:p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-3xl font-bold text-tm-dark">Buat Laporan Instalasi</h1>
                    <button onClick={() => setView('list')} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Kembali ke Daftar</button>
                </div>
                <div className="p-4 sm:p-6 bg-white border border-gray-200/80 rounded-xl shadow-md pb-24">
                    <InstallationForm 
                        currentUser={currentUser}
                        onSave={handleSave}
                        onCancel={() => handleSetView('list')}
                        prefillCustomerId={prefillCustomerId}
                    />
                </div>
            </div>
        );
    }
    
    if (view === 'detail' && selectedInstallation) {
        return <InstallationDetailPage 
                    installation={selectedInstallation} 
                    onBackToList={() => handleSetView('list')} 
                    onShowPreview={onShowPreview} 
                    assets={[]} // Data will be fetched inside detail via id
                    customers={customers}
                    users={users}
                    divisions={divisions}
                />;
    }

    return (
        <div className="p-4 sm:p-6 md:p-8">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
                <h1 className="text-3xl font-bold text-tm-dark">Manajemen Instalasi</h1>
                <button onClick={() => setView('form')} className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 rounded-lg shadow-sm bg-tm-primary hover:bg-tm-primary-hover">
                    <FileSignatureIcon className="w-4 h-4" />
                    Buat Laporan Baru
                </button>
            </div>
            <div className="p-4 mb-4 bg-white border border-gray-200/80 rounded-xl shadow-md">
                <div className="flex flex-wrap items-center gap-4">
                     <div className="relative flex-grow">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none"> <SearchIcon className="w-5 h-5 text-gray-400" /> </div>
                        <input type="text" placeholder="Cari No. Dokumen, Pelanggan, Teknisi..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full h-10 py-2 pl-10 pr-4 text-sm text-gray-900 bg-gray-50 border border-gray-300 rounded-lg focus:ring-tm-accent focus:border-tm-accent" />
                    </div>
                    <div className="relative" ref={filterPanelRef}>
                        <button
                            onClick={() => setIsFilterPanelOpen(p => !p)}
                            className={`inline-flex items-center justify-center gap-2 h-10 px-4 text-sm font-semibold transition-all duration-200 border rounded-lg shadow-sm sm:w-auto 
                                ${activeFilterCount > 0 ? 'bg-tm-light border-tm-accent text-tm-primary' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}
                            `}
                        >
                            <FilterIcon className="w-4 h-4" /> <span>Filter</span> {activeFilterCount > 0 && <span className="px-1.5 py-0.5 text-[10px] font-bold text-white rounded-full bg-tm-primary">{activeFilterCount}</span>}
                        </button>
                        {isFilterPanelOpen && (
                            <>
                                <div onClick={() => setIsFilterPanelOpen(false)} className="fixed inset-0 z-20 bg-black/25 sm:hidden" />
                                <div className="fixed top-32 inset-x-4 z-30 origin-top rounded-xl border border-gray-200 bg-white shadow-lg sm:absolute sm:top-full sm:inset-x-auto sm:right-0 sm:mt-2 sm:w-72">
                                    <div className="flex items-center justify-between p-4 border-b">
                                        <h3 className="text-lg font-semibold text-gray-800">Filter Instalasi</h3>
                                        <button onClick={() => setIsFilterPanelOpen(false)} className="p-1 text-gray-400 rounded-full hover:bg-gray-100"><CloseIcon className="w-5 h-5"/></button>
                                    </div>
                                    <div className="p-4 space-y-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Teknisi</label>
                                            <CustomSelect options={[{value: '', label: 'Semua Teknisi'}, ...technicianOptions]} value={activeFilters.technician || ''} onChange={v => setFilter('technician', v)} />
                                        </div>
                                         <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Tanggal Mulai</label>
                                            <DatePicker id="filterStartDate" selectedDate={activeFilters.startDate} onDateChange={date => setFilter('startDate', date)} />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Tanggal Akhir</label>
                                            <DatePicker id="filterEndDate" selectedDate={activeFilters.endDate} onDateChange={date => setFilter('endDate', date)} />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-gray-50 border-t">
                                        <button onClick={resetFilters} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Reset</button>
                                        <button onClick={() => setIsFilterPanelOpen(false)} className="px-4 py-2 text-sm font-semibold text-white bg-tm-primary rounded-lg shadow-sm hover:bg-tm-primary-hover">Tutup</button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* ACTIVE FILTER CHIPS */}
                {activeFilterCount > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100 animate-fade-in-up mt-3">
                        {activeFilters.technician && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-100 rounded-full">
                                Teknisi: <span className="font-bold">{activeFilters.technician}</span>
                                <button onClick={() => setFilter('technician', '')} className="p-0.5 ml-1 rounded-full hover:bg-blue-200 text-blue-500"><CloseIcon className="w-3 h-3" /></button>
                            </span>
                        )}
                        {(activeFilters.startDate || activeFilters.endDate) && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-100 rounded-full">
                                Tanggal: <span className="font-bold">{activeFilters.startDate ? new Date(activeFilters.startDate).toLocaleDateString('id-ID') : '...'} - {activeFilters.endDate ? new Date(activeFilters.endDate).toLocaleDateString('id-ID') : '...'}</span>
                                <button onClick={() => { setFilter('startDate', null); setFilter('endDate', null); }} className="p-0.5 ml-1 rounded-full hover:bg-purple-200 text-purple-500"><CloseIcon className="w-3 h-3" /></button>
                            </span>
                        )}
                         <button onClick={resetFilters} className="text-xs text-gray-500 hover:text-red-600 hover:underline px-2 py-1">Hapus Semua</button>
                    </div>
                )}
            </div>
            
            <div className="overflow-hidden bg-white border border-gray-200/80 rounded-xl shadow-md">
                <div className="overflow-x-auto custom-scrollbar">
                    {paginatedInstallations.length > 0 ? (
                        <InstallationTable installations={paginatedInstallations} onDetailClick={handleShowDetails} sortConfig={sortConfig} requestSort={requestSort} />
                    ) : (
                        <div className="py-12 text-center text-gray-500"><InboxIcon className="w-12 h-12 mx-auto text-gray-300" /><p className="mt-2 font-semibold">Tidak ada data instalasi.</p></div>
                    )}
                </div>
                {sortedInstallations.length > 0 && <PaginationControls currentPage={currentPage} totalPages={totalPages} totalItems={sortedInstallations.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} onItemsPerPageChange={setItemsPerPage} startIndex={(currentPage - 1) * itemsPerPage} endIndex={(currentPage - 1) * itemsPerPage + paginatedInstallations.length} />}
            </div>
        </div>
    );
};

export default InstallationFormPage;
