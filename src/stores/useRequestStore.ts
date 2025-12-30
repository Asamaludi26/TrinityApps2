
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
  
  // Return Logic Refactored
  addReturn: (returnData: AssetReturn) => Promise<void>;
  updateReturn: (id: string, data: Partial<AssetReturn>) => Promise<void>;
  
  processReturnBatch: (returnDocId: string, acceptedAssetIds: string[], approverName: string) => Promise<void>;
  submitReturnRequest: (loanRequestId: string, returnItems: { assetId: string, condition: AssetCondition, notes: string }[]) => Promise<void>;
}

const triggerWAModal = (payload: WAMessagePayload) => {
    useNotificationStore.getState().addToast('Pesan WhatsApp Dibuat', 'success', { duration: 2000 });
    useUIStore.getState().openWAModal(payload);
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
      
      const itemStatuses: Record<number, any> = {};
      requestData.items.forEach(item => {
           itemStatuses[item.id] = { status: 'procurement_needed', approvedQuantity: item.quantity };
      });
      
      const newRequest: Request = {
        ...requestData,
        id: newId,
        docNumber: docNumber,
        status: ItemStatus.PENDING,
        itemStatuses: itemStatuses,
      };

      const updated = [newRequest, ...current];
      await api.updateData('app_requests', updated);
      set({ requests: updated });
  },

  updateRequest: async (id, data) => {
    const current = get().requests;
    const updated = current.map(r => r.id === id ? { ...r, ...data } : r);
    await api.updateData('app_requests', updated);
    set({ requests: updated });
  },

  deleteRequest: async (id) => {
    const current = get().requests;
    const updated = current.filter(r => r.id !== id);
    await api.updateData('app_requests', updated);
    set({ requests: updated });
  },

  updateRequestRegistration: async (requestId, itemId, count) => {
    return true;
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
  
  updateReturn: async (id, data) => {
    const current = get().returns;
    const updated = current.map(r => r.id === id ? { ...r, ...data } : r);
    await api.updateData('app_returns', updated);
    set({ returns: updated });
  },
  
  // --- REFACTORED LOGIC FOR RETURNS (CRITICAL FIX) ---

  submitReturnRequest: async (loanRequestId, returnItems) => {
      const { currentUser } = useAuthStore.getState();
      const { assets, updateAssetBatch } = useAssetStore.getState();
      const { users } = useMasterDataStore.getState();
      const { addSystemNotification } = useNotificationStore.getState();
      const { addReturn, updateLoanRequest, returns, loanRequests } = get();

      const loanRequest = loanRequests.find(lr => lr.id === loanRequestId);

      if (!loanRequest || !currentUser) {
          throw new Error("Request atau pengguna tidak ditemukan.");
      }
      
      const today = new Date();
      const returnDocNumber = generateDocumentNumber('RET', returns, today);
      const assetIds = returnItems.map(item => item.assetId);

      // Create ONE return document containing all items
      const newReturnDoc: AssetReturn = {
          id: `RET-${Date.now()}`,
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
      
      // Update Assets to Awaiting Return (Lock Status)
      await updateAssetBatch(assetIds, { status: AssetStatus.AWAITING_RETURN });
      
      // Update Loan Request status -> AWAITING_RETURN
      if (loanRequest.status !== LoanRequestStatus.AWAITING_RETURN) {
        await updateLoanRequest(loanRequest.id, { status: LoanRequestStatus.AWAITING_RETURN });
      }

      const logisticAdmins = users.filter(u => u.role === 'Admin Logistik' || u.role === 'Super Admin');
      logisticAdmins.forEach(admin => {
          addSystemNotification({
              recipientId: admin.id,
              actorName: currentUser.name,
              type: 'STATUS_CHANGE',
              referenceId: newReturnDoc.docNumber,
              message: `mengajukan pengembalian untuk ${assetIds.length} item. Mohon verifikasi.`
          });
      });

      useUIStore.getState().setActivePage('request-pinjam', { initialTab: 'returns' });
      useUIStore.getState().setHighlightOnReturn(newReturnDoc.id);
  },

  // CRITICAL FIX: Ensure ACID-like updates for Return Verification
  processReturnBatch: async (returnDocId, acceptedAssetIds, approverName) => {
    set({ isLoading: true });
    try {
        const now = new Date();
        // 1. Fetch Fresh Data (Always use get() inside async action to get latest state)
        const currentReturns = get().returns;
        const currentLoanRequests = get().loanRequests;
        const { updateAsset, updateAssetBatch } = useAssetStore.getState();
        
        const returnDocIndex = currentReturns.findIndex(r => r.id === returnDocId);
        if (returnDocIndex === -1) throw new Error("Dokumen pengembalian tidak ditemukan.");
        
        const returnDoc = currentReturns[returnDocIndex];
        const loanRequest = currentLoanRequests.find(r => r.id === returnDoc.loanRequestId);
        if (!loanRequest) throw new Error("Request pinjaman terkait tidak ditemukan.");

        // 2. Update Items Status INSIDE the Return Document
        // Ini menentukan status "Persetujuan" per item
        const updatedItems = returnDoc.items.map(item => {
            if (acceptedAssetIds.includes(item.assetId)) {
                return { ...item, status: 'ACCEPTED' as const, verificationNotes: 'Diverifikasi OK' };
            } else {
                // Item yang tidak dicentang dianggap REJECTED (Ditolak/Dikembalikan ke user)
                return { ...item, status: 'REJECTED' as const, verificationNotes: 'Fisik tidak diterima/ditolak saat verifikasi.' };
            }
        });

        // 3. Determine Final Status of Return Document
        const allAccepted = updatedItems.every(i => i.status === 'ACCEPTED');
        const allRejected = updatedItems.every(i => i.status === 'REJECTED');
        const finalDocStatus = allAccepted ? AssetReturnStatus.COMPLETED : 
                          allRejected ? AssetReturnStatus.REJECTED : 
                          AssetReturnStatus.APPROVED; // Partial (Approved because some are accepted)

        const updatedReturnDoc: AssetReturn = {
            ...returnDoc,
            items: updatedItems,
            status: finalDocStatus, // IMPORTANT: Updates status here to break the UI Loop
            verifiedBy: approverName,
            verificationDate: now.toISOString()
        };

        // 4. Update REAL Asset Statuses (Inventory)
        const acceptedItems = updatedItems.filter(i => i.status === 'ACCEPTED');
        const rejectedItems = updatedItems.filter(i => i.status === 'REJECTED');

        // Accepted -> Masuk Gudang (IN_STORAGE) or Rusak (DAMAGED) based on condition
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

        // Rejected -> Kembali ke User (IN_USE)
        if (rejectedItems.length > 0) {
            await updateAssetBatch(rejectedItems.map(i => i.assetId), { status: AssetStatus.IN_USE });
        }

        // 5. Update LOAN REQUEST Status (The Parent)
        // Hitung total aset yang SUDAH kembali (kumulatif dari semua dokumen return sebelumnya + dokumen ini)
        const previouslyReturnedIds = loanRequest.returnedAssetIds || [];
        const newReturnedIds = acceptedItems.map(i => i.assetId); // Only accepted ones count as returned
        const finalReturnedIds = Array.from(new Set([...previouslyReturnedIds, ...newReturnedIds]));
        
        // Total aset yang dipinjam
        const allAssignedIds = Object.values(loanRequest.assignedAssetIds || {}).flat();
        
        // Cek apakah SEMUA aset yang dipinjam sudah ada di daftar returnedIds
        const isFullyReturned = allAssignedIds.length > 0 && allAssignedIds.every(id => finalReturnedIds.includes(id));

        const updatedLoanRequest: Partial<LoanRequest> = {
            returnedAssetIds: finalReturnedIds,
            // Jika semua aset sudah kembali -> RETURNED. Jika belum -> ON_LOAN (karena sebagian masih dipegang user)
            status: isFullyReturned ? LoanRequestStatus.RETURNED : LoanRequestStatus.ON_LOAN,
            actualReturnDate: isFullyReturned ? now.toISOString() : loanRequest.actualReturnDate,
        };
        
        // 6. COMMIT ALL CHANGES TO STORES
        // Update Return Doc
        const newReturnsList = [...get().returns];
        newReturnsList[returnDocIndex] = updatedReturnDoc;
        await api.updateData('app_returns', newReturnsList); // Persist Return Update
        
        // Update Loan Request
        await get().updateLoanRequest(loanRequest.id, updatedLoanRequest); // Persist Loan Update
        
        // Update local state to trigger UI updates immediately
        set({ returns: newReturnsList, isLoading: false });
        
        // Notifications
        const { addToast, addSystemNotification } = useNotificationStore.getState();
        const requester = useMasterDataStore.getState().users.find(u => u.name === loanRequest.requester);
        
        if (requester) {
            addSystemNotification({
                recipientId: requester.id,
                actorName: approverName,
                type: 'STATUS_CHANGE',
                referenceId: updatedReturnDoc.docNumber,
                message: `memverifikasi pengembalian: ${acceptedItems.length} diterima, ${rejectedItems.length} ditolak.`
            });
        }
        addToast(`Verifikasi selesai. Dokumen: ${finalDocStatus}.`, 'success');

    } catch (error: any) {
        useNotificationStore.getState().addToast(error.message || 'Gagal memproses pengembalian.', 'error');
        throw error;
    } finally {
        set({ isLoading: false });
    }
}
}));
