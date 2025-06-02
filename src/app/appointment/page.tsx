'use client';
import { useState } from 'react';
import BookAppointmentForm from './BookAppointmentForm';

export default function AppointmentPage() {
  const [isBookingFormOpen, setIsBookingFormOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  // Dummy data for demonstration
  const appointments = [
    {
      id: 1,
      client: {
        name: 'Emma Wilson',
        email: 'emma@example.com',
        avatar: null,
      },
      service: 'Haircut & Styling',
      date: 'May 31, 2025',
      time: '10:00 AM',
      duration: '45 min',
      stylist: 'John Davis',
      price: 85,
      status: 'Upcoming',
    },
    {
      id: 2,
      client: {
        name: 'Michael Brown',
        email: 'michael@example.com',
        avatar: null,
      },
      service: 'Hair Coloring',
      date: 'May 31, 2025',
      time: '11:30 AM',
      duration: '90 min',
      stylist: 'Sarah Johnson',
      price: 120,
      status: 'Upcoming',
    },
  ];

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
              <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">Today's Appointments</div>
              <div className="text-2xl font-bold text-black">5</div>
              <div className="text-sm font-medium text-green-600">1 completed</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-50 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">Today's Revenue</div>
              <div className="text-2xl font-bold text-black">$465</div>
              <div className="text-sm font-medium text-gray-900">From 5 appointments</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-50 rounded-lg">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">Upcoming</div>
              <div className="text-2xl font-bold text-black">4</div>
              <div className="text-sm font-medium text-gray-900">Next 7 days</div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-50 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">Utilization</div>
              <div className="text-2xl font-bold text-black">87%</div>
              <div className="text-sm font-medium text-gray-900">Booking efficiency</div>
            </div>
          </div>
        </div>
      </div>

      {/* Appointment List */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setViewMode('list')}
                className={`px-4 py-2 rounded-lg ${
                  viewMode === 'list'
                    ? 'bg-gray-100 text-black'
                    : 'text-gray-700 hover:text-black'
                }`}
              >
                List View
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`px-4 py-2 rounded-lg ${
                  viewMode === 'calendar'
                    ? 'bg-gray-100 text-black'
                    : 'text-gray-700 hover:text-black'
                }`}
              >
                Calendar
              </button>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search appointments..."
                  className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-300 text-black placeholder-gray-500"
                />
                <svg
                  className="w-5 h-5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <select className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-gray-300 text-black">
                <option>All Status</option>
                <option>Upcoming</option>
                <option>Completed</option>
                <option>Cancelled</option>
              </select>
              <button className="p-2 hover:bg-gray-100 rounded-lg">
                <svg
                  className="w-5 h-5 text-gray-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-700">
                  Client
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-700">
                  Service
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-700">
                  Date & Time
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-700">
                  Stylist
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-700">
                  Price
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-700">
                  Status
                </th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {appointments.map((appointment) => (
                <tr key={appointment.id} className="text-black">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-700">
                        {appointment.client.name[0]}
                      </div>
                      <div>
                        <div className="font-medium text-black">{appointment.client.name}</div>
                        <div className="text-sm text-gray-700">
                          {appointment.client.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">{appointment.service}</td>
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-black">{appointment.date}</div>
                      <div className="text-sm text-gray-700">
                        {appointment.time} ({appointment.duration})
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">{appointment.stylist}</td>
                  <td className="px-6 py-4">${appointment.price}</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 text-sm rounded-full bg-blue-50 text-blue-700">
                      {appointment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button className="p-1 hover:bg-gray-100 rounded">
                      <svg
                        className="w-5 h-5 text-gray-700"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M12 14a2 2 0 100-4 2 2 0 000 4zm-6 0a2 2 0 100-4 2 2 0 000 4zm12 0a2 2 0 100-4 2 2 0 000 4z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Booking Form Modal */}
      {isBookingFormOpen && (
        <BookAppointmentForm onClose={() => setIsBookingFormOpen(false)} />
      )}
    </div>
  );
} 