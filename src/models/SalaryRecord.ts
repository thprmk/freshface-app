// models/SalaryRecord.ts
import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface ISalaryRecord extends Document {
  _id: Types.ObjectId;
  staffId: Types.ObjectId; 
  month: string; 
  year: number;
  baseSalary: number;
  bonus: number;
  deductions: number;
  advanceDeducted: number;
  netSalary: number;
  isPaid: boolean;
  paidDate: Date | null; 
  createdAt?: Date;
  updatedAt?: Date;
}

const SalaryRecordSchema: Schema<ISalaryRecord> = new Schema(
  {
    staffId: { type: Schema.Types.ObjectId, ref: 'Staff', required: true },
    month: { type: String, required: true },
    year: { type: Number, required: true },
    baseSalary: { type: Number, required: true },
    bonus: { type: Number, default: 0 },
    deductions: { type: Number, default: 0 },
    advanceDeducted: { type: Number, default: 0 },
    netSalary: { type: Number, required: true },
    isPaid: { type: Boolean, default: false },
    paidDate: { type: Date, default: null },
  },
  { timestamps: true }
);

SalaryRecordSchema.index({ staffId: 1, month: 1, year: 1 }, { unique: true });

const SalaryRecord: Model<ISalaryRecord> = 
  mongoose.models.SalaryRecord || mongoose.model<ISalaryRecord>('SalaryRecord', SalaryRecordSchema);

export default SalaryRecord;