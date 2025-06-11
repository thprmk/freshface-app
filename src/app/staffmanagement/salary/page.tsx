'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  IndianRupee, Calendar, Search, Download,
  CreditCard, CheckCircle, X, Clock
} from 'lucide-react';
import { useStaff } from '../../../context/StaffContext';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import { format, parseISO } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- Type Definitions ---
interface StaffMember {
  id: string;
  name: string;
  image: string | null;
  position: string;
  status: 'active' | 'inactive';
  salary: number;
  otRatePerHour?: number;
}

interface SalaryRecordType {
  id: string;
  staffId: string;
  month: string;
  year: number;
  baseSalary: number;
  otHours: number;
  otAmount: number;
  extraDays: number;
  extraDayPay: number;
  foodDeduction: number;
  recurExpense: number;
  totalEarnings: number;
  totalDeductions: number;
  advanceDeducted: number;
  netSalary: number;
  isPaid: boolean;
  paidDate: string | null;
  staffDetails?: { id: string; name: string; image?: string | null; position: string; } | null;
}

interface SalaryInputs {
  otHours: string;
  extraDays: string;
  foodDeduction: string;
  recurExpense: string;
}
// --- End Type Definitions ---

const Salary: React.FC = () => {
  const {
    staffMembers,
    salaryRecords,
    processSalary,
    markSalaryAsPaid,
    advancePayments,
    fetchSalaryRecords,
    loadingSalary
  } = useStaff();

  const [searchTerm, setSearchTerm] = useState('');
  const [currentMonthIndex, setCurrentMonthIndex] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [buttonLoadingStates, setButtonLoadingStates] = useState<Record<string, { processing?: boolean; paying?: boolean }>>({});
  const [isExporting, setIsExporting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [processingStaff, setProcessingStaff] = useState<StaffMember | null>(null);
  const [salaryInputs, setSalaryInputs] = useState<SalaryInputs>({ otHours: '0', extraDays: '0', foodDeduction: '0', recurExpense: '0' });
  const [isFetchingOt, setIsFetchingOt] = useState(false);

  const months = useMemo(() => ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'], []);
  const years = useMemo(() => {
    const startYear = new Date().getFullYear() - 5;
    return Array.from({ length: 10 }, (_, i) => startYear + i);
  }, []);

  const stableFetchSalaryRecords = useCallback((filter: any) => {
    if (fetchSalaryRecords) fetchSalaryRecords(filter);
    else console.error("Salary/page.tsx: fetchSalaryRecords from context is undefined!");
  }, [fetchSalaryRecords]);

  useEffect(() => {
    stableFetchSalaryRecords({ month: months[currentMonthIndex], year: currentYear, populateStaff: 'true' });
  }, [currentMonthIndex, currentYear, stableFetchSalaryRecords, months]);
  
  const staffWithDefaults = useMemo(() => staffMembers.map(s => ({...s, otRatePerHour: (s as any).otRatePerHour || 50})), [staffMembers]);
  const filteredStaff = staffWithDefaults.filter(staff => staff.name.toLowerCase().includes(searchTerm.toLowerCase()) && staff.status === 'active');

  const openProcessingModal = async (staff: StaffMember) => {
    setProcessingStaff(staff);
    setIsModalOpen(true);
    setIsFetchingOt(true);

    try {
      const response = await fetch(
        `/api/attendance?action=getOvertimeTotal&staffId=${staff.id}&year=${currentYear}&month=${months[currentMonthIndex]}`
      );
      const result = await response.json();

      let otHours = '0';
      if (result.success && result.data.totalOtHours > 0) {
        otHours = result.data.totalOtHours.toFixed(2);
      }
      
      setSalaryInputs({ 
          otHours: otHours, 
          extraDays: '0', 
          foodDeduction: '2500', 
          recurExpense: '0' 
      });

    } catch (error) {
      console.error("Failed to fetch overtime hours:", error);
      alert("Could not fetch overtime hours. Please enter them manually.");
      setSalaryInputs({ otHours: '0', extraDays: '0', foodDeduction: '2500', recurExpense: '0' });
    } finally {
      setIsFetchingOt(false);
    }
  };
  
  const handleProcessSalary = async () => {
    if (!processingStaff) return;
    setButtonLoadingStates(prev => ({ ...prev, [processingStaff.id]: { processing: true } }));
    setIsModalOpen(false);

    const advanceToDeduct = advancePayments
      ?.filter(adv => (typeof adv.staffId === 'string' ? adv.staffId : (adv.staffId as any)?.id) === processingStaff.id && adv.status === 'approved')
      .reduce((total, adv) => total + (Number(adv.amount) || 0), 0) || 0;

    const inputs = {
      otHours: parseFloat(salaryInputs.otHours) || 0,
      extraDays: parseFloat(salaryInputs.extraDays) || 0,
      foodDeduction: parseFloat(salaryInputs.foodDeduction) || 0,
      recurExpense: parseFloat(salaryInputs.recurExpense) || 0,
    };
    
    const baseSalary = Number(processingStaff.salary) || 0;
    const otRate = Number(processingStaff.otRatePerHour);
    const perDiem = baseSalary / 30;
    const otAmount = inputs.otHours * otRate;
    const extraDayPay = inputs.extraDays * perDiem;
    const totalEarnings = baseSalary + otAmount + extraDayPay;
    const totalDeductions = inputs.foodDeduction + inputs.recurExpense + advanceToDeduct;
    const netSalary = totalEarnings - totalDeductions;

    const payload = {
        staffId: processingStaff.id, month: months[currentMonthIndex], year: currentYear,
        baseSalary, otHours: inputs.otHours, otAmount, extraDays: inputs.extraDays, extraDayPay,
        foodDeduction: inputs.foodDeduction, recurExpense: inputs.recurExpense,
        totalEarnings, totalDeductions, advanceDeducted: advanceToDeduct, netSalary,
        isPaid: false, paidDate: null
    };

    try {
      await processSalary(payload as any); 
    } catch (error: any) {
      console.error("Failed to process salary (page level):", error);
      alert(`Error processing salary: ${error.message || 'Unknown error'}`);
    } finally {
      setButtonLoadingStates(prev => ({ ...prev, [processingStaff.id]: { processing: false } }));
      setProcessingStaff(null);
    }
  };

  const handlePayNow = async (record: SalaryRecordType) => {
    if (!record) return;
    setButtonLoadingStates(prev => ({ ...prev, [record.staffId]: { ...prev[record.staffId], paying: true } }));
    try {
      await markSalaryAsPaid(record, format(new Date(), 'yyyy-MM-dd'));
    } catch (error: any) {
      console.error("Failed to mark salary as paid:", error);
      alert(`Error: ${error.message}`);
    } finally {
      setButtonLoadingStates(prev => ({ ...prev, [record.staffId]: { paying: false } }));
    }
  };
  
  const getSalaryRecord = useCallback((staffId: string): SalaryRecordType | undefined => {
    return (salaryRecords as SalaryRecordType[]).find(r => r.staffId === staffId && r.month === months[currentMonthIndex] && r.year === currentYear);
  }, [salaryRecords, months, currentMonthIndex, currentYear]);

  const currentMonthSalaryRecords = useMemo(() => (salaryRecords as SalaryRecordType[]).filter(r => r.month === months[currentMonthIndex] && r.year === currentYear), [salaryRecords, months, currentMonthIndex, currentYear]);
  const totalSalaryExpense = useMemo(() => currentMonthSalaryRecords.reduce((total, r) => total + (r.netSalary ?? 0), 0), [currentMonthSalaryRecords]);
  const processedSalariesCount = currentMonthSalaryRecords.length;
  const pendingPaymentsCount = currentMonthSalaryRecords.filter(r => !r.isPaid).length;
  const paidSalaryRecords = useMemo(() => (salaryRecords as SalaryRecordType[]).filter(r => r.isPaid), [salaryRecords]);

  const handleExportPDF = () => {
    setIsExporting(true);
    try {
        const doc = new jsPDF();
        const pageW = doc.internal.pageSize.getWidth();
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('Salary Report', pageW / 2, 15, { align: 'center' });
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(`Month: ${months[currentMonthIndex]} ${currentYear}`, pageW / 2, 22, { align: 'center' });
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.text(`Exported on: ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`, 14, 30);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0);
        doc.text(`Summary for ${months[currentMonthIndex]} ${currentYear}:`, 14, 40);
        doc.setFont('helvetica', 'normal');
        doc.text(`- Total Salary Expense (Processed): Rs. ${totalSalaryExpense.toLocaleString(undefined, {maximumFractionDigits: 2})}`, 14, 47);
        doc.text(`- Processed Salaries: ${processedSalariesCount} / ${filteredStaff.length}`, 14, 52);
        doc.text(`- Pending Payments: ${pendingPaymentsCount}`, 14, 57);
        const tableColumn = ["#", "Staff Name", "Position", "Base (Rs.)", "Earnings (OT/Extra)", "Deductions", "Advance", "Net (Rs.)", "Status", "Paid Date"];
        const tableRows: (string | number)[][] = [];
        let index = 1;
        filteredStaff.forEach((staff) => {
            const record = getSalaryRecord(staff.id);
            if (record) {
                const totalEarnings = (record.otAmount ?? 0) + (record.extraDayPay ?? 0);
                const totalDeductions = (record.foodDeduction ?? 0) + (record.recurExpense ?? 0);
                tableRows.push([
                    index++, staff.name, staff.position, record.baseSalary.toLocaleString(),
                    totalEarnings.toLocaleString(), totalDeductions.toLocaleString(), record.advanceDeducted.toLocaleString(),
                    record.netSalary.toLocaleString(), record.isPaid ? 'Paid' : 'Pending',
                    record.isPaid && record.paidDate ? format(parseISO(record.paidDate), 'dd/MM/yy') : '-'
                ]);
            }
        });
        autoTable(doc, { 
            head: [tableColumn], body: tableRows, startY: 65, theme: 'grid',
            headStyles: { fillColor: [29, 112, 184], textColor: [255, 255, 255], fontStyle: 'bold' },
            styles: { fontSize: 9 },
            columnStyles: { 0: { cellWidth: 8 } }
        });
        doc.save(`Salary_Report_${months[currentMonthIndex]}_${currentYear}.pdf`);
    } finally {
        setIsExporting(false);
    }
  };
  
  return (
    <>
      {isModalOpen && processingStaff && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-40 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg z-50">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold">Process Salary: {processingStaff.name}</h3>
                  <Button variant="ghost" className="p-1 h-8 w-8" onClick={() => setIsModalOpen(false)}><X size={20}/></Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <h4 className="col-span-full font-semibold text-gray-800 border-b pb-1">Earnings</h4>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700">OT Hours</label>
                        <div className="relative">
                            <input 
                                type="number" 
                                value={salaryInputs.otHours} 
                                onChange={e => setSalaryInputs({...salaryInputs, otHours: e.target.value})}
                                disabled={isFetchingOt}
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                            />
                            {isFetchingOt && <span className="absolute right-2 top-3 text-xs text-gray-500">Fetching...</span>}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Auto-calculated from attendance.</p>
                    </div>
                    
                    <div><label className="block text-sm font-medium text-gray-700">Extra Days</label><input type="number" value={salaryInputs.extraDays} onChange={e => setSalaryInputs({...salaryInputs, extraDays: e.target.value})} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"/></div>
                    
                    <h4 className="col-span-full font-semibold text-gray-800 border-b pb-1 mt-4">Deductions</h4>
                    <div><label className="block text-sm font-medium text-gray-700">Food Money (₹)</label><input type="number" value={salaryInputs.foodDeduction} onChange={e => setSalaryInputs({...salaryInputs, foodDeduction: e.target.value})} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"/></div>
                    <div><label className="block text-sm font-medium text-gray-700">Recurring Expense (₹)</label><input type="number" value={salaryInputs.recurExpense} onChange={e => setSalaryInputs({...salaryInputs, recurExpense: e.target.value})} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"/></div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                  <Button onClick={handleProcessSalary} disabled={isFetchingOt} className="bg-purple-600 hover:bg-purple-700 text-white">
                    {isFetchingOt ? 'Loading...' : 'Confirm & Process'}
                  </Button>
                </div>
            </div>
        </div>
      )}

      <div className="space-y-6 p-4 md:p-8 bg-gray-50 min-h-screen">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <h1 className="text-3xl font-bold text-gray-800">Salary Management</h1>
            <div className="flex items-center space-x-3 mt-4 md:mt-0">
                <div className="flex items-center space-x-2 p-2 border border-gray-300 rounded-lg bg-white shadow-sm">
                    <Calendar size={16} className="text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">{months[currentMonthIndex]} {currentYear}</span>
                </div>
                <Button 
                    icon={<Download size={16}/>} 
                    onClick={handleExportPDF} 
                    disabled={isExporting || loadingSalary || !filteredStaff.length}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-semibold shadow-sm"
                >
                    {isExporting ? 'Exporting...' : 'Export PDF'}
                </Button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-5">
                <div className="inline-block px-3 py-2 bg-purple-100 rounded-2xl mb-3"><IndianRupee className="h-6 w-6 text-purple-600"/></div>
                <p className="text-sm text-gray-500">Total Salary Expense</p>
                <p className="text-2xl font-bold text-gray-800">₹{totalSalaryExpense.toLocaleString(undefined, {maximumFractionDigits: 1})}</p>
            </Card>
            <Card className="p-5">
                <div className="inline-block px-3 py-2 bg-teal-100 rounded-2xl mb-3"><CheckCircle className="h-6 w-6 text-teal-600"/></div>
                <p className="text-sm text-gray-500">Processed Salaries</p>
                <p className="text-2xl font-bold text-gray-800">{processedSalariesCount} / {filteredStaff.length}</p>
            </Card>
            <Card className="p-5">
                <div className="inline-block px-3 py-2 bg-amber-100 rounded-2xl mb-3"><CreditCard className="h-6 w-6 text-amber-600"/></div>
                <p className="text-sm text-gray-500">Pending Payments</p>
                <p className="text-2xl font-bold text-gray-800">{pendingPaymentsCount}</p>
            </Card>
        </div>

        <Card className="overflow-hidden">
            <div className="p-4 flex flex-col md:flex-row justify-between items-center gap-4 bg-white border-b border-gray-200">
                <div className="relative w-full md:w-auto">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input type="text" placeholder="Search staff..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} 
                        className="pl-10 pr-4 py-2 w-full md:w-80 border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-1 focus:ring-purple-500" />
                </div>
                <div className="flex items-center gap-2">
                    <select value={currentMonthIndex} onChange={e => setCurrentMonthIndex(Number(e.target.value))} className="px-4 py-2 border-2 border-purple-400 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-purple-500">
                        {months.map((month, index) => <option key={month} value={index}>{month}</option>)}
                    </select>
                    <select value={currentYear} onChange={e => setCurrentYear(Number(e.target.value))} className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-purple-500">
                        {years.map(year => <option key={year} value={year}>{year}</option>)}
                    </select>
                </div>
            </div>
            
            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead className="bg-white">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Staff</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Base (₹)</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">OT Amt (₹)</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Extra Day (₹)</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Food Ded (₹)</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Recur Ded (₹)</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Adv Ded (₹)</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Net Payout (₹)</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                            <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                        {loadingSalary ? (<tr><td colSpan={10} className="text-center py-10 text-gray-500">Loading...</td></tr>) :
                        filteredStaff.map((staff) => {
                            const record = getSalaryRecord(staff.id);
                            const isLoading = buttonLoadingStates[staff.id]?.processing || buttonLoadingStates[staff.id]?.paying;
                            return (
                            <tr key={staff.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap"><div className="flex items-center"><img className="h-10 w-10 rounded-full object-cover" src={staff.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(staff.name)}&background=random`} alt={staff.name}/><div className="ml-4"><div className="text-sm font-medium text-gray-900">{staff.name}</div><div className="text-sm text-gray-500">{staff.position}</div></div></div></td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">₹{staff.salary.toLocaleString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">{record ? `+₹${(record.otAmount ?? 0).toLocaleString()}` : '—'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">{record ? `+₹${(record.extraDayPay ?? 0).toLocaleString(undefined, { maximumFractionDigits: 1 })}` : '—'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">{record ? `-₹${(record.foodDeduction ?? 0).toLocaleString()}` : '—'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">{record ? `-₹${(record.recurExpense ?? 0).toLocaleString()}` : '—'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">{record ? `-₹${(record.advanceDeducted ?? 0).toLocaleString()}` : '—'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">{record ? `₹${(record.netSalary ?? 0).toLocaleString()}` : '—'}</td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    {record ? ( record.isPaid ? 
                                        <span className="flex items-center gap-1.5 px-3 py-1 text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800"><CheckCircle size={14} className="text-green-700"/> Paid on {format(parseISO(record.paidDate!), 'dd/MM/yy')}</span> :
                                        <span className="flex items-center gap-1.5 px-3 py-1 text-xs leading-5 font-semibold rounded-full bg-amber-100 text-amber-900"><Clock size={14} className="text-amber-700"/> Pending</span>
                                    ) : (<span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">Not Processed</span>)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                {record ? (record.isPaid ? 
                                    <Button size="sm" className="bg-green-600 text-white cursor-not-allowed" disabled icon={<CheckCircle size={14}/>}>Paid</Button> : 
                                    <Button size="sm" onClick={() => handlePayNow(record)} disabled={isLoading} className="bg-purple-600 text-white hover:bg-purple-700">{isLoading ? 'Paying...':'Pay Now'}</Button>
                                ) : (<Button size="sm" onClick={() => openProcessingModal(staff)} disabled={isLoading} className="bg-purple-600 text-white hover:bg-purple-700">{isLoading ? 'Processing...':'Process Salary'}</Button>)}
                                </td>
                            </tr>
                            );
                        })}
                        {!loadingSalary && !filteredStaff.length && (<tr><td colSpan={10} className="text-center py-10 text-gray-500">No staff members found.</td></tr>)}
                    </tbody>
                </table>
            </div>
        </Card>
      
        <h2 className="text-xl font-bold text-gray-700 pt-4">Recent Payment History</h2>
        <Card className="overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead className="bg-white">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Staff</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Month</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Net Amount (₹)</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Payment Date</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                    {paidSalaryRecords.length > 0 ? (
                        paidSalaryRecords.map((record) => {
                        const staff = record.staffDetails ? 
                            { name: record.staffDetails.name, image: record.staffDetails.image } : 
                            staffMembers.find(s => s.id === record.staffId);
                        
                        return (
                            <tr key={`paid-${record.id}`} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                                {staff && (
                                <div className="flex items-center">
                                    <img className="h-10 w-10 rounded-full object-cover" src={staff.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(staff.name)}&background=random`} alt={staff.name}/>
                                    <div className="ml-4"><div className="text-sm font-medium text-gray-900">{staff.name}</div></div>
                                </div>
                                )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{record.month} {record.year}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800 font-bold">₹{record.netSalary.toLocaleString()}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                {record.paidDate ? format(parseISO(record.paidDate), 'MMM d, yyyy') : 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <span className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                <CheckCircle size={14} /> Paid
                                </span>
                            </td>
                            </tr>
                        )
                        })
                    ) : (
                        <tr><td colSpan={5} className="text-center py-10 text-gray-500">No paid salaries for this period yet.</td></tr>
                    )}
                    </tbody>
                </table>
            </div>
        </Card>
      </div>
    </>
  );
};

export default Salary;