
import React, { useMemo } from 'react';
import { Customer, Page, User, ActivityLogEntry, AssetStatus, InstalledMaterial } from '../../../types';
import FormPageLayout from '../../../components/layout/FormPageLayout';
import CustomerForm from './CustomerForm';
import { useNotification } from '../../../providers/NotificationProvider';

// Stores
import { useMasterDataStore } from '../../../stores/useMasterDataStore';
import { useAssetStore } from '../../../stores/useAssetStore';

interface CustomerFormPageProps {
    currentUser: User;
    setActivePage: (page: Page, filters?: any) => void;
    pageInitialState?: { customerId?: string };
    // Legacy props (optional/ignored)
    customers?: Customer[];
    setCustomers?: any;
    assets?: any;
    assetCategories?: any;
    onUpdateAsset?: any;
}

const CustomerFormPage: React.FC<CustomerFormPageProps> = (props) => {
    const { currentUser, setActivePage, pageInitialState } = props;
    
    // Use Stores
    const customers = useMasterDataStore((state) => state.customers);
    const addCustomer = useMasterDataStore((state) => state.addCustomer);
    const updateCustomer = useMasterDataStore((state) => state.updateCustomer);
    
    const assets = useAssetStore((state) => state.assets);
    const assetCategories = useAssetStore((state) => state.categories);
    const updateAsset = useAssetStore((state) => state.updateAsset);
    
    const customerToEdit = useMemo(() => {
        if (pageInitialState?.customerId) {
            return customers.find(c => c.id === pageInitialState.customerId) || null;
        }
        return null;
    }, [customers, pageInitialState]);

    const isEditing = !!customerToEdit;
    const addNotification = useNotification();

    // Helper function untuk memproses konsumsi material (UPDATED LOGIC V2 - Measurement Support)
    const processMaterialConsumption = async (materials: InstalledMaterial[], customerId: string, customerAddress: string) => {
        for (const mat of materials) {
            // 1. Identifikasi Tipe Material dari Model (StandardItem)
            let isMeasurement = false;
            
            // Cari definisi Model di kategori
            for (const cat of assetCategories) {
                for (const type of cat.types) {
                    const model = type.standardItems?.find(i => i.name === mat.itemName && i.brand === mat.brand);
                    if (model) {
                        isMeasurement = model.bulkType === 'measurement';
                        break;
                    }
                }
                if (isMeasurement) break;
            }

            // 2. Cari stok tersedia (FIFO - First In First Out)
            const availableStock = assets
                .filter(a => 
                    a.name === mat.itemName && 
                    a.brand === mat.brand && 
                    a.status === AssetStatus.IN_STORAGE
                )
                .sort((a, b) => new Date(a.registrationDate).getTime() - new Date(b.registrationDate).getTime());

            if (isMeasurement) {
                // --- LOGIKA PENGUKURAN (MEASUREMENT) ---
                let remainingNeed = mat.quantity; // Jumlah yang dibutuhkan
                
                for (const asset of availableStock) {
                    if (remainingNeed <= 0) break;

                    // Gunakan currentBalance. Jika undefined, gunakan initialBalance atau 0
                    const currentBalance = asset.currentBalance ?? asset.initialBalance ?? 0;
                    
                    if (currentBalance <= 0) continue; 

                    if (currentBalance > remainingNeed) {
                        // KASUS A: Stok di aset ini CUKUP (Partial Use)
                        // PENTING: Status TETAP 'IN_STORAGE' agar tidak hilang dari tabel stok
                        const newBalance = currentBalance - remainingNeed;
                        
                        await updateAsset(asset.id, {
                            currentBalance: newBalance,
                            status: AssetStatus.IN_STORAGE, // Force keep in storage
                            activityLog: [] 
                        });
                        
                        remainingNeed = 0; 
                    } else {
                        // KASUS B: Stok di aset ini HABIS (Full Use of this specific asset ID)
                        const consumed = currentBalance;
                        remainingNeed -= consumed;
                        
                        await updateAsset(asset.id, {
                            currentBalance: 0,
                            status: AssetStatus.CONSUMED, // Tandai HABIS (Keluar dari stok aktif)
                            activityLog: []
                        });
                    }
                }

                if (remainingNeed > 0) {
                    addNotification(`Peringatan: Stok fisik ${mat.itemName} kurang ${remainingNeed} ${mat.unit}.`, 'warning');
                }

            } else {
                // --- LOGIKA PERHITUNGAN BIASA (COUNT) ---
                // Pindah status fisik ke IN_USE (Pelanggan)
                const quantityToConsume = Math.min(mat.quantity, availableStock.length);

                if (quantityToConsume > 0) {
                    const itemsToUpdate = availableStock.slice(0, quantityToConsume);
                    for (const item of itemsToUpdate) {
                        await updateAsset(item.id, {
                            status: AssetStatus.IN_USE, 
                            currentUser: customerId,
                            location: `Terpasang di: ${customerAddress}`,
                            activityLog: [] 
                        });
                    }
                }
            }
        }
    };

    const handleSaveCustomer = async (
        formData: Omit<Customer, 'activityLog'>,
        newlyAssignedAssetIds: string[],
        unassignedAssetIds: string[]
    ) => {
        // --- 0. Validate ID Uniqueness for New Customers ---
        if (!isEditing) {
            const idExists = customers.some(c => c.id === formData.id);
            if (idExists) {
                addNotification(`Gagal: ID Pelanggan "${formData.id}" sudah digunakan. Harap gunakan ID lain.`, 'error');
                return;
            }
        }

        // --- 1. Update Assets Side Effects (Aset Tetap/Perangkat) ---
        for (const assetId of unassignedAssetIds) {
            await updateAsset(assetId, {
                currentUser: null,
                location: 'Gudang Inventori',
                status: AssetStatus.IN_STORAGE,
                activityLog: []
            });
        }

        const targetCustomerId = formData.id; 

        for (const assetId of newlyAssignedAssetIds) {
            await updateAsset(assetId, {
                currentUser: targetCustomerId,
                location: `Terpasang di: ${formData.address}`,
                status: AssetStatus.IN_USE,
            });
        }

        // --- 2. Update Assets Side Effects (Material Habis Pakai) ---
        if (formData.installedMaterials && formData.installedMaterials.length > 0) {
            // Proses material (Deteksi perubahan idealnya lebih canggih, disini simplifikasi by date)
            const today = new Date().toISOString().split('T')[0];
            const newMaterials = formData.installedMaterials.filter(m => m.installationDate.startsWith(today));
            
            if (newMaterials.length > 0) {
                await processMaterialConsumption(newMaterials, targetCustomerId, formData.address);
            }
        }

        // --- 3. Update Customer ---
        if (isEditing) {
            await updateCustomer(customerToEdit.id, formData);
            addNotification('Data pelanggan dan material berhasil diperbarui.', 'success');
            setActivePage('customer-detail', { customerId: customerToEdit.id });
        } else {
            const newCustomer: Customer = {
                ...formData,
                activityLog: [{
                    id: `log-create-${Date.now()}`,
                    timestamp: new Date().toISOString(),
                    user: currentUser.name,
                    action: 'Pelanggan Dibuat',
                    details: 'Data pelanggan baru telah ditambahkan.'
                }]
            };

            await addCustomer(newCustomer);
            addNotification('Pelanggan baru berhasil ditambahkan.', 'success');
            setActivePage('customer-detail', { customerId: targetCustomerId });
        }
    };

    return (
        <FormPageLayout title={isEditing ? 'Edit Pelanggan' : 'Tambah Pelanggan Baru'}>
            <CustomerForm
                customer={customerToEdit}
                assets={assets}
                assetCategories={assetCategories}
                onSave={handleSaveCustomer}
                onCancel={() => setActivePage(isEditing ? 'customer-detail' : 'customers', { customerId: customerToEdit?.id })}
            />
        </FormPageLayout>
    );
};

export default CustomerFormPage;
