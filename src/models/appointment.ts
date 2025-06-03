import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema({
  customerName: { type: String, required: true },
  phoneNumber: { type: String, required: true ,unique: true },
  email: { type: String, required: true },
  style: { type: String, required: true },
  stylist: { type: String, required: true },
  date: { type: String, required: true },   // You might consider Date type here, but string works too
  time: { type: String, required: true },
  paymentMethod: { type: String, required: true },
  products: [{ type: String }], // or [mongoose.Schema.Types.ObjectId] if referencing another collection
}, { timestamps: true });

export default mongoose.models.Appointment || mongoose.model('Appointment', appointmentSchema);
