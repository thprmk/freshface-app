// models/appointment.ts
import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  style: { type: String, required: true },
  stylist: { type: String, required: true },

  date: { type: Date, required: true },
  time: { type: String, required: true },
  notes: { type: String },
  status: {
    type: String,
    enum: ['Scheduled', 'Completed', 'Cancelled', 'No-Show', 'InProgress', 'Billed', 'Paid'],
    default: 'Scheduled'
  },
  invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', index: true, sparse: true },
}, { timestamps: true });

// ===> ADD THIS COMPOUND INDEX <===
// This index is crucial for the performance of your API.
// It allows MongoDB to quickly find all appointments for a customer
// AND retrieve them already sorted by date and time.
appointmentSchema.index({ customerId: 1, date: -1, time: -1 });

export default mongoose.models.Appointment || mongoose.model('Appointment', appointmentSchema);