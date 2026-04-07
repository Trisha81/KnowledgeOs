import 'dotenv/config';
// Fix for Windows Node.js 18+ OpenSSL 3.0 compatibility with MongoDB Atlas
if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import { documentsRouter } from './routes/documents';
import { chatRouter } from './routes/chat';
import { usersRouter } from './routes/users';
import { gapsRouter } from './routes/gaps';
import { githubRouter } from './routes/github';
import { analyticsRouter } from './routes/analytics';
import { authRouter } from './routes/auth';

const app = express();
const isDev = process.env.NODE_ENV !== 'production';

// Security middleware
app.use(helmet());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
  ],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting — disabled in dev, production-only
if (!isDev) {
  app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 500 }));
  app.use('/api/chat', rateLimit({ windowMs: 60 * 1000, max: 30 }));
  app.use('/api/github', rateLimit({ windowMs: 15 * 60 * 1000, max: 300 }));
}

// Health check — always works, never rate-limited
app.get('/health', (_req, res) => res.json({ ok: true }));

// Routes
app.use('/api/auth',      authRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/chat',      chatRouter);
app.use('/api/users',     usersRouter);
app.use('/api/gaps',      gapsRouter);
app.use('/api/github',    githubRouter);
app.use('/api/analytics', analyticsRouter);

// Database — non-fatal, server runs even if MongoDB is down
if (process.env.MONGODB_URI) {
  const connectMongo = () => {
    mongoose.connect(process.env.MONGODB_URI!, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    })
      .then(() => console.log('✅ Connected to MongoDB'))
      .catch((err: Error) => {
        const msg = err.message?.split('\n')[0] || err.message;
        console.warn(`⚠️  MongoDB unavailable (non-fatal): ${msg}`);
        setTimeout(connectMongo, 30000); // retry silently every 30s
      });
  };
  connectMongo();
}

// Start server
const PORT = process.env.PORT || 3001;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT} [${isDev ? 'DEV — no rate limits' : 'PROD'}]`);
  });
}

export default app;


