
import { Installation, Asset, User, HandoverItem, AssetStatus } from '../../../../types';
import { HandoverInitialState } from '../handoverTypes';

export const strategyFromInstallation = (
    installation: Installation,
    assets: Asset[],
    users: User[]
): HandoverInitialState => {
    const technician = users.find(u => u.name === installation.technician);
    
    const items: HandoverItem[] = installation.assetsInstalled.map(instAsset => {
        const asset = assets.find(a => a.id === instAsset.assetId);
        return {
            id: Date.now() + Math.random(),
            assetId: instAsset.assetId,
            itemName: instAsset.assetName,
            itemTypeBrand: asset?.brand || '',
            conditionNotes: asset?.condition || 'Baik',
            quantity: 1,
            checked: true
        };
    });

    if (installation.materialsUsed) {
        installation.materialsUsed.forEach(mat => {
            items.push({
                id: Date.now() + Math.random(),
                assetId: mat.materialAssetId, 
                itemName: mat.itemName,
                itemTypeBrand: mat.brand,
                conditionNotes: 'Material Instalasi',
                quantity: mat.quantity,
                checked: true
            });
        });
    }

    return {
        penerima: installation.technician,
        divisionId: technician?.divisionId?.toString() || '',
        woRoIntNumber: installation.docNumber,
        items,
        notes: `Serah terima barang untuk instalasi pelanggan ${installation.customerName}.`,
        isLocked: false,
        targetAssetStatus: AssetStatus.IN_USE // Barang keluar dibawa teknisi
    };
};
