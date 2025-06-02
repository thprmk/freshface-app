'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const Sidebar = () => {
  const pathname = usePathname();

  return (
    <div className="w-64 h-screen bg-[#ffff] text-black fixed left-0 top-0">
      <div className="p-6">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-black rounded-full"></div>
          <h1 className="text-xl font-semibold">ff project</h1>
        </div>

        {/* Navigation */}
        <nav className="space-y-2">
          <Link
            href="/appointment"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              pathname === '/appointment'
                ? 'bg-white/10'
                : 'hover:bg-white/5'
            }`}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span>Appointments</span>
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