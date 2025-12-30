
import { useMemo } from 'react';
import { User, ItemStatus, AssetStatus } from '../types';
import { useAssetStore } from '../stores/useAssetStore';
import { useRequestStore } from '../stores/useRequestStore';
import { useTransactionStore } from '../stores/useTransactionStore';

export type ActionableItemType = 'request' | 'asset_damage' | 'asset_registration' | 'installation_pending' | 'maintenance_pending' | 'dismantle_pending';

export interface ActionableItem {
  id: string;
  type: ActionableItemType;
  title: string;
  requester?: string;
  division?: string;
  timestamp: string;
  priority: 'high' | 'urgent' | 'normal';
  priorityLabel?: string;
  rawItem: any;
}

const getPriority = (item: any): ActionableItem['priority'] => {
    if ('isPrioritizedByCEO' in item && item.isPrioritizedByCEO) return 'high';
    if ('order' in item && item.order?.type === 'Urgent') return 'urgent';
    if ('priority' in item && item.priority === 'Tinggi') return 'urgent';
    return 'normal';
};

const getPriorityLabel = (item: any): string | undefined => {
    if ('isPrioritizedByCEO' in item && item.isPrioritizedByCEO) return 'CEO Disposition';
    if ('order' in item && item.order?.type === 'Urgent') return 'Urgent';
    if ('priority' in item && item.priority === 'Tinggi') return 'Prioritas Tinggi';
    return undefined;
}

export const useActionableItems = (currentUser: User) => {
  const assets = useAssetStore((state) => state.assets);
  const requests = useRequestStore((state) => state.requests);
  const installations = useTransactionStore((state) => state.installations);
  const maintenances = useTransactionStore((state) => state.maintenances);
  const dismantles = useTransactionStore((state) => state.dismantles);

  const actionableItems = useMemo<ActionableItem[]>(() => {
    const items: ActionableItem[] = [];
    const role = currentUser.role;

    // --- 1. REQUESTS & REGISTRATION ---
    if (role === 'Admin Logistik' || role === 'Admin Purchase' || role === 'Super Admin') {
      requests.forEach(req => {
        let needsAction = false;
        if ((role === 'Admin Logistik' || role === 'Super Admin') && req.status === ItemStatus.PENDING) needsAction = true;
        if (role === 'Admin Purchase' && req.status === ItemStatus.LOGISTIC_APPROVED) needsAction = true;
        if (role === 'Super Admin' && req.status === ItemStatus.AWAITING_CEO_APPROVAL) needsAction = true;

        if (needsAction) {
          items.push({
            id: req.id,
            type: 'request',
            title: req.items.map(i => `${i.quantity}x ${i.itemName}`).join(', '),
            requester: req.requester,
            division: req.division,
            timestamp: req.requestDate,
            priority: getPriority(req),
            priorityLabel: getPriorityLabel(req),
            rawItem: req,
          });
        }
      });
      
      if (role === 'Admin Logistik' || role === 'Super Admin') {
        requests.filter(req => req.status === ItemStatus.ARRIVED && !req.isRegistered).forEach(req => {
            items.push({
                id: req.id,
                type: 'asset_registration',
                title: `Barang dari request #${req.id} telah tiba`,
                requester: req.requester,
                division: req.division,
                timestamp: req.arrivalDate || req.requestDate,
                priority: getPriority(req),
                priorityLabel: 'Barang Tiba',
                rawItem: req,
            });
        });
      }
    }

    // --- 2. ASSET DAMAGE ---
    if (role === 'Admin Logistik' || role === 'Super Admin') {
        assets.filter(asset => asset.status === AssetStatus.DAMAGED).forEach(asset => {
            const reportLog = [...(asset.activityLog || [])].reverse().find(log => log.action === 'Kerusakan Dilaporkan');
            items.push({
                id: asset.id,
                type: 'asset_damage',
                title: asset.name,
                requester: reportLog?.user || asset.currentUser || 'N/A',
                division: 'N/A', 
                timestamp: reportLog?.timestamp || asset.lastModifiedDate || asset.registrationDate,
                priority: 'urgent',
                priorityLabel: 'Rusak',
                rawItem: asset,
            });
        });
    }

    // --- 3. OPERATIONAL TASKS (Maintenance, Install, Dismantle) ---
    // Only visible to Admin Logistik, Super Admin, and relevant Technicians
    const isTech = role === 'Staff' || role === 'Leader'; // Assuming techs are staff/leader in this context
    const isOpsAdmin = role === 'Admin Logistik' || role === 'Super Admin';

    if (isOpsAdmin || isTech) {
        // Pending Installations
        installations.filter(i => i.status === ItemStatus.PENDING && (isOpsAdmin || i.technician === currentUser.name)).forEach(inst => {
             items.push({
                id: inst.id,
                type: 'installation_pending',
                title: `Instalasi: ${inst.customerName}`,
                requester: inst.createdBy || 'System',
                division: 'Technical',
                timestamp: inst.installationDate,
                priority: 'normal',
                priorityLabel: 'Jadwal Instalasi',
                rawItem: inst
            });
        });

        // Pending Maintenances (Open Tickets)
        maintenances.filter(m => m.status !== ItemStatus.COMPLETED && (isOpsAdmin || m.technician === currentUser.name)).forEach(mnt => {
             items.push({
                id: mnt.id,
                type: 'maintenance_pending',
                title: `Maintenance: ${mnt.customerName}`,
                requester: 'System',
                division: 'Technical',
                timestamp: mnt.maintenanceDate,
                priority: mnt.priority === 'Tinggi' ? 'urgent' : 'normal',
                priorityLabel: mnt.priority === 'Tinggi' ? 'Maintenance Urgent' : 'Maintenance',
                rawItem: mnt
            });
        });

        // Pending Dismantles (Need Warehouse Ack)
        if (isOpsAdmin) {
            dismantles.filter(d => d.status === ItemStatus.IN_PROGRESS).forEach(dsm => {
                items.push({
                    id: dsm.id,
                    type: 'dismantle_pending',
                    title: `Konfirmasi Dismantle: ${dsm.assetName}`,
                    requester: dsm.technician,
                    division: 'Technical',
                    timestamp: dsm.dismantleDate,
                    priority: 'normal',
                    priorityLabel: 'Verifikasi Gudang',
                    rawItem: dsm
                });
            });
        }
    }

    return items.sort((a, b) => {
      const priorityOrder = { high: 3, urgent: 2, normal: 1 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

  }, [currentUser, requests, assets, installations, maintenances, dismantles]);

  return actionableItems;
};
