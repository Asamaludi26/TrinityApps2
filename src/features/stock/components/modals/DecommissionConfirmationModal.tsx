import React, { useState } from 'react';
import { Asset } from '../../../../types';
import Modal from '../../../../components/ui/Modal';
import { SpinnerIcon } from '../../../../components/icons/SpinnerIcon';
import { ExclamationTriangleIcon } from '../../../../components/icons/ExclamationTriangleIcon';

interface DecommissionConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    asset: Asset | null;
    onConfirm: (asset: Asset) => void;
}

export const DecommissionConfirmationModal: React.FC<DecommissionConfirmationModalProps> = ({ isOpen, onClose, asset, onConfirm }) => {
    const [isLoading, setIsLoading] = useState(false);

    const handleConfirm = () => {
        if (!asset) return;
        setIsLoading(true);
        setTimeout(() => {
            onConfirm(asset);
            setIsLoading(false);
            onClose();
        }, 1000);
    };

    if (!asset) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Konfirmasi Pemberhentian Aset"
            size="md"
            hideDefaultCloseButton
        >
            <div className="text-center">
                <div className="flex items-center justify-center w-12 h-12 mx-auto text-red-600 bg-red-100 rounded-full">
                    <ExclamationTriangleIcon className="w-8 h-8" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-800">Berhentikan Aset?</h3>
                <p className="mt-2 text-sm text-gray-600">
                    Anda yakin ingin memberhentikan aset <span className="font-bold">{asset.name} ({asset.id})</span>? Statusnya akan diubah menjadi "Diberhentikan" dan aset tidak dapat digunakan lagi. Tindakan ini tidak dapat diurungkan dengan mudah.
                </p>
            </div>
             <div className="flex items-center justify-end pt-5 mt-5 space-x-3 border-t">
                <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Batal</button>
                <button type="button" onClick={handleConfirm} disabled={isLoading} className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-danger rounded-lg shadow-sm hover:bg-red-700 disabled:bg-red-400">
                    {isLoading && <SpinnerIcon className="w-4 h-4 mr-2"/>}
                    Ya, Berhentikan
                </button>
            </div>
        </Modal>
    );
};
