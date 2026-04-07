import { Router, Request, Response } from 'express';
import { AIService } from '../services/ai.service';
import { ChatHistory } from '../models/ChatHistory';
import { Message } from '../types';

const router = Router();

const GUEST_USER_ID = 'guest';

router.post('/', async (req: Request, res: Response) => {
  try {
    const { query, sessionId } = req.body;

    if (!query || !sessionId) {
      return res.status(400).json({ error: 'query and sessionId are required' });
    }

    // Load conversation history for context (best-effort — skip if DB not ready)
    let history: Message[] = [];
    try {
      const historyDocs = await ChatHistory.find({ sessionId })
        .sort({ createdAt: -1 })
        .limit(10);
      history = historyDocs
        .map(h => ({ role: h.role, content: h.content }))
        .reverse();
    } catch {
      // MongoDB might not be connected — continue without history
    }

    // Call the RAG-powered AI
    const response = await AIService.chat(query, history);

    // Persist messages (best-effort)
    const userId = (req as any).user?.id ?? GUEST_USER_ID;
    try {
      await ChatHistory.insertMany([
        { sessionId, userId, role: 'user',      content: query    },
        { sessionId, userId, role: 'assistant', content: response },
      ]);
    } catch {
      // Silently skip persistence if DB unavailable
    }

    res.json({ response, sessionId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export { router as chatRouter };
