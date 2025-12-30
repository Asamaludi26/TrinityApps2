import React, { useState, useEffect } from 'react';
import { Asset } from '../../../../types';
import { Checkbox } from '../../../../components/ui/Checkbox';
import { CheckIcon } from '../../../../components/icons/CheckIcon';
import { CloseIcon } from '../../../../components/icons/CloseIcon';
import { InfoIcon } from '../../../../components/icons/InfoIcon';
import { BsBoxSeam } from 'react-icons/bs';

interface ReturnVerificationPanelProps {
    assetsToVerify: Asset[];
    onConfirm: (acceptedAssetIds: string[]) => void;
    onCancel: () => void;
    isLoading: boolean;
}

export const ReturnVerificationPanel: React.FC<ReturnVerificationPanelProps> = ({ 
    assetsToVerify, onConfirm, onCancel, isLoading 
}) => {
    const [verifiedAssetIds, setVerifiedAssetIds] = useState<string[]>([]);

    useEffect(() => {
        setVerifiedAssetIds(assetsToVerify.map(a => a.id));
    }, [assetsToVerify]);

    const handleToggleAsset = (assetId: string) => {
        setVerifiedAssetIds(prev =>
            prev.includes(assetId) ? prev.filter(id => id !== assetId) : [...prev, assetId]
        );
    };

    const handleToggleAll = () => {
        if (verifiedAssetIds.length === assetsToVerify.length) {
            setVerifiedAssetIds([]);
        } else {
            setVerifiedAssetIds(assetsToVerify.map(a => a.id));
        }
    };

    const isAllSelected = verifiedAssetIds.length > 0 && verifiedAssetIds.length === assetsToVerify.length;
    const isIndeterminate = verifiedAssetIds.length > 0 && verifiedAssetIds.length < assetsToVerify.length;

    return (
        <div className="bg-white border-2 border-green-100 rounded-xl shadow-xl animate-fade-in-up relative mt-8">
            <div className="bg-green-50 px-6 py-4 border-b border-green-100 flex justify-between items-center rounded-t-xl">
                <div>
                    <h3 className="text-lg font-bold text-green-900 flex items-center gap-2"><CheckIcon className="w-6 h-6 text-green-700"/> Panel Verifikasi Penerimaan</h3>
                    <p className="text-sm text-green-700 mt-1">Konfirmasi aset yang secara fisik telah diterima di gudang.</p>
                </div>
                <button onClick={onCancel} className="p-2 hover:bg-green-100 rounded-full text-green-700 transition-colors">
                    <CloseIcon className="w-6 h-6"/>
                </button>
            </div>

            <div className="p-6 space-y-4">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-3">
                    <InfoIcon className="w-4 h-4 mt-0.5 flex-shrink-0"/>
                    <span>Hapus centang pada aset yang <strong>tidak diterima</strong> atau kondisinya <strong>tidak sesuai</strong>. Aset yang tidak dicentang akan ditolak dan statusnya dikembalikan ke peminjam.</span>
                </div>

                <div className="flex items-center gap-3 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100" onClick={handleToggleAll}>
                    <Checkbox id="verify-all-assets" checked={isAllSelected} indeterminate={isIndeterminate} onChange={() => {}} />
                    <label htmlFor="verify-all-assets" className="text-sm font-semibold text-gray-700 cursor-pointer">
                        {isAllSelected ? 'Hapus Semua Centang' : 'Centang Semua'} ({verifiedAssetIds.length}/{assetsToVerify.length})
                    </label>
                </div>

                <div className="max-h-[40vh] overflow-y-auto custom-scrollbar space-y-2 pr-2 -mr-2">
                    {assetsToVerify.map(asset => {
                        const isVerified = verifiedAssetIds.includes(asset.id);
                        return (
                            <div 
                                key={asset.id} 
                                onClick={() => handleToggleAsset(asset.id)} 
                                className={`flex items-start gap-4 p-3 border rounded-lg cursor-pointer transition-all ${isVerified ? 'bg-white border-gray-200 hover:border-gray-300' : 'bg-red-50/50 border-red-200'}`}
                            >
                                <div className="mt-1">
                                    <Checkbox id={`verify-${asset.id}`} checked={isVerified} onChange={() => {}} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-bold ${isVerified ? 'text-gray-800' : 'text-red-900 line-through'}`}>{asset.name}</p>
                                    <p className={`text-xs font-mono mt-0.5 ${isVerified ? 'text-gray-500' : 'text-red-500'}`}>{asset.id}</p>
                                </div>
                                <div className={`flex-shrink-0 px-2 py-0.5 text-[10px] font-bold rounded-full border ${isVerified ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-100 text-red-700 border-red-200'}`}>
                                    {isVerified ? 'DITERIMA' : 'DITOLAK'}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            
            <div className="bg-gray-50 px-6 py-5 border-t border-gray-200 flex flex-col sm:flex-row justify-end gap-3 rounded-b-xl">
                <button onClick={onCancel} className="w-full sm:w-auto px-6 py-2.5 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Batal</button>
                <button onClick={() => onConfirm(verifiedAssetIds)} disabled={isLoading} className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-success rounded-lg shadow-sm hover:bg-green-700">
                    <CheckIcon className="w-5 h-5" /> Konfirmasi Penerimaan ({verifiedAssetIds.length})
                </button>
            </div>
        </div>
    );
};
