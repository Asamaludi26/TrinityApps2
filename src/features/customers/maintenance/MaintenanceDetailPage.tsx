
import React, { useMemo, useState } from 'react';
import { Maintenance, User, ItemStatus, Asset } from '../../../types';
import { DetailPageLayout } from '../../../components/layout/DetailPageLayout';
import { Letterhead } from '../../../components/ui/Letterhead';
import { SignatureStamp } from '../../../components/ui/SignatureStamp';
import { ApprovalStamp } from '../../../components/ui/ApprovalStamp';
import { InfoIcon } from '../../../components/icons/InfoIcon';
import { SpinnerIcon } from '../../../components/icons/SpinnerIcon';
import { CheckIcon } from '../../../components/icons/CheckIcon';
import { BsArrowRight, BsFilePdf, BsImage } from 'react-icons/bs';
import { PaperclipIcon } from '../../../components/icons/PaperclipIcon';
import { ClickableLink } from '../../../components/ui/ClickableLink';
import { DownloadIcon } from '../../../components/icons/DownloadIcon';
import { EyeIcon } from '../../../components/icons/EyeIcon';
import { viewAttachment } from '../../../utils/fileUtils';

interface MaintenanceDetailPageProps {
    maintenance: Maintenance;
    currentUser: User;
    assets: Asset[];
    onBackToList: () => void;
    onComplete: () => void;
    isLoading: boolean;
    onShowPreview: (data: any) => void;
}

const DetailItem: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div><dt className="text-sm font-medium text-gray-500">{label}</dt><dd className="mt-1 text-gray-900">{children}</dd></div>
);

const getPriorityClass = (priority?: 'Tinggi' | 'Sedang' | 'Rendah') => {
    switch (priority) {
        case 'Tinggi': return 'bg-danger-light text-danger-text';
        case 'Sedang': return 'bg-warning-light text-warning-text';
        case 'Rendah': return 'bg-info-light text-info-text';
        default: return 'bg-gray-100 text-gray-800';
    }
};

const highlightColors = [
    { bg: 'bg-yellow-50', border: 'border-l-yellow-400' },
    { bg: 'bg-sky-50', border: 'border-l-sky-400' },
    { bg: 'bg-lime-50', border: 'border-l-lime-400' },
    { bg: 'bg-pink-50', border: 'border-l-pink-400' },
    { bg: 'bg-indigo-50', border: 'border-l-indigo-400' },
];

const MaintenanceDetailPage: React.FC<MaintenanceDetailPageProps> = ({ maintenance, currentUser, assets, onBackToList, onComplete, isLoading, onShowPreview }) => {
    
    const canComplete = maintenance.status === ItemStatus.IN_PROGRESS && (currentUser.role === 'Admin Logistik' || currentUser.role === 'Super Admin');
    
    const replacementColorMap = useMemo(() => {
        const map = new Map<string, { bg: string; border: string }>(); // oldAssetId -> color object
        if (maintenance.replacements) {
            maintenance.replacements.forEach((rep, index) => {
                map.set(rep.oldAssetId, highlightColors[index % highlightColors.length]);
            });
        }
        return map;
    }, [maintenance.replacements]);

    const HeaderActions = () => (
        <>
            {canComplete && (
                <button onClick={onComplete} disabled={isLoading} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-success rounded-lg shadow-sm hover:bg-green-700">
                    {isLoading ? <SpinnerIcon /> : <CheckIcon />} Selesaikan
                </button>
            )}
        </>
    );

    return (
        <DetailPageLayout title={`Laporan Maintenance: ${maintenance.docNumber}`} onBack={onBackToList} headerActions={<HeaderActions />}>
            <div className="p-8 bg-white border rounded-lg shadow-sm">
                <Letterhead />
                <div className="text-center my-8">
                    <h3 className="text-xl font-bold uppercase text-tm-dark">Laporan Kunjungan Maintenance</h3>
                    <p className="text-sm text-tm-secondary">Dokumen : {maintenance.docNumber}</p>
                </div>
                
                <section className="space-y-4 text-sm mb-6">
                    <div className="grid grid-cols-2 gap-6">
                        <DetailItem label="Tanggal Kunjungan">{new Date(maintenance.maintenanceDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</DetailItem>
                        <DetailItem label="Teknisi">{maintenance.technician}</DetailItem>
                        <DetailItem label="Nomor Dokumen">{maintenance.docNumber}</DetailItem>
                        <DetailItem label="Nomor Request Terkait">{maintenance.requestNumber || '-'}</DetailItem>
                        <DetailItem label="Pelanggan">{maintenance.customerName}</DetailItem>
                        <DetailItem label="ID Pelanggan">{maintenance.customerId}</DetailItem>
                        <DetailItem label="Prioritas">
                            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getPriorityClass(maintenance.priority)}`}>
                                {maintenance.priority || 'Tidak diatur'}
                            </span>
                        </DetailItem>
                        {maintenance.workTypes && maintenance.workTypes.length > 0 && (
                             <div>
                                <DetailItem label="Lingkup Pekerjaan">
                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                        {maintenance.workTypes.map(wt => (
                                            <span key={wt} className="px-2.5 py-1 text-xs font-semibold text-tm-primary bg-blue-100 rounded-full">{wt}</span>
                                        ))}
                                    </div>
                                </DetailItem>
                            </div>
                        )}
                    </div>
                </section>
                
                <section className="mt-6 pt-6 border-t">
                     <h4 className="font-semibold text-gray-800 border-b pb-2 mb-4">Detail Pekerjaan</h4>
                     <div className="space-y-6 text-sm">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-4 border-l-4 border-red-500 bg-red-50/70 rounded-r-lg">
                                <h5 className="font-semibold text-red-800">Laporan Masalah & Diagnosa</h5>
                                <p className="mt-2 text-gray-700">{maintenance.problemDescription}</p>
                            </div>
                             <div className="p-4 border-l-4 border-green-500 bg-green-50/70 rounded-r-lg">
                                <h5 className="font-semibold text-green-800">Tindakan & Solusi</h5>
                                <p className="mt-2 text-gray-700">{maintenance.actionsTaken}</p>
                            </div>
                        </div>

                     </div>
                </section>

                {maintenance.assets && maintenance.assets.length > 0 && (
                    <section className="mt-8 pt-6 border-t">
                        <div>
                            <h5 className="text-base font-semibold text-gray-800 mb-2">Aset yang Diperiksa</h5>
                                <div className="overflow-x-auto border rounded-lg">
                                            <table className="min-w-full text-sm">
                                                <thead className="bg-gray-100">
                                                    <tr>
                                                        <th className="p-3 font-semibold text-left text-gray-600 w-12">No.</th>
                                                        <th className="p-3 font-semibold text-left text-gray-600">Nama Aset</th>
                                                        <th className="p-3 font-semibold text-left text-gray-600">ID Aset</th>
                                                        <th className="p-3 font-semibold text-left text-gray-600">Serial Number</th>
                                                        <th className="p-3 font-semibold text-left text-gray-600">MAC Address</th>
                                                        <th className="p-3 font-semibold text-left text-gray-600">Kondisi</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200">
                                                    {maintenance.assets.map((mAsset, index) => {
                                                        const fullAsset = assets.find(a => a.id === mAsset.assetId);
                                                        if (!fullAsset) {
                                                            return (
                                                                <tr key={mAsset.assetId}>
                                                                    <td className="p-3 text-center font-semibold text-gray-800">{index + 1}.</td>
                                                                    <td className="p-3" colSpan={5}>
                                                                        <p className="font-semibold">{mAsset.assetName}</p>
                                                                        <p className="font-mono text-xs text-gray-500">{mAsset.assetId} (Detail lengkap tidak ditemukan)</p>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        }
                                                        const color = replacementColorMap.get(fullAsset.id);
                                                        return (
                                                            <tr key={fullAsset.id} className={`transition-colors hover:bg-gray-50 ${color ? `${color.bg} border-l-4 ${color.border}` : ''}`}>
                                                                <td className="p-3 text-center font-semibold text-gray-800">{index + 1}.</td>
                                                                <td className="p-3 font-semibold text-gray-800">{fullAsset.name}</td>
                                                                <td className="p-3 font-mono text-gray-600">{fullAsset.id}</td>
                                                                <td className="p-3 font-mono text-gray-600">{fullAsset.serialNumber || '-'}</td>
                                                                <td className="p-3 font-mono text-gray-600">{fullAsset.macAddress || '-'}</td>
                                                                <td className="p-3 font-semibold text-gray-800">{fullAsset.condition}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                </div>
                        </div>
                    </section>
                )}

                {maintenance.replacements && maintenance.replacements.length > 0 && (
                    <section className="mt-8 pt-6 border-t">
                        <h4 className="text-base font-semibold text-gray-800 mb-2">Detail Penggantian Perangkat</h4>
                        <div className="overflow-x-auto border rounded-lg">
                            <table className="min-w-full text-sm">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="p-3 font-semibold text-left text-gray-600 w-12">No.</th>
                                        <th className="p-3 font-semibold text-left text-gray-600">Nama Aset</th>
                                        <th className="p-3 font-semibold text-left text-gray-600">ID Aset</th>
                                        <th className="p-3 font-semibold text-left text-gray-600">Serial Number</th>
                                        <th className="p-3 font-semibold text-left text-gray-600">MAC Address</th>
                                        <th className="p-3 font-semibold text-left text-gray-600">Kondisi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {maintenance.replacements.map((rep, index) => {
                                        const newAsset = assets.find(a => a.id === rep.newAssetId);

                                        if (!newAsset) {
                                            return (
                                                <tr key={rep.newAssetId || index}>
                                                    <td className="p-3 text-center font-semibold text-gray-800">{index + 1}.</td>
                                                    <td className="p-3 text-center text-gray-500" colSpan={5}>
                                                        Data Aset Pengganti tidak ditemukan (ID: {rep.newAssetId})
                                                    </td>
                                                </tr>
                                            );
                                        }
                                        const color = replacementColorMap.get(rep.oldAssetId);
                                        return (
                                            <tr key={index} className={`transition-colors hover:bg-gray-50 ${color ? `${color.bg} border-l-4 ${color.border}` : ''}`}>
                                                <td className="p-3 text-center font-semibold text-gray-800">{index + 1}.</td>
                                                <td className="p-3 font-semibold text-gray-800">
                                                    {newAsset.name}
                                                </td>
                                                <td className="p-3 font-mono text-gray-600">
                                                    <ClickableLink onClick={() => onShowPreview({ type: 'asset', id: newAsset.id })}>
                                                        {newAsset.id}
                                                    </ClickableLink>
                                                </td>
                                                <td className="p-3 font-mono text-gray-600">{newAsset.serialNumber || '-'}</td>
                                                <td className="p-3 font-mono text-gray-600">{newAsset.macAddress || '-'}</td>
                                                <td className="p-3 font-semibold text-gray-800">{newAsset.condition}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                <section className="mt-8 pt-6 border-t">
                    <h4 className="text-base font-semibold text-gray-800 mb-2">Material yang Digunakan</h4>
                    <div className="overflow-x-auto border rounded-lg">
                        <table className="min-w-full text-sm">
                            <thead className="bg-gray-100">
                                <tr>
                                    <th className="p-3 font-semibold text-left text-gray-600 w-12">No.</th>
                                    <th className="p-3 font-semibold text-left text-gray-600">Nama Material</th>
                                    <th className="p-3 font-semibold text-left text-gray-600">ID Aset</th>
                                    <th className="p-3 font-semibold text-left text-gray-600">Brand</th>
                                    <th className="p-3 font-semibold text-center text-gray-600">Jumlah</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {maintenance.materialsUsed && maintenance.materialsUsed.length > 0 ? (
                                    maintenance.materialsUsed.map((material, index) => {
                                        const materialAsset = material.materialAssetId ? assets.find(a => a.id === material.materialAssetId) : null;
                                        
                                        if (!materialAsset) {
                                            return (
                                                <tr key={index} className="hover:bg-gray-50 bg-red-50/50">
                                                    <td className="p-3 text-center font-semibold text-gray-800">{index + 1}.</td>
                                                    <td className="p-3 text-gray-800">{material.itemName}</td>
                                                    <td className="p-3 text-red-600 italic font-mono" colSpan={3}>Data Aset Tidak Ditemukan</td>
                                                </tr>
                                            );
                                        }
                                        
                                        return (
                                            <tr key={index} className="hover:bg-gray-50">
                                                <td className="p-3 text-center font-semibold text-gray-800">{index + 1}.</td>
                                                <td className="p-3 text-gray-800">{material.itemName}</td>
                                                <td className="p-3 font-mono text-gray-600">
                                                    <ClickableLink onClick={() => onShowPreview({ type: 'asset', id: materialAsset.id })}>
                                                        {materialAsset.id}
                                                    </ClickableLink>
                                                </td>
                                                <td className="p-3 text-gray-600">{material.brand}</td>
                                                <td className="p-3 text-center font-medium text-gray-800">{material.quantity}</td>
                                            </tr>
                                        );
                                    })
                                ) : (
                                    <tr>
                                        <td className="p-4 text-center text-gray-500" colSpan={5}>
                                            Tidak ada material tambahan yang digunakan.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
                
                {maintenance.notes && (
                    <section className="mt-8 pt-6 border-t">
                        <h4 className="font-semibold text-gray-800 border-b pb-1 mb-2">Catatan Tambahan</h4>
                        <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded border border-gray-200 italic">"{maintenance.notes}"</p>
                    </section>
                )}
                
                {/* NEW: Attachment Section */}
                {maintenance.attachments && maintenance.attachments.length > 0 && (
                     <section className="mt-8 pt-6 border-t">
                        <h4 className="font-semibold text-gray-800 border-b pb-1 mb-4">Lampiran</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {maintenance.attachments.map(att => (
                                <div key={att.id} className="group relative bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
                                    <div className="aspect-w-16 aspect-h-10 bg-gray-100 flex items-center justify-center overflow-hidden">
                                        {att.type === 'image' ? (
                                            <img src={att.url} alt={att.name} className="object-cover w-full h-32 group-hover:scale-105 transition-transform duration-500" />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-32 text-gray-400">
                                                <BsFilePdf className="w-10 h-10 mb-2" />
                                                <span className="text-[10px] uppercase font-bold">Dokumen</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-3">
                                        <p className="text-xs font-semibold text-gray-800 truncate mb-2" title={att.name}>{att.name}</p>
                                        <div className="flex gap-2">
                                            <button 
                                                type="button"
                                                onClick={() => viewAttachment(att.url, att.name)} 
                                                className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-bold text-gray-600 bg-gray-50 rounded hover:bg-gray-100 hover:text-tm-primary transition-colors border border-gray-200"
                                            >
                                                <EyeIcon className="w-3 h-3" /> Lihat
                                            </button>
                                            <a href={att.url} download={att.name} className="flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-bold text-gray-600 bg-gray-50 rounded hover:bg-gray-100 hover:text-tm-primary transition-colors border border-gray-200">
                                                <DownloadIcon className="w-3 h-3" /> Unduh
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                <section className="pt-10 mt-10 border-t">
                    <div className="grid grid-cols-2 text-center text-sm">
                        <div>
                            <p className="font-semibold text-gray-600">Teknisi,</p>
                            <div className="flex items-center justify-center mt-2 h-28"><SignatureStamp signerName={maintenance.technician} signatureDate={maintenance.maintenanceDate} /></div>
                            <p className="pt-1 mt-2 border-t border-gray-400">({maintenance.technician})</p>
                        </div>
                         <div>
                            <p className="font-semibold text-gray-600">Diselesaikan Oleh,</p>
                            <div className="flex items-center justify-center mt-2 h-28">
                                {maintenance.status === ItemStatus.COMPLETED && maintenance.completedBy ? (
                                    <ApprovalStamp approverName={maintenance.completedBy} approvalDate={maintenance.completionDate!} />
                                ) : (
                                    <span className="italic text-gray-400">Dalam Proses</span>
                                )}
                            </div>
                            <p className="pt-1 mt-2 border-t border-gray-400">({maintenance.completedBy || '.........................'})</p>
                        </div>
                    </div>
                </section>
            </div>
        </DetailPageLayout>
    );
};

export default MaintenanceDetailPage;
