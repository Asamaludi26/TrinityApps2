import React from 'react';
import { Asset, AssetCondition, PreviewData } from '../../../types';
import { ClickableLink } from '../../../components/ui/ClickableLink';
import { CopyIcon } from '../../../components/icons/CopyIcon';
import { useNotification } from '../../../providers/NotificationProvider';
import { WrenchIcon } from '../../../components/icons/WrenchIcon';
import { EyeIcon } from '../../../components/icons/EyeIcon';
import { DismantleIcon } from '../../../components/icons/DismantleIcon';
import { JournalCheckIcon } from '../../../components/icons/JournalCheckIcon';
import { CheckIcon } from '../../../components/icons/CheckIcon';
import { SpinnerIcon } from '../../../components/icons/SpinnerIcon';
import { getStatusClass } from '../../assetRegistration/RegistrationPage';
// FIX: Import missing react-icons
import { BsTag, BsCalendarCheck, BsUpcScan } from 'react-icons/bs';

const getConditionInfo = (condition: AssetCondition) => {
    switch (condition) {
        case AssetCondition.BRAND_NEW:
        case AssetCondition.GOOD:
        case AssetCondition.USED_OKAY:
            return { Icon: CheckIcon, color: 'text-success' };
        case AssetCondition.MINOR_DAMAGE:
            return { Icon: WrenchIcon, color: 'text-warning-text' };
        case AssetCondition.MAJOR_DAMAGE:
        case AssetCondition.FOR_PARTS:
            return { Icon: WrenchIcon, color: 'text-danger-text' };
        default:
            return { Icon: WrenchIcon, color: 'text-gray-500' };
    }
};

const InfoItem: React.FC<{ icon: React.FC<{className?:string}>; label: string; children: React.ReactNode; }> = ({ icon: Icon, label, children }) => (
    <div>
        <dt className="flex items-center text-xs font-medium text-gray-500">
            <Icon className="w-4 h-4 mr-2" />
            <span>{label}</span>
        </dt>
        <dd className="mt-1 text-sm font-semibold text-gray-800 break-words">{children}</dd>
    </div>
);

export const AssetCard: React.FC<{
    asset: Asset;
    onShowDetail: (data: PreviewData) => void;
    onReportDamage: (asset: Asset) => void;
    isLoaned?: boolean;
    loanId?: string;
    returnDate?: string | null;
    onReturn?: () => void;
}> = ({ asset, onShowDetail, onReportDamage, isLoaned, loanId, returnDate, onReturn }) => {
    const addNotification = useNotification();
    const ConditionIcon = getConditionInfo(asset.condition).Icon;
    const conditionColor = getConditionInfo(asset.condition).color;

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        addNotification(`${label} berhasil disalin!`, 'success');
    };

    return (
        <div className="flex flex-col bg-white border border-gray-200/80 rounded-xl shadow-sm transition-all duration-300 hover:shadow-lg hover:border-tm-accent/50">
            <div className="p-4 border-b">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-tm-dark leading-tight">{asset.name}</h3>
                        {isLoaned && (
                            <div className="mt-1.5 flex items-center gap-2 px-2 py-1 text-xs font-semibold text-purple-800 bg-purple-100 rounded-full w-fit">
                                <JournalCheckIcon className="w-4 h-4" />
                                <span>Aset Pinjaman</span>
                            </div>
                        )}
                    </div>
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${getStatusClass(asset.status)}`}>
                        {asset.status}
                    </span>
                </div>
                 <p className="flex items-center gap-2 mt-1 text-xs font-mono text-gray-500">
                    {asset.id}
                    <button onClick={() => copyToClipboard(asset.id, 'ID Aset')} title="Salin ID Aset" className="text-gray-400 hover:text-tm-primary">
                        <CopyIcon className="w-3.5 h-3.5" />
                    </button>
                </p>
            </div>
            <div className="grid grid-cols-2 gap-y-4 gap-x-6 p-4 flex-grow">
                <InfoItem icon={BsTag} label="Kategori">{asset.category}</InfoItem>
                {isLoaned ? (
                    <InfoItem icon={BsCalendarCheck} label="Tgl Pengembalian">
                        {returnDate 
                            ? new Date(returnDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) 
                            : <span className="italic">Belum ditentukan</span>}
                    </InfoItem>
                ) : (
                    <InfoItem icon={BsCalendarCheck} label="Tgl Diterima">
                         {asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString('id-ID') : 'N/A'}
                    </InfoItem>
                )}
                <InfoItem icon={BsUpcScan} label="Nomor Seri">
                    {asset.serialNumber ? (
                         <span className="flex items-center gap-1.5 font-mono">
                            <span className="truncate" title={asset.serialNumber}>{asset.serialNumber}</span>
                            <button onClick={() => copyToClipboard(asset.serialNumber!, 'Nomor Seri')} title="Salin Nomor Seri" className="text-gray-400 hover:text-tm-primary">
                                <CopyIcon className="w-3.5 h-3.5" />
                            </button>
                        </span>
                    ) : '-'}
                </InfoItem>
                <InfoItem icon={ConditionIcon} label="Kondisi">
                    <span className={conditionColor}>{asset.condition}</span>
                </InfoItem>
            </div>
             <div className="grid grid-cols-2 gap-2 p-3 bg-gray-50/50 border-t rounded-b-xl">
                <button
                    onClick={() => onShowDetail({ type: 'asset', id: asset.id })}
                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-tm-primary transition-colors bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-tm-light"
                >
                    <EyeIcon className="w-4 h-4"/>
                    Detail
                </button>
                
                {isLoaned ? (
                    asset.status === 'Menunggu Pengembalian' ? (
                        <button
                            disabled
                            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-blue-800 transition-colors bg-blue-100 border border-blue-100 rounded-lg shadow-sm cursor-not-allowed"
                        >
                            <SpinnerIcon className="w-4 h-4 animate-spin"/>
                            Proses Pengembalian
                        </button>
                    ) : (
                        <button
                            onClick={onReturn}
                            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-white transition-colors bg-purple-600 border border-purple-600 rounded-lg shadow-sm hover:bg-purple-700"
                        >
                            <DismantleIcon className="w-4 h-4"/>
                            Kembalikan
                        </button>
                    )
                ) : (
                    <button
                        onClick={() => onReportDamage(asset)}
                        disabled={asset.status === 'Rusak'}
                        className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-sm font-semibold text-white transition-colors bg-amber-500 border border-amber-500 rounded-lg shadow-sm hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                        <WrenchIcon className="w-4 h-4"/>
                        Laporkan
                    </button>
                )}
            </div>
        </div>
    );
};