import { Router } from 'express';
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

const router = Router();

// 取得使用者資訊
router.get('/profile', isAuth, handleErrorAsync(getUser));

// 更新使用者資訊
router.put('/profile', isAuth, checkRequestBodyValidator, handleErrorAsync(updateInfo));

// 更新角色
router.put('/update-role', isAuth, updateRole);

// 管理員功能
router.get('/', isAuth, getUsers);
router.put('/:id', isAuth, adminUpdateUserInfo);
router.delete('/:id', isAuth, adminDeleteUser);

export default router;