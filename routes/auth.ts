import { Router } from 'express';
import {
  check,
} from '../controller/user';
import { googleLogin } from '../controller/auth';
import { checkRequestBodyValidator, isAuth } from '../middlewares/index';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import dotenv from 'dotenv';
dotenv.config();
import UsersModel from '../models/user';
import { handleErrorAsync } from '../statusHandle/handleErrorAsync';
import { 
  login,
  register, 
  verifyEmail, 
  resendVerification, 
  requestPasswordReset, 
  resetPassword 
} from '../controller/auth.controller';
import { Request, Response } from 'express';
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/email';

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error('Missing Google OAuth credentials');
}

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL,
  passReqToCallback: true,
},
async function (req, accessToken, refreshToken, profile, done) {
  try {
    console.log('Google Profile:', {
      id: profile.id,
      displayName: profile.displayName,
      emails: profile.emails,
      photos: profile.photos,
      _json: profile._json
    });

    // 先尋找是否有使用 Google 登入的用戶
    let user = await UsersModel.findOne({
      'oauthProviders.provider': 'google',
      'oauthProviders.providerId': profile.id
    });

    if (!user) {
      // 如果沒有找到，則尋找是否有相同 email 的用戶
      if (!profile.emails || !profile.emails[0]) {
        return done(new Error('No email found in profile'));
      }
      user = await UsersModel.findOne({ email: profile.emails[0].value });

      if (user) {
        // 檢查是否已經有相同的 providerId
        const existingProvider = user.oauthProviders.find(
          provider => provider.provider === 'google' && provider.providerId === profile.id
        );

        // 只有在沒有相同的 providerId 時才添加新的
        if (!existingProvider) {
          user.oauthProviders.push({
            provider: 'google',
            providerId: profile.id,
            accessToken,
            refreshToken,
            tokenExpiresAt: new Date(Date.now() + 3600000) // 1小時後過期
          });
          // 更新用戶頭像
          if (profile.photos && profile.photos[0]) {
            user.avatar = profile.photos[0].value;
          }
          await user.save();
        }
      } else {
        // 如果都沒有找到，創建新用戶
        if (!profile.photos || !profile.photos[0]) {
          return done(new Error('No photo found in profile'));
        }

        // 先創建 OAuth provider 資訊
        const oauthProvider = {
          provider: 'google',
          providerId: profile.id,
          accessToken,
          refreshToken,
          tokenExpiresAt: new Date(Date.now() + 3600000) // 1小時後過期
        };

        // 創建新用戶時包含 OAuth provider 和更多 Google 資料
        user = await UsersModel.create({
          email: profile.emails[0].value,
          avatar: profile.photos[0].value,
          role: 'user',  // 確保設置默認角色
          oauthProviders: [oauthProvider],
          isEmailVerified: true // Google 登入的用戶 email 已經驗證
        });
      }
    } else {
      // 如果找到用戶，更新 OAuth provider 資訊和頭像
      const existingProvider = user.oauthProviders.find(
        provider => provider.provider === 'google' && provider.providerId === profile.id
      );

      if (existingProvider) {
        // 更新現有的 provider 資訊
        existingProvider.accessToken = accessToken;
        existingProvider.refreshToken = refreshToken;
        existingProvider.tokenExpiresAt = new Date(Date.now() + 3600000);
      } else {
        // 添加新的 provider 資訊
        user.oauthProviders.push({
          provider: 'google',
          providerId: profile.id,
          accessToken,
          refreshToken,
          tokenExpiresAt: new Date(Date.now() + 3600000)
        });
      }
      // 更新用戶頭像
      if (profile.photos && profile.photos[0]) {
        user.avatar = profile.photos[0].value;
      }
      await user.save();
    }
    
    // 準備完整的用戶資料
    const userData = {
      user: {
        _id: user._id,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        oauthProviders: user.oauthProviders,
        phone: user.phone,
        address: user.address,
        birthday: user.birthday,
        gender: user.gender,
        isEmailVerified: user.isEmailVerified
      }
    };
    
    console.log('User Data being sent:', userData);
    return done(null, userData);
  } catch (err) {
    console.error('Google Strategy Error:', err);
    return done(err);
  }
}));

const router = Router();

router.use(checkRequestBodyValidator);

// 一般註冊
router.post('/register', handleErrorAsync(register));

// 一般登入
router.post('/login', handleErrorAsync(login));

// 電子郵件驗證
router.post('/verify-email', handleErrorAsync(verifyEmail));

// 重新發送驗證碼
router.post('/resend-verification', handleErrorAsync(resendVerification));

// 請求密碼重置
router.post('/request-password-reset', handleErrorAsync(requestPasswordReset));

// 重置密碼
router.post('/reset-password', handleErrorAsync(resetPassword));

// 檢查是否登入
router.get('/check', isAuth, check);

// Google 登入
router.get('/google', passport.authenticate('google', { 
  scope: ['profile', 'email'],
  prompt: 'select_account'
}));

// Google 回調路由
router.get('/google/callback',
  (req, res, next) => {
    next();
  },
  passport.authenticate('google', { session: false }),
  googleLogin
);

// Google 客戶端回調路由
router.post('/googleClient/callback', (req, res, next) => {
  // 從請求體獲取授權碼
  const { code } = req.body;
  if (!code) {
    res.status(400).json({
      success: false,
      error: { message: 'Missing auth code' }
    });
    return;
  }

  // 將授權碼放入 req.query 中以便 passport-google-oauth20 能使用它
  req.query = { ...req.query, code };
  next();
}, passport.authenticate('google', { session: false }), googleLogin);

// 測試郵件發送
router.post('/test-email', handleErrorAsync(async (req: Request, res: Response) => {
  const { email, type } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      message: '請提供電子郵件地址'
    });
  }

  try {
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    if (type === 'reset') {
      await sendPasswordResetEmail(email, code);
    } else {
      await sendVerificationEmail(email, code);
    }

    res.json({
      success: true,
      message: '測試郵件發送成功',
      code // 在測試環境中返回驗證碼
    });
  } catch (error) {
    console.error('測試郵件發送失敗:', error);
    res.status(500).json({
      success: false,
      message: '郵件發送失敗',
      error: error instanceof Error ? error.message : '未知錯誤'
    });
  }
}));

export default router; 