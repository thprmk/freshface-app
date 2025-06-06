// Example: BillingModal.tsx (simplified structure)
'use client';

import React, { useState, useEffect, useCallback } from 'react'; // Removed FormEvent as it's not directly used here

// Define interfaces specific to the BillingModal's needs HERE:
export interface BillLineItem {
  itemType: 'service' | 'product' | 'membership';
  itemId?: string;
  name: string;
  unitPrice: number;
  quantity: number;
  discountApplied: number;
  finalPrice: number;
}

export interface MembershipPlanFE {
  _id: string;
  id: string;
  name: string;
  price: number;
  durationDays: number;
  description?: string;
  benefits?: string[];
  discountPercentageServices?: number;
}

// Define more specific types for appointment and customer props
// These should align with what AppointmentPage.tsx passes
interface AppointmentForModal {
    _id: string;
    id: string;
    date: string; // Or Date object, ensure consistency
    servicesPerformed?: Array<{ serviceName: string, price: number, serviceId?: string }>;
    // Add other fields from your main Appointment type that are relevant for billing display
}

interface CustomerForModal {
    _id: string;
    id: string;
    name: string;
    // Add other fields from your main Customer type
}

interface BillingModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointment: AppointmentForModal; // Use the more specific type
  customer: CustomerForModal;     // Use the more specific type
}

const BillingModal: React.FC<BillingModalProps> = ({ isOpen, onClose, appointment, customer }) => {
  const [billItems, setBillItems] = useState<BillLineItem[]>([]);
  const [availableMembershipPlans, setAvailableMembershipPlans] = useState<MembershipPlanFE[]>([]);
  const [selectedPlanIdForPurchase, setSelectedPlanIdForPurchase] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>('Card');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize billItems from appointment services when modal opens/appointment changes
  useEffect(() => {
    if (isOpen && appointment) { // Also check isOpen to re-initialize if modal is re-opened with same appointment
      const initialItems: BillLineItem[] = (appointment.servicesPerformed || []).map((service: any) => ({
        itemType: 'service',
        itemId: service.serviceId || service._id || undefined, // Prefer serviceId, then _id
        name: service.serviceName || service.name || 'Unknown Service',
        unitPrice: service.price,
        quantity: 1,
        discountApplied: 0,
        finalPrice: service.price,
      }));
      setBillItems(initialItems);
      setSelectedPlanIdForPurchase(null);
      setError(null); // Clear previous errors
    }
  }, [appointment, isOpen]); // Add isOpen to dependencies

  // Fetch available membership plans
  useEffect(() => {
    if (isOpen) {
      setIsLoading(true); // Indicate loading for plans
      const fetchPlans = async () => {
        try {
          const res = await fetch('/api/membership-plans');
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.message || `Failed to fetch plans: ₹{res.status}`);
          }
          const data = await res.json();
          if (data.success) {
            setAvailableMembershipPlans(data.plans);
          } else {
            console.error("Failed to fetch membership plans:", data.message);
            setError(data.message || "Could not load membership plans.");
          }
        } catch (e: any) {
          console.error("Error fetching membership plans:", e);
          setError(e.message || "An error occurred while fetching plans.");
        } finally {
          setIsLoading(false);
        }
      };
      fetchPlans();
    }
  }, [isOpen]);

  const handleAddServiceOrProduct = (itemType: 'service' | 'product') => {
    const name = prompt(`Enter ₹{itemType} name:`);
    if (!name) return;
    const priceStr = prompt(`Enter ₹{itemType} price:`);
    if (!priceStr) return;

    const price = parseFloat(priceStr);
    if (!isNaN(price) && price >= 0) {
      setBillItems(prev => [...prev, {
        itemType,
        name,
        unitPrice: price,
        quantity: 1,
        discountApplied: 0,
        finalPrice: price
      }]);
    } else {
      alert("Please enter a valid price.");
    }
  };

  const handleRemoveItem = (indexToRemove: number) => {
    setBillItems(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleMembershipSelectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const planId = e.target.value;
    setSelectedPlanIdForPurchase(planId || null);

    let newBillItems = billItems.filter(item => item.itemType !== 'membership');

    if (planId) {
      const selectedPlan = availableMembershipPlans.find(p => p._id === planId);
      if (selectedPlan) {
        newBillItems.push({
          itemType: 'membership',
          itemId: selectedPlan._id,
          name: selectedPlan.name,
          unitPrice: selectedPlan.price,
          quantity: 1,
          discountApplied: 0,
          finalPrice: selectedPlan.price,
        });
      }
    }
    setBillItems(newBillItems);
  };

  const calculateTotals = useCallback(() => { // useCallback for memoization if totals are used in effects
    const subTotal = billItems.reduce((sum, item) => sum + item.finalPrice, 0);
    const grandTotal = subTotal; // Add tax/overall discount logic later
    return { subTotal, grandTotal };
  }, [billItems]);

  const { subTotal, grandTotal } = calculateTotals();

  const handleFinalizeBill = async () => {
    if (!customer || !appointment) {
      setError("Customer or Appointment data is missing. Cannot proceed.");
      return;
    }
    if (billItems.length === 0) {
      setError("Cannot finalize an empty bill. Please add items.");
      return;
    }

    setIsLoading(true);
    setError(null);

    const payload = {
      customerId: customer._id,
      appointmentId: appointment._id,
      items: billItems.map(bi => ({
        itemType: bi.itemType,
        itemId: bi.itemId,
        name: bi.name,
        unitPrice: bi.unitPrice,
        quantity: bi.quantity,
        // In Iteration 2, backend would calculate discountApplied and finalPrice again
      })),
      paymentMethod,
      notes,
      // grandTotal: grandTotal // Optionally send for verification by backend
    };

    try {
      const response = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Billing failed. Please try again.');
      }

      alert('Billing successful! Invoice created.');
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-[60] flex justify-center items-center p-2 sm:p-4">
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center mb-4 pb-3 border-b">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
            Bill for: <span className="text-indigo-600">{customer?.name}</span>
            {appointment?.date && <span className="text-sm text-gray-500 ml-2">({new Date(appointment.date).toLocaleDateString()})</span>}
          </h2>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors">×</button>
        </div>

        {error && <div className="mb-3 p-3 bg-red-100 text-red-700 rounded text-sm">{error}</div>}

        <div className="flex-grow overflow-y-auto pr-1 sm:pr-2 space-y-4 custom-scrollbar-thin"> {/* Custom scrollbar class */}
          <div>
            <h3 className="text-md sm:text-lg font-medium text-gray-700 mb-2">Bill Items</h3>
            {billItems.length === 0 && <p className="text-gray-500 text-sm italic">No items added yet.</p>}
            <ul className="space-y-2">
              {billItems.map((item, index) => (
                <li key={index} className="p-2.5 border rounded-md flex justify-between items-center text-sm bg-gray-50">
                  <div className="flex-grow">
                    <span className="font-medium text-gray-700">{item.name}</span>
                    <span className="text-xs text-gray-500 ml-2">(x{item.quantity}) @ ₹{item.unitPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-gray-800 mr-3">₹{item.finalPrice.toFixed(2)}</span>
                    <button
                        onClick={() => handleRemoveItem(index)}
                        className="text-red-500 hover:text-red-700 text-xs p-1"
                        title="Remove item"
                    >
                        × {/* A simple remove icon, replace with an actual icon if preferred */}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex gap-2 mt-3">
              <button onClick={() => handleAddServiceOrProduct('service')} className="text-xs px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">Add Service</button>
              <button onClick={() => handleAddServiceOrProduct('product')} className="text-xs px-3 py-1.5 bg-green-500 text-white rounded hover:bg-green-600 transition-colors">Add Product</button>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t">
            <label htmlFor="membershipPlan" className="block text-sm font-medium text-gray-700 mb-1">Add Membership:</label>
            {isLoading && availableMembershipPlans.length === 0 ? <p className="text-xs text-gray-500">Loading plans...</p> :
            <select
              id="membershipPlan"
              value={selectedPlanIdForPurchase || ''}
              onChange={handleMembershipSelectionChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-white text-black"
            >
              <option value="">-- Select a Membership (Optional) --</option>
              {availableMembershipPlans.map(plan => (
                <option key={plan._id} value={plan._id}>
                  {plan.name} - ₹{plan.price.toFixed(2)} ({plan.durationDays} days)
                </option>
              ))}
            </select>}
          </div>

          <div className="mt-4 pt-4 border-t">
            <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-1">Payment Method:</label>
            <select id="paymentMethod" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-black">
                <option value="Card">Card</option>
                <option value="Cash">Cash</option>
                <option value="Online">Online Transfer</option>
                <option value="Other">Other</option>
            </select>
          </div>
           <div className="mt-4">
                <label htmlFor="billingNotes" className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional):</label>
                <textarea id="billingNotes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"/>
            </div>
        </div>

        <div className="mt-auto pt-4 border-t flex-shrink-0"> {/* Changed mt-6 to mt-auto */}
          <div className="flex justify-between text-sm font-medium text-gray-700">
            <p>Subtotal:</p>
            <p>₹{subTotal.toFixed(2)}</p>
          </div>
          <div className="flex justify-between text-lg font-bold text-gray-900 mt-2">
            <p>Grand Total:</p>
            <p>₹{grandTotal.toFixed(2)}</p>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-3 flex-shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors" disabled={isLoading}>Cancel</button>
          <button type="button" onClick={handleFinalizeBill} className="px-4 py-2 text-sm bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50 transition-colors" disabled={isLoading || billItems.length === 0}>{isLoading ? 'Processing...' : 'Finalize & Pay'}</button>
        </div>
      </div>
      {/* Optional: Add custom scrollbar styles if you prefer over browser default */}
      {/* <style jsx global>{`
        .custom-scrollbar-thin::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar-thin::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px;}
        .custom-scrollbar-thin::-webkit-scrollbar-thumb { background: #ccc; border-radius: 10px;}
        .custom-scrollbar-thin::-webkit-scrollbar-thumb:hover { background: #aaa; }
      `}</style> */}
    </div>
  );
};

export default BillingModal; // <<<--- ADDED THIS LINE