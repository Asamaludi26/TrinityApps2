
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Handover, HandoverItem, Asset, User, Division, AssetStatus } from '../../types';
import DatePicker from '../../components/ui/DatePicker';
import { useNotification } from '../../providers/NotificationProvider';
import { SpinnerIcon } from '../../components/icons/SpinnerIcon';
import FloatingActionBar from '../../components/ui/FloatingActionBar';
import { Letterhead } from '../../components/ui/Letterhead';
import { SignatureStamp } from '../../components/ui/SignatureStamp';
import { InfoIcon } from '../../components/icons/InfoIcon';
import { TrashIcon } from '../../components/icons/TrashIcon';
import { CustomSelect } from '../../components/ui/CustomSelect';
import { generateDocumentNumber } from '../../utils/documentNumberGenerator';
import { HandoverInitialState, getHandoverInitialState } from './logic/handoverStrategies';
import { BsBoxSeam, BsBriefcase, BsArchive, BsExclamationTriangle } from 'react-icons/bs';

// Stores used inside form
import { useAssetStore } from '../../stores/useAssetStore';
import { useMasterDataStore } from '../../stores/useMasterDataStore';
import { useTransactionStore } from '../../stores/useTransactionStore';

interface HandoverFormProps {
    onSave: (data: Omit<Handover, 'id' | 'status'>, targetStatus: AssetStatus) => void;
    onCancel: () => void;
    prefillData?: any;
    currentUser: User;
}

export const HandoverForm: React.FC<HandoverFormProps> = ({ onSave, onCancel, prefillData, currentUser }) => {
    // Access Stores
    const assets = useAssetStore(state => state.assets);
    const users = useMasterDataStore(state => state.users);
    const divisions = useMasterDataStore(state => state.divisions);
    const handovers = useTransactionStore(state => state.handovers);
    const addNotification = useNotification();

    // Strategy Execution: Prepare Initial Data
    const initialData: HandoverInitialState | null = useMemo(() => 
        getHandoverInitialState(prefillData, assets, users, currentUser), 
    [prefillData, assets, users, currentUser]);

    // Form States
    const [handoverDate, setHandoverDate] = useState<Date | null>(new Date());
    const [docNumber, setDocNumber] = useState('');
    const [menyerahkan, setMenyerahkan] = useState(currentUser.name);
    const [penerima, setPenerima] = useState(initialData?.penerima || '');
    const [mengetahui, setMengetahui] = useState('');
    const [woRoIntNumber, setWoRoIntNumber] = useState(initialData?.woRoIntNumber || '');
    
    // -- NEW STATE FOR TARGET STATUS --
    const [targetStatus, setTargetStatus] = useState<AssetStatus>(initialData?.targetAssetStatus || AssetStatus.IN_USE);
    
    const [items, setItems] = useState<HandoverItem[]>(initialData?.items || [
        { id: Date.now(), assetId: '', itemName: '', itemTypeBrand: '', conditionNotes: '', quantity: 1, checked: false }
    ]);
    
    const [selectedDivisionId, setSelectedDivisionId] = useState(initialData?.divisionId || '');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFooterVisible, setIsFooterVisible] = useState(true);
    const footerRef = useRef<HTMLDivElement>(null);
    const formId = "handover-form";

    const ceo = useMemo(() => users.find(u => u.role === 'Super Admin'), [users]);

    // Options for Selects
    const divisionOptions = useMemo(() => [
        { value: '', label: '-- Pilih Divisi --' },
        ...divisions.map(d => ({ value: d.id.toString(), label: d.name }))
    ], [divisions]);

    const filteredUserOptions = useMemo(() => {
        if (!selectedDivisionId) return [];
        const userList = users.filter(u => u.divisionId?.toString() === selectedDivisionId);
        return userList.map(user => ({ value: user.name, label: user.name }));
    }, [users, selectedDivisionId]);

    // --- SMART LOGIC: 1. Filter Base Available Assets ---
    const availableAssetsForSelection = useMemo(() => {
        const canAccessWarehouse = ['Admin Logistik', 'Super Admin', 'Leader'].includes(currentUser.role);
        
        // Skenario 1: Data Prefill (Dikunci) - Tampilkan aset spesifik saja
        if (initialData?.isLocked && initialData.items.length > 0) {
            const prefilledIds = initialData.items.map(i => i.assetId).filter(Boolean);
            return assets.filter(a => prefilledIds.includes(a.id));
        }

        // Skenario 2: Handover Manual (Standar)
        // Hanya tampilkan aset yang statusnya 'IN_STORAGE' (Di Gudang)
        if (prefillData || canAccessWarehouse) {
            return assets.filter(asset => asset.status === AssetStatus.IN_STORAGE);
        } else {
            // Skenario 3: Staff menyerahkan aset miliknya (misal resign/mutasi)
            return assets.filter(asset => asset.currentUser === menyerahkan && asset.status === AssetStatus.IN_USE);
        }
    }, [assets, prefillData, menyerahkan, currentUser.role, initialData]);

    // --- SMART LOGIC: 2. Generate Base Options ---
    const baseAssetOptions = useMemo(() => availableAssetsForSelection.map(asset => ({ 
        value: asset.id, 
        label: `${asset.name} (${asset.id}) - ${asset.condition}` 
    })), [availableAssetsForSelection]);

    // --- SMART LOGIC: 3. Track Selected IDs ---
    // Mengambil semua assetId yang sedang dipilih di form untuk mencegah duplikasi
    const allSelectedAssetIds = useMemo(() => {
        return items.map(i => i.assetId).filter(id => id && id !== '');
    }, [items]);

    // Effects
    useEffect(() => {
        if (handoverDate) {
            let prefix = 'HO'; 
            if (woRoIntNumber) {
                if (woRoIntNumber.startsWith('RO-')) prefix = 'HO-RO';
                else if (woRoIntNumber.startsWith('RL-')) prefix = 'HO-RL';
                else if (woRoIntNumber.startsWith('RR-')) prefix = 'HO-RR';
            }
            const newDocNumber = generateDocumentNumber(prefix, handovers, handoverDate);
            setDocNumber(newDocNumber);
        } else {
            setDocNumber('[Otomatis]');
        }
    }, [handovers, woRoIntNumber, handoverDate]);

    useEffect(() => {
        if (ceo) setMengetahui(ceo.name);
    }, [ceo]);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => setIsFooterVisible(entry.isIntersecting), { threshold: 0.1 });
        const currentRef = footerRef.current;
        if (currentRef) observer.observe(currentRef);
        return () => { if (currentRef) observer.unobserve(currentRef); };
    }, []);

    const getDivisionForUser = (userName: string): string => {
        if (!userName) return '';
        const user = users.find(u => u.name === userName);
        if (!user || !user.divisionId) return '';
        const division = divisions.find(d => d.id === user.divisionId);
        return division ? `Divisi ${division.name}` : '';
    };

    // Handlers
    const handleDivisionChange = (divId: string) => {
        setSelectedDivisionId(divId);
        setPenerima('');
    };

    const handleAddItem = () => {
        setItems([...items, { id: Date.now(), assetId: '', itemName: '', itemTypeBrand: '', conditionNotes: '', quantity: 1, checked: false }]);
    };

    const handleRemoveItem = (id: number) => {
        if (items.length > 1) setItems(items.filter((item) => item.id !== id));
    };
    
    const handleAssetSelection = (id: number, selectedAssetId: string) => {
        const selectedAsset = assets.find(asset => asset.id === selectedAssetId);
        setItems(items.map(item => 
            item.id === id 
            ? { ...item, 
                assetId: selectedAsset?.id, 
                itemName: selectedAsset?.name || '', 
                itemTypeBrand: selectedAsset?.brand || '',
                conditionNotes: selectedAsset?.condition || ''
              } 
            : item
        ));
    };

    const handleItemChange = (id: number, field: keyof Omit<HandoverItem, 'id' | 'itemName' | 'itemTypeBrand' | 'assetId'>, value: string | number | boolean) => {
        setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (items.some(item => !item.assetId)) {
            addNotification('Harap pilih aset untuk semua item.', 'error');
            return;
        }
        if (!penerima) {
            addNotification('Penerima tidak boleh kosong.', 'error');
            return;
        }
        setIsSubmitting(true);
        
        setTimeout(() => {
            onSave({
                docNumber: docNumber,
                handoverDate: handoverDate!.toISOString().split('T')[0],
                menyerahkan,
                penerima,
                mengetahui,
                woRoIntNumber,
                items,
            }, targetStatus);
            setIsSubmitting(false);
        }, 1000);
    };

    const isLocked = initialData?.isLocked;
    const isDismantleFlow = initialData?.targetAssetStatus === AssetStatus.IN_STORAGE;

    return (
        <>
            <form id={formId} onSubmit={handleSubmit} className="space-y-6">
                <div className="mb-6 space-y-2 text-center">
                    <h4 className="text-xl font-bold text-tm-dark">TRINITY MEDIA INDONESIA</h4>
                    <p className="font-semibold text-tm-secondary">BERITA ACARA SERAH TERIMA BARANG (INTERNAL)</p>
                </div>
                
                {initialData?.notes && (
                    <div className="p-4 mb-4 border-l-4 rounded-r-lg bg-blue-50 border-tm-primary">
                        <div className="flex items-start gap-3">
                            <InfoIcon className="flex-shrink-0 w-5 h-5 mt-0.5 text-tm-primary" />
                            <p className="text-sm text-blue-800">
                                <strong>Info:</strong> {initialData.notes}
                            </p>
                        </div>
                    </div>
                )}
                
                <div className="p-4 border-t border-b border-gray-200">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                        <div><label className="block text-sm font-medium text-gray-700">Tanggal</label><DatePicker id="handoverDate" selectedDate={handoverDate} onDateChange={setHandoverDate} /></div>
                        <div><label className="block text-sm font-medium text-gray-700">No. Dokumen</label><input type="text" id="docNumber" value={docNumber} readOnly className="block w-full px-3 py-2 mt-1 text-gray-700 bg-gray-100 border border-gray-200 rounded-lg shadow-sm sm:text-sm" /></div>
                        <div><label className="block text-sm font-medium text-gray-700">No. Referensi</label><input type="text" value={woRoIntNumber} onChange={e => setWoRoIntNumber(e.target.value)} className="block w-full px-3 py-2 mt-1 text-gray-900 bg-gray-50 border border-gray-300 rounded-lg shadow-sm sm:text-sm" /></div>
                        <div><label className="block text-sm font-medium text-gray-700">Divisi</label><CustomSelect options={divisionOptions} value={selectedDivisionId} onChange={handleDivisionChange} disabled={!!initialData?.divisionId}/></div>
                         <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700">Penerima</label><CustomSelect options={filteredUserOptions} value={penerima} onChange={setPenerima} placeholder={selectedDivisionId ? "-- Pilih Nama Penerima --" : "Pilih divisi terlebih dahulu"} disabled={!selectedDivisionId || !!initialData?.penerima}/></div>
                    </div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                     <label className="block text-sm font-bold text-gray-800 mb-3 uppercase tracking-wide">Status Aset Setelah Handover</label>
                     
                     {isDismantleFlow ? (
                         <div className="p-3 bg-amber-50 text-amber-800 rounded border border-amber-200 flex gap-2 items-center text-sm">
                             <BsExclamationTriangle className="w-5 h-5"/>
                             <span>Status dikunci ke <strong>Di Gudang</strong> karena proses Penarikan Aset.</span>
                         </div>
                     ) : (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <label className={`relative flex items-start p-4 cursor-pointer rounded-lg border-2 transition-all ${targetStatus === AssetStatus.IN_USE ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                                 <input type="radio" name="targetStatus" value={AssetStatus.IN_USE} checked={targetStatus === AssetStatus.IN_USE} onChange={() => setTargetStatus(AssetStatus.IN_USE)} className="mt-1 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500" />
                                 <div className="ml-3">
                                     <span className="block text-sm font-bold text-gray-900 flex items-center gap-2"><BsBriefcase className="text-blue-500"/> Langsung Digunakan</span>
                                     <span className="block text-xs text-gray-500 mt-1">Aset langsung dipakai bekerja oleh penerima (Laptop, Tools).</span>
                                 </div>
                             </label>

                             <label className={`relative flex items-start p-4 cursor-pointer rounded-lg border-2 transition-all ${targetStatus === AssetStatus.IN_CUSTODY ? 'border-purple-500 bg-purple-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}>
                                 <input type="radio" name="targetStatus" value={AssetStatus.IN_CUSTODY} checked={targetStatus === AssetStatus.IN_CUSTODY} onChange={() => setTargetStatus(AssetStatus.IN_CUSTODY)} className="mt-1 h-4 w-4 text-purple-600 border-gray-300 focus:ring-purple-500" />
                                 <div className="ml-3">
                                     <span className="block text-sm font-bold text-gray-900 flex items-center gap-2"><BsArchive className="text-purple-500"/> Dipegang / Disimpan (Custody)</span>
                                     <span className="block text-xs text-gray-500 mt-1">Aset dipegang penerima untuk stok site/tim, belum aktif dipakai.</span>
                                 </div>
                             </label>
                         </div>
                     )}
                </div>

                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-tm-dark">Detail Barang</h3>
                     <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600">Daftar aset yang diserahterimakan.</p>
                        {!isLocked && (
                             <button type="button" onClick={handleAddItem} className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 rounded-lg shadow-sm bg-tm-accent hover:bg-tm-primary">Tambah Aset</button>
                        )}
                    </div>

                    <div className="space-y-4">
                        {items.map((item, index) => {
                            // --- SMART LOGIC: 4. Filter Options per Row ---
                            // Menghilangkan opsi yang sudah dipilih di baris lain.
                            // KECUALI opsi yang sedang dipilih oleh baris ini sendiri.
                            const rowOptions = baseAssetOptions.filter(opt => 
                                !allSelectedAssetIds.includes(opt.value) || opt.value === item.assetId
                            );

                            return (
                                <div key={item.id} className="relative p-5 pt-6 bg-white border border-gray-200 rounded-xl shadow-sm">
                                    <div className="absolute flex items-center justify-center w-8 h-8 font-bold text-white rounded-full -top-4 -left-4 bg-tm-primary">{index + 1}</div>
                                    {items.length > 1 && !isLocked && (
                                        <div className="absolute top-2 right-2">
                                            <button type="button" onClick={() => handleRemoveItem(item.id)} className="flex items-center justify-center w-8 h-8 text-gray-400 transition-colors rounded-full hover:bg-red-100 hover:text-red-500"><TrashIcon className="w-5 h-5"/></button>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-medium text-gray-600">Pilih Aset</label>
                                            <CustomSelect 
                                                options={rowOptions} 
                                                value={item.assetId || ''} 
                                                onChange={value => handleAssetSelection(item.id, value)} 
                                                placeholder="-- Pilih Aset (Hanya 'Di Gudang') --" 
                                                disabled={!!item.assetId && isLocked} 
                                                isSearchable
                                            />
                                        </div>
                                        <div><label className="block text-sm font-medium text-gray-600">Nama Barang</label><input type="text" value={item.itemName} readOnly className="block w-full px-3 py-2 mt-1 text-gray-700 bg-gray-100 border border-gray-200 rounded-lg shadow-sm sm:text-sm" /></div>
                                        <div><label className="block text-sm font-medium text-gray-600">Tipe/Brand</label><input type="text" value={item.itemTypeBrand} readOnly className="block w-full px-3 py-2 mt-1 text-gray-700 bg-gray-100 border border-gray-200 rounded-lg shadow-sm sm:text-sm" /></div>
                                        <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-600">Catatan Kondisi</label><input type="text" value={item.conditionNotes} onChange={e => handleItemChange(item.id, 'conditionNotes', e.target.value)} className="block w-full px-3 py-2 mt-1 text-gray-900 bg-gray-50 border border-gray-300 rounded-lg shadow-sm sm:text-sm" placeholder="Contoh: Baik, lengkap dengan aksesoris" /></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                
                <div className="pt-8 mt-6 border-t border-gray-200">
                     <div className="grid grid-cols-1 text-center gap-y-8 md:grid-cols-3 md:gap-x-8">
                        <div><p className="font-medium text-gray-700">Yang Menyerahkan</p><div className="flex items-center justify-center mt-2 h-28">{menyerahkan && <SignatureStamp signerName={menyerahkan} signatureDate={handoverDate?.toISOString() || ''} signerDivision={getDivisionForUser(menyerahkan)} />}</div><div className="pt-1 mt-2 border-t border-gray-400"><p className="w-full p-1 text-sm text-center text-gray-800 rounded-md">{menyerahkan || 'Nama Jelas'}</p></div></div>
                        <div><p className="font-medium text-gray-700">Penerima</p><div className="flex items-center justify-center mt-2 h-28">{penerima ? <SignatureStamp signerName={penerima} signatureDate={handoverDate?.toISOString() || ''} signerDivision={getDivisionForUser(penerima)} /> : <span className="text-sm italic text-gray-400">Pilih penerima di atas</span>}</div><div className="pt-1 mt-2 border-t border-gray-400"><p className="w-full p-1 text-sm text-center text-gray-800 rounded-md">{penerima || 'Nama Jelas'}</p></div></div>
                        <div><p className="font-medium text-gray-700">Mengetahui</p><div className="flex items-center justify-center mt-2 h-28">{mengetahui && <SignatureStamp signerName={mengetahui} signatureDate={handoverDate?.toISOString() || ''} signerDivision={getDivisionForUser(mengetahui)} />}</div><div className="pt-1 mt-2 border-t border-gray-400"><p className="w-full p-1 text-sm text-center text-gray-800 rounded-md">{mengetahui || 'Nama Jelas'}</p></div></div>
                    </div>
                </div>

                <div ref={footerRef} className="flex justify-end pt-4 mt-4 border-t border-gray-200">
                    <button type="button" onClick={onCancel} className="px-4 py-2 mr-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Batal</button>
                    <button type="submit" disabled={isSubmitting} className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 rounded-lg shadow-sm bg-tm-primary hover:bg-tm-primary-hover disabled:bg-tm-primary/70 disabled:cursor-not-allowed">
                         {isSubmitting ? <SpinnerIcon className="w-5 h-5 mr-2" /> : null}
                        {isSubmitting ? 'Memproses...' : 'Proses Handover'}
                    </button>
                </div>
            </form>
            <FloatingActionBar isVisible={!isFooterVisible}>
                <div className="flex gap-2">
                    <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Batal</button>
                    <button type="submit" form={formId} disabled={isSubmitting} className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 rounded-lg shadow-sm bg-tm-primary hover:bg-tm-primary-hover disabled:bg-tm-primary/70 disabled:cursor-not-allowed">
                        {isSubmitting ? <SpinnerIcon className="w-5 h-5 mr-2" /> : null} Proses Handover
                    </button>
                </div>
            </FloatingActionBar>
        </>
    );
};
