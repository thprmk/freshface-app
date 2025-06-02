// PUT /api/appointments/[id]
// DELETE /api/appointments/[id]
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Appointment from "@/models/Appointment";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  await dbConnect();
  const updates = await request.json();
  if (updates.date) {
    updates.date = new Date(updates.date);
  }
  const updated = await Appointment.findByIdAndUpdate(params.id, updates, { new: true });
  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(updated);
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  await dbConnect();
  const deleted = await Appointment.findByIdAndDelete(params.id);
  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ message: "Deleted" });
}
