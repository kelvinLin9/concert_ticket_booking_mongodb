#!/bin/bash
# 測試 Docker 中的 TypeScript 編譯

echo "===== 測試 Docker TypeScript 編譯 ====="

# 創建臨時 Dockerfile.test
cat > Dockerfile.test << 'EOF'
FROM node:18-alpine

WORKDIR /app

# 複製 package.json 和 package-lock.json
COPY package*.json ./

# 安裝依賴，但不執行 postinstall script
RUN npm install --ignore-scripts

# 複製 tsconfig.json
COPY tsconfig.json ./

# 複製源代碼
COPY . .

# 測試 TypeScript 編譯
CMD ["./node_modules/.bin/tsc", "--noEmit"]
EOF

echo "正在構建測試容器..."
docker build -t typescript-test -f Dockerfile.test .

echo "正在運行 TypeScript 編譯測試..."
docker run --rm typescript-test

# 檢查上一個命令的退出碼
if [ $? -eq 0 ]; then
    echo "✓ TypeScript 編譯測試通過！"
    echo "現在可以嘗試完整構建和運行應用："
    echo "docker-compose up"
else
    echo "✗ TypeScript 編譯測試失敗"
    echo "請檢查上面的錯誤信息來修復 TypeScript 問題"
fi

# 清理臨時文件
rm Dockerfile.test

echo "===== 測試完成 =====" 