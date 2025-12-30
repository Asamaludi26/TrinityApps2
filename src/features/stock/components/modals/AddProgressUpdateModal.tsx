import React, { useState, useEffect } from 'react';
import { Asset } from '../../../../types';
import Modal from '../../../../components/ui/Modal';
import { SpinnerIcon } from '../../../../components/icons/SpinnerIcon';

interface AddProgressUpdateModalProps {
    isOpen: boolean;
    onClose: () => void;
    asset: Asset | null;
    onSubmit: (asset: Asset, note: string) => void;
}

export const AddProgressUpdateModal: React.FC<AddProgressUpdateModalProps> = ({ isOpen, onClose, asset, onSubmit }) => {
    const [note, setNote] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setNote('');
        }
    }, [isOpen]);

    const handleSubmit = () => {
        if (!asset || !note.trim()) return;
        setIsLoading(true);
        setTimeout(() => {
            onSubmit(asset, note);
            setIsLoading(false);
            onClose();
        }, 1000);
    };

    if (!asset) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Tambah Update Progres Perbaikan`}
            size="lg"
            hideDefaultCloseButton
            footerContent={
                <>
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Batal</button>
                    <button onClick={handleSubmit} disabled={isLoading || !note.trim()} className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-tm-primary rounded-lg shadow-sm hover:bg-tm-primary-hover disabled:bg-tm-primary/70">
                        {isLoading && <SpinnerIcon className="w-4 h-4 mr-2" />}
                        Simpan Update
                    </button>
                </>
            }
        >
            <div className="space-y-6">
                <div className="p-4 bg-gray-50/70 border border-gray-200 rounded-lg">
                    <p className="text-sm font-medium text-gray-600">Aset:</p>
                    <p className="text-lg font-bold text-tm-dark">{asset.name}</p>
                    <p className="text-xs font-mono text-gray-500">{asset.id}</p>
                </div>
                <div>
                    <label htmlFor="progress-note" className="block text-sm font-medium text-gray-700">Catatan Progres</label>
                    <textarea
                        id="progress-note"
                        rows={4}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        className="block w-full px-3 py-2 mt-1 text-gray-900 placeholder:text-gray-400 bg-gray-50 border border-gray-300 rounded-lg shadow-sm sm:text-sm focus:ring-tm-accent focus:border-tm-accent"
                        placeholder="Contoh: Komponen pengganti sudah tiba, perbaikan akan dilanjutkan."
                    ></textarea>
                </div>
            </div>
        </Modal>
    );
};
