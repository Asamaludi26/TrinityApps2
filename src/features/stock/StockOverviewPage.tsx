
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Asset, AssetStatus, Page, PreviewData, User, AssetCondition, StockMovement, ActivityLogEntry, Attachment } from '../../types';
import { useSortableData } from '../../hooks/useSortableData';
import { PaginationControls } from '../../components/ui/PaginationControls';
import { SearchIcon } from '../../components/icons/SearchIcon';
import { InboxIcon } from '../../components/icons/InboxIcon';
import { ExclamationTriangleIcon } from '../../components/icons/ExclamationTriangleIcon';
import { RequestIcon } from '../../components/icons/RequestIcon';
import { CustomSelect } from '../../components/ui/CustomSelect';
import { CloseIcon } from '../../components/icons/CloseIcon';
import { FilterIcon } from '../../components/icons/FilterIcon';
import { CheckIcon } from '../../components/icons/CheckIcon';
import { SummaryCard } from '../dashboard/components/SummaryCard';
import ReportDamageModal from './components/ReportDamageModal';
import { AssetCard } from './components/AssetCard';
import { StockHistoryModal } from './components/StockHistoryModal';
import { StockTable } from './components/StockTable';

import { ArchiveBoxIcon } from '../../components/icons/ArchiveBoxIcon';
import { AssetIcon } from '../../components/icons/AssetIcon';
import { DollarIcon } from '../../components/icons/DollarIcon';
import { Checkbox } from '../../components/ui/Checkbox';

// Stores
import { useAssetStore } from '../../stores/useAssetStore';
import { useRequestStore } from '../../stores/useRequestStore';
import { useNotificationStore } from '../../stores/useNotificationStore';
import { useTransactionStore } from '../../stores/useTransactionStore'; // NEW IMPORT

interface StockOverviewPageProps {
    currentUser: User;
    setActivePage: (page: Page, filters?: any) => void;
    onShowPreview: (data: PreviewData) => void;
    initialFilters?: any;
    onClearInitialFilters: () => void;
    onReportDamage: (asset: Asset) => void; 
}

export interface StockItem {
    name: string;
    category: string;
    brand: string;
    // Counts (Jumlah Baris/Unit Fisik/Kontainer)
    inStorage: number; 
    inUse: number;
    damaged: number;
    total: number;
    
    valueInStorage: number;
    unitOfMeasure?: string;
    trackingMethod?: 'individual' | 'bulk';
    
    // Measurement Logic Fields
    isMeasurement?: boolean;
    baseUnit?: string; // e.g., "Meter"
    
    // Balances (Saldo Isi untuk Measurement)
    storageBalance: number; // Sisa meteran di gudang (Available Balance)
    inUseBalance: number;   // Total meteran terpasang (Calculated from Transactions)
    damagedBalance: number; // Total meteran rusak
    grandTotalBalance: number; // Total kapasitas awal yang dibeli (Initial Balance Sum)
    
    // Usage History
    usageDetails?: { docNumber: string; qty: number; type: 'install' | 'maintenance' }[];
}

// --- SMART THRESHOLD LOGIC ---
const DEFAULT_UNIT_THRESHOLD = 5;       // Untuk Device/Pcs (5 Unit)
const DEFAULT_MEASUREMENT_THRESHOLD = 2; // Untuk Kabel/Measurement (2 Hasbal/Drum)

const StockOverviewPage: React.FC<StockOverviewPageProps> = ({ currentUser, setActivePage, onShowPreview, initialFilters, onClearInitialFilters }) => {
    // Stores
    const { assets, categories: assetCategories, getStockHistory, updateAsset, thresholds, updateThresholds } = useAssetStore();
    const loanRequests = useRequestStore((state) => state.loanRequests);
    const installations = useTransactionStore((state) => state.installations);
    const maintenances = useTransactionStore((state) => state.maintenances);
    
    const addNotification = useNotificationStore(state => state.addToast);
    
    // State
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [editingThresholdKey, setEditingThresholdKey] = useState<string | null>(null);
    const [tempThreshold, setTempThreshold] = useState<string>('');

    // --- NEW FILTER STATE ---
    const initialFilterState = { 
        category: '', 
        brand: '', 
        status: '', 
        condition: '', 
        lowStockOnly: false, 
        outOfStockOnly: false 
    };
    const [filters, setFilters] = useState(initialFilterState);
    const [tempFilters, setTempFilters] = useState(filters);
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
    const filterPanelRef = useRef<HTMLDivElement>(null);
    
    const [historyModalState, setHistoryModalState] = useState<{ isOpen: boolean; itemName: string; itemBrand: string; movements: StockMovement[] }>({
        isOpen: false, itemName: '', itemBrand: '', movements: []
    });
    
    // --- NEW MODAL STATE ---
    const [isDamageModalOpen, setIsDamageModalOpen] = useState(false);
    const [assetToReport, setAssetToReport] = useState<Asset | null>(null);

    const handleOpenHistory = (name: string, brand: string) => {
        const movements = getStockHistory(name, brand);
        setHistoryModalState({ isOpen: true, itemName: name, itemBrand: brand, movements });
    };

    const handleThresholdChange = (key: string, value: number) => {
        const newThreshold = Math.max(0, value);
        updateThresholds({ ...thresholds, [key]: newThreshold });
    };

    useEffect(() => {
        if (initialFilters) {
            setFilters(prev => ({...prev, ...initialFilters}));
            setTempFilters(prev => ({...prev, ...initialFilters}));
            onClearInitialFilters();
        }
    }, [initialFilters, onClearInitialFilters]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (filterPanelRef.current && !filterPanelRef.current.contains(event.target as Node)) {
                setIsFilterPanelOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => { document.removeEventListener("mousedown", handleClickOutside); };
    }, [filterPanelRef]);

    const activeFilterCount = useMemo(() => {
        return Object.values(filters).filter(value => {
            if (typeof value === 'boolean') return value;
            return !!value;
        }).length;
    }, [filters]);

    const handleApplyFilters = () => {
        setFilters(tempFilters);
        setIsFilterPanelOpen(false);
        setCurrentPage(1);
    };

    const handleResetFilters = () => {
        setFilters(initialFilterState);
        setTempFilters(initialFilterState);
        setIsFilterPanelOpen(false);
        setCurrentPage(1);
    };
    
    const handleRemoveFilter = (key: keyof typeof filters) => {
         setFilters((prev) => ({ ...prev, [key]: typeof prev[key] === 'boolean' ? false : '' }));
         setTempFilters((prev) => ({ ...prev, [key]: typeof prev[key] === 'boolean' ? false : '' }));
    };

    // --- STAFF-SPECIFIC LOGIC ---
    const { myAssets, loanedAssetDetails } = useMemo(() => {
        if (currentUser.role !== 'Staff') return { myAssets: [], loanedAssetDetails: new Map() };
        const permanentlyAssigned = assets.filter(a => a.currentUser === currentUser.name);
        const myActiveLoans = loanRequests.filter(
            lr => lr.requester === currentUser.name && 
                  (lr.status === 'Dipinjam' || lr.status === 'Terlambat' || lr.status === 'Menunggu Pengembalian')
        );
        const loanedAssetIds = myActiveLoans.flatMap(lr => {
             const allAssigned = Object.values(lr.assignedAssetIds || {}).flat();
             const returnedIds = lr.returnedAssetIds || [];
             return allAssigned.filter(id => !returnedIds.includes(id));
        });
        const loanedAssets = assets.filter(a => loanedAssetIds.includes(a.id));
        const allMyAssetsMap = new Map<string, Asset>();
        permanentlyAssigned.forEach(a => allMyAssetsMap.set(a.id, a));
        loanedAssets.forEach(a => allMyAssetsMap.set(a.id, a));
        const finalMyAssets = Array.from(allMyAssetsMap.values());
        const finalLoanedAssetDetails = new Map<string, { returnDate: string | null, loanId: string }>();
        myActiveLoans.forEach(loan => {
            loan.items.forEach(item => {
                const assignedIds = loan.assignedAssetIds?.[item.id] || [];
                const returnedIds = loan.returnedAssetIds || [];
                assignedIds.forEach(assetId => {
                    if (!returnedIds.includes(assetId)) {
                        finalLoanedAssetDetails.set(assetId, { returnDate: item.returnDate || null, loanId: loan.id });
                    }
                });
            });
        });
        return { myAssets: finalMyAssets, loanedAssetDetails: finalLoanedAssetDetails };
    }, [assets, currentUser, loanRequests]);

    const filteredMyAssets = useMemo(() => {
        if (currentUser.role !== 'Staff') return [];
        return myAssets
            .filter(asset => {
                const searchLower = searchQuery.toLowerCase();
                return (
                    asset.name.toLowerCase().includes(searchLower) ||
                    asset.id.toLowerCase().includes(searchLower) ||
                    asset.brand.toLowerCase().includes(searchLower) ||
                    (asset.serialNumber && asset.serialNumber.toLowerCase().includes(searchLower))
                );
            })
            .filter(asset => filters.category ? asset.category === filters.category : true)
            .filter(asset => filters.status ? asset.status === filters.status : true)
            .filter(asset => filters.condition ? asset.condition === filters.condition : true);
    }, [myAssets, currentUser, searchQuery, filters]);

    const { items: sortedMyAssets } = useSortableData(filteredMyAssets, { key: 'name', direction: 'ascending' });
    const myAssetsTotalItems = sortedMyAssets.length;
    const myAssetsTotalPages = Math.ceil(myAssetsTotalItems / itemsPerPage);
    const myAssetsStartIndex = (currentPage - 1) * itemsPerPage;
    const myAssetsPaginated = sortedMyAssets.slice(myAssetsStartIndex, myAssetsStartIndex + itemsPerPage);

    const staffSummary = useMemo(() => {
        if (currentUser.role !== 'Staff') return null;
        return {
            total: myAssets.length,
            goodCondition: myAssets.filter(a => [AssetCondition.GOOD, AssetCondition.BRAND_NEW, AssetCondition.USED_OKAY].includes(a.condition)).length,
            needsAttention: myAssets.filter(a => [AssetCondition.MINOR_DAMAGE, AssetCondition.MAJOR_DAMAGE, AssetCondition.FOR_PARTS].includes(a.condition)).length,
        }
    }, [myAssets, currentUser.role]);

    // --- ADMIN/MANAGER-SPECIFIC LOGIC ---
    const aggregatedStock = useMemo<StockItem[]>(() => {
        if (currentUser.role === 'Staff') return [];
        const stockMap = new Map<string, StockItem>();
        // We include all assets to calculate total owned, but specific statuses filter for inStorage etc.
        const activeAssets = assets.filter(asset => asset.status !== AssetStatus.DECOMMISSIONED);
        
        // 1. Initialize Map
        activeAssets.forEach(asset => {
             const key = `${asset.name}|${asset.brand}`;
            if (!stockMap.has(key)) {
                // Lookup Model/Type details for Measurement Logic
                const category = assetCategories.find(c => c.name === asset.category);
                const type = category?.types.find(t => t.name === asset.type);
                const model = type?.standardItems?.find(m => m.name === asset.name && m.brand === asset.brand);
                
                const isMeasurement = model?.bulkType === 'measurement';

                stockMap.set(key, { 
                    name: asset.name, 
                    category: asset.category, 
                    brand: asset.brand, 
                    inStorage: 0, 
                    inUse: 0, 
                    damaged: 0, 
                    total: 0, 
                    valueInStorage: 0, 
                    // UPDATED LOGIC: Prioritize Model > Type > Default
                    unitOfMeasure: model?.unitOfMeasure || type?.unitOfMeasure || 'Unit', 
                    trackingMethod: type?.trackingMethod || 'individual',
                    
                    isMeasurement,
                    // UPDATED LOGIC: Prioritize Model > Type > Default
                    baseUnit: isMeasurement ? (model?.baseUnitOfMeasure || type?.baseUnitOfMeasure || 'Meter') : undefined,
                    storageBalance: 0,
                    inUseBalance: 0,
                    damagedBalance: 0,
                    grandTotalBalance: 0,
                    usageDetails: []
                });
            }
        });
        
         // 2. Aggregate Asset Data
         activeAssets.forEach(asset => {
            const key = `${asset.name}|${asset.brand}`;
            const current = stockMap.get(key);
            
            if (current) {
                // COUNT AGGREGATION (Row Level) - Ini adalah "Jumlah Fisik" atau "Jumlah Kontainer"
                current.total++;
                
                // MEASUREMENT AGGREGATION (Content Level)
                // Use fallback to initialBalance if currentBalance is not yet set (new items)
                const currentContent = typeof asset.currentBalance === 'number' ? asset.currentBalance : (asset.initialBalance || 0);
                const initialContent = asset.initialBalance || 0;

                if (current.isMeasurement) {
                    current.grandTotalBalance += initialContent;
                }

                // Aggregation Logic by Status
                switch (asset.status) {
                    case AssetStatus.IN_STORAGE: 
                        current.inStorage++; // +1 Hasbal/Drum
                        if (asset.purchasePrice) current.valueInStorage += asset.purchasePrice; 
                        
                        if (current.isMeasurement) {
                            current.storageBalance += currentContent; // +850 Meter
                        }
                        break;
                        
                    case AssetStatus.IN_USE: 
                        current.inUse++; 
                        // Logic for Measurement IN_USE is handled via Transaction History below
                        break;
                        
                    case AssetStatus.DAMAGED: 
                    case AssetStatus.UNDER_REPAIR: 
                    case AssetStatus.OUT_FOR_REPAIR: 
                        current.damaged++; 
                        if (current.isMeasurement) {
                            current.damagedBalance += currentContent;
                        }
                        break;
                }
            }
        });

        // 3. Aggregate Usage History (Installations & Maintenance) for Measurement/Bulk items
        // This gives accurate "Digunakan" numbers for cables/connectors
        const usageMap = new Map<string, { totalQty: number, docs: {docNumber: string, qty: number, type: 'install' | 'maintenance'}[] }>();

        const processUsage = (itemName: string, brand: string, quantity: number, docNumber: string, type: 'install' | 'maintenance') => {
             const key = `${itemName}|${brand}`;
             if (!usageMap.has(key)) usageMap.set(key, { totalQty: 0, docs: [] });
             const entry = usageMap.get(key)!;
             entry.totalQty += quantity;
             // Keep last 5 docs
             if (entry.docs.length < 5) {
                 entry.docs.push({ docNumber: docNumber, qty: quantity, type });
             }
        };

        installations.forEach(inst => {
            inst.materialsUsed?.forEach(mat => {
                processUsage(mat.itemName, mat.brand, mat.quantity, inst.docNumber, 'install');
            });
        });

        maintenances.forEach(mnt => {
            mnt.materialsUsed?.forEach(mat => {
                processUsage(mat.itemName, mat.brand, mat.quantity, mnt.docNumber, 'maintenance');
            });
        });

        // 4. Merge Usage Data into Stock Items
        stockMap.forEach((item, key) => {
             const usage = usageMap.get(key);
             if (usage) {
                 if (item.isMeasurement || item.trackingMethod === 'bulk') {
                     // For measurement, use transaction history for In Use balance
                     item.inUseBalance = usage.totalQty;
                     item.usageDetails = usage.docs;
                 }
             }
        });

        return Array.from(stockMap.values()).filter(item => item.total > 0 || item.inUseBalance > 0);
    }, [assets, assetCategories, currentUser, installations, maintenances]);
    
     const summaryData = useMemo(() => {
        if (currentUser.role === 'Staff') return null;
        
        // Smart count for low stock
        // UPDATED: Now compares PHYSICAL COUNT (Containers/Units) against threshold for ALL items.
        // Even for cables, we care if we have < 2 drums left, not if we have < 2 meters.
        const lowStockItems = aggregatedStock.filter(item => {
            const key = `${item.name}|${item.brand}`;
            const threshold = thresholds[key] ?? (item.isMeasurement ? DEFAULT_MEASUREMENT_THRESHOLD : DEFAULT_UNIT_THRESHOLD);
            
            const stockCount = item.inStorage; // Physical count / Containers
            return stockCount > 0 && stockCount <= threshold;
        }).length;
        
        const outOfStockItems = aggregatedStock.filter(item => {
             const stockCount = item.inStorage;
             return stockCount === 0;
        }).length;

        const totalValueInStorage = aggregatedStock.reduce((sum, item) => sum + item.valueInStorage, 0);
        return { totalTypes: aggregatedStock.length, lowStockItems, outOfStockItems, totalValueInStorage };
    }, [aggregatedStock, thresholds, currentUser.role]);

    const formatCurrencyShort = (value: number): string => {
        if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Miliar`;
        if (value >= 1_000_000) return `${(value / 1_000_000).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} Juta`;
        if (value >= 1000) return `${(value / 1000).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Ribu`;
        return value.toLocaleString('id-ID');
    };
    
    const fullStockValue = summaryData ? `Rp ${summaryData.totalValueInStorage.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : 'Rp 0';
    const shortStockValue = summaryData ? `Rp ${formatCurrencyShort(summaryData.totalValueInStorage)}` : 'Rp 0';

    const filterOptions = useMemo(() => {
        const categories = [...new Set(aggregatedStock.map(item => item.category))];
        const brands = [...new Set(aggregatedStock.map(item => item.brand))];
        return { categories, brands };
    }, [aggregatedStock]);

    const filteredStock = useMemo(() => {
        if (currentUser.role === 'Staff') return [];
        return aggregatedStock
            .filter(item => item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.brand.toLowerCase().includes(searchQuery.toLowerCase()))
            .filter(item => filters.category ? item.category === filters.category : true)
            .filter(item => filters.brand ? item.brand === filters.brand : true)
            .filter(item => {
                if (!filters.lowStockOnly && !filters.outOfStockOnly) return true;
                const key = `${item.name}|${item.brand}`;
                
                // Smart Threshold Logic for Filtering as well
                const threshold = thresholds[key] ?? (item.isMeasurement ? DEFAULT_MEASUREMENT_THRESHOLD : DEFAULT_UNIT_THRESHOLD);
                const stockCount = item.inStorage; // Physical Count
                
                if (filters.lowStockOnly) return stockCount > 0 && stockCount <= threshold;
                if (filters.outOfStockOnly) return stockCount === 0;
                return true;
            });
    }, [aggregatedStock, searchQuery, filters, thresholds, currentUser.role]);

    const { items: sortedStock, requestSort: requestStockSort, sortConfig: stockSortConfig } = useSortableData(filteredStock, { key: 'name', direction: 'ascending' });
    const totalItems = sortedStock.length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedStock = sortedStock.slice(startIndex, startIndex + itemsPerPage);

    // ... (Rest of code remains same for Damage Report logic) ...
    // --- DAMAGE REPORT LOGIC ---
    const handleReportDamageClick = (asset: Asset) => {
        setAssetToReport(asset);
        setIsDamageModalOpen(true);
    };

    const handleDamageSubmit = async (asset: Asset, condition: AssetCondition, description: string, attachments: Attachment[]) => {
        const originalAsset = assets.find(a => a.id === asset.id);
        if (!originalAsset) {
            addNotification('Aset tidak ditemukan untuk dilaporkan.', 'error');
            return;
        }

        const newActivityLog: ActivityLogEntry = {
            id: `log-dmg-${Date.now()}`,
            timestamp: new Date().toISOString(),
            user: currentUser.name,
            action: 'Kerusakan Dilaporkan',
            details: `Kondisi diubah menjadi "${condition}" dengan deskripsi: "${description}"`
        };

        try {
            await updateAsset(asset.id, {
                status: AssetStatus.DAMAGED,
                condition: condition,
                activityLog: [...(originalAsset.activityLog || []), newActivityLog],
                attachments: [...(originalAsset.attachments || []), ...attachments],
            });
            addNotification(`Kerusakan pada ${asset.name} berhasil dilaporkan.`, 'success');
        } catch (error) {
            addNotification('Gagal melaporkan kerusakan.', 'error');
        }
    };

    // --- UI HELPERS ---
    const staffCategoryOptions = useMemo(() => [
        { value: '', label: 'Semua Kategori' },
        ...[...new Set(myAssets.map(a => a.category))].map(c => ({ value: c, label: c }))
    ], [myAssets]);
    
    const staffStatusOptions = useMemo(() => [ { value: '', label: 'Semua Status' }, ...Object.values(AssetStatus).map(s => ({ value: s, label: s })) ], []);
    const staffConditionOptions = useMemo(() => [ { value: '', label: 'Semua Kondisi' }, ...Object.values(AssetCondition).map(s => ({ value: s, label: s })) ], []);

    // --- RENDER STAFF VIEW ---
    if (currentUser.role === 'Staff') {
        // ... (Existing Staff Render Logic)
        return (
            <div className="p-4 sm:p-6 md:p-8 space-y-8">
                <h1 className="text-3xl font-bold text-tm-dark">Aset Saya</h1>
                
                {staffSummary && (
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                        <SummaryCard title="Total Aset Saya" value={staffSummary.total} icon={ArchiveBoxIcon} color="blue" isActive={!filters.condition} onClick={() => { setFilters(f => ({...f, condition: ''})); setTempFilters(f => ({...f, condition: ''})); }} />
                        <SummaryCard title="Kondisi Baik" value={staffSummary.goodCondition} icon={CheckIcon} color="green" isActive={filters.condition === 'GOOD'} onClick={() => { setFilters(f => ({...f, condition: 'GOOD'})); setTempFilters(f => ({...f, condition: 'GOOD'})); }} />
                        <SummaryCard title="Perlu Perhatian" value={staffSummary.needsAttention} icon={ExclamationTriangleIcon} color="amber" isActive={filters.condition === 'ATTENTION'} onClick={() => { setFilters(f => ({...f, condition: 'ATTENTION'})); setTempFilters(f => ({...f, condition: 'ATTENTION'})); }} />
                    </div>
                )}
                
                <div className="p-4 bg-white border border-gray-200/80 rounded-xl shadow-md">
                     {/* ... Filter Components ... */}
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="relative flex-grow">
                            <SearchIcon className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 top-1/2 left-3" />
                            <input type="text" placeholder="Cari nama, ID, brand, atau SN..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full h-10 py-2 pl-10 pr-4 text-sm text-gray-900 bg-gray-50 border border-gray-300 rounded-lg focus:ring-tm-accent focus:border-tm-accent" />
                        </div>
                        
                         <div className="relative" ref={filterPanelRef}>
                            <button onClick={() => { setTempFilters(filters); setIsFilterPanelOpen(p => !p); }} className={`inline-flex items-center justify-center gap-2 h-10 px-4 text-sm font-semibold transition-all duration-200 border rounded-lg shadow-sm sm:w-auto ${activeFilterCount > 0 ? 'bg-tm-light border-tm-accent text-tm-primary' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                                <FilterIcon className="w-4 h-4" /> <span>Filter</span> {activeFilterCount > 0 && <span className="px-1.5 py-0.5 text-[10px] font-bold text-white rounded-full bg-tm-primary">{activeFilterCount}</span>}
                            </button>
                            {isFilterPanelOpen && (
                                <>
                                    <div onClick={() => setIsFilterPanelOpen(false)} className="fixed inset-0 z-20 bg-black/25 sm:hidden" />
                                    <div className="fixed top-32 inset-x-4 z-30 origin-top rounded-xl border border-gray-200 bg-white shadow-lg sm:absolute sm:top-full sm:inset-x-auto sm:right-0 sm:mt-2 sm:w-72">
                                        <div className="flex items-center justify-between p-4 border-b"><h3 className="text-lg font-semibold text-gray-800">Filter Aset</h3><button onClick={() => setIsFilterPanelOpen(false)} className="p-1 text-gray-400 rounded-full hover:bg-gray-100"><CloseIcon className="w-5 h-5"/></button></div>
                                        <div className="p-4 space-y-4">
                                            <div><label className="block text-sm font-semibold text-gray-700 mb-2">Kategori</label><CustomSelect options={staffCategoryOptions} value={tempFilters.category} onChange={v => setTempFilters(f => ({ ...f, category: v }))} /></div>
                                            <div><label className="block text-sm font-semibold text-gray-700 mb-2">Status</label><CustomSelect options={staffStatusOptions} value={tempFilters.status} onChange={v => setTempFilters(f => ({ ...f, status: v }))} /></div>
                                             <div><label className="block text-sm font-semibold text-gray-700 mb-2">Kondisi</label><CustomSelect options={staffConditionOptions} value={tempFilters.condition} onChange={v => setTempFilters(f => ({ ...f, condition: v }))} /></div>
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
                     {activeFilterCount > 0 && (
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100 animate-fade-in-up mt-3">
                            {filters.category && (<span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-100 rounded-full">Kategori: <span className="font-bold">{filters.category}</span><button onClick={() => handleRemoveFilter('category')} className="p-0.5 ml-1 rounded-full hover:bg-blue-200 text-blue-500"><CloseIcon className="w-3 h-3" /></button></span>)}
                            {filters.status && (<span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-100 rounded-full">Status: <span className="font-bold">{filters.status}</span><button onClick={() => handleRemoveFilter('status')} className="p-0.5 ml-1 rounded-full hover:bg-purple-200 text-purple-500"><CloseIcon className="w-3 h-3" /></button></span>)}
                             {filters.condition && (<span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-orange-700 bg-orange-50 border border-orange-100 rounded-full">Kondisi: <span className="font-bold">{filters.condition}</span><button onClick={() => handleRemoveFilter('condition')} className="p-0.5 ml-1 rounded-full hover:bg-orange-200 text-orange-500"><CloseIcon className="w-3 h-3" /></button></span>)}
                             <button onClick={handleResetFilters} className="text-xs text-gray-500 hover:text-red-600 hover:underline px-2 py-1">Hapus Semua</button>
                        </div>
                    )}
                </div>

                {myAssetsPaginated.length > 0 ? (
                    <>
                        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                            {myAssetsPaginated.map(asset => {
                                const isLoaned = loanedAssetDetails.has(asset.id);
                                const loanDetails = isLoaned ? loanedAssetDetails.get(asset.id) : null;
                                return (
                                    <AssetCard
                                        key={asset.id}
                                        asset={asset}
                                        onShowDetail={onShowPreview}
                                        onReportDamage={handleReportDamageClick}
                                        isLoaned={isLoaned}
                                        returnDate={loanDetails?.returnDate || null}
                                        onReturn={isLoaned && loanDetails ? () => setActivePage('return-form', { loanId: loanDetails.loanId, assetId: asset.id }) : undefined}
                                    />
                                );
                            })}
                        </div>
                         <PaginationControls currentPage={currentPage} totalPages={myAssetsTotalPages} totalItems={myAssetsTotalItems} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} onItemsPerPageChange={setItemsPerPage} startIndex={myAssetsStartIndex} endIndex={myAssetsStartIndex + myAssetsPaginated.length} />
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full p-8 text-center text-gray-500 bg-white border-2 border-dashed rounded-xl">
                        <InboxIcon className="w-16 h-16 text-gray-300" />
                        <p className="mt-4 text-lg font-semibold">{searchQuery || Object.values(filters).some(Boolean) ? 'Aset Tidak Ditemukan' : 'Anda Belum Memiliki Aset'}</p>
                        <p className="mt-1 text-sm">{searchQuery || Object.values(filters).some(Boolean) ? 'Coba ubah kata kunci atau filter pencarian Anda.' : 'Aset yang Anda pegang akan muncul di sini. Jika Anda membutuhkan aset, silakan buat permintaan.'}</p>
                        <button onClick={() => setActivePage('request')} className="inline-flex items-center justify-center gap-2 mt-4 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 rounded-lg shadow-sm bg-tm-primary hover:bg-tm-primary-hover"><RequestIcon className="w-4 h-4" /> Buat Request Aset Baru</button>
                    </div>
                )}
                 <ReportDamageModal isOpen={isDamageModalOpen} onClose={() => setIsDamageModalOpen(false)} asset={assetToReport} onSubmit={handleDamageSubmit} />
            </div>
        );
    }
    
    // --- RENDER ADMIN VIEW ---
    return (
        <div className="p-4 sm:p-6 md:p-8 space-y-8">
            <h1 className="text-3xl font-bold text-tm-dark">Stok Aset</h1>
            
            {summaryData && (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    <SummaryCard title="Total Tipe Aset" value={summaryData.totalTypes} icon={AssetIcon} color="blue" />
                    <SummaryCard title="Total Nilai Stok Gudang" value={shortStockValue} tooltipText={fullStockValue} icon={DollarIcon} color="green" />
                    <SummaryCard title="Stok Menipis" value={summaryData.lowStockItems} icon={ExclamationTriangleIcon} color="amber" onClick={() => { const newFilterState = !filters.lowStockOnly; setFilters(f => ({ ...initialFilterState, lowStockOnly: newFilterState })); setTempFilters(f => ({ ...initialFilterState, lowStockOnly: newFilterState })); }} isActive={filters.lowStockOnly} />
                    <SummaryCard title="Stok Habis" value={summaryData.outOfStockItems} icon={InboxIcon} color="red" onClick={() => { const newFilterState = !filters.outOfStockOnly; setFilters(f => ({ ...initialFilterState, outOfStockOnly: newFilterState })); setTempFilters(f => ({ ...initialFilterState, outOfStockOnly: newFilterState }));}} isActive={filters.outOfStockOnly} />
                </div>
            )}
            
            <div className="p-4 bg-white border border-gray-200/80 rounded-xl shadow-md">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative flex-grow">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none"><SearchIcon className="w-5 h-5 text-gray-400" /></div>
                        <input type="text" placeholder="Cari nama atau brand aset..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-10 py-2 pl-10 pr-10 text-sm text-gray-900 bg-gray-50 border border-gray-300 rounded-lg focus:ring-tm-accent focus:border-tm-accent"/>
                         {searchQuery && (<div className="absolute inset-y-0 right-0 flex items-center pr-3"><button type="button" onClick={() => setSearchQuery('')} className="p-1 text-gray-400 rounded-full hover:bg-gray-200 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-tm-accent" aria-label="Hapus pencarian"><CloseIcon className="w-4 h-4" /></button></div>)}
                    </div>
                    <div className="relative" ref={filterPanelRef}>
                        <button onClick={() => { setTempFilters(filters); setIsFilterPanelOpen(p => !p); }} className={`inline-flex items-center justify-center gap-2 h-10 px-4 text-sm font-semibold transition-all duration-200 border rounded-lg shadow-sm sm:w-auto ${activeFilterCount > 0 ? 'bg-tm-light border-tm-accent text-tm-primary' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
                            <FilterIcon className="w-4 h-4" /> <span>Filter</span> {activeFilterCount > 0 && <span className="px-1.5 py-0.5 text-[10px] font-bold text-white rounded-full bg-tm-primary">{activeFilterCount}</span>}
                        </button>
                        {isFilterPanelOpen && (
                           <>
                                <div onClick={() => setIsFilterPanelOpen(false)} className="fixed inset-0 z-20 bg-black/25 sm:hidden" />
                                <div className="fixed top-32 inset-x-4 z-30 origin-top rounded-xl border border-gray-200 bg-white shadow-lg sm:absolute sm:top-full sm:inset-x-auto sm:right-0 sm:mt-2 sm:w-72">
                                    <div className="flex items-center justify-between p-4 border-b"><h3 className="text-lg font-semibold text-gray-800">Filter Stok</h3><button onClick={() => setIsFilterPanelOpen(false)} className="p-1 text-gray-400 rounded-full hover:bg-gray-100"><CloseIcon className="w-5 h-5"/></button></div>
                                    <div className="p-4 space-y-4">
                                        <div><label className="block text-sm font-semibold text-gray-700 mb-2">Kategori</label><CustomSelect options={[{ value: '', label: 'Semua Kategori' }, ...filterOptions.categories.map(c => ({ value: c, label: c }))]} value={tempFilters.category} onChange={v => setTempFilters(f => ({...f, category: v}))}/></div>
                                        <div><label className="block text-sm font-semibold text-gray-700 mb-2">Brand</label><CustomSelect options={[{ value: '', label: 'Semua Brand' }, ...filterOptions.brands.map(b => ({ value: b, label: b }))]} value={tempFilters.brand} onChange={v => setTempFilters(f => ({...f, brand: v}))}/></div>
                                        <div>
                                            <div className="flex items-center p-2 -m-2 rounded-md hover:bg-gray-50"><Checkbox id="low-stock-filter" checked={tempFilters.lowStockOnly} onChange={e => setTempFilters(f => ({...f, lowStockOnly: e.target.checked, outOfStockOnly: e.target.checked ? false : f.outOfStockOnly }))} /><label htmlFor="low-stock-filter" className="ml-3 text-sm font-medium text-gray-700 cursor-pointer">Hanya stok menipis</label></div>
                                             <div className="flex items-center p-2 -m-2 rounded-md hover:bg-gray-50 mt-2"><Checkbox id="out-of-stock-filter" checked={tempFilters.outOfStockOnly} onChange={e => setTempFilters(f => ({...f, outOfStockOnly: e.target.checked, lowStockOnly: e.target.checked ? false : f.lowStockOnly }))} /><label htmlFor="out-of-stock-filter" className="ml-3 text-sm font-medium text-gray-700 cursor-pointer">Hanya stok habis</label></div>
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
                 {activeFilterCount > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100 animate-fade-in-up mt-3">
                        {filters.category && (<span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-100 rounded-full">Kategori: <span className="font-bold">{filters.category}</span><button onClick={() => handleRemoveFilter('category')} className="p-0.5 ml-1 rounded-full hover:bg-blue-200 text-blue-500"><CloseIcon className="w-3 h-3" /></button></span>)}
                         {filters.brand && (<span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full">Brand: <span className="font-bold">{filters.brand}</span><button onClick={() => handleRemoveFilter('brand')} className="p-0.5 ml-1 rounded-full hover:bg-indigo-200 text-indigo-500"><CloseIcon className="w-3 h-3" /></button></span>)}
                        {filters.lowStockOnly && (<span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-100 rounded-full">Stok Menipis<button onClick={() => handleRemoveFilter('lowStockOnly')} className="p-0.5 ml-1 rounded-full hover:bg-amber-200 text-amber-500"><CloseIcon className="w-3 h-3" /></button></span>)}
                         {filters.outOfStockOnly && (<span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-100 rounded-full">Stok Habis<button onClick={() => handleRemoveFilter('outOfStockOnly')} className="p-0.5 ml-1 rounded-full hover:bg-red-200 text-red-500"><CloseIcon className="w-3 h-3" /></button></span>)}
                         <button onClick={handleResetFilters} className="text-xs text-gray-500 hover:text-red-600 hover:underline px-2 py-1">Hapus Semua</button>
                    </div>
                )}
            </div>
            
            <div className="overflow-hidden bg-white border border-gray-200/80 rounded-xl shadow-md">
                <div className="overflow-x-auto custom-scrollbar">
                    <StockTable 
                        stockItems={paginatedStock}
                        sortConfig={stockSortConfig}
                        requestStockSort={requestStockSort}
                        thresholds={thresholds}
                        onThresholdChange={handleThresholdChange}
                        onOpenHistory={handleOpenHistory}
                        onShowPreview={onShowPreview}
                        setActivePage={setActivePage}
                        editingThresholdKey={editingThresholdKey}
                        setEditingThresholdKey={setEditingThresholdKey}
                        tempThreshold={tempThreshold}
                        setTempThreshold={setTempThreshold}
                    />
                </div>
                <PaginationControls 
                    currentPage={currentPage} 
                    totalPages={totalPages} 
                    totalItems={totalItems} 
                    itemsPerPage={itemsPerPage} 
                    onPageChange={setCurrentPage} 
                    onItemsPerPageChange={(size) => { setItemsPerPage(size); setCurrentPage(1); }} 
                    startIndex={startIndex} 
                    endIndex={startIndex + paginatedStock.length}
                />
            </div>
            
             {historyModalState.isOpen && (
                <StockHistoryModal 
                    isOpen={historyModalState.isOpen}
                    onClose={() => setHistoryModalState(prev => ({...prev, isOpen: false}))}
                    itemName={historyModalState.itemName}
                    itemBrand={historyModalState.itemBrand}
                    movements={historyModalState.movements}
                />
            )}
        </div>
    );
};

export default StockOverviewPage;
