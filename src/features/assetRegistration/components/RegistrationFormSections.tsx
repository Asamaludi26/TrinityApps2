
import React from 'react';
import { InfoIcon } from '../../../components/icons/InfoIcon';
import { DollarIcon } from '../../../components/icons/DollarIcon';
import { WrenchIcon } from '../../../components/icons/WrenchIcon';
import { CustomSelect } from '../../../components/ui/CustomSelect';
import { AssetCondition, AssetType, AssetCategory } from '../../../types';
import { RegistrationFormData } from '../types';
import DatePicker from '../../../components/ui/DatePicker';
import { QrCodeIcon } from '../../../components/icons/QrCodeIcon';
import { TrashIcon } from '../../../components/icons/TrashIcon';
import { ExclamationTriangleIcon } from '../../../components/icons/ExclamationTriangleIcon';
import { PaperclipIcon } from '../../../components/icons/PaperclipIcon';

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
    
    selectedCategoryId?: AssetCategory; // Keeping prop name flexible although component expects Object usually or rename to selectedCategory to match usage
    selectedCategory?: AssetCategory;
    assetTypeId?: AssetType; // Keeping prop name flexible
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
        <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Brand</label>
            <input 
                type="text" 
                value={formData.brand} 
                onChange={(e) => updateField('brand', e.target.value)}
                className="block w-full px-3 py-2 mt-1 text-gray-900 bg-white border border-gray-300 rounded-md shadow-sm sm:text-sm focus:ring-tm-primary focus:border-tm-primary" 
            />
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

    return (
        <FormSection title="Informasi Pembelian" icon={<DollarIcon className="w-6 h-6 mr-3 text-tm-primary" />}>
            <div>
                <label className="block text-sm font-medium text-gray-700">Harga Beli (Rp)</label>
                <input 
                    type="number" 
                    value={formData.purchasePrice ?? ''} 
                    onChange={e => updateField('purchasePrice', e.target.value === '' ? null : parseFloat(e.target.value))} 
                    disabled={disabled} 
                    min="0"
                    className="block w-full px-3 py-2 mt-1 text-gray-900 bg-gray-50 border border-gray-300 rounded-md shadow-sm sm:text-sm disabled:bg-gray-100" 
                />
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
    updateBulkItem: (id: string | number, field: 'serialNumber' | 'macAddress', value: string) => void;
    onStartScan: (id: string | number) => void;
}

export const TrackingSection: React.FC<TrackingSectionProps> = ({ 
    formData, updateField, selectedType, isEditing, addBulkItem, removeBulkItem, updateBulkItem, onStartScan 
}) => {
    const unitLabel = selectedType?.unitOfMeasure || 'Unit';
    const totalCalculatedBaseQuantity = (typeof formData.quantity === 'number' && selectedType?.quantityPerUnit) ? formData.quantity * selectedType.quantityPerUnit : '';

    // Logic: Bulk tracking jika diatur di tipe, KECUALI sedang edit aset individual (fallback)
    const isBulkMode = selectedType?.trackingMethod === 'bulk' && !isEditing;

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
                    <div className="md:col-span-2 p-4 -mt-2 mb-2 border-l-4 rounded-r-lg bg-info-light border-tm-primary">
                        <div className="flex items-start gap-3"><InfoIcon className="flex-shrink-0 w-5 h-5 mt-1 text-info-text" /><div className="text-sm text-info-text"><p className="font-semibold">Mode Pencatatan Massal (Bulk)</p><p>Sistem akan membuat {formData.quantity || 0} entri aset terpisah tanpa nomor seri individual.</p></div></div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:col-span-2">
                        <div><label className="block text-sm font-medium text-gray-700">Stok ({unitLabel})</label><div className="relative mt-1"><input type="number" value={formData.quantity} onChange={(e) => updateField('quantity', e.target.value === '' ? '' : parseInt(e.target.value, 10))} min="1" required className="block w-full py-2 text-gray-900 bg-white border border-gray-300 rounded-md shadow-sm sm:text-sm" /></div></div>
                        <div><label className="block text-sm font-medium text-gray-700">Ukuran Satuan ({selectedType?.baseUnitOfMeasure || '...'})</label><div className="relative mt-1"><input type="number" value={selectedType?.quantityPerUnit || ''} readOnly className="block w-full py-2 text-gray-700 bg-gray-100 border border-gray-200 rounded-md shadow-sm sm:text-sm" /></div></div>
                        <div><label className="block text-sm font-medium text-gray-700">Total Ukuran ({selectedType?.baseUnitOfMeasure || '...'})</label><div className="relative mt-1"><input type="number" value={totalCalculatedBaseQuantity} readOnly className="block w-full py-2 text-gray-700 bg-gray-100 border border-gray-200 rounded-md shadow-sm sm:text-sm" /></div></div>
                    </div>
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
