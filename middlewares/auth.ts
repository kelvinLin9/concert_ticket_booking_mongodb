import jwt from 'jsonwebtoken';
import User from '../models/user.js';
import { Request, Response, NextFunction } from 'express';

interface CustomRequest extends Request {
  user?: any;
  token?: string;
}

interface JwtPayload {
  id: string;
}

export const auth = async (req: CustomRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: '請先登入' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || '') as JwtPayload;
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: '找不到該用戶' });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ message: '認證失敗' });
  }
};

export const adminAuth = async (req: CustomRequest, res: Response, next: NextFunction) => {
  try {
    await auth(req, res, () => {
      if (req.user.role !== 'admin' && req.user.role !== 'superuser') {
        return res.status(403).json({ message: '權限不足' });
      }
      next();
    });
  } catch (error) {
    res.status(401).json({ message: '認證失敗' });
  }
};

export const teacherAuth = async (req: CustomRequest, res: Response, next: NextFunction) => {
  try {
    await auth(req, res, () => {
      if (req.user.role !== 'teacher' && req.user.role !== 'admin' && req.user.role !== 'superuser') {
        return res.status(403).json({ message: '權限不足' });
      }
      next();
    });
  } catch (error) {
    res.status(401).json({ message: '認證失敗' });
  }
}; 