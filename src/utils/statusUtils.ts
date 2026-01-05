
import { AssetStatus, CustomerStatus, ItemStatus } from '../types';

export const getAssetStatusClass = (status: AssetStatus | string) => {
    switch (status) {
        case AssetStatus.IN_USE: return 'bg-info-light text-info-text';
        case AssetStatus.IN_CUSTODY: return 'bg-purple-100 text-purple-800 border border-purple-200'; // New Style
        case AssetStatus.IN_STORAGE: return 'bg-gray-100 text-gray-800';
        case AssetStatus.UNDER_REPAIR: return 'bg-blue-100 text-blue-700';
        case AssetStatus.OUT_FOR_REPAIR: return 'bg-purple-100 text-purple-700';
        case AssetStatus.DAMAGED: return 'bg-warning-light text-warning-text';
        case AssetStatus.DECOMMISSIONED: return 'bg-red-200 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
    }
};

export const getCustomerStatusClass = (status: CustomerStatus | string) => {
    switch (status) {
        case CustomerStatus.ACTIVE: return 'bg-success-light text-success-text';
        case CustomerStatus.INACTIVE: return 'bg-gray-200 text-gray-800';
        case CustomerStatus.SUSPENDED: return 'bg-warning-light text-warning-text';
        default: return 'bg-gray-100 text-gray-800';
    }
};

export const getRequestStatusClass = (status: ItemStatus | string) => {
    switch (status) {
        case ItemStatus.PENDING: return 'bg-warning-light text-warning-text';
        case ItemStatus.LOGISTIC_APPROVED: return 'bg-info-light text-info-text';
        case ItemStatus.AWAITING_CEO_APPROVAL: return 'bg-purple-100 text-purple-700';
        case ItemStatus.APPROVED: return 'bg-sky-100 text-sky-700';
        case ItemStatus.PURCHASING: return 'bg-blue-100 text-blue-700';
        case ItemStatus.IN_DELIVERY: return 'bg-purple-100 text-purple-700';
        case ItemStatus.ARRIVED: return 'bg-teal-100 text-teal-700';
        case ItemStatus.COMPLETED: return 'bg-success-light text-success-text';
        case ItemStatus.REJECTED: return 'bg-danger-light text-danger-text';
        case ItemStatus.CANCELLED: return 'bg-gray-200 text-gray-700';
        case ItemStatus.AWAITING_HANDOVER: return 'bg-emerald-100 text-emerald-700';
        case ItemStatus.IN_PROGRESS: return 'bg-gray-200 text-gray-800';
        default: return 'bg-gray-100 text-gray-800';
    }
};
