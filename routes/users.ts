import express from 'express';
import {
  getUser,
  getUsers,
  updateInfo,
  updateRole,
  adminUpdateUserInfo,
  adminDeleteUser,
} from '../controller/user';
import { checkRequestBodyValidator, isAuth } from '../middlewares/index';
import { handleErrorAsync } from '../statusHandle/handleErrorAsync';
import { Request, Response } from 'express';
import { CustomRequest } from '../middlewares';
import UsersModel from '../models/user';
import createHttpError from 'http-errors';

const router = express.Router();

// 取得當前用戶資料
router.get('/profile', isAuth, handleErrorAsync(async (req: Request, res: Response) => {
  const customReq = req as CustomRequest;
  if (!customReq.user) {
    throw createHttpError(401, '請先登入');
  }

  const user = await UsersModel.findById(customReq.user.userId)
    .select('-password -verificationToken');

  if (!user) {
    return res.status(404).json({
      success: false,
      message: '找不到用戶資料'
    });
  }

  // 準備完整的用戶資料
  const userData = {
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
  };

  res.json({
    success: true,
    user: userData
  });
}));

// 更新使用者資訊
router.put('/profile', isAuth, checkRequestBodyValidator, handleErrorAsync(updateInfo));

// 更新角色
router.put('/update-role', isAuth, updateRole);

// 管理員功能
router.get('/', isAuth, getUsers);
router.put('/:id', isAuth, adminUpdateUserInfo);
router.delete('/:id', isAuth, adminDeleteUser);

export default router;