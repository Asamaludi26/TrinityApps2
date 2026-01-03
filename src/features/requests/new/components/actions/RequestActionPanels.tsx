import React from 'react';
import { Request, User, ItemStatus } from '../../../../../types';
import { ActionButton } from '../../../../../components/ui/ActionButton';
import { CheckIcon } from '../../../../../components/icons/CheckIcon';
import { PencilIcon } from '../../../../../components/icons/PencilIcon';
import { BellIcon } from '../../../../../components/icons/BellIcon';
import { CloseIcon } from '../../../../../components/icons/CloseIcon';
import { MegaphoneIcon } from '../../../../../components/icons/MegaphoneIcon';
import { ShoppingCartIcon } from '../../../../../components/icons/ShoppingCartIcon';
import { TruckIcon } from '../../../../../components/icons/TruckIcon';
import { ArchiveBoxIcon } from '../../../../../components/icons/ArchiveBoxIcon';
import { RegisterIcon } from '../../../../../components/icons/RegisterIcon';
import { HandoverIcon } from '../../../../../components/icons/HandoverIcon';
import { InfoIcon } from '../../../../../components/icons/InfoIcon';
import { BsHourglassSplit, BsFileEarmarkCheck, BsArrowRight } from 'react-icons/bs';
import { hasPermission } from '../../../../../utils/permissions';
import { LABELS } from '../../../../../constants/labels';
import { useRequestStore } from '../../../../../stores/useRequestStore';
import { useTransactionStore } from '../../../../../stores/useTransactionStore';

// --- SHARED WAITING CARD ---
export const WaitingStateCard: React.FC<{ title: string; message: string; icon?: React.FC<{className?:string}> }> = ({ title, message, icon: Icon = BsHourglassSplit }) => (
    <div className="flex flex-col items-center justify-center p-6 text-center bg-gray-50 border border-gray-200 rounded-lg animate-fade-in-up">
        <div className="relative mb-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 z-10 relative">
                <Icon className="w-6 h-6" />
            </div>
            <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
            </span>
        </div>
        <h4 className="font-bold text-gray-800">{title}</h4>
        <p className="text-xs text-gray-500 mt-1 max-w-[200px] leading-relaxed">{message}</p>
    </div>
);

// --- 1. PENDING ACTIONS ---
export const PendingActions: React.FC<{ request: Request; currentUser: User; uiProps: any }> = ({ request, currentUser, uiProps }) => {
    const updateRequest = useRequestStore(state => state.updateRequest);
    const { onOpenReviewModal, onOpenFollowUpModal, onOpenCancellationModal, isLoading } = uiProps;

    const canApprove = hasPermission(currentUser, 'requests:approve:logistic') || hasPermission(currentUser, 'requests:approve:final');
    const isRequester = currentUser.name === request.requester;

    const handleLogisticApproval = () => {
        updateRequest(request.id, { 
            status: ItemStatus.LOGISTIC_APPROVED, 
            logisticApprover: currentUser.name, 
            logisticApprovalDate: new Date().toISOString() 
        });
    };

    if (canApprove) {
        return (
            <div className="space-y-3">
                <ActionButton onClick={handleLogisticApproval} disabled={isLoading} text={LABELS.BTN_APPROVE_LOGISTIC} color="success" icon={CheckIcon} />
                <ActionButton onClick={onOpenReviewModal} disabled={isLoading} text={LABELS.BTN_REVISE_REJECT} color="secondary" icon={PencilIcon} />
            </div>
        );
    } 
    if (isRequester) {
        return (
            <div className="space-y-3">
                 <ActionButton onClick={() => onOpenFollowUpModal(request)} text={LABELS.BTN_FOLLOW_UP} color="info" icon={BellIcon} />
                 <ActionButton onClick={onOpenCancellationModal} text={LABELS.BTN_CANCEL_REQUEST} color="danger" icon={CloseIcon} />
            </div>
        );
    }
    return <WaitingStateCard title={LABELS.MSG_WAITING_LOGISTIC} message={LABELS.MSG_DESC_WAITING_LOGISTIC} />;
};

// --- 2. LOGISTIC APPROVED / PURCHASE ACTIONS ---
export const LogisticApprovedActions: React.FC<{ request: Request; currentUser: User; uiProps: any }> = ({ request, currentUser, uiProps }) => {
    const updateRequest = useRequestStore(state => state.updateRequest);
    const { onOpenReviewModal, onFollowUpToCeo, onFinalSubmit, isPurchaseFormValid, isLoading } = uiProps;

    const canApprovePurchase = hasPermission(currentUser, 'requests:approve:purchase');
    const canApproveFinal = hasPermission(currentUser, 'requests:approve:final');

    const handleCeoDisposition = () => {
        updateRequest(request.id, { isPrioritizedByCEO: true, ceoDispositionDate: new Date().toISOString() });
    };

    if (canApprovePurchase) {
        return (
            <div className="space-y-3">
                <ActionButton 
                    onClick={onFinalSubmit} 
                    disabled={isLoading || !isPurchaseFormValid} 
                    text={LABELS.BTN_SUBMIT_CEO} 
                    color="primary" 
                    icon={CheckIcon} 
                    title={!isPurchaseFormValid ? LABELS.TOOLTIP_PURCHASE_INCOMPLETE : LABELS.TOOLTIP_SUBMIT_FINAL}
                />
                <ActionButton onClick={onOpenReviewModal} disabled={isLoading} text={LABELS.BTN_REVISE_REJECT} color="secondary" icon={PencilIcon} />
                {!request.ceoFollowUpSent && (
                    <ActionButton onClick={() => onFollowUpToCeo(request)} disabled={isLoading} text={LABELS.BTN_FOLLOW_UP_CEO} color="secondary" icon={BellIcon} />
                )}
            </div>
        );
    }
    if (canApproveFinal && !request.isPrioritizedByCEO) {
         return (
            <div className="space-y-3">
                <ActionButton onClick={handleCeoDisposition} disabled={isLoading} text={LABELS.BTN_PRIORITIZE} color="special" icon={MegaphoneIcon} />
                <div className="pt-2 border-t border-gray-100">
                     <WaitingStateCard title={LABELS.MSG_WAITING_PURCHASE_DETAIL} message={LABELS.MSG_DESC_WAITING_PURCHASE} />
                </div>
            </div>
         );
    }
    return <WaitingStateCard title={LABELS.MSG_IN_PURCHASE_PROCESS} message={LABELS.MSG_DESC_IN_PURCHASE} />;
};

// --- 3. FINAL APPROVAL ACTIONS ---
export const FinalApprovalActions: React.FC<{ request: Request; currentUser: User; uiProps: any }> = ({ request, currentUser, uiProps }) => {
    const updateRequest = useRequestStore(state => state.updateRequest);
    const { onOpenReviewModal, isPurchaseFormValid, isLoading } = uiProps;
    const canApproveFinal = hasPermission(currentUser, 'requests:approve:final');

    const handleFinalCeoApproval = () => {
        updateRequest(request.id, { 
            status: ItemStatus.APPROVED, 
            finalApprover: currentUser.name, 
            finalApprovalDate: new Date().toISOString() 
        });
    };

    if (canApproveFinal) {
         return (
            <div className="space-y-3">
                <ActionButton 
                    onClick={handleFinalCeoApproval} 
                    disabled={isLoading || !isPurchaseFormValid} 
                    text={LABELS.BTN_APPROVE_FINAL} 
                    color="success" 
                    icon={CheckIcon}
                    title={!isPurchaseFormValid ? LABELS.TOOLTIP_CEO_INCOMPLETE : LABELS.TOOLTIP_CEO_APPROVE}
                />
                <ActionButton onClick={onOpenReviewModal} disabled={isLoading} text={LABELS.BTN_REVISE_REJECT} color="danger" icon={CloseIcon} />
            </div>
        );
    }
    return <WaitingStateCard title={LABELS.MSG_WAITING_CEO} message={LABELS.MSG_DESC_WAITING_CEO} />;
};

// --- 4. PROCUREMENT PROCESS ACTIONS ---
export const ProcurementActions: React.FC<{ request: Request; currentUser: User; uiProps: any }> = ({ request, currentUser, uiProps }) => {
    const updateRequest = useRequestStore(state => state.updateRequest);
    const { onStartProcurement, onRequestProgressUpdate, isLoading } = uiProps;

    const canApprovePurchase = hasPermission(currentUser, 'requests:approve:purchase');
    const canApproveFinal = hasPermission(currentUser, 'requests:approve:final');
    const canApproveLogistic = hasPermission(currentUser, 'requests:approve:logistic');

    if (request.status === ItemStatus.APPROVED) {
        if (canApprovePurchase) {
             return <ActionButton onClick={onStartProcurement} disabled={isLoading} text={LABELS.BTN_START_PROCUREMENT} color="primary" icon={ShoppingCartIcon} />;
        }
        return <WaitingStateCard title={LABELS.MSG_READY_PROCUREMENT} message={LABELS.MSG_DESC_READY_PROCUREMENT} />;
    }

    if (request.status === ItemStatus.PURCHASING || request.status === ItemStatus.IN_PROGRESS) {
        if (canApprovePurchase) {
             return <ActionButton onClick={() => updateRequest(request.id, { status: ItemStatus.IN_DELIVERY })} disabled={isLoading} text={LABELS.BTN_MARK_DELIVERY} color="primary" icon={TruckIcon} />;
        }
        if (canApproveFinal && !request.progressUpdateRequest?.isAcknowledged) {
             return <ActionButton onClick={() => onRequestProgressUpdate(request.id)} disabled={isLoading} text={LABELS.BTN_REQ_PROGRESS} color="info" icon={InfoIcon} />;
        }
        return <WaitingStateCard title={LABELS.MSG_ORDERING} message={LABELS.MSG_DESC_ORDERING} icon={ShoppingCartIcon} />;
    }
    
    if (request.status === ItemStatus.IN_DELIVERY) {
         if (canApprovePurchase || canApproveLogistic) {
              return <ActionButton onClick={() => updateRequest(request.id, { status: ItemStatus.ARRIVED })} disabled={isLoading} text={LABELS.BTN_MARK_ARRIVED} color="primary" icon={ArchiveBoxIcon} />;
         }
         return <WaitingStateCard title={LABELS.MSG_DELIVERING} message={LABELS.MSG_DESC_DELIVERING} icon={TruckIcon} />;
    }

    return null;
};

// --- 5. ARRIVAL & HANDOVER ACTIONS ---
export const ArrivalActions: React.FC<{ request: Request; currentUser: User; uiProps: any }> = ({ request, currentUser, uiProps }) => {
    const { onOpenStaging, onInitiateHandoverFromRequest, isLoading, isStagingComplete, onShowPreview } = uiProps;
    const handovers = useTransactionStore(state => state.handovers);
    const canManageAssets = hasPermission(currentUser, 'assets:create');
    const canManageHandover = hasPermission(currentUser, 'assets:handover');
    const canApproveFinal = hasPermission(currentUser, 'requests:approve:final'); // CEO bisa bypass

    // Support Multiple/Partial Handovers
    const relatedHandovers = handovers.filter(h => h.woRoIntNumber === request.id);

    if (request.status === ItemStatus.ARRIVED) {
        if (canManageAssets || canApproveFinal) {
            if (isStagingComplete) {
                 return <ActionButton onClick={() => onOpenStaging(request)} disabled={isLoading} text="Selesai & Siap Handover" color="success" icon={CheckIcon} />;
            }
            return <ActionButton onClick={() => onOpenStaging(request)} disabled={isLoading} text={LABELS.BTN_REGISTER_ASSET} color="primary" icon={RegisterIcon} />;
        }
        return <WaitingStateCard title={LABELS.MSG_ARRIVED} message={LABELS.MSG_DESC_ARRIVED} icon={ArchiveBoxIcon} />;
    }

    if (request.status === ItemStatus.AWAITING_HANDOVER) {
         return (
             <div className="space-y-4">
                 {/* List Existing Handovers (Partial) */}
                 {relatedHandovers.length > 0 && (
                     <div className="space-y-2">
                         <p className="text-xs font-bold text-gray-500 uppercase">Handover Dibuat:</p>
                         {relatedHandovers.map(ho => (
                             <button
                                key={ho.id}
                                onClick={() => onShowPreview({ type: 'handover', id: ho.id })}
                                className="w-full flex items-center justify-between p-2 text-xs bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
                             >
                                 <span className="font-semibold text-gray-700">{ho.docNumber}</span>
                                 <span className="text-gray-500">{new Date(ho.handoverDate).toLocaleDateString('id-ID')}</span>
                             </button>
                         ))}
                     </div>
                 )}

                 {/* Create New Handover Button */}
                 {canManageHandover || canApproveFinal ? (
                     <ActionButton onClick={() => onInitiateHandoverFromRequest(request)} disabled={isLoading} text={LABELS.BTN_CREATE_HANDOVER} color="primary" icon={HandoverIcon} />
                 ) : (
                     <WaitingStateCard title={LABELS.MSG_READY_HANDOVER} message={LABELS.MSG_DESC_READY_HANDOVER} icon={CheckIcon} />
                 )}
             </div>
         );
    }

    return null;
};

// --- 6. TERMINAL ACTIONS (COMPLETED / REJECTED) ---
export const TerminalActions: React.FC<{ request: Request, uiProps?: any }> = ({ request, uiProps }) => {
    const handovers = useTransactionStore(state => state.handovers);
    const { onShowPreview } = uiProps || {};

    let icon = CheckIcon;
    let color = "text-green-500";
    let bgColor = "bg-green-50";
    let borderColor = "border-green-200";
    let title = "Permintaan Selesai";
    let subtext = "Seluruh proses telah rampung.";

    // Cari SEMUA dokumen handover terkait (karena bisa parsial)
    const linkedHandovers = handovers.filter(h => h.woRoIntNumber === request.id);

    if (request.status === ItemStatus.REJECTED) {
        icon = CloseIcon; 
        color = "text-red-500"; 
        bgColor = "bg-red-50";
        borderColor = "border-red-200";
        title = "Permintaan Ditolak";
        subtext = request.rejectionReason 
            ? `Alasan: "${request.rejectionReason}"` 
            : "Permintaan ini tidak disetujui.";
    } else if (request.status === ItemStatus.CANCELLED) {
        icon = CloseIcon; 
        color = "text-gray-400"; 
        bgColor = "bg-gray-50";
        borderColor = "border-gray-200";
        title = "Permintaan Dibatalkan";
        subtext = "Permintaan ini ditarik kembali oleh pemohon.";
    }

    const Icon = icon;

    return (
        <div className={`text-center p-5 ${bgColor} border ${borderColor} rounded-xl shadow-sm animate-fade-in-up`}>
            <div className={`w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center bg-white ${color} shadow-sm border border-gray-100`}>
                <Icon className="w-6 h-6" />
            </div>
            
            <p className="text-sm font-bold text-gray-800">{title}</p>
            <p className="text-xs text-gray-500 mt-1 mb-4 leading-relaxed px-2">{subtext}</p>

            {/* Smart Action: Link to ALL Handover Docs */}
            {request.status === ItemStatus.COMPLETED && linkedHandovers.length > 0 && onShowPreview && (
                <div className="pt-3 border-t border-green-200/60 mt-2 space-y-2">
                     <p className="text-[10px] font-bold text-green-700 uppercase tracking-wider mb-1">Dokumen Serah Terima</p>
                     {linkedHandovers.map(ho => (
                        <button 
                            key={ho.id}
                            onClick={() => onShowPreview({ type: 'handover', id: ho.id })}
                            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-green-800 bg-white border border-green-200 rounded-lg hover:bg-green-50 transition-colors shadow-sm"
                        >
                            <BsFileEarmarkCheck className="w-3.5 h-3.5" />
                            {ho.docNumber} <BsArrowRight className="w-3 h-3"/>
                        </button>
                     ))}
                </div>
            )}
        </div>
    );
};