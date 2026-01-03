
// ... existing imports
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Asset, AssetStatus, Request, User, PreviewData, AssetCategory, Page, RequestItem, ParsedScanResult, AssetType, AssetCondition } from '../../types';
import { useNotification } from '../../providers/NotificationProvider';
import { useSortableData, SortConfig } from '../../hooks/useSortableData';
import { exportToCSV } from '../../utils/csvExporter';
import { Checkbox } from '../../components/ui/Checkbox';
import { SortAscIcon } from '../../components/icons/SortAscIcon';
import { SortDescIcon } from '../../components/icons/SortDescIcon';
import { SortIcon } from '../../components/icons/SortIcon';
import { ExportIcon } from '../../components/icons/ExportIcon';
import { useLongPress } from '../../hooks/useLongPress';
import { SearchIcon } from '../../components/icons/SearchIcon';
import { PaginationControls } from '../../components/ui/PaginationControls';
import { CustomerIcon } from '../../components/icons/CustomerIcon';
import { PencilIcon } from '../../components/icons/PencilIcon';
import { ClickableLink } from '../../components/ui/ClickableLink';
import { CustomSelect } from '../../components/ui/CustomSelect';
import { FilterIcon } from '../../components/icons/FilterIcon';
import { ModelManagementModal } from '../../components/ui/ModelManagementModal';
import { TypeManagementModal } from '../../components/ui/TypeManagementModal';
import { EyeIcon } from '../../components/icons/EyeIcon';
import { CloseIcon } from '../../components/icons/CloseIcon';
import { InboxIcon } from '../../components/icons/InboxIcon';
import { TrashIcon } from '../../components/icons/TrashIcon';
import { QrCodeIcon } from '../../components/icons/QrCodeIcon'; // Added import
import { BulkLabelModal } from './components/BulkLabelModal'; // Added import

// Components
import { RegistrationForm } from './components/RegistrationForm';
import { RegistrationFormData } from './types';

// Stores
import { useAssetStore } from '../../stores/useAssetStore';
import { useRequestStore } from '../../stores/useRequestStore';
import { useMasterDataStore } from '../../stores/useMasterDataStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useNotificationStore } from '../../stores/useNotificationStore';

interface ItemRegistrationProps {
    currentUser: User;
    prefillData?: { request: Request; itemToRegister?: RequestItem } | null;
    onClearPrefill: () => void;
    onInitiateHandover: (asset: Asset) => void;
    onInitiateDismantle: (asset: Asset) => void;
    onInitiateInstallation: (asset: Asset) => void;
    assetToViewId: string | null;
    initialFilters?: any;
    onClearInitialFilters: () => void;
    itemToEdit: { type: string; id?: string; data?: any } | null;
    onClearItemToEdit: () => void;
    onShowPreview: (data: PreviewData) => void;
    setActivePage: (page: Page, initialState?: any) => void;
    setIsGlobalScannerOpen: (isOpen: boolean) => void;
    setScanContext: (context: 'global' | 'form') => void;
    setFormScanCallback: (callback: ((data: ParsedScanResult) => void) | null) => void;
}

export const getStatusClass = (status: AssetStatus | string) => {
    switch (status) {
        case AssetStatus.IN_USE: return 'bg-info-light text-info-text';
        case AssetStatus.IN_STORAGE: return 'bg-gray-100 text-gray-800';
        case AssetStatus.UNDER_REPAIR: return 'bg-blue-100 text-blue-700';
        case AssetStatus.OUT_FOR_REPAIR: return 'bg-purple-100 text-purple-700';
        case AssetStatus.DAMAGED: return 'bg-warning-light text-warning-text';
        case AssetStatus.DECOMMISSIONED: return 'bg-red-200 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
    }
};

const SortableHeader: React.FC<{
    children: React.ReactNode;
    columnKey: keyof Asset;
    sortConfig: SortConfig<Asset> | null;
    requestSort: (key: keyof Asset) => void;
    className?: string;
}> = ({ children, columnKey, sortConfig, requestSort, className }) => {
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

interface RegistrationTableProps {
    assets: Asset[];
    onDetailClick: (asset: Asset) => void;
    onDeleteClick: (id: string) => void;
    sortConfig: SortConfig<Asset> | null;
    requestSort: (key: keyof Asset) => void;
    selectedAssetIds: string[];
    onSelectOne: (id: string) => void;
    onSelectAll: (event: React.ChangeEvent<HTMLInputElement>) => void;
    isBulkSelectMode: boolean;
    onEnterBulkMode: () => void;
    onShowPreview: (data: PreviewData) => void;
}

const RegistrationTable: React.FC<RegistrationTableProps> = ({ assets, onDetailClick, onDeleteClick, sortConfig, requestSort, selectedAssetIds, onSelectOne, onSelectAll, isBulkSelectMode, onEnterBulkMode, onShowPreview }) => {
    const longPressHandlers = useLongPress(onEnterBulkMode, 500);
    const handleRowClick = (asset: Asset) => {
        if (isBulkSelectMode) {
            onSelectOne(asset.id);
        } else {
            onDetailClick(asset);
        }
    };

    return (
        <table className="min-w-full divide-y divide-gray-200">
            <thead className="sticky top-0 z-10 bg-gray-50">
                <tr>
                    {isBulkSelectMode && (
                        <th scope="col" className="px-6 py-3"><Checkbox checked={selectedAssetIds.length === assets.length && assets.length > 0} onChange={onSelectAll} aria-label="Pilih semua aset" /></th>
                    )}
                    <SortableHeader columnKey="name" sortConfig={sortConfig} requestSort={requestSort}>Aset</SortableHeader>
                    <SortableHeader columnKey="location" sortConfig={sortConfig} requestSort={requestSort}>Lokasi / Pengguna</SortableHeader>
                    <SortableHeader columnKey="status" sortConfig={sortConfig} requestSort={requestSort}>Status</SortableHeader>
                    <th className="relative px-6 py-3"><span className="sr-only">Aksi</span></th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {assets.length > 0 ? (
                    assets.map((asset) => (
                        <tr key={asset.id} {...longPressHandlers} onClick={() => handleRowClick(asset)} className={`transition-colors cursor-pointer ${selectedAssetIds.includes(asset.id) ? 'bg-blue-50' : asset.isDismantled ? 'bg-amber-50 hover:bg-amber-100' : 'hover:bg-gray-50'}`}>
                            {isBulkSelectMode && (
                                <td className="px-6 py-4 align-top" onClick={(e) => e.stopPropagation()}><Checkbox checked={selectedAssetIds.includes(asset.id)} onChange={() => onSelectOne(asset.id)} /></td>
                            )}
                            <td className="px-6 py-4 lg:whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-gray-900">{asset.name}</span>
                                    {asset.lastModifiedDate && <span title={`Diubah: ${new Date(asset.lastModifiedDate).toLocaleString('id-ID')} oleh ${asset.lastModifiedBy}`}><PencilIcon className="w-3.5 h-3.5 text-gray-400" /></span>}
                                    {asset.isDismantled && <span className="px-2 py-0.5 text-xs font-semibold text-amber-800 bg-amber-100 rounded-full">Dismantled</span>}
                                </div>
                                <div className="text-xs text-gray-500">{asset.id} &bull; {asset.category}</div>
                            </td>
                            <td className="px-6 py-4 lg:whitespace-nowrap">
                                {asset.currentUser && asset.currentUser.startsWith('TMI-') ? (
                                    <div className="flex items-center gap-2">
                                        <CustomerIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                        <div><div className="text-sm font-medium text-tm-dark"><ClickableLink onClick={() => onShowPreview({ type: 'customer', id: asset.currentUser! })}>Pelanggan: {asset.currentUser}</ClickableLink></div></div>
                                    </div>
                                ) : (
                                    <>
                                        <div className="text-sm font-medium text-gray-800">{asset.location || '-'}</div>
                                        <div className="text-xs text-gray-500">{asset.currentUser || 'Tidak ada pengguna'}</div>
                                    </>
                                )}
                            </td>
                            <td className="px-6 py-4 lg:whitespace-nowrap">
                                <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusClass(asset.status)}`}>{asset.status}</span>
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-right lg:whitespace-nowrap">
                                <div className="flex items-center justify-end space-x-2">
                                   <button onClick={(e) => { e.stopPropagation(); onDetailClick(asset); }} className="flex items-center justify-center w-8 h-8 text-gray-500 transition-colors bg-gray-100 rounded-full hover:bg-info-light hover:text-info-text" title="Lihat Detail"><EyeIcon className="w-5 h-5"/></button>
                                    <button onClick={(e) => { e.stopPropagation(); onDeleteClick(asset.id); }} className="flex items-center justify-center w-8 h-8 text-gray-500 transition-colors bg-gray-100 rounded-full hover:bg-danger-light hover:text-danger-text" title="Hapus"><TrashIcon className="w-5 h-5"/></button>
                                </div>
                            </td>
                        </tr>
                    ))
                ) : (
                    <tr><td colSpan={isBulkSelectMode ? 5 : 4} className="px-6 py-12 text-center text-gray-500"><div className="flex flex-col items-center"><InboxIcon className="w-12 h-12 text-gray-400" /><h3 className="mt-2 text-sm font-medium text-gray-900">Tidak Ada Data Aset</h3><p className="mt-1 text-sm text-gray-500">Ubah filter atau buat aset baru.</p></div></td></tr>
                )}
            </tbody>
        </table>
    );
};

const ItemRegistration: React.FC<ItemRegistrationProps> = (props) => {
    const { currentUser, setActivePage, onShowPreview, setIsGlobalScannerOpen, setScanContext, setFormScanCallback, prefillData, itemToEdit, onClearPrefill, onClearItemToEdit, initialFilters, onClearInitialFilters } = props;

    // Stores
    const assets = useAssetStore((state) => state.assets);
    const addAsset = useAssetStore((state) => state.addAsset);
    const updateAsset = useAssetStore((state) => state.updateAsset);
    const deleteAsset = useAssetStore((state) => state.deleteAsset);
    const categories = useAssetStore((state) => state.categories);
    const updateRequestRegistration = useRequestStore((state) => state.updateRequestRegistration);
    const addNotification = useNotification();

    // State
    const [view, setView] = useState<'list' | 'form'>('list');
    const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
    const [isBulkLabelModalOpen, setIsBulkLabelModalOpen] = useState(false); // New Modal State
    
    // Modals state for Type/Model management
    const [modelModalState, setModelModalState] = useState<{ isOpen: boolean; category: AssetCategory | null; type: AssetType | null }>({ isOpen: false, category: null, type: null });
    const [typeModalState, setTypeModalState] = useState<{ isOpen: boolean; category: AssetCategory | null; typeToEdit: AssetType | null }>({ isOpen: false, category: null, typeToEdit: null });

    // Filter/Sort/Search state
    const [searchQuery, setSearchQuery] = useState('');
    
    // State Filter Logic
    const initialFilterState = { category: '', status: '', condition: '' };
    const [filters, setFilters] = useState(initialFilterState);
    const [tempFilters, setTempFilters] = useState(filters);
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
    const filterPanelRef = useRef<HTMLDivElement>(null);

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [isBulkSelectMode, setIsBulkSelectMode] = useState(false);
    const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
    
    // Filter click outside effect
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (filterPanelRef.current && !filterPanelRef.current.contains(event.target as Node)) {
                setIsFilterPanelOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => { document.removeEventListener("mousedown", handleClickOutside); };
    }, [filterPanelRef]);

    useEffect(() => {
        if (prefillData || itemToEdit) {
            if (itemToEdit) {
                const asset = assets.find(a => a.id === itemToEdit.id);
                if (asset) setEditingAsset(asset);
            }
            setView('form');
        }
    }, [prefillData, itemToEdit, assets]);

    // Sorting and Filtering
    const { items: sortedAssets, requestSort, sortConfig } = useSortableData<Asset>(
        assets.filter(a => {
            const searchLower = searchQuery.toLowerCase();
            const matchesSearch = (
                a.name.toLowerCase().includes(searchLower) || 
                a.id.toLowerCase().includes(searchLower)
            );
            
            const matchesCategory = filters.category ? a.category === filters.category : true;
            const matchesStatus = filters.status ? a.status === filters.status : true;
            const matchesCondition = filters.condition ? a.condition === filters.condition : true;

            return matchesSearch && matchesCategory && matchesStatus && matchesCondition;
        }), 
        { key: 'registrationDate', direction: 'descending' }
    );

    const paginatedAssets = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return sortedAssets.slice(startIndex, startIndex + itemsPerPage);
    }, [sortedAssets, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(sortedAssets.length / itemsPerPage);

    // Filter Logic Functions
    const activeFilterCount = useMemo(() => {
        return Object.values(filters).filter(Boolean).length;
    }, [filters]);

    const handleApplyFilters = () => {
        setFilters(tempFilters);
        setIsFilterPanelOpen(false);
        setCurrentPage(1); // Reset page on filter
    };

    const handleResetFilters = () => {
        setFilters(initialFilterState);
        setTempFilters(initialFilterState);
        setIsFilterPanelOpen(false);
        setCurrentPage(1);
    };

    const handleRemoveFilter = (key: keyof typeof filters) => {
        setFilters((prev) => ({ ...prev, [key]: "" }));
        setTempFilters((prev) => ({ ...prev, [key]: "" }));
    };

    const categoryFilterOptions = useMemo(() => categories.map(c => ({ value: c.name, label: c.name })), [categories]);
    const statusFilterOptions = Object.values(AssetStatus).map(s => ({ value: s, label: s }));
    const conditionFilterOptions = Object.values(AssetCondition).map(c => ({ value: c, label: c }));

    // Handlers
    
    const handleSave = async (data: RegistrationFormData, assetIdToUpdate?: string) => {
        if (assetIdToUpdate) {
            const updates: Partial<Asset> = {
                name: data.assetName,
                category: data.category,
                type: data.type,
                brand: data.brand,
                purchasePrice: data.purchasePrice,
                vendor: data.vendor,
                poNumber: data.poNumber,
                invoiceNumber: data.invoiceNumber,
                purchaseDate: data.purchaseDate,
                registrationDate: data.registrationDate,
                warrantyEndDate: data.warrantyEndDate,
                condition: data.condition,
                location: data.location,
                locationDetail: data.locationDetail,
                currentUser: data.currentUser,
                notes: data.notes,
                serialNumber: data.bulkItems[0]?.serialNumber, 
                macAddress: data.bulkItems[0]?.macAddress,
            };
            await updateAsset(assetIdToUpdate, updates);
            addNotification(`Aset ${data.assetName} berhasil diperbarui.`, 'success');
        } else {
            // Create New Asset(s)
            // Use UUID or a robust generator here instead of Math.random
            const newAssets: Asset[] = data.bulkItems.map((item, index) => {
                const generatedId = `AST-${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,'0')}-${String(Math.floor(Math.random()*10000)).padStart(4,'0')}-${index}`;

                return {
                    id: generatedId,
                    name: data.assetName,
                    category: data.category,
                    type: data.type,
                    brand: data.brand,
                    serialNumber: item.serialNumber || undefined,
                    macAddress: item.macAddress || undefined,
                    purchasePrice: data.purchasePrice,
                    vendor: data.vendor,
                    poNumber: data.poNumber,
                    invoiceNumber: data.invoiceNumber,
                    purchaseDate: data.purchaseDate,
                    warrantyEndDate: data.warrantyEndDate,
                    registrationDate: data.registrationDate,
                    recordedBy: data.recordedBy,
                    status: AssetStatus.IN_STORAGE, 
                    condition: data.condition,
                    location: data.location,
                    locationDetail: data.locationDetail,
                    currentUser: data.currentUser,
                    notes: data.notes,
                    attachments: data.attachments, 
                    activityLog: [{
                        id: `log-init-${Date.now()}-${index}`,
                        timestamp: new Date().toISOString(),
                        user: data.recordedBy,
                        action: 'Aset Dicatat',
                        details: 'Aset baru didaftarkan ke sistem.',
                        referenceId: data.relatedRequestId || undefined
                    }],
                    woRoIntNumber: data.relatedRequestId,
                };
            });

            for (const asset of newAssets) {
                await addAsset(asset);
            }

            if (data.relatedRequestId && prefillData?.itemToRegister) {
                await updateRequestRegistration(data.relatedRequestId, prefillData.itemToRegister.id, newAssets.length);
                
                // REDIRECT FIX: Go back to Request Detail page after registration
                setActivePage('request', { openDetailForId: data.relatedRequestId });
                return; // Stop here, don't execute the rest of the function (setView list)
            }

            addNotification(`${newAssets.length} aset berhasil didaftarkan.`, 'success');
        }
        
        setView('list');
        setEditingAsset(null);
        onClearPrefill();
        onClearItemToEdit();
    };

    const handleStartScan = (itemId: number) => {
        setScanContext('form');
        // This relies on the RegistrationForm's own callback handler now.
        // But for Global Scanner visibility:
        setIsGlobalScannerOpen(true);
    };

    const handleDetailClick = (asset: Asset) => {
        onShowPreview({ type: 'asset', id: asset.id });
    };

    const handleDeleteClick = async (id: string) => {
        if(window.confirm('Hapus aset ini?')) {
            await deleteAsset(id);
            addNotification('Aset berhasil dihapus', 'success');
        }
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) setSelectedAssetIds(paginatedAssets.map(a => a.id));
        else setSelectedAssetIds([]);
    };

    const handleSelectOne = (id: string) => {
        setSelectedAssetIds(prev => prev.includes(id) ? prev.filter(aid => aid !== id) : [...prev, id]);
    };
    
    // Calculate selected assets for bulk print modal
    const selectedAssetsForPrint = useMemo(() => {
        return assets.filter(a => selectedAssetIds.includes(a.id));
    }, [assets, selectedAssetIds]);

    // Render
    if (view === 'form') {
        return (
            <div className="p-4 sm:p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-3xl font-bold text-tm-dark">Pencatatan Aset</h1>
                    <button onClick={() => {
                        setView('list'); 
                        setEditingAsset(null); 
                        onClearPrefill();
                        onClearItemToEdit();
                    }} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">
                        Kembali ke Daftar
                    </button>
                </div>
                <div className="p-4 sm:p-6 bg-white border border-gray-200/80 rounded-xl shadow-md pb-24">
                    <RegistrationForm 
                        onBack={() => { setView('list'); setEditingAsset(null); onClearPrefill(); onClearItemToEdit(); }}
                        onSave={handleSave}
                        prefillData={prefillData}
                        editingAsset={editingAsset}
                        currentUser={currentUser}
                        assetCategories={categories}
                        setActivePage={setActivePage}
                        openModelModal={(c, t) => setModelModalState({ isOpen: true, category: c, type: t })}
                        openTypeModal={(c, t) => setTypeModalState({ isOpen: true, category: c, typeToEdit: t })}
                        // Scanner Props
                        onStartScan={handleStartScan}
                        setFormScanCallback={setFormScanCallback}
                    />
                </div>
                
                {modelModalState.isOpen && modelModalState.category && modelModalState.type && (
                    <ModelManagementModal 
                        isOpen={modelModalState.isOpen}
                        onClose={() => setModelModalState({ ...modelModalState, isOpen: false })}
                        parentInfo={{ category: modelModalState.category, type: modelModalState.type }}
                    />
                )}
                {typeModalState.isOpen && typeModalState.category && (
                    <TypeManagementModal 
                        isOpen={typeModalState.isOpen}
                        onClose={() => setTypeModalState({ ...typeModalState, isOpen: false })}
                        parentCategory={typeModalState.category}
                        typeToEdit={typeModalState.typeToEdit}
                    />
                )}
            </div>
        )
    }

    return (
        <div className="p-4 sm:p-6 md:p-8">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
                <h1 className="text-3xl font-bold text-tm-dark">Daftar Aset</h1>
                <div className="flex items-center space-x-2">
                    <button onClick={() => exportToCSV(sortedAssets, 'daftar_aset.csv')} className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border rounded-lg shadow-sm hover:bg-gray-50">
                        <ExportIcon className="w-4 h-4"/> Export CSV
                    </button>
                    <button onClick={() => { setView('form'); setEditingAsset(null); }} className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 rounded-lg shadow-sm bg-tm-primary hover:bg-tm-primary-hover">
                        Catat Aset Baru
                    </button>
                </div>
            </div>

            <div className="p-4 mb-4 bg-white border border-gray-200/80 rounded-xl shadow-md space-y-4">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative flex-grow">
                        <SearchIcon className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 top-1/2 left-3" />
                        <input type="text" placeholder="Cari aset..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full h-10 py-2 pl-10 pr-4 text-sm text-gray-900 bg-gray-50 border border-gray-300 rounded-lg focus:ring-tm-accent focus:border-tm-accent" />
                    </div>
                    
                    {/* Filter Button & Panel */}
                    <div className="relative" ref={filterPanelRef}>
                        <button
                            onClick={() => { setTempFilters(filters); setIsFilterPanelOpen(p => !p); }}
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
                                        <h3 className="text-lg font-semibold text-gray-800">Filter Aset</h3>
                                        <button onClick={() => setIsFilterPanelOpen(false)} className="p-1 text-gray-400 rounded-full hover:bg-gray-100"><CloseIcon className="w-5 h-5"/></button>
                                    </div>
                                    <div className="p-4 space-y-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Kategori</label>
                                            <CustomSelect 
                                                options={[{ value: '', label: 'Semua Kategori' }, ...categoryFilterOptions]} 
                                                value={tempFilters.category} 
                                                onChange={v => setTempFilters(f => ({ ...f, category: v }))} 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                                            <CustomSelect 
                                                options={[{ value: '', label: 'Semua Status' }, ...statusFilterOptions]} 
                                                value={tempFilters.status} 
                                                onChange={v => setTempFilters(f => ({ ...f, status: v }))} 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Kondisi</label>
                                            <CustomSelect 
                                                options={[{ value: '', label: 'Semua Kondisi' }, ...conditionFilterOptions]} 
                                                value={tempFilters.condition} 
                                                onChange={v => setTempFilters(f => ({ ...f, condition: v }))} 
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between p-4 bg-gray-50 border-t">
                                        <button onClick={handleResetFilters} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Reset</button>
                                        <button onClick={handleApplyFilters} className="px-4 py-2 text-sm font-semibold text-white bg-tm-primary rounded-lg shadow-sm hover:bg-tm-primary-hover">Terapkan</button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
                
                 {/* Bulk Action Bar */}
                 {isBulkSelectMode && (
                    <div className="p-4 bg-blue-50 border-l-4 border-tm-accent rounded-r-lg animate-fade-in-up">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-3">
                                <span className="text-sm font-medium text-tm-primary">{selectedAssetIds.length} item terpilih</span>
                                <div className="h-5 border-l border-gray-300"></div>
                                <button 
                                    onClick={() => setIsBulkLabelModalOpen(true)}
                                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-blue-800 bg-blue-100 rounded-md hover:bg-blue-200 shadow-sm transition-colors"
                                >
                                    <QrCodeIcon className="w-4 h-4"/> Cetak Label Masal
                                </button>
                                <button onClick={() => {/* Future: Implement bulk delete */}} className="px-3 py-1.5 text-sm font-semibold text-red-600 bg-red-100 rounded-md hover:bg-red-200 opacity-50 cursor-not-allowed">Hapus</button>
                            </div>
                            <button onClick={() => { setIsBulkSelectMode(false); setSelectedAssetIds([]); }} className="px-3 py-1.5 text-sm font-semibold text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">Batal</button>
                        </div>
                    </div>
                )}

                {/* ACTIVE FILTER CHIPS */}
                {activeFilterCount > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100 animate-fade-in-up">
                        {filters.category && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-100 rounded-full">
                                Kategori: <span className="font-bold">{filters.category}</span>
                                <button onClick={() => handleRemoveFilter('category')} className="p-0.5 ml-1 rounded-full hover:bg-blue-200 text-blue-500"><CloseIcon className="w-3 h-3" /></button>
                            </span>
                        )}
                        {filters.status && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-100 rounded-full">
                                Status: <span className="font-bold">{filters.status}</span>
                                <button onClick={() => handleRemoveFilter('status')} className="p-0.5 ml-1 rounded-full hover:bg-purple-200 text-purple-500"><CloseIcon className="w-3 h-3" /></button>
                            </span>
                        )}
                        {filters.condition && (
                            <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-orange-700 bg-orange-50 border border-orange-100 rounded-full">
                                Kondisi: <span className="font-bold">{filters.condition}</span>
                                <button onClick={() => handleRemoveFilter('condition')} className="p-0.5 ml-1 rounded-full hover:bg-orange-200 text-orange-500"><CloseIcon className="w-3 h-3" /></button>
                            </span>
                        )}
                         <button onClick={handleResetFilters} className="text-xs text-gray-500 hover:text-red-600 hover:underline px-2 py-1">Hapus Semua</button>
                    </div>
                )}
            </div>

            <div className="overflow-hidden bg-white border border-gray-200/80 rounded-xl shadow-md">
                <div className="overflow-x-auto custom-scrollbar">
                    <RegistrationTable 
                        assets={paginatedAssets}
                        onDetailClick={handleDetailClick}
                        onDeleteClick={handleDeleteClick}
                        sortConfig={sortConfig}
                        requestSort={requestSort}
                        selectedAssetIds={selectedAssetIds}
                        onSelectOne={handleSelectOne}
                        onSelectAll={handleSelectAll}
                        isBulkSelectMode={isBulkSelectMode}
                        onEnterBulkMode={() => setIsBulkSelectMode(true)}
                        onShowPreview={onShowPreview}
                    />
                </div>
                <PaginationControls 
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={sortedAssets.length}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={setItemsPerPage}
                    startIndex={(currentPage - 1) * itemsPerPage}
                    endIndex={(currentPage - 1) * itemsPerPage + paginatedAssets.length}
                />
            </div>
            
            {/* Bulk Label Modal */}
            {isBulkLabelModalOpen && (
                <BulkLabelModal
                    isOpen={isBulkLabelModalOpen}
                    onClose={() => setIsBulkLabelModalOpen(false)}
                    assets={selectedAssetsForPrint}
                />
            )}
        </div>
    )
}

export default ItemRegistration;
