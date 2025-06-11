// app/api/appointment/route.ts

import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Appointment from '@/models/appointment'; // Your Mongoose Appointment model
import Customer from '@/models/customermodel'; // **** IMPORT YOUR CUSTOMER MODEL ****

// --- Handler for POST requests (creating an appointment) --- //

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const rawFormData = await req.json();
    console.log("Backend API [POST]: Received rawFormData:", JSON.stringify(rawFormData, null, 2));

    const {
      customerName, // Name of the customer
      phoneNumber,  // Phone number of the customer
      email,        // Email of the customer
      style,        // This is what your form sends, maps to 'service' for appointment
      stylist,
      date,
      time,
      notes,        // Assuming form might send 'notes' for the appointment
      paymentMethod,
      products
      // ... any other appointment-specific fields from rawFormData
    } = rawFormData;

    // --- 1. Find or Create Customer (More Robustly) ---
    let customerDoc;

    // Normalize inputs for reliable lookup
    const normalizedEmail = email ? String(email).trim().toLowerCase() : null;
    const normalizedPhoneNumber = phoneNumber ? String(phoneNumber).replace(/\D/g, '') : null; // Remove non-digits

    if (!normalizedEmail && !normalizedPhoneNumber) {
      return NextResponse.json({ success: false, message: "Customer email or phone number is required." }, { status: 400 });
    }

    // Build query: try to find by phone or email if provided
    const customerQueryConditions = [];
    if (normalizedPhoneNumber) {
        customerQueryConditions.push({ phoneNumber: normalizedPhoneNumber });
    }
    if (normalizedEmail) {
        // If you also want to find by email and it's unique
        customerQueryConditions.push({ email: normalizedEmail });
    }

    if (customerQueryConditions.length > 0) {
        customerDoc = await Customer.findOne({ $or: customerQueryConditions });
    }

    if (!customerDoc) {
      // Customer not found, create a new one
      if (!customerName || !normalizedEmail || !normalizedPhoneNumber) {
        return NextResponse.json({ success: false, message: "For a new customer, name, email, and phone number are required." }, { status: 400 });
      }
      try {
        console.log("Backend API [POST]: Creating new customer with Name:", customerName, "Email:", normalizedEmail, "Phone:", normalizedPhoneNumber);
        customerDoc = await Customer.create({
          name: customerName.trim(),
          email: normalizedEmail,
          phoneNumber: normalizedPhoneNumber,
        });
        console.log("Backend API [POST]: New customer created with ID:", customerDoc._id);
      } catch (err: any) {
        if (err.code === 11000) { // E11000 duplicate key error
          // This can happen in a race condition if two requests try to create the same customer.
          // Try to find the customer again, as it was likely just created.
          console.warn("Backend API [POST]: E11000 caught while creating customer, attempting to re-fetch.");
          customerDoc = await Customer.findOne({ $or: customerQueryConditions });
          if (!customerDoc) {
            // If still not found after E11000, something is more seriously wrong or data is inconsistent
            console.error("Backend API [POST]: Failed to re-fetch customer after E11000:", err);
            return NextResponse.json({ success: false, message: "Failed to create or find customer due to data conflict. Please check details.", error: String(err) }, { status: 409 }); // 409 Conflict
          }
          console.log("Backend API [POST]: Re-fetched customer after E11000, ID:", customerDoc._id);
        } else {
          // Other error during customer creation
          console.error('Backend API [POST]: Error creating customer:', err);
          return NextResponse.json({ success: false, message: "Failed to create customer record.", error: String(err) }, { status: 500 });
        }
      }
    } else {
      console.log("Backend API [POST]: Found existing customer with ID:", customerDoc._id, "Name:", customerDoc.name);
      // Optional: Update existing customer's details if they've changed (e.g., name)
      // For example:
      // if (customerName && customerDoc.name !== customerName.trim()) {
      //   customerDoc.name = customerName.trim();
      //   await customerDoc.save();
      //   console.log("Backend API [POST]: Updated customer name to:", customerDoc.name);
      // }
    }

    // --- 2. Prepare data for Appointment creation ---
    const appointmentDataForDb = {
      customerId: customerDoc._id, // Link to the found or created customer
      // **IMPORTANT**: Your appointmentSchema does NOT have customerName, email, phone.
      // These are on the Customer document.
      // Your GET /api/appointment uses .populate() to fetch them.
      // So, do NOT try to save customerName, email, phone directly onto the appointment document.
      style: style, // This should map to `service` in your UI's Appointment interface if different
      stylist: stylist,
      date: new Date(date), // Ensure date is a valid Date object
      time: time,
      notes: notes,
      status: 'Scheduled', // Default for new bookings
      paymentMethod: paymentMethod,
      products: products,
    };

    console.log("Backend API [POST]: Data prepared for Appointment.create:", JSON.stringify(appointmentDataForDb, null, 2));

    // Add validation for appointmentDataForDb fields if needed
    // ...

    const newAppointment = await Appointment.create(appointmentDataForDb);
    // For the response, you might want to populate the customer details immediately
    const populatedAppointment = await Appointment.findById(newAppointment._id).populate({
        path: 'customerId',
        select: 'name email phoneNumber'
    });

    return NextResponse.json({ success: true, appointment: populatedAppointment }, { status: 201 });

  } catch (err: any) {
    console.error('API Error in POST /api/appointment:', err);
    // ... (your existing error handling) ...
    let message = 'Failed to create appointment';
    let statusCode = 500;
    if (err.name === 'ValidationError') {
      message = "Validation failed: " + Object.values(err.errors).map((e: any) => e.message).join(', ');
      statusCode = 400;
    } else if (err.message) {
      message = err.message;
    }
    return NextResponse.json(
      { success: false, message: message, error: String(err) },
      { status: statusCode }
    );
  }
}

// --- Handler for GET requests (fetching all appointments) ---
export async function GET(req: Request) {
  try {
    await connectToDatabase();

    // To get customer details along with appointments, use populate
    const appointments = await Appointment.find({})
      .populate({
          path: 'customerId', // Field in Appointment schema
          select: 'name email phoneNumber' // Fields from Customer model to include
          // model: CustomerModel // Optional: if Mongoose can't infer it
      })
      .sort({ date: 1, time: 1 }) // Often more useful to see newest first
      .lean();

    return NextResponse.json({ success: true, appointments }, { status: 200 });
  } catch (err) {
    console.error('API Error in GET /api/appointment:', err);
    // @ts-ignore
    const message = err.message || 'An unknown error occurred while fetching appointments.';
    // @ts-ignore
    return NextResponse.json(
      { success: false, message: message, error: String(err) },
      { status: 500 }
    );
  }
}

// You can also add other handlers like PUT (for updating) or DELETE if needed for this route.
// export async function PUT(req: Request) { /* ... */ }
// export async function DELETE(req: Request) { /* ... */ }