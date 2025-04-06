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
    console.log("=== Google OAuth Flow Start ===");
    console.log("Profile ID:", profile.id);
    console.log("Profile Email:", profile.emails?.[0]?.value);
    console.log("Profile Name:", profile.displayName);

    try {
      // 先尋找是否有使用 Google 登入的用戶
      console.log("Searching for existing Google OAuth user...");
      let user = await UsersModel.findOne({
        'oauthProviders.provider': 'google',
        'oauthProviders.providerId': profile.id
      });

      if (!user) {
        console.log("No existing Google OAuth user found");
        // 如果沒有找到，則尋找是否有相同 email 的用戶
        if (!profile.emails || !profile.emails[0]) {
          console.log("Error: No email found in profile");
          return done(new Error('No email found in profile'));
        }
        console.log("Searching for user with matching email...");
        user = await UsersModel.findOne({ email: profile.emails[0].value });

        if (user) {
          console.log("Found user with matching email, adding Google OAuth info");
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
          console.log("No existing user found, creating new user");
          // 如果都沒有找到，創建新用戶
          if (!profile.photos || !profile.photos[0]) {
            console.log("Error: No photo found in profile");
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
          console.log("New user created successfully");
        }
      } else {
        console.log("Found existing Google OAuth user, updating OAuth info");
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

      console.log('=== OAuth Flow Success ===');
      console.log('User ID:', user._id);
      console.log('User Email:', user.email);
      console.log('Frontend Callback:', req.query.state);
      return done(null, { user, frontendCallback: req.query.state });
    } catch (err) {
      console.log('=== OAuth Flow Error ===');
      console.log('Error details:', err);
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

// router.get('/google', (req, res, next) => {
//   const { callback } = req.query;
//   console.log('Callback URL:', callback);
//   passport.authenticate('google', {
//     scope: ['email', 'profile'],
//     state: callback // 使用 state 參數傳遞 callback URL
//   })(req, res, next);
// });


// Google 回調路由
router.get('/google/callback',
  (req, res, next) => {
    console.log('=== Google OAuth Callback Received ===');
    console.log('Query parameters:', req.query);
    next();
  },
  passport.authenticate('google', { session: false }),
  googleLogin
);

// Google 客戶端回調路由
router.post('/googleClient/callback', (req, res, next) => {
  console.log('=== Google Client OAuth Callback Received ===');
  // 從請求體獲取授權碼
  const { code } = req.body;
  console.log('Auth code received:', code ? 'Yes' : 'No');
  if (!code) {
    console.log('Error: Missing auth code');
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