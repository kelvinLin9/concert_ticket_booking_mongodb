import createHttpError from 'http-errors';
import jsonWebToken from 'jsonwebtoken';
import { SignOptions } from 'jsonwebtoken';

interface User {
  userId: string;
  role: string;
}

interface EmailTokenPayload {
  code: string;
  iat: number;
  exp: number;
}

interface AuthTokenPayload {
  userId: string;
  role: string;
  iat: number;
  exp: number;
}

export const generateToken = (user: User) => {
  if (!process.env.JWT_SECRET || !process.env.JWT_EXPIRES_DAY) {
    throw new Error("Required JWT environment variables are not set.");
  }
  console.log('generateToken user', user)
  // 生成 payload，包括用戶 ID 和角色
  const payload = {
    userId: user.userId,
    role: user.role,
  };
  console.log("generateToken Payload:", payload);
  // 簽名 token
  return jsonWebToken.sign(payload, process.env.JWT_SECRET || '', {
    expiresIn: process.env.JWT_EXPIRES_DAY || '7d'
  } as SignOptions);
};

export const verifyToken = (token: string): EmailTokenPayload | AuthTokenPayload => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is not set.");
  }
  try {
    return jsonWebToken.verify(token, process.env.JWT_SECRET) as EmailTokenPayload | AuthTokenPayload;
  } catch (error) {
    throw createHttpError(403, '請重新登入');
  }
};

export const generateEmailToken = () => {
  const code = generateRandomCode();
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is not set.");
  }
  const token = jsonWebToken.sign({ code }, process.env.JWT_SECRET, {
    expiresIn: 3600 // 1 hour
  });

  return { code, token };
};

const generateRandomCode = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    code += characters.charAt(randomIndex);
  }
  return code;
};
