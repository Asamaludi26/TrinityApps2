
import { useState, useEffect, useMemo, useRef } from 'react';
import { User, Division, UserRole, Page } from '../../../types';
import { useMasterDataStore } from '../../../stores/useMasterDataStore';
import { useAssetStore } from '../../../stores/useAssetStore';
import { useNotification } from '../../../providers/NotificationProvider';
import { useSortableData } from '../../../hooks/useSortableData';
import { exportToCSV } from '../../../utils/csvExporter';

export type ViewType = 'users' | 'divisions';

interface UseAccountsLogicProps {
    currentUser: User;
}

export const useAccountsLogic = ({ currentUser }: UseAccountsLogicProps) => {
    // Stores
    const users = useMasterDataStore((state) => state.users);
    const divisions = useMasterDataStore((state) => state.divisions);
    const assets = useAssetStore((state) => state.assets);
    const deleteUserStore = useMasterDataStore((state) => state.deleteUser);
    const deleteDivisionStore = useMasterDataStore((state) => state.deleteDivision);
    const addNotification = useNotification();

    // State: View & Selection
    const [activeView, setActiveView] = useState<ViewType>('users');
    const [isBulkSelectMode, setIsBulkSelectMode] = useState(false);
    const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
    const [selectedDivisionIds, setSelectedDivisionIds] = useState<number[]>([]);
    
    // State: Modals & Loading
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [divisionToDelete, setDivisionToDelete] = useState<Division | null>(null);
    const [bulkDeleteConfirmation, setBulkDeleteConfirmation] = useState<ViewType | null>(null);
    const [isMoveDivisionModalOpen, setIsMoveDivisionModalOpen] = useState(false);
    const [isChangeRoleModalOpen, setIsChangeRoleModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // State: Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // State: Filters (Users)
    const [userSearchQuery, setUserSearchQuery] = useState('');
    const initialUserFilterState = { role: '', divisionId: '' };
    const [userFilters, setUserFilters] = useState(initialUserFilterState);
    const [tempUserFilters, setTempUserFilters] = useState(userFilters);
    
    // State: Filters (Divisions)
    const [divisionSearchQuery, setDivisionSearchQuery] = useState('');

    // State: UI Helper
    const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
    const filterPanelRef = useRef<HTMLDivElement>(null);

    // --- Effects ---

    // Click outside filter panel
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (filterPanelRef.current && !filterPanelRef.current.contains(event.target as Node)) {
                setIsFilterPanelOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => { document.removeEventListener("mousedown", handleClickOutside); };
    }, [filterPanelRef]);

    // Reset pagination on view/filter change
    useEffect(() => {
        setCurrentPage(1);
        handleCancelBulkMode();
    }, [activeView, itemsPerPage, userSearchQuery, userFilters, divisionSearchQuery]);

    // Keyboard escape to cancel bulk
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') handleCancelBulkMode();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // --- Data Processing (Users) ---

    const usersWithData = useMemo(() => users.map(user => ({
        ...user,
        assetCount: assets.filter(a => a.currentUser === user.name).length,
    })), [users, assets]);

    const filteredUsers = useMemo(() => {
        return usersWithData
            .filter(user => {
                const searchLower = userSearchQuery.toLowerCase();
                return (
                    user.name.toLowerCase().includes(searchLower) ||
                    user.email.toLowerCase().includes(searchLower)
                );
            })
            .filter(user => userFilters.role ? user.role === userFilters.role : true)
            .filter(user => userFilters.divisionId ? user.divisionId?.toString() === userFilters.divisionId : true);
    }, [usersWithData, userSearchQuery, userFilters]);

    const { items: sortedUsers, requestSort: requestUserSort, sortConfig: userSortConfig } = useSortableData<User & { assetCount: number }>(filteredUsers, { key: 'name', direction: 'ascending' });

    // --- Data Processing (Divisions) ---

    const divisionsWithData = useMemo(() => divisions.map(division => {
        const members = users.filter(u => u.divisionId === division.id);
        const memberNames = members.map(m => m.name);
        const totalAssets = assets.filter(a => a.currentUser && memberNames.includes(a.currentUser)).length;
        return {
            ...division,
            memberCount: members.length,
            totalAssets: totalAssets,
        };
    }), [divisions, users, assets]);

    const filteredDivisions = useMemo(() => {
        return divisionsWithData.filter(d => d.name.toLowerCase().includes(divisionSearchQuery.toLowerCase()));
    }, [divisionsWithData, divisionSearchQuery]);

    const { items: sortedDivisions, requestSort: requestDivisionSort, sortConfig: divisionSortConfig } = useSortableData<Division & { memberCount: number; totalAssets: number }>(filteredDivisions, { key: 'name', direction: 'ascending' });

    // --- Handlers ---

    const handleCancelBulkMode = () => {
        setIsBulkSelectMode(false);
        setSelectedUserIds([]);
        setSelectedDivisionIds([]);
    };

    const handleDeleteUser = async () => {
        if (!userToDelete) return;
        setIsLoading(true);
        try {
            await deleteUserStore(userToDelete.id);
            addNotification(`Akun ${userToDelete.name} berhasil dihapus.`, 'success');
        } catch (error) {
            addNotification('Gagal menghapus akun.', 'error');
        } finally {
            setUserToDelete(null);
            setIsLoading(false);
        }
    };

    const handleDeleteDivision = async () => {
        if (!divisionToDelete) return;
        setIsLoading(true);
        try {
            await deleteDivisionStore(divisionToDelete.id);
            addNotification(`Divisi ${divisionToDelete.name} berhasil dihapus.`, 'success');
        } catch (error) {
             addNotification('Gagal menghapus divisi.', 'error');
        } finally {
            setDivisionToDelete(null);
            setIsLoading(false);
        }
    };

    const handleExport = () => {
        if (activeView === 'users') {
             const dataToExport = sortedUsers.map(u => ({...u, divisionName: divisions.find(d => d.id === u.divisionId)?.name || 'N/A' }));
             exportToCSV(dataToExport, 'daftar_akun');
        } else {
             exportToCSV(sortedDivisions, 'daftar_divisi');
        }
    };

    // Filter Logic
    const activeUserFilterCount = Object.values(userFilters).filter(Boolean).length;
    
    const handleResetUserFilters = () => {
        setUserFilters(initialUserFilterState);
        setTempUserFilters(initialUserFilterState);
        setIsFilterPanelOpen(false);
    };

    const handleApplyUserFilters = () => {
        setUserFilters(tempUserFilters);
        setIsFilterPanelOpen(false);
    };

    return {
        // Data & Stores
        users: usersWithData,
        divisions,
        
        // State
        activeView, setActiveView,
        isLoading,
        currentPage, setCurrentPage, itemsPerPage, setItemsPerPage,
        isBulkSelectMode, setIsBulkSelectMode,
        
        // Filter UI
        filterPanelRef, isFilterPanelOpen, setIsFilterPanelOpen,
        userSearchQuery, setUserSearchQuery,
        divisionSearchQuery, setDivisionSearchQuery,
        userFilters, tempUserFilters, setTempUserFilters,
        activeUserFilterCount,
        handleResetUserFilters, handleApplyUserFilters,
        
        // Processed Data
        sortedUsers, userSortConfig, requestUserSort,
        sortedDivisions, divisionSortConfig, requestDivisionSort,
        
        // Selections
        selectedUserIds, setSelectedUserIds,
        selectedDivisionIds, setSelectedDivisionIds,
        
        // Modals & Actions State
        userToDelete, setUserToDelete,
        divisionToDelete, setDivisionToDelete,
        bulkDeleteConfirmation, setBulkDeleteConfirmation,
        isMoveDivisionModalOpen, setIsMoveDivisionModalOpen,
        isChangeRoleModalOpen, setIsChangeRoleModalOpen,

        // Action Handlers
        handleDeleteUser,
        handleDeleteDivision,
        handleCancelBulkMode,
        handleExport
    };
};
