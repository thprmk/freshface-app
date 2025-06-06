// app/api/appointment/route.ts

import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Appointment from '@/models/appointment'; // Your Mongoose model

// --- Handler for POST requests (creating an appointment) ---
export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const data = await req.json(); // Make sure client sends valid JSON

    // Optional: Add validation for 'data' here if you want more robust checks
    // e.g., ensure all required fields are present before calling Appointment.create

    const appointment = await Appointment.create(data);
    return NextResponse.json({ success: true, appointment }, { status: 201 });
  } catch (err) {
    console.error('API Error in POST /api/appointment:', err);
    let message = 'Failed to create appointment';
    let statusCode = 500;

    if (err instanceof SyntaxError && err.message.includes('JSON')) {
      // This means req.json() failed because the client sent bad JSON
      message = 'Invalid JSON payload provided.';
      statusCode = 400; // Bad Request
    } else if (err instanceof Error) {
      // Check if it's a Mongoose validation error
      // Mongoose validation errors have a 'name' property of 'ValidationError'
      // and an 'errors' object with details.
      if ((err as any).name === 'ValidationError') {
        message = "Validation failed: " + Object.values((err as any).errors).map((e: any) => e.message).join(', ');
        statusCode = 400; // Bad Request for validation errors
      } else {
        message = err.message; // General error message
      }
    }
    
    return NextResponse.json(
      { success: false, message: message, error: String(err) }, // Include original error string for debugging
      { status: statusCode }
    );
  }
}

// --- Handler for GET requests (fetching all appointments) ---
export async function GET(req: Request) {
  try {
    await connectToDatabase();

    // Fetch all appointments
    // You might want to add sorting, pagination, or filtering based on query parameters in the future
    // For example: const appointments = await Appointment.find({}).sort({ date: -1, time: -1 }).lean();
    const appointments = await Appointment.find({})
      .sort({ date: 1, time: 1 }) // Example: sort by date desc, then time desc
      .lean(); // .lean() for potentially faster queries if you don't need Mongoose document methods

    return NextResponse.json({ success: true, appointments }, { status: 200 });
  } catch (err) {
    console.error('API Error in GET /api/appointment:', err);
    const message = err instanceof Error ? err.message : 'An unknown error occurred while fetching appointments.';
    return NextResponse.json(
      { success: false, message: message, error: String(err) },
      { status: 500 }
    );
  }
}

// You can also add other handlers like PUT (for updating) or DELETE if needed for this route.
// export async function PUT(req: Request) { /* ... */ }
// export async function DELETE(req: Request) { /* ... */ }