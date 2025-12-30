import { create } from 'zustand';
import { Request, LoanRequest, AssetReturn, ItemStatus, LoanRequestStatus, AssetReturnStatus, RequestItem, AssetStatus, Handover, AssetCondition } from '../types';
import * as api from '../services/api';
import { useNotificationStore } from './useNotificationStore';
import { useUIStore } from './useUIStore'; 
import { useMasterDataStore } from './useMasterDataStore';
import { useAssetStore } from './useAssetStore'; 
import { useTransactionStore } from './useTransactionStore';
import { generateDocumentNumber } from '../utils/documentNumberGenerator';
import { WhatsAppService, sendWhatsAppSimulation, WAMessagePayload } from '../services/whatsappIntegration';
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
  addReturnBatch: (returnsData: AssetReturn[]) => Promise<void>; 
  updateReturn: (id: string, data: Partial<AssetReturn>) => Promise<void>;
  
  processReturnBatch: (loanRequestId: string, acceptedAssetIds: string[], approverName: string) => Promise<void>;
  submitReturnRequest: (loanRequestId: string, returnItems: { assetId: string, condition: AssetCondition, notes: string }[]) => Promise<void>;
}

const triggerWAModal = (payload: WAMessagePayload) => {
    useNotificationStore.getState().addToast('Pesan WhatsApp Dibuat', 'success', { duration: 2000 });
    useUIStore.getState().openWAModal(payload);
    console.log(`%c [WA SIMULATION - ${payload.groupName}] \n${payload.message}`, 'background: #25D366; color: white; padding: 4px; border-radius: 4px;');
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
    const current = get().requests;
    const maxId = current.reduce((max, r) => {
        const idNum = parseInt(r.id.split('-')[1]);
        return !isNaN(idNum) && idNum > max ? idNum : max;
    }, 0);
    const newId = `REQ-${String(maxId + 1).padStart(3, '0')}`;
    const requestDate = new Date(requestData.requestDate);
    const docNumber = generateDocumentNumber('REQ', current, requestDate);
    
    const allAssets = useAssetStore.getState().assets;
    const inventoryMap = new Map<string, number>();
    for (const asset of allAssets) {
        if (asset.status === AssetStatus.IN_STORAGE) {
            const key = `${asset.name.trim()}|${asset.brand.trim()}`.toLowerCase();
            inventoryMap.set(key, (inventoryMap.get(key) || 0) + 1);
        }
    }

    const itemStatuses: Record<number, any> = {};
    let needsProcurement = false;

    requestData.items.forEach(item => {
        const key = `${item.itemName.trim()}|${item.itemTypeBrand.trim()}`.toLowerCase();
        const availableStock = inventoryMap.get(key) || 0;
        
        const isRestockRequest = item.keterangan?.startsWith('Restock:');

        if (!isRestockRequest && availableStock >= item.quantity) {
            inventoryMap.set(key, availableStock - item.quantity); 
            itemStatuses[item.id] = { status: 'stock_allocated', approvedQuantity: item.quantity, reason: 'Stok tersedia (Auto)' };
        } else {
            itemStatuses[item.id] = { 
              status: 'procurement_needed', 
              approvedQuantity: item.quantity, 
              reason: isRestockRequest ? 'Restock (Wajib Pengadaan)' : 'Perlu Pengadaan' 
            };
            needsProcurement = true;
        }
    });

    const initialStatus = !needsProcurement ? ItemStatus.AWAITING_HANDOVER : ItemStatus.PENDING;
    const newRequest: Request = {
        ...requestData,
        id: newId,
        docNumber: docNumber,
        status: initialStatus,
        itemStatuses: itemStatuses,
    };

    const updated = [newRequest, ...current];
    await api.updateData('app_requests', updated);
    set({ requests: updated });

    const addSystemNotification = useNotificationStore.getState().addSystemNotification;
    const logisticAdmins = useMasterDataStore.getState().users.filter(u => u.role === 'Admin Logistik');
    logisticAdmins.forEach(admin => {
        addSystemNotification({
            recipientId: admin.id,
            actorName: requestData.requester,
            type: 'REQUEST_CREATED',
            referenceId: newId,
            message: `membuat request #${newId}.`
        });
    });

    if (initialStatus === ItemStatus.PENDING) {
        const waPayload = WhatsAppService.generateNewRequestPayload(newRequest);
        await sendWhatsAppSimulation(waPayload);
        triggerWAModal(waPayload);
    }
  },

  updateRequest: async (id, data) => {
    const current = get().requests;
    const originalRequest = current.find(r => r.id === id);
    const updated = current.map(r => r.id === id ? { ...r, ...data } : r);
    await api.updateData('app_requests', updated);
    set({ requests: updated });
    
    if (originalRequest && data.status && data.status !== originalRequest.status) {
        const updatedReq = updated.find(r => r.id === id)!;
        if (data.status === ItemStatus.LOGISTIC_APPROVED) {
            const waPayload = WhatsAppService.generateLogisticApprovalPayload(updatedReq, data.logisticApprover || 'Admin');
            triggerWAModal(waPayload);
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

    const originalRequest = currentRequests[requestIndex];
    const updatedRequest = { ...originalRequest, partiallyRegisteredItems: { ...(originalRequest.partiallyRegisteredItems || {}) } };
    const currentCount = updatedRequest.partiallyRegisteredItems?.[itemId] || 0;
    updatedRequest.partiallyRegisteredItems[itemId] = currentCount + count;

    const allItemsRegistered = updatedRequest.items.every((item) => {
      const status = updatedRequest.itemStatuses?.[item.id];
      if (status?.status === 'stock_allocated' || status?.status === 'rejected') return true;
      const approvedQuantity = status?.approvedQuantity ?? item.quantity;
      const registeredCount = updatedRequest.partiallyRegisteredItems?.[item.id] || 0;
      return registeredCount >= approvedQuantity;
    });

    if (allItemsRegistered) updatedRequest.status = ItemStatus.AWAITING_HANDOVER;
    
    const updatedRequests = [...currentRequests];
    updatedRequests[requestIndex] = updatedRequest;

    await api.updateData('app_requests', updatedRequests);
    set({ requests: updatedRequests });
    return allItemsRegistered;
  },

  addLoanRequest: async (request) => {
    const current = get().loanRequests;
    const updated = [request, ...current];
    await api.updateData('app_loanRequests', updated);
    set({ loanRequests: updated });
  },

  updateLoanRequest: async (id, data) => {
    const current = get().loanRequests;
    const updated = current.map(r => r.id === id ? { ...r, ...data } : r);
    await api.updateData('app_loanRequests', updated);
    set({ loanRequests: updated });
  },
  
  approveLoanRequest: async (id, payload) => {
     const updatedRequest = await api.approveLoanTransaction(id, payload);
     
     const currentLoans = get().loanRequests;
     const updatedLoans = currentLoans.map(r => r.id === id ? updatedRequest : r);
     set({ loanRequests: updatedLoans });

     await useAssetStore.getState().fetchAssets();

     const recipient = useMasterDataStore.getState().users.find(u => u.name === updatedRequest.requester);
     if (recipient) {
         useNotificationStore.getState().addSystemNotification({
             recipientId: recipient.id,
             actorName: payload.approver,
             type: 'REQUEST_APPROVED',
             referenceId: id,
             message: `menyetujui request pinjam Anda.`
         });
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
  },
  
  addReturnBatch: async (returnsData) => {
      const current = get().returns;
      const updated = [...returnsData, ...current];
      await api.updateData('app_returns', updated);
      set({ returns: updated });
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
      const { users } = useMasterDataStore.getState();
      const { addSystemNotification } = useNotificationStore.getState();
      const { addReturnBatch, updateLoanRequest, returns } = get();

      const loanRequest = get().loanRequests.find(lr => lr.id === loanRequestId);

      if (!loanRequest || !currentUser) {
          throw new Error("Request atau pengguna tidak ditemukan.");
      }
      
      const today = new Date();
      const returnDocNumber = generateDocumentNumber('RET', returns, today);

      const assetIds = returnItems.map(item => item.assetId);

      const newReturns: AssetReturn[] = returnItems.map(item => {
          const asset = assets.find(a => a.id === item.assetId);
          return {
              id: `RET-ITEM-${item.assetId}-${Date.now()}`,
              docNumber: returnDocNumber,
              returnDate: today.toISOString(),
              loanRequestId: loanRequest.id,
              loanDocNumber: loanRequest.id,
              assetId: item.assetId,
              assetName: asset?.name || 'N/A',
              returnedBy: currentUser.name,
              receivedBy: 'Admin Logistik',
              returnedCondition: item.condition,
              notes: item.notes,
              status: AssetReturnStatus.PENDING_APPROVAL,
          };
      });

      await addReturnBatch(newReturns);
      await updateAssetBatch(assetIds, { status: AssetStatus.AWAITING_RETURN });
      await updateLoanRequest(loanRequest.id, { status: LoanRequestStatus.AWAITING_RETURN });

      const logisticAdmins = users.filter(u => u.role === 'Admin Logistik' || u.role === 'Super Admin');
      logisticAdmins.forEach(admin => {
          addSystemNotification({
              recipientId: admin.id,
              actorName: currentUser.name,
              type: 'STATUS_CHANGE',
              referenceId: newReturns[0].id,
              message: `mengajukan pengembalian untuk ${assetIds.length} item. Mohon verifikasi.`
          });
      });

      useUIStore.getState().setActivePage('request-pinjam', { initialTab: 'returns' });
      useUIStore.getState().setHighlightOnReturn(newReturns[0].id);
  },

  processReturnBatch: async (loanRequestId, acceptedAssetIds, approverName) => {
    set({ isLoading: true });
    try {
        const now = new Date();
        const { returns, loanRequests } = get();
        const { updateAsset, updateAssetBatch } = useAssetStore.getState();
        
        const returnDocsInBatch = returns.filter(r => r.loanRequestId === loanRequestId && r.status === AssetReturnStatus.PENDING_APPROVAL);
        if (returnDocsInBatch.length === 0) throw new Error("Dokumen pengembalian tidak ditemukan atau sudah diproses.");
        
        const loanRequest = loanRequests.find(r => r.id === loanRequestId);
        if (!loanRequest) throw new Error("Request pinjaman terkait tidak ditemukan.");

        const acceptedDocs: AssetReturn[] = [];
        const rejectedDocs: AssetReturn[] = [];

        const updatedReturns = returns.map(doc => {
            if (doc.loanRequestId === loanRequestId && doc.status === AssetReturnStatus.PENDING_APPROVAL) {
                if (acceptedAssetIds.includes(doc.assetId)) {
                    const updatedDoc = { ...doc, status: AssetReturnStatus.APPROVED, approvedBy: approverName, approvalDate: now.toISOString() };
                    acceptedDocs.push(updatedDoc);
    return updatedDoc;
                } else {
                    const updatedDoc = { ...doc, status: AssetReturnStatus.REJECTED, rejectedBy: approverName, rejectionDate: now.toISOString(), rejectionReason: "Fisik tidak diterima saat verifikasi." };
                    rejectedDocs.push(updatedDoc);
    return updatedDoc;
                }
            }
            return doc;
        });

        for (const doc of acceptedDocs) {
            const targetStatus = [AssetCondition.GOOD, AssetCondition.USED_OKAY].includes(doc.returnedCondition) ? AssetStatus.IN_STORAGE : AssetStatus.DAMAGED;
            await updateAsset(doc.assetId, { status: targetStatus, condition: doc.returnedCondition, currentUser: null, location: 'Gudang Inventori' });
        }

        if (rejectedDocs.length > 0) {
            await updateAssetBatch(rejectedDocs.map(d => d.assetId), { status: AssetStatus.IN_USE });
        }

        const previouslyReturnedIds = loanRequest.returnedAssetIds || [];
        const newAcceptedIds = acceptedDocs.map(d => d.assetId);
        const finalReturnedIds = [...new Set([...previouslyReturnedIds, ...newAcceptedIds])];
        const allAssignedIds = Object.values(loanRequest.assignedAssetIds || {}).flat();
        const isFullyReturned = allAssignedIds.length > 0 && allAssignedIds.every(id => finalReturnedIds.includes(id));
        
        const updatedLoanRequest: Partial<LoanRequest> = {
            returnedAssetIds: finalReturnedIds,
            status: isFullyReturned ? LoanRequestStatus.RETURNED : LoanRequestStatus.ON_LOAN,
            actualReturnDate: isFullyReturned ? now.toISOString() : loanRequest.actualReturnDate,
        };
        await get().updateLoanRequest(loanRequestId, updatedLoanRequest);
        
        await api.updateData('app_returns', updatedReturns);
        set({ returns: updatedReturns, isLoading: false });
        
        const { addToast, addSystemNotification } = useNotificationStore.getState();
        const requester = useMasterDataStore.getState().users.find(u => u.name === loanRequest.requester);
        
        if (requester) {
            const message = `memverifikasi pengembalian: ${acceptedDocs.length} diterima, ${rejectedDocs.length} ditolak.`;
            addSystemNotification({
                recipientId: requester.id,
                actorName: approverName,
                type: 'STATUS_CHANGE',
                referenceId: returnDocsInBatch[0].id,
                message
            });
        }
        addToast(`Verifikasi selesai: ${acceptedDocs.length} diterima, ${rejectedDocs.length} ditolak.`, 'success');

    } catch (error: any) {
        useNotificationStore.getState().addToast(error.message || 'Gagal memproses pengembalian.', 'error');
        throw error;
    } finally {
        set({ isLoading: false });
    }
}
}));
