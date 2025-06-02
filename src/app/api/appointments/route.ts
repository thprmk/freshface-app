// GET /api/appointments
// POST /api/appointments
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Appointment from "@/models/Appointment";

export async function GET(request: Request) {
  await dbConnect();
  const appts = await Appointment.find().sort({ date: 1, time: 1 });
  return NextResponse.json(appts);
}

export async function POST(request: Request) {
  await dbConnect();
  const body = await request.json();

  const productPrices: Record<number, number> = { 1: 299, 2: 249, 3: 399, 4: 199 };
  const products: number[] = body.products || [];
  const totalPrice = products.reduce(
    (sum, id) => sum + (productPrices[id] || 0),
    0
  );

  const newAppt = new Appointment({
    customerName: body.customerName,
    phoneNumber: body.phoneNumber,
    email: body.email,
    style: body.style,
    stylist: body.stylist,
    date: new Date(body.date),
    time: body.time,
    paymentMethod: body.paymentMethod,
    products: products,
    totalPrice,
  });

  await newAppt.save();
  return NextResponse.json(newAppt, { status: 201 });
}
