// app/api/salary/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb'; // Adjust path if your lib is elsewhere
import SalaryRecord, { ISalaryRecord } from '../../../models/SalaryRecord'; // Adjust path
import Staff, { IStaff } from '../../../models/staff'; // Adjust path
import mongoose from 'mongoose';

// --- Interfaces for Payloads and Responses ---
interface ProcessSalaryPayloadFE { 
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
}

interface PopulatedStaffDetailsFE { // For frontend to understand populated staff shape
  id: string;
  name: string;
  image?: string | null;
  position: string;
}

interface SalaryRecordResponseFE { // Structure sent to frontend
  id: string;
  staffId: string; // ALWAYS the string ID of the staff member
  month: string;
  year: number;
  baseSalary: number;
  bonus: number;
  deductions: number;
  advanceDeducted: number;
  netSalary: number;
  isPaid: boolean;
  paidDate: string | null;
  createdAt?: string;
  updatedAt?: string;
  staffDetails?: PopulatedStaffDetailsFE | null; // Optional: if staff was populated
}

// --- Helper Function to Format Response ---
function formatRecordForResponse(
    record: ISalaryRecord | (Omit<ISalaryRecord, 'staffId' | '_id' | 'createdAt' | 'updatedAt'> & { staffId: IStaff | mongoose.Types.ObjectId | string, _id: mongoose.Types.ObjectId, createdAt?: Date, updatedAt?: Date}), 
    // populatedStaffParam is used if we manually fetched staff details separately
    populatedStaffParam?: IStaff | null 
): SalaryRecordResponseFE {
    
    let actualStaffIdString: string;
    let staffDetailsForResponse: PopulatedStaffDetailsFE | undefined = undefined;

    // Determine staff ID string and populate details if available
    if (populatedStaffParam) { // If staff details were explicitly passed (e.g., from a separate query)
        actualStaffIdString = populatedStaffParam._id.toString();
        staffDetailsForResponse = {
            id: actualStaffIdString,
            name: populatedStaffParam.name,
            image: populatedStaffParam.image || null,
            position: populatedStaffParam.position,
        };
    } else if (record.staffId && typeof record.staffId === 'object' && '_id' in record.staffId) { 
        // This case handles if record.staffId was populated by Mongoose directly on the SalaryRecord query (e.g., .populate())
        const directPopulatedStaff = record.staffId as IStaff; // Cast because it's an object with _id
        actualStaffIdString = directPopulatedStaff._id.toString();
        staffDetailsForResponse = {
            id: actualStaffIdString,
            name: directPopulatedStaff.name,
            image: directPopulatedStaff.image || null,
            position: directPopulatedStaff.position,
        };
    } else if (record.staffId) { // If record.staffId is just an ObjectId or string
        actualStaffIdString = record.staffId.toString();
    } else {
        console.warn("Record is missing staffId:", record);
        actualStaffIdString = "Unknown Staff ID"; // Should ideally not happen if staffId is required in schema
    }
    
    const recordIdStr = (record._id || (record as any).id)?.toString();
    if (!recordIdStr) {
        console.error("Record is missing _id in formatRecordForResponse:", record);
        // Depending on strictness, you might throw an error or return a partial object.
        // For now, let's assume _id is always present from DB operations.
    }

    return {
        id: recordIdStr!, // Assert _id is present
        staffId: actualStaffIdString, // staffId is always the string ID
        month: record.month,
        year: record.year,
        baseSalary: record.baseSalary,
        bonus: record.bonus,
        deductions: record.deductions,
        advanceDeducted: record.advanceDeducted,
        netSalary: record.netSalary,
        isPaid: record.isPaid,
        paidDate: record.paidDate ? new Date(record.paidDate).toISOString().split('T')[0] : null,
        createdAt: record.createdAt ? new Date(record.createdAt).toISOString() : undefined,
        updatedAt: record.updatedAt ? new Date(record.updatedAt).toISOString() : undefined,
        staffDetails: staffDetailsForResponse, // Include populated details if available
    };
}

// --- POST Handler (Create/Update Salary Record) ---
export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const payload = (await req.json()) as ProcessSalaryPayloadFE;

    if (!mongoose.Types.ObjectId.isValid(payload.staffId)) {
        return NextResponse.json({ success: false, error: 'Invalid staff ID format' }, { status: 400 });
    }
    const staffExists = await Staff.findById(payload.staffId).lean();
    if (!staffExists) {
      return NextResponse.json({ success: false, error: 'Staff member not found' }, { status: 404 });
    }

    const salaryDataForDb = {
      ...payload,
      staffId: new mongoose.Types.ObjectId(payload.staffId), // Convert to ObjectId for DB ops
      paidDate: payload.paidDate ? new Date(payload.paidDate) : null,
    };
    
    const salaryRecordDb = await SalaryRecord.findOneAndUpdate(
      { 
        staffId: new mongoose.Types.ObjectId(payload.staffId), 
        month: payload.month, 
        year: payload.year 
      },
      salaryDataForDb,
      { new: true, upsert: true, runValidators: true }
    ).lean(); // Use lean for plain JS object

    if (!salaryRecordDb) {
        return NextResponse.json({ success: false, error: 'Failed to process salary record.' }, { status: 500 });
    }
    
    // For POST response, staffId is not populated by findOneAndUpdate unless explicitly chained with populate (which is less common for upserts).
    // So, formatRecordForResponse will correctly use salaryRecordDb.staffId.toString().
    // If you needed populated staff details in the POST response, you'd fetch Staff separately after the upsert.
    const responseRecord = formatRecordForResponse(salaryRecordDb);
    return NextResponse.json({ success: true, data: responseRecord }, { status: 201 });

  } catch (error: any) {
    console.error('Error processing salary [POST /api/salary]:', error);
    if (error.code === 11000) {
        return NextResponse.json({ success: false, error: 'A salary record for this staff, month, and year already exists.' }, { status: 409 });
    }
    return NextResponse.json({ success: false, error: error.message || 'Failed to process salary' }, { status: 400 });
  }
}

// --- GET Handler (Fetch Salary Records) ---
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const staffIdParam = searchParams.get('staffId');
    const yearParam = searchParams.get('year');
    const monthParam = searchParams.get('month');
    const populateStaffQuery = searchParams.get('populateStaff');

    const filterQuery: any = {};
    if (staffIdParam) {
        if (!mongoose.Types.ObjectId.isValid(staffIdParam)) {
            return NextResponse.json({ success: false, error: 'Invalid staff ID format for filter' }, { status: 400 });
        }
        filterQuery.staffId = new mongoose.Types.ObjectId(staffIdParam);
    }
    if (yearParam) filterQuery.year = parseInt(yearParam, 10);
    if (monthParam) filterQuery.month = monthParam;

    // Fetch salary records first
    const salaryRecordsDb = await SalaryRecord.find(filterQuery)
                                            .sort({ year: -1, createdAt: -1 }) // Initial sort
                                            .lean();

    let populatedStaffDetailsMap: Map<string, IStaff> = new Map();

    if (populateStaffQuery === 'true' && salaryRecordsDb.length > 0) {
      // Collect all unique staff IDs from the fetched salary records
      const uniqueStaffIds = [
        ...new Set(salaryRecordsDb.map(sr => sr.staffId.toString()).filter(id => mongoose.Types.ObjectId.isValid(id)))
      ].map(id => new mongoose.Types.ObjectId(id));

      if (uniqueStaffIds.length > 0) {
        const staffDocs = await Staff.find({ _id: { $in: uniqueStaffIds } })
                                     .select('name image position') // Select fields needed for PopulatedStaffDetailsFE
                                     .lean();
        staffDocs.forEach(staff => {
            if (staff && staff._id) {
                populatedStaffDetailsMap.set(staff._id.toString(), staff as IStaff);
            }
        });
      }
    }

    const formattedRecords: SalaryRecordResponseFE[] = salaryRecordsDb.map(record => {
        const populatedStaff = populateStaffQuery === 'true' 
            ? populatedStaffDetailsMap.get(record.staffId.toString()) 
            : null;
        return formatRecordForResponse(record, populatedStaff || undefined); // Pass undefined if not found
    });
    
    // Sort by month name correctly after all data is formatted
    const monthOrderMap = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
        .reduce((acc, m, i) => { acc[m] = i; return acc; }, {} as Record<string, number>);

    formattedRecords.sort((a, b) => {
        if (b.year !== a.year) return b.year - a.year; // Descending year
        return (monthOrderMap[a.month] ?? 12) - (monthOrderMap[b.month] ?? 12) ; // Ascending month order
    });

    return NextResponse.json({ success: true, data: formattedRecords });

  } catch (error: any) {
    console.error('Error fetching salary records [GET /api/salary]:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to fetch salary records' }, { status: 500 });
  }
}