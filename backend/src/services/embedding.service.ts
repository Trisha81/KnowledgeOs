import OpenAI from 'openai';

const apiKey = process.env.OPENAI_API_KEY || '';
const isDummy = !apiKey || apiKey.includes('dummy') || apiKey.length < 20;

const openai = isDummy ? null : new OpenAI({ apiKey });

export class EmbeddingService {
  static async embed(text: string): Promise<number[]> {
    if (isDummy) {
      // Return 1536 zero-vector for local development/demo
      return new Array(1536).fill(0);
    }
    
    // Chunk text if too long (>8000 tokens)
    const cleanText = text.slice(0, 8000).replace(/\n+/g, ' ');

    const response = await openai!.embeddings.create({
      model: 'text-embedding-3-small',  // 1536 dimensions, fast & cheap
      input: cleanText,
    });

    return response.data[0].embedding;
  }

  static async embedBatch(texts: string[]): Promise<number[][]> {
    if (isDummy) {
      return texts.map(() => new Array(1536).fill(0));
    }

    const response = await openai!.embeddings.create({
      model: 'text-embedding-3-small',
      input: texts.map(t => t.slice(0, 8000)),
    });
    return response.data.map(d => d.embedding);
  }
}
