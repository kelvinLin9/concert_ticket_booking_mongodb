import { Request, Response } from 'express';

class UserController {
	// 註冊
	register = async (req: Request, res: Response) => {
        // ...內部具體的註冊邏輯
	};

	// 登入
	login = async (req: Request, res: Response) => {
     	// ... 內部具體的登入邏輯
	};
}

// 創建一個上述類的實例，將其匯出
export const userController = new UserController();
