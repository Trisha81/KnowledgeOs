import mongoose, { Schema, Document as MongooseDocument } from 'mongoose';

export interface IChatHistory extends MongooseDocument {
  sessionId: string;
  userId?: mongoose.Types.ObjectId;
  role: 'user' | 'assistant';
  content: string;
  references: Array<{ docId: string; title: string; score: number }>;
}

const ChatHistorySchema = new Schema<IChatHistory>({
  sessionId: { type: String, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User' },
  role: { type: String, enum: ['user', 'assistant'] },
  content: String,
  references: [{ docId: String, title: String, score: Number }],
}, { timestamps: true });

export const ChatHistory = mongoose.model<IChatHistory>('ChatHistory', ChatHistorySchema);
