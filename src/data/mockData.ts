

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
    User
} from '../types';
import {
    ADMIN_LOGISTIK_PERMISSIONS,
    ADMIN_PURCHASE_PERMISSIONS,
    LEADER_PERMISSIONS,
    STAFF_PERMISSIONS,
    SUPER_ADMIN_PERMISSIONS
} from '../utils/permissions';

// Helper function untuk tanggal dinamis
const getDate = (daysOffset: number): Date => {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    return date;
};

// Format Date to ISO String
const d = (days: number) => getDate(days).toISOString();

// --- 1. KATEGORI ASET & MATERIAL ---

export const initialAssetCategories: AssetCategory[] = [
    {
        id: 1, 
        name: 'Perangkat Jaringan (Core)', 
        isCustomerInstallable: false, 
        associatedDivisions: [1, 2],
        types: [
            { 
                id: 1, 
                name: 'Router Core', 
                classification: 'asset',
                trackingMethod: 'individual',
                unitOfMeasure: 'unit',
                standardItems: [{ id: 1, name: 'Router Core RB4011iGS+', brand: 'Mikrotik' }, { id: 2, name: 'CCR1009-7G-1C-1S+', brand: 'Mikrotik' }] 
            },
            { 
                id: 2, 
                name: 'Switch Aggregation', 
                classification: 'asset',
                trackingMethod: 'individual',
                unitOfMeasure: 'unit',
                standardItems: [{ id: 3, name: 'Switch CRS326-24G-2S+', brand: 'Mikrotik' }] 
            },
            { 
                id: 3, 
                name: 'OLT', 
                classification: 'asset',
                trackingMethod: 'individual',
                unitOfMeasure: 'unit',
                standardItems: [{ id: 4, name: 'OLT Hioso 4 Port', brand: 'Hioso' }, { id: 5, name: 'OLT ZTE C320', brand: 'ZTE' }] 
            },
        ]
    },
    {
        id: 2, 
        name: 'Perangkat Pelanggan (CPE)', 
        isCustomerInstallable: true, 
        associatedDivisions: [1, 3],
        types: [
            { 
                id: 4, 
                name: 'ONT/ONU', 
                classification: 'asset',
                trackingMethod: 'individual',
                unitOfMeasure: 'unit',
                standardItems: [
                    { id: 6, name: 'ONT HG8245H', brand: 'Huawei' }, 
                    { id: 7, name: 'ONT F609', brand: 'ZTE' }, 
                    { id: 8, name: 'ONT EG8141A5', brand: 'Huawei' }
                ] 
            },
            { 
                id: 5, 
                name: 'Router WiFi', 
                classification: 'asset',
                trackingMethod: 'individual',
                unitOfMeasure: 'unit',
                standardItems: [
                    { id: 9, name: 'Router WR840N', brand: 'TP-Link' }, 
                    { id: 10, name: 'Archer C54', brand: 'TP-Link' },
                    // Added for Stock Simulation
                    { id: 99, name: 'Mercusys MW302R', brand: 'Mercusys' } 
                ] 
            },
            {
                id: 20,
                name: 'Media Converter',
                classification: 'asset',
                trackingMethod: 'individual',
                unitOfMeasure: 'set',
                standardItems: [
                    { id: 100, name: 'Converter HTB-3100', brand: 'NetLink' }
                ]
            }
        ]
    },
    {
        id: 3, 
        name: 'Infrastruktur Fiber Optik (Material)', 
        isCustomerInstallable: true, 
        associatedDivisions: [3],
        types: [
            { 
                id: 6, 
                name: 'Kabel Dropcore (Hasbal/Drum)', 
                classification: 'material',
                trackingMethod: 'bulk', 
                unitOfMeasure: 'Roll', 
                baseUnitOfMeasure: 'Meter', 
                quantityPerUnit: 1000, 
                standardItems: [{ id: 11, name: 'Dropcore 1 Core (Hasbal)', brand: 'FiberHome' }] 
            },
            { 
                id: 7, 
                name: 'Kabel Dropcore (Pre-con)', 
                classification: 'material',
                trackingMethod: 'bulk', 
                unitOfMeasure: 'Pcs', 
                baseUnitOfMeasure: 'Pcs', 
                quantityPerUnit: 1, 
                standardItems: [
                    { id: 12, name: 'Dropcore Pre-con 150m', brand: 'FiberHome' },
                    { id: 13, name: 'Dropcore Pre-con 100m', brand: 'FiberHome' }
                ] 
            },
            { 
                id: 8, 
                name: 'Aksesoris Koneksi', 
                classification: 'material',
                trackingMethod: 'bulk', 
                unitOfMeasure: 'Pcs', 
                baseUnitOfMeasure: 'Pcs', 
                quantityPerUnit: 1, 
                standardItems: [
                    { id: 14, name: 'Adaptor SC-UPC', brand: 'Generic' },
                    { id: 15, name: 'Fast Connector SC-UPC', brand: 'Generic' },
                    { id: 16, name: 'Patchcord SC-UPC 3m', brand: 'Generic' },
                    // Added for Stock Simulation
                    { id: 101, name: 'Splitter PLC 1:8', brand: 'Passive' }
                ] 
            },
        ]
    },
    {
        id: 5, 
        name: 'Alat Kerja Lapangan', 
        isCustomerInstallable: false, 
        associatedDivisions: [3],
        types: [
            { 
                id: 10, 
                name: 'Fusion Splicer', 
                classification: 'asset',
                trackingMethod: 'individual',
                unitOfMeasure: 'unit',
                standardItems: [{ id: 17, name: 'Fusion Splicer 90S', brand: 'Fujikura' }, { id: 18, name: 'Fusion Splicer AI-9', brand: 'Signal Fire' }] 
            },
            { 
                id: 11, 
                name: 'Optical Power Meter (OPM)', 
                classification: 'asset',
                trackingMethod: 'individual',
                unitOfMeasure: 'unit',
                standardItems: [{ id: 19, name: 'OPM Joinwit', brand: 'Joinwit' }] 
            },
             { 
                id: 12, 
                name: 'Fiber Cleaver', 
                classification: 'asset',
                trackingMethod: 'individual',
                unitOfMeasure: 'unit',
                standardItems: [{ id: 98, name: 'Fiber Cleaver', brand: 'Generic' }] 
            },
        ]
    },
    {
        id: 6, 
        name: 'Aset Kantor', 
        isCustomerInstallable: false, 
        associatedDivisions: [],
        types: [
            { 
                id: 14, 
                name: 'PC Desktop', 
                classification: 'asset',
                trackingMethod: 'individual',
                unitOfMeasure: 'unit',
                standardItems: [{ id: 20, name: 'PC Dell Optiplex', brand: 'Dell' }] 
            },
             { 
                id: 15, 
                name: 'Laptop', 
                classification: 'asset',
                trackingMethod: 'individual',
                unitOfMeasure: 'unit',
                standardItems: [{ id: 21, name: 'ThinkPad X1 Carbon', brand: 'Lenovo' }, { id: 22, name: 'MacBook Air M1', brand: 'Apple' }] 
            },
        ]
    }
];

// --- 2. DIVISI ---

export const mockDivisions: Division[] = [
    { id: 1, name: 'Network Engineering' },
    { id: 2, name: 'NOC (Network Operation Center)' },
    { id: 3, name: 'Technical Support' },
    { id: 4, name: 'Logistik & Gudang' },
    { id: 5, name: 'Management' },
    { id: 6, name: 'Purchase' },
    { id: 7, name: 'HR & GA' },
];

// --- 3. PENGGUNA ---

export const initialMockUsers: User[] = [
    { id: 1, name: 'Super Admin User', email: 'super.admin@triniti.com', divisionId: 5, role: 'Super Admin', permissions: SUPER_ADMIN_PERMISSIONS },
    { id: 2, name: 'Admin Purchase User', email: 'purchase.admin@triniti.com', divisionId: 6, role: 'Admin Purchase', permissions: ADMIN_PURCHASE_PERMISSIONS },
    { id: 3, name: 'Admin Logistik User', email: 'logistik.admin@triniti.com', divisionId: 4, role: 'Admin Logistik', permissions: ADMIN_LOGISTIK_PERMISSIONS },
    { id: 4, name: 'Leader User', email: 'leader.user@triniti.com', divisionId: 1, role: 'Leader', permissions: LEADER_PERMISSIONS },
    { id: 5, name: 'Staff User', email: 'staff.user@triniti.com', divisionId: 3, role: 'Staff', permissions: STAFF_PERMISSIONS },
    { id: 6, name: 'Teknisi Lapangan A', email: 'teknisi.a@triniti.com', divisionId: 3, role: 'Staff', permissions: STAFF_PERMISSIONS },
];

// --- 4. PELANGGAN ---

export const mockCustomers: Customer[] = [
    {
        id: 'TMI-CUST-001', name: 'Budi Santoso (Home)', address: 'Jl. Meruya Ilir No. 45, Jakarta Barat', phone: '+62-812-5555-001',
        email: 'budi.santoso@gmail.com', status: CustomerStatus.ACTIVE, installationDate: d(-120),
        servicePackage: 'Home 50Mbps', activityLog: []
    },
    {
        id: 'TMI-CUST-002', name: 'PT. Maju Mundur (Corp)', address: 'Gedung Cyber Lt. 8, Kuningan, Jakarta Selatan', phone: '+62-21-520-9999',
        email: 'it@majumundur.co.id', status: CustomerStatus.ACTIVE, installationDate: d(-90),
        servicePackage: 'Dedicated 200Mbps', activityLog: []
    },
    {
        id: 'TMI-CUST-003', name: 'Cafe Kopi Senja', address: 'Jl. Senopati No. 10, Jakarta Selatan', phone: '+62-811-2222-333',
        email: 'manager@kopisenja.com', status: CustomerStatus.SUSPENDED, installationDate: d(-30),
        servicePackage: 'SOHO 100Mbps', activityLog: []
    }
];

// --- 5. ASET (Termasuk Material Bulk) ---

const generateBulkItems = (count: number, name: string, category: string, type: string, brand: string, prefix: string, status: AssetStatus = AssetStatus.IN_STORAGE) => {
    const items: Asset[] = [];
    for (let i = 0; i < count; i++) {
        items.push({
            id: `${prefix}-${1000 + i}`,
            name: name,
            category: category,
            type: type,
            brand: brand,
            serialNumber: null, // FORCE NULL FOR BULK
            macAddress: null,   // FORCE NULL FOR BULK
            registrationDate: d(-10),
            recordedBy: 'Admin Logistik User',
            purchaseDate: d(-10),
            purchasePrice: 15000,
            vendor: 'Toko Kabel Jaya',
            location: status === AssetStatus.IN_STORAGE ? 'Gudang Inventori' : 'Lokasi Pelanggan',
            currentUser: null,
            status: status,
            condition: AssetCondition.BRAND_NEW,
            activityLog: [],
            attachments: [],
            poNumber: `REQ-MAT-${prefix}`,
            invoiceNumber: null,
            warrantyEndDate: null,
            notes: 'Stok material'
        });
    }
    return items;
};

// Helper for Creating Specific Individual Assets
const createAsset = (id: string, name: string, type: string, brand: string, status: AssetStatus, category = 'Perangkat Pelanggan (CPE)') => ({
    id, name, category, type, brand, serialNumber: `SN-${id}`, registrationDate: d(-30),
    recordedBy: 'Admin', purchaseDate: d(-30), purchasePrice: 150000, vendor: 'Vendor A',
    location: status === AssetStatus.IN_STORAGE ? 'Gudang' : 'Customer',
    currentUser: status === AssetStatus.IN_USE ? 'TMI-CUST-001' : null,
    status, condition: AssetCondition.GOOD, activityLog: [], attachments: [], poNumber: 'PO-TEST',
    invoiceNumber: 'INV-TEST', warrantyEndDate: d(300), notes: ''
});

export const mockAssets: Asset[] = [
    // CORE NETWORK - In Use
    { id: 'NET-001', name: 'Router Core RB4011iGS+', category: 'Perangkat Jaringan (Core)', type: 'Router Core', brand: 'Mikrotik', serialNumber: 'MT-CORE-001', registrationDate: d(-365), recordedBy: 'Admin Logistik User', purchaseDate: d(-365), purchasePrice: 5000000, vendor: 'Citra Web', location: 'Rack Server HQ', currentUser: 'Leader User', status: AssetStatus.IN_USE, condition: AssetCondition.GOOD, activityLog: [], attachments: [], poNumber: 'PO-001', invoiceNumber: 'INV-001', warrantyEndDate: d(365), notes: 'Router Utama HQ' },
    
    // --- SCENARIO: CRITICAL STOCK (STOK HABIS) ---
    // Item exists in system (IN_USE) but 0 in Storage
    // 5 unit Converter HTB-3100, semuanya terpasang di pelanggan
    ...Array.from({ length: 5 }).map((_, i) => 
        createAsset(`CVT-HTB-${i}`, 'Converter HTB-3100', 'Media Converter', 'NetLink', AssetStatus.IN_USE)
    ),

    // --- SCENARIO: LOW STOCK (STOK MENIPIS) ---
    // 2 unit Mercusys MW302R di Gudang (Threshold biasanya 5)
    createAsset('RTR-MRC-001', 'Mercusys MW302R', 'Router WiFi', 'Mercusys', AssetStatus.IN_STORAGE),
    createAsset('RTR-MRC-002', 'Mercusys MW302R', 'Router WiFi', 'Mercusys', AssetStatus.IN_STORAGE),
    // ... dan 10 unit sedang dipakai
    ...Array.from({ length: 10 }).map((_, i) => 
        createAsset(`RTR-MRC-U${i}`, 'Mercusys MW302R', 'Router WiFi', 'Mercusys', AssetStatus.IN_USE)
    ),

    // --- SCENARIO: LOW MATERIAL (BULK) ---
    // Splitter PLC 1:8 - Sisa 3 Pcs
    ...generateBulkItems(3, 'Splitter PLC 1:8', 'Infrastruktur Fiber Optik (Material)', 'Aksesoris Koneksi', 'Passive', 'SPL-01', AssetStatus.IN_STORAGE),
    ...generateBulkItems(20, 'Splitter PLC 1:8', 'Infrastruktur Fiber Optik (Material)', 'Aksesoris Koneksi', 'Passive', 'SPL-02', AssetStatus.IN_USE),

    // CPE - In Use (Customer)
    { id: 'CPE-001', name: 'ONT HG8245H', category: 'Perangkat Pelanggan (CPE)', type: 'ONT/ONU', brand: 'Huawei', serialNumber: 'HW-ONT-001', registrationDate: d(-120), recordedBy: 'Admin Logistik User', purchaseDate: d(-125), purchasePrice: 750000, vendor: 'Optik Prima', location: 'Terpasang di Pelanggan', currentUser: 'TMI-CUST-001', status: AssetStatus.IN_USE, condition: AssetCondition.GOOD, activityLog: [], attachments: [], poNumber: 'PO-005', invoiceNumber: 'INV-005', warrantyEndDate: d(240), notes: 'Installed at Budi Home' },
    { id: 'CPE-002', name: 'ONT F609', category: 'Perangkat Pelanggan (CPE)', type: 'ONT/ONU', brand: 'ZTE', serialNumber: 'ZT-ONT-002', registrationDate: d(-90), recordedBy: 'Admin Logistik User', purchaseDate: d(-95), purchasePrice: 700000, vendor: 'Optik Prima', location: 'Terpasang di Pelanggan', currentUser: 'TMI-CUST-002', status: AssetStatus.IN_USE, condition: AssetCondition.GOOD, activityLog: [], attachments: [], poNumber: 'PO-006', invoiceNumber: 'INV-006', warrantyEndDate: d(270), notes: 'Installed at Maju Mundur' },
    
    // CPE - In Storage
    { id: 'CPE-003', name: 'ONT HG8245H', category: 'Perangkat Pelanggan (CPE)', type: 'ONT/ONU', brand: 'Huawei', serialNumber: 'HW-ONT-003', registrationDate: d(-20), recordedBy: 'Admin Logistik User', purchaseDate: d(-20), purchasePrice: 750000, vendor: 'Optik Prima', location: 'Gudang Inventori', currentUser: null, status: AssetStatus.IN_STORAGE, condition: AssetCondition.BRAND_NEW, activityLog: [], attachments: [], poNumber: 'REQ-INIT-02', invoiceNumber: 'INV-100', warrantyEndDate: d(340), notes: 'Stok baru' },
    { id: 'CPE-004', name: 'Router WR840N', category: 'Perangkat Pelanggan (CPE)', type: 'Router WiFi', brand: 'TP-Link', serialNumber: 'TP-WR-004', registrationDate: d(-15), recordedBy: 'Admin Logistik User', purchaseDate: d(-15), purchasePrice: 185000, vendor: 'Mega IT', location: 'Gudang Inventori', currentUser: null, status: AssetStatus.IN_STORAGE, condition: AssetCondition.BRAND_NEW, activityLog: [], attachments: [], poNumber: 'REQ-INIT-03', invoiceNumber: 'INV-101', warrantyEndDate: d(350), notes: null },
    
    // TOOLS - Sync with Loan Request LREQ-002
    { 
        id: 'TOL-001', 
        name: 'Fusion Splicer 90S', 
        category: 'Alat Kerja Lapangan', 
        type: 'Fusion Splicer', 
        brand: 'Fujikura', 
        serialNumber: 'FJ-SPL-001', 
        registrationDate: d(-200), 
        recordedBy: 'Admin Logistik User', 
        purchaseDate: d(-200), 
        purchasePrice: 65000000, 
        vendor: 'Fiber Solusi', 
        location: 'Digunakan oleh Staff User', 
        currentUser: 'Staff User',             
        status: AssetStatus.IN_USE,            
        condition: AssetCondition.GOOD, 
        activityLog: [], 
        attachments: [], 
        poNumber: 'PO-TOOLS-01', 
        invoiceNumber: null, 
        warrantyEndDate: d(165), 
        notes: 'Sedang dipinjam (LREQ-002)' 
    },

    // --- MOCK DATA UNTUK HANDOVER TESTING ---

    // 1. HANDOVER FROM NEW REQUEST (REQ-TEST-NEW-01)
    // Asset created from registration, ready for handover
    {
        id: 'AST-TEST-NEW-01',
        name: 'MacBook Air M2',
        category: 'Aset Kantor',
        type: 'Laptop',
        brand: 'Apple',
        serialNumber: 'MBA-M2-TEST',
        registrationDate: d(0),
        recordedBy: 'Admin Logistik User',
        purchasePrice: 19000000,
        vendor: 'iBox',
        location: 'Gudang Inventori',
        currentUser: null,
        status: AssetStatus.IN_STORAGE,
        condition: AssetCondition.BRAND_NEW,
        activityLog: [],
        attachments: [],
        poNumber: 'REQ-TEST-NEW-01',
        woRoIntNumber: 'REQ-TEST-NEW-01', // Linked to Request
        invoiceNumber: 'INV-APPLE-001',
        warrantyEndDate: d(365),
        notes: 'Unit baru untuk Leader'
    },

    // 2. HANDOVER FROM LOAN REQUEST (LREQ-TEST-LOAN-01)
    // Asset ready in storage
    { 
        id: 'TOL-TEST-LOAN-01', 
        name: 'OPM Joinwit', 
        category: 'Alat Kerja Lapangan', 
        type: 'Optical Power Meter (OPM)', 
        brand: 'Joinwit', 
        serialNumber: 'JW-TEST-001', 
        registrationDate: d(-10), 
        recordedBy: 'Admin Logistik User', 
        purchaseDate: d(-10), 
        purchasePrice: 350000, 
        vendor: 'Tokopedia', 
        location: 'Gudang Inventori', 
        currentUser: null, 
        status: AssetStatus.IN_STORAGE, 
        condition: AssetCondition.GOOD, 
        activityLog: [], 
        attachments: [], 
        poNumber: 'REQ-INIT-TOOLS', 
        invoiceNumber: null, 
        warrantyEndDate: d(180), 
        notes: 'Unit operasional cadangan' 
    },

    // 3. HANDOVER FROM INSTALLATION (INST-TEST-01)
    // Asset in storage, to be handed over for installation
    { 
        id: 'CPE-TEST-INST-01', 
        name: 'ONT F609', 
        category: 'Perangkat Pelanggan (CPE)', 
        type: 'ONT/ONU', 
        brand: 'ZTE', 
        serialNumber: 'ZT-TEST-INST-001', 
        registrationDate: d(-5), 
        recordedBy: 'Admin Logistik User', 
        purchaseDate: d(-10), 
        purchasePrice: 700000, 
        vendor: 'Optik Prima', 
        location: 'Gudang Inventori', 
        currentUser: null, 
        status: AssetStatus.IN_STORAGE, 
        condition: AssetCondition.BRAND_NEW, 
        activityLog: [], 
        attachments: [], 
        poNumber: 'PO-CPE-BATCH', 
        invoiceNumber: null, 
        warrantyEndDate: d(360), 
        notes: 'Persiapan instalasi' 
    },

    // 4. HANDOVER FROM DISMANTLE (DSM-TEST-01)
    // Asset currently "In Use" or "In Transit" from customer, needs Inbound Handover
    // Note: In real flow, status might be 'IN_USE' before dismantle is confirmed.
    {
        id: 'CPE-TEST-DSM-01',
        name: 'Router WR840N',
        category: 'Perangkat Pelanggan (CPE)',
        type: 'Router WiFi',
        brand: 'TP-Link',
        serialNumber: 'TP-TEST-DSM-001',
        registrationDate: d(-200),
        recordedBy: 'Admin Logistik User',
        purchaseDate: d(-205),
        purchasePrice: 185000,
        vendor: 'Mega IT',
        location: 'Lokasi Pelanggan (Pending Dismantle)',
        currentUser: 'TMI-CUST-003', // Linked to Customer
        status: AssetStatus.IN_USE, 
        condition: AssetCondition.USED_OKAY,
        activityLog: [],
        attachments: [],
        poNumber: 'PO-OLD-01',
        invoiceNumber: null,
        warrantyEndDate: d(150),
        notes: 'Akan ditarik'
    },

    // 5. HANDOVER FROM REPAIR (REPAIR STRATEGY)
    {
        id: 'AST-TEST-REP-01',
        name: 'Laptop ThinkPad X260',
        category: 'Aset Kantor',
        type: 'Laptop',
        brand: 'Lenovo',
        serialNumber: 'TP-X260-REP-TEST',
        registrationDate: d(-700),
        recordedBy: 'Admin Logistik User',
        purchasePrice: 4000000,
        vendor: 'Bekas',
        location: 'Meja Teknisi (Internal Repair)',
        currentUser: 'Leader User', // Owner
        status: AssetStatus.UNDER_REPAIR, // Trigger for Repair Strategy
        condition: AssetCondition.MINOR_DAMAGE,
        activityLog: [],
        attachments: [],
        poNumber: 'OLD-INV',
        invoiceNumber: null,
        warrantyEndDate: null,
        notes: 'Sedang ganti keyboard, siap dikembalikan'
    },

    // 6. MANUAL HANDOVER
    // Just a standard asset in storage
    {
        id: 'AST-TEST-MANUAL-01',
        name: 'Tang Krimping',
        category: 'Alat Kerja Lapangan',
        type: 'Fusion Splicer', // Using existing type for simplicity
        brand: 'Krisbow',
        serialNumber: 'KRIS-001',
        registrationDate: d(-30),
        recordedBy: 'Admin Logistik User',
        purchasePrice: 150000,
        vendor: 'Ace Hardware',
        location: 'Gudang Inventori',
        currentUser: null,
        status: AssetStatus.IN_STORAGE,
        condition: AssetCondition.GOOD,
        activityLog: [],
        attachments: [],
        poNumber: 'PO-TOOLS-SMALL',
        invoiceNumber: null,
        warrantyEndDate: null,
        notes: 'Stok alat kecil'
    },

    // OFFICE - In Use
    { id: 'OFC-001', name: 'MacBook Air M1', category: 'Aset Kantor', type: 'Laptop', brand: 'Apple', serialNumber: 'FVFG-M1-001', registrationDate: d(-60), recordedBy: 'Admin Logistik User', purchaseDate: d(-60), purchasePrice: 14000000, vendor: 'iBox', location: 'Kantor Management', currentUser: 'Super Admin User', status: AssetStatus.IN_USE, condition: AssetCondition.GOOD, activityLog: [], attachments: [], poNumber: 'PO-OFC-01', invoiceNumber: null, warrantyEndDate: d(300), notes: 'Laptop Direktur' },

    // MATERIAL - Bulk
    ...generateBulkItems(20, 'Patchcord SC-UPC 3m', 'Infrastruktur Fiber Optik (Material)', 'Aksesoris Koneksi', 'Generic', 'MAT-PC'),
    ...generateBulkItems(5, 'Adaptor SC-UPC', 'Infrastruktur Fiber Optik (Material)', 'Aksesoris Koneksi', 'Generic', 'MAT-AD'),
];

// --- 6. REQUESTS ---

export const initialMockRequests: Request[] = [
    // 1. Pending Request
    {
        id: 'REQ-005',
        requester: 'Staff User',
        division: 'Technical Support',
        requestDate: d(-1),
        status: ItemStatus.PENDING,
        order: { type: 'Regular Stock' },
        items: [
            { id: 1, itemName: 'Router WR840N', itemTypeBrand: 'TP-Link', quantity: 5, keterangan: 'Stok teknisi lapangan menipis', availableStock: 1, categoryId: '2', typeId: '5' }
        ],
        totalValue: 925000,
        activityLog: []
    },
    // ... (Existing requests) ...

    // TEST HANDOVER: NEW REQUEST STRATEGY
    {
        id: 'REQ-TEST-NEW-01',
        requester: 'Leader User',
        division: 'Network Engineering',
        requestDate: d(-5),
        status: ItemStatus.AWAITING_HANDOVER, // Trigger for New Request Strategy
        logisticApprover: 'Admin Logistik User',
        logisticApprovalDate: d(-4),
        finalApprover: 'Super Admin User',
        finalApprovalDate: d(-3),
        order: { type: 'Regular Stock' },
        items: [
            { id: 1, itemName: 'MacBook Air M2', itemTypeBrand: 'Apple', quantity: 1, keterangan: 'Upgrade laptop', availableStock: 0 }
        ],
        purchaseDetails: {
            1: { purchasePrice: 19000000, vendor: 'iBox', poNumber: 'PO-REQ-TEST-NEW', invoiceNumber: 'INV-APPLE-001', purchaseDate: d(-2), warrantyEndDate: d(360), filledBy: 'Admin Purchase User', fillDate: d(-2) }
        },
        totalValue: 19000000,
        arrivalDate: d(-1),
        isRegistered: true, // Asset AST-TEST-NEW-01 already linked
        partiallyRegisteredItems: { 1: 1 },
        activityLog: []
    }
];

// --- 7. LOAN REQUESTS ---

export const mockLoanRequests: LoanRequest[] = [
    // Data yang hilang ditambahkan di sini
    {
        id: 'LREQ-001',
        requester: 'Teknisi Lapangan A',
        division: 'Technical Support',
        requestDate: d(-10),
        status: LoanRequestStatus.RETURNED,
        items: [
            { id: 1, itemName: 'Optical Power Meter (OPM)', brand: 'Joinwit', quantity: 1, keterangan: 'Pengecekan redaman ODP', returnDate: d(-5) }
        ],
        approver: 'Admin Logistik User',
        approvalDate: d(-9),
        assignedAssetIds: { 1: ['OPM-003'] },
        returnedAssetIds: ['OPM-003'],
        actualReturnDate: d(-5)
    },
    {
        id: 'LREQ-002',
        requester: 'Staff User',
        division: 'Technical Support',
        requestDate: d(-15),
        status: LoanRequestStatus.AWAITING_RETURN,
        items: [
            { id: 1, itemName: 'Fusion Splicer 90S', brand: 'Fujikura', quantity: 1, keterangan: 'Splicing kabel backbone', returnDate: d(5) },
            { id: 2, itemName: 'Fiber Cleaver', brand: 'Generic', quantity: 1, keterangan: 'Alat bantu splicing', returnDate: d(5) }
        ],
        approver: 'Admin Logistik User',
        approvalDate: d(-14),
        assignedAssetIds: { 1: ['TOL-001'], 2: ['CLEAVER-01'] }
    },
    // TEST HANDOVER: LOAN STRATEGY
    {
        id: 'LREQ-TEST-LOAN-01',
        requester: 'Staff User',
        division: 'Technical Support',
        requestDate: d(-1),
        status: LoanRequestStatus.APPROVED, // Trigger for Loan Strategy (Ready for Handover)
        items: [
            { id: 1, itemName: 'OPM Joinwit', brand: 'Joinwit', quantity: 1, keterangan: 'Peminjaman harian', returnDate: d(2) }
        ],
        approver: 'Admin Logistik User',
        approvalDate: d(0),
        assignedAssetIds: { 1: ['TOL-TEST-LOAN-01'] }, // Assigned AST-MOCK-LOAN-01
        notes: 'Butuh untuk cek redaman di ODP'
    }
];

// --- 8. TRANSACTIONS (HANDOVER, INSTALLATION, MAINTENANCE, DISMANTLE) ---

export const mockHandovers: Handover[] = [
    {
        id: 'HO-001',
        docNumber: 'HO-231001-001',
        handoverDate: d(-60),
        menyerahkan: 'Admin Logistik User',
        penerima: 'Super Admin User',
        mengetahui: 'HR Manager',
        items: [
            { id: 1, assetId: 'OFC-001', itemName: 'MacBook Air M1', itemTypeBrand: 'Apple', conditionNotes: 'Baru, segel dibuka untuk pengecekan', quantity: 1, checked: true }
        ],
        status: ItemStatus.COMPLETED
    }
];

export const mockInstallations: Installation[] = [
    // ... (Existing) ...

    // TEST HANDOVER: INSTALLATION STRATEGY
    // Technicians pick up items based on this installation doc (Work Order)
    {
        id: 'INST-TEST-01',
        docNumber: 'INST-WO-TEST-001',
        requestNumber: 'REQ-WO-01',
        installationDate: d(1), // Scheduled tomorrow
        technician: 'Staff User',
        customerId: 'TMI-CUST-001',
        customerName: 'Budi Santoso (Home)',
        assetsInstalled: [
            { assetId: 'CPE-TEST-INST-01', assetName: 'ONT F609', serialNumber: 'ZT-TEST-INST-001' }
        ],
        materialsUsed: [],
        notes: 'Persiapan instalasi besok',
        status: ItemStatus.PENDING,
        acknowledger: null,
        createdBy: 'Staff User'
    }
];

export const mockDismantles: Dismantle[] = [
    // ... (Existing) ...

    // TEST HANDOVER: DISMANTLE STRATEGY (Inbound Handover)
    {
        id: 'DSM-TEST-01',
        docNumber: 'DSM-TEST-231018-01',
        dismantleDate: d(0),
        assetId: 'CPE-TEST-DSM-01',
        assetName: 'Router WR840N',
        technician: 'Staff User',
        customerId: 'TMI-CUST-003',
        customerName: 'Cafe Kopi Senja',
        customerAddress: 'Jl. Senopati No. 10',
        retrievedCondition: AssetCondition.USED_OKAY,
        notes: 'Pelanggan suspend.',
        acknowledger: null, // Belum diterima gudang
        status: ItemStatus.IN_PROGRESS // Trigger for Handover/Return
    }
];

export const mockMaintenances: Maintenance[] = [
    {
        id: 'MNT-001',
        docNumber: 'MNT-230820-003',
        maintenanceDate: d(-58),
        technician: 'Teknisi Lapangan A',
        customerId: 'TMI-CUST-002',
        customerName: 'PT. Maju Mundur (Corp)',
        assets: [{ assetId: 'CPE-002', assetName: 'ONT F609' }],
        problemDescription: 'Koneksi putus nyambung (LOS merah kedip)',
        actionsTaken: 'Splicing ulang di ODP dan ganti patchcord.',
        workTypes: ['Splicing FO', 'Ganti Perangkat'],
        priority: 'Tinggi',
        materialsUsed: [
            { itemName: 'Patchcord SC-UPC 3m', brand: 'Generic', quantity: 1, unit: 'Pcs' }
        ],
        status: ItemStatus.COMPLETED,
        completedBy: 'Teknisi Lapangan A',
        completionDate: d(-58)
    }
];

// --- 9. NOTIFICATIONS & RETURNS ---

export const mockNotifications: Notification[] = [
    {
        id: 1,
        recipientId: 2, // Admin Purchase
        actorName: 'Admin Logistik User',
        type: 'REQUEST_LOGISTIC_APPROVED',
        referenceId: 'REQ-004',
        message: 'menyetujui request #REQ-004, mohon isi detail pembelian.',
        isRead: false,
        timestamp: d(0)
    },
    {
        id: 2,
        recipientId: 3, // Admin Logistik
        actorName: 'Staff User',
        type: 'REQUEST_CREATED',
        referenceId: 'REQ-005',
        message: 'membuat request baru.',
        isRead: false,
        timestamp: d(0)
    },
    {
        id: 3,
        recipientId: 5, // Staff
        actorName: 'System',
        type: 'info',
        message: 'Selamat datang di Aplikasi Inventori Aset Triniti Media.',
        isRead: true,
        timestamp: d(-5)
    }
];

// MOCK RETURNS (Request Pengembalian)
export const mockReturns: AssetReturn[] = [
    {
        id: 'RET-001',
        docNumber: 'RET-231025-001',
        returnDate: d(-1), // Yesterday
        loanRequestId: 'LREQ-002',
        loanDocNumber: 'LREQ-002',
        assetId: 'TOL-001',
        assetName: 'Fusion Splicer 90S',
        returnedBy: 'Staff User',
        receivedBy: 'Admin Logistik User',
        returnedCondition: AssetCondition.GOOD,
        notes: 'Pekerjaan selesai lebih cepat.',
        status: AssetReturnStatus.PENDING_APPROVAL
    },
    {
        id: 'RET-002',
        docNumber: 'RET-231020-001',
        returnDate: d(-5),
        loanRequestId: 'LREQ-001',
        loanDocNumber: 'LREQ-001',
        assetId: 'OPM-003', // Virtual ID
        assetName: 'Optical Power Meter (OPM)',
        returnedBy: 'Teknisi Lapangan A',
        receivedBy: 'Admin Logistik User',
        returnedCondition: AssetCondition.GOOD,
        status: AssetReturnStatus.APPROVED,
        approvedBy: 'Admin Logistik User',
        approvalDate: d(-4)
    },
    {
        id: 'RET-003',
        docNumber: 'RET-231015-001',
        returnDate: d(-10),
        loanRequestId: 'LREQ-002',
        loanDocNumber: 'LREQ-002',
        assetId: 'CLEAVER-01', // Virtual ID
        assetName: 'Fiber Cleaver',
        returnedBy: 'Staff User',
        receivedBy: 'Admin Logistik User',
        returnedCondition: AssetCondition.MINOR_DAMAGE,
        notes: 'Ada baret halus di body.',
        status: AssetReturnStatus.REJECTED,
        rejectedBy: 'Admin Logistik User',
        rejectionDate: d(-9),
        rejectionReason: 'Kondisi dilaporkan rusak ringan, namun fisik retak parah. Perlu investigasi.'
    }
];

// Mock History for Stock Item
export const mockStockMovements = [];