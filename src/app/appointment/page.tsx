'use client';
import { useState, useEffect } from 'react';
import BookAppointmentForm from './BookAppointmentForm';
import axios from 'axios';

export default function AppointmentPage() {
  const [isBookingFormOpen, setIsBookingFormOpen] = useState(false);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter today's appointments
  const todaysAppointments = appointments.filter(app => {
    const appDate = new Date(app.date);
    return appDate.toDateString() === today.toDateString();
  });

  // Completed today
  const completeToday = todaysAppointments.filter(app => app.status === 'Completed');

  // Revenue today
  const todayRevenue = todaysAppointments.reduce((sum, app) => sum + (app.totalPrice || 0), 0);

  // Upcoming appointments (after today)
  const upcomingAppointments = appointments.filter(app => {
    const appDate = new Date(app.date);
    return appDate > today;
  });

  // Function to update appointment status
  async function updateStatus(id: string, currentStatus: string) {
    const newStatus = currentStatus === 'Completed' ? 'Upcoming' : 'Completed';
    try {
      await axios.put('/api/appointments', { id, status: newStatus });

      // Refresh appointments list with current filters
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter && statusFilter !== 'All') params.append('status', statusFilter);

      const res = await axios.get('/api/appointments?' + params.toString());
      setAppointments(res.data);
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  }

  // Fetch appointments with filters whenever search or statusFilter changes
  useEffect(() => {
    async function fetchAppointments() {
      try {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (statusFilter && statusFilter !== 'All') params.append('status', statusFilter);

        const res = await axios.get('/api/appointments?' + params.toString());
        setAppointments(res.data);
      } catch (err) {
        console.error('Failed to fetch appointments:', err);
      }
    }
    fetchAppointments();
  }, [search, statusFilter]);

  return (
    <div className="min-h-screen bg-gray-50/30">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-black mb-2">Appointments</h1>
          <p className="text-gray-700">Manage your salon's appointment schedule</p>
        </div>
        <button
          onClick={() => setIsBookingFormOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-black/90"
        >
          <span>+</span>
          <span>Book Appointment</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gray-100 rounded-lg">
              <svg
                className="w-6 h-6 text-black"
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
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">Today's Appointments</div>
              <div className="text-2xl font-bold text-black">{todaysAppointments.length}</div>
              <div className="text-sm font-medium text-green-600">{completeToday.length} completed</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">Today's Revenue</div>
              <div className="text-2xl font-bold text-black">${todayRevenue}</div>
              <div className="text-sm font-medium text-gray-900">From {todaysAppointments.length} appointments</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-50 rounded-lg">
              <svg
                className="w-6 h-6 text-yellow-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">Upcoming</div>
              <div className="text-2xl font-bold text-black">{upcomingAppointments.length}</div>
              <div className="text-sm font-medium text-gray-900">Next 7 days</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <input
          type="text"
          placeholder="Search appointments..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-300 text-black placeholder-gray-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-300 text-black"
        >
          <option>All</option>
          <option>Upcoming</option>
          <option>Completed</option>
          <option>Cancelled</option>
        </select>
      </div>

      {/* Appointment List */}
      <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-700">Client</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-700">Service</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-700">Date & Time</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-700">Stylist</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-700">Price</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-700">Status</th>
              <th className="px-6 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {appointments.map((appointment) => (
              <tr key={appointment._id} className="text-black">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-700">
                      {appointment.customerName.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-black">{appointment.customerName}</div>
                      <div className="text-sm text-gray-700">{appointment.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">{appointment.style}</td>
                <td className="px-6 py-4">
                  <div>
                    <div className="text-black">
                      {new Date(appointment.date).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                    <div className="text-sm text-gray-700">{appointment.time}</div>
                  </div>
                </td>
                <td className="px-6 py-4">{appointment.stylist}</td>
                <td className="px-6 py-4">${appointment.totalPrice || 0}</td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 text-sm rounded-full bg-blue-50 text-blue-700">
                    {appointment.status || 'Upcoming'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button
                    className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    onClick={() => updateStatus(appointment._id, appointment.status)}
                  >
                    Toggle Status
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Booking Form Modal */}
      {isBookingFormOpen && (
        <BookAppointmentForm onClose={() => setIsBookingFormOpen(false)} />
      )}
    </div>
  );
}
