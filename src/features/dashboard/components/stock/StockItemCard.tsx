
import React from 'react';
import { ArchiveBoxIcon } from '../../../../components/icons/ArchiveBoxIcon';
import { StockItem } from '../../hooks/useStockAnalysis';

interface StockItemCardProps {
    item: StockItem;
    type: 'critical' | 'low';
}

export const StockItemCard: React.FC<StockItemCardProps> = ({ item, type }) => {
    const isCritical = type === 'critical';
    const borderColor = isCritical ? 'hover:border-red-200' : 'hover:border-amber-200';
    const shadowColor = isCritical ? 'hover:shadow-red-100/20' : 'hover:shadow-amber-100/20';
    const accentColor = isCritical ? 'bg-red-500' : 'bg-amber-400';
    
    const badgeBg = isCritical ? 'bg-red-50' : 'bg-amber-50';
    const badgeText = isCritical ? 'text-red-700' : 'text-amber-700';
    const badgeBorder = isCritical ? 'border-red-100' : 'border-amber-100';

    return (
        <div 
            className={`flex items-center justify-between p-4 bg-white border border-gray-100 ${borderColor} hover:shadow-md ${shadowColor} rounded-xl transition-all group relative overflow-hidden`}
        >
            {/* Side accent bar */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${accentColor}`}></div>
            
            <div className="min-w-0 flex-1 pr-4 pl-2">
                <p className="text-sm font-bold text-gray-800 truncate" title={item.name}>{item.name}</p>
                <p className="text-xs text-gray-500 truncate mt-0.5">{item.brand}</p>
            </div>
            
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${badgeBg} ${badgeText} ${badgeBorder}`}>
                <ArchiveBoxIcon className="w-3.5 h-3.5" />
                {item.count}
            </div>
        </div>
    );
};
