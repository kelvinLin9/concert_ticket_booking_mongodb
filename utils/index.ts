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
    const decoded = jsonWebToken.verify(token, process.env.JWT_SECRET) as EmailTokenPayload | AuthTokenPayload;
    
    // 檢查是否為驗證碼 token
    if ('code' in decoded) {
      // 檢查是否過期
      if (decoded.exp * 1000 < Date.now()) {
        throw createHttpError(400, '驗證碼已過期');
      }
      return decoded;
    }
    
    // 檢查是否為認證 token
    if (!('userId' in decoded) || !('role' in decoded)) {
      throw createHttpError(401, '無效的 Token 格式');
    }
    
    return decoded;
  } catch (error) {
    if (error instanceof createHttpError.HttpError) {
      throw error;
    }
    throw createHttpError(401, '無效的 Token');
  }
};

export const generateEmailToken = () => {
  const code = generateRandomCode();
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET environment variable is not set.");
  }
  const token = jsonWebToken.sign({ code }, process.env.JWT_SECRET, {
    expiresIn: 900 // 15 minutes
  });

  return { code, token };
};

const generateRandomCode = () => {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += Math.floor(Math.random() * 10).toString();
  }
  return code;
};
