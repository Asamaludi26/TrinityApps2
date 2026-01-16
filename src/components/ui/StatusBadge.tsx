
import React from 'react';
import { BsCheckCircleFill, BsXCircleFill, BsClockFill, BsExclamationCircleFill, BsDashCircleFill, BsPlayCircleFill, BsArchiveFill } from 'react-icons/bs';

type StatusIntent = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'purple' | 'indigo' | 'orange';

interface StatusBadgeProps {
  status: string;
  className?: string;
  size?: 'sm' | 'md';
  icon?: boolean;
}

const getStatusConfig = (status: string): { intent: StatusIntent; label: string } => {
  const s = status.toLowerCase();
  
  // Mapping logika status ke Intent warna
  if (['active', 'completed', 'approved', 'disetujui', 'selesai', 'arrived', 'returned', 'diterima'].some(k => s.includes(k)) && !s.includes('awaiting')) 
    return { intent: 'success', label: status };
  
  if (['pending', 'menunggu', 'awaiting', 'on_loan', 'dipinjam', 'under_repair'].some(k => s.includes(k))) 
    return { intent: 'warning', label: status };
    
  if (['rejected', 'cancelled', 'damaged', 'rusak', 'ditolak', 'dibatalkan', 'overdue', 'terlambat'].some(k => s.includes(k))) 
    return { intent: 'danger', label: status };
    
  if (['in_progress', 'purchasing', 'delivery', 'dikirim', 'maintenance'].some(k => s.includes(k))) 
    return { intent: 'info', label: status };

  if (['in_use', 'digunakan', 'terpasang'].some(k => s.includes(k)))
    return { intent: 'indigo', label: status };

  if (['in_storage', 'di gudang', 'disimpan'].some(k => s.includes(k)))
    return { intent: 'neutral', label: status };

  return { intent: 'neutral', label: status };
};

const styleMap: Record<StatusIntent, string> = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-rose-50 text-rose-700 border-rose-200',
  info: 'bg-sky-50 text-sky-700 border-sky-200',
  neutral: 'bg-slate-100 text-slate-600 border-slate-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  orange: 'bg-orange-50 text-orange-700 border-orange-200',
};

const iconMap: Record<StatusIntent, React.FC<any>> = {
  success: BsCheckCircleFill,
  warning: BsClockFill,
  danger: BsXCircleFill,
  info: BsPlayCircleFill,
  neutral: BsArchiveFill,
  purple: BsExclamationCircleFill,
  indigo: BsCheckCircleFill,
  orange: BsExclamationCircleFill,
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '', size = 'sm', icon = false }) => {
  const { intent, label } = getStatusConfig(status);
  const styleClass = styleMap[intent];
  const Icon = iconMap[intent];

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span 
      className={`inline-flex items-center gap-1.5 font-bold uppercase tracking-wide rounded-full border ${styleClass} ${sizeClass} ${className}`}
    >
      {icon && <Icon className="w-3 h-3 opacity-80" />}
      {label}
    </span>
  );
};
