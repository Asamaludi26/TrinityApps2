
import {
    Asset,
    AssetCategory,
    AssetCondition,
    AssetReturn,
    AssetReturnStatus,
    AssetStatus,
    Customer,
    CustomerStatus,
    Dismantle,
    Division,
    Handover,
    Installation,
    ItemStatus,
    LoanRequest,
    LoanRequestStatus,
    Maintenance,
    Notification,
    Request,
    User,
    StockMovement
} from '../types';
import {
    ADMIN_LOGISTIK_PERMISSIONS,
    ADMIN_PURCHASE_PERMISSIONS,
    LEADER_PERMISSIONS,
    STAFF_PERMISSIONS,
    SUPER_ADMIN_PERMISSIONS
} from '../utils/permissions';

// --- HELPER: DYNAMIC DATES ---
// d(0) = Hari ini, d(-5) = 5 hari lalu, d(30) = 30 hari ke depan
const getDate = (daysOffset: number): Date => {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    return date;
};
const d = (days: number) => getDate(days).toISOString();

// --- HELPER: ID GENERATOR (FORMAT: PREFIX-YYMMDD-NNNN) ---
const generateId = (prefix: string, daysOffset: number, sequence: string) => {
    const date = getDate(daysOffset);
    const year = date.getFullYear().toString().slice(-2); // YY
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // MM
    const day = date.getDate().toString().padStart(2, '0'); // DD
    return `${prefix}-${year}${month}${day}-${sequence}`;
};

// --- 1. USERS & DIVISIONS ---
export const mockDivisions: Division[] = [
    { id: 1, name: 'Network Engineering' },
    { id: 2, name: 'NOC (Network Operation Center)' },
    { id: 3, name: 'Technical Support' },
    { id: 4, name: 'Logistik & Gudang' },
    { id: 5, name: 'Management' },
    { id: 6, name: 'Purchase' },
    { id: 7, name: 'HR & GA' },
];

export const initialMockUsers: User[] = [
    { id: 1, name: 'Super Admin', email: 'super@triniti.com', divisionId: 5, role: 'Super Admin', permissions: SUPER_ADMIN_PERMISSIONS },
    { id: 2, name: 'Admin Logistik', email: 'logistik@triniti.com', divisionId: 4, role: 'Admin Logistik', permissions: ADMIN_LOGISTIK_PERMISSIONS },
    { id: 3, name: 'Admin Purchase', email: 'purchase@triniti.com', divisionId: 6, role: 'Admin Purchase', permissions: ADMIN_PURCHASE_PERMISSIONS },
    { id: 4, name: 'Leader Network', email: 'leader@triniti.com', divisionId: 1, role: 'Leader', permissions: LEADER_PERMISSIONS },
    { id: 5, name: 'Staff Teknisi', email: 'teknisi@triniti.com', divisionId: 3, role: 'Staff', permissions: STAFF_PERMISSIONS },
    { id: 6, name: 'Staff NOC', email: 'noc@triniti.com', divisionId: 2, role: 'Staff', permissions: STAFF_PERMISSIONS },
];

// --- 2. CATEGORIES ---
export const initialAssetCategories: AssetCategory[] = [
    {
        id: 1, name: 'Perangkat Jaringan (Core)', isCustomerInstallable: false, associatedDivisions: [1, 2],
        types: [
            { id: 11, name: 'Router Core', classification: 'asset', trackingMethod: 'individual', standardItems: [{ id: 111, name: 'Mikrotik CCR1009', brand: 'Mikrotik' }] },
            { id: 12, name: 'Switch Aggregation', classification: 'asset', trackingMethod: 'individual', standardItems: [{ id: 121, name: 'Cisco Catalyst 2960', brand: 'Cisco' }] }
        ]
    },
    {
        id: 2, name: 'Perangkat Pelanggan (CPE)', isCustomerInstallable: true, associatedDivisions: [3],
        types: [
            { id: 21, name: 'ONT/ONU', classification: 'asset', trackingMethod: 'individual', standardItems: [{ id: 211, name: 'Huawei HG8245H', brand: 'Huawei' }, { id: 212, name: 'ZTE F609', brand: 'ZTE' }] },
            { id: 22, name: 'Access Point', classification: 'asset', trackingMethod: 'individual', standardItems: [{ id: 221, name: 'Unifi AP AC Lite', brand: 'Ubiquiti' }] }
        ]
    },
    {
        id: 3, name: 'Infrastruktur Fiber Optik', isCustomerInstallable: true, associatedDivisions: [3],
        types: [
            { 
                id: 31, 
                name: 'Kabel Dropcore', 
                classification: 'material', 
                trackingMethod: 'bulk', 
                // Definisi level Tipe (Default)
                unitOfMeasure: 'Hasbal', 
                standardItems: [{ 
                    id: 311, 
                    name: 'Dropcore 1 Core', 
                    brand: 'FiberHome',
                    bulkType: 'measurement',
                    // Definisi level Model (Spesifik) - PENTING: quantityPerUnit menentukan isi
                    unitOfMeasure: 'Hasbal',
                    baseUnitOfMeasure: 'Meter',
                    quantityPerUnit: 1000 
                }] 
            },
            { 
                id: 32, 
                name: 'Konektor / Adaptor', 
                classification: 'material', 
                trackingMethod: 'bulk', 
                standardItems: [{ 
                    id: 321, 
                    name: 'Fast Connector SC/UPC', 
                    brand: 'Generic',
                    bulkType: 'count',
                    unitOfMeasure: 'Pcs'
                }, { 
                    id: 322, 
                    name: 'Adaptor SC-UPC', 
                    brand: 'Generic',
                    bulkType: 'count',
                    unitOfMeasure: 'Pcs'
                }] 
            },
            { id: 33, name: 'Patchcord', classification: 'material', trackingMethod: 'bulk', standardItems: [{ id: 331, name: 'Patchcord SC-UPC 3M', brand: 'Generic', bulkType: 'count', unitOfMeasure: 'Pcs' }] },
            { id: 34, name: 'Pelindung (Sleeve)', classification: 'material', trackingMethod: 'bulk', standardItems: [{ id: 341, name: 'Protection Sleeve 60mm', brand: 'Generic', bulkType: 'count', unitOfMeasure: 'Pcs' }] }
        ]
    },
    {
        id: 4, name: 'Alat Kerja', isCustomerInstallable: false, associatedDivisions: [1, 2, 3],
        types: [
            { id: 41, name: 'Splicer', classification: 'asset', trackingMethod: 'individual', standardItems: [{ id: 411, name: 'Fusion Splicer 90S', brand: 'Fujikura' }] },
            { id: 42, name: 'OTDR', classification: 'asset', trackingMethod: 'individual', standardItems: [{ id: 421, name: 'OTDR MaxTester', brand: 'Exfo' }] }
        ]
    }
];

// --- 3. ASSETS ---
export const mockAssets: Asset[] = [
    // A. IN_STORAGE (Available)
    { id: 'AST-001', name: 'Mikrotik CCR1009', category: 'Perangkat Jaringan (Core)', type: 'Router Core', brand: 'Mikrotik', serialNumber: 'SN-MK-001', status: AssetStatus.IN_STORAGE, condition: AssetCondition.BRAND_NEW, location: 'Gudang Utama', registrationDate: d(-10), recordedBy: 'Admin Logistik', purchasePrice: 7500000, attachments: [], activityLog: [] },
    { id: 'AST-002', name: 'Huawei HG8245H', category: 'Perangkat Pelanggan (CPE)', type: 'ONT/ONU', brand: 'Huawei', serialNumber: 'SN-HW-A01', status: AssetStatus.IN_STORAGE, condition: AssetCondition.GOOD, location: 'Rak A-2', registrationDate: d(-20), recordedBy: 'Admin Logistik', purchasePrice: 450000, attachments: [], activityLog: [] },
    
    // B. IN_USE (Internal & Customer)
    { id: 'AST-003', name: 'Fusion Splicer 90S', category: 'Alat Kerja', type: 'Splicer', brand: 'Fujikura', serialNumber: 'SN-FJ-99', status: AssetStatus.IN_USE, condition: AssetCondition.GOOD, currentUser: 'Staff Teknisi', location: 'Mobil Tim 1', registrationDate: d(-100), recordedBy: 'Admin Logistik', purchasePrice: 85000000, attachments: [], activityLog: [] },
    { id: 'AST-004', name: 'ZTE F609', category: 'Perangkat Pelanggan (CPE)', type: 'ONT/ONU', brand: 'ZTE', serialNumber: 'SN-ZTE-55', status: AssetStatus.IN_USE, condition: AssetCondition.USED_OKAY, currentUser: 'CUST-001', location: 'Terpasang di: PT. Maju Jaya', registrationDate: d(-50), recordedBy: 'Admin Logistik', purchasePrice: 300000, attachments: [], activityLog: [] },

    // C. DAMAGED / REPAIR
    { id: 'AST-005', name: 'OTDR MaxTester', category: 'Alat Kerja', type: 'OTDR', brand: 'Exfo', serialNumber: 'SN-EX-88', status: AssetStatus.DAMAGED, condition: AssetCondition.MAJOR_DAMAGE, location: 'Meja Teknisi', registrationDate: d(-200), recordedBy: 'Admin Logistik', purchasePrice: 45000000, notes: 'Layar pecah terjatuh', attachments: [], activityLog: [{ id: 1, action: 'Kerusakan Dilaporkan', user: 'Staff Teknisi', timestamp: d(-1), details: 'Layar pecah saat operasional.' }] },
    { id: 'AST-006', name: 'Mikrotik CCR1009', category: 'Perangkat Jaringan (Core)', type: 'Router Core', brand: 'Mikrotik', serialNumber: 'SN-MK-002', status: AssetStatus.OUT_FOR_REPAIR, condition: AssetCondition.MINOR_DAMAGE, location: 'Service Center Jakarta', registrationDate: d(-150), recordedBy: 'Admin Logistik', purchasePrice: 7500000, attachments: [], activityLog: [{ id: 2, action: 'Proses Perbaikan Dimulai', user: 'Admin Logistik', timestamp: d(-5), details: 'Dikirim ke vendor service.' }] },

    // E. MATERIAL (Bulk Item) - Updated with balances
    { 
        id: 'MAT-001', 
        name: 'Dropcore 1 Core', 
        category: 'Infrastruktur Fiber Optik', 
        type: 'Kabel Dropcore', 
        brand: 'FiberHome', 
        status: AssetStatus.IN_STORAGE, 
        condition: AssetCondition.BRAND_NEW, 
        location: 'Gudang Kabel', 
        registrationDate: d(-30), 
        recordedBy: 'Admin Logistik', 
        purchasePrice: 1500, 
        initialBalance: 1000, 
        currentBalance: 850, 
        attachments: [], 
        activityLog: [] 
    },
    // ADDED: Backup Asset for MAT-001
    { 
        id: 'MAT-003', 
        name: 'Dropcore 1 Core', 
        category: 'Infrastruktur Fiber Optik', 
        type: 'Kabel Dropcore', 
        brand: 'FiberHome', 
        status: AssetStatus.IN_STORAGE, 
        condition: AssetCondition.BRAND_NEW, 
        location: 'Gudang Kabel - Rak B', 
        registrationDate: d(-5), 
        recordedBy: 'Admin Logistik', 
        purchasePrice: 1600, 
        initialBalance: 1000, 
        currentBalance: 1000, // Full New Drum
        attachments: [], 
        activityLog: [] 
    },
    { id: 'MAT-002', name: 'Adaptor SC-UPC', category: 'Infrastruktur Fiber Optik', type: 'Konektor / Adaptor', brand: 'Generic', status: AssetStatus.IN_STORAGE, condition: AssetCondition.BRAND_NEW, location: 'Gudang Acc', registrationDate: d(-10), recordedBy: 'Admin Logistik', purchasePrice: 5000, attachments: [], activityLog: [] },

    // F. ASSETS FROM SCENARIO RO-260101-0005 (Baru Saja Dicatat)
    { id: 'AST-MIK-001', name: 'Mikrotik CCR1009', category: 'Perangkat Jaringan (Core)', type: 'Router Core', brand: 'Mikrotik', serialNumber: 'SN-MIK-001', status: AssetStatus.IN_STORAGE, condition: AssetCondition.BRAND_NEW, location: 'Gudang Utama', registrationDate: d(0), recordedBy: 'Admin Logistik', purchasePrice: 7500000, attachments: [], activityLog: [], woRoIntNumber: 'RO-260101-0005' },
    { id: 'AST-MIK-002', name: 'Mikrotik CCR1009', category: 'Perangkat Jaringan (Core)', type: 'Router Core', brand: 'Mikrotik', serialNumber: 'SN-MIK-002', status: AssetStatus.IN_STORAGE, condition: AssetCondition.BRAND_NEW, location: 'Gudang Utama', registrationDate: d(0), recordedBy: 'Admin Logistik', purchasePrice: 7500000, attachments: [], activityLog: [], woRoIntNumber: 'RO-260101-0005' }
];

// --- 4. CUSTOMERS ---
export const mockCustomers: Customer[] = [
    {
        id: 'CUST-001', name: 'PT. Maju Jaya', address: 'Jl. Sudirman Kav 50', phone: '021-555001', email: 'admin@majujaya.com',
        status: CustomerStatus.ACTIVE, servicePackage: 'Dedicated 100Mbps', installationDate: d(-45),
        installedMaterials: [
            { itemName: 'Dropcore 1 Core', brand: 'FiberHome', quantity: 150, unit: 'Meter', installationDate: d(-45) }
        ]
    },
    {
        id: 'CUST-002', name: 'Cafe Kopi Senja', address: 'Jl. Melawai Raya No 5', phone: '08129999888', email: 'owner@kopisenja.com',
        status: CustomerStatus.ACTIVE, servicePackage: 'Broadband 50Mbps', installationDate: d(-2),
        installedMaterials: []
    },
    {
        id: 'CUST-003', name: 'Ruko Indah Makmur', address: 'Komp. Ruko Blok B', phone: '021-777888', email: 'admin@ruko.com',
        status: CustomerStatus.SUSPENDED, servicePackage: 'Broadband 20Mbps', installationDate: d(-200),
        installedMaterials: []
    }
];

// --- 5. REQUESTS (RO) ---
export const initialMockRequests: Request[] = [
    // Case 1: PENDING (RO-YYMMDD-NNNN)
    {
        id: generateId('RO', 0, '0001'), 
        docNumber: generateId('RO', 0, '0001'),
        requester: 'Staff Teknisi', 
        division: 'Technical Support', 
        requestDate: d(0), 
        status: ItemStatus.PENDING,
        order: { type: 'Regular Stock' },
        items: [{ id: 1, itemName: 'Fast Connector SC/UPC', itemTypeBrand: 'Generic', quantity: 100, keterangan: 'Stok menipis' }],
        activityLog: []
    },
    // Case 2: LOGISTIC APPROVED
    {
        id: generateId('RO', -1, '0001'),
        docNumber: generateId('RO', -1, '0001'),
        requester: 'Leader Network', 
        division: 'Network Engineering', 
        requestDate: d(-1), 
        status: ItemStatus.LOGISTIC_APPROVED,
        logisticApprover: 'Admin Logistik', 
        logisticApprovalDate: d(0),
        order: { type: 'Project Based', project: 'Expansion Area B' },
        items: [
            { id: 1, itemName: 'Mikrotik CCR1009', itemTypeBrand: 'Mikrotik', quantity: 2, keterangan: 'Core Router baru' },
            { id: 2, itemName: 'SFP Module 10G', itemTypeBrand: 'Mikrotik', quantity: 4, keterangan: 'Uplink' }
        ],
        itemStatuses: { 1: { status: 'approved', approvedQuantity: 2 }, 2: { status: 'approved', approvedQuantity: 4 } },
        activityLog: []
    },
    // Case 3: SCENARIO BUG FIX TEST - SIAP SERAH TERIMA
    // Semua barang sudah dicatat (isRegistered=true), Status=AWAITING_HANDOVER
    {
        id: 'RO-260101-0005',
        docNumber: 'RO-260101-0005',
        requester: 'Leader Network', 
        division: 'Network Engineering',
        requestDate: '2026-01-01T23:07:23.000Z',
        status: ItemStatus.AWAITING_HANDOVER, // Status Kunci untuk tes
        logisticApprover: 'Admin Logistik', 
        logisticApprovalDate: d(-2),
        finalApprover: 'Super Admin', 
        finalApprovalDate: d(-2),
        order: { type: 'Project Based', project: 'Upgrade Infrastruktur Server' },
        items: [
            { id: 1, itemName: 'Mikrotik CCR1009', itemTypeBrand: 'Mikrotik', quantity: 2, keterangan: 'Main Router', categoryId: '1', typeId: '11' }
        ],
        itemStatuses: {
            1: { status: 'approved', approvedQuantity: 2 }
        },
        purchaseDetails: {
             1: { purchasePrice: 7500000, vendor: 'Citra Web', poNumber: 'PO-TEST-005', invoiceNumber: 'INV-005', purchaseDate: d(-1), filledBy: 'Admin Purchase', fillDate: d(-1) }
        },
        arrivalDate: d(0),
        isRegistered: true, // Flag Kunci
        partiallyRegisteredItems: { 1: 2 }, // 2 dari 2 sudah diregister
        activityLog: []
    }
];

// --- 6. LOAN REQUESTS (RL) ---
export const mockLoanRequests: LoanRequest[] = [
    {
        id: generateId('RL', -5, '0001'),
        requester: 'Staff Teknisi', division: 'Technical Support', requestDate: d(-5), status: LoanRequestStatus.ON_LOAN,
        items: [{ id: 1, itemName: 'Fusion Splicer 90S', brand: 'Fujikura', quantity: 1, keterangan: 'Maintenance Area Selatan', returnDate: d(2) }],
        approver: 'Admin Logistik', approvalDate: d(-5),
        assignedAssetIds: { 1: ['AST-003'] },
        notes: 'Peminjaman alat kerja reguler'
    }
];

// --- 7. RETURNS (RR) ---
export const mockReturns: AssetReturn[] = [
    {
        id: generateId('RR', 0, '0001'), 
        docNumber: generateId('RR', 0, '0001'), 
        returnDate: d(0), 
        loanRequestId: generateId('RL', -3, '0001'),
        returnedBy: 'Staff NOC',
        status: AssetReturnStatus.PENDING_APPROVAL,
        items: [{ assetId: 'AST-008', assetName: 'Laptop Admin', returnedCondition: AssetCondition.GOOD, notes: 'Sudah selesai dipakai', status: 'PENDING' }]
    }
];

// --- 8. TRANSACTIONS (HO, DSM, MNT, INST) ---
export const mockHandovers: Handover[] = [
    { 
        id: generateId('HO', -100, '0001'), 
        docNumber: generateId('HO', -100, '0001'), 
        handoverDate: d(-100), 
        menyerahkan: 'Admin Logistik', penerima: 'Staff Teknisi', mengetahui: 'Super Admin', 
        items: [{ id: 1, itemName: 'Fusion Splicer 90S', itemTypeBrand: 'Fujikura', conditionNotes: 'Baru', quantity: 1, checked: true, assetId: 'AST-003' }], 
        status: ItemStatus.COMPLETED 
    }
];

export const mockDismantles: Dismantle[] = [
    { 
        id: generateId('DSM', -5, '0001'), 
        docNumber: generateId('DSM', -5, '0001'), 
        dismantleDate: d(-5), 
        requestNumber: 'REQ-OLD-99', 
        assetId: 'AST-002', assetName: 'Huawei HG8245H', 
        technician: 'Staff Teknisi', customerId: 'CUST-003', customerName: 'Ruko Indah Makmur', customerAddress: 'Komp Ruko', 
        retrievedCondition: AssetCondition.GOOD, notes: 'Pelanggan suspend', 
        status: ItemStatus.COMPLETED, acknowledger: 'Admin Logistik' 
    }
];

export const mockInstallations: Installation[] = [
    { 
        id: generateId('INST', -45, '0001'), 
        docNumber: generateId('WO-IKR', -45, '0001'),
        installationDate: d(-45), 
        technician: 'Staff Teknisi', customerId: 'CUST-001', customerName: 'PT. Maju Jaya', 
        assetsInstalled: [], materialsUsed: [{ itemName: 'Dropcore 1 Core', brand: 'FiberHome', quantity: 150, unit: 'Meter' }], 
        notes: 'Instalasi baru', status: ItemStatus.COMPLETED 
    }
];

export const mockMaintenances: Maintenance[] = [
    { 
        id: generateId('MNT', -2, '0001'), 
        docNumber: generateId('MNT', -2, '0001'), 
        maintenanceDate: d(-2), 
        technician: 'Staff Teknisi', customerId: 'CUST-001', customerName: 'PT. Maju Jaya', 
        problemDescription: 'Internet mati total', actionsTaken: 'Splicing ulang kabel putus', workTypes: ['Splicing FO'], 
        status: ItemStatus.COMPLETED, completedBy: 'Admin Logistik' 
    }
];

// --- 9. STOCK MOVEMENTS ---
export const mockStockMovements: StockMovement[] = [
    { id: 'MOV-001', assetName: 'Dropcore 1 Core', brand: 'FiberHome', date: d(-60), type: 'IN_PURCHASE', quantity: 1000, balanceAfter: 1000, referenceId: 'PO-001', actor: 'Admin Logistik', notes: 'Stok awal' },
    { id: 'MOV-002', assetName: 'Dropcore 1 Core', brand: 'FiberHome', date: d(-45), type: 'OUT_INSTALLATION', quantity: 150, balanceAfter: 850, referenceId: generateId('WO-IKR', -45, '0001'), actor: 'Staff Teknisi', notes: 'Instalasi PT. Maju Jaya' },
    { id: 'MOV-003', assetName: 'Adaptor SC-UPC', brand: 'Generic', date: d(-10), type: 'IN_PURCHASE', quantity: 500, balanceAfter: 500, referenceId: 'PO-002', actor: 'Admin Logistik', notes: 'Stok awal aksesoris' }
];

export const mockNotifications: Notification[] = [
    { id: 1, recipientId: 2, actorName: 'Staff Teknisi', type: 'ASSET_DAMAGED_REPORT', message: 'melaporkan kerusakan pada aset', referenceId: 'AST-005', isRead: false, timestamp: d(0) },
    { id: 2, recipientId: 3, actorName: 'Admin Logistik', type: 'REQUEST_LOGISTIC_APPROVED', message: 'menyetujui request, mohon isi detail pembelian', referenceId: generateId('RO', -1, '0001'), isRead: false, timestamp: d(0) }
];
