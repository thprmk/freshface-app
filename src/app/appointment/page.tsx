'use client';
import { useState, useEffect, useCallback } from 'react';
import BookAppointmentForm from './BookAppointmentForm';

// Define a type for your appointment data structure coming from the DB
interface AppointmentData {
  _id: string;
  customerName: string;
  phoneNumber: string; // <<< THIS WILL BE USED FOR IDENTIFICATION
  email: string;
  style: string;
  stylist: string;
  date: string; // Expected format: YYYY-MM-DD
  time: string; // Expected format: HH:MM
  paymentMethod: string;
  products: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export default function AppointmentPage() {
  const [isBookingFormOpen, setIsBookingFormOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [appointments, setAppointments] = useState<AppointmentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAppointments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/appointment');
      if (!res.ok) {
        let errorMessage = `API Error: ${res.status} ${res.statusText}`;
        try {
          const errorData = await res.json();
          if (errorData && errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (jsonError) {
          const textError = await res.text();
          console.error("Non-JSON error response when fetching appointments:", textError);
          errorMessage = textError || errorMessage;
        }
        throw new Error(errorMessage);
      }
      const data = await res.json();
      if (data.success) {
        setAppointments(data.appointments || []);
      } else {
        throw new Error(data.message || 'Failed to fetch appointments from server');
      }
    } catch (err) {
      console.error("Error in fetchAppointments:", err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred while fetching appointments');
      setAppointments([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const handleBookingFormClose = () => {
    setIsBookingFormOpen(false);
    fetchAppointments();
  };

  const formatDateTime = (isoDate: string, time: string) => {
    try {
      const [year, month, day] = isoDate.split('-').map(Number);
      const dateObj = new Date(Date.UTC(year, month - 1, day));
      const formattedDate = dateObj.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC',
      });
      let formattedTime = time;
      if (/^\d{2}:\d{2}$/.test(time)) {
        const [hours, minutes] = time.split(':');
        const h = parseInt(hours, 10);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const displayHours = h % 12 || 12;
        formattedTime = `${displayHours}:${minutes} ${ampm}`;
      }
      return { date: formattedDate, time: formattedTime };
    } catch (e) {
      console.error("Error formatting date/time:", isoDate, time, e);
      return { date: "Invalid Date", time: "Invalid Time" };
    }
  };

  let todaysTotalAppointments = 0;
  let uniqueCustomerChangeText = "Loading...";

  if (!isLoading && appointments) {
    const today = new Date();
    const todayFormatted = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayFormatted = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    const todaysApptsArray = appointments.filter(apt => apt.date === todayFormatted);
    const yesterdaysApptsArray = appointments.filter(apt => apt.date === yesterdayFormatted);
    todaysTotalAppointments = todaysApptsArray.length;

    // --- Logic for Unique Customer Count Change Text (USING PHONE NUMBER) ---
    const todaysUniqueCustomerPhoneNumbers = new Set(
      todaysApptsArray.map(apt => apt.phoneNumber).filter(Boolean) // CHANGED
    );
    const yesterdaysUniqueCustomerPhoneNumbers = new Set(
      yesterdaysApptsArray.map(apt => apt.phoneNumber).filter(Boolean) // CHANGED
    );

    const todaysUniqueCustomerCount = todaysUniqueCustomerPhoneNumbers.size;
    const yesterdaysUniqueCustomerCount = yesterdaysUniqueCustomerPhoneNumbers.size;

    if (todaysApptsArray.length === 0 && yesterdaysApptsArray.length === 0) {
      uniqueCustomerChangeText = "No customer activity";
    } else if (yesterdaysUniqueCustomerCount > 0) {
      const diff = todaysUniqueCustomerCount - yesterdaysUniqueCustomerCount;
      if (diff > 0) {
        uniqueCustomerChangeText = `+${diff} customer(s) from yesterday`;
      } else if (diff < 0) {
        uniqueCustomerChangeText = `${diff} customer(s) from yesterday`;
      } else {
        uniqueCustomerChangeText = "Same # of customers as yesterday";
      }
    } else if (todaysUniqueCustomerCount > 0) {
      uniqueCustomerChangeText = `+${todaysUniqueCustomerCount} customer(s) (0 yesterday)`;
    } else {
      uniqueCustomerChangeText = "No customers today";
    }
  } else if (!isLoading && !appointments) {
    uniqueCustomerChangeText = "Data unavailable";
    todaysTotalAppointments = 0;
  }

  const todaysRevenueDisplay = isLoading ? '...' : '$0';
  const upcomingAppointmentsDisplay = isLoading || !appointments
    ? '...'
    : appointments.filter(apt => {
        try {
          const todayDateOnly = new Date(new Date().setHours(0,0,0,0));
          const [year, month, day] = apt.date.split('-').map(Number);
          const aptDateObj = new Date(Date.UTC(year, month - 1, day));
          return aptDateObj >= todayDateOnly;
        } catch { return false; }
      }).length;
  const utilizationDisplay = isLoading ? '...' : '0%';

  return (
    <div className="min-h-screen bg-gray-50/30 p-4 md:p-8">
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Card 1: Today's Appointments */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gray-100 rounded-lg">
              <svg className="w-6 h-6 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">Today's Appointments</div>
              <div className="text-2xl font-bold text-black">
                {isLoading ? '...' : todaysTotalAppointments}
              </div>
              <div className={`text-sm font-medium mt-1 ${
                isLoading ? 'text-gray-500' :
                uniqueCustomerChangeText.startsWith('+') ? 'text-green-600' :
                uniqueCustomerChangeText.startsWith('-') ? 'text-red-600' :
                'text-gray-500'
              }`}>
                {isLoading ? '...' : uniqueCustomerChangeText}
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Today's Revenue */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-50 rounded-lg">
               <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">Today's Revenue</div>
              <div className="text-2xl font-bold text-black">{todaysRevenueDisplay}</div>
              <div className="text-sm font-medium text-gray-900">Calculation needed</div>
            </div>
          </div>
        </div>

        {/* Card 3: Upcoming Appointments */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-50 rounded-lg">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">Upcoming</div>
              <div className="text-2xl font-bold text-black">{upcomingAppointmentsDisplay}</div>
              <div className="text-sm font-medium text-gray-900">Today & future</div>
            </div>
          </div>
        </div>

        {/* Card 4: Utilization */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-50 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">Utilization</div>
              <div className="text-2xl font-bold text-black">{utilizationDisplay}</div>
              <div className="text-sm font-medium text-gray-900">Detailed logic TBD</div>
            </div>
          </div>
        </div>
      </div>

      {/* Appointment List Table & Modal */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6 border-b border-gray-100">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
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
                Calendar (Not Implemented)
              </button>
            </div>
            <div className="flex items-center gap-4"> {/* Placeholder for search/filter */} </div>
          </div>
        </div>

        {isLoading && <div className="p-6 text-center text-gray-700">Loading appointments...</div>}
        {error && <div className="p-6 text-center text-red-600">Error: {error}</div>}

        {!isLoading && !error && appointments.length === 0 && (
          <div className="p-6 text-center text-gray-700">No appointments found. Book one!</div>
        )}

        {!isLoading && !error && appointments.length > 0 && viewMode === 'list' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-700">Client</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-700">Service</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-700">Date & Time</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-700">Stylist</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-700">Status</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {appointments.map((appointment) => {
                  const { date: displayDate, time: displayTime } = formatDateTime(appointment.date, appointment.time);
                  return (
                    <tr key={appointment._id} className="text-black hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-gray-700 uppercase">
                            {appointment.customerName ? appointment.customerName[0] : 'N'}
                          </div>
                          <div>
                            <div className="font-medium text-black">{appointment.customerName}</div>
                            <div className="text-sm text-gray-700">{appointment.phoneNumber}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">{appointment.style}</td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-black">{displayDate}</div>
                          <div className="text-sm text-gray-700">{displayTime}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">{appointment.stylist}</td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 text-sm rounded-full bg-blue-50 text-blue-700">
                          Upcoming
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-1 hover:bg-gray-100 rounded">
                          <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 14a2 2 0 100-4 2 2 0 000 4zm-6 0a2 2 0 100-4 2 2 0 000 4zm12 0a2 2 0 100-4 2 2 0 000 4z" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {viewMode === 'calendar' && (
          <div className="p-6 text-center text-gray-700">
            Calendar View - Implementation Pending.
          </div>
        )}
      </div>
      {isBookingFormOpen && (
        <BookAppointmentForm onClose={handleBookingFormClose} />
      )}
    </div>
  );
}