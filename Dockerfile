FROM node:18-alpine

WORKDIR /app

# 設置環境變數
ENV NODE_ENV=production

# 複製 package.json 和 package-lock.json
COPY package*.json ./

# 安裝依賴 - 不執行 postinstall script 避免前置編譯錯誤
RUN npm install --ignore-scripts

# 複製 tsconfig.json 和其他配置文件
COPY tsconfig.json ./

# 複製源代碼
COPY . .

# 使用絕對路徑的 TypeScript 編譯器進行構建
RUN ./node_modules/.bin/tsc

# 暴露端口
EXPOSE 3000

# 啟動應用
CMD ["node", "dist/bin/server.js"] 