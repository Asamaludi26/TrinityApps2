
import React from 'react';

interface SummaryCardProps {
    title: string;
    value: string | number;
    icon: React.FC<{ className?: string }>;
    onClick?: () => void;
    isActive?: boolean;
    tooltipText?: string;
    color?: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'gray' | 'indigo' | 'teal';
    className?: string;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({ 
    title, 
    value, 
    icon: Icon, 
    onClick, 
    isActive = false, 
    tooltipText, 
    color = 'blue',
    className = ''
}) => {
    const colorStyles = {
        blue: { bg: 'bg-blue-50', text: 'text-blue-600', ring: 'ring-blue-500', accent: 'bg-blue-500' },
        green: { bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-500', accent: 'bg-emerald-500' },
        amber: { bg: 'bg-amber-50', text: 'text-amber-600', ring: 'ring-amber-500', accent: 'bg-amber-500' },
        red: { bg: 'bg-rose-50', text: 'text-rose-600', ring: 'ring-rose-500', accent: 'bg-rose-500' },
        purple: { bg: 'bg-purple-50', text: 'text-purple-600', ring: 'ring-purple-500', accent: 'bg-purple-500' },
        gray: { bg: 'bg-slate-50', text: 'text-slate-600', ring: 'ring-slate-500', accent: 'bg-slate-500' },
        indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', ring: 'ring-indigo-500', accent: 'bg-indigo-500' },
        teal: { bg: 'bg-teal-50', text: 'text-teal-600', ring: 'ring-teal-500', accent: 'bg-teal-500' },
    };

    const style = colorStyles[color] || colorStyles.blue;

    return (
        <div 
            onClick={onClick} 
            className={`
                relative p-5 bg-white rounded-xl shadow-soft border transition-all duration-300 group
                ${onClick ? 'cursor-pointer hover:-translate-y-1 hover:shadow-lg' : ''}
                ${isActive ? `ring-2 ${style.ring} border-transparent` : 'border-slate-100 hover:border-slate-300'}
                ${className}
            `}
            title={tooltipText}
        >
            {/* Active Indicator Dot */}
            {isActive && (
                <div className={`absolute top-3 right-3 w-2 h-2 rounded-full ${style.accent} shadow-sm animate-pulse`}></div>
            )}

            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-1">{title}</p>
                    <h3 className="text-2xl font-bold text-slate-800 truncate tracking-tight font-display">
                        {value}
                    </h3>
                </div>
                <div className={`flex items-center justify-center flex-shrink-0 w-12 h-12 rounded-xl ${style.bg} ${style.text} transition-transform group-hover:scale-110 shadow-sm`}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
        </div>
    );
};
