
import React, { useState, useEffect, useMemo } from 'react';
import { Page, User, Permission } from '../../types';
import { hasPermission } from '../../utils/permissions';
import { DashboardIcon } from '../icons/DashboardIcon';
import { RequestIcon } from '../icons/RequestIcon';
import { RegisterIcon } from '../icons/RegisterIcon';
import { HandoverIcon } from '../icons/HandoverIcon';
import { DismantleIcon } from '../icons/DismantleIcon';
import { CloseIcon } from '../icons/CloseIcon';
import { AssetIcon } from '../icons/AssetIcon';
import { ChevronDownIcon } from '../icons/ChevronDownIcon';
import { UsersIcon } from '../icons/UsersIcon';
import { TrinitiLogoIcon } from '../icons/TrinitiLogoIcon';
import { CustomerIcon } from '../icons/CustomerIcon';
import { BoxIcon } from '../icons/BoxIcon';
import { SettingsIcon } from '../icons/SettingsIcon';
import { CategoryIcon } from '../icons/CategoryIcon';
import { WrenchIcon } from '../icons/WrenchIcon';
import { FileSignatureIcon } from '../icons/FileSignatureIcon';
import { FileTextIcon } from '../icons/FileTextIcon';
import { JournalCheckIcon } from '../icons/JournalCheckIcon';
import { UserCogIcon } from '../icons/UserCogIcon';

// Zustand Imports
import { useUIStore } from '../../stores/useUIStore';
import { useAuthStore } from '../../stores/useAuthStore';

interface SidebarProps {
  currentUser: User;
  activePage: Page;
  setActivePage: (page: Page, filters?: any) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

type MenuItem = {
  id: string;
  label: string;
  icon: React.FC<{ className?: string }>;
  permission?: Permission;
  children?: MenuItem[];
  page?: Page;
  filter?: Record<string, any>;
  isExternal?: boolean;
  path?: string;
};

const allMenuItems: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: DashboardIcon, permission: 'dashboard:view' },
  {
    id: 'assetManagement',
    label: 'Pusat Aset',
    icon: AssetIcon,
    permission: 'assets:view', 
    children: [
      { id: 'registration', label: 'Catat Aset', icon: RegisterIcon, permission: 'assets:create' },
      { id: 'stock', label: 'Stok Aset', icon: BoxIcon, permission: 'assets:view' },
      {
        id: 'request-parent',
        label: 'Request Aset',
        icon: RequestIcon,
        children: [
          { id: 'request-new', page: 'request', label: 'Request Baru', icon: RequestIcon, permission: 'requests:view:own' },
          { id: 'request-loan', page: 'request-pinjam', label: 'Request Pinjam', icon: JournalCheckIcon, permission: 'loan-requests:view:own' },
        ],
      },
      { id: 'handover', label: 'Handover Aset', icon: HandoverIcon, permission: 'assets:handover' },
      { id: 'repair', label: 'Perbaikan Aset', icon: WrenchIcon, permission: 'assets:repair:manage' },
    ],
  },
  {
    id: 'customerManagement',
    label: 'Manajemen Pelanggan',
    icon: CustomerIcon,
    permission: 'customers:view',
    children: [
      { id: 'customers', label: 'Daftar Pelanggan', icon: UsersIcon, permission: 'customers:view' },
      { id: 'customer-installation-form', page: 'customer-installation-form', label: 'Manajemen Instalasi', icon: FileSignatureIcon, permission: 'assets:install' },
      { id: 'customer-maintenance-form', page: 'customer-maintenance-form', label: 'Manajemen Maintenance', icon: WrenchIcon, permission: 'maintenances:view' },
      { id: 'customer-dismantle', page: 'customer-dismantle', label: 'Data Dismantle', icon: DismantleIcon, permission: 'assets:dismantle' },
    ],
  },
  {
    id: 'settings',
    label: 'Pengaturan',
    icon: SettingsIcon,
    children: [
        { id: 'settings-akun', page: 'pengaturan-akun', label: 'Kelola Akun', icon: UserCogIcon, permission: 'account:manage' },
        { id: 'settings-pengguna', page: 'pengaturan-pengguna', label: 'Akun & Divisi', icon: UsersIcon, permission: 'users:view' },
        { id: 'settings-kategori', page: 'kategori', label: 'Kategori & Model', icon: CategoryIcon, permission: 'categories:manage' },
    ]
  },
];


const NavLink: React.FC<{
  item: MenuItem;
  activePage: Page;
  onClick: () => void;
  isSubmenu?: boolean;
}> = ({ item, activePage, onClick, isSubmenu = false }) => {
  const pageId = item.page || (item.id as Page);
  const isActive = activePage === pageId;
  
  // Design Update: Cleaner hover states and active indicator
  const baseClasses = 'relative flex items-center px-4 py-2.5 my-1 rounded-lg text-sm font-medium transition-all duration-200 group';
  const activeClasses = 'bg-white/10 text-white shadow-sm';
  const inactiveClasses = 'text-slate-400 hover:bg-white/5 hover:text-slate-100';

  const linkContent = (
    <>
        {/* Active Indicator Strip */}
        {isActive && !item.isExternal && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-tm-primary rounded-r-full shadow-[0_0_10px_rgba(37,99,235,0.6)]"></span>
        )}
        <item.icon className={`flex-shrink-0 w-5 h-5 mr-3 transition-colors ${isActive ? 'text-tm-primary' : 'text-slate-500 group-hover:text-slate-300'}`} />
        <span className="tracking-wide">{item.label}</span>
        {item.isExternal && (
            <svg className="w-4 h-4 ml-auto text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
        )}
    </>
  );

  return (
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={`${baseClasses} ${isActive ? activeClasses : inactiveClasses}`}
    >
        {linkContent}
    </a>
  );
};


export const Sidebar: React.FC<SidebarProps> = ({ 
  currentUser: propUser, 
  activePage: propActivePage, 
  setActivePage: propSetActivePage, 
  isOpen: propIsOpen, 
  setIsOpen: propSetIsOpen 
}) => {
    // Zustand Integration
    const storeActivePage = useUIStore((state) => state.activePage);
    const storeSetActivePage = useUIStore((state) => state.setActivePage);
    const storeSidebarOpen = useUIStore((state) => state.sidebarOpen);
    const storeToggleSidebar = useUIStore((state) => state.toggleSidebar);
    const storeUser = useAuthStore((state) => state.currentUser);

    const activePage = storeActivePage;
    const currentUser = storeUser || propUser;
    const isOpen = storeSidebarOpen; 

    const handleSetActivePage = (page: Page, filters?: any) => {
        storeSetActivePage(page, filters);
        propSetActivePage(page, filters); 
    };

    const handleSetIsOpen = (val: boolean) => {
        storeToggleSidebar(val);
        propSetIsOpen(val); 
    };

    const [openMenus, setOpenMenus] = useState<Record<string, boolean>>(() => {
        const initialState: Record<string, boolean> = {};
        allMenuItems.forEach(item => {
            if (item.children) {
                const childPages = item.children.flatMap(c => c.children ? c.children.map(gc => gc.page || gc.id) : [c.page || c.id]);
                if (childPages.includes(activePage)) {
                    initialState[item.id] = true;
                }
            }
        });
        return initialState;
    });

    const menuItems = useMemo(() => {
        const filterVisibleItems = (items: MenuItem[]): MenuItem[] => {
            return items.reduce((acc: MenuItem[], item) => {
                if (item.permission && !hasPermission(currentUser, item.permission)) {
                    return acc;
                }

                if (item.children && item.children.length > 0) {
                    const visibleChildren = filterVisibleItems(item.children);
                    if (visibleChildren.length === 0) {
                        if (!item.page && !item.path) {
                            return acc;
                        }
                        return [...acc, { ...item, children: undefined }];
                    }
                    return [...acc, { ...item, children: visibleChildren }];
                }

                return [...acc, item];
            }, []);
        };

        return filterVisibleItems(allMenuItems);
    }, [currentUser]);


    useEffect(() => {
        allMenuItems.forEach(item => {
            if (item.children) {
                const childPages = item.children.flatMap(c => c.children ? c.children.map(gc => gc.page || gc.id) : [c.page || c.id]);
                if (childPages.includes(activePage)) {
                    setOpenMenus(prev => ({...prev, [item.id]: true}));
                    const parentOfActive = item.children.find(c => c.children?.some(gc => (gc.page || gc.id) === activePage));
                    if(parentOfActive) {
                         setOpenMenus(prev => ({...prev, [parentOfActive.id]: true}));
                    }
                }
            }
        });
    }, [activePage]);

    const handleNavClick = (page: Page, filters?: Record<string, any>) => {
        handleSetActivePage(page, filters);
        if(window.innerWidth < 768) { 
            handleSetIsOpen(false);
        }
    };
    
    const SidebarContent = () => (
        // Design Update: Uses Slate-900 (tm-dark) with a subtle gradient hint
        <div className="flex flex-col h-full bg-slate-900 text-slate-300 border-r border-slate-800 shadow-2xl">
            {/* Header: Fixed Height & Branding */}
            <div className="flex items-center justify-between h-16 px-6 border-b border-slate-800/50 flex-shrink-0 bg-slate-900/50 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <TrinitiLogoIcon className="w-8 h-8 text-tm-primary drop-shadow-[0_0_8px_rgba(37,99,235,0.5)]" />
                    </div>
                    <span className="text-lg font-bold tracking-wider text-white font-display">
                        Triniti<span className="font-light opacity-60">Asset</span>
                    </span>
                </div>
                <button onClick={() => handleSetIsOpen(false)} className="text-slate-400 md:hidden hover:text-white p-1 rounded hover:bg-white/10 transition-colors">
                    <CloseIcon />
                </button>
            </div>

            {/* Navigation: Scrollable with flex-grow */}
            <nav className="flex-1 overflow-y-auto dark-scrollbar p-4 min-h-0 space-y-1">
                {menuItems.map((item) => {
                    if (!item.children || item.children.length === 0) {
                        return (
                            <NavLink 
                                key={item.id} 
                                item={item}
                                activePage={activePage} 
                                onClick={() => handleNavClick((item.page || item.id) as Page)}
                            />
                        );
                    }

                    const isParentActive = item.children?.some(child => 
                        (child.page || child.id) === activePage || 
                        child.children?.some(gc => (gc.page || gc.id) === activePage)
                    );

                    return (
                        <div key={item.id} className="mb-1">
                            <button
                                onClick={() => setOpenMenus(prev => ({...prev, [item.id]: !prev[item.id]}))}
                                className={`flex items-center justify-between w-full px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group focus:outline-none ${isParentActive ? 'text-white bg-white/5' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}
                            >
                                <div className="flex items-center">
                                    <item.icon className={`flex-shrink-0 w-5 h-5 mr-3 transition-colors ${isParentActive ? 'text-tm-primary' : 'text-slate-500 group-hover:text-slate-300'}`} />
                                    <span className="tracking-wide">{item.label}</span>
                                </div>
                                <ChevronDownIcon className={`w-4 h-4 transform transition-transform duration-200 opacity-50 ${openMenus[item.id] ? 'rotate-180' : 'rotate-0'}`} />
                            </button>
                            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openMenus[item.id] ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
                                <div className="pt-1 pb-1 pl-4 relative">
                                    {/* Indentation line */}
                                    <div className="absolute left-6 top-0 bottom-0 w-px bg-slate-800"></div>
                                    {item.children.map((child) => {
                                        if (!child.children || child.children.length === 0) {
                                            return (
                                                <NavLink
                                                    key={child.id}
                                                    item={child}
                                                    activePage={activePage}
                                                    onClick={() => handleNavClick((child.page || child.id) as Page, child.filter)}
                                                    isSubmenu={true}
                                                />
                                            );
                                        }

                                        const isChildParentActive = child.children?.some(gc => (gc.page || gc.id) === activePage);
                                        
                                        return (
                                            <div key={child.id} className="mt-1">
                                                <button
                                                    onClick={() => setOpenMenus(prev => ({...prev, [child.id]: !prev[child.id]}))}
                                                    className={`flex items-center justify-between w-full px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 group focus:outline-none ${isChildParentActive ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}
                                                >
                                                    <div className="flex items-center">
                                                        <child.icon className={`flex-shrink-0 w-4 h-4 mr-3 transition-colors ${isChildParentActive ? 'text-tm-primary' : 'text-slate-600 group-hover:text-slate-400'}`} />
                                                        <span>{child.label}</span>
                                                    </div>
                                                    <ChevronDownIcon className={`w-3 h-3 transform transition-transform duration-200 ${openMenus[child.id] ? 'rotate-180' : 'rotate-0'}`} />
                                                </button>
                                                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${openMenus[child.id] ? 'max-h-96' : 'max-h-0'}`}>
                                                    <div className="pt-1 pb-1 pl-4 border-l border-slate-800 ml-6">
                                                        {child.children.map((grandchild) => (
                                                             <NavLink
                                                                key={grandchild.id}
                                                                item={grandchild}
                                                                activePage={activePage}
                                                                onClick={() => handleNavClick((grandchild.page || grandchild.id) as Page, grandchild.filter)}
                                                                isSubmenu={true}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </nav>
            
            {/* Footer: Fixed Height */}
            <div className="p-4 border-t border-slate-800 bg-slate-900 flex-shrink-0">
                <div className="flex items-center justify-center p-3 rounded-lg bg-slate-800/50 border border-slate-800">
                    <p className="text-[10px] text-slate-500 text-center font-medium">
                        © 2025 Triniti Media Indonesia<br/>
                        <span className="opacity-50">v1.2.0-Ent</span>
                    </p>
                </div>
            </div>
        </div>
    );

    return (
        <>
            {/* Mobile overlay */}
            <div 
                className={`fixed inset-0 z-20 bg-slate-900/80 backdrop-blur-sm transition-opacity md:hidden no-print ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => handleSetIsOpen(false)}
            />
            
            {/* Sidebar */}
            <aside className={`fixed top-0 left-0 z-30 h-full w-64 bg-slate-900 transform transition-transform duration-300 ease-in-out md:translate-x-0 no-print shadow-2xl ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <SidebarContent />
            </aside>
        </>
    );
};
