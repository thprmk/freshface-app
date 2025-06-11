// models/invoice.ts
import mongoose from 'mongoose';

const lineItemSchema = new mongoose.Schema({
  itemType: {
    type: String,
    enum: ['service', 'product', 'membership'],
    required: true
  },
  itemId: { // Can refer to Service, Product, or MembershipPlan _id
    type: mongoose.Schema.Types.ObjectId,
    // required: true, // Not strictly required if name is always present
    // You might add 'refPath' if you want dynamic referencing based on itemType
  },
  name: { // Name of the service, product, or membership plan
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    default: 1,
    min: 1
  },
  unitPrice: { // Price per unit before any discounts for this line item
    type: Number,
    required: true
  },
  discountApplied: { // Monetary amount of discount for this line item
    type: Number,
    default: 0
  },
  finalPrice: { // (unitPrice * quantity) - discountApplied
    type: Number,
    required: true
  },
}, { _id: false }); // _id: false for subdocuments if you don't need separate IDs for line items

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { // You might want a user-friendly invoice number
    type: String,
    unique: true,
    // You'd need a pre-save hook or a sequence generator for this
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true,
    index: true
  },
  appointmentId: { // Optional: link to the appointment this invoice is for
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    sparse: true,
    index: true
  },
  lineItems: [lineItemSchema],
  subTotal: { // Sum of all lineItem.finalPrice
    type: Number,
    required: true
  },
  // Example: If you have an overall discount on the bill
  // overallDiscount: {
  //   description: String,
  //   amount: Number,
  // },
  // taxRate: { type: Number, default: 0 }, // e.g., 5 for 5%
  // taxAmount: { type: Number, default: 0 },
  grandTotal: { // Final amount to be paid
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    // enum: ['Cash', 'Card', 'Online', 'Other'] // Be more specific if needed
  },
  paymentStatus: {
    type: String,
    enum: ['Paid', 'Pending', 'Partial', 'Failed', 'Refunded'],
    default: 'Paid' // Assuming POS means it's paid immediately
  },
  notes: {
    type: String,
    trim: true
  },
  // If a new membership was purchased as part of this invoice
  purchasedMembershipId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CustomerMembership',
    sparse: true
  },
  // Staff who processed the invoice
  // processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// TODO: Pre-save hook to generate invoiceNumber if you implement it

export default mongoose.models.Invoice || mongoose.model('Invoice', invoiceSchema);