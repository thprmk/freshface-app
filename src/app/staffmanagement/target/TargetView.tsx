'use client';

// FIX: Add all necessary imports
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// --- Your Type Definitions (Keep these as they are) ---
interface SummaryMetrics {
  service: number; retail: number; netSales: number; bills: number; abv: number; callbacks: number; appointmentsFromCallbacks: number;
}
interface HeadingToMetrics extends SummaryMetrics {
  serviceInPercentage: number; retailInPercentage: number; netSalesInPercentage: number; billsInPercentage: number; abvInPercentage: number; callbacksInPercentage: number; appointmentsInPercentage: number;
}
interface SummaryData {
  target: SummaryMetrics; achieved: SummaryMetrics; headingTo: HeadingToMetrics;
}
interface DailyRecord {
  date: string; day: string; netSalesAchieved: number; achievePercentage: number; bills: number; abvAchieved: number; callbacksDone: number; appointmentsFromCallbacks: number;
}
interface TargetPageData {
  summary: SummaryData; dailyRecords: DailyRecord[];
}
const formatCurrency = (value: number | undefined) => {
  if (value === undefined || value === null) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', minimumFractionDigits: 0
  }).format(value);
};

// Props interface
interface TargetViewProps {
  initialData: TargetPageData;
}

// This is the complete component.
export default function TargetView({ initialData }: TargetViewProps) {
    // Hooks and state must be inside the component
    const router = useRouter();
    const [pageData, setPageData] = useState<TargetPageData>(initialData);
    const [isMonthlyModalOpen, setIsMonthlyModalOpen] = useState(false);
    const [monthlyTargetForm, setMonthlyTargetForm] = useState<SummaryMetrics>(initialData.summary.target);

    // This hook ensures that if the parent page re-fetches data, our component updates
    useEffect(() => {
        setPageData(initialData);
        setMonthlyTargetForm(initialData.summary.target);
    }, [initialData]);

    // Helper function that uses state must be inside
    const handleMonthlyInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setMonthlyTargetForm((prev) => ({ ...prev, [name]: Number(value) }));
    };

    // The submit handler must be inside to access state, router, etc.
    const handleMonthlySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        try {
            const response = await fetch('/api/target', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(monthlyTargetForm),
            });

            if (!response.ok) {
                throw new Error('Failed to update targets on the server.');
            }

            setIsMonthlyModalOpen(false);
            
            // This re-fetches server data and updates the UI
            router.refresh(); 

        } catch (error) {
            console.error("Failed to save update to server:", error);
        }
    };

    // Destructure pageData for easier access in JSX. Handle potential null/undefined initialData.
    const summary = pageData?.summary || { target: {}, achieved: {}, headingTo: {} };
    const dailyRecords = pageData?.dailyRecords || [];

    // The return statement with all the JSX for your UI
    return (
        <div className="p-4 md:p-8 bg-gray-100 min-h-screen">
            {/* --- Monthly Target Modal --- */}
            {isMonthlyModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
                    <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-2xl">
                        <h3 className="text-2xl font-bold mb-6 text-gray-800">Set Monthly Targets</h3>
                        <form onSubmit={handleMonthlySubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                            <div><label className="block text-gray-700 text-sm font-bold mb-2">Service Target</label><input type="number" name="service" value={monthlyTargetForm.service} onChange={handleMonthlyInputChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" required /></div>
                            <div><label className="block text-gray-700 text-sm font-bold mb-2">Retail Target</label><input type="number" name="retail" value={monthlyTargetForm.retail} onChange={handleMonthlyInputChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" required /></div>
                            <div><label className="block text-gray-700 text-sm font-bold mb-2">Bills Target</label><input type="number" name="bills" value={monthlyTargetForm.bills} onChange={handleMonthlyInputChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" required /></div>
                            <div><label className="block text-gray-700 text-sm font-bold mb-2">ABV Target</label><input type="number" name="abv" value={monthlyTargetForm.abv} onChange={handleMonthlyInputChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" required /></div>
                            <div><label className="block text-gray-700 text-sm font-bold mb-2">Callbacks Target</label><input type="number" name="callbacks" value={monthlyTargetForm.callbacks} onChange={handleMonthlyInputChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" required /></div>
                            <div><label className="block text-gray-700 text-sm font-bold mb-2">Appointments Target</label><input type="number" name="appointmentsFromCallbacks" value={monthlyTargetForm.appointmentsFromCallbacks} onChange={handleMonthlyInputChange} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" required /></div>
                            <div className="md:col-span-2 flex items-center justify-end gap-4 mt-6">
                                <button type="button" onClick={() => setIsMonthlyModalOpen(false)} className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded">Cancel</button>
                                <button type="submit" className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">Update Monthly Targets</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            <h1 className="text-3xl font-bold mb-6 text-gray-800">Performance Tracker</h1>

            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold text-gray-700">Monthly Overview</h2>
                <button onClick={() => setIsMonthlyModalOpen(true)} className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded-lg shadow">Set Monthly Target</button>
            </div>
            
            {/* --- COMPLETE MONTHLY OVERVIEW TABLE --- */}
            <div className="overflow-x-auto bg-white rounded-lg shadow mb-8">
                <table className="min-w-full text-sm text-left text-gray-600">
                    <thead className="bg-gray-50 text-xs text-gray-700 uppercase">
                        <tr><th className="px-6 py-3">Metric</th><th className="px-6 py-3">Target</th><th className="px-6 py-3">Achieved</th><th className="px-6 py-3">Heading To</th><th className="px-6 py-3">In %</th></tr>
                    </thead>
                    <tbody>
                        <tr className="border-b"><td className="px-6 py-4 font-medium">SERVICE</td><td className="px-6 py-4">{formatCurrency(summary.target.service)}</td><td className="px-6 py-4">{formatCurrency(summary.achieved.service)}</td><td className="px-6 py-4">{formatCurrency(summary.headingTo.service)}</td><td className="px-6 py-4 font-bold">{summary.headingTo.serviceInPercentage || 0}%</td></tr>
                        <tr className="border-b"><td className="px-6 py-4 font-medium">RETAIL</td><td className="px-6 py-4">{formatCurrency(summary.target.retail)}</td><td className="px-6 py-4">{formatCurrency(summary.achieved.retail)}</td><td className="px-6 py-4">{formatCurrency(summary.headingTo.retail)}</td><td className="px-6 py-4 font-bold">{summary.headingTo.retailInPercentage || 0}%</td></tr>
                        <tr className="border-b"><td className="px-6 py-4 font-medium">NET SALES</td><td className="px-6 py-4">{formatCurrency(summary.target.netSales)}</td><td className="px-6 py-4">{formatCurrency(summary.achieved.netSales)}</td><td className="px-6 py-4">{formatCurrency(summary.headingTo.netSales)}</td><td className="px-6 py-4 font-bold">{summary.headingTo.netSalesInPercentage || 0}%</td></tr>
                        <tr className="border-b"><td className="px-6 py-4 font-medium">BILLS</td><td className="px-6 py-4">{summary.target.bills || 0}</td><td className="px-6 py-4">{summary.achieved.bills || 0}</td><td className="px-6 py-4">{summary.headingTo.bills || 0}</td><td className="px-6 py-4 font-bold">{summary.headingTo.billsInPercentage || 0}%</td></tr>
                        <tr className="border-b"><td className="px-6 py-4 font-medium">ABV</td><td className="px-6 py-4">{formatCurrency(summary.target.abv)}</td><td className="px-6 py-4">{formatCurrency(summary.achieved.abv)}</td><td className="px-6 py-4">{formatCurrency(summary.headingTo.abv)}</td><td className="px-6 py-4 font-bold">{summary.headingTo.abvInPercentage || 0}%</td></tr>
                        <tr className="border-b"><td className="px-6 py-4 font-medium">CALLBACKS</td><td className="px-6 py-4">{summary.target.callbacks || 0}</td><td className="px-6 py-4">{summary.achieved.callbacks || 0}</td><td className="px-6 py-4">{summary.headingTo.callbacks || 0}</td><td className="px-6 py-4 font-bold">{summary.headingTo.callbacksInPercentage || 0}%</td></tr>
                        <tr><td className="px-6 py-4 font-medium">APPOINTMENTS</td><td className="px-6 py-4">{summary.target.appointmentsFromCallbacks || 0}</td><td className="px-6 py-4">{summary.achieved.appointmentsFromCallbacks || 0}</td><td className="px-6 py-4">{summary.headingTo.appointmentsFromCallbacks || 0}</td><td className="px-6 py-4 font-bold">{summary.headingTo.appointmentsInPercentage || 0}%</td></tr>
                    </tbody>
                </table>
            </div>

            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Daily Breakdown</h2>
            
            {/* --- COMPLETE DAILY BREAKDOWN TABLE --- */}
            <div className="overflow-x-auto bg-white rounded-lg shadow">
                 <table className="min-w-full text-sm text-left text-gray-600">
                    <thead className="bg-gray-50 text-xs text-gray-700 uppercase">
                        <tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Day</th><th className="px-4 py-3">Net Sales Achieved</th><th className="px-4 py-3">Achieve %</th><th className="px-4 py-3">Bills</th><th className="px-4 py-3">ABV Achieved</th><th className="px-4 py-3">Callbacks</th><th className="px-4 py-3">Appointments</th></tr>
                    </thead>
                    <tbody>
                        {dailyRecords.map((record) => (
                            <tr key={record.date} className="border-b hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium">{record.date}</td>
                                <td className="px-4 py-3">{record.day}</td>
                                <td className="px-4 py-3">{formatCurrency(record.netSalesAchieved)}</td>
                                <td className="px-4 py-3 font-bold">{record.achievePercentage}%</td>
                                <td className="px-4 py-3">{record.bills}</td>
                                <td className="px-4 py-3">{formatCurrency(record.abvAchieved)}</td>
                                <td className="px-4 py-3">{record.callbacksDone}</td>
                                <td className="px-4 py-3">{record.appointmentsFromCallbacks}</td>
                            </tr>
                        ))}
                         {/* If no daily records, show a message */}
                         {dailyRecords.length === 0 && (
                            <tr>
                                <td colSpan={8} className="text-center py-4 text-gray-500">No daily records to display.</td>
                            </tr>
                         )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}