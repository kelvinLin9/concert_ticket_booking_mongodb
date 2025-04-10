import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

interface IOAuthProvider {
  provider: string;
  providerId: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: Date;
}

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;  // 主要識別符
  password?: string;  // 可選，因為可能使用 OAuth 登入
  firstName?: string;  // 名字
  lastName?: string;   // 姓氏
  nickname?: string;   // 暱稱
  role: string;  // 用戶角色
  phone?: string;
  birthday?: Date;
  gender?: string;
  preferredRegions?: string[];  // 偏好活動區域
  preferredEventTypes?: string[];  // 偏好活動類型
  country?: string;
  address?: string;
  avatar?: string;
  verificationToken?: string;  // 驗證碼 token
  verificationTokenExpires?: Date;  // 驗證碼過期時間
  isEmailVerified: boolean;  // 郵件是否已驗證
  passwordResetToken?: string;  // 重置密碼 token
  passwordResetExpires?: Date;  // 重置密碼 token 過期時間
  lastVerificationAttempt?: Date;  // 上次發送驗證碼的時間
  oauthProviders: IOAuthProvider[];
  hasOAuthProvider(provider: string): boolean;
  addOAuthProvider(
    provider: string,
    providerId: string,
    accessToken: string,
    refreshToken: string,
    tokenExpiresAt: Date
  ): void;
  createVerificationToken(): Promise<{ token: string, code: string }>;
  createPasswordResetToken(): Promise<{ token: string, code: string }>;
}

const oauthProviderSchema = new Schema({
  provider: {
    type: String,
    enum: ['google'],  // 目前只支援 Google
    required: true
  },
  providerId: {
    type: String,
    required: true
  },
  accessToken: {
    type: String,
    select: false
  },
  refreshToken: {
    type: String,
    select: false
  },
  tokenExpiresAt: {
    type: Date,
    select: false
  }
}, { _id: false });

const userSchema = new Schema<IUser>({
  email: {
    type: String,
    required: [true, 'Email 為必填欄位'],
    unique: true,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(value: string) {
        return /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/.test(value);
      },
      message: 'Email 格式不正確'
    }
  },
  firstName: {
    type: String,
    trim: true,
    maxlength: [20, '名字不能超過20個字符'],
    validate: {
      validator: function(value: string) {
        return !value || /^[\u4e00-\u9fa5a-zA-Z\s]{1,20}$/.test(value);
      },
      message: '名字只能包含中文、英文字母和空格'
    }
  },
  lastName: {
    type: String,
    trim: true,
    maxlength: [20, '姓氏不能超過20個字符'],
    validate: {
      validator: function(value: string) {
        return !value || /^[\u4e00-\u9fa5a-zA-Z\s]{1,20}$/.test(value);
      },
      message: '姓氏只能包含中文、英文字母和空格'
    }
  },
  nickname: {
    type: String,
    trim: true,
    maxlength: [20, '暱稱不能超過20個字符']
  },
  password: {
    type: String,
    minlength: [6, '密碼至少需要 6 個字元以上'],
    select: false,
    required: function(this: IUser) {
      return !this.oauthProviders || this.oauthProviders.length === 0;
    }
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'superuser'],
    default: 'user',
    required: true
  },
  phone: {
    type: String,
    validate: {
      validator: function(value: string) {
        return !value || /^[0-9]{10}$/.test(value);
      },
      message: '手機號碼格式不正確'
    }
  },
  birthday: {
    type: Date,
    validate: {
      validator: function(value: Date) {
        return !value || (value instanceof Date && !isNaN(value.getTime()));
      },
      message: '生日格式不正確'
    }
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    validate: {
      validator: function(value: string) {
        return !value || ['male', 'female', 'other'].includes(value);
      },
      message: '性別格式不正確'
    }
  },
  preferredRegions: {
    type: [String],
    validate: {
      validator: function(value: string[]) {
        const validRegions = ['north', 'south', 'east', 'central', 'offshore', 'overseas'];
        return Array.isArray(value) && 
               (!value.length || value.every(region => validRegions.includes(region)));
      },
      message: '偏好活動區域選項不正確'
    }
  },
  preferredEventTypes: {
    type: [String],
    validate: {
      validator: function(value: string[]) {
        const validTypes = ['pop', 'rock', 'electronic', 'hip-hop', 'jazz-blues', 'classical', 'other'];
        return Array.isArray(value) && 
               (!value.length || value.every(type => validTypes.includes(type)));
      },
      message: '偏好活動類型選項不正確'
    }
  },
  country: {
    type: String,
    trim: true
  },
  address: {
    type: String,
    trim: true
  },
  avatar: {
    type: String,
    validate: {
      validator: function(value: string) {
        return !value || /^https?:\/\/.+/.test(value);
      },
      message: '頭像 URL 格式不正確'
    }
  },
  verificationToken: {
    type: String,
    select: false
  },
  verificationTokenExpires: {
    type: Date,
    select: false
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  passwordResetToken: {
    type: String,
    select: false
  },
  passwordResetExpires: {
    type: Date,
    select: false
  },
  lastVerificationAttempt: {
    type: Date,
    select: false
  },
  oauthProviders: [oauthProviderSchema]
}, {
  versionKey: false,
  timestamps: true
});

// 密碼加密
userSchema.pre('save', async function(next) {
  if (this.isModified('password') && this.password) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  next();
});

// 檢查是否使用特定 OAuth 提供者
userSchema.methods.hasOAuthProvider = function(provider: string): boolean {
  return this.oauthProviders.some((oauth: IOAuthProvider) => oauth.provider === provider);
};

// 新增 OAuth 提供者
userSchema.methods.addOAuthProvider = function(
  provider: string,
  providerId: string,
  accessToken: string,
  refreshToken: string,
  tokenExpiresAt: Date
): void {
  const existingProvider = this.oauthProviders.find((oauth: IOAuthProvider) => oauth.provider === provider);
  if (existingProvider) {
    existingProvider.accessToken = accessToken;
    existingProvider.refreshToken = refreshToken;
    existingProvider.tokenExpiresAt = tokenExpiresAt;
  } else {
    this.oauthProviders.push({
      provider,
      providerId,
      accessToken,
      refreshToken,
      tokenExpiresAt
    });
  }
};

// 生成驗證碼和 token
userSchema.methods.createVerificationToken = async function(): Promise<{ token: string, code: string }> {
  // 生成 6 位數字驗證碼
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  
  // 設置過期時間（10分鐘）
  this.verificationTokenExpires = new Date(Date.now() + 10 * 60 * 1000);
  
  // 記錄發送時間
  this.lastVerificationAttempt = new Date();
  
  // 使用 bcrypt 加密驗證碼
  this.verificationToken = await bcrypt.hash(code, 1);
  
  await this.save();
  
  return { token: this.verificationToken, code };
};

// 生成重置密碼的驗證碼和 token
userSchema.methods.createPasswordResetToken = async function(): Promise<{ token: string, code: string }> {
  // 生成 6 位數字驗證碼
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  
  // 設置過期時間（10分鐘）
  this.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);
  
  // 使用 bcrypt 加密驗證碼
  this.passwordResetToken = await bcrypt.hash(code, 1);
  
  await this.save();
  
  return { token: this.passwordResetToken, code };
};

const User = mongoose.model<IUser>('User', userSchema);

export default User;
