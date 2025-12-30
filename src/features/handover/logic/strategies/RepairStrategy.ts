
import { Asset, HandoverItem, AssetStatus } from '../../../../types';
import { HandoverInitialState } from '../handoverTypes';

export const strategyFromRepair = (
    asset: Asset,
): HandoverInitialState => {
    return {
        penerima: asset.currentUser || '',
        divisionId: '',
        woRoIntNumber: `REPAIR-${asset.id}`,
        items: [{
            id: Date.now(),
            assetId: asset.id,
            itemName: asset.name,
            itemTypeBrand: asset.brand,
            conditionNotes: 'Selesai Perbaikan',
            quantity: 1,
            checked: true
        }],
        notes: 'Pengembalian aset setelah perbaikan/maintenance.',
        targetAssetStatus: AssetStatus.IN_USE // Aset dikembalikan ke user
    };
};

export const strategyFromSingleAsset = (
    asset: Asset
): HandoverInitialState => {
    return {
        penerima: '',
        divisionId: '',
        woRoIntNumber: '',
        items: [{
            id: Date.now(),
            assetId: asset.id,
            itemName: asset.name,
            itemTypeBrand: asset.brand,
            conditionNotes: asset.condition,
            quantity: 1,
            checked: true,
        }],
        targetAssetStatus: AssetStatus.IN_USE // Default manual handover adalah keluar
    };
};
