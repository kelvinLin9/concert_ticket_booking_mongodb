/**
 * 操作型錯誤類，用於處理可預期的業務邏輯錯誤
 */
export class AppError extends Error {
  status: number;
  code: string;
  isOperational: boolean;
  name: string = 'AppError'; // 顯式類型標記

  constructor(message: string, statusCode = 400, errorCode = 'ERROR') {
    super(message);
    this.status = statusCode;
    this.code = errorCode;
    this.isOperational = true;  // 標記為操作型錯誤

    Error.captureStackTrace(this, this.constructor);
  }
} 