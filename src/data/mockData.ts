
// ... existing imports ...
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

// ... existing users, divisions, categories, assets, customers ...
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
                unitOfMeasure: 'Hasbal', 
                standardItems: [{ 
                    id: 311, 
                    name: 'Dropcore 1 Core', 
                    brand: 'FiberHome',
                    bulkType: 'measurement',
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

export const mockAssets: Asset[] = [
    { id: 'AST-001', name: 'Mikrotik CCR1009', category: 'Perangkat Jaringan (Core)', type: 'Router Core', brand: 'Mikrotik', serialNumber: 'SN-MK-001', status: AssetStatus.IN_STORAGE, condition: AssetCondition.BRAND_NEW, location: 'Gudang Utama', registrationDate: d(-10), recordedBy: 'Admin Logistik', purchasePrice: 7500000, attachments: [], activityLog: [] },
    { id: 'AST-002', name: 'Huawei HG8245H', category: 'Perangkat Pelanggan (CPE)', type: 'ONT/ONU', brand: 'Huawei', serialNumber: 'SN-HW-A01', status: AssetStatus.IN_STORAGE, condition: AssetCondition.GOOD, location: 'Rak A-2', registrationDate: d(-20), recordedBy: 'Admin Logistik', purchasePrice: 450000, attachments: [], activityLog: [] },
    
    { 
        id: 'AST-003', 
        name: 'Fusion Splicer 90S', 
        category: 'Alat Kerja', 
        type: 'Splicer', 
        brand: 'Fujikura', 
        serialNumber: 'SN-FJ-99', 
        status: AssetStatus.IN_USE, 
        condition: AssetCondition.GOOD, 
        currentUser: 'Staff Teknisi', 
        location: 'Mobil Tim 1', 
        registrationDate: d(-365), 
        recordedBy: 'Admin Logistik', 
        purchasePrice: 85000000, 
        attachments: [
            { id: 1, name: 'Invoice_Pembelian.pdf', url: '#', type: 'pdf' },
            { id: 2, name: 'Foto_Fisik_Baru.jpg', url: 'https://via.placeholder.com/300x200.png?text=Fisik+Baru', type: 'image' },
            { id: 3, name: 'Laporan_Service_Nov.pdf', url: '#', type: 'pdf' }
        ], 
        activityLog: [
            { id: 1, action: 'Aset Dicatat', user: 'Admin Logistik', timestamp: d(-365), details: 'Pembelian awal dari Vendor GlobalTek.', referenceId: 'PO-001' },
            { id: 2, action: 'Serah Terima Internal', user: 'Admin Logistik', timestamp: d(-360), details: 'Diserahkan ke Staff Teknisi untuk operasional.', referenceId: generateId('HO', -360, '0001') },
            { id: 3, action: 'Kerusakan Dilaporkan', user: 'Staff Teknisi', timestamp: d(-180), details: 'Motor pemotong tidak presisi. Perlu kalibrasi.', referenceId: '' },
            { id: 4, action: 'Proses Perbaikan Dimulai', user: 'Admin Logistik', timestamp: d(-178), details: 'Dikirim ke Service Center Resmi Fujikura.', referenceId: 'REP-001' },
            { id: 5, action: 'Perbaikan Selesai', user: 'Admin Logistik', timestamp: d(-170), details: 'Unit diterima kembali. Kalibrasi selesai. Biaya Rp 2.500.000.', referenceId: 'REP-001' },
            { id: 6, action: 'Serah Terima Internal', user: 'Admin Logistik', timestamp: d(-169), details: 'Diserahkan kembali ke Staff Teknisi.', referenceId: generateId('HO', -169, '0002') },
        ] 
    },
    
    { id: 'AST-004', name: 'ZTE F609', category: 'Perangkat Pelanggan (CPE)', type: 'ONT/ONU', brand: 'ZTE', serialNumber: 'SN-ZTE-55', status: AssetStatus.IN_USE, condition: AssetCondition.USED_OKAY, currentUser: 'CUST-001', location: 'Terpasang di: PT. Maju Jaya', registrationDate: d(-50), recordedBy: 'Admin Logistik', purchasePrice: 300000, attachments: [], activityLog: [] },

    { 
        id: 'AST-005', 
        name: 'OTDR MaxTester', 
        category: 'Alat Kerja', 
        type: 'OTDR', 
        brand: 'Exfo', 
        serialNumber: 'SN-EX-88', 
        status: AssetStatus.DAMAGED, 
        condition: AssetCondition.MAJOR_DAMAGE, 
        location: 'Meja Teknisi', 
        registrationDate: d(-200), 
        recordedBy: 'Admin Logistik', 
        purchasePrice: 45000000, 
        notes: 'Layar pecah terjatuh', 
        attachments: [
            { id: 1, name: 'Bukti_Kerusakan_Layar.jpg', url: 'https://via.placeholder.com/300x200.png?text=Layar+Pecah', type: 'image' }
        ], 
        activityLog: [
            { id: 1, action: 'Aset Dicatat', user: 'Admin Logistik', timestamp: d(-200), details: 'Unit baru.', referenceId: 'PO-005' },
            { id: 2, action: 'Kerusakan Dilaporkan', user: 'Staff Teknisi', timestamp: d(-1), details: 'Layar pecah saat operasional karena terjatuh.', referenceId: '' }
        ] 
    },
    
    { id: 'AST-006', name: 'Mikrotik CCR1009', category: 'Perangkat Jaringan (Core)', type: 'Router Core', brand: 'Mikrotik', serialNumber: 'SN-MK-002', status: AssetStatus.OUT_FOR_REPAIR, condition: AssetCondition.MINOR_DAMAGE, location: 'Service Center Jakarta', registrationDate: d(-150), recordedBy: 'Admin Logistik', purchasePrice: 7500000, attachments: [], activityLog: [{ id: 2, action: 'Proses Perbaikan Dimulai', user: 'Admin Logistik', timestamp: d(-5), details: 'Dikirim ke vendor service.' }] },

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
        currentBalance: 1000, 
        attachments: [], 
        activityLog: [] 
    },
    { id: 'MAT-002', name: 'Adaptor SC-UPC', category: 'Infrastruktur Fiber Optik', type: 'Konektor / Adaptor', brand: 'Generic', status: AssetStatus.IN_STORAGE, condition: AssetCondition.BRAND_NEW, location: 'Gudang Acc', registrationDate: d(-10), recordedBy: 'Admin Logistik', purchasePrice: 5000, attachments: [], activityLog: [] },

    { id: 'AST-MIK-001', name: 'Mikrotik CCR1009', category: 'Perangkat Jaringan (Core)', type: 'Router Core', brand: 'Mikrotik', serialNumber: 'SN-MIK-001', status: AssetStatus.IN_STORAGE, condition: AssetCondition.BRAND_NEW, location: 'Gudang Utama', registrationDate: d(0), recordedBy: 'Admin Logistik', purchasePrice: 7500000, attachments: [], activityLog: [], woRoIntNumber: 'RO-260101-0005' },
    { id: 'AST-MIK-002', name: 'Mikrotik CCR1009', category: 'Perangkat Jaringan (Core)', type: 'Router Core', brand: 'Mikrotik', serialNumber: 'SN-MIK-002', status: AssetStatus.IN_STORAGE, condition: AssetCondition.BRAND_NEW, location: 'Gudang Utama', registrationDate: d(0), recordedBy: 'Admin Logistik', purchasePrice: 7500000, attachments: [], activityLog: [], woRoIntNumber: 'RO-260101-0005' }
];

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

export const mockMaintenances: Maintenance[] = [
    { 
        id: generateId('MNT', -2, '0001'), 
        docNumber: generateId('MNT', -2, '0001'), 
        maintenanceDate: d(-2), 
        technician: 'Staff Teknisi', customerId: 'CUST-001', customerName: 'PT. Maju Jaya', 
        problemDescription: 'Internet mati total', actionsTaken: 'Splicing ulang kabel putus', workTypes: ['Splicing FO'], 
        status: ItemStatus.COMPLETED, completedBy: 'Admin Logistik',
        notes: 'Pekerjaan selesai dengan baik. Kabel sudah dirapikan kembali.',
        attachments: [
            { id: 1, name: 'Foto_Kabel_Putus.jpg', url: 'https://via.placeholder.com/300x200.png?text=Kabel+Putus', type: 'image' },
            { id: 2, name: 'Foto_Hasil_Splicing.jpg', url: 'https://via.placeholder.com/300x200.png?text=Hasil+Splicing', type: 'image' },
            { id: 3, name: 'Berita_Acara_Fisik.pdf', url: '#', type: 'pdf' }
        ]
    }
];

export const initialMockRequests: Request[] = [
    {
        id: 'RO-240101-0001',
        docNumber: 'RO-240101-0001',
        requester: 'Staff Teknisi',
        division: 'Technical Support',
        requestDate: d(-5),
        status: ItemStatus.PENDING,
        order: { type: 'Regular Stock' },
        items: [
            { id: 1, itemName: 'Dropcore 1 Core', itemTypeBrand: 'FiberHome', quantity: 10, keterangan: 'Stok menipis' }
        ],
        activityLog: []
    }
];

export const mockHandovers: Handover[] = [
    {
        id: 'HO-001',
        docNumber: 'HO-240110-001',
        handoverDate: d(-10),
        menyerahkan: 'Admin Logistik',
        penerima: 'Staff Teknisi',
        mengetahui: 'Super Admin',
        status: ItemStatus.COMPLETED,
        items: [
             { id: 1, assetId: 'AST-003', itemName: 'Fusion Splicer 90S', itemTypeBrand: 'Fujikura', conditionNotes: 'Baik', quantity: 1, checked: true }
        ]
    }
];

export const mockDismantles: Dismantle[] = [
    {
        id: 'DSM-001',
        docNumber: 'WO-DSM-240120-001',
        dismantleDate: d(-1),
        technician: 'Staff Teknisi',
        customerId: 'CUST-003',
        customerName: 'Ruko Indah Makmur',
        customerAddress: 'Komp. Ruko Blok B',
        assetId: 'AST-005',
        assetName: 'OTDR MaxTester', 
        retrievedCondition: AssetCondition.MAJOR_DAMAGE,
        status: ItemStatus.IN_PROGRESS,
        notes: 'Ditarik karena pelanggan suspend service. Unit dalam kondisi fisik kurang baik, casing retak.',
        acknowledger: null,
        attachments: [
            { id: 1, name: 'Foto_Kondisi_Fisik.jpg', url: 'https://via.placeholder.com/300x200.png?text=Fisik+Retak', type: 'image' },
            { id: 2, name: 'BAST_Penarikan.pdf', url: '#', type: 'pdf' }
        ]
    }
];

export const mockNotifications: Notification[] = [
    {
        id: 1,
        recipientId: 2, 
        actorName: 'Staff Teknisi',
        type: 'REQUEST_CREATED',
        referenceId: 'RO-240101-0001',
        message: 'membuat permintaan aset baru.',
        isRead: false,
        timestamp: d(0)
    }
];

export const mockLoanRequests: LoanRequest[] = [
    {
        id: 'RL-240105-0001',
        requester: 'Staff Teknisi',
        division: 'Technical Support',
        requestDate: d(-2),
        status: LoanRequestStatus.PENDING,
        items: [
            { id: 1, itemName: 'Fusion Splicer 90S', brand: 'Fujikura', quantity: 1, keterangan: 'Peminjaman untuk project A', returnDate: d(5) }
        ]
    }
];

export const mockInstallations: Installation[] = [
    {
        id: 'INST-001',
        docNumber: 'WO-IKR-240115-001',
        installationDate: d(-5),
        technician: 'Staff Teknisi',
        customerId: 'CUST-001',
        customerName: 'PT. Maju Jaya',
        assetsInstalled: [
            { assetId: 'AST-004', assetName: 'ZTE F609' }
        ],
        materialsUsed: [
             { itemName: 'Dropcore 1 Core', brand: 'FiberHome', quantity: 150, unit: 'Meter' }
        ],
        status: ItemStatus.COMPLETED,
        notes: 'Instalasi berjalan lancar.'
    }
];

export const mockReturns: AssetReturn[] = [];

export const mockStockMovements: StockMovement[] = [
    {
        id: 'MOV-001',
        assetName: 'Dropcore 1 Core',
        brand: 'FiberHome',
        date: d(-30),
        type: 'IN_PURCHASE',
        quantity: 1000,
        balanceAfter: 1000,
        actor: 'Admin Logistik',
        notes: 'Stok Awal'
    }
];
