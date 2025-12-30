
import React from 'react';

interface PreviewRowProps {
    label: string;
    value?: React.ReactNode;
    children?: React.ReactNode;
    fullWidth?: boolean;
}

/**
 * Komponen standar untuk menampilkan pasangan Label-Value dalam Modal Preview.
 * Memastikan konsistensi tipografi dan spacing.
 */
export const PreviewRow: React.FC<PreviewRowProps> = ({ label, value, children, fullWidth = false }) => (
    <div className={fullWidth ? 'sm:col-span-2' : ''}>
        <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</dt>
        <dd className="mt-1 text-sm text-gray-800 break-words">{value || children || '-'}</dd>
    </div>
);
