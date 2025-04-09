import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/user';
import { generateToken, verifyToken } from '../utils';
import { handleErrorAsync } from '../statusHandle/handleErrorAsync';
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/email';

// 註冊新用戶
export const register = handleErrorAsync(async (req: Request, res: Response) => {
  const { email, password, firstName, lastName, phone, birthday } = req.body;

  // 檢查必要欄位
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: '請提供所有必要欄位'
    });
  }

  // 檢查郵箱格式
  if (!/^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/.test(email)) {
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

  // 創建新用戶
  const newUser = await User.create({
    email,
    password,  // 密碼會在 User model 的 pre-save hook 中自動加密
    firstName,
    lastName,
    phone,
    birthday: birthday ? new Date(birthday) : undefined,
    role: 'user',
    isEmailVerified: false,
    oauthProviders: []
  });

  // 生成驗證碼和 token
  const { code } = await newUser.createVerificationToken();
  
  // 打印驗證碼
  console.log('驗證碼:', code);

  // 發送驗證碼郵件
  await sendVerificationEmail(newUser.email, code);

  // 生成 JWT token
  const token = generateToken({
    userId: newUser._id.toString(),
    role: newUser.role
  });

  res.status(201).json({
    success: true,
    message: '註冊成功，請查收驗證碼郵件',
    user: {
      _id: newUser._id,
      email: newUser.email,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      phone: newUser.phone,
      birthday: newUser.birthday,
      role: newUser.role,
      isEmailVerified: newUser.isEmailVerified
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
      email: user.email,
      role: user.role,
      isEmailVerified: user.isEmailVerified
    },
    token
  });
});

// 驗證電子郵件
export const verifyEmail = handleErrorAsync(async (req: Request, res: Response) => {
  const { email, code } = req.body;

  const user = await User.findOne({ email }).select('+verificationToken +verificationTokenExpires');
  if (!user) {
    return res.status(404).json({
      success: false,
      message: '找不到此用戶'
    });
  }

  if (!user.verificationToken || !user.verificationTokenExpires) {
    return res.status(400).json({
      success: false,
      message: '無效的驗證請求'
    });
  }

  if (user.verificationTokenExpires < new Date()) {
    return res.status(400).json({
      success: false,
      message: '驗證碼已過期'
    });
  }

  // 使用 bcrypt 比較驗證碼
  const isMatch = await bcrypt.compare(code, user.verificationToken);
  if (!isMatch) {
    return res.status(400).json({
      success: false,
      message: '驗證碼錯誤'
    });
  }

  user.isEmailVerified = true;
  user.verificationToken = undefined;
  user.verificationTokenExpires = undefined;
  await user.save();

  res.json({
    success: true,
    message: '電子郵件驗證成功'
  });
});

// 重新發送驗證碼
export const resendVerification = handleErrorAsync(async (req: Request, res: Response) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({
      success: false,
      message: '找不到此用戶'
    });
  }

  if (user.isEmailVerified) {
    return res.status(400).json({
      success: false,
      message: '此電子郵件已驗證'
    });
  }

  // 檢查是否在冷卻時間內
  if (user.lastVerificationAttempt && 
      Date.now() - user.lastVerificationAttempt.getTime() < 60000) { // 1分鐘冷卻時間
    return res.status(400).json({
      success: false,
      message: '請稍後再試'
    });
  }

  const { code } = await user.createVerificationToken();
  
  // 打印驗證碼
  console.log('重新發送的驗證碼:', code);
  
  user.lastVerificationAttempt = new Date();
  await user.save();

  // 發送驗證碼郵件
  await sendVerificationEmail(user.email, code);

  res.json({
    success: true,
    message: '驗證碼已重新發送'
  });
});

// 請求密碼重置
export const requestPasswordReset = handleErrorAsync(async (req: Request, res: Response) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({
      success: false,
      message: '找不到此用戶'
    });
  }

  // 檢查是否在冷卻時間內
  if (user.lastVerificationAttempt && 
      Date.now() - user.lastVerificationAttempt.getTime() < 60000) { // 1分鐘冷卻時間
    return res.status(400).json({
      success: false,
      message: '請稍後再試'
    });
  }

  const { code } = await user.createPasswordResetToken();
  user.lastVerificationAttempt = new Date();
  await user.save();

  // 發送密碼重置郵件
  await sendPasswordResetEmail(user.email, code);

  res.json({
    success: true,
    message: '密碼重置郵件已發送'
  });
});

// 重置密碼
export const resetPassword = handleErrorAsync(async (req: Request, res: Response) => {
  const { email, code, newPassword } = req.body;

  const user = await User.findOne({ email }).select('+passwordResetToken +passwordResetExpires');
  if (!user) {
    return res.status(404).json({
      success: false,
      message: '找不到此用戶'
    });
  }

  if (!user.passwordResetToken || !user.passwordResetExpires) {
    return res.status(400).json({
      success: false,
      message: '無效的重置密碼請求'
    });
  }

  if (user.passwordResetExpires < new Date()) {
    return res.status(400).json({
      success: false,
      message: '重置密碼連結已過期'
    });
  }

  const payload = verifyToken(user.passwordResetToken);
  if (!('code' in payload) || payload.code !== code) {
    return res.status(400).json({
      success: false,
      message: '驗證碼錯誤'
    });
  }

  user.password = newPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  res.json({
    success: true,
    message: '密碼重置成功'
  });
}); 