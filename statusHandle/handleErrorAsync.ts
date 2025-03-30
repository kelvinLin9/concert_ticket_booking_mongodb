import { Request, Response, NextFunction } from 'express';

export const handleErrorAsync = (func: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await func(req, res, next);  // 嘗試執行原始函數
    } catch (error) {
      next(error);  // 捕捉到錯誤時，使用 next 將錯誤傳遞給 Express 的錯誤處理中間件
    }
  };
};

// 在 Express 中，當 next 被調用並且傳入一個錯誤對象時，Express 會尋找下一個錯誤處理中間件來處理這個錯誤。因此，你應該在你的 Express 應用中有一個錯誤處理中間件來處理這些錯誤，例如：

// app.use((err, req, res, next) => {
//   const statusCode = err.statusCode || 500;
//   res.status(statusCode).json({
//       error: {
//           message: err.message || 'An unknown error occurred.'
//       }
//   });
// });

// 通過這種方式，handleErrorAsync 能夠將錯誤處理的責任從每個單獨的路由處理器中抽離出來，並確保所有異常都能被統一和正確地處理。