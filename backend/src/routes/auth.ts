import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'knowledgeos-dev-secret-change-in-production';
const JWT_EXPIRES = '7d';

/* ── Demo/seed credentials (used when MongoDB is unavailable) ── */
const DEMO_USERS = [
  {
    id: 'demo-admin-001',
    name: 'Admin User',
    email: 'admin@knowledgeos.dev',
    passwordHash: bcrypt.hashSync('admin123', 10),
    role: 'admin' as const,
    department: 'Engineering',
    active: true,
  },
  {
    id: 'demo-employee-001',
    name: 'Employee User',
    email: 'employee@knowledgeos.dev',
    passwordHash: bcrypt.hashSync('employee123', 10),
    role: 'employee' as const,
    department: 'Product',
    active: true,
  },
];

function makeToken(user: { id: string; email: string; role: string; name: string }) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

/* ─── POST /auth/login ─────────────────────────────────────────── */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // 1. Try demo users first (always available)
    const demoUser = DEMO_USERS.find((u) => u.email === email.toLowerCase());
    if (demoUser) {
      const valid = await bcrypt.compare(password, demoUser.passwordHash);
      if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

      const token = makeToken(demoUser);
      return res.json({
        token,
        user: { id: demoUser.id, name: demoUser.name, email: demoUser.email, role: demoUser.role, department: demoUser.department },
      });
    }

    // 2. Try MongoDB (if connected)
    try {
      const dbUser = await User.findOne({ email: email.toLowerCase() });
      if (!dbUser || !dbUser.passwordHash) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      const valid = await bcrypt.compare(password, dbUser.passwordHash);
      if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

      const token = makeToken({ id: String(dbUser._id), email: dbUser.email, role: dbUser.role, name: dbUser.name });
      return res.json({
        token,
        user: { id: String(dbUser._id), name: dbUser.name, email: dbUser.email, role: dbUser.role, department: dbUser.department },
      });
    } catch {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── POST /auth/register ──────────────────────────────────────── */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, department } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Check demo conflicts
    if (DEMO_USERS.find((u) => u.email === email.toLowerCase())) {
      return res.status(409).json({ error: 'Email already in use' });
    }

    // Try to create in MongoDB
    try {
      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) return res.status(409).json({ error: 'Email already in use' });

      const passwordHash = await bcrypt.hash(password, 10);
      const dbUser = await User.create({ name, email: email.toLowerCase(), passwordHash, role: 'viewer', department, active: true });

      const token = makeToken({ id: String(dbUser._id), email: dbUser.email, role: dbUser.role, name: dbUser.name });
      return res.status(201).json({
        token,
        user: { id: String(dbUser._id), name: dbUser.name, email: dbUser.email, role: dbUser.role },
      });
    } catch {
      // MongoDB unavailable — create an in-memory session token
      const tempId = `temp-${Date.now()}`;
      const token = makeToken({ id: tempId, email: email.toLowerCase(), role: 'viewer', name });
      return res.status(201).json({
        token,
        user: { id: tempId, name, email: email.toLowerCase(), role: 'viewer', department },
        warning: 'Account created in session only (database unavailable)',
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/* ─── GET /auth/me ─────────────────────────────────────────────── */
router.get('/me', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  try {
    const payload = jwt.verify(authHeader.slice(7), JWT_SECRET);
    res.json({ user: payload });
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

export { router as authRouter };
