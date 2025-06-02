'use client';
import { useState } from 'react';
import axios from 'axios';
// If you don’t actually need `format`, you can remove this import until you install date-fns
// import { format } from 'date-fns';

interface BookAppointmentFormProps {
  onClose: () => void;
}

export default function BookAppointmentForm({ onClose }: BookAppointmentFormProps) {
  // 1) Define your form data state first:
  const [formData, setFormData] = useState({
    customerName: '',
    phoneNumber: '',
    email: '',
    style: '',
    stylist: '',
    date: '',
    time: '',
    paymentMethod: '',
    products: [] as number[],
  });

  // 2) Then define your single `handleSubmit` (remove any other duplicate):
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      // Build the payload exactly as your backend expects:
      const payload = {
        customerName:  formData.customerName,
        phoneNumber:   formData.phoneNumber,
        email:         formData.email,
        style:         formData.style,
        stylist:       formData.stylist,
        date:          formData.date,   // “YYYY-MM-DD” string
        time:          formData.time,   // e.g. “14:30”
        paymentMethod: formData.paymentMethod,
        products:      formData.products, // array of numbers
      };

      const response = await axios.post("/api/appointments", payload);

      if (response.status === 201) {
        alert('✅ Appointment booked successfully!');
        onClose();
      } else {
        alert('❌ Something went wrong. Try again.');
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || 'Network error');
    }
  };

  // 3) Your other handlers and constants:
  const styles = [ 'Haircut', 'Hair Coloring', 'Styling', 'Facial', 'Manicure', 'Pedicure' ];
  const stylists = [ 'Sarah Smith', 'John Doe', 'Emma Wilson', 'Michael Brown' ];
  const paymentMethods = [ 'Cash', 'UPI' ];
  const products = [
    { id: 1, name: 'Shampoo', price: 299 },
    { id: 2, name: 'Conditioner', price: 249 },
    { id: 3, name: 'Hair Serum', price: 399 },
    { id: 4, name: 'Hair Oil', price: 199 },
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-black">Book Appointment</h2>
          <button onClick={onClose} className="text-gray-700 hover:text-black">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-black">Customer Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-300 text-black"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-300 text-black"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-300 text-black"
                  required
                />
              </div>
            </div>
          </div>

          {/* Service Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-black">Service Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Type</label>
                <select
                  name="style"
                  value={formData.style}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-300 text-black"
                  required
                >
                  <option value="">Select a service</option>
                  {styles.map((style) => (
                    <option key={style} value={style}>
                      {style}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stylist</label>
                <select
                  name="stylist"
                  value={formData.stylist}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-300 text-black"
                  required
                >
                  <option value="">Select a stylist</option>
                  {stylists.map((stylist) => (
                    <option key={stylist} value={stylist}>
                      {stylist}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Date and Time */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-black">Schedule</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-300 text-black"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                <input
                  type="time"
                  name="time"
                  value={formData.time}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-300 text-black"
                  required
                />
              </div>
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-black">Payment</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select
                name="paymentMethod"
                value={formData.paymentMethod}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-300 text-black"
                required
              >
                <option value="">Select payment method</option>
                {paymentMethods.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Products */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-black">Additional Products</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg"
                >
                  <input
                    type="checkbox"
                    id={`product-${product.id}`}
                    name="products"
                    value={product.id}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData((prev) => ({
                          ...prev,
                          products: [...prev.products, product.id],
                        }));
                      } else {
                        setFormData((prev) => ({
                          ...prev,
                          products: prev.products.filter((id) => id !== product.id),
                        }));
                      }
                    }}
                    className="h-4 w-4 text-black rounded focus:ring-black/5"
                  />
                  <label htmlFor={`product-${product.id}`} className="flex-1">
                    <span className="block font-medium text-black">{product.name}</span>
                    <span className="text-sm text-gray-700">₹{product.price}</span>
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-black text-white rounded-lg hover:bg-black/90"
            >
              Book Appointment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
