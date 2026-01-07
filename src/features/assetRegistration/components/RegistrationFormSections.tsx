
import React, { useEffect, useState } from 'react';
import { InfoIcon } from '../../../components/icons/InfoIcon';
import { DollarIcon } from '../../../components/icons/DollarIcon';
import { WrenchIcon } from '../../../components/icons/WrenchIcon';
import { CustomSelect } from '../../../components/ui/CustomSelect';
import { AssetCondition, AssetType, AssetCategory, StandardItem } from '../../../types';
import { RegistrationFormData } from '../types';
import DatePicker from '../../../components/ui/DatePicker';
import { QrCodeIcon } from '../../../components/icons/QrCodeIcon';
import { TrashIcon } from '../../../components/icons/TrashIcon';
import { ExclamationTriangleIcon } from '../../../components/icons/ExclamationTriangleIcon';
import { PaperclipIcon } from '../../../components/icons/PaperclipIcon';
import { BsRulers, BsLightningFill, BsPlusLg, BsCalculator, BsArrowRight } from 'react-icons/bs';

interface SectionProps {
    formData: RegistrationFormData;
    updateField: (field: keyof RegistrationFormData, value: any) => void;
    disabled?: boolean;
}

export const FormSection: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, icon, children, className }) => (
    <div className={`pt-6 border-t border-gray-200 first:pt-0 first:border-t-0 ${className}`}>
        <div className="flex items-center mb-4">{icon}<h3 className="text-lg font-semibold text-tm-dark">{title}</h3></div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">{children}</div>
    </div>
);

// --- 1. IDENTITY SECTION ---
interface IdentitySectionProps extends SectionProps {
    categoryOptions: { value: string, label: string }[];
    typeOptions: { value: string, label: string }[];
    modelOptions: { value: string, label: string }[];
    
    // Explicit Props
    handleCategoryChange: (val: string) => void;
    handleTypeChange: (val: string) => void;
    handleModelChange: (val: string) => void;
    setActivePage: (page: any) => void;
    
    selectedCategoryId?: AssetCategory;
    selectedCategory?: AssetCategory;
    assetTypeId?: AssetType; 
    selectedType?: AssetType;
    openTypeModal: (c: AssetCategory, t: null) => void;
    openModelModal: (c: AssetCategory, t: AssetType) => void;
}

export const IdentitySection: React.FC<IdentitySectionProps> = ({
    formData, updateField, handleCategoryChange, handleTypeChange, handleModelChange,
    categoryOptions, typeOptions, modelOptions, setActivePage, selectedCategory, selectedType, openTypeModal, openModelModal, disabled
}) => (
    <FormSection title="Informasi Dasar Aset" icon={<InfoIcon className="w-6 h-6 mr-3 text-tm-primary" />}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:col-span-2">
            <div>
                <label className="block text-sm font-medium text-gray-700">Kategori Aset <span className="text-red-500">*</span></label>
                <div className="mt-1">
                    <CustomSelect 
                        options={categoryOptions} 
                        value={formData.categoryId} 
                        onChange={handleCategoryChange} 
                        placeholder="-- Pilih Kategori --" 
                        emptyStateMessage="Belum ada kategori." 
                        emptyStateButtonLabel="Buka Pengaturan" 
                        onEmptyStateClick={() => setActivePage('kategori')} 
                        disabled={disabled} 
                    />
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Tipe Aset <span className="text-red-500">*</span></label>
                <div className="mt-1">
                    <CustomSelect 
                        options={typeOptions} 
                        value={formData.typeId} 
                        onChange={handleTypeChange} 
                        placeholder={formData.categoryId ? '-- Pilih Tipe --' : 'Pilih kategori dahulu'} 
                        disabled={!formData.categoryId || disabled} 
                        emptyStateMessage="Tidak ada tipe." 
                        emptyStateButtonLabel="Tambah Tipe" 
                        onEmptyStateClick={() => { if (selectedCategory) openTypeModal(selectedCategory, null); }} 
                    />
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Model Barang</label>
                <div className="mt-1">
                    <CustomSelect 
                        options={modelOptions} 
                        value={formData.assetName} 
                        onChange={handleModelChange} 
                        placeholder={formData.typeId ? '-- Pilih Model --' : 'Pilih tipe dahulu'} 
                        disabled={!formData.typeId || disabled} 
                        emptyStateMessage="Tidak ada model." 
                        emptyStateButtonLabel="Tambah Model" 
                        onEmptyStateClick={() => { if (selectedCategory && selectedType) openModelModal(selectedCategory, selectedType); }}
                        isSearchable 
                    />
                </div>
            </div>
        </div>
        <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Nama Aset (Otomatis / Custom)</label>
            <input 
                type="text" 
                value={formData.assetName} 
                onChange={(e) => updateField('assetName', e.target.value)}
                className="block w-full px-3 py-2 mt-1 text-gray-900 bg-white border border-gray-300 rounded-md shadow-sm sm:text-sm focus:ring-tm-primary focus:border-tm-primary" 
                placeholder="Pilih model atau ketik manual..."
            />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:col-span-2">
            <div>
                <label className="block text-sm font-medium text-gray-700">Brand</label>
                <input 
                    type="text" 
                    value={formData.brand} 
                    onChange={(e) => updateField('brand', e.target.value)}
                    className="block w-full px-3 py-2 mt-1 text-gray-900 bg-white border border-gray-300 rounded-md shadow-sm sm:text-sm focus:ring-tm-primary focus:border-tm-primary" 
                />
            </div>
            {formData.requestDescription && (
                <div>
                    <label className="block text-sm font-medium text-gray-700">Keterangan (Dari Request)</label>
                    <input 
                        type="text" 
                        value={formData.requestDescription} 
                        readOnly
                        className="block w-full px-3 py-2 mt-1 text-gray-700 bg-gray-100 border border-gray-200 rounded-md shadow-sm sm:text-sm cursor-not-allowed" 
                    />
                </div>
            )}
        </div>
    </FormSection>
);

// --- 2. FINANCIAL SECTION ---
interface FinancialSectionProps extends SectionProps {
    canViewPrice: boolean;
    warrantyDate: Date | null;
    setWarrantyDate: (date: Date | null) => void;
    warrantyPeriod: number | '';
    setWarrantyPeriod: (val: number | '') => void;
}

export const FinancialSection: React.FC<FinancialSectionProps> = ({ 
    formData, updateField, canViewPrice, disabled, warrantyDate, setWarrantyDate, warrantyPeriod, setWarrantyPeriod
}) => {
    if (!canViewPrice) return null;

    const totalPrice = (Number(formData.purchasePrice) || 0) * (Number(formData.quantity) || 0);

    return (
        <FormSection title="Informasi Pembelian" icon={<DollarIcon className="w-6 h-6 mr-3 text-tm-primary" />}>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:col-span-2">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Harga Satuan (Rp)</label>
                    <input 
                        type="number" 
                        value={formData.purchasePrice ?? ''} 
                        onChange={e => updateField('purchasePrice', e.target.value === '' ? null : parseFloat(e.target.value))} 
                        disabled={disabled} 
                        min="0"
                        className="block w-full px-3 py-2 mt-1 text-gray-900 bg-gray-50 border border-gray-300 rounded-md shadow-sm sm:text-sm disabled:bg-gray-100" 
                    />
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Total Harga (Estimasi)</label>
                    <div className="relative mt-1 rounded-md shadow-sm">
                        <input 
                            type="text" 
                            value={`Rp ${totalPrice.toLocaleString('id-ID')}`} 
                            readOnly
                            className="block w-full px-3 py-2 text-gray-600 bg-gray-100 border border-gray-200 rounded-md sm:text-sm font-semibold" 
                        />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">Dihitung dari {formData.quantity || 0} unit.</p>
                </div>
            </div>
            <div><label className="block text-sm font-medium text-gray-700">Vendor / Toko</label><input type="text" value={formData.vendor || ''} onChange={e => updateField('vendor', e.target.value)} disabled={disabled} className="block w-full px-3 py-2 mt-1 text-gray-900 bg-gray-50 border border-gray-300 rounded-md shadow-sm sm:text-sm disabled:bg-gray-100" /></div>
            <div><label className="block text-sm font-medium text-gray-700">Nomor PO</label><input type="text" value={formData.poNumber || ''} onChange={e => updateField('poNumber', e.target.value)} disabled={disabled} className="block w-full px-3 py-2 mt-1 text-gray-900 bg-gray-50 border border-gray-300 rounded-md shadow-sm sm:text-sm disabled:bg-gray-100" /></div>
            <div><label className="block text-sm font-medium text-gray-700">Nomor Faktur</label><input type="text" value={formData.invoiceNumber || ''} onChange={e => updateField('invoiceNumber', e.target.value)} disabled={disabled} className="block w-full px-3 py-2 mt-1 text-gray-900 bg-gray-50 border border-gray-300 rounded-md shadow-sm sm:text-sm disabled:bg-gray-100" /></div>
            <div><label className="block text-sm font-medium text-gray-700">Tanggal Pembelian</label><DatePicker id="purchaseDate" selectedDate={formData.purchaseDate ? new Date(formData.purchaseDate) : null} onDateChange={d => updateField('purchaseDate', d?.toISOString().split('T')[0])} disableFutureDates disabled={disabled} /></div>
            <div><label className="block text-sm font-medium text-gray-700">Masa Garansi (bulan)</label><input type="number" min="0" value={warrantyPeriod} onChange={e => setWarrantyPeriod(e.target.value === '' ? '' : parseInt(e.target.value))} disabled={disabled} className="block w-full px-3 py-2 mt-1 text-gray-900 bg-gray-50 border border-gray-300 rounded-md shadow-sm sm:text-sm disabled:bg-gray-100" /></div>
            <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700">Akhir Garansi</label><DatePicker id="warrantyEndDate" selectedDate={warrantyDate} onDateChange={setWarrantyDate} disabled={disabled} /></div>
        </FormSection>
    );
};

// --- 3. TRACKING SECTION (BULK vs INDIVIDUAL) ---
interface TrackingSectionProps extends SectionProps {
    selectedType?: AssetType;
    isEditing: boolean;
    addBulkItem: () => void;
    removeBulkItem: (id: string | number) => void;
    updateBulkItem: (id: string | number, field: string, value: any) => void;
    onStartScan: (id: string | number) => void;
    selectedModel?: StandardItem;
    // New Props for Generator
    generateMeasurementItems?: (qty: number, lengthPerUnit: number) => void;
    currentStockCount?: number;
}

export const TrackingSection: React.FC<TrackingSectionProps> = ({ 
    formData, updateField, selectedType, selectedModel, isEditing, 
    addBulkItem, removeBulkItem, updateBulkItem, onStartScan,
    generateMeasurementItems, currentStockCount
}) => {
    // Determine labels and modes based on Model if available, else Type
    const isBulkMode = selectedType?.trackingMethod === 'bulk' && !isEditing;
    const modelUnit = selectedModel?.unitOfMeasure || selectedType?.unitOfMeasure || 'Unit';
    const unitLabel = modelUnit;
    
    // Check if bulk type is measurement (e.g. Cable)
    const isMeasurementType = isBulkMode && (selectedModel?.bulkType === 'measurement');
    const baseUnit = selectedModel?.baseUnitOfMeasure || 'Satuan';

    // Local state for batch generation
    const [genQty, setGenQty] = useState<number>(1);
    const [genLength, setGenLength] = useState<number>(selectedModel?.quantityPerUnit || 1000);
    
    // Auto update genLength when model changes
    useEffect(() => {
        if (selectedModel?.quantityPerUnit) {
            setGenLength(selectedModel.quantityPerUnit);
        }
    }, [selectedModel]);

    // Calculate Total Length for Measurement
    const totalMeasurementLength = formData.bulkItems.reduce((acc, item) => acc + (item.initialBalance || 0), 0);

    return (
        <FormSection title="Detail Unit Aset" icon={<InfoIcon className="w-6 h-6 mr-3 text-tm-primary" />} className="md:col-span-2">
            {!isBulkMode ? (
                <div className="md:col-span-2">
                    {/* Alert jika mengedit aset yang tipenya bulk tapi datanya individual (Edge Case) */}
                    {isEditing && selectedType?.trackingMethod === 'bulk' ? (
                        <div className="p-4 mb-4 border-l-4 rounded-r-lg bg-amber-50 border-amber-400">
                            <div className="flex items-start gap-3">
                                <ExclamationTriangleIcon className="flex-shrink-0 w-5 h-5 mt-1 text-amber-600" />
                                <div className="text-sm text-amber-800">
                                    <p className="font-semibold">Mengedit Aset Individual (Tipe Material)</p>
                                    <p>Anda sedang mengedit entitas tunggal dari tipe aset yang biasanya dicatat secara massal.</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-gray-700">Daftar Unit (Nomor Seri & MAC Address)</label>
                                {!isEditing && <button type="button" onClick={addBulkItem} className="px-3 py-1 text-xs font-semibold text-white transition-colors duration-200 rounded-md shadow-sm bg-tm-accent hover:bg-tm-primary">+ Tambah {unitLabel}</button>}
                            </div>
                            <div className="space-y-3">
                                {formData.bulkItems.map((item, index) => (
                                    <div key={item.id} className="relative grid grid-cols-1 md:grid-cols-10 gap-x-4 gap-y-2 p-3 bg-gray-50/80 border rounded-lg">
                                        <div className="md:col-span-10"><label className="text-sm font-medium text-gray-700">{isEditing ? `Detail ${unitLabel}` : `${unitLabel} #${index + 1}`}</label></div>
                                        <div className="md:col-span-4"><label className="block text-xs font-medium text-gray-500">Nomor Seri <span className="text-red-500">*</span></label><input type="text" value={item.serialNumber} onChange={(e) => updateBulkItem(item.id, 'serialNumber', e.target.value)} required={!isEditing} className="block w-full px-3 py-2 mt-1 text-gray-900 bg-white border border-gray-300 rounded-md shadow-sm sm:text-sm" placeholder="Wajib diisi" /></div>
                                        <div className="md:col-span-4"><label className="block text-xs font-medium text-gray-500">MAC Address</label><input type="text" value={item.macAddress} onChange={(e) => updateBulkItem(item.id, 'macAddress', e.target.value)} className="block w-full px-3 py-2 mt-1 text-gray-900 bg-white border border-gray-300 rounded-md shadow-sm sm:text-sm" placeholder="Opsional" /></div>
                                        <div className="md:col-span-1 flex items-end justify-start md:justify-center"><button type="button" onClick={() => onStartScan(item.id)} className="flex items-center justify-center w-full h-10 px-3 text-gray-600 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-100 hover:text-tm-primary" title="Pindai SN/MAC"><QrCodeIcon className="w-5 h-5"/></button></div>
                                        {formData.bulkItems.length > 1 && !isEditing && (<div className="md:col-span-1 flex items-end justify-center"><button type="button" onClick={() => removeBulkItem(item.id)} className="w-10 h-10 flex items-center justify-center text-gray-400 rounded-full hover:bg-red-100 hover:text-red-500 border border-transparent hover:border-red-200"><TrashIcon className="w-4 h-4" /></button></div>)}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            ) : (
                <>
                    {/* Logic untuk Tipe MEASUREMENT (Kabel, dll) */}
                    {isMeasurementType ? (
                        <div className="md:col-span-2 space-y-6">
                            <div className="p-4 border-l-4 rounded-r-lg bg-indigo-50 border-indigo-400">
                                <div className="flex items-start gap-3">
                                    <BsRulers className="flex-shrink-0 w-5 h-5 mt-1 text-indigo-600" />
                                    <div className="text-sm text-indigo-800">
                                        <p className="font-semibold">Mode Pencatatan Terukur (Measurement)</p>
                                        <p>Aset akan dicatat sebagai unit fisik (Contoh: Drum/Roll) dengan saldo isi (Contoh: Meter) yang dapat berkurang saat digunakan.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Batch Generator */}
                            <div className="bg-gray-100 p-4 rounded-xl border border-gray-200">
                                <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                                    <BsCalculator className="w-4 h-4"/> Generator Batch
                                </h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Jumlah Fisik ({unitLabel})</label>
                                        <input 
                                            type="number" 
                                            min="1" 
                                            value={genQty} 
                                            onChange={(e) => setGenQty(Math.max(1, parseInt(e.target.value) || 0))}
                                            className="block w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-md shadow-sm sm:text-sm" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">Isi per {unitLabel} ({baseUnit})</label>
                                        <input 
                                            type="number" 
                                            min="1" 
                                            value={genLength} 
                                            onChange={(e) => setGenLength(Math.max(1, parseInt(e.target.value) || 0))}
                                            className="block w-full px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-md shadow-sm sm:text-sm" 
                                        />
                                    </div>
                                    <button 
                                        type="button" 
                                        onClick={() => generateMeasurementItems && generateMeasurementItems(genQty, genLength)}
                                        className="w-full px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-md hover:bg-indigo-700 shadow-sm transition-colors"
                                    >
                                        Generate Rincian
                                    </button>
                                </div>
                            </div>

                            {/* Detailed List */}
                            <div className="space-y-3">
                                {formData.bulkItems.map((item, index) => (
                                    <div key={item.id} className="relative grid grid-cols-12 gap-3 p-3 bg-white border border-gray-200 rounded-lg items-end">
                                        <div className="col-span-12 sm:col-span-1 flex items-center justify-center h-full pb-2">
                                            <span className="font-bold text-gray-400">#{index + 1}</span>
                                        </div>
                                        <div className="col-span-12 sm:col-span-5">
                                            <label className="block text-xs font-medium text-gray-500 mb-0.5">Kode / Batch ID (Serial Number)</label>
                                            <div className="flex gap-2">
                                                <input 
                                                    type="text" 
                                                    value={item.serialNumber} 
                                                    onChange={(e) => updateBulkItem(item.id, 'serialNumber', e.target.value)} 
                                                    placeholder="Auto / Scan" 
                                                    className="block w-full px-3 py-1.5 text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500" 
                                                />
                                                <button type="button" onClick={() => onStartScan(item.id)} className="p-1.5 text-gray-500 bg-gray-100 rounded hover:text-tm-primary border border-gray-300"><QrCodeIcon className="w-4 h-4"/></button>
                                            </div>
                                        </div>
                                        <div className="col-span-12 sm:col-span-5">
                                            <label className="block text-xs font-medium text-gray-500 mb-0.5">Isi Awal ({baseUnit})</label>
                                            <input 
                                                type="number" 
                                                value={item.initialBalance} 
                                                onChange={(e) => updateBulkItem(item.id, 'initialBalance', e.target.value)} 
                                                className="block w-full px-3 py-1.5 text-sm border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-right font-mono" 
                                            />
                                        </div>
                                        <div className="col-span-12 sm:col-span-1 flex justify-center">
                                             <button type="button" onClick={() => removeBulkItem(item.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"><TrashIcon className="w-4 h-4"/></button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            
                            {/* Grand Total */}
                            {formData.bulkItems.length > 0 && (
                                <div className="flex justify-between items-center p-4 bg-indigo-50 border border-indigo-100 rounded-lg">
                                    <span className="text-sm font-medium text-indigo-800">Total Aset Tercatat:</span>
                                    <div className="text-right">
                                        <span className="block text-lg font-bold text-indigo-900">{formData.bulkItems.length} {unitLabel}</span>
                                        <span className="block text-xs text-indigo-600 font-medium">Total Isi: {totalMeasurementLength.toLocaleString('id-ID')} {baseUnit}</span>
                                    </div>
                                </div>
                            )}

                             <div className="flex justify-end">
                                <button type="button" onClick={() => addBulkItem()} className="text-xs flex items-center gap-1 font-semibold text-indigo-600 hover:text-indigo-800">
                                    <BsPlusLg /> Tambah Baris Manual
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* Logic untuk Tipe COUNT (Konektor, dll) */
                        <div className="md:col-span-2 space-y-6">
                             <div className="p-4 -mt-2 border-l-4 rounded-r-lg bg-info-light border-tm-primary">
                                <div className="flex items-start gap-3">
                                    <BsLightningFill className="flex-shrink-0 w-5 h-5 mt-1 text-info-text" />
                                    <div className="text-sm text-info-text">
                                        <p className="font-semibold">Mode Pencatatan Massal (Direct Count)</p>
                                        <p>Item ini tidak dilacak per unit unik (SN). Sistem hanya akan menambahkan jumlah stok ke total inventory.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">Jumlah Penambahan Stok ({unitLabel})</label>
                                    <div className="relative">
                                        <input 
                                            type="number" 
                                            value={formData.quantity} 
                                            onChange={(e) => updateField('quantity', e.target.value === '' ? '' : parseInt(e.target.value, 10))} 
                                            min="1" 
                                            required 
                                            className="block w-full py-3 px-4 text-xl font-bold text-tm-primary bg-gray-50 border border-gray-300 rounded-lg shadow-inner focus:ring-tm-primary focus:border-tm-primary" 
                                        />
                                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400 pointer-events-none">{unitLabel}</span>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-4 text-sm text-gray-600 bg-gray-50 p-4 rounded-lg">
                                    <div>
                                        <span className="block text-xs uppercase font-bold text-gray-400">Stok Saat Ini</span>
                                        <span className="text-lg font-bold text-gray-800">{currentStockCount || 0}</span>
                                    </div>
                                    <BsArrowRight className="text-gray-400 w-5 h-5" />
                                    <div>
                                        <span className="block text-xs uppercase font-bold text-gray-400">Estimasi Total</span>
                                        <span className="text-lg font-bold text-success-text">
                                            {(currentStockCount || 0) + (Number(formData.quantity) || 0)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </FormSection>
    );
};

// --- 4. CONTEXT SECTION ---
// Keep same...
const assetLocations = ['Gudang Inventori', 'Data Center Lt. 1', 'POP Cempaka Putih', 'Gudang Teknisi', 'Kantor Marketing', 'Mobil Tim Engineer', 'Kantor Engineer', 'Kantor NOC'];
const locationOptions = assetLocations.map(loc => ({ value: loc, label: loc }));
const conditionOptions = Object.values(AssetCondition).map(c => ({ value: c, label: c }));

export const ContextSection: React.FC<SectionProps> = ({ formData, updateField }) => (
    <FormSection title="Kondisi, Lokasi & Catatan" icon={<WrenchIcon className="w-6 h-6 mr-3 text-tm-primary" />}>
        <div><label className="block text-sm font-medium text-gray-700">Kondisi Aset</label><div className="mt-1"><CustomSelect options={conditionOptions} value={formData.condition} onChange={(v) => updateField('condition', v)} /></div></div>
        <div><label className="block text-sm font-medium text-gray-700">Lokasi Fisik Aset</label><div className="mt-1"><CustomSelect options={locationOptions} value={formData.location || ''} onChange={(v) => updateField('location', v)} placeholder="-- Pilih Lokasi --" /></div></div>
        <div><label className="block text-sm font-medium text-gray-700">Detail Lokasi / Rak</label><input type="text" value={formData.locationDetail || ''} onChange={e => updateField('locationDetail', e.target.value)} className="block w-full px-3 py-2 mt-1 text-gray-900 bg-gray-50 border border-gray-300 rounded-md shadow-sm sm:text-sm" /></div>
        <div><label className="block text-sm font-medium text-gray-700">Pengguna Awal (Opsional)</label><input type="text" value={formData.currentUser || ''} onChange={e => updateField('currentUser', e.target.value)} className="block w-full px-3 py-2 mt-1 text-gray-900 bg-gray-50 border border-gray-300 rounded-md shadow-sm sm:text-sm" /></div>
        <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700">Catatan Tambahan</label><textarea rows={3} value={formData.notes || ''} onChange={e => updateField('notes', e.target.value)} className="block w-full px-3 py-2 mt-1 text-gray-900 bg-gray-50 border border-gray-300 rounded-md shadow-sm sm:text-sm" ></textarea></div>
    </FormSection>
);

// --- 5. ATTACHMENT SECTION ---
export const AttachmentSection: React.FC<SectionProps> = ({ formData, updateField }) => {
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) updateField('attachments', [...formData.attachments, ...Array.from(event.target.files!)]);
    };
    return (
        <FormSection title="Lampiran" icon={<PaperclipIcon className="w-6 h-6 mr-3 text-tm-primary" />}>
            <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Unggah File (Foto, Invoice, dll)</label>
                <div className="flex items-center justify-center w-full px-6 pt-5 pb-6 mt-1 border-2 border-gray-300 border-dashed rounded-md hover:bg-gray-50 transition-colors">
                    <div className="space-y-1 text-center">
                        <div className="flex text-sm text-gray-600">
                            <label htmlFor="file-upload" className="relative font-medium bg-transparent rounded-md cursor-pointer text-tm-primary hover:text-tm-accent focus-within:outline-none">
                                <span>Unggah file</span>
                                <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple onChange={handleFileChange} />
                            </label>
                            <p className="pl-1">atau tarik dan lepas</p>
                        </div>
                        <p className="text-xs text-gray-500">PNG, JPG, PDF hingga 10MB</p>
                    </div>
                </div>
            </div>
        </FormSection>
    );
};
