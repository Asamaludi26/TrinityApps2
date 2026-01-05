
import React, { useMemo, useState } from 'react';
import { Customer, Asset, Page, PreviewData, AssetCategory, Maintenance, Dismantle, Installation, CustomerStatus } from '../../../types';
import { DetailPageLayout } from '../../../components/layout/DetailPageLayout';
import { PencilIcon } from '../../../components/icons/PencilIcon';
import { CustomerIcon } from '../../../components/icons/CustomerIcon';
import { WrenchIcon } from '../../../components/icons/WrenchIcon';
import { ClickableLink } from '../../../components/ui/ClickableLink';
import { DismantleIcon } from '../../../components/icons/DismantleIcon';
import { Tooltip } from '../../../components/ui/Tooltip';
import { HistoryIcon } from '../../../components/icons/HistoryIcon';
import { BsBoxSeam, BsLightningFill, BsRouter, BsHddNetwork, BsArrowRightShort, BsCalendar3 } from 'react-icons/bs';

// Stores
import { useMasterDataStore } from '../../../stores/useMasterDataStore';
import { useAssetStore } from '../../../stores/useAssetStore';
import { useTransactionStore } from '../../../stores/useTransactionStore';

interface CustomerDetailPageProps {
    initialState: { customerId: string };
    setActivePage: (page: Page, filters?: any) => void;
    onShowPreview: (data: PreviewData) => void;
    onInitiateDismantle: (asset: Asset) => void;
    
    // Legacy props (ignored)
    customers?: Customer[];
    assets?: Asset[];
    assetCategories?: AssetCategory[];
    maintenances?: Maintenance[];
    dismantles?: Dismantle[];
    installations?: Installation[];
}

// --- SUB COMPONENTS (Moved Outside for Performance) ---

const DetailItem: React.FC<{ label: string; children: React.ReactNode; fullWidth?: boolean }> = ({ label, children, fullWidth }) => (
    <div className={fullWidth ? "sm:col-span-2" : ""}>
        <dt className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</dt>
        <dd className="mt-1 text-sm font-medium text-gray-900">{children}</dd>
    </div>
);

const ActivityTimeline: React.FC<{
    customer: Customer;
    maintenances: Maintenance[];
    dismantles: Dismantle[];
    installations: Installation[];
    setActivePage: (page: Page, filters?: any) => void;
}> = ({ customer, maintenances, dismantles, installations, setActivePage }) => {
    
    const activities = useMemo(() => {
        const allActivities: { date: Date; type: 'Instalasi' | 'Maintenance' | 'Dismantle'; title: string; docNumber: string; details: React.ReactNode; onClick: () => void; icon: React.FC<{className?:string}>; colorClass: string }[] = [];

        // Helper safe date parser
        const safeDate = (dateStr: string) => {
            const d = new Date(dateStr);
            return isNaN(d.getTime()) ? new Date() : d;
        };

        // 1. Installation Activities
        installations.filter(inst => inst.customerId === customer.id).forEach(inst => {
            allActivities.push({
                date: safeDate(inst.installationDate),
                type: 'Instalasi',
                title: `Instalasi Baru`,
                docNumber: inst.docNumber,
                details: <p className="text-xs text-gray-500">Teknisi: {inst.technician}</p>,
                onClick: () => setActivePage('customer-installation-form', { openDetailForId: inst.id }),
                icon: CustomerIcon,
                colorClass: "bg-green-100 text-green-600 border-green-200"
            });
        });

        // 2. Maintenance Activities
        maintenances.filter(m => m.customerId === customer.id).forEach(m => {
            const hasReplacement = m.replacements && m.replacements.length > 0;
            const hasMaterial = m.materialsUsed && m.materialsUsed.length > 0;
            let typeLabel = "Perbaikan Rutin";
            if (hasReplacement) typeLabel = "Penggantian Perangkat";
            else if (hasMaterial) typeLabel = "Penambahan Material";

            allActivities.push({
                date: safeDate(m.maintenanceDate),
                type: 'Maintenance',
                title: typeLabel,
                docNumber: m.docNumber,
                details: <>
                    <p className="text-xs text-gray-500">Teknisi: {m.technician}</p>
                    <p className="text-xs text-gray-500 mt-1 italic line-clamp-1">"{m.problemDescription}"</p>
                </>,
                onClick: () => setActivePage('customer-maintenance-form', { openDetailForId: m.id }),
                icon: WrenchIcon,
                colorClass: "bg-blue-100 text-blue-600 border-blue-200"
            });
        });

        // 3. Dismantle Activities
        dismantles.filter(d => d.customerId === customer.id).forEach(d => {
            allActivities.push({
                date: safeDate(d.dismantleDate),
                type: 'Dismantle',
                title: `Penarikan Aset`,
                docNumber: d.docNumber,
                details: <p className="text-xs text-gray-500">Aset: {d.assetName}</p>,
                onClick: () => setActivePage('customer-dismantle', { openDetailForId: d.id }),
                icon: DismantleIcon,
                colorClass: "bg-red-100 text-red-600 border-red-200"
            });
        });

        return allActivities.sort((a, b) => b.date.getTime() - a.date.getTime());

    }, [customer.id, maintenances, dismantles, installations, setActivePage]);
    
    if (activities.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <HistoryIcon className="w-10 h-10 text-gray-300 mb-2"/>
                <p className="text-sm font-medium text-gray-500">Belum ada riwayat aktivitas.</p>
            </div>
        );
    }

    return (
        <div className="relative border-l-2 border-gray-100 ml-3 space-y-6 py-2">                  
            {activities.map((activity, index) => (
                <div key={index} className="relative ml-6 group">
                    <span className={`absolute flex items-center justify-center w-8 h-8 rounded-full -left-[35px] ring-4 ring-white ${activity.colorClass}`}>
                        <activity.icon className="w-4 h-4" />
                    </span>
                    <div 
                        onClick={activity.onClick}
                        className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md hover:border-tm-primary/30 transition-all cursor-pointer"
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h3 className="text-sm font-bold text-gray-900">{activity.title}</h3>
                                <p className="text-xs font-mono text-gray-400 mt-0.5">{activity.docNumber}</p>
                            </div>
                            <div className="flex flex-col items-end">
                                <time className="text-xs font-bold text-gray-500">
                                    {activity.date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                </time>
                                <span className="text-[10px] text-gray-400">{activity.type}</span>
                            </div>
                        </div>
                        <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded-lg border border-gray-100">
                            {activity.details}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

// --- MAIN COMPONENT ---

const CustomerDetailPage: React.FC<CustomerDetailPageProps> = ({ initialState, setActivePage, onShowPreview }) => {
    const [activeTab, setActiveTab] = useState<'detail' | 'aktivitas'>('detail');
    
    // Store Hooks
    const customers = useMasterDataStore((state) => state.customers);
    const assets = useAssetStore((state) => state.assets);
    const assetCategories = useAssetStore((state) => state.categories);
    const maintenances = useTransactionStore((state) => state.maintenances);
    const dismantles = useTransactionStore((state) => state.dismantles);
    const installations = useTransactionStore((state) => state.installations);

    const customer = useMemo(() => customers.find(c => c.id === initialState.customerId), [customers, initialState.customerId]);
    const customerAssets = useMemo(() => assets.filter(a => a.currentUser === initialState.customerId), [assets, initialState.customerId]);

    // FIX: Lebih aman dalam mendeteksi Individual vs Bulk
    const individualAssets = useMemo(() => {
        return customerAssets.filter(asset => {
            // Cek 1: Jika properti balance ada, pasti bulk/measurement
            if (asset.initialBalance !== undefined && asset.currentBalance !== undefined) return false;

            // Cek 2: Lookup via category/type (Fallback)
            const category = assetCategories.find(c => c.name === asset.category);
            if (!category) return true; // Default to Individual if category unknown (Safety)

            const type = category.types.find(t => t.name === asset.type);
            // Default to individual if type not found OR method is individual
            return !type || type.trackingMethod === 'individual'; 
        });
    }, [customerAssets, assetCategories]);

    if (!customer) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] text-gray-500">
                <p className="text-lg font-medium">Pelanggan tidak ditemukan.</p>
                <button onClick={() => setActivePage('customers')} className="mt-4 px-4 py-2 bg-white border rounded-lg shadow-sm hover:bg-gray-50 text-sm font-semibold">
                    Kembali ke Daftar
                </button>
            </div>
        );
    }
    
    const handleEditClick = () => {
        setActivePage('customer-edit', { customerId: customer.id });
    };

    const hasAssets = customerAssets.length > 0;
    const hasMaterials = customer.installedMaterials && customer.installedMaterials.length > 0;
    const canDoMaintenance = hasAssets || hasMaterials; // UX Fix: Boleh maintenance walau cuma ada material
    const isSuspended = customer.status === CustomerStatus.SUSPENDED;

    // Actions Handlers
    const handleDirectMaintenance = (assetId: string) => {
        setActivePage('customer-maintenance-form', { 
            prefillCustomer: customer.id, 
            prefillAsset: assetId 
        });
    };

    const handleDirectDismantle = (assetId: string) => {
        // Find asset object
        const asset = assets.find(a => a.id === assetId);
        if (asset) {
            setActivePage('customer-dismantle', { prefillAsset: asset });
        }
    };

    const DetailTabContent = (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Left Column: Info */}
            <div className="xl:col-span-1 space-y-6">
                {/* Profile Card */}
                <div className="bg-white border border-gray-200/80 rounded-xl shadow-sm overflow-hidden">
                    <div className="h-24 bg-gradient-to-r from-blue-600 to-indigo-700 relative">
                        <div className="absolute -bottom-8 left-6">
                            <div className="w-16 h-16 bg-white rounded-full p-1 shadow-md">
                                <div className="w-full h-full bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-xl">
                                    {customer.name.charAt(0)}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="pt-10 px-6 pb-6">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">{customer.name}</h2>
                                <p className="text-sm text-gray-500 font-mono">{customer.id}</p>
                            </div>
                            <span className={`px-2.5 py-1 text-xs font-bold rounded-full border ${
                                customer.status === CustomerStatus.ACTIVE ? 'bg-green-50 text-green-700 border-green-100' :
                                customer.status === CustomerStatus.SUSPENDED ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                'bg-gray-50 text-gray-600 border-gray-100'
                            }`}>
                                {customer.status}
                            </span>
                        </div>
                        
                        <dl className="space-y-4 pt-4 border-t border-gray-100">
                            <DetailItem label="Paket Layanan">{customer.servicePackage}</DetailItem>
                            <DetailItem label="Alamat">{customer.address}</DetailItem>
                            <DetailItem label="Kontak">
                                <div className="flex flex-col">
                                    <span>{customer.phone}</span>
                                    <span className="text-gray-500 text-xs">{customer.email}</span>
                                </div>
                            </DetailItem>
                            <DetailItem label="Tanggal Instalasi">
                                <div className="flex items-center gap-2">
                                    <BsCalendar3 className="text-gray-400"/>
                                    {new Date(customer.installationDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </div>
                            </DetailItem>
                        </dl>
                    </div>
                </div>
            </div>

            {/* Right Column: Assets & Materials */}
            <div className="xl:col-span-2 space-y-6">
                
                {/* 1. DEVICES (Aset Tetap) */}
                <div className="bg-white border border-gray-200/80 rounded-xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <BsRouter className="w-5 h-5 text-blue-600" />
                            <h3 className="font-bold text-gray-800">Perangkat Terpasang</h3>
                        </div>
                        <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded-full">{individualAssets.length} Unit</span>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-white">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Perangkat</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Identitas (SN/MAC)</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Aksi Cepat</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {individualAssets.length > 0 ? individualAssets.map(asset => (
                                    <tr key={asset.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-8 w-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                                                    <BsBoxSeam />
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-bold text-gray-900">
                                                        <ClickableLink onClick={() => onShowPreview({ type: 'asset', id: asset.id })}>{asset.name}</ClickableLink>
                                                    </div>
                                                    <div className="text-xs text-gray-500">{asset.brand}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-xs font-mono text-gray-600 space-y-1">
                                                <div className="flex gap-2"><span className="text-gray-400 w-8">ID</span> <span>{asset.id}</span></div>
                                                <div className="flex gap-2"><span className="text-gray-400 w-8">SN</span> <span>{asset.serialNumber || '-'}</span></div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-2">
                                                {!isSuspended && (
                                                    <button onClick={() => handleDirectMaintenance(asset.id)} className="p-1.5 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded border border-amber-200 transition-colors" title="Maintenance / Ganti">
                                                        <WrenchIcon className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button onClick={() => handleDirectDismantle(asset.id)} className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition-colors" title="Dismantle / Tarik">
                                                    <DismantleIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-10 text-center text-gray-500 bg-gray-50/50">
                                            Tidak ada perangkat aktif terpasang.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 2. MATERIALS (Infrastruktur) */}
                <div className="bg-white border border-gray-200/80 rounded-xl shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <BsHddNetwork className="w-5 h-5 text-orange-600" />
                            <h3 className="font-bold text-gray-800">Material Terpasang (Infrastruktur)</h3>
                        </div>
                        <span className="bg-orange-100 text-orange-800 text-xs font-bold px-2 py-0.5 rounded-full">
                            {customer.installedMaterials?.length || 0} Item
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-white">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Material</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Total Volume</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {customer.installedMaterials && customer.installedMaterials.length > 0 ? customer.installedMaterials.map((material, index) => {
                                    return (
                                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-8 w-8 bg-orange-50 rounded-lg flex items-center justify-center text-orange-600">
                                                        <BsLightningFill className="w-4 h-4" />
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-bold text-gray-900">{material.itemName}</div>
                                                        <div className="text-xs text-gray-500">{material.brand}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded text-sm font-medium bg-gray-100 text-gray-800">
                                                    {material.quantity} {material.unit}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                <span className="text-xs text-gray-400 italic">Consumed</span>
                                            </td>
                                        </tr>
                                    )
                                }) : (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-10 text-center text-gray-500 bg-gray-50/50">
                                            Belum ada data material infrastruktur.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
    
    const AsideContent = (
         <div className="space-y-6">
            <div className="p-5 bg-white border border-gray-200/80 rounded-xl shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-4 uppercase tracking-wider">Aksi Cepat</h3>
                <div className="space-y-3">
                    <button
                        onClick={() => setActivePage('customer-installation-form', { prefillCustomer: customer.id })}
                        className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-white bg-tm-primary rounded-lg shadow-sm hover:bg-tm-primary-hover transition-all group"
                    >
                        <div className="flex items-center gap-2">
                            <CustomerIcon className="w-4 h-4"/>
                            <span>Instalasi Baru</span>
                        </div>
                        <BsArrowRightShort className="w-5 h-5 opacity-70 group-hover:translate-x-1 transition-transform" />
                    </button>
                    
                    <Tooltip text={isSuspended ? "Pelanggan Suspend tidak dapat di-maintenance" : !canDoMaintenance ? "Tidak ada aset untuk di-maintenance" : "Buat laporan maintenance umum"}>
                        <div className="w-full">
                            <button
                                onClick={() => setActivePage('customer-maintenance-form', { prefillCustomer: customer.id })}
                                disabled={!canDoMaintenance || isSuspended}
                                className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed group"
                            >
                                <div className="flex items-center gap-2">
                                    <WrenchIcon className="w-4 h-4 text-amber-500"/>
                                    <span>Maintenance Umum</span>
                                </div>
                                <BsArrowRightShort className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                        </div>
                    </Tooltip>
                </div>
            </div>

            <div className="p-5 bg-blue-50 border border-blue-100 rounded-xl shadow-sm">
                <h3 className="text-xs font-bold text-blue-800 mb-2 uppercase">Statistik Aset</h3>
                <div className="flex justify-between items-center text-sm mb-1">
                    <span className="text-blue-600">Total Perangkat</span>
                    <span className="font-bold text-blue-900">{individualAssets.length}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-blue-600">Material Item</span>
                    <span className="font-bold text-blue-900">{customer.installedMaterials?.length || 0}</span>
                </div>
            </div>
        </div>
    );

    return (
        <DetailPageLayout
            title={customer.name}
            onBack={() => setActivePage('customers')}
            aside={AsideContent}
            headerActions={
                <button onClick={handleEditClick} className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">
                    <PencilIcon className="w-4 h-4" />
                    Edit Profil
                </button>
            }
        >
            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('detail')}
                        className={`py-4 px-1 border-b-2 font-bold text-sm transition-all ${
                            activeTab === 'detail'
                                ? 'border-tm-primary text-tm-primary'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        Overview & Aset
                    </button>
                    <button
                        onClick={() => setActiveTab('aktivitas')}
                        className={`py-4 px-1 border-b-2 font-bold text-sm transition-all ${
                            activeTab === 'aktivitas'
                                ? 'border-tm-primary text-tm-primary'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                    >
                        Riwayat Aktivitas
                    </button>
                </nav>
            </div>

            {activeTab === 'detail' && DetailTabContent}
            {activeTab === 'aktivitas' && (
                <div className="bg-white border border-gray-200/80 rounded-xl shadow-sm p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Jejak Aktivitas Pelanggan</h3>
                    <ActivityTimeline 
                        customer={customer}
                        maintenances={maintenances}
                        dismantles={dismantles}
                        installations={installations}
                        setActivePage={setActivePage}
                    />
                </div>
            )}
        </DetailPageLayout>
    );
};

export default CustomerDetailPage;
