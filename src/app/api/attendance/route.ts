// /api/attendance/route.ts

import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';
import Attendance, { IAttendance } from '../../../models/Attendance';
import Staff, { IStaff } from '../../../models/staff';
import TemporaryExit, { ITemporaryExit } from '../../../models/TemporaryExit';
import mongoose, { Types, Document } from 'mongoose';
import { differenceInMinutes, startOfDay, endOfDay } from 'date-fns';

const isValidObjectId = (id: string): boolean => mongoose.Types.ObjectId.isValid(id);

const REQUIRED_WORK_MINUTES_FOR_COMPLETE = 9 * 60;

// --- GET Handler (No changes needed) ---
export async function GET(request: NextRequest) {
  // ... (Your existing GET logic remains the same)
  const { searchParams } = request.nextUrl;
  const action = searchParams.get('action');

  console.log(`GET /api/attendance called with action: ${action}`);

  try {
    await dbConnect();

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

    const allRecords = await Attendance.find({})
      .populate<{ staffId: Pick<IStaff, '_id' | 'name' | 'image' | 'position'> }>({ path: 'staffId', model: Staff, select: 'name image position' })
      .populate<{ temporaryExits: ITemporaryExit[] }>({ path: 'temporaryExits', model: TemporaryExit })
      .sort({ date: 'desc' })
      .limit(100) 
      .lean();
    return NextResponse.json({ success: true, data: allRecords });

  } catch (error: any) {
    console.error(`API GET /api/attendance (action: ${action}) Error:`, error);
    return NextResponse.json({ success: false, error: `Server error: ${error.message || 'Unknown error'}` }, { status: 500 });
  }
}

// --- POST Handler ---
export async function POST(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const action = searchParams.get('action');
  const attendanceIdParam = searchParams.get('attendanceId');

  console.log(`POST /api/attendance called with action: ${action}, attendanceIdParam: ${attendanceIdParam}`);

  try {
    await dbConnect();
    
    if (action === 'checkIn') {
      // ... (Your existing checkIn logic remains the same)
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
        });
        const savedRecord = await newAttendance.save();
        const populatedRecord = await Attendance.findById(savedRecord._id)
            .populate<{ staffId: Pick<IStaff, '_id' | 'name' | 'image' | 'position'> }>({ path: 'staffId', model: Staff, select: 'name image position' })
            .populate<{ temporaryExits: ITemporaryExit[] }>({ path: 'temporaryExits', model: TemporaryExit })
            .lean();
        return NextResponse.json({ success: true, data: populatedRecord }, { status: 201 });

    } else if (action === 'checkOut') {
      // ... (Your existing checkOut logic remains the same)
      if (!attendanceIdParam || !isValidObjectId(attendanceIdParam)) {
        return NextResponse.json({ success: false, error: 'Invalid or missing attendanceId for checkOut' }, { status: 400 });
      }
      const checkOutTime = new Date();
      const attendance = await Attendance.findById(attendanceIdParam)
                                        .populate<{ temporaryExits: ITemporaryExit[] }>({path: 'temporaryExits', model: TemporaryExit});

      if (!attendance) return NextResponse.json({ success: false, error: 'Attendance record not found' }, { status: 404 });
      if (attendance.checkOut) return NextResponse.json({ success: false, error: 'Already checked out' }, { status: 400 });
      if (!attendance.checkIn) return NextResponse.json({ success: false, error: 'Cannot check-out without a check-in record' }, { status: 400 });

      const ongoingExit = (attendance.temporaryExits as ITemporaryExit[]).find(exit => !exit.endTime);
      if (ongoingExit) {
        return NextResponse.json({ success: false, error: 'An exit is still ongoing. End it before checking out.' }, { status: 400 });
      }

      let totalMinutes = differenceInMinutes(checkOutTime, attendance.checkIn);
      const temporaryExitMinutes = (attendance.temporaryExits as ITemporaryExit[]).reduce(
        (total: number, exit: ITemporaryExit) => total + (exit.durationMinutes || 0), 0);
      const finalWorkingMinutes = Math.max(0, totalMinutes - temporaryExitMinutes);
      const isWorkComplete = finalWorkingMinutes >= REQUIRED_WORK_MINUTES_FOR_COMPLETE;

      attendance.checkOut = checkOutTime;
      attendance.totalWorkingMinutes = finalWorkingMinutes;
      attendance.isWorkComplete = isWorkComplete;
      attendance.status = isWorkComplete ? 'present' : 'incomplete'; 
      
      const updatedRecord = await attendance.save();
      const populatedRecord = await Attendance.findById(updatedRecord._id)
        .populate<{ staffId: Pick<IStaff, '_id' | 'name' | 'image' | 'position'> }>({ path: 'staffId', model: Staff, select: 'name image position' })
        .populate<{ temporaryExits: ITemporaryExit[] }>({ path: 'temporaryExits', model: TemporaryExit })
        .lean();
      return NextResponse.json({ success: true, data: populatedRecord });

    } else if (action === 'startTempExit') {
        const body = await request.json();
        if (!attendanceIdParam || !isValidObjectId(attendanceIdParam)) {
            return NextResponse.json({ success: false, error: 'Invalid or missing attendanceId for startTempExit' }, { status: 400 });
        }
        
        // MODIFIED: Only extract 'reason' from the body
        const { reason } = body; 
        
        // MODIFIED: Validate that a reason was provided and is not just whitespace
        if (!reason || typeof reason !== 'string' || reason.trim() === '') {
            return NextResponse.json({ success: false, error: 'A valid reason is required to start a temporary exit.' }, { status: 400 });
        }

        const currentAttendance = await Attendance.findById(attendanceIdParam)
                                            .populate<{ temporaryExits: ITemporaryExit[] }>('temporaryExits');

        if (!currentAttendance) return NextResponse.json({ success: false, error: 'Attendance record not found' }, { status: 404 });
        if (currentAttendance.checkOut) return NextResponse.json({ success: false, error: 'Cannot start temp exit after check-out' }, { status: 400 });
        if (!currentAttendance.checkIn) return NextResponse.json({ success: false, error: 'Cannot start temp exit before check-in' }, { status: 400 });

        const hasOngoingExit = (currentAttendance.temporaryExits as ITemporaryExit[]).some(exit => !exit.endTime);
        if (hasOngoingExit) {
            return NextResponse.json({ success: false, error: 'An exit is already ongoing. End it before starting a new one.' }, { status: 400 });
        }

        const startTime = new Date();
        const newTempExit = new TemporaryExit({
            attendanceId: currentAttendance._id,
            startTime,
            endTime: null,
            // MODIFIED: Use the trimmed reason from the request body
            reason: reason.trim(),
            // Duration is not set here. It will be calculated when the exit ends.
            durationMinutes: 0, 
        });
        const savedTempExit = await newTempExit.save();
        
        await Attendance.updateOne({ _id: currentAttendance._id }, { $push: { temporaryExits: savedTempExit._id }});
        
        return NextResponse.json({ success: true, data: savedTempExit.toObject() });
    } else {
        return NextResponse.json({ success: false, error: 'Invalid action for POST request' }, { status: 400 });
    }

  } catch (error: any) {
    console.error(`API POST /api/attendance (action: ${action}) Error:`, error);
    if (error.name === 'ValidationError') return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    return NextResponse.json({ success: false, error: `Server error: ${error.message || 'Unknown error'}` }, { status: 500 });
   }
}


// --- PUT Handler (No changes needed) ---
export async function PUT(request: NextRequest) {
    // ... (Your existing PUT logic remains the same)
    const { searchParams } = request.nextUrl;
    const action = searchParams.get('action');
    const tempExitId = searchParams.get('tempExitId');

    console.log(`PUT /api/attendance called with action: ${action}, tempExitId: ${tempExitId}`);

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