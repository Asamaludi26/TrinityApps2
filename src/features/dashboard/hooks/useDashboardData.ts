
import { useMemo } from 'react';
import { AssetStatus, ItemStatus, LoanRequestStatus, AssetCondition } from '../../../types';
import { useAssetStore } from '../../../stores/useAssetStore';
import { useRequestStore } from '../../../stores/useRequestStore';
import { useTransactionStore } from '../../../stores/useTransactionStore';
import { useMasterDataStore } from '../../../stores/useMasterDataStore';

export const useDashboardData = (currentUserRole: string, currentUserName: string) => {
    // 1. Consumption of all stores
    const assets = useAssetStore((state) => state.assets);
    const assetCategories = useAssetStore((state) => state.categories);
    const requests = useRequestStore((state) => state.requests);
    const loanRequests = useRequestStore((state) => state.loanRequests);
    const handovers = useTransactionStore((state) => state.handovers);
    const dismantles = useTransactionStore((state) => state.dismantles);
    const maintenances = useTransactionStore((state) => state.maintenances);
    const installations = useTransactionStore((state) => state.installations);
    const customers = useMasterDataStore((state) => state.customers);
    const divisions = useMasterDataStore((state) => state.divisions);

    // 2. Macro Metrics (Executive Summary)
    const macroMetrics = useMemo(() => {
        const totalValue = assets.reduce((sum, a) => sum + (a.purchasePrice || 0), 0);
        const totalStockItems = assets.filter(a => a.status === AssetStatus.IN_STORAGE).length;
        const totalActiveItems = assets.filter(a => a.status === AssetStatus.IN_USE).length;
        
        let totalModels = 0;
        assetCategories.forEach(c => c.types.forEach(t => totalModels += (t.standardItems?.length || 0)));

        return {
            totalValue,
            totalAssets: assets.length,
            totalStockItems,
            totalActiveItems,
            totalCategories: assetCategories.length,
            totalModels,
            totalCustomers: customers.length,
            totalDivisions: divisions.length
        };
    }, [assets, assetCategories, customers.length, divisions.length]);

    // 3. Urgency Metrics (Risk & Attention)
    const urgencyMetrics = useMemo(() => {
        // Request Logic
        const pendingRequests = requests.filter(r => {
            if (currentUserRole === 'Staff') return false;
            if (currentUserRole === 'Admin Logistik' && r.status === ItemStatus.PENDING) return true;
            if (currentUserRole === 'Admin Purchase' && r.status === ItemStatus.LOGISTIC_APPROVED) return true;
            if (currentUserRole === 'Super Admin' && [ItemStatus.PENDING, ItemStatus.LOGISTIC_APPROVED, ItemStatus.AWAITING_CEO_APPROVAL].includes(r.status)) return true;
            return false;
        }).length;

        // Loan Logic
        const overdueLoans = loanRequests.filter(lr => lr.status === LoanRequestStatus.OVERDUE).length;
        
        // Asset Health Logic
        const unprocessedDamage = assets.filter(a => a.status === AssetStatus.DAMAGED).length;
        
        // Stock Logic
        const stockMap = new Map<string, number>();
        assets.filter(a => a.status === AssetStatus.IN_STORAGE).forEach(a => {
             const key = `${a.name}|${a.brand}`;
             stockMap.set(key, (stockMap.get(key) || 0) + 1);
        });
        let criticalStockCount = 0;
        assetCategories.forEach(cat => cat.types.forEach(t => t.standardItems?.forEach(item => {
             const key = `${item.name}|${item.brand}`;
             if (!stockMap.has(key) || stockMap.get(key) === 0) criticalStockCount++;
        })));

        return { pendingRequests, overdueLoans, unprocessedDamage, criticalStockCount };
    }, [assets, requests, loanRequests, currentUserRole, assetCategories]);

    // 4. Feature Deep-Dive Metrics
    const featureMetrics = useMemo(() => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        return {
            repairs: { 
                internal: assets.filter(a => a.status === AssetStatus.UNDER_REPAIR).length, 
                vendor: assets.filter(a => a.status === AssetStatus.OUT_FOR_REPAIR).length 
            },
            requests: { 
                urgent: requests.filter(r => r.order.type === 'Urgent' && ![ItemStatus.COMPLETED, ItemStatus.REJECTED].includes(r.status)).length, 
                project: requests.filter(r => r.order.type === 'Project Based' && ![ItemStatus.COMPLETED, ItemStatus.REJECTED].includes(r.status)).length 
            },
            movements: { 
                handovers: handovers.filter(h => new Date(h.handoverDate) >= thirtyDaysAgo).length, 
                dismantles: dismantles.filter(d => new Date(d.dismantleDate) >= thirtyDaysAgo).length 
            }
        };
    }, [assets, requests, handovers, dismantles]);

    // 5. Analytics (Spending & Performance)
    const analyticsData = useMemo(() => {
        // Spending Trend (Last 6 months)
        const spendingMap = new Map<string, number>();
        const months = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const key = d.toLocaleString('id-ID', { month: 'short' });
            months.push(key);
            spendingMap.set(key, 0);
        }
        
        assets.forEach(a => {
             if (a.purchaseDate && a.purchasePrice) { // FIX: Ensure date and price exist
                 const pDate = new Date(a.purchaseDate);
                 // FIX: Check for Invalid Date
                 if (!isNaN(pDate.getTime())) {
                     const pMonth = pDate.toLocaleString('id-ID', { month: 'short' });
                     if (spendingMap.has(pMonth)) {
                         spendingMap.set(pMonth, spendingMap.get(pMonth)! + a.purchasePrice);
                     }
                 }
             }
        });
        
        // Technician Performance (Installations + Maintenance)
        const techCount = new Map<string, number>();
        
        maintenances.forEach(m => {
            if (m.technician) techCount.set(m.technician, (techCount.get(m.technician) || 0) + 1);
        });
        
        installations.forEach(i => {
             if (i.technician) techCount.set(i.technician, (techCount.get(i.technician) || 0) + 1);
        });
        
        // Add Dismantles to performance
        dismantles.forEach(d => {
             if (d.technician) techCount.set(d.technician, (techCount.get(d.technician) || 0) + 1);
        });
        
        const topTechnicians = Array.from(techCount.entries())
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        return { 
            spendingTrend: months.map(m => ({ month: m, value: spendingMap.get(m) || 0 })), 
            topTechnicians 
        };
    }, [assets, maintenances, installations, dismantles]);

    // 6. Unified Activity Feed (Aggregating all modules)
    const allActivities = useMemo(() => {
        const activities: any[] = [];
        
        // Requests
        requests.slice(0, 10).forEach(req => {
             activities.push({ 
                 id: `req-${req.id}`, 
                 user: req.requester, 
                 action: `Request ${req.order.type === 'Urgent' ? 'Urgent' : ''} #${req.id}`, 
                 date: new Date(req.requestDate), 
                 timestamp: req.requestDate, 
                 type: 'request',
                 previewData: { type: 'request', id: req.id } 
             });
        });

        // Assets
        assets.sort((a,b) => new Date(b.registrationDate).getTime() - new Date(a.registrationDate).getTime()).slice(0, 10).forEach(asset => {
            activities.push({ 
                id: `ast-${asset.id}`, 
                user: asset.recordedBy, 
                action: `Aset Baru: ${asset.name}`, 
                date: new Date(asset.registrationDate), 
                timestamp: asset.registrationDate, 
                type: 'asset',
                previewData: { type: 'asset', id: asset.id } 
            });
        });

        // Handovers
        handovers.slice(0, 10).forEach(ho => {
            activities.push({
                id: `ho-${ho.id}`,
                user: ho.menyerahkan,
                action: `Handover ke ${ho.penerima}`,
                date: new Date(ho.handoverDate),
                timestamp: ho.handoverDate,
                type: 'handover',
                previewData: { type: 'handover', id: ho.id }
            });
        });

        // Maintenances
        maintenances.slice(0, 10).forEach(mnt => {
             activities.push({
                id: `mnt-${mnt.id}`,
                user: mnt.technician,
                action: `Maintenance di ${mnt.customerName}`,
                date: new Date(mnt.maintenanceDate),
                timestamp: mnt.maintenanceDate,
                type: 'maintenance',
                previewData: { type: 'customer-maintenance-form', id: mnt.id } // Special handling needed in preview
            });
        });

        return activities.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 10);
    }, [requests, assets, handovers, maintenances]);

    return {
        assets,
        assetCategories,
        macroMetrics,
        urgencyMetrics,
        featureMetrics,
        analyticsData,
        allActivities
    };
};
