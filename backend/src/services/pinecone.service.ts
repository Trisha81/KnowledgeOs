import { Pinecone } from '@pinecone-database/pinecone';

const apiKey = process.env.PINECONE_API_KEY || '';
const isDummy = !apiKey || apiKey.includes('dummy') || apiKey.length < 20;

let index: any = null;
if (!isDummy) {
  try {
    const pinecone = new Pinecone({ apiKey });
    index = pinecone.index('knowledgeos');
  } catch (err) {
    console.warn('Pinecone initialization failed (falling back to dummy mode):', err);
  }
}

export class PineconeService {
  // Store document embedding
  static async upsert(docId: string, embedding: number[], metadata: Record<string, any>) {
    if (!index) return; // Skip in dummy mode

    await index.upsert([{
      id: docId,
      values: embedding,
      metadata: {
        title: metadata.title,
        category: metadata.category,
        type: metadata.type,
        content: metadata.content?.slice(0, 1000),  // Pinecone metadata limit
        authorId: metadata.authorId,
        createdAt: metadata.createdAt,
      }
    }]);
  }

  // Semantic search
  static async query(embedding: number[], topK = 5, filter?: Record<string, any>) {
    if (!index) return []; // Skip in dummy mode

    const results = await index.query({
      vector: embedding,
      topK,
      includeMetadata: true,
      filter,  // e.g., { category: { $eq: 'Engineering' } }
    });
    return results.matches || [];
  }

  // Delete document embedding
  static async delete(docId: string) {
    if (!index) return; // Skip in dummy mode
    await index.deleteOne(docId);
  }
}
