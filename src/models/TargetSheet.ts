// src/models/TargetSheet.ts
import mongoose, { Schema, Document, models, Model } from 'mongoose';

// --- Define your plain data interfaces ---
// (These might already exist in your file)
interface SummaryMetrics {
  service: number; retail: number; netSales: number; bills: number; abv: number; callbacks: number; appointmentsFromCallbacks: number;
}
interface HeadingToMetrics extends SummaryMetrics {
  serviceInPercentage: number; retailInPercentage: number; netSalesInPercentage: number; billsInPercentage: number; abvInPercentage: number; callbacksInPercentage: number; appointmentsInPercentage: number;
}
interface SummaryData {
  target: SummaryMetrics; achieved: SummaryMetrics; headingTo: HeadingToMetrics;
}
interface DailyRecord {
  date: string; day: string; netSalesAchieved: number; achievePercentage: number; bills: number; abvAchieved: number; callbacksDone: number; appointmentsFromCallbacks: number;
}

// FIX: Make sure this interface is EXPORTED.
// This represents the PURE DATA without any Mongoose methods.
export interface TargetSheetData {
  summary: SummaryData;
  dailyRecords: DailyRecord[];
}

// This is the Mongoose Document interface. It combines the pure data with Document properties.
export interface ITargetData extends TargetSheetData, Document {}

// Your schema uses the plain data structure
const TargetDataSchema: Schema = new Schema<TargetSheetData>({
  summary: {
    target: { service: Number, retail: Number, netSales: Number, bills: Number, abv: Number, callbacks: Number, appointmentsFromCallbacks: Number },
    achieved: { service: Number, retail: Number, netSales: Number, bills: Number, abv: Number, callbacks: Number, appointmentsFromCallbacks: Number },
    headingTo: { service: Number, retail: Number, netSales: Number, bills: Number, abv: Number, callbacks: Number, appointmentsFromCallbacks: Number, serviceInPercentage: Number, retailInPercentage: Number, netSalesInPercentage: Number, billsInPercentage: Number, abvInPercentage: Number, callbacksInPercentage: Number, appointmentsInPercentage: Number }
  },
  dailyRecords: [
      { date: String, day: String, netSalesAchieved: Number, achievePercentage: Number, bills: Number, abvAchieved: Number, callbacksDone: Number, appointmentsFromCallbacks: Number }
  ]
}, { timestamps: true });

const TargetData: Model<ITargetData> = models.TargetSheet || mongoose.model<ITargetData>('TargetSheet', TargetDataSchema);

export default TargetData;