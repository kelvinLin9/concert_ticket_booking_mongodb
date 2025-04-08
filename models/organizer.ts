import mongoose, { Schema, Document } from 'mongoose';

export interface IOrganizer extends Document {
  _id: mongoose.Types.ObjectId;
  companyName: string;  // 公司名稱（必填）
  companyAddress: string;  // 公司地址（必填）
  website?: string;  // 公司網站（選填）
  contactPerson: {  // 聯絡人資訊
    name: string;  // 姓名（必填）
    mobile: string;  // 手機（必填）
    phone: string;  // 市話（必填）
    email: string;  // 電子郵件（必填）
  };
  userId: mongoose.Types.ObjectId;  // 關聯的用戶ID
  createdEvents?: mongoose.Types.ObjectId[];  // 建立的活動列表
  status: string;  // 帳號狀態（活躍/停用/封鎖）
  verificationStatus: string;  // 驗證狀態
}

const organizerSchema = new Schema<IOrganizer>({
  companyName: {
    type: String,
    required: [true, '公司名稱為必填'],
    trim: true,
    minlength: [2, '公司名稱至少需要 2 個字元']
  },
  companyAddress: {
    type: String,
    required: [true, '公司地址為必填'],
    trim: true
  },
  website: {
    type: String,
    validate: {
      validator: function(value: string) {
        return !value || /^https?:\/\/.+/.test(value);
      },
      message: '網站 URL 格式不正確'
    }
  },
  contactPerson: {
    name: {
      type: String,
      required: [true, '聯絡人姓名為必填'],
      trim: true
    },
    mobile: {
      type: String,
      required: [true, '聯絡人手機為必填'],
      validate: {
        validator: function(value: string) {
          return /^09\d{8}$/.test(value);
        },
        message: '手機號碼格式不正確（例：0912345678）'
      }
    },
    phone: {
      type: String,
      required: [true, '聯絡人市話為必填'],
      validate: {
        validator: function(value: string) {
          return /^0\d{1,2}-?\d{6,8}$/.test(value);
        },
        message: '市話號碼格式不正確（例：02-12345678）'
      }
    },
    email: {
      type: String,
      required: [true, '電子郵件為必填'],
      validate: {
        validator: function(value: string) {
          return /^[\w-]+(\.[\w-]+)*@([\w-]+\.)+[a-zA-Z]{2,7}$/.test(value);
        },
        message: 'Email 格式不正確'
      }
    }
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdEvents: [{
    type: Schema.Types.ObjectId,
    ref: 'Event'
  }],
  status: {
    type: String,
    enum: ['active', 'inactive', 'blocked'],
    default: 'active'
  },
  verificationStatus: {
    type: String,
    enum: ['unverified', 'pending', 'verified'],
    default: 'unverified'
  }
}, {
  timestamps: true,
  versionKey: false
});

// 索引
organizerSchema.index({ userId: 1 });
organizerSchema.index({ companyName: 1 });
organizerSchema.index({ 'contactPerson.email': 1 });
organizerSchema.index({ verificationStatus: 1 });
organizerSchema.index({ status: 1 });

const Organizer = mongoose.model<IOrganizer>('Organizer', organizerSchema);

export default Organizer; 