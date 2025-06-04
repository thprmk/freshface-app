'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const Sidebar = () => {
  const pathname = usePathname();
  const [isTransitionMenuOpen, setIsTransitionMenuOpen] = useState(false);  // State to track the submenu toggle

  return (
    <div className="w-64 h-screen bg-[#ffff] text-black fixed left-0 top-0">
      <div className="p-6">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-black rounded-full"></div>
          <h1 className="text-xl font-semibold">Fresh Face app</h1>
        </div>

        {/* Navigation */}
        <nav className="space-y-2">
        <Link
            href="/"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              pathname === '/'
                ? 'bg-white/10'
                : 'hover:bg-white/5'
            }`}
          >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-house-icon lucide-house"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
            <span>Home</span>
          </Link>

          <Link
            href="/appointment"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              pathname === '/appointment'
                ? 'bg-white/10'
                : 'hover:bg-white/5'
            }`}
          >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-calendar-fold-icon lucide-calendar-fold"><path d="M8 2v4"/><path d="M16 2v4"/><path d="M21 17V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h11Z"/><path d="M3 10h18"/><path d="M15 22v-4a2 2 0 0 1 2-2h4"/></svg>            <span>Appointments</span>
          </Link>

          <div>
         {/* Transition link with submenu toggle */}
         <button
              onClick={() => setIsTransitionMenuOpen(!isTransitionMenuOpen)}  // Toggle submenu on click
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                pathname === '/transition' ? 'bg-white/10' : 'hover:bg-white/5'
              }`}
            >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-receipt-icon lucide-receipt"><path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"/><path d="M12 17.5v-11"/></svg>
              <span>Transition</span>
            </button>

            {/* Conditionally render the submenu */}
            {isTransitionMenuOpen && (
              <div className="pl-6 mt-2 space-y-2">
                <Link
                  href="/"
                  className={`block px-4 py-2 rounded-lg transition-colors ${
                    pathname === '/' ? 'bg-white/10' : 'hover:bg-white/5'
                  }`}
                >
                  Online
                </Link>
                <Link
                  href="/"
                  className={`block px-4 py-2 rounded-lg transition-colors ${
                    pathname === '/' ? 'bg-white/10' : 'hover:bg-white/5'
                  }`}
                >
                  Offline
                </Link>
              </div>
            )}
          </div>

          <Link
            href="/stylemanager"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              pathname === '/'
                ? 'bg-white/10'
                : 'hover:bg-white/5'
            }`}
          >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" className="lucide lucide-user-pen-icon lucide-user-pen"><path d="M11.5 15H7a4 4 0 0 0-4 4v2"/><path d="M21.378 16.626a1 1 0 0 0-3.004-3.004l-4.01 4.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z"/><circle cx="10" cy="7" r="4"/></svg>          <span>Style Manager</span>
          </Link>
        </nav>
      </div>

      {/* User Profile */}
      <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-400 rounded-full"></div>
          <div>
            <div className="font-medium">Owner</div>
            <div className="text-sm text-gray-600">Admin</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar; 