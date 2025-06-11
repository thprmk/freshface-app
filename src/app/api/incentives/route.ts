// src/app/api/incentives/route.ts

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import DailySale from '@/models/DailySale'; // Make sure this path is correct
import Staff from '@/models/staff';       // Make sure this path is correct

// This POST function will handle requests to '/api/incentives'
export async function POST(request: Request) {
  try {
    await dbConnect();
    
    const body = await request.json();
    const { staffId, date, serviceSale, productSale, reviewsWithName, reviewsWithPhoto } = body;

    if (!staffId || !date) {
      return NextResponse.json({ message: 'Staff ID and date are required.' }, { status: 400 });
    }

    const staffExists = await Staff.findById(staffId);
    if (!staffExists) {
        return NextResponse.json({ message: 'Staff not found.' }, { status: 404 });
    }
    
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const dailySaleRecord = await DailySale.findOneAndUpdate(
      { staff: staffId, date: targetDate },
      { 
        $set: { 
            serviceSale, 
            productSale, 
            reviewsWithName, 
            reviewsWithPhoto 
        } 
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({ message: 'Daily sale logged successfully', data: dailySaleRecord }, { status: 201 });

  } catch (error: any) {
    console.error("API POST /api/incentives Error:", error);
    if (error.name === 'ValidationError') {
        return NextResponse.json({ message: 'Validation Error', error: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: 'An internal server error occurred', error: error.message }, { status: 500 });
  }
}