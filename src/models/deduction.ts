// src/models/deduction.ts
import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export interface IDeduction extends Document {
  staffId: Types.ObjectId;
  amount: number;
  reason: string;
  date: Date;
  sourceAdvanceId?: Types.ObjectId;
  isApplied: boolean;
  appliedOnSalaryId?: Types.ObjectId;
}

const deductionSchema: Schema<IDeduction> = new Schema(
  {
    staffId: { type: Schema.Types.ObjectId, ref: 'Staff', required: true },
    amount: { type: Number, required: true },
    reason: { type: String, required: true },
    date: { type: Date, default: Date.now },
    sourceAdvanceId: { type: Schema.Types.ObjectId, ref: 'AdvancePayment' }, // Link back to the advance
    isApplied: { type: Boolean, default: false }, // Has this been deducted from a salary yet?
    appliedOnSalaryId: { type: Schema.Types.ObjectId, ref: 'Salary' }, // For tracking which salary it was applied to
  },
  { timestamps: true }
);

const Deduction: Model<IDeduction> =
  mongoose.models.Deduction || mongoose.model<IDeduction>('Deduction', deductionSchema);

export default Deduction;