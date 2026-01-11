
import { User, Permission, UserRole } from '../types';

export const ALL_PERMISSIONS: { group: string; permissions: { key: Permission; label: string }[] }[] = [
    {
        group: 'Dashboard & Laporan',
        permissions: [
            { key: 'dashboard:view', label: 'Melihat Dashboard' },
            { key: 'reports:view', label: 'Melihat Laporan & Analitik' },
            { key: 'data:export', label: 'Melakukan Export Data (CSV)' },
            { key: 'system:audit-log', label: 'Melihat Log Aktivitas Sistem' },
        ],
    },
    {
        group: 'Request Aset (Baru)',
        permissions: [
            { key: 'requests:view:own', label: 'Melihat request pribadi' },
            { key: 'requests:view:all', label: 'Melihat semua request' },
            { key: 'requests:create', label: 'Membuat request baru (Regular)' },
            { key: 'requests:create:urgent', label: 'Membuat request Urgent & Project' },
            { key: 'requests:approve:logistic', label: 'Menyetujui (Cek Stok/Ketersediaan)' },
            { key: 'requests:approve:purchase', label: 'Menyetujui & Input Harga (Pembelian)' },
            { key: 'requests:approve:final', label: 'Memberikan persetujuan final (CEO)' },
            { key: 'requests:cancel:own', label: 'Membatalkan request pribadi' },
            { key: 'requests:delete', label: 'Menghapus request orang lain' },
        ],
    },
    {
        group: 'Request Aset (Pinjam)',
        permissions: [
            { key: 'loan-requests:view:own', label: 'Melihat request pinjam pribadi' },
            { key: 'loan-requests:view:all', label: 'Melihat semua request pinjam' },
            { key: 'loan-requests:create', label: 'Membuat request pinjam' },
            { key: 'loan-requests:approve', label: 'Menyetujui & menetapkan aset pinjaman' },
            { key: 'loan-requests:return', label: 'Mengkonfirmasi pengembalian aset pinjaman' },
        ],
    },
    {
        group: 'Manajemen Aset',
        permissions: [
            { key: 'assets:view', label: 'Melihat daftar aset (Global)' },
            { key: 'assets:view:division', label: 'Melihat aset divisi sendiri (Gudang Kedua)' },
            { key: 'assets:view-price', label: 'Melihat Harga & Nilai Aset' },
            { key: 'assets:create', label: 'Mencatat aset baru (Register)' },
            { key: 'assets:edit', label: 'Mengedit data aset' },
            { key: 'assets:delete', label: 'Menghapus data aset' },
            { key: 'assets:handover', label: 'Melakukan serah terima (handover)' },
            { key: 'handovers:view', label: 'Melihat riwayat handover' },
            { key: 'assets:repair:report', label: 'Melaporkan kerusakan aset' },
            { key: 'assets:repair:manage', label: 'Mengelola alur perbaikan (Internal/Vendor)' },
        ],
    },
    {
        group: 'Operasional Lapangan',
        permissions: [
            { key: 'assets:install', label: 'Melakukan Instalasi ke Pelanggan' },
            { key: 'installations:view', label: 'Melihat riwayat instalasi' },
            { key: 'assets:dismantle', label: 'Melakukan Penarikan (Dismantle)' },
            { key: 'dismantles:view', label: 'Melihat riwayat dismantle' },
            { key: 'maintenances:create', label: 'Membuat Laporan Maintenance' },
            { key: 'maintenances:view', label: 'Melihat riwayat maintenance' },
        ],
    },
    {
        group: 'Manajemen Stok',
        permissions: [
            { key: 'stock:view', label: 'Melihat stok aset' },
            { key: 'stock:manage', label: 'Mengelola stok (Ambang Batas)' },
        ],
    },
    {
        group: 'Manajemen Pelanggan',
        permissions: [
            { key: 'customers:view', label: 'Melihat data pelanggan' },
            { key: 'customers:create', label: 'Menambah pelanggan baru' },
            { key: 'customers:edit', label: 'Mengedit data pelanggan' },
            { key: 'customers:delete', label: 'Menghapus data pelanggan' },
        ],
    },
    {
        group: 'Pengaturan & Pengguna',
        permissions: [
            { key: 'users:view', label: 'Melihat daftar pengguna & divisi' },
            { key: 'users:create', label: 'Membuat pengguna baru' },
            { key: 'users:edit', label: 'Mengedit data pengguna' },
            { key: 'users:delete', label: 'Menghapus pengguna' },
            { key: 'users:reset-password', label: 'Reset kata sandi pengguna' },
            { key: 'users:manage-permissions', label: 'Mengelola hak akses pengguna' },
            { key: 'divisions:manage', label: 'Mengelola divisi' },
            { key: 'categories:manage', label: 'Mengelola kategori, tipe, & model aset' },
            { key: 'account:manage', label: 'Mengelola akun pribadi' },
        ],
    },
];

export const ALL_PERMISSION_KEYS = ALL_PERMISSIONS.flatMap(group => group.permissions.map(p => p.key));

// --- SECURITY CONFIGURATION ---

export const SENSITIVE_PERMISSIONS: Permission[] = [
    'assets:view-price',
    'assets:delete',
    'users:delete',
    'users:reset-password',
    'users:manage-permissions',
    'data:export',
    'system:audit-log',
    'requests:approve:final',
    'requests:delete'
];

export const ROLE_RESTRICTIONS: Partial<Record<UserRole, Permission[]>> = {
    'Staff': [
        'users:delete', 'users:create', 'users:edit', 'users:manage-permissions', 'users:reset-password',
        'assets:delete', 'assets:create', 'assets:view-price', 'assets:view:division',
        'requests:approve:logistic', 'requests:approve:purchase', 'requests:approve:final',
        'stock:manage', 'categories:manage', 'divisions:manage',
        'system:audit-log', 'data:export'
    ],
    'Leader': [
        'users:delete', 'users:manage-permissions', 'users:reset-password',
        'assets:delete', 'assets:create', 'assets:view-price',
        'requests:approve:logistic', 'requests:approve:purchase', 'requests:approve:final',
        'categories:manage', 'divisions:manage',
        'system:audit-log'
    ],
    'Admin Logistik': [
        // DILARANG: Harga & Final Approval (Hanya Super Admin/CEO & Purchase)
        'requests:approve:purchase', 
        'requests:approve:final', 
        'assets:view-price',
        // DILARANG: Manajemen User Tingkat Lanjut (Security Hardening)
        'users:create',
        'users:edit', 
        'users:delete', 
        'users:manage-permissions',
        'users:reset-password'
    ],
    'Admin Purchase': [
        'requests:approve:logistic', 'requests:approve:final',
        'stock:manage', 'assets:create',
        'assets:install', 'assets:dismantle', 'assets:handover',
        'users:delete', 'users:manage-permissions'
    ],
    'Super Admin': [] 
};


export const STAFF_PERMISSIONS: Permission[] = [ 
    'dashboard:view', 
    'requests:view:own', 
    'requests:create', 
    'requests:cancel:own', 
    'loan-requests:view:own', 
    'loan-requests:create', 
    'assets:view', 
    'assets:repair:report', 
    'account:manage',
    'customers:view',
    'assets:install', 'installations:view',
    'assets:dismantle', 'dismantles:view',
    'maintenances:create', 'maintenances:view'
]; 

export const LEADER_PERMISSIONS: Permission[] = [ 
    ...STAFF_PERMISSIONS, 
    'requests:create:urgent', 
    'assets:view:division',
    'reports:view'
]; 

export const ADMIN_LOGISTIK_PERMISSIONS: Permission[] = [ 
    'dashboard:view', 
    'reports:view',
    
    // Request Flow
    'requests:view:all', 
    'requests:approve:logistic', 
    'requests:view:own',
    
    // Loan Flow
    'loan-requests:view:all', 
    'loan-requests:approve', 
    'loan-requests:return', 
    'loan-requests:view:own',
    
    // Asset Management (CRUD minus Price)
    'assets:view', 
    'assets:create', 
    'assets:edit', 
    'assets:delete', 
    
    // Transactions
    'assets:handover', 'handovers:view',
    'assets:dismantle', 'dismantles:view',
    'assets:install', 'installations:view',
    'maintenances:create', 'maintenances:view',
    'assets:repair:manage', 
    
    // Stock & Master Data
    'stock:view',
    'stock:manage',
    'customers:view', 
    'customers:create', 
    'customers:edit', 
    'categories:manage', 
    'users:view', // Hanya view untuk keperluan assignment
    'account:manage', 
    'data:export'
]; 

export const ADMIN_PURCHASE_PERMISSIONS: Permission[] = [ 
    'dashboard:view', 
    'reports:view',
    'requests:view:all', 
    'requests:approve:purchase', 
    'assets:view',
    'assets:view-price', 
    'stock:view',
    'customers:view', 
    'categories:manage', 
    'account:manage', 
    'requests:view:own',
    'data:export' 
]; 

export const SUPER_ADMIN_PERMISSIONS: Permission[] = ALL_PERMISSION_KEYS;

export const ROLE_DEFAULT_PERMISSIONS: Record<UserRole, Permission[]> = {
    'Staff': STAFF_PERMISSIONS,
    'Leader': LEADER_PERMISSIONS,
    'Admin Logistik': ADMIN_LOGISTIK_PERMISSIONS,
    'Admin Purchase': ADMIN_PURCHASE_PERMISSIONS,
    'Super Admin': SUPER_ADMIN_PERMISSIONS,
};

export const MANDATORY_PERMISSIONS: Partial<Record<UserRole, Permission[]>> = {
    'Admin Logistik': [
        'dashboard:view',
        'assets:view',
        'stock:view',
        'stock:manage',
        'assets:create',
        'assets:edit',
        'assets:delete',
        'assets:handover',
        'requests:approve:logistic',
        'requests:view:all',
        'loan-requests:approve',
        'loan-requests:return',
        'users:view'
    ],
    'Admin Purchase': [
        'dashboard:view',
        'assets:view',
        'assets:view-price',
        'requests:approve:purchase'
    ],
    'Super Admin': ALL_PERMISSION_KEYS,
    'Leader': [
        'dashboard:view',
        'requests:create:urgent',
        'assets:view:division'
    ],
    'Staff': [
        'dashboard:view',
        'requests:view:own'
    ]
};

// --- ADVANCED DEPENDENCY LOGIC ---

// Dependensi yang "Keras" (Parent WAJIB ada jika Child ada)
// Format: Child -> [Parent1, Parent2]
// Jika Parent dicabut, Child otomatis dicabut. Jika Child dipilih, Parent otomatis terpilih.
export const PERMISSION_DEPENDENCIES: Partial<Record<Permission, Permission[]>> = {
    // Requests
    'requests:create': ['requests:view:own'],
    'requests:create:urgent': ['requests:view:own'],
    'requests:delete': ['requests:view:own'], // Harus bisa lihat untuk hapus
    'requests:cancel:own': ['requests:view:own'],
    'requests:view:all': ['requests:view:own'], // View all implies view own usually
    'requests:approve:logistic': ['requests:view:all'],
    'requests:approve:purchase': ['requests:view:all'],
    'requests:approve:final': ['requests:view:all'],
    
    // Loan Requests
    'loan-requests:create': ['loan-requests:view:own'],
    'loan-requests:view:all': ['loan-requests:view:own'],
    'loan-requests:approve': ['loan-requests:view:all'],
    'loan-requests:return': ['loan-requests:view:all'],

    // Assets CRUD Hierarchy
    'assets:view:division': ['assets:view'],
    'assets:view-price': ['assets:view'],
    'assets:create': ['assets:view'],
    'assets:edit': ['assets:view'],
    'assets:delete': ['assets:view'],
    
    // Asset Transactions
    'assets:handover': ['assets:view', 'handovers:view'],
    'handovers:view': ['assets:view'],
    
    'assets:dismantle': ['assets:view', 'customers:view', 'dismantles:view'],
    'dismantles:view': ['customers:view'],
    
    'assets:install': ['assets:view', 'customers:view', 'installations:view'],
    'installations:view': ['customers:view'],
    
    'maintenances:create': ['customers:view', 'assets:view', 'maintenances:view'],
    'maintenances:view': ['customers:view'],
    
    'assets:repair:report': ['assets:view'],
    'assets:repair:manage': ['assets:view', 'assets:repair:report'],
    
    // Stock
    'stock:manage': ['stock:view'],
    
    // Customers CRUD
    'customers:create': ['customers:view'],
    'customers:edit': ['customers:view'],
    'customers:delete': ['customers:view'],
    
    // Users & Settings CRUD
    'users:create': ['users:view'],
    'users:edit': ['users:view'],
    'users:delete': ['users:view'],
    'users:reset-password': ['users:view'],
    'users:manage-permissions': ['users:view'],
    'divisions:manage': ['users:view'], 
    
    // Reports & System
    'reports:view': ['dashboard:view'],
    'data:export': ['dashboard:view'],
    'system:audit-log': ['dashboard:view'],
};

// --- LOGIC HELPERS v2.0 (Smart Graph Traversal) ---

/**
 * Mendapatkan semua permission induk (dependencies) secara rekursif.
 * Contoh: Edit butuh View, View butuh Login (jika ada).
 */
export const resolveDependencies = (permission: Permission): Permission[] => {
    const deps = new Set<Permission>();
    const queue = [permission];

    while (queue.length > 0) {
        const current = queue.shift()!;
        const parents = PERMISSION_DEPENDENCIES[current];
        if (parents) {
            parents.forEach(p => {
                if (!deps.has(p)) {
                    deps.add(p);
                    queue.push(p);
                }
            });
        }
    }
    return Array.from(deps);
};

/**
 * Mendapatkan semua permission anak (dependents) yang bergantung pada permission ini.
 * Digunakan saat uncheck: Jika View di-uncheck, Edit dan Create harus ikut mati.
 * v2.0: Menggunakan recursive graph traversal yang lebih efisien.
 */
export const resolveDependents = (parentPermission: Permission): Permission[] => {
    const dependents = new Set<Permission>();
    
    // Scan all rules to find immediate children (Reverse Lookup)
    // Map: Parent -> [Children]
    const dependencyMap = new Map<Permission, Permission[]>();
    
    for (const [child, parents] of Object.entries(PERMISSION_DEPENDENCIES)) {
        parents?.forEach(parent => {
             const existing = dependencyMap.get(parent as Permission) || [];
             existing.push(child as Permission);
             dependencyMap.set(parent as Permission, existing);
        });
    }

    const queue = [parentPermission];
    
    while(queue.length > 0) {
        const currentParent = queue.shift()!;
        const children = dependencyMap.get(currentParent);
        
        if (children) {
            children.forEach(child => {
                if (!dependents.has(child)) {
                    dependents.add(child);
                    queue.push(child);
                }
            });
        }
    }
    
    return Array.from(dependents);
};

/**
 * UPDATED: Sanitasi Izin yang Lebih Ketat
 * 1. Menghapus permission yang dilarang (Restricted) - PRIORITAS UTAMA.
 * 2. Menginjeksi (menambahkan) permission yang wajib (Mandatory) untuk role tersebut,
 *    TAPI hanya jika tidak dilarang (avoid conflict loops).
 * Ini memastikan integritas data bahkan jika UI mengirimkan data parsial.
 */
export const sanitizePermissions = (permissions: Permission[], role: UserRole): Permission[] => {
    const restricted = ROLE_RESTRICTIONS[role] || [];
    const mandatory = MANDATORY_PERMISSIONS[role] || [];
    
    // 1. Filter out restricted permissions from input
    // Ini memastikan user tidak bisa punya akses yang dilarang
    let cleanPermissions = permissions.filter(p => !restricted.includes(p));

    // 2. Inject mandatory permissions (only if NOT restricted)
    // Ini menangani kasus konflik konfigurasi: Restriction wins.
    const safeMandatory = mandatory.filter(p => !restricted.includes(p));
    
    const combinedPermissions = new Set([...cleanPermissions, ...safeMandatory]);

    return Array.from(combinedPermissions);
};

export const hasPermission = (user: User | null, permission: Permission): boolean => {
    if (!user) return false;
    if (user.role === 'Super Admin') return true;

    // Hard Security Check: Jangan izinkan jika dilarang untuk role ini,
    // meskipun ada di array user.permissions (misal hasil hack/bug DB)
    if (ROLE_RESTRICTIONS[user.role]?.includes(permission)) {
        return false;
    }

    return user.permissions.includes(permission);
};
