
import { Dismantle, User, HandoverItem, AssetStatus } from '../../../../types';
import { HandoverInitialState } from '../handoverTypes';

export const strategyFromDismantle = (
    dismantle: Dismantle,
    users: User[],
    currentUser: User
): HandoverInitialState => {
    // Teknisi menyerahkan ke Admin Gudang (User Login)
    
    return {
        penerima: currentUser.name, 
        divisionId: currentUser.divisionId?.toString() || '',
        woRoIntNumber: dismantle.docNumber,
        items: [{
            id: Date.now(),
            assetId: dismantle.assetId,
            itemName: dismantle.assetName,
            itemTypeBrand: '', 
            conditionNotes: dismantle.retrievedCondition,
            quantity: 1,
            checked: true
        }],
        notes: `Pengembalian aset dari dismantle pelanggan ${dismantle.customerName}.`,
        isLocked: true,
        targetAssetStatus: AssetStatus.IN_STORAGE // Aset MASUK ke gudang
    };
};
