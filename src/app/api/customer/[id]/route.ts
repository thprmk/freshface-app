import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongodb';
import Customer from '@/models/customermodel';
import Appointment from '@/models/appointment';
import CustomerMembership from '@/models/customerMembership';
import MembershipPlan from '@/models/membershipPlan';
import LoyaltyTransaction from '@/models/loyaltyTransaction'; // ===> 1. IMPORT NEW MODEL
import mongoose from 'mongoose';

// --- LEAN INTERFACES FOR TYPE-SAFE MONGOOSE OPERATIONS ---

interface LeanCustomer {
    _id: mongoose.Types.ObjectId;
    name: string;
    email: string;
    phoneNumber: string;
    createdAt?: Date;
    updatedAt?: Date;
    loyaltyPoints?: number; // ===> 2. ADD LOYALTY POINTS TO CUSTOMER INTERFACE
    [key: string]: any;
}

interface LeanAppointment {
    _id: mongoose.Types.ObjectId;
    customerId: mongoose.Types.ObjectId;
    service?: string;
    style?: string;
    stylist?: string;
    date?: Date;
    time?: string;
    notes?: string;
    status?: string;
    [key:string]: any;
}

interface LeanMembershipPlan {
    _id: mongoose.Types.ObjectId;
    name: string;
    benefits?: string[];
    discountPercentageServices?: number;
    [key:string]: any;
}

interface LeanCustomerMembership {
    _id: mongoose.Types.ObjectId;
    membershipPlanId: mongoose.Types.ObjectId | LeanMembershipPlan;
    status: string;
    startDate: Date;
    endDate: Date;
    [key:string]: any;
}

// ===> 3. ADD NEW INTERFACE FOR LOYALTY TRANSACTIONS
interface LeanLoyaltyTransaction {
  _id: mongoose.Types.ObjectId;
  points: number;
  type: 'Credit' | 'Debit';
  reason: string;
  createdAt?: Date;
}


export async function GET(req: Request, { params }: { params?: { id: string } }) {
  try {
    await connectToDatabase();

    let customerIdParam: string | null = null;
    if (params?.id) {
        customerIdParam = params.id;
    } else {
        const { searchParams } = new URL(req.url);
        customerIdParam = searchParams.get('id');
    }

    if (!customerIdParam) {
         return NextResponse.json({ success: false, message: "Customer ID is required." }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(customerIdParam)) {
      return NextResponse.json({ success: false, message: 'Invalid customer ID format' }, { status: 400 });
    }

    const customerObject = await Customer.findById(customerIdParam).lean<LeanCustomer | null>();

    if (!customerObject) {
      return NextResponse.json({ success: false, message: 'Customer not found' }, { status: 404 });
    }

    // ===> 4. PERFORMANCE OPTIMIZATION: Run independent queries in parallel
    // This fetches appointments, memberships, and loyalty history at the same time,
    // significantly reducing the total wait time for the API response.
    const [appointments, activeCustomerMembership, loyaltyHistory] = await Promise.all([
        Appointment.find({ customerId: customerObject._id })
          .sort({ date: -1, time: -1 })
          .lean<LeanAppointment[]>(),

        CustomerMembership.findOne({
          customerId: customerObject._id,
          status: 'Active',
          endDate: { $gte: new Date() }
        })
        .populate<{ membershipPlanId: LeanMembershipPlan | mongoose.Types.ObjectId }>('membershipPlanId')
        .lean<LeanCustomerMembership | null>(),

        LoyaltyTransaction.find({ customerId: customerObject._id })
          .sort({ createdAt: -1 }) // Get the most recent transactions first
          .limit(20) // Limit history to prevent overly large responses
          .lean<LeanLoyaltyTransaction[]>()
    ]);


    // --- Process the results from the parallel queries ---

    // Calculate customer activity status
    let customerActivityStatus: 'Active' | 'Inactive' | 'New' = 'New';
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
    const lastAppointmentForStatus = appointments.length > 0 ? appointments[0] : null;

    if (lastAppointmentForStatus?.date) {
      const lastAppointmentDate = new Date(lastAppointmentForStatus.date);
      customerActivityStatus = lastAppointmentDate >= twoMonthsAgo ? 'Active' : 'Inactive';
    } else if (customerObject.createdAt) {
      const customerCreationDate = new Date(customerObject.createdAt);
      customerActivityStatus = customerCreationDate < twoMonthsAgo ? 'Inactive' : 'New';
    }

    // Format current membership data
    let currentMembershipAPIData = null;
    if (activeCustomerMembership?.membershipPlanId && typeof activeCustomerMembership.membershipPlanId === 'object' && '_id' in activeCustomerMembership.membershipPlanId) {
      const plan = activeCustomerMembership.membershipPlanId as LeanMembershipPlan;
      currentMembershipAPIData = {
        planName: plan.name,
        status: activeCustomerMembership.status,
        startDate: new Date(activeCustomerMembership.startDate).toISOString(),
        endDate: new Date(activeCustomerMembership.endDate).toISOString(),
        benefits: plan.benefits || [],
      };
    }

    // ===> 5. CONSTRUCT THE FINAL RESPONSE OBJECT WITH ALL DATA
    const customerForResponse = {
      ...customerObject,
      id: customerObject._id.toString(),
      _id: customerObject._id.toString(),
      createdAt: customerObject.createdAt ? new Date(customerObject.createdAt).toISOString() : undefined,
      updatedAt: customerObject.updatedAt ? new Date(customerObject.updatedAt).toISOString() : undefined,
      status: customerActivityStatus,
      appointmentHistory: appointments.map(apt => ({
        ...apt,
        id: apt._id.toString(),
        _id: apt._id.toString(),
        customerId: apt.customerId.toString(),
        service: apt.style || apt.service || 'Unknown Service',
        date: apt.date ? new Date(apt.date).toISOString() : new Date().toISOString(),
        time: apt.time || 'N/A',
        status: apt.status || 'Unknown',
      })),
      currentMembership: currentMembershipAPIData,
      // Add the new loyalty data
      loyaltyPoints: customerObject.loyaltyPoints || 0,
      loyaltyHistory: loyaltyHistory.map(log => ({
          ...log,
          id: log._id.toString(),
          _id: log._id.toString(),
          createdAt: log.createdAt ? new Date(log.createdAt).toISOString() : undefined,
      })),
    };

    return NextResponse.json({ success: true, customer: customerForResponse }, { status: 200 });

  } catch (err: any) {
    console.error('API Error in GET /api/customer/[id]:', err);
    // Avoid leaking detailed error info in production unless intended
    const errorMessage = process.env.NODE_ENV === 'development' ? String(err) : 'Failed to fetch customer data';
    return NextResponse.json(
      { success: false, message: err.message || 'An internal server error occurred', error: errorMessage },
      { status: 500 }
    );
  }
}