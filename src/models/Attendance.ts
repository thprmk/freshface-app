import mongoose, { Schema, Document, Types } from 'mongoose';
import { IStaff } from './staff'; // Assuming your staff model exports this interface
import { ITemporaryExit } from './TemporaryExit';

export interface IAttendance extends Document {
  staffId: Types.ObjectId | IStaff; // Can be populated
  date: Date;
  checkIn: Date | null;
  checkOut: Date | null;
  status: 'present' | 'absent' | 'late' | 'incomplete' | 'on_leave';
  temporaryExits: (Types.ObjectId | ITemporaryExit)[]; // Array of ObjectIds or populated exits
  totalWorkingMinutes: number;
  isWorkComplete: boolean;
  notes?: string;
}

const AttendanceSchema: Schema = new Schema({
  staffId: { type: Schema.Types.ObjectId, ref: 'Staff', required: true },
  date: { type: Date, required: true },
  checkIn: { type: Date, default: null },
  checkOut: { type: Date, default: null },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'incomplete', 'on_leave'],
    required: true,
  },
  temporaryExits: [{ type: Schema.Types.ObjectId, ref: 'TemporaryExit' }],
  totalWorkingMinutes: { type: Number, default: 0 },
  isWorkComplete: { type: Boolean, default: false },
  notes: { type: String, trim: true },
}, { timestamps: true });

export default mongoose.models.Attendance || mongoose.model<IAttendance>('Attendance', AttendanceSchema);