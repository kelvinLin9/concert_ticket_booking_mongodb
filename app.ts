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

// 錯誤處理中間件
app.use((err: Error & { status?: number }, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.log('process.env.NODE_ENV', process.env.NODE_ENV)
  const isDevelopment = process.env.NODE_ENV === 'development';
  const statusCode = err.status || 500;

  if (isDevelopment) {
    res.status(statusCode).json({
      success: false,
      error: {
        message: err.message,
        stack: err.stack
      }
    });
  } else {
    res.status(statusCode).json({
      success: false,
      message: '系統發生錯誤'
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
