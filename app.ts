import express from 'express';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';

// 另外裝的
import dotenv from 'dotenv';
dotenv.config();
import helmet from 'helmet';
import cors from 'cors';
import mongoose from 'mongoose';
import swaggerUi from 'swagger-ui-express';
import { specs } from './swagger';

// 引入路由
import authRouter from './routes/auth';
import userRouter from './routes/users';
import verifyRouter from './routes/verify';
import adminRouter from './routes/admin';



const app = express();


// 未捕獲的異常處理
process.on('uncaughtException', (err) => {
  console.error('未捕獲的異常:', err);
  process.exit(1);
});

// 未處理的 Promise 拒絕處理
process.on('unhandledRejection', (reason, promise) => {
  console.error('未處理的 Promise 拒絕:', promise, '原因:', reason);
});

// 資料庫連接
mongoose.connect(`mongodb+srv://kelvin80121:${process.env.DB_CONNECTION_STRING}@cluster0.0asbuyk.mongodb.net/Cluster0`)
  .then(() => console.log("資料庫連接成功"))
  .catch(err => console.log("資料庫連接失敗:", err));

// 中間件設置
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// 路由設置
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', userRouter);
app.use('/api/v1/verify', verifyRouter);
app.use('/api/v1/admin', adminRouter);

// 錯誤處理中間件
app.use((err: Error & { 
  status?: number, 
  code?: string, 
  isOperational?: boolean,
  name?: string,
  remainingSeconds?: number,
  // 添加任何其他可能的自定義屬性
  [key: string]: any
}, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('應用錯誤:', err);
  console.error('錯誤類型:', err.constructor.name);
  console.error('錯誤名稱:', err.name);
  console.error('錯誤堆棧:', err.stack);
  console.error('isOperational:', err.isOperational);
  console.error('錯誤屬性:', Object.keys(err));
  
  const statusCode = err.status || 500;
  
  // 使用 isOperational 標記 或 檢查錯誤名稱是否為 AppError
  const isAppError = err.isOperational === true || err.name === 'AppError';
  
  // 測試環境中返回完整錯誤信息
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (isAppError) {
    // 構建錯誤響應對象
    const errorResponse: any = {
      success: false,
      message: err.message,
      errorCode: err.code || 'ERROR'
    };
    
    // 添加可能的其他自定義屬性
    if (err.remainingSeconds) {
      errorResponse.remainingSeconds = err.remainingSeconds;
    }
    
    // 添加任何其他用戶定義的屬性，但排除內部屬性
    Object.keys(err).forEach(key => {
      if (!['status', 'code', 'isOperational', 'message', 'stack', 'name'].includes(key)) {
        errorResponse[key] = err[key];
      }
    });
    
    res.status(statusCode).json(errorResponse);
  } else {
    // 當為非操作型錯誤時（如系統異常、程序錯誤）
    // if (isDevelopment) {
    //   res.status(statusCode).json({
    //     success: false,
    //     message: err.message || '系統發生錯誤',
    //     errorCode: 'SYSTEM_ERROR',
    //     stack: err.stack,
    //     error: err
    //   });
    // } else {
    //   res.status(statusCode).json({
    //     success: false,
    //     message: '系統發生錯誤',
    //     errorCode: 'SYSTEM_ERROR'
    //   });
    // }
    // 先一律這樣返回
    res.status(statusCode).json({
      success: false,
      message: err.message || '系統發生錯誤',
      errorCode: 'SYSTEM_ERROR',
      // stack: err.stack,
      error: err
    });
  }
});

// 404 處理中間件
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: '找不到該資源'
  });
});



// view engine setup 之後研究
// app.set('views', path.join(__dirname, 'views'));
// app.set('view engine', 'jade');

export default app;
