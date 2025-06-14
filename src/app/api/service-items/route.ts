import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import ServiceItem from '@/models/ServiceItem';

// GET all service items, filtered by subCategory ID
export async function GET(req: NextRequest) {
  await dbConnect();
  try {
    const subCategoryId = req.nextUrl.searchParams.get('subCategoryId');
    if (!subCategoryId) {
      return NextResponse.json({ success: false, error: 'Sub-Category ID is required.' }, { status: 400 });
    }
    // Populate the product details for the consumables
    const services = await ServiceItem.find({ subCategory: subCategoryId })
      .populate('consumables.product', 'name sku unit') // Fetch name, sku, and unit for each consumable product
      .sort({ name: 1 });
    return NextResponse.json({ success: true, data: services });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Server Error' }, { status: 500 });
  }
}

// POST a new service item
export async function POST(req: NextRequest) {
  await dbConnect();
  try {
    const body = await req.json();
    if (!body.subCategory) {
        return NextResponse.json({ success: false, error: 'Parent sub-category ID is required.' }, { status: 400 });
    }
    const service = await ServiceItem.create(body);
    return NextResponse.json({ success: true, data: service }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}