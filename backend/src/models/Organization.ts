import mongoose, { Schema, Document as MongooseDocument } from 'mongoose';

export interface IOrganization extends MongooseDocument {
  name: string;
}

const OrganizationSchema = new Schema<IOrganization>({
  name: { type: String, required: true },
}, { timestamps: true });

export const Organization = mongoose.model<IOrganization>('Organization', OrganizationSchema);
