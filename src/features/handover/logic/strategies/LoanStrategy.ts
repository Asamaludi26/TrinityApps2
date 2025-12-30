
import { LoanRequest, Asset, User, HandoverItem, AssetStatus } from '../../../../types';
import { HandoverInitialState } from '../handoverTypes';

export const strategyFromLoanRequest = (
    loanRequest: LoanRequest, 
    assets: Asset[], 
    users: User[]
): HandoverInitialState => {
    const recipientUser = users.find(u => u.name === loanRequest.requester);
    let items: HandoverItem[] = [];

    if (loanRequest.assignedAssetIds) {
        const assignedAssetIdsFlat = Object.values(loanRequest.assignedAssetIds).flat();
        const assignedAssets = assets.filter(asset => assignedAssetIdsFlat.includes(asset.id));
        
        items = assignedAssets.map(asset => ({
            id: Date.now() + Math.random(),
            assetId: asset.id,
            itemName: asset.name,
            itemTypeBrand: asset.brand,
            conditionNotes: asset.condition || 'Baik',
            quantity: 1,
            checked: true
        }));
    } else {
        items = loanRequest.items.map(item => ({
            id: Date.now() + Math.random(),
            assetId: '',
            itemName: item.itemName,
            itemTypeBrand: item.brand,
            conditionNotes: 'Kondisi baik',
            quantity: item.quantity,
            checked: true
        }));
    }

    return {
        penerima: loanRequest.requester,
        divisionId: recipientUser?.divisionId?.toString() || '',
        woRoIntNumber: loanRequest.id,
        items,
        notes: `Peminjaman aset sesuai request ${loanRequest.id}.`,
        isLocked: true,
        targetAssetStatus: AssetStatus.IN_USE // Aset keluar dipinjam
    };
};
