
import { create } from 'zustand';
import { Request, LoanRequest, AssetReturn, ItemStatus, LoanRequestStatus, AssetReturnStatus, AssetStatus, AssetCondition } from '../types';
import * as api from '../services/api';
import { useNotificationStore } from './useNotificationStore';
import { useUIStore } from './useUIStore'; 
import { useMasterDataStore } from './useMasterDataStore';
import { useAssetStore } from './useAssetStore'; 
import { generateDocumentNumber } from '../utils/documentNumberGenerator';
import { useAuthStore } from './useAuthStore';

interface RequestState {
  requests: Request[];
  loanRequests: LoanRequest[];
  returns: AssetReturn[];
  isLoading: boolean;

  fetchRequests: () => Promise<void>;
  addRequest: (request: Omit<Request, 'id' | 'status' | 'docNumber' | 'logisticApprover' | 'logisticApprovalDate' | 'finalApprover' | 'finalApprovalDate' | 'rejectionReason' | 'rejectedBy' | 'rejectionDate' | 'rejectedByDivision'>) => Promise<void>;
  updateRequest: (id: string, data: Partial<Request>) => Promise<void>;
  deleteRequest: (id: string) => Promise<void>;
  updateRequestRegistration: (requestId: string, itemId: number, count: number) => Promise<boolean>;
  
  addLoanRequest: (request: LoanRequest) => Promise<void>;
  updateLoanRequest: (id: string, data: Partial<LoanRequest>) => Promise<void>;
  deleteLoanRequest: (id: string) => Promise<void>;
  approveLoanRequest: (id: string, payload: { approver: string, approvalDate: string, assignedAssetIds: any, itemStatuses: any }) => Promise<void>;
  
  addReturn: (returnData: AssetReturn) => Promise<void>;
  updateReturn: (id: string, data: Partial<AssetReturn>) => Promise<void>;
  
  processReturnBatch: (returnDocId: string, acceptedAssetIds: string[], approverName: string) => Promise<void>;
  submitReturnRequest: (loanRequestId: string, returnItems: { assetId: string, condition: AssetCondition, notes: string }[]) => Promise<void>;
}

const sendSystemNotif = (recipientRoleOrName: string, type: string, refId: string, message: string, isRole = false) => {
    const users = useMasterDataStore.getState().users;
    const currentUser = useAuthStore.getState().currentUser;
    const addNotif = useNotificationStore.getState().addSystemNotification;

    if (!currentUser) return;

    let recipients: typeof users = [];

    if (isRole) {
        recipients = users.filter(u => u.role === recipientRoleOrName || (recipientRoleOrName === 'Admin' && ['Admin Logistik', 'Admin Purchase', 'Super Admin'].includes(u.role)));
    } else {
        const user = users.find(u => u.name === recipientRoleOrName);
        if (user) recipients = [user];
    }

    recipients.forEach(target => {
        if (target.id !== currentUser.id) {
            addNotif({
                recipientId: target.id,
                actorName: currentUser.name,
                type: type,
                referenceId: refId,
                message: message
            });
        }
    });
};

export const useRequestStore = create<RequestState>((set, get) => ({
  requests: [],
  loanRequests: [],
  returns: [],
  isLoading: false,

  fetchRequests: async () => {
    set({ isLoading: true });
    try {
      const data = await api.fetchAllData();
      set({ 
        requests: data.requests, 
        loanRequests: data.loanRequests, 
        returns: data.returns,
        isLoading: false 
      });
    } catch (error) {
      set({ isLoading: false });
    }
  },

  addRequest: async (requestData) => {
      // 1. RE-FETCH ASSETS untuk memastikan data stok paling baru (Anti-Stale)
      await useAssetStore.getState().fetchAssets(); 

      const current = get().requests;
      const requestDate = new Date(requestData.requestDate);
      const docsForGenerator = current.map(r => ({ docNumber: r.id }));
      const newId = generateDocumentNumber('RO', docsForGenerator, requestDate);
      
      // 2. LOGIKA CERDAS: Cek Stok Otomatis (Dengan Data Segar)
      const { checkAvailability } = useAssetStore.getState();
      const itemStatuses: Record<number, any> = {};
      let allStockAvailable = true;

      requestData.items.forEach(item => {
           // Cek ketersediaan di Asset Store
           const stockCheck = checkAvailability(item.itemName, item.itemTypeBrand, item.quantity);
           
           if (stockCheck.isSufficient) {
               // Jika stok ada, langsung alokasikan secara sistem
               itemStatuses[item.id] = { 
                   status: 'stock_allocated', 
                   approvedQuantity: item.quantity,
                   reason: stockCheck.isFragmented 
                        ? 'Stok tersedia di gudang (Fragmented/Terpecah)' 
                        : 'Stok tersedia di gudang (Auto-Allocated)' 
               };
           } else {
               // Jika kurang, tandai butuh pengadaan
               itemStatuses[item.id] = { 
                   status: 'procurement_needed', 
                   approvedQuantity: item.quantity 
               };
               allStockAvailable = false;
           }
      });
      
      // 3. Tentukan Status Awal
      const initialStatus = (allStockAvailable && requestData.order.type === 'Regular Stock') 
          ? ItemStatus.AWAITING_HANDOVER 
          : ItemStatus.PENDING;
      
      const newRequest: Request = {
        ...requestData,
        id: newId,
        docNumber: newId,
        status: initialStatus,
        itemStatuses: itemStatuses,
        // BUG FIX: Jangan set isRegistered=true otomatis untuk alokasi stok.
        // Aset fisik belum dipilih (linking ID belum terjadi).
        // Biarkan false, nanti proses Handover yang akan memilih aset fisik.
        isRegistered: false, 
        partiallyRegisteredItems: {}
      };

      const updated = [newRequest, ...current];
      await api.updateData('app_requests', updated);
      set({ requests: updated });

      // Notifikasi Cerdas
      if (initialStatus === ItemStatus.AWAITING_HANDOVER) {
           sendSystemNotif('Admin Logistik', 'REQUEST_CREATED', newRequest.id, 'membuat request (Stok Tersedia, Siap Handover)', true);
           useNotificationStore.getState().addToast('Request dibuat. Stok tersedia, silakan hubungi Logistik untuk pengambilan.', 'success');
      } else {
           sendSystemNotif('Admin Logistik', 'REQUEST_CREATED', newRequest.id, 'membuat permintaan aset baru (Butuh Pengadaan/Review)', true);
      }
      sendSystemNotif('Super Admin', 'REQUEST_CREATED', newRequest.id, 'membuat permintaan aset baru', true);
  },

  updateRequest: async (id, data) => {
    const current = get().requests;
    const oldRequest = current.find(r => r.id === id);
    const updated = current.map(r => r.id === id ? { ...r, ...data } : r);
    await api.updateData('app_requests', updated);
    set({ requests: updated });

    if (oldRequest && data.status && oldRequest.status !== data.status) {
        const requester = oldRequest.requester;
        if (data.status === ItemStatus.LOGISTIC_APPROVED) {
            sendSystemNotif('Admin Purchase', 'REQUEST_LOGISTIC_APPROVED', id, 'menyetujui tahap logistik, mohon proses pembelian', true);
            sendSystemNotif(requester, 'STATUS_CHANGE', id, 'telah disetujui oleh Logistik', false);
        } else if (data.status === ItemStatus.AWAITING_CEO_APPROVAL) {
            sendSystemNotif('Super Admin', 'REQUEST_AWAITING_FINAL_APPROVAL', id, 'membutuhkan persetujuan final', true);
        } else if (data.status === ItemStatus.APPROVED) {
            sendSystemNotif('Admin Purchase', 'REQUEST_FULLY_APPROVED', id, 'telah disetujui final. Silakan proses PO', true);
            sendSystemNotif(requester, 'REQUEST_APPROVED', id, 'telah disetujui sepenuhnya', false);
        } else if (data.status === ItemStatus.REJECTED) {
            sendSystemNotif(requester, 'REQUEST_REJECTED', id, `telah ditolak. Alasan: ${data.rejectionReason || '-'}` , false);
        } else if (data.status === ItemStatus.ARRIVED) {
            sendSystemNotif('Admin Logistik', 'STATUS_CHANGE', id, 'Barang telah tiba. Mohon catat aset.', true);
             sendSystemNotif(requester, 'STATUS_CHANGE', id, 'Barang pesanan telah tiba di gudang', false);
        }
    }
  },

  deleteRequest: async (id) => {
    const current = get().requests;
    const updated = current.filter(r => r.id !== id);
    await api.updateData('app_requests', updated);
    set({ requests: updated });
  },

  updateRequestRegistration: async (requestId, itemId, count) => {
    const currentRequests = get().requests;
    const requestIndex = currentRequests.findIndex(r => r.id === requestId);
    if (requestIndex === -1) return false;

    // Security Check: Pastikan count tidak negatif
    const validCount = Math.max(0, count);

    const request = currentRequests[requestIndex];
    const currentRegistered = request.partiallyRegisteredItems || {};
    const newCount = (currentRegistered[itemId] || 0) + validCount;
    const updatedRegistered = { ...currentRegistered, [itemId]: newCount };

    let isFullyComplete = true;
    request.items.forEach(item => {
        const status = request.itemStatuses?.[item.id];
        if (status?.status === 'rejected' || status?.status === 'stock_allocated') return;
        const approvedQty = status?.approvedQuantity ?? item.quantity;
        const regQty = updatedRegistered[item.id] || 0;
        if (regQty < approvedQty) isFullyComplete = false;
    });

    const nextStatus = isFullyComplete ? ItemStatus.AWAITING_HANDOVER : request.status;
    const isRegisteredFlag = isFullyComplete; 

    const updatedRequest = {
        ...request,
        partiallyRegisteredItems: updatedRegistered,
        status: nextStatus,
        isRegistered: isRegisteredFlag 
    };

    if (nextStatus === ItemStatus.AWAITING_HANDOVER && request.status !== ItemStatus.AWAITING_HANDOVER) {
         const activityLog = updatedRequest.activityLog || [];
         activityLog.unshift({
             id: Date.now(),
             author: 'System',
             timestamp: new Date().toISOString(),
             type: 'status_change',
             payload: { text: 'Seluruh item telah dicatat. Status diubah menjadi Siap Serah Terima.' }
         });
         updatedRequest.activityLog = activityLog;
         sendSystemNotif(updatedRequest.requester, 'REQUEST_COMPLETED', requestId, 'Aset telah diregistrasi dan siap diserahterimakan', false);
    }

    const updatedRequests = [...currentRequests];
    updatedRequests[requestIndex] = updatedRequest;
    await api.updateData('app_requests', updatedRequests);
    set({ requests: updatedRequests });
    return true;
  },

  addLoanRequest: async (request) => {
    const current = get().loanRequests;
    const updated = [request, ...current];
    await api.updateData('app_loanRequests', updated);
    set({ loanRequests: updated });
    sendSystemNotif('Admin Logistik', 'REQUEST_CREATED', request.id, 'membuat request pinjam aset', true);
  },

  updateLoanRequest: async (id, data) => {
    const current = get().loanRequests;
    const oldReq = current.find(r => r.id === id);
    const updated = current.map(r => r.id === id ? { ...r, ...data } : r);
    await api.updateData('app_loanRequests', updated);
    set({ loanRequests: updated });
    
    if (oldReq && data.status && oldReq.status !== data.status) {
        if (data.status === LoanRequestStatus.REJECTED) {
             sendSystemNotif(oldReq.requester, 'REQUEST_REJECTED', id, 'Request pinjaman ditolak', false);
        } else if (data.status === LoanRequestStatus.RETURNED) {
             sendSystemNotif(oldReq.requester, 'STATUS_CHANGE', id, 'Pengembalian aset telah dikonfirmasi selesai', false);
        }
    }
  },
  
  approveLoanRequest: async (id, payload) => {
     const updatedRequest = await api.approveLoanTransaction(id, payload);
     const currentLoans = get().loanRequests;
     const updatedLoans = currentLoans.map(r => r.id === id ? updatedRequest : r);
     set({ loanRequests: updatedLoans });
     await useAssetStore.getState().fetchAssets();
     
     const loan = currentLoans.find(r => r.id === id);
     if (loan) {
         sendSystemNotif(loan.requester, 'REQUEST_APPROVED', id, 'Request pinjaman disetujui. Aset siap diambil', false);
     }
  },
  
  deleteLoanRequest: async (id) => {
      const current = get().loanRequests;
      const updated = current.filter(r => r.id !== id);
      await api.updateData('app_loanRequests', updated);
      set({ loanRequests: updated });
  },

  addReturn: async (returnData) => {
    const current = get().returns;
    const updated = [returnData, ...current];
    await api.updateData('app_returns', updated);
    set({ returns: updated });
    sendSystemNotif('Admin Logistik', 'STATUS_CHANGE', returnData.docNumber, `mengajukan pengembalian aset (Ref: ${returnData.loanRequestId})`, true);
  },
  
  updateReturn: async (id, data) => {
    const current = get().returns;
    const updated = current.map(r => r.id === id ? { ...r, ...data } : r);
    await api.updateData('app_returns', updated);
    set({ returns: updated });
  },

  submitReturnRequest: async (loanRequestId, returnItems) => {
      const { currentUser } = useAuthStore.getState();
      const { assets, updateAssetBatch } = useAssetStore.getState();
      const { addReturn, updateLoanRequest, returns, loanRequests } = get();

      const loanRequest = loanRequests.find(lr => lr.id === loanRequestId);
      if (!loanRequest || !currentUser) throw new Error("Request atau pengguna tidak ditemukan.");
      
      const today = new Date();
      const returnDocNumber = generateDocumentNumber('RR', returns, today);
      const assetIds = returnItems.map(item => item.assetId);

      const newReturnDoc: AssetReturn = {
          id: returnDocNumber,
          docNumber: returnDocNumber,
          returnDate: today.toISOString(),
          loanRequestId: loanRequest.id,
          returnedBy: currentUser.name,
          status: AssetReturnStatus.PENDING_APPROVAL,
          items: returnItems.map(item => {
              const asset = assets.find(a => a.id === item.assetId);
              return {
                  assetId: item.assetId,
                  assetName: asset?.name || 'Unknown Asset',
                  returnedCondition: item.condition,
                  notes: item.notes,
                  status: 'PENDING'
              };
          })
      };

      await addReturn(newReturnDoc);
      await updateAssetBatch(assetIds, { status: AssetStatus.AWAITING_RETURN });
      
      if (loanRequest.status !== LoanRequestStatus.AWAITING_RETURN) {
        await updateLoanRequest(loanRequest.id, { status: LoanRequestStatus.AWAITING_RETURN });
      }

      useUIStore.getState().setActivePage('request-pinjam', { initialTab: 'returns' });
      useUIStore.getState().setHighlightOnReturn(newReturnDoc.id);
  },

  processReturnBatch: async (returnDocId, acceptedAssetIds, approverName) => {
    set({ isLoading: true });
    try {
        const now = new Date();
        const currentReturns = get().returns;
        const currentLoanRequests = get().loanRequests;
        const { updateAsset, updateAssetBatch } = useAssetStore.getState();
        
        const returnDocIndex = currentReturns.findIndex(r => r.id === returnDocId);
        if (returnDocIndex === -1) throw new Error("Dokumen pengembalian tidak ditemukan.");
        
        const returnDoc = currentReturns[returnDocIndex];
        const loanRequest = currentLoanRequests.find(r => r.id === returnDoc.loanRequestId);
        if (!loanRequest) throw new Error("Request pinjaman terkait tidak ditemukan.");

        const updatedItems = returnDoc.items.map(item => {
            if (acceptedAssetIds.includes(item.assetId)) {
                return { ...item, status: 'ACCEPTED' as const, verificationNotes: 'Diverifikasi OK' };
            } else {
                return { ...item, status: 'REJECTED' as const, verificationNotes: 'Fisik tidak diterima/ditolak saat verifikasi.' };
            }
        });

        const allAccepted = updatedItems.every(i => i.status === 'ACCEPTED');
        const allRejected = updatedItems.every(i => i.status === 'REJECTED');
        const finalDocStatus = allAccepted ? AssetReturnStatus.COMPLETED : 
                          allRejected ? AssetReturnStatus.REJECTED : 
                          AssetReturnStatus.APPROVED;

        const updatedReturnDoc: AssetReturn = {
            ...returnDoc,
            items: updatedItems,
            status: finalDocStatus,
            verifiedBy: approverName,
            verificationDate: now.toISOString()
        };

        const acceptedItems = updatedItems.filter(i => i.status === 'ACCEPTED');
        const rejectedItems = updatedItems.filter(i => i.status === 'REJECTED');

        for (const item of acceptedItems) {
            const isGood = [AssetCondition.GOOD, AssetCondition.USED_OKAY].includes(item.returnedCondition);
            const targetStatus = isGood ? AssetStatus.IN_STORAGE : AssetStatus.DAMAGED;
            
            await updateAsset(item.assetId, { 
                status: targetStatus, 
                condition: item.returnedCondition, 
                currentUser: null, 
                location: 'Gudang Inventori' 
            });
        }

        if (rejectedItems.length > 0) {
            await updateAssetBatch(rejectedItems.map(i => i.assetId), { status: AssetStatus.IN_USE });
        }

        const previouslyReturnedIds = loanRequest.returnedAssetIds || [];
        const newReturnedIds = acceptedItems.map(i => i.assetId);
        const finalReturnedIds = Array.from(new Set([...previouslyReturnedIds, ...newReturnedIds]));
        const allAssignedIds = Object.values(loanRequest.assignedAssetIds || {}).flat();
        const isFullyReturned = allAssignedIds.length > 0 && allAssignedIds.every(id => finalReturnedIds.includes(id));

        const updatedLoanRequest: Partial<LoanRequest> = {
            returnedAssetIds: finalReturnedIds,
            status: isFullyReturned ? LoanRequestStatus.RETURNED : LoanRequestStatus.ON_LOAN,
            actualReturnDate: isFullyReturned ? now.toISOString() : loanRequest.actualReturnDate,
        };
        
        const newReturnsList = [...get().returns];
        newReturnsList[returnDocIndex] = updatedReturnDoc;
        await api.updateData('app_returns', newReturnsList);
        
        await get().updateLoanRequest(loanRequest.id, updatedLoanRequest);
        set({ returns: newReturnsList, isLoading: false });
        
        sendSystemNotif(returnDoc.returnedBy, 'STATUS_CHANGE', returnDocId, `Pengembalian telah diverifikasi (${finalDocStatus})`, false);
        useNotificationStore.getState().addToast(`Verifikasi selesai. Dokumen: ${finalDocStatus}.`, 'success');

    } catch (error: any) {
        useNotificationStore.getState().addToast(error.message || 'Gagal memproses pengembalian.', 'error');
        throw error;
    } finally {
        set({ isLoading: false });
    }
  }
}));
