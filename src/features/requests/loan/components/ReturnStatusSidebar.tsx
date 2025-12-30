
import React from 'react';
import { AssetReturn, AssetReturnStatus, User } from '../../../../types';
import { ActionButton } from '../../../../components/ui/ActionButton';
import { InfoIcon } from '../../../../components/icons/InfoIcon';
import { ChevronsLeftIcon } from '../../../../components/icons/ChevronsLeftIcon';
import { ChevronsRightIcon } from '../../../../components/icons/ChevronsRightIcon';
import { CheckIcon } from '../../../../components/icons/CheckIcon';
import { CloseIcon } from '../../../../components/icons/CloseIcon';
import { SpinnerIcon } from '../../../../components/icons/SpinnerIcon';

interface ReturnStatusSidebarProps {
    returnDocument: AssetReturn;
    currentUser: User;
    isLoading: boolean;
    isExpanded: boolean;
    onToggleVisibility: () => void;
    onOpenVerification: () => void;
    onReject: () => void;
}

const ReturnStatusIndicator: React.FC<{ status: AssetReturnStatus }> = ({ status }) => {
    const statusDetails: Record<string, { label: string, className: string }> = {
        [AssetReturnStatus.APPROVED]: { label: 'Disetujui Sebagian', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
        [AssetReturnStatus.COMPLETED]: { label: 'Selesai (Diterima)', className: 'bg-blue-100 text-blue-700 border-blue-200' },
        [AssetReturnStatus.REJECTED]: { label: 'Ditolak', className: 'bg-red-100 text-red-700 border-red-200' },
        [AssetReturnStatus.PENDING_APPROVAL]: { label: 'Menunggu Verifikasi', className: 'bg-amber-100 text-amber-700 border-amber-200 animate-pulse' }
    };

    const details = statusDetails[status] || { label: status, className: 'bg-gray-100 text-gray-800' };

    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold uppercase tracking-wide rounded-full border ${details.className}`}>
            {details.label}
        </span>
    );
};

export const ReturnStatusSidebar: React.FC<ReturnStatusSidebarProps> = ({ 
    returnDocument, currentUser, isLoading, onOpenVerification, onReject, isExpanded, onToggleVisibility 
}) => {
    
    if (!isExpanded) {
        return (
            <div className="flex flex-col items-center pt-4 space-y-4">
                <button
                    onClick={onToggleVisibility}
                    className="flex items-center justify-center w-10 h-10 bg-white border border-gray-300 rounded-full shadow-md text-gray-500 hover:bg-gray-100 hover:text-tm-primary transition-all">
                    <ChevronsRightIcon className="w-5 h-5" />
                </button>
            </div>
        );
    }

    const isAdmin = currentUser.role === 'Admin Logistik' || currentUser.role === 'Super Admin';
    const canAct = returnDocument.status === AssetReturnStatus.PENDING_APPROVAL && isAdmin;

    // Helper text based on status
    const getStatusMessage = () => {
        if (returnDocument.status === AssetReturnStatus.COMPLETED) return "Seluruh item dalam dokumen ini telah diterima dan dimasukkan kembali ke stok.";
        if (returnDocument.status === AssetReturnStatus.APPROVED) return "Sebagian item diterima, sebagian ditolak. Cek detail tabel.";
        if (returnDocument.status === AssetReturnStatus.REJECTED) return "Seluruh pengembalian ditolak. Aset dikembalikan ke status dipinjam.";
        return "Admin perlu memverifikasi fisik aset sebelum menyetujui.";
    };

    return (
        <div className="p-5 bg-white border border-gray-200/80 rounded-xl shadow-sm sticky top-6">
            <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <InfoIcon className="w-5 h-5 text-gray-400" />
                        <h3 className="text-base font-semibold text-gray-800">Status & Aksi</h3>
                    </div>
                     <div className="mt-3">
                        <ReturnStatusIndicator status={returnDocument.status} />
                    </div>
                </div>
                <button
                    onClick={onToggleVisibility}
                    className="flex items-center justify-center flex-shrink-0 w-8 h-8 text-gray-400 rounded-full hover:bg-gray-100 hover:text-gray-800 transition-all">
                    <ChevronsLeftIcon className="w-5 h-5" />
                </button>
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-100 space-y-4">
                {canAct ? (
                    <div className="space-y-3 animate-fade-in-up">
                        <div className="p-3 bg-blue-50 text-xs text-blue-800 rounded-lg border border-blue-100 leading-relaxed">
                            <p className="font-bold mb-1">Verifikasi Fisik Diperlukan</p>
                            <p>Pastikan kondisi aset yang diterima sesuai dengan laporan pengguna sebelum menekan tombol verifikasi.</p>
                        </div>
                        <ActionButton onClick={onOpenVerification} disabled={isLoading} text="Verifikasi & Terima" icon={CheckIcon} color="success" className="w-full shadow-md" />
                        <ActionButton onClick={onReject} disabled={isLoading} text="Tolak Semua" icon={CloseIcon} color="danger" className="w-full" />
                    </div>
                ) : (
                    <div className="text-center p-5 bg-gray-50/70 border border-gray-200/60 rounded-xl">
                        {returnDocument.status === AssetReturnStatus.COMPLETED ? (
                            <CheckIcon className="w-12 h-12 mx-auto mb-3 text-emerald-500 bg-emerald-100 p-2 rounded-full" />
                        ) : returnDocument.status === AssetReturnStatus.REJECTED ? (
                            <CloseIcon className="w-12 h-12 mx-auto mb-3 text-red-500 bg-red-100 p-2 rounded-full" />
                        ) : returnDocument.status === AssetReturnStatus.APPROVED ? (
                             <CheckIcon className="w-12 h-12 mx-auto mb-3 text-blue-500 bg-blue-100 p-2 rounded-full" />
                        ) : (
                            <SpinnerIcon className="w-10 h-10 mx-auto mb-3 text-amber-500 animate-spin" />
                        )}
                        
                        <p className="text-sm font-bold text-gray-800 mb-1">
                            {returnDocument.status === AssetReturnStatus.PENDING_APPROVAL ? "Menunggu Verifikasi" : "Proses Selesai"}
                        </p>
                        <p className="text-xs text-gray-500 leading-relaxed">
                            {getStatusMessage()}
                        </p>
                        
                        {returnDocument.verifiedBy && (
                            <div className="mt-4 pt-3 border-t border-gray-200">
                                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Diverifikasi Oleh</p>
                                <p className="text-xs font-medium text-gray-700 mt-0.5">{returnDocument.verifiedBy}</p>
                                <p className="text-[10px] text-gray-400">{new Date(returnDocument.verificationDate || '').toLocaleDateString('id-ID')}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
