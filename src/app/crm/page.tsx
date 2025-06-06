'use client';

import React, { useState, useEffect, useCallback, FormEvent } from 'react';
// CrmCustomerDetailPanel is no longer imported as it will be part of this file.

// Import Heroicons
import {
  UserGroupIcon,
  UserPlusIcon,
  CheckBadgeIcon,
  NoSymbolIcon,
  PlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  GiftIcon, // Import GiftIcon for the loyalty section
} from '@heroicons/react/24/outline';

// --- Interfaces (with Loyalty Points) ---
interface AppointmentHistoryItem {
  _id: string;
  id: string;
  service: string;
  stylist?: string;
  date: string; // ISO Date string
  time: string;
  status: string; // Appointment status
  amount?: number;
  notes?: string;
}

interface MembershipUIDetails {
  planName: string;
  status: 'Active' | 'Expired' | 'Cancelled' | 'PendingPayment';
  startDate: string; // ISO Date string
  endDate: string;   // ISO Date string
  benefits?: string[];
}

interface LoyaltyTransactionItem {
  id: string;
  _id: string;
  points: number;
  type: 'Credit' | 'Debit';
  reason: string;
  createdAt?: string;
}

interface CrmCustomer {
  id: string;
  _id: string;
  name: string;
  email: string;
  phoneNumber: string;
  createdAt?: string;
  updatedAt?: string;
  status?: 'Active' | 'Inactive' | 'New';
  appointmentHistory?: AppointmentHistoryItem[];
  currentMembership?: MembershipUIDetails | null;
  loyaltyPoints?: number;
  loyaltyHistory?: LoyaltyTransactionItem[];
}

interface MembershipPlanFE {
  _id: string;
  id: string;
  name: string;
  price: number;
  durationDays: number;
  description?: string;
  benefits?: string[];
}

interface AddCustomerFormData {
  name: string;
  email: string;
  phoneNumber: string;
}

// ======================================================================
// === CrmCustomerDetailPanel Component is now included in this file ===
// ======================================================================
interface CrmCustomerDetailPanelProps {
  customer: CrmCustomer | null;
  isOpen: boolean;
  onClose: () => void;
  onAddMembership: (customerId: string) => void;
  onDataRefresh: (customerId: string) => Promise<void>;
}

const CrmCustomerDetailPanel: React.FC<CrmCustomerDetailPanelProps> = ({ customer, isOpen, onClose, onAddMembership, onDataRefresh }) => {
  const [pointsToAdjust, setPointsToAdjust] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [isAdjustingPoints, setIsAdjustingPoints] = useState(false);
  const [adjustmentError, setAdjustmentError] = useState<string | null>(null);

  useEffect(() => {
    if (customer) { setPointsToAdjust(''); setAdjustmentReason(''); setAdjustmentError(null); setIsAdjustingPoints(false); }
  }, [customer]);

  const handleAdjustPoints = async (e: FormEvent) => {
    e.preventDefault();
    if (!customer) return;
    const points = Number(pointsToAdjust);
    if (isNaN(points) || points === 0) { setAdjustmentError('Please enter a valid, non-zero number.'); return; }
    if (!adjustmentReason.trim()) { setAdjustmentError('Please provide a reason for the adjustment.'); return; }
    setIsAdjustingPoints(true); setAdjustmentError(null);
    try {
      const response = await fetch(`/api/customer/${customer.id}/points`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ points, reason: adjustmentReason.trim() }) });
      const result = await response.json();
      if (!response.ok || !result.success) { throw new Error(result.message || 'Failed to adjust points.'); }
      await onDataRefresh(customer.id);
    } catch (error: any) { setAdjustmentError(error.message); }
    finally { setIsAdjustingPoints(false); }
  };

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return 'N/A';
    try { return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }); }
    catch (e) { return 'Invalid Date'; }
  };

  const panelClasses = `fixed top-0 right-0 h-full bg-white shadow-2xl transition-transform duration-300 ease-in-out z-40 w-full md:w-[400px] lg:w-[450px] ${isOpen ? 'translate-x-0' : 'translate-x-full'}`;

  return (
    <aside className={panelClasses} aria-hidden={!isOpen}>
      {customer ? (
        <div className="h-full flex flex-col">
          <div className="p-6 pb-4 border-b border-gray-200 flex-shrink-0 flex justify-between items-center"><h3 className="text-xl font-semibold text-gray-900 truncate pr-2">{customer.name}</h3><button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></button></div>
          <div className="flex-grow overflow-y-auto">
            <div className="px-6 pt-4 space-y-1.5 text-sm mb-3"><p className="text-gray-800"><strong>Email:</strong> <a href={`mailto:${customer.email}`} className="text-indigo-600 hover:text-indigo-800 break-all">{customer.email}</a></p><p className="text-gray-800"><strong>Phone:</strong> <a href={`tel:${customer.phoneNumber}`} className="text-indigo-600 hover:text-indigo-800">{customer.phoneNumber}</a></p><p className="text-gray-800"><strong>Joined:</strong> <span className="text-gray-600">{formatDate(customer.createdAt)}</span></p>{customer.status && (<p className="text-gray-800 flex items-center"><strong className="mr-2">Status:</strong><span className={`px-2 py-0.5 inline-flex text-xs leading-tight font-semibold rounded-full ${customer.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{customer.status}</span></p>)}</div>
            <div className="px-6 mb-4">{customer.currentMembership ? (<div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200"><p className="text-indigo-700">{customer.currentMembership.planName}</p></div>) : (<button onClick={() => onAddMembership(customer.id)} className="w-full bg-indigo-600 text-white font-medium py-2.5 px-4 rounded-lg hover:bg-indigo-700">+ Add Membership</button>)}</div>
            <hr className="mx-6 my-4 border-gray-200"/>
            <div className="px-6 pb-4"><h4 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2"><GiftIcon className="w-5 h-5 text-indigo-600"/>Loyalty Program</h4><div className="bg-indigo-50 p-4 rounded-lg mb-4 text-center"><p className="text-sm font-medium text-indigo-800">Current Point Balance</p><p className="text-4xl font-bold text-indigo-900">{customer.loyaltyPoints ?? 0}</p></div><form onSubmit={handleAdjustPoints} className="space-y-3 p-4 border rounded-lg bg-gray-50/70"><h5 className="font-medium text-gray-700">Adjust Points</h5>{adjustmentError && <div className="text-sm text-red-600 bg-red-100 p-2 rounded-md">{adjustmentError}</div>}<div className="flex gap-2"><input type="number" placeholder="+50" value={pointsToAdjust} onChange={e => setPointsToAdjust(e.target.value)} className="w-28 px-2 py-1.5 border rounded-md text-sm" required /><input type="text" placeholder="Reason" value={adjustmentReason} onChange={e => setAdjustmentReason(e.target.value)} className="flex-grow px-2 py-1.5 border rounded-md text-sm" required /></div><button type="submit" disabled={isAdjustingPoints} className="w-full bg-black text-white text-sm font-medium py-2 rounded-md hover:bg-gray-800 disabled:bg-gray-400">{isAdjustingPoints ? 'Submitting...' : 'Submit'}</button></form>{customer.loyaltyHistory && customer.loyaltyHistory.length > 0 && <div className="mt-6"><h5 className="text-sm font-medium text-gray-500 mb-2">Recent History</h5><ul className="divide-y border rounded-lg max-h-60 overflow-y-auto">{customer.loyaltyHistory.map(log => <li key={log.id} className="flex justify-between items-center p-3 text-sm bg-white"><div><p className={`font-semibold ${log.type === 'Credit' ? 'text-green-600' : 'text-red-600'}`}>{log.type === 'Credit' ? `+${log.points}` : `-${log.points}`}</p><p className="text-gray-600">{log.reason}</p></div><p className="text-xs text-gray-400">{formatDate(log.createdAt)}</p></li>)}</ul></div>}</div>
            <hr className="mx-6 my-4 border-gray-200"/>
            <div className="px-6 pb-6 flex-grow"><h4 className="text-lg font-semibold text-gray-800 mb-3">Appointment History</h4>{(!customer.appointmentHistory || customer.appointmentHistory.length === 0) ? (<p className="text-gray-500 text-sm py-4 text-center">No appointments found.</p>) : (<ul className="space-y-3 text-sm">{customer.appointmentHistory.map(apt => (<li key={apt.id} className="p-3 bg-gray-50 rounded-lg border"><p className="font-semibold text-gray-800">{apt.service}</p><p className="text-gray-600 text-xs">{formatDate(apt.date)}</p></li>))}</ul>)}</div>
          </div>
        </div>
      ) : (<div className="p-6 text-center text-gray-500">Loading...</div>)}
    </aside>
  );
};


// --- AddCustomerModal Component ---
const AddCustomerModal: React.FC<{isOpen: boolean, onClose: () => void, onAddCustomer: (data: AddCustomerFormData) => Promise<void>}> = ({ isOpen, onClose, onAddCustomer }) => {
  const [formData, setFormData] = useState<AddCustomerFormData>({ name: '', email: '', phoneNumber: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFormData({ name: '', email: '', phoneNumber: '' }); setFormError(null); setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => { setFormData(prev => ({ ...prev, [e.target.name]: e.target.value })); };
  
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); setFormError(null);
    if (!formData.name || !formData.email || !formData.phoneNumber) { setFormError("All fields are required."); return; }
    setIsSubmitting(true);
    try { await onAddCustomer(formData); } catch (error: any) { setFormError(error.message || "Failed to add customer."); }
    finally { setIsSubmitting(false); }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-[70] flex justify-center items-center p-4">
      <div className="bg-white p-6 md:p-8 rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-semibold text-gray-800">Add New Customer</h2><button onClick={onClose} className="text-gray-400 hover:text-gray-600"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></button></div>
        {formError && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">{formError}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label><input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500" placeholder="e.g., Jane Doe"/></div>
          <div><label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" name="email" id="email" value={formData.email} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500" placeholder="e.g., jane.doe@example.com"/></div>
          <div><label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">Phone</label><input type="tel" name="phoneNumber" id="phoneNumber" value={formData.phoneNumber} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500" placeholder="e.g., (555) 123-4567"/></div>
          <div className="mt-8 flex justify-end space-x-3"><button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200" disabled={isSubmitting}>Cancel</button><button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-black rounded-md hover:bg-gray-800 disabled:opacity-50" disabled={isSubmitting}>{isSubmitting ? "Adding..." : "Add Customer"}</button></div>
        </form>
      </div>
    </div>
  );
};

// --- StatCard Component ---
const StatCard: React.FC<{title: string, value: string, icon?: React.ReactNode}> = ({ title, value, icon }) => (
  <div className="bg-white p-5 rounded-xl shadow-sm"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-gray-500 truncate">{title}</p><p className="mt-1 text-3xl font-semibold text-gray-900">{value}</p></div>{icon && <div className="flex-shrink-0 h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">{React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { className: 'h-6 w-6' }) : icon}</div>}</div></div>
);


// --- CrmPage Component (Main Page) ---
export default function CrmPage() {
  const [customers, setCustomers] = useState<CrmCustomer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCustomerCount, setTotalCustomerCount] = useState(0);
  const [selectedCustomer, setSelectedCustomer] = useState<CrmCustomer | null>(null);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);
  const [isPanelDataLoading, setIsPanelDataLoading] = useState(false);
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [isAddMembershipModalOpen, setIsAddMembershipModalOpen] = useState(false);
  const [customerToAddMembershipTo, setCustomerToAddMembershipTo] = useState<CrmCustomer | null>(null);
  const [availableMembershipPlans, setAvailableMembershipPlans] = useState<MembershipPlanFE[]>([]);
  const [isMembershipPlansLoading, setIsMembershipPlansLoading] = useState(false);
  const [selectedPlanIdForNewMembership, setSelectedPlanIdForNewMembership] = useState<string>('');
  const [addMembershipError, setAddMembershipError] = useState<string | null>(null);
  const [isAddingMembership, setIsAddingMembership] = useState(false);

  useEffect(() => { const handler = setTimeout(() => { setDebouncedSearchTerm(searchTerm); setCurrentPage(1); }, 500); return () => clearTimeout(handler); }, [searchTerm]);

  const fetchCustomers = useCallback(async (pageToFetch = 1) => {
    setIsLoading(true); setPageError(null);
    try {
      const response = await fetch(`/api/customer?page=${pageToFetch}&limit=${itemsPerPage}&search=${debouncedSearchTerm}`);
      const apiResponse = await response.json();
      if (!response.ok || !apiResponse.success) throw new Error(apiResponse.message || 'Failed to fetch customers');
      setCustomers(apiResponse.customers);
      setCurrentPage(apiResponse.pagination.currentPage);
      setTotalPages(apiResponse.pagination.totalPages);
      setTotalCustomerCount(apiResponse.pagination.totalCustomers);
    } catch (err: any) { setPageError(err.message); }
    finally { setIsLoading(false); }
  }, [itemsPerPage, debouncedSearchTerm]);

  useEffect(() => { fetchCustomers(currentPage); }, [fetchCustomers, currentPage]);

  const handleAddCustomer = async (customerData: AddCustomerFormData) => {
    const response = await fetch('/api/customer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(customerData) });
    const result = await response.json();
    if (!response.ok || !result.success) { throw new Error(result.message || 'Failed to add customer.'); }
    alert('Customer added successfully!'); setIsAddCustomerModalOpen(false); await fetchCustomers(1);
  };

  const fetchCustomerDetailsWithHistory = async (customerId: string): Promise<CrmCustomer | null> => {
    setPageError(null);
    const response = await fetch(`/api/customer/${customerId}`);
    const apiResponse = await response.json();
    if (!response.ok || !apiResponse.success) throw new Error(apiResponse.message || 'Failed to fetch customer details');
    return apiResponse.customer;
  };

  const handleViewCustomerDetails = useCallback(async (customer: CrmCustomer) => {
    if (isDetailPanelOpen && selectedCustomer?.id === customer.id) { setIsDetailPanelOpen(false); return; }
    setIsDetailPanelOpen(true);
    setSelectedCustomer(null);
    setIsPanelDataLoading(true);
    try {
      const detailedData = await fetchCustomerDetailsWithHistory(customer.id);
      setSelectedCustomer(detailedData);
    } catch (error: any) { setPageError("Error loading details: " + error.message); setIsDetailPanelOpen(false); }
    finally { setIsPanelDataLoading(false); }
  }, [isDetailPanelOpen, selectedCustomer]);

  const handlePanelDataRefresh = async (customerId: string) => {
    try {
      const refreshedData = await fetchCustomerDetailsWithHistory(customerId);
      if (refreshedData) {
        setSelectedCustomer(refreshedData);
        setCustomers(prev => prev.map(c => (c.id === customerId ? { ...c, ...refreshedData } : c)));
      }
    } catch (error: any) { setPageError("Failed to refresh customer data: " + error.message); }
  };

  const closeDetailPanel = () => { setIsDetailPanelOpen(false); setSelectedCustomer(null); };

  const handleOpenAddMembershipForCustomer = async (customerId: string) => {
    const cust = customers.find(c => c.id === customerId) || selectedCustomer;
    if (!cust) return;
    setCustomerToAddMembershipTo(cust);
    setIsMembershipPlansLoading(true); setAddMembershipError(null);
    try {
      const res = await fetch('/api/membership-plans');
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || 'Failed to fetch plans');
      setAvailableMembershipPlans(data.plans);
      setIsAddMembershipModalOpen(true);
    } catch (e: any) { setAddMembershipError("Error: " + e.message); }
    finally { setIsMembershipPlansLoading(false); }
  };

  const handleCloseAddMembershipModal = () => { setIsAddMembershipModalOpen(false); setCustomerToAddMembershipTo(null); setSelectedPlanIdForNewMembership(''); setAddMembershipError(null); };

  const handleConfirmAndSubmitMembership = async () => {
    if (!customerToAddMembershipTo || !selectedPlanIdForNewMembership) return;
    setIsAddingMembership(true); setAddMembershipError(null);
    try {
      const response = await fetch('/api/customer-membership', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customerId: customerToAddMembershipTo.id, membershipPlanId: selectedPlanIdForNewMembership }) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Failed to add membership.");
      alert("Membership added successfully!"); handleCloseAddMembershipModal();
      if (selectedCustomer?.id === customerToAddMembershipTo.id) { await handlePanelDataRefresh(customerToAddMembershipTo.id); }
      await fetchCustomers(currentPage);
    } catch (error: any) { setAddMembershipError("Error: " + error.message); }
    finally { setIsAddingMembership(false); }
  };

  const activeCustomersOnPage = customers.filter(c => c.status === 'Active').length;
  const inactiveCustomersOnPage = customers.filter(c => c.status === 'Inactive').length;
  const newCustomersThisMonthOnPage = customers.filter(c => c.createdAt && new Date(c.createdAt).getMonth() === new Date().getMonth()).length;

  const goToPage = (pageNumber: number) => { if (pageNumber >= 1 && pageNumber <= totalPages) { setCurrentPage(pageNumber); } };

  return (
    <div className="min-h-screen bg-gray-50/30">
      <div className={`flex-grow p-4 md:p-8 transition-all duration-300 ease-in-out ${isDetailPanelOpen ? 'md:mr-[400px] lg:mr-[450px]' : 'mr-0'}`}>
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <div><h1 className="text-3xl font-bold text-gray-900">Customers</h1><p className="text-sm text-gray-600">Manage customer data.</p></div>
          <button onClick={() => setIsAddCustomerModalOpen(true)} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-black rounded-lg hover:bg-gray-800"><PlusIcon className="w-5 h-5"/><span>Add Customer</span></button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard title="Total Customers" value={isLoading ? "..." : totalCustomerCount.toString()} icon={<UserGroupIcon />} />
          <StatCard title="Active (on page)" value={isLoading ? "..." : activeCustomersOnPage.toString()} icon={<CheckBadgeIcon />} />
          <StatCard title="Inactive (on page)" value={isLoading ? "..." : inactiveCustomersOnPage.toString()} icon={<NoSymbolIcon />} />
          <StatCard title="New This Month (page)" value={isLoading ? "..." : newCustomersThisMonthOnPage.toString()} icon={<UserPlusIcon />} />
        </div>

        {pageError && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm flex justify-between items-center"><span>{pageError}</span><button onClick={()=> setPageError(null)} className="ml-2 text-xs font-bold underline">Dismiss</button></div>}

        <div className="mb-6 bg-white p-4 rounded-xl shadow-sm">
          <input type="text" placeholder="Search customers by name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-4 py-3 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"/>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {isLoading && <div className="p-10 text-center text-gray-600">Loading customers...</div>}
          {!isLoading && !pageError && customers.length === 0 && ( <div className="p-10 text-center text-gray-600">{debouncedSearchTerm ? "No customers match your search." : "No customers found."}</div> )}
          {!isLoading && !pageError && customers.length > 0 && (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left"><thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b"><tr><th scope="col" className="px-6 py-3">Name</th><th scope="col" className="px-6 py-3">Contact</th><th scope="col" className="px-6 py-3">Status</th><th scope="col" className="px-6 py-3">Joined</th></tr></thead><tbody className="divide-y divide-gray-200">{customers.map((customer) => (<tr key={customer.id} className="hover:bg-gray-50/70 cursor-pointer" onClick={() => handleViewCustomerDetails(customer)}><td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-gray-900">{customer.name}</div><div className="text-xs text-gray-500">{customer.email}</div></td><td className="px-6 py-4 whitespace-nowrap text-gray-600">{customer.phoneNumber}</td><td className="px-6 py-4 whitespace-nowrap">{customer.status && (<span className={`px-2 py-1 inline-flex text-xs leading-tight font-semibold rounded-full ${customer.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{customer.status}</span>)}</td><td className="px-6 py-4 whitespace-nowrap text-gray-600">{customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : 'N/A'}</td></tr>))}</tbody></table>
              </div>
              {totalPages > 1 && (<div className="px-6 py-4 border-t flex items-center justify-between text-sm text-gray-600"><p>Showing <b>{(currentPage - 1) * itemsPerPage + 1}</b> - <b>{Math.min(currentPage * itemsPerPage, totalCustomerCount)}</b> of <b>{totalCustomerCount}</b></p><div className="flex items-center space-x-1"><button onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1} className="p-2 disabled:opacity-50"><ChevronLeftIcon className="h-5 w-5"/></button><span>Page {currentPage} of {totalPages}</span><button onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= totalPages} className="p-2 disabled:opacity-50"><ChevronRightIcon className="h-5 w-5"/></button></div></div>)}
            </>
          )}
        </div>
      </div>
      
      <CrmCustomerDetailPanel customer={selectedCustomer} isOpen={isDetailPanelOpen} onClose={closeDetailPanel} onAddMembership={handleOpenAddMembershipForCustomer} onDataRefresh={handlePanelDataRefresh}/>
      
      {isDetailPanelOpen && (<div onClick={closeDetailPanel} className="fixed inset-0 bg-black/30 z-30 md:hidden"/>)}
      
      <AddCustomerModal isOpen={isAddCustomerModalOpen} onClose={() => setIsAddCustomerModalOpen(false)} onAddCustomer={handleAddCustomer}/>

      {isAddMembershipModalOpen && customerToAddMembershipTo && (
        <div className="fixed inset-0 bg-black bg-opacity-70 z-[60] flex justify-center items-center p-4">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-lg  text-black"><div className="flex justify-between items-center mb-4"><h3 className="text-xl font-semibold">Add Membership to {customerToAddMembershipTo.name}</h3><button onClick={handleCloseAddMembershipModal} className="text-gray-500 hover:text-gray-700">×</button></div>{addMembershipError && <div className="my-2 p-2 bg-red-100 text-red-700 text-sm rounded">{addMembershipError}</div>}{isMembershipPlansLoading ? <p>Loading plans...</p> : availableMembershipPlans.length > 0 ? (<div className="space-y-4"><div><label htmlFor="membershipPlanSelect" className="block text-sm font-medium">Select Membership Plan:</label><select id="membershipPlanSelect" value={selectedPlanIdForNewMembership} onChange={(e) => setSelectedPlanIdForNewMembership(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 border-gray-300 rounded-md"><option value="" disabled>-- Choose a plan --</option>{availableMembershipPlans.map(plan => ( <option key={plan._id} value={plan._id}>{plan.name} - ${plan.price.toFixed(2)} ({plan.durationDays} days)</option> ))}</select></div><div className="flex justify-end space-x-3 pt-3"><button type="button" onClick={handleCloseAddMembershipModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border rounded-md" disabled={isAddingMembership}>Cancel</button><button type="button" onClick={handleConfirmAndSubmitMembership} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md disabled:opacity-50" disabled={isAddingMembership || !selectedPlanIdForNewMembership}>{isAddingMembership ? 'Adding...' : 'Confirm & Add'}</button></div></div>) : <p>No membership plans available.</p>}</div>
        </div>
      )}

      <style jsx global>{`
        /* Minimal styles for animation */
        .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
}
//now the thing is if he/she have membership plan give 1 point per service if not give 0.5 point per service