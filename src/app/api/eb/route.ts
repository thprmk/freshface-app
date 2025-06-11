// app/api/eb/route.ts

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectToDatabase from '@/lib/mongodb';
import EBReading from '@/models/ebReadings';
import { hasPermission, PERMISSIONS } from '@/lib/permissions';

// 1. Import and Configure Cloudinary
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// 2. The real uploadImage function
async function uploadImage(file: File): Promise<string> {
  // Convert the file to a buffer
  const fileBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(fileBuffer);

  // Use a promise to upload the stream
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        // Optional: specify a folder in Cloudinary
        folder: 'eb-readings', 
      },
      (error, result) => {
        if (error) {
          return reject(error);
        }
        if (result) {
          // Return the secure URL of the uploaded image
          resolve(result.secure_url);
        } else {
          reject(new Error('Cloudinary upload failed without an error message.'));
        }
      }
    );

    // Write the buffer to the stream
    uploadStream.end(buffer);
  });
}

// --- YOUR EXISTING CODE (UNCHANGED) ---

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session.user.role.permissions, PERMISSIONS.EB_VIEW_CALCULATE)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();

    const readings = await EBReading.find({})
      .sort({ date: -1 })
      .limit(30);

    return NextResponse.json({ success: true, readings });
  } catch (error) {
    console.error('Error fetching EB readings:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session.user.role.permissions, PERMISSIONS.EB_UPLOAD)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const type = formData.get('type') as 'morning' | 'evening';
    const image = formData.get('image') as File;
    const dateString = formData.get('date') as string;

    if (!type || !image || !dateString) {
      return NextResponse.json({ success: false, message: 'Type, image, and date are required' }, { status: 400 });
    }

    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return NextResponse.json({ success: false, message: 'Invalid date format' }, { status: 400 });
    }

    await connectToDatabase();

    // Normalize date to start of day for query
    const startOfDay = new Date(new Date(date).setHours(0, 0, 0, 0));
    const endOfDay = new Date(new Date(date).setHours(23, 59, 59, 999));

    // Check if a reading exists for the date
    let reading = await EBReading.findOne({ date: { $gte: startOfDay, $lte: endOfDay } });

    // The call to uploadImage now uses the real function
    const imageUrl = await uploadImage(image);

    if (!reading) {
      // Create new reading for morning
      if (type === 'morning') {
        reading = await EBReading.create({
          date: startOfDay,
          startImageUrl: imageUrl,
          createdBy: session.user.id
        });
      } else {
        return NextResponse.json({ success: false, message: 'Morning reading must be uploaded first' }, { status: 400 });
      }
    } else {
      // Update existing reading for evening
      if (type === 'evening') {
        if (reading.endImageUrl) {
          return NextResponse.json({ success: false, message: 'Evening reading already exists' }, { status: 400 });
        }
        reading.endImageUrl = imageUrl;
        reading.updatedBy = session.user.id;
        reading.updatedAt = new Date();
        await reading.save();
      } else {
        return NextResponse.json({ success: false, message: 'Morning reading already exists' }, { status: 400 });
      }
    }

    return NextResponse.json({ success: true, reading }, { status: reading.startImageUrl && !reading.endImageUrl ? 201 : 200 });
  } catch (error) {
    console.error('Error processing EB reading:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !hasPermission(session.user.role.permissions, PERMISSIONS.EB_VIEW_CALCULATE)) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { readingId, startUnits, endUnits, costPerUnit } = await request.json();

    if (!readingId || startUnits === undefined || endUnits === undefined || costPerUnit === undefined) {
      return NextResponse.json({ success: false, message: 'All fields are required' }, { status: 400 });
    }

    const unitsConsumed = endUnits - startUnits;
    if (unitsConsumed < 0) {
      return NextResponse.json({ success: false, message: 'End units must be greater than start units' }, { status: 400 });
    }

    await connectToDatabase();

    const reading = await EBReading.findById(readingId);
    if (!reading) {
      return NextResponse.json({ success: false, message: 'Reading not found' }, { status: 404 });
    }

    reading.startUnits = startUnits;
    reading.endUnits = endUnits;
    reading.unitsConsumed = unitsConsumed;
    reading.costPerUnit = costPerUnit;
    reading.totalCost = unitsConsumed * costPerUnit;
    reading.updatedBy = session.user.id;
    reading.updatedAt = new Date();

    await reading.save();

    return NextResponse.json({ success: true, reading });
  } catch (error) {
    console.error('Error updating EB reading:', error);
    return NextResponse.json({ success: false, message: 'Internal server error' }, { status: 500 });
  }
}