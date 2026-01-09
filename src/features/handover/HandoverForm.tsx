
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Handover, HandoverItem, Asset, User, AssetStatus } from '../../types';
import DatePicker from '../../components/ui/DatePicker';
import { useNotification } from '../../providers/NotificationProvider';
import { SpinnerIcon } from '../../components/icons/SpinnerIcon';
import FloatingActionBar from '../../components/ui/FloatingActionBar';
import { SignatureStamp } from '../../components/ui/SignatureStamp';
import { InfoIcon } from '../../components/icons/InfoIcon';
import { TrashIcon } from '../../components/icons/TrashIcon';
import { CustomSelect } from '../../components/ui/CustomSelect';
import { generateDocumentNumber } from '../../utils/documentNumberGenerator';
import { HandoverInitialState, getHandoverInitialState } from './logic/handoverStrategies';
import { BsBriefcase, BsArchive, BsExclamationTriangle, BsScissors, BsBoxSeam, BsRulers } from 'react-icons/bs';

// Stores
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

    // Strategy Execution
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
    const [targetStatus, setTargetStatus] = useState<AssetStatus>(initialData?.targetAssetStatus || AssetStatus.IN_USE);
    
    const [items, setItems] = useState<HandoverItem[]>(initialData?.items || [
        { id: Date.now(), assetId: '', itemName: '', itemTypeBrand: '', conditionNotes: '', quantity: 1, checked: false, unit: 'Unit' }
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
        setItems([...items, { id: Date.now(), assetId: '', itemName: '', itemTypeBrand: '', conditionNotes: '', quantity: 1, checked: false, unit: 'Unit' }]);
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
                // Update condition notes smartly
                conditionNotes: item.conditionNotes.startsWith('Potong') ? item.conditionNotes : (selectedAsset?.condition || '')
              } 
            : item
        ));
    };

    const handleItemChange = (id: number, field: keyof Omit<HandoverItem, 'id' | 'itemName' | 'itemTypeBrand' | 'assetId'>, value: string | number | boolean) => {
        setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!penerima) {
            addNotification('Penerima tidak boleh kosong.', 'error');
            return;
        }
        
        // Final Validation: Ensure items have assets selected
        if (items.some(i => !i.assetId)) {
            addNotification('Harap pilih aset untuk semua baris item.', 'error');
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

    // --- SMART LOGIC: ROW OPTIONS GENERATOR ---
    const getRowOptions = useCallback((currentItem: HandoverItem) => {
        const canAccessWarehouse = ['Admin Logistik', 'Super Admin', 'Leader'].includes(currentUser.role);
        
        // 1. Base Filter (Location & Owner)
        let candidates = assets;
        if (prefillData || canAccessWarehouse) {
            candidates = assets.filter(a => a.status === AssetStatus.IN_STORAGE);
        } else {
            candidates = assets.filter(a => a.currentUser === menyerahkan && a.status === AssetStatus.IN_USE);
        }

        // 2. Filter by Name/Brand (Strict Match from Request)
        if (currentItem.itemName) {
            candidates = candidates.filter(a => 
                a.name.toLowerCase() === currentItem.itemName.toLowerCase() && 
                (currentItem.itemTypeBrand ? a.brand.toLowerCase() === currentItem.itemTypeBrand.toLowerCase() : true)
            );
        }

        // 3. SMART CLASSIFICATION: CUT vs CONTAINER
        const isCutOperation = currentItem.unit && ['Meter', 'Liter', 'Kg'].includes(currentItem.unit);
        
        if (isCutOperation) {
            // --- SCENARIO: CUTTING (Potongan) ---
            // Tampilkan semua aset yang saldonya CUKUP, baik utuh maupun sisa.
            candidates = candidates.filter(a => {
                const realBalance = a.currentBalance ?? a.initialBalance ?? 0;
                
                // Hitung pemakaian aset ini di baris lain (Phantom Balance)
                const usageFromOtherRows = items
                    .filter(i => i.assetId === a.id && i.id !== currentItem.id)
                    .reduce((sum, i) => sum + i.quantity, 0);

                const availableBalance = realBalance - usageFromOtherRows;
                
                // Toleransi float epsilon
                return availableBalance >= (currentItem.quantity - 0.0001);
            });

            return candidates.map(asset => {
                const realBalance = asset.currentBalance ?? asset.initialBalance ?? 0;
                const usageFromOtherRows = items
                    .filter(i => i.assetId === asset.id && i.id !== currentItem.id)
                    .reduce((sum, i) => sum + i.quantity, 0);
                const effectiveBalance = realBalance - usageFromOtherRows;

                return {
                    value: asset.id,
                    label: `${asset.id} (Sisa: ${effectiveBalance} ${currentItem.unit})`
                };
            });

        } else {
            // --- SCENARIO: CONTAINER (Unit Utuh) ---
            // Tampilkan HANYA aset yang saldo saat ini == saldo awal (Utuh/Segel)
            
            // a. Filter aset yang MASIH UTUH (Strict Container Check)
            candidates = candidates.filter(a => {
                if (a.initialBalance !== undefined && a.currentBalance !== undefined) {
                    // Cek selisih sangat kecil (epsilon)
                    const isFull = Math.abs(a.currentBalance - a.initialBalance) < 0.01;
                    return isFull;
                }
                return true; // Jika bukan measurement asset (Unit biasa), anggap utuh
            });

            // b. Filter aset yang BELUM DIPILIH di baris lain (Exclusive Lock)
            const selectedByOthers = items
                .filter(i => i.id !== currentItem.id && i.assetId)
                .map(i => i.assetId);

            candidates = candidates.filter(a => !selectedByOthers.includes(a.id));

            return candidates.map(asset => {
                // Tampilkan label khusus jika measurement asset
                const isMeasurement = asset.initialBalance !== undefined;
                const balanceLabel = isMeasurement ? ` [Utuh: ${asset.currentBalance}]` : '';
                return {
                    value: asset.id,
                    label: `${asset.name} (${asset.id})${balanceLabel} - ${asset.condition}`
                };
            });
        }
    }, [assets, items, currentUser.role, prefillData, menyerahkan]);

    return (
        <>
            <form id={formId} onSubmit={handleSubmit} className="space-y-6">
                <div className="mb-6 space-y-2 text-center">
                    <h4 className="text-xl font-bold text-tm-dark">TRINITI MEDIA INDONESIA</h4>
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
                            // Smart Logic: Get Options Per Row
                            const rowOptions = getRowOptions(item);
                            
                            // Check classification
                            const isCut = item.unit && ['Meter', 'Liter', 'Kg'].includes(item.unit);
                            const label = isCut ? 'Sumber Potongan (Cut Source)' : 'Pilih Aset Fisik (Container)';
                            const icon = isCut ? <BsScissors className="w-4 h-4 text-orange-500"/> : <BsBoxSeam className="w-4 h-4 text-blue-500"/>;
                            const helperText = isCut 
                                ? `*Stok akan dikurangi ${item.quantity} ${item.unit}.`
                                : `*Hanya menampilkan aset utuh/segel untuk unit ${item.unit}.`;

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
                                            <label className="block text-sm font-bold text-gray-700 flex items-center gap-2 mb-1">
                                                {icon} {label}
                                            </label>
                                            <CustomSelect 
                                                options={rowOptions} 
                                                value={item.assetId || ''} 
                                                onChange={value => handleAssetSelection(item.id, value)} 
                                                placeholder={rowOptions.length > 0 ? "-- Pilih Aset --" : "Tidak ada stok tersedia"}
                                                disabled={!!item.assetId && isLocked} 
                                                isSearchable
                                                emptyStateMessage={isCut ? "Stok tidak mencukupi untuk potongan ini." : "Tidak ada unit utuh/segel tersisa."}
                                            />
                                            <p className={`text-xs mt-1 ${isCut ? 'text-orange-600' : 'text-blue-600'}`}>
                                                {helperText}
                                            </p>
                                        </div>
                                        <div><label className="block text-sm font-medium text-gray-600">Nama Barang</label><input type="text" value={item.itemName} readOnly className="block w-full px-3 py-2 mt-1 text-gray-700 bg-gray-100 border border-gray-200 rounded-lg shadow-sm sm:text-sm" /></div>
                                        <div><label className="block text-sm font-medium text-gray-600">Tipe/Brand</label><input type="text" value={item.itemTypeBrand} readOnly className="block w-full px-3 py-2 mt-1 text-gray-700 bg-gray-100 border border-gray-200 rounded-lg shadow-sm sm:text-sm" /></div>
                                        <div className="md:col-span-2 flex gap-4">
                                            <div className="flex-1">
                                                <label className="block text-sm font-medium text-gray-600">Catatan Kondisi</label>
                                                <input type="text" value={item.conditionNotes} onChange={e => handleItemChange(item.id, 'conditionNotes', e.target.value)} className="block w-full px-3 py-2 mt-1 text-gray-900 bg-gray-50 border border-gray-300 rounded-lg shadow-sm sm:text-sm" placeholder="Contoh: Baik, lengkap dengan aksesoris" />
                                            </div>
                                            <div className="w-32">
                                                <label className="block text-sm font-medium text-gray-600">Jumlah ({item.unit || 'Unit'})</label>
                                                 <input type="number" value={item.quantity} onChange={e => handleItemChange(item.id, 'quantity', Number(e.target.value))} className="block w-full px-3 py-2 mt-1 text-gray-900 bg-gray-50 border border-gray-300 rounded-lg shadow-sm sm:text-sm font-bold text-center" readOnly={!isCut} />
                                            </div>
                                        </div>
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
