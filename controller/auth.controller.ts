import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/user';
import { generateToken, verifyToken } from '../utils';
import { handleErrorAsync } from '../statusHandle/handleErrorAsync';
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/email';
import { AppError } from '../statusHandle/AppError';

// 註冊新用戶
export const register = handleErrorAsync(async (req: Request, res: Response) => {
  const { email, password, firstName, lastName, phone, birthday } = req.body;

  // 檢查必要欄位
  if (!email || !password) {
    throw new AppError('請提供所有必要欄位', 400, 'MISSING_FIELDS');
  }

  // 檢查郵箱格式
  if (!/^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/.test(email)) {
    throw new AppError('請提供有效的電子郵件地址', 400, 'INVALID_EMAIL');
  }

  // 檢查密碼長度
  if (password.length < 6) {
    throw new AppError('密碼長度至少為6個字符', 400, 'INVALID_PASSWORD');
  }

  // 檢查郵箱是否已存在
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError('此電子郵件已被註冊', 400, 'EMAIL_IN_USE');
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
    throw new AppError('請提供電子郵件和密碼', 400, 'MISSING_FIELDS');
  }

  // 查找用戶，包含密碼欄位
  const user = await User.findOne({ email }).select('+password');
  
  // 檢查用戶是否存在
  if (!user) {
    throw new AppError('帳號或密碼錯誤', 401, 'INVALID_CREDENTIALS');
  }

  // 檢查是否有密碼（排除 OAuth 用戶）
  if (!user.password) {
    throw new AppError('此帳號使用第三方登入，請使用對應的登入方式', 401, 'OAUTH_USER');
  }

  // 驗證密碼
  let isMatch;
  try {
    isMatch = await bcrypt.compare(password, user.password);
  } catch (error) {
    throw new AppError('帳號或密碼錯誤', 401, 'INVALID_CREDENTIALS');
  }
  
  if (!isMatch) {
    throw new AppError('帳號或密碼錯誤', 401, 'INVALID_CREDENTIALS');
  }

  // 檢查郵箱是否已驗證
  if (!user.isEmailVerified) {
    throw new AppError('請先驗證您的電子郵件', 403, 'EMAIL_NOT_VERIFIED');
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
      firstName: user.firstName,
      lastName: user.lastName,
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
    throw new AppError('找不到此用戶', 404, 'USER_NOT_FOUND');
  }

  if (!user.verificationToken || !user.verificationTokenExpires) {
    throw new AppError('無效的驗證請求', 400, 'INVALID_VERIFICATION');
  }

  if (user.verificationTokenExpires < new Date()) {
    throw new AppError('驗證碼已過期', 400, 'VERIFICATION_EXPIRED');
  }

  // 使用 bcrypt 比較驗證碼
  const isMatch = await bcrypt.compare(code, user.verificationToken);
  if (!isMatch) {
    throw new AppError('驗證碼錯誤', 400, 'INVALID_CODE');
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

  const user = await User.findOne({ email }).select('+lastVerificationAttempt');
  if (!user) {
    throw new AppError('找不到此用戶', 404, 'USER_NOT_FOUND');
  }

  if (user.isEmailVerified) {
    throw new AppError('此電子郵件已驗證', 400, 'ALREADY_VERIFIED');
  }

  // 檢查是否在冷卻時間內
  if (user.lastVerificationAttempt && 
      Date.now() - user.lastVerificationAttempt.getTime() < 600000) { // 10分鐘冷卻時間
    const remainingSeconds = Math.ceil(
      (600000 - (Date.now() - user.lastVerificationAttempt.getTime())) / 1000
    );
    throw new AppError('請稍後再試', 400, 'COOLDOWN_PERIOD');
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
  const now = new Date();
  const cooldownTime = 600000; // 10分鐘，單位：毫秒

  // 先檢查用戶是否存在，明確選擇 lastVerificationAttempt 欄位
  const existingUser = await User.findOne({ email }).select('+lastVerificationAttempt');
  
  if (!existingUser) {
    throw new AppError('該信箱未註冊', 400, 'EMAIL_NOT_REGISTERED');
  }

  // 檢查用戶是否已驗證
  if (!existingUser.isEmailVerified) {
    throw new AppError('請先驗證您的郵箱', 400, 'EMAIL_NOT_VERIFIED');
  }

  // 輸出除錯信息
  console.log('上次嘗試時間:', existingUser.lastVerificationAttempt);
  console.log('當前時間:', now);
  console.log('冷卻時間(毫秒):', cooldownTime);
  
  // 檢查冷卻時間
  if (existingUser.lastVerificationAttempt && 
      (now.getTime() - existingUser.lastVerificationAttempt.getTime()) < cooldownTime) {
    const remainingSeconds = Math.ceil(
      (cooldownTime - (now.getTime() - existingUser.lastVerificationAttempt.getTime())) / 1000
    );
    console.log('剩餘冷卻時間(秒):', remainingSeconds);
    
    const error = new AppError('請稍後再試', 400, 'COOLDOWN_PERIOD');
    // @ts-ignore - 添加剩餘時間屬性
    error.remainingSeconds = remainingSeconds;
    throw error;
  }

  // 更新最後嘗試時間
  existingUser.lastVerificationAttempt = now;
  await existingUser.save(); // 立即保存更新的冷卻時間
  console.log('已更新冷卻時間:', existingUser.lastVerificationAttempt);
  
  try {
    // 生成重置 token
    const { code } = await existingUser.createPasswordResetToken();
    await existingUser.save();

    // 發送郵件
    await sendPasswordResetEmail(existingUser.email, code);

    res.json({
      success: true,
      message: '密碼重置郵件已發送'
    });
  } catch (error) {
    console.error('Password reset error:', error);
    throw new AppError('郵件發送失敗，請稍後再試', 500, 'EMAIL_SEND_FAILED');
  }
});

// 重置密碼
export const resetPassword = handleErrorAsync(async (req: Request, res: Response) => {
  const { email, code, newPassword } = req.body;

  // 檢查密碼長度
  if (!newPassword || newPassword.length < 6) {
    throw new AppError('密碼長度至少為6個字符', 400, 'INVALID_PASSWORD');
  }

  const user = await User.findOne({ email }).select('+passwordResetToken +passwordResetExpires');
  if (!user) {
    throw new AppError('找不到此用戶', 404, 'USER_NOT_FOUND');
  }

  if (!user.passwordResetToken || !user.passwordResetExpires) {
    throw new AppError('無效的重置密碼請求', 400, 'INVALID_RESET_REQUEST');
  }

  if (user.passwordResetExpires < new Date()) {
    throw new AppError('重置密碼連結已過期', 400, 'RESET_LINK_EXPIRED');
  }

  // 除錯信息
  console.log('驗證碼:', code);
  console.log('重置 token:', user.passwordResetToken);
  
  // 使用 bcrypt 比較驗證碼
  const isMatch = await bcrypt.compare(code, user.passwordResetToken);
  console.log('驗證碼比對結果:', isMatch);
  
  if (!isMatch) {
    throw new AppError('驗證碼錯誤', 400, 'INVALID_CODE');
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