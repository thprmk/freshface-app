// Example: src/lib/types/advanceTypes.ts (or similar shared location)
import mongoose, { Types } from 'mongoose';
import { IStaff } from '../../models/staff'; // Adjust path to your IStaff model interface

// Base interface for advance payment data fields
export interface IAdvancePaymentData {
  requestDate: Date;
  amount: number;
  reason: string;
  repaymentPlan: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedDate?: Date | null;
  staffId: Types.ObjectId | string; // Allow string for input, convert to ObjectId in API
}

// For lean documents after population (used by both API routes)
export type PopulatedStaffDetails = {
    _id: Types.ObjectId;
    name: string;
    image?: string;
    position?: string;
};

export type LeanAdvancePaymentDocumentWithPopulatedStaff = Omit<IAdvancePaymentData, 'staffId'> & {
    _id: Types.ObjectId;
    staffId: PopulatedStaffDetails; // Staff is populated
    createdAt: Date;
    updatedAt: Date;
};

export type LeanAdvancePaymentDocumentWithObjectId = IAdvancePaymentData & {
    _id: Types.ObjectId;
    staffId: Types.ObjectId; // Staff is just an ObjectId
    createdAt: Date;
    updatedAt: Date;
};


// For creating a new advance payment (API request body)
export interface NewAdvancePaymentAPIPayload {
  staffId: string; // Expect string from client, convert to ObjectId in API
  amount: number;
  reason: string;
  repaymentPlan: string;
}

// For updating status (API request body for PATCH)
export interface UpdateAdvanceStatusPayload {
  status: 'approved' | 'rejected';
}