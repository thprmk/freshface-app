// app/crm/page.tsx (Fetching appointments that contain customer contact info)
'use client';

import React, { useState, useEffect, useCallback, FormEvent } from 'react';
import CustomerDetailPanel from './CustomerDetailPanel'; // Assuming this panel expects Customer interface

// Define the expected structure for membership, matching CustomerDetailPanel needs
interface CustomerMembershipDetails {
  type: string;
  status: 'Active' | 'Expired' | 'Cancelled';
  expiryDate?: string;
  startDate?: string;
}

// Customer interface (THE UI EXPECTS THIS STRUCTURE)
// This will now be populated more meaningfully from appointment data
interface Customer {
  id: string;        // From appointment._id
  name: string;      // From appointment.customerName (or appointment.name if that's the field)
  email: string;     // From appointment.email
  phone: string;     // From appointment.phone
  lastAppointment?: string; // This will be the appointment's own date
  totalSpent?: number;      // Still likely undefined from a single appointment
  status: 'Active' | 'Inactive'; // Mapped from appointment status
  avatarUrl?: string;           // Still likely undefined
  tags?: string[];              // Can use appointment.service
  membership?: CustomerMembershipDetails; // Still likely undefined
  appointmentHistory?: Array<{ date: string; service: string; stylist: string; amount: number }>; // Still likely undefined
  notes?: Array<{ date: string; text: string }>; // Can use appointment.notes
}

// This modal is for adding data that will be sent to /api/appointment
interface NewAppointmentEntryData { // Renamed to reflect it's for creating an appointment-like entry
  name: string; // Will be used as customerName for the appointment
  email: string; // Will be used as email for the appointment
  phone: string; // Will be used as phone for the appointment
  status: 'Active' | 'Inactive'; // Will be mapped to an appointment status
}

// --- AddEntryModal (was AddCustomerModal) ---
// This modal now effectively creates an appointment, sending customer contact info
interface AddEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddEntry: (data: NewAppointmentEntryData) => Promise<void>; // Changed prop name
}
const AddEntryModal: React.FC<AddEntryModalProps> = ({ isOpen, onClose, onAddEntry }) => {
  const [formData, setFormData] = useState<NewAppointmentEntryData>({ name: '', email: '', phone: '', status: 'Active' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFormData({ name: '', email: '', phone: '', status: 'Active' });
      setFormError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value as string }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formData.name || !formData.email || !formData.phone) {
        setFormError("Name, Email, and Phone are required.");
        return;
    }
    setIsSubmitting(true);
    try {
      await onAddEntry(formData); // Call the new prop
      // onClose(); // Parent handles closing
    } catch (error: any) {
      setFormError(error.message || "Failed to process request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
      <div className="bg-white p-6 md:p-8 rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          {/* UI still says "Add New Customer", but it creates an appointment */}
          <h2 className="text-2xl font-semibold text-gray-800">Add New Customer (Creates Appointment)</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">×</button>
        </div>
        {formError && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md text-sm">{formError}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Full Name <span className="text-red-500">*</span></label>
            <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-black focus:border-black sm:text-sm text-gray-900"/>
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
            <input type="email" name="email" id="email" value={formData.email} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-black focus:border-black sm:text-sm text-gray-900"/>
          </div>
           <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone <span className="text-red-500">*</span></label>
            <input type="tel" name="phone" id="phone" value={formData.phone} onChange={handleChange} required className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-black focus:border-black sm:text-sm text-gray-900"/>
          </div>
          <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">Intended Customer Status (maps to Appt. Status)</label>
              <select name="status" id="status" value={formData.status} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-black focus:border-black sm:text-sm text-gray-900 bg-white">
                <option value="Active">Active (e.g., Scheduled)</option>
                <option value="Inactive">Inactive (e.g., Cancelled)</option>
              </select>
            </div>
          <div className="mt-8 flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm bg-gray-200 rounded" disabled={isSubmitting}>Cancel</button>
             <button type="submit" className="px-4 py-2 text-sm bg-black text-white rounded" disabled={isSubmitting}>
                {isSubmitting ? "Processing..." : "Add Entry"}
               </button>
          </div>
        </form>
      </div>
    </div>
  );
};


export default function CrmPage() {
  // This state EXPECTS Customer[] data, but we will fill it with mapped Appointment data
  const [displayedData, setDisplayedData] = useState<Customer[]>([]); // Renamed for clarity
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'All' | 'Active' | 'Inactive'>('All'); // Based on mapped 'status'

  const [selectedEntry, setSelectedEntry] = useState<Customer | null>(null); // Renamed for clarity
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);
  const [isAddEntryModalOpen, setIsAddEntryModalOpen] = useState(false); // Renamed

  const fetchAppointmentsAndMapToCustomerUI = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/appointment'); // FETCHING APPOINTMENTS
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `Failed to fetch data: ${response.statusText}`}));
        throw new Error(errorData.message || `Failed to fetch data`);
      }
      const apiResponse = await response.json();

      if (apiResponse.success && Array.isArray(apiResponse.appointments)) {
        // Map appointment data to the Customer interface, using available fields
        const mappedData: Customer[] = apiResponse.appointments.map((apt: any) => ({
          id: apt._id || apt.id,
          name: apt.customerName || apt.name || 'N/A', // Prioritize customerName, then name from appointment, then service
          email: apt.email || '',                     // USE apt.email if available
          phone: apt.phoneNumber || '',                     // USE apt.phone if available
          lastAppointment: apt.date ? new Date(apt.date).toLocaleDateString() : undefined,
          totalSpent: undefined, // Still undefined as appointments don't have this
          status: (apt.status === 'Completed' || apt.status === 'Scheduled') ? 'Active' : 'Inactive', // Your existing mapping
          avatarUrl: apt.avatarUrl || undefined, // If appointment data might have customer avatar
          tags: apt.service ? [apt.service] : [], // Use service as a tag
          membership: undefined, // Appointments don't have membership details
          appointmentHistory: undefined, // A single appointment isn't a history
          notes: apt.notes ? [{ date: apt.date || new Date().toISOString(), text: apt.notes }] : undefined,
        }));
        setDisplayedData(mappedData);
      } else {
        throw new Error("API did not return appointments successfully or in expected format.");
      }
    } catch (err: any) {
      setError(err.message);
      setDisplayedData([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointmentsAndMapToCustomerUI();
  }, [fetchAppointmentsAndMapToCustomerUI]);

  const handleAddEntry = async (entryData: NewAppointmentEntryData) => {
    // This will create a new APPOINTMENT using the data from the modal
    const appointmentPayload = {
        customerName: entryData.name, // From modal's 'name' field
        email: entryData.email,       // From modal's 'email' field
        phone: entryData.phone,       // From modal's 'phone' field
        service: "New Inquiry",       // Default service, or add a service field to the modal
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().split(' ')[0].substring(0,5), // "HH:MM"
        status: entryData.status === 'Active' ? 'Scheduled' : 'Cancelled', // Map UI status to appointment status
        // Add other necessary fields for your Appointment model
    };
    try {
      const response = await fetch('/api/appointment', { // POSTING TO APPOINTMENT ROUTE
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(appointmentPayload),
      });
      const result = await response.json();
      if (!response.ok || (result && result.success === false)) {
        throw new Error(result.message || 'Failed to create appointment via UI');
      }
      setIsAddEntryModalOpen(false);
      await fetchAppointmentsAndMapToCustomerUI(); // Re-fetch data
    } catch (err: any) {
      console.error('Error in handleAddEntry:', err);
      throw err; // Let modal display the error
    }
  };

  // Delete is still tricky as /api/appointment doesn't have a DELETE handler
  const handleDeleteEntry = async (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete the entry for: ${name}? (Note: This will attempt to act on appointment data. Ensure your API supports deleting appointments if this is intended.)`)) {
      // If you implement DELETE /api/appointment/:id
      // const response = await fetch(`/api/appointment/${id}`, { method: 'DELETE' });
      // if (response.ok) {
      //   await fetchAppointmentsAndMapToCustomerUI();
      //   if(selectedEntry?.id === id) closeDetailPanel();
      // } else {
      //   setError("Failed to delete entry.");
      // }
      console.warn("Delete functionality for appointments via this UI requires a DELETE handler in /api/appointment. Re-fetching data for now.");
      await fetchAppointmentsAndMapToCustomerUI();
      if(selectedEntry?.id === id) closeDetailPanel();
    }
  };

  const handleViewEntry = useCallback((dataItem: Customer) => { // dataItem is a mapped appointment
    if (isDetailPanelOpen && selectedEntry?.id === dataItem.id) {
      setIsDetailPanelOpen(false);
      setSelectedEntry(null);
    } else {
      setSelectedEntry(dataItem);
      setIsDetailPanelOpen(true);
    }
  }, [isDetailPanelOpen, selectedEntry]);

  const closeDetailPanel = () => {
    setIsDetailPanelOpen(false);
    setSelectedEntry(null);
  };

  const filteredDataToDisplay = displayedData.filter(item => {
    const lowerSearchTerm = searchTerm.toLowerCase();
    // Search now includes email and phone if they exist in the mapped data
    const nameMatch = item.name ? item.name.toLowerCase().includes(lowerSearchTerm) : false;
    const emailMatch = item.email ? item.email.toLowerCase().includes(lowerSearchTerm) : false;
    const phoneMatch = item.phone ? item.phone.toLowerCase().includes(lowerSearchTerm) : false; // Use toLowerCase for phone too for consistency
    const matchesSearch = nameMatch || emailMatch || phoneMatch;
    const matchesFilter = activeFilter === 'All' || item.status === activeFilter;
    return matchesSearch && matchesFilter;
  });

  const statusColors: Record<Customer['status'], string> = {
    Active: 'bg-green-100 text-green-700',
    Inactive: 'bg-gray-100 text-gray-700',
  };

  // Client-side stat calculations based on the mapped appointment data
  const newItemsThisMonth = "N/A"; // Still N/A as we don't have creation dates for "customers"
  const activeItemsCount = displayedData.filter(c => c.status === 'Active').length.toString();
  const inactiveItemsCount = displayedData.filter(c => c.status === 'Inactive').length.toString();


  return (
    <div className="min-h-screen bg-gray-50/30 flex">
      <div className={`flex-grow p-4 md:p-8 transition-all duration-300 ease-in-out ${isDetailPanelOpen ? 'md:mr-[400px] lg:mr-[450px]' : 'mr-0'}`}>
        {/* UI still says "Customers", but data is from appointments */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <div> <h1 className="text-3xl font-bold text-black">Customers</h1> <p className="text-gray-600">Manage your customer relationships and data.</p> </div>
            <div className="flex gap-3">
                <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"> Import </button>
                <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"> Export </button>
               <button
                  onClick={() => setIsAddEntryModalOpen(true)} // Open the renamed modal state
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-black rounded-lg hover:bg-black/90">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd"></path></svg>
                    Add Entry {/* UI can still say "Add Customer" if you prefer, but action is different */}
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <StatCard title="Total Entries (Appointments)" value={isLoading ? "..." : displayedData.length.toString()} icon={ <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}/>
            <StatCard title="New This Month (N/A)" value={isLoading ? "..." : newItemsThisMonth} icon={ <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}/>
            <StatCard title="Active Entries (Status Mapped)" value={isLoading ? "..." : activeItemsCount} icon={ <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}/>
            <StatCard title="Inactive Entries (Status Mapped)" value={isLoading ? "..." : inactiveItemsCount} icon={ <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a7 7 0 00-7 7h14a7 7 0 00-7-7zm-4-7a1 1 0 011-1h2a1 1 0 110 2H6a1 1 0 01-1-1zm10 0a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1zm-5 7a1 1 0 011-1h2a1 1 0 110 2h-2a1 1 0 01-1-1z" /></svg>}/>
        </div>

        <div className="mb-6 bg-white p-4 rounded-xl shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex space-x-1 border border-gray-200 p-1 rounded-lg">
              {(['All', 'Active', 'Inactive'] as const).map(filter => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
                    activeFilter === filter
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-800'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
            <div className="relative w-full md:w-auto">
                <input type="text" placeholder="Search by name, email, phone..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full md:w-72 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-gray-300 text-black placeholder-gray-500"/>
                <svg className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {isLoading ? ( <div className="p-10 text-center text-gray-500">Loading data...</div>
        ) : error ? (
          <div className="p-10 text-center text-red-500">Error: {error} <button onClick={fetchAppointmentsAndMapToCustomerUI} className="ml-2 text-blue-500 underline">Try again</button></div>
        ) : filteredDataToDisplay.length === 0 ? (
          <div className="p-10 text-center text-gray-500"> No data found matching your criteria.
            {activeFilter === 'All' && searchTerm === '' && (
                 <button onClick={() => setIsAddEntryModalOpen(true)} className="mt-4 block mx-auto px-4 py-2 text-sm font-medium text-white bg-black rounded-lg hover:bg-black/90">
                    + Add Entry
                </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Appointment (Appt Date)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status (Mapped)</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tags (Service)</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredDataToDisplay.map((item) => ( // item is a mapped appointment
                  <tr
                    key={item.id}
                    onClick={() => handleViewEntry(item)}
                    className={`cursor-pointer hover:bg-gray-50/70 transition-colors ${
                        selectedEntry?.id === item.id && isDetailPanelOpen ? 'bg-indigo-50' : ''
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {item.avatarUrl ? ( <img className="h-10 w-10 rounded-full object-cover" src={item.avatarUrl} alt={item.name} />
                          ) : ( <span className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-medium"> {item.name ? item.name.split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase() : 'N/A'} </span> )}
                        </div>
                        <div className="ml-4"> <div className="text-sm font-medium text-gray-900">{item.name}</div> </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{item.email || 'N/A'}</div>
                        <div className="text-sm text-gray-500">{item.phone || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500"> {item.lastAppointment || 'N/A'} </td>
                    <td className="px-6 py-4 whitespace-nowrap"> <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColors[item.status] || 'bg-gray-100 text-gray-800'}`}> {item.status} </span> </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.tags && item.tags.length > 0 ? item.tags.map(tag => ( <span key={tag} className="mr-1.5 mb-1.5 inline-block px-2 py-0.5 text-xs bg-blue-50 text-blue-600 rounded-md">{tag}</span> )) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteEntry(item.id, item.name);
                        }}
                        className="text-gray-500 hover:text-red-700"
                        aria-label={`Delete ${item.name}`}
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd"></path></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
         {!isLoading && filteredDataToDisplay.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <p className="text-sm text-gray-600">
                    Showing <span className="font-medium">{filteredDataToDisplay.length}</span> of <span className="font-medium">{displayedData.length}</span> results
                </p>
                <div className="flex space-x-1">
                    <button className="px-3 py-1 border border-gray-300 text-sm rounded-md hover:bg-gray-50 disabled:opacity-50" disabled>Previous</button>
                    <button className="px-3 py-1 border border-gray-300 text-sm rounded-md hover:bg-gray-50 disabled:opacity-50" disabled>Next</button>
                </div>
            </div>
        )}
      </div>
    </div>

      {/* CustomerDetailPanel now receives mapped appointment data with potential contact info */}
      <div className={`fixed top-0 right-0 h-full bg-white shadow-2xl transition-transform duration-300 ease-in-out z-40 w-full md:w-[400px] lg:w-[450px] ${isDetailPanelOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {selectedEntry && (
          <CustomerDetailPanel
            customer={selectedEntry} // Passing the mapped appointment data
            onClose={closeDetailPanel}
          />
        )}
        {!selectedEntry && isDetailPanelOpen && (
            <div className="p-6 text-gray-500">Loading details...</div>
        )}
      </div>
      {isDetailPanelOpen && (
        <div onClick={closeDetailPanel} className="fixed inset-0 bg-black/30 z-30 md:hidden"></div>
      )}

      <AddEntryModal // Renamed modal component usage
        isOpen={isAddEntryModalOpen}
        onClose={() => setIsAddEntryModalOpen(false)}
        onAddEntry={handleAddEntry} // Using the renamed handler
      />
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: string;
  trendColor?: string;
}
const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trend, trendColor }) => (
  <div className="bg-white p-5 rounded-xl shadow-sm">
    <div className="flex items-center justify-between">
      <div> <p className="text-sm font-medium text-gray-500 truncate">{title}</p> <p className="mt-1 text-3xl font-semibold text-gray-900">{value}</p> </div>
      <div className="flex-shrink-0 h-12 w-12 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600"> {icon} </div>
    </div>
    {trend && ( <p className={`mt-2 text-sm font-medium ${trendColor || 'text-gray-500'}`}> {trend} </p> )}
  </div>
);