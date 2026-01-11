
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { User, Installation, InstallationAsset, Asset } from '../../../../types';
import { useNotification } from '../../../../providers/NotificationProvider';
import { CustomSelect } from '../../../../components/ui/CustomSelect';
import DatePicker from '../../../../components/ui/DatePicker';
import { generateDocumentNumber } from '../../../../utils/documentNumberGenerator';
import { SpinnerIcon } from '../../../../components/icons/SpinnerIcon';
import FloatingActionBar from '../../../../components/ui/FloatingActionBar';
import { Letterhead } from '../../../../components/ui/Letterhead';
import { SignatureStamp } from '../../../../components/ui/SignatureStamp';
import { TrashIcon } from '../../../../components/icons/TrashIcon';
import { PlusIcon } from '../../../../components/icons/PlusIcon';
import { PencilIcon } from '../../../../components/icons/PencilIcon';
import { ArchiveBoxIcon } from '../../../../components/icons/ArchiveBoxIcon';
import { PaperclipIcon } from '../../../../components/icons/PaperclipIcon';
import { useCustomerAssetLogic } from '../../hooks/useCustomerAssetLogic';

// Stores
import { useMasterDataStore } from '../../../../stores/useMasterDataStore';
import { useTransactionStore } from '../../../../stores/useTransactionStore';
import { useAssetStore } from '../../../../stores/useAssetStore'; 

// Components
import { MaterialAllocationModal } from '../../../../components/ui/MaterialAllocationModal'; 
import { useFileAttachment } from '../../../../hooks/useFileAttachment';
import { MAX_FILE_SIZE_MB } from '../../../../utils/fileUtils';
import { BsExclamationTriangle } from 'react-icons/bs';

interface InstallationFormProps {
    currentUser: User;
    onSave: (data: Omit<Installation, 'id'|'status'>) => void;
    onCancel: () => void;
    prefillCustomerId?: string;
}

export const InstallationForm: React.FC<InstallationFormProps> = ({ currentUser, onSave, onCancel, prefillCustomerId }) => {
    // Hooks
    const { installableAssets, materialOptions } = useCustomerAssetLogic();
    const customers = useMasterDataStore(state => state.customers);
    const users = useMasterDataStore(state => state.users);
    const divisions = useMasterDataStore(state => state.divisions);
    const installations = useTransactionStore(state => state.installations);
    const assets = useAssetStore(state => state.assets);

    const [installationDate, setInstallationDate] = useState<Date | null>(new Date());
    const [docNumber, setDocNumber] = useState('');
    const [isManualDocNumber, setIsManualDocNumber] = useState(false); 
    
    const [requestNumber, setRequestNumber] = useState('');
    const [technician, setTechnician] = useState('');
    const [selectedCustomerId, setSelectedCustomerId] = useState(prefillCustomerId || '');
    
    const [assetsInstalled, setAssetsInstalled] = useState<InstallationAsset[]>([]);
    
    type MaterialItemState = { 
        id: number; 
        modelKey: string; 
        quantity: number | ''; 
        unit: string; 
        materialAssetId?: string; 
    };

    const [materialsUsed, setMaterialsUsed] = useState<MaterialItemState[]>([]);
    const [notes, setNotes] = useState('');
    
    // --- File Attachment Hook ---
    const { files, errors: fileErrors, addFiles, removeFile, processAttachmentsForSubmit } = useFileAttachment();
    const [isDragging, setIsDragging] = useState(false);

    const [isLoading, setIsLoading] = useState(false);
    const footerRef = useRef<HTMLDivElement>(null);
    const [isFooterVisible, setIsFooterVisible] = useState(true);
    const formId = "installation-form";
    const addNotification = useNotification();

    // Allocation Modal State
    const [allocationModal, setAllocationModal] = useState<{
        isOpen: boolean;
        itemIndex: number | null;
        itemName: string;
        brand: string;
    }>({ isOpen: false, itemIndex: null, itemName: '', brand: '' });

    const technicianOptions = useMemo(() => users.filter(u => u.divisionId === 3).map(u => ({ value: u.name, label: u.name })), [users]);
    const customerOptions = useMemo(() => customers.map(c => ({ value: c.id, label: `${c.name} (${c.id})` })), [customers]);
    const selectedCustomer = useMemo(() => customers.find(c => c.id === selectedCustomerId), [customers, selectedCustomerId]);
    const ceo = useMemo(() => users.find(u => u.role === 'Super Admin'), [users]);
    const logisticAdmin = useMemo(() => users.find(u => u.role === 'Admin Logistik'), [users]);

    const getDivisionForUser = (userName: string): string | undefined => {
        const user = users.find(u => u.name === userName);
        if (user && user.divisionId) {
            return divisions.find(d => d.id === user.divisionId)?.name;
        }
        return undefined;
    };

    const availableAssetOptions = useMemo(() => {
        const selectedIds = assetsInstalled.map(a => a.assetId);
        return installableAssets.filter(opt => !selectedIds.includes(opt.value));
    }, [installableAssets, assetsInstalled]);

    // Show file errors
    useEffect(() => {
        if (fileErrors.length > 0) fileErrors.forEach(err => addNotification(err, 'error'));
    }, [fileErrors, addNotification]);

    useEffect(() => {
        if (materialsUsed.length === 0) { 
            const requiredMaterials = [
                { name: 'Dropcore 1 Core', brand: 'FiberHome', defaultQty: 50 },
                { name: 'Kabel UTP Cat6', brand: 'Belden', defaultQty: 10 },
                { name: 'Patchcord SC-UPC 3M', brand: 'Generic', defaultQty: 2 },
                { name: 'Adaptor 12V 1A', brand: 'Generic', defaultQty: 1 }
            ];
    
            const defaultMaterials = requiredMaterials
                .map((mat, index): MaterialItemState | null => {
                    const modelKey = `${mat.name}|${mat.brand}`;
                    let option = materialOptions.find(opt => opt.value === modelKey);
                    if (!option) {
                         option = materialOptions.find(opt => opt.label.includes(mat.name) && opt.label.includes(mat.brand));
                    }

                    if (option) {
                        return {
                            id: Date.now() + index,
                            modelKey: option.value,
                            quantity: mat.defaultQty,
                            unit: option.unit,
                            materialAssetId: undefined
                        };
                    }
                    return null;
                })
                .filter((m): m is MaterialItemState => m !== null);
            
            setMaterialsUsed(defaultMaterials);
        }
    }, [materialOptions]);

    useEffect(() => {
        if (!isManualDocNumber) {
            const newDocNumber = generateDocumentNumber('WO-IKR', installations, installationDate || new Date());
            setDocNumber(newDocNumber);
        }
    }, [installationDate, installations, isManualDocNumber]);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => setIsFooterVisible(entry.isIntersecting), { threshold: 0.1 });
        const currentRef = footerRef.current;
        if (currentRef) observer.observe(currentRef);
        return () => { if (currentRef) observer.unobserve(currentRef); };
    }, []);

    const handleAddAsset = (assetId: string) => {
        const assetOption = installableAssets.find(a => a.value === assetId);
        if (assetOption && !assetsInstalled.some(a => a.assetId === assetId)) {
            setAssetsInstalled(prev => [...prev, { 
                assetId: assetOption.value, 
                assetName: assetOption.original.name, 
                serialNumber: assetOption.original.serialNumber ?? undefined 
            }]);
        }
    };

    const handleRemoveAsset = (assetId: string) => {
        setAssetsInstalled(prev => prev.filter(a => a.assetId !== assetId));
    };

    const handleAddMaterial = () => {
        setMaterialsUsed(prev => [...prev, { id: Date.now(), modelKey: '', quantity: 1, unit: 'pcs', materialAssetId: undefined }]);
    };
    const handleRemoveMaterial = (id: number) => {
        setMaterialsUsed(prev => prev.filter(m => m.id !== id));
    };
    const handleMaterialChange = (id: number, field: 'modelKey' | 'quantity', value: any) => {
        setMaterialsUsed(prev => prev.map(item => {
            if (item.id === id) {
                const updatedItem = { ...item, [field]: value };
                if (field === 'modelKey') {
                    const model = materialOptions.find(opt => opt.value === value);
                    updatedItem.unit = model?.unit || 'pcs';
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
            setMaterialsUsed(prev => prev.map((item, idx) => {
                if (idx === allocationModal.itemIndex) {
                    return { ...item, materialAssetId: asset.id };
                }
                return item;
            }));
        }
    };
    
    // --- File Handling (Using Hook) ---
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

    const handleDocNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setDocNumber(e.target.value.toUpperCase());
        setIsManualDocNumber(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCustomerId || !technician) {
            addNotification('Pelanggan dan Teknisi harus dipilih.', 'error');
            return;
        }
        if (assetsInstalled.length === 0 && materialsUsed.filter(m => m.modelKey && m.quantity).length === 0) {
            addNotification('Tambahkan setidaknya satu aset atau material yang dipasang.', 'error');
            return;
        }
        if (!docNumber.trim()) {
            addNotification('Nomor Dokumen tidak boleh kosong.', 'error');
            return;
        }

        setIsLoading(true);

        const finalMaterials = materialsUsed
            .filter(m => m.modelKey && m.quantity && Number(m.quantity) > 0)
            .map(m => {
                const [name, brand] = m.modelKey.split('|');
                return { 
                    materialAssetId: m.materialAssetId, 
                    itemName: name, 
                    brand: brand, 
                    quantity: Number(m.quantity), 
                    unit: m.unit 
                };
            });
            
        // Process attachments (Base64)
        const processedAttachments = await processAttachmentsForSubmit();

        onSave({
            docNumber, 
            requestNumber: requestNumber || undefined,
            installationDate: installationDate!.toISOString().split('T')[0],
            technician,
            customerId: selectedCustomer!.id,
            customerName: selectedCustomer!.name,
            assetsInstalled,
            materialsUsed: finalMaterials.length > 0 ? finalMaterials : undefined,
            notes,
            acknowledger: ceo?.name,
            createdBy: currentUser.name,
            attachments: processedAttachments, 
        });
        setIsLoading(false);
    };

    const ActionButtons:React.FC<{formId: string}> = ({formId}) => (
        <>
            <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Batal</button>
            <button type="submit" form={formId} disabled={isLoading} className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-semibold text-white transition-all duration-200 rounded-lg shadow-sm bg-tm-primary hover:bg-tm-primary-hover disabled:bg-tm-primary/70">
                {isLoading && <SpinnerIcon className="w-4 h-4 mr-2" />} Simpan Laporan
            </button>
        </>
    );

    const isTechnician = currentUser.role === 'Staff';
    const stampLayout = isTechnician 
        ? [
            { title: 'Dibuat Oleh', name: currentUser.name, division: getDivisionForUser(currentUser.name) },
            { title: 'Logistik', name: logisticAdmin?.name, division: getDivisionForUser(logisticAdmin?.name || '') },
            { title: 'Mengetahui', name: ceo?.name, division: getDivisionForUser(ceo?.name || '') }
          ]
        : [
            { title: 'Dibuat Oleh', name: currentUser.name, division: getDivisionForUser(currentUser.name) },
            { title: 'Teknisi', name: technician, division: getDivisionForUser(technician) },
            { title: 'Mengetahui', name: ceo?.name, division: getDivisionForUser(ceo?.name || '') }
          ];

    return (
        <>
            <form id={formId} onSubmit={handleSubmit} className="space-y-6">
                <Letterhead />
                 <div className="text-center">
                    <h3 className="text-xl font-bold uppercase text-tm-dark">Berita Acara Instalasi</h3>
                </div>
                <section className="p-4 border-t border-b">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Tanggal Instalasi</label>
                            <DatePicker id="instDate" selectedDate={installationDate} onDateChange={setInstallationDate} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Teknisi</label>
                            <CustomSelect options={technicianOptions} value={technician} onChange={setTechnician} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">No. Dokumen (WO-IKR)</label>
                            <div className="relative mt-1">
                                <input type="text" value={docNumber} onChange={handleDocNumberChange} className="block w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-md shadow-sm sm:text-sm focus:ring-tm-accent focus:border-tm-accent" placeholder="WO-IKR-DDMMYY-NNNN"/>
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400"><PencilIcon className="w-4 h-4" /></div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">No. Request Terkait (Opsional)</label>
                            <input type="text" value={requestNumber} onChange={e => setRequestNumber(e.target.value)} className="w-full mt-1 p-2 bg-white border border-gray-300 rounded-md shadow-sm" placeholder="Contoh: REQ-123"/>
                        </div>
                    </div>
                </section>
                <section>
                    <h4 className="font-semibold text-gray-800 border-b pb-1 mb-4">Informasi Pelanggan</h4>
                    <CustomSelect options={customerOptions} value={selectedCustomerId} onChange={setSelectedCustomerId} isSearchable placeholder="Cari pelanggan..." disabled={!!prefillCustomerId}/>
                </section>
                <section>
                    <h4 className="font-semibold text-gray-800 border-b pb-1 mb-4">Aset & Material Terpasang</h4>
                    <div className="p-4 border rounded-lg bg-gray-50/50">
                        <h5 className="font-semibold text-gray-700 mb-2">Perangkat Terpasang</h5>
                        <CustomSelect options={availableAssetOptions} value="" onChange={handleAddAsset} placeholder="Tambah perangkat dari gudang..." isSearchable/>
                        <div className="mt-2 space-y-2">
                            {assetsInstalled.map(asset => (
                                <div key={asset.assetId} className="flex items-center justify-between p-2 text-sm bg-white border rounded-md"><span className="font-medium">{asset.assetName} <span className="font-mono text-xs">({asset.assetId})</span></span><button type="button" onClick={() => handleRemoveAsset(asset.assetId)} className="p-1 text-red-500 rounded-full hover:bg-red-100"><TrashIcon className="w-4 h-4" /></button></div>
                            ))}
                        </div>
                    </div>
                    <div className="p-4 mt-4 border rounded-lg bg-gray-50/50">
                        <h5 className="font-semibold text-gray-700 mb-2">Material Terpakai</h5>
                        <div className="space-y-3">
                            {materialsUsed.map((material, index) => (
                                <div key={material.id} className="grid grid-cols-12 gap-2 items-start">
                                    <div className="col-span-5">
                                        <CustomSelect options={materialOptions} value={material.modelKey} onChange={v => handleMaterialChange(material.id, 'modelKey', v)} isSearchable placeholder="Pilih material..."/>
                                    </div>
                                    <div className="col-span-3 relative">
                                        <input type="number" value={material.quantity} onChange={e => handleMaterialChange(material.id, 'quantity', e.target.value)} min="1" className="block w-full px-3 py-2 pr-12 text-sm text-gray-900 bg-white border border-gray-300 rounded-lg shadow-sm" placeholder="Jumlah"/>
                                        <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm text-gray-500 pointer-events-none">{material.unit}</span>
                                    </div>
                                    <div className="col-span-3">
                                         <button type="button" onClick={() => handleOpenAllocationModal(index, material.modelKey)} disabled={!material.modelKey} className={`w-full h-10 px-2 text-xs font-semibold rounded-lg border flex items-center justify-center gap-1 transition-colors ${material.materialAssetId ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}>{material.materialAssetId ? 'Ubah' : 'Sumber'}</button>
                                    </div>
                                    <div className="col-span-1"><button type="button" onClick={() => handleRemoveMaterial(material.id)} className="w-full h-10 flex items-center justify-center text-red-500 bg-white border rounded-lg shadow-sm hover:bg-red-50"><TrashIcon className="w-5 h-5"/></button></div>
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={handleAddMaterial} className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-tm-accent rounded-md shadow-sm hover:bg-tm-primary"><PlusIcon/>Tambah Material</button>
                    </div>
                </section>
                
                <section className="p-4 border-t border-b border-gray-200">
                    <h4 className="font-semibold text-gray-800 border-b pb-1 mb-4">Catatan Tambahan</h4>
                    <div>
                        <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Catatan Instalasi</label>
                        <textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="block w-full px-3 py-2 mt-1 text-gray-900 placeholder:text-gray-400 bg-gray-50 border border-gray-300 rounded-md shadow-sm" placeholder="Contoh: Posisi router di ruang tamu..."/>
                    </div>
                    
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

                <section className="pt-8 mt-8 border-t">
                    <div className="grid grid-cols-1 md:grid-cols-3 text-center text-sm gap-6">
                        {stampLayout.map(stamp => (
                            <div key={stamp.title}>
                                <p className="font-semibold text-gray-600">{stamp.title},</p>
                                <div className="flex items-center justify-center mt-2 h-28">{stamp.name ? <SignatureStamp signerName={stamp.name} signatureDate={installationDate?.toISOString() || ''} signerDivision={stamp.division} /> : <div className="w-40 h-24 border-2 border-dashed rounded-md flex items-center justify-center text-gray-400 italic">Menunggu</div>}</div>
                                <p className="pt-1 mt-2 border-t border-gray-400">({stamp.name || '.........................'})</p>
                            </div>
                        ))}
                    </div>
                </section>

                 <div ref={footerRef} className="flex justify-end pt-5 mt-5 space-x-3 border-t">
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
                    currentSelectedId={
                        allocationModal.itemIndex !== null 
                        ? materialsUsed[allocationModal.itemIndex]?.materialAssetId 
                        : undefined
                    }
                    currentUser={currentUser} // Pass currentUser here
                />
            )}
        </>
    );
};
