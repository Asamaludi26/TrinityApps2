
import { Request, Asset, User, AssetStatus, HandoverItem } from '../../../../types';
import { HandoverInitialState } from '../handoverTypes';
import { useAssetStore } from '../../../../stores/useAssetStore';

export const strategyFromNewRequest = (
    request: Request, 
    assets: Asset[], 
    users: User[]
): HandoverInitialState => {
    const recipientUser = users.find(u => u.name === request.requester);
    
    // Akses Logic Store (The "Brain")
    const { checkAvailability } = useAssetStore.getState();

    // 1. Ambil Aset Hasil Pengadaan (Procurement) - Prioritas Utama
    const procurementAssets = assets.filter(asset => 
        asset.woRoIntNumber === request.id && asset.status === AssetStatus.IN_STORAGE
    );

    // Set untuk melacak aset fisik yang sudah "di-booking" oleh logika ini
    const strategyUsedAssetIds = new Set<string>(procurementAssets.map(a => a.id));
    
    const stockAllocationItems: HandoverItem[] = [];
    
    // 2. Proses Item dari Stok (Stock Allocation)
    const stockItems = request.items.filter(item => {
        const status = request.itemStatuses?.[item.id];
        return status?.status === 'stock_allocated'; // Hanya yang disetujui dari stok
    });

    stockItems.forEach(item => {
        const approvedQty = request.itemStatuses?.[item.id]?.approvedQuantity ?? item.quantity;
        const requestedUnit = item.unit || 'Unit'; 

        // Cek ketersediaan & Tipe Unit via Store Logic
        // checkAvailability akan memberitahu kita apakah ini request 'Container' atau 'Base'
        const availability = checkAvailability(item.itemName, item.itemTypeBrand, approvedQty, requestedUnit);
        
        // Filter kandidat
        const validSourceIds = availability.recommendedSourceIds.filter(id => {
            if (availability.unitType === 'base') return true; 
            return !strategyUsedAssetIds.has(id);
        });
        
        // --- LOGIC KLASIFIKASI CERDAS (CONTAINER vs BASE) ---
        
        if (availability.isMeasurement && availability.unitType === 'base') {
            // KASUS A: REQUEST POTONGAN / ECERAN (CUT)
            // User minta "Meter", stok berupa "Hasbal"
            
            const suggestedAssetId = validSourceIds.length > 0 ? validSourceIds[0] : '';
            
            stockAllocationItems.push({
                id: Date.now() + Math.random(),
                assetId: suggestedAssetId, 
                itemName: item.itemName,
                itemTypeBrand: item.itemTypeBrand,
                // UX: Beri label jelas bahwa ini adalah pemotongan
                conditionNotes: `Potong: ${approvedQty} ${requestedUnit}`, 
                quantity: approvedQty, 
                checked: true,
                unit: requestedUnit // Penting: Unit 'Meter' akan memicu 'Cut Logic' di Form
            });

        } else {
            // KASUS B: REQUEST UNIT UTUH / KONTAINER (MOVE)
            // User minta "1 Hasbal" atau "1 Unit Router"
            
            const idsToTake = validSourceIds.slice(0, approvedQty);
            const targetUnit = availability.isMeasurement ? (availability.containerUnit || 'Hasbal') : requestedUnit;

            if (idsToTake.length > 0) {
                idsToTake.forEach(assetId => {
                    const asset = assets.find(a => a.id === assetId);
                    if (asset) {
                        strategyUsedAssetIds.add(assetId);
                        
                        stockAllocationItems.push({
                            id: Date.now() + Math.random(),
                            assetId: asset.id,
                            itemName: asset.name,
                            itemTypeBrand: asset.brand,
                            // UX: Label 'Full' untuk membedakan dengan sisa potongan
                            conditionNotes: availability.isMeasurement ? 'Unit Utuh (Full / Segel)' : asset.condition,
                            quantity: 1, // 1 Fisik
                            checked: true,
                            unit: targetUnit // Penting: Unit 'Hasbal' akan memicu 'Strict Container Logic' di Form
                        });
                    }
                });
            }

            // Handle Backorder (Jika stok fisik kurang)
            if (idsToTake.length < approvedQty) {
                const remaining = approvedQty - idsToTake.length;
                stockAllocationItems.push({
                    id: Date.now() + Math.random(),
                    assetId: '', 
                    itemName: item.itemName,
                    itemTypeBrand: item.itemTypeBrand,
                    conditionNotes: 'Stok Fisik Tidak Mencukupi',
                    quantity: remaining,
                    checked: false, 
                    unit: targetUnit
                });
            }
        }
    });

    // 3. Konversi Procurement Assets
    const procurementItems: HandoverItem[] = procurementAssets.map(asset => ({
        id: Date.now() + Math.random(),
        assetId: asset.id,
        itemName: asset.name,
        itemTypeBrand: asset.brand,
        conditionNotes: asset.condition,
        quantity: 1,
        checked: true,
        unit: 'Unit'
    }));

    const finalItems = [...procurementItems, ...stockAllocationItems];

    // Fallback Safety
    if (finalItems.length === 0) {
        const validRequestItems = request.items.filter(item => {
            const status = request.itemStatuses?.[item.id];
            return status?.status !== 'rejected';
        });

        validRequestItems.forEach(item => {
             const approvedQty = request.itemStatuses?.[item.id]?.approvedQuantity ?? item.quantity;
             finalItems.push({
                id: Date.now() + Math.random(),
                assetId: '', 
                itemName: item.itemName,
                itemTypeBrand: item.itemTypeBrand,
                conditionNotes: 'Menunggu Alokasi Manual',
                quantity: approvedQty,
                checked: true,
                unit: item.unit || 'Unit'
            });
        });
    }

    return {
        penerima: request.requester,
        divisionId: recipientUser?.divisionId?.toString() || '',
        woRoIntNumber: request.id,
        items: finalItems,
        notes: `Serah terima aset untuk Request #${request.id}.`,
        isLocked: false, 
        targetAssetStatus: AssetStatus.IN_USE 
    };
};
