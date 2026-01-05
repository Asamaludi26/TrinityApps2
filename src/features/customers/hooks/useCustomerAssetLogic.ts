
import { useMemo, useCallback } from 'react';
import { useAssetStore } from '../../../stores/useAssetStore';
import { useAuthStore } from '../../../stores/useAuthStore'; // NEW: Need auth to check custody
import { AssetStatus, Asset } from '../../../types';

export const useCustomerAssetLogic = () => {
    const assets = useAssetStore((state) => state.assets);
    const categories = useAssetStore((state) => state.categories);
    const currentUser = useAuthStore((state) => state.currentUser); // Get current technician

    // 1. Get Assets Available for Installation (Devices)
    // Syarat REVISI: 
    // - Status = IN_STORAGE (Ambil dari gudang) 
    // - ATAU Status = IN_CUSTODY (Dipegang Teknisi yang sedang login)
    // - Kategori = isCustomerInstallable
    // - Tracking = Individual
    const installableAssets = useMemo(() => {
        return assets.filter(asset => {
            // Check Eligibility Status
            const isAvailableInStorage = asset.status === AssetStatus.IN_STORAGE;
            const isHeldByTechnician = asset.status === AssetStatus.IN_CUSTODY && asset.currentUser === currentUser?.name;
            
            if (!isAvailableInStorage && !isHeldByTechnician) return false;
            
            const category = categories.find(c => c.name === asset.category);
            if (!category?.isCustomerInstallable) return false;

            const type = category.types.find(t => t.name === asset.type);
            return type?.trackingMethod !== 'bulk'; // Exclude materials
        }).map(asset => ({
            value: asset.id,
            // Enhance Label to show source
            label: `${asset.name} (${asset.id}) ${asset.status === AssetStatus.IN_CUSTODY ? '[Pegangan Anda]' : ''}`,
            original: asset
        }));
    }, [assets, categories, currentUser]);

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
    // Wrapped in useCallback to prevent infinite useEffect loops in consumers
    const getCustomerAssets = useCallback((customerId: string) => {
        return assets.filter(a => a.currentUser === customerId && a.status === AssetStatus.IN_USE);
    }, [assets]);

    // 4. Get Replacement Candidates (Smart Logic)
    // Mencari aset di gudang ATAU dipegang teknisi (Custody) yang Tipe & Brand-nya SAMA
    const getReplacementOptions = useCallback((assetToReplaceId: string, currentSelections: string[] = []) => {
        const oldAsset = assets.find(a => a.id === assetToReplaceId);
        if (!oldAsset) return [];

        return assets.filter(a => 
            (a.status === AssetStatus.IN_STORAGE || (a.status === AssetStatus.IN_CUSTODY && a.currentUser === currentUser?.name)) &&
            a.name === oldAsset.name &&
            a.brand === oldAsset.brand &&
            a.id !== oldAsset.id &&
            !currentSelections.includes(a.id) // Exclude already selected replacements
        ).map(a => ({
            value: a.id,
            label: `${a.id} ${a.status === AssetStatus.IN_CUSTODY ? '[Pegangan Anda]' : ''} (SN: ${a.serialNumber || 'N/A'})`
        }));
    }, [assets, currentUser]);

    return {
        assets, // Raw assets if needed
        categories,
        installableAssets,
        materialOptions,
        getCustomerAssets,
        getReplacementOptions
    };
};
