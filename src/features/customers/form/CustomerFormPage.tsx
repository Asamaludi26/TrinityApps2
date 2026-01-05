
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
    const consumeMaterials = useAssetStore((state) => state.consumeMaterials); // USE NEW ACTION
    
    const customerToEdit = useMemo(() => {
        if (pageInitialState?.customerId) {
            return customers.find(c => c.id === pageInitialState.customerId) || null;
        }
        return null;
    }, [customers, pageInitialState]);

    const isEditing = !!customerToEdit;
    const addNotification = useNotification();

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
                // Use Centralized Logic
                const result = await consumeMaterials(newMaterials, {
                    customerId: targetCustomerId,
                    location: `Terpasang di: ${formData.address}`
                });

                if (result.warnings.length > 0) {
                    result.warnings.forEach(w => addNotification(w, 'warning'));
                }
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
