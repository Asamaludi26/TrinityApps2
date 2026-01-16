
import React, { useState, useEffect, useRef } from 'react';
import { User, Page, PreviewData } from '../../types';
import { Sidebar } from './Sidebar';
import { NotificationBell } from '../ui/NotificationBell';
import { MenuIcon } from '../icons/MenuIcon';
import { QrCodeIcon } from '../icons/QrCodeIcon';
import { ChevronDownIcon } from '../icons/ChevronDownIcon';
import { UserCogIcon } from '../icons/UserCogIcon';
import { LogoutIcon } from '../icons/LogoutIcon';
import { CommandPalette } from '../ui/CommandPalette';
import { GlobalScannerModal } from '../ui/GlobalScannerModal';
import { TopLoadingBar } from '../ui/TopLoadingBar';
import { ContentSkeleton } from '../ui/ContentSkeleton';
import PreviewModal from '../../features/preview/PreviewModal';
import { WhatsAppSimulationModal } from '../ui/WhatsAppSimulationModal';

// Stores
import { useUIStore } from '../../stores/useUIStore';

interface MainLayoutProps {
  children: React.ReactNode;
  currentUser: User;
  onLogout: () => void;
  // Global Actions passed down for Header/Sidebar
  setActivePage: (page: Page, filters?: any) => void;
  onShowPreview: (data: PreviewData) => void;
  // Scanner Actions
  onOpenScanner: () => void;
  // Modal States
  isGlobalScannerOpen: boolean;
  setIsGlobalScannerOpen: (open: boolean) => void;
  onScanSuccess: (data: any) => void;
  previewData: PreviewData | null;
  setPreviewData: (data: PreviewData | null) => void;
  // Action callbacks for Preview Modal
  previewActions: {
    onInitiateHandover: (asset: any) => void;
    onInitiateDismantle: (asset: any) => void;
    onInitiateInstallation: (asset: any) => void;
    onReportDamage: () => void;
    onStartRepair: () => void;
    onMarkAsRepaired: () => void;
    onDecommission: () => void;
    onReceiveFromRepair: () => void;
    onToggleVisibility?: () => void; 
    onAddProgressUpdate: () => void;
    onEditItem: (data: any) => void;
  }
}

const getRoleClass = (role: User["role"]) => {
  switch (role) {
    case "Super Admin": return "bg-purple-100 text-purple-800";
    case "Admin Logistik": return "bg-sky-100 text-sky-800";
    case "Admin Purchase": return "bg-teal-100 text-teal-800";
    case "Leader": return "bg-indigo-100 text-indigo-800";
    default: return "bg-slate-100 text-slate-800";
  }
};

export const MainLayout: React.FC<MainLayoutProps> = ({ 
  children, 
  currentUser, 
  onLogout, 
  setActivePage, 
  onShowPreview,
  onOpenScanner,
  isGlobalScannerOpen,
  setIsGlobalScannerOpen,
  onScanSuccess,
  previewData,
  setPreviewData,
  previewActions
}) => {
  // UI Store
  const activePage = useUIStore((state) => state.activePage);
  const isPageLoading = useUIStore((state) => state.isPageLoading);
  const sidebarOpen = useUIStore((state) => state.sidebarOpen);
  const setSidebarOpen = useUIStore((state) => state.toggleSidebar);

  // Local UI State
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setIsProfileDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Command Palette Shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-tm-light flex font-sans text-slate-800">
      {/* Top Progress Bar */}
      <TopLoadingBar isLoading={isPageLoading} />

      {/* Sidebar */}
      <Sidebar
        currentUser={currentUser}
        activePage={activePage}
        setActivePage={setActivePage}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-64 transition-all duration-300">
        
        {/* Header - Glassmorphism - INCREASED Z-INDEX TO 40 */}
        <header className="sticky top-0 z-40 flex items-center justify-between w-full h-16 px-6 glass-effect no-print border-b border-slate-200/60 shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="text-slate-500 md:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors">
              <MenuIcon className="w-6 h-6" />
            </button>
          </div>

          <div className="flex items-center space-x-3 sm:space-x-5">
            <button 
                onClick={() => setIsCommandPaletteOpen(true)}
                className="hidden md:flex items-center gap-2 px-3 py-1.5 text-sm text-slate-400 bg-slate-50 border border-slate-200 rounded-lg hover:text-slate-600 hover:border-slate-300 transition-all shadow-sm group"
            >
                <span className="group-hover:text-slate-800">Cari...</span>
                <kbd className="px-1.5 py-0.5 text-[10px] font-bold text-slate-400 bg-white border border-slate-200 rounded-md shadow-sm">⌘K</kbd>
            </button>

            <div className="h-6 w-px bg-slate-200"></div>

            <NotificationBell
              currentUser={currentUser}
              setActivePage={setActivePage}
              onShowPreview={onShowPreview}
            />
            
            <button
              onClick={onOpenScanner}
              className="p-2 text-slate-500 rounded-full hover:bg-slate-100 hover:text-tm-primary transition-colors"
              title="Pindai QR Aset"
            >
              <QrCodeIcon className="w-5 h-5" />
            </button>

            {/* Profile Dropdown */}
            <div className="relative pl-2" ref={profileDropdownRef}>
              <button
                onClick={() => setIsProfileDropdownOpen((prev) => !prev)}
                className={`flex items-center gap-3 p-1 rounded-full hover:bg-slate-100 transition-all border border-transparent hover:border-slate-200 pr-3 ${isProfileDropdownOpen ? 'bg-slate-100' : ''}`}
              >
                 <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm ${getRoleClass(currentUser.role).split(' ')[0].replace('text-', 'bg-').replace('100', '500')}`}>
                    {currentUser.name.charAt(0)}
                </div>
                <div className="text-right hidden sm:block">
                  <span className="block text-sm font-bold text-slate-700 leading-none">{currentUser.name.split(' ')[0]}</span>
                  <span className="block text-[10px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">{currentUser.role}</span>
                </div>
                <ChevronDownIcon className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${isProfileDropdownOpen ? "rotate-180" : ""}`} />
              </button>
              
              {isProfileDropdownOpen && (
                <div className="absolute right-0 z-50 w-56 mt-3 origin-top-right bg-white border border-slate-100 rounded-xl shadow-xl animate-zoom-in ring-1 ring-black/5 focus:outline-none overflow-hidden">
                  <div className="p-1.5">
                    <div className="px-3 py-3 mb-1 border-b border-slate-50 sm:hidden">
                      <p className="text-sm font-bold text-slate-800">{currentUser.name}</p>
                      <p className="text-xs text-slate-500">{currentUser.role}</p>
                    </div>
                    <button onClick={() => { setActivePage("pengaturan-akun"); setIsProfileDropdownOpen(false); }} className="flex items-center w-full gap-3 px-3 py-2.5 text-sm text-left text-slate-700 rounded-lg hover:bg-slate-50 hover:text-tm-primary transition-colors font-medium">
                      <UserCogIcon className="w-4 h-4" /> <span>Kelola Akun</span>
                    </button>
                    <div className="my-1 border-t border-slate-50"></div>
                    <button onClick={onLogout} className="flex items-center w-full gap-3 px-3 py-2.5 text-sm text-left text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium">
                      <LogoutIcon className="w-4 h-4" /> <span>Keluar</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Scroll Area */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-tm-light relative">
            {isPageLoading ? <ContentSkeleton /> : children}
        </main>
      </div>

      {/* Global Modals */}
      <GlobalScannerModal
        isOpen={isGlobalScannerOpen}
        onClose={() => setIsGlobalScannerOpen(false)}
        onScanSuccess={onScanSuccess}
      />

      <WhatsAppSimulationModal />

      <PreviewModal
        currentUser={currentUser}
        previewData={previewData}
        onClose={() => setPreviewData(null)}
        onShowPreview={onShowPreview}
        onEditItem={previewActions.onEditItem}
        onInitiateHandover={previewActions.onInitiateHandover}
        onInitiateDismantle={previewActions.onInitiateDismantle}
        onInitiateInstallation={previewActions.onInitiateInstallation}
        onReportDamage={previewActions.onReportDamage}
        onStartRepair={previewActions.onStartRepair}
        onMarkAsRepaired={previewActions.onMarkAsRepaired}
        onDecommission={previewActions.onDecommission}
        onReceiveFromRepair={previewActions.onReceiveFromRepair}
        onAddProgressUpdate={previewActions.onAddProgressUpdate}
      />

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={setActivePage}
        onShowPreview={onShowPreview}
      />
    </div>
  );
};
