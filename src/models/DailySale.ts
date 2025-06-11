import mongoose, { Document, Schema, Model, Types } from 'mongoose';

export interface IDailySale extends Document {
  staff: Types.ObjectId;
  date: Date;
  serviceSale: number;
  productSale: number;
  reviewsWithName: number;
  reviewsWithPhoto: number;
  dailyIncentive: number; 
}

const DailySaleSchema: Schema = new Schema({
  staff: { type: Schema.Types.ObjectId, ref: 'Staff', required: true },
  date: { type: Date, required: true },
  serviceSale: { type: Number, default: 0 },
  productSale: { type: Number, default: 0 },
  reviewsWithName: { type: Number, default: 0 },
  reviewsWithPhoto: { type: Number, default: 0 },
  dailyIncentive: { type: Number, default: 0 },
}, { timestamps: true });

DailySaleSchema.index({ staff: 1, date: 1 }, { unique: true });

const DailySale: Model<IDailySale> = mongoose.models.DailySale || mongoose.model<IDailySale>('DailySale', DailySaleSchema);

export default DailySale;