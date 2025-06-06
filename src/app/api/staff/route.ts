// src/app/api/staff/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../lib/mongodb';       // VERIFY THIS PATH
import Staff, { IStaff } from '../../../models/staff'; // VERIFY THIS PATH & CASING
import mongoose, { Types } from 'mongoose';

// Helper function to validate MongoDB ObjectId string
const isValidObjectId = (id: string): boolean => mongoose.Types.ObjectId.isValid(id);

// Define a more specific type for lean results that include _id
// This ensures that _id is properly typed when using .lean()
type LeanStaffDocument = Omit<IStaff, keyof mongoose.Document<Types.ObjectId>> & { _id: Types.ObjectId };


export async function GET(request: NextRequest) {
  // Removed authError = await validateToken(request);

  await dbConnect();
  const { searchParams } = request.nextUrl;
  const action = searchParams.get('action');
  const staffId = searchParams.get('id');

  try {
    if (action === 'list') {
      const staffList = await Staff.find({ status: 'active' })
        .sort({ name: 'asc' })
        .lean<LeanStaffDocument[]>();
      return NextResponse.json({ success: true, data: staffList.map(s => ({...s, id: s._id.toString()})) });
    }

    if (staffId) {
      if (!isValidObjectId(staffId)) {
        return NextResponse.json({ success: false, error: 'Invalid staff ID format' }, { status: 400 });
      }
      const staffMember = await Staff.findById(staffId).lean<LeanStaffDocument>();
      if (!staffMember) {
        return NextResponse.json({ success: false, error: 'Staff member not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: {...staffMember, id: staffMember._id.toString()} });
    }
    return NextResponse.json({ success: false, error: 'Invalid action or missing ID for GET request' }, { status: 400 });
  } catch (error) {
    console.error('Error fetching staff:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ success: false, error: `Failed to fetch staff: ${message}` }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Removed authError = await validateToken(request);

  await dbConnect();
  try {
    const body = await request.json();
    const { name, email, position, phone, salary, address, image } = body;

    if (!name || !email || !position) {
      return NextResponse.json({ success: false, error: 'Name, email, and position are required' }, { status: 400 });
    }

    const existingStaff = await Staff.findOne({ email }).lean<LeanStaffDocument>();
    if (existingStaff) {
      return NextResponse.json({ success: false, error: 'Email already exists' }, { status: 400 });
    }

    const newStaffDoc = new Staff({
      name, email, position, phone, salary, address,
      image: image || null,
      status: 'active',
    });
    const savedStaff = await newStaffDoc.save();
    const staffObject = savedStaff.toObject();
    return NextResponse.json({ success: true, data: {...staffObject, id: savedStaff._id.toString()} }, { status: 201 });
  } catch (error: any) {
    console.error('Error adding staff:', error);
    if (error.name === 'ValidationError') {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    if (error instanceof SyntaxError) {
        return NextResponse.json({ success: false, error: 'Invalid JSON payload' }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: `Failed to add staff member: ${error.message || 'Unknown error'}` }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  // Removed authError = await validateToken(request);

  await dbConnect();
  const { searchParams } = request.nextUrl;
  const staffId = searchParams.get('id');

  if (!staffId || !isValidObjectId(staffId)) {
    return NextResponse.json({ success: false, error: 'Valid Staff ID is required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { name, email, position, phone, salary, address, image, status } = body;
    const updateData: Partial<IStaff> = {};

    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (position !== undefined) updateData.position = position;
    if (phone !== undefined) updateData.phone = phone;
    if (salary !== undefined) updateData.salary = salary;
    if (address !== undefined) updateData.address = address;
    if (image !== undefined) updateData.image = image;
    if (status !== undefined && ['active', 'inactive'].includes(status)) updateData.status = status as 'active' | 'inactive';


    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: false, error: 'No update data provided' }, { status: 400 });
    }
    
    if (updateData.email) {
        const staffToUpdate = await Staff.findById(staffId).lean<LeanStaffDocument>();
        if (staffToUpdate && staffToUpdate.email !== updateData.email) {
            const existingStaffWithNewEmail = await Staff.findOne({ email: updateData.email }).lean<LeanStaffDocument>();
            if (existingStaffWithNewEmail && existingStaffWithNewEmail._id.toString() !== staffId) {
                return NextResponse.json({ success: false, error: 'New email already in use' }, { status: 400 });
            }
        }
    }

    const updatedStaff = await Staff.findByIdAndUpdate(staffId, updateData, { new: true, runValidators: true }).lean<LeanStaffDocument>();
    if (!updatedStaff) {
      return NextResponse.json({ success: false, error: 'Staff member not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: {...updatedStaff, id: updatedStaff._id.toString()} });
  } catch (error: any) {
    console.error('Error updating staff:', error);
     if (error.name === 'ValidationError') {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    if (error instanceof SyntaxError) {
        return NextResponse.json({ success: false, error: 'Invalid JSON payload' }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: `Failed to update staff member: ${error.message || 'Unknown error'}` }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  // Removed authError = await validateToken(request);

  await dbConnect();
  const { searchParams } = request.nextUrl;
  const staffId = searchParams.get('id');

  if (!staffId || !isValidObjectId(staffId)) {
    return NextResponse.json({ success: false, error: 'Valid Staff ID is required' }, { status: 400 });
  }

  try {
    const staffToDeactivate = await Staff.findById(staffId);
    if (!staffToDeactivate) {
        return NextResponse.json({ success: false, error: 'Staff member not found' }, { status: 404 });
    }
    if (staffToDeactivate.status === 'inactive') {
        const staffObject = staffToDeactivate.toObject();
        return NextResponse.json({ success: true, message: 'Staff member already inactive', data: {...staffObject, id: staffToDeactivate._id.toString()} });
    }

    const deactivatedStaff = await Staff.findByIdAndUpdate(
      staffId,
      { status: 'inactive' },
      { new: true }
    ).lean<LeanStaffDocument>();

    if (!deactivatedStaff) {
        return NextResponse.json({ success: false, error: 'Staff member not found during deactivation attempt' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Staff member deactivated successfully', data: {...deactivatedStaff, id: deactivatedStaff._id.toString()} });
  } catch (error: any) {
    console.error('Error deactivating staff:', error);
    return NextResponse.json({ success: false, error: `Failed to deactivate staff: ${error.message || 'Unknown error'}` }, { status: 500 });
  }
}