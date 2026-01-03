
import { useState, useEffect } from 'react';

export const useAssetCalculations = (purchaseDate: Date | null, warrantyEndDate: Date | null) => {
    const [warrantyPeriod, setWarrantyPeriod] = useState<number | ''>('');

    // Hitung periode garansi saat tanggal berubah
    useEffect(() => {
        if (purchaseDate && warrantyEndDate && warrantyEndDate > purchaseDate) {
            const timeDiff = warrantyEndDate.getTime() - purchaseDate.getTime();
            const dayDiff = timeDiff / (1000 * 3600 * 24);
            const totalMonths = Math.round(dayDiff / 30.44);
            setWarrantyPeriod(totalMonths > 0 ? totalMonths : '');
        } else if (!warrantyEndDate) {
            setWarrantyPeriod('');
        }
    }, [purchaseDate, warrantyEndDate]);

    return {
        warrantyPeriod,
        setWarrantyPeriod
    };
};
