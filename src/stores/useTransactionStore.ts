
import { create } from 'zustand';
import { Handover, Dismantle, Maintenance, Installation, ItemStatus, AssetStatus, AssetCondition, CustomerStatus } from '../types';
import * as api from '../services/api';
import { useNotificationStore } from './useNotificationStore';
import { useMasterDataStore } from './useMasterDataStore';
import { useAssetStore } from './useAssetStore';
import { useAuthStore } from './useAuthStore';

interface TransactionState {
  handovers: Handover[];
  dismantles: Dismantle[];
  maintenances: Maintenance[];
  installations: Installation[];
  isLoading: boolean;

  fetchTransactions: () => Promise<void>;
  refreshAll: () => Promise<void>;

  addHandover: (handover: Handover) => Promise<void>;
  deleteHandover: (id: string) => Promise<void>;

  addDismantle: (dismantle: Dismantle) => Promise<void>;
  updateDismantle: (id: string, data: Partial<Dismantle>) => Promise<void>;
  deleteDismantle: (id: string) => Promise<void>;

  addMaintenance: (maintenance: Maintenance) => Promise<void>;
  updateMaintenance: (id: string, data: Partial<Maintenance>) => Promise<void>;
  deleteMaintenance: (id: string) => Promise<void>;

  addInstallation: (installation: Installation) => Promise<void>;
  deleteInstallation: (id: string) => Promise<void>;
}

const notifyRecipient = (userName: string, type: string, refId: string, message: string) => {
    const users = useMasterDataStore.getState().users;
    const currentUser = useAuthStore.getState().currentUser;
    const recipient = users.find(u => u.name === userName);
    
    if (recipient && currentUser) {
        useNotificationStore.getState().addSystemNotification({
            recipientId: recipient.id,
            actorName: currentUser.name,
            type: type,
            referenceId: refId,
            message: message
        });
    }
};

const notifyAdmins = (type: string, refId: string, message: string) => {
    const users = useMasterDataStore.getState().users;
    const currentUser = useAuthStore.getState().currentUser;
    if (!currentUser) return;
    
    users.filter(u => u.role === 'Admin Logistik' || u.role === 'Super Admin').forEach(admin => {
         if (admin.id !== currentUser.id) {
             useNotificationStore.getState().addSystemNotification({
                recipientId: admin.id,
                actorName: currentUser.name,
                type: type,
                referenceId: refId,
                message: message
            });
         }
    });
};

export const useTransactionStore = create<TransactionState>((set, get) => ({
  handovers: [],
  dismantles: [],
  maintenances: [],
  installations: [],
  isLoading: false,

  refreshAll: async () => {
      await get().fetchTransactions();
  },

  fetchTransactions: async () => {
    set({ isLoading: true });
    try {
      const data = await api.fetchAllData();
      set({ 
        handovers: data.handovers,
        dismantles: data.dismantles,
        maintenances: data.maintenances,
        installations: data.installations,
        isLoading: false 
      });
    } catch (error) {
      set({ isLoading: false });
    }
  },

  addHandover: async (handover) => {
    const current = get().handovers;
    const updated = [handover, ...current];
    await api.updateData('app_handovers', updated);
    set({ handovers: updated });

    notifyRecipient(handover.penerima, 'ASSET_HANDED_OVER', handover.id, `menyerahkan ${handover.items.length} item aset kepada Anda.`);
  },
  
  deleteHandover: async (id) => {
      const current = get().handovers;
      const updated = current.filter(h => h.id !== id);
      await api.updateData('app_handovers', updated);
      set({ handovers: updated });
  },

  addDismantle: async (dismantle) => {
    const current = get().dismantles;
    const updated = [dismantle, ...current];
    await api.updateData('app_dismantles', updated);
    set({ dismantles: updated });
    
    notifyAdmins('STATUS_CHANGE', dismantle.id, `melakukan dismantle aset dari pelanggan ${dismantle.customerName}`);
  },

  // INTELLIGENT DISMANTLE UPDATE
  updateDismantle: async (id, data) => {
    const current = get().dismantles;
    const oldDismantle = current.find(d => d.id === id);
    const updated = current.map(d => d.id === id ? { ...d, ...data } : d);
    await api.updateData('app_dismantles', updated);
    set({ dismantles: updated });

    // Jika Status COMPLETED, jalankan logika pengembalian stok cerdas
    if (data.status === ItemStatus.COMPLETED && oldDismantle) {
        const { updateAsset, assets } = useAssetStore.getState();
        const { updateCustomer } = useMasterDataStore.getState();
        
        // 1. Tentukan Status Target berdasarkan Kondisi
        const isGood = [AssetCondition.GOOD, AssetCondition.USED_OKAY, AssetCondition.BRAND_NEW].includes(oldDismantle.retrievedCondition);
        const targetStatus = isGood ? AssetStatus.IN_STORAGE : AssetStatus.DAMAGED;
        
        await updateAsset(oldDismantle.assetId, {
             status: targetStatus,
             condition: oldDismantle.retrievedCondition,
             currentUser: null,
             location: isGood ? 'Gudang Inventori' : 'Gudang (Rusak)',
             isDismantled: true,
             dismantleInfo: { 
                 customerId: oldDismantle.customerId, 
                 customerName: oldDismantle.customerName, 
                 dismantleDate: oldDismantle.dismantleDate, 
                 dismantleId: oldDismantle.id 
             }
        });
        
        // 2. Cek status pelanggan (apakah masih ada aset lain?)
        // Logic manual karena store assets mungkin belum refresh
        const remainingAssets = assets.filter(a => 
             a.currentUser === oldDismantle.customerId && 
             a.status === AssetStatus.IN_USE && 
             a.id !== oldDismantle.assetId
        );

        if (remainingAssets.length === 0) {
              await updateCustomer(oldDismantle.customerId, { status: CustomerStatus.INACTIVE });
              useNotificationStore.getState().addToast('Status pelanggan otomatis diubah menjadi Non-Aktif karena tidak ada aset tersisa.', 'info');
        }
    }
  },

  deleteDismantle: async (id) => {
      const current = get().dismantles;
      const updated = current.filter(d => d.id !== id);
      await api.updateData('app_dismantles', updated);
      set({ dismantles: updated });
  },

  addMaintenance: async (maintenance) => {
    const current = get().maintenances;
    const updated = [maintenance, ...current];
    await api.updateData('app_maintenances', updated);
    set({ maintenances: updated });
    
    if (maintenance.priority === 'Tinggi') {
         notifyAdmins('REPAIR_STARTED', maintenance.id, `membuat tiket maintenance PRIORITAS TINGGI`);
    }
  },

  updateMaintenance: async (id, data) => {
    const current = get().maintenances;
    const updated = current.map(m => m.id === id ? { ...m, ...data } : m);
    await api.updateData('app_maintenances', updated);
    set({ maintenances: updated });
    
    if (data.status === ItemStatus.COMPLETED) {
         notifyAdmins('REPAIR_COMPLETED', id, 'telah menyelesaikan tiket maintenance');
    }
  },

  deleteMaintenance: async (id) => {
      const current = get().maintenances;
      const updated = current.filter(m => m.id !== id);
      await api.updateData('app_maintenances', updated);
      set({ maintenances: updated });
  },

  addInstallation: async (installation) => {
    const current = get().installations;
    const updated = [installation, ...current];
    await api.updateData('app_installations', updated);
    set({ installations: updated });
    
    notifyAdmins('STATUS_CHANGE', installation.id, `telah menyelesaikan instalasi di ${installation.customerName}`);
  },

  deleteInstallation: async (id) => {
      const current = get().installations;
      const updated = current.filter(i => i.id !== id);
      await api.updateData('app_installations', updated);
      set({ installations: updated });
  }
}));
