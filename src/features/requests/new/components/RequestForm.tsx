
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  User, 
  Asset, 
  AssetCategory, 
  Division, 
  RequestItem, 
  OrderDetails, 
  OrderType, 
  AssetStatus,
  AssetType,
  StandardItem,
  ItemClassification
} from '../../../../types';
import { CreatableSelect } from '../../../../components/ui/CreatableSelect';
import { useNotification } from '../../../../providers/NotificationProvider';
import { SpinnerIcon } from '../../../../components/icons/SpinnerIcon';
import { Letterhead } from '../../../../components/ui/Letterhead';
import { SignatureStamp } from '../../../../components/ui/SignatureStamp';
import { DownloadIcon } from '../../../../components/icons/DownloadIcon';
import { Tooltip } from '../../../../components/ui/Tooltip';
import { 
  BsBoxSeam, 
  BsFileEarmarkPdf, 
  BsPlusLg,
  BsJournalBookmark,
  BsTrash3,
  BsExclamationCircle,
  BsLightningChargeFill,
  BsCheckCircleFill,
  BsCart,
  BsPerson,
  BsBuilding,
  BsInfoCircle,
  BsExclamationTriangleFill,
  BsRulers,
  BsArrowRight
} from 'react-icons/bs';
import DatePicker from '../../../../components/ui/DatePicker';
import { useAssetStore } from '../../../../stores/useAssetStore';
import { RequestItemFormState } from '../utils/requestHelpers'; // Import Type

const DRAFT_VERSION = "1.0.5"; // Bump version
const MAX_ITEMS = 15;

interface RequestFormProps {
  currentUser: User;
  assets: Asset[];
  assetCategories: AssetCategory[];
  divisions: Division[];
  onCreateRequest: (data: { items: RequestItem[]; order: OrderDetails }) => void;
  initialItems?: RequestItemFormState[];
  initialOrderType?: OrderType;
  onCancel: () => void;
}

// Default options for standard items
const STANDARD_UNIT_OPTIONS = ['Unit', 'Pcs', 'Set', 'Pack', 'Box'];

export const RequestForm: React.FC<RequestFormProps> = ({ 
  currentUser, 
  assets,
  assetCategories, 
  divisions,
  onCreateRequest, 
  initialItems, 
  initialOrderType,
  onCancel 
}) => {
  const [items, setItems] = useState<RequestItemFormState[]>(() => {
      if (initialItems && initialItems.length > 0) {
          return initialItems;
      }
      return [{ 
          id: Date.now(), itemName: '', itemTypeBrand: '', quantity: 1, keterangan: '', 
          tempCategoryId: '', tempTypeId: '', availableStock: 0, unit: 'Unit' 
      }];
  });

  const isAtLimit = items.length >= MAX_ITEMS;

  const [orderType, setOrderType] = useState<OrderType>(initialOrderType || 'Regular Stock');
  const [justification, setJustification] = useState('');
  const [project, setProject] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [requestDate, setRequestDate] = useState<Date | null>(new Date());
  
  const updateCategories = useAssetStore((state) => state.updateCategories);
  const checkAvailability = useAssetStore((state) => state.checkAvailability); 
  
  const formRef = useRef<HTMLDivElement>(null);
  const addNotification = useNotification();
  const userDraftKey = useMemo(() => `triniti_draft_user_${currentUser.id}`, [currentUser.id]);

  const userDivision = useMemo(() => 
    divisions.find(d => d.id === currentUser.divisionId)?.name || 'N/A'
  , [divisions, currentUser]);

  const categoryNames = useMemo(() => assetCategories.map(c => c.name), [assetCategories]);

  useEffect(() => {
    if (initialItems && initialItems.length > 0) {
       setItems(initialItems);
       if (initialOrderType) {
           setOrderType(initialOrderType);
           if (initialOrderType === 'Urgent') {
               setJustification('Restock Stok Kritis (Auto Generated)');
           }
       } else {
           setOrderType('Regular Stock');
           setJustification('');
           setProject('');
       }
    }
  }, [initialItems, initialOrderType]);

  useEffect(() => {
    if (!initialItems) {
        const savedDraft = localStorage.getItem(userDraftKey);
        if (savedDraft) {
          try {
            const parsed = JSON.parse(savedDraft);
            if (parsed.version === DRAFT_VERSION) {
                setItems(parsed.items);
                setOrderType(parsed.orderType);
                setJustification(parsed.justification);
                setProject(parsed.project);
                setLastSaved(parsed.lastSaved);
                addNotification("Draf permintaan telah dimuat.", "info");
            }
          } catch (e) {
            // Ignore error
          }
        }
    }
  }, [userDraftKey, initialItems]);

  const handleAddItem = () => {
    if (items.length >= MAX_ITEMS) {
        addNotification(`Batas maksimal ${MAX_ITEMS} item tercapai.`, "warning");
        return;
    }
    setItems(prev => [...prev, { 
      id: Date.now(), itemName: '', itemTypeBrand: '', quantity: 1, keterangan: '', 
      tempCategoryId: '', tempTypeId: '', availableStock: 0, unit: 'Unit' 
    }]);
  };

  const handleRemoveItem = (id: number) => {
    if (items.length > 1) setItems(prev => prev.filter(i => i.id !== id));
  };

  // --- SMART UPDATE STATE with ATP & Flexible Measurement Logic ---
  const updateItemState = useCallback((id: number, updates: Partial<RequestItemFormState>) => {
    setItems(prev => prev.map(item => {
      if (item.id === id) {
        const nextItem = { ...item, ...updates };
        
        // Reset Logic on Category Change
        if ('tempCategoryId' in updates && updates.tempCategoryId !== item.tempCategoryId) {
            nextItem.tempTypeId = ''; nextItem.itemName = ''; nextItem.itemTypeBrand = ''; 
            nextItem.availableStock = 0; nextItem.stockDetails = undefined;
        }
        
        // Reset Logic on Type Change
        if ('tempTypeId' in updates && updates.tempTypeId !== item.tempTypeId) {
            nextItem.itemName = ''; nextItem.itemTypeBrand = ''; 
            nextItem.availableStock = 0; nextItem.stockDetails = undefined;
            
            // Auto-detect unit from Type config
            const cat = assetCategories.find(c => c.id.toString() === nextItem.tempCategoryId);
            const typeData = cat?.types.find(t => t.id.toString() === updates.tempTypeId);
            nextItem.unit = typeData?.unitOfMeasure || 'Unit';
        }

        // Logic on Model Change (Auto-fill Brand & Smart Unit)
        if ('itemName' in updates && updates.itemName) {
           const cat = assetCategories.find(c => c.id.toString() === nextItem.tempCategoryId);
           const typeData = cat?.types.find(t => t.id.toString() === nextItem.tempTypeId);
           const modelData = typeData?.standardItems?.find(m => m.name === updates.itemName);
           
           if (modelData) {
               nextItem.itemTypeBrand = modelData.brand || '';
               
               // FLEXIBLE UNIT LOGIC:
               if (!('unit' in updates)) {
                   if (modelData.bulkType === 'measurement') {
                       nextItem.unit = modelData.unitOfMeasure || 'Hasbal';
                   } else {
                       nextItem.unit = modelData.unitOfMeasure || typeData?.unitOfMeasure || 'Unit';
                   }
               }
           }
        }

        // TRIGGER ATP CHECK
        const nameToCheck = nextItem.itemName;
        const brandToCheck = nextItem.itemTypeBrand;
        const qtyToCheck = nextItem.quantity;
        const unitToCheck = nextItem.unit;
        
        if (nameToCheck && brandToCheck) {
             // Call ATP check with Context Aware Unit
             const stockInfo = checkAvailability(nameToCheck, brandToCheck, Number(qtyToCheck), unitToCheck);
             
             // Update Display berdasarkan hasil smart dari store
             nextItem.availableStock = stockInfo.availableSmart;

             nextItem.stockDetails = {
                 physical: stockInfo.physicalCount,
                 reserved: stockInfo.reservedCount, // Reserved physical
                 isFragmented: stockInfo.isFragmented
             };
        } else {
             nextItem.availableStock = 0;
             nextItem.stockDetails = undefined;
        }
        
        return nextItem;
      }
      return item;
    }));
  }, [assetCategories, checkAvailability]);

  // Handler khusus untuk perubahan Unit agar bisa reset Qty jika magnitudo berubah
  const handleUnitChange = (itemId: number, newUnit: string) => {
      const item = items.find(i => i.id === itemId);
      if(!item) return;

      // Cek apakah model ini measurement
      const currentCat = assetCategories.find(c => c.id.toString() === item.tempCategoryId);
      const currentType = currentCat?.types.find(t => t.id.toString() === item.tempTypeId);
      const selectedModel = currentType?.standardItems?.find(m => m.name === item.itemName && m.brand === item.itemTypeBrand);
      
      let newQty = item.quantity;

      if (selectedModel?.bulkType === 'measurement') {
          const containerUnit = selectedModel.unitOfMeasure || 'Hasbal';
          const baseUnit = selectedModel.baseUnitOfMeasure || 'Meter';
          
          if (item.unit === baseUnit && newUnit === containerUnit) {
              if (newQty > 10) { 
                  newQty = 1;
                  addNotification("Kuantitas di-reset ke 1 karena perubahan satuan ke fisik (kontainer).", "info");
              }
          }
      }

      updateItemState(itemId, { unit: newUnit, quantity: newQty });
  };

  const fulfillmentStatus = useMemo(() => {
      if (items.some(i => !i.itemName || i.quantity <= 0)) return 'invalid';
      const allInStock = items.every(item => item.availableStock >= item.quantity);
      return allInStock ? 'stock' : 'procurement';
  }, [items]);

  const handleCategorySelect = async (itemId: number, value: string) => {
    if (!value.trim()) return;
    const existingCat = assetCategories.find(c => c.name.toLowerCase() === value.trim().toLowerCase());
    
    if (existingCat) {
        updateItemState(itemId, { tempCategoryId: existingCat.id.toString() });
    } else {
        const newId = Date.now();
        const newCategory: AssetCategory = { id: newId, name: value.trim(), types: [], associatedDivisions: [], isCustomerInstallable: false };
        try {
            await updateCategories([...assetCategories, newCategory]);
            updateItemState(itemId, { tempCategoryId: newId.toString() });
        } catch (error) { addNotification("Gagal membuat kategori baru.", "error"); }
    }
  };

  const handleTypeSelect = async (itemId: number, categoryId: string, value: string) => {
    if (!value.trim() || !categoryId) return;
    const category = assetCategories.find(c => c.id.toString() === categoryId);
    if (!category) return;

    const existingType = category.types.find(t => t.name.toLowerCase() === value.trim().toLowerCase());

    if (existingType) {
        updateItemState(itemId, { tempTypeId: existingType.id.toString(), unit: existingType.unitOfMeasure || 'Unit' });
    } else {
        const newTypeId = Date.now();
        const newType: AssetType = { id: newTypeId, name: value.trim(), standardItems: [], classification: 'asset', trackingMethod: 'individual', unitOfMeasure: 'Unit' };
        const updatedCategory = { ...category, types: [...category.types, newType] };
        const updatedCategories = assetCategories.map(c => c.id === category.id ? updatedCategory : c);
        try {
            await updateCategories(updatedCategories);
            updateItemState(itemId, { tempTypeId: newTypeId.toString(), unit: 'Unit' });
        } catch (error) { addNotification("Gagal membuat tipe baru.", "error"); }
    }
  };
  
  const handleUpdateTypeConfig = async (itemId: number, categoryId: string, typeId: string, config: { classification: ItemClassification, unit: string }) => {
    const category = assetCategories.find(c => c.id.toString() === categoryId);
    if (!category) return;
    const typeIndex = category.types.findIndex(t => t.id.toString() === typeId);
    if (typeIndex === -1) return;
    const currentType = category.types[typeIndex];
    if (currentType.classification === config.classification && currentType.unitOfMeasure === config.unit) return;

    const updatedType: AssetType = { ...currentType, classification: config.classification, trackingMethod: config.classification === 'material' ? 'bulk' : 'individual', unitOfMeasure: config.unit };
    const updatedTypes = [...category.types]; updatedTypes[typeIndex] = updatedType;
    const updatedCategory = { ...category, types: updatedTypes };
    const updatedCategories = assetCategories.map(c => c.id === category.id ? updatedCategory : c);

    try {
        await updateCategories(updatedCategories);
        updateItemState(itemId, { unit: config.unit });
        addNotification(`Konfigurasi tipe diperbarui.`, 'success');
    } catch (e) { addNotification("Gagal menyimpan konfigurasi tipe.", "error"); }
  };

  const handleModelSelect = async (itemId: number, categoryId: string, typeId: string, value: string) => {
    updateItemState(itemId, { itemName: value });
    if (!value.trim()) return;
    const category = assetCategories.find(c => c.id.toString() === categoryId);
    const type = category?.types.find(t => t.id.toString() === typeId);
    if (category && type) {
        const existingModel = type.standardItems?.find(m => m.name.toLowerCase() === value.trim().toLowerCase());
        if (!existingModel) {
            const newModel: StandardItem = { id: Date.now(), name: value.trim(), brand: 'Generic' };
            const updatedType = { ...type, standardItems: [...(type.standardItems || []), newModel] };
            const updatedCategory = { ...category, types: category.types.map(t => t.id === type.id ? updatedType : t) };
            const updatedCategories = assetCategories.map(c => c.id === category.id ? updatedCategory : c);
            try {
                await updateCategories(updatedCategories);
                updateItemState(itemId, { itemTypeBrand: 'Generic' });
            } catch (e) { console.error("Failed to sync new model"); }
        } else {
            updateItemState(itemId, { itemTypeBrand: existingModel.brand });
        }
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.some(i => !i.itemName || i.quantity <= 0)) {
      addNotification("Mohon lengkapi nama item dan kuantitas (minimal 1).", "error");
      return;
    }
    setIsLoading(true);
    localStorage.removeItem(userDraftKey);
    window.dispatchEvent(new Event('storage'));
    
    const cleanItems: RequestItem[] = items.map(({ tempCategoryId, tempTypeId, availableStock, unit, stockDetails, ...rest }) => ({
        ...rest,
        categoryId: tempCategoryId,
        typeId: tempTypeId,
        unit: unit 
    }));

    onCreateRequest({ items: cleanItems, order: { type: orderType, justification, project } });
  };

  const handleSaveDraft = () => {
    setIsSavingDraft(true);
    const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const draftData = { version: DRAFT_VERSION, items, orderType, justification, project, lastSaved: now, updatedAt: new Date().toISOString() };
    
    setTimeout(() => {
      try {
        localStorage.setItem(userDraftKey, JSON.stringify(draftData));
        setLastSaved(now);
        window.dispatchEvent(new Event('storage'));
        addNotification(`Draf disimpan pada ${now}`, "success");
      } catch (e) { addNotification("Gagal menyimpan draf.", "error"); } finally { setIsSavingDraft(false); }
    }, 500);
  };

  const handleClearDraft = () => {
    if (window.confirm("Hapus draf ini? Data yang belum disimpan akan hilang.")) {
      localStorage.removeItem(userDraftKey);
      window.dispatchEvent(new Event('storage'));
      setItems([]); setOrderType('Regular Stock'); setJustification(''); setProject(''); setLastSaved(null); handleAddItem(); addNotification("Draf dihapus.", "info");
    }
  };

  return (
    <div className="space-y-5 animate-fade-in max-w-5xl mx-auto">
       <div className="flex flex-wrap justify-between items-center bg-white px-5 py-3 rounded-xl border border-slate-200 shadow-sm gap-4 no-print sticky top-2 z-10">
        <div className="flex items-center gap-3">
            <h4 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <BsFileEarmarkPdf className="text-tm-primary w-4 h-4" />
                Permintaan Barang
            </h4>
            {lastSaved && <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 font-medium">Draft: {lastSaved}</span>}
        </div>
        <div className="flex items-center gap-2">
            <button type="button" onClick={handleSaveDraft} disabled={isSavingDraft} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-100 hover:text-tm-primary transition-all disabled:opacity-50">
                {isSavingDraft ? <SpinnerIcon className="w-3 h-3" /> : <BsJournalBookmark className="w-3 h-3" />} Simpan
            </button>
            {lastSaved && (<button type="button" onClick={handleClearDraft} className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-all" title="Hapus Draft"><BsTrash3 className="w-4 h-4" /></button>)}
            <div className="h-4 w-px bg-slate-300 mx-1"></div>
            <button type="button" disabled className="p-1.5 text-slate-400 hover:text-slate-600 transition-all"><DownloadIcon className="w-4 h-4" /></button>
        </div>
      </div>

      <div ref={formRef} className="bg-white border border-slate-200 rounded-xl shadow-lg relative overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-tm-primary to-tm-accent"></div>
        <div className="p-6 sm:p-10">
          <Letterhead />
          <div className="text-center my-6"><h2 className="text-xl font-bold text-slate-800 uppercase tracking-wide">Surat Permintaan Barang</h2></div>

          <form onSubmit={handleFormSubmit} className="space-y-8">
              <div className="bg-slate-50/80 p-6 rounded-xl border border-slate-200 shadow-sm">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div><label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">No. Request</label><div className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-400 text-sm italic shadow-sm">[Auto: RO-YYMMDD-XXXX]</div></div>
                      <div><label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">No. Dokumen</label><div className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-400 text-sm italic shadow-sm">[Auto: RO-YYMMDD-XXXX]</div></div>
                      <div><label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Tanggal</label><DatePicker id="req-date" selectedDate={requestDate} onDateChange={setRequestDate} /></div>
                      <div><label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Pemohon</label><div className="flex items-center gap-2 w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-700 text-sm font-medium"><BsPerson className="w-4 h-4 text-slate-400"/> {currentUser.name}</div></div>
                       <div><label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Divisi</label><div className="flex items-center gap-2 w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-700 text-sm font-medium"><BsBuilding className="w-4 h-4 text-slate-400"/> {userDivision}</div></div>
                       <div className="relative"><label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">{orderType === 'Regular Stock' ? 'Tipe Order' : (<span className="flex justify-between items-center">Tipe Order<span className="text-tm-primary text-[9px] normal-case bg-blue-50 px-1.5 py-0.5 rounded">Wajib Isi Info</span></span>)}</label><div className="space-y-2"><select value={orderType} onChange={e => setOrderType(e.target.value as OrderType)} className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 focus:ring-2 focus:ring-tm-primary/20 focus:border-tm-primary outline-none transition-all shadow-sm"><option value="Regular Stock">Regular Stock</option><option value="Urgent">Urgent Request</option><option value="Project Based">Project Based</option></select></div></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-1 gap-6 mt-4">
                   {orderType !== 'Regular Stock' && (
                          <div className="animate-fade-in-down w-full">
                              {initialOrderType === 'Urgent' && orderType === 'Urgent' ? (
                                  <div className="w-full p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800 flex items-center gap-3 shadow-sm"><BsInfoCircle className="w-4 h-4 flex-shrink-0 text-blue-600" /><div><p className="font-bold">Mode Restock Otomatis</p><p className="text-blue-700">Justifikasi telah diisi otomatis oleh sistem berdasarkan peringatan stok.</p></div></div>
                              ) : (
                                  <input type="text" value={orderType === 'Project Based' ? project : justification} onChange={e => orderType === 'Project Based' ? setProject(e.target.value) : setJustification(e.target.value)} placeholder={orderType === 'Project Based' ? "Nama Proyek / Site..." : "Alasan kebutuhan mendesak..."} className="w-full px-3 py-2 bg-white border-2 border-yellow-100 focus:border-tm-primary/50 rounded-lg text-sm text-slate-700 placeholder:text-slate-400 focus:ring-0 outline-none transition-all" />
                              )}
                          </div>
                      )}
                  </div>
              </div>

              <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <h3 className="text-sm font-bold text-slate-800 uppercase flex items-center gap-2"><BsBoxSeam className="text-tm-primary w-4 h-4" /> Daftar Barang</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${isAtLimit ? 'bg-red-50 text-red-600 border-red-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>{items.length} / {MAX_ITEMS}</span>
                  </div>

                  <div className="space-y-3">
                      {items.map((item, idx) => {
                          const currentCat = assetCategories.find(c => c.id.toString() === item.tempCategoryId);
                          const availableTypes = currentCat?.types || [];
                          const currentType = availableTypes.find(t => t.id.toString() === item.tempTypeId);
                          const availableModels = currentType?.standardItems || [];
                          const isNewType = currentType && Date.now() - currentType.id < 60000;
                          
                          const hasStock = item.availableStock > 0;
                          const isFragmented = item.stockDetails?.isFragmented;
                          const reservedStock = item.stockDetails?.reserved || 0;
                          const physicalStock = item.stockDetails?.physical || 0;
                          
                          const selectedModel = availableModels.find(m => m.name === item.itemName && m.brand === item.itemTypeBrand);
                          const isMeasurement = selectedModel?.bulkType === 'measurement';
                          
                          // FIX: AVAILABLE UNITS CALCULATION DIRECTLY
                          let availableUnitOptions = STANDARD_UNIT_OPTIONS.map(u => ({ value: u, label: u }));
                          
                          if (isMeasurement && selectedModel) {
                              availableUnitOptions = [
                                  { value: selectedModel.unitOfMeasure || 'Hasbal', label: `${selectedModel.unitOfMeasure || 'Hasbal'} (Fisik)` },
                                  { value: selectedModel.baseUnitOfMeasure || 'Meter', label: `${selectedModel.baseUnitOfMeasure || 'Meter'} (Eceran)` }
                              ];
                          } else if (currentType?.unitOfMeasure) {
                              availableUnitOptions = [{ value: currentType.unitOfMeasure, label: currentType.unitOfMeasure }];
                          }

                          const isContainerMode = item.unit === selectedModel?.unitOfMeasure;

                          return (
                              <div key={item.id} className="group relative bg-white border border-slate-200 rounded-lg shadow-sm hover:border-tm-primary/40 hover:shadow-md transition-all p-4">
                                  {items.length > 1 && (
                                      <button type="button" onClick={() => handleRemoveItem(item.id)} className="absolute top-2 right-2 text-slate-300 hover:text-red-500 transition-colors p-1" title="Hapus Item"><BsTrash3 className="w-3.5 h-3.5" /></button>
                                  )}
                                  <div className="flex gap-4">
                                      <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-slate-100 text-slate-500 text-xs font-bold rounded mt-1 group-hover:bg-tm-primary group-hover:text-white transition-colors">{idx + 1}</div>
                                      <div className="flex-1 space-y-3">
                                          <div className="grid grid-cols-12 gap-3">
                                              <div className="col-span-12 sm:col-span-4"><label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Kategori</label><CreatableSelect options={categoryNames} value={currentCat?.name || ''} onChange={(val) => handleCategorySelect(item.id, val)} placeholder="Pilih Kategori" /></div>
                                              <div className="col-span-12 sm:col-span-4"><label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Tipe</label><CreatableSelect options={availableTypes.map(t => t.name)} value={currentType?.name || ''} onChange={(val) => handleTypeSelect(item.id, item.tempCategoryId, val)} placeholder="Pilih Tipe" disabled={!item.tempCategoryId} /></div>
                                              <div className="col-span-12 sm:col-span-4"><label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Model</label><CreatableSelect options={availableModels.map(m => m.name)} value={item.itemName} onChange={(val) => handleModelSelect(item.id, item.tempCategoryId, item.tempTypeId, val)} placeholder="Pilih Model" disabled={!item.tempTypeId} /></div>
                                          </div>
                                          <div className="grid grid-cols-12 gap-3 items-start">
                                              <div className="col-span-12 sm:col-span-3"><label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Brand</label><input type="text" value={item.itemTypeBrand} onChange={e => updateItemState(item.id, { itemTypeBrand: e.target.value })} placeholder="Cth: Mikrotik" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-700 focus:bg-white focus:border-tm-primary outline-none transition-colors" /></div>
                                              
                                              <div className="col-span-4 sm:col-span-2">
                                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5 text-center">
                                                    Stok ({isMeasurement ? (isContainerMode ? 'Fisik' : 'Isi') : 'ATP'})
                                                </label>
                                                <div className="relative group/stock">
                                                     <input 
                                                        type="text" 
                                                        readOnly 
                                                        value={`${item.availableStock} ${item.unit || ''}`} 
                                                        className={`w-full px-3 py-2 border rounded-md text-sm font-bold text-center cursor-default focus:outline-none 
                                                            ${hasStock ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-100 border-slate-200 text-slate-400'}
                                                            ${isFragmented ? 'border-amber-400 bg-amber-50 text-amber-800' : ''}
                                                        `} 
                                                     />
                                                     
                                                     {isFragmented && <BsExclamationTriangleFill className="absolute top-1/2 -translate-y-1/2 right-2 text-amber-500 w-3.5 h-3.5" />}
                                                     {reservedStock > 0 && !isFragmented && <BsInfoCircle className="absolute top-1/2 -translate-y-1/2 right-2 text-blue-400 w-3.5 h-3.5" />}

                                                     <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2 bg-slate-800 text-white text-[10px] rounded shadow-lg opacity-0 group-hover/stock:opacity-100 transition-opacity pointer-events-none z-20">
                                                        <div className="font-bold border-b border-slate-600 pb-1 mb-1">Status Stok</div>
                                                        <div className="flex justify-between"><span>Unit Fisik (Gudang):</span> <span className="font-mono">{physicalStock} {selectedModel?.unitOfMeasure || 'Unit'}</span></div>
                                                        <div className="flex justify-between text-amber-300"><span>Ter-reservasi:</span> <span className="font-mono">{reservedStock} Unit</span></div>
                                                        <div className="flex justify-between border-t border-slate-600 pt-1 mt-1">
                                                            <span>Tersedia ({item.unit}):</span> 
                                                            <span className="font-bold text-emerald-400 font-mono">{item.availableStock}</span>
                                                        </div>
                                                        {isMeasurement && (
                                                            <div className="mt-1 pt-1 border-t border-slate-600 text-emerald-400 italic">
                                                                Mode: {isContainerMode ? 'Stok Fisik' : 'Stok Isi (Eceran)'}
                                                            </div>
                                                        )}
                                                        {isFragmented && <div className="mt-1 text-amber-400 italic">⚠️ Stok terpecah/fragmented.</div>}
                                                     </div>
                                                </div>
                                              </div>

                                              <div className="col-span-8 sm:col-span-5"><label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">Keterangan</label><input type="text" value={item.keterangan} onChange={e => updateItemState(item.id, { keterangan: e.target.value })} placeholder="Spesifikasi / Keperluan..." className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm text-slate-700 focus:bg-white focus:border-tm-primary outline-none transition-colors placeholder:text-slate-400" /></div>
                                              
                                              <div className="col-span-12 sm:col-span-2 relative">
                                                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5 text-center">Jumlah & Unit</label>
                                                  <div className="flex rounded-md shadow-sm">
                                                    <input 
                                                        type="number" 
                                                        value={item.quantity} 
                                                        onChange={e => updateItemState(item.id, { quantity: parseFloat(e.target.value) || 0 })} 
                                                        min="0.1" 
                                                        step={isMeasurement ? "0.1" : "1"} 
                                                        className="w-1/2 pl-3 pr-1 py-2 bg-white border border-slate-300 rounded-l-md text-sm font-bold text-center text-slate-800 focus:ring-1 focus:ring-tm-primary focus:border-tm-primary outline-none z-10" 
                                                    />
                                                    <select
                                                        value={item.unit}
                                                        onChange={(e) => handleUnitChange(item.id, e.target.value)}
                                                        className="w-1/2 pl-2 pr-6 py-2 bg-slate-50 border-y border-r border-slate-300 rounded-r-md text-[10px] font-semibold text-slate-700 focus:ring-1 focus:ring-tm-primary focus:border-tm-primary outline-none appearance-none cursor-pointer hover:bg-slate-100"
                                                        style={{ backgroundImage: 'none' }}
                                                    >
                                                        {availableUnitOptions.map(opt => (
                                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                        ))}
                                                    </select>
                                                  </div>
                                              </div>
                                          </div>
                                          
                                          {isMeasurement && selectedModel && (
                                              <div className="mt-2 p-2 bg-indigo-50 border border-indigo-100 rounded-md flex flex-col sm:flex-row items-start sm:items-center gap-2 text-xs text-indigo-800 animate-fade-in-up">
                                                  <div className="flex items-center gap-2">
                                                      <BsRulers className="w-3.5 h-3.5" />
                                                      <span className="font-bold">Info Konversi:</span>
                                                  </div>
                                                  <span>
                                                      1 {selectedModel.unitOfMeasure} (Fisik) = <strong>{selectedModel.quantityPerUnit} {selectedModel.baseUnitOfMeasure}</strong>.
                                                  </span>
                                                  {isContainerMode ? (
                                                      <span className="ml-auto text-[10px] bg-indigo-200 px-2 py-0.5 rounded text-indigo-900 font-bold">
                                                          Anda meminta {item.quantity} Unit Fisik (Total {item.quantity * (selectedModel.quantityPerUnit || 0)} {selectedModel.baseUnitOfMeasure})
                                                      </span>
                                                  ) : (
                                                       <span className="ml-auto text-[10px] bg-white border border-indigo-200 px-2 py-0.5 rounded text-indigo-700">
                                                          Permintaan Eceran (Potong)
                                                      </span>
                                                  )}
                                              </div>
                                          )}

                                          {!isMeasurement && (isNewType || (currentType && !currentType.classification)) && currentCat && currentType && (
                                            <div className="mt-2 p-2 bg-blue-50/50 border border-blue-100 rounded-md flex flex-wrap items-center gap-2 text-xs">
                                                <span className="font-bold text-blue-700 flex items-center gap-1"><BsLightningChargeFill /> Konfigurasi:</span>
                                                <button type="button" onClick={() => handleUpdateTypeConfig(item.id, item.tempCategoryId, item.tempTypeId, { classification: 'asset', unit: 'Unit' })} className={`px-2 py-0.5 rounded border ${currentType.classification === 'asset' ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-white border-slate-200 text-slate-500'}`}>Device</button>
                                                <button type="button" onClick={() => handleUpdateTypeConfig(item.id, item.tempCategoryId, item.tempTypeId, { classification: 'material', unit: 'Pcs' })} className={`px-2 py-0.5 rounded border ${currentType.classification === 'material' ? 'bg-orange-100 border-orange-300 text-orange-800' : 'bg-white border-slate-200 text-slate-500'}`}>Material</button>
                                                <select value={item.unit} onChange={(e) => handleUpdateTypeConfig(item.id, item.tempCategoryId, item.tempTypeId, { classification: currentType.classification || 'asset', unit: e.target.value })} className="px-1 py-0.5 border border-slate-200 rounded text-slate-700 bg-white outline-none">{STANDARD_UNIT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select>
                                            </div>
                                          )}
                                      </div>
                                  </div>
                              </div>
                          );
                      })}
                  </div>
                  <button type="button" onClick={handleAddItem} disabled={isAtLimit} className={`w-full py-3 border-2 border-dashed rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all ${isAtLimit ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed' : 'bg-white border-slate-300 text-slate-500 hover:border-tm-primary hover:text-tm-primary hover:bg-tm-primary/5'}`}>{isAtLimit ? <BsExclamationCircle /> : <BsPlusLg />}{isAtLimit ? 'BATAS ITEM TERCAPAI' : 'TAMBAH BARIS'}</button>
              </div>

              {fulfillmentStatus !== 'invalid' && (
                  <div className={`p-3 rounded-lg border flex items-start gap-3 text-xs ${fulfillmentStatus === 'stock' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
                      <div className={`p-1.5 rounded-full ${fulfillmentStatus === 'stock' ? 'bg-emerald-100' : 'bg-blue-100'}`}>{fulfillmentStatus === 'stock' ? <BsCheckCircleFill className="w-3.5 h-3.5"/> : <BsCart className="w-3.5 h-3.5"/>}</div>
                      <div>
                          <p className="font-bold">{fulfillmentStatus === 'stock' ? 'Stok Tersedia' : 'Perlu Pengadaan'}</p>
                          <p className="opacity-90 mt-0.5">{fulfillmentStatus === 'stock' 
                              ? 'Semua item tersedia. Item yang terpecah (fragmented) akan dialokasikan dari beberapa unit.' 
                              : 'Sebagian item tidak tersedia. Masuk alur persetujuan pengadaan.'}</p>
                      </div>
                  </div>
              )}

              <div className="pt-6 border-t border-slate-100">
                  <div className="grid grid-cols-3 gap-4 text-center">
                      <div><p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Pemohon</p><div className="h-20 flex items-center justify-center bg-slate-50 rounded-lg border border-slate-100"><SignatureStamp signerName={currentUser.name} signatureDate={new Date().toISOString()} signerDivision={userDivision} /></div></div>
                      <div><p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Logistik</p><div className="h-20 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-lg"><span className="text-[10px] text-slate-300">Tanda Tangan</span></div></div>
                      <div><p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Disetujui</p><div className="h-20 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-lg"><span className="text-[10px] text-slate-300">Tanda Tangan</span></div></div>
                  </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 no-print">
                  <button type="button" onClick={onCancel} className="px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Batal</button>
                  <button type="submit" disabled={isLoading || fulfillmentStatus === 'invalid'} className="px-6 py-2 text-sm font-bold text-white bg-slate-900 rounded-lg hover:bg-tm-primary transition-all shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">{isLoading && <SpinnerIcon className="w-4 h-4" />} Kirim Permintaan</button>
              </div>
          </form>
        </div>
      </div>
    </div>
  );
};
