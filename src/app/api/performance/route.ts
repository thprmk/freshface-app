// src/app/api/performance/route.ts

import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb'; 
import Performance from '@/models/performance'; 
import Staff from '@/models/staff'; 
// ✅ STEP 1: Import the TargetData model to update it
import TargetData from '@/models/TargetSheet'; 

// --- GET: Fetch all performance records (No changes needed here) ---
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
      .populate({
        path: 'staffId',
        model: Staff,
        select: 'name position image'
      })
      .sort({ year: -1, 'metrics.rating': -1 });

    return NextResponse.json({ success: true, data: records });
  } catch (error: any) {
    console.error("API GET Error:", error);
    return NextResponse.json({ success: false, error: "Server Error: " + error.message }, { status: 500 });
  }
}

// --- POST: Create a new performance record AND update the target sheet ---
export async function POST(req: Request) {
  try {
    await dbConnect();
    const body = await req.json();

    const { staffId, month, year, metrics } = body;

    // Prevent duplicate records for the same staff member in the same month/year
    const existingRecord = await Performance.findOne({ staffId, month, year });
    if (existingRecord) {
      return NextResponse.json(
        { success: false, error: `A performance record for this staff member already exists for ${month} ${year}.` },
        { status: 409 } // 409 Conflict
      );
    }
    
    const newRecord = await Performance.create(body);

    // ✅ =================================================================
    // ✅ STEP 2: AUTOMATICALLY UPDATE THE TARGET DATA SHEET
    // ✅ =================================================================
    try {
      // Find the most recent target document to update.
      const targetDoc = await TargetData.findOne().sort({ createdAt: -1 });

      if (targetDoc) {
        // --- 1. Update the "Achieved" values ---
        const { achieved, target, headingTo } = targetDoc.summary;

        // ASSUMPTION: 'salesGenerated' from performance maps to 'service' sales in target.
        // ASSUMPTION: 'customersServed' maps to 'bills'.
        achieved.service = (achieved.service || 0) + metrics.salesGenerated;
        achieved.bills = (achieved.bills || 0) + metrics.customersServed;
        // Recalculate Net Sales and ABV based on the new totals
        achieved.netSales = (achieved.service || 0) + (achieved.retail || 0);
        achieved.abv = achieved.bills > 0 ? achieved.netSales / achieved.bills : 0;

        // --- 2. Recalculate "Heading To" projections ---
        const now = new Date();
        const dayOfMonth = now.getDate();
        // Get the number of days in the month of the performance record
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const daysInMonth = new Date(year, months.indexOf(month) + 1, 0).getDate();

        if (dayOfMonth > 0 && daysInMonth > 0) {
            const projectionFactor = daysInMonth / dayOfMonth;
            
            headingTo.service = achieved.service * projectionFactor;
            headingTo.retail = achieved.retail * projectionFactor; // Retail is projected even if not updated today
            headingTo.netSales = achieved.netSales * projectionFactor;
            headingTo.bills = achieved.bills * projectionFactor;
            headingTo.callbacks = achieved.callbacks * projectionFactor;
            // ABV is not projected, it's a direct calculation
            headingTo.abv = achieved.abv; 

            // --- 3. Recalculate "In %" values ---
            headingTo.serviceInPercentage = target.service > 0 ? (headingTo.service / target.service) * 100 : 0;
            headingTo.retailInPercentage = target.retail > 0 ? (headingTo.retail / target.retail) * 100 : 0;
            headingTo.netSalesInPercentage = target.netSales > 0 ? (headingTo.netSales / target.netSales) * 100 : 0;
            headingTo.billsInPercentage = target.bills > 0 ? (headingTo.bills / target.bills) * 100 : 0;
            headingTo.abvInPercentage = target.abv > 0 ? (headingTo.abv / target.abv) * 100 : 0;
            headingTo.callbacksInPercentage = target.callbacks > 0 ? (headingTo.callbacks / target.callbacks) * 100 : 0;
            // ...and so on for any other percentage fields
        }

        // --- 4. Save the updated target document ---
        await targetDoc.save();
        console.log(`Successfully updated target sheet for ${month} ${year}.`);

      } else {
        console.warn("No target document found to update.");
      }
    } catch (targetUpdateError) {
      // Log the error but don't fail the main request. The performance record was still saved.
      console.error("Failed to automatically update target sheet:", targetUpdateError);
    }
    // ✅ =================================================================
    // ✅ END OF TARGET UPDATE LOGIC
    // ✅ =================================================================


    // Populate the new record before sending it back to the client (original logic)
    const populatedRecord = await Performance.findById(newRecord._id).populate({
      path: 'staffId',
      model: Staff,
      select: 'name position image'
    });

    return NextResponse.json({ success: true, data: populatedRecord }, { status: 201 });

  } catch (error: any) {
     console.error("API POST Error:", error);
     if (error.name === 'ValidationError') {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
     }
    return NextResponse.json({ success: false, error: "Server Error: " + error.message }, { status: 500 });
  }
}