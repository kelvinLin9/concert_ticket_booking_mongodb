import express from 'express';
import { isAuth } from '../middlewares/index';
import { getUsers, updateUser, deleteUser } from '../controller/admin';

const router = express.Router();

// 所有路由都需要管理員權限
router.use(isAuth);

// 用戶管理
router.get('/users', getUsers);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

export default router; 