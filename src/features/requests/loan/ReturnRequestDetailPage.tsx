import React, { useState, useRef, useMemo } from 'react';
import { AssetReturn, User, LoanRequest, PreviewData, Asset, Page } from '../../../types';
import { DetailPageLayout } from '../../../components/layout/DetailPageLayout';
import { Letterhead } from '../../../components/ui/Letterhead';
import { SignatureStamp } from '../../../components/ui/SignatureStamp';
import { ApprovalStamp } from '../../../components/ui/ApprovalStamp';
import { RejectionStamp } from '../../../components/ui/RejectionStamp';
import { ClickableLink } from '../../../components/ui/ClickableLink';
import { PrintIcon } from '../../../components/icons/PrintIcon';
import { DownloadIcon } from '../../../components/icons/DownloadIcon';
import { SpinnerIcon } from '../../../components/icons/SpinnerIcon';
import { useNotification } from '../../../providers/NotificationProvider';

import { useMasterDataStore } from '../../../stores/useMasterDataStore';
import { useRequestStore } from '../../../stores/useRequestStore';

import { ReturnStatusSidebar } from './components/ReturnStatusSidebar';
import { ReturnVerificationPanel } from './components/ReturnVerificationPanel';

interface ReturnRequestDetailPageProps {
    returnDocuments: AssetReturn[];
    loanRequest?: LoanRequest;
    assetsToReturn: Asset[];
    currentUser: User;
    onBackToList: () => void;
    onShowPreview: (data: PreviewData) => void;
    // FIX: Add setActivePage to props to handle navigation.
    setActivePage: (page: Page, initialState?: any) => void;
}

const ReturnRequestDetailPage: React.FC<ReturnRequestDetailPageProps> = (props) => {
    // FIX: Destructure setActivePage from props.
    const { returnDocuments, loanRequest, assetsToReturn, currentUser, onBackToList, onShowPreview, setActivePage } = props;
    
    const [isActionSidebarExpanded, setIsActionSidebarExpanded] = useState(true);
    const [isVerificationPanelOpen, setIsVerificationPanelOpen] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const printRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const addNotification = useNotification();
    
    const users = useMasterDataStore(state => state.users);
    const divisions = useMasterDataStore(state => state.divisions);
    const processReturnBatch = useRequestStore(state => state.processReturnBatch);
    const updateReturn = useRequestStore(state => state.updateReturn);

    const mainReturnDocument = returnDocuments[0];
    if (!mainReturnDocument || !loanRequest) {
        return <div>Data tidak valid.</div>;
    }

    const getDivisionForUser = (userName: string): string => {
        const user = users.find(u => u.name === userName);
        return user && user.divisionId ? divisions.find(d => d.id === user.divisionId)?.name || '' : '';
    };

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
                const imgHeight = (canvas.height * pdfWidth) / canvas.width;
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
                pdf.save(`Return-${mainReturnDocument.docNumber}.pdf`);
                setIsDownloading(false);
                addNotification('PDF berhasil diunduh.', 'success');
            }).catch(() => {
                addNotification('Gagal membuat PDF.', 'error');
                setIsDownloading(false);
            });
    };
    
    const handleOpenVerification = () => {
        setIsVerificationPanelOpen(true);
        setTimeout(() => panelRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    };

    const handleRejectAll = async () => {
        setIsLoading(true);
        try {
            await processReturnBatch(loanRequest.id, [], currentUser.name);
            addNotification('Semua item pengembalian ditolak.', 'warning');
            onBackToList();
        } catch (e: any) {
            addNotification(e.message || 'Gagal memproses.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerificationConfirm = async (acceptedAssetIds: string[]) => {
        setIsLoading(true);
        try {
            await processReturnBatch(loanRequest.id, acceptedAssetIds, currentUser.name);
            onBackToList(); // Success is handled by the store
        } catch (e: any) {
            addNotification(e.message || 'Gagal memproses.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <DetailPageLayout
            title={`Detail Pengembalian: ${mainReturnDocument.docNumber}`}
            onBack={onBackToList}
            headerActions={
                <div className="flex items-center gap-2">
                   <button onClick={handlePrint} className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border rounded-lg shadow-sm hover:bg-gray-50"><PrintIcon className="w-4 h-4"/> Cetak</button>
                   <button onClick={handleDownloadPdf} disabled={isDownloading} className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-tm-primary rounded-lg shadow-sm hover:bg-tm-primary-hover disabled:bg-tm-primary/70">{isDownloading ? <SpinnerIcon className="w-4 h-4"/> : <DownloadIcon className="w-4 h-4" />}{isDownloading ? 'Mengunduh...' : 'Unduh PDF'}</button>
                </div>
            }
            mainColClassName={isActionSidebarExpanded ? 'lg:col-span-8' : 'lg:col-span-11'}
            asideColClassName={isActionSidebarExpanded ? 'lg:col-span-4' : 'lg-col-span-1'}
            aside={
                <ReturnStatusSidebar
                    returnDocument={mainReturnDocument}
                    currentUser={currentUser}
                    isLoading={isLoading}
                    isExpanded={isActionSidebarExpanded}
                    onToggleVisibility={() => setIsActionSidebarExpanded(p => !p)}
                    onOpenVerification={handleOpenVerification}
                    onReject={handleRejectAll}
                />
            }
        >
            <div className="space-y-8">
                <div ref={printRef} className="p-8 bg-white border border-gray-200/80 rounded-xl shadow-sm space-y-8">
                    <Letterhead />
                    <div className="text-center"><h3 className="text-xl font-bold uppercase text-tm-dark">Berita Acara Pengembalian Aset</h3><p className="text-sm text-tm-secondary">Nomor: {mainReturnDocument.docNumber}</p></div>
                    <section><dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 text-sm">
                        <div><dt className="font-medium text-gray-500">Tanggal Pengembalian</dt><dd className="font-semibold text-gray-900">{new Date(mainReturnDocument.returnDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</dd></div>
                        <div><dt className="font-medium text-gray-500">ID Referensi Pinjaman</dt><dd className="font-semibold text-gray-900"><ClickableLink onClick={() => setActivePage('request-pinjam', { openDetailForId: loanRequest.id })}>{loanRequest.id}</ClickableLink></dd></div>
                        <div><dt className="font-medium text-gray-500">Dikembalikan Oleh</dt><dd className="font-semibold text-gray-900">{mainReturnDocument.returnedBy}</dd></div>
                        <div><dt className="font-medium text-gray-500">Divisi</dt><dd className="font-semibold text-gray-900">{getDivisionForUser(mainReturnDocument.returnedBy)}</dd></div>
                    </dl></section>
                    <section>
                        <h4 className="font-semibold text-gray-800 border-b pb-1 mb-2">Aset yang Dikembalikan</h4>
                        <div className="overflow-x-auto border rounded-lg">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-100 text-xs uppercase text-gray-700">
                                    <tr><th className="p-3 w-10 text-center">No.</th><th className="p-3">Nama Aset</th><th className="p-3">ID & SN</th><th className="p-3">Kondisi Dilaporkan</th><th className="p-3">Catatan</th></tr>
                                </thead>
                                <tbody>
                                    {returnDocuments.map((doc, index) => {
                                        const asset = assetsToReturn.find(a => a.id === doc.assetId);
                                        return (
                                        <tr key={doc.id} className="border-b last:border-b-0">
                                            <td className="p-3 text-center">{index + 1}.</td>
                                            <td className="p-3 font-semibold text-gray-800"><ClickableLink onClick={() => onShowPreview({ type: 'asset', id: doc.assetId })}>{doc.assetName}</ClickableLink></td>
                                            <td className="p-3 font-mono text-gray-600"><div>{doc.assetId}</div><div className="text-xs text-gray-400">SN: {asset?.serialNumber || '-'}</div></td>
                                            <td className="p-3 font-medium text-gray-800">{doc.returnedCondition}</td>
                                            <td className="p-3 text-xs italic text-gray-500">"{doc.notes || '-'}"</td>
                                        </tr>
                                    )})}
                                </tbody>
                            </table>
                        </div>
                    </section>
                    <section className="pt-8"><p className="text-xs text-center text-gray-500 mb-6">Demikian Berita Acara ini dibuat untuk dipergunakan sebagaimana mestinya.</p>
                        <div className="grid grid-cols-1 text-sm text-center gap-y-6 sm:grid-cols-2">
                            <div><p className="font-semibold text-gray-600">Yang Mengembalikan,</p><div className="flex items-center justify-center mt-2 h-28"><SignatureStamp signerName={mainReturnDocument.returnedBy} signatureDate={mainReturnDocument.returnDate} signerDivision={getDivisionForUser(mainReturnDocument.returnedBy)} /></div><p className="pt-1 mt-2 border-t border-gray-400">({mainReturnDocument.returnedBy})</p></div>
                            <div><p className="font-semibold text-gray-600">Diterima (Admin Logistik),</p><div className="flex items-center justify-center mt-2 h-28">
                                {mainReturnDocument.status === 'Ditolak' && mainReturnDocument.rejectedBy && <RejectionStamp rejectorName={mainReturnDocument.rejectedBy} rejectionDate={mainReturnDocument.rejectionDate!} />}
                                {mainReturnDocument.status === 'Diterima' && mainReturnDocument.approvedBy && <ApprovalStamp approverName={mainReturnDocument.approvedBy} approvalDate={mainReturnDocument.approvalDate!} />}
                                {mainReturnDocument.status === 'Menunggu Verifikasi' && <span className="italic text-gray-400">Menunggu Verifikasi</span>}
                            </div><p className="pt-1 mt-2 border-t border-gray-400">({mainReturnDocument.approvedBy || mainReturnDocument.rejectedBy || '.........................'})</p></div>
                        </div>
                    </section>
                </div>
                {isVerificationPanelOpen && (
                    <div ref={panelRef}>
                        <ReturnVerificationPanel 
                            assetsToVerify={assetsToReturn}
                            onConfirm={handleVerificationConfirm}
                            onCancel={() => setIsVerificationPanelOpen(false)}
                            isLoading={isLoading}
                        />
                    </div>
                )}
            </div>
        </DetailPageLayout>
    );
};

export default ReturnRequestDetailPage;