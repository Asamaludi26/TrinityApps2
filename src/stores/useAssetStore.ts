
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Asset, AssetCategory, StockMovement, MovementType, AssetStatus, ActivityLogEntry, ItemStatus } from '../types';
import * as api from '../services/api';
import { useNotificationStore } from './useNotificationStore';
import { useMasterDataStore } from './useMasterDataStore';
import { useAuthStore } from './useAuthStore';
import { useRequestStore } from './useRequestStore'; // Cross-store access

interface AssetState {
  assets: Asset[];
  categories: AssetCategory[];
  stockMovements: StockMovement[];
  thresholds: Record<string, number>; 
  isLoading: boolean;

  fetchAssets: () => Promise<void>;
  addAsset: (asset: Asset | (Asset & { initialBalance?: number, currentBalance?: number })) => Promise<void>;
  updateAsset: (id: string, data: Partial<Asset>) => Promise<void>;
  updateAssetBatch: (ids: string[], data: Partial<Asset>, logAction?: string) => Promise<void>; 
  deleteAsset: (id: string) => Promise<void>;
  
  updateCategories: (categories: AssetCategory[]) => Promise<void>;
  updateThresholds: (thresholds: Record<string, number>) => void; 

  recordMovement: (movement: Omit<StockMovement, 'id' | 'balanceAfter'>) => Promise<void>;
  getStockHistory: (name: string, brand: string) => StockMovement[];
  
  // Advanced Logic - Updated signature
  checkAvailability: (itemName: string, brand: string, qtyNeeded: number, excludeRequestId?: string) => { 
      physical: number, 
      reserved: number, 
      available: number, 
      isSufficient: boolean, 
      isFragmented: boolean, 
      breakdown: { type: 'unit' | 'measurement', unit: string },
      recommendedSourceIds: string[] 
  };
  
  validateStockForRequest: (items: { itemName: string; itemTypeBrand: string; quantity: number }[], excludeRequestId?: string) => { valid: boolean; errors: string[] };

  consumeMaterials: (
      materials: { materialAssetId?: string, itemName: string, brand: string, quantity: number, unit: string }[],
      context: { customerId?: string, location?: string, docNumber?: string }
  ) => Promise<{ success: boolean; warnings: string[] }>;
}

const sanitizeBulkAsset = (asset: Asset | Partial<Asset>, categories: AssetCategory[], existingAsset?: Asset): Asset | Partial<Asset> => {
    const categoryName = asset.category || existingAsset?.category;
    const typeName = asset.type || existingAsset?.type;
    if (!categoryName || !typeName) return asset;
    const category = categories.find(c => c.name === categoryName);
    const type = category?.types.find(t => t.name === typeName);
    if (type?.trackingMethod === 'bulk') {
        return { ...asset, serialNumber: undefined, macAddress: undefined };
    }
    return asset;
};

// Helper Notifikasi
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

export const useAssetStore = create<AssetState>()(
  persist(
    (set, get) => ({
      assets: [],
      categories: [],
      stockMovements: [],
      thresholds: {}, 
      isLoading: false,

      fetchAssets: async () => {
        set({ isLoading: true });
        try {
          const data = await api.fetchAllData();
          set({ 
              assets: data.assets, 
              categories: data.assetCategories, 
              stockMovements: (data as any).stockMovements || [],
              isLoading: false 
          });
        } catch (error) {
          set({ isLoading: false });
        }
      },

      addAsset: async (rawAsset) => {
        const asset = sanitizeBulkAsset(rawAsset, get().categories) as Asset;
        
        if ((rawAsset as any).initialBalance !== undefined) {
             asset.initialBalance = (rawAsset as any).initialBalance;
             asset.currentBalance = (rawAsset as any).currentBalance ?? (rawAsset as any).initialBalance;
        }

        const current = get().assets;
        const updated = [asset, ...current];
        await api.updateData('app_assets', updated); 
        set({ assets: updated });
        
        const category = get().categories.find(c => c.name === asset.category);
        const type = category?.types.find(t => t.name === asset.type);
        
        await get().recordMovement({
             assetName: asset.name,
             brand: asset.brand,
             date: asset.registrationDate,
             type: 'IN_PURCHASE',
             quantity: (type?.trackingMethod === 'bulk' && (rawAsset as any).quantity) ? (rawAsset as any).quantity : 1,
             referenceId: asset.poNumber || 'Initial',
             actor: asset.recordedBy,
             notes: 'Penerimaan barang baru'
         });
      },

      updateAsset: async (id, rawData) => {
        const current = get().assets;
        const originalAsset = current.find(a => a.id === id);
        if (!originalAsset) return;

        const data = sanitizeBulkAsset(rawData, get().categories, originalAsset);
        
        const updated = current.map(a => a.id === id ? { ...a, ...data } : a);
        await api.updateData('app_assets', updated);
        set({ assets: updated });

        if (originalAsset && data.status && data.status !== originalAsset.status) {
             let type: MovementType | null = null;
             
             if (originalAsset.status === AssetStatus.IN_STORAGE && data.status !== AssetStatus.IN_STORAGE) {
                 if (data.status === AssetStatus.IN_USE) type = 'OUT_INSTALLATION';
                 else if (data.status === AssetStatus.DAMAGED) type = 'OUT_BROKEN';
             } 
             else if (originalAsset.status !== AssetStatus.IN_STORAGE && data.status === AssetStatus.IN_STORAGE) {
                 type = 'IN_RETURN';
             }

             if (type) {
                  await get().recordMovement({
                     assetName: originalAsset.name,
                     brand: originalAsset.brand,
                     date: new Date().toISOString(),
                     type: type,
                     quantity: 1,
                     referenceId: (data as any).woRoIntNumber || 'Status Update',
                     actor: 'System', 
                     notes: `Perubahan status: ${originalAsset.status} -> ${data.status}`
                 });
             }
             
             if (data.status === AssetStatus.DAMAGED) {
                 notifyAdmins('ASSET_DAMAGED_REPORT', id, `melaporkan kerusakan pada aset ${originalAsset.name}`);
             }
        }
      },

      updateAssetBatch: async (ids, rawData, logAction = 'Batch Update') => {
          const current = get().assets;
          const currentUser = useAuthStore.getState().currentUser?.name || 'System';
          
          const updated = current.map(a => {
              if (ids.includes(a.id)) {
                  const newLog: ActivityLogEntry = {
                      id: `log-batch-${Date.now()}-${Math.random()}`,
                      timestamp: new Date().toISOString(),
                      user: currentUser,
                      action: logAction,
                      details: `Status diubah menjadi: ${rawData.status || 'Updated'}`
                  };
                  
                  return { 
                      ...a, 
                      ...rawData,
                      activityLog: [...(a.activityLog || []), newLog]
                  };
              }
              return a;
          });
          
          await api.updateData('app_assets', updated);
          set({ assets: updated });
      },

      deleteAsset: async (id) => {
        const current = get().assets;
        const assetToDelete = current.find(a => a.id === id);
        const updated = current.filter(a => a.id !== id);
        await api.updateData('app_assets', updated);
        set({ assets: updated });

        if (assetToDelete && assetToDelete.status === 'Di Gudang') {
             await get().recordMovement({
                 assetName: assetToDelete.name,
                 brand: assetToDelete.brand,
                 date: new Date().toISOString(),
                 type: 'OUT_ADJUSTMENT',
                 quantity: 1,
                 referenceId: 'DELETE',
                 actor: 'System',
                 notes: 'Aset dihapus dari sistem'
             });
        }
      },

      updateCategories: async (categories) => {
          await api.updateData('app_assetCategories', categories);
          set({ categories });
      },
      
      updateThresholds: (thresholds) => {
          set({ thresholds });
      },

      recordMovement: async (movementData) => {
          const updatedMovements = await api.recordStockMovement(movementData);
          set({ stockMovements: updatedMovements as StockMovement[] });
      },

      getStockHistory: (name, brand) => {
          return get().stockMovements
            .filter(m => m.assetName === name && m.brand === brand)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      },
      
      // --- THE ULTIMATE AVAILABILITY LOGIC (REFACTORED) ---
      checkAvailability: (itemName, brand, qtyNeeded, excludeRequestId) => {
          const assets = get().assets;
          // IMPORTANT: Fetch requests directly from store to ensure latest state
          const requests = useRequestStore.getState().requests;
          
          // 1. Fisik: Apa yang benar-benar ada di gudang saat ini?
          const physicalAssets = assets.filter(a => 
              a.name === itemName && 
              a.brand === brand && 
              a.status === AssetStatus.IN_STORAGE
          );

          // 2. Deteksi Tipe (Measurement vs Unit)
          const isMeasurement = physicalAssets.length > 0 && physicalAssets[0].initialBalance !== undefined;
          
          // 3. Reservasi: Apa yang sudah dijanjikan ke orang lain?
          // Filter hanya request aktif yang memotong stok (stock_allocated)
          // FIX: Exclude request yang sedang diedit/diperiksa (excludeRequestId) agar tidak menghitung reservasi diri sendiri
          const activeRequests = requests.filter(r => 
              r.id !== excludeRequestId &&
              ![ItemStatus.COMPLETED, ItemStatus.REJECTED, ItemStatus.CANCELLED].includes(r.status)
          );

          let reservedQuantity = 0;
          activeRequests.forEach(req => {
              const matchingItems = req.items.filter(i => i.itemName === itemName && i.itemTypeBrand === brand);
              matchingItems.forEach(item => {
                  const status = req.itemStatuses?.[item.id];
                  if (status?.status === 'stock_allocated') {
                      reservedQuantity += (status.approvedQuantity ?? item.quantity);
                  }
              });
          });

          // 4. Kalkulasi Final ATP (Available to Promise)
          if (isMeasurement) {
              const totalPhysicalLength = physicalAssets.reduce((sum, a) => sum + (a.currentBalance || 0), 0);
              const availableLength = Math.max(0, totalPhysicalLength - reservedQuantity);
              
              const hasSinglePieceSufficient = physicalAssets.some(a => (a.currentBalance || 0) >= qtyNeeded);
              const isFragmented = !hasSinglePieceSufficient && availableLength >= qtyNeeded;

              physicalAssets.sort((a, b) => new Date(a.registrationDate).getTime() - new Date(b.registrationDate).getTime());
              const recommendedAssets = physicalAssets.filter(a => (a.currentBalance || 0) > 0);

              return {
                  physical: totalPhysicalLength,
                  reserved: reservedQuantity,
                  available: availableLength,
                  isSufficient: availableLength >= qtyNeeded,
                  isFragmented, 
                  breakdown: { type: 'measurement', unit: 'Meter' },
                  recommendedSourceIds: recommendedAssets.map(a => a.id)
              };

          } else {
              const totalPhysicalCount = physicalAssets.length;
              const availableCount = Math.max(0, totalPhysicalCount - reservedQuantity);

              physicalAssets.sort((a, b) => new Date(a.registrationDate).getTime() - new Date(b.registrationDate).getTime());
              
              // Rekomendasi ID: Skip sejumlah yang sudah di-reserve (FIFO)
              const recommendedAssets = physicalAssets.slice(reservedQuantity, reservedQuantity + qtyNeeded);

              return {
                  physical: totalPhysicalCount,
                  reserved: reservedQuantity,
                  available: availableCount,
                  isSufficient: availableCount >= qtyNeeded,
                  isFragmented: false,
                  breakdown: { type: 'unit', unit: 'Unit' },
                  recommendedSourceIds: recommendedAssets.map(a => a.id)
              };
          }
      },

      // --- GATEKEEPER: VALIDASI MASAL ---
      validateStockForRequest: (items, excludeRequestId) => {
          const errors: string[] = [];
          const self = get(); // Get fresh state

          items.forEach(item => {
              const check = self.checkAvailability(item.itemName, item.itemTypeBrand, item.quantity, excludeRequestId);
              if (!check.isSufficient) {
                  errors.push(`${item.itemName}: Stok tidak cukup (Butuh: ${item.quantity}, Ada: ${check.available})`);
              }
          });
          
          return { valid: errors.length === 0, errors };
      },

      consumeMaterials: async (materials, context) => {
          const { assets, categories } = get();
          const warnings: string[] = [];
          const pendingUpdates: Record<string, Partial<Asset>> = {};
          const movementLogs: Omit<StockMovement, 'id' | 'balanceAfter'>[] = [];

          for (const mat of materials) {
              let isMeasurement = false;
              for (const cat of categories) {
                  for (const type of cat.types) {
                      const model = type.standardItems?.find(i => i.name === mat.itemName && i.brand === mat.brand);
                      if (model && model.bulkType === 'measurement') {
                          isMeasurement = true;
                          break;
                      }
                  }
                  if (isMeasurement) break;
              }

              let targetAssets: Asset[] = [];
              if (mat.materialAssetId) {
                  const specificAsset = assets.find(a => a.id === mat.materialAssetId);
                  if (specificAsset && specificAsset.status === AssetStatus.IN_STORAGE) {
                      targetAssets = [specificAsset];
                  } else {
                       warnings.push(`Stok spesifik ${mat.materialAssetId} (${mat.itemName}) tidak valid/kosong. Mencoba alokasi otomatis.`);
                  }
              }
              
              if (targetAssets.length === 0) {
                  targetAssets = assets
                      .filter(a => 
                          a.name === mat.itemName && 
                          a.brand === mat.brand && 
                          a.status === AssetStatus.IN_STORAGE
                      )
                      .sort((a, b) => new Date(a.registrationDate).getTime() - new Date(b.registrationDate).getTime());
              }

              if (isMeasurement) {
                  let remainingNeed = mat.quantity;
                  
                  for (const asset of targetAssets) {
                      if (remainingNeed <= 0) break;
                      
                      const currentPending = pendingUpdates[asset.id];
                      const effectiveBalance = currentPending?.currentBalance !== undefined 
                           ? currentPending.currentBalance 
                           : (asset.currentBalance ?? asset.initialBalance ?? 0);

                      if (effectiveBalance <= 0) continue;

                      if (effectiveBalance > remainingNeed) {
                          pendingUpdates[asset.id] = {
                              ...pendingUpdates[asset.id],
                              currentBalance: effectiveBalance - remainingNeed,
                              status: AssetStatus.IN_STORAGE 
                          };
                          remainingNeed = 0;
                      } else {
                          pendingUpdates[asset.id] = {
                              ...pendingUpdates[asset.id],
                              currentBalance: 0,
                              status: AssetStatus.CONSUMED 
                          };
                          remainingNeed -= effectiveBalance;
                      }
                  }
                  if (remainingNeed > 0) warnings.push(`Stok fisik ${mat.itemName} kurang ${remainingNeed} ${mat.unit}.`);

              } else {
                  const qtyToConsume = Math.min(mat.quantity, targetAssets.length);
                  if (qtyToConsume > 0) {
                      const itemsToUpdate = targetAssets.slice(0, qtyToConsume);
                      for (const item of itemsToUpdate) {
                          pendingUpdates[item.id] = {
                              ...pendingUpdates[item.id],
                              status: AssetStatus.IN_USE,
                              currentUser: context.customerId || null,
                              location: context.location || 'Digunakan'
                          };
                      }
                  }
                  if (qtyToConsume < mat.quantity) warnings.push(`Stok fisik ${mat.itemName} kurang ${mat.quantity - qtyToConsume} ${mat.unit}.`);
              }

              movementLogs.push({
                   assetName: mat.itemName,
                   brand: mat.brand,
                   date: new Date().toISOString(),
                   type: 'OUT_INSTALLATION',
                   quantity: mat.quantity,
                   referenceId: context.docNumber || 'Usage',
                   actor: 'System',
                   notes: `Digunakan di ${context.location}`
              });
          }
          
          if (Object.keys(pendingUpdates).length > 0) {
             const currentAssets = get().assets;
             const updatedAssets = currentAssets.map(a => {
                 if (pendingUpdates[a.id]) {
                     return { ...a, ...pendingUpdates[a.id] };
                 }
                 return a;
             });
             
             await api.updateData('app_assets', updatedAssets);
             set({ assets: updatedAssets });
             
             for (const log of movementLogs) {
                 await get().recordMovement(log);
             }
          }
          
          return { success: true, warnings };
      }
    }),
    {
        name: 'asset-storage',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({ 
            categories: state.categories,
            thresholds: state.thresholds 
        }),
    }
  )
);
