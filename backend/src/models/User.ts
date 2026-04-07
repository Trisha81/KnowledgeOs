import mongoose, { Schema, Document as MongooseDocument } from 'mongoose';

export interface IUser extends MongooseDocument {
  name: string;
  email: string;
  passwordHash?: string;
  role: 'admin' | 'employee' | 'viewer';
  department?: string;
  active: boolean;
  contributions: number;
  lastActive?: Date;
  orgId?: mongoose.Types.ObjectId;
  id?: string;
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: String,
  role: { type: String, enum: ['admin', 'employee', 'viewer'], default: 'viewer' },
  department: String,
  active: { type: Boolean, default: true },
  contributions: { type: Number, default: 0 },
  lastActive: Date,
  orgId: { type: Schema.Types.ObjectId, ref: 'Organization' },
}, { timestamps: true });

export const User = mongoose.model<IUser>('User', UserSchema);
