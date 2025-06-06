'use client'; // Ensure this is at the very top if it's a client component

import React from 'react';
import {
  Users, Calendar, Banknote, Award, ChevronUp, ChevronDown,
  TrendingUp, Clock, CircleUser
} from 'lucide-react';
import { useStaff } from '../../context/StaffContext'; // Corrected path
import CardComponent from '../../components/ui/Card'; // Corrected path
import { format } from 'date-fns';

// Define the structure of a staff member
// This should ideally be in a shared types file or co-located with StaffContext
export interface StaffMember {
  id: string | number; // Assuming id can be string or number based on context
  name: string;
  image: string;
  position: string;
  status: 'active' | 'inactive' | 'on_leave';
  salary: number;
  // Optional: Add other relevant fields
}

// Props for the Card component imported (adjust as needed)
interface UICardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

// Your StatCard component
const StatCard = ({ title, value, icon, change, changeType }: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  change?: number;
  changeType?: 'up' | 'down' | 'neutral';
}) => {
  return (
    <CardComponent className="flex flex-col h-full p-4 shadow rounded-lg bg-white">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
        </div>
        <div className="p-3 bg-purple-100 rounded-lg">
          {icon}
        </div>
      </div>
      {change !== undefined && changeType && (
        <div className="mt-3 flex items-center">
          {changeType === 'up' ? (
            <ChevronUp className="w-4 h-4 text-green-500" />
          ) : changeType === 'down' ? (
            <ChevronDown className="w-4 h-4 text-red-500" />
          ) : (
            <div className="w-4 h-4" />
          )}
          <p
            className={`text-xs font-medium ml-1 ${
              changeType === 'up'
                ? 'text-green-500'
                : changeType === 'down'
                ? 'text-red-500'
                : 'text-gray-500'
            }`}
          >
            {change}% {changeType !== 'neutral' ? `from last month` : 'change'}
          </p>
        </div>
      )}
    </CardComponent>
  );
};


const Dashboard: React.FC = () => {
  // Ensure useStaff() is typed to return { staffMembers: StaffMember[] }
  // or handle potential undefined case.
  const { staffMembers } = useStaff(); // Assuming useStaff never returns undefined based on its implementation
  const today = new Date();

  const activeStaffCount = staffMembers.filter((staff: StaffMember) => staff.status === 'active').length;
  const totalSalaryExpense = staffMembers.reduce((acc: number, staff: StaffMember) => acc + (staff.salary || 0), 0); // Added check for salary presence

  // Using actual staff data, assuming they have properties that can represent activity
  const recentActivities = staffMembers
    .slice(0, 3) // Take first 3 for example
    .map(staff => ({
      ...staff,
      activity: staff.status === 'active' ? 'clocked in' : 'updated profile', // Example activity logic
      time: format(new Date(), 'p'), // Example time, should be from actual attendance/log data
  }));

  // Example: simple sorting by salary for "top performers" demonstration
  const topPerformers = [...staffMembers] // Create a shallow copy to sort
    .sort((a, b) => b.salary - a.salary)
    .slice(0, 3)
    .map((staff, index) => ({
      ...staff,
      performance: 95 - index * 5, // Placeholder performance metric
  }));


  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">
          {format(today, 'EEEE, MMMM do, yyyy')}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Staff"
          value={staffMembers.length}
          icon={<Users className="h-6 w-6 text-purple-600" />}
          // change={5} // Example
          // changeType="up"
        />
        <StatCard
          title="Present Today"
          // Replace with actual attendance data logic
          value={activeStaffCount} // For simplicity, showing active staff
          icon={<Calendar className="h-6 w-6 text-teal-600" />}
          // change={2} // Example
          // changeType="up"
        />
        <StatCard
          title="Salary Expense (Monthly)"
          value={`$${totalSalaryExpense.toLocaleString()}`}
          icon={<Banknote className="h-6 w-6 text-pink-600" />}
          // change={-1.5} // Example: Negative for decrease
          // changeType="down"
        />
        <StatCard
          title="Avg. Performance"
          // Replace with actual calculation
          value={topPerformers.length > 0 ? `${Math.round(topPerformers.reduce((sum, p) => sum + p.performance, 0) / topPerformers.length)}%` : "N/A"}
          icon={<Award className="h-6 w-6 text-amber-500" />}
          // change={1} // Example
          // changeType="up"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CardComponent title="Recent Activity" className="lg:col-span-2 bg-white p-4 shadow rounded-lg">
          <div className="space-y-4">
            {recentActivities.length > 0 ? recentActivities.map((activityItem: StaffMember & { activity: string; time: string }) => (
              <div key={activityItem.id} className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="relative flex-shrink-0">
                  <img
                    src={activityItem.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(activityItem.name)}&background=random`}
                    alt={activityItem.name}
                    className="w-10 h-10 rounded-full object-cover border border-gray-200"
                  />
                  {activityItem.status === 'active' && ( // Example indicator
                     <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                  )}
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-gray-800">{activityItem.name} {activityItem.activity}</p>
                  <p className="text-xs text-gray-500">{activityItem.time}</p>
                </div>
                <div>
                  <Clock className="h-5 w-5 text-gray-400" />
                </div>
              </div>
            )) : (
              <p className="text-gray-500 text-sm">No recent activity to show.</p>
            )}
          </div>
        </CardComponent>

        <CardComponent title="Top Performers" className="lg:col-span-1 bg-white p-4 shadow rounded-lg">
          <div className="space-y-4">
            {topPerformers.length > 0 ? topPerformers.map((staff: StaffMember & { performance: number }, index: number) => (
              <div key={staff.id} className="flex items-center py-2">
                <div className="flex-shrink-0 mr-3">
                  <div className="relative">
                    <img
                      src={staff.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(staff.name)}&background=random`}
                      alt={staff.name}
                      className="w-10 h-10 rounded-full object-cover border border-gray-200"
                    />
                    {index === 0 && (
                      <div className="absolute -top-1 -right-1 bg-yellow-400 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow">
                        1st
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {staff.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{staff.position}</p>
                </div>
                <div className="flex items-center text-sm text-green-600 font-medium">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  <span>{staff.performance}%</span>
                </div>
              </div>
            )) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <CircleUser className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-2 text-sm font-medium text-gray-600">No staff members yet</p>
                <p className="text-xs text-gray-500">Add staff to see top performers.</p>
              </div>
            )}
          </div>
        </CardComponent>
      </div>
    </div>
  );
};

export default Dashboard;