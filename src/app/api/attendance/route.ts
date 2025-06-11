// app/api/attendance/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';
import Attendance, { IAttendance } from '../../../models/Attendance';
import Staff, { IStaff } from '../../../models/staff';
import TemporaryExit, { ITemporaryExit } from '../../../models/TemporaryExit';
import mongoose, { Types } from 'mongoose';
import { differenceInMinutes, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns';

const isValidObjectId = (id: string): boolean => mongoose.Types.ObjectId.isValid(id);

// Define standard work minutes. 9 hours = 540 minutes.
const STANDARD_WORK_MINUTES = 9 * 60;

// --- GET Handler ---
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const action = searchParams.get('action');

  try {
    await dbConnect();

    // NEW ACTION: Get the total overtime hours for a staff member for a specific month
    if (action === 'getOvertimeTotal') {
        const staffId = searchParams.get('staffId');
        const yearStr = searchParams.get('year');
        const monthStr = searchParams.get('month'); // Expects a month name like "June"

        if (!staffId || !yearStr || !monthStr || !isValidObjectId(staffId)) {
            return NextResponse.json({ success: false, error: 'Valid staffId, year, and month name are required' }, { status: 400 });
        }
        
        const year = parseInt(yearStr);
        // Convert month name to a 0-based month index
        const monthIndex = new Date(Date.parse(monthStr +" 1, 2012")).getMonth();

        if (isNaN(year) || monthIndex < 0) {
             return NextResponse.json({ success: false, error: 'Invalid year or month name' }, { status: 400 });
        }

        const startDate = startOfMonth(new Date(year, monthIndex));
        const endDate = endOfMonth(new Date(year, monthIndex));

        const result = await Attendance.aggregate([
            {
                $match: {
                    staffId: new Types.ObjectId(staffId),
                    date: { $gte: startDate, $lte: endDate },
                    overtimeHours: { $gt: 0 }
                }
            },
            {
                $group: {
                    _id: "$staffId",
                    totalOtHours: { $sum: "$overtimeHours" }
                }
            }
        ]);

        const totalOtHours = result.length > 0 ? result[0].totalOtHours : 0;
        return NextResponse.json({ success: true, data: { totalOtHours } });
    }
    
    if (action === 'getToday') {
      const todayDate = new Date();
      const todayStartBoundary = startOfDay(todayDate);
      const todayEndBoundary = endOfDay(todayDate);

      const records = await Attendance.find({
        date: { $gte: todayStartBoundary, $lte: todayEndBoundary },
      })
        .populate<{ staffId: Pick<IStaff, '_id' | 'name' | 'image' | 'position'> }>({ path: 'staffId', model: Staff, select: 'name image position' })
        .populate<{ temporaryExits: ITemporaryExit[] }>({ path: 'temporaryExits', model: TemporaryExit })
        .sort({ checkIn: 'asc' })
        .lean();
      return NextResponse.json({ success: true, data: records });
    }

    if (action === 'getMonthly') {
      const yearStr = searchParams.get('year');
      const monthStr = searchParams.get('month');

      if (!yearStr || !monthStr) {
        return NextResponse.json({ success: false, error: 'Year and month parameters are required' }, { status: 400 });
      }
      const parsedYear = parseInt(yearStr);
      const parsedMonth = parseInt(monthStr); 

      if (isNaN(parsedYear) || isNaN(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
        return NextResponse.json({ success: false, error: 'Invalid year or month parameters' }, { status: 400 });
      }
      const startDate = new Date(Date.UTC(parsedYear, parsedMonth - 1, 1, 0, 0, 0, 0));
      const endDate = new Date(Date.UTC(parsedYear, parsedMonth, 0, 23, 59, 59, 999)); 

      const records = await Attendance.find({ date: { $gte: startDate, $lte: endDate } })
        .populate<{ staffId: Pick<IStaff, '_id' | 'name' | 'image' | 'position'> }>({ path: 'staffId', model: Staff, select: 'name image position' })
        .populate<{ temporaryExits: ITemporaryExit[] }>({ path: 'temporaryExits', model: TemporaryExit })
        .sort({ date: 'asc', checkIn: 'asc' })
        .lean();
      return NextResponse.json({ success: true, data: records });
    }

    if (action === 'getStaffHistory') {
      const staffId = searchParams.get('staffId');
      if (!staffId || !isValidObjectId(staffId)) {
        return NextResponse.json({ success: false, error: 'Valid staffId is required' }, { status: 400 });
      }
      const queryStartDate = searchParams.get('startDate'); 
      const queryEndDate = searchParams.get('endDate');     
      const query: any = { staffId: new Types.ObjectId(staffId) };

      if (queryStartDate) {
        const parsedStartDate = new Date(queryStartDate); 
        if (!isNaN(parsedStartDate.getTime())) {
          query.date = { ...query.date, $gte: startOfDay(parsedStartDate) };
        } else { return NextResponse.json({ success: false, error: 'Invalid startDate format' }, { status: 400 }); }
      }
      if (queryEndDate) {
        const parsedEndDate = new Date(queryEndDate);
        if (!isNaN(parsedEndDate.getTime())) {
          query.date = { ...query.date, $lte: endOfDay(parsedEndDate) };
        } else { return NextResponse.json({ success: false, error: 'Invalid endDate format' }, { status: 400 }); }
      }
      const records = await Attendance.find(query)
          .populate<{ temporaryExits: ITemporaryExit[] }>({ path: 'temporaryExits', model: TemporaryExit })
          .sort({ date: 'desc' })
          .lean();
      return NextResponse.json({ success: true, data: records });
    }
    
    // Fallback if no specific action matches
    return NextResponse.json({ success: false, error: 'Invalid or missing GET action specified' }, { status: 400 });

  } catch (error: any) {
    console.error(`API GET /api/attendance (action: ${action}) Error:`, error);
    return NextResponse.json({ success: false, error: `Server error: ${error.message || 'Unknown error'}` }, { status: 500 });
  }
}

// --- POST Handler ---
export async function POST(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const action = searchParams.get('action');

  try {
    await dbConnect();
    
    if (action === 'checkIn') {
        const body = await request.json();
        const { staffId } = body;
        if (!staffId || !isValidObjectId(staffId)) {
            return NextResponse.json({ success: false, error: 'Invalid or missing staff ID' }, { status: 400 });
        }
        const todayDate = new Date();
        const todayStartBoundary = startOfDay(todayDate);
        const todayEndBoundary = endOfDay(todayDate);

        const existingRecord = await Attendance.findOne({
            staffId: new Types.ObjectId(staffId),
            date: { $gte: todayStartBoundary, $lte: todayEndBoundary },
        });

        if (existingRecord) {
            if (existingRecord.checkIn) {
              return NextResponse.json({ success: false, error: 'Attendance already recorded and checked-in for today' }, { status: 400 });
            }
            existingRecord.checkIn = new Date();
            existingRecord.status = 'present'; 
            const updatedRecord = await existingRecord.save();
            const populatedUpdatedRecord = await Attendance.findById(updatedRecord._id)
                .populate<{ staffId: Pick<IStaff, '_id' | 'name' | 'image' | 'position'> }>({ path: 'staffId', model: Staff, select: 'name image position' })
                .populate<{ temporaryExits: ITemporaryExit[] }>({ path: 'temporaryExits', model: TemporaryExit })
                .lean();
            return NextResponse.json({ success: true, data: populatedUpdatedRecord });
        }

        const now = new Date();
        const newAttendance = new Attendance({
            staffId: new Types.ObjectId(staffId),
            date: now, 
            checkIn: now,
            status: 'present', 
            totalWorkingMinutes: 0,
            isWorkComplete: false,
            temporaryExits: [],
            overtimeHours: 0, // Set default on creation
        });
        const savedRecord = await newAttendance.save();
        const populatedRecord = await Attendance.findById(savedRecord._id)
            .populate<{ staffId: Pick<IStaff, '_id' | 'name' | 'image' | 'position'> }>({ path: 'staffId', model: Staff, select: 'name image position' })
            .populate<{ temporaryExits: ITemporaryExit[] }>({ path: 'temporaryExits', model: TemporaryExit })
            .lean();
        return NextResponse.json({ success: true, data: populatedRecord }, { status: 201 });
    } 
    
    else if (action === 'checkOut') {
      const attendanceIdParam = searchParams.get('attendanceId');
      if (!attendanceIdParam || !isValidObjectId(attendanceIdParam)) {
        return NextResponse.json({ success: false, error: 'Invalid or missing attendanceId for checkOut' }, { status: 400 });
      }
      
      const attendance = await Attendance.findById(attendanceIdParam).populate('temporaryExits');

      if (!attendance) return NextResponse.json({ success: false, error: 'Attendance record not found' }, { status: 404 });
      if (attendance.checkOut) return NextResponse.json({ success: false, error: 'Already checked out' }, { status: 400 });
      if (!attendance.checkIn) return NextResponse.json({ success: false, error: 'Cannot check-out without a check-in record' }, { status: 400 });

      // --- THE FIX IS HERE ---
      // Cast to 'unknown' first to satisfy TypeScript's strict checking with populate
      const populatedExits = attendance.temporaryExits as unknown as ITemporaryExit[];

      const ongoingExit = populatedExits.find(exit => !exit.endTime);
      if (ongoingExit) {
        return NextResponse.json({ success: false, error: 'An exit is still ongoing. End it before checking out.' }, { status: 400 });
      }

      const checkOutTime = new Date();
      const totalMinutes = differenceInMinutes(checkOutTime, attendance.checkIn);
      
      // Use the correctly typed variable
      const temporaryExitMinutes = populatedExits.reduce((total, exit) => total + (exit.durationMinutes || 0), 0);
      
      const finalWorkingMinutes = Math.max(0, totalMinutes - temporaryExitMinutes);

      const overtimeMinutes = Math.max(0, finalWorkingMinutes - STANDARD_WORK_MINUTES);
      const overtimeHours = overtimeMinutes / 60;

      attendance.checkOut = checkOutTime;
      attendance.totalWorkingMinutes = finalWorkingMinutes;
      attendance.isWorkComplete = finalWorkingMinutes >= STANDARD_WORK_MINUTES;
      attendance.status = attendance.isWorkComplete ? 'present' : 'incomplete';
      attendance.overtimeHours = overtimeHours;
      
      const updatedRecord = await attendance.save();

      const populatedResponseRecord = await Attendance.findById(updatedRecord._id)
        .populate<{ staffId: Pick<IStaff, '_id' | 'name' | 'image' | 'position'> }>({ path: 'staffId', model: Staff, select: 'name image position' })
        .populate<{ temporaryExits: ITemporaryExit[] }>({ path: 'temporaryExits', model: TemporaryExit })
        .lean();
        
      return NextResponse.json({ success: true, data: populatedResponseRecord });
    }
    
    else if (action === 'startTempExit') {
        const body = await request.json();
        const attendanceIdParam = searchParams.get('attendanceId');

        if (!attendanceIdParam || !isValidObjectId(attendanceIdParam)) {
            return NextResponse.json({ success: false, error: 'Invalid or missing attendanceId for startTempExit' }, { status: 400 });
        }
        
        const { reason } = body; 
        
        if (!reason || typeof reason !== 'string' || reason.trim() === '') {
            return NextResponse.json({ success: false, error: 'A valid reason is required to start a temporary exit.' }, { status: 400 });
        }

        const currentAttendance = await Attendance.findById(attendanceIdParam).populate('temporaryExits');

        if (!currentAttendance) return NextResponse.json({ success: false, error: 'Attendance record not found' }, { status: 404 });
        if (currentAttendance.checkOut) return NextResponse.json({ success: false, error: 'Cannot start temp exit after check-out' }, { status: 400 });
        if (!currentAttendance.checkIn) return NextResponse.json({ success: false, error: 'Cannot start temp exit before check-in' }, { status: 400 });

        const populatedExits = currentAttendance.temporaryExits as unknown as ITemporaryExit[];
        const hasOngoingExit = populatedExits.some(exit => !exit.endTime);
        if (hasOngoingExit) {
            return NextResponse.json({ success: false, error: 'An exit is already ongoing. End it before starting a new one.' }, { status: 400 });
        }

        const newTempExit = new TemporaryExit({
            attendanceId: currentAttendance._id,
            startTime: new Date(),
            endTime: null,
            reason: reason.trim(),
            durationMinutes: 0, 
        });
        const savedTempExit = await newTempExit.save();
        
        await Attendance.updateOne({ _id: currentAttendance._id }, { $push: { temporaryExits: savedTempExit._id }});
        
        return NextResponse.json({ success: true, data: savedTempExit.toObject() });
    }
    
    return NextResponse.json({ success: false, error: 'Invalid action for POST request' }, { status: 400 });

  } catch (error: any) {
    console.error(`API POST /api/attendance (action: ${action}) Error:`, error);
    return NextResponse.json({ success: false, error: `Server error: ${error.message || 'Unknown error'}` }, { status: 500 });
   }
}


// --- PUT Handler ---
export async function PUT(request: NextRequest) {
    const { searchParams } = request.nextUrl;
    const action = searchParams.get('action');
    const tempExitId = searchParams.get('tempExitId');

    if (action === 'endTempExit') {
        if (!tempExitId || !isValidObjectId(tempExitId)) {
            return NextResponse.json({ success: false, error: "Valid tempExitId is required" }, { status: 400 });
        }
        try {
            await dbConnect();
            const existingExit = await TemporaryExit.findById(tempExitId);

            if (!existingExit) {
                return NextResponse.json({ success: false, error: "Temporary exit not found"}, { status: 404 });
            }
            if (existingExit.endTime) {
                return NextResponse.json({ success: false, error: "Temporary exit already ended"}, { status: 400 });
            }

            const endTime = new Date();
            const duration = differenceInMinutes(endTime, existingExit.startTime);
            existingExit.endTime = endTime;
            existingExit.durationMinutes = Math.max(0, duration); 

            const updatedExit = await existingExit.save();
            return NextResponse.json({ success: true, data: updatedExit.toObject() });
        } catch (error: any) {
            console.error(`API PUT /api/attendance (action: ${action}, tempExitId: ${tempExitId}) Error:`, error);
            if (error.name === 'ValidationError') return NextResponse.json({ success: false, error: error.message }, { status: 400 });
            return NextResponse.json({ success: false, error: `Server error: ${error.message || 'Unknown error'}` }, { status: 500 });
        }
    }
    return NextResponse.json({ success: false, error: "Invalid action for PUT request" }, { status: 400 });
}