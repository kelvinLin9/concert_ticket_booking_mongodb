// 使用 ES6 import 語法導入模塊
import multer from 'multer';
import path from 'path';

// 設置 multer，用於處理上傳檔案的中間件配置
const upload = multer({
  limits: {
    fileSize: 2 * 1024 * 1024, // 限制檔案大小為 2MB
  },
  fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase(); // 獲取檔案的擴展名並轉為小寫
    if (ext !== '.jpg' && ext !== '.png' && ext !== '.jpeg') {
      cb(new Error("檔案格式錯誤，僅限上傳 jpg、jpeg 與 png 格式。")); // 如果檔案格式不是 jpg, jpeg 或 png，返回錯誤
    } else {
      cb(null, true); // 如果檔案格式正確，則通過檔案
    }
  },
}).any(); // 接受任何文件的上傳

// 使用 ES6 的 export default 語法導出模塊
export default upload;
