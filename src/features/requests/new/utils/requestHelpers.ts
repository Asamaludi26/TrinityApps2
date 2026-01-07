
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
    const category = categories.find(c => 
      c.types.some(t => t.standardItems?.some(si => 
        si.name.toLowerCase() === item.name.toLowerCase() && 
        si.brand.toLowerCase() === item.brand.toLowerCase()
      ))
    );
    
    const type = category?.types.find(t => 
      t.standardItems?.some(si => 
        si.name.toLowerCase() === item.name.toLowerCase() && 
        si.brand.toLowerCase() === item.brand.toLowerCase()
      )
    );

    // 2. Hitung Stok Tersedia Menggunakan ATP Logic (Store)
    // Asumsi awal qty = 1 untuk pengecekan fragmentasi
    const stockInfo = checkAvailability(item.name, item.brand, 1);
    const stockCount = stockInfo.available;
        
    // 3. LOGIKA BARU: Gunakan ambang batas yang dikirim, atau fallback ke default
    const targetStock = item.threshold ?? DEFAULT_RESTOCK_TARGET;
    const neededQuantity = Math.max(1, targetStock - stockCount);

    // 4. Generate Note yang lebih informatif
    const note = stockCount === 0 
      ? `Restock: Stok Habis. Pengadaan ${neededQuantity} unit untuk mencapai target stok (${targetStock} unit).` 
      : `Restock: Stok Menipis (sisa ${stockCount} unit). Pengadaan ${neededQuantity} unit untuk mencapai target stok (${targetStock} unit).`;

    // 5. Construct Object Form
    return {
      id: Date.now() + idx,
      itemName: item.name,
      itemTypeBrand: item.brand,
      quantity: neededQuantity, // Kuantitas cerdas
      keterangan: note,
      tempCategoryId: category?.id.toString() || '',
      tempTypeId: type?.id.toString() || '',
      availableStock: stockCount,
      unit: type?.unitOfMeasure || 'Unit',
      stockDetails: {
          physical: stockInfo.physical,
          reserved: stockInfo.reserved,
          isFragmented: stockInfo.isFragmented
      }
    };
  });
};
