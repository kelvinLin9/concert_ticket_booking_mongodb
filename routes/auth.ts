import { Router } from 'express';
import {
  login,
  signup,
  forget,
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
import { register } from '../controller/auth.controller';

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
          // 如果找到相同 email 的用戶，添加 Google OAuth 資訊
          user.oauthProviders.push({
            provider: 'google',
            providerId: profile.id,
            accessToken,
            refreshToken,
            tokenExpiresAt: new Date(Date.now() + 3600000) // 1小時後過期
          });
          await user.save();
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

          // 創建新用戶時包含 OAuth provider
          user = await UsersModel.create({
            name: profile.displayName,
            email: profile.emails[0].value,
            photo: profile.photos[0].value,
            role: 'user',
            oauthProviders: [oauthProvider]
          });
        }
      } else {
        // 如果找到用戶，更新 OAuth 資訊
        user.oauthProviders.push({
          provider: 'google',
          providerId: profile.id,
          accessToken,
          refreshToken,
          tokenExpiresAt: new Date(Date.now() + 3600000) // 1小時後過期
        });
        await user.save();
      }
      
      // 準備完整的用戶資料
      const userData = {
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          photo: user.photo,
          role: user.role,
          oauthProviders: user.oauthProviders,
          phone: user.phone,
          address: user.address,
          birthday: user.birthday,
          gender: user.gender,
          intro: user.intro,
          facebook: user.facebook,
          instagram: user.instagram,
          discord: user.discord
        }
      };
      
      return done(null, userData);
    } catch (err) {
      return done(err);
    }
  }));

const router = Router();

router.use(checkRequestBodyValidator);

// 一般註冊
router.post('/register', handleErrorAsync(register));

// 一般登入
router.post('/login', handleErrorAsync(login));

// 忘記密碼
router.post('/forgot', forget);

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

export default router; 