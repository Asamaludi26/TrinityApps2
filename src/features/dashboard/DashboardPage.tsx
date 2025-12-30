
import React, { useState, useEffect } from 'react';
import { Page, PreviewData, User, AssetStatus, LoanRequestStatus } from '../../types';
import { Skeleton } from '../../components/ui/Skeleton';
import { ActionableItemsList } from './components/ActionableItemsList';
import { AssetMatrix } from './components/AssetMatrix';
import { AssetStatusDonutChart, SpendingTrendChart, TechnicianLeaderboard } from './components/DashboardCharts';
import { StockAlertWidget } from './components/StockAlertWidget';
import { WarrantyAlertWidget } from './components/WarrantyAlertWidget';
import { CategorySummaryWidget } from './components/CategorySummaryWidget';
import { CheckIcon } from '../../components/icons/CheckIcon';
import { BsClockHistory, BsLayers, BsCurrencyDollar, BsBoxSeam, BsGraphUp, BsTrophy } from 'react-icons/bs';
import Modal from '../../components/ui/Modal';
import { ExclamationTriangleIcon } from '../../components/icons/ExclamationTriangleIcon';
import { ArchiveBoxIcon } from '../../components/icons/ArchiveBoxIcon';
import { RequestIcon } from '../../components/icons/RequestIcon';
import { RegisterIcon } from '../../components/icons/RegisterIcon';
import { HandoverIcon } from '../../components/icons/HandoverIcon';
import { WrenchIcon } from '../../components/icons/WrenchIcon';
import { hasPermission } from '../../utils/permissions';

// Hooks
import { useDashboardData } from './hooks/useDashboardData';
import { useAssetStore } from '../../stores/useAssetStore'; // Import store

// Helpers
const formatCurrencyShort = (value: number): string => {
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} M`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} Jt`;
    return value.toLocaleString('id-ID');
};

const formatCurrencyFull = (value: number): string => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value);
};

interface DashboardProps {
    currentUser: User;
    setActivePage: (page: Page, filters?: any) => void;
    onShowPreview: (data: PreviewData) => void;
}

// --- COMPONENT: MINI STAT (URGENCY) ---
const UrgencyCard: React.FC<{ label: string; value: string; icon: any; color: string; subtext?: string; onClick?: () => void }> = ({ label, value, icon: Icon, color, subtext, onClick }) => {
    return (
        <div 
            onClick={onClick}
            className={`relative overflow-hidden bg-white p-5 rounded-xl shadow-sm border-l-4 ${color.replace('bg-', 'border-')} border-y border-r border-gray-100 group hover:-translate-y-1 transition-all duration-200 ${onClick ? 'cursor-pointer' : ''}`}
        >
            <div className="flex justify-between items-start z-10 relative">
                <div>
                    <p className="text-xs font-bold text-gray-500 tracking-wider uppercase">{label}</p>
                    <h3 className={`text-2xl font-extrabold mt-1 ${color.replace('bg-', 'text-')}`}>{value}</h3>
                    {subtext && <p className="text-xs text-gray-400 mt-1 font-medium">{subtext}</p>}
                </div>
                <div className={`p-2 rounded-lg ${color} bg-opacity-10 text-current`}>
                    <Icon className={`w-5 h-5 ${color.replace('bg-', 'text-')}`} />
                </div>
            </div>
        </div>
    );
};

// --- COMPONENT: MACRO STAT (EXECUTIVE) ---
const MacroStat: React.FC<{ label: string; value: string; icon: any; subValue?: string; tooltip?: string }> = ({ label, value, icon: Icon, subValue, tooltip }) => (
    <div className="flex items-center p-4 bg-white border border-gray-100 rounded-xl shadow-sm" title={tooltip}>
        <div className="flex-shrink-0 p-3 bg-blue-50 text-tm-primary rounded-xl">
            <Icon className="w-6 h-6" />
        </div>
        <div className="ml-4 min-w-0">
            <p className="text-sm font-medium text-gray-500 truncate">{label}</p>
            <p className="text-xl font-bold text-gray-900 truncate">{value}</p>
            {subValue && <p className="text-xs text-gray-400 mt-0.5 truncate">{subValue}</p>}
        </div>
    </div>
);

// --- COMPONENT: FEATURE STAT (MICRO) ---
const FeatureStat: React.FC<{ title: string; items: { label: string; value: number; color: string }[]; onClick?: () => void }> = ({ title, items, onClick }) => (
    <div onClick={onClick} className={`bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-center ${onClick ? 'cursor-pointer hover:border-tm-primary/30 transition-colors' : ''}`}>
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{title}</h4>
        <div className="space-y-3">
            {items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-600 truncate mr-2">{item.label}</span>
                    <span className={`text-sm font-bold px-2 py-0.5 rounded ${item.color}`}>{item.value}</span>
                </div>
            ))}
        </div>
    </div>
);

export default function DashboardPage(props: DashboardProps): React.ReactElement {
    const { currentUser, setActivePage, onShowPreview } = props;
    
    // --- USE CUSTOM HOOK (Centralized Logic) ---
    const { 
        assets, 
        assetCategories, 
        macroMetrics, 
        urgencyMetrics, 
        featureMetrics, 
        analyticsData, 
        allActivities 
    } = useDashboardData(currentUser.role, currentUser.name);

    // Get thresholds from store
    const thresholds = useAssetStore((state) => state.thresholds);

    const [isComputing, setIsComputing] = useState(true);
    const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
    
    // SECURITY: Check permissions
    const canViewPrice = hasPermission(currentUser, 'assets:view-price');

    useEffect(() => {
        // Simulate chart rendering delay or heavy calc
        const timer = setTimeout(() => setIsComputing(false), 600);
        return () => clearTimeout(timer);
    }, []);

    const getIconForActivity = (type: string) => {
        switch(type) {
            case 'request': return RequestIcon;
            case 'asset': return RegisterIcon;
            case 'handover': return HandoverIcon;
            case 'maintenance': return WrenchIcon;
            default: return RegisterIcon;
        }
    }

    if (isComputing) {
        return (
            <div className="p-8 space-y-8">
                <div className="grid grid-cols-4 gap-6">
                    <Skeleton height={80} className="rounded-xl" /><Skeleton height={80} className="rounded-xl" /><Skeleton height={80} className="rounded-xl" /><Skeleton height={80} className="rounded-xl" />
                </div>
                <div className="grid grid-cols-4 gap-6">
                     <Skeleton height={120} className="rounded-xl" /><Skeleton height={120} className="rounded-xl" /><Skeleton height={120} className="rounded-xl" /><Skeleton height={120} className="rounded-xl" />
                </div>
                 <Skeleton height={200} className="rounded-2xl" />
            </div>
        );
    }

    // --- STAFF VIEW ---
    if (currentUser.role === 'Staff' || currentUser.role === 'Leader') {
        // Simple View for Staff (Logic moved to hook is overkill for this part but keeps it consistent)
         const myAssets = assets.filter(a => a.currentUser === currentUser.name);
         return (
             <div className="p-6 md:p-8 space-y-8 bg-gray-50/50 min-h-screen">
                 <header className="flex flex-col md:flex-row justify-between items-end gap-4">
                     <div><h1 className="text-3xl font-bold text-tm-dark">Halo, {currentUser.name}!</h1><p className="text-gray-500 mt-2 text-lg">Panel aset pribadi Anda.</p></div>
                 </header>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     <div onClick={() => setActivePage('stock')} className="bg-blue-600 text-white p-8 rounded-3xl cursor-pointer hover:shadow-xl transition-all"><h3 className="text-5xl font-bold">{myAssets.length}</h3><p className="text-blue-100 mt-2">Aset Saya</p></div>
                     <div onClick={() => setActivePage('request')} className="bg-white p-8 rounded-3xl border cursor-pointer hover:shadow-lg transition-all"><h3 className="text-5xl font-bold text-gray-800">{macroMetrics.totalAssets > 0 ? 'Aktif' : '0'}</h3><p className="text-gray-500 mt-2">Status Request</p></div>
                 </div>
                 {/* Staff Actionable Items */}
                 <div className="max-w-2xl">
                     <h3 className="text-xl font-bold text-gray-800 mb-4">Tugas Pending</h3>
                     <ActionableItemsList currentUser={currentUser} setActivePage={setActivePage} onShowPreview={onShowPreview} />
                 </div>
             </div>
         );
    }

    // --- ADMIN / SUPER ADMIN DASHBOARD ---
    return (
        <div className="p-4 sm:p-6 md:p-8 space-y-8 bg-gray-50/30 min-h-screen font-sans">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between md:items-end gap-2 md:gap-4 pb-2">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">Pusat Analitik Terpadu</h1>
                    <p className="text-sm text-gray-500 mt-1">Tinjauan menyeluruh inventori aset dan operasional.</p>
                </div>
                <div className="md:text-right">
                    <p className="text-sm font-bold text-gray-800">{new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
            </div>

             {/* STOCK ALERT WIDGET */}
            <StockAlertWidget assets={assets} setActivePage={setActivePage} thresholds={thresholds} />

            {/* LAYER 1: EXECUTIVE SUMMARY (MACRO) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {canViewPrice ? (
                    <MacroStat 
                        label="Total Nilai Aset" 
                        value={formatCurrencyShort(macroMetrics.totalValue)} 
                        subValue={formatCurrencyFull(macroMetrics.totalValue)}
                        tooltip="Total harga pembelian seluruh aset aktif"
                        icon={BsCurrencyDollar} 
                    />
                ) : (
                     <MacroStat 
                        label="Total Aset Fisik" 
                        value={macroMetrics.totalAssets.toLocaleString('id-ID')} 
                        subValue={`${macroMetrics.totalActiveItems} Digunakan`}
                        icon={BsBoxSeam} 
                    />
                )}
                <MacroStat 
                    label="Ketersediaan Stok" 
                    value={macroMetrics.totalStockItems.toLocaleString('id-ID')} 
                    subValue="Unit Siap Pakai di Gudang"
                    icon={ArchiveBoxIcon} 
                />
                <MacroStat 
                    label="Variasi Model" 
                    value={macroMetrics.totalModels.toLocaleString('id-ID')} 
                    subValue={`Dari ${macroMetrics.totalCategories} Kategori Utama`}
                    icon={BsLayers} 
                />
                <MacroStat 
                    label="Cakupan Operasional" 
                    value={`${macroMetrics.totalCustomers} Klien`}
                    subValue={`${macroMetrics.totalDivisions} Divisi Internal`}
                    icon={ArchiveBoxIcon} 
                />
            </div>

            {/* LAYER 2: URGENCY MATRIX (RISK) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <UrgencyCard 
                    label="Persetujuan Tertunda" 
                    value={urgencyMetrics.pendingRequests.toString()} 
                    icon={CheckIcon} 
                    color="bg-amber-500" 
                    subtext="Menghambat Proses"
                    onClick={() => setActivePage('request', { status: 'awaiting-approval' })}
                />
                <UrgencyCard 
                    label="Peminjaman Terlambat" 
                    value={urgencyMetrics.overdueLoans.toString()} 
                    icon={BsClockHistory} 
                    color="bg-rose-500" 
                    subtext="Risiko Kehilangan"
                    onClick={() => setActivePage('request-pinjam', { status: 'Terlambat' })}
                />
                <UrgencyCard 
                    label="Laporan Kerusakan Baru" 
                    value={urgencyMetrics.unprocessedDamage.toString()} 
                    icon={ExclamationTriangleIcon} 
                    color="bg-orange-500" 
                    subtext="Perlu Tindakan"
                    onClick={() => setActivePage('repair')}
                />
                <UrgencyCard 
                    label="Stok Item Habis" 
                    value={urgencyMetrics.criticalStockCount.toString()} 
                    icon={ArchiveBoxIcon} 
                    color="bg-red-600" 
                    subtext="Segera Restock"
                    onClick={() => setActivePage('stock', { outOfStockOnly: true })}
                />
            </div>

            {/* LAYER 3: FEATURE DEEP-DIVE STATS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <FeatureStat 
                    title="Status Perbaikan Aset"
                    items={[
                        { label: 'Internal (Teknisi)', value: featureMetrics.repairs.internal, color: 'bg-blue-100 text-blue-700' },
                        { label: 'Vendor (Eksternal)', value: featureMetrics.repairs.vendor, color: 'bg-purple-100 text-purple-700' }
                    ]}
                    onClick={() => setActivePage('repair')}
                />
                <FeatureStat 
                    title="Kategori Request Aktif"
                    items={[
                        { label: 'Urgent / Darurat', value: featureMetrics.requests.urgent, color: 'bg-red-100 text-red-700' },
                        { label: 'Project Based', value: featureMetrics.requests.project, color: 'bg-indigo-100 text-indigo-700' }
                    ]}
                    onClick={() => setActivePage('request')}
                />
                <FeatureStat 
                    title="Mutasi Aset (30 Hari)"
                    items={[
                        { label: 'Handover Internal', value: featureMetrics.movements.handovers, color: 'bg-green-100 text-green-700' },
                        { label: 'Dismantle Pelanggan', value: featureMetrics.movements.dismantles, color: 'bg-orange-100 text-orange-700' }
                    ]}
                />
            </div>

            {/* LAYER 4: ANALYTICS, TRENDS & PERFORMANCE (Refactored Layout) */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-auto">
                 {/* Spending Trend - Takes 2 cols on XL */}
                 <div className="xl:col-span-2 bg-white p-6 border border-gray-100 rounded-2xl shadow-sm flex flex-col min-h-[300px]">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-bold text-gray-800">Tren Pembelian Aset (6 Bulan)</h3>
                        <BsGraphUp className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="flex-1 min-h-0">
                        <SpendingTrendChart data={analyticsData.spendingTrend} />
                    </div>
                </div>

                {/* Technician Leaderboard - Takes 1 col */}
                <div className="xl:col-span-1 bg-white p-6 border border-gray-100 rounded-2xl shadow-sm flex flex-col min-h-[300px]">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-base font-bold text-gray-800">Top Teknisi (Install/Repair)</h3>
                        <BsTrophy className="w-4 h-4 text-yellow-500" />
                    </div>
                    <div className="flex-1 min-h-0">
                        <TechnicianLeaderboard data={analyticsData.topTechnicians} />
                    </div>
                </div>      
            </div>

            {/* LAYER 5: ASSET COMPOSITION & MATRIX */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 h-auto">
                 {/* Donut Chart */}
                 <div className="xl:col-span-1 bg-white p-6 border border-gray-100 rounded-2xl shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-base font-bold text-gray-800">Komposisi Status</h3>
                        <ExclamationTriangleIcon className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="flex-1 min-h-0 flex items-center justify-center">
                        <AssetStatusDonutChart assets={assets} />
                    </div>
                </div>

                {/* Matrix & Warranty */}
                <div className="xl:col-span-2 flex flex-col gap-6">
                    <div className="bg-white p-6 border border-gray-100 rounded-2xl shadow-sm flex flex-col h-full">
                        <WarrantyAlertWidget assets={assets} />
                        <div className="flex-1 mt-4">
                            <AssetMatrix assets={assets} categories={assetCategories} onCellClick={(cat, status) => setActivePage('registration', { category: cat, status: status })} />
                        </div>
                    </div>
                </div>
            </div>

            {/* LAYER 6: SUMMARY & INBOX */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                 {/* Category Summary */}
                <div className="xl:col-span-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                     <CategorySummaryWidget assets={assets} categories={assetCategories} />
                </div>

                <div className="xl:col-span-2 flex flex-col gap-6 h-full">
                    <div className="flex-1 bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                         <ActionableItemsList currentUser={currentUser} setActivePage={setActivePage} onShowPreview={onShowPreview} />
                    </div>
                </div>

                {/* Action Hub / Activity Feed */}
                <div className="xl:col-span-2 flex flex-col gap-6 h-full">
                    <div className="h-auto bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                        <div className="p-5 border-b border-gray-50 flex justify-between items-center bg-white">
                            <h3 className="font-bold text-gray-800 text-sm">Jejak Audit Terkini</h3>
                            <button onClick={() => setIsActivityModalOpen(true)} className="text-xs text-tm-primary font-semibold hover:underline">Lihat Semua</button>
                        </div>
                        <div className="overflow-y-auto custom-scrollbar p-2">
                            <div className="space-y-1">
                                {allActivities.map((act) => {
                                    const Icon = getIconForActivity(act.type);
                                    return (
                                        <div key={act.id} onClick={() => onShowPreview(act.previewData)} className="flex gap-4 items-center p-3 hover:bg-gray-50 cursor-pointer group transition-all rounded-xl">
                                            <div className="w-9 h-9 rounded-full bg-gray-50 flex items-center justify-center flex-shrink-0 text-gray-400 border border-gray-100 group-hover:text-tm-primary group-hover:border-blue-100 group-hover:bg-blue-50">
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium text-gray-700 leading-tight group-hover:text-tm-primary transition-colors line-clamp-1">{act.action}</p>
                                                <div className="flex items-center gap-2 mt-1.5">
                                                    <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">{act.user}</span>
                                                    <span className="text-[10px] text-gray-400">{new Date(act.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

             <Modal
                isOpen={isActivityModalOpen}
                onClose={() => setIsActivityModalOpen(false)}
                title="Semua Aktivitas"
                size="lg"
                hideDefaultCloseButton >

                 <div className="max-h-[70vh] overflow-y-auto p-4 space-y-2">
                    {allActivities.map((act) => {
                         const Icon = getIconForActivity(act.type);
                         return (
                            <div key={act.id} onClick={() => {onShowPreview(act.previewData); setIsActivityModalOpen(false)}} className="flex gap-4 items-center p-4 hover:bg-gray-50 rounded-xl cursor-pointer border border-gray-100 hover:border-gray-300 transition-all">
                                <div className="w-10 h-10 rounded-full bg-blue-50 text-tm-primary flex items-center justify-center border border-blue-100">
                                    <Icon className="w-5 h-5" />
                                </div>
                                
                                <div>
                                    <p className="text-sm font-medium text-gray-900">{act.action}</p>
                                    <p className="text-xs text-gray-500 mt-1">{act.user} • {new Date(act.timestamp).toLocaleString()}</p>
                                </div>
                            </div>
                         )
                    })}
                 </div>
                 <div className="p-4 border-t flex justify-end bg-gray-50 rounded-b-xl">
                     <button onClick={() => setIsActivityModalOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm">Tutup</button>
                 </div>
            </Modal>
        </div>
    );
}
