


import React from 'react';
import { User, UserRole, Division } from '../../../types';
import { Checkbox } from '../../../components/ui/Checkbox';
import { SortConfig } from '../../../hooks/useSortableData';
import { SortIcon } from '../../../components/icons/SortIcon';
import { SortAscIcon } from '../../../components/icons/SortAscIcon';
import { SortDescIcon } from '../../../components/icons/SortDescIcon';
import { PencilIcon } from '../../../components/icons/PencilIcon';
import { TrashIcon } from '../../../components/icons/TrashIcon';
import { hasPermission } from '../../../utils/permissions';
import { useLongPress } from '../../../hooks/useLongPress';
import { BsShieldLock, BsExclamationCircleFill } from 'react-icons/bs'; // Added Exclamation Icon

interface UsersTableProps {
    users: (User & { assetCount: number })[];
    currentUser: User;
    divisions: Division[];
    sortConfig: SortConfig<User & { assetCount: number }> | null;
    requestSort: (key: keyof (User & { assetCount: number })) => void;
    isBulkSelectMode: boolean;
    selectedUserIds: number[];
    onSelectOne: (id: number) => void;
    onSelectAll: (ids: number[]) => void;
    onEdit: (user: User) => void;
    onDelete: (user: User) => void;
    onDetail: (user: User) => void;
    onEnterBulkMode: () => void;
}

const getRoleClass = (role: UserRole) => {
    switch (role) {
        case 'Super Admin': return 'bg-purple-100 text-purple-800';
        case 'Admin Logistik': return 'bg-info-light text-info-text';
        case 'Admin Purchase': return 'bg-teal-100 text-teal-800';
        case 'Leader': return 'bg-sky-100 text-sky-800';
        default: return 'bg-gray-100 text-gray-800';
    }
};

const SortableUserHeader: React.FC<any> = ({ children, columnKey, sortConfig, requestSort, className }) => {
    const isSorted = sortConfig?.key === columnKey;
    const direction = isSorted ? sortConfig.direction : undefined;
    const getSortIcon = () => {
        if (!isSorted) return <SortIcon className="w-4 h-4 text-gray-400" />;
        if (direction === 'ascending') return <SortAscIcon className="w-4 h-4 text-tm-accent" />;
        return <SortDescIcon className="w-4 h-4 text-tm-accent" />;
    };
    return (
        <th scope="col" className={`px-6 py-3 text-sm font-semibold tracking-wider text-left text-gray-500 ${className}`}>
            <button onClick={() => requestSort(columnKey)} className="flex items-center space-x-1 group">
                <span>{children}</span>
                <span className="opacity-50 group-hover:opacity-100">{getSortIcon()}</span>
            </button>
        </th>
    );
};

export const UsersTable: React.FC<UsersTableProps> = ({
    users, currentUser, divisions, sortConfig, requestSort,
    isBulkSelectMode, selectedUserIds, onSelectOne, onSelectAll,
    onEdit, onDelete, onDetail, onEnterBulkMode
}) => {
    const longPressHandlers = useLongPress(onEnterBulkMode, 500);

    const getDivisionName = (divisionId: number | null) => {
        if (divisionId === null) return <span className="italic text-gray-500">N/A</span>;
        return divisions.find(d => d.id === divisionId)?.name || 'N/A';
    };

    return (
        <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
                <tr>
                    {isBulkSelectMode && <th className="px-6 py-3"><Checkbox checked={selectedUserIds.length > 0 && selectedUserIds.length === users.length} onChange={e => onSelectAll(e.target.checked ? users.map(u => u.id) : [])} /></th>}
                    <SortableUserHeader columnKey="name" sortConfig={sortConfig} requestSort={requestSort}>Nama</SortableUserHeader>
                    <SortableUserHeader columnKey="email" sortConfig={sortConfig} requestSort={requestSort}>Email</SortableUserHeader>
                    <th scope="col" className="px-6 py-3 text-sm font-semibold tracking-wider text-left text-gray-500">Divisi</th>
                    <SortableUserHeader columnKey="role" sortConfig={sortConfig} requestSort={requestSort}>Role</SortableUserHeader>
                    <SortableUserHeader columnKey="assetCount" sortConfig={sortConfig} requestSort={requestSort} className="justify-center">Jumlah Aset</SortableUserHeader>
                    <th className="relative px-6 py-3"><span className="sr-only">Aksi</span></th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {users.map(user => {
                    // SECURITY CHECK: Admin Logistik cannot see sensitive data of other users
                    const isRestrictedView = currentUser.role === 'Admin Logistik' && user.id !== currentUser.id;
                    const hasResetRequest = user.passwordResetRequested;

                    return (
                        <tr key={user.id} {...longPressHandlers} onClick={() => isBulkSelectMode ? onSelectOne(user.id) : onDetail(user)} className={`cursor-pointer transition-colors ${selectedUserIds.includes(user.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                            {isBulkSelectMode && <td className="px-6 py-4" onClick={e => e.stopPropagation()}><Checkbox checked={selectedUserIds.includes(user.id)} onChange={() => onSelectOne(user.id)} /></td>}
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div>
                                    <div className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                        {user.name}
                                        {hasResetRequest && (
                                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-100 text-[10px] text-red-600 border border-red-200" title="User ini meminta reset password">
                                                <BsExclamationCircleFill /> Reset
                                            </span>
                                        )}
                                    </div>
                                    {user.id === currentUser.id && <span className="text-xs text-tm-primary font-bold">(Anda)</span>}
                                </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                                {isRestrictedView ? (
                                    <span className="text-gray-400 italic flex items-center gap-1 cursor-help" title="Data disembunyikan untuk privasi"><BsShieldLock className="w-3 h-3"/> Tersembunyi</span>
                                ) : (
                                    user.email
                                )}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">{getDivisionName(user.divisionId)}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                {isRestrictedView ? (
                                    <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-400 border border-gray-200">Tersembunyi</span>
                                ) : (
                                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getRoleClass(user.role)}`}>{user.role}</span>
                                )}
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-center text-gray-800 whitespace-nowrap">{user.assetCount}</td>
                            <td className="px-6 py-4 text-sm font-medium text-right whitespace-nowrap">
                                <div className="flex items-center justify-end space-x-2">
                                    {hasPermission(currentUser, 'users:edit') && !isRestrictedView && (
                                        <button onClick={(e) => { e.stopPropagation(); onEdit(user); }} className="p-2 text-gray-500 rounded-full hover:bg-yellow-100 hover:text-yellow-600"><PencilIcon className="w-4 h-4"/></button>
                                    )}
                                    {hasPermission(currentUser, 'users:delete') && !isRestrictedView && (
                                        <button onClick={(e) => { e.stopPropagation(); onDelete(user); }} className="p-2 text-gray-500 rounded-full hover:bg-red-100 hover:text-red-600"><TrashIcon className="w-4 h-4"/></button>
                                    )}
                                </div>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
};