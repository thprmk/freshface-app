import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Stylist from "@/models/Stylist";

// GET request to fetch all stylists
export async function GET() {
    await dbConnect();
    try {
        const stylists = await Stylist.find().sort({ name: 1 });
        return NextResponse.json(stylists);
    } catch (error) {
        return NextResponse.json({ message: "Failed to fetch stylists" }, { status: 500 });
    }
}

// POST request to create a new stylist
export async function POST(request: Request) {
    await dbConnect();

    try {
        const body = await request.json();
        const { name, experience, specialization, contactNumber } = body;

        if (!name || !experience || !specialization || !contactNumber) {
            return NextResponse.json({ message: "Name, experience, specialization, and contact number are required" }, { status: 400 });
        }

        const newStylist = new Stylist({ name, experience, specialization, contactNumber });
        await newStylist.save();

        return NextResponse.json(newStylist, { status: 201 });
    } catch (error) {
        return NextResponse.json({ message: "Failed to create stylist" }, { status: 500 });
    }
}

// PUT request to update an existing stylist
export async function PUT(request: Request) {
    await dbConnect();

    try {
        const body = await request.json();
        const { id, name, experience, specialization, contactNumber } = body;

        if (!id || !name || !experience || !specialization || !contactNumber) {
            return NextResponse.json({ message: "ID, name, experience, specialization, and contact number are required" }, { status: 400 });
        }

        const updatedStylist = await Stylist.findByIdAndUpdate(id, { name, experience, specialization, contactNumber }, { new: true });

        if (!updatedStylist) {
            return NextResponse.json({ message: "Stylist not found" }, { status: 404 });
        }

        return NextResponse.json(updatedStylist);
    } catch (error) {
        return NextResponse.json({ message: "Failed to update stylist" }, { status: 500 });
    }
}

// DELETE request to delete a stylist
export async function DELETE(request: Request) {
    await dbConnect();
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ message: "ID is required" }, { status: 400 });
        }

        const deletedStylist = await Stylist.findByIdAndDelete(id);

        if (!deletedStylist) {
            return NextResponse.json({ message: "Stylist not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Stylist deleted" });
    } catch (error) {
        return NextResponse.json({ message: "Failed to delete stylist" }, { status: 500 });
    }
}
