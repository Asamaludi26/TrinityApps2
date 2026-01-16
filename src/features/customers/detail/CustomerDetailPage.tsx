
import React, { useMemo, useState } from 'react';
import { Customer, Asset, Page, PreviewData, Maintenance, Dismantle, Installation, CustomerStatus, AssetStatus, AssetCondition, ItemStatus } from '../../../types';
import { DetailPageLayout } from '../../../components/layout/DetailPageLayout';
import { PencilIcon } from '../../../components/icons/PencilIcon';
import { WrenchIcon } from '../../../components/icons/WrenchIcon';
import { ClickableLink } from '../../../components/ui/ClickableLink';
import { DismantleIcon } from '../../../components/icons/DismantleIcon';
import { Tooltip } from '../../../components/ui/Tooltip';
import { HistoryIcon } from '../../../components/icons/HistoryIcon';
import { 
    BsBoxSeam, BsLightningFill, BsRouter, BsHddNetwork, BsCalendar3, 
    BsFileText, BsPaperclip, BsFilePdf, BsGeoAlt, BsTelephone, 
    BsEnvelope, BsCurrencyDollar, BsClockHistory, BsExclamationTriangleFill,
    BsCheckCircleFill, BsShieldCheck, BsArchive, BsPersonBadge,
    BsArrowRight, BsPlusLg, BsFileEarmarkPlus, BsHourglassSplit
} from 'react-icons/bs';
import { EyeIcon } from '../../../components/icons/EyeIcon';
import { DownloadIcon } from '../../../components/icons/DownloadIcon';
import { viewAttachment } from '../../../utils/fileUtils';

// Stores
import { useMasterDataStore } from '../../../stores/useMasterDataStore';
import { useAssetStore } from '../../../stores/useAssetStore';
import { useTransactionStore } from '../../../stores/useTransactionStore';

interface CustomerDetailPageProps {
    initialState: { customerId: string };
    setActivePage: (page: Page, filters?: any) => void;
    onShowPreview: (data: PreviewData) => void;
    onInitiateDismantle: (asset: Asset) => void;
    // Legacy props ignored
}

// --- HELPER COMPONENTS ---

const StatCard: React.FC<{ label: string; value: string; subtext?: string; icon: any; color: string }> = ({ label, value, subtext, icon: Icon, color }) => (
    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-start gap-4 transition-all hover:shadow-md">
        <div className={`p-3 rounded-lg ${color} bg-opacity-10 text-current`}>
            <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
        </div>
        <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</p>
            <h4 className="text-xl font-bold text-gray-900 mt-1">{value}</h4>
            {subtext && <p className="text-xs text-gray-500 mt-0.5">{subtext}</p>}
        </div>
    </div>
);

const AssetCard: React.FC<{ 
    asset: Asset; 
    onShowPreview: (data: PreviewData) => void; 
    onMaintenance: (id: string) => void; 
    onDismantle: (id: string) => void;
    isSuspended: boolean;
}> = ({ asset, onShowPreview, onMaintenance, onDismantle, isSuspended }) => {
    // Logic: Usia Aset
    const installDate = new Date(asset.registrationDate); // Asumsi tgl reg adalah tgl pasang utk CPE
    const ageInMonths = Math.floor((new Date().getTime() - installDate.getTime()) / (1000 * 60 * 60 * 24 * 30));
    const isOld = ageInMonths > 36; // 3 Tahun

    return (
        <div className="group flex flex-col bg-white border border-gray-200 rounded-xl shadow-sm hover:border-tm-primary/50 transition-all overflow-hidden">
            <div className="p-4 flex items-start justify-between bg-gray-50/50 border-b border-gray-100">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${isOld ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                        <BsRouter className="w-5 h-5" />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-gray-800 group-hover:text-tm-primary transition-colors cursor-pointer" onClick={() => onShowPreview({ type: 'asset', id: asset.id })}>
                            {asset.name}
                        </h4>
                        <p className="text-xs text-gray-500">{asset.brand}</p>
                    </div>
                </div>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${asset.status === AssetStatus.DAMAGED ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-600 border-green-100'}`}>
                    {asset.status}
                </span>
            </div>
            <div className="p-4 flex-1">
                <div className="grid grid-cols-2 gap-y-2 text-xs text-gray-600 mb-3">
                    <div className="flex flex-col"><span className="text-gray-400">Serial Number</span><span className="font-mono font-medium select-all">{asset.serialNumber || '-'}</span></div>
                    <div className="flex flex-col"><span className="text-gray-400">Usia Pakai</span><span className={`font-medium ${isOld ? 'text-amber-600' : ''}`}>{ageInMonths} Bulan</span></div>
                </div>
            </div>
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                 {!isSuspended && (
                    <button onClick={() => onMaintenance(asset.id)} className="p-1.5 text-amber-600 bg-white border border-amber-200 rounded hover:bg-amber-50" title="Maintenance / Swap">
                        <WrenchIcon className="w-3.5 h-3.5" />
                    </button>
                 )}
                <button onClick={() => onDismantle(asset.id)} className="p-1.5 text-red-600 bg-white border border-red-200 rounded hover:bg-red-50" title="Dismantle / Tarik">
                    <DismantleIcon className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
};

const ActivityTimeline: React.FC<{
    customer: Customer;
    maintenances: Maintenance[];
    dismantles: Dismantle[];
    installations: Installation[];
    setActivePage: (page: Page, filters?: any) => void;
}> = ({ customer, maintenances, dismantles, installations, setActivePage }) => {
    // Logic to aggregate activities
    const activities = useMemo(() => {
        const list: {
            date: Date;
            type: 'installation' | 'maintenance' | 'dismantle' | 'registration';
            title: string;
            desc: string;
            id: string;
            docNumber: string;
            user: string;
        }[] = [];

        // 1. Installations
        installations.filter(i => i.customerId === customer.id).forEach(i => {
            list.push({
                date: new Date(i.installationDate),
                type: 'installation',
                title: 'Instalasi Baru',
                desc: `${i.assetsInstalled.length} perangkat & ${i.materialsUsed?.length || 0} material terpasang.`,
                id: i.id,
                docNumber: i.docNumber,
                user: i.technician
            });
        });

        // 2. Maintenances
        maintenances.filter(m => m.customerId === customer.id).forEach(m => {
            list.push({
                date: new Date(m.maintenanceDate),
                type: 'maintenance',
                title: 'Kunjungan Maintenance',
                desc: m.problemDescription || 'Pengecekan rutin',
                id: m.id,
                docNumber: m.docNumber,
                user: m.technician
            });
        });

        // 3. Dismantles
        dismantles.filter(d => d.customerId === customer.id).forEach(d => {
            list.push({
                date: new Date(d.dismantleDate),
                type: 'dismantle',
                title: 'Penarikan Aset (Dismantle)',
                desc: `Penarikan ${d.assetName}. Kondisi: ${d.retrievedCondition}`,
                id: d.id,
                docNumber: d.docNumber,
                user: d.technician
            });
        });
        
        // 4. Customer Registration
        if (customer.activityLog) {
            customer.activityLog.forEach(log => {
                if (log.action === 'Pelanggan Dibuat') {
                    list.push({
                        date: new Date(log.timestamp),
                        type: 'registration',
                        title: 'Registrasi Pelanggan',
                        desc: log.details,
                        id: `log-${log.id}`,
                        docNumber: '-',
                        user: log.user
                    });
                }
            });
        }

        return list.sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [customer, maintenances, dismantles, installations]);

    if (activities.length === 0) {
        return <div className="text-center py-8 text-gray-500 italic">Belum ada aktivitas tercatat.</div>;
    }

    return (
        <div className="relative border-l-2 border-gray-200 ml-4 space-y-6">
            {activities.map((act, idx) => {
                let icon: React.ElementType = BsFileText;
                let color = 'bg-gray-100 text-gray-500 border-gray-200';
                
                if (act.type === 'installation') { icon = BsBoxSeam; color = 'bg-blue-100 text-blue-600 border-blue-200'; }
                else if (act.type === 'maintenance') { icon = WrenchIcon; color = 'bg-purple-100 text-purple-600 border-purple-200'; }
                else if (act.type === 'dismantle') { icon = DismantleIcon; color = 'bg-red-100 text-red-600 border-red-200'; }
                else if (act.type === 'registration') { icon = BsPersonBadge; color = 'bg-green-100 text-green-600 border-green-200'; }

                const Icon = icon;

                return (
                    <div key={idx} className="relative ml-6">
                        <div className={`absolute -left-[37px] top-0 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-white ${color}`}>
                            <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start bg-gray-50 p-4 rounded-xl border border-gray-100 hover:border-blue-200 transition-colors">
                            <div>
                                <p className="font-bold text-gray-800 text-sm">{act.title}</p>
                                <p className="text-xs text-gray-500 mt-1">{act.desc}</p>
                                <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                                    <span className="font-medium text-gray-600">{act.user}</span>
                                    <span>•</span>
                                    <span>{act.docNumber}</span>
                                </div>
                            </div>
                            <div className="mt-2 sm:mt-0 text-right">
                                <p className="text-xs font-bold text-gray-500">{act.date.toLocaleDateString('id-ID')}</p>
                                {act.type !== 'registration' && (
                                     <button 
                                        onClick={() => {
                                            if (act.type === 'installation') setActivePage('customer-installation-form', { openDetailForId: act.id });
                                            if (act.type === 'maintenance') setActivePage('customer-maintenance-form', { openDetailForId: act.id });
                                            if (act.type === 'dismantle') setActivePage('customer-dismantle', { openDetailForId: act.id });
                                        }} 
                                        className="text-xs text-tm-primary hover:underline mt-1 inline-block"
                                    >
                                        Lihat Detail
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// --- MAIN COMPONENT ---

const CustomerDetailPage: React.FC<CustomerDetailPageProps> = ({ initialState, setActivePage, onShowPreview, onInitiateDismantle }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'assets' | 'documents' | 'history'>('overview');

    // Store Hooks
    const customers = useMasterDataStore((state) => state.customers);
    const assets = useAssetStore((state) => state.assets);
    const maintenances = useTransactionStore((state) => state.maintenances);
    const dismantles = useTransactionStore((state) => state.dismantles);
    const installations = useTransactionStore((state) => state.installations);

    const customer = useMemo(() => customers.find(c => c.id === initialState.customerId), [customers, initialState.customerId]);
    const customerAssets = useMemo(() => assets.filter(a => a.currentUser === initialState.customerId), [assets, initialState.customerId]);

    // SMART LOGIC: Categorize Assets & Aggregate Materials
    const { activeDevices, materialHistory, totalMaterialVolume, totalAssetValue, hasInstalledAssets, openTicketCount, pendingInstallCount } = useMemo(() => {
        const active: Asset[] = [];
        let value = 0;

        // 1. Process Active Assets (Devices)
        // Filter out non-device items for the card view only
        customerAssets.forEach(a => {
            // Logic: Is it a device? (Has SN and usually not a cable)
            if (a.serialNumber && !a.name.toLowerCase().includes('kabel') && !a.name.toLowerCase().includes('dropcore')) {
                active.push(a);
            }
            value += (a.purchasePrice || 0);
        });

        // 2. Process Material History (Lifecycle Log)
        const history: { 
            date: string; 
            docNumber: string; 
            type: 'installation' | 'maintenance';
            materials: { name: string; brand: string; qty: number; unit: string }[] 
        }[] = [];
        
        const volumeMap = new Map<string, { qty: number, unit: string }>();

        // A. From Installations
        installations.filter(i => i.customerId === customer?.id).forEach(inst => {
            if (inst.materialsUsed && inst.materialsUsed.length > 0) {
                history.push({
                    date: inst.installationDate,
                    docNumber: inst.docNumber,
                    type: 'installation',
                    materials: inst.materialsUsed.map(m => {
                        const key = `${m.itemName} - ${m.brand}`;
                        const current = volumeMap.get(key) || { qty: 0, unit: m.unit };
                        volumeMap.set(key, { qty: current.qty + m.quantity, unit: m.unit });
                        return { name: m.itemName, brand: m.brand, qty: m.quantity, unit: m.unit };
                    })
                });
            }
        });

        // B. From Maintenances (Replacement/Repair)
        maintenances.filter(m => m.customerId === customer?.id).forEach(mnt => {
            if (mnt.materialsUsed && mnt.materialsUsed.length > 0) {
                history.push({
                    date: mnt.maintenanceDate,
                    docNumber: mnt.docNumber,
                    type: 'maintenance',
                    materials: mnt.materialsUsed.map(m => {
                        const key = `${m.itemName} - ${m.brand}`;
                        const current = volumeMap.get(key) || { qty: 0, unit: m.unit };
                        volumeMap.set(key, { qty: current.qty + m.quantity, unit: m.unit });
                        return { name: m.itemName, brand: m.brand, qty: m.quantity, unit: m.unit };
                    })
                });
            }
        });

        const summary: { name: string; qty: number; unit: string }[] = [];
        volumeMap.forEach((val, key) => {
            summary.push({ name: key, qty: val.qty, unit: val.unit });
        });
        history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // STRICT ASSET CHECK LOGIC (FIXED)
        // 1. Cek apakah ada aset dengan status IN_USE yang terhubung ke customer ini
        const hasActiveDevice = customerAssets.some(a => a.status === AssetStatus.IN_USE);
        
        // 2. Cek apakah ada material terpasang (array exists AND length > 0)
        const hasMaterial = customer?.installedMaterials && customer.installedMaterials.length > 0;
        
        const hasAnyAsset = hasActiveDevice || hasMaterial;
        
        // Active Tickets Calculation
        const openMnt = maintenances.filter(m => m.customerId === customer?.id && m.status !== ItemStatus.COMPLETED && m.status !== ItemStatus.REJECTED).length;
        const pendingInst = installations.filter(i => i.customerId === customer?.id && i.status !== ItemStatus.COMPLETED && i.status !== ItemStatus.REJECTED).length;

        return { 
            activeDevices: active, 
            materialHistory: history, 
            totalMaterialVolume: summary,
            totalAssetValue: value,
            hasInstalledAssets: hasAnyAsset,
            openTicketCount: openMnt,
            pendingInstallCount: pendingInst
        };
    }, [customerAssets, customer, installations, maintenances]);

    // SMART LOGIC: Customer Health Status
    const healthStatus = useMemo(() => {
        if (!customer) return { status: 'Unknown', color: 'gray' };
        
        if (customer.status === CustomerStatus.SUSPENDED) return { status: 'SUSPENDED', color: 'bg-red-100 text-red-700 border-red-200' };
        if (customer.status === CustomerStatus.INACTIVE) return { status: 'NON-AKTIF', color: 'bg-gray-100 text-gray-600 border-gray-200' };
        
        if (openTicketCount > 0) return { status: `PERLU PERHATIAN (${openTicketCount} Tiket)`, color: 'bg-amber-100 text-amber-700 border-amber-200' };
        
        return { status: 'SEHAT', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' };
    }, [customer, openTicketCount]);

    if (!customer) return <div>Pelanggan tidak ditemukan.</div>;

    const handleEditClick = () => setActivePage('customer-edit', { customerId: customer.id });
    
    // Global Actions
    const handleNewInstallation = () => setActivePage('customer-installation-form', { prefillCustomer: customer.id });
    const handleNewMaintenance = () => setActivePage('customer-maintenance-form', { prefillCustomer: customer.id });
    const handleNewDismantle = () => setActivePage('customer-dismantle', { prefillCustomerId: customer.id });
    
    const handleDirectMaintenance = (assetId: string) => setActivePage('customer-maintenance-form', { prefillCustomer: customer.id, prefillAsset: assetId });
    const handleDirectDismantle = (assetId: string) => {
         const asset = assets.find(a => a.id === assetId);
         if (asset) setActivePage('customer-dismantle', { prefillAsset: asset });
    };
    
    // --- SMART ACTION BUTTONS RENDER ---
    const isSuspended = customer.status === CustomerStatus.SUSPENDED;
    const isInactive = customer.status === CustomerStatus.INACTIVE;

    const renderActionButtons = () => (
        <div className="flex items-center gap-2">
            {/* 1. INSTALLATION BUTTON */}
            {/* Logic: Disable if Suspended/Inactive (kecuali ada override). Show badge if pending installation exists. */}
            <button 
                onClick={handleNewInstallation}
                disabled={isSuspended || isInactive}
                className={`relative inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-white rounded-lg shadow-sm transition-all border 
                    ${(isSuspended || isInactive) ? 'bg-gray-300 border-gray-300 cursor-not-allowed opacity-70' : pendingInstallCount > 0 ? 'bg-blue-600 hover:bg-blue-700 border-blue-700' : 'bg-green-600 hover:bg-green-700 border-green-700'}
                `}
                title={isSuspended ? "Tidak dapat instalasi (Suspend)" : "Pasang Baru"}
            >
                <BsFileEarmarkPlus className="w-4 h-4" />
                {pendingInstallCount > 0 ? 'Instalasi Berjalan' : 'Pasang Baru'}
                {pendingInstallCount > 0 && (
                    <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full shadow-sm border border-white">
                        {pendingInstallCount}
                    </span>
                )}
            </button>

             {/* 2. MAINTENANCE BUTTON */}
             {/* Logic: Enable only if assets exist. Show badge if open tickets exist. Yellow default, Red if open tickets. */}
             <button 
                onClick={handleNewMaintenance} 
                disabled={!hasInstalledAssets}
                className={`relative inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-white rounded-lg shadow-sm transition-all border 
                    ${!hasInstalledAssets ? 'bg-gray-300 border-gray-300 cursor-not-allowed opacity-70' : openTicketCount > 0 ? 'bg-red-500 hover:bg-red-600 border-red-600' : 'bg-amber-500 hover:bg-amber-600 border-amber-600'}
                `}
                title={!hasInstalledAssets ? "Tidak dapat maintenance: Belum ada aset/material terpasang (Status IN_USE)." : "Buat Tiket Maintenance"}
            >
                 <WrenchIcon className="w-4 h-4" /> 
                 {openTicketCount > 0 ? 'Tiket Aktif' : 'Buat Tiket'}
                 {openTicketCount > 0 && (
                    <span className="absolute -top-2 -right-2 w-5 h-5 bg-white text-red-600 font-bold text-[10px] flex items-center justify-center rounded-full shadow-sm border border-red-200">
                        {openTicketCount}
                    </span>
                 )}
            </button>

             {/* 3. DISMANTLE BUTTON */}
             {/* Logic: Highlight RED if customer is INACTIVE (Churn) and still has assets. */}
             <button 
                onClick={handleNewDismantle} 
                disabled={!hasInstalledAssets}
                className={`inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold rounded-lg shadow-sm transition-all border 
                    ${!hasInstalledAssets 
                        ? 'bg-gray-300 border-gray-300 text-white cursor-not-allowed opacity-70' 
                        : isInactive 
                            ? 'bg-red-600 hover:bg-red-700 text-white border-red-700 animate-pulse' // Highlight for Churn
                            : 'bg-white text-red-600 border-red-200 hover:bg-red-50'
                    }
                `}
                title={!hasInstalledAssets ? "Tidak dapat dismantle: Belum ada aset/material terpasang (Status IN_USE)." : isInactive ? "Pelanggan Non-Aktif: Segera Tarik Aset" : "Tarik Aset (Dismantle)"}
            >
                 <DismantleIcon className="w-4 h-4" /> {isInactive ? 'Tarik Segera' : 'Tarik Aset'}
            </button>
            
            <div className="h-6 w-px bg-gray-300 mx-1"></div>
            
            <button onClick={handleEditClick} className="inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-all">
                <PencilIcon className="w-4 h-4" /> Edit
            </button>
        </div>
    );

    // --- TABS CONTENT ---
    const OverviewTab = () => (
        <div className="space-y-6 animate-fade-in-up">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard 
                    label="Total Aset Aktif" 
                    value={`${activeDevices.length} Unit`} 
                    subtext="CPE & Perangkat Utama"
                    icon={BsRouter} 
                    color="bg-blue-500" 
                />
                <StatCard 
                    label="Estimasi Investasi" 
                    value={`Rp ${totalAssetValue.toLocaleString('id-ID')}`} 
                    subtext="Nilai Perolehan Perangkat"
                    icon={BsCurrencyDollar} 
                    color="bg-emerald-500" 
                />
                <StatCard 
                    label="Tiket Maintenance" 
                    value={`${maintenances.filter(m => m.customerId === customer.id).length} Total`} 
                    subtext={`${openTicketCount} Sedang Berjalan`}
                    icon={WrenchIcon} 
                    color={openTicketCount > 0 ? "bg-red-500" : "bg-purple-500"} 
                />
                <div className={`bg-white p-4 rounded-xl border flex flex-col justify-center items-center text-center shadow-sm ${healthStatus.color.replace('text-', 'border-').split(' ')[2]}`}>
                    <p className="text-xs font-bold uppercase tracking-wider opacity-70">Status Kesehatan</p>
                    <span className={`mt-2 px-3 py-1 rounded-full text-xs font-black uppercase ${healthStatus.color}`}>
                        {healthStatus.status}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Contact Info */}
                <div className="lg:col-span-1 bg-white border border-gray-200 rounded-xl shadow-sm p-6">
                    <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 border-b pb-2">Informasi Kontak</h3>
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <BsGeoAlt className="w-5 h-5 text-gray-400 mt-1" />
                            <div>
                                <p className="text-xs text-gray-500">Alamat Pemasangan</p>
                                <p className="text-sm font-medium text-gray-800 leading-relaxed">{customer.address}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <BsTelephone className="w-5 h-5 text-gray-400" />
                            <div>
                                <p className="text-xs text-gray-500">Telepon / WhatsApp</p>
                                <p className="text-sm font-medium text-gray-800">{customer.phone}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <BsEnvelope className="w-5 h-5 text-gray-400" />
                            <div>
                                <p className="text-xs text-gray-500">Email</p>
                                <p className="text-sm font-medium text-gray-800">{customer.email}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <BsLightningFill className="w-5 h-5 text-gray-400" />
                            <div>
                                <p className="text-xs text-gray-500">Paket Layanan</p>
                                <p className="text-sm font-bold text-tm-primary">{customer.servicePackage}</p>
                            </div>
                        </div>
                    </div>
                    
                    {customer.notes && (
                        <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-xs font-bold text-yellow-800 uppercase mb-1 flex items-center gap-2"><BsFileText/> Catatan Penting</p>
                            <p className="text-sm text-yellow-900 italic">"{customer.notes}"</p>
                        </div>
                    )}
                </div>

                {/* Right: Quick Assets Preview */}
                <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl shadow-sm p-6">
                    <div className="flex justify-between items-center mb-4 border-b pb-2">
                        <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Perangkat Terpasang ({activeDevices.length})</h3>
                        <button onClick={() => setActiveTab('assets')} className="text-xs font-semibold text-tm-primary hover:underline">Lihat Semua</button>
                    </div>
                    
                    {activeDevices.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {activeDevices.slice(0, 4).map(asset => (
                                <AssetCard 
                                    key={asset.id} 
                                    asset={asset} 
                                    onShowPreview={onShowPreview} 
                                    onMaintenance={handleDirectMaintenance} 
                                    onDismantle={handleDirectDismantle}
                                    isSuspended={customer.status === CustomerStatus.SUSPENDED}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                            <BsBoxSeam className="w-10 h-10 text-gray-300 mx-auto mb-2"/>
                            <p className="text-sm text-gray-500">Belum ada perangkat aktif.</p>
                            <button onClick={handleNewInstallation} className="mt-3 text-xs font-bold text-tm-primary border border-tm-primary px-3 py-1.5 rounded hover:bg-blue-50 transition-colors">
                                + Pasang Perangkat Baru
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    const AssetsTab = () => (
        <div className="space-y-8 animate-fade-in-up">
            {/* Active Devices Section */}
            <section>
                <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><BsRouter className="w-5 h-5"/></div>
                        <h3 className="text-lg font-bold text-gray-800">Perangkat Aktif (CPE)</h3>
                    </div>
                    <button onClick={handleNewInstallation} className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-tm-primary bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors">
                        <BsPlusLg className="w-3 h-3"/> Tambah Aset/Material
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                     {activeDevices.map(asset => (
                        <AssetCard 
                            key={asset.id} 
                            asset={asset} 
                            onShowPreview={onShowPreview} 
                            onMaintenance={handleDirectMaintenance} 
                            onDismantle={handleDirectDismantle}
                            isSuspended={customer.status === CustomerStatus.SUSPENDED}
                        />
                    ))}
                    {activeDevices.length === 0 && <p className="col-span-full text-sm text-gray-500 italic">Tidak ada data.</p>}
                </div>
            </section>

            {/* Infrastructure & Material Section (Updated) */}
            <section>
                <div className="flex items-center gap-3 mb-4 pt-6 border-t border-gray-200">
                    <div className="p-2 bg-orange-100 text-orange-600 rounded-lg"><BsHddNetwork className="w-5 h-5"/></div>
                    <h3 className="text-lg font-bold text-gray-800">Infrastruktur & Material</h3>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left: Summary/Snapshot */}
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm h-fit">
                        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                             <h4 className="text-sm font-bold text-gray-700">Akumulasi Material Terpasang</h4>
                        </div>
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50/50">
                                <tr>
                                    <th className="px-4 py-2 font-medium">Item & Brand</th>
                                    <th className="px-4 py-2 font-medium text-right">Total Vol.</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {totalMaterialVolume.map((mat, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                        <td className="px-4 py-2 text-gray-800">{mat.name}</td>
                                        <td className="px-4 py-2 text-right font-bold text-orange-600">
                                            {mat.qty.toLocaleString('id-ID')} {mat.unit}
                                        </td>
                                    </tr>
                                ))}
                                {totalMaterialVolume.length === 0 && (
                                    <tr><td colSpan={2} className="px-4 py-6 text-center text-gray-400 italic">Belum ada material tercatat.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Right: Consumption History (Log) */}
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                         <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                             <h4 className="text-sm font-bold text-gray-700">Riwayat Penggunaan (Log)</h4>
                        </div>
                        <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                            <div className="divide-y divide-gray-100">
                                {materialHistory.map((log, idx) => (
                                    <div key={idx} className="p-3 hover:bg-gray-50 transition-colors">
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border ${log.type === 'installation' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                                                    {log.type === 'installation' ? 'Instalasi' : 'Maint.'}
                                                </span>
                                                <span className="text-xs text-gray-500">{new Date(log.date).toLocaleDateString('id-ID')}</span>
                                            </div>
                                            <span className="text-[10px] font-mono text-gray-400">{log.docNumber}</span>
                                        </div>
                                        <div className="pl-1 space-y-1 mt-2">
                                            {log.materials.map((m, mIdx) => (
                                                <div key={mIdx} className="flex justify-between text-xs">
                                                    <span className="text-gray-700">{m.name} <span className="text-gray-400">({m.brand})</span></span>
                                                    <span className="font-semibold text-gray-900">{m.qty} {m.unit}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                {materialHistory.length === 0 && (
                                    <div className="p-6 text-center text-gray-400 italic text-sm">Belum ada riwayat penggunaan.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );

    const DocumentsTab = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up">
            {/* System Generated Docs */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 border-b pb-2 flex items-center gap-2">
                    <BsArchive className="w-4 h-4"/> Dokumen Sistem
                </h3>
                <div className="space-y-2">
                    {[...installations, ...maintenances, ...dismantles]
                        .filter(d => d.customerId === customer.id)
                        .sort((a,b) => {
                            const dateA = 'installationDate' in a ? a.installationDate : 'maintenanceDate' in a ? a.maintenanceDate : a.dismantleDate;
                            const dateB = 'installationDate' in b ? b.installationDate : 'maintenanceDate' in b ? b.maintenanceDate : b.dismantleDate;
                            return new Date(dateB).getTime() - new Date(dateA).getTime();
                        })
                        .map((doc: any) => (
                            <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-blue-300 transition-colors cursor-pointer" onClick={() => onShowPreview({ type: doc.docNumber.startsWith('WO-MT') ? 'maintenance' : doc.docNumber.startsWith('WO-DSM') ? 'dismantle' : 'installation', id: doc.id })}>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white rounded border border-gray-200 text-blue-600"><BsFileText /></div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-800">{doc.docNumber}</p>
                                        <p className="text-xs text-gray-500">{doc.id.split('-')[0]} • {new Date(doc.installationDate || doc.maintenanceDate || doc.dismantleDate).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <span className="text-xs bg-white px-2 py-1 rounded border font-medium text-gray-600">Lihat</span>
                            </div>
                        ))}
                     {[...installations, ...maintenances, ...dismantles].filter(d => d.customerId === customer.id).length === 0 && (
                        <p className="text-sm text-gray-400 italic text-center py-4">Belum ada dokumen yang dibuat.</p>
                     )}
                </div>
            </div>

            {/* Uploaded Attachments */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 border-b pb-2 flex items-center gap-2">
                    <BsPaperclip className="w-4 h-4"/> Lampiran (KTP/Foto)
                </h3>
                {customer.attachments && customer.attachments.length > 0 ? (
                    <div className="grid grid-cols-2 gap-3">
                        {customer.attachments.map(att => (
                            <div key={att.id} className="group relative bg-gray-50 border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-all">
                                <div className="aspect-w-16 aspect-h-10 bg-gray-200 flex items-center justify-center">
                                    {att.type === 'image' ? (
                                        <img src={att.url} alt={att.name} className="object-cover w-full h-24" />
                                    ) : (
                                        <BsFilePdf className="w-8 h-8 text-red-500" />
                                    )}
                                </div>
                                <div className="p-2">
                                    <p className="text-xs font-semibold truncate text-gray-700">{att.name}</p>
                                    <div className="flex gap-1 mt-2">
                                        <button onClick={() => viewAttachment(att.url, att.name)} className="flex-1 py-1 bg-white border rounded text-[10px] font-bold text-blue-600 hover:bg-blue-50">Lihat</button>
                                        <a href={att.url} download={att.name} className="flex-1 py-1 bg-white border rounded text-[10px] font-bold text-gray-600 hover:bg-gray-50 text-center"><DownloadIcon className="w-3 h-3 inline"/></a>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                        <BsPaperclip className="w-8 h-8 text-gray-300 mx-auto mb-2"/>
                        <p className="text-sm text-gray-500">Tidak ada lampiran.</p>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <DetailPageLayout
            title={
                <div className="flex flex-col">
                    <span className="text-xs text-gray-500 font-normal uppercase tracking-wider">Profil Pelanggan</span>
                    <span className="text-xl font-bold">{customer.name}</span>
                </div>
            }
            onBack={() => setActivePage('customers')}
            headerActions={renderActionButtons()} // MENGGUNAKAN FUNGSI BARU DI SINI
        >
            {/* Banner Alert for suspended customer */}
            {customer.status === CustomerStatus.SUSPENDED && (
                <div className="mb-6 p-4 bg-red-600 text-white rounded-xl shadow-md flex items-center justify-between animate-pulse">
                    <div className="flex items-center gap-3">
                        <BsExclamationTriangleFill className="w-6 h-6" />
                        <div>
                            <p className="font-bold text-lg">Pelanggan Ditangguhkan (Suspend)</p>
                            <p className="text-sm opacity-90">Layanan dihentikan sementara. Tidak dapat melakukan instalasi atau maintenance baru.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Navigation Tabs */}
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl mb-6 w-full md:w-fit overflow-x-auto">
                {[
                    { id: 'overview', label: 'Ringkasan', icon: BsArchive },
                    { id: 'assets', label: 'Aset & Material', icon: BsBoxSeam },
                    { id: 'documents', label: 'Dokumen & Lampiran', icon: BsFileText },
                    { id: 'history', label: 'Riwayat Aktivitas', icon: BsClockHistory },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${
                            activeTab === tab.id 
                            ? 'bg-white text-tm-primary shadow-sm' 
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                        }`}
                    >
                        <tab.icon className={activeTab === tab.id ? 'text-tm-primary' : 'text-gray-400'} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="min-h-[400px]">
                {activeTab === 'overview' && <OverviewTab />}
                {activeTab === 'assets' && <AssetsTab />}
                {activeTab === 'documents' && <DocumentsTab />}
                {activeTab === 'history' && (
                    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-800 mb-6 border-b pb-2">Jejak Aktivitas</h3>
                        <ActivityTimeline 
                            customer={customer}
                            maintenances={maintenances}
                            dismantles={dismantles}
                            installations={installations}
                            setActivePage={setActivePage}
                        />
                    </div>
                )}
            </div>
        </DetailPageLayout>
    );
};

export default CustomerDetailPage;
