
import { Request, Asset, User, AssetStatus, HandoverItem } from '../../../../types';
import { HandoverInitialState } from '../handoverTypes';

// Helper untuk generate ID unik sementara
const genId = () => Date.now() + Math.random();

export const strategyFromNewRequest = (
    request: Request, 
    assets: Asset[], 
    users: User[]
): HandoverInitialState => {
    const recipientUser = users.find(u => u.name === request.requester);
    
    // 1. Identifikasi Aset Baru (Hasil Pengadaan)
    const newProcuredAssets = assets.filter(asset => 
        (asset.woRoIntNumber === request.id || asset.poNumber === request.id) && 
        asset.status === AssetStatus.IN_STORAGE
    );

    const handoverItems: HandoverItem[] = [];
    const usedAssetIds = new Set<string>();

    // 2. Iterasi setiap item dalam Request
    request.items.forEach(reqItem => {
        const itemStatus = request.itemStatuses?.[reqItem.id];
        
        if (itemStatus?.status === 'rejected') return;

        const targetQty = itemStatus?.approvedQuantity ?? reqItem.quantity;
        const requestedUnit = reqItem.unit || 'Unit';

        // 3. Cari Aset Baru yang Cocok
        const matchingNewAssets = newProcuredAssets.filter(a => 
            a.name.toLowerCase() === reqItem.itemName.toLowerCase() && 
            a.brand.toLowerCase() === reqItem.itemTypeBrand.toLowerCase() &&
            !usedAssetIds.has(a.id)
        );

        // --- DETEKSI TIPE ---
        const sampleAsset = matchingNewAssets.length > 0 ? matchingNewAssets[0] : null;
        const referenceAsset = sampleAsset || assets.find(a => a.name === reqItem.itemName && a.brand === reqItem.itemTypeBrand);
        const isMeasurement = referenceAsset ? (referenceAsset.initialBalance !== undefined && referenceAsset.initialBalance > 0) : false;

        let fulfilledQty = 0;

        // 4. Masukkan Aset Baru (Procurement Result)
        matchingNewAssets.forEach(asset => {
            let itemContribution = 0;

            if (isMeasurement) {
                // LOGIKA MEASUREMENT:
                // Kita gunakan unit fisik (Container) untuk aset baru.
                // Misal: Kabel. Unitnya 'Hasbal' atau 'Drum' (bukan 'Hasbal (Utuh)' agar match value dropdown)
                const balance = asset.currentBalance ?? asset.initialBalance ?? 0;
                itemContribution = balance;
                
                // Coba deteksi nama unit container dari master data jika mungkin, 
                // tapi fallback ke 'Hasbal' atau 'Drum' sederhana jika tidak ada info.
                // Disini kita hardcode unit umum atau ambil dari requestedUnit jika cocok.
                const containerUnit = 'Hasbal'; // Default safe, nanti akan dicocokkan di Form UI

                handoverItems.push({
                    id: genId(),
                    assetId: asset.id,
                    itemName: asset.name,
                    itemTypeBrand: asset.brand,
                    conditionNotes: 'Baru (Pengadaan)',
                    quantity: 1, // 1 Unit Fisik
                    unit: containerUnit, // CLEAN UNIT NAME
                    checked: true,
                    isLocked: true
                });

            } else {
                // LOGIKA UNIT BIASA
                itemContribution = 1;
                
                handoverItems.push({
                    id: genId(),
                    assetId: asset.id,
                    itemName: asset.name,
                    itemTypeBrand: asset.brand,
                    conditionNotes: 'Baru (Pengadaan)',
                    quantity: 1,
                    unit: requestedUnit,
                    checked: true,
                    isLocked: true
                });
            }

            fulfilledQty += itemContribution;
            usedAssetIds.add(asset.id);
        });

        // 5. Hitung Kekurangan (Shortfall)
        let remainingQty = targetQty - fulfilledQty;
        if (remainingQty < 0.0001) remainingQty = 0;

        if (remainingQty > 0) {
            // Shortfall items
            if (isMeasurement) {
                handoverItems.push({
                    id: genId(),
                    assetId: '',
                    itemName: reqItem.itemName,
                    itemTypeBrand: reqItem.itemTypeBrand,
                    conditionNotes: 'Ambil dari Stok Gudang',
                    quantity: remainingQty,
                    unit: requestedUnit, // Meter (CLEAN NAME)
                    checked: true,
                    isLocked: false
                });
            } else {
                for (let i = 0; i < remainingQty; i++) {
                    handoverItems.push({
                        id: genId() + i,
                        assetId: '',
                        itemName: reqItem.itemName,
                        itemTypeBrand: reqItem.itemTypeBrand,
                        conditionNotes: 'Ambil dari Stok Gudang',
                        quantity: 1,
                        unit: requestedUnit,
                        checked: true,
                        isLocked: false
                    });
                }
            }
        }
    });

    return {
        penerima: request.requester,
        divisionId: recipientUser?.divisionId?.toString() || '',
        woRoIntNumber: request.id,
        items: handoverItems,
        notes: `Serah terima aset untuk Request #${request.id}.`,
        isLocked: false, 
        targetAssetStatus: AssetStatus.IN_USE 
    };
};
