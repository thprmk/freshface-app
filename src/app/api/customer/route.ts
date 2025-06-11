// app/api/customer/route.ts
import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Customer from '@/models/customermodel';
import Appointment from '@/models/appointment'; // For deriving activity status
import mongoose from 'mongoose';

interface LeanCustomer {
  _id: mongoose.Types.ObjectId;
  createdAt: Date; // Make sure this exists from timestamps: true
  name: string;
  // Add other fields you select or derive
  [key: string]: any;
}

interface LeanAppointment {
  date?: Date;
  [key: string]: any;
}

// GET ALL CUSTOMERS with Pagination and Search
export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);

    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const searchTerm = searchParams.get('search') || '';

    const skip = (page - 1) * limit;

    // Build query for search (case-insensitive)
    const queryOptions: any = {};
    if (searchTerm) {
      queryOptions.name = { $regex: searchTerm, $options: 'i' };
    }

    // Get total count of matching documents for pagination metadata
    const totalCustomers = await Customer.countDocuments(queryOptions);
    const totalPages = Math.ceil(totalCustomers / limit);

    const customersFromDb = await Customer.find(queryOptions)
      .sort({ name: 1 }) // Or createdAt: -1 for newest first
      .skip(skip)
      .limit(limit)
      .lean<LeanCustomer[]>();

    // Derive activity status for the current page of customers
    const customersWithDerivedStatus = await Promise.all(
      customersFromDb.map(async (cust) => {
        const lastAppointment = await Appointment.findOne({ customerId: cust._id })
          .sort({ date: -1 })
          .select('date')
          .lean<{ date?: Date } | null>();

        let derivedStatus: 'Active' | 'Inactive' | 'New' = 'New';
        const twoMonthsAgo = new Date();
        twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

        if (lastAppointment && lastAppointment.date) {
          const lastAppointmentDate = new Date(lastAppointment.date);
          if (lastAppointmentDate >= twoMonthsAgo) {
            derivedStatus = 'Active';
          } else {
            derivedStatus = 'Inactive';
          }
        } else if (cust.createdAt) { // Ensure cust.createdAt exists
          const customerCreationDate = new Date(cust.createdAt);
          if (customerCreationDate < twoMonthsAgo) {
            derivedStatus = 'Inactive';
          } else {
            derivedStatus = 'New';
          }
        } else {
            derivedStatus = 'Inactive'; // Fallback if no createdAt
        }


        return {
          ...cust,
          id: cust._id.toString(),
          _id: cust._id.toString(),
          status: derivedStatus,
          createdAt: cust.createdAt ? new Date(cust.createdAt).toISOString() : undefined,
          updatedAt: cust.updatedAt ? new Date(cust.updatedAt).toISOString() : undefined,
        };
      })
    );

    return NextResponse.json({
      success: true,
      customers: customersWithDerivedStatus,
      pagination: {
        currentPage: page,
        totalPages,
        totalCustomers,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    }, { status: 200 });

  } catch (err: any) {
    console.error('API Error in GET /api/customer (all with pagination):', err);
    return NextResponse.json(
      { success: false, message: err.message || 'Failed to fetch customer data', error: String(err) },
      { status: 500 }
    );
  }
}

// POST (Create a new customer) - Remains largely the same
export async function POST(req: Request) {
    // ... (Your existing POST logic for creating a customer) ...
    // Ensure it returns the created customer object with an 'id' field.
    try {
        await connectToDatabase();
        const body = await req.json();
        const { name, email, phoneNumber, ...otherData } = body;

        const normalizedEmail = email ? String(email).trim().toLowerCase() : null;
        const normalizedPhoneNumber = phoneNumber ? String(phoneNumber).replace(/\D/g, '') : null;

        if (!name || !normalizedEmail || !normalizedPhoneNumber) {
        return NextResponse.json({ success: false, message: "Name, email, and phone number are required." }, { status: 400 });
        }

        let existingCustomerDoc = await Customer.findOne({
        $or: [ { email: normalizedEmail }, { phoneNumber: normalizedPhoneNumber }]
        });

        if (existingCustomerDoc) {
        const existingCustomerObject = existingCustomerDoc.toObject();
        return NextResponse.json({
            success: false, message: "Customer with this email or phone number already exists.",
            customer: { ...existingCustomerObject, id: existingCustomerObject._id.toString() }, exists: true
        }, { status: 409 });
        }

        const newCustomerDoc = await Customer.create({
        name: name.trim(), email: normalizedEmail, phoneNumber: normalizedPhoneNumber, ...otherData
        });

        const newCustomerObject = newCustomerDoc.toObject();
        return NextResponse.json({
        success: true, customer: { ...newCustomerObject, id: newCustomerObject._id.toString() }
        }, { status: 201 });

    } catch (err: any) {
        console.error('API Error in POST /api/customer:', err);
        if (err.code === 11000) {
            return NextResponse.json({ success: false, message: "A customer with this email or phone number already exists (DB constraint).", exists: true }, { status: 409 });
        }
        return NextResponse.json({ success: false, message: err.message || 'Failed to create customer' }, { status: 500 });
    }
}