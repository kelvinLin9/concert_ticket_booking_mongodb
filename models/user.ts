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
  username: string;
  password?: string;  // 改為可選，因為可能使用 OAuth 登入
  email: string;
  phone?: string;
  birthday?: Date;
  gender?: string;
  preferredRegions?: string[];  // 偏好活動區域
  preferredEventTypes?: string[];  // 偏好活動類型
  country?: string;
  address?: string;
  avatar?: string;
  oauthProviders: IOAuthProvider[];
  hasOAuthProvider(provider: string): boolean;
  addOAuthProvider(
    provider: string,
    providerId: string,
    accessToken: string,
    refreshToken: string,
    tokenExpiresAt: Date
  ): void;
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
  username: {
    type: String,
    required: [true, '帳號為必填欄位'],
    unique: true,
    trim: true,
    minlength: [3, '帳號至少需要 3 個字元以上']
  },
  password: {
    type: String,
    minlength: [6, '密碼至少需要 6 個字元以上'],
    select: false,
    required: function(this: IUser) {
      return !this.oauthProviders || this.oauthProviders.length === 0;
    }
  },
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
  preferredRegions: [{
    type: String,
    enum: ['north', 'south', 'east', 'central', 'offshore', 'overseas'],  // 北部、南部、東部、中部、離島、海外
    validate: {
      validator: function(value: string[]) {
        return !value || value.every(region => 
          ['north', 'south', 'east', 'central', 'offshore', 'overseas'].includes(region)
        );
      },
      message: '偏好活動區域選項不正確'
    }
  }],
  preferredEventTypes: [{
    type: String,
    enum: ['pop', 'rock', 'electronic', 'hip-hop', 'jazz-blues', 'classical', 'other'],  // 流行音樂、搖滾音樂、電子音樂、嘻哈/饒舌、爵士/藍調、古典/交響樂、其他
    validate: {
      validator: function(value: string[]) {
        return !value || value.every(type => 
          ['pop', 'rock', 'electronic', 'hip-hop', 'jazz-blues', 'classical', 'other'].includes(type)
        );
      },
      message: '偏好活動類型選項不正確'
    }
  }],
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

const User = mongoose.model<IUser>('User', userSchema);

export default User;
