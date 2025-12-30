
import { Asset, Request, LoanRequest, User, Installation, Dismantle, AssetStatus } from '../../../types';
import { HandoverInitialState } from './handoverTypes';

// Import Strategies
import { strategyFromNewRequest } from './strategies/NewRequestStrategy';
import { strategyFromLoanRequest } from './strategies/LoanStrategy';
import { strategyFromInstallation } from './strategies/InstallationStrategy';
import { strategyFromDismantle } from './strategies/DismantleStrategy';
import { strategyFromRepair, strategyFromSingleAsset } from './strategies/RepairStrategy';

// Re-export type for consumers
export type { HandoverInitialState };

/**
 * MAIN FACTORY: Router Logika
 * Memilih strategi yang tepat berdasarkan tipe data input.
 */
export const getHandoverInitialState = (
    prefillData: Asset | Request | LoanRequest | Installation | Dismantle | null,
    assets: Asset[],
    users: User[],
    currentUser: User
): HandoverInitialState | null => {
    if (!prefillData) return null;

    // 1. Cek Request Baru (Ada field 'order')
    if ('order' in prefillData) {
        return strategyFromNewRequest(prefillData as Request, assets, users);
    }
    
    // 2. Cek Request Pinjam (Ada field 'assignedAssetIds')
    if ('assignedAssetIds' in prefillData) {
        return strategyFromLoanRequest(prefillData as LoanRequest, assets, users);
    }

    // 3. Cek Instalasi (Ada field 'assetsInstalled')
    if ('assetsInstalled' in prefillData) {
        return strategyFromInstallation(prefillData as Installation, assets, users);
    }

    // 4. Cek Dismantle (Ada field 'dismantleDate')
    if ('dismantleDate' in prefillData) {
        return strategyFromDismantle(prefillData as Dismantle, users, currentUser);
    }

    // 5. Cek Single Asset / Repair
    if ('id' in prefillData && 'category' in prefillData) {
        const asset = prefillData as Asset;
        // Jika status aset sedang dalam perbaikan/selesai perbaikan, gunakan strategi repair
        if (asset.status === AssetStatus.UNDER_REPAIR || asset.status === AssetStatus.OUT_FOR_REPAIR) {
            return strategyFromRepair(asset);
        }
        return strategyFromSingleAsset(asset);
    }

    return null;
};
