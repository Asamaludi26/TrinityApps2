
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Customer, Asset, User, Maintenance, ItemStatus, AssetCondition, MaintenanceMaterial, MaintenanceReplacement, Attachment, AssetStatus } from '../../../types';
import DatePicker from '../../../components/ui/DatePicker';
import { CustomSelect } from '../../../components/ui/CustomSelect';
import { SpinnerIcon } from '../../../components/icons/SpinnerIcon';
import { Letterhead } from '../../../components/ui/Letterhead';
import { SignatureStamp } from '../../../components/ui/SignatureStamp';
import { PaperclipIcon } from '../../../components/icons/PaperclipIcon';
import { TrashIcon } from '../../../components/icons/TrashIcon';
import { Checkbox } from '../../../components/ui/Checkbox';
import { generateDocumentNumber } from '../../../utils/documentNumberGenerator';
import { CloseIcon } from '../../../components/icons/CloseIcon';
import { PlusIcon } from '../../../components/icons/PlusIcon';
import { ArchiveBoxIcon } from '../../../components/icons/ArchiveBoxIcon';
import { useNotification } from '../../../providers/NotificationProvider';
import { useCustomerAssetLogic } from '../hooks/useCustomerAssetLogic';
import FloatingActionBar from '../../../components/ui/FloatingActionBar';
import { MaterialAllocationModal } from '../../../components/ui/MaterialAllocationModal';
import { BsBoxSeam, BsWrench, BsLightningFill, BsArrowDown, BsExclamationTriangle } from 'react-icons/bs';

// New Imports
import { useFileAttachment } from '../../../hooks/useFileAttachment';
import { MAX_FILE_SIZE_MB } from '../../../utils/fileUtils';

interface MaintenanceFormProps {
    currentUser: User;
    customers: Customer[];
    assets: Asset[];
    users: User[];
    maintenances: Maintenance[];
    onSave: (data: Omit<Maintenance, 'id' | 'status' | 'docNumber'>) => void;
    onCancel: () => void;
    isLoading: boolean;
    prefillCustomerId?: string;
    prefillAssetId?: string;
}

const allWorkTypes = ['Ganti Perangkat', 'Splicing FO', 'Tarik Ulang Kabel', 'Ganti Konektor', 'Backup Sementara', 'Lainnya'];

const MaintenanceForm: React.FC<MaintenanceFormProps> = ({ currentUser, customers, assets, users, maintenances, onSave, onCancel, isLoading, prefillCustomerId, prefillAssetId }) => {
    const { getCustomerAssets, getReplacementOptions, materialOptions } = useCustomerAssetLogic();

    const [maintenanceDate, setMaintenanceDate] = useState<Date | null>(new Date());
    const [docNumber, setDocNumber] = useState('');
    const [requestNumber, setRequestNumber] = useState('');
    const [technician, setTechnician] = useState(currentUser.name);
    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
    const [problemDescription, setProblemDescription] = useState('');
    const [actionsTaken, setActionsTaken] = useState('');
    const [notes, setNotes] = useState(''); 
    
    // File Handler Hook
    const { files, errors: fileErrors, addFiles, removeFile, processAttachmentsForSubmit } = useFileAttachment();
    const [isDragging, setIsDragging] = useState(false);

    const [workTypes, setWorkTypes] = useState<string[]>([]);
    const [priority, setPriority] = useState<'Tinggi' | 'Sedang' | 'Rendah'>('Sedang');
    
    const [replacements, setReplacements] = useState<Record<string, Partial<MaintenanceReplacement>>>({});
    
    type AdditionalMaterialItem = { 
        id: number; 
        modelKey: string; 
        quantity: number | '';
        unit: string;
        materialAssetId?: string;
    };
    const [additionalMaterials, setAdditionalMaterials] = useState<AdditionalMaterialItem[]>([]);
    
    const [workTypeInput, setWorkTypeInput] = useState('');
    const workTypeInputRef = useRef<HTMLInputElement>(null);
    const addNotification = useNotification();
    
    const [isFooterVisible, setIsFooterVisible] = useState(true);
    const footerRef = useRef<HTMLDivElement>(null);
    const formId = "maintenance-form";

    const [allocationModal, setAllocationModal] = useState<{
        isOpen: boolean;
        itemIndex: number | null;
        itemName: string;
        brand: string;
    }>({ isOpen: false, itemIndex: null, itemName: '', brand: '' });

    const assetsForCustomer = useMemo(() => getCustomerAssets(selectedCustomerId), [selectedCustomerId, getCustomerAssets]);
    const selectedCustomer = useMemo(() => customers.find(c => c.id === selectedCustomerId), [customers, selectedCustomerId]);

    // Show file errors
    useEffect(() => {
        if (fileErrors.length > 0) fileErrors.forEach(err => addNotification(err, 'error'));
    }, [fileErrors, addNotification]);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => setIsFooterVisible(entry.isIntersecting), { threshold: 0.1 });
        const currentRef = footerRef.current;
        if (currentRef) observer.observe(currentRef);
        return () => { if (currentRef) observer.unobserve(currentRef); };
    }, []);

    useEffect(() => {
        if (prefillCustomerId) {
            setSelectedCustomerId(prefillCustomerId);
            const customerAssets = getCustomerAssets(prefillCustomerId);
            if (!prefillAssetId && customerAssets.length === 1) {
                 setSelectedAssetIds([customerAssets[0].id]);
            }
        }
    }, [prefillCustomerId, prefillAssetId, getCustomerAssets]);

    useEffect(() => {
        if (prefillAssetId) {
            const asset = assets.find(a => a.id === prefillAssetId);
            if (asset && asset.currentUser) {
                setSelectedCustomerId(asset.currentUser);
                setSelectedAssetIds(prev => {
                    if (prev.includes(prefillAssetId)) return prev;
                    return [...prev, prefillAssetId];
                });
            }
        }
    }, [prefillAssetId, assets]);

    const availableSuggestions = useMemo(() => {
        return allWorkTypes.filter(
            wt => !workTypes.includes(wt) && wt.toLowerCase().includes(workTypeInput.toLowerCase())
        );
    }, [workTypes, workTypeInput]);

    useEffect(() => {
        if (!maintenanceDate) {
            setDocNumber('[Otomatis]');
            return;
        }
        const newDocNumber = generateDocumentNumber('WO-MT', maintenances, maintenanceDate);
        setDocNumber(newDocNumber);
    }, [maintenanceDate, maintenances]);

    const customerOptions = useMemo(() => customers.map(c => ({ value: c.id, label: `${c.name} (${c.id})` })), [customers]);
    const technicianOptions = useMemo(() => users.filter(u => u.divisionId === 3).map(u => ({ value: u.name, label: u.name })), [users]);
    
    const handleWorkTypeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setWorkTypeInput(e.target.value);
    };

    const addWorkType = (workType: string) => {
        const trimmed = workType.trim();
        if (trimmed && !workTypes.includes(trimmed)) {
            setWorkTypes(prev => [...prev, trimmed]);
        }
        setWorkTypeInput('');
        workTypeInputRef.current?.focus();
    };

    const removeWorkType = (workTypeToRemove: string) => {
        setWorkTypes(prev => prev.filter(wt => wt !== workTypeToRemove));
    };

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (workTypeInput) {
                addWorkType(workTypeInput);
            }
        }
    };

    // --- File Handling ---
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) addFiles(Array.from(event.target.files));
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
        if (e.dataTransfer.files) addFiles(Array.from(e.dataTransfer.files));
    };

    const handleAssetSelection = (assetId: string) => {
        const isCurrentlySelected = selectedAssetIds.includes(assetId);
        
        setSelectedAssetIds(prev => 
            isCurrentlySelected ? prev.filter(id => id !== assetId) : [...prev, assetId]
        );
        
        if (isCurrentlySelected) {
            setReplacements(prev => {
                const newReplacements = {...prev};
                delete newReplacements[assetId];
                return newReplacements;
            });
        }
    };

    const toggleReplacement = (assetId: string) => {
        setReplacements(prev => {
            const newReplacements = { ...prev };
            if (newReplacements[assetId]) {
                delete newReplacements[assetId];
            } else {
                newReplacements[assetId] = { oldAssetId: assetId, retrievedAssetCondition: AssetCondition.USED_OKAY };
            }
            return newReplacements;
        });
    };

    const updateReplacementDetail = (oldAssetId: string, field: keyof MaintenanceReplacement, value: any) => {
        setReplacements(prev => ({
            ...prev,
            [oldAssetId]: {
                ...prev[oldAssetId],
                [field]: value
            }
        }));
    };
    
    const addAdditionalMaterial = () => {
        setAdditionalMaterials(prev => [...prev, { id: Date.now(), modelKey: '', quantity: 1, unit: 'Pcs' }]);
    };

    const handleMaintainMaterial = (installed: { itemName: string, brand: string, unit: string, quantity: number }) => {
        const key = `${installed.itemName}|${installed.brand}`;
        const exists = additionalMaterials.some(m => m.modelKey === key);
        if (exists) {
            addNotification('Material ini sudah ada dalam daftar maintenance.', 'info');
            return;
        }

        setAdditionalMaterials(prev => [...prev, {
            id: Date.now(),
            modelKey: key,
            quantity: installed.quantity, 
            unit: installed.unit,
            materialAssetId: undefined
        }]);
    };
    
    const removeAdditionalMaterial = (id: number) => {
        setAdditionalMaterials(prev => prev.filter(item => item.id !== id));
    };

    const handleMaterialChange = (id: number, field: keyof AdditionalMaterialItem, value: any) => {
        setAdditionalMaterials(prev => prev.map(item => {
            if (item.id === id) {
                const updatedItem = { ...item, [field]: value };
                if (field === 'modelKey') {
                    const model = materialOptions.find(opt => opt.value === value);
                    updatedItem.unit = model?.unit || 'Pcs';
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

    // UPDATED: Handle Full Asset Object selection for validation
    const handleAllocationSelect = (asset: Asset) => {
        if (allocationModal.itemIndex !== null) {
            setAdditionalMaterials(prev => prev.map((item, idx) => {
                if (idx === allocationModal.itemIndex) {
                    
                    let newQuantity = item.quantity;
                    const isMeasurement = asset.initialBalance !== undefined && asset.currentBalance !== undefined;
                    
                    if (isMeasurement) {
                        // Jika tipe measurement (Kabel/Pipa), cek apakah quantity yg diminta > sisa stok
                        const currentBalance = asset.currentBalance || 0;
                        if (Number(item.quantity) > currentBalance) {
                            newQuantity = currentBalance;
                            addNotification(`Kuantitas disesuaikan dengan sisa stok aset (${newQuantity}).`, 'info');
                        }
                    } else {
                        // Jika tipe Unit (SN Unik), quantity HARUS 1
                        newQuantity = 1;
                        if (item.quantity !== 1) {
                            addNotification("Aset individual terpilih, kuantitas diatur ke 1.", 'info');
                        }
                    }

                    return { 
                        ...item, 
                        materialAssetId: asset.id,
                        quantity: newQuantity
                    };
                }
                return item;
            }));
            addNotification("Sumber stok berhasil dipilih.", "success");
        }
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const customer = customers.find(c => c.id === selectedCustomerId);

        const hasAssets = selectedAssetIds.length > 0;
        const hasNewMaterials = additionalMaterials.filter(m => m.modelKey && m.quantity).length > 0;

        if (!customer || (!hasAssets && !hasNewMaterials)) {
            addNotification('Pilih setidaknya satu aset atau tambahkan material untuk membuat laporan.', 'error');
            return;
        }

        const selectedAssetsInfo = selectedAssetIds.map(id => {
            const asset = assets.find(a => a.id === id);
            return { assetId: id, assetName: asset?.name || 'N/A' };
        });
        
        const finalReplacements = (Object.values(replacements) as Partial<MaintenanceReplacement>[]).filter((r): r is MaintenanceReplacement => {
            return !!(r && r.oldAssetId && r.newAssetId && r.retrievedAssetCondition);
        });

        const finalWorkTypes = finalReplacements.length > 0 ? [...new Set([...workTypes, 'Ganti Perangkat'])] : workTypes;
        
        // Convert files to Base64
        const processedAttachments = await processAttachmentsForSubmit();
        
        const finalMaterialsUsed: MaintenanceMaterial[] = [];
        additionalMaterials.filter(m => m.modelKey && m.quantity).forEach(m => {
             const [name, brand] = m.modelKey.split('|');
             finalMaterialsUsed.push({
                 materialAssetId: m.materialAssetId,
                 itemName: name,
                 brand: brand,
                 quantity: Number(m.quantity),
                 unit: m.unit
             });
        });

        onSave({
            maintenanceDate: maintenanceDate!.toISOString(),
            requestNumber: requestNumber || undefined,
            technician,
            customerId: customer.id,
            customerName: customer.name,
            assets: selectedAssetsInfo.length > 0 ? selectedAssetsInfo : undefined,
            problemDescription,
            actionsTaken,
            workTypes: finalWorkTypes,
            priority,
            attachments: processedAttachments,
            materialsUsed: finalMaterialsUsed.length > 0 ? finalMaterialsUsed : undefined,
            replacements: finalReplacements.length > 0 ? finalReplacements : undefined,
            notes: notes.trim() 
        });
    };

    const ActionButtons:React.FC<{formId: string}> = ({formId}) => (
        <>
            <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Batal</button>
            <button type="submit" form={formId} disabled={isLoading} className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-semibold text-white transition-all duration-200 rounded-lg shadow-sm bg-tm-primary hover:bg-tm-primary-hover disabled:bg-tm-primary/70">
                {isLoading && <SpinnerIcon className="w-4 h-4 mr-2" />} Simpan Laporan
            </button>
        </>
    );

    return (
        <>
            <form id={formId} onSubmit={handleSubmit} className="space-y-6">
                <Letterhead />
                <div className="text-center">
                    <h3 className="text-xl font-bold uppercase text-tm-dark">Laporan Kunjungan Maintenance</h3>
                </div>

                <section className="p-4 border-t border-b">
                    <h4 className="font-semibold text-gray-800 border-b pb-1 mb-4">Informasi Dokumen</h4>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                         <div>
                            <label className="block text-sm font-medium text-gray-700">Tanggal Kunjungan</label>
                            <DatePicker id="maintenanceDate" selectedDate={maintenanceDate} onDateChange={setMaintenanceDate} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Teknisi</label>
                            <CustomSelect options={technicianOptions} value={technician} onChange={setTechnician} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Nomor Dokumen</label>
                            <input type="text" value={docNumber} readOnly className="w-full mt-1 p-2 bg-gray-100 border border-gray-200 rounded-md text-gray-600" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Nomor Request Terkait</label>
                            <input type="text" value={requestNumber} onChange={e => setRequestNumber(e.target.value)} className="w-full mt-1 p-2 bg-white border border-gray-300 rounded-md shadow-sm" placeholder="Opsional, cth: REQ-001" />
                        </div>
                    </div>
                </section>
                
                <section>
                    <h4 className="font-semibold text-gray-800 border-b pb-1 mb-4">Informasi Pelanggan</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Pilih Pelanggan</label>
                            <CustomSelect 
                                options={customerOptions} 
                                value={selectedCustomerId} 
                                onChange={(val) => {
                                    setSelectedCustomerId(val);
                                    setSelectedAssetIds([]);
                                }} 
                                isSearchable 
                                placeholder="Cari pelanggan..." 
                                disabled={!!prefillCustomerId || !!prefillAssetId}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">ID Pelanggan</label>
                            <input type="text" value={selectedCustomerId} readOnly className="w-full mt-1 p-2 bg-gray-100 border border-gray-200 rounded-md text-gray-600" />
                        </div>
                    </div>
                </section>

                 <section>
                    <h4 className="font-semibold text-gray-800 border-b pb-1 mb-4 flex items-center gap-2">
                         <BsBoxSeam className="text-tm-primary"/> Perangkat Terpasang (Pengecekan)
                    </h4>
                    <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm bg-white">
                        <table className="min-w-full text-sm divide-y divide-gray-200">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="w-12 px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Cek</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Item</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Detail</th>
                                    <th className="w-40 px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {assetsForCustomer.length > 0 ? (
                                    assetsForCustomer.map(asset => {
                                        const isSelected = selectedAssetIds.includes(asset.id);
                                        const isReplacingThis = !!replacements[asset.id];
                                        const otherSelected = (Object.values(replacements) as Partial<MaintenanceReplacement>[]).filter(r => r.oldAssetId !== asset.id).map(r => r.newAssetId).filter(Boolean) as string[];

                                        return (
                                            <React.Fragment key={asset.id}>
                                                <tr 
                                                    className={`${isSelected ? 'bg-blue-50/70' : 'hover:bg-gray-50/70'} transition-colors cursor-pointer`}
                                                    onClick={() => handleAssetSelection(asset.id)}
                                                >
                                                    <td className="px-4 py-3 text-center align-top" onClick={(e) => e.stopPropagation()}>
                                                        <Checkbox id={`asset-select-${asset.id}`} checked={isSelected} onChange={() => handleAssetSelection(asset.id)} />
                                                    </td>
                                                    <td className="px-4 py-3 font-semibold text-gray-900 align-top">{asset.name}</td>
                                                    <td className="px-4 py-3 font-mono text-xs text-gray-500 align-top">{asset.id} <br /> SN: {asset.serialNumber || '-'}</td>
                                                    <td className="px-4 py-3 text-center align-top">
                                                        <button 
                                                            type="button" 
                                                            onClick={(e) => { e.stopPropagation(); toggleReplacement(asset.id); }} 
                                                            disabled={!isSelected} 
                                                            className={`px-3 py-1.5 text-xs font-semibold text-white rounded-md shadow-sm transition-colors ${isReplacingThis ? 'bg-red-500 hover:bg-red-600' : 'bg-tm-accent hover:bg-tm-primary'} disabled:bg-gray-300 disabled:cursor-not-allowed`}
                                                        >
                                                            {isReplacingThis ? 'Batal Ganti' : 'Ganti Perangkat'}
                                                        </button>
                                                    </td>
                                                </tr>
                                                {isReplacingThis && (
                                                    <tr className="bg-blue-50/30">
                                                        <td colSpan={4} className="p-4">
                                                            <div className="p-4 bg-white border border-blue-200 rounded-lg shadow-inner space-y-4">
                                                                <h5 className="text-sm font-bold text-tm-primary flex items-center gap-2"><BsWrench/> Panel Penggantian Perangkat</h5>
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                                    <div>
                                                                        <label className="block text-xs font-medium text-gray-700 mb-1">Kondisi Aset Lama</label>
                                                                        <CustomSelect options={Object.values(AssetCondition).map(c => ({ value: c, label: c }))} value={replacements[asset.id]?.retrievedAssetCondition || ''} onChange={value => updateReplacementDetail(asset.id, 'retrievedAssetCondition', value)} />
                                                                    </div>
                                                                    <div>
                                                                        <label className="block text-xs font-medium text-gray-700 mb-1">Aset Pengganti (Dari Stok)</label>
                                                                        <CustomSelect options={getReplacementOptions(asset.id, otherSelected)} value={replacements[asset.id]?.newAssetId || ''} onChange={value => updateReplacementDetail(asset.id, 'newAssetId', value)} isSearchable placeholder="Pilih dari stok..." />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        );
                                    })
                                ) : (
                                    <tr><td colSpan={4} className="p-6 text-center text-gray-500">Tidak ada perangkat terpasang.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
                
                <section>
                    <h4 className="font-semibold text-gray-800 border-b pb-1 mb-4 flex items-center gap-2">
                        <BsLightningFill className="text-orange-600"/> Material Terpasang (Infrastruktur)
                    </h4>
                     <div className="overflow-x-auto border border-gray-200 rounded-xl shadow-sm bg-white mb-6">
                        <table className="min-w-full text-sm divide-y divide-gray-200">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Item</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Terpasang</th>
                                    <th className="w-32 px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {selectedCustomer?.installedMaterials && selectedCustomer.installedMaterials.length > 0 ? (
                                    selectedCustomer.installedMaterials.map((mat, idx) => {
                                        const isAlreadyAdded = additionalMaterials.some(m => m.modelKey === `${mat.itemName}|${mat.brand}`);
                                        return (
                                            <tr key={idx} className="hover:bg-gray-50">
                                                <td className="px-4 py-3"><span className="font-semibold text-gray-900">{mat.itemName}</span><span className="text-xs text-gray-500 block">{mat.brand}</span></td>
                                                <td className="px-4 py-3 text-sm text-gray-700">{mat.quantity} {mat.unit}</td>
                                                <td className="px-4 py-3 text-center"><button type="button" onClick={() => handleMaintainMaterial(mat)} disabled={isAlreadyAdded} className={`px-3 py-1.5 text-xs font-semibold rounded-md shadow-sm transition-colors border flex items-center justify-center gap-1 mx-auto ${isAlreadyAdded ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-orange-600 border-orange-200 hover:bg-orange-50'}`}>{isAlreadyAdded ? 'Ditambahkan' : (<>Maintenance <BsArrowDown /></>)}</button></td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr><td colSpan={3} className="px-6 py-8 text-center text-gray-500 bg-gray-50/50 italic">Belum ada material infrastruktur yang terdata pada pelanggan ini.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section>
                    <h4 className="font-semibold text-gray-800 border-b pb-1 mb-4 flex items-center gap-2">
                        <BsWrench className="text-gray-500"/> Material Digunakan / Sparepart (Input)
                    </h4>
                    <div className="border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                        <table className="min-w-full text-sm divide-y divide-gray-200">
                             <thead className="bg-gray-100">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase w-5/12">Material Name</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase w-2/12">Qty Digunakan</th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase w-4/12">Sumber Stok</th>
                                    <th className="w-10"></th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {additionalMaterials.map((material, index) => (
                                    <tr key={material.id} className="bg-white">
                                        <td className="px-4 py-3 align-top">
                                            <div className="flex flex-col gap-1">
                                                <CustomSelect options={materialOptions} value={material.modelKey} onChange={val => handleMaterialChange(material.id, 'modelKey', val)} placeholder="Pilih material..." isSearchable/>
                                                {material.materialAssetId && <span className="text-[10px] text-blue-600 font-mono bg-blue-50 px-1 rounded w-fit">Sumber: {material.materialAssetId}</span>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 align-top">
                                             <div className="relative">
                                                <input type="number" value={material.quantity} onChange={e => handleMaterialChange(material.id, 'quantity', e.target.value)} min="0.1" step="0.1" className="block w-full px-3 py-2 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg shadow-sm pr-10" placeholder="0"/>
                                                <span className="absolute right-3 top-2 text-xs text-gray-500">{material.unit}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 align-top">
                                            <button type="button" onClick={() => handleOpenAllocationModal(index, material.modelKey)} disabled={!material.modelKey} className={`w-full h-[38px] px-2 text-xs font-semibold rounded-lg border flex items-center justify-center gap-1 transition-colors ${material.materialAssetId ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'} ${!material.modelKey ? 'opacity-50 cursor-not-allowed' : ''}`} title="Pilih sumber stok spesifik (Drum/Box)"><ArchiveBoxIcon className="w-3.5 h-3.5" />{material.materialAssetId ? 'Ubah' : 'Otomatis (FIFO)'}</button>
                                        </td>
                                        <td className="px-4 py-3 text-center align-top">
                                            <button type="button" onClick={() => removeAdditionalMaterial(material.id)} className="p-2 text-red-500 rounded-full hover:bg-red-100 bg-white border border-gray-200"><TrashIcon className="w-4 h-4" /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="bg-gray-50 p-2 border-t text-center">
                            <button type="button" onClick={() => addAdditionalMaterial()} className="inline-flex items-center gap-1 text-xs font-semibold text-tm-primary hover:underline">
                                <PlusIcon className="w-3 h-3"/> Tambah Baris Manual
                            </button>
                        </div>
                    </div>
                </section>
                
                <section>
                    <h4 className="font-semibold text-gray-800 border-b pb-1 mb-4">Pekerjaan</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Lingkup Pekerjaan</label>
                            <div className="relative">
                                <div className="flex flex-wrap items-center gap-2 p-2 border border-gray-300 rounded-lg min-h-[42px] bg-gray-50">
                                    {workTypes.map(workType => (
                                        <span key={workType} className="inline-flex items-center gap-2 px-2.5 py-1 text-sm font-medium text-white bg-tm-primary rounded-full">{workType}<button type="button" onClick={() => removeWorkType(workType)} className="p-0.5 -mr-1 text-white/70 rounded-full hover:bg-white/20"><CloseIcon className="w-3 h-3" /></button></span>
                                    ))}
                                    <input ref={workTypeInputRef} type="text" value={workTypeInput} onChange={handleWorkTypeInputChange} onKeyDown={handleInputKeyDown} placeholder={workTypes.length === 0 ? "Ketik lingkup pekerjaan, lalu Enter..." : ""} className="flex-1 min-w-[200px] h-full p-1 bg-transparent border-none focus:ring-0 text-sm" />
                                </div>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {availableSuggestions.map(suggestion => (
                                        <button type="button" key={suggestion} onClick={() => addWorkType(suggestion)} className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-200 rounded-md hover:bg-gray-300 hover:text-gray-800">+ {suggestion}</button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Prioritas</label>
                            <CustomSelect options={[{ value: 'Tinggi', label: 'Tinggi' },{ value: 'Sedang', label: 'Sedang' },{ value: 'Rendah', label: 'Rendah' }]} value={priority} onChange={(value) => setPriority(value as 'Tinggi' | 'Sedang' | 'Rendah')} />
                        </div>
                    </div>
                </section>
                
                <section>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Laporan Masalah & Diagnosa</label>
                        <textarea value={problemDescription} onChange={e => setProblemDescription(e.target.value)} rows={3} className="block w-full px-3 py-2 mt-1 text-gray-900 placeholder:text-gray-400 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-tm-accent focus:border-tm-accent sm:text-sm" required placeholder="Jelaskan keluhan pelanggan dan hasil diagnosa teknisi." />
                    </div>
                    <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700">Catatan Tindakan & Solusi</label>
                        <textarea value={actionsTaken} onChange={e => setActionsTaken(e.target.value)} rows={5} className="block w-full px-3 py-2 mt-1 text-gray-900 placeholder:text-gray-400 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-tm-accent focus:border-tm-accent sm:text-sm" required placeholder="Jelaskan secara detail tindakan yang telah dilakukan."/>
                    </div>
                     <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700">Catatan Tambahan (Optional)</label>
                        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className="block w-full px-3 py-2 mt-1 text-gray-900 placeholder:text-gray-400 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-tm-accent focus:border-tm-accent sm:text-sm" placeholder="Catatan lain yang tidak termasuk di atas..."/>
                    </div>
                </section>

                <section>
                     <div className="mt-4">
                        <label className="block text-sm font-medium text-gray-700">Lampiran (Foto/Dokumen)</label>
                        <div onDragEnter={handleDragEvents} onDragOver={handleDragEvents} onDragLeave={handleDragEvents} onDrop={handleDrop} className={`flex items-center justify-center w-full px-6 pt-5 pb-6 mt-1 border-2 border-dashed rounded-md transition-colors ${isDragging ? 'border-tm-primary bg-blue-50' : 'border-gray-300'}`}>
                            <div className="space-y-1 text-center">
                            <PaperclipIcon className="w-10 h-10 mx-auto text-gray-400" />
                                <div className="flex text-sm text-gray-600">
                                    <label htmlFor="file-upload" className="relative font-medium bg-transparent rounded-md cursor-pointer text-tm-primary hover:text-tm-accent focus-within:outline-none"><span>Pilih file</span><input id="file-upload" name="file-upload" type="file" className="sr-only" multiple onChange={handleFileChange} /></label>
                                    <p className="pl-1">atau tarik dan lepas</p>
                                </div>
                                <p className="text-xs text-gray-500">PNG, JPG, PDF hingga {MAX_FILE_SIZE_MB}MB</p>
                            </div>
                        </div>

                        {/* Error Warning */}
                        {fileErrors.length > 0 && <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600 flex items-center gap-2"><BsExclamationTriangle /> {fileErrors[0]}</div>}

                        {files.length > 0 && (
                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {files.map(item => (
                                    <div key={item.id} className="flex items-center justify-between p-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-md shadow-sm">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            {item.file.type.startsWith('image/') ? <img src={item.previewUrl} alt="preview" className="w-8 h-8 object-cover rounded" /> : <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center text-gray-500 text-xs font-bold">PDF</div>}
                                            <span className="truncate max-w-[150px]">{item.file.name}</span>
                                        </div>
                                        <button type="button" onClick={() => removeFile(item.id)} className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50"><TrashIcon className="w-4 h-4" /></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </section>

                <div ref={footerRef} className="flex justify-end pt-4 mt-4 border-t border-gray-200">
                    <ActionButtons formId={formId} />
                </div>
            </form>
            <FloatingActionBar isVisible={!isFooterVisible}>
                <ActionButtons formId={formId} />
            </FloatingActionBar>
            
            {allocationModal.isOpen && (
                <MaterialAllocationModal 
                    isOpen={allocationModal.isOpen}
                    onClose={() => setAllocationModal(prev => ({ ...prev, isOpen: false }))}
                    itemName={allocationModal.itemName}
                    brand={allocationModal.brand}
                    assets={assets}
                    onSelect={handleAllocationSelect}
                    currentSelectedId={allocationModal.itemIndex !== null ? additionalMaterials[allocationModal.itemIndex]?.materialAssetId : undefined}
                    currentUser={currentUser} 
                    ownerName={technician} // PASSING TECHNICIAN NAME
                />
            )}
        </>
    );
};

export default MaintenanceForm;
