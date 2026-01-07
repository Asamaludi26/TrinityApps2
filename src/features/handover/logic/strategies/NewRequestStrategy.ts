
import { Request, Asset, User, AssetStatus, HandoverItem } from '../../../../types';
import { HandoverInitialState } from '../handoverTypes';

export const strategyFromNewRequest = (
    request: Request, 
    assets: Asset[], 
    users: User[]
): HandoverInitialState => {
    const recipientUser = users.find(u => u.name === request.requester);
    
    // 1. Ambil Aset Hasil Pengadaan (Procurement)
    // Aset ini sudah memiliki link woRoIntNumber ke request ini saat registrasi
    const procurementAssets = assets.filter(asset => 
        asset.woRoIntNumber === request.id && asset.status === AssetStatus.IN_STORAGE
    );

    // 2. Ambil Aset dari Stok (Stock Allocation)
    // Aset ini belum punya link, kita ambil dari gudang secara FIFO
    const stockAllocationAssets: Asset[] = [];
    
    // Identifikasi item yang disetujui dari stok
    const stockItems = request.items.filter(item => {
        const status = request.itemStatuses?.[item.id];
        return status?.status === 'stock_allocated';
    });

    // Loop setiap item stok dan cari kandidat aset fisik
    stockItems.forEach(item => {
        const approvedQty = request.itemStatuses?.[item.id]?.approvedQuantity ?? item.quantity;
        
        // Cari aset di gudang yang cocok Nama & Brand
        // Exclude aset yang sudah masuk di procurementAssets (biar ga duplikat)
        const candidates = assets.filter(a => 
            a.name === item.itemName &&
            a.brand === item.itemTypeBrand &&
            a.status === AssetStatus.IN_STORAGE &&
            !procurementAssets.some(pa => pa.id === a.id) &&
            !stockAllocationAssets.some(sa => sa.id === a.id) // Prevent double pick in loop
        );

        // Sort FIFO (Oldest first)
        candidates.sort((a, b) => new Date(a.registrationDate).getTime() - new Date(b.registrationDate).getTime());

        // Ambil sejumlah yang dibutuhkan
        // Catatan: Untuk Measurement asset (kabel), ini mengambil jumlah Drum/Roll, bukan Meter.
        // Logika pemotongan meteran terjadi saat form disubmit nanti (jika ada pemakaian).
        // Untuk Handover utuh, kita serahkan unit fisiknya.
        const picked = candidates.slice(0, approvedQty);
        stockAllocationAssets.push(...picked);
    });

    // 3. Gabungkan Semua Aset
    const allReadyAssets = [...procurementAssets, ...stockAllocationAssets];
    let handoverItems: HandoverItem[] = [];

    if (allReadyAssets.length > 0) {
        // Skenario A: Aset Fisik Ditemukan (Baik stok maupun pengadaan)
        handoverItems = allReadyAssets.map(asset => ({
            id: Date.now() + Math.random(),
            assetId: asset.id,
            itemName: asset.name,
            itemTypeBrand: asset.brand,
            conditionNotes: asset.condition,
            quantity: 1, // Handover selalu per unit fisik (kecuali material bulk yg consumption)
            checked: true
        }));
    } else {
        // Skenario B: Fallback (Jika data aset fisik belum sinkron/tidak ditemukan)
        // Menampilkan baris item request agar user bisa pilih manual
        const validItems = request.items.filter(item => {
            const status = request.itemStatuses?.[item.id];
            return status?.status !== 'rejected';
        });

        handoverItems = validItems.map(item => {
            const approvedQty = request.itemStatuses?.[item.id]?.approvedQuantity ?? item.quantity;
            return {
                id: Date.now() + Math.random(),
                assetId: '', 
                itemName: item.itemName,
                itemTypeBrand: item.itemTypeBrand,
                conditionNotes: 'Baik',
                quantity: approvedQty,
                checked: true
            };
        });
    }

    return {
        penerima: request.requester,
        divisionId: recipientUser?.divisionId?.toString() || '',
        woRoIntNumber: request.id,
        items: handoverItems,
        notes: `Serah terima aset untuk Request #${request.id} (${procurementAssets.length} Pengadaan, ${stockAllocationAssets.length} Stok).`,
        // Kita kunci item selection jika sistem berhasil menemukan asetnya secara otomatis
        isLocked: allReadyAssets.length > 0, 
        targetAssetStatus: AssetStatus.IN_USE 
    };
};
