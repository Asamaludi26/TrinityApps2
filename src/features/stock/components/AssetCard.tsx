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
import { BsTag, BsCalendarCheck, BsUpcScan, BsRulers, BsScissors, BsLightningFill } from 'react-icons/bs';

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

const InfoItem: React.FC<{ icon: React.FC<{className?:string}>; label: string; children: React.ReactNode; className?: string }> = ({ icon: Icon, label, children, className = '' }) => (
    <div className={className}>
        <dt className="flex items-center text-xs font-medium text-gray-500">
            <Icon className="w-3.5 h-3.5 mr-1.5" />
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
    unitLabel?: string; // New Prop for Measurement Unit
}> = ({ asset, onShowDetail, onReportDamage, isLoaned, loanId, returnDate, onReturn, unitLabel = 'Unit' }) => {
    const addNotification = useNotification();
    const ConditionIcon = getConditionInfo(asset.condition).Icon;
    const conditionColor = getConditionInfo(asset.condition).color;

    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        addNotification(`${label} berhasil disalin!`, 'success');
    };

    // --- Measurement Logic ---
    const isMeasurement = asset.initialBalance !== undefined && asset.currentBalance !== undefined;
    const isCutPiece = asset.name.includes('(Potongan)') || asset.id.includes('-PART-');
    
    const currentBal = asset.currentBalance || 0;
    const initialBal = asset.initialBalance || 0;
    const percent = initialBal > 0 ? (currentBal / initialBal) * 100 : 0;

    const progressBarColor = percent < 20 ? 'bg-red-500' : percent < 50 ? 'bg-amber-400' : 'bg-green-500';

    return (
        <div className="flex flex-col bg-white border border-gray-200/80 rounded-xl shadow-sm transition-all duration-300 hover:shadow-lg hover:border-tm-accent/50 group">
            <div className="p-4 border-b border-gray-100">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                             <h3 className="text-base font-bold text-tm-dark leading-tight line-clamp-2" title={asset.name}>
                                {asset.name}
                            </h3>
                            {isMeasurement && (
                                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${isCutPiece ? 'bg-orange-50 text-orange-700 border-orange-200' : 'bg-indigo-50 text-indigo-700 border-indigo-200'}`}>
                                    {isCutPiece ? <BsScissors className="w-3 h-3" /> : <BsRulers className="w-3 h-3" />}
                                    {isCutPiece ? 'Potongan' : 'Utuh'}
                                </span>
                            )}
                        </div>

                        {/* Status Badges */}
                        <div className="flex flex-wrap gap-2 mt-1">
                            {isLoaned && (
                                <div className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold text-purple-800 bg-purple-50 border border-purple-100 rounded-full">
                                    <JournalCheckIcon className="w-3 h-3" />
                                    <span>Pinjaman</span>
                                </div>
                            )}
                             <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border whitespace-nowrap ${getStatusClass(asset.status)}`}>
                                {asset.status}
                            </span>
                        </div>
                    </div>
                </div>
                 <p className="flex items-center gap-2 mt-2 text-xs font-mono text-gray-500 bg-gray-50 px-2 py-1 rounded w-fit">
                    {asset.id}
                    <button onClick={(e) => { e.stopPropagation(); copyToClipboard(asset.id, 'ID Aset'); }} title="Salin ID Aset" className="text-gray-400 hover:text-tm-primary transition-colors">
                        <CopyIcon className="w-3 h-3" />
                    </button>
                </p>
            </div>

            <div className="p-4 flex-grow space-y-4">
                {/* Measurement Visualization */}
                {isMeasurement ? (
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <div className="flex justify-between items-end mb-1">
                             <span className="text-xs font-bold text-gray-600 flex items-center gap-1">
                                <BsLightningFill className="text-amber-500"/> Sisa Isi
                             </span>
                             <div className="text-right">
                                 <span className="text-lg font-bold text-gray-800">{currentBal.toLocaleString('id-ID')}</span>
                                 <span className="text-xs text-gray-500 ml-1">/ {initialBal.toLocaleString('id-ID')} {unitLabel}</span>
                             </div>
                        </div>
                        <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                                className={`h-full rounded-full transition-all duration-500 ${progressBarColor}`}
                                style={{ width: `${percent}%` }}
                            ></div>
                        </div>
                    </div>
                ) : null}

                <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                    <InfoItem icon={BsTag} label="Kategori" className="col-span-2 sm:col-span-1">{asset.category}</InfoItem>
                    
                    {isLoaned ? (
                        <InfoItem icon={BsCalendarCheck} label="Tgl Pengembalian">
                            {returnDate 
                                ? new Date(returnDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) 
                                : <span className="italic text-gray-400">Belum ditentukan</span>}
                        </InfoItem>
                    ) : (
                        <InfoItem icon={BsCalendarCheck} label="Tgl Diterima">
                             {asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                        </InfoItem>
                    )}
                    
                    {!isMeasurement && (
                         <InfoItem icon={BsUpcScan} label="Nomor Seri" className="col-span-2">
                            {asset.serialNumber ? (
                                 <span className="flex items-center gap-1.5 font-mono text-xs">
                                    <span className="truncate max-w-[120px]" title={asset.serialNumber}>{asset.serialNumber}</span>
                                    <button onClick={(e) => { e.stopPropagation(); copyToClipboard(asset.serialNumber!, 'Nomor Seri'); }} title="Salin SN" className="text-gray-400 hover:text-tm-primary">
                                        <CopyIcon className="w-3 h-3" />
                                    </button>
                                </span>
                            ) : '-'}
                        </InfoItem>
                    )}
                    
                    <InfoItem icon={ConditionIcon} label="Kondisi">
                        <span className={conditionColor}>{asset.condition}</span>
                    </InfoItem>
                </div>
            </div>

             <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 border-t rounded-b-xl">
                <button
                    onClick={() => onShowDetail({ type: 'asset', id: asset.id })}
                    className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-gray-700 transition-colors bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-100 hover:text-tm-primary"
                >
                    <EyeIcon className="w-3.5 h-3.5"/>
                    Detail
                </button>
                
                {isLoaned ? (
                    asset.status === 'Menunggu Pengembalian' ? (
                        <button
                            disabled
                            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-blue-800 bg-blue-50 border border-blue-200 rounded-lg cursor-not-allowed opacity-70"
                        >
                            <SpinnerIcon className="w-3.5 h-3.5 animate-spin"/>
                            Proses...
                        </button>
                    ) : (
                        <button
                            onClick={onReturn}
                            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-white transition-colors bg-purple-600 border border-purple-600 rounded-lg shadow-sm hover:bg-purple-700"
                        >
                            <DismantleIcon className="w-3.5 h-3.5"/>
                            Kembalikan
                        </button>
                    )
                ) : (
                    <button
                        onClick={() => onReportDamage(asset)}
                        disabled={asset.status === 'Rusak'}
                        className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-white transition-colors bg-amber-500 border border-amber-500 rounded-lg shadow-sm hover:bg-amber-600 disabled:bg-gray-300 disabled:border-gray-300 disabled:cursor-not-allowed"
                    >
                        <WrenchIcon className="w-3.5 h-3.5"/>
                        Laporkan
                    </button>
                )}
            </div>
        </div>
    );
};