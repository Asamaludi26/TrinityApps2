
import {
    Asset,
    AssetCategory,
    AssetCondition,
    AssetReturn,
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
const getDate = (daysOffset: number): Date => {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    return date;
};
const d = (days: number) => getDate(days).toISOString();

// 1. MASTER DATA: DIVISIONS & USERS
export const mockDivisions: Division[] = [
    { id: 1, name: 'Network Engineering' }, // Core Network
    { id: 2, name: 'NOC (Operation)' },     // Monitoring
    { id: 3, name: 'Technical Support' },   // Field Engineer / Teknisi
    { id: 4, name: 'Logistik & Gudang' },   // Asset Keeper
    { id: 5, name: 'Management' },          // CEO/Director
    { id: 6, name: 'Purchase' },            // Procurement
    { id: 7, name: 'Sales & Marketing' },
];

export const initialMockUsers: User[] = [
    { id: 1, name: 'Budi Santoso (Super)', email: 'super@triniti.com', divisionId: 5, role: 'Super Admin', permissions: SUPER_ADMIN_PERMISSIONS },
    { id: 2, name: 'Siti Logistik', email: 'logistik@triniti.com', divisionId: 4, role: 'Admin Logistik', permissions: ADMIN_LOGISTIK_PERMISSIONS },
    { id: 3, name: 'Andi Purchase', email: 'purchase@triniti.com', divisionId: 6, role: 'Admin Purchase', permissions: ADMIN_PURCHASE_PERMISSIONS },
    { id: 4, name: 'Rudi Leader', email: 'leader@triniti.com', divisionId: 1, role: 'Leader', permissions: LEADER_PERMISSIONS },
    { id: 5, name: 'Dedi Teknisi', email: 'teknisi@triniti.com', divisionId: 3, role: 'Staff', permissions: STAFF_PERMISSIONS },
    { id: 6, name: 'Eko Teknisi', email: 'teknisi2@triniti.com', divisionId: 3, role: 'Staff', permissions: STAFF_PERMISSIONS },
];

// 2. CONFIG: ASSET CATEGORIES (ISP STANDARD)
export const initialAssetCategories: AssetCategory[] = [
    {
        id: 1, name: 'Perangkat Jaringan Aktif', isCustomerInstallable: false, associatedDivisions: [1, 2, 4, 6],
        types: [
            { 
                id: 11, name: 'OLT (Optical Line Terminal)', classification: 'asset', trackingMethod: 'individual', unitOfMeasure: 'Unit',
                standardItems: [
                    { id: 111, name: 'ZTE C320', brand: 'ZTE' },
                    { id: 112, name: 'Huawei MA5608T', brand: 'Huawei' }
                ] 
            },
            { 
                id: 12, name: 'Router Board', classification: 'asset', trackingMethod: 'individual', unitOfMeasure: 'Unit',
                standardItems: [
                    { id: 121, name: 'Mikrotik CCR1036', brand: 'Mikrotik' },
                    { id: 122, name: 'Juniper MX204', brand: 'Juniper' }
                ] 
            },
            {
                id: 13, name: 'SFP Module', classification: 'material', trackingMethod: 'bulk', unitOfMeasure: 'Pcs',
                standardItems: [
                    { id: 131, name: 'SFP+ 10G LR', brand: 'Mikrotik', bulkType: 'count', unitOfMeasure: 'Pcs' },
                    { id: 132, name: 'SFP GPON C++', brand: 'ZTE', bulkType: 'count', unitOfMeasure: 'Pcs' }
                ]
            }
        ]
    },
    {
        id: 2, name: 'Komponen Jaringan Pasif', isCustomerInstallable: false, associatedDivisions: [1, 3, 4],
        types: [
            {
                id: 21, name: 'ODP (Optical Distribution Point)', classification: 'asset', trackingMethod: 'individual', unitOfMeasure: 'Unit',
                standardItems: [
                    { id: 211, name: 'ODP Pole 16 Port', brand: 'PAZ' },
                    { id: 212, name: 'ODP Wall 8 Port', brand: 'FiberHome' }
                ]
            },
            {
                id: 22, name: 'Passive Splitter', classification: 'material', trackingMethod: 'bulk', unitOfMeasure: 'Pcs',
                standardItems: [
                    { id: 221, name: 'Splitter 1:8 Modular', brand: 'Generic', bulkType: 'count', unitOfMeasure: 'Pcs' },
                    { id: 222, name: 'Splitter 1:16 PLC', brand: 'Generic', bulkType: 'count', unitOfMeasure: 'Pcs' }
                ]
            }
        ]
    },
    {
        id: 3, name: 'Material Kabel', isCustomerInstallable: true, associatedDivisions: [3, 4],
        types: [
            {
                id: 31, name: 'Kabel Fiber Optic Distribusi', classification: 'material', trackingMethod: 'bulk', unitOfMeasure: 'Drum',
                standardItems: [
                    { id: 311, name: 'ADSS 24 Core', brand: 'Voksel', bulkType: 'measurement', unitOfMeasure: 'Drum', baseUnitOfMeasure: 'Meter', quantityPerUnit: 2000 },
                    { id: 312, name: 'ADSS 12 Core', brand: 'Voksel', bulkType: 'measurement', unitOfMeasure: 'Drum', baseUnitOfMeasure: 'Meter', quantityPerUnit: 2000 }
                ]
            },
            {
                id: 32, name: 'Kabel Drop Core', classification: 'material', trackingMethod: 'bulk', unitOfMeasure: 'Hasbal',
                standardItems: [
                    { id: 321, name: 'Dropcore 1 Core Precon', brand: 'FiberHome', bulkType: 'measurement', unitOfMeasure: 'Hasbal', baseUnitOfMeasure: 'Meter', quantityPerUnit: 1000 },
                    { id: 322, name: 'Dropcore 2 Core', brand: 'Global', bulkType: 'measurement', unitOfMeasure: 'Hasbal', baseUnitOfMeasure: 'Meter', quantityPerUnit: 1000 }
                ]
            },
            {
                id: 33, name: 'Kabel UTP / LAN', classification: 'material', trackingMethod: 'bulk', unitOfMeasure: 'Box',
                standardItems: [
                    { id: 331, name: 'UTP Cat6 Outdoor', brand: 'Belden', bulkType: 'measurement', unitOfMeasure: 'Box', baseUnitOfMeasure: 'Meter', quantityPerUnit: 305 }
                ]
            }
        ]
    },
    {
        id: 4, name: 'Perangkat Terminal Pelanggan (CPE)', isCustomerInstallable: true, associatedDivisions: [3, 4, 7],
        types: [
            {
                id: 41, name: 'ONT / Modem', classification: 'asset', trackingMethod: 'individual', unitOfMeasure: 'Unit',
                standardItems: [
                    { id: 411, name: 'ZTE F609', brand: 'ZTE' },
                    { id: 412, name: 'Huawei HG8245H5', brand: 'Huawei' },
                    { id: 413, name: 'FiberHome HG6243C', brand: 'FiberHome' }
                ]
            },
            {
                id: 42, name: 'Set-Top Box (STB)', classification: 'asset', trackingMethod: 'individual', unitOfMeasure: 'Unit',
                standardItems: [
                    { id: 421, name: 'STB Android 4K', brand: 'ZTE' }
                ]
            }
        ]
    },
    {
        id: 5, name: 'Material Pendukung & Aksesoris', isCustomerInstallable: true, associatedDivisions: [3, 4],
        types: [
            {
                id: 51, name: 'Konektor & Aksesoris', classification: 'material', trackingMethod: 'bulk', unitOfMeasure: 'Pack',
                standardItems: [
                    { id: 511, name: 'Fast Connector SC/UPC', brand: 'Generic', bulkType: 'count', unitOfMeasure: 'Pcs' },
                    { id: 512, name: 'Patch Cord SC-UPC 3M', brand: 'Generic', bulkType: 'count', unitOfMeasure: 'Pcs' },
                    { id: 513, name: 'S-Clamp', brand: 'Generic', bulkType: 'count', unitOfMeasure: 'Pcs' }
                ]
            }
        ]
    },
    {
        id: 6, name: 'Alat Ukur dan Alat Kerja', isCustomerInstallable: false, associatedDivisions: [1, 3, 4],
        types: [
            {
                id: 61, name: 'Splicing Tools', classification: 'asset', trackingMethod: 'individual', unitOfMeasure: 'Set',
                standardItems: [
                    { id: 611, name: 'Fusion Splicer 90S', brand: 'Fujikura' },
                    { id: 612, name: 'Fusion Splicer AI-9', brand: 'Signal Fire' }
                ]
            },
            {
                id: 62, name: 'Measuring Tools', classification: 'asset', trackingMethod: 'individual', unitOfMeasure: 'Unit',
                standardItems: [
                    { id: 621, name: 'OTDR MaxTester', brand: 'EXFO' },
                    { id: 622, name: 'OPM (Optical Power Meter)', brand: 'Joinwit' }
                ]
            }
        ]
    }
];

// 3. INVENTORY STATE (ASSETS)
export const mockAssets: Asset[] = [
    // --- I. ACTIVE EQUIPMENT ---
    { 
        id: 'AST-OLT-001', name: 'ZTE C320', category: 'Perangkat Jaringan Aktif', type: 'OLT (Optical Line Terminal)', brand: 'ZTE', 
        serialNumber: 'ZTE-OLT-998877', status: AssetStatus.IN_USE, condition: AssetCondition.GOOD, 
        location: 'Server Room HQ', locationDetail: 'Rack 1 - U10', registrationDate: d(-365), recordedBy: 'Siti Logistik', 
        purchasePrice: 25000000, vendor: 'PT. ZTE Indonesia', attachments: [], activityLog: [] 
    },
    { 
        id: 'AST-RTR-002', name: 'Mikrotik CCR1036', category: 'Perangkat Jaringan Aktif', type: 'Router Board', brand: 'Mikrotik', 
        serialNumber: 'MK-CCR-112233', status: AssetStatus.IN_USE, condition: AssetCondition.GOOD, 
        location: 'Server Room HQ', locationDetail: 'Rack 1 - U4', registrationDate: d(-360), recordedBy: 'Siti Logistik', 
        purchasePrice: 15000000, attachments: [], activityLog: [] 
    },

    // --- III. CABLES (MEASUREMENT) ---
    // 1. Full Drum (Gudang)
    { 
        id: 'MAT-ADSS-1001', name: 'ADSS 24 Core', category: 'Material Kabel', type: 'Kabel Fiber Optic Distribusi', brand: 'Voksel', 
        status: AssetStatus.IN_STORAGE, condition: AssetCondition.BRAND_NEW, location: 'Gudang Utama', 
        registrationDate: d(-20), recordedBy: 'Siti Logistik', purchasePrice: 15000000, 
        initialBalance: 2000, currentBalance: 2000, // 2000 Meter Utuh
        attachments: [], activityLog: [] 
    },
    // 2. Partial Drum (Gudang - Sisa Proyek)
    { 
        id: 'MAT-ADSS-1002', name: 'ADSS 12 Core', category: 'Material Kabel', type: 'Kabel Fiber Optic Distribusi', brand: 'Voksel', 
        status: AssetStatus.IN_STORAGE, condition: AssetCondition.GOOD, location: 'Gudang Utama', 
        registrationDate: d(-45), recordedBy: 'Siti Logistik', purchasePrice: 12000000, 
        initialBalance: 2000, currentBalance: 450, // Sisa 450 Meter
        attachments: [], activityLog: [], notes: 'Sisa penarikan jalur A-B'
    },
    // 3. Dropcore (Custody Teknisi)
    { 
        id: 'MAT-DC-2001', name: 'Dropcore 1 Core Precon', category: 'Material Kabel', type: 'Kabel Drop Core', brand: 'FiberHome', 
        status: AssetStatus.IN_CUSTODY, currentUser: 'Dedi Teknisi', condition: AssetCondition.GOOD, location: 'Mobil Tim 1', 
        registrationDate: d(-10), recordedBy: 'Siti Logistik', purchasePrice: 1200000, 
        initialBalance: 1000, currentBalance: 850, // Sisa 850m di mobil teknisi
        attachments: [], activityLog: [] 
    },

    // --- IV. CPE (ONT/MODEM) ---
    // 1. Stock Baru
    { 
        id: 'AST-ONT-501', name: 'ZTE F609', category: 'Perangkat Terminal Pelanggan (CPE)', type: 'ONT / Modem', brand: 'ZTE', 
        serialNumber: 'ZTEGC111222', macAddress: 'A1:B2:C3:D4:E5:01', status: AssetStatus.IN_STORAGE, condition: AssetCondition.BRAND_NEW, 
        location: 'Gudang Utama', locationDetail: 'Rak B-1', registrationDate: d(-5), recordedBy: 'Siti Logistik', purchasePrice: 350000, attachments: [], activityLog: []
    },
    { 
        id: 'AST-ONT-502', name: 'ZTE F609', category: 'Perangkat Terminal Pelanggan (CPE)', type: 'ONT / Modem', brand: 'ZTE', 
        serialNumber: 'ZTEGC111223', macAddress: 'A1:B2:C3:D4:E5:02', status: AssetStatus.IN_STORAGE, condition: AssetCondition.BRAND_NEW, 
        location: 'Gudang Utama', locationDetail: 'Rak B-1', registrationDate: d(-5), recordedBy: 'Siti Logistik', purchasePrice: 350000, attachments: [], activityLog: []
    },
    // 2. Terpasang (Customer)
    { 
        id: 'AST-ONT-105', name: 'Huawei HG8245H5', category: 'Perangkat Terminal Pelanggan (CPE)', type: 'ONT / Modem', brand: 'Huawei', 
        serialNumber: '4857544301', macAddress: 'BB:CC:DD:11:22:33', status: AssetStatus.IN_USE, currentUser: 'CUST-001', 
        condition: AssetCondition.USED_OKAY, location: 'Terpasang di: PT. Maju Jaya', 
        registrationDate: d(-100), recordedBy: 'Siti Logistik', purchasePrice: 450000, attachments: [], activityLog: []
    },
    // 3. Rusak (Perlu Repair)
    { 
        id: 'AST-ONT-099', name: 'FiberHome HG6243C', category: 'Perangkat Terminal Pelanggan (CPE)', type: 'ONT / Modem', brand: 'FiberHome', 
        serialNumber: 'FHTT888999', status: AssetStatus.DAMAGED, condition: AssetCondition.MAJOR_DAMAGE, 
        location: 'Gudang Retur', registrationDate: d(-200), recordedBy: 'Siti Logistik', purchasePrice: 300000, 
        notes: 'Mati total kena petir', isDismantled: true, dismantleInfo: { customerName: 'Ruko Lama' }, attachments: [], activityLog: []
    },

    // --- V. CONSUMABLES (COUNT) ---
    { 
        id: 'MAT-CONN-001', name: 'Fast Connector SC/UPC', category: 'Material Pendukung & Aksesoris', type: 'Konektor & Aksesoris', brand: 'Generic', 
        status: AssetStatus.IN_STORAGE, condition: AssetCondition.BRAND_NEW, location: 'Gudang Aksesoris', 
        quantity: 500, // Stock Count
        initialBalance: 500, currentBalance: 500,
        registrationDate: d(-30), recordedBy: 'Siti Logistik', purchasePrice: 5000, attachments: [], activityLog: [] 
    },
    { 
        id: 'MAT-PC-001', name: 'Patch Cord SC-UPC 3M', category: 'Material Pendukung & Aksesoris', type: 'Konektor & Aksesoris', brand: 'Generic', 
        status: AssetStatus.IN_STORAGE, condition: AssetCondition.BRAND_NEW, location: 'Gudang Aksesoris', 
        quantity: 150, 
        initialBalance: 150, currentBalance: 150,
        registrationDate: d(-30), recordedBy: 'Siti Logistik', purchasePrice: 15000, attachments: [], activityLog: [] 
    },

    // --- VI. TOOLS (INDIVIDUAL) ---
    { 
        id: 'AST-TOOL-001', name: 'Fusion Splicer 90S', category: 'Alat Ukur dan Alat Kerja', type: 'Splicing Tools', brand: 'Fujikura', 
        serialNumber: 'FJK-90S-001', status: AssetStatus.IN_USE, currentUser: 'Dedi Teknisi', condition: AssetCondition.GOOD, 
        location: 'Lapangan', locationDetail: 'Tim Instalasi 1', registrationDate: d(-365), recordedBy: 'Siti Logistik', 
        purchasePrice: 85000000, attachments: [], activityLog: [] 
    },
    { 
        id: 'AST-TOOL-002', name: 'OTDR MaxTester', category: 'Alat Ukur dan Alat Kerja', type: 'Measuring Tools', brand: 'EXFO', 
        serialNumber: 'EXFO-715B-002', status: AssetStatus.IN_STORAGE, condition: AssetCondition.GOOD, 
        location: 'Lemari Alat', registrationDate: d(-365), recordedBy: 'Siti Logistik', 
        purchasePrice: 65000000, attachments: [], activityLog: [] 
    }
];

// 4. TRANSACTIONS FLOW (HISTORY)

// A. REQUESTS (PROCUREMENT)
export const initialMockRequests: Request[] = [
    {
        id: 'RO-202510-001', docNumber: 'RO-202510-001', requester: 'Siti Logistik', division: 'Logistik & Gudang',
        requestDate: d(-10), status: ItemStatus.ARRIVED, // Barang sudah sampai, perlu dicatat
        order: { type: 'Regular Stock' },
        items: [
            { id: 1, itemName: 'ZTE F609', itemTypeBrand: 'ZTE', quantity: 20, unit: 'Unit', keterangan: 'Restock Modem' },
            { id: 2, itemName: 'Dropcore 1 Core Precon', itemTypeBrand: 'FiberHome', quantity: 10, unit: 'Hasbal', keterangan: 'Kabel Dropcore Stok' }
        ],
        logisticApprover: 'Siti Logistik', logisticApprovalDate: d(-9),
        finalApprover: 'Budi Santoso', finalApprovalDate: d(-8),
        arrivalDate: d(-1),
        isRegistered: false // Belum dicatat ke aset
    },
    {
        id: 'RO-202510-002', docNumber: 'RO-202510-002', requester: 'Rudi Leader', division: 'Network Engineering',
        requestDate: d(0), status: ItemStatus.PENDING,
        order: { type: 'Urgent', justification: 'Splicer Tim 2 Rusak' },
        items: [
            { id: 1, itemName: 'Fusion Splicer AI-9', itemTypeBrand: 'Signal Fire', quantity: 1, unit: 'Set', keterangan: 'Pengganti Unit Rusak' }
        ]
    }
];

// B. LOAN REQUESTS (PEMINJAMAN ALAT)
export const mockLoanRequests: LoanRequest[] = [
    {
        id: 'RL-202509-005', requester: 'Dedi Teknisi', division: 'Technical Support', requestDate: d(-30),
        status: LoanRequestStatus.ON_LOAN,
        items: [{ id: 1, itemName: 'Fusion Splicer 90S', brand: 'Fujikura', quantity: 1, unit: 'Set', keterangan: 'Pegangan Harian', returnDate: null }],
        assignedAssetIds: { 1: ['AST-TOOL-001'] }, 
        approver: 'Siti Logistik', approvalDate: d(-30)
    }
];

// C. HANDOVERS (SERAH TERIMA)
export const mockHandovers: Handover[] = [
    // Handover Splicer ke Dedi
    {
        id: 'HO-202509-001', docNumber: 'HO-RL-202509-005', handoverDate: d(-30), 
        menyerahkan: 'Siti Logistik', penerima: 'Dedi Teknisi', mengetahui: 'Rudi Leader',
        status: ItemStatus.COMPLETED, woRoIntNumber: 'RL-202509-005',
        items: [{ id: 1, assetId: 'AST-TOOL-001', itemName: 'Fusion Splicer 90S', itemTypeBrand: 'Fujikura', conditionNotes: 'Lengkap, Normal', quantity: 1, checked: true }]
    },
    // Handover Material (Kabel) ke Dedi (Custody)
    {
        id: 'HO-202510-010', docNumber: 'HO-RO-INTERNAL-01', handoverDate: d(-10),
        menyerahkan: 'Siti Logistik', penerima: 'Dedi Teknisi', mengetahui: 'Rudi Leader',
        status: ItemStatus.COMPLETED, woRoIntNumber: 'INTERNAL-REQ',
        items: [
            { id: 1, assetId: 'MAT-DC-2001', itemName: 'Dropcore 1 Core Precon', itemTypeBrand: 'FiberHome', conditionNotes: 'Baru', quantity: 1, unit: 'Hasbal', checked: true }
        ]
    }
];

// 5. CRM DATA (CUSTOMERS)
export const mockCustomers: Customer[] = [
    {
        id: 'CUST-001', name: 'PT. Maju Jaya Sentosa', address: 'Jl. Sudirman Kav 50, Jakarta', phone: '021-555001', email: 'it@majujaya.com',
        status: CustomerStatus.ACTIVE, servicePackage: 'Dedicated 100Mbps', installationDate: d(-100),
        installedMaterials: [
            // Material Consumption Log
            { itemName: 'Dropcore 1 Core Precon', brand: 'FiberHome', quantity: 150, unit: 'Meter', installationDate: d(-100), materialAssetId: 'MAT-DC-2001' }, 
            { itemName: 'Fast Connector SC/UPC', brand: 'Generic', quantity: 2, unit: 'Pcs', installationDate: d(-100) },
            { itemName: 'S-Clamp', brand: 'Generic', quantity: 2, unit: 'Pcs', installationDate: d(-100) }
        ],
        notes: 'VIP Customer. SLA 99.9%'
    },
    {
        id: 'CUST-002', name: 'Cafe Kopi Senja', address: 'Jl. Melawai Raya, Jakarta', phone: '08129999888', email: 'owner@kopisenja.com',
        status: CustomerStatus.ACTIVE, servicePackage: 'Broadband 50Mbps', installationDate: d(-45),
        installedMaterials: [
            { itemName: 'Dropcore 1 Core Precon', brand: 'Global', quantity: 80, unit: 'Meter', installationDate: d(-45) }
        ]
    }
];

// 6. OPERATIONAL TRANSACTIONS

// Installation (Bukti pasang di CUST-001)
export const mockInstallations: Installation[] = [
    {
        id: 'INST-001', docNumber: 'WO-IKR-250701-001', installationDate: d(-100), technician: 'Dedi Teknisi',
        customerId: 'CUST-001', customerName: 'PT. Maju Jaya Sentosa', status: ItemStatus.COMPLETED,
        assetsInstalled: [ { assetId: 'AST-ONT-105', assetName: 'Huawei HG8245H5', serialNumber: '4857544301' } ],
        materialsUsed: [
             { itemName: 'Dropcore 1 Core Precon', brand: 'FiberHome', quantity: 150, unit: 'Meter', materialAssetId: 'MAT-DC-2001' },
             { itemName: 'Fast Connector SC/UPC', brand: 'Generic', quantity: 2, unit: 'Pcs' }
        ],
        notes: 'Instalasi standard. Redaman -19dBm.',
        createdBy: 'Dedi Teknisi', acknowledger: 'Siti Logistik'
    }
];

// Maintenance (Perbaikan di CUST-002)
export const mockMaintenances: Maintenance[] = [
    { 
        id: 'MNT-001', docNumber: 'WO-MT-251010-001', requestNumber: 'TICKET-99', maintenanceDate: d(-5), 
        technician: 'Eko Teknisi', customerId: 'CUST-002', customerName: 'Cafe Kopi Senja', 
        problemDescription: 'LOS Merah, kabel putus digigit tikus', actionsTaken: 'Splicing ulang kabel & ganti patchcord', 
        workTypes: ['Splicing FO', 'Ganti Konektor'], priority: 'Tinggi', status: ItemStatus.COMPLETED, completedBy: 'Siti Logistik', completionDate: d(-5),
        materialsUsed: [{ itemName: 'Patch Cord SC-UPC 3M', brand: 'Generic', quantity: 1, unit: 'Pcs' }],
        notes: 'Kabel sudah dirapikan dengan spiral wrap.'
    }
];

// Dismantle (Penarikan dari Ruko Lama)
export const mockDismantles: Dismantle[] = [
    {
        id: 'DSM-001', docNumber: 'WO-DSM-250901-001', dismantleDate: d(-200), technician: 'Dedi Teknisi',
        customerId: 'CUST-OLD-01', customerName: 'Ruko Lama (Tutup)', customerAddress: 'Jl. Lama No 1',
        assetId: 'AST-ONT-099', assetName: 'FiberHome HG6243C', retrievedCondition: AssetCondition.MAJOR_DAMAGE,
        status: ItemStatus.COMPLETED, acknowledger: 'Siti Logistik', notes: 'Pelanggan tutup usaha. ONT rusak port optik.'
    }
];

export const mockReturns: AssetReturn[] = []; 

// 7. STOCK MOVEMENT LOGS (AUDIT TRAIL)
export const mockStockMovements: StockMovement[] = [
    // Pembelian Kabel
    {
        id: 'MOV-001', assetName: 'ADSS 24 Core', brand: 'Voksel', date: d(-20), type: 'IN_PURCHASE', 
        quantity: 2000, balanceAfter: 2000, actor: 'Siti Logistik', notes: 'Penerimaan barang baru PO-001', locationContext: 'WAREHOUSE'
    },
    // Handover ke Teknisi (Keluar Gudang -> Custody)
    {
        id: 'MOV-002', assetName: 'Dropcore 1 Core Precon', brand: 'FiberHome', date: d(-10), type: 'OUT_HANDOVER', 
        quantity: 1000, balanceAfter: 0, actor: 'Siti Logistik', notes: 'Handover ke Dedi Teknisi (Custody)', locationContext: 'WAREHOUSE', relatedAssetId: 'MAT-DC-2001'
    },
    // Pemakaian Instalasi (Keluar Custody -> Konsumsi)
    {
        id: 'MOV-003', assetName: 'Dropcore 1 Core Precon', brand: 'FiberHome', date: d(-100), type: 'OUT_INSTALLATION', 
        quantity: 150, balanceAfter: 850, actor: 'Dedi Teknisi', notes: 'Instalasi CUST-001', locationContext: 'CUSTODY', relatedAssetId: 'MAT-DC-2001'
    }
];

// 8. NOTIFICATIONS
export const mockNotifications: Notification[] = [
    {
        id: 1, recipientId: 2, actorName: 'Rudi Leader', type: 'REQUEST_CREATED', 
        referenceId: 'RO-202510-002', message: 'membuat request urgent (Splicer Rusak).', isRead: false, timestamp: d(0)
    },
    {
        id: 2, recipientId: 3, actorName: 'Siti Logistik', type: 'STATUS_CHANGE', 
        referenceId: 'RO-202510-001', message: 'Barang telah tiba di gudang. Siap dicatat.', isRead: false, timestamp: d(-1)
    }
];
