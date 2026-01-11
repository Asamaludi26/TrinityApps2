
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
    const consumeMaterials = useAssetStore((state) => state.consumeMaterials); 
    
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
        const targetCustomerId = formData.id; 

        // --- 0. Validate ID Uniqueness for New Customers ---
        if (!isEditing) {
            const idExists = customers.some(c => c.id === formData.id);
            if (idExists) {
                addNotification(`Gagal: ID Pelanggan "${formData.id}" sudah digunakan. Harap gunakan ID lain.`, 'error');
                return;
            }
        }
        
        // --- 1. Process Material Consumption (Validation Phase) ---
        if (formData.installedMaterials && formData.installedMaterials.length > 0) {
            const today = new Date().toISOString().split('T')[0];
            
            // Hanya proses material yang baru ditambahkan hari ini (untuk menghindari double deduct saat edit)
            // Note: Idealnya ada flag 'isNew' tapi tanggal hari ini adalah pendekatan yang cukup aman untuk flow ini.
            const newMaterialsRaw = formData.installedMaterials.filter(m => m.installationDate.startsWith(today));
            
            if (newMaterialsRaw.length > 0) {
                // --- CRITICAL FIX: Unit Conversion Logic ---
                const convertedMaterials = newMaterialsRaw.map(material => {
                    let finalQuantity = material.quantity;
                    let finalUnit = material.unit;
                    let materialFound = false;

                    // Cari konfigurasi bulk item untuk cek konversi
                    for (const cat of assetCategories) {
                        if (materialFound) break;
                        for (const type of cat.types) {
                            const matchedItem = type.standardItems?.find((item) => item.name === material.itemName && item.brand === material.brand);

                            if (type.trackingMethod === "bulk" && matchedItem) {
                                // Default unit ke base unit (eceran) agar konsumsi stok akurat
                                finalUnit = matchedItem.baseUnitOfMeasure || type.unitOfMeasure || "Pcs";
                                
                                const isInputContainer = material.unit === matchedItem.unitOfMeasure; // misal: Input 'Hasbal'
                                
                                if (matchedItem.quantityPerUnit && isInputContainer) {
                                    // Konversi: 1 Hasbal -> 1000 Meter
                                    finalQuantity = material.quantity * matchedItem.quantityPerUnit;
                                }
                                
                                materialFound = true;
                                break;
                            }
                        }
                    }

                    return {
                        ...material,
                        quantity: finalQuantity, // Quantity yang sudah dikonversi ke base unit
                        unit: finalUnit 
                    };
                });

                // Execute Consumption with Converted Quantities
                const result = await consumeMaterials(convertedMaterials, {
                    customerId: targetCustomerId,
                    location: `Terpasang di: ${formData.address}`,
                    technicianName: currentUser.name // Log who added this
                });

                // STOP IF FAILED
                if (!result.success) {
                    result.errors.forEach(err => addNotification(err, 'error'));
                    return;
                }
            }
        }

        // --- 2. Update Assets Side Effects (Aset Tetap/Perangkat) ---
        for (const assetId of unassignedAssetIds) {
            await updateAsset(assetId, {
                currentUser: null,
                location: 'Gudang Inventori',
                status: AssetStatus.IN_STORAGE,
                activityLog: []
            });
        }

        for (const assetId of newlyAssignedAssetIds) {
            await updateAsset(assetId, {
                currentUser: targetCustomerId,
                location: `Terpasang di: ${formData.address}`,
                status: AssetStatus.IN_USE,
            });
        }

        // --- 3. Update Customer Record ---
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
