// src/components/Sidebar.tsx (or your preferred location)
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useMemo } from 'react'; // Added useMemo

interface NavSubItem {
  href: string;
  label: string;
  basePathForActive?: string; // Optional: for broader active matching
}

interface NavItemConfig {
  href: string;         // Main link for the item OR used as an ID for toggling
  label: string;
  icon: JSX.Element;
  subItems?: NavSubItem[];
}

// --- ICON PLACEHOLDERS ---
// Replace these with your actual SVG components or inline SVGs
const DashboardIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);
const AppointmentsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);
const CrmIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283-.356-1.857m0 0a3.004 3.004 0 01-2.732 0M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 0c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
  </svg>
);
const StaffManagementIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M23 21v-2a4 4 0 00-3-3.87"></path>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 3.13a4 4 0 010 7.75"></path>
  </svg>
);
// --- END ICON PLACEHOLDERS ---


const Sidebar = () => {
  const pathname = usePathname();
  const [openItemKey, setOpenItemKey] = useState<string | null>(null); // Use item's href as key

  // useMemo for navItems if it's complex and defined in the component
  // to prevent re-creating it on every render unless its own dependencies change (none here).
  // If navItems were from props, you wouldn't need useMemo here for it.
  const navItems: NavItemConfig[] = useMemo(() => [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: <DashboardIcon />,
    },
    {
      href: '/appointment',
      label: 'Appointments',
      icon: <AppointmentsIcon />,
    },
    {
      href: '/crm',
      label: 'CRM',
      icon: <CrmIcon />,
    },
    {
      // For items with subItems, href acts as a unique key for toggling
      // and can also be a fallback navigation path if needed.
      href: '/staffmanagement', // This will be the key for open/close state
      label: 'StaffManagement',
      icon: <StaffManagementIcon />,
      subItems: [
        { href: '/staffmanagement/attendance', label: 'Attendance' },
        { href: '/staffmanagement/advance', label: 'Advance' },
        { href: '/staffmanagement/performance', label: 'Performance' },
        { href: '/staffmanagement/salary', label: 'Salary' },
        {
          href: '/staffmanagement/staff/stafflist',
          label: 'Staff',
          basePathForActive: '/staffmanagement/staff', // Active for /staffmanagement/staff/*
        },
      ],
    },
    // Add more items here if needed
    // {
    //   href: '/another-section',
    //   label: 'Another Section',
    //   icon: <SomeOtherIcon />,
    //   subItems: [
    //     { href: '/another-section/sub1', label: 'Sub Page 1'},
    //   ]
    // }
  ], []); // Empty dependency array means navItems is created once

  useEffect(() => {
    let parentToOpenKey: string | null = null;

    for (const item of navItems) {
      if (item.subItems && item.subItems.length > 0) {
        const isParentOfActiveSubItem = item.subItems.some(subItem => {
          const activeCheckPath = subItem.basePathForActive || subItem.href;
          return pathname === subItem.href ||
                 (activeCheckPath !== '/' && pathname.startsWith(activeCheckPath) && (pathname.length === activeCheckPath.length || pathname[activeCheckPath.length] === '/'));
        });

        if (isParentOfActiveSubItem) {
          parentToOpenKey = item.href; // Use the parent's href as the key
          break;
        }
      }
    }
    
    // If no sub-item set its parent to open, check if the current path
    // is a main item that has sub-items (e.g., user is on /staffmanagement directly)
    if (!parentToOpenKey) {
        for (const item of navItems) {
            if (item.subItems && item.subItems.length > 0) {
                if (item.href !== '/' && pathname.startsWith(item.href) && (pathname.length === item.href.length || pathname[item.href.length] === '/')) {
                    parentToOpenKey = item.href;
                    break;
                }
            }
        }
    }

    setOpenItemKey(parentToOpenKey);
  }, [pathname, navItems]);

  const handleItemClick = (itemKey: string) => {
    // For items with subItems, toggle their open state.
    // For items without subItems, this click is handled by the Link navigation.
    setOpenItemKey(openItemKey === itemKey ? null : itemKey);
  };

  const isItemOrSubitemActive = (item: NavItemConfig, currentPath: string): boolean => {
    // Check if the main item link itself is active
    if (currentPath === item.href) return true;
    // Check if current path is a child of the main item's href (and not just root '/')
    if (item.href !== '/' && currentPath.startsWith(item.href + '/')) {
      return true;
    }

    // Check if any sub-item is active
    if (item.subItems) {
      return item.subItems.some(subItem => {
        const activeCheckPath = subItem.basePathForActive || subItem.href;
        return currentPath === subItem.href ||
               (activeCheckPath !== '/' && currentPath.startsWith(activeCheckPath) && (currentPath.length === activeCheckPath.length || currentPath[activeCheckPath.length] === '/'));
      });
    }
    return false;
  };


  return (
    <div className="w-64 h-screen bg-white text-black fixed left-0 top-0 shadow-lg overflow-y-auto">
      <div className="p-6">
        <div className="flex items-center gap-3 mb-8">
          {/* Your Logo/Brand */}
          <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center text-white font-bold text-lg">
            FF
          </div>
          <h1 className="text-xl font-semibold text-gray-800">FF Project</h1>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = isItemOrSubitemActive(item, pathname);
            const isOpen = openItemKey === item.href;

            return (
              <div key={item.label}> {/* Use item.label or item.href for key, ensure uniqueness */}
                {item.subItems ? (
                  // Item WITH sub-items: Render as a button to toggle
                  <>
                    <button
                      onClick={() => handleItemClick(item.href)}
                      aria-expanded={isOpen}
                      className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg transition-colors text-gray-700 ${
                        isActive ? 'bg-gray-100 text-black font-medium' : 'hover:bg-gray-50 hover:text-black'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        {item.icon}
                        <span>{item.label}</span>
                      </span>
                      <svg
                        className={`w-4 h-4 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : 'rotate-0'}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {/* Collapsible SubMenu Section */}
                    <div
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        isOpen ? 'max-h-screen' : 'max-h-0' // Simple height transition
                      }`}
                    >
                      {isOpen && ( // Conditionally render content to avoid issues with zero height elements still taking space or causing layout shifts
                        <div className="pl-7 mt-1 space-y-0.5 py-1"> {/* Added some padding */}
                          {item.subItems.map((subItem) => {
                            const activeSubCheckPath = subItem.basePathForActive || subItem.href;
                            const isSubActive = pathname === subItem.href ||
                                              (activeSubCheckPath !== '/' && pathname.startsWith(activeSubCheckPath) && (pathname.length === activeSubCheckPath.length || pathname[activeSubCheckPath.length] === '/'));

                            return (
                              <Link
                                key={subItem.label}
                                href={subItem.href}
                                className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors text-sm text-gray-600 ${
                                  isSubActive
                                    ? 'bg-gray-200 text-black font-medium'
                                    : 'hover:bg-gray-100 hover:text-black'
                                }`}
                              >
                                {/* Optional: Add an icon for sub-items if desired */}
                                <span>{subItem.label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  // Item WITHOUT sub-items: Render as a direct Link
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors text-gray-700 ${
                      isActive
                        ? 'bg-gray-100 text-black font-medium'
                        : 'hover:bg-gray-50 hover:text-black'
                    }`}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </Link>
                )}
              </div>
            );
          })}
        </nav>
      </div>

      {/* User Profile Section at the bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-gray-600">
            {/* Placeholder User Icon */}
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path>
            </svg>
          </div>
          <div>
            <div className="font-medium text-gray-800">Owner</div>
            <div className="text-sm text-gray-500">Admin</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;