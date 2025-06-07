// app/crm/BookAppointmentForm.tsx
'use client';
import React, { useState, useEffect, FormEvent } from 'react';

// Data structure for the form's state and what's passed up
export interface NewBookingData {
  customerName: string;
  phoneNumber: string;
  email: string;
  style: string;       // This is what the form collects for service type
  stylist: string;
  date: string;
  time: string;
  paymentMethod: string;
  products: number[];  // Assuming you send product IDs
  notes?: string;
}

interface BookAppointmentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onBookAppointment: (data: NewBookingData) => Promise<void>;
}

export default function BookAppointmentForm({
  isOpen,
  onClose,
  onBookAppointment,
}: BookAppointmentFormProps) {
  const [formData, setFormData] = useState<NewBookingData>({
    customerName: '',
    phoneNumber: '',
    email: '',
    style: '',
    stylist: '',
    date: '',
    time: '',
    paymentMethod: '',
    products: [],
    notes: '',
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const styles = ['Haircut', 'Hair Coloring', 'Styling', 'Facial', 'Manicure', 'Pedicure'];
  const stylists = ['Sarah Smith', 'John Doe', 'Emma Wilson', 'Michael Brown'];
  const paymentMethods = ['Cash', 'UPI', 'Card'];
  const productsData = [
    { id: 1, name: 'Shampoo', price: 299 }, { id: 2, name: 'Conditioner', price: 249 },
    { id: 3, name: 'Hair Serum', price: 399 }, { id: 4, name: 'Hair Oil', price: 199 },
  ];

  useEffect(() => {
    if (isOpen) {
      setFormData({
        customerName: '', phoneNumber: '', email: '', style: '',
        stylist: '', date: '', time: '', paymentMethod: '', products: [], notes: ''
      });
      setFormError(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleProductChange = (productId: number, isChecked: boolean) => {
    setFormData((prev) => {
      const currentProducts = prev.products || [];
      if (isChecked) {
        return { ...prev, products: [...currentProducts, productId] };
      } else {
        return { ...prev, products: currentProducts.filter((id) => id !== productId) };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formData.customerName || !formData.phoneNumber || !formData.email || !formData.style || !formData.stylist || !formData.date || !formData.time || !formData.paymentMethod) {
        setFormError("Please fill in all required fields marked with *.");
        return;
    }
    setIsSubmitting(true);
    try {
      await onBookAppointment(formData);
    } catch (error: any) {
      console.error("Error during booking submission (caught in modal):", error);
      setFormError(error.message || "An unexpected error occurred during booking.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const inputBaseClasses = "w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/30 focus:border-black text-gray-900 placeholder-gray-400 text-sm";
  const selectBaseClasses = `${inputBaseClasses} appearance-none bg-white pr-8`; // pr-8 for arrow space
  const fieldsetClasses = "border border-gray-200 p-4 rounded-lg";
  const legendClasses = "text-base font-semibold text-gray-800 px-2 -ml-2"; // Enhanced legend


  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300 ease-in-out">
      <div className="bg-white rounded-xl p-6 md:p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl transform transition-all duration-300 ease-in-out scale-100">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Book New Appointment</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        {formError && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm border border-red-200">{formError}</div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <fieldset className={fieldsetClasses}>
            <legend className={legendClasses}>Customer Information</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mt-3">
              <div>
                <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 mb-1.5">Name <span className="text-red-500">*</span></label>
                <input id="customerName" type="text" name="customerName" value={formData.customerName} onChange={handleChange} required className={inputBaseClasses}/>
              </div>
              <div>
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number <span className="text-red-500">*</span></label>
                <input id="phoneNumber" type="tel" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} required className={inputBaseClasses}/>
              </div>
              <div className="md:col-span-2">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">Email <span className="text-red-500">*</span></label>
                <input id="email" type="email" name="email" value={formData.email} onChange={handleChange} required className={inputBaseClasses}/>
              </div>
            </div>
          </fieldset>

          <fieldset className={fieldsetClasses}>
            <legend className={legendClasses}>Service Details</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mt-3">
              <div className="relative">
                <label htmlFor="style" className="block text-sm font-medium text-gray-700 mb-1.5">Service Type <span className="text-red-500">*</span></label>
                <select id="style" name="style" value={formData.style} onChange={handleChange} required className={selectBaseClasses}>
                  <option value="" disabled>Select a service</option>
                  {styles.map((style) => (<option key={style} value={style}>{style}</option>))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 top-6 flex items-center px-2 text-gray-700">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
              </div>
              <div className="relative">
                <label htmlFor="stylist" className="block text-sm font-medium text-gray-700 mb-1.5">Stylist <span className="text-red-500">*</span></label>
                <select id="stylist" name="stylist" value={formData.stylist} onChange={handleChange} required className={selectBaseClasses}>
                  <option value="" disabled>Select a stylist</option>
                  {stylists.map((stylist) => (<option key={stylist} value={stylist}>{stylist}</option>))}
                </select>
                 <div className="pointer-events-none absolute inset-y-0 right-0 top-6 flex items-center px-2 text-gray-700">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                </div>
              </div>
            </div>
             <div className="mt-5">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1.5">Appointment Notes</label>
              <textarea id="notes" name="notes" rows={3} value={formData.notes} onChange={handleChange} className={`${inputBaseClasses} resize-none`}></textarea>
            </div>
          </fieldset>

          <fieldset className={fieldsetClasses}>
            <legend className={legendClasses}>Schedule</legend>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mt-3">
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1.5">Date <span className="text-red-500">*</span></label>
                <input id="date" type="date" name="date" value={formData.date} onChange={handleChange} required className={inputBaseClasses}/>
              </div>
              <div>
                <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1.5">Time <span className="text-red-500">*</span></label>
                <input id="time" type="time" name="time" value={formData.time} onChange={handleChange} required className={inputBaseClasses}/>
              </div>
            </div>
          </fieldset>

           <fieldset className={fieldsetClasses}>
            <legend className={legendClasses}>Payment</legend>
             <div className="mt-3 relative">
              <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-1.5">Payment Method <span className="text-red-500">*</span></label>
              <select id="paymentMethod" name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} required className={selectBaseClasses}>
                <option value="" disabled>Select payment method</option>
                {paymentMethods.map((method) => (<option key={method} value={method}>{method}</option>))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 top-6 flex items-center px-2 text-gray-700">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
              </div>
            </div> 
          </fieldset> 

           <fieldset className={fieldsetClasses}>
            <legend className={legendClasses}>Additional Products</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
              {productsData.map((product) => (
                <div key={product.id} className={`flex items-center gap-3 p-3 border rounded-lg transition-all
                                                 ${formData.products.includes(product.id) ? 'bg-gray-100 border-gray-400 shadow-sm' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
                  <input type="checkbox" id={`product-${product.id}`} value={product.id.toString()} checked={formData.products.includes(product.id)} onChange={(e) => handleProductChange(product.id, e.target.checked)} className="h-4 w-4 text-black border-gray-300 rounded focus:ring-black/50 cursor-pointer"/>
                  <label htmlFor={`product-${product.id}`} className="flex-1 text-sm text-gray-800 cursor-pointer select-none">
                    {product.name} <span className="text-gray-500 font-normal">(₹{product.price})</span>
                  </label>
                </div>
              ))}
            </div>
          </fieldset> 

          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 mt-6">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-colors" disabled={isSubmitting}>Cancel</button>
            <button type="submit" className="px-5 py-2.5 text-sm font-medium text-white bg-gray-800 rounded-lg hover:bg-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black flex items-center justify-center min-w-[150px] transition-colors" disabled={isSubmitting}>
              {isSubmitting ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : "Book Appointment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}