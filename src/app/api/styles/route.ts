import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Style from "@/models/Style";  // Adjusted path to the Style model


export async function GET() {
  await dbConnect();
  try {
    const styles = await Style.find().sort({ name: 1 }); // fetch all styles sorted by name
    return NextResponse.json(styles);
  } catch (error) {
    return NextResponse.json({ message: "Failed to fetch styles" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  await dbConnect();
  try {
    const body = await request.json();
    const { name, price } = body;

    if (!name || price === undefined) {
      return NextResponse.json({ message: "Name and price are required" }, { status: 400 });
    }

    const newStyle = new Style({ name, price });
    await newStyle.save();

    return NextResponse.json(newStyle, { status: 201 });
  } catch (error) {
    return NextResponse.json({ message: "Failed to create style" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  await dbConnect();
  try {
    const body = await request.json();
    const { id, name, price } = body;

    if (!id || !name || price === undefined) {
      return NextResponse.json({ message: "ID, name, and price are required" }, { status: 400 });
    }

    const updatedStyle = await Style.findByIdAndUpdate(id, { name, price }, { new: true });
    if (!updatedStyle) {
      return NextResponse.json({ message: "Style not found" }, { status: 404 });
    }

    return NextResponse.json(updatedStyle);
  } catch (error) {
    return NextResponse.json({ message: "Failed to update style" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  await dbConnect();
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ message: "ID is required" }, { status: 400 });
    }

    const deletedStyle = await Style.findByIdAndDelete(id);
    if (!deletedStyle) {
      return NextResponse.json({ message: "Style not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Style deleted" });
  } catch (error) {
    return NextResponse.json({ message: "Failed to delete style" }, { status: 500 });
  }
}
