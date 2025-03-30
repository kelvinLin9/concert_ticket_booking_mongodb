import UsersModel from '../models/user'
import { generateToken } from '../utils/index';
import { handleErrorAsync } from '../statusHandle/handleErrorAsync';
import { Request, Response, NextFunction } from 'express';

interface GoogleRequest extends Request {
  user?: {
    user: {
      _id: string;
      name: string;
      email: string;
      photo?: string;
      role: string;
    }
  }
}

const googleLogin = handleErrorAsync(async (req: Request, res: Response, next: NextFunction) => {
  const googleReq = req as GoogleRequest;
  console.log("googleLogin");
  console.log('用戶資料:', googleReq.user);
  console.log('重定向目標:', googleReq.query.state || '未指定');

  // 檢查必要的用戶數據
  if (!googleReq.user || !googleReq.user.user || !googleReq.user.user._id) {
    return res.status(400).json({
      success: false,
      error: { message: 'Invalid user data' }
    });
  }

  // 生成 token，包含用戶 ID 和角色
  const token = generateToken({
    userId: googleReq.user.user._id,
    role: googleReq.user.user.role
  });

  // 準備返回的用戶資料
  const userData = {
    _id: googleReq.user.user._id,
    name: googleReq.user.user.name,
    email: googleReq.user.user.email,
    photo: googleReq.user.user.photo,
    role: googleReq.user.user.role
  };

  // 如果是 POST 請求 (直接從前端發來的)
  if (req.method === 'POST') {
    return res.json({
      success: true,
      user: userData,
      token: token
    });
  }

  // 如果是 GET 請求 (來自 Google 重定向)
  const redirectUrl = googleReq.query.state || process.env.FRONTEND_URL || 'http://localhost:3010';
  res.redirect(`${redirectUrl}?token=${token}`);
});


export {
  googleLogin,
};