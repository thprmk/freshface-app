'use client';

import React, { useState, useEffect, useCallback } from 'react';
import BookAppointmentForm, { NewBookingData } from './BookAppointmentForm';
import BillingModal from './billingmodal'; // Corrected import path

// --- INTERFACES ---
interface CustomerFromAPI { // Expected structure from GET /api/customer?id=... AND from populated customerId
  _id: string;
  id: string;
  name: string;
  email?: string;
  phoneNumber?: string;
  currentMembership?: any; // Define MembershipUIDetails here or import if shared
  // ... other fields your customer object has
}

interface AppointmentWithCustomer {
  _id: string;
  id: string;
  customerId: string | CustomerFromAPI; // Can be ID or populated object
  customer?: CustomerFromAPI;          // If API nests customer under 'customer' key
  customerName?: string;               // Fallback from original booking
  style: string;                     // Or 'style'
  stylist?: string;
  date: string;                        // ISO string or YYYY-MM-DD
  time: string;                        // e.g., "HH:MM"
  notes?: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled' | 'No-Show' | 'Billed' | 'Paid' | 'InProgress' | string; // Allow for more
  servicesPerformed?: Array<{ serviceName: string, price: number, serviceId?: string }>;
  // ... other appointment fields
}

// --- Helper Functions ---
const formatDate = (dateString: string | Date | undefined): string => {
  if (!dateString) return 'N/A';
  try {
    const dateObj = new Date(dateString);
    if (isNaN(dateObj.getTime())) {
      if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const parts = dateString.split('-');
        const utcDate = new Date(Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])));
        if (isNaN(utcDate.getTime())) return "Invalid Date";
        return utcDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
      }
      return "Invalid Date";
    }
    return dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch (e) { console.error("Error formatting date:", dateString, e); return 'Invalid Date'; }
};

const formatTime = (timeString: string | undefined): string => {
  if (!timeString || !/^\d{2}:\d{2}(:\d{2})?$/.test(timeString)) return "N/A"; // Handle undefined
  try {
    const [hours, minutes] = timeString.split(':');
    const h = parseInt(hours, 10);
    const m = parseInt(minutes, 10);
    if (isNaN(h) || isNaN(m)) return "Invalid Time";
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayHours = h % 12 || 12;
    return `${String(displayHours).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
  } catch (e) { console.error("Error formatting time:", timeString, e); return "Invalid Time"; }
};

// --- StatCard Component ---
const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; }> = ({ title, value, icon }) => (
  <div className="bg-white p-5 rounded-xl shadow-sm">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
        <p className="mt-1 text-3xl font-semibold text-gray-900">{value}</p>
      </div>
      <div className="flex-shrink-0 h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">
        {icon}
      </div>
    </div>
  </div>
);


// --- Main Page Component ---
export default function AppointmentPage() {
  const [allAppointments, setAllAppointments] = useState<AppointmentWithCustomer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [selectedAppointmentForDetail, setSelectedAppointmentForDetail] = useState<AppointmentWithCustomer | null>(null);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);
  const [isBookAppointmentModalOpen, setIsBookAppointmentModalOpen] = useState(false);

  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  const [selectedAppointmentForBilling, setSelectedAppointmentForBilling] = useState<AppointmentWithCustomer | null>(null);
  const [customerForBilling, setCustomerForBilling] = useState<CustomerFromAPI | null>(null);

  const fetchAppointments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/appointment');
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `API Error: ${res.status}`);
      }
      const data = await res.json();
      if (data.success && Array.isArray(data.appointments)) {
        setAllAppointments(data.appointments.map((apt: any) => ({
          ...apt,
          id: apt._id,
          customer: (typeof apt.customerId === 'object' && apt.customerId !== null) ? { ...apt.customerId, id: apt.customerId._id } : (typeof apt.customer === 'object' && apt.customer !== null) ? { ...apt.customer, id: apt.customer._id } : null,
          customerId: (typeof apt.customerId === 'string') ? apt.customerId : (apt.customerId?._id || (apt.customer?._id || undefined)),
        })));
      } else {
        throw new Error(data.message || 'Failed to parse appointments');
      }
    } catch (err: any) {
      setError(err.message);
      setAllAppointments([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  const handleOpenBillingModal = async (appointment: AppointmentWithCustomer) => {
    setSelectedAppointmentForBilling(appointment);
    let custDetails: CustomerFromAPI | null = null;
    if (appointment.customer && typeof appointment.customer === 'object' && appointment.customer._id) {
      custDetails = appointment.customer as CustomerFromAPI;
    } else if (typeof appointment.customerId === 'object' && appointment.customerId !== null && appointment.customerId._id) {
      custDetails = appointment.customerId as CustomerFromAPI;
    } else if (typeof appointment.customerId === 'string') {
      try {
        const custRes = await fetch(`/api/customer/${appointment.customerId}`);
        if (!custRes.ok) { throw new Error(`Failed to fetch customer (${custRes.status})`); }
        const custData = await custRes.json();
        if (custData.success && custData.customer) { custDetails = custData.customer; }
        else { throw new Error(custData.message || "Could not parse customer details."); }
      } catch (e: any) { setError("Could not load customer details for billing: " + e.message); return; }
    }
    if (custDetails) { setCustomerForBilling(custDetails); setIsBillingModalOpen(true); }
    else { setError(`Customer details not found for appointment ${appointment.id}.`); }
  };

  const handleCloseBillingModal = () => { setIsBillingModalOpen(false); setSelectedAppointmentForBilling(null); setCustomerForBilling(null); fetchAppointments(); };
  const handleBookingFormClose = () => { setIsBookAppointmentModalOpen(false); };

  const handleBookNewAppointment = async (bookingData: NewBookingData) => {
    setIsLoading(true); setError(null);
    try {
      const response = await fetch('/api/appointment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bookingData), });
      const result = await response.json();
      if (!response.ok || !result.success || !result.appointment) { throw new Error(result.message || 'Failed to book appointment.'); }
      alert('Appointment successfully booked!');
      setIsBookAppointmentModalOpen(false);
      const newApiAppointment = result.appointment;
      const customerDataForModal = (typeof newApiAppointment.customerId === 'object' && newApiAppointment.customerId !== null) ? { ...newApiAppointment.customerId, id: newApiAppointment.customerId._id } : null;
      const newAppointmentForModal: AppointmentWithCustomer = { ...newApiAppointment, id: newApiAppointment._id, customer: customerDataForModal, customerId: customerDataForModal?._id || newApiAppointment.customerId, };
      if (!newAppointmentForModal.customer && typeof newAppointmentForModal.customerId === 'object') { newAppointmentForModal.customer = newAppointmentForModal.customerId as CustomerFromAPI; }
      handleOpenBillingModal(newAppointmentForModal);
    } catch (err: any) { setError(err.message); }
    finally { setIsLoading(false); }
  };

  const handleViewAppointmentDetails = (appointment: AppointmentWithCustomer) => { setSelectedAppointmentForDetail(appointment); setIsDetailPanelOpen(true); };
  const closeDetailPanel = () => { setIsDetailPanelOpen(false); setSelectedAppointmentForDetail(null); };

  const filteredAppointments = allAppointments.filter(apt => {
    const lowerSearchTerm = searchTerm.toLowerCase();
    if (!searchTerm.trim()) return true;
    const customerName = apt.customerName || apt.customer?.name || (typeof apt.customerId === 'object' ? (apt.customerId as CustomerFromAPI).name : '');
    return (customerName && customerName.toLowerCase().includes(lowerSearchTerm)) ||
      (apt.style && apt.style.toLowerCase().includes(lowerSearchTerm)) ||
      (apt.stylist && apt.stylist.toLowerCase().includes(lowerSearchTerm));
  });

  // ===> LOGIC TO CHECK IF THE ACTIONS COLUMN SHOULD BE VISIBLE <===
  const hasActionableAppointments = filteredAppointments.some(apt =>
    apt.status === 'Scheduled' || apt.status === 'Completed' || apt.status === 'InProgress'
  );

  const todaysDate = new Date().toISOString().split('T')[0];
  const todaysAppointmentsCount = allAppointments.filter(apt => apt.date && apt.date.startsWith(todaysDate)).length;
  const upcomingAppointmentsCount = allAppointments.filter(apt => apt.date && new Date(apt.date) >= new Date(todaysDate) && apt.status === 'Scheduled').length;

  return (

    <div className="min-h-screen bg-gray-50/30 p-4 md:p-8">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <div><h1 className="text-3xl font-bold text-black mb-1">Appointments</h1><p className="text-gray-600 text-sm sm:text-base">Manage your salon's appointment schedule.</p></div>
        <button onClick={() => setIsBookAppointmentModalOpen(true)} className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-black text-white rounded-lg hover:bg-black/90 transition-colors"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd"></path></svg><span>Book Appointment</span></button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard title="Today's Bookings" value={isLoading && !allAppointments.length ? "..." : todaysAppointmentsCount.toString()} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>} />
        <StatCard title="Upcoming (Scheduled)" value={isLoading && !allAppointments.length ? "..." : upcomingAppointmentsCount.toString()} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
        <StatCard title="Total Appointments" value={isLoading && !allAppointments.length ? "..." : allAppointments.length.toString()} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} />
      </div>

      <div className="mb-6 bg-white p-4 rounded-xl shadow-sm"><input type="text" placeholder="Search appointments (client, service, stylist...)" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/10" /></div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {isLoading && allAppointments.length === 0 && <div className="p-10 text-center text-gray-600">Loading appointments...</div>}
        {error && <div className="p-10 text-center text-red-600">Error: {error} <button onClick={fetchAppointments} className="text-blue-600 underline ml-2">Try again</button></div>}
        {!isLoading && !error && filteredAppointments.length === 0 && (<div className="p-10 text-center text-gray-600">{searchTerm ? "No appointments match your search." : "No appointments found. Book one!"}</div>)}
        {!isLoading && !error && filteredAppointments.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-700">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3">Client</th>
                  <th scope="col" className="px-6 py-3">Service</th>
                  <th scope="col" className="px-6 py-3">Date & Time</th>
                  <th scope="col" className="px-6 py-3">Stylist</th>
                  <th scope="col" className="px-6 py-3">Status</th>

                  {/* === MODIFIED: ACTIONS HEADER IS NOW CONDITIONAL === */}
                  {hasActionableAppointments && (
                    <th scope="col" className="px-6 py-3 text-right">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.map((appointment) => {
                  const customerName = appointment.customerName || appointment.customer?.name || 'N/A';
                  const customerPhone = appointment.customer?.phoneNumber || 'N/A';
                  return (
                    <tr key={appointment.id} className="bg-white border-b hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{customerName}<div className="text-xs text-gray-500">{customerPhone}</div></td>
                      <td className="px-6 py-4">{appointment.style}</td>
                      <td className="px-6 py-4">{appointment.date ? formatDate(appointment.date) : 'N/A'} at {formatTime(appointment.time)}</td>
                      <td className="px-6 py-4">{appointment.stylist || 'N/A'}</td>
                      <td className="px-6 py-4"><span className={`px-2 py-1 text-md font-medium rounded-full ${appointment.status === 'Scheduled' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>{appointment.status}</span></td>

                      {/* === MODIFIED: ACTIONS CELL IS NOW CONDITIONAL === */}
                      {hasActionableAppointments && (
                        <td className="px-6 py-4 text-right space-x-2">
                          {/* <button onClick={() => handleViewAppointmentDetails(appointment)} className="font-medium text-gray-600 hover:text-black text-xs">Details</button> */}
                          {(appointment.status === 'Scheduled' || appointment.status === 'Completed' || appointment.status === 'InProgress') ? (
                            <button onClick={() => handleOpenBillingModal(appointment)} className="font-medium text-indigo-600 hover:text-indigo-800 text-md px-2 py-1 bg-indigo-50 hover:bg-indigo-100 rounded">Bill</button>
                          ) : (
                            // Render a placeholder to maintain alignment if you want, otherwise null is fine.
                            <span className="inline-block w-12"></span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isDetailPanelOpen && selectedAppointmentForDetail && (
        <div className={`fixed top-0 right-0 h-full bg-white shadow-2xl z-40 w-full md:w-[400px] lg:w-[450px] ${isDetailPanelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="p-6"><button onClick={closeDetailPanel}>Close Detail</button><pre>{JSON.stringify(selectedAppointmentForDetail, null, 2)}</pre></div>
        </div>
      )}
      {isDetailPanelOpen && (<div onClick={closeDetailPanel} className="fixed inset-0 bg-black/30 z-30 md:hidden"></div>)}

      <BookAppointmentForm isOpen={isBookAppointmentModalOpen} onClose={handleBookingFormClose} onBookAppointment={handleBookNewAppointment} />
      {selectedAppointmentForBilling && customerForBilling && isBillingModalOpen && (<BillingModal isOpen={isBillingModalOpen} onClose={handleCloseBillingModal} appointment={selectedAppointmentForBilling} customer={customerForBilling} />)}
    </div>

  );
}

// StatCard component
interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: string;
  trendColor?: string;
}
// const StatCard: React.FC<StatCardProps> = ({ title, value, icon }) => (
//   <div className="bg-white p-5 rounded-xl shadow-sm">
//     <div className="flex items-center justify-between">
//       <div>
//         <p className="text-sm font-medium text-gray-500 truncate">{title}</p>
//         <p className="mt-1 text-3xl font-semibold text-gray-900">{value}</p>
//       </div>
//       <div className="flex-shrink-0 h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600">
//         {icon}
//       </div>
//     </div>
//   </div>
// );