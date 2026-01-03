
import { useMemo } from 'react';
import { useAssetStore } from '../../../stores/useAssetStore';
import { AssetStatus, Asset } from '../../../types';

export const useCustomerAssetLogic = () => {
    const assets = useAssetStore((state) => state.assets);
    const categories = useAssetStore((state) => state.categories);

    // 1. Get Assets Available for Installation (Devices)
    // Syarat: Status = IN_STORAGE, Kategori = isCustomerInstallable, Tracking = Individual
    const installableAssets = useMemo(() => {
        return assets.filter(asset => {
            if (asset.status !== AssetStatus.IN_STORAGE) return false;
            
            const category = categories.find(c => c.name === asset.category);
            if (!category?.isCustomerInstallable) return false;

            const type = category.types.find(t => t.name === asset.type);
            return type?.trackingMethod !== 'bulk'; // Exclude materials
        }).map(asset => ({
            value: asset.id,
            label: `${asset.name} (${asset.id}) - SN: ${asset.serialNumber || 'N/A'}`,
            original: asset
        }));
    }, [assets, categories]);

    // 2. Get Available Materials (Bulk Items)
    // Syarat: Kategori = isCustomerInstallable, Tracking = Bulk
    // UPDATE: Logic satuan diperbaiki untuk mendukung Measurement vs Count
    const materialOptions = useMemo(() => {
        const options: { value: string; label: string; unit: string; category: string }[] = [];
        const processedKeys = new Set<string>();

        categories.forEach(cat => {
            if (cat.isCustomerInstallable) {
                cat.types.forEach(type => {
                    // Cek apakah tipe ini adalah material/bulk
                    if (type.classification === 'material' || type.trackingMethod === 'bulk') {
                        (type.standardItems || []).forEach(item => {
                            const key = `${item.name}|${item.brand}`;
                            if (!processedKeys.has(key)) {
                                // LOGIC PENENTUAN SATUAN
                                // Jika tipe 'measurement' (Kabel), gunakan baseUnitOfMeasure (Meter).
                                // Jika tipe 'count' (Konektor), gunakan unitOfMeasure (Pcs).
                                let unit = 'Pcs';
                                
                                if (item.bulkType === 'measurement') {
                                    unit = item.baseUnitOfMeasure || type.unitOfMeasure || 'Meter';
                                } else {
                                    unit = item.unitOfMeasure || type.unitOfMeasure || 'Pcs';
                                }

                                options.push({
                                    value: key,
                                    label: `${item.name} - ${item.brand}`,
                                    unit: unit,
                                    category: cat.name
                                });
                                processedKeys.add(key);
                            }
                        });
                    }
                });
            }
        });
        return options;
    }, [categories]);

    // 3. Get Assets Owned by Specific Customer
    const getCustomerAssets = (customerId: string) => {
        return assets.filter(a => a.currentUser === customerId && a.status === AssetStatus.IN_USE);
    };

    // 4. Get Replacement Candidates (Smart Logic)
    // Mencari aset di gudang yang Tipe & Brand-nya SAMA dengan aset yang rusak/diganti
    const getReplacementOptions = (assetToReplaceId: string, currentSelections: string[] = []) => {
        const oldAsset = assets.find(a => a.id === assetToReplaceId);
        if (!oldAsset) return [];

        return assets.filter(a => 
            a.status === AssetStatus.IN_STORAGE &&
            a.name === oldAsset.name &&
            a.brand === oldAsset.brand &&
            a.id !== oldAsset.id &&
            !currentSelections.includes(a.id) // Exclude already selected replacements
        ).map(a => ({
            value: a.id,
            label: `${a.id} (SN: ${a.serialNumber || 'N/A'})`
        }));
    };

    return {
        assets, // Raw assets if needed
        categories,
        installableAssets,
        materialOptions,
        getCustomerAssets,
        getReplacementOptions
    };
};
