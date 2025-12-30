
import { Request, Asset, User, AssetStatus, HandoverItem } from '../../../../types';
import { HandoverInitialState } from '../handoverTypes';

export const strategyFromNewRequest = (
    request: Request, 
    assets: Asset[], 
    users: User[]
): HandoverInitialState => {
    const recipientUser = users.find(u => u.name === request.requester);
    
    // Cari aset yang sudah diregistrasi dari request ini dan masih di gudang
    const registeredAssets = assets.filter(asset => 
        asset.woRoIntNumber === request.id && asset.status === AssetStatus.IN_STORAGE
    );

    let items: HandoverItem[] = [];

    if (registeredAssets.length > 0) {
        items = registeredAssets.map(asset => ({
            id: Date.now() + Math.random(),
            assetId: asset.id,
            itemName: asset.name,
            itemTypeBrand: asset.brand,
            conditionNotes: asset.condition,
            quantity: 1,
            checked: true
        }));
    } else {
        const validItems = request.items.filter(item => {
            const status = request.itemStatuses?.[item.id];
            return status?.status !== 'rejected';
        });

        items = validItems.map(item => {
            const approvedQty = request.itemStatuses?.[item.id]?.approvedQuantity ?? item.quantity;
            return {
                id: Date.now() + Math.random(),
                assetId: '', 
                itemName: item.itemName,
                itemTypeBrand: item.itemTypeBrand,
                conditionNotes: 'Baru (Dari Pengadaan)',
                quantity: approvedQty,
                checked: true
            };
        });
    }

    return {
        penerima: request.requester,
        divisionId: recipientUser?.divisionId?.toString() || '',
        woRoIntNumber: request.id,
        items,
        notes: 'Serah terima pengadaan aset baru.',
        targetAssetStatus: AssetStatus.IN_USE // Aset keluar ke user
    };
};
