import { Router, Request, Response } from 'express';
import multer from 'multer';
import { auth } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';
import { AIService } from '../services/ai.service';
import { EmbeddingService } from '../services/embedding.service';
import { PineconeService } from '../services/pinecone.service';
import { Document } from '../models/Document';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Stub file parser
async function parseFile(buffer: Buffer, mimetype: string): Promise<string> {
  return "Parsed text from file...";
}

const MOCK_DOCS = [
  { _id: '1', title: 'Employee Handbook v2.4 (HR/IT Hub)', category: 'HR & People', type: 'Policy', summary: 'Covers VPN setup, travel expenses, and basic HR onboarding.', createdAt: new Date() },
  { _id: '2', title: 'Transcript_Global_Townhall_Q3.mp4', category: 'Executive', type: 'Meeting', summary: 'Q3 Marketing decisions: 15% budget shifted to LinkedIn B2B, product launch delayed to mid-August.', createdAt: new Date(Date.now() - 86400000) },
  { _id: '3', title: 'ADR-042-Database-Selection.md', category: 'Engineering', type: 'Architecture', summary: 'Explains the 2024 decision to use MongoDB over PostgreSQL for the User Service for schematic flexibility.', createdAt: new Date(Date.now() - 86400000 * 2) },
  { _id: '4', title: 'Historical_RFPs_2024 & Product_Specs_v9', category: 'Sales', type: 'Sales Enablement', summary: 'Previous successful RFP responses including federated identity and data retention policies.', createdAt: new Date(Date.now() - 86400000 * 3) },
  { _id: '5', title: 'MSA_VendorX_Final_Signed.pdf', category: 'Legal', type: 'Contract', summary: 'Clause 8 outlines termination conditions: 90 days for convenience, 30 days for material breach.', createdAt: new Date(Date.now() - 86400000 * 4) }
];

// Upload and process a document
router.post('/upload', auth, requireRole(['admin', 'employee']), upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { title, category, content } = req.body;
    let rawText = '';

    if (content) {
      // Use parsed content if the frontend already extracted the text
      rawText = content;
    } else if (req.file) {
      // Robustly handle text-based files on the backend
      if (req.file.mimetype.startsWith('text/') || req.file.originalname.match(/\.(md|json|csv)$/i)) {
        rawText = req.file.buffer.toString('utf-8');
      } else {
        rawText = await parseFile(req.file.buffer, req.file.mimetype);
      }
    }

    if (!rawText) return res.status(400).json({ error: 'No content provided' });

    // AI processing pipeline
    const [processed, embedding] = await Promise.all([
      AIService.processDocument(rawText),
      EmbeddingService.embed(rawText)
    ]);

    // Save to MongoDB
    const doc = await Document.create({
      title: title || processed.summary?.slice(0, 60) || 'Untitled Analysis',
      content: rawText,
      category: category || processed.category || 'General',
      type: processed.type || 'Document',
      summary: processed.summary || rawText.slice(0, 200),
      tags: processed.tags || [],
      keyInsights: processed.keyInsights || [],
      authorId: (req as any).user.id,
      embeddingId: `doc_${Date.now()}`,
    });

    // Save embedding to Pinecone
    await PineconeService.upsert(doc._id.toString(), embedding, {
      title: doc.title, category: doc.category, type: doc.type,
      content: rawText, authorId: (req as any).user.id,
      createdAt: (doc as any).createdAt.toISOString()
    });

    res.json({ success: true, document: doc });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get all documents with search + filters
router.get('/', auth, async (req: Request, res: Response) => {
  const { search, category, type, page = 1, limit = 20 } = req.query;
  
  const filter: any = {};
  if (category) filter.category = category;
  if (type) filter.type = type;
  if (search) filter.$text = { $search: search as string };

  const docs = await Document.find(filter)
    .sort({ updatedAt: -1 })
    .skip((+page - 1) * +limit)
    .limit(+limit)
    .populate('authorId', 'name email');

  const total = await Document.countDocuments(filter);

  if (docs.length === 0 && !search) {
    return res.json({ docs: MOCK_DOCS, total: MOCK_DOCS.length, page: 1, pages: 1 });
  }

  res.json({ docs, total, page: +page, pages: Math.ceil(total / +limit) });
});

// Get a single document
router.get('/:id', auth, async (req: Request, res: Response) => {
  try {
    const doc = await Document.findById(req.params.id).populate('authorId', 'name email');
    if (!doc) {
      // Check if it's one of the mock docs
      const mock = MOCK_DOCS.find(m => m._id === req.params.id);
      if (mock) return res.json(mock);
      return res.status(404).json({ error: 'Document not found' });
    }
    res.json(doc);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a document
router.delete('/:id', auth, requireRole(['admin']), async (req: Request, res: Response) => {
  try {
    const doc = await Document.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });

    // 1. Delete from vector store
    try {
      await PineconeService.delete(doc._id.toString());
    } catch (veceerr) {
      console.warn('Failed to delete embedding from Pinecone:', veceerr);
    }

    // 2. Delete from MongoDB
    await Document.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Document deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export { router as documentsRouter };
