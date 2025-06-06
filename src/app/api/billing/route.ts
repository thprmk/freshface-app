// app/api/billing/route.ts
import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Customer from '@/models/customermodel';
import MembershipPlan from '@/models/membershipPlan';
import CustomerMembership from '@/models/customerMembership';
import Invoice from '@/models/invoice';
import Appointment from '@/models/appointment';
import LoyaltyTransaction from '@/models/loyaltyTransaction';
import mongoose from 'mongoose';

// Interface for the items received in the request body for the bill
interface BillItemPayload {
    itemType: 'service' | 'product' | 'membership';
    itemId?: string;
    name: string;
    unitPrice: number;
    quantity?: number;
}

interface BillingRequestBody {
    customerId: string;
    appointmentId?: string;
    items: BillItemPayload[];
    paymentMethod: string;
    notes?: string;
}

export async function POST(req: Request) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    await connectToDatabase();
    const body = await req.json() as BillingRequestBody;

    const { customerId, appointmentId, items, paymentMethod, notes } = body;

    if (!customerId || !items || items.length === 0 || !paymentMethod) {
      await session.abortTransaction(); session.endSession();
      return NextResponse.json({ success: false, message: "Customer ID, items, and payment method are required." }, { status: 400 });
    }
    const customer = await Customer.findById(customerId).session(session);
    if (!customer) {
      await session.abortTransaction(); session.endSession();
      return NextResponse.json({ success: false, message: "Customer not found." }, { status: 404 });
    }

    const invoiceLineItems: any[] = [];
    let calculatedSubTotal = 0;
    let newCustomerMembershipId: mongoose.Types.ObjectId | null = null;
    let totalPointsToAward = 0; // Initialize points counter

    // --- Process each item in the bill ---
    for (const item of items) {
      const quantity = item.quantity || 1;
      const finalPriceForItem = item.unitPrice * quantity;

      invoiceLineItems.push({
        itemType: item.itemType,
        itemId: item.itemId ? new mongoose.Types.ObjectId(item.itemId) : undefined,
        name: item.name,
        quantity: quantity,
        unitPrice: item.unitPrice,
        discountApplied: 0,
        finalPrice: finalPriceForItem,
      });
      calculatedSubTotal += finalPriceForItem;

      // ===> THIS IS THE CORRECTED LOGIC <===
      // If the item is a service, award 1 point.
      if (item.itemType === 'service') {
        totalPointsToAward += 1; // Add 1 point for this service.
      }
      
      // --- Process new membership purchase ---
      if (item.itemType === 'membership' && item.itemId) {
        const plan = await MembershipPlan.findById(item.itemId).session(session);
        if (!plan) { throw new Error(`Membership plan with ID ${item.itemId} not found.`); }
        const startDate = new Date();
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + plan.durationDays);
        const newMembership = new CustomerMembership({
          customerId: customer._id, membershipPlanId: plan._id, startDate, endDate, status: 'Active', pricePaid: item.unitPrice,
        });
        await newMembership.save({ session });
        newCustomerMembershipId = newMembership._id;
      }
    }

    const grandTotal = calculatedSubTotal;

    // --- Create the Invoice ---
    const newInvoice = new Invoice({
      customerId: customer._id,
      appointmentId: appointmentId ? new mongoose.Types.ObjectId(appointmentId) : undefined,
      lineItems: invoiceLineItems,
      subTotal: calculatedSubTotal,
      grandTotal,
      paymentMethod,
      paymentStatus: 'Paid',
      notes,
      purchasedMembershipId: newCustomerMembershipId,
    });
    await newInvoice.save({ session });

    // --- Update Appointment ---
    if (appointmentId) {
      await Appointment.findByIdAndUpdate(appointmentId, {
        status: 'Paid',
        invoiceId: newInvoice._id,
        amount: grandTotal,
      }, { session });
    }

    // --- Award the Points (if any were earned) ---
    if (totalPointsToAward > 0) {
      await Customer.updateOne(
        { _id: customer._id },
        { $inc: { loyaltyPoints: totalPointsToAward } },
        { session }
      );
      await LoyaltyTransaction.create([{
        customerId: customer._id,
        points: totalPointsToAward,
        type: 'Credit',
        reason: `Points earned from services on Invoice`,
        relatedAppointmentId: appointmentId ? new mongoose.Types.ObjectId(appointmentId) : undefined,
      }], { session });
    }

    await session.commitTransaction();
    session.endSession();

    return NextResponse.json({
      success: true,
      message: "Billing completed successfully and invoice created.",
      invoiceId: newInvoice._id.toString(),
      customerMembershipId: newCustomerMembershipId ? newCustomerMembershipId.toString() : null,
      pointsAwarded: totalPointsToAward,
    }, { status: 201 });

  } catch (error: any) {
    await session.abortTransaction();
    session.endSession();
    console.error("Billing API Error:", error);
    if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map((err: any) => err.message);
        return NextResponse.json({ success: false, message: "Validation failed.", errors: messages }, { status: 400 });
    }
    return NextResponse.json({ success: false, message: error.message || "An unexpected error occurred during billing." }, { status: 500 });
  }
}