
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { AssetReturn, User, LoanRequest, PreviewData, Asset, Page, AssetReturnStatus } from '../../../types';
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
    returnDocuments: AssetReturn[]; // Keep as array for compatibility, but we focus on one doc
    loanRequest?: LoanRequest;
    assetsToReturn: Asset[]; 
    currentUser: User;
    onBackToList: () => void;
    onShowPreview: (data: PreviewData) => void;
    setActivePage: (page: Page, initialState?: any) => void;
}

const ReturnRequestDetailPage: React.FC<ReturnRequestDetailPageProps> = (props) => {
    const { returnDocuments, currentUser, onBackToList, onShowPreview, setActivePage } = props;
    
    // FETCH LIVE DATA FROM STORE
    // This solves the "Loop" issue by ensuring we react to store updates instantly
    const storeReturns = useRequestStore(state => state.returns);
    const storeLoanRequests = useRequestStore(state => state.loanRequests);
    const processReturnBatch = useRequestStore(state => state.processReturnBatch);
    const users = useMasterDataStore(state => state.users);
    const divisions = useMasterDataStore(state => state.divisions);

    // Identify the specific document ID we are viewing
    // If passed via props (from list view), use it. Otherwise try to find it in store.
    const targetDocId = returnDocuments[0]?.id;
    
    const returnDocument = useMemo(() => 
        storeReturns.find(r => r.id === targetDocId) || returnDocuments[0],
    [storeReturns, targetDocId, returnDocuments]);

    const loanRequest = useMemo(() => 
        storeLoanRequests.find(lr => lr.id === returnDocument?.loanRequestId) || props.loanRequest,
    [storeLoanRequests, returnDocument, props.loanRequest]);

    const [isActionSidebarExpanded, setIsActionSidebarExpanded] = useState(true);
    const [isVerificationPanelOpen, setIsVerificationPanelOpen] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const printRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const addNotification = useNotification();

    // Close panel if status changes to something other than PENDING (e.g. COMPLETED)
    useEffect(() => {
        if (returnDocument?.status !== AssetReturnStatus.PENDING_APPROVAL) {
            setIsVerificationPanelOpen(false);
        }
    }, [returnDocument?.status]);

    if (!returnDocument) {
        return <div className="p-8 text-center text-gray-500">Data dokumen pengembalian tidak ditemukan atau telah dihapus. <button onClick={onBackToList} className="text-tm-primary hover:underline">Kembali</button></div>;
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
                pdf.save(`Return-${returnDocument.docNumber}.pdf`);
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
        if (!window.confirm("Apakah Anda yakin ingin menolak SELURUH item dalam dokumen ini? Status aset akan tetap 'Dipinjam'.")) return;
        setIsLoading(true);
        try {
            await processReturnBatch(returnDocument.id, [], currentUser.name);
            // No need to manually navigate back or force refresh, store update will trigger re-render with new status
        } catch (e: any) {
            addNotification(e.message || 'Gagal memproses.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerificationConfirm = async (acceptedAssetIds: string[]) => {
        if (acceptedAssetIds.length === 0 && !window.confirm("Anda tidak memilih aset apapun. Ini akan dianggap sebagai PENOLAKAN TOTAL. Lanjutkan?")) {
            return;
        }
        setIsLoading(true);
        try {
            await processReturnBatch(returnDocument.id, acceptedAssetIds, currentUser.name);
        } catch (e: any) {
            addNotification(e.message || 'Gagal memproses.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <DetailPageLayout
            title={`Detail Pengembalian: ${returnDocument.docNumber}`}
            onBack={onBackToList}
            headerActions={
                <div className="flex items-center gap-2">
                   <button onClick={handlePrint} className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border rounded-lg shadow-sm hover:bg-gray-50"><PrintIcon className="w-4 h-4"/> Cetak</button>
                   <button onClick={handleDownloadPdf} disabled={isDownloading} className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-tm-primary rounded-lg shadow-sm hover:bg-tm-primary-hover disabled:bg-tm-primary/70">{isDownloading ? <SpinnerIcon className="w-4 h-4"/> : <DownloadIcon className="w-4 h-4" />}{isDownloading ? 'Mengunduh...' : 'Unduh PDF'}</button>
                </div>
            }
            mainColClassName={isActionSidebarExpanded ? 'lg:col-span-8' : 'lg:col-span-11'}
            asideColClassName={isActionSidebarExpanded ? 'lg:col-span-4' : 'lg:col-span-1'}
            aside={
                <ReturnStatusSidebar
                    returnDocument={returnDocument}
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
                    <div className="text-center"><h3 className="text-xl font-bold uppercase text-tm-dark">Berita Acara Pengembalian Aset</h3><p className="text-sm text-tm-secondary">Nomor: {returnDocument.docNumber}</p></div>
                    
                    <section><dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 text-sm">
                        <div><dt className="font-medium text-gray-500">Tanggal Pengembalian</dt><dd className="font-semibold text-gray-900">{new Date(returnDocument.returnDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</dd></div>
                        <div><dt className="font-medium text-gray-500">ID Referensi Pinjaman</dt><dd className="font-semibold text-gray-900">
                             {loanRequest ? <ClickableLink onClick={() => setActivePage('request-pinjam', { openDetailForId: loanRequest.id })}>{loanRequest.id}</ClickableLink> : returnDocument.loanRequestId}
                        </dd></div>
                        <div><dt className="font-medium text-gray-500">Dikembalikan Oleh</dt><dd className="font-semibold text-gray-900">{returnDocument.returnedBy}</dd></div>
                        <div><dt className="font-medium text-gray-500">Divisi</dt><dd className="font-semibold text-gray-900">{getDivisionForUser(returnDocument.returnedBy)}</dd></div>
                    </dl></section>

                    <section>
                        <h4 className="font-semibold text-gray-800 border-b pb-1 mb-2">Daftar Barang yang Dikembalikan</h4>
                        <div className="overflow-x-auto border rounded-lg">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-gray-100 text-xs uppercase text-gray-700">
                                    <tr>
                                        <th className="p-3 w-10 text-center">No.</th>
                                        <th className="p-3">Nama Aset</th>
                                        <th className="p-3">ID Aset</th>
                                        <th className="p-3">Kondisi</th>
                                        <th className="p-3">Status Verifikasi</th>
                                        <th className="p-3">Catatan</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {returnDocument.items.map((item, index) => {
                                        let statusBadgeClass = 'bg-gray-100 text-gray-600';
                                        let statusLabel: string = item.status;
                                        if (item.status === 'ACCEPTED') { statusBadgeClass = 'bg-green-100 text-green-700'; statusLabel = 'Diterima'; }
                                        if (item.status === 'REJECTED') { statusBadgeClass = 'bg-red-100 text-red-700'; statusLabel = 'Ditolak'; }
                                        if (item.status === 'PENDING') { statusBadgeClass = 'bg-amber-100 text-amber-700'; statusLabel = 'Menunggu'; }

                                        return (
                                            <tr key={index} className="hover:bg-gray-50">
                                                <td className="p-3 text-center">{index + 1}.</td>
                                                <td className="p-3 font-semibold text-gray-800"><ClickableLink onClick={() => onShowPreview({ type: 'asset', id: item.assetId })}>{item.assetName}</ClickableLink></td>
                                                <td className="p-3 font-mono text-gray-600 text-xs">{item.assetId}</td>
                                                <td className="p-3 font-medium text-gray-800">{item.returnedCondition}</td>
                                                <td className="p-3">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${statusBadgeClass}`}>{statusLabel}</span>
                                                </td>
                                                <td className="p-3 text-xs italic text-gray-500">
                                                    {item.notes ? `User: "${item.notes}"` : ''}
                                                    {item.verificationNotes && <div className="mt-1 text-blue-600 font-medium">Admin: {item.verificationNotes}</div>}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section className="pt-8"><p className="text-xs text-center text-gray-500 mb-6">Demikian Berita Acara ini dibuat untuk dipergunakan sebagaimana mestinya.</p>
                        <div className="grid grid-cols-1 text-sm text-center gap-y-6 sm:grid-cols-2">
                            <div><p className="font-semibold text-gray-600">Yang Mengembalikan,</p><div className="flex items-center justify-center mt-2 h-28"><SignatureStamp signerName={returnDocument.returnedBy} signatureDate={returnDocument.returnDate} signerDivision={getDivisionForUser(returnDocument.returnedBy)} /></div><p className="pt-1 mt-2 border-t border-gray-400">({returnDocument.returnedBy})</p></div>
                            <div><p className="font-semibold text-gray-600">Diterima (Admin Logistik),</p><div className="flex items-center justify-center mt-2 h-28">
                                {returnDocument.status === AssetReturnStatus.REJECTED && returnDocument.verifiedBy && <RejectionStamp rejectorName={returnDocument.verifiedBy} rejectionDate={returnDocument.verificationDate!} />}
                                {(returnDocument.status === AssetReturnStatus.COMPLETED || returnDocument.status === AssetReturnStatus.APPROVED) && returnDocument.verifiedBy && <ApprovalStamp approverName={returnDocument.verifiedBy} approvalDate={returnDocument.verificationDate!} />}
                                {returnDocument.status === AssetReturnStatus.PENDING_APPROVAL && <span className="italic text-gray-400">Menunggu Verifikasi</span>}
                            </div><p className="pt-1 mt-2 border-t border-gray-400">({returnDocument.verifiedBy || '.........................'})</p></div>
                        </div>
                    </section>
                </div>
                
                {isVerificationPanelOpen && returnDocument.status === AssetReturnStatus.PENDING_APPROVAL && (
                    <div ref={panelRef}>
                        <ReturnVerificationPanel 
                            returnItems={returnDocument.items}
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
