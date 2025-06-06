import { ObjectId } from 'mongodb';

export interface AttendanceRecord {
  id: ObjectId | string;
  staffId: ObjectId | string;
  date: Date;
  checkIn: Date;
  checkOut?: Date;
  status: 'present' | 'absent' | 'late' | 'incomplete';
  totalWorkingMinutes: number;
  isWorkComplete: boolean;
  temporaryExits: TemporaryExit[];
}

export interface TemporaryExit {
  id: ObjectId | string;
  attendanceId: ObjectId | string;
  startTime: Date;
  endTime: Date;
  reason: string;
  durationMinutes: number;
}

export interface AttendanceResponse {
  success: boolean;
  data?: AttendanceRecord | AttendanceRecord[];
  error?: string;
} 