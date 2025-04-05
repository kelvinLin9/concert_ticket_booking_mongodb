import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/user';
import { generateToken } from '../utils';
import { handleErrorAsync } from '../statusHandle/handleErrorAsync';

// 註冊新用戶
export const register = handleErrorAsync(async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  // 檢查必要欄位
  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: '請提供所有必要欄位'
    });
  }

  // 檢查郵箱格式
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({
      success: false,
      message: '請提供有效的電子郵件地址'
    });
  }

  // 檢查密碼長度
  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: '密碼長度至少為6個字符'
    });
  }

  // 檢查郵箱是否已存在
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return res.status(400).json({
      success: false,
      message: '此電子郵件已被註冊'
    });
  }

  // 加密密碼
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // 創建新用戶
  const newUser = await User.create({
    name,
    email,
    password: hashedPassword,
    role: 'user', // 默認角色
    oauthProviders: []
  });

  // 生成 token
  const token = generateToken({
    userId: newUser._id.toString(),
    role: newUser.role
  });

  res.status(201).json({
    success: true,
    user: {
      _id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role
    },
    token
  });
});

// 用戶登入
export const login = handleErrorAsync(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // 檢查必要欄位
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: '請提供電子郵件和密碼'
    });
  }

  // 查找用戶
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(401).json({
      success: false,
      message: '電子郵件或密碼錯誤'
    });
  }

  // 驗證密碼
  const isMatch = await bcrypt.compare(password, user.password || '');
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: '電子郵件或密碼錯誤'
    });
  }

  // 生成 token
  const token = generateToken({
    userId: user._id.toString(),
    role: user.role
  });

  res.json({
    success: true,
    user: {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      photo: user.photo
    },
    token
  });
}); 