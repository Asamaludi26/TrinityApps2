
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Asset, AssetCategory, StockMovement, MovementType, ActivityLogEntry, AssetStatus } from '../types';
import * as api from '../services/api';

interface AssetState {
  assets: Asset[];
  categories: AssetCategory[];
  stockMovements: StockMovement[];
  thresholds: Record<string, number>; 
  isLoading: boolean;

  // Actions
  fetchAssets: () => Promise<void>;
  addAsset: (asset: Asset | (Asset & { initialBalance?: number, currentBalance?: number })) => Promise<void>;
  updateAsset: (id: string, data: Partial<Asset>) => Promise<void>;
  updateAssetBatch: (ids: string[], data: Partial<Asset>) => Promise<void>;
  deleteAsset: (id: string) => Promise<void>;
  
  updateCategories: (categories: AssetCategory[]) => Promise<void>;
  updateThresholds: (thresholds: Record<string, number>) => void; 

  recordMovement: (movement: Omit<StockMovement, 'id' | 'balanceAfter'>) => Promise<void>;
  getStockHistory: (name: string, brand: string) => StockMovement[];
  refreshAll: () => Promise<void>;

  // CENTRALIZED LOGIC: Consume Stock (Installation/Maintenance)
  consumeMaterials: (
      materials: { materialAssetId?: string, itemName: string, brand: string, quantity: number, unit: string }[],
      context: { customerId?: string, location?: string }
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

export const useAssetStore = create<AssetState>()(
  persist(
    (set, get) => ({
      assets: [],
      categories: [],
      stockMovements: [],
      thresholds: {}, 
      isLoading: false,

      refreshAll: async () => {
          await get().fetchAssets();
      },

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
             asset.currentBalance = (rawAsset as any).currentBalance;
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
             if (originalAsset.status === 'Di Gudang' && (data.status === 'Digunakan' || data.status === 'Rusak')) {
                 if (data.status === 'Digunakan') type = 'OUT_INSTALLATION';
                 if (data.status === 'Rusak') type = 'OUT_BROKEN';
             } else if ((originalAsset.status === 'Digunakan' || originalAsset.status === 'Rusak' || originalAsset.status === 'Dalam Perbaikan') && data.status === 'Di Gudang') {
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
                     notes: `Otomatis dari perubahan status: ${originalAsset.status} -> ${data.status}`
                 });
             }
        }
      },

      updateAssetBatch: async (ids, rawData) => {
          const current = get().assets;
          const updated = current.map(a => {
              if (ids.includes(a.id)) {
                  return { ...a, ...rawData };
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

      // --- CENTRALIZED CONSUMPTION LOGIC (REFACTORED FOR ATOMICITY) ---
      consumeMaterials: async (materials, context) => {
          const { assets, categories } = get();
          const warnings: string[] = [];
          
          // Pending Updates Buffer (Simulation of Transaction)
          // Stores { assetId: { changes } }
          const pendingUpdates: Record<string, Partial<Asset>> = {};

          for (const mat of materials) {
              // 1. Identify Model Config (Measurement vs Count)
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

              // 2. Select Source Assets
              let targetAssets: Asset[] = [];
              
              if (mat.materialAssetId) {
                  const specificAsset = assets.find(a => a.id === mat.materialAssetId);
                  if (specificAsset && specificAsset.status === AssetStatus.IN_STORAGE) {
                      targetAssets = [specificAsset];
                  } else {
                       warnings.push(`ID Aset spesifik ${mat.materialAssetId} tidak tersedia. Mencoba alokasi otomatis.`);
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

              // 3. Logic Execution (Updates pendingUpdates, NOT store yet)
              if (isMeasurement) {
                  let remainingNeed = mat.quantity;
                  
                  for (const asset of targetAssets) {
                      if (remainingNeed <= 0) break;

                      // Use current balance, fallback to initial, default 0
                      // Check if we already have a pending update for this asset
                      const currentPending = pendingUpdates[asset.id];
                      
                      const effectiveBalance = currentPending?.currentBalance !== undefined 
                           ? currentPending.currentBalance 
                           : (asset.currentBalance ?? asset.initialBalance ?? 0);

                      if (effectiveBalance <= 0) continue;

                      if (effectiveBalance > remainingNeed) {
                          // Partial Use
                          pendingUpdates[asset.id] = {
                              ...pendingUpdates[asset.id],
                              currentBalance: effectiveBalance - remainingNeed,
                              status: AssetStatus.IN_STORAGE
                          };
                          remainingNeed = 0;
                      } else {
                          // Full Use of Drum
                          pendingUpdates[asset.id] = {
                              ...pendingUpdates[asset.id],
                              currentBalance: 0,
                              status: AssetStatus.CONSUMED
                          };
                          remainingNeed -= effectiveBalance;
                      }
                  }

                  if (remainingNeed > 0) {
                      warnings.push(`Stok fisik ${mat.itemName} kurang ${remainingNeed} ${mat.unit}.`);
                  }

              } else {
                  // --- LOGIC COUNT (Konektor) ---
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

                  if (qtyToConsume < mat.quantity) {
                       warnings.push(`Stok fisik ${mat.itemName} kurang ${mat.quantity - qtyToConsume} ${mat.unit}.`);
                  }
              }
          }
          
          // 4. COMMIT PHASE
          // Apply all pending updates to the store in one go
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
