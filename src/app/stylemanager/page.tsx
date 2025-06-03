'use client';

import { useState } from 'react';
import ServiceManager from '@/app/admin/services/page';
// import StylistManager from './stylists/page';
// import ProductManager from './products/page';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'services' | 'stylists' | 'products'>('services');

  const baseBtnClasses = "w-full text-left px-5 py-3 rounded font-semibold transition-colors duration-300";
  const activeBtnClasses = "bg-gray-800 text-white shadow-lg";
  const inactiveBtnClasses = "text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700";

  return (
    <div className="flex min-h-screen font-sans bg-[rgb(var(--background-rgb))] text-[rgb(var(--foreground-rgb))]">
      {/* Sidebar */}
      <nav className="w-52 border-r border-gray-300 dark:border-gray-200 bg-[rgb(var(--background-rgb))] dark:bg-white p-6">
        <ul className="space-y-4">
          <li>
            <button
              className={`${baseBtnClasses} ${activeTab === 'services' ? activeBtnClasses : inactiveBtnClasses}`}
              onClick={() => setActiveTab('services')}
            >
              Services
            </button>
          </li>
          <li>
            <button
              className={`${baseBtnClasses} ${activeTab === 'stylists' ? activeBtnClasses : inactiveBtnClasses}`}
              onClick={() => setActiveTab('stylists')}
            >
              Stylists
            </button>
          </li>
          <li>
            <button
              className={`${baseBtnClasses} ${activeTab === 'products' ? activeBtnClasses : inactiveBtnClasses}`}
              onClick={() => setActiveTab('products')}
            >
              Products
            </button>
          </li>
        </ul>
      </nav>

      {/* Content */}
      <main className="flex-1 p-8 bg-[rgb(var(--background-rgb))] dark:bg-white">
       {activeTab === 'services' && <ServiceManager />}
         {/* {/* {activeTab === 'stylists' && <StylistManager />}
        {activeTab === 'products' && <ProductManager />}  */}
      </main>
    </div>
  );
}
