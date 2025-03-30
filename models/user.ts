import mongoose, { Schema, Document } from 'mongoose';
import validator from 'validator';
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
  name: string;
  email: string;
  password?: string;
  role: string;
  phone?: string;
  address?: string;
  birthday?: Date;
  gender?: string;
  photo?: string;
  intro?: string;
  facebook?: string;
  instagram?: string;
  discord?: string;
  verificationToken?: string;
  courses?: string[];
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
    enum: ['google', 'facebook', 'line', 'apple', 'github'],
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
  name: {
    type: String,
    required: [true, '姓名為必填欄位'],
    minlength: [2, '姓名至少需要 2 個字元以上'],
    validate: {
      validator: function (value: string) {
        return value.length >= 2;
      },
      message: '姓名至少需要 2 個字元以上'
    }
  },
  email: {
    type: String,
    required: [true, 'Email 為必填欄位'],
    unique: true,
    validate: {
      validator: function (value: string) {
        return /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/.test(value);
      },
      message: 'Email 格式不正確'
    }
  },
  password: {
    type: String,
    minlength: [6, '密碼至少需要 6 個字元以上'],
    select: false,
    required: function (this: IUser) {
      return !this.oauthProviders || this.oauthProviders.length === 0;
    },
    validate: {
      validator: function (value: string) {
        return value.length >= 6;
      },
      message: '密碼至少需要 6 個字元以上'
    }
  },
  oauthProviders: [oauthProviderSchema],
  phone: {
    type: String,
    validate: {
      validator: function (value: string) {
        return /^[0-9]{10}$/.test(value);
      },
      message: '手機號碼格式不正確'
    }
  },
  birthday: {
    type: Date,
    validate: {
      validator: function (value: Date) {
        return value instanceof Date && !isNaN(value.getTime());
      },
      message: '生日格式不正確'
    }
  },
  address: {
    type: String,
    validate: {
      validator: function (value: string) {
        return value.length >= 5;
      },
      message: '地址至少需要 5 個字元以上'
    }
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    validate: {
      validator: function (value: string) {
        return ['male', 'female', 'other'].includes(value);
      },
      message: '性別格式不正確'
    }
  },
  courses: [{
    type: Schema.Types.ObjectId,
    ref: 'Course'
  }],
  role: {
    type: String,
    enum: ['user', 'admin', 'superuser'],
    default: 'user'
  },
  verificationToken: String,
  photo: {
    type: String,
    validate: {
      validator: function (value: string) {
        return /^https?:\/\/.+/.test(value);
      },
      message: '照片 URL 格式不正確'
    }
  },
  intro: {
    type: String,
    validate: {
      validator: function (value: string) {
        return value.length <= 500;
      },
      message: '自我介紹不能超過 500 個字元'
    }
  },
  facebook: {
    type: String,
    validate: {
      validator: function (value: string) {
        return /^https?:\/\/(www\.)?facebook\.com\/.+/.test(value);
      },
      message: 'Facebook 連結格式不正確'
    }
  },
  instagram: {
    type: String,
    validate: {
      validator: function (value: string) {
        return /^https?:\/\/(www\.)?instagram\.com\/.+/.test(value);
      },
      message: 'Instagram 連結格式不正確'
    }
  },
  discord: {
    type: String,
    validate: {
      validator: function (value: string) {
        return /^https?:\/\/(www\.)?discord\.com\/.+/.test(value);
      },
      message: 'Discord 連結格式不正確'
    }
  }
}, {
  versionKey: false,
  timestamps: true
});

// 密碼加密和電郵格式化的 pre-save 鉤子
userSchema.pre('save', async function (next) {
  if (this.isModified('password') && this.password) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  this.email = this.email.toLowerCase().trim();
  next();
});

// 新增方法：檢查是否使用特定 OAuth 提供者
userSchema.methods.hasOAuthProvider = function (provider: string): boolean {
  return this.oauthProviders.some((oauth: IOAuthProvider) => oauth.provider === provider);
};

// 新增方法：新增 OAuth 提供者
userSchema.methods.addOAuthProvider = function (
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
