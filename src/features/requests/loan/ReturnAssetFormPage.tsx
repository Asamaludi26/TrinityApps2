
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, Asset, LoanRequest, AssetCondition, Division } from '../../../types';
import { useNotification } from '../../../providers/NotificationProvider';
import { generateDocumentNumber } from '../../../utils/documentNumberGenerator';
import { Letterhead } from '../../../components/ui/Letterhead';
import { SignatureStamp } from '../../../components/ui/SignatureStamp';
import DatePicker from '../../../components/ui/DatePicker';
import FloatingActionBar from '../../../components/ui/FloatingActionBar';
import { SpinnerIcon } from '../../../components/icons/SpinnerIcon';
import { CustomSelect } from '../../../components/ui/CustomSelect';
import { Checkbox } from '../../../components/ui/Checkbox';

// Stores
import { useRequestStore } from '../../../stores/useRequestStore';
import { useMasterDataStore } from '../../../stores/useMasterDataStore';

interface ReturnAssetFormPageProps {
    currentUser: User;
    onCancel: () => void;
    loanRequest?: LoanRequest; 
    preselectedAssets?: Asset[]; 
    onShowPreview: (data: any) => void;
}

const ReturnAssetFormPage: React.FC<ReturnAssetFormPageProps> = ({ 
    currentUser, 
    onCancel, 
    loanRequest, 
    preselectedAssets = [], 
    onShowPreview
}) => {
    // Store Hooks
    const returns = useRequestStore(state => state.returns);
    const submitReturnRequest = useRequestStore(state => state.submitReturnRequest);
    const users = useMasterDataStore(state => state.users);
    const divisions = useMasterDataStore(state => state.divisions);

    // Form State
    const [returnDate, setReturnDate] = useState<Date | null>(new Date());
    const [docNumber, setDocNumber] = useState('');
    const [returnDetails, setReturnDetails] = useState<Record<string, { condition: AssetCondition; notes: string }>>({});
    const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
    
    // UI State
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFooterVisible, setIsFooterVisible] = useState(true);
    const footerRef = useRef<HTMLDivElement>(null);
    const formId = "return-asset-form";
    const addNotification = useNotification();

    // Initialize form based on preselected assets
    useEffect(() => {
        const initialDetails: Record<string, { condition: AssetCondition; notes: string }> = {};
        preselectedAssets.forEach(asset => {
            initialDetails[asset.id] = {
                condition: AssetCondition.USED_OKAY,
                notes: '',
            };
        });
        setReturnDetails(initialDetails);
        // By default, select all preselected assets for return
        setSelectedAssetIds(preselectedAssets.map(a => a.id));
    }, [preselectedAssets]);

    // Generate Doc Number with RR prefix
    useEffect(() => {
        const newDocNumber = generateDocumentNumber('RR', returns, returnDate || new Date());
        setDocNumber(newDocNumber);
    }, [returnDate, returns]);
    
    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => setIsFooterVisible(entry.isIntersecting), { threshold: 0.1 });
        const currentRef = footerRef.current;
        if (currentRef) observer.observe(currentRef);
        return () => { if (currentRef) observer.unobserve(currentRef); };
    }, []);

    const getDivisionForUser = (userName: string): string => {
        const user = users.find(u => u.name === userName);
        return user && user.divisionId ? `Divisi ${divisions.find(d => d.id === user.divisionId)?.name || ''}` : '';
    };

    const handleDetailChange = (assetId: string, field: 'condition' | 'notes', value: string) => {
        setReturnDetails(prev => ({
            ...prev,
            [assetId]: { ...prev[assetId], [field]: value },
        }));
    };

    const handleToggleSelection = (assetId: string) => {
        setSelectedAssetIds(prev =>
            prev.includes(assetId)
                ? prev.filter(id => id !== assetId)
                : [...prev, assetId]
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!loanRequest || selectedAssetIds.length === 0) {
            addNotification('Pilih setidaknya satu aset untuk dikembalikan.', 'error');
            return;
        }

        setIsSubmitting(true);
        try {
            // Bundle all items into one submission
            const returnItemsPayload = selectedAssetIds.map(assetId => ({
                assetId,
                condition: returnDetails[assetId]?.condition || AssetCondition.USED_OKAY,
                notes: returnDetails[assetId]?.notes || '',
            }));

            await submitReturnRequest(loanRequest.id, returnItemsPayload);
            addNotification(`Pengajuan pengembalian berhasil dibuat (Dokumen: ${docNumber}).`, 'success');
        } catch (error: any) {
            addNotification(error.message || 'Gagal mengajukan pengembalian.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const ActionButtons: React.FC<{ formId: string }> = ({ formId }) => (
        <>
            <button type="button" onClick={onCancel} className="px-5 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Batal</button>
            <button type="submit" form={formId} disabled={isSubmitting || selectedAssetIds.length === 0} className="inline-flex items-center justify-center px-6 py-2.5 text-sm font-semibold text-white transition-all duration-200 rounded-lg shadow-sm bg-tm-primary hover:bg-tm-primary-hover disabled:bg-tm-primary/70">
                {isSubmitting ? <SpinnerIcon className="w-4 h-4 mr-2" /> : null}
                Ajukan Pengembalian ({selectedAssetIds.length} Item)
            </button>
        </>
    );

    return (
        <div className="p-4 sm:p-6 md:p-8">
            <div className="p-6 bg-white border border-gray-200/80 rounded-xl shadow-md pb-24 max-w-4xl mx-auto">
                <form id={formId} onSubmit={handleSubmit} className="space-y-6">
                    <Letterhead />
                    <div className="text-center"><h3 className="text-xl font-bold uppercase text-tm-dark">Formulir Pengembalian Aset</h3></div>

                    <div className="p-4 bg-gray-50 border rounded-lg text-sm grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-gray-500 font-medium">Tanggal Pengembalian</label>
                            <div className="mt-1"><DatePicker id="returnDate" selectedDate={returnDate} onDateChange={setReturnDate} /></div>
                        </div>
                        <div><label className="block text-gray-500 font-medium">No. Dokumen</label><input className="w-full mt-1 p-2 bg-gray-100 border rounded text-gray-700 font-mono" value={docNumber} readOnly /></div>
                        <div><label className="block text-gray-500 font-medium">Ref. Pinjaman</label><input className="w-full mt-1 p-2 bg-gray-100 border rounded text-gray-700" value={loanRequest?.id || '-'} readOnly /></div>
                        <div><label className="block text-gray-500 font-medium">Dikembalikan Oleh</label><input className="w-full mt-1 p-2 bg-gray-100 border rounded text-gray-700" value={currentUser.name} readOnly /></div>
                    </div>

                    <section className="mt-6 pt-4 border-t">
                        <h4 className="font-semibold text-gray-800 mb-3">Pilih Aset untuk Dikembalikan</h4>
                        <div className="space-y-3">
                            {preselectedAssets.map((asset) => {
                                const isSelected = selectedAssetIds.includes(asset.id);
                                return (
                                    <div key={asset.id} className={`p-4 border rounded-lg transition-all duration-300 ${isSelected ? 'border-tm-primary bg-blue-50/30' : 'border-gray-200 bg-white'}`}>
                                        <div className="flex items-start gap-4">
                                            <Checkbox id={`select-${asset.id}`} checked={isSelected} onChange={() => handleToggleSelection(asset.id)} className="mt-1" />
                                            <div className="flex-1">
                                                <label htmlFor={`select-${asset.id}`} className="font-semibold text-gray-800 cursor-pointer">{asset.name}</label>
                                                <p className="text-xs text-gray-500 font-mono">{asset.id} / SN: {asset.serialNumber || 'N/A'}</p>
                                                
                                                <div className={`mt-3 space-y-3 transition-all duration-300 ease-in-out overflow-hidden ${isSelected ? 'max-h-40 opacity-100 pt-3 border-t' : 'max-h-0 opacity-0'}`}>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-700 mb-1">Kondisi</label>
                                                            <CustomSelect options={Object.values(AssetCondition).map(c => ({value: c, label: c}))} value={returnDetails[asset.id]?.condition || AssetCondition.USED_OKAY} onChange={(v) => handleDetailChange(asset.id, 'condition', v as AssetCondition)} />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-medium text-gray-700 mb-1">Catatan</label>
                                                            <input type="text" value={returnDetails[asset.id]?.notes || ''} onChange={(e) => handleDetailChange(asset.id, 'notes', e.target.value)} className="w-full px-3 py-2 text-sm border-gray-300 rounded-md" placeholder="Opsional..."/>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    <section className="pt-8 mt-6 border-t">
                        <div className="grid grid-cols-1 text-sm text-center gap-y-8 md:grid-cols-2">
                            <div>
                                <p className="font-semibold text-gray-700">Yang Mengembalikan,</p>
                                <div className="flex items-center justify-center mt-2 h-28"><SignatureStamp signerName={currentUser.name} signatureDate={new Date().toISOString()} signerDivision={getDivisionForUser(currentUser.name)} /></div>
                                <p className="pt-1 mt-2 border-t border-gray-400">{currentUser.name}</p>
                            </div>
                            <div>
                                <p className="font-semibold text-gray-700">Diterima (Admin Logistik),</p>
                                <div className="flex items-center justify-center mt-2 h-28"><span className="text-sm italic text-gray-400">Menunggu Verifikasi</span></div>
                                <p className="pt-1 mt-2 border-t border-gray-400">.........................................</p>
                            </div>
                        </div>
                    </section>

                    <div ref={footerRef} className="flex justify-end pt-6 mt-6 border-t">
                        <ActionButtons formId={formId} />
                    </div>
                </form>
                <FloatingActionBar isVisible={!isFooterVisible}>
                    <div className="flex gap-2">
                       <ActionButtons formId={formId} />
                    </div>
                </FloatingActionBar>
            </div>
        </div>
    );
};

export default ReturnAssetFormPage;
