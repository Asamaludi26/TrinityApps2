
import { useMemo, useState } from 'react';

interface FilterConfig<T> {
    data: T[];
    searchKeys: (keyof T)[];
    // Filter functions map: key is the filter name, value is validation function
    filters?: Record<string, (item: T, filterValue: any) => boolean>;
}

export const useGenericFilter = <T extends Record<string, any>>({ data, searchKeys, filters: filterRules }: FilterConfig<T>) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});

    const filteredData = useMemo(() => {
        return data.filter(item => {
            // 1. Search Logic
            const searchLower = searchQuery.toLowerCase();
            const matchesSearch = searchQuery === '' || searchKeys.some(key => {
                const val = item[key];
                return val && String(val).toLowerCase().includes(searchLower);
            });

            if (!matchesSearch) return false;

            // 2. Custom Filters Logic
            if (filterRules) {
                for (const [key, validator] of Object.entries(filterRules)) {
                    const filterValue = activeFilters[key];
                    // Skip if filter is empty/null/undefined
                    if (filterValue === '' || filterValue === null || filterValue === undefined) continue;
                    
                    if (!validator(item, filterValue)) {
                        return false;
                    }
                }
            }

            return true;
        });
    }, [data, searchQuery, activeFilters, searchKeys, filterRules]);

    const setFilter = (key: string, value: any) => {
        setActiveFilters(prev => ({ ...prev, [key]: value }));
    };

    const resetFilters = () => {
        setSearchQuery('');
        setActiveFilters({});
    };

    const activeFilterCount = Object.values(activeFilters).filter(v => v !== '' && v !== null).length;

    return {
        filteredData,
        searchQuery,
        setSearchQuery,
        activeFilters,
        setFilter,
        resetFilters,
        activeFilterCount
    };
};
