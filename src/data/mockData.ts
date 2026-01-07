
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
// Agar data selalu terlihat "fresh" relatif terhadap hari ini
const getDate = (daysOffset: number): Date => {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    return date;
};
const d = (days: number) => getDate(days).toISOString();

// 1. DIVISIONS & USERS (MASTER DATA)
export const mockDivisions: Division[] = [
    { id: 1, name: 'Network Engineering' },
    { id: 2, name: 'NOC (Network Operation Center)' },
    { id: 3, name: 'Technical Support (Field)' },
    { id: 4, name: 'Logistik & Gudang' },
    { id: 5, name: 'Management' },
    { id: 6, name: 'Purchase' },
    { id: 7, name: 'HR & GA' },
];

export const initialMockUsers: User[] = [
    { id: 1, name: 'Budi Santoso (Super)', email: 'super@triniti.com', divisionId: 5, role: 'Super Admin', permissions: SUPER_ADMIN_PERMISSIONS },
    { id: 2, name: 'Siti Logistik', email: 'logistik@triniti.com', divisionId: 4, role: 'Admin Logistik', permissions: ADMIN_LOGISTIK_PERMISSIONS },
    { id: 3, name: 'Andi Purchase', email: 'purchase@triniti.com', divisionId: 6, role: 'Admin Purchase', permissions: ADMIN_PURCHASE_PERMISSIONS },
    { id: 4, name: 'Rudi Leader', email: 'leader@triniti.com', divisionId: 1, role: 'Leader', permissions: LEADER_PERMISSIONS },
    { id: 5, name: 'Dedi Teknisi', email: 'teknisi@triniti.com', divisionId: 3, role: 'Staff', permissions: STAFF_PERMISSIONS },
    { id: 6, name: 'Eko Teknisi', email: 'teknisi2@triniti.com', divisionId: 3, role: 'Staff', permissions: STAFF_PERMISSIONS },
];

// 2. ASSET CATEGORIES (KONFIGURASI PENTING)
export const initialAssetCategories: AssetCategory[] = [
    {
        id: 1, name: 'Perangkat Jaringan (Core)', isCustomerInstallable: false, associatedDivisions: [1, 2, 4, 6],
        types: [
            { 
                id: 11, name: 'Router Core', classification: 'asset', trackingMethod: 'individual', unitOfMeasure: 'Unit',
                standardItems: [
                    { id: 111, name: 'Mikrotik CCR1009', brand: 'Mikrotik' },
                    { id: 112, name: 'Mikrotik CCR1036', brand: 'Mikrotik' }
                ] 
            },
            { 
                id: 12, name: 'Switch Manageable', classification: 'asset', trackingMethod: 'individual', unitOfMeasure: 'Unit',
                standardItems: [
                    { id: 121, name: 'Cisco Catalyst 2960', brand: 'Cisco' },
                    { id: 122, name: 'Ubiquiti EdgeSwitch', brand: 'Ubiquiti' }
                ] 
            }
        ]
    },
    {
        id: 2, name: 'Perangkat Pelanggan (CPE)', isCustomerInstallable: true, associatedDivisions: [3, 4, 6],
        types: [
            { 
                id: 21, name: 'ONT/ONU', classification: 'asset', trackingMethod: 'individual', unitOfMeasure: 'Unit',
                standardItems: [
                    { id: 211, name: 'Huawei HG8245H', brand: 'Huawei' }, 
                    { id: 212, name: 'ZTE F609', brand: 'ZTE' },
                    { id: 213, name: 'FiberHome HG6243C', brand: 'FiberHome' }
                ] 
            },
            { 
                id: 22, name: 'Access Point', classification: 'asset', trackingMethod: 'individual', unitOfMeasure: 'Unit',
                standardItems: [
                    { id: 221, name: 'Unifi AP AC Lite', brand: 'Ubiquiti' },
                    { id: 222, name: 'Ruijie RG-RAP2200', brand: 'Ruijie' }
                ] 
            }
        ]
    },
    {
        id: 3, name: 'Infrastruktur Fiber Optik', isCustomerInstallable: true, associatedDivisions: [3, 4, 6],
        types: [
            { 
                id: 31, 
                name: 'Kabel Dropcore', 
                classification: 'material', 
                trackingMethod: 'bulk', 
                unitOfMeasure: 'Hasbal', // Satuan Fisik
                standardItems: [{ 
                    id: 311, 
                    name: 'Dropcore 1 Core Precon', 
                    brand: 'FiberHome',
                    bulkType: 'measurement',
                    unitOfMeasure: 'Hasbal',      
                    baseUnitOfMeasure: 'Meter',   // Satuan Eceran
                    quantityPerUnit: 1000         // 1 Hasbal = 1000 Meter
                }, {
                    id: 312, 
                    name: 'Dropcore 2 Core', 
                    brand: 'Global',
                    bulkType: 'measurement',
                    unitOfMeasure: 'Drum',
                    baseUnitOfMeasure: 'Meter',
                    quantityPerUnit: 2000
                }] 
            },
            { 
                id: 32, 
                name: 'Aksesoris FO', 
                classification: 'material', 
                trackingMethod: 'bulk', 
                unitOfMeasure: 'Pack',
                standardItems: [{ 
                    id: 321, 
                    name: 'Fast Connector SC/UPC', 
                    brand: 'Generic',
                    bulkType: 'count', // Hitung bijian langsung
                    unitOfMeasure: 'Pcs'
                }, { 
                    id: 322, 
                    name: 'Protection Sleeve', 
                    brand: 'Generic',
                    bulkType: 'count',
                    unitOfMeasure: 'Pcs'
                }] 
            }
        ]
    },
    {
        id: 4, name: 'Alat Kerja & Tools', isCustomerInstallable: false, associatedDivisions: [1, 2, 3, 4, 6],
        types: [
            { id: 41, name: 'Splicer', classification: 'asset', trackingMethod: 'individual', unitOfMeasure: 'Unit', standardItems: [{ id: 411, name: 'Fusion Splicer 90S', brand: 'Fujikura' }] },
            { id: 42, name: 'OTDR', classification: 'asset', trackingMethod: 'individual', unitOfMeasure: 'Unit', standardItems: [{ id: 421, name: 'OTDR MaxTester', brand: 'Exfo' }] }
        ]
    }
];

// 3. ASSETS (INVENTORY SNAPSHOT)
export const mockAssets: Asset[] = [
    // [A] PERANGKAT CORE (Di Gudang & Terpakai)
    { 
        id: 'AST-RTR-001', name: 'Mikrotik CCR1009', category: 'Perangkat Jaringan (Core)', type: 'Router Core', brand: 'Mikrotik', 
        serialNumber: 'SN-MK-001', status: AssetStatus.IN_STORAGE, condition: AssetCondition.BRAND_NEW, 
        location: 'Gudang Utama', locationDetail: 'Rak A-1', registrationDate: d(-120), recordedBy: 'Siti Logistik', 
        purchasePrice: 7500000, attachments: [], activityLog: [] 
    },
    { 
        id: 'AST-RTR-002', name: 'Mikrotik CCR1036', category: 'Perangkat Jaringan (Core)', type: 'Router Core', brand: 'Mikrotik', 
        serialNumber: 'SN-MK-002', status: AssetStatus.IN_USE, currentUser: 'Rudi Leader', condition: AssetCondition.GOOD, 
        location: 'Data Center Lt.1', registrationDate: d(-365), recordedBy: 'Siti Logistik', 
        purchasePrice: 15000000, attachments: [], activityLog: [] 
    },

    // [B] CPE (Modem Pelanggan)
    // 1. Terpasang di Pelanggan
    { 
        id: 'AST-CPE-001', name: 'Huawei HG8245H', category: 'Perangkat Pelanggan (CPE)', type: 'ONT/ONU', brand: 'Huawei', 
        serialNumber: 'HW-001-INST', status: AssetStatus.IN_USE, currentUser: 'CUST-001', condition: AssetCondition.USED_OKAY, 
        location: 'Terpasang di: PT. Maju Jaya', registrationDate: d(-90), recordedBy: 'Siti Logistik', 
        purchasePrice: 450000, attachments: [], activityLog: [], woRoIntNumber: 'RO-HIST-001'
    },
    // 2. Ready Stock
    { 
        id: 'AST-CPE-002', name: 'Huawei HG8245H', category: 'Perangkat Pelanggan (CPE)', type: 'ONT/ONU', brand: 'Huawei', 
        serialNumber: 'HW-002-STK', status: AssetStatus.IN_STORAGE, condition: AssetCondition.BRAND_NEW, 
        location: 'Gudang Utama', locationDetail: 'Rak B-2', registrationDate: d(-10), recordedBy: 'Siti Logistik', 
        purchasePrice: 450000, attachments: [], activityLog: [], woRoIntNumber: 'RO-HIST-002'
    },
    // 3. Rusak (Perlu Repair)
    { 
        id: 'AST-CPE-003', name: 'ZTE F609', category: 'Perangkat Pelanggan (CPE)', type: 'ONT/ONU', brand: 'ZTE', 
        serialNumber: 'ZTE-BROKEN-01', status: AssetStatus.DAMAGED, condition: AssetCondition.MAJOR_DAMAGE, 
        location: 'Gudang Retur', registrationDate: d(-200), recordedBy: 'Siti Logistik', 
        purchasePrice: 350000, attachments: [], activityLog: [], notes: 'Kena petir'
    },
    // 4. Sedang di Vendor (Service)
    { 
        id: 'AST-CPE-004', name: 'ZTE F609', category: 'Perangkat Pelanggan (CPE)', type: 'ONT/ONU', brand: 'ZTE', 
        serialNumber: 'ZTE-SVC-01', status: AssetStatus.OUT_FOR_REPAIR, condition: AssetCondition.MINOR_DAMAGE, 
        location: 'Vendor Service Center', registrationDate: d(-180), recordedBy: 'Siti Logistik', 
        purchasePrice: 350000, attachments: [], activityLog: [], notes: 'Dikirim tgl 20/10'
    },

    // [C] MATERIAL MEASUREMENT (KABEL) - Skenario Sisa Meteran
    { 
        id: 'MAT-CBL-001', 
        name: 'Dropcore 1 Core Precon', 
        category: 'Infrastruktur Fiber Optik', 
        type: 'Kabel Dropcore', 
        brand: 'FiberHome', 
        status: AssetStatus.IN_STORAGE, // Fisik 1 Hasbal masih ada
        condition: AssetCondition.BRAND_NEW, 
        location: 'Gudang Kabel', 
        registrationDate: d(-30), 
        recordedBy: 'Siti Logistik', 
        purchasePrice: 1500000, 
        initialBalance: 1000, // Awal 1000m
        currentBalance: 850,  // Sisa 850m (150m terpasang di CUST-001)
        attachments: [], activityLog: [] 
    },
    // Kabel Baru (Full)
    { 
        id: 'MAT-CBL-002', name: 'Dropcore 1 Core Precon', category: 'Infrastruktur Fiber Optik', type: 'Kabel Dropcore', brand: 'FiberHome', 
        status: AssetStatus.IN_STORAGE, condition: AssetCondition.BRAND_NEW, location: 'Gudang Kabel', 
        registrationDate: d(-5), recordedBy: 'Siti Logistik', 
        initialBalance: 1000, currentBalance: 1000, 
        attachments: [], activityLog: [] 
    },

    // [D] MATERIAL COUNT (KONEKTOR)
    { 
        id: 'MAT-CON-001', name: 'Fast Connector SC/UPC', category: 'Infrastruktur Fiber Optik', type: 'Aksesoris FO', brand: 'Generic', 
        status: AssetStatus.IN_STORAGE, condition: AssetCondition.BRAND_NEW, location: 'Gudang Aksesoris', 
        registrationDate: d(-20), recordedBy: 'Siti Logistik', 
        initialBalance: 100, currentBalance: 50, // Sisa 50 pcs dari 1 Box
        attachments: [], activityLog: [] 
    },

    // [E] ALAT KERJA (PINJAMAN)
    { 
        id: 'AST-TOOL-001', name: 'Fusion Splicer 90S', category: 'Alat Kerja & Tools', type: 'Splicer', brand: 'Fujikura', 
        serialNumber: 'SN-FUJI-999', status: AssetStatus.IN_USE, currentUser: 'Dedi Teknisi', condition: AssetCondition.GOOD, 
        location: 'Lapangan (Tim Dedi)', registrationDate: d(-365), recordedBy: 'Siti Logistik', 
        purchasePrice: 85000000, attachments: [], activityLog: [] 
    }
];

// 4. REQUESTS (Scenario Flow)
export const initialMockRequests: Request[] = [
    // [Scenario 1]: Request yang sudah selesai, barang sudah jadi aset
    {
        id: 'RO-HIST-001', docNumber: 'RO-250801-001', requester: 'Rudi Leader', division: 'Network Engineering',
        requestDate: d(-95), status: ItemStatus.COMPLETED,
        order: { type: 'Project Based', project: 'Expansion Area A' },
        items: [{ id: 1, itemName: 'Huawei HG8245H', itemTypeBrand: 'Huawei', quantity: 20, keterangan: 'Project A', unit: 'Unit' }],
        isRegistered: true, logisticApprover: 'Siti Logistik', finalApprover: 'Budi Santoso'
    },
    // [Scenario 2]: Request baru, status BARANG TIBA -> Perlu Staging (Actionable for Admin Logistik)
    {
        id: 'RO-NEW-002', docNumber: 'RO-251010-002', requester: 'Siti Logistik', division: 'Logistik & Gudang',
        requestDate: d(-7), status: ItemStatus.ARRIVED, arrivalDate: d(0),
        order: { type: 'Regular Stock' },
        items: [
            { id: 1, itemName: 'Dropcore 1 Core Precon', itemTypeBrand: 'FiberHome', quantity: 10, keterangan: 'Restock Gudang', unit: 'Hasbal' }
        ],
        purchaseDetails: {
            1: { purchasePrice: 1500000, vendor: 'PT. Fiberindo', poNumber: 'PO-2510-001', invoiceNumber: 'INV-888', purchaseDate: d(-3), filledBy: 'Andi Purchase', fillDate: d(-2) }
        },
        isRegistered: false // Ini trigger tombol "Catat Aset" di Dashboard
    },
    // [Scenario 3]: Request Pending (Actionable for Logistic Approval)
    {
        id: 'RO-PEND-003', docNumber: 'RO-251015-003', requester: 'Dedi Teknisi', division: 'Technical Support',
        requestDate: d(0), status: ItemStatus.PENDING,
        order: { type: 'Regular Stock' },
        items: [
            { id: 1, itemName: 'Unifi AP AC Lite', itemTypeBrand: 'Ubiquiti', quantity: 2, keterangan: 'Ganti unit rusak di client', unit: 'Unit' }
        ]
    }
];

// 5. CUSTOMERS (CRM)
export const mockCustomers: Customer[] = [
    {
        id: 'CUST-001', name: 'PT. Maju Jaya', address: 'Jl. Sudirman Kav 50, Jakarta', phone: '021-555001', email: 'admin@majujaya.com',
        status: CustomerStatus.ACTIVE, servicePackage: 'Dedicated 100Mbps', installationDate: d(-90),
        installedMaterials: [
            { itemName: 'Dropcore 1 Core Precon', brand: 'FiberHome', quantity: 150, unit: 'Meter', installationDate: d(-90) },
            { itemName: 'Fast Connector SC/UPC', brand: 'Generic', quantity: 2, unit: 'Pcs', installationDate: d(-90) }
        ]
    },
    {
        id: 'CUST-002', name: 'Cafe Kopi Senja', address: 'Jl. Melawai Raya No 5, Jakarta', phone: '08129999888', email: 'owner@kopisenja.com',
        status: CustomerStatus.ACTIVE, servicePackage: 'Broadband 50Mbps', installationDate: d(-45),
        installedMaterials: [
            { itemName: 'Dropcore 1 Core Precon', brand: 'FiberHome', quantity: 80, unit: 'Meter', installationDate: d(-45) }
        ]
    },
    {
        id: 'CUST-003', name: 'Ruko Indah Makmur (Tutup)', address: 'Komp. Ruko Blok B No 12', phone: '021-777888', email: 'admin@ruko.com',
        status: CustomerStatus.INACTIVE, servicePackage: 'Broadband 20Mbps', installationDate: d(-200),
        installedMaterials: [] // Sudah dismantle
    }
];

// 6. TRANSAKSI (Sirkulasi Aset)
export const mockInstallations: Installation[] = [
    {
        id: 'INST-001', docNumber: 'WO-IKR-250701-001', installationDate: d(-90), technician: 'Dedi Teknisi',
        customerId: 'CUST-001', customerName: 'PT. Maju Jaya', status: ItemStatus.COMPLETED,
        assetsInstalled: [ { assetId: 'AST-CPE-001', assetName: 'Huawei HG8245H', serialNumber: 'HW-001-INST' } ],
        materialsUsed: [
             { itemName: 'Dropcore 1 Core Precon', brand: 'FiberHome', quantity: 150, unit: 'Meter' },
             { itemName: 'Fast Connector SC/UPC', brand: 'Generic', quantity: 2, unit: 'Pcs' }
        ],
        notes: 'Instalasi standard. Redaman -19dBm.'
    }
];

export const mockMaintenances: Maintenance[] = [
    { 
        id: 'MNT-001', docNumber: 'WO-MT-251010-001', requestNumber: 'TICKET-99', maintenanceDate: d(-5), 
        technician: 'Eko Teknisi', customerId: 'CUST-002', customerName: 'Cafe Kopi Senja', 
        problemDescription: 'LOS Merah, kabel putus digigit tikus', actionsTaken: 'Splicing ulang kabel dropcore', 
        workTypes: ['Splicing FO'], priority: 'Tinggi', status: ItemStatus.COMPLETED, completedBy: 'Siti Logistik', completionDate: d(-5),
        materialsUsed: [{ itemName: 'Protection Sleeve', brand: 'Generic', quantity: 1, unit: 'Pcs' }],
        notes: 'Kabel sudah dirapikan.'
    }
];

export const mockDismantles: Dismantle[] = [
    {
        id: 'DSM-001', docNumber: 'WO-DSM-250901-001', dismantleDate: d(-30), technician: 'Dedi Teknisi',
        customerId: 'CUST-003', customerName: 'Ruko Indah Makmur', customerAddress: 'Komp. Ruko Blok B No 12',
        assetId: 'AST-CPE-OLD-99', assetName: 'ZTE F609', retrievedCondition: AssetCondition.GOOD,
        status: ItemStatus.COMPLETED, acknowledger: 'Siti Logistik', notes: 'Pelanggan tutup usaha.'
    }
];

// 7. LOANS (Peminjaman Internal)
export const mockLoanRequests: LoanRequest[] = [
    {
        id: 'RL-250601-001', requester: 'Dedi Teknisi', division: 'Technical Support', requestDate: d(-130),
        status: LoanRequestStatus.ON_LOAN,
        items: [{ id: 1, itemName: 'Fusion Splicer 90S', brand: 'Fujikura', quantity: 1, keterangan: 'Alat kerja tim', returnDate: null }],
        assignedAssetIds: { 1: ['AST-TOOL-001'] }, approver: 'Siti Logistik', approvalDate: d(-130)
    }
];

export const mockReturns: AssetReturn[] = []; // Belum ada return pending

export const mockHandovers: Handover[] = [
    {
        id: 'HO-001', docNumber: 'HO-250601-001', handoverDate: d(-130), menyerahkan: 'Siti Logistik', penerima: 'Dedi Teknisi', mengetahui: 'Budi Santoso',
        status: ItemStatus.COMPLETED, woRoIntNumber: 'RL-250601-001',
        items: [{ id: 1, assetId: 'AST-TOOL-001', itemName: 'Fusion Splicer 90S', itemTypeBrand: 'Fujikura', conditionNotes: 'Baik', quantity: 1, checked: true }]
    }
];

// 8. STOCK MOVEMENTS (Audit Trail Logistik)
export const mockStockMovements: StockMovement[] = [
    // Beli Kabel 1000m
    {
        id: 'MOV-001', assetName: 'Dropcore 1 Core Precon', brand: 'FiberHome', date: d(-120), type: 'IN_PURCHASE', 
        quantity: 1000, balanceAfter: 1000, actor: 'Siti Logistik', notes: 'Stok Awal RO-HIST-000'
    },
    // Pasang di CUST-001 (150m)
    {
        id: 'MOV-002', assetName: 'Dropcore 1 Core Precon', brand: 'FiberHome', date: d(-90), type: 'OUT_INSTALLATION', 
        quantity: 150, balanceAfter: 850, actor: 'Dedi Teknisi', notes: 'Instalasi CUST-001'
    }
];

// 9. NOTIFICATIONS
export const mockNotifications: Notification[] = [
    {
        id: 1, recipientId: 2, actorName: 'Dedi Teknisi', type: 'REQUEST_CREATED', 
        referenceId: 'RO-PEND-003', message: 'membuat permintaan aset baru.', isRead: false, timestamp: d(0)
    },
    {
        id: 2, recipientId: 2, actorName: 'System', type: 'ASSET_DAMAGED_REPORT', 
        referenceId: 'AST-CPE-003', message: 'Laporan kerusakan baru dari Dedi Teknisi.', isRead: false, timestamp: d(-1)
    }
];
