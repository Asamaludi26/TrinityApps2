
import { Asset, AssetCategory, AssetStatus } from '../../../../types';
import { useAssetStore } from '../../../../stores/useAssetStore'; // Import Store untuk logika ATP

// Tipe data untuk state item di dalam form
export interface RequestItemFormState {
  id: number;
  itemName: string;
  itemTypeBrand: string;
  quantity: number;
  keterangan: string;
  tempCategoryId: string;
  tempTypeId: string;
  availableStock: number;
  unit: string;
  // New: Detail stok untuk tooltip cerdas
  stockDetails?: {
      physical: number;
      reserved: number;
      isFragmented: boolean;
  };
}

// Target stok default jika ambang batas custom tidak diatur.
export const DEFAULT_RESTOCK_TARGET = 10;

/**
 * Mengubah data prefill (nama/brand) menjadi state form lengkap
 * dengan mencari Kategori ID, Tipe ID, dan menghitung stok tersedia.
 */
export const prepareInitialItems = (
  rawItems: { name: string; brand: string; currentStock?: number; threshold?: number; }[] | undefined,
  assets: Asset[],
  categories: AssetCategory[]
): RequestItemFormState[] | undefined => {
  if (!rawItems || rawItems.length === 0) return undefined;

  const { checkAvailability } = useAssetStore.getState(); // Akses logika ATP langsung

  return rawItems.map((item, idx) => {
    // 1. Cari Kategori dan Tipe berdasarkan Nama Item
    let category = categories.find(c => 
      c.types.some(t => t.standardItems?.some(si => 
        si.name.toLowerCase() === item.name.toLowerCase() && 
        si.brand.toLowerCase() === item.brand.toLowerCase()
      ))
    );
    
    let type = category?.types.find(t => 
      t.standardItems?.some(si => 
        si.name.toLowerCase() === item.name.toLowerCase() && 
        si.brand.toLowerCase() === item.brand.toLowerCase()
      )
    );

    // Get specific model to check bulk type
    const model = type?.standardItems?.find(m => m.name.toLowerCase() === item.name.toLowerCase() && m.brand.toLowerCase() === item.brand.toLowerCase());

    // 2. Tentukan Unit Default
    let unit = 'Unit';
    if (model?.bulkType === 'measurement') {
        unit = model.unitOfMeasure || 'Hasbal';
    } else {
        unit = type?.unitOfMeasure || 'Unit';
    }

    // 3. Hitung Stok Tersedia Menggunakan ATP Logic (Store) - Context Aware
    const stockInfo = checkAvailability(item.name, item.brand, 1, unit);
    const stockCount = stockInfo.availableSmart; 
    
    // 4. Kalkulasi Kebutuhan
    let targetStock = item.threshold ?? DEFAULT_RESTOCK_TARGET;
    // Jika restock measurement (Hasbal), threshold biasanya dalam unit fisik (e.g. 2 Drum).
    // Jadi perbandingan langsung aman.
    
    // Physical stock for calculation logic (always want physical units for ordering)
    const currentPhysical = stockInfo.physicalCount;
    const neededQuantity = Math.max(1, targetStock - currentPhysical);

    // 5. Generate Note yang lebih informatif
    const note = currentPhysical === 0 
      ? `Restock: Stok Habis. Pengadaan ${neededQuantity} ${unit} untuk mencapai target.` 
      : `Restock: Stok Menipis (sisa ${currentPhysical} ${unit}). Pengadaan ${neededQuantity} ${unit} untuk mencapai target.`;

    // 6. Construct Object Form
    return {
      id: Date.now() + idx,
      itemName: item.name,
      itemTypeBrand: item.brand,
      quantity: neededQuantity, 
      keterangan: note,
      tempCategoryId: category?.id.toString() || '',
      tempTypeId: type?.id.toString() || '',
      availableStock: stockCount, 
      unit: unit,
      stockDetails: {
          physical: stockInfo.physicalCount,
          reserved: stockInfo.reservedCount,
          isFragmented: stockInfo.isFragmented
      }
    };
  });
};
