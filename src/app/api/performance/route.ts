// src/app/api/performance/route.ts

import { NextResponse } from 'next/server';
// ✅ CORRECTED PATH: Using alias to point to src/
import dbConnect from '@/lib/mongodb'; 
import Performance from '@/models/performance'; 
import Staff from '@/models/staff'; // Assuming your staff model file is named 'staff.ts'

// --- GET: Fetch all performance records, with filtering ---
export async function GET(req: Request) {
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);

    const month = searchParams.get('month');
    const year = searchParams.get('year');

    const filter: any = {};
    if (month) filter.month = month;
    if (year) filter.year = parseInt(year, 10);

    const records = await Performance.find(filter)
      // Populate with staff details for easy display on the frontend
      .populate({
        path: 'staffId',
        model: Staff,
        select: 'name position image' // Only get the fields you need
      })
      .sort({ year: -1, 'metrics.rating': -1 }); // Sort by year, then rating

    return NextResponse.json({ success: true, data: records });
  } catch (error: any) {
    console.error("API GET Error:", error);
    return NextResponse.json({ success: false, error: "Server Error: " + error.message }, { status: 500 });
  }
}

// --- POST: Create a new performance record ---
export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();

    const { staffId, month, year } = body;

    // Prevent duplicate records for the same staff member in the same month/year
    const existingRecord = await Performance.findOne({ staffId, month, year });
    if (existingRecord) {
      return NextResponse.json(
        { success: false, error: `A performance record for this staff member already exists for ${month} ${year}.` },
        { status: 409 } // 409 Conflict
      );
    }
    
    const newRecord = await Performance.create(body);

    // Populate the new record before sending it back
    const populatedRecord = await Performance.findById(newRecord._id).populate({
      path: 'staffId',
      model: Staff,
      select: 'name position image'
    });

    return NextResponse.json({ success: true, data: populatedRecord }, { status: 201 });
  } catch (error: any) {
     console.error("API POST Error:", error);
     // Provide more specific error for validation issues
     if (error.name === 'ValidationError') {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
     }
    return NextResponse.json({ success: false, error: "Server Error: " + error.message }, { status: 500 });
  }
}