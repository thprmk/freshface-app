import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import DailySale from '@/models/DailySale'; // Ensure this path is correct
import Staff from '@/models/staff';       // Ensure this path is correct

export async function POST(request: Request) {
  try {
    // 1. Connect to the database
    await dbConnect();
    
    // 2. Parse the incoming data from the form
    const body = await request.json();
    const { staffId, date, serviceSale, productSale, reviewsWithName, reviewsWithPhoto } = body;

    // 3. Basic validation: Check for required fields
    if (!staffId || !date) {
      return NextResponse.json({ message: 'Staff ID and date are required.' }, { status: 400 });
    }

    // Optional: Verify that the staff member actually exists
    const staffExists = await Staff.findById(staffId);
    if (!staffExists) {
        return NextResponse.json({ message: 'Staff not found.' }, { status: 404 });
    }
    
    // Normalize the date to the beginning of the day to prevent timezone issues
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    // 4. Use `findOneAndUpdate` with `upsert: true`.
    // This is the best way to handle this:
    // - If a record for this staff on this day exists, it will be UPDATED.
    // - If no record exists, a new one will be CREATED.
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

    // 5. Send a success response
    return NextResponse.json({ message: 'Daily sale logged successfully', data: dailySaleRecord }, { status: 201 });

  } catch (error: any) {
    // 6. Catch any errors and send a descriptive error message
    console.error("API POST /incentives/dailysale Error:", error);
    if (error.name === 'ValidationError') {
        return NextResponse.json({ message: 'Validation Error', error: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: 'An internal server error occurred', error: error.message }, { status: 500 });
  }
}