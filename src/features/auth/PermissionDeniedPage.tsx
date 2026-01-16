
import React from 'react';
import { ExclamationTriangleIcon } from '../../components/icons/ExclamationTriangleIcon';
import { BsArrowLeft } from 'react-icons/bs';

interface PermissionDeniedPageProps {
    onBack?: () => void;
}

const PermissionDeniedPage: React.FC<PermissionDeniedPageProps> = ({ onBack }) => {
    return (
        <div className="flex items-center justify-center h-[calc(100vh-4rem)] p-8 text-center bg-gray-50">
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 max-w-md w-full">
                <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4">
                     <ExclamationTriangleIcon className="w-8 h-8" />
                </div>
                <h1 className="text-2xl font-bold text-gray-800">Akses Ditolak</h1>
                <p className="mt-2 text-gray-600 mb-6">
                    Anda tidak memiliki izin yang cukup untuk mengakses halaman ini.
                    <br />
                    Silakan hubungi Super Admin jika ini adalah kesalahan.
                </p>
                
                {onBack && (
                    <button 
                        onClick={onBack}
                        className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-tm-primary rounded-xl hover:bg-tm-primary-hover transition-all w-full"
                    >
                        <BsArrowLeft className="w-4 h-4" /> Kembali ke Dashboard
                    </button>
                )}
            </div>
        </div>
    );
};

export default PermissionDeniedPage;
