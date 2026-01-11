
import React, { useState, useMemo, useEffect } from 'react';
import { Permission, UserRole } from '../../../types';
import { 
    ALL_PERMISSIONS, 
    MANDATORY_PERMISSIONS, 
    SENSITIVE_PERMISSIONS, 
    ROLE_RESTRICTIONS, 
    resolveDependencies, 
    resolveDependents 
} from '../../../utils/permissions';
import { Checkbox } from '../../../components/ui/Checkbox';
import { LockIcon } from '../../../components/icons/LockIcon';
import { SearchIcon } from '../../../components/icons/SearchIcon';
import { ChevronDownIcon } from '../../../components/icons/ChevronDownIcon';
import { ExclamationTriangleIcon } from '../../../components/icons/ExclamationTriangleIcon';

interface PermissionManagerProps {
    currentPermissions: Permission[];
    onChange: (newPermissions: Permission[]) => void;
    selectedRole?: UserRole;
    disabled?: boolean;
}

export const PermissionManager: React.FC<PermissionManagerProps> = ({ currentPermissions, onChange, selectedRole, disabled = false }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedGroups, setExpandedGroups] = useState<string[]>(ALL_PERMISSIONS.map(g => g.group));
    const [showRestricted, setShowRestricted] = useState(false);

    // Helpers Memoized for Performance
    const restrictedPermissions = useMemo(() => selectedRole ? ROLE_RESTRICTIONS[selectedRole] || [] : [], [selectedRole]);
    const mandatoryPermissions = useMemo(() => selectedRole ? MANDATORY_PERMISSIONS[selectedRole] || [] : [], [selectedRole]);

    // SELF-HEALING STATE:
    // Secara otomatis menambahkan permission wajib ke state jika belum ada.
    // Ini memperbaiki kasus di mana data lama tidak lengkap atau saat perpindahan Role.
    useEffect(() => {
        if (disabled) return;
        
        // Filter mandatory yang belum ada DAN tidak restricted
        const missingMandatory = mandatoryPermissions.filter(p => 
            !currentPermissions.includes(p) && !restrictedPermissions.includes(p)
        );
        
        if (missingMandatory.length > 0) {
            const healedPermissions = Array.from(new Set([...currentPermissions, ...missingMandatory]));
            onChange(healedPermissions);
        }
    }, [mandatoryPermissions, restrictedPermissions, currentPermissions, onChange, disabled]);

    // Logic: Dependency Resolution & Cascading Updates
    const handlePermissionChange = (permissionKey: Permission, checked: boolean) => {
        let updatedPermissions = new Set(currentPermissions);

        if (checked) {
            // 1. Add current
            updatedPermissions.add(permissionKey);
            
            // 2. Add Dependencies (Parents) recursively
            // Example: "Create Asset" automatically checks "View Asset"
            const dependencies = resolveDependencies(permissionKey);
            dependencies.forEach(dep => {
                if (!restrictedPermissions.includes(dep)) {
                    updatedPermissions.add(dep);
                }
            });

        } else {
            // 1. Remove current
            updatedPermissions.delete(permissionKey);

            // 2. Remove Dependents (Children) recursively
            // Example: Unchecking "View Asset" automatically unchecks "Create Asset"
            const dependents = resolveDependents(permissionKey);
            dependents.forEach(dep => updatedPermissions.delete(dep));
        }

        // 3. Enforce Mandatory (Re-add mandatory if removed accidentally by logic, unless restricted)
        mandatoryPermissions.forEach(mp => {
            if (!restrictedPermissions.includes(mp)) {
                updatedPermissions.add(mp);
            }
        });

        onChange(Array.from(updatedPermissions));
    };

    const handleGroupToggle = (groupPermissions: Permission[], isAllChecked: boolean) => {
        let updatedPermissions = new Set(currentPermissions);
        
        // Hanya operasikan permission yang diizinkan untuk role ini
        const allowedGroupPermissions = groupPermissions.filter(p => !restrictedPermissions.includes(p));

        if (isAllChecked) {
            // Uncheck All in Group
            allowedGroupPermissions.forEach(p => {
                // Jangan hapus jika wajib
                if (!mandatoryPermissions.includes(p)) {
                    updatedPermissions.delete(p);
                    // Hapus juga dependent permissions (children)
                    // Note: Dependent mungkin berada di luar grup ini, tapi harus tetap dihapus untuk konsistensi
                    const dependents = resolveDependents(p);
                    dependents.forEach(dep => updatedPermissions.delete(dep));
                }
            });
        } else {
            // Check All in Group (Smart Select)
            allowedGroupPermissions.forEach(p => {
                // SECURITY FEATURE: Skip sensitive permissions during bulk select.
                // User must explicitly check sensitive items (like "Delete" or "View Price").
                // Kecuali jika permission itu Mandatory.
                if (SENSITIVE_PERMISSIONS.includes(p) && !mandatoryPermissions.includes(p)) return;

                updatedPermissions.add(p);
                // Add dependencies (parents)
                const parents = resolveDependencies(p);
                parents.forEach(par => {
                    if (!restrictedPermissions.includes(par)) {
                        updatedPermissions.add(par);
                    }
                });
            });
        }
        
        onChange(Array.from(updatedPermissions));
    };

    const handleReset = () => {
        // Reset to mandatory only (sanitized)
        const safeMandatory = mandatoryPermissions.filter(p => !restrictedPermissions.includes(p));
        onChange(safeMandatory);
    };

    // MEMOIZED FILTERING
    const filteredGroups = useMemo(() => {
        return ALL_PERMISSIONS.map(group => {
            const filteredPermissions = group.permissions.filter(p => 
                p.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
                p.key.toLowerCase().includes(searchQuery.toLowerCase())
            );
            return { ...group, permissions: filteredPermissions };
        }).filter(group => group.permissions.length > 0);
    }, [searchQuery]);

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col gap-4 p-4 bg-gray-50 border border-gray-200 rounded-lg sticky top-0 z-10 shadow-sm">
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative w-full md:w-1/2">
                        <SearchIcon className="absolute w-4 h-4 text-gray-500 left-3 top-1/2 -translate-y-1/2" />
                        <input 
                            type="text" 
                            placeholder="Cari hak akses (nama atau kode)..." 
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 text-sm bg-white text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-tm-primary focus:border-tm-primary disabled:bg-gray-100 disabled:text-gray-500"
                            disabled={disabled}
                        />
                    </div>
                    <div className="flex items-center gap-3 w-full md:w-auto text-xs">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <Checkbox checked={showRestricted} onChange={e => setShowRestricted(e.target.checked)} />
                            <span className="text-gray-600">Tampilkan yang dibatasi</span>
                        </label>
                        <button type="button" onClick={handleReset} className="px-3 py-1.5 font-medium text-red-600 bg-red-50 border border-red-200 rounded hover:bg-red-100" disabled={disabled}>Reset ke Default</button>
                    </div>
                </div>
            </div>

            <fieldset disabled={disabled} className="space-y-4">
                {filteredGroups.map(group => {
                    const groupKeys = group.permissions.map(p => p.key);
                    
                    // Filter: Hanya permission yang BOLEH diambil oleh role ini
                    const availableKeys = groupKeys.filter(k => !restrictedPermissions.includes(k));
                    
                    // Filter: Untuk logika Checkbox Group, kita kecualikan yang Sensitif (karena bulk select skip sensitive)
                    // Ini agar checkbox group menjadi 'checked' jika semua NON-SENSITIVE terpilih.
                    const targetableKeys = availableKeys.filter(k => !SENSITIVE_PERMISSIONS.includes(k) || mandatoryPermissions.includes(k));
                    
                    // Hitung berapa yang sudah terpilih dari targetable
                    const checkedCount = targetableKeys.filter(k => currentPermissions.includes(k)).length;
                    
                    const isAllChecked = targetableKeys.length > 0 && checkedCount === targetableKeys.length;
                    const isIndeterminate = checkedCount > 0 && checkedCount < targetableKeys.length;
                    
                    const isExpanded = expandedGroups.includes(group.group) || searchQuery.length > 0;

                    const toggleGroupExpand = () => {
                        setExpandedGroups(prev => prev.includes(group.group) ? prev.filter(g => g !== group.group) : [...prev, group.group]);
                    };

                    return (
                        <div key={group.group} className="border rounded-lg bg-white border-gray-200 overflow-hidden transition-all">
                            <div 
                                className="flex items-center justify-between p-4 bg-gray-50/50 cursor-pointer hover:bg-gray-100/50"
                                onClick={toggleGroupExpand}
                            >
                                <div className="flex items-center gap-3">
                                    <button type="button" className={`p-1 rounded-full hover:bg-gray-200 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                                        <ChevronDownIcon className="w-4 h-4 text-gray-500" />
                                    </button>
                                    <h4 className="text-sm font-semibold text-gray-800">{group.group}</h4>
                                    <span className="px-2 py-0.5 text-[10px] font-bold text-gray-500 bg-gray-200 rounded-full">
                                        {/* Display effective count: Actual Checked vs Available */}
                                        {currentPermissions.filter(p => groupKeys.includes(p)).length} / {availableKeys.length}
                                    </span>
                                </div>
                                <div onClick={e => e.stopPropagation()}>
                                    <label className="flex items-center space-x-2 text-xs font-medium text-gray-600 cursor-pointer hover:text-tm-primary">
                                        <Checkbox
                                            checked={isAllChecked}
                                            onChange={() => handleGroupToggle(groupKeys, isAllChecked)}
                                            indeterminate={isIndeterminate}
                                            disabled={disabled || targetableKeys.length === 0}
                                        />
                                        <span>Pilih Grup</span>
                                    </label>
                                </div>
                            </div>
                            
                            {isExpanded && (
                                <div className="p-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in-down">
                                    {group.permissions.map(permission => {
                                        const isMandatory = mandatoryPermissions.includes(permission.key);
                                        const isForbidden = restrictedPermissions.includes(permission.key);
                                        const isSensitive = SENSITIVE_PERMISSIONS.includes(permission.key);
                                        
                                        // Check visual state
                                        const isChecked = currentPermissions.includes(permission.key);
                                        
                                        if (isForbidden && !showRestricted) return null;

                                        let cardClass = 'bg-white border-gray-200 hover:border-gray-300';
                                        if (isChecked) cardClass = 'bg-blue-50/30 border-blue-200';
                                        if (isSensitive) cardClass = isChecked ? 'bg-amber-50 border-amber-200' : 'bg-white border-amber-100 hover:border-amber-300';
                                        if (isForbidden) cardClass = 'bg-gray-100 border-transparent opacity-60 cursor-not-allowed';
                                        if (isMandatory) cardClass = 'bg-blue-50/50 border-blue-200 cursor-not-allowed'; // Mandatory locked

                                        // Conflict case: Mandatory but Forbidden (Config Error safe handling)
                                        if (isMandatory && isForbidden) cardClass = 'bg-red-50 border-red-200 opacity-60 cursor-not-allowed';

                                        return (
                                            <label 
                                                key={permission.key} 
                                                className={`flex items-start space-x-3 p-3 rounded-md border transition-all duration-200 ${cardClass}`}
                                            >
                                                <Checkbox
                                                    checked={isChecked}
                                                    onChange={(e) => handlePermissionChange(permission.key, e.target.checked)}
                                                    className={`mt-0.5 ${isForbidden ? 'invisible' : ''}`}
                                                    // Disable if locked by mandatory rule or forbidden rule
                                                    disabled={disabled || isMandatory || isForbidden}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-2 mb-0.5">
                                                        <span className={`text-sm font-medium truncate ${isChecked ? 'text-tm-primary' : 'text-gray-700'} ${isForbidden ? 'line-through text-gray-400' : ''}`}>
                                                            {permission.label}
                                                        </span>
                                                        
                                                        <div className="flex items-center gap-1">
                                                            {isMandatory && <LockIcon className="w-3 h-3 text-blue-600" title="Wajib (Terkunci)" />}
                                                            {isSensitive && !isForbidden && <ExclamationTriangleIcon className="w-3 h-3 text-amber-500" title="Sensitif" />}
                                                            {isForbidden && <LockIcon className="w-3 h-3 text-gray-400" title="Dibatasi untuk role ini" />}
                                                        </div>
                                                    </div>
                                                    <p className="text-[10px] text-gray-400 font-mono truncate">{permission.key}</p>
                                                    
                                                    {/* Contextual Badges */}
                                                    <div className="flex flex-wrap gap-1 mt-1.5">
                                                        {isMandatory && !isForbidden && <span className="text-[9px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-bold">Wajib</span>}
                                                        {isSensitive && !isForbidden && <span className="text-[9px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">Hati-hati</span>}
                                                        {isForbidden && <span className="text-[9px] px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded">Dilarang</span>}
                                                    </div>
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </fieldset>
        </div>
    );
};
