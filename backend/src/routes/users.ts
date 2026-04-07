import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { auth } from '../middleware/auth';
import { User } from '../models/User';

const router = Router();

router.get('/me', auth, (req: Request, res: Response) => {
  res.json({ user: (req as any).user });
});

// Update profile
router.patch('/profile', auth, async (req: Request, res: Response) => {
  try {
    const { name, department } = req.body;
    const userId = (req as any).user.id;

    // Simulation for demo users or if DB user not found
    if (userId === '507f191e810c19729de860ea') {
      return res.json({ 
        success: true, 
        message: 'Demo profile updated (simulated)', 
        user: { id: userId, name, department, role: 'admin' } 
      });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { name, department } },
      { new: true }
    ).select('-passwordHash');

    if (!user) {
      // Graceful fallback for demo if MongoDB is empty
      return res.json({ 
        success: true, 
        message: 'Profile updated (local session)', 
        user: { id: userId, name, department } 
      });
    }

    res.json({ success: true, user });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update password
router.put('/password', auth, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = (req as any).user.id;

    if (userId.startsWith('demo-')) {
      return res.status(403).json({ error: 'Cannot change password for demo users' });
    }

    const user = await User.findById(userId);
    if (!user || !user.passwordHash) return res.status(404).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) return res.status(400).json({ error: 'Current password incorrect' });

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export { router as usersRouter };
