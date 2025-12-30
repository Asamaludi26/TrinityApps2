import React from 'react';
import { ShoppingCartIcon } from '../../../../components/icons/ShoppingCartIcon';
import { InboxIcon } from '../../../../components/icons/InboxIcon';
import { StockItem } from '../../hooks/useStockAnalysis';
import { StockItemCard } from './StockItemCard';

interface LowStockPanelProps {
    items: StockItem[];
    onRestock: (items: StockItem[]) => void;
}

export const LowStockPanel: React.FC<LowStockPanelProps> = ({ items, onRestock }) => {
    const handleRestockLow = () => {
        if (items.length === 0) return;
        onRestock(items);
    };

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center text-center text-gray-400 space-y-3 py-12 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center text-green-500 shadow-sm border border-green-100">
                    <InboxIcon className="w-7 h-7" />
                </div>
                <div>
                    <p className="text-sm font-bold text-gray-700">Stok Stabil</p>
                    <p className="text-xs mt-1 text-gray-500">Tidak ada item yang mencapai ambang batas minimum.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-end mb-4">
                <button
                    onClick={handleRestockLow}
                    className="flex items-center gap-2 px-4 py-1.5 text-xs font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-lg transition-all shadow-sm hover:shadow-md active:scale-95 border border-amber-200"
                >
                    <ShoppingCartIcon className="w-3.5 h-3.5" />
                    Restock Barang Menipis ({items.length})
                </button>
            </div>

            {/* Grid List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {items.map((item, idx) => (
                    <StockItemCard key={`${item.name}-${idx}`} item={item} type="low" />
                ))}
            </div>
        </div>
    );
};