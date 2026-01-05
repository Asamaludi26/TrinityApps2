
import React, { useRef, useState } from 'react';
import { Installation, User, Asset, Customer, Division, PreviewData } from '../../../types';
import { DetailPageLayout } from '../../../components/layout/DetailPageLayout';
import { Letterhead } from '../../../components/ui/Letterhead';
import { SignatureStamp } from '../../../components/ui/SignatureStamp';
import { ClickableLink } from '../../../components/ui/ClickableLink';
import { PrintIcon } from '../../../components/icons/PrintIcon';
import { DownloadIcon } from '../../../components/icons/DownloadIcon';
import { SpinnerIcon } from '../../../components/icons/SpinnerIcon';
import { useNotification } from '../../../providers/NotificationProvider';
import { EyeIcon } from '../../../components/icons/EyeIcon';
import { BsFilePdf } from 'react-icons/bs';
import { viewAttachment } from '../../../utils/fileUtils';

interface InstallationDetailPageProps {
    installation: Installation;
    assets: Asset[];
    customers: Customer[];
    users: User[];
    divisions: Division[];
    onBackToList: () => void;
    onShowPreview: (data: PreviewData) => void;
}

const InstallationDetailPage: React.FC<InstallationDetailPageProps> = ({ 
    installation, 
    assets, 
    customers, 
    users, 
    divisions, 
    onBackToList, 
    onShowPreview 
}) => {
    const printRef = useRef<HTMLDivElement>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const addNotification = useNotification();

    const handlePrint = () => window.print();

    const handleDownloadPdf = () => {
        if (!printRef.current) return;
        setIsDownloading(true);
        const { jsPDF } = (window as any).jspdf;
        const html2canvas = (window as any).html2canvas;

        html2canvas(printRef.current, { scale: 2, useCORS: true, logging: false })
            .then((canvas: HTMLCanvasElement) => {
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const canvasWidth = canvas.width;
                const canvasHeight = canvas.height;
                const canvasRatio = canvasWidth / canvasHeight;
                const imgHeight = pdfWidth / canvasRatio;
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
                pdf.save(`Installation-${installation.docNumber}.pdf`);
                setIsDownloading(false);
                addNotification('PDF berhasil diunduh.', 'success');
            }).catch(() => {
                addNotification('Gagal membuat PDF.', 'error');
                setIsDownloading(false);
            });
    };

    const getDivisionForUser = (userName: string): string => {
        if (!userName) return '';
        const user = users.find(u => u.name === userName);
        if (!user || !user.divisionId) return '';
        const division = divisions.find(d => d.id === user.divisionId);
        return division ? `Divisi ${division.name}` : '';
    };

    const customer = customers.find(c => c.id === installation.customerId);

    return (
        <DetailPageLayout
            title={`Detail Instalasi: ${installation.docNumber}`}
            onBack={onBackToList}
            headerActions={
                <div className="flex items-center gap-2">
                    <button onClick={handlePrint} className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border rounded-lg shadow-sm hover:bg-gray-50"><PrintIcon className="w-4 h-4"/> Cetak</button>
                    <button onClick={handleDownloadPdf} disabled={isDownloading} className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-tm-primary rounded-lg shadow-sm hover:bg-tm-primary-hover disabled:bg-tm-primary/70">
                        {isDownloading ? <SpinnerIcon className="w-4 h-4 mr-2"/> : <DownloadIcon className="w-4 h-4 mr-2" />}
                        {isDownloading ? 'Mengunduh...' : 'Unduh PDF'}
                    </button>
                </div>
            }
        >
            <div ref={printRef} className="p-8 bg-white border border-gray-200/80 rounded-xl shadow-sm space-y-8">
                <Letterhead />
                <div className="text-center">
                    <h3 className="text-xl font-bold uppercase text-tm-dark">Berita Acara Instalasi</h3>
                    <p className="text-sm text-tm-secondary">Nomor: {installation.docNumber}</p>
                </div>

                <section>
                    <h4 className="font-semibold text-gray-800 border-b pb-1 mb-4">Informasi Dokumen</h4>
                    <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 text-sm">
                        <div><dt className="font-medium text-gray-500">Tanggal Instalasi</dt><dd className="font-semibold text-gray-900">{new Date(installation.installationDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</dd></div>
                        <div><dt className="font-medium text-gray-500">No. Request Terkait</dt><dd className="font-semibold text-gray-900">{installation.requestNumber || '-'}</dd></div>
                        <div><dt className="font-medium text-gray-500">Teknisi Pelaksana</dt><dd className="font-semibold text-gray-900">{installation.technician}</dd></div>
                        <div><dt className="font-medium text-gray-500">Dibuat Oleh</dt><dd className="font-semibold text-gray-900">{installation.createdBy || '-'}</dd></div>
                    </dl>
                </section>

                <section>
                    <h4 className="font-semibold text-gray-800 border-b pb-1 mb-4">Informasi Pelanggan</h4>
                    <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 text-sm">
                        <div><dt className="font-medium text-gray-500">Nama Pelanggan</dt><dd className="font-semibold text-gray-900">
                             {customer ? <ClickableLink onClick={() => onShowPreview({ type: 'customer', id: customer.id })}>{installation.customerName}</ClickableLink> : installation.customerName}
                        </dd></div>
                        <div><dt className="font-medium text-gray-500">ID Pelanggan</dt><dd className="font-mono text-gray-600">{installation.customerId}</dd></div>
                        {customer && (
                            <>
                                <div><dt className="font-medium text-gray-500">Alamat</dt><dd className="text-gray-900">{customer.address}</dd></div>
                                <div><dt className="font-medium text-gray-500">Kontak</dt><dd className="text-gray-900">{customer.phone}</dd></div>
                            </>
                        )}
                    </dl>
                </section>

                <section>
                    <h4 className="font-semibold text-gray-800 border-b pb-1 mb-2">Aset Terpasang</h4>
                    <div className="overflow-x-auto border rounded-lg">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-100 text-xs uppercase text-gray-700">
                                <tr>
                                    <th className="p-3 w-10 text-center">No.</th>
                                    <th className="p-3">Nama Perangkat</th>
                                    <th className="p-3">ID Aset</th>
                                    <th className="p-3">Serial Number</th>
                                </tr>
                            </thead>
                            <tbody>
                                {installation.assetsInstalled.map((asset, index) => (
                                    <tr key={index} className="border-b last:border-b-0">
                                        <td className="p-3 text-center text-gray-800">{index + 1}.</td>
                                        <td className="p-3 font-semibold text-gray-800">{asset.assetName}</td>
                                        <td className="p-3 font-mono text-gray-600">
                                            <ClickableLink onClick={() => onShowPreview({ type: 'asset', id: asset.assetId })}>{asset.assetId}</ClickableLink>
                                        </td>
                                        <td className="p-3 font-mono text-gray-600">{asset.serialNumber || '-'}</td>
                                    </tr>
                                ))}
                                {installation.assetsInstalled.length === 0 && (
                                    <tr><td colSpan={4} className="p-4 text-center text-gray-500 italic">Tidak ada perangkat utama yang dipasang.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>

                {installation.materialsUsed && installation.materialsUsed.length > 0 && (
                    <section>
                        <h4 className="font-semibold text-gray-800 border-b pb-1 mb-2">Material Terpakai</h4>
                        <div className="overflow-x-auto border rounded-lg">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-100 text-xs uppercase text-gray-700">
                                    <tr>
                                        <th className="p-3 w-10 text-center">No.</th>
                                        <th className="p-3">Nama Material</th>
                                        <th className="p-3">Brand</th>
                                        <th className="p-3 text-center">Jumlah</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {installation.materialsUsed.map((mat, index) => (
                                        <tr key={index} className="border-b last:border-b-0">
                                            <td className="p-3 text-center text-gray-800">{index + 1}.</td>
                                            <td className="p-3 font-medium text-gray-800">{mat.itemName}</td>
                                            <td className="p-3 text-gray-600">{mat.brand}</td>
                                            <td className="p-3 text-center font-bold text-gray-800">{mat.quantity} {mat.unit}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                {installation.notes && (
                    <section>
                        <h4 className="font-semibold text-gray-800 border-b pb-1 mb-2">Catatan Instalasi</h4>
                        <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded border border-gray-200 italic">"{installation.notes}"</p>
                    </section>
                )}
                
                {/* NEW: Attachment Section */}
                {installation.attachments && installation.attachments.length > 0 && (
                     <section className="mt-8 pt-6 border-t">
                        <h4 className="font-semibold text-gray-800 border-b pb-1 mb-4">Lampiran</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            {installation.attachments.map(att => (
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

                <section className="pt-8 mt-6 border-t border-gray-200">
                    <p className="text-xs text-center text-gray-500 mb-6">Demikian Berita Acara ini dibuat dengan sebenar-benarnya untuk dipergunakan sebagaimana mestinya.</p>
                    <div className="grid grid-cols-1 text-sm text-center gap-y-6 sm:grid-cols-3">
                         <div>
                            <p className="font-semibold text-gray-600">Teknisi,</p>
                            <div className="flex items-center justify-center mt-2 h-28">
                                <SignatureStamp signerName={installation.technician} signatureDate={installation.installationDate} signerDivision={getDivisionForUser(installation.technician)} />
                            </div>
                            <p className="pt-1 mt-2 border-t border-gray-400">({installation.technician})</p>
                        </div>
                         <div>
                            <p className="font-semibold text-gray-600">Pelanggan,</p>
                            <div className="flex items-center justify-center mt-2 h-28"></div>
                            <p className="pt-1 mt-2 border-t border-gray-400">({installation.customerName})</p>
                        </div>
                         <div>
                            <p className="font-semibold text-gray-600">Mengetahui,</p>
                            <div className="flex items-center justify-center mt-2 h-28">
                                {installation.acknowledger ? (
                                    <SignatureStamp signerName={installation.acknowledger} signatureDate={installation.installationDate} signerDivision={getDivisionForUser(installation.acknowledger)} />
                                ) : (
                                    <span className="italic text-gray-400">Menunggu</span>
                                )}
                            </div>
                            <p className="pt-1 mt-2 border-t border-gray-400">({installation.acknowledger || '.........................'})</p>
                        </div>
                    </div>
                </section>
            </div>
        </DetailPageLayout>
    );
};

export default InstallationDetailPage;
