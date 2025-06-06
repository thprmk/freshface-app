// src/app/staffmanagement/performance/page.tsx

'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, Search, Plus, Star, TrendingUp, Users, IndianRupee 
} from 'lucide-react';
// ✅ FIX: Import types from the single source of truth: StaffContext
import { 
    useStaff, 
    PerformanceRecordType, 
    NewPerformanceRecordPayload,
    StaffMember // Assuming StaffMember is also exported from your context, or define it locally if not.
} from '@/context/StaffContext'; // Using robust path alias
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// NOTE: The local type definitions have been removed to avoid conflicts.

const PerformancePage: React.FC = () => {
  // ✅ FIX: Add fetchPerformanceRecords and loadingPerformance from context
  const { staffMembers, performanceRecords, recordPerformance, fetchPerformanceRecords, loadingPerformance } = useStaff();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [currentMonthIndex, setCurrentMonthIndex] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [showNewRecordForm, setShowNewRecordForm] = useState(false);
  
  interface PerformanceFormData {
    staffId: string;
    rating: number;
    comments: string;
    customersServed: number;
    salesGenerated: number;
    serviceQuality: number;
  }
  const [formData, setFormData] = useState<PerformanceFormData>({
    staffId: '',
    rating: 5,
    comments: '',
    customersServed: 0,
    salesGenerated: 0,
    serviceQuality: 5
  });
  
  const months = useMemo(() => [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ], []);

  // ✅ FIX: Fetch data when the page loads or when the filters (month/year) change.
  useEffect(() => {
    fetchPerformanceRecords({ month: months[currentMonthIndex], year: currentYear });
  }, [fetchPerformanceRecords, months, currentMonthIndex, currentYear]);

  const filteredStaff = useMemo(() => staffMembers.filter(staff => 
    staff.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
    staff.status === 'active'
  ), [staffMembers, searchTerm]);
  
  // This remains correct as it filters the already-fetched records from context state
  const currentMonthRecords = useMemo(() => performanceRecords.filter(
    (record: PerformanceRecordType) =>
      record.month === months[currentMonthIndex] && record.year === currentYear
  ), [performanceRecords, months, currentMonthIndex, currentYear]);

  interface ChartDataType {
    name: string;
    rating: number;
    customers: number;
    sales: number;
    serviceQuality: number;
  }

  // ✅ FIX: Logic updated to use staffId.id for matching
  const chartData: ChartDataType[] = useMemo(() => {
    return filteredStaff.map(staff => { 
      const record = currentMonthRecords.find((r: PerformanceRecordType) => r.staffId.id === staff.id);
      return {
        name: staff.name,
        rating: record?.rating || 0,
        customers: record?.metrics?.customersServed || 0,
        sales: record?.metrics?.salesGenerated || 0,
        serviceQuality: record?.metrics?.serviceQuality || 0,
      };
    });
  }, [filteredStaff, currentMonthRecords]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: (name === 'rating' || name === 'customersServed' || name === 'salesGenerated' || name === 'serviceQuality')
        ? parseFloat(value) || 0
        : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.staffId) {
      alert("Please select a staff member.");
      return;
    }

    const payload: NewPerformanceRecordPayload = {
        staffId: formData.staffId,
        month: months[currentMonthIndex],
        year: currentYear,
        rating: formData.rating,
        comments: formData.comments,
        metrics: {
            customersServed: formData.customersServed,
            salesGenerated: formData.salesGenerated,
            serviceQuality: formData.serviceQuality
        }
    };
    
    await recordPerformance(payload);
    
    setShowNewRecordForm(false);
    setFormData({ staffId: '', rating: 5, comments: '', customersServed: 0, salesGenerated: 0, serviceQuality: 5 });
  };

  // ✅ FIX: Calculations are separated from string formatting to avoid type errors.
  const averageRating = useMemo(() => {
    if (currentMonthRecords.length === 0) return '—';
    const total = currentMonthRecords.reduce((acc, curr) => acc + curr.rating, 0);
    return (total / currentMonthRecords.length).toFixed(1);
  }, [currentMonthRecords]);

  const totalCustomersServed = useMemo(() => 
    currentMonthRecords.reduce((acc, curr) => acc + curr.metrics.customersServed, 0), 
  [currentMonthRecords]);

  const totalSalesGenerated = useMemo(() => 
    currentMonthRecords.reduce((acc, curr) => acc + curr.metrics.salesGenerated, 0),
  [currentMonthRecords]);
  
  const averageServiceQuality = useMemo(() => {
    if (currentMonthRecords.length === 0) return '—';
    const total = currentMonthRecords.reduce((acc, curr) => acc + curr.metrics.serviceQuality, 0);
    return (total / currentMonthRecords.length).toFixed(1);
  }, [currentMonthRecords]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Performance Management</h1>
        <Button 
          icon={<Plus size={16} />}
          onClick={() => setShowNewRecordForm(true)}
          className="mt-4 md:mt-0"
        >
          Add Performance Record
        </Button>
      </div>
      
      {showNewRecordForm && (
        <Card title={`New Performance Record for ${months[currentMonthIndex]} ${currentYear}`} className="border-purple-200 shadow">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="staffId" className="block text-sm font-medium text-gray-700 mb-1">Staff Member*</label>
                <select id="staffId" name="staffId" required value={formData.staffId} onChange={handleInputChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500">
                  <option value="">Select Staff Member</option>
                  {staffMembers
                    .filter(staff => staff.status === 'active')
                    .map(staff => (
                      <option key={staff.id} value={staff.id}>{staff.name} - {staff.position}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="rating" className="block text-sm font-medium text-gray-700 mb-1">Overall Rating (1-10)*</label>
                <input id="rating" name="rating" type="number" required min="1" max="10" step="0.1" value={formData.rating} onChange={handleInputChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-purple-500"/>
              </div>
              <div>
                <label htmlFor="customersServed" className="block text-sm font-medium text-gray-700 mb-1">Customers Served*</label>
                <input id="customersServed" name="customersServed" type="number" required min="0" value={formData.customersServed} onChange={handleInputChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-purple-500"/>
              </div>
              <div>
                <label htmlFor="salesGenerated" className="block text-sm font-medium text-gray-700 mb-1">Sales Generated (₹)*</label>
                <input id="salesGenerated" name="salesGenerated" type="number" required min="0" value={formData.salesGenerated} onChange={handleInputChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-purple-500"/>
              </div>
              <div>
                <label htmlFor="serviceQuality" className="block text-sm font-medium text-gray-700 mb-1">Service Quality (1-10)*</label>
                <input id="serviceQuality" name="serviceQuality" type="number" required min="1" max="10" step="0.1" value={formData.serviceQuality} onChange={handleInputChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-purple-500"/>
              </div>
              <div className="md:col-span-2">
                <label htmlFor="comments" className="block text-sm font-medium text-gray-700 mb-1">Comments</label>
                <textarea id="comments" name="comments" rows={3} value={formData.comments} onChange={handleInputChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Provide feedback and comments..."/>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-4">
              <Button type="button" variant="outline" onClick={() => setShowNewRecordForm(false)}>Cancel</Button>
              <Button type="submit" icon={<Star size={16} />}>Save Record</Button>
            </div>
          </form>
        </Card>
      )}
      
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="w-5 h-5 text-gray-400" />
          </div>
          <input type="text" placeholder="Search staff..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 placeholder:text-gray-400"/>
        </div>
        <div>
          <select value={currentMonthIndex} onChange={(e) => setCurrentMonthIndex(parseInt(e.target.value))}
            className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900">
            {months.map((month, index) => (<option key={month} value={index}>{month}</option>))}
          </select>
        </div>
        <div>
          <select value={currentYear} onChange={(e) => setCurrentYear(parseInt(e.target.value))}
            className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900">
            {[...Array(5)].map((_, i) => { const year = new Date().getFullYear() - 2 + i; return (<option key={year} value={year}>{year}</option>);})}
          </select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card><div className="flex flex-col items-center text-center p-4"><div className="p-3 rounded-full bg-purple-100 mb-4"><Star className="h-8 w-8 text-purple-600" /></div><p className="text-2xl font-bold text-gray-900">{averageRating}</p><p className="text-sm text-gray-600">Average Rating</p></div></Card>
        <Card><div className="flex flex-col items-center text-center p-4"><div className="p-3 rounded-full bg-teal-100 mb-4"><Users className="h-8 w-8 text-teal-600" /></div><p className="text-2xl font-bold text-gray-900">{totalCustomersServed}</p><p className="text-sm text-gray-600">Total Customers</p></div></Card>
        <Card><div className="flex flex-col items-center text-center p-4"><div className="p-3 rounded-full bg-pink-100 mb-4"><IndianRupee className="h-8 w-8 text-pink-600" /></div><p className="text-2xl font-bold text-gray-900">₹{totalSalesGenerated.toLocaleString()}</p><p className="text-sm text-gray-600">Revenue Generated</p></div></Card>
        <Card><div className="flex flex-col items-center text-center p-4"><div className="p-3 rounded-full bg-amber-100 mb-4"><TrendingUp className="h-8 w-8 text-amber-600" /></div><p className="text-2xl font-bold text-gray-900">{averageServiceQuality}</p><p className="text-sm text-gray-600">Avg Service Quality</p></div></Card>
      </div>
      
      <Card title="Staff Performance Overview" className="overflow-hidden">
        {loadingPerformance ? <div className="text-center p-10">Loading Chart Data...</div> :
        <div className="h-96 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" angle={-30} textAnchor="end" height={60} interval={0} tick={{fontSize: 10}} />
              <YAxis yAxisId="left" orientation="left" stroke="#8B5CF6" label={{ value: 'Rating (0-10)', angle: -90, position: 'insideLeft', offset: 0, style: {textAnchor: 'middle', fill: '#8B5CF6'} }} domain={[0, 10]}/>
              <YAxis yAxisId="right" orientation="right" stroke="#0D9488" label={{ value: 'Customers / Sales (₹)', angle: 90, position: 'insideRight', offset: 10, style: {textAnchor: 'middle', fill: '#0D9488'} }} />
              <Tooltip formatter={(value, name) => name === 'Sales (₹)' ? `₹${Number(value).toLocaleString()}` : value} />
              <Legend verticalAlign="top" height={36}/>
              <Bar yAxisId="left" dataKey="rating" fill="#8B5CF6" name="Rating" barSize={20} />
              <Bar yAxisId="right" dataKey="customers" fill="#0D9488" name="Customers" barSize={20} />
              <Bar yAxisId="right" dataKey="sales" fill="#EC4899" name="Sales (₹)" barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>}
      </Card>
      
      <Card title={`Individual Performance Records - ${months[currentMonthIndex]} ${currentYear}`} className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff</th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Rating</th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Customers</th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Sales (₹)</th>
                <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Service Quality</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Comments</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loadingPerformance ? (<tr><td colSpan={6} className="text-center p-10">Loading Records...</td></tr>) :
              (filteredStaff.map(staff => {
                // ✅ FIX: Logic updated to use staffId.id for matching
                const record = currentMonthRecords.find((r) => r.staffId.id === staff.id);
                return (
                  <tr key={staff.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap"><div className="flex items-center">
                        <img className="h-10 w-10 rounded-full object-cover" src={staff.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(staff.name)}&background=random`} alt={staff.name} />
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{staff.name}</div>
                          <div className="text-sm text-gray-500">{staff.position}</div>
                        </div>
                    </div></td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">{record ? (<div className="flex items-center justify-center">
                          <Star className="h-4 w-4 text-amber-500 mr-1 fill-current" /><span className="text-sm font-medium text-gray-900">{record.rating}/10</span>
                    </div>) : (<span className="text-sm text-gray-500">—</span>)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">{record ? (<span className="text-sm text-gray-900">{record.metrics.customersServed}</span>) : (<span className="text-sm text-gray-500">—</span>)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">{record ? (<span className="text-sm text-gray-900">₹{record.metrics.salesGenerated.toLocaleString()}</span>) : (<span className="text-sm text-gray-500">—</span>)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">{record ? (<span className="text-sm text-gray-900">{record.metrics.serviceQuality}/10</span>) : (<span className="text-sm text-gray-500">—</span>)}</td>
                    <td className="px-6 py-4"><p className="text-sm text-gray-900 truncate max-w-xs hover:whitespace-normal hover:overflow-visible" title={record?.comments}>
                        {record?.comments || <span className="text-gray-500">No comments</span>}
                    </p></td>
                  </tr>
                );
              }))}
              {!loadingPerformance && filteredStaff.length === 0 && (<tr><td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                  {searchTerm ? 'No staff members match your search.' : 'No active staff members found.'}
              </td></tr>)}
              {!loadingPerformance && filteredStaff.length > 0 && currentMonthRecords.length === 0 && (<tr><td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                  No performance records found for {months[currentMonthIndex]} {currentYear}.
              </td></tr>)}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default PerformancePage;