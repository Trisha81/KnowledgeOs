import mongoose, { Schema, Document as MongooseDocument } from 'mongoose';

const CATEGORIES = ['Engineering', 'HR & People', 'Finance', 'Marketing', 'Sales', 'Legal', 'Product', 'Other'];
const DOCUMENT_TYPES = ['SOP', 'FAQ', 'Key Insight', 'Guide', 'Policy', 'Other'];

export interface IDocument extends MongooseDocument {
  title: string;
  content: string;
  summary?: string;
  category: string;
  type: string;
  tags: string[];
  faqs: Array<{ q: string; a: string }>;
  keyInsights: string[];
  authorId?: mongoose.Types.ObjectId;
  embeddingId?: string;
  critical: boolean;
  views: number;
  searches: number;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentSchema = new Schema<IDocument>({
  title: { type: String, required: true, index: 'text' },
  content: { type: String, required: true },
  summary: String,
  category: { type: String, enum: CATEGORIES, index: true },
  type: { type: String, enum: DOCUMENT_TYPES },
  tags: [{ type: String, index: true }],
  faqs: [{ q: String, a: String }],
  keyInsights: [String],
  authorId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  embeddingId: String,  // Pinecone vector ID
  critical: { type: Boolean, default: false },
  views: { type: Number, default: 0 },
  searches: { type: Number, default: 0 },
}, { timestamps: true });

export const Document = mongoose.model<IDocument>('Document', DocumentSchema);
