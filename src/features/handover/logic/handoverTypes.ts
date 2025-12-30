
import { HandoverItem, AssetStatus } from '../../../types';

export interface HandoverInitialState {
    penerima: string;
    divisionId: string;
    woRoIntNumber: string;
    items: HandoverItem[];
    notes?: string;
    isLocked?: boolean;
    // Status target aset setelah handover selesai. 
    // Contoh: IN_USE (untuk Peminjaman/Request), IN_STORAGE (untuk Dismantle/Pengembalian)
    targetAssetStatus: AssetStatus; 
}
