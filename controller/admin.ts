import { Request, Response, NextFunction } from 'express';
import createHttpError from 'http-errors';
import { handleErrorAsync } from '../statusHandle/handleErrorAsync';
import UsersModel from '../models/user';

interface CustomRequest extends Request {
  user?: {
    userId: string;
    role: string;
  };
}

// 檢查是否為管理員或超級用戶
const isAdminOrSuperuser = (role: string): boolean => {
  return role === 'admin' || role === 'superuser';
};

// 管理員專用：取得所有用戶資料
const getUsers = handleErrorAsync(async (req: Request, res: Response, next: NextFunction) => {
  const customReq = req as CustomRequest;
  if (!customReq.user || !isAdminOrSuperuser(customReq.user.role)) {
    throw createHttpError(403, '無權限訪問');
  }

  // 分頁參數
  const page = parseInt(String(req.query.page || '1'));
  const limit = parseInt(String(req.query.limit || '10'));
  const skip = (page - 1) * limit;

  // 排序參數
  const sortBy = String(req.query.sortBy || 'createdAt');
  const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;

  // 篩選參數
  const filter: any = {};
  
  // 搜尋條件
  if (req.query.search) {
    const searchRegex = new RegExp(String(req.query.search), 'i');
    filter.$or = [
      { email: searchRegex },
      { phone: searchRegex },
      { country: searchRegex }
    ];
  }

  // 角色篩選
  if (req.query.role) {
    filter.role = req.query.role;
  }

  // 郵件驗證狀態篩選
  if (req.query.isEmailVerified) {
    filter.isEmailVerified = req.query.isEmailVerified === 'true';
  }

  // 日期範圍篩選
  if (req.query.startDate || req.query.endDate) {
    filter.createdAt = {};
    if (req.query.startDate) {
      filter.createdAt.$gte = new Date(String(req.query.startDate));
    }
    if (req.query.endDate) {
      filter.createdAt.$lte = new Date(String(req.query.endDate));
    }
  }

  // 執行查詢
  const [users, total] = await Promise.all([
    UsersModel.find(filter)
      .select('-password -verificationToken -verificationTokenExpires -passwordResetToken -passwordResetExpires -lastVerificationAttempt')
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit),
    UsersModel.countDocuments(filter)
  ]);

  // 計算總頁數
  const totalPages = Math.ceil(total / limit);

  res.json({
    status: 'success',
    data: {
      users,
      pagination: {
        total,
        totalPages,
        currentPage: page,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    }
  });
});

// 管理員專用：更新用戶資料
const updateUser = handleErrorAsync(async (req: Request, res: Response, next: NextFunction) => {
  const customReq = req as CustomRequest;
  if (!customReq.user || !isAdminOrSuperuser(customReq.user.role)) {
    throw createHttpError(403, '無權限訪問');
  }

  const userId = req.params.id;
  const updateData = req.body;

  // 移除不允許更新的欄位
  delete updateData.password;
  delete updateData.verificationToken;
  delete updateData.verificationTokenExpires;
  delete updateData.passwordResetToken;
  delete updateData.passwordResetExpires;
  delete updateData.lastVerificationAttempt;

  const updatedUser = await UsersModel.findByIdAndUpdate(
    userId,
    updateData,
    { new: true, runValidators: true }
  ).select('-password -verificationToken -verificationTokenExpires -passwordResetToken -passwordResetExpires -lastVerificationAttempt');

  if (!updatedUser) {
    throw createHttpError(404, '找不到用戶資料');
  }

  res.json({
    status: 'success',
    data: updatedUser
  });
});

// 管理員專用：刪除用戶
const deleteUser = handleErrorAsync(async (req: Request, res: Response, next: NextFunction) => {
  const customReq = req as CustomRequest;
  if (!customReq.user || !isAdminOrSuperuser(customReq.user.role)) {
    throw createHttpError(403, '無權限訪問');
  }

  const userId = req.params.id;
  const deletedUser = await UsersModel.findByIdAndDelete(userId);

  if (!deletedUser) {
    throw createHttpError(404, '找不到用戶資料');
  }

  res.json({
    status: 'success',
    message: '用戶已刪除'
  });
});

export {
  getUsers,
  updateUser,
  deleteUser
}; 