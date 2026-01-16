
import { useMemo } from 'react';
import { Asset, AssetStatus } from '../../../types';

export type StockItem = {
    name: string;
    brand: string;
    category: string;
    count: number;
    threshold: number; // Menambahkan threshold ke dalam tipe
};

const LOW_STOCK_DEFAULT = 5;

export const useStockAnalysis = (assets: Asset[], thresholds: Record<string, number>) => {
    return useMemo(() => {
        const stockMap = new Map<string, Omit<StockItem, 'threshold'>>();

        // 1. Aggregate Stock Counts
        assets.forEach(asset => {
            // LOGIC FIX: Abaikan aset pecahan (Potongan) dari perhitungan alert stok
            // Kita hanya ingin memantau stok Kontainer Utama (Gudang)
            if (asset.id.includes('-PART-') || asset.name.includes('(Potongan)')) {
                return;
            }

            const key = `${asset.name}|${asset.brand}`;
            
            if (!stockMap.has(key)) {
                stockMap.set(key, { 
                    name: asset.name, 
                    brand: asset.brand, 
                    category: asset.category, 
                    count: 0 
                });
            }
            
            if (asset.status === AssetStatus.IN_STORAGE) {
                stockMap.get(key)!.count++;
            }
        });

        const allItems = Array.from(stockMap.values());
        
        // 2. Separate Logic with Dynamic Thresholds & include threshold in result
        const criticalItems: StockItem[] = allItems
            .filter(item => item.count === 0)
            .map(item => {
                const key = `${item.name}|${item.brand}`;
                return { ...item, threshold: thresholds[key] ?? LOW_STOCK_DEFAULT };
            });
        
        const lowItems: StockItem[] = allItems
            .filter(item => {
                const key = `${item.name}|${item.brand}`;
                const threshold = thresholds[key] ?? LOW_STOCK_DEFAULT;
                return item.count > 0 && item.count <= threshold;
            })
            .map(item => {
                const key = `${item.name}|${item.brand}`;
                return { ...item, threshold: thresholds[key] ?? LOW_STOCK_DEFAULT };
            });

        return { 
            criticalItems, 
            lowItems,
            totalCritical: criticalItems.length,
            totalLow: lowItems.length
        };
    }, [assets, thresholds]);
};
