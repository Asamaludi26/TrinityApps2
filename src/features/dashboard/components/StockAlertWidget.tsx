import React, { useState } from 'react';
import { Asset, Page } from '../../../types';
import { ExclamationTriangleIcon } from '../../../components/icons/ExclamationTriangleIcon';
import { useStockAnalysis, StockItem } from '../hooks/useStockAnalysis';
import { CriticalStockPanel } from './stock/CriticalStockPanel';
import { LowStockPanel } from './stock/LowStockPanel';

interface StockAlertWidgetProps {
    assets: Asset[];
    setActivePage: (page: Page, filters?: any) => void;
    thresholds: Record<string, number>;
}

export const StockAlertWidget: React.FC<StockAlertWidgetProps> = ({ assets, setActivePage, thresholds }) => {
    const [activeTab, setActiveTab] = useState<'critical' | 'low'>('critical');
    
    const { criticalItems, lowItems, totalCritical, totalLow } = useStockAnalysis(assets, thresholds);

    const handleNavigateToRestock = (itemsToRestock: StockItem[]) => {
        const prefillItems = itemsToRestock.map(item => {
            return {
                name: item.name,
                brand: item.brand,
                currentStock: item.count,
                threshold: item.threshold // Menggunakan threshold langsung dari item
            };
        });

        setActivePage('request', { prefillItems });
    };

    const bgSoft = activeTab === 'critical' ? 'bg-red-50' : 'bg-amber-50';
    const textStrong = activeTab === 'critical' ? 'text-red-700' : 'text-amber-700';

    return (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${bgSoft} ${textStrong}`}>
                        <ExclamationTriangleIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900">Peringatan Stok</h3>
                        <p className="text-sm text-gray-500">Pantau ketersediaan aset yang kritis</p>
                    </div>
                </div>
                
                <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100">
                    <button
                        onClick={() => setActiveTab('critical')}
                        className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
                            activeTab === 'critical' 
                                ? 'bg-white text-red-600 shadow-sm ring-1 ring-black/5' 
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <span className={`w-2 h-2 rounded-full ${activeTab === 'critical' ? 'bg-red-500' : 'bg-gray-300'}`}></span>
                        Habis ({totalCritical})
                    </button>
                    <button
                        onClick={() => setActiveTab('low')}
                        className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${
                            activeTab === 'low' 
                                ? 'bg-white text-amber-600 shadow-sm ring-1 ring-black/5' 
                                : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        <span className={`w-2 h-2 rounded-full ${activeTab === 'low' ? 'bg-amber-500' : 'bg-gray-300'}`}></span>
                        Menipis ({totalLow})
                    </button>
                </div>
            </div>

            <div className="p-6 bg-white/50">
                {activeTab === 'critical' ? (
                    <CriticalStockPanel 
                        items={criticalItems} 
                        onRestock={handleNavigateToRestock} 
                    />
                ) : (
                    <LowStockPanel 
                        items={lowItems} 
                        onRestock={handleNavigateToRestock} 
                    />
                )}
            </div>
        </div>
    );
};
