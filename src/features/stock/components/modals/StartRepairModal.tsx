import React, { useState, useEffect } from 'react';
import { Asset, User } from '../../../../types';
import Modal from '../../../../components/ui/Modal';
import { SpinnerIcon } from '../../../../components/icons/SpinnerIcon';
import { CustomSelect } from '../../../../components/ui/CustomSelect';
import DatePicker from '../../../../components/ui/DatePicker';

interface StartRepairModalProps {
    isOpen: boolean;
    onClose: () => void;
    asset: Asset | null;
    users: User[];
    onSubmit: (asset: Asset, data: { repairType: 'internal' | 'external', technician?: string, vendor?: string, vendorContact?: string, estimatedDate: Date, notes: string }) => void;
}

export const StartRepairModal: React.FC<StartRepairModalProps> = ({ isOpen, onClose, asset, users, onSubmit }) => {
    const [repairType, setRepairType] = useState<'internal' | 'external'>('internal');
    const [technician, setTechnician] = useState('');
    const [vendor, setVendor] = useState('');
    const [vendorContact, setVendorContact] = useState('');
    const [estimatedDate, setEstimatedDate] = useState<Date | null>(new Date());
    const [notes, setNotes] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setRepairType('internal');
            setTechnician('');
            setVendor('');
            setVendorContact('');
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            setEstimatedDate(tomorrow);
            setNotes('');
        }
    }, [isOpen]);

    const technicianOptions = users
        .filter(u => u.divisionId === 3) // Engineer Lapangan
        .map(u => ({ value: u.name, label: u.name }));

    const handleSubmit = () => {
        if (!asset || !estimatedDate) return;
        if (repairType === 'internal' && !technician) return;
        if (repairType === 'external' && !vendor) return;

        setIsLoading(true);
        setTimeout(() => {
            onSubmit(asset, { 
                repairType,
                technician: repairType === 'internal' ? technician : undefined,
                vendor: repairType === 'external' ? vendor : undefined,
                vendorContact: repairType === 'external' ? vendorContact : undefined,
                estimatedDate, 
                notes 
            });
            setIsLoading(false);
            onClose();
        }, 1000);
    };

    if (!asset) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Mulai Proses Perbaikan`}
            size="lg"
            hideDefaultCloseButton
            footerContent={
                <>
                    <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Batal</button>
                    <button onClick={handleSubmit} disabled={isLoading || !estimatedDate || (repairType === 'internal' && !technician) || (repairType === 'external' && !vendor) } className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-tm-primary rounded-lg shadow-sm hover:bg-tm-primary-hover disabled:bg-tm-primary/70">
                        {isLoading && <SpinnerIcon className="w-4 h-4 mr-2" />}
                        Mulai Perbaikan
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
                    <label className="block text-sm font-medium text-gray-700">Tipe Perbaikan</label>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                        <button type="button" onClick={() => setRepairType('internal')} className={`p-3 border-2 rounded-lg text-left ${repairType === 'internal' ? 'bg-blue-50 border-tm-primary' : 'bg-white border-gray-300'}`}>
                            <span className="font-semibold text-gray-800">Internal</span><p className="text-xs text-gray-500 mt-1">Ditangani oleh teknisi internal.</p>
                        </button>
                        <button type="button" onClick={() => setRepairType('external')} className={`p-3 border-2 rounded-lg text-left ${repairType === 'external' ? 'bg-blue-50 border-tm-primary' : 'bg-white border-gray-300'}`}>
                            <span className="font-semibold text-gray-800">Eksternal</span><p className="text-xs text-gray-500 mt-1">Dikirim ke vendor perbaikan.</p>
                        </button>
                    </div>
                </div>
                {repairType === 'internal' ? (
                     <div>
                        <label htmlFor="technician" className="block text-sm font-medium text-gray-700">Pilih Teknisi</label>
                        <div className="mt-1">
                            <CustomSelect options={technicianOptions} value={technician} onChange={setTechnician} placeholder="-- Pilih Teknisi --" />
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="vendor" className="block text-sm font-medium text-gray-700">Nama Vendor</label>
                            <input type="text" id="vendor" value={vendor} onChange={e => setVendor(e.target.value)} className="block w-full px-3 py-2 mt-1 text-gray-900 bg-gray-50 border border-gray-300 rounded-lg shadow-sm"/>
                        </div>
                        <div>
                             <label htmlFor="vendor-contact" className="block text-sm font-medium text-gray-700">Kontak Vendor</label>
                            <input type="text" id="vendor-contact" value={vendorContact} onChange={e => setVendorContact(e.target.value)} className="block w-full px-3 py-2 mt-1 text-gray-900 bg-gray-50 border border-gray-300 rounded-lg shadow-sm"/>
                        </div>
                    </div>
                )}
                 <div>
                    <label htmlFor="estimated-date" className="block text-sm font-medium text-gray-700">Estimasi Tanggal Selesai</label>
                    <div className="mt-1">
                        <DatePicker id="estimated-date" selectedDate={estimatedDate} onDateChange={setEstimatedDate} disablePastDates />
                    </div>
                </div>
                <div>
                    <label htmlFor="repair-notes-start" className="block text-sm font-medium text-gray-700">Catatan Awal Perbaikan (Opsional)</label>
                    <textarea id="repair-notes-start" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="block w-full px-3 py-2 mt-1 text-gray-900 placeholder:text-gray-400 bg-gray-50 border border-gray-300 rounded-lg shadow-sm sm:text-sm focus:ring-tm-accent focus:border-tm-accent" placeholder="Contoh: Perlu penggantian komponen X, akan dipesan terlebih dahulu..."></textarea>
                </div>
            </div>
        </Modal>
    );
};
