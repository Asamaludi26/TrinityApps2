
export type Page = 
  | 'dashboard' 
  | 'request' 
  | 'request-pinjam' 
  | 'registration' 
  | 'handover' 
  | 'stock' 
  | 'repair' 
  | 'return-form' 
  | 'return-detail'
  | 'customers' 
  | 'customer-new' 
  | 'customer-edit' 
  | 'customer-installation-form' 
  | 'customer-maintenance-form' 
  | 'customer-dismantle' 
  | 'customer-detail'
  | 'pengaturan-pengguna' 
  | 'user-form' 
  | 'division-form' 
  | 'user-detail' 
  | 'division-detail'
  | 'pengaturan-akun' 
  | 'kategori';

export type UserRole = 'Super Admin' | 'Admin Logistik' | 'Admin Purchase' | 'Leader' | 'Staff';

export type Permission = 
    | 'dashboard:view' 
    | 'reports:view' 
    | 'data:export'
    | 'system:audit-log'
    | 'requests:view:own' 
    | 'requests:view:all' 
    | 'requests:create' 
    | 'requests:create:urgent' 
    | 'requests:approve:logistic' 
    | 'requests:approve:purchase' 
    | 'requests:approve:final' 
    | 'requests:cancel:own' 
    | 'requests:delete'
    | 'loan-requests:view:own' 
    | 'loan-requests:view:all' 
    | 'loan-requests:create' 
    | 'loan-requests:approve' 
    | 'loan-requests:return'
    | 'assets:view' 
    | 'assets:view:division'
    | 'assets:view-price'
    | 'assets:create' 
    | 'assets:edit' 
    | 'assets:delete' 
    | 'assets:handover' 
    | 'handovers:view'
    | 'assets:dismantle' 
    | 'dismantles:view'
    | 'assets:install' 
    | 'installations:view'
    | 'maintenances:create' 
    | 'maintenances:view'
    | 'assets:repair:report' 
    | 'assets:repair:manage'
    | 'stock:view' 
    | 'stock:manage'
    | 'customers:view' 
    | 'customers:create' 
    | 'customers:edit' 
    | 'customers:delete'
    | 'users:view' 
    | 'users:create' 
    | 'users:edit' 
    | 'users:delete' 
    | 'users:reset-password' 
    | 'users:manage-permissions'
    | 'divisions:manage' 
    | 'categories:manage' 
    | 'account:manage';

export interface User {
    id: number;
    name: string;
    email: string;
    role: UserRole;
    divisionId: number | null;
    permissions: Permission[];
    passwordResetRequested?: boolean; // New Flag
    passwordResetRequestDate?: string; // New Flag
}

export interface LoginResponse {
    token: string;
    user: User;
}

export enum AssetStatus {
  IN_STORAGE = 'Di Gudang',
  IN_USE = 'Digunakan',
  IN_CUSTODY = 'Dipegang (Custody)', // New Status
  UNDER_REPAIR = 'Dalam Perbaikan',
  OUT_FOR_REPAIR = 'Keluar (Service)',
  DAMAGED = 'Rusak',
  DECOMMISSIONED = 'Diberhentikan',
  AWAITING_RETURN = 'Menunggu Pengembalian',
  CONSUMED = 'Habis Terpakai' // New Status for empty measurement items
}

export enum AssetCondition {
  BRAND_NEW = 'Baru',
  GOOD = 'Baik',
  USED_OKAY = 'Bekas Layak Pakai',
  MINOR_DAMAGE = 'Rusak Ringan',
  MAJOR_DAMAGE = 'Rusak Berat',
  FOR_PARTS = 'Kanibal'
}

export enum ItemStatus {
  PENDING = 'Menunggu',
  LOGISTIC_APPROVED = 'Disetujui Logistik',
  AWAITING_CEO_APPROVAL = 'Menunggu CEO',
  APPROVED = 'Disetujui',
  PURCHASING = 'Proses Pembelian',
  IN_DELIVERY = 'Dalam Pengiriman',
  ARRIVED = 'Tiba',
  COMPLETED = 'Selesai',
  REJECTED = 'Ditolak',
  CANCELLED = 'Dibatalkan',
  AWAITING_HANDOVER = 'Siap Serah Terima',
  IN_PROGRESS = 'Dalam Proses'
}

export enum LoanRequestStatus {
  PENDING = 'Menunggu Persetujuan',
  APPROVED = 'Disetujui',
  ON_LOAN = 'Dipinjam',
  RETURNED = 'Dikembalikan',
  REJECTED = 'Ditolak',
  OVERDUE = 'Terlambat',
  AWAITING_RETURN = 'Menunggu Pengembalian'
}

export enum AssetReturnStatus {
  PENDING_APPROVAL = 'Menunggu Verifikasi',
  APPROVED = 'Disetujui Sebagian', // Modified for clarity
  COMPLETED = 'Selesai Diverifikasi',
  REJECTED = 'Ditolak'
}

export enum CustomerStatus {
  ACTIVE = 'Active',
  INACTIVE = 'Inactive',
  SUSPENDED = 'Suspended'
}

export interface Attachment {
    id: number;
    name: string;
    url: string;
    type: 'image' | 'pdf' | 'other';
}

export interface ActivityLogEntry {
    id: string | number;
    timestamp: string;
    user: string;
    action: string;
    details: string;
    referenceId?: string;
}

export interface Activity {
    id: number;
    author: string;
    timestamp: string;
    type: 'comment' | 'status_change' | 'revision' | 'system';
    parentId?: number;
    payload: {
        text?: string;
        revisions?: Array<{
            itemName: string;
            originalQuantity: number;
            approvedQuantity: number;
            reason: string;
        }>;
    };
}

export interface Asset {
    id: string;
    name: string;
    category: string;
    type: string;
    brand: string;
    serialNumber?: string | null;
    macAddress?: string | null;
    purchasePrice?: number | null;
    vendor?: string | null;
    poNumber?: string | null;
    invoiceNumber?: string | null;
    purchaseDate?: string | null;
    warrantyEndDate?: string | null;
    registrationDate: string;
    recordedBy: string;
    status: AssetStatus | string;
    condition: AssetCondition;
    location?: string | null;
    locationDetail?: string | null;
    currentUser?: string | null;
    notes?: string | null;
    attachments: Attachment[];
    activityLog: ActivityLogEntry[];
    woRoIntNumber?: string | null;
    isDismantled?: boolean;
    dismantleInfo?: any;
    lastModifiedDate?: string;
    lastModifiedBy?: string;
    
    // NEW: Fields for Measurement Tracking
    initialBalance?: number; // Total awal (misal: 1000m)
    currentBalance?: number; // Sisa saat ini (misal: 850m)
}

export type ItemClassification = 'asset' | 'material';
export type TrackingMethod = 'individual' | 'bulk';
export type BulkTrackingMode = 'count' | 'measurement'; 

export interface StandardItem {
    id: number;
    name: string;
    brand: string;
    // MOVED HERE: Define behavior for bulk items at model level
    bulkType?: BulkTrackingMode; 
    unitOfMeasure?: string;
    baseUnitOfMeasure?: string;
    quantityPerUnit?: number;
}

export interface AssetType {
    id: number;
    name: string;
    classification?: ItemClassification;
    trackingMethod?: TrackingMethod;
    unitOfMeasure?: string;
    // Removed specific bulk configs from here
    standardItems?: StandardItem[];
}

export interface AssetCategory {
    id: number;
    name: string;
    types: AssetType[];
    associatedDivisions: number[];
    isCustomerInstallable?: boolean;
}

export interface Division {
    id: number;
    name: string;
    }

export interface InstalledMaterial {
    itemName: string;
    brand: string;
    quantity: number;
    unit: string;
    installationDate: string;
    materialAssetId?: string;
}

export interface Customer {
    id: string;
    name: string;
    address: string;
    phone: string;
    email: string;
    status: CustomerStatus;
    installationDate: string;
    servicePackage: string;
    installedMaterials?: InstalledMaterial[];
    activityLog?: ActivityLogEntry[];
}

export type OrderType = 'Regular Stock' | 'Urgent' | 'Project Based';

export interface OrderDetails {
    type: OrderType;
    justification?: string;
    project?: string;
}

export interface PurchaseDetails {
    purchasePrice: number;
    vendor: string;
    poNumber: string;
    invoiceNumber: string;
    purchaseDate: string;
    warrantyEndDate?: string | null;
    filledBy: string;
    fillDate: string;
}

export interface RequestItem {
    id: number;
    itemName: string;
    itemTypeBrand: string;
    quantity: number;
    keterangan: string;
    // Optional fields for form state
    tempCategoryId?: string;
    tempTypeId?: string;
    availableStock?: number;
    unit?: string;
    categoryId?: string;
    typeId?: string;
}

export interface Request {
    id: string;
    docNumber?: string;
    requester: string;
    division: string;
    requestDate: string;
    status: ItemStatus;
    order: OrderDetails;
    items: RequestItem[];
    totalValue?: number;
    
    logisticApprover?: string;
    logisticApprovalDate?: string;
    finalApprover?: string;
    finalApprovalDate?: string;
    
    rejectedBy?: string;
    rejectedByDivision?: string;
    rejectionDate?: string;
    rejectionReason?: string;

    itemStatuses?: Record<number, { 
        status: 'approved' | 'rejected' | 'partial' | 'stock_allocated' | 'procurement_needed'; 
        reason?: string; 
        approvedQuantity?: number; 
    }>;
    
    purchaseDetails?: Record<number, PurchaseDetails>;
    
    progressUpdateRequest?: {
        requestedBy: string;
        requestDate: string;
        isAcknowledged: boolean;
    };
    
    isPrioritizedByCEO?: boolean;
    ceoDispositionDate?: string;
    ceoFollowUpSent?: boolean;
    lastFollowUpAt?: string;

    actualShipmentDate?: string;
    arrivalDate?: string;
    completionDate?: string;
    completedBy?: string;
    
    isRegistered?: boolean;
    partiallyRegisteredItems?: Record<number, number>;
    
    activityLog?: Activity[];
}

export interface LoanItem {
    id: number;
    itemName: string;
    brand: string;
    quantity: number;
    keterangan: string;
    returnDate: string | null;
}

export interface LoanRequest {
    id: string;
    requester: string;
    division: string;
    requestDate: string;
    status: LoanRequestStatus;
    items: LoanItem[];
    notes?: string;
    
    approver?: string;
    approvalDate?: string;
    rejectionReason?: string;
    
    assignedAssetIds?: Record<number, string[]>;
    returnedAssetIds?: string[];
    actualReturnDate?: string;
    handoverId?: string;
    itemStatuses?: Record<number, { 
        status: 'approved' | 'rejected' | 'partial'; 
        reason?: string; 
        approvedQuantity?: number; 
    }>;
}

// --- REFACTORED RETURN TYPES ---

export interface AssetReturnItem {
    assetId: string;
    assetName: string;
    returnedCondition: AssetCondition;
    notes?: string;
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
    verificationNotes?: string;
}

export interface AssetReturn {
    id: string; // Document ID
    docNumber: string;
    returnDate: string;
    loanRequestId: string;
    returnedBy: string;
    
    items: AssetReturnItem[]; // Array of items in this return doc
    
    status: AssetReturnStatus; // Document status
    
    // Approval/Verification fields
    verifiedBy?: string;
    verificationDate?: string;
    
    // Legacy fields kept optional for backward compat during migration if needed
    // receivedBy?: string; 
    // approvedBy?: string;
    // approvalDate?: string;
}

export interface HandoverItem {
    id: number;
    assetId?: string;
    itemName: string;
    itemTypeBrand: string;
    conditionNotes: string;
    quantity: number;
    checked: boolean;
}

export interface Handover {
    id: string;
    docNumber: string;
    handoverDate: string;
    menyerahkan: string;
    penerima: string;
    mengetahui: string;
    woRoIntNumber?: string;
    items: HandoverItem[];
    status: ItemStatus;
}

export interface Dismantle {
    id: string;
    docNumber: string;
    requestNumber?: string;
    assetId: string;
    assetName: string;
    dismantleDate: string;
    technician: string;
    customerName: string;
    customerId: string;
    customerAddress: string;
    retrievedCondition: AssetCondition;
    notes: string | null;
    acknowledger: string | null;
    status: ItemStatus;
    attachments?: Attachment[];
}

export interface InstallationAsset {
    assetId: string;
    assetName: string;
    serialNumber?: string;
}

export interface InstallationMaterial {
    materialAssetId?: string;
    itemName: string;
    brand: string;
    quantity: number;
    unit: string;
}

export interface Installation {
    id: string;
    docNumber: string;
    requestNumber?: string;
    installationDate: string;
    technician: string;
    customerId: string;
    customerName: string;
    assetsInstalled: InstallationAsset[];
    materialsUsed?: InstallationMaterial[];
    notes: string;
    status: ItemStatus;
    acknowledger?: string | null;
    createdBy?: string;
}

export interface MaintenanceReplacement {
    oldAssetId: string;
    newAssetId: string;
    retrievedAssetCondition: AssetCondition;
}

export interface MaintenanceMaterial {
    materialAssetId?: string;
    itemName: string;
    brand: string;
    quantity: number;
    unit: string;
}

export interface MaintenanceAsset {
    assetId: string;
    assetName: string;
}

export interface Maintenance {
    id: string;
    docNumber: string;
    requestNumber?: string;
    maintenanceDate: string;
    technician: string;
    customerId: string;
    customerName: string;
    assets?: MaintenanceAsset[];
    problemDescription: string;
    actionsTaken: string;
    workTypes: string[];
    priority?: 'Tinggi' | 'Sedang' | 'Rendah';
    attachments?: Attachment[];
    materialsUsed?: MaintenanceMaterial[];
    replacements?: MaintenanceReplacement[];
    status: ItemStatus;
    completedBy?: string;
    completionDate?: string;
}

export type NotificationType = 'info' | 'success' | 'warning' | 'error' | 'SYSTEM' | string;

export interface NotificationAction {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
}

export interface Notification {
    id: number;
    message: string;
    type: NotificationType;
    duration?: number;
    actions?: NotificationAction[];
    recipientId: number;
    actorName: string;
    referenceId?: string;
    isRead: boolean;
    timestamp: string;
}

export type NotificationSystemType = NotificationType;

export interface ParsedScanResult {
    raw: string;
    id?: string;
    serialNumber?: string;
    macAddress?: string;
    name?: string;
}

export type PreviewData = {
    type: 'asset' | 'customer' | 'user' | 'request' | 'handover' | 'dismantle' | 'customerAssets' | 'stockItemAssets' | 'stockHistory' | 'installation' | 'maintenance';
    id: string | number;
    data?: any;
};

export type MovementType = 'IN_PURCHASE' | 'IN_RETURN' | 'OUT_INSTALLATION' | 'OUT_HANDOVER' | 'OUT_BROKEN' | 'OUT_ADJUSTMENT';

export interface StockMovement {
    id: string;
    assetName: string;
    brand: string;
    date: string;
    type: MovementType | string;
    quantity: number;
    balanceAfter: number;
    referenceId?: string;
    actor: string;
    notes?: string;
}
