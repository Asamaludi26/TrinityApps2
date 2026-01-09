
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
  // REFACTOR: Added referenceId parameter
  updateAssetBatch: (ids: string[], data: Partial<Asset>, referenceId?: string) => Promise<void>; 
  deleteAsset: (id: string) => Promise<void>;
  
  updateCategories: (categories: AssetCategory[]) => Promise<void>;
  updateThresholds: (thresholds: Record<string, number>) => void; 

  recordMovement: (movement: Omit<StockMovement, 'id' | 'balanceAfter'>) => Promise<void>;
  getStockHistory: (name: string, brand: string) => StockMovement[];
  
  checkAvailability: (itemName: string, brand: string, qtyNeeded: number, requestUnit?: string, excludeRequestId?: string) => { 
      physicalCount: number,    
      totalContent: number,     
      reservedCount: number,    
      reservedContent: number,  
      availableCount: number,   
      availableContent: number, 
      availableSmart: number, 
      isSufficient: boolean, 
      isFragmented: boolean, 
      isMeasurement: boolean,
      unitType: 'container' | 'base', 
      containerUnit: string,
      baseUnit: string,
      recommendedSourceIds: string[] 
  };
  
  validateStockForRequest: (items: { itemName: string; itemTypeBrand: string; quantity: number; unit?: string }[], excludeRequestId?: string) => { valid: boolean; errors: string[] };

  consumeMaterials: (
      materials: { materialAssetId?: string, itemName: string, brand: string, quantity: number, unit: string }[],
      context: { customerId?: string, location?: string, docNumber?: string }
  ) => Promise<{ success: boolean; warnings: string[] }>;
}

// --- UTILITY: SAFE MATH FOR FLOATING POINT ---
// Membulatkan ke 4 desimal untuk menghindari error seperti 350 - 0.1 = 349.8999999999
const safeRound = (num: number): number => {
    return Math.round((num + Number.EPSILON) * 10000) / 10000;
};

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
        
        let logQty = 1;
        if (asset.initialBalance !== undefined) {
            logQty = asset.initialBalance;
        } else if (type?.trackingMethod === 'bulk' && (rawAsset as any).quantity) {
            logQty = (rawAsset as any).quantity;
        }

        await get().recordMovement({
             assetName: asset.name,
             brand: asset.brand,
             date: asset.registrationDate,
             type: 'IN_PURCHASE',
             quantity: logQty,
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
             
             // --- SMART LOGGING FOR STATUS CHANGE ---
             // Menentukan quantity log berdasarkan tipe aset
             const isMeasurement = originalAsset.currentBalance !== undefined;
             const qtyToLog = isMeasurement ? (originalAsset.currentBalance || 0) : 1;

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
                     quantity: qtyToLog,
                     referenceId: (data as any).woRoIntNumber || 'Status Update',
                     actor: 'System', 
                     notes: isMeasurement 
                        ? `Perubahan status fisik (Log: ${qtyToLog} Base Unit): ${originalAsset.status} -> ${data.status}`
                        : `Perubahan status: ${originalAsset.status} -> ${data.status}`
                 });
             }
             
             if (data.status === AssetStatus.DAMAGED) {
                 notifyAdmins('ASSET_DAMAGED_REPORT', id, `melaporkan kerusakan pada aset ${originalAsset.name}`);
             }
        }
      },

      // REFACTOR: Parameter `referenceId` sekarang eksplisit, bukan `logAction`
      updateAssetBatch: async (ids, rawData, referenceId = 'Batch Update') => {
          const current = get().assets;
          const currentUser = useAuthStore.getState().currentUser?.name || 'System';
          const movementsToLog: Omit<StockMovement, 'id' | 'balanceAfter'>[] = [];

          const updated = current.map(a => {
              if (ids.includes(a.id)) {
                  // --- SMART MOVEMENT LOGGING FOR BATCH ---
                  // Deteksi pergerakan stok Keluar/Masuk Gudang
                  const isMovingOut = a.status === AssetStatus.IN_STORAGE && rawData.status && rawData.status !== AssetStatus.IN_STORAGE;
                  const isMovingIn = a.status !== AssetStatus.IN_STORAGE && rawData.status === AssetStatus.IN_STORAGE;
                  
                  if (isMovingOut || isMovingIn) {
                      const isMeasurement = a.currentBalance !== undefined;
                      const qtyToLog = isMeasurement ? (a.currentBalance || 0) : 1;
                      
                      movementsToLog.push({
                          assetName: a.name,
                          brand: a.brand,
                          date: new Date().toISOString(),
                          type: isMovingOut ? 'OUT_HANDOVER' : 'IN_RETURN',
                          quantity: qtyToLog,
                          // FIX: Gunakan referenceId yang dikirim dari Page (misal No Dokumen Handover)
                          referenceId: referenceId, 
                          actor: currentUser,
                          notes: isMeasurement 
                            ? `Batch Move (${isMovingOut ? 'Keluar' : 'Masuk'}): ${a.id} berisi ${qtyToLog}` 
                            : `Batch Move: ${a.id}`
                      });
                  }

                  const newLog: ActivityLogEntry = {
                      id: `log-batch-${Date.now()}-${Math.random()}`,
                      timestamp: new Date().toISOString(),
                      user: currentUser,
                      action: 'Batch Update',
                      details: `Status diubah menjadi: ${rawData.status || 'Updated'} (Ref: ${referenceId})`
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
          
          // Execute Movement Logs
          for (const mov of movementsToLog) {
              await get().recordMovement(mov);
          }
      },

      deleteAsset: async (id) => {
        const current = get().assets;
        const assetToDelete = current.find(a => a.id === id);
        const updated = current.filter(a => a.id !== id);
        await api.updateData('app_assets', updated);
        set({ assets: updated });

        if (assetToDelete && assetToDelete.status === 'Di Gudang') {
             const isMeasurement = assetToDelete.currentBalance !== undefined;
             const qtyToLog = isMeasurement ? (assetToDelete.currentBalance || 0) : 1;

             await get().recordMovement({
                 assetName: assetToDelete.name,
                 brand: assetToDelete.brand,
                 date: new Date().toISOString(),
                 type: 'OUT_ADJUSTMENT',
                 quantity: qtyToLog,
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
      
      checkAvailability: (itemName, brand, qtyNeeded, requestUnit, excludeRequestId) => {
          const assets = get().assets;
          const categories = get().categories;
          const requests = useRequestStore.getState().requests;
          
          let isMeasurement = false;
          let containerUnit = 'Unit';
          let baseUnit = 'Unit';
          
          for (const cat of categories) {
              for (const typ of cat.types) {
                  const model = typ.standardItems?.find(m => m.name === itemName && m.brand === brand);
                  if (model) {
                      if (model.bulkType === 'measurement') {
                          isMeasurement = true;
                          containerUnit = model.unitOfMeasure || 'Hasbal';
                          baseUnit = model.baseUnitOfMeasure || 'Meter';
                      } else {
                          containerUnit = model.unitOfMeasure || typ.unitOfMeasure || 'Unit';
                      }
                      break;
                  }
              }
              if (isMeasurement) break;
          }
          
          const isRequestingContainer = !requestUnit || requestUnit === containerUnit;
          
          // 1. Get All Physical Assets in Storage (All Rows)
          const allPhysicalAssets = assets.filter(a => 
              a.name === itemName && 
              a.brand === brand && 
              a.status === AssetStatus.IN_STORAGE
          );

          // 2. Filter Effective Assets based on Integrity (Full vs Partial)
          // Jika Request Container (Unit Fisik), kita hanya boleh menghitung aset yang MASIH UTUH.
          // Aset parsial (sisa potongan) tidak valid untuk diserahkan sebagai "1 Drum Utuh".
          let effectivePhysicalAssets = allPhysicalAssets;
          
          if (isMeasurement && isRequestingContainer) {
               effectivePhysicalAssets = allPhysicalAssets.filter(a => {
                    const current = a.currentBalance ?? 0;
                    const initial = a.initialBalance ?? 0;
                    // Gunakan toleransi kecil untuk float comparison
                    return current >= (initial - 0.0001);
               });
          }

          // Total Count untuk display UI (tetap tampilkan total baris agar user tau ada sisa)
          const totalPhysicalCount = allPhysicalAssets.length;
          const totalPhysicalContent = safeRound(allPhysicalAssets.reduce((sum, a) => sum + (a.currentBalance ?? 0), 0));

          // 3. Calculate Reservations from Pending Requests
          const activeRequests = requests.filter(r => 
              r.id !== excludeRequestId &&
              ![ItemStatus.COMPLETED, ItemStatus.REJECTED, ItemStatus.CANCELLED].includes(r.status)
          );

          let reservedCount = 0;
          let reservedContent = 0;

          activeRequests.forEach(req => {
              const matchingItems = req.items.filter(i => i.itemName === itemName && i.itemTypeBrand === brand);
              matchingItems.forEach(item => {
                  const status = req.itemStatuses?.[item.id];
                  if (status?.status === 'stock_allocated') {
                      const qty = status.approvedQuantity ?? item.quantity;
                      const itemUnit = item.unit || 'Unit';
                      
                      if (isMeasurement) {
                          if (itemUnit === containerUnit) {
                              reservedCount += qty; 
                          } else {
                              reservedContent += qty;
                          }
                      } else {
                          reservedCount += qty;
                      }
                  }
              });
          });
          
          reservedContent = safeRound(reservedContent);

          // 4. Calculate Available Count (Smart)
          // Berdasarkan effectivePhysicalAssets (yang sudah difilter integritasnya)
          // availableCount = Jumlah Aset Efektif - Reservasi Unit
          const availableCount = Math.max(0, effectivePhysicalAssets.length - reservedCount);
          
          // Sort Assets for Recommendation Logic
          // Strategi: 
          // - Jika Request Container: Prioritaskan FIFO (Masuk Pertama Keluar Pertama)
          // - Jika Request Eceran: Prioritaskan Aset Parsial (Habiskan sisa) baru Aset Utuh
          const sortedAssets = [...effectivePhysicalAssets].sort((a, b) => {
               if (isMeasurement && !isRequestingContainer) {
                    const aIsPartial = (a.currentBalance ?? 0) < (a.initialBalance ?? 0);
                    const bIsPartial = (b.currentBalance ?? 0) < (b.initialBalance ?? 0);
                    if (aIsPartial && !bIsPartial) return -1; // A (Partial) first
                    if (!aIsPartial && bIsPartial) return 1;  // B (Partial) first
               }
               // Default FIFO
               return new Date(a.registrationDate).getTime() - new Date(b.registrationDate).getTime();
          });

          // Exclude assets that are theoretically reserved by unit counts
          const assetsAvailableForAllocation = sortedAssets.slice(reservedCount);
          
          const rawAvailableContentSum = assetsAvailableForAllocation.reduce((sum, a) => sum + (a.currentBalance ?? 0), 0);
          const availableContent = Math.max(0, safeRound(rawAvailableContentSum - reservedContent));

          let isSufficient = false;
          let isFragmented = false;
          let recommendedSourceIds: string[] = [];

          if (isMeasurement) {
              if (isRequestingContainer) {
                  isSufficient = availableCount >= qtyNeeded;
                  recommendedSourceIds = assetsAvailableForAllocation.slice(0, qtyNeeded).map(a => a.id);
              } else {
                  isSufficient = availableContent >= qtyNeeded;
                  // Cek apakah ada 1 aset yang cukup untuk memenuhi seluruh kebutuhan eceran?
                  const perfectFit = assetsAvailableForAllocation.find(a => (a.currentBalance ?? 0) >= qtyNeeded);
                  
                  if (!perfectFit && isSufficient) {
                      isFragmented = true;
                  }
                  
                  if (perfectFit) {
                      recommendedSourceIds = [perfectFit.id];
                  } else {
                      let accumulated = 0;
                      for (const a of assetsAvailableForAllocation) {
                          if (accumulated >= qtyNeeded) break;
                          recommendedSourceIds.push(a.id);
                          accumulated += (a.currentBalance ?? 0);
                      }
                  }
              }
          } else {
              isSufficient = availableCount >= qtyNeeded;
              recommendedSourceIds = assetsAvailableForAllocation.slice(0, qtyNeeded).map(a => a.id);
          }

          return {
              physicalCount: totalPhysicalCount,
              totalContent: totalPhysicalContent,
              reservedCount,
              reservedContent,
              availableCount, // Ini adalah Available Container Count (sudah difilter Full Only jika measurement)
              availableContent,
              availableSmart: isMeasurement ? (isRequestingContainer ? availableCount : availableContent) : availableCount,
              isSufficient,
              isFragmented,
              isMeasurement,
              unitType: isRequestingContainer ? 'container' : 'base',
              containerUnit,
              baseUnit,
              recommendedSourceIds
          };
      },

      validateStockForRequest: (items, excludeRequestId) => {
          const errors: string[] = [];
          const self = get(); 
          items.forEach(item => {
              const check = self.checkAvailability(item.itemName, item.itemTypeBrand, item.quantity, item.unit, excludeRequestId);
              if (!check.isSufficient) {
                  const unitLabel = check.unitType === 'container' ? check.containerUnit : check.baseUnit;
                  const avail = check.availableSmart;
                  errors.push(`${item.itemName}: Stok tidak cukup (Butuh: ${item.quantity} ${unitLabel}, Ada: ${avail} ${unitLabel})`);
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
                       warnings.push(`Stok spesifik ${mat.materialAssetId} (${mat.itemName}) tidak valid/kosong.`);
                  }
              }
              
              if (targetAssets.length === 0) {
                  targetAssets = assets
                      .filter(a => a.name === mat.itemName && a.brand === mat.brand && a.status === AssetStatus.IN_STORAGE)
                      .sort((a, b) => {
                           // Prioritize Partial items for consumption to reduce fragmentation
                           if (isMeasurement) {
                                const aPartial = (a.currentBalance ?? 0) < (a.initialBalance ?? 0);
                                const bPartial = (b.currentBalance ?? 0) < (b.initialBalance ?? 0);
                                if (aPartial && !bPartial) return -1;
                                if (!aPartial && bPartial) return 1;
                           }
                           return new Date(a.registrationDate).getTime() - new Date(b.registrationDate).getTime();
                      });
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
                          // USE SAFE MATH HERE
                          const newBalance = safeRound(effectiveBalance - remainingNeed);
                          pendingUpdates[asset.id] = { ...pendingUpdates[asset.id], currentBalance: newBalance, status: AssetStatus.IN_STORAGE };
                          remainingNeed = 0;
                      } else {
                          pendingUpdates[asset.id] = { ...pendingUpdates[asset.id], currentBalance: 0, status: AssetStatus.CONSUMED };
                          // USE SAFE MATH HERE
                          remainingNeed = safeRound(remainingNeed - effectiveBalance);
                      }
                  }
                  if (remainingNeed > 0) warnings.push(`Stok fisik ${mat.itemName} kurang ${remainingNeed} ${mat.unit}.`);
              } else {
                  const qtyToConsume = Math.min(mat.quantity, targetAssets.length);
                  if (qtyToConsume > 0) {
                      const itemsToUpdate = targetAssets.slice(0, qtyToConsume);
                      for (const item of itemsToUpdate) {
                          pendingUpdates[item.id] = { ...pendingUpdates[item.id], status: AssetStatus.IN_USE, currentUser: context.customerId || null, location: context.location || 'Digunakan' };
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
             const updatedAssets = currentAssets.map(a => pendingUpdates[a.id] ? { ...a, ...pendingUpdates[a.id] } : a);
             await api.updateData('app_assets', updatedAssets);
             set({ assets: updatedAssets });
             for (const log of movementLogs) await get().recordMovement(log);
          }
          
          return { success: true, warnings };
      }
    }),
    {
        name: 'asset-storage',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({ categories: state.categories, thresholds: state.thresholds }),
    }
  )
);
