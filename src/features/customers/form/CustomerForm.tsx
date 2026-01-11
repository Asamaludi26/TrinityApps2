
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Customer, CustomerStatus, Asset, InstalledMaterial, AssetCategory, User } from '../../../types'; // Import User
import DatePicker from '../../../components/ui/DatePicker';
import { useNotification } from '../../../providers/NotificationProvider';
import FloatingActionBar from '../../../components/ui/FloatingActionBar';
import { CustomSelect } from '../../../components/ui/CustomSelect';
import { SpinnerIcon } from '../../../components/icons/SpinnerIcon';
import { UsersIcon } from '../../../components/icons/UsersIcon';
import { WrenchIcon } from '../../../components/icons/WrenchIcon';
import { CustomerIcon } from '../../../components/icons/CustomerIcon';
import { AssetIcon } from '../../../components/icons/AssetIcon';
import { InboxIcon } from '../../../components/icons/InboxIcon';
import { PlusIcon } from '../../../components/icons/PlusIcon';
import { TrashIcon } from '../../../components/icons/TrashIcon';
import { ArchiveBoxIcon } from '../../../components/icons/ArchiveBoxIcon'; 
import { useCustomerAssetLogic } from '../hooks/useCustomerAssetLogic';
import { generateUUID } from '../../../utils/uuid'; 

// Components
import { MaterialAllocationModal } from '../../../components/ui/MaterialAllocationModal'; 
// Import Stores needed for current User in wrapper (CustomerForm is wrapped in CustomerFormPage usually)
import { useAuthStore } from '../../../stores/useAuthStore'; // Auth Store needed inside form if not passed

interface CustomerFormProps {
    customer: Customer | null;
    assets: Asset[];
    onSave: (
        formData: Omit<Customer, 'activityLog'>,
        newlyAssignedAssetIds: string[],
        unassignedAssetIds: string[]
    ) => void;
    onCancel: () => void;
    assetCategories: AssetCategory[];
}

const FormSection: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, icon, children, className }) => (
    <div className={`pt-6 border-t border-gray-200 first:pt-0 first:border-t-0 ${className}`}>
        <div className="flex items-center mb-4">
            {icon}
            <h3 className="text-lg font-semibold text-tm-dark">{title}</h3>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {children}
        </div>
    </div>
);

const CustomerForm: React.FC<CustomerFormProps> = ({ customer, assets, onSave, onCancel }) => {
    // Hooks Logic
    const { installableAssets, materialOptions } = useCustomerAssetLogic();
    const currentUser = useAuthStore(state => state.currentUser)!; // Access current user

    type MaterialFormItem = {
        tempId: string; 
        modelKey: string; 
        quantity: number | '';
        unit: string;
        materialAssetId?: string; 
    };

    // State Fields
    const [customerId, setCustomerId] = useState('');
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<CustomerStatus>(CustomerStatus.ACTIVE);
    const [installationDate, setInstallationDate] = useState<Date | null>(new Date());
    const [servicePackage, setServicePackage] = useState('');
    
    // Validation State
    const [emailError, setEmailError] = useState('');
    const [addressError, setAddressError] = useState('');
    const [idError, setIdError] = useState('');
    
    // Asset Management State
    const [initialAssignedAssetIds, setInitialAssignedAssetIds] = useState<string[]>([]);
    const [assignedAssetIds, setAssignedAssetIds] = useState<string[]>([]);
    const [materials, setMaterials] = useState<MaterialFormItem[]>([]);

    // Allocation Modal State
    const [allocationModal, setAllocationModal] = useState<{
        isOpen: boolean;
        itemIndex: number | null;
        itemName: string;
        brand: string;
    }>({ isOpen: false, itemIndex: null, itemName: '', brand: '' });

    const [isLoading, setIsLoading] = useState(false);
    const footerRef = useRef<HTMLDivElement>(null);
    const [isFooterVisible, setIsFooterVisible] = useState(true);
    const formId = "customer-form";
    const addNotification = useNotification();

    // Filter aset yang sudah dipilih agar tidak muncul lagi di dropdown
    const availableAssets = useMemo(() => {
        return installableAssets.filter(opt => !assignedAssetIds.includes(opt.value));
    }, [installableAssets, assignedAssetIds]);

    // Initial Data Load & Auto-Population Logic
    useEffect(() => {
        if (customer) {
            // MODE EDIT: Load existing data
            setCustomerId(customer.id);
            setName(customer.name);
            setAddress(customer.address);
            setPhone(customer.phone);
            setEmail(customer.email);
            setStatus(customer.status);
            setInstallationDate(new Date(customer.installationDate));
            setServicePackage(customer.servicePackage.replace(/\D/g, ''));
            
            const currentAssets = assets.filter(a => a.currentUser === customer.id).map(a => a.id);
            setInitialAssignedAssetIds(currentAssets);
            setAssignedAssetIds(currentAssets);

            setMaterials((customer.installedMaterials || []).map((m) => ({
                tempId: generateUUID(), 
                modelKey: `${m.itemName}|${m.brand}`,
                quantity: m.quantity,
                unit: m.unit,
                materialAssetId: m.materialAssetId 
            })));
        } else {
            // MODE NEW: Reset & Auto-populate Standard Materials
            setCustomerId('');
            setName(''); setAddress(''); setPhone(''); setEmail('');
            setStatus(CustomerStatus.ACTIVE); setInstallationDate(new Date()); setServicePackage('');
            setInitialAssignedAssetIds([]); setAssignedAssetIds([]);
            
            const standardMaterialKeywords = ['Dropcore', 'Patch', 'Adaptor', 'Sleeve'];
            const defaultMaterials: MaterialFormItem[] = [];
            
            if (materialOptions.length > 0) {
                standardMaterialKeywords.forEach((keyword) => {
                    const match = materialOptions.find(opt => opt.label.toLowerCase().includes(keyword.toLowerCase()));
                    if (match) {
                        defaultMaterials.push({
                            tempId: generateUUID(), 
                            modelKey: match.value,
                            quantity: 0, 
                            unit: match.unit || 'Pcs',
                            materialAssetId: undefined
                        });
                    }
                });
            }
            setMaterials(defaultMaterials);
        }
    }, [customer, assets, materialOptions]);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => setIsFooterVisible(entry.isIntersecting), { threshold: 0.1 });
        const currentRef = footerRef.current;
        if (currentRef) observer.observe(currentRef);
        return () => { if (currentRef) observer.unobserve(currentRef); };
    }, []);

    // Validasi Real-time
    const isFormValid = useMemo(() => {
        return (
            customerId.trim() !== '' &&
            name.trim() !== '' &&
            address.trim() !== '' &&
            phone.trim() !== '' &&
            email.trim() !== '' &&
            servicePackage.trim() !== '' &&
            installationDate !== null &&
            !emailError && 
            !addressError &&
            !idError
        );
    }, [customerId, name, address, phone, email, servicePackage, installationDate, emailError, addressError, idError]);

    // Formatters
    const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.toUpperCase().replace(/\s/g, '');
        setCustomerId(val);
        if (val.length < 3) setIdError('ID terlalu pendek.');
        else setIdError('');
    };

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        const formatted = val.replace(/\b\w/g, (char) => char.toUpperCase());
        setName(formatted);
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/\D/g, ''); 
        if (!val) { setPhone(''); return; }
        if (val.startsWith('0')) val = '62' + val.slice(1);
        else if (!val.startsWith('62')) val = '62' + val;
        val = val.slice(0, 15);
        let formatted = '+';
        if (val.length > 0) formatted += val.slice(0, 2);
        if (val.length > 2) formatted += '-' + val.slice(2, 5);
        if (val.length > 5) formatted += '-' + val.slice(5, 9);
        if (val.length > 9) formatted += '-' + val.slice(9, 13);
        if (val.length > 13) formatted += '-' + val.slice(13);
        setPhone(formatted);
    };

    const handleAddressBlur = () => {
        let val = address.trim();
        if (val) {
            const cleanVal = val.replace(/^(jl\.?|jalan|jln\.?)\s*/i, '');
            const formattedName = cleanVal.charAt(0).toUpperCase() + cleanVal.slice(1);
            setAddress(`Jl. ${formattedName}`);
        }
        validateForm();
    };

    const handlePackageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setServicePackage(e.target.value.replace(/\D/g, ''));
    };

    const validateForm = () => {
        let isValid = true;
        if (email && !/\S+@\S+\.\S+/.test(email)) {
            setEmailError('Format email tidak valid.');
            isValid = false;
        } else {
            setEmailError('');
        }
        if (address && address.trim().length < 5) {
            setAddressError('Alamat terlalu pendek, harap isi lebih lengkap.');
            isValid = false;
        } else {
            setAddressError('');
        }
        return isValid;
    };

    const handleAddAsset = (assetId: string) => {
        if (assetId && !assignedAssetIds.includes(assetId)) {
            setAssignedAssetIds(prev => [...prev, assetId]);
        }
    };

    const handleRemoveAsset = (assetId: string) => {
        setAssignedAssetIds(prev => prev.filter(id => id !== assetId));
    };
    
    const handleAddMaterial = () => {
        setMaterials(prev => [...prev, { tempId: generateUUID(), modelKey: '', quantity: 1, unit: 'Pcs', materialAssetId: undefined }]);
    };
    const handleRemoveMaterial = (tempId: string) => {
        setMaterials(prev => prev.filter(m => m.tempId !== tempId));
    };
    
    const handleMaterialChange = (tempId: string, field: keyof MaterialFormItem, value: any) => {
        setMaterials(prev => prev.map(item => {
            if (item.tempId === tempId) {
                const updatedItem = { ...item, [field]: value };
                if (field === 'modelKey') {
                    const model = materialOptions.find(opt => opt.value === value);
                    updatedItem.unit = model?.unit || 'Pcs';
                    // CRITICAL: Reset specific material asset ID if model changes to prevent dangling reference
                    updatedItem.materialAssetId = undefined;
                }
                return updatedItem;
            }
            return item;
        }));
    };

    const handleOpenAllocationModal = (index: number, modelKey: string) => {
        if (!modelKey) return;
        const [name, brand] = modelKey.split('|');
        setAllocationModal({
            isOpen: true,
            itemIndex: index,
            itemName: name,
            brand: brand
        });
    };

    const handleAllocationSelect = (asset: Asset) => {
        if (allocationModal.itemIndex !== null) {
            setMaterials(prev => prev.map((item, idx) => {
                if (idx === allocationModal.itemIndex) {
                    return { ...item, materialAssetId: asset.id };
                }
                return item;
            }));
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) {
            addNotification('Harap perbaiki data yang tidak valid pada formulir.', 'error');
            return;
        }
        
        // Strict Quantity Validation
        if (materials.some(m => m.modelKey && (m.quantity === '' || m.quantity < 0 || isNaN(Number(m.quantity))))) {
             addNotification('Jumlah material tidak valid.', 'error');
             return;
        }

        setIsLoading(true);

        const newlyAssigned = assignedAssetIds.filter(id => !initialAssignedAssetIds.includes(id));
        const unassigned = initialAssignedAssetIds.filter(id => !assignedAssetIds.includes(id));
        
        const finalMaterials: InstalledMaterial[] = materials
            .filter(m => m.modelKey && m.quantity && Number(m.quantity) > 0)
            .map(m => {
                const [name, brand] = m.modelKey.split('|');
                return {
                    materialAssetId: m.materialAssetId, 
                    itemName: name,
                    brand: brand,
                    quantity: Number(m.quantity),
                    unit: m.unit,
                    installationDate: customer?.installedMaterials?.find(em => `${em.itemName}|${em.brand}` === m.modelKey)?.installationDate || new Date().toISOString().split('T')[0],
                };
            });

        setTimeout(() => { 
            onSave({
                id: customerId, 
                name, address, phone, email, status,
                installationDate: installationDate ? installationDate.toISOString().split('T')[0] : '',
                servicePackage: servicePackage ? `${servicePackage} Mbps` : '',
                installedMaterials: finalMaterials,
            }, newlyAssigned, unassigned);
            setIsLoading(false);
        }, 1000);
    };
    
    const ActionButtons: React.FC<{ formId?: string }> = ({ formId }) => (
        <>
            <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Batal</button>
            <button 
                type="submit" 
                form={formId} 
                disabled={isLoading || !isFormValid} 
                className={`inline-flex items-center justify-center px-6 py-2.5 text-sm font-semibold text-white transition-all duration-200 rounded-lg shadow-sm 
                ${isLoading || !isFormValid ? 'bg-gray-400 cursor-not-allowed' : 'bg-tm-primary hover:bg-tm-primary-hover'}`}
            >
                {isLoading && <SpinnerIcon className="w-4 h-4 mr-2" />}
                {customer ? 'Simpan Perubahan' : 'Tambah Pelanggan'}
            </button>
        </>
    );

    return (
        <>
            <form id={formId} onSubmit={handleSubmit} className="space-y-4 pb-32">
                 <FormSection title="Informasi Kontak" icon={<UsersIcon className="w-6 h-6 mr-3 text-tm-primary" />}>
                     <div className="md:col-span-2">
                        <label htmlFor="customerId" className="block text-sm font-medium text-gray-700">ID Pelanggan</label>
                        <div className="mt-1 relative rounded-md shadow-sm">
                            <input 
                                type="text" 
                                id="customerId" 
                                value={customerId} 
                                onChange={handleIdChange} 
                                disabled={!!customer} 
                                required 
                                className={`block w-full px-3 py-2 text-gray-900 bg-white border rounded-lg focus:outline-none focus:ring-tm-accent focus:border-tm-accent sm:text-sm font-mono uppercase ${idError ? 'border-red-500' : 'border-gray-300'} ${customer ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                                placeholder="Contoh: CUST-001" 
                            />
                        </div>
                        {idError && <p className="mt-1 text-xs text-red-600">{idError}</p>}
                        {!customer && <p className="mt-1 text-xs text-gray-500">ID harus unik. Disarankan format: CUST-XXXX atau Nama Singkat.</p>}
                     </div>

                     <div className="md:col-span-2">
                        <label htmlFor="customerName" className="block text-sm font-medium text-gray-700">Nama Pelanggan</label>
                        <input type="text" id="customerName" value={name} onChange={handleNameChange} required className="block w-full px-3 py-2 mt-1 text-gray-900 placeholder:text-gray-400 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-tm-accent focus:border-tm-accent sm:text-sm" />
                    </div>
                    <div>
                        <label htmlFor="customerPhone" className="block text-sm font-medium text-gray-700">Telepon (Auto Format)</label>
                        <input type="tel" id="customerPhone" value={phone} onChange={handlePhoneChange} required className="block w-full px-3 py-2 mt-1 text-gray-900 placeholder:text-gray-400 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-tm-accent focus:border-tm-accent sm:text-sm" placeholder="Contoh: 08123456789" />
                    </div>
                    <div>
                        <label htmlFor="customerEmail" className="block text-sm font-medium text-gray-700">Email</label>
                        <input type="email" id="customerEmail" value={email} onChange={e => setEmail(e.target.value)} onBlur={validateForm} required className={`block w-full px-3 py-2 mt-1 text-gray-900 placeholder:text-gray-400 bg-gray-50 border rounded-lg shadow-sm focus:outline-none focus:ring-tm-accent focus:border-tm-accent sm:text-sm ${emailError ? 'border-red-500' : 'border-gray-300'}`} />
                        {emailError && <p className="mt-1 text-xs text-red-600">{emailError}</p>}
                    </div>
                </FormSection>

                 <FormSection title="Alamat Lengkap" icon={<CustomerIcon className="w-6 h-6 mr-3 text-tm-primary" />}>
                    <div className="md:col-span-2">
                        <label htmlFor="customerAddress" className="block text-sm font-medium text-gray-700">Alamat (Auto Prefix "Jl.")</label>
                        <textarea id="customerAddress" value={address} onChange={e => setAddress(e.target.value)} onBlur={handleAddressBlur} required rows={3} className={`block w-full px-3 py-2 mt-1 text-gray-900 placeholder:text-gray-400 bg-gray-50 border rounded-lg shadow-sm focus:outline-none focus:ring-tm-accent focus:border-tm-accent sm:text-sm ${addressError ? 'border-red-500' : 'border-gray-300'}`} placeholder="Nama Jalan, Nomor, RT/RW, Kelurahan..." />
                        {addressError && <p className="mt-1 text-xs text-red-600">{addressError}</p>}
                    </div>
                </FormSection>

                <FormSection title="Detail Layanan & Status" icon={<WrenchIcon className="w-6 h-6 mr-3 text-tm-primary" />}>
                     <div>
                        <label htmlFor="customerPackage" className="block text-sm font-medium text-gray-700">Paket Layanan</label>
                        <div className="relative mt-1">
                            <input type="text" id="customerPackage" value={servicePackage} onChange={handlePackageChange} placeholder="Contoh: 50" required className="block w-full px-3 py-2 pr-12 text-gray-900 placeholder:text-gray-400 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-tm-accent focus:border-tm-accent sm:text-sm" />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                <span className="text-gray-500 sm:text-sm">Mbps</span>
                            </div>
                        </div>
                    </div>
                     <div>
                        <label htmlFor="installationDate" className="block text-sm font-medium text-gray-700">Tanggal Instalasi</label>
                        <div className="mt-1"><DatePicker id="installationDate" selectedDate={installationDate} onDateChange={setInstallationDate} /></div>
                    </div>
                    <div>
                        <label htmlFor="customerStatus" className="block text-sm font-medium text-gray-700">Status</label>
                        <div className="mt-1">
                            <CustomSelect
                                options={Object.values(CustomerStatus).map(s => ({ value: s, label: s }))}
                                value={status}
                                onChange={value => setStatus(value as CustomerStatus)}
                            />
                        </div>
                    </div>
                </FormSection>
                
                <FormSection title="Kelola Aset Terpasang (Perangkat)" icon={<AssetIcon className="w-6 h-6 mr-3 text-tm-primary" />}>
                    <div className="md:col-span-2">
                        <p className="text-sm text-gray-600 mb-2">Pilih perangkat yang akan dipasang. Hanya perangkat dengan kategori "Installable" yang tersedia.</p>
                        <CustomSelect
                            isSearchable
                            options={availableAssets}
                            value={''}
                            onChange={handleAddAsset}
                            placeholder="Cari dan pilih aset dari gudang..."
                            emptyStateMessage="Tidak ada aset tersedia (Cek stok atau kategori)."
                        />
                        
                        <div className="mt-4 space-y-3">
                            {assignedAssetIds.map(assetId => {
                                const asset = assets.find(a => a.id === assetId);
                                if (!asset) return null;
                                return (
                                    <div key={assetId} className="flex items-start justify-between p-3 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg shadow-sm transition-all hover:border-tm-accent/50">
                                        <div className="flex flex-col gap-1">
                                            <span className="font-semibold text-tm-dark">{asset.name}</span>
                                            <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                                                <span className="bg-gray-100 px-1.5 py-0.5 rounded border">{asset.brand}</span>
                                                <span className="bg-gray-100 px-1.5 py-0.5 rounded border font-mono">{asset.type}</span>
                                            </div>
                                            <div className="flex flex-col gap-0.5 mt-1 text-xs text-gray-600 font-mono">
                                                <span>ID: {asset.id}</span>
                                                <span>SN: {asset.serialNumber || '-'}</span>
                                                {asset.macAddress && <span>MAC: {asset.macAddress}</span>}
                                            </div>
                                        </div>
                                        <button type="button" onClick={() => handleRemoveAsset(assetId)} className="p-1.5 text-red-500 bg-red-50 rounded-full hover:bg-red-100 hover:text-red-700 transition-colors" title="Hapus Aset">
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                );
                            })}
                            {assignedAssetIds.length === 0 && (
                                <div className="flex flex-col items-center justify-center p-4 text-gray-400 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50">
                                    <InboxIcon className="w-8 h-8 mb-2 opacity-50" />
                                    <p className="text-xs">Belum ada perangkat yang dipilih.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </FormSection>

                <FormSection title="Kelola Material Terpakai (Otomatis)" icon={<WrenchIcon className="w-6 h-6 mr-3 text-tm-primary" />}>
                    <div className="md:col-span-2">
                        <p className="text-sm text-gray-600 mb-4">Daftar material instalasi standar. Isi jumlah yang digunakan.</p>
                        <div className="space-y-3">
                            {materials.map((material, index) => (
                                <div key={material.tempId} className="grid grid-cols-1 md:grid-cols-12 gap-x-4 gap-y-2 p-3 bg-gray-100/60 border rounded-lg items-end">
                                    <div className="md:col-span-5">
                                        <label className="block text-xs font-medium text-gray-500">Material</label>
                                        <CustomSelect 
                                            options={materialOptions} 
                                            value={material.modelKey} 
                                            onChange={value => handleMaterialChange(material.tempId, 'modelKey', value)}
                                            isSearchable
                                            placeholder="Pilih material..."
                                        />
                                        {material.materialAssetId && (
                                            <p className="text-[10px] text-blue-600 mt-1 font-mono">Sumber: {material.materialAssetId}</p>
                                        )}
                                    </div>
                                    <div className="md:col-span-3">
                                        <label className="block text-xs font-medium text-gray-500">Jumlah</label>
                                        <input 
                                            type="number" 
                                            value={material.quantity}
                                            onChange={(e) => handleMaterialChange(material.tempId, 'quantity', e.target.value === '' ? '' : Number(e.target.value))}
                                            min="0"
                                            className={`block w-full px-3 py-2 mt-1 text-gray-900 bg-white border rounded-lg shadow-sm sm:text-sm ${material.quantity === 0 ? 'border-amber-300 bg-amber-50' : 'border-gray-300'}`}
                                            placeholder="0"
                                        />
                                    </div>
                                     <div className="md:col-span-3">
                                         {/* Source Selection Button (Consistent with InstallationForm) */}
                                         <label className="block text-xs font-medium text-gray-500 opacity-0">Action</label>
                                         <button 
                                            type="button" 
                                            onClick={() => handleOpenAllocationModal(index, material.modelKey)}
                                            disabled={!material.modelKey}
                                            className={`w-full mt-1 h-[38px] px-2 text-xs font-semibold rounded-lg border flex items-center justify-center gap-1 transition-colors
                                                ${material.materialAssetId 
                                                    ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' 
                                                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                                } ${!material.modelKey ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            title="Pilih sumber stok spesifik (Drum/Box)"
                                        >
                                            <ArchiveBoxIcon className="w-3.5 h-3.5" />
                                            {material.materialAssetId ? 'Ubah' : 'Sumber'}
                                        </button>
                                    </div>
                                    <div className="md:col-span-1">
                                         <label className="block text-xs font-medium text-gray-500 opacity-0">Del</label>
                                        <button type="button" onClick={() => handleRemoveMaterial(material.tempId)} className="flex items-center justify-center w-full h-[38px] mt-1 text-gray-500 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-red-100 hover:text-red-500">
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={handleAddMaterial} className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-tm-accent rounded-md shadow-sm hover:bg-tm-primary">
                            <PlusIcon className="w-4 h-4"/>Tambah Material Lain
                        </button>
                         {materials.length === 0 && (
                            <p className="text-xs text-center text-gray-500 py-4 border-t mt-4">Belum ada material yang ditambahkan.</p>
                        )}
                    </div>
                </FormSection>

                <div ref={footerRef} className="flex justify-end pt-5 mt-5 space-x-3 border-t">
                    <ActionButtons formId={formId} />
                </div>
            </form>
            <FloatingActionBar isVisible={!isFooterVisible}>
                <ActionButtons formId={formId} />
            </FloatingActionBar>
            
            {/* Allocation Modal */}
            {allocationModal.isOpen && (
                <MaterialAllocationModal 
                    isOpen={allocationModal.isOpen}
                    onClose={() => setAllocationModal(prev => ({ ...prev, isOpen: false }))}
                    itemName={allocationModal.itemName}
                    brand={allocationModal.brand}
                    assets={assets}
                    onSelect={handleAllocationSelect}
                    currentSelectedId={
                        allocationModal.itemIndex !== null 
                        ? materials[allocationModal.itemIndex]?.materialAssetId 
                        : undefined
                    }
                    currentUser={currentUser} // PASS CURRENT USER
                />
            )}
        </>
    );
};

export default CustomerForm;
