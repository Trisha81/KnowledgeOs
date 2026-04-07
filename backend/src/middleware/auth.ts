import { Request, Response, NextFunction } from 'express';

export const auth = (req: Request, res: Response, next: NextFunction) => {
  // In a real app, verify the JWT token
  // For demo purposes, we inject a mock user with a valid-length ObjectId
  (req as any).user = { id: '507f191e810c19729de860ea', name: 'Knowledge Admin', role: 'admin' };
  next();
};
