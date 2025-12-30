
import React, { useState, useEffect } from 'react';
import { Asset, Customer, User, Request, Handover, Dismantle, AssetStatus, PreviewData, AssetCategory, Division } from '../../types';
import Modal from '../../components/ui/Modal';
import { ChevronLeftIcon } from '../../components/icons/ChevronLeftIcon';
import { ChevronRightIcon } from '../../components/icons/ChevronRightIcon';
import { PencilIcon } from '../../components/icons/PencilIcon';
import { HandoverIcon } from '../../components/icons/HandoverIcon';
import { CustomerIcon } from '../../components/icons/CustomerIcon';
import { DismantleIcon } from '../../components/icons/DismantleIcon';
import { InfoIcon } from '../../components/icons/InfoIcon';
import { Tooltip } from '../../components/ui/Tooltip';
import { WrenchIcon } from '../../components/icons/WrenchIcon';
import { SpinnerIcon } from '../../components/icons/SpinnerIcon';
import { CheckIcon } from '../../components/icons/CheckIcon';
import { TrashIcon } from '../../components/icons/TrashIcon';

// Stores
import { useAssetStore } from '../../stores/useAssetStore';
import { useRequestStore } from '../../stores/useRequestStore';
import { useTransactionStore } from '../../stores/useTransactionStore';
import { useMasterDataStore } from '../../stores/useMasterDataStore';

// Imported Components (Sliced)
import { AssetPreview } from './components/AssetPreview';
import { CustomerPreview, CustomerAssetsPreview, UserPreview, RequestPreview, HandoverPreview, DismantlePreview } from './components/EntityPreviews';
import { StockItemAssetsPreview, StockHistoryPreview } from './components/StockPreviews';

interface PreviewModalProps {
    currentUser: User;
    previewData: PreviewData | null;
    onClose: () => void;
    onShowPreview: (data: PreviewData) => void;
    onEditItem: (data: PreviewData) => void;
    
    // Actions
    onInitiateHandover: (asset: Asset) => void;
    onInitiateDismantle: (asset: Asset) => void;
    onInitiateInstallation: (asset: Asset) => void;
    onReportDamage: (asset: Asset) => void;
    onStartRepair: (asset: Asset) => void;
    onMarkAsRepaired: (asset: Asset) => void;
    onDecommission: (asset: Asset) => void;
    onReceiveFromRepair: (asset: Asset) => void;
    onAddProgressUpdate: (asset: Asset) => void;

    // Legacy Props (kept for TS compatibility but unused in logic, stores are used instead)
    assets?: Asset[];
    customers?: Customer[];
    users?: User[];
    requests?: Request[];
    handovers?: Handover[];
    dismantles?: Dismantle[];
    divisions?: Division[];
    assetCategories?: AssetCategory[];
}

const PreviewModal: React.FC<PreviewModalProps> = (props) => {
    const { 
        currentUser,
        previewData, onClose, onShowPreview, onEditItem,
        onInitiateHandover, onInitiateDismantle, onInitiateInstallation, onReportDamage, onStartRepair, onMarkAsRepaired, onDecommission,
        onReceiveFromRepair, onAddProgressUpdate
    } = props;
    
    // Store Hooks
    const assets = useAssetStore(state => state.assets);
    const assetCategories = useAssetStore(state => state.categories);
    const requests = useRequestStore(state => state.requests);
    const handovers = useTransactionStore(state => state.handovers);
    const dismantles = useTransactionStore(state => state.dismantles);
    const customers = useMasterDataStore(state => state.customers);
    const users = useMasterDataStore(state => state.users);
    const divisions = useMasterDataStore(state => state.divisions);

    const [history, setHistory] = useState<PreviewData[]>([]);

    useEffect(() => {
        if (previewData && !history.some(h => h.id === previewData.id && h.type === previewData.type)) {
            setHistory(prev => [...prev, previewData]);
        } else if (!previewData) {
            setHistory([]);
        }
    }, [previewData, history]);

    const handleBreadcrumbClick = (index: number) => {
        setHistory(prev => prev.slice(0, index + 1));
    };
    
    const handleClose = () => {
        setHistory([]);
        onClose();
    };

    const currentData = history.length > 0 ? history[history.length - 1] : null;

    const getDisplayName = (data: PreviewData) => {
        let item: any = null;
        switch(data.type) {
            case 'asset': item = assets.find(i => i.id === data.id); return item?.name || `Aset ${data.id}`;
            case 'customer': item = customers.find(i => i.id === data.id); return item?.name || `Pelanggan ${data.id}`;
            case 'user': item = users.find(i => i.id === data.id || i.name === data.id); return item?.name || `Pengguna ${data.id}`;
            case 'request': return `Request ${data.id}`;
            case 'handover': item = handovers.find(i => i.id === data.id); return `Handover ${item?.docNumber || data.id}`;
            case 'dismantle': return `Dismantle ${data.id}`;
            case 'customerAssets': item = customers.find(i => i.id === data.id); return `Aset Milik ${item?.name || data.id}`;
            case 'stockItemAssets': { const [name] = String(data.id).split('|'); return `Stok: ${name}`; }
            case 'stockHistory': { const [name] = String(data.id).split('|'); return `Riwayat Stok: ${name}`; }
            default: return 'Detail';
        }
    };

    // --- Content Router ---
    const renderContent = () => {
        if (!currentData) return null;

        switch (currentData.type) {
            case 'asset':
                const asset = assets.find(a => a.id === currentData.id);
                if (!asset) return <p className="text-gray-700">Aset tidak ditemukan.</p>;
                return <AssetPreview 
                    asset={asset} 
                    canViewPrice={['Admin Purchase', 'Super Admin'].includes(currentUser.role)} 
                    onShowPreview={onShowPreview} 
                    getCustomerName={(id) => customers.find(c => c.id === id)?.name || id}
                />;

            case 'customer':
                const customer = customers.find(c => c.id === currentData.id);
                if (!customer) return <p className="text-gray-700">Pelanggan tidak ditemukan.</p>;
                return <CustomerPreview customer={customer} assets={assets} onShowPreview={onShowPreview} />;
            
            case 'customerAssets':
                const customerForAssets = customers.find(c => c.id === currentData.id);
                if (!customerForAssets) return <p className="text-gray-700">Pelanggan tidak ditemukan.</p>;
                return <CustomerAssetsPreview customer={customerForAssets} assets={assets} onShowPreview={onShowPreview} />;

            case 'stockItemAssets':
                const [stkName, stkBrand, stkStatus] = String(currentData.id).split('|');
                if (!stkName || !stkBrand || !stkStatus) return <p className="text-gray-700">Data stok tidak valid.</p>;
                const stockAssets = assets.filter(a => a.name === stkName && a.brand === stkBrand && (stkStatus === 'ALL' ? a.status !== AssetStatus.DECOMMISSIONED : a.status === stkStatus));
                return <StockItemAssetsPreview assets={stockAssets} name={stkName} status={stkStatus} onShowPreview={onShowPreview} />;
            
            case 'stockHistory':
                const [histName, histBrand] = String(currentData.id).split('|');
                if (!histName || !histBrand) return <p className="text-gray-700">Data riwayat stok tidak valid.</p>;
                const historyAssets = assets.filter(a => a.name === histName && a.brand === histBrand);
                return <StockHistoryPreview assets={historyAssets} title={getDisplayName(currentData)} onShowPreview={onShowPreview} />;

            case 'user':
                const user = users.find(u => u.id === currentData.id || u.name === currentData.id);
                if (!user) return <p className="text-gray-700">Pengguna tidak ditemukan.</p>;
                const divisionName = user.divisionId ? divisions.find(d => d.id === user.divisionId)?.name || 'N/A' : 'N/A';
                return <UserPreview user={user} divisionName={divisionName} />;

            case 'request':
                const request = requests.find(r => r.id === currentData.id);
                if (!request) return <p className="text-gray-700">Request tidak ditemukan.</p>;
                return <RequestPreview request={request} />;
            
            case 'handover':
                const handover = handovers.find(h => h.id === currentData.id);
                if (!handover) return <p className="text-gray-700">Handover tidak ditemukan.</p>;
                return <HandoverPreview handover={handover} onShowPreview={onShowPreview} />;

            case 'dismantle':
                const dismantle = dismantles.find(d => d.id === currentData.id);
                if (!dismantle) return <p className="text-gray-700">Dismantle tidak ditemukan.</p>;
                return <DismantlePreview dismantle={dismantle} onShowPreview={onShowPreview} />;

            default:
                return <p className="text-gray-700">Tipe pratinjau tidak dikenal.</p>;
        }
    };
    
    // --- Footer Action Logic ---
    const renderFooter = () => {
        if (!currentData) return null;

        const baseButtons = (
            <div>
                {history.length > 1 ? (
                    <button type="button" onClick={() => handleBreadcrumbClick(history.length - 2)} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">
                        <ChevronLeftIcon className="w-4 h-4" /> Kembali
                    </button>
                ) : (
                    <button type="button" onClick={handleClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Tutup</button>
                )}
            </div>
        );

        const canEdit = currentUser.role !== 'Staff' && currentData && ['asset', 'customer'].includes(currentData.type);

        if (currentData.type === 'asset') {
            const asset = assets.find(a => a.id === currentData.id);
            if (!asset) return baseButtons;
            const category = assetCategories.find(c => c.name === asset.category);
            const canBeInstalled = category?.isCustomerInstallable;
            const isAdmin = currentUser.role === 'Admin Logistik' || currentUser.role === 'Super Admin';
            const isOwner = currentUser.name === asset.currentUser;
            const canReportDamage = isOwner && ![AssetStatus.DAMAGED, AssetStatus.UNDER_REPAIR, AssetStatus.OUT_FOR_REPAIR].includes(asset.status as AssetStatus);

            return (
                <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center w-full gap-3">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        {baseButtons}
                        {canEdit && (
                            <button type="button" onClick={() => onEditItem(currentData)} className="w-full sm:w-auto justify-center inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 transition-all duration-200 bg-white border rounded-lg shadow-sm hover:bg-gray-50">
                                <PencilIcon className="w-4 h-4" /> Edit
                            </button>
                        )}
                    </div>
                    <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 w-full sm:w-auto">
                        {canReportDamage && (
                            <button onClick={() => { onReportDamage(asset); handleClose(); }} className="w-full sm:w-auto justify-center inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-amber-500 rounded-lg shadow-sm hover:bg-amber-600">
                                <WrenchIcon className="w-4 h-4"/> Laporkan Kerusakan
                            </button>
                        )}
                         {isAdmin && asset.status === AssetStatus.DAMAGED && (
                            <button onClick={() => { onStartRepair(asset); handleClose(); }} className="w-full sm:w-auto justify-center inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700">
                                <SpinnerIcon className="w-4 h-4"/> Mulai Proses Perbaikan
                            </button>
                         )}
                         {isAdmin && [AssetStatus.UNDER_REPAIR, AssetStatus.OUT_FOR_REPAIR].includes(asset.status as AssetStatus) && (
                            <button onClick={() => { onAddProgressUpdate(asset); handleClose(); }} className="w-full sm:w-auto justify-center inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700">
                                <InfoIcon className="w-4 h-4"/> Tambah Update
                            </button>
                         )}
                         {isAdmin && asset.status === AssetStatus.OUT_FOR_REPAIR && (
                            <button onClick={() => { onReceiveFromRepair(asset); handleClose(); }} className="w-full sm:w-auto justify-center inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg shadow-sm hover:bg-green-700">
                                <CheckIcon className="w-4 h-4"/> Terima Aset
                            </button>
                         )}
                         {isAdmin && asset.status === AssetStatus.UNDER_REPAIR && (
                            <div className="flex flex-col sm:flex-row gap-2 w-full">
                                <button onClick={() => { onMarkAsRepaired(asset); handleClose(); }} className="w-full justify-center inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-white bg-green-600 rounded-lg shadow-sm hover:bg-green-700">
                                    <CheckIcon className="w-4 h-4"/> Tandai Selesai Diperbaiki
                                </button>
                                <button onClick={() => { onDecommission(asset); handleClose(); }} className="w-full justify-center inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg shadow-sm hover:bg-red-700">
                                    <TrashIcon className="w-4 h-4"/> Tandai Diberhentikan
                                </button>
                            </div>
                        )}
                        {asset.status === AssetStatus.IN_STORAGE && (
                            <>
                                <button onClick={() => { onInitiateHandover(asset); handleClose(); }} className="w-full sm:w-auto justify-center inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white transition-colors bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700">
                                    <HandoverIcon className="w-4 h-4"/> Serah Terima Internal
                                </button>
                                {canBeInstalled ? (
                                    <button onClick={() => { onInitiateInstallation(asset); handleClose(); }} className="w-full sm:w-auto justify-center inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white transition-colors bg-green-600 rounded-lg shadow-sm hover:bg-green-700">
                                        <CustomerIcon className="w-4 h-4"/> Pasang ke Pelanggan
                                    </button>
                                ) : (
                                    <Tooltip text="Kategori aset ini tidak dapat diinstal ke pelanggan.">
                                        <div className="w-full sm:w-auto">{/* Wrapper for Tooltip */}
                                            <button disabled className="w-full justify-center inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gray-400 rounded-lg cursor-not-allowed">
                                                <CustomerIcon className="w-4 h-4"/> Pasang ke Pelanggan
                                            </button>
                                        </div>
                                    </Tooltip>
                                )}
                            </>
                        )}
                        {asset.status === AssetStatus.IN_USE && asset.currentUser?.startsWith('TMI-') && (
                            <button onClick={() => { onInitiateDismantle(asset); handleClose(); }} className="w-full sm:w-auto justify-center inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white transition-colors bg-red-600 rounded-lg shadow-sm hover:bg-red-700">
                                <DismantleIcon className="w-4 h-4"/> Tarik dari Pelanggan
                            </button>
                        )}
                    </div>
                </div>
            );
        }

        return (
            <div className="flex items-center justify-between w-full">
                {baseButtons}
                {canEdit && (
                    <button type="button" onClick={() => onEditItem(currentData)} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 bg-tm-primary rounded-lg shadow-sm hover:bg-tm-primary-hover">
                        <PencilIcon className="w-4 h-4" /> Edit
                    </button>
                )}
            </div>
        );
    };

    return (
        <Modal
            isOpen={!!previewData}
            onClose={handleClose}
            title={history.length > 1 ? '' : (currentData ? getDisplayName(currentData) : 'Pratinjau')}
            size={currentData?.type === 'asset' ? '3xl' : 'xl'}
            zIndex="z-[60]"
            hideDefaultCloseButton={true}
            footerContent={renderFooter()}
            disableContentPadding={currentData?.type === 'asset'}
        >
            {history.length > 1 && (
                <nav className={`flex items-center text-sm font-medium text-gray-500 mb-4 ${currentData?.type === 'asset' ? 'px-6 -mt-2' : '-mt-2'}`} aria-label="Breadcrumb">
                    {history.map((item, index) => (
                        <React.Fragment key={`${item.type}-${item.id}-${index}`}>
                            {index > 0 && <ChevronRightIcon className="w-4 h-4 mx-1 text-gray-400" />}
                            <button 
                                onClick={() => handleBreadcrumbClick(index)} 
                                className={`truncate max-w-[150px] ${index === history.length - 1 ? 'text-tm-primary font-semibold' : 'hover:underline'}`}
                                disabled={index === history.length - 1}
                            >
                                {getDisplayName(item)}
                            </button>
                        </React.Fragment>
                    ))}
                </nav>
            )}
            <div className={`${currentData?.type === 'asset' ? 'px-6' : ''}`}>
                {renderContent()}
            </div>
        </Modal>
    );
};

export default PreviewModal;
