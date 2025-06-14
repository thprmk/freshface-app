// src/app/api/performance/route.ts
import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import DailySale from '@/models/DailySale';
import { NextRequest } from 'next/server';

const MONTHLY_TARGET_MULTIPLIER = 3.0;

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    if (!month || !year) {
      return NextResponse.json({ message: 'Month and year query parameters are required.' }, { status: 400 });
    }

    // JS months are 0-indexed, so we subtract 1
    const monthIndex = parseInt(month, 10) - 1; 
    const numericYear = parseInt(year, 10);

    if (isNaN(monthIndex) || isNaN(numericYear) || monthIndex < 0 || monthIndex > 11) {
        return NextResponse.json({ message: 'Invalid month or year provided.' }, { status: 400 });
    }

    const startDate = new Date(numericYear, monthIndex, 1);
    const endDate = new Date(numericYear, monthIndex + 1, 0, 23, 59, 59);

    const staffPerformance = await DailySale.aggregate([
      // 1. Filter sales records for the selected month and year
      { 
        $match: { date: { $gte: startDate, $lte: endDate } } 
      },
      // 2. Group by staff to sum up their sales and customer counts
      {
        $group: {
          _id: '$staff',
          totalSales: { $sum: { $add: ['$serviceSale', '$productSale'] } },
          totalCustomers: { $sum: '$customerCount' },
        },
      },
      // 3. Join with the 'staffs' collection to get staff details
      {
        $lookup: { 
          from: 'staffs', 
          localField: '_id', 
          foreignField: '_id', 
          as: 'staffDetails' 
        }
      },
      // 4. Deconstruct the staffDetails array to a single object
      { 
        $unwind: '$staffDetails' 
      },
      // 5. Project the final fields and calculate the rating
      {
        $project: {
          _id: 0,
          staffId: '$_id',
          name: '$staffDetails.name',
          position: '$staffDetails.position',
          image: '$staffDetails.image',
          sales: '$totalSales',
          customers: '$totalCustomers',
          
          rating: {
            // Round the final result to 1 decimal place
            $round: [
              {
                $let: {
                  vars: {
                    // Safely convert salary to a number.
                    salaryAsNumber: {
                      $convert: {
                        input: '$staffDetails.salary',
                        to: 'double',
                        onError: 0.0,
                        onNull: 0.0
                      }
                    },
                    actualSales: { $ifNull: ['$totalSales', 0] }
                  },
                  in: {
                    $let: {
                      vars: {
                        // Ensure target is at least 1 to prevent division by zero.
                        monthlyTarget: { $max: [1, { $multiply: ['$$salaryAsNumber', MONTHLY_TARGET_MULTIPLIER] }] }
                      },
                      in: {
                        $cond: {
                          if: { $eq: ['$$actualSales', 0] },
                          then: 0,
                          else: {
                            $min: [ // Cap the rating at a maximum of 10
                              10,
                              { $multiply: [{ $divide: ['$$actualSales', '$$monthlyTarget'] }, 5] }
                            ]
                          }
                        }
                      }
                    }
                  }
                }
              },
              1 // Round to 1 decimal place
            ]
          }
        },
      },
      // 6. Sort the results alphabetically by staff name
      { $sort: { name: 1 } }
    ]);

    // Calculate the overall summary statistics for the dashboard cards
    const summary = staffPerformance.reduce(
      (acc, staff) => {
        acc.revenueGenerated += staff.sales;
        acc.totalCustomers += staff.customers;
        if (staff.rating > 0) {
            acc.totalRatingPoints += staff.rating;
            acc.validRatingsCount += 1;
        }
        return acc;
      },
      { revenueGenerated: 0, totalCustomers: 0, totalRatingPoints: 0, validRatingsCount: 0 }
    );
    
    const overallAverageRating = summary.validRatingsCount > 0 
      ? (summary.totalRatingPoints / summary.validRatingsCount) 
      : 0;

    return NextResponse.json({ 
        summary: {
            averageRating: parseFloat(overallAverageRating.toFixed(1)),
            totalCustomers: summary.totalCustomers,
            revenueGenerated: summary.revenueGenerated,
            // ✅ FIX: Corrected the variable name here
            avgServiceQuality: parseFloat(overallAverageRating.toFixed(1))
        },
        staffPerformance: staffPerformance 
    });

  } catch (error: any) {
    console.error("API GET /performance Error:", error);
    return NextResponse.json({ message: 'An internal server error occurred', error: error.message }, { status: 500 });
  }
}