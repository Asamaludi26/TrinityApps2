
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Customer, CustomerStatus, Asset, InstalledMaterial, AssetCategory, User, AssetStatus } from '../../../types'; 
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
import { CheckIcon } from '../../../components/icons/CheckIcon';
import { PaperclipIcon } from '../../../components/icons/PaperclipIcon'; // Added
import { BsExclamationTriangle, BsFileText } from 'react-icons/bs'; // Added
import { useCustomerAssetLogic } from '../hooks/useCustomerAssetLogic';
import { generateUUID } from '../../../utils/uuid'; 
import { useMasterDataStore } from '../../../stores/useMasterDataStore';
import { useFileAttachment } from '../../../hooks/useFileAttachment'; // Added
import { MAX_FILE_SIZE_MB } from '../../../utils/fileUtils'; // Added

// Components
import { MaterialAllocationModal } from '../../../components/ui/MaterialAllocationModal'; 
import { useAuthStore } from '../../../stores/useAuthStore'; 

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

const FormSection: React.FC<{ title: string; subtitle?: string; icon: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, subtitle, icon, children, className }) => (
    <div className={`bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden ${className}`}>
        <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="p-2 bg-white border border-gray-200 rounded-lg text-tm-primary shadow-sm">
                {icon}
            </div>
            <div>
                <h3 className="text-lg font-bold text-gray-800 leading-tight">{title}</h3>
                {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
            </div>
        </div>
        <div className="p-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            {children}
        </div>
    </div>
);

const CustomerForm: React.FC<CustomerFormProps> = ({ customer, assets, onSave, onCancel, assetCategories }) => {
    // Hooks Logic
    const { installableAssets, materialOptions } = useCustomerAssetLogic();
    const existingCustomers = useMasterDataStore(state => state.customers);
    const currentUser = useAuthStore(state => state.currentUser)!; 
    
    // File Handler Hook
    const { files, errors: fileErrors, addFiles, removeFile, processAttachmentsForSubmit } = useFileAttachment();
    const [isDragging, setIsDragging] = useState(false);

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
    const [notes, setNotes] = useState(''); // New State
    
    // Validation State
    const [emailError, setEmailError] = useState('');
    const [addressError, setAddressError] = useState('');
    const [idError, setIdError] = useState('');
    const [isIdAvailable, setIsIdAvailable] = useState<boolean | null>(null);
    
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
            // MODE EDIT
            setCustomerId(customer.id);
            setName(customer.name);
            setAddress(customer.address);
            setPhone(customer.phone);
            setEmail(customer.email);
            setStatus(customer.status);
            setInstallationDate(new Date(customer.installationDate));
            setServicePackage(customer.servicePackage.replace(/\D/g, '')); // Extract number only
            setNotes(customer.notes || '');
            
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
            setIsIdAvailable(true); // Existing ID is valid
        } else {
            // MODE NEW
            setCustomerId('');
            setName(''); setAddress(''); setPhone(''); setEmail('');
            setStatus(CustomerStatus.ACTIVE); setInstallationDate(new Date()); setServicePackage('');
            setNotes('');
            setInitialAssignedAssetIds([]); setAssignedAssetIds([]);
            
            // Auto-populate Standard Materials Template
            const standardMaterialKeywords = ['Dropcore', 'Patch', 'Adaptor'];
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
            setIsIdAvailable(null);
        }
    }, [customer, assets, materialOptions]);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => setIsFooterVisible(entry.isIntersecting), { threshold: 0.1 });
        const currentRef = footerRef.current;
        if (currentRef) observer.observe(currentRef);
        return () => { if (currentRef) observer.unobserve(currentRef); };
    }, []);

    // Show file errors
    useEffect(() => {
        if (fileErrors.length > 0) {
            fileErrors.forEach(err => addNotification(err, 'error'));
        }
    }, [fileErrors, addNotification]);

    // Validasi Form Global
    const isFormValid = useMemo(() => {
        return (
            customerId.trim() !== '' &&
            !idError &&
            name.trim() !== '' &&
            address.trim() !== '' &&
            phone.trim() !== '' &&
            servicePackage.trim() !== '' &&
            installationDate !== null &&
            !emailError && 
            !addressError
        );
    }, [customerId, idError, name, address, phone, servicePackage, installationDate, emailError, addressError]);

    // --- HANDLERS ---

    const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.toUpperCase().replace(/\s/g, '');
        setCustomerId(val);

        if (val.length < 3) {
            setIdError('ID terlalu pendek (min 3 karakter).');
            setIsIdAvailable(false);
        } else if (!customer && existingCustomers.some(c => c.id === val)) {
            setIdError('ID sudah digunakan oleh pelanggan lain.');
            setIsIdAvailable(false);
        } else {
            setIdError('');
            setIsIdAvailable(true);
        }
    };

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        // Auto Capitalize First Letter
        const formatted = val.replace(/\b\w/g, (char) => char.toUpperCase());
        setName(formatted);
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value.replace(/\D/g, ''); 
        if (!val) { setPhone(''); return; }
        // Format 08.. to 628..
        if (val.startsWith('0')) val = '62' + val.slice(1);
        else if (!val.startsWith('62')) val = '62' + val;
        
        // Simple visual formatting
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
            // Auto prefix "Jl." if missing
            if (!val.match(/^(jl\.|jalan|gg\.|gang|komp\.|ruko)/i)) {
                val = "Jl. " + val;
            }
            setAddress(val);
        }
        validateForm();
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
                
                // Logic: Auto-update unit based on selected model
                if (field === 'modelKey') {
                    const option = materialOptions.find(opt => opt.value === value);
                    updatedItem.unit = option?.unit || 'Pcs'; // Default to config unit
                    updatedItem.materialAssetId = undefined; // Reset allocation
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
    
    // --- File Handling Handlers ---
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            addFiles(Array.from(event.target.files));
        }
    };
    
    const handleDragEvents = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') setIsDragging(true);
        else if (e.type === 'dragleave') setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            addFiles(Array.from(e.dataTransfer.files));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;
        
        // Final Validation before submit
        if (idError) {
             addNotification(idError, 'error');
             return;
        }

        setIsLoading(true);
        
        try {
            // Process Attachments (Base64)
            const processedAttachments = await processAttachmentsForSubmit();
            
            const existingAttachments = customer?.attachments || [];
            const finalAttachments = [...existingAttachments, ...processedAttachments];

            const newlyAssigned = assignedAssetIds.filter(id => !initialAssignedAssetIds.includes(id));
            const unassigned = initialAssignedAssetIds.filter(id => !assignedAssetIds.includes(id));
            
            const finalMaterials = materials
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
                    notes: notes.trim(),
                    attachments: finalAttachments
                }, newlyAssigned, unassigned);
                setIsLoading(false);
            }, 800);
        } catch (e) {
            setIsLoading(false);
            addNotification("Gagal memproses data.", 'error');
        }
    };
    
    const ActionButtons: React.FC<{ formId?: string }> = ({ formId }) => (
        <>
            <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-xl shadow-sm hover:bg-gray-50 transition-all">Batal</button>
            <button 
                type="submit" 
                form={formId} 
                disabled={isLoading || !isFormValid} 
                className={`inline-flex items-center justify-center px-6 py-2.5 text-sm font-bold text-white transition-all duration-200 rounded-xl shadow-lg 
                ${isLoading || !isFormValid ? 'bg-gray-300 cursor-not-allowed shadow-none' : 'bg-tm-primary hover:bg-tm-primary-hover hover:-translate-y-0.5'}`}
            >
                {isLoading && <SpinnerIcon className="w-4 h-4 mr-2" />}
                {customer ? 'Simpan Perubahan' : 'Tambah Pelanggan'}
            </button>
        </>
    );

    return (
        <>
            <form id={formId} onSubmit={handleSubmit} className="space-y-6 pb-32">
                 {/* Section 1: Identitas */}
                 <FormSection title="Identitas Pelanggan" subtitle="Informasi dasar dan kontak." icon={<UsersIcon className="w-5 h-5" />}>
                     <div className="md:col-span-2">
                        <label htmlFor="customerId" className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">ID Pelanggan <span className="text-red-500">*</span></label>
                        <div className="relative">
                            <input 
                                type="text" 
                                id="customerId" 
                                value={customerId} 
                                onChange={handleIdChange} 
                                disabled={!!customer} 
                                required 
                                className={`block w-full px-4 py-2.5 text-gray-900 bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-tm-primary/20 focus:border-tm-primary text-sm font-mono uppercase transition-all ${idError ? 'border-red-300 bg-red-50' : isIdAvailable ? 'border-green-300' : 'border-gray-300'} ${customer ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}
                                placeholder="Contoh: CUST-001" 
                            />
                            {!customer && isIdAvailable && <CheckIcon className="absolute right-3 top-3 w-5 h-5 text-green-500" />}
                        </div>
                        {idError && <p className="mt-1.5 text-xs text-red-600 font-medium flex items-center gap-1"><TrashIcon className="w-3 h-3"/> {idError}</p>}
                     </div>

                     <div className="md:col-span-2">
                        <label htmlFor="customerName" className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Nama Lengkap</label>
                        <input type="text" id="customerName" value={name} onChange={handleNameChange} required className="block w-full px-4 py-2.5 text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-tm-primary/20 focus:border-tm-primary text-sm transition-all" />
                    </div>
                    <div>
                        <label htmlFor="customerPhone" className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">No. WhatsApp / Telepon</label>
                        <input type="tel" id="customerPhone" value={phone} onChange={handlePhoneChange} required className="block w-full px-4 py-2.5 text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-tm-primary/20 focus:border-tm-primary text-sm font-mono" placeholder="+62-..." />
                    </div>
                    <div>
                        <label htmlFor="customerEmail" className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Email</label>
                        <input type="email" id="customerEmail" value={email} onChange={e => setEmail(e.target.value)} onBlur={validateForm} className={`block w-full px-4 py-2.5 text-gray-900 bg-white border rounded-lg focus:ring-2 focus:ring-tm-primary/20 focus:border-tm-primary text-sm ${emailError ? 'border-red-300' : 'border-gray-300'}`} />
                        {emailError && <p className="mt-1 text-xs text-red-600">{emailError}</p>}
                    </div>
                     <div className="md:col-span-2">
                        <label htmlFor="customerAddress" className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Alamat Pemasangan</label>
                        <textarea id="customerAddress" value={address} onChange={e => setAddress(e.target.value)} onBlur={handleAddressBlur} required rows={3} className={`block w-full px-4 py-2.5 text-gray-900 bg-white border rounded-lg focus:ring-2 focus:ring-tm-primary/20 focus:border-tm-primary text-sm ${addressError ? 'border-red-300' : 'border-gray-300'}`} placeholder="Nama Jalan, Nomor, RT/RW, Kelurahan..." />
                        {addressError && <p className="mt-1 text-xs text-red-600">{addressError}</p>}
                    </div>
                </FormSection>

                {/* Section 2: Layanan */}
                <FormSection title="Detail Layanan" subtitle="Paket internet dan status berlangganan." icon={<WrenchIcon className="w-5 h-5" />}>
                     <div>
                        <label htmlFor="customerPackage" className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Paket Bandwidth</label>
                        <div className="relative">
                            <input type="text" id="customerPackage" value={servicePackage} onChange={e => setServicePackage(e.target.value.replace(/\D/g, ''))} placeholder="50" required className="block w-full px-4 py-2.5 pr-12 text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-tm-primary/20 focus:border-tm-primary text-sm font-bold" />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none bg-gray-50 border-l border-gray-200 rounded-r-lg px-3">
                                <span className="text-gray-500 text-xs font-bold">Mbps</span>
                            </div>
                        </div>
                    </div>
                     <div>
                        <label htmlFor="installationDate" className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Tanggal Instalasi</label>
                        <DatePicker id="installationDate" selectedDate={installationDate} onDateChange={setInstallationDate} />
                    </div>
                    <div className="md:col-span-2">
                        <label htmlFor="customerStatus" className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Status Langganan</label>
                        <CustomSelect
                            options={Object.values(CustomerStatus).map(s => ({ value: s, label: s }))}
                            value={status}
                            onChange={value => setStatus(value as CustomerStatus)}
                        />
                    </div>
                </FormSection>
                
                {/* Section 3: Perangkat */}
                <FormSection title="Perangkat Terpasang" subtitle="Modem, Router, dan perangkat aktif lainnya." icon={<AssetIcon className="w-5 h-5" />}>
                    <div className="md:col-span-2 space-y-4">
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <CustomSelect
                                    isSearchable
                                    options={availableAssets}
                                    value={''}
                                    onChange={handleAddAsset}
                                    placeholder="Cari perangkat (SN/Nama)..."
                                    emptyStateMessage="Tidak ada aset tersedia (Cek stok pribadi)."
                                />
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            {assignedAssetIds.map(assetId => {
                                const asset = assets.find(a => a.id === assetId);
                                if (!asset) return null;
                                return (
                                    <div key={assetId} className="flex items-center justify-between p-3 bg-blue-50/50 border border-blue-100 rounded-xl group hover:border-blue-300 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                                                {asset.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-gray-800">{asset.name}</p>
                                                <div className="flex items-center gap-2 text-xs text-gray-500 font-mono mt-0.5">
                                                    <span className="bg-white px-1.5 py-0.5 rounded border border-gray-200">{asset.id}</span>
                                                    {asset.serialNumber && <span>SN: {asset.serialNumber}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <button type="button" onClick={() => handleRemoveAsset(assetId)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Lepas Aset">
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                );
                            })}
                            {assignedAssetIds.length === 0 && (
                                <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                                    <InboxIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                                    <p className="text-sm text-gray-500">Belum ada perangkat yang ditambahkan.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </FormSection>

                {/* Section 4: Material */}
                <FormSection title="Material Instalasi" subtitle="Kabel, konektor, dan aksesoris pasif." icon={<CustomerIcon className="w-5 h-5" />}>
                    <div className="md:col-span-2">
                        <div className="space-y-3">
                            {materials.map((material, index) => (
                                <div key={material.tempId} className="flex flex-col sm:flex-row gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl items-start sm:items-center animate-fade-in-up">
                                    <div className="flex-1 w-full">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Jenis Material</label>
                                        <CustomSelect 
                                            options={materialOptions} 
                                            value={material.modelKey} 
                                            onChange={value => handleMaterialChange(material.tempId, 'modelKey', value)}
                                            isSearchable
                                            placeholder="Pilih item..."
                                        />
                                    </div>
                                    <div className="w-full sm:w-32">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Jumlah</label>
                                        <div className="relative">
                                            <input 
                                                type="number" 
                                                value={material.quantity}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    if (!/^\d*$/.test(val)) return;
                                                    handleMaterialChange(material.tempId, 'quantity', val === '' ? '' : Number(val));
                                                }}
                                                min="0"
                                                className="block w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-tm-primary/20 focus:border-tm-primary text-sm font-bold"
                                            />
                                            <span className="absolute right-3 top-2 text-xs font-medium text-gray-500 pointer-events-none">{material.unit}</span>
                                        </div>
                                    </div>
                                     <div className="w-full sm:w-auto flex items-end gap-2">
                                        <div className="flex-1 sm:flex-none">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block opacity-0 sm:opacity-100">Sumber</label>
                                            <button 
                                                type="button" 
                                                onClick={() => handleOpenAllocationModal(index, material.modelKey)}
                                                disabled={!material.modelKey}
                                                className={`w-full h-[38px] px-3 text-xs font-bold rounded-lg border flex items-center justify-center gap-2 transition-all
                                                    ${material.materialAssetId 
                                                        ? 'bg-blue-600 text-white border-blue-600 shadow-md hover:bg-blue-700' 
                                                        : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                                                    } ${!material.modelKey ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            >
                                                <ArchiveBoxIcon className="w-3.5 h-3.5" />
                                                {material.materialAssetId ? 'Terpilih' : 'Auto'}
                                            </button>
                                        </div>
                                        <button type="button" onClick={() => handleRemoveMaterial(material.tempId)} className="h-[38px] w-[38px] flex items-center justify-center text-gray-400 bg-white border border-gray-200 rounded-lg hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-colors mb-[1px]">
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        
                        <button type="button" onClick={handleAddMaterial} className="mt-4 w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-bold text-xs hover:border-tm-primary hover:text-tm-primary hover:bg-blue-50/50 transition-all flex items-center justify-center gap-2">
                            <PlusIcon className="w-4 h-4"/> Tambah Baris Material
                        </button>
                    </div>
                </FormSection>

                {/* Section 5: Catatan & Lampiran (NEW) */}
                <FormSection title="Catatan & Lampiran" subtitle="Info tambahan dan dokumen pendukung." icon={<BsFileText className="w-5 h-5" />}>
                     <div className="md:col-span-2">
                        <label htmlFor="notes" className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Catatan Tambahan</label>
                        <textarea 
                            id="notes" 
                            rows={3} 
                            value={notes} 
                            onChange={(e) => setNotes(e.target.value)} 
                            className="block w-full px-3 py-2 text-gray-900 placeholder:text-gray-400 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-tm-primary/20 focus:border-tm-primary text-sm" 
                            placeholder="Contoh: Lokasi rumah sulit dijangkau, pagar warna hitam..."
                        />
                    </div>
                    
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1">Upload Lampiran (Foto Rumah / KTP)</label>
                        <div 
                            onDragEnter={handleDragEvents} 
                            onDragOver={handleDragEvents} 
                            onDragLeave={handleDragEvents} 
                            onDrop={handleDrop}
                            className={`flex flex-col items-center justify-center w-full px-6 pt-5 pb-6 mt-1 border-2 border-dashed rounded-lg transition-colors cursor-pointer
                                ${isDragging ? 'border-tm-primary bg-blue-50' : 'border-gray-300 hover:bg-gray-50'}`
                            }
                        >
                             <div className="space-y-1 text-center">
                                <PaperclipIcon className="w-10 h-10 mx-auto text-gray-400" />
                                <div className="flex text-sm text-gray-600 justify-center">
                                    <label htmlFor="file-upload" className="relative font-medium bg-transparent rounded-md cursor-pointer text-tm-primary hover:text-tm-accent focus-within:outline-none">
                                        <span>Pilih file</span>
                                        <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple onChange={handleFileChange} />
                                    </label>
                                    <p className="pl-1">atau tarik dan lepas</p>
                                </div>
                                <p className="text-xs text-gray-500">JPG, PNG, PDF (Max {MAX_FILE_SIZE_MB}MB)</p>
                            </div>
                        </div>

                        {/* Error Warning */}
                        {fileErrors.length > 0 && (
                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600 flex items-center gap-2">
                                <BsExclamationTriangle /> {fileErrors[0]}
                            </div>
                        )}

                        {/* File List */}
                        {files.length > 0 && (
                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {files.map((item) => (
                                    <div key={item.id} className="flex items-center justify-between p-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-md shadow-sm">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            {item.file.type.startsWith('image/') ? (
                                                <img src={item.previewUrl} alt="preview" className="w-8 h-8 object-cover rounded" />
                                            ) : (
                                                <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center text-gray-500 text-xs font-bold">PDF</div>
                                            )}
                                            <span className="truncate max-w-[150px]">{item.file.name}</span>
                                        </div>
                                        <button type="button" onClick={() => removeFile(item.id)} className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50">
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        {/* Show existing attachments count if in edit mode (Optional UX enhancement) */}
                        {customer && customer.attachments && customer.attachments.length > 0 && (
                             <p className="text-xs text-gray-500 mt-2 italic">
                                 * Pelanggan ini sudah memiliki {customer.attachments.length} lampiran sebelumnya. File baru akan ditambahkan.
                             </p>
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
                    currentUser={currentUser} 
                />
            )}
        </>
    );
};

export default CustomerForm;
