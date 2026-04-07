import { Router, Request, Response } from 'express';
import { auth } from '../middleware/auth';
import { GapService } from '../services/gap.service';

const router = Router();

router.get('/', auth, async (req: Request, res: Response) => {
  try {
    const analysis = await GapService.analyze();
    res.json(analysis);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export { router as gapsRouter };
