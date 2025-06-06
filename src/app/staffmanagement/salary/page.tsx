'use client';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  IndianRupee, Calendar, Search, Download,
  CreditCard, CheckCircle, Info
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
}

interface SalaryRecordType {
  id:string;
  staffId: string;
  month: string;
  year: number;
  baseSalary: number;
  bonus: number;
  deductions: number;
  advanceDeducted: number;
  netSalary: number;
  isPaid: boolean;
  paidDate: string | null;
  staffDetails?: {
    id: string;
    name: string;
    image?: string | null;
    position: string;
  } | null;
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

  const months = useMemo(() => [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ], []);

  const stableFetchSalaryRecords = useCallback((filter: any) => {
    if (fetchSalaryRecords) {
        fetchSalaryRecords(filter);
    } else {
        console.error("Salary/page.tsx: fetchSalaryRecords from context is undefined!");
    }
  }, [fetchSalaryRecords]);

  useEffect(() => {
    stableFetchSalaryRecords({
      month: months[currentMonthIndex],
      year: currentYear,
      populateStaff: 'true'
    });
  }, [currentMonthIndex, currentYear, stableFetchSalaryRecords, months]);

  const filteredStaff = staffMembers.filter((staff: StaffMember) =>
    staff.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    staff.status === 'active'
  );

  const handleProcessSalary = async (staffId: string) => {
    setButtonLoadingStates(prev => ({ ...prev, [staffId]: { processing: true, paying: false } }));
    const staff = staffMembers.find(s => s.id === staffId);
    if (!staff) {
      setButtonLoadingStates(prev => ({ ...prev, [staffId]: { processing: false, paying: false } }));
      alert("Error: Staff member not found.");
      return;
    }
    let advanceToDeduct = 0;
    if (advancePayments && advancePayments.length > 0) {
      const approvedAdvancesForStaff = advancePayments.filter(adv => {
          const advStaffId = typeof adv.staffId === 'string' ? adv.staffId : (adv.staffId as any)?.id;
          const repaymentPlan = (adv as any).repaymentPlan || 'One-time deduction';
          return advStaffId === staffId && adv.status === 'approved' && repaymentPlan === 'One-time deduction';
      });
      advanceToDeduct = approvedAdvancesForStaff.reduce((total, currentAdvance) => {
          return total + (Number(currentAdvance.amount) || 0);
      }, 0);
    }
    const bonus = (Number(staff.salary) || 0) * 0.1;
    const generalDeductions = (Number(staff.salary) || 0) * 0.05;
    const netSalary = (Number(staff.salary) || 0) + bonus - (generalDeductions + advanceToDeduct);
    const payload = { staffId, month: months[currentMonthIndex], year: currentYear, baseSalary: (Number(staff.salary) || 0), bonus, deductions: generalDeductions, advanceDeducted: advanceToDeduct, netSalary, isPaid: false, paidDate: null };
    try {
      await processSalary(payload);
    } catch (error: any) {
      console.error("Failed to process salary (page level):", error);
      alert(`Error processing salary: ${error.message || 'Unknown error'}`);
    } finally {
      setButtonLoadingStates(prev => ({ ...prev, [staffId]: { processing: false, paying: false } }));
    }
  };

  const handlePayNow = async (recordId: string, staffId: string) => {
    setButtonLoadingStates(prev => ({ ...prev, [staffId]: { ...prev[staffId], paying: true } }));
    try {
      const paidDate = format(new Date(), 'yyyy-MM-dd');
      await markSalaryAsPaid(recordId, paidDate);
    } catch (error: any) {
      console.error("Failed to mark salary as paid (page level):", error);
      alert(`Error marking salary as paid: ${error.message || 'Unknown error'}`);
    } finally {
      setButtonLoadingStates(prev => ({ ...prev, [staffId]: { ...prev[staffId], paying: false } }));
    }
  };

  const getSalaryRecord = useCallback((staffMemberId: string): SalaryRecordType | undefined => {
    return salaryRecords.find( (r: SalaryRecordType) => r.staffId === staffMemberId && r.month === months[currentMonthIndex] && r.year === currentYear );
  }, [salaryRecords, months, currentMonthIndex, currentYear]);

  const currentMonthSalaryRecords = useMemo(() => salaryRecords.filter( (record: SalaryRecordType) => record.month === months[currentMonthIndex] && record.year === currentYear ), [salaryRecords, months, currentMonthIndex, currentYear]);
  const totalSalaryExpense = useMemo(() => currentMonthSalaryRecords.reduce( (total: number, record: SalaryRecordType) => total + (Number(record.netSalary) || 0), 0 ), [currentMonthSalaryRecords]);
  const processedSalariesCount = useMemo(() => currentMonthSalaryRecords.length, [currentMonthSalaryRecords]);
  const pendingPaymentsCount = useMemo(() => currentMonthSalaryRecords.filter( (record: SalaryRecordType) => !record.isPaid ).length, [currentMonthSalaryRecords]);

  const handleExportPDF = () => {
    setIsExporting(true);
    try {
        const doc = new jsPDF();
        const reportMonthYear = `${months[currentMonthIndex]} ${currentYear}`;
        const fileName = `Salary_Report_${months[currentMonthIndex]}_${currentYear}.pdf`;

        doc.setFontSize(18);
        doc.text(`Salary Report`, 105, 20, { align: 'center' });
        doc.setFontSize(12);
        doc.text(`Month: ${reportMonthYear}`, 105, 28, { align: 'center' });
        doc.setFontSize(10);
        doc.text(`Exported on: ${format(new Date(), 'dd MMM yyyy, hh:mm a')}`, 14, 35);

        let summaryY = 45;
        doc.setFontSize(11);
        doc.text(`Summary for ${reportMonthYear}:`, 14, summaryY);
        summaryY += 7;
        doc.setFontSize(10);
        doc.text(`- Total Salary Expense (Processed): Rs. ${(Number(totalSalaryExpense) || 0).toLocaleString()}`, 18, summaryY); summaryY += 5;
        doc.text(`- Processed Salaries: ${processedSalariesCount} / ${filteredStaff.length}`, 18, summaryY); summaryY += 5;
        doc.text(`- Pending Payments: ${pendingPaymentsCount}`, 18, summaryY); summaryY += 10;

        const tableColumn = ["#", "Staff Name", "Position", "Base (Rs.)", "Bonus (Rs.)", "Deductions (Rs.)", "Advance Ded. (Rs.)", "Net (Rs.)", "Status", "Paid Date"];
        const tableRows: (string | number)[][] = [];

        filteredStaff.forEach((staff, index) => {
            const salaryRecord = getSalaryRecord(staff.id);
            const baseSalaryNum = Number(staff.salary) || 0;
            const bonusNum = salaryRecord ? (Number(salaryRecord.bonus) || 0) : 0;
            const generalDeductionsNum = salaryRecord ? (Number(salaryRecord.deductions) || 0) : 0;
            const advanceDeductedNum = salaryRecord ? (Number(salaryRecord.advanceDeducted) || 0) : 0;
            const netSalaryNum = salaryRecord ? (Number(salaryRecord.netSalary) || 0) : 0;
            let paidDateFormatted = '-';
            if (salaryRecord && salaryRecord.isPaid && salaryRecord.paidDate) {
                try {
                    paidDateFormatted = format(parseISO(salaryRecord.paidDate), 'dd/MM/yy');
                } catch (dateError) {
                    paidDateFormatted = 'Error';
                }
            }

            const staffData = [
                index + 1,
                staff.name || "N/A",
                staff.position || "N/A",
                baseSalaryNum.toLocaleString(),
                salaryRecord && bonusNum !== 0 ? bonusNum.toLocaleString() : (salaryRecord ? '0' : '-'),
                salaryRecord && generalDeductionsNum !== 0 ? generalDeductionsNum.toLocaleString() : (salaryRecord ? '0' : '-'),
                salaryRecord && advanceDeductedNum !== 0 ? advanceDeductedNum.toLocaleString() : (salaryRecord ? '0' : '-'),
                salaryRecord ? netSalaryNum.toLocaleString() : '-',
                salaryRecord ? (salaryRecord.isPaid ? 'Paid' : 'Pending') : 'Not Processed',
                paidDateFormatted
            ];
            tableRows.push(staffData);
        });
        
        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: summaryY,
            theme: 'grid',
            headStyles: {
                fillColor: [41, 128, 185],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
            },
            styles: {
                fontSize: 8,
                cellPadding: 2,
            },
            columnStyles: {
                0: { cellWidth: 10 },
                1: { cellWidth: 35 },
                2: { cellWidth: 30 },
            },
        });

        const totalPagesValue = (doc.internal as any).getNumberOfPages ?
                           (doc.internal as any).getNumberOfPages() :
                           (((doc.internal as any).pages?.length || 1) -1 || 1) ;

        for (let i = 1; i <= totalPagesValue; i++) {
            doc.setPage(i);
            doc.setFontSize(9);
            doc.setTextColor(100);
            const pageWidth = doc.internal.pageSize.getWidth();
            const footerText = `Page ${i} of ${totalPagesValue}`;
            doc.text(footerText, pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
        }
        doc.save(fileName);
    } catch (error) {
        console.error("Error during PDF generation:", error);
        alert("An error occurred while generating the PDF. Please check console for details.");
    } finally {
        setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header & Date Picker Button */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Salary Management</h1>
        <div className="flex items-center space-x-2 mt-4 md:mt-0">
          <Button variant="outline" icon={<Calendar size={16} />} className="mr-2">
            {months[currentMonthIndex]} {currentYear}
          </Button>
          <Button
            icon={<Download size={16} />}
            onClick={handleExportPDF}
            disabled={isExporting || loadingSalary || filteredStaff.length === 0 || currentMonthSalaryRecords.length === 0}
          >
            {isExporting ? 'Exporting...' : 'Export PDF'}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="md:col-span-1"><div className="flex items-center p-4">
            <div className="p-3 rounded-full bg-purple-100 mr-4"><IndianRupee className="h-6 w-6 text-purple-600" /></div>
            <div>
              <p className="text-sm text-gray-500">Total Salary Expense</p>
              <p className="text-2xl font-bold text-gray-900">₹{totalSalaryExpense.toLocaleString()}</p>
            </div>
        </div></Card>
        <Card className="md:col-span-1"><div className="flex items-center p-4">
            <div className="p-3 rounded-full bg-teal-100 mr-4"><CheckCircle className="h-6 w-6 text-teal-600" /></div>
            <div>
              <p className="text-sm text-gray-500">Processed Salaries</p>
              <p className="text-2xl font-bold text-gray-900">{processedSalariesCount} / {filteredStaff.length}</p>
            </div>
        </div></Card>
        <Card className="md:col-span-1"><div className="flex items-center p-4">
            <div className="p-3 rounded-full bg-amber-100 mr-4"><CreditCard className="h-6 w-6 text-amber-600" /></div>
            <div>
              <p className="text-sm text-gray-500">Pending Payments</p>
              <p className="text-2xl font-bold text-gray-900">{pendingPaymentsCount}</p>
            </div>
        </div></Card>
      </div>

      {/* Filters: Search, Month, Year */}
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

      {/* Main Salary Table Card */}
      <Card className="overflow-hidden">
        {loadingSalary && <div className="p-4 text-center text-gray-500">Loading salary data... Please wait.</div>}
        {!loadingSalary && salaryRecords.length === 0 && currentMonthSalaryRecords.length === 0 && (
             <div className="p-6 text-center text-gray-500">
                No salary records found for {months[currentMonthIndex]} {currentYear}.
                <br/> You can start by processing salaries for staff members if applicable.
             </div>
        )}
        {!loadingSalary && (currentMonthSalaryRecords.length > 0 || (filteredStaff.length > 0 && currentMonthSalaryRecords.length === 0) ) && (
          <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Base (₹)</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bonus (₹)</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deductions (₹)</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Advance Ded. (₹)</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net (₹)</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStaff.map((staff: StaffMember) => {
                const salaryRecord = getSalaryRecord(staff.id);
                const generalDeductionsOnly = salaryRecord ? (Number(salaryRecord.deductions) || 0) : 0;
                const advanceDeductedOnly = salaryRecord ? (Number(salaryRecord.advanceDeducted) || 0) : 0;
                const isLoadingProcess = buttonLoadingStates[staff.id]?.processing;
                const isLoadingPay = buttonLoadingStates[staff.id]?.paying;

                return (
                  <tr key={staff.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap"><div className="flex items-center">
                        <img className="h-10 w-10 rounded-full object-cover" src={staff.image  || `https://ui-avatars.com/api/?name=${encodeURIComponent(staff.name)}&background=random`} alt={staff.name} />
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{staff.name}</div>
                          <div className="text-sm text-gray-500">{staff.position}</div>
                        </div>
                    </div></td>
                    <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-gray-900">₹{(Number(staff.salary) || 0).toLocaleString()}</div></td>
                    <td className="px-6 py-4 whitespace-nowrap">{salaryRecord ? (<div className="text-sm font-medium text-green-600">+₹{(Number(salaryRecord.bonus) || 0).toLocaleString()}</div>) : (<span className="text-sm text-gray-500">—</span>)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{salaryRecord ? (<div className="text-sm font-medium text-red-600">-₹{generalDeductionsOnly.toLocaleString()}</div>) : (<span className="text-sm text-gray-500">—</span>)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{salaryRecord ? (<div className="text-sm font-medium text-red-600">-₹{advanceDeductedOnly.toLocaleString()}</div>) : (<span className="text-sm text-gray-500">—</span>)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{salaryRecord ? (<div className="text-sm font-bold text-gray-900">₹{(Number(salaryRecord.netSalary) || 0).toLocaleString()}</div>) : (<span className="text-sm text-gray-500">—</span>)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{salaryRecord ? (
                        <span className={`px-2 py-1 inline-flex items-center text-xs leading-5 font-semibold rounded-full ${
                            salaryRecord.isPaid ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {salaryRecord.isPaid ? <CheckCircle size={14} className="mr-1" /> : <Info size={14} className="mr-1" />}
                          {salaryRecord.isPaid && salaryRecord.paidDate ? format(parseISO(salaryRecord.paidDate), 'dd/MM/yy') : 'Pending'}
                        </span>
                      ) : (<span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">Not Processed</span>)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      {salaryRecord ? (
                        salaryRecord.isPaid ? (
                          <Button size="sm" variant="success" disabled icon={<CheckCircle size={14}/>}> Paid </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handlePayNow(salaryRecord.id, staff.id)}
                            icon={<CreditCard size={14}/>}
                            disabled={isLoadingPay || isLoadingProcess}
                          > {isLoadingPay ? 'Paying...' : 'Pay Now'} </Button>
                        )
                      ) : (
                        <Button
                            size="sm"
                            onClick={() => handleProcessSalary(staff.id)}
                            disabled={isLoadingProcess}
                        > {isLoadingProcess ? 'Processing...' : 'Process Salary'} </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredStaff.length === 0 && !loadingSalary && (currentMonthSalaryRecords.length === 0) && (<tr><td colSpan={8} className="px-6 py-10 text-center text-gray-500">
                  {searchTerm ? 'No staff members match your search criteria.' : 'No active staff members found.'}
              </td></tr>)}
            </tbody>
          </table>
        </div>)}
      </Card>

      <Card title="Recent Payment History (Last 5 Paid)" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Staff</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Net Amount (₹)</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {salaryRecords
                .filter((record: SalaryRecordType) => record.isPaid && record.paidDate)
                .sort((a: SalaryRecordType, b: SalaryRecordType) => {
                    if (!a.paidDate || !b.paidDate) return 0;
                    try {
                        return parseISO(b.paidDate).getTime() - parseISO(a.paidDate).getTime();
                    } catch (e) {
                        return 0;
                    }
                })
                .slice(0, 5)
                .map((record: SalaryRecordType) => {
                  const staffInfo = record.staffDetails || staffMembers.find(s => s.id === record.staffId);
                  const staffName = staffInfo ? staffInfo.name : 'Unknown Staff';
                  const staffImage = staffInfo ? staffInfo.image : null;

                  return (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap"><div className="flex items-center">
                            <img className="h-8 w-8 rounded-full object-cover" src={staffImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(staffName)}&background=random`} alt={staffName} />
                            <div className="ml-3"><div className="text-sm font-medium text-gray-900">{staffName}</div></div>
                      </div></td>
                      <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-900">{record.month} {record.year}</div></td>
                      <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm font-medium text-gray-900">₹{(Number(record.netSalary) || 0).toLocaleString()}</div></td>
                      <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-900">
                          {record.paidDate ? format(parseISO(record.paidDate), 'PP') : '—'}
                      </div></td>
                      <td className="px-6 py-4 whitespace-nowrap"><div className="flex items-center">
                          <CheckCircle className="h-4 w-4 text-green-500 mr-1" /><span className="text-sm text-green-600">Paid</span>
                      </div></td>
                    </tr>
                  );
                })}
              {salaryRecords.filter((record: SalaryRecordType) => record.isPaid && record.paidDate).length === 0 && (
                <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-500">No payment history available.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default Salary;