'use client';
import React, { useState, useEffect } from 'react';
import { IndianRupee, Calendar, CheckCircle, XCircle } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';

// A simplified type for the staff dropdown
interface StaffMember {
  id: string;
  name: string;
}

export default function IncentivesPage() {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Form states
  const [serviceSale, setServiceSale] = useState('');
  const [productSale, setProductSale] = useState('');
  const [reviewsWithName, setReviewsWithName] = useState('');
  const [reviewsWithPhoto, setReviewsWithPhoto] = useState('');

  // UI states
  const [loading, setLoading] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [message, setMessage] = useState('');
  const [results, setResults] = useState<any>(null);

  // Fetch staff list for the dropdown
  useEffect(() => {
    const fetchStaff = async () => {
      setLoadingStaff(true);
      try {
        // ✅ FIX: Added the '?action=list' query parameter to the fetch URL.
        const response = await fetch('/api/staff?action=list'); 
        
        if (!response.ok) {
          console.error("API Error:", response.status, response.statusText);
          setMessage(`Error: Could not load staff. Status: ${response.status}`);
          setStaffList([]);
          return;
        }
        
        const result = await response.json();

        if (result.data && Array.isArray(result.data)) {
          setStaffList(result.data);
          if (result.data.length > 0) {
            setSelectedStaffId(result.data[0].id);
          } else {
            setMessage("No active staff members found.");
          }
        } else {
          console.error("API response format is incorrect:", result);
          setMessage("Error: Received invalid data for staff list.");
          setStaffList([]);
        }
      } catch (error) {
        console.error('Failed to fetch staff list:', error);
        setMessage('Error: A network or parsing error occurred.');
      } finally {
        setLoadingStaff(false);
      }
    };
    fetchStaff();
  }, []); // Runs once on component mount

  const handleLogSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId) {
      setMessage('Please select a staff member.');
      return;
    }
    setLoading(true);
    setMessage('');
    setResults(null);
    try {
        const response = await fetch('/api/incentives/dailysale', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                staffId: selectedStaffId,
                date,
                serviceSale: Number(serviceSale) || 0,
                productSale: Number(productSale) || 0,
                reviewsWithName: Number(reviewsWithName) || 0,
                reviewsWithPhoto: Number(reviewsWithPhoto) || 0,
            }),
        });
        const data = await response.json();
        setMessage(data.message || (response.ok ? 'Success!' : 'An error occurred.'));
    } catch (error) {
        setMessage('An error occurred while logging the sale.');
    } finally {
        setLoading(false);
    }
  };

  const handleCalculateIncentive = async () => {
    if (!selectedStaffId) {
       setMessage('Please select a staff member.');
       return;
    }
    setLoading(true);
    setMessage('');
    setResults(null);
    try {
        const response = await fetch(`/api/incentives/calculate/${selectedStaffId}?date=${date}`);
        const data = await response.json();
        if (response.ok) {
            setResults(data);
        } else {
            setMessage(data.message || 'Failed to calculate incentive.');
        }
    } catch (error) {
        setMessage('An error occurred during calculation.');
    } finally {
        setLoading(false);
    }
  };

  const renderResultCard = (title: string, data: any) => (
    <Card title={title} className="w-full">
        {Object.keys(data).length === 0 ? <p className="text-gray-500">No daily sale data found to calculate.</p> :
        <div className="space-y-2">
            <div className={`flex justify-between items-center p-2 rounded ${data.isTargetMet ? 'bg-green-100' : 'bg-red-100'}`}>
                <span>Target Met:</span>
                {data.isTargetMet ? <CheckCircle className="text-green-600"/> : <XCircle className="text-red-600"/>}
            </div>
            {Object.entries(data).map(([key, value]) => {
                if (key === 'isTargetMet') return null;
                const keyFormatted = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                return (
                    <div key={key} className="flex justify-between border-b pb-1">
                        <span className="text-gray-600">{keyFormatted}:</span>
                        <span className="font-semibold text-gray-900">
                            {typeof value === 'number' ? `₹${value.toFixed(2)}` : String(value)}
                        </span>
                    </div>
                );
            })}
        </div>}
    </Card>
  );

  return (
    <div className="space-y-6 p-4 md:p-6">
      <h1 className="text-2xl font-bold text-gray-900">Sales & Review Incentives</h1>
      
      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Staff Member</label>
          <select 
            value={selectedStaffId} 
            onChange={(e) => setSelectedStaffId(e.target.value)} 
            className="w-full p-2 border border-gray-300 rounded-md text-gray-900 bg-white"
            disabled={loadingStaff || staffList.length === 0}
          >
            {loadingStaff ? (
              <option>Loading...</option>
            ) : staffList.length === 0 ? (
              <option>No staff found</option>
            ) : (
              staffList.map((staff) => (
                <option key={staff.id} value={staff.id}>{staff.name}</option>
              ))
            )}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full p-2 border border-gray-300 rounded-md text-gray-900" />
        </div>
      </div>

      {/* Forms and Actions */}
      <div className="grid md:grid-cols-2 gap-8">
        <Card title="Log Daily Sales & Reviews" className="border-blue-200">
            <form onSubmit={handleLogSale} className="space-y-4">
                <input type="number" placeholder="Service Sale (₹)" value={serviceSale} onChange={e => setServiceSale(e.target.value)} className="w-full p-2 border rounded text-black"/>
                <input type="number" placeholder="Product Sale (₹)" value={productSale} onChange={e => setProductSale(e.target.value)} className="w-full p-2 border rounded text-black"/>
                <input type="number" placeholder="Reviews (Name Only)" value={reviewsWithName} onChange={e => setReviewsWithName(e.target.value)} className="w-full p-2 border rounded text-black"/>
                <input type="number" placeholder="Reviews (with Photo)" value={reviewsWithPhoto} onChange={e => setReviewsWithPhoto(e.target.value)} className="w-full p-2 border rounded text-black"/>
                <Button type="submit" disabled={loading} className="w-full bg-purple-600 hover:bg-purple-700">{loading ? 'Logging...' : 'Log Data'}</Button>
            </form>
        </Card>
        <Card title="Calculate Incentives" className="border-green-200">
            <div className="flex flex-col h-full justify-center">
                <p className="text-center text-gray-600 mb-4">Calculate incentives for the selected staff and date.</p>
                <Button onClick={handleCalculateIncentive} disabled={loading} variant="secondary" className="w-full bg-teal-500 hover:bg-teal-600">
                    {loading ? 'Calculating...' : 'Calculate Now'}
                </Button>
            </div>
        </Card>
      </div>

      {/* Results */}
      <div className="mt-8">
        {message && <div className="p-4 mb-4 text-sm text-center text-blue-700 bg-blue-100 rounded-lg">{message}</div>}
        {results && (
            <div className="space-y-6">
                <h2 className="text-xl font-semibold text-center">Results for {results.staffName} on {results.calculationDate}</h2>
                <div className="grid md:grid-cols-2 gap-8">
                    {renderResultCard("Incentive 1: Daily Target", results.incentive1_daily)}
                    {renderResultCard("Incentive 2: Monthly Target", results.incentive2_monthly)}
                </div>
            </div>
        )}
      </div>
    </div>
  );
}