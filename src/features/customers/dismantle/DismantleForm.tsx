
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Asset, Customer, User, AssetCondition, Page, AssetStatus, Dismantle } from '../../../types';
import DatePicker from '../../../components/ui/DatePicker';
import { useNotification } from '../../../providers/NotificationProvider';
import FloatingActionBar from '../../../components/ui/FloatingActionBar';
import { Letterhead } from '../../../components/ui/Letterhead';
import { SignatureStamp } from '../../../components/ui/SignatureStamp';
import { CustomSelect } from '../../../components/ui/CustomSelect';
import { PaperclipIcon } from '../../../components/icons/PaperclipIcon';
import { TrashIcon } from '../../../components/icons/TrashIcon';
import { SpinnerIcon } from '../../../components/icons/SpinnerIcon';
import { generateDocumentNumber } from '../../../utils/documentNumberGenerator';
import { useCustomerAssetLogic } from '../hooks/useCustomerAssetLogic';
import { BsBoxSeam, BsLightningFill, BsInfoCircle, BsExclamationTriangle } from 'react-icons/bs';

// New Imports
import { useFileAttachment } from '../../../hooks/useFileAttachment';
import { MAX_FILE_SIZE_MB } from '../../../utils/fileUtils';

interface DismantleFormProps {
    currentUser: User;
    dismantles: Dismantle[];
    onSave: (data: Omit<Dismantle, 'id' | 'status'>) => void;
    onCancel: () => void;
    customers: Customer[];
    users: User[];
    assets: Asset[];
    prefillAsset?: Asset | null;
    prefillCustomerId?: string;
    setActivePage: (page: Page, initialState?: any) => void;
}

const DismantleForm: React.FC<DismantleFormProps> = ({ currentUser, dismantles, onSave, onCancel, customers, users, assets, prefillAsset, prefillCustomerId }) => {
    // Custom Logic Hook
    const { getCustomerAssets } = useCustomerAssetLogic();

    // --- STATE MANAGEMENT ---
    const [dismantleDate, setDismantleDate] = useState<Date | null>(new Date());
    const [docNumber, setDocNumber] = useState('');
    const [requestNumber, setRequestNumber] = useState('');
    const [technician, setTechnician] = useState('');
    const [retrievedCondition, setRetrievedCondition] = useState<AssetCondition>(AssetCondition.USED_OKAY);
    const [notes, setNotes] = useState<string>('');
    
    // File Handling Hook
    const { files, errors: fileErrors, addFiles, removeFile, processAttachmentsForSubmit } = useFileAttachment();
    const [isDragging, setIsDragging] = useState(false);

    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
    const [selectedAssetId, setSelectedAssetId] = useState<string>('');
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFooterVisible, setIsFooterVisible] = useState(true);
    const footerRef = useRef<HTMLDivElement>(null);
    const formId = "dismantle-form";
    const addNotification = useNotification();

    // --- DERIVED STATE & OPTIONS ---
    const assetsForCustomer = useMemo(() => getCustomerAssets(selectedCustomerId), [selectedCustomerId, getCustomerAssets]);
    const selectedAsset = useMemo(() => assetsForCustomer.find(a => a.id === selectedAssetId) || null, [assetsForCustomer, selectedAssetId]);
    const selectedCustomer = useMemo(() => customers.find(c => c.id === selectedCustomerId) || null, [customers, selectedCustomerId]);
    
    const activeCustomerIds = useMemo(() => {
        const ids = new Set<string>();
        assets.forEach(a => {
            if (a.status === AssetStatus.IN_USE && a.currentUser) {
                ids.add(a.currentUser);
            }
        });
        return ids;
    }, [assets]);

    const customerOptions = useMemo(() => {
        return customers
            .filter(c => activeCustomerIds.has(c.id))
            .map(c => ({ value: c.id, label: `${c.name} (${c.id})` }));
    }, [customers, activeCustomerIds]);

    const technicianOptions = useMemo(() => 
        users.filter(u => u.divisionId === 3).map(u => ({ value: u.name, label: u.name })), 
    [users]);
    
    // --- EFFECTS ---
     useEffect(() => {
        setTechnician(currentUser.name);
    }, [currentUser]);

    // Menampilkan error file via notifikasi
    useEffect(() => {
        if (fileErrors.length > 0) {
            fileErrors.forEach(err => addNotification(err, 'error'));
        }
    }, [fileErrors, addNotification]);

    useEffect(() => {
        if (prefillAsset) {
            setSelectedCustomerId(prefillAsset.currentUser || '');
            setSelectedAssetId(prefillAsset.id);
        } else if (prefillCustomerId) {
            setSelectedCustomerId(prefillCustomerId);
            const customerAssets = getCustomerAssets(prefillCustomerId);
            if (customerAssets.length === 1) {
                setSelectedAssetId(customerAssets[0].id);
            }
        }
    }, [prefillAsset, prefillCustomerId, getCustomerAssets]);

    useEffect(() => {
        if (!dismantleDate) {
            setDocNumber('[Otomatis]');
            return;
        }
        const newDocNumber = generateDocumentNumber('WO-DSM', dismantles, dismantleDate);
        setDocNumber(newDocNumber);
    }, [dismantleDate, dismantles]);

    useEffect(() => {
        setRequestNumber(selectedAsset?.poNumber || '');
    }, [selectedAsset]);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => setIsFooterVisible(entry.isIntersecting), { threshold: 0.1 });
        const currentRef = footerRef.current;
        if (currentRef) observer.observe(currentRef);
        return () => { if (currentRef) observer.unobserve(currentRef); };
    }, []);
    
    // --- EVENT HANDLERS ---
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
        if (!selectedAsset || !selectedCustomer) {
            addNotification('Harap pilih aset yang akan ditarik.', 'error');
            return;
        }
        setIsSubmitting(true);
        
        try {
            // Process files to Base64 (Async)
            const processedAttachments = await processAttachmentsForSubmit();

            onSave({
                docNumber,
                requestNumber: requestNumber || undefined,
                assetId: selectedAsset.id,
                assetName: selectedAsset.name,
                dismantleDate: dismantleDate!.toISOString().split('T')[0],
                technician,
                customerName: selectedCustomer.name,
                customerId: selectedCustomer.id,
                customerAddress: selectedCustomer.address,
                retrievedCondition,
                notes: notes.trim() || null,
                acknowledger: null, 
                attachments: processedAttachments,
            });
        } catch (error) {
            console.error("Submission failed", error);
            addNotification('Gagal memproses data. Coba lagi.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    // --- SUB-COMPONENTS ---
     const ActionButtons: React.FC<{ formId?: string }> = ({ formId }) => (
        <>
            <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">
                Batal
            </button>
            <button 
                type="submit" 
                form={formId}
                disabled={isSubmitting || !selectedAsset}
                className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 rounded-lg shadow-sm bg-tm-primary hover:bg-tm-primary-hover disabled:bg-tm-primary/70 disabled:cursor-not-allowed">
                {isSubmitting ? <SpinnerIcon className="w-5 h-5 mr-2" /> : null}
                {isSubmitting ? 'Memproses...' : 'Buat Berita Acara'}
            </button>
        </>
    );

    return (
        <>
            <form id={formId} onSubmit={handleSubmit} className="space-y-6">
                <Letterhead />
                <div className="text-center">
                    <h3 className="text-xl font-bold uppercase text-tm-dark">Berita Acara Penarikan Aset</h3>
                </div>

                <div className="p-4 border-t border-b border-gray-200">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Tanggal Penarikan</label>
                            <DatePicker id="dismantleDate" selectedDate={dismantleDate} onDateChange={setDismantleDate} />
                        </div>
                        <div>
                            <label htmlFor="docNumber" className="block text-sm font-medium text-gray-700">No. Dokumen</label>
                            <input type="text" id="docNumber" readOnly value={docNumber} className="block w-full px-3 py-2 mt-1 text-gray-700 bg-gray-100 border border-gray-200 rounded-lg shadow-sm sm:text-sm" />
                        </div>
                        <div>
                            <label htmlFor="requestNumber" className="block text-sm font-medium text-gray-700">No. Request Terkait</label>
                            <input type="text" id="requestNumber" readOnly value={requestNumber || 'N/A'} className="block w-full px-3 py-2 mt-1 text-gray-700 bg-gray-100 border border-gray-200 rounded-lg shadow-sm sm:text-sm" />
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-gray-50 border rounded-lg">
                    <h3 className="text-base font-semibold text-gray-800 mb-4">Informasi Pelanggan</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Pilih Pelanggan</label>
                            <CustomSelect
                                options={customerOptions}
                                value={selectedCustomerId}
                                onChange={(val) => { setSelectedCustomerId(val); setSelectedAssetId(''); }}
                                placeholder="-- Cari Pelanggan --"
                                emptyStateMessage="Tidak ada pelanggan dengan aset aktif."
                                isSearchable
                                disabled={!!prefillCustomerId || !!prefillAsset}
                            />
                        </div>
                        {selectedCustomer && (
                            <div className="text-sm text-gray-600 bg-white p-3 rounded border">
                                <p><span className="font-semibold">Alamat:</span> {selectedCustomer.address}</p>
                                <p><span className="font-semibold">Paket:</span> {selectedCustomer.servicePackage}</p>
                            </div>
                        )}
                    </div>
                </div>

                {selectedCustomer && (
                    <div className="space-y-6">
                        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                                <h4 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
                                    <BsBoxSeam className="text-blue-600"/> Perangkat Terpasang (Pilih untuk ditarik)
                                </h4>
                                <span className="text-xs text-gray-500">{assetsForCustomer.length} Unit</span>
                            </div>
                            
                            {assetsForCustomer.length > 0 ? (
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="w-10 px-4 py-3 text-center">Pilih</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nama Aset</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Serial Number</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {assetsForCustomer.map(asset => (
                                            <tr 
                                                key={asset.id} 
                                                onClick={() => setSelectedAssetId(asset.id)}
                                                className={`cursor-pointer transition-colors ${selectedAssetId === asset.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                                            >
                                                <td className="px-4 py-3 text-center">
                                                    <input 
                                                        type="radio" 
                                                        name="assetSelect" 
                                                        checked={selectedAssetId === asset.id} 
                                                        onChange={() => setSelectedAssetId(asset.id)}
                                                        className="h-4 w-4 text-tm-primary border-gray-300 focus:ring-tm-primary cursor-pointer"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                                                    {asset.name}
                                                    <div className="text-xs text-gray-500">{asset.brand}</div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600 font-mono">{asset.serialNumber || '-'}</td>
                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                    <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full font-medium">
                                                        Terpasang
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="p-6 text-center text-sm text-gray-500">Tidak ada perangkat terpasang.</div>
                            )}
                        </div>
                    </div>
                )}

                <div className="p-4 border-t border-b border-gray-200">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Teknisi</label>
                            <CustomSelect options={technicianOptions} value={technician} onChange={setTechnician} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Kondisi Aset Saat Ditarik</label>
                            <CustomSelect options={Object.values(AssetCondition).map(c => ({ value: c, label: c }))} value={retrievedCondition} onChange={v => setRetrievedCondition(v as AssetCondition)} />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700">Catatan Penarikan</label>
                            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="block w-full px-3 py-2 mt-1 text-gray-900 placeholder:text-gray-400 bg-gray-50 border border-gray-300 rounded-lg shadow-sm sm:text-sm" placeholder="Contoh: Unit ditarik karena pelanggan upgrade, kondisi fisik baik..."></textarea>
                        </div>
                         
                         {/* ATTACHMENT SECTION (REFACTORED) */}
                         <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Lampiran (Foto Kondisi, BAST Fisik)</label>
                            
                            <div 
                                onDragEnter={handleDragEvents} 
                                onDragOver={handleDragEvents} 
                                onDragLeave={handleDragEvents} 
                                onDrop={handleDrop}
                                className={`flex flex-col items-center justify-center w-full px-6 pt-5 pb-6 mt-1 border-2 border-dashed rounded-lg transition-colors
                                    ${isDragging ? 'border-tm-primary bg-blue-50' : 'border-gray-300 hover:bg-gray-50'}`
                                }
                            >
                                <div className="space-y-1 text-center">
                                    <PaperclipIcon className="w-10 h-10 mx-auto text-gray-400" />
                                    <div className="flex text-sm text-gray-600">
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
                        </div>
                    </div>
                </div>

                <div className="pt-8 mt-6 border-t border-gray-200">
                    <div className="flex justify-center">
                        <div>
                            <p className="font-medium text-center text-gray-700">Teknisi</p>
                            <div className="flex items-center justify-center mt-2 h-28">
                                {technician && <SignatureStamp signerName={technician} signatureDate={dismantleDate?.toISOString() || ''} />}
                            </div>
                            <p className="pt-1 mt-2 text-sm text-center text-gray-600">( {technician || 'Nama Jelas'} )</p>
                        </div>
                    </div>
                </div>

                <div ref={footerRef} className="flex justify-end pt-4 mt-4 border-t border-gray-200">
                    <ActionButtons />
                </div>
            </form>
            <FloatingActionBar isVisible={!isFooterVisible}>
                <ActionButtons formId={formId} />
            </FloatingActionBar>
        </>
    );
};

export default DismantleForm;
