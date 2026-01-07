
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Asset, AssetCondition, Request, RequestItem, User, AssetCategory, AssetType, ParsedScanResult, StandardItem } from '../../../types';
import { RegistrationFormData } from '../types';
import { useNotification } from '../../../providers/NotificationProvider';
import { generateUUID } from '../../../utils/uuid';
import { useAssetStore } from '../../../stores/useAssetStore'; // Need store to check current stock for Count types

interface UseRegistrationFormProps {
    currentUser: User;
    assetCategories: AssetCategory[];
    prefillData?: { request: Request; itemToRegister?: RequestItem } | null;
    editingAsset?: Asset | null;
    onSave: (data: RegistrationFormData, assetIdToUpdate?: string) => void;
}

export const useRegistrationForm = ({
    currentUser,
    assetCategories,
    prefillData,
    editingAsset,
    onSave
}: UseRegistrationFormProps) => {
    const isEditing = !!editingAsset;
    const addNotification = useNotification();
    
    // Store access for "Count" type stock visualization
    const assets = useAssetStore(state => state.assets); 

    // --- FORM STATE ---
    const [formData, setFormData] = useState<RegistrationFormData>({
        assetName: '',
        categoryId: '', 
        typeId: '',     
        category: '',
        type: '',
        brand: '',
        requestDescription: '',
        relatedRequestDocNumber: '', 
        purchasePrice: null,
        vendor: '',
        poNumber: '',
        invoiceNumber: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        registrationDate: new Date().toISOString().split('T')[0],
        recordedBy: currentUser.name,
        warrantyEndDate: null,
        condition: AssetCondition.BRAND_NEW,
        location: 'Gudang Inventori',
        locationDetail: '',
        currentUser: null,
        notes: '',
        attachments: [],
        bulkItems: [{ id: generateUUID(), serialNumber: '', macAddress: '' }],
        quantity: 1,
        relatedRequestId: null
    });

    // --- DERIVED STATE ---
    const selectedCategory = useMemo(() => 
        assetCategories.find(c => c.id.toString() === formData.categoryId), 
    [assetCategories, formData.categoryId]);

    const availableTypes = useMemo(() => selectedCategory?.types || [], [selectedCategory]);

    const selectedType = useMemo(() => 
        availableTypes.find(t => t.id.toString() === formData.typeId), 
    [availableTypes, formData.typeId]);

    const availableModels = useMemo(() => selectedType?.standardItems || [], [selectedType]);

    // Find the actual model object based on selected name/brand to get bulk config
    const selectedModel = useMemo(() => 
        availableModels.find(m => m.name === formData.assetName && m.brand === formData.brand),
    [availableModels, formData.assetName, formData.brand]);
    
    const canViewPrice = ['Admin Purchase', 'Super Admin'].includes(currentUser.role);
    
    // Calculate current stock count for "Count" type visual feedback
    const currentStockCount = useMemo(() => {
        if (selectedType?.trackingMethod === 'bulk' && selectedModel?.bulkType !== 'measurement') {
            return assets.filter(a => 
                a.name === formData.assetName && 
                a.brand === formData.brand && 
                a.status === 'Di Gudang'
            ).reduce((acc, curr) => acc + (curr.inStorage || 1), 0); // Logic simplifikasi, real implementation depends on how Count assets stored
            // Note: Simplifikasi untuk demo. Real logic ada di useAssetStore.
        }
        return 0;
    }, [assets, selectedType, selectedModel, formData.assetName, formData.brand]);


    // --- EFFECT: PREFILL DATA (STAGING) ---
    useEffect(() => {
        if (prefillData?.request && prefillData.itemToRegister) {
            const { request, itemToRegister } = prefillData;
            
            let foundCategory: AssetCategory | undefined;
            let foundType: AssetType | undefined;

            if (itemToRegister.categoryId) {
                foundCategory = assetCategories.find(c => c.id.toString() === itemToRegister.categoryId?.toString());
            }
            if (!foundCategory) {
                foundCategory = assetCategories.find(c => c.types.some(t => t.standardItems?.some(si => si.name === itemToRegister.itemName)));
            }

            if (foundCategory) {
                if (itemToRegister.typeId) {
                    foundType = foundCategory.types.find(t => t.id.toString() === itemToRegister.typeId?.toString());
                }
                if (!foundType) {
                    foundType = foundCategory.types.find(t => t.standardItems?.some(si => si.name === itemToRegister.itemName));
                }
            }

            const itemStatus = request.itemStatuses?.[itemToRegister.id];
            const totalApprovedQuantity = itemStatus?.approvedQuantity ?? itemToRegister.quantity;
            const alreadyRegistered = request.partiallyRegisteredItems?.[itemToRegister.id] || 0;
            const quantityToRegister = Math.max(0, totalApprovedQuantity - alreadyRegistered);
            
            const isBulkTracking = foundType?.trackingMethod === 'bulk';
            
            // For measurement/bulk, initially we don't know the exact drum split, so start empty or single
            const initialBulkItems = isBulkTracking 
                ? [] 
                : Array.from({ length: quantityToRegister }, () => ({ id: generateUUID(), serialNumber: '', macAddress: '' }));

            const details = request.purchaseDetails?.[itemToRegister.id];

            setFormData(prev => ({
                ...prev,
                assetName: itemToRegister.itemName,
                categoryId: foundCategory?.id.toString() || '',
                typeId: foundType?.id.toString() || '',
                category: foundCategory?.name || '',
                type: foundType?.name || '',
                brand: itemToRegister.itemTypeBrand,
                requestDescription: itemToRegister.keterangan || '',
                relatedRequestDocNumber: request.docNumber || request.id,
                notes: '',
                currentUser: null,
                quantity: quantityToRegister,
                bulkItems: initialBulkItems,
                purchasePrice: canViewPrice && details ? (details.purchasePrice as number) : null,
                vendor: details?.vendor || '',
                poNumber: details?.poNumber || '',
                invoiceNumber: details?.invoiceNumber || '',
                purchaseDate: details?.purchaseDate ? new Date(details.purchaseDate).toISOString().split('T')[0] : prev.purchaseDate,
                warrantyEndDate: details?.warrantyEndDate || null,
                relatedRequestId: request.id
            }));
        }
    }, [prefillData, assetCategories, canViewPrice]);

    // --- EFFECT: EDIT MODE ---
    useEffect(() => {
        if (isEditing && editingAsset) {
            const cat = assetCategories.find(c => c.name === editingAsset.category);
            const typ = cat?.types.find(t => t.name === editingAsset.type);

            setFormData({
                assetName: editingAsset.name,
                categoryId: cat?.id.toString() || '',
                typeId: typ?.id.toString() || '',
                category: editingAsset.category,
                type: editingAsset.type,
                brand: editingAsset.brand,
                requestDescription: '', 
                relatedRequestDocNumber: editingAsset.woRoIntNumber || '',
                purchasePrice: editingAsset.purchasePrice ?? null,
                vendor: editingAsset.vendor ?? '',
                poNumber: editingAsset.poNumber ?? '',
                invoiceNumber: editingAsset.invoiceNumber ?? '',
                purchaseDate: editingAsset.purchaseDate ? new Date(editingAsset.purchaseDate).toISOString().split('T')[0] : '',
                registrationDate: new Date(editingAsset.registrationDate).toISOString().split('T')[0],
                recordedBy: currentUser.name, 
                warrantyEndDate: editingAsset.warrantyEndDate || null,
                condition: editingAsset.condition,
                location: editingAsset.location ?? '',
                locationDetail: editingAsset.locationDetail ?? '',
                currentUser: editingAsset.currentUser ?? null,
                notes: editingAsset.notes ?? '',
                attachments: editingAsset.attachments || [],
                bulkItems: [{
                    id: generateUUID(),
                    serialNumber: editingAsset.serialNumber || '',
                    macAddress: editingAsset.macAddress || '',
                    // Load balance if editing measurement asset
                    initialBalance: editingAsset.initialBalance,
                    currentBalance: editingAsset.currentBalance
                }],
                quantity: 1,
                relatedRequestId: null
            });
        }
    }, [isEditing, editingAsset, assetCategories, currentUser.name]);

    // --- HANDLERS ---
    const updateField = useCallback((field: keyof RegistrationFormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    }, []);

    const handleCategoryChange = useCallback((val: string) => {
        const cat = assetCategories.find(c => c.id.toString() === val);
        setFormData(prev => ({ 
            ...prev, 
            categoryId: val, 
            category: cat?.name || '', 
            typeId: '', 
            type: '', 
            assetName: '', 
            brand: '' 
        }));
    }, [assetCategories]);

    const handleTypeChange = useCallback((val: string) => {
        const typ = availableTypes.find(t => t.id.toString() === val);
        setFormData(prev => ({ 
            ...prev, 
            typeId: val, 
            type: typ?.name || '', 
            assetName: '', 
            brand: '' 
        }));
    }, [availableTypes]);
    
    const handleModelChange = useCallback((modelName: string) => {
        const model = availableModels.find(m => m.name === modelName);
        if (model) {
            setFormData(prev => ({ ...prev, assetName: model.name, brand: model.brand }));
        } else {
             setFormData(prev => ({ ...prev, assetName: modelName }));
        }
    }, [availableModels]);

    const addBulkItem = useCallback(() => {
        // Validation for prefill limits...
        if (prefillData?.itemToRegister) {
             const { request, itemToRegister } = prefillData;
             const approvedQty = request.itemStatuses?.[itemToRegister.id]?.approvedQuantity ?? itemToRegister.quantity;
             const registeredQty = request.partiallyRegisteredItems?.[itemToRegister.id] || 0;
             const remaining = approvedQty - registeredQty;
             
             // Count current items, excluding those that might be deleted/filtered in complex logic
             if (formData.bulkItems.length >= remaining) {
                 addNotification('Jumlah item sudah mencapai batas sisa kuantitas.', 'warning');
                 return;
             }
        }
        setFormData(prev => ({
            ...prev,
            bulkItems: [...prev.bulkItems, { id: generateUUID(), serialNumber: '', macAddress: '' }],
            quantity: (typeof prev.quantity === 'number' ? prev.quantity + 1 : 1)
        }));
    }, [prefillData, formData.bulkItems.length, addNotification]);

    const removeBulkItem = useCallback((id: string | number) => {
        if (formData.bulkItems.length > 0) { // Allow empty list for Measurement generator
            setFormData(prev => ({
                ...prev,
                bulkItems: prev.bulkItems.filter(item => item.id !== id),
                // Only update quantity if it matches array length (for individual)
                // For measurement, quantity is length of array (drums)
                quantity: prev.bulkItems.length - 1 
            }));
        }
    }, []);

    const updateBulkItem = useCallback((id: string | number, field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            bulkItems: prev.bulkItems.map(item => item.id === id ? { ...item, [field]: value } : item)
        }));
    }, []);

    const handleScanResult = useCallback((itemId: string | number, result: ParsedScanResult) => {
         setFormData(prev => ({
            ...prev,
            bulkItems: prev.bulkItems.map(item => {
                if (item.id === itemId) {
                    return {
                        ...item,
                        serialNumber: result.serialNumber || item.serialNumber,
                        macAddress: result.macAddress || item.macAddress
                    };
                }
                return item;
            })
         }));
    }, []);

    // New: Batch Generator for Measurement
    const generateMeasurementItems = useCallback((qty: number, lengthPerUnit: number) => {
        const newItems = Array.from({ length: qty }, (_, i) => ({
            id: generateUUID(),
            serialNumber: `BATCH-${Date.now().toString().slice(-6)}-${i+1}`, // Auto generate temp batch ID
            macAddress: '',
            initialBalance: lengthPerUnit,
            currentBalance: lengthPerUnit
        }));

        setFormData(prev => ({
            ...prev,
            bulkItems: newItems,
            quantity: qty // For bulk measurement, quantity refers to number of physical units (drums)
        }));

        addNotification(`${qty} item dengan panjang ${lengthPerUnit} berhasil dibuat.`, 'success');
    }, [addNotification]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        let finalBulkItems = formData.bulkItems;
        const isBulkTracking = selectedType?.trackingMethod === 'bulk';
        const targetModel = availableModels.find(m => m.name === formData.assetName && m.brand === formData.brand) || selectedModel;
        const isMeasurementType = isBulkTracking && targetModel?.bulkType === 'measurement';

        // 1. Validation Logic
        if (!formData.categoryId || !formData.typeId) {
            addNotification('Kategori dan Tipe aset wajib dipilih.', 'error');
            return;
        }
        
        // 2. Quantity Logic
        const quantityNum = Number(formData.quantity);
        if (!formData.quantity || (isNaN(quantityNum) || quantityNum <= 0)) {
             addNotification('Jumlah aset (quantity) harus lebih dari 0.', 'error');
             return;
        }

        if (isBulkTracking) {
             if (isMeasurementType) {
                 // For Measurement:
                 // We create N assets (rows in bulkItems), each representing a physical drum/roll
                 if (finalBulkItems.length === 0) {
                     addNotification('Harap generate rincian item (batch generator) terlebih dahulu.', 'error');
                     return;
                 }
                 
                 // Ensure all items have balance
                 if (finalBulkItems.some(i => !i.initialBalance || i.initialBalance <= 0)) {
                      addNotification('Semua item measurement harus memiliki saldo awal (Isi/Panjang).', 'error');
                      return;
                 }
             } else {
                 // For Count (Bijian):
                 // Use a dummy bulk item just to pass structure, quantity holds the value.
                 // We don't create 1000 rows for 1000 connectors.
                 // We create 1 Asset entry representing the *batch addition* or update existing pool.
                 // (Simplified Logic: Create 1 asset entry with quantity property in meta or just update store directly)
                 // NOTE: In this app architecture, addAsset creates an entry in 'assets' array.
                 // For Count, we usually treat it as "1 box of X".
                 if (finalBulkItems.length === 0) {
                     finalBulkItems = [{ id: generateUUID(), serialNumber: '', macAddress: '' }];
                 }
             }
        } else {
             // Individual Check
             if (finalBulkItems.some(i => !i.serialNumber.trim())) {
                 addNotification('Nomor Seri wajib diisi untuk semua unit.', 'error');
                 return;
             }
        }
        
        // Simpan data
        const finalData: RegistrationFormData = {
            ...formData,
            bulkItems: finalBulkItems,
            purchasePrice: formData.purchasePrice ? Number(formData.purchasePrice) : null,
            quantity: quantityNum
        };
        
        onSave(finalData, editingAsset?.id);
    };

    return {
        formData,
        updateField,
        selectedCategory,
        selectedType,
        selectedModel,
        availableModels,
        handleCategoryChange,
        handleTypeChange,
        handleModelChange,
        addBulkItem,
        removeBulkItem,
        updateBulkItem,
        handleScanResult,
        handleSubmit,
        canViewPrice,
        isEditing,
        generateMeasurementItems,
        currentStockCount
    };
};
