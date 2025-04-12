# Docker 使用指南

本文檔提供使用 Docker 和 Docker Compose 運行此應用的詳細說明。

## 前提條件

- 安裝 [Docker](https://docs.docker.com/get-docker/)
- 安裝 [Docker Compose](https://docs.docker.com/compose/install/)

## 快速開始

### 開發環境

1. 複製環境變數範例文件並填入你的配置：

```bash
cp .env.docker.example .env.docker
```

2. 修改 `.env.docker` 文件，填入正確的環境變數值。

3. 使用 Docker Compose 啟動開發環境：

```bash
docker-compose up
```

應用將在 http://localhost:3000 上可用，並支持熱重載（代碼變更後自動更新）。

### 生產環境構建

1. 構建生產 Docker 映像：

```bash
docker build -t concert-ticket-app .
```

2. 運行生產容器：

```bash
docker run -p 3000:3000 --env-file .env.docker concert-ticket-app
```

## Docker Compose 配置說明

### 開發模式

```bash
# 啟動所有服務
docker-compose up

# 在背景運行
docker-compose up -d

# 查看日誌
docker-compose logs -f

# 停止所有服務
docker-compose down
```

### 自定義配置

如果需要自定義 Docker Compose 配置，可以創建 `docker-compose.override.yml` 文件。例如：

```yaml
version: "3.8"
services:
  app:
    environment:
      - NODE_ENV=development
      - DEBUG=app:*
```

## 常見問題排解

### 端口衝突

如果 3000 端口已被占用，可以修改映射端口：

```yaml
ports:
  - "3001:3000"
```

### MongoDB 連接問題

確保你的 MongoDB 連接字串正確。使用本地 MongoDB 容器時，連接字串應為：

```
mongodb://admin:password@mongodb:27017/concert-ticket-db
```

### 容器內調試

進入運行中的容器：

```bash
docker-compose exec app sh
```

### 清理 Docker 資源

```bash
# 刪除未使用的容器
docker container prune

# 刪除未使用的映像
docker image prune

# 刪除所有停止的容器
docker container prune -f

# 刪除所有未使用的 Docker 對象
docker system prune
```

## 部署到生產環境

### 使用 Docker 部署到 Render

1. 確保你的代碼庫包含 `Dockerfile`。
2. 在 Render 上創建新的 Web 服務。
3. 選擇 "Build and deploy from a git repository"。
4. 連接你的 GitHub/GitLab 存儲庫。
5. 選擇 "Docker" 作為環境。
6. Render 將自動檢測 Dockerfile 並構建映像。
7. 在環境變數部分設置必要的變數。
8. 點擊 "Create Web Service"。

Render 會自動構建你的 Docker 映像並部署應用。
