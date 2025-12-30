
import React from 'react';
import { Customer, User, Request, Handover, Dismantle, Asset, PreviewData } from '../../../types';
import { ClickableLink } from '../../../components/ui/ClickableLink';
import { getCustomerStatusClass, getRequestStatusClass } from '../../../utils/statusUtils';
import { PreviewRow } from './PreviewRow';

// --- Customer Preview ---
interface CustomerPreviewProps {
    customer: Customer;
    assets: Asset[];
    onShowPreview: (data: PreviewData) => void;
}

export const CustomerPreview: React.FC<CustomerPreviewProps> = ({ customer, assets, onShowPreview }) => (
    <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
        <PreviewRow label="ID Pelanggan" value={customer.id} />
        <PreviewRow label="Status" value={<span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getCustomerStatusClass(customer.status)}`}>{customer.status}</span>} />
        <PreviewRow label="Telepon" value={customer.phone} />
        <PreviewRow label="Email" value={customer.email} />
        <PreviewRow label="Alamat" value={customer.address} fullWidth/>
        <PreviewRow label="Aset Terpasang" fullWidth>
            <ClickableLink onClick={() => onShowPreview({type: 'customerAssets', id: customer.id})}>Lihat {assets.filter(a => a.currentUser === customer.id).length} aset</ClickableLink>
        </PreviewRow>
    </dl>
);

export const CustomerAssetsPreview: React.FC<{ customer: Customer, assets: Asset[], onShowPreview: (data: PreviewData) => void }> = ({ customer, assets, onShowPreview }) => {
    const customerAssets = assets.filter(a => a.currentUser === customer.id);
    return (
        <div>
            <h4 className="mb-4 pb-2 text-lg font-semibold text-gray-900 border-b">Aset untuk {customer.name}:</h4>
            <ul className="space-y-2">
                {customerAssets.length > 0 ? customerAssets.map(asset => (
                    <li key={asset.id} className="p-2 text-sm border rounded-md bg-gray-50">
                        <ClickableLink onClick={() => onShowPreview({type: 'asset', id: asset.id})}>{asset.name} ({asset.id})</ClickableLink>
                    </li>
                )) : <p className="text-sm text-gray-500">Tidak ada aset terpasang.</p>}
            </ul>
        </div>
    );
};

// --- User Preview ---
export const UserPreview: React.FC<{ user: User, divisionName: string }> = ({ user, divisionName }) => {
    const getRoleClass = (role: User['role']) => {
        switch(role) {
            case 'Super Admin': return 'bg-purple-100 text-purple-800';
            case 'Admin Logistik': return 'bg-info-light text-info-text';
            case 'Admin Purchase': return 'bg-teal-100 text-teal-800';
            case 'Leader': return 'bg-sky-100 text-sky-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    }
    return (
        <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
            <PreviewRow label="Email" value={user.email} />
            <PreviewRow label="Role">
                <span className={`px-2.5 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleClass(user.role)}`}>
                    {user.role}
                </span>
            </PreviewRow>
            <PreviewRow label="Divisi" value={divisionName} />
        </dl>
    );
};

// --- Request Preview ---
export const RequestPreview: React.FC<{ request: Request }> = ({ request }) => (
    <div className="space-y-4">
        <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-3">
            <PreviewRow label="Tanggal" value={request.requestDate} />
            <PreviewRow label="Pemohon" value={request.requester} />
            <PreviewRow label="Status" value={<span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getRequestStatusClass(request.status)}`}>{request.status}</span>} />
        </dl>
        <div>
            <h4 className="text-sm font-semibold text-gray-600 uppercase border-b pb-2 mb-2">Item yang Diminta</h4>
            <ul className="mt-2 space-y-2">
                {request.items.map(item => (
                    <li key={item.id} className="p-3 text-sm border rounded-md bg-gray-50">
                        <div className="flex items-start justify-between">
                            <div className="flex-1 pr-4">
                                <p className="font-semibold text-gray-800">{item.itemName}</p>
                                <p className="text-xs text-gray-500">{item.itemTypeBrand}</p>
                            </div>
                            <p className="font-bold text-tm-primary">{item.quantity} unit</p>
                        </div>
                        {item.keterangan && (
                            <p className="mt-2 pt-2 text-xs text-gray-600 border-t border-gray-200 italic">
                                "{item.keterangan}"
                            </p>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    </div>
);

// --- Handover Preview ---
export const HandoverPreview: React.FC<{ handover: Handover, onShowPreview: (data: PreviewData) => void }> = ({ handover, onShowPreview }) => (
    <div className="space-y-4">
        <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
            <PreviewRow label="No. Dokumen" value={handover.docNumber} />
            <PreviewRow label="Tanggal" value={handover.handoverDate} />
            <PreviewRow label="No. Referensi" value={handover.woRoIntNumber || '-'} />
            <PreviewRow label="Status" value={<span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getRequestStatusClass(handover.status)}`}>{handover.status}</span>} />
            <PreviewRow label="Menyerahkan" value={<ClickableLink onClick={() => onShowPreview({type: 'user', id: handover.menyerahkan})}>{handover.menyerahkan}</ClickableLink>} />
            <PreviewRow label="Penerima" value={<ClickableLink onClick={() => onShowPreview({type: 'user', id: handover.penerima})}>{handover.penerima}</ClickableLink>} />
        </dl>
        <div>
            <h4 className="text-sm font-semibold text-gray-600 uppercase border-b pb-2 mb-2">Item</h4>
            <ul className="mt-2 space-y-2">
                {handover.items.map(item => (
                    <li key={item.id} className="p-2 text-xs border rounded-md bg-gray-50">
                        <ClickableLink onClick={() => onShowPreview({type: 'asset', id: item.assetId!})}>{item.itemName} ({item.assetId})</ClickableLink>
                    </li>
                ))}
            </ul>
        </div>
    </div>
);

// --- Dismantle Preview ---
export const DismantlePreview: React.FC<{ dismantle: Dismantle, onShowPreview: (data: PreviewData) => void }> = ({ dismantle, onShowPreview }) => (
    <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
        <PreviewRow label="Tanggal" value={dismantle.dismantleDate} />
        <PreviewRow label="Teknisi" value={<ClickableLink onClick={() => onShowPreview({type: 'user', id: dismantle.technician})}>{dismantle.technician}</ClickableLink>} />
        <PreviewRow label="Pelanggan" value={<ClickableLink onClick={() => onShowPreview({type: 'customer', id: dismantle.customerId})}>{dismantle.customerName}</ClickableLink>} />
        <PreviewRow label="Aset Ditarik" value={<ClickableLink onClick={() => onShowPreview({type: 'asset', id: dismantle.assetId})}>{dismantle.assetName}</ClickableLink>} />
        <PreviewRow label="Kondisi" value={dismantle.retrievedCondition} />
    </dl>
);
