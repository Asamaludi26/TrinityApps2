
import React from 'react';
import { User, Page, UserRole, PreviewData } from '../../types';
import Modal from '../../components/ui/Modal';
import { ExportIcon } from '../../components/icons/ExportIcon';
import { SpinnerIcon } from '../../components/icons/SpinnerIcon';
import { SearchIcon } from '../../components/icons/SearchIcon';
import { CloseIcon } from '../../components/icons/CloseIcon';
import { PaginationControls } from '../../components/ui/PaginationControls';
import { CustomSelect } from '../../components/ui/CustomSelect';
import { FilterIcon } from '../../components/icons/FilterIcon';
import { hasPermission } from '../../utils/permissions';
import { useAccountsLogic } from './hooks/useAccountsLogic';
import { UsersTable } from './components/UsersTable';
import { DivisionsTable } from './components/DivisionsTable';

interface AccountsPageProps {
    currentUser: User;
    setActivePage: (page: Page, initialState?: any) => void;
    onShowPreview: (data: PreviewData) => void;
}

const userRoles: UserRole[] = ['Staff', 'Leader', 'Admin Logistik', 'Admin Purchase', 'Super Admin'];

export function AccountsPage({ currentUser, setActivePage }: AccountsPageProps): React.ReactElement {
    const {
        // Data & Stores
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
        setIsMoveDivisionModalOpen, setIsChangeRoleModalOpen,

        // Action Handlers
        handleDeleteUser,
        handleDeleteDivision,
        handleCancelBulkMode,
        handleExport
    } = useAccountsLogic({ currentUser });

    // Pagination Calculations
    const totalUserItems = sortedUsers.length;
    const totalUserPages = Math.ceil(totalUserItems / itemsPerPage);
    const userStartIndex = (currentPage - 1) * itemsPerPage;
    const userEndIndex = userStartIndex + itemsPerPage;
    const paginatedUsers = sortedUsers.slice(userStartIndex, userEndIndex);
    
    const totalDivisionItems = sortedDivisions.length;
    const totalDivisionPages = Math.ceil(totalDivisionItems / itemsPerPage);
    const divisionStartIndex = (currentPage - 1) * itemsPerPage;
    const divisionEndIndex = divisionStartIndex + itemsPerPage;
    const paginatedDivisions = sortedDivisions.slice(divisionStartIndex, divisionEndIndex);

    return (
        <div className="p-4 sm:p-6 md:p-8">
            <div className="flex flex-col items-start justify-between gap-4 mb-6 md:flex-row md:items-center">
                <h1 className="text-3xl font-bold text-tm-dark">Akun & Divisi</h1>
                <div className="flex items-center space-x-2">
                    <button onClick={handleExport} className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-gray-700 bg-white border rounded-lg shadow-sm hover:bg-gray-50">
                        <ExportIcon className="w-4 h-4"/> Export CSV
                    </button>
                    {hasPermission(currentUser, activeView === 'users' ? 'users:create' : 'divisions:manage') && (
                        <button
                            onClick={() => activeView === 'users' ? setActivePage('user-form') : setActivePage('division-form')}
                            className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 rounded-lg shadow-sm bg-tm-primary hover:bg-tm-primary-hover"
                        >
                            {activeView === 'users' ? 'Tambah Akun' : 'Tambah Divisi'}
                        </button>
                    )}
                </div>
            </div>

            <div className="mb-6 border-b border-gray-200">
                <nav className="flex -mb-px space-x-6" aria-label="Tabs">
                    <button onClick={() => setActiveView('users')} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeView === 'users' ? 'border-tm-primary text-tm-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        Manajemen Akun ({sortedUsers.length})
                    </button>
                    <button onClick={() => setActiveView('divisions')} className={`py-3 px-1 border-b-2 font-medium text-sm ${activeView === 'divisions' ? 'border-tm-primary text-tm-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        Manajemen Divisi ({sortedDivisions.length})
                    </button>
                </nav>
            </div>

            {activeView === 'users' ? (
                // Users View
                <div>
                     <div className="p-4 mb-4 bg-white border border-gray-200/80 rounded-xl shadow-md">
                        <div className="flex flex-wrap items-center gap-4">
                            <div className="relative flex-grow">
                                <SearchIcon className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 top-1/2 left-3" />
                                <input type="text" placeholder="Cari nama atau email..." value={userSearchQuery} onChange={e => setUserSearchQuery(e.target.value)} className="w-full h-10 py-2 pl-10 pr-4 text-sm text-gray-900 bg-gray-50 border border-gray-300 rounded-lg focus:ring-tm-accent focus:border-tm-accent" />
                            </div>
                            <div className="relative" ref={filterPanelRef}>
                                <button
                                    onClick={() => { setTempUserFilters(userFilters); setIsFilterPanelOpen(p => !p); }}
                                    className="inline-flex items-center justify-center gap-2 w-full h-10 px-4 text-sm font-semibold text-gray-700 transition-all duration-200 bg-white border border-gray-300 rounded-lg shadow-sm sm:w-auto hover:bg-gray-50"
                                >
                                    <FilterIcon className="w-4 h-4" /> <span>Filter</span> {activeUserFilterCount > 0 && <span className="px-2 py-0.5 text-xs font-bold text-white rounded-full bg-tm-primary">{activeUserFilterCount}</span>}
                                </button>
                                {isFilterPanelOpen && (
                                    <>
                                        <div onClick={() => setIsFilterPanelOpen(false)} className="fixed inset-0 z-20 bg-black/25 sm:hidden" />
                                        <div className="fixed top-32 inset-x-4 z-30 origin-top rounded-xl border border-gray-200 bg-white shadow-lg sm:absolute sm:top-full sm:inset-x-auto sm:right-0 sm:mt-2 sm:w-72">
                                            <div className="flex items-center justify-between p-4 border-b">
                                                <h3 className="text-lg font-semibold text-gray-800">Filter Akun</h3>
                                                <button onClick={() => setIsFilterPanelOpen(false)} className="p-1 text-gray-400 rounded-full hover:bg-gray-100"><CloseIcon className="w-5 h-5"/></button>
                                            </div>
                                            <div className="p-4 space-y-4">
                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Role</label>
                                                    <CustomSelect options={[{value: '', label: 'Semua Role'}, ...userRoles.map(r => ({value: r, label: r}))]} value={tempUserFilters.role} onChange={v => setTempUserFilters(f => ({...f, role: v}))} />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Divisi</label>
                                                    <CustomSelect options={[{value: '', label: 'Semua Divisi'}, ...divisions.map(d => ({value: d.id.toString(), label: d.name}))]} value={tempUserFilters.divisionId} onChange={v => setTempUserFilters(f => ({...f, divisionId: v}))} />
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between p-4 bg-gray-50 border-t">
                                                <button onClick={handleResetUserFilters} className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Reset</button>
                                                <button onClick={handleApplyUserFilters} className="px-4 py-2 text-sm font-semibold text-white bg-tm-primary rounded-lg shadow-sm hover:bg-tm-primary-hover">Terapkan</button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                     </div>
                     {isBulkSelectMode && (
                        <div className="p-4 mb-4 bg-blue-50 border-l-4 border-tm-accent rounded-r-lg">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex flex-wrap items-center gap-3">
                                    <span className="text-sm font-medium text-tm-primary">{selectedUserIds.length} item terpilih</span>
                                    <div className="h-5 border-l border-gray-300"></div>
                                    <button onClick={() => setIsChangeRoleModalOpen(true)} className="px-3 py-1.5 text-sm font-semibold text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200">Ubah Role</button>
                                    <button onClick={() => setIsMoveDivisionModalOpen(true)} className="px-3 py-1.5 text-sm font-semibold text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200">Pindah Divisi</button>
                                    <button onClick={() => setBulkDeleteConfirmation('users')} className="px-3 py-1.5 text-sm font-semibold text-red-600 bg-red-100 rounded-md hover:bg-red-200">Hapus</button>
                                </div>
                                <button onClick={handleCancelBulkMode} className="px-3 py-1.5 text-sm font-semibold text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">Batal</button>
                            </div>
                        </div>
                    )}
                    <div className="overflow-hidden bg-white border border-gray-200/80 rounded-xl shadow-md">
                         <div className="overflow-x-auto custom-scrollbar">
                            <UsersTable
                                users={paginatedUsers}
                                currentUser={currentUser}
                                divisions={divisions}
                                sortConfig={userSortConfig}
                                requestSort={requestUserSort}
                                isBulkSelectMode={isBulkSelectMode}
                                selectedUserIds={selectedUserIds}
                                onSelectOne={(id) => setSelectedUserIds(prev => prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id])}
                                onSelectAll={(ids) => setSelectedUserIds(ids)}
                                onEdit={(user) => setActivePage('user-form', { editingUser: user })}
                                onDelete={(user) => setUserToDelete(user)}
                                onDetail={(user) => setActivePage('user-detail', { userId: user.id })}
                                onEnterBulkMode={() => setIsBulkSelectMode(true)}
                            />
                        </div>
                        <PaginationControls currentPage={currentPage} totalPages={totalUserPages} totalItems={totalUserItems} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} onItemsPerPageChange={setItemsPerPage} startIndex={userStartIndex} endIndex={userEndIndex} />
                    </div>
                </div>
            ) : (
                // Divisions View
                 <div>
                     <div className="p-4 mb-4 bg-white border border-gray-200/80 rounded-xl shadow-md">
                        <div className="relative">
                            <SearchIcon className="absolute w-5 h-5 text-gray-400 transform -translate-y-1/2 top-1/2 left-3" />
                            <input type="text" placeholder="Cari nama divisi..." value={divisionSearchQuery} onChange={e => setDivisionSearchQuery(e.target.value)} className="w-full h-10 py-2 pl-10 pr-4 text-sm text-gray-900 bg-gray-50 border border-gray-300 rounded-lg focus:ring-tm-accent focus:border-tm-accent" />
                        </div>
                    </div>
                    {isBulkSelectMode && (
                        <div className="p-4 mb-4 bg-blue-50 border-l-4 border-tm-accent rounded-r-lg">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex flex-wrap items-center gap-3">
                                    <span className="text-sm font-medium text-tm-primary">{selectedDivisionIds.length} item terpilih</span>
                                    <div className="h-5 border-l border-gray-300"></div>
                                    <button onClick={() => setBulkDeleteConfirmation('divisions')} className="px-3 py-1.5 text-sm font-semibold text-red-600 bg-red-100 rounded-md hover:bg-red-200">Hapus</button>
                                </div>
                                <button onClick={handleCancelBulkMode} className="px-3 py-1.5 text-sm font-semibold text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">Batal</button>
                            </div>
                        </div>
                    )}
                    <div className="overflow-hidden bg-white border border-gray-200/80 rounded-xl shadow-md">
                        <div className="overflow-x-auto custom-scrollbar">
                            <DivisionsTable 
                                divisions={paginatedDivisions}
                                sortConfig={divisionSortConfig}
                                requestSort={requestDivisionSort}
                                isBulkSelectMode={isBulkSelectMode}
                                selectedDivisionIds={selectedDivisionIds}
                                onSelectOne={(id) => setSelectedDivisionIds(prev => prev.includes(id) ? prev.filter(did => did !== id) : [...prev, id])}
                                onSelectAll={(ids) => setSelectedDivisionIds(ids)}
                                onEdit={(division) => setActivePage('division-form', { editingDivision: division })}
                                onDelete={(division) => setDivisionToDelete(division)}
                                onDetail={(division) => setActivePage('division-detail', { divisionId: division.id })}
                                onEnterBulkMode={() => setIsBulkSelectMode(true)}
                            />
                        </div>
                        <PaginationControls currentPage={currentPage} totalPages={totalDivisionPages} totalItems={totalDivisionItems} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} onItemsPerPageChange={setItemsPerPage} startIndex={divisionStartIndex} endIndex={divisionEndIndex} />
                    </div>
                </div>
            )}
            
            {userToDelete && <Modal isOpen={!!userToDelete} onClose={() => setUserToDelete(null)} title="Konfirmasi Hapus Akun" size="md">
                <p className="text-sm text-gray-600">Anda yakin ingin menghapus akun <strong>{userToDelete.name}</strong>? Tindakan ini tidak dapat diurungkan.</p>
                <div className="flex justify-end gap-2 mt-6 pt-4 border-t"><button onClick={() => setUserToDelete(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Batal</button><button onClick={handleDeleteUser} disabled={isLoading} className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-danger rounded-lg shadow-sm hover:bg-red-700">{isLoading && <SpinnerIcon className="w-4 h-4 mr-2"/>} Hapus</button></div>
            </Modal>}
             {divisionToDelete && <Modal isOpen={!!divisionToDelete} onClose={() => setDivisionToDelete(null)} title="Konfirmasi Hapus Divisi" size="md">
                <p className="text-sm text-gray-600">Anda yakin ingin menghapus divisi <strong>{divisionToDelete.name}</strong>? Aksi ini tidak dapat diurungkan.</p>
                <div className="flex justify-end gap-2 mt-6 pt-4 border-t"><button onClick={() => setDivisionToDelete(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50">Batal</button><button onClick={handleDeleteDivision} disabled={isLoading} className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-danger rounded-lg shadow-sm hover:bg-red-700">{isLoading && <SpinnerIcon className="w-4 h-4 mr-2"/>} Hapus</button></div>
            </Modal>}
        </div>
    );
}
