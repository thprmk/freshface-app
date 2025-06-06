// src/app/api/advance-payments/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { formatISO } from 'date-fns';
import mongoose, { Types } from 'mongoose';
import dbConnect from '../../../../lib/mongodb';
import AdvancePayment from '../../../../models/advance';
import Staff from '../../../../models/staff';

// --- Type Definitions (Shared with main route) ---
interface PopulatedStaffDetails {
  _id: Types.ObjectId;
  name: string;
  image?: string;
  position?: string;
}

interface LeanAdvancePaymentDocument {
  _id: Types.ObjectId;
  staffId: PopulatedStaffDetails;
  requestDate: Date;
  amount: number;
  reason: string;
  repaymentPlan: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface UpdateAdvanceStatusPayload {
    status: 'approved' | 'rejected';
}

// --- Helper Function ---
const formatPaymentResponse = (payment: LeanAdvancePaymentDocument) => ({
  id: payment._id.toString(),
  staffId: {
    id: payment.staffId._id.toString(),
    name: payment.staffId.name,
    image: payment.staffId.image,
    position: payment.staffId.position,
  },
  requestDate: formatISO(payment.requestDate),
  amount: payment.amount,
  reason: payment.reason,
  repaymentPlan: payment.repaymentPlan,
  status: payment.status,
  approvedDate: payment.approvedDate ? formatISO(payment.approvedDate) : null,
  createdAt: formatISO(payment.createdAt),
  updatedAt: formatISO(payment.updatedAt),
});


// --- Route Handlers ---

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const { id: paymentId } = params;

  if (!mongoose.Types.ObjectId.isValid(paymentId)) {
    return NextResponse.json({ success: false, error: 'Invalid payment ID format.' }, { status: 400 });
  }

  try {
    await dbConnect();
    const body = (await request.json()) as UpdateAdvanceStatusPayload;
    
    if (!body.status || !['approved', 'rejected'].includes(body.status)) {
        return NextResponse.json({ success: false, error: 'Invalid status. Must be "approved" or "rejected".' }, { status: 400 });
    }

    const updateFields: { status: 'approved' | 'rejected', approvedDate: Date | null } = {
        status: body.status,
        approvedDate: body.status === 'approved' ? new Date() : null,
    };

    const updatedPayment = await AdvancePayment.findByIdAndUpdate(
        paymentId,
        { $set: updateFields },
        { new: true, runValidators: true }
    )
    .populate<{ staffId: PopulatedStaffDetails }>({ path: 'staffId', select: 'name image position', model: Staff })
    .lean<LeanAdvancePaymentDocument>();

    if (!updatedPayment) {
      return NextResponse.json({ success: false, error: 'Advance payment not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: formatPaymentResponse(updatedPayment) });

  } catch (error: any) {
    console.error(`API PATCH /api/advance-payments/${paymentId} Error:`, error);
    return NextResponse.json({ success: false, error: 'Server error updating advance payment.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    const { id: paymentId } = params;

    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      return NextResponse.json({ success: false, error: 'Invalid payment ID format.' }, { status: 400 });
    }
  
    try {
      await dbConnect();
      const deletedPayment = await AdvancePayment.findByIdAndDelete(paymentId);
  
      if (!deletedPayment) {
        return NextResponse.json({ success: false, error: 'Advance payment not found.' }, { status: 404 });
      }
  
      return NextResponse.json({ success: true, message: 'Advance payment deleted successfully.', data: { id: paymentId } });
  
    } catch (error: any) {
      console.error(`API DELETE /api/advance-payments/${paymentId} Error:`, error);
      return NextResponse.json({ success: false, error: 'Server error deleting advance payment.' }, { status: 500 });
    }
}