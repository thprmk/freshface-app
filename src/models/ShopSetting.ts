// lib/models/ShopSetting.ts

import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IShopSetting extends Document {
  key: string; // A unique key to ensure we only have one settings document
  defaultDailyHours: number;
  defaultOtRate: number;
  defaultExtraDayRate: number;
}

const ShopSettingSchema: Schema<IShopSetting> = new Schema({
  // We use this static key to always find the single settings document for the shop.
  key: {
    type: String,
    unique: true,
    required: true,
    default: 'defaultSettings', 
  },
  defaultDailyHours: {
    type: Number,
    required: [true, 'Default daily working hours are required.'],
    default: 8,
  },
  defaultOtRate: {
    type: Number,
    required: [true, 'Default OT rate is required.'],
    default: 50,
  },
  defaultExtraDayRate: {
    type: Number,
    required: [true, 'Default extra day rate is required.'],
    default: 100,
  },
}, { timestamps: true });

// Prevent recompilation of the model if it already exists
const ShopSetting: Model<IShopSetting> = mongoose.models.ShopSetting || mongoose.model<IShopSetting>('ShopSetting', ShopSettingSchema);

export default ShopSetting;