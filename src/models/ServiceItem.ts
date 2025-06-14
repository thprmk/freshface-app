import mongoose, { Document, Schema, Model, models } from 'mongoose';
import { IServiceSubCategory } from './ServiceSubCategory';
import { IProduct } from './Product';

export interface IServiceConsumable {
  product: mongoose.Types.ObjectId | IProduct;
  quantity: number;
  unit: string;
}

export interface IServiceItem extends Document {
  _id: string;
  name: string;
  price: number;
  duration: number;
  subCategory: mongoose.Types.ObjectId | IServiceSubCategory;
  consumables: IServiceConsumable[];
}

const ServiceConsumableSchema: Schema = new Schema({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true },
  unit: { type: String, required: true },
}, { _id: false });

const ServiceItemSchema: Schema<IServiceItem> = new Schema({
  name: { type: String, required: true, trim: true },
  price: { type: Number, required: true },
  duration: { type: Number, required: true },
  subCategory: { type: Schema.Types.ObjectId, ref: 'ServiceSubCategory', required: true },
  consumables: [ServiceConsumableSchema],
}, { timestamps: true });

const ServiceItemModel: Model<IServiceItem> = models.ServiceItem || mongoose.model<IServiceItem>('ServiceItem', ServiceItemSchema);
export default ServiceItemModel;