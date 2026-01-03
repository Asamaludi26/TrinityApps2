
import { AssetCondition, Attachment } from '../../types';

export interface RegistrationFormData {
    assetName: string;
    // Backend membutuhkan ID untuk Foreign Key, bukan hanya string nama
    categoryId: string; 
    typeId: string;
    category: string; // Tetap disimpan untuk UI display / fallback
    type: string;     // Tetap disimpan untuk UI display / fallback
    
    brand: string;
    purchasePrice: number | null;
    vendor: string | null;
    poNumber: string | null;
    invoiceNumber: string | null;
    purchaseDate: string;
    registrationDate: string;
    recordedBy: string;
    warrantyEndDate: string | null;
    condition: AssetCondition;
    location: string | null;
    locationDetail: string | null;
    currentUser: string | null;
    notes: string | null;
    attachments: Attachment[];
    
    // UUID string lebih aman daripada number untuk ID sementara
    bulkItems: { id: string | number, serialNumber: string, macAddress: string }[];
    quantity: number | '';
    relatedRequestId: string | null;
}
