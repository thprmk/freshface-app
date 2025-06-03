// app/crm/CustomerDetailPanel.tsx
import React from 'react';

// Ensure this interface matches the one in CrmPage.tsx
interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  lastAppointment?: string;
  totalSpent?: number;
  status: 'Lead' | 'Active' | 'Inactive';
  avatarUrl?: string;
  tags?: string[];
  membership?: {
    type: string;
    status: 'Active' | 'Expired' | 'Cancelled';
    expiryDate?: string;
    startDate?: string;
  };
  appointmentHistory?: Array<{ date: string; service: string; stylist: string; amount: number }>;
  notes?: Array<{ date: string; text: string }>;
}

interface CustomerDetailPanelProps {
  customer: Customer;
  onClose: () => void;
}

const CustomerDetailPanel: React.FC<CustomerDetailPanelProps> = ({ customer, onClose }) => {
  if (!customer) return null;

  const membershipStatusColors = {
    Active: 'text-green-600',
    Expired: 'text-red-600',
    Cancelled: 'text-gray-500',
  };

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Panel Header */}
      <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800">{customer.name}</h2>
        <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100" aria-label="Close panel">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>

      {/* Panel Content - Scrollable */}
      <div className="flex-grow p-4 md:p-6 overflow-y-auto space-y-6">
        <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-500 mb-1">Contact Info</h3>
            <p className="text-gray-700"><strong>Email:</strong> {customer.email}</p>
            <p className="text-gray-700"><strong>Phone:</strong> {customer.phone}</p>
            <p className="text-gray-700"><strong>Status:</strong> {customer.status}</p>
        </div>

        {customer.membership && (
            <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500 mb-2">Membership</h3>
                <p className="text-gray-700"><strong>Type:</strong> {customer.membership.type}</p>
                <p className="text-gray-700">
                    <strong>Status:</strong>
                    <span className={`ml-1 font-semibold ${membershipStatusColors[customer.membership.status] || 'text-gray-700'}`}>
                        {customer.membership.status}
                    </span>
                </p>
                {customer.membership.startDate && <p className="text-sm text-gray-600"><strong>Start Date:</strong> {customer.membership.startDate}</p>}
                {customer.membership.expiryDate && <p className="text-sm text-gray-600"><strong>Expires:</strong> {customer.membership.expiryDate}</p>}
            </div>
        )}
        {!customer.membership && (
            <div className="bg-gray-50 p-4 rounded-lg">
                 <h3 className="text-sm font-medium text-gray-500 mb-1">Membership</h3>
                 <p className="text-gray-500">No active membership.</p>
            </div>
        )}

        <div>
          <h3 className="text-lg font-medium text-gray-800 mb-2">Appointment History</h3>
          {customer.appointmentHistory && customer.appointmentHistory.length > 0 ? (
            <ul className="space-y-3">
              {customer.appointmentHistory.map((appt, index) => (
                <li key={index} className="p-3 bg-white border border-gray-200 rounded-md shadow-sm">
                  <p className="font-medium text-gray-700">{appt.service} - <span className="text-sm text-gray-500">{appt.date}</span></p>
                  <p className="text-sm text-gray-600">With: {appt.stylist} | Amount: ${appt.amount}</p>
                </li>
              ))}
            </ul>
          ) : ( <p className="text-gray-500">No appointment history available.</p> )}
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-800 mb-2">Notes</h3>
          {customer.notes && customer.notes.length > 0 ? (
             <ul className="space-y-3">
                {customer.notes.map((note, index) => (
                    <li key={index} className="p-3 bg-white border border-gray-200 rounded-md shadow-sm">
                        <p className="text-sm text-gray-500 mb-1">{note.date}</p>
                        <p className="text-gray-700 whitespace-pre-wrap">{note.text}</p>
                    </li>
                ))}
             </ul>
          ) : ( <p className="text-gray-500">No notes available.</p> )}
           <button className="mt-3 text-sm text-indigo-600 hover:text-indigo-800">+ Add Note</button>
        </div>

        {customer.totalSpent !== undefined && (
            <div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">Spending</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-gray-700"><strong>Total Spent:</strong> ${customer.totalSpent.toFixed(2)}</p>
                </div>
            </div>
        )}
      </div>

      <div className="p-4 md:p-6 border-t border-gray-200 flex justify-end gap-3">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"> Close </button>
        <button className="px-4 py-2 text-sm text-white bg-black rounded-md hover:bg-black/90"> Edit Customer </button>
      </div>
    </div>
  );
};

export default CustomerDetailPanel;