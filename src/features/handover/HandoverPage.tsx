
import React, { useState, useEffect, useMemo } from 'react';
import { Handover, ItemStatus, Asset, User, PreviewData, Request, LoanRequest, LoanRequestStatus, AssetStatus } from '../../types';
import { useNotification } from '../../providers/NotificationProvider';
import { useSortableData } from '../../hooks/useSortableData';
import { exportToCSV } from '../../utils/csvExporter';
import { ExportIcon } from '../../components/icons/ExportIcon';
import { ExclamationTriangleIcon } from '../../components/icons/ExclamationTriangleIcon';
import { HandoverTable } from './components/HandoverTable';
import { HandoverFilterBar } from './components/HandoverFilterBar';
import { HandoverForm } from './HandoverForm';
import HandoverDetailPage from './HandoverDetailPage';
import { ExportHandoverModal } from './components/ExportHandoverModal';
import Modal from '../../components/ui/Modal';
import { SpinnerIcon } from '../../components/icons/SpinnerIcon';

// Stores
import { useTransactionStore } from '../../stores/useTransactionStore';
import { useAssetStore } from '../../stores/useAssetStore';
import { useMasterDataStore } from '../../stores/useMasterDataStore';
import { useAuthStore } from '../../stores/useAuthStore';
import { useRequestStore } from '../../stores/useRequestStore';

interface ItemHandoverPageProps {
    currentUser?: User; // Keeping optional to allow parent override if needed, but store is primary
    prefillData?: Asset | Request | LoanRequest | null;
    onClearPrefill: () => void;
    onShowPreview: (data: PreviewData) => void;
    initialFilters?: any;
    onClearInitialFilters: () => void;
    // Legacy props for compatibility
    handovers?: any; setHandovers?: any; assets?: any; users?: any; divisions?: any;
}

const ItemHandoverPage: React.FC<ItemHandoverPageProps> = (props) => {
    const { prefillData, onClearPrefill, onShowPreview, initialFilters, onClearInitialFilters } = props;
    
    // Stores
    const handovers = useTransactionStore(state => state.handovers);
    const addHandover = useTransactionStore(state => state.addHandover);
    const deleteHandover = useTransactionStore(state => state.deleteHandover);
    
    const updateAssetBatch = useAssetStore(state => state.updateAssetBatch);
    // Kita tidak mengambil assets dari hook state langsung untuk logic save, tapi via getState() nanti
    const users = useMasterDataStore(state => state.users);
    const divisions = useMasterDataStore(state => state.divisions);
    const storeUser = useAuthStore(state => state.currentUser);
    
    // Request Store Actions
    const updateLoanRequest = useRequestStore(state => state.updateLoanRequest);
    const updateRequest = useRequestStore(state => state.updateRequest); 
    
    const currentUser = storeUser || props.currentUser!; 

    // View State
    const [view, setView] = useState<'list' | 'form' | 'detail'>('list');
    const [selectedHandover, setSelectedHandover] = useState<Handover | null>(null);
    
    // List Logic State
    const [searchQuery, setSearchQuery] = useState('');
    const [filters, setFilters] = useState<{ status: string }>({ status: '' });
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [isBulkSelectMode, setIsBulkSelectMode] = useState(false);
    const [selectedHandoverIds, setSelectedHandoverIds] = useState<string[]>([]);
    
    // Modals & Async State
    const [handoverToDeleteId, setHandoverToDeleteId] = useState<string | null>(null);
    const [bulkDeleteConfirmation, setBulkDeleteConfirmation] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    
    // Export Modal State
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);

    const addNotification = useNotification();
    
    // Effects
    useEffect(() => {
        if (prefillData) setView('form');
    }, [prefillData]);
    
    useEffect(() => {
        if (initialFilters?.view === 'list') {
            setView('list');
            onClearInitialFilters();
        }
    }, [initialFilters, onClearInitialFilters]);

    // Data Processing for List
    const filteredHandovers = useMemo(() => {
        let tempHandovers = handovers;
        if (currentUser.role === 'Staff') {
            tempHandovers = tempHandovers.filter(ho => ho.menyerahkan === currentUser.name || ho.penerima === currentUser.name);
        }

        return tempHandovers.filter(ho => {
            const searchLower = searchQuery.toLowerCase();
            return (
                ho.docNumber.toLowerCase().includes(searchLower) ||
                ho.menyerahkan.toLowerCase().includes(searchLower) ||
                ho.penerima.toLowerCase().includes(searchLower) ||
                ho.items.some(item => item.itemName.toLowerCase().includes(searchLower))
            );
        }).filter(ho => filters.status ? ho.status === filters.status : true);
    }, [handovers, searchQuery, filters, currentUser]);

    const { items: sortedHandovers, requestSort, sortConfig } = useSortableData<Handover>(filteredHandovers, { key: 'handoverDate', direction: 'descending' });

    // Action Handlers
    const handleSave = async (data: Omit<Handover, 'id' | 'status'>, targetStatus: AssetStatus) => {
        setIsLoading(true);
        const newHandover: Handover = {
          ...data,
          id: `HO-${String(handovers.length + 1).padStart(3, "0")}`,
          status: ItemStatus.COMPLETED,
        };
        
        try {
            // 1. Create Handover Document
            await addHandover(newHandover);

            // 2. Update Assets Status & Location (BATCH UPDATE)
            const assetIdsInHandover = data.items
                .map(item => item.assetId)
                .filter((id): id is string => !!id);

            if (assetIdsInHandover.length > 0) {
                // LOGIC UPDATE: Mendukung IN_CUSTODY atau IN_USE
                const locationText = targetStatus === AssetStatus.IN_STORAGE 
                    ? 'Gudang Inventori' 
                    : targetStatus === AssetStatus.IN_CUSTODY
                        ? `Dipegang oleh ${data.penerima} (Custody)`
                        : `Digunakan oleh ${data.penerima}`;

                await updateAssetBatch(assetIdsInHandover, {
                    status: targetStatus,
                    currentUser: targetStatus === AssetStatus.IN_STORAGE ? null : data.penerima,
                    location: locationText,
                }, 'Serah Terima (Handover)');
            }
            
            // 3. Update Source Document Status (Request / Loan)
            if (newHandover.woRoIntNumber) {
                // A. Handle Loan Request (Prefix: RL or LREQ)
                if (newHandover.woRoIntNumber.startsWith('RL-') || newHandover.woRoIntNumber.startsWith('LREQ-')) {
                    // Loan dianggap aktif jika aset keluar (baik USE maupun CUSTODY)
                    if (targetStatus === AssetStatus.IN_USE || targetStatus === AssetStatus.IN_CUSTODY) {
                         await updateLoanRequest(newHandover.woRoIntNumber, {
                            status: LoanRequestStatus.ON_LOAN,
                            handoverId: newHandover.id,
                        });
                    }
                } 
                // B. Handle New Asset Request (Prefix: RO or REQ)
                else if (newHandover.woRoIntNumber.startsWith('RO-') || newHandover.woRoIntNumber.startsWith('REQ-')) {
                     // LOGIC PERBAIKAN: Fetch fresh state using getState() to guarantee latest data
                     const freshAssets = useAssetStore.getState().assets;
                     
                     // Ambil semua aset yang terdaftar untuk request ini
                     const allAssetsForRequest = freshAssets.filter(a => a.woRoIntNumber === newHandover.woRoIntNumber);
                     
                     // CRITICAL FIX: 
                     // Request dianggap selesai jika aset SUDAH TIDAK di gudang.
                     // Artinya: Status != IN_STORAGE. 
                     // (IN_USE = Selesai, IN_CUSTODY = Selesai/Diantar, DAMAGED = Selesai/Issue lain)
                     // Kita kecualikan assetIdsInHandover dari pengecekan ini karena store mungkin belum update saat baris ini jalan,
                     // tapi kita tahu mereka baru saja diubah statusnya menjadi targetStatus (yang bukan IN_STORAGE).
                     
                     const remainingInStorage = allAssetsForRequest.filter(a => 
                         !assetIdsInHandover.includes(a.id) && // Kecualikan yang baru saja di-handover
                         a.status === AssetStatus.IN_STORAGE
                     );

                     if (remainingInStorage.length === 0) {
                         // Full Completion
                         await updateRequest(newHandover.woRoIntNumber, {
                             status: ItemStatus.COMPLETED,
                             completionDate: new Date().toISOString(),
                             completedBy: currentUser.name,
                             activityLog: [
                                {
                                    id: Date.now(),
                                    author: 'System',
                                    timestamp: new Date().toISOString(),
                                    type: 'status_change',
                                    payload: { text: `Request selesai. Seluruh aset telah diserahkan (Dokumen Terakhir: ${newHandover.docNumber}).` }
                                }
                             ]
                         });
                     }
                }
            }

            addNotification(`Berita acara serah terima ${newHandover.docNumber} berhasil dibuat.`, "success");
            setView('list');
            if(prefillData) onClearPrefill();
        } catch (e) {
            console.error('Failed to save handover:', e);
            addNotification('Gagal menyimpan handover.', 'error');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleBulkDelete = async () => {
        setIsLoading(true);
        try {
             for (const id of selectedHandoverIds) {
                 await deleteHandover(id);
             }
            addNotification(`${selectedHandoverIds.length} handover berhasil dihapus.`, 'success');
            setBulkDeleteConfirmation(false);
            setIsBulkSelectMode(false);
            setSelectedHandoverIds([]);
        } catch (e) {
             addNotification('Gagal menghapus beberapa handover.', 'error');
        } finally {
             setIsLoading(false);
        }
    };
    
    const handleSingleDelete = async () => {
        if (!handoverToDeleteId) return;
        setIsLoading(true);
        try {
            await deleteHandover(handoverToDeleteId);
            addNotification(`Handover berhasil dihapus.`, 'success');
            setHandoverToDeleteId(null);
        } catch (e) {
             addNotification('Gagal menghapus handover.', 'error');
        } finally {
             setIsLoading(false);
        }
    };
    
    const handleExport = (mappedData: any[], filename: string, extraHeader: any) => {
        exportToCSV(mappedData, filename, extraHeader);
    };

    // Render Helpers
    const renderList = () => (
        <div className="p-4 sm:p-6 md:p-8">
            <div className="flex flex-col items-start justify-between gap-4 mb-6 md:flex-row md:items-center">
                <h1 className="text-3xl font-bold text-tm-dark">Daftar Handover Aset</h1>
                <div className="flex items-center space-x-2">
                    <button onClick={() => setIsExportModalOpen(true)} className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border rounded-lg shadow-sm hover:bg-gray-50">
                        <ExportIcon className="w-4 h-4"/> Export CSV
                    </button>
                    <button onClick={() => setView('form')} className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 rounded-lg shadow-sm bg-tm-primary hover:bg-tm-primary-hover">
                        Buat Handover Baru
                    </button>
                </div>
            </div>

            <HandoverFilterBar 
                searchQuery={searchQuery} 
                onSearchChange={setSearchQuery} 
                filters={filters} 
                onFilterChange={setFilters} 
            />

            {isBulkSelectMode && (
                <div className="p-4 mb-4 bg-blue-50 border-l-4 border-tm-accent rounded-r-lg">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                         <div className="flex flex-wrap items-center gap-3">
                            <span className="text-sm font-medium text-tm-primary">{selectedHandoverIds.length} item terpilih</span>
                            <div className="h-5 border-l border-gray-300"></div>
                            <button onClick={() => setBulkDeleteConfirmation(true)} className="px-3 py-1.5 text-sm font-semibold text-danger-text bg-danger-light rounded-md hover:bg-red-200">Hapus</button>
                        </div>
                        <button onClick={() => { setIsBulkSelectMode(false); setSelectedHandoverIds([]); }} className="px-3 py-1.5 text-sm font-semibold text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">Batal</button>
                    </div>
                </div>
            )}

            <div className="overflow-hidden bg-white border border-gray-200/80 rounded-xl shadow-md">
                <div className="overflow-x-auto custom-scrollbar">
                    <HandoverTable 
                        handovers={sortedHandovers} 
                        onDetailClick={(ho) => { setSelectedHandover(ho); setView('detail'); }} 
                        onDeleteClick={setHandoverToDeleteId}
                        sortConfig={sortConfig} 
                        requestSort={requestSort} 
                        selectedHandoverIds={selectedHandoverIds}
                        onSelectOne={(id) => setSelectedHandoverIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])}
                        onSelectAll={(e) => setSelectedHandoverIds(e.target.checked ? sortedHandovers.map(h => h.id) : [])}
                        isBulkSelectMode={isBulkSelectMode}
                        onEnterBulkMode={() => setIsBulkSelectMode(true)}
                    />
                </div>
            </div>
        </div>
    );

    return (
        <div className={view === 'form' ? 'pb-24' : ''}>
            {view === 'list' && renderList()}
            
            {view === 'form' && (
                <div className="p-4 sm:p-6 md:p-8">
                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-3xl font-bold text-tm-dark">Buat Berita Acara Handover</h1>
                        <button onClick={() => { setView('list'); onClearPrefill(); }} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Kembali</button>
                    </div>
                    <div className="p-4 sm:p-6 bg-white border border-gray-200/80 rounded-xl shadow-md">
                        <HandoverForm onSave={handleSave} onCancel={() => { setView('list'); onClearPrefill(); }} prefillData={prefillData} currentUser={currentUser} />
                    </div>
                </div>
            )}
            
            {view === 'detail' && selectedHandover && (
                <HandoverDetailPage 
                    handover={selectedHandover} 
                    currentUser={currentUser} 
                    users={users} 
                    divisions={divisions} 
                    onBackToList={() => { setView('list'); setSelectedHandover(null); }} 
                    onShowPreview={onShowPreview} 
                    onComplete={() => {}} 
                    isLoading={false} 
                />
            )}

            {/* Modals for Delete Confirmation */}
            {handoverToDeleteId && (
                <Modal isOpen={!!handoverToDeleteId} onClose={() => setHandoverToDeleteId(null)} title="Konfirmasi Hapus" hideDefaultCloseButton>
                    <div className="text-center">
                        <ExclamationTriangleIcon className="w-12 h-12 mx-auto text-red-500" />
                        <h3 className="mt-4 text-lg font-semibold text-gray-800">Hapus Data Handover?</h3>
                        <p className="mt-2 text-sm text-gray-600">Anda yakin ingin menghapus data handover ini? Tindakan ini tidak dapat diurungkan.</p>
                    </div>
                    <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                        <button onClick={() => setHandoverToDeleteId(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Batal</button>
                        <button onClick={handleSingleDelete} disabled={isLoading} className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-danger rounded-lg shadow-sm hover:bg-red-700">
                            {isLoading && <SpinnerIcon className="w-4 h-4 mr-2"/>} Hapus
                        </button>
                    </div>
                </Modal>
            )}
            
            {bulkDeleteConfirmation && (
                <Modal isOpen={bulkDeleteConfirmation} onClose={() => setBulkDeleteConfirmation(false)} title="Konfirmasi Hapus Massal" hideDefaultCloseButton>
                     <div className="text-center">
                        <ExclamationTriangleIcon className="w-12 h-12 mx-auto text-red-500" />
                        <h3 className="mt-4 text-lg font-semibold text-gray-800">Hapus {selectedHandoverIds.length} Handover?</h3>
                    </div>
                    <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
                        <button onClick={() => setBulkDeleteConfirmation(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Batal</button>
                        <button onClick={handleBulkDelete} disabled={isLoading} className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-danger rounded-lg shadow-sm hover:bg-red-700">
                           {isLoading && <SpinnerIcon className="w-4 h-4 mr-2"/>} Ya, Hapus
                        </button>
                    </div>
                </Modal>
            )}

            {isExportModalOpen && (
                <ExportHandoverModal
                    isOpen={true}
                    onClose={() => setIsExportModalOpen(false)}
                    currentUser={currentUser}
                    data={sortedHandovers}
                    onConfirmExport={handleExport}
                />
            )}
        </div>
    );
};
export default ItemHandoverPage;
