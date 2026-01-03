
import React, { useState, useEffect } from 'react';
import { AssetCategory, AssetType, StandardItem, Asset, BulkTrackingMode } from '../../types';
import Modal from './Modal';
import { PencilIcon } from '../icons/PencilIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { SpinnerIcon } from '../icons/SpinnerIcon';
import { ExclamationTriangleIcon } from '../icons/ExclamationTriangleIcon';
import { InboxIcon } from '../icons/InboxIcon';
import { useNotification } from '../../providers/NotificationProvider';
import { CreatableSelect } from './CreatableSelect';
import { Bs123, BsRulers } from 'react-icons/bs';

// Store
import { useAssetStore } from '../../stores/useAssetStore';

interface ModelManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentInfo: { category: AssetCategory; type: AssetType };
  // Legacy props (optional now)
  assets?: Asset[];
  onSave?: (parentInfo: { category: AssetCategory; type: AssetType }, modelData: Omit<StandardItem, 'id'>, id?: number) => void;
  onDelete?: (parentInfo: { category: AssetCategory, type: AssetType }, modelToDelete: StandardItem) => void;
}

interface ModelToDelete extends StandardItem {
    assetCount: number;
}

const commonUnits = ['Unit', 'Pcs', 'Set', 'Pack', 'Box', 'Meter', 'Roll', 'Liter', 'Kg', 'Lembar', 'Pasang', 'Buah', 'Hasbal', 'Drum'];

export const ModelManagementModal: React.FC<ModelManagementModalProps> = ({
  isOpen,
  onClose,
  parentInfo,
  assets: propAssets,
  onSave: propOnSave,
  onDelete: propOnDelete,
}) => {
  // Store hooks
  const storeAssets = useAssetStore((state) => state.assets);
  const assetCategories = useAssetStore((state) => state.categories);
  const updateCategories = useAssetStore((state) => state.updateCategories);
  
  // Use store assets if available
  const assets = storeAssets.length > 0 ? storeAssets : (propAssets || []);

  // Derived state from parentInfo ids to ensure freshness
  const category = assetCategories.find(c => c.id === parentInfo.category.id) || parentInfo.category;
  const type = category.types.find(t => t.id === parentInfo.type.id) || parentInfo.type;
  const models = type.standardItems || [];
  
  // Check if type is bulk/material to show extra options
  const isBulkType = type.classification === 'material' || type.trackingMethod === 'bulk';

  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  
  // New Bulk Configs
  const [bulkType, setBulkType] = useState<BulkTrackingMode>('count'); 
  const [unitOfMeasure, setUnitOfMeasure] = useState('Pcs');
  const [baseUnitOfMeasure, setBaseUnitOfMeasure] = useState('Pcs');
  const [quantityPerUnit, setQuantityPerUnit] = useState<number | ''>('');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [modelToDelete, setModelToDelete] = useState<ModelToDelete | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const addNotification = useNotification();

  const isEditing = editingId !== null;

  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setName('');
    setBrand('');
    
    // Reset bulk defaults based on parent type context
    setBulkType('count');
    setUnitOfMeasure(isBulkType ? 'Pcs' : 'Unit');
    setBaseUnitOfMeasure('Pcs');
    setQuantityPerUnit('');
    
    setEditingId(null);
    setIsLoading(false);
  };

  const handleEditClick = (model: StandardItem) => {
    setEditingId(model.id);
    setName(model.name);
    setBrand(model.brand);
    
    // FIX LOGIC: Populate bulk config fields correctly when editing
    if (isBulkType) {
        setBulkType(model.bulkType || 'count');
        setUnitOfMeasure(model.unitOfMeasure || 'Pcs');
        
        // Only set these if they exist on the model, otherwise defaults
        if (model.bulkType === 'measurement') {
            setBaseUnitOfMeasure(model.baseUnitOfMeasure || 'Pcs');
            setQuantityPerUnit(model.quantityPerUnit || '');
        } else {
            // Reset measurement specific fields if editing a count item to avoid confusion
            setBaseUnitOfMeasure('Pcs');
            setQuantityPerUnit('');
        }
    }
  };

  const handleDeleteClick = (model: StandardItem) => {
    const assetCount = assets.filter(asset => asset.name === model.name && asset.brand === model.brand).length;
    setModelToDelete({ ...model, assetCount });
  };

  const handleConfirmDelete = async () => {
    if (modelToDelete && modelToDelete.assetCount === 0) {
        if (propOnDelete) {
             propOnDelete(parentInfo, modelToDelete);
        } else {
            // Store Logic
             const updatedCategories = assetCategories.map(cat => {
                if (cat.id === category.id) {
                    return {
                        ...cat,
                        types: cat.types.map(t => {
                            if (t.id === type.id) {
                                return {
                                    ...t,
                                    standardItems: (t.standardItems || []).filter(item => item.id !== modelToDelete.id)
                                };
                            }
                            return t;
                        })
                    };
                }
                return cat;
            });
            await updateCategories(updatedCategories);
            addNotification(`Model "${modelToDelete.name}" berhasil dihapus.`, 'success');
        }
      setModelToDelete(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !brand.trim()) {
      addNotification('Nama model dan brand harus diisi.', 'error');
      return;
    }
    
    // Validation for Measurement Type
    if (isBulkType && bulkType === 'measurement') {
        if (!quantityPerUnit || Number(quantityPerUnit) <= 0) {
             addNotification('Konversi isi harus diisi dengan angka lebih dari 0 untuk tipe Habis Perlahan.', 'error');
             return;
        }
    }

    setIsLoading(true);
    
    const modelData: Omit<StandardItem, 'id'> = {
        name, 
        brand,
        ...(isBulkType ? {
            bulkType,
            unitOfMeasure,
            baseUnitOfMeasure: bulkType === 'measurement' ? baseUnitOfMeasure : undefined,
            quantityPerUnit: (bulkType === 'measurement' && quantityPerUnit !== '') ? Number(quantityPerUnit) : undefined
        } : {})
    };

    if (propOnSave) {
        propOnSave(parentInfo, modelData, editingId || undefined);
    } else {
        // Store Logic
        const updatedCategories = assetCategories.map(cat => {
            if (cat.id === category.id) {
                return {
                    ...cat,
                    types: cat.types.map(t => {
                        if (t.id === type.id) {
                            let updatedItems;
                            if (editingId) {
                                updatedItems = (t.standardItems || []).map(item => 
                                    item.id === editingId ? { ...item, ...modelData } : item
                                );
                                addNotification(`Model "${name}" berhasil diperbarui.`, 'success');
                            } else {
                                const newItem: StandardItem = { id: Date.now(), ...modelData };
                                updatedItems = [...(t.standardItems || []), newItem];
                                addNotification(`Model "${name}" berhasil ditambahkan.`, 'success');
                            }
                            return { ...t, standardItems: updatedItems };
                        }
                        return t;
                    })
                };
            }
            return cat;
        });
        await updateCategories(updatedCategories);
    }

    setIsLoading(false);
    resetForm();
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Kelola Model Aset`}
        size="2xl" 
        hideDefaultCloseButton
        disableContentPadding
      >
        <div className="p-6 space-y-6">
            <div className="p-3 text-sm text-blue-800 bg-blue-50/70 rounded-lg border border-blue-200/50">
                Mengelola Model untuk Tipe: <strong className="font-semibold">{type.name}</strong><br/>
                Dalam Kategori: <strong className="font-semibold">{category.name}</strong>
            </div>

            {/* Form Section */}
            <div className="p-5 bg-white border border-gray-200 rounded-xl shadow-sm">
                <h3 className="text-base font-semibold text-gray-800 mb-4 pb-2 border-b">{isEditing ? 'Edit Model' : 'Tambah Model Baru'}</h3>
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                            <label htmlFor="modelName" className="block text-sm font-medium text-gray-700">Nama Model</label>
                            <input type="text" id="modelName" value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Dropcore 1 Core Precon, RB4011" required className="block w-full px-3 py-2 mt-1 text-gray-900 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-tm-accent focus:border-tm-accent sm:text-sm" />
                        </div>
                        <div>
                            <label htmlFor="modelBrand" className="block text-sm font-medium text-gray-700">Brand</label>
                            <input type="text" id="modelBrand" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Contoh: FiberHome, Mikrotik" required className="block w-full px-3 py-2 mt-1 text-gray-900 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-tm-accent focus:border-tm-accent sm:text-sm" />
                        </div>
                    </div>
                    
                    {/* Bulk Logic: Only if Type is Bulk/Material */}
                    {isBulkType && (
                        <div className="mt-4 pt-4 border-t border-dashed border-gray-200 bg-orange-50/50 p-4 rounded-lg">
                             <div className="mb-4">
                                <label className="block text-xs font-bold text-orange-800 mb-2 uppercase tracking-wide">Strategi Stok Model Ini</label>
                                <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <input 
                                            type="radio" 
                                            name="bulkType" 
                                            value="count" 
                                            checked={bulkType === 'count'} 
                                            onChange={() => setBulkType('count')}
                                            className="text-orange-600 focus:ring-orange-500" 
                                        />
                                        <div className="text-sm">
                                            <span className="font-bold text-gray-700 block flex items-center gap-1"><Bs123 className="text-orange-500"/> Langsung Habis (Count)</span>
                                            <span className="text-gray-500 text-xs">Cth: Konektor, Adaptor (Pcs)</span>
                                        </div>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <input 
                                            type="radio" 
                                            name="bulkType" 
                                            value="measurement" 
                                            checked={bulkType === 'measurement'} 
                                            onChange={() => setBulkType('measurement')}
                                            className="text-orange-600 focus:ring-orange-500" 
                                        />
                                        <div className="text-sm">
                                            <span className="font-bold text-gray-700 block flex items-center gap-1"><BsRulers className="text-orange-500"/> Habis Perlahan (Measurement)</span>
                                            <span className="text-gray-500 text-xs">Cth: Kabel (Hasbal -> Meter)</span>
                                        </div>
                                    </label>
                                </div>
                            </div>
                            
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                                 <div>
                                    <label htmlFor="unitOfMeasure" className="block text-sm font-medium text-gray-700">
                                        {bulkType === 'measurement' ? 'Satuan Kontainer (Fisik)' : 'Satuan Stok Utama'}
                                    </label>
                                    <div className="mt-1">
                                        <CreatableSelect
                                            options={commonUnits}
                                            value={unitOfMeasure}
                                            onChange={setUnitOfMeasure}
                                            placeholder={bulkType === 'measurement' ? "Cth: Hasbal, Drum, Box" : "Cth: Pcs, Unit"}
                                        />
                                    </div>
                                    <p className="mt-1 text-xs text-gray-500">
                                        {bulkType === 'measurement' 
                                            ? "Bentuk fisik barang saat disimpan (misal: 1 Hasbal)."
                                            : "Satuan terkecil stok (misal: 1 Pcs)."}
                                    </p>
                                </div>

                                {bulkType === 'measurement' && (
                                    <>
                                        <div className="animate-fade-in-up">
                                            <label htmlFor="baseUnitOfMeasure" className="block text-sm font-medium text-gray-700">Satuan Penggunaan (Eceran)</label>
                                            <div className="mt-1">
                                                <CreatableSelect
                                                    options={commonUnits}
                                                    value={baseUnitOfMeasure}
                                                    onChange={setBaseUnitOfMeasure}
                                                    placeholder="Cth: Meter, Liter"
                                                />
                                            </div>
                                            <p className="mt-1 text-xs text-gray-500">Satuan saat barang dipakai/dipotong (misal: Meter).</p>
                                        </div>
                                        <div className="sm:col-span-2 animate-fade-in-up p-4 bg-white border border-orange-200 rounded-lg shadow-sm">
                                            <label htmlFor="quantityPerUnit" className="block text-sm font-bold text-orange-900">Konversi Isi Per Kontainer</label>
                                            <div className="flex items-center gap-3 mt-2">
                                                <span className="text-sm text-gray-600 font-medium">1 {unitOfMeasure || '...'} berisi</span>
                                                <input 
                                                    type="number" 
                                                    id="quantityPerUnit" 
                                                    value={quantityPerUnit} 
                                                    onChange={(e) => setQuantityPerUnit(e.target.value === '' ? '' : Number(e.target.value))} 
                                                    placeholder="1000" 
                                                    min="1"
                                                    className="block w-32 px-3 py-2 text-gray-900 bg-white border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-tm-accent focus:border-tm-accent sm:text-sm" 
                                                />
                                                <span className="text-sm text-gray-600 font-medium">{baseUnitOfMeasure || '...'}</span>
                                            </div>
                                             <p className="mt-2 text-xs text-gray-500">
                                                Contoh: Jika 1 Hasbal kabel berisi 1000 Meter, masukkan angka <strong>1000</strong>. 
                                                Sistem akan melacak sisa meteran secara otomatis.
                                             </p>
                                        </div>
                                    </>
                                )}
                             </div>
                        </div>
                    )}

                    <div className="flex items-center justify-end space-x-2 pt-2 border-t">
                        {isEditing && (<button type="button" onClick={resetForm} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Batal Edit</button>)}
                        <button type="submit" disabled={isLoading} className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white transition-colors duration-200 rounded-lg shadow-sm bg-tm-primary hover:bg-tm-primary-hover disabled:bg-tm-primary/70">
                            {isLoading && <SpinnerIcon className="w-5 h-5 mr-2" />}
                            {isEditing ? 'Simpan Perubahan' : 'Tambah Model'}
                        </button>
                    </div>
                </form>
            </div>

            {/* List Section */}
            <div>
                <h3 className="text-base font-semibold text-gray-800 mb-2">Daftar Model ({models.length})</h3>
                <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-2 -mr-2">
                {models.length > 0 ? (
                    models.map(model => {
                        const assetCount = assets.filter(a => a.name === model.name && a.brand === model.brand).length;
                        return (
                            <div key={model.id} className={`flex items-center justify-between p-3 rounded-lg transition-colors ${editingId === model.id ? 'bg-blue-100 border border-tm-primary' : 'bg-gray-50/70 border border-transparent'}`}>
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">{model.name}</p>
                                    <p className="text-xs text-gray-500">
                                        {model.brand} &bull; {assetCount} Aset
                                        {isBulkType && model.bulkType && (
                                            <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold ${model.bulkType === 'measurement' ? 'bg-purple-100 text-purple-700' : 'bg-gray-200 text-gray-600'}`}>
                                                {model.bulkType === 'measurement' ? `Measurement (${model.quantityPerUnit} ${model.baseUnitOfMeasure}/${model.unitOfMeasure})` : 'Direct Count'}
                                            </span>
                                        )}
                                    </p>
                                </div>
                                <div className="flex items-center space-x-1">
                                    <button onClick={() => handleEditClick(model)} className="p-1.5 text-gray-500 rounded-md hover:bg-yellow-100 hover:text-yellow-700" title="Edit Model"><PencilIcon className="w-4 h-4" /></button>
                                    <button onClick={() => handleDeleteClick(model)} className="p-1.5 text-gray-500 rounded-md hover:bg-red-100 hover:text-red-700" title="Hapus Model"><TrashIcon className="w-4 h-4" /></button>
                                </div>
                            </div>
                        )
                    })
                ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center text-gray-500 border-2 border-dashed rounded-lg">
                        <InboxIcon className="w-10 h-10 text-gray-400" />
                        <p className="mt-2 text-sm">Belum ada model untuk tipe ini.</p>
                    </div>
                )}
                </div>
            </div>
        </div>
      </Modal>

      {modelToDelete && (
        <Modal
          isOpen={!!modelToDelete}
          onClose={() => setModelToDelete(null)}
          title={modelToDelete.assetCount > 0 ? "Tidak Dapat Menghapus" : "Konfirmasi Hapus Model"}
          size="md"
          hideDefaultCloseButton
        >
          <div className="text-center">
            <div className={`flex items-center justify-center w-12 h-12 mx-auto rounded-full ${modelToDelete.assetCount > 0 ? 'bg-amber-100 text-amber-600' : 'bg-red-100 text-red-600'}`}>
              <ExclamationTriangleIcon className="w-8 h-8" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-800">{modelToDelete.assetCount > 0 ? `Model Sedang Digunakan` : `Hapus Model?`}</h3>
             {modelToDelete.assetCount > 0 ? (
                <p className="mt-2 text-sm text-gray-600">
                    Anda tidak dapat menghapus model <span className="font-bold">"{modelToDelete.name}"</span> karena masih ada {modelToDelete.assetCount} aset yang terhubung. Harap pindahkan atau hapus aset tersebut terlebih dahulu.
                </p>
             ) : (
                <p className="mt-2 text-sm text-gray-600">
                    Anda yakin ingin menghapus model <span className="font-bold">"{modelToDelete.name}"</span>? Tindakan ini tidak dapat diurungkan.
                </p>
             )}
          </div>
            <div className="flex items-center justify-end pt-5 mt-5 space-x-3 border-t">
                 {modelToDelete.assetCount > 0 ? (
                    <button type="button" onClick={() => setModelToDelete(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Mengerti</button>
                 ) : (
                     <>
                        <button type="button" onClick={() => setModelToDelete(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Batal</button>
                        <button type="button" onClick={handleConfirmDelete} className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-danger rounded-lg shadow-sm hover:bg-red-700">Ya, Hapus</button>
                    </>
                 )}
            </div>
        </Modal>
      )}
    </>
  );
};
