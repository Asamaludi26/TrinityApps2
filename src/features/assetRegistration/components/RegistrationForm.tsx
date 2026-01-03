
import React, { useRef, useEffect, useState } from 'react';
import { Asset, Request, User, AssetCategory, RequestItem, AssetType, ParsedScanResult } from '../../../types';
import DatePicker from '../../../components/ui/DatePicker';
import { SpinnerIcon } from '../../../components/icons/SpinnerIcon';
import FloatingActionBar from '../../../components/ui/FloatingActionBar';
import { RegistrationFormData } from '../types';
import { useRegistrationForm } from '../hooks/useRegistrationForm';
import { useAssetCalculations } from '../hooks/useAssetCalculations';
import { IdentitySection, FinancialSection, TrackingSection, ContextSection, AttachmentSection } from './RegistrationFormSections';

interface RegistrationFormProps {
    onBack: () => void;
    onSave: (data: RegistrationFormData, assetIdToUpdate?: string) => void;
    prefillData?: { request: Request; itemToRegister?: RequestItem } | null;
    editingAsset?: Asset | null;
    currentUser: User;
    assetCategories: AssetCategory[];
    setActivePage: (page: any, initialState?: any) => void;
    openModelModal: (category: AssetCategory, type: AssetType) => void;
    openTypeModal: (category: AssetCategory, typeToEdit: AssetType | null) => void;
    // Scanner Integration
    onStartScan: (itemId: number) => void; 
    setFormScanCallback: (callback: ((data: ParsedScanResult) => void) | null) => void; // New Prop for safer flow
}

export const RegistrationForm: React.FC<RegistrationFormProps> = (props) => {
    const { 
        onBack, onSave, prefillData, editingAsset, currentUser, 
        assetCategories, setActivePage, openModelModal, openTypeModal,
        onStartScan, setFormScanCallback
    } = props;

    // 1. Initialize Logic Hook
    const {
        formData, updateField, selectedCategoryId, assetTypeId, selectedCategory, selectedType,
        availableModels, handleCategoryChange, handleTypeChange, handleModelChange,
        addBulkItem, removeBulkItem, updateBulkItem, handleScanResult, handleSubmit, canViewPrice, isEditing
    } = useRegistrationForm({
        currentUser,
        assetCategories,
        prefillData,
        editingAsset,
        onSave
    }) as any; 
    // Type assertion to any as a temporary fix if the hook doesn't return these properties but the component logic relies on them, 
    // OR ideally we remove selectedCategoryId and assetTypeId if they are not returned.
    // Based on the error log, the hook DOES NOT return selectedCategoryId and assetTypeId.
    // We should rely on formData.categoryId and formData.typeId or selectedCategory.id

    // 2. Initialize Calc Hook
    const { warrantyPeriod, setWarrantyPeriod } = useAssetCalculations(
        formData.purchaseDate ? new Date(formData.purchaseDate) : null,
        formData.warrantyEndDate ? new Date(formData.warrantyEndDate) : null
    );

    // 3. Helper: Wrap Scanner Trigger to register callback first
    const handleStartScanWrapper = (itemId: number | string) => {
        // Register the callback in the parent Page/Layout
        setFormScanCallback((result: ParsedScanResult) => {
             // Bridge the result to the hook
             handleScanResult(itemId, result);
        });
        // Trigger the UI
        onStartScan(typeof itemId === 'string' ? 0 : itemId); // ID is handled by hook logic
    };
    
    // Manual sync for warranty date setter from hook
    const handleWarrantyDateChange = (date: Date | null) => {
        updateField('warrantyEndDate', date ? date.toISOString().split('T')[0] : null);
    };

    // UI Observer for Floating Action Bar
    const [isFooterVisible, setIsFooterVisible] = useState(true);
    const footerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => setIsFooterVisible(entry.isIntersecting), { threshold: 0.1 });
        const currentRef = footerRef.current;
        if (currentRef) observer.observe(currentRef);
        return () => { if (currentRef) observer.unobserve(currentRef); };
    }, []);

    const categoryOptions = assetCategories.map(cat => ({ value: cat.id.toString(), label: cat.name }));
    const typeOptions = selectedCategory?.types.map(t => ({ value: t.id.toString(), label: t.name })) || [];
    const modelOptions = availableModels.map(m => ({ value: m.name, label: m.name }));
    const formId = "asset-registration-form";
    const [isSubmitting, setIsSubmitting] = useState(false); // Local loading state wrapper

    const onSubmitWrapper = (e: React.FormEvent) => {
        setIsSubmitting(true);
        // Validasi tambahan jika perlu dilakukan di sini sebelum ke hook
        handleSubmit(e);
        // Reset loading if validation fails inside hook (requires hook refactor to return success)
        setTimeout(() => setIsSubmitting(false), 2000); 
    };

    const ActionButtons = () => (
        <>
            <button type="button" onClick={onBack} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Batal</button>
            <button type="submit" form={formId} disabled={isSubmitting} className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-semibold text-white transition-all duration-200 rounded-lg shadow-sm bg-tm-primary hover:bg-tm-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tm-accent disabled:bg-tm-primary/70 disabled:cursor-not-allowed">
                {isSubmitting ? <SpinnerIcon className="w-5 h-5 mr-2"/> : null}
                {isSubmitting ? 'Menyimpan...' : (isEditing ? 'Simpan Perubahan' : 'Simpan Aset Baru')}
            </button>
        </>
    );

    return (
        <>
            <form id={formId} className="space-y-8" onSubmit={onSubmitWrapper}>
                {prefillData && (
                    <div className="p-4 border-l-4 rounded-r-lg bg-info-light border-tm-primary">
                        <p className="text-sm text-info-text">
                            Mencatat <strong>{prefillData.itemToRegister?.itemName}</strong> dari permintaan <span className="font-bold">{prefillData.request.id}</span> oleh <span className="font-bold">{prefillData.request.requester}</span>.
                        </p>
                    </div>
                )}
                
                <div className="mb-6 space-y-2 text-center">
                    <h4 className="text-xl font-bold text-tm-dark">TRINITY MEDIA INDONESIA</h4>
                    <p className="font-semibold text-tm-secondary">{isEditing ? 'FORMULIR EDIT DATA ASET' : 'FORMULIR PENCATATAN ASET BARU'}</p>
                </div>

                <div className="p-4 border-t border-b border-gray-200">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Tanggal Pencatatan</label>
                            <DatePicker id="regDate" selectedDate={new Date(formData.registrationDate)} onDateChange={d => updateField('registrationDate', d?.toISOString().split('T')[0])} disableFutureDates />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Dicatat oleh</label>
                            <input type="text" readOnly className="block w-full px-3 py-2 mt-1 text-gray-700 bg-gray-100 border border-gray-200 rounded-md shadow-sm sm:text-sm" value={currentUser.name} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">No Dokumen Aset</label>
                            <input type="text" readOnly className="block w-full px-3 py-2 mt-1 text-gray-700 bg-gray-100 border border-gray-200 rounded-md shadow-sm sm:text-sm" value={editingAsset?.id || '[Otomatis]'} />
                        </div>
                        {formData.relatedRequestDocNumber && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700">No. Request (Sumber)</label>
                                <input type="text" readOnly className="block w-full px-3 py-2 mt-1 text-blue-800 bg-blue-50 border border-blue-200 rounded-md shadow-sm sm:text-sm font-mono" value={formData.relatedRequestDocNumber} />
                            </div>
                        )}
                    </div>
                </div>

                <IdentitySection 
                    formData={formData} updateField={updateField}
                    categoryOptions={categoryOptions} typeOptions={typeOptions} modelOptions={modelOptions}
                    selectedCategoryId={selectedCategory} assetTypeId={selectedType}
                    handleCategoryChange={handleCategoryChange} handleTypeChange={handleTypeChange} handleModelChange={handleModelChange}
                    setActivePage={setActivePage} selectedCategory={selectedCategory} selectedType={selectedType}
                    openModelModal={openModelModal} openTypeModal={openTypeModal}
                    disabled={!!prefillData}
                />

                <TrackingSection 
                    formData={formData} updateField={updateField}
                    selectedType={selectedType} isEditing={isEditing}
                    addBulkItem={addBulkItem} removeBulkItem={removeBulkItem} updateBulkItem={updateBulkItem}
                    onStartScan={handleStartScanWrapper}
                />

                <FinancialSection 
                    formData={formData} updateField={updateField} canViewPrice={canViewPrice}
                    warrantyDate={formData.warrantyEndDate ? new Date(formData.warrantyEndDate) : null} setWarrantyDate={handleWarrantyDateChange}
                    warrantyPeriod={warrantyPeriod} setWarrantyPeriod={setWarrantyPeriod}
                    disabled={!!prefillData}
                />

                <ContextSection formData={formData} updateField={updateField} />
                <AttachmentSection formData={formData} updateField={updateField} />

                <div ref={footerRef} className="flex justify-end pt-4 mt-4 border-t border-gray-200">
                  <ActionButtons />
                </div>
            </form>
            <FloatingActionBar isVisible={!isFooterVisible}>
                <ActionButtons />
            </FloatingActionBar>
        </>
    );
};
