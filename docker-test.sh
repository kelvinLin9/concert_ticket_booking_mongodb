#!/bin/bash
# 測試 Docker 配置是否正確的腳本

echo "===== 測試 Docker 配置 ====="

# 檢查 Docker 是否已安裝
if ! command -v docker &> /dev/null; then
    echo "錯誤: Docker 未安裝!"
    exit 1
else
    echo "✓ Docker 已安裝"
    docker --version
fi

# 檢查 Docker Compose 是否已安裝
if ! command -v docker-compose &> /dev/null; then
    echo "錯誤: Docker Compose 未安裝!"
    exit 1
else
    echo "✓ Docker Compose 已安裝"
    docker-compose --version
fi

# 檢查 Dockerfile 是否存在
if [ ! -f "Dockerfile" ]; then
    echo "錯誤: Dockerfile 不存在!"
    exit 1
else
    echo "✓ Dockerfile 存在"
fi

# 檢查 docker-compose.yml 是否存在
if [ ! -f "docker-compose.yml" ]; then
    echo "錯誤: docker-compose.yml 不存在!"
    exit 1
else
    echo "✓ docker-compose.yml 存在"
fi

# 確認環境變數範例文件存在
if [ ! -f ".env.docker.example" ]; then
    echo "警告: .env.docker.example 不存在"
else
    echo "✓ 環境變數範例文件存在"
fi

# 檢查環境變數文件
if [ ! -f ".env.docker" ]; then
    echo "警告: .env.docker 不存在，將從範例文件創建"
    if [ -f ".env.docker.example" ]; then
        cp .env.docker.example .env.docker
        echo "  已從範例文件創建 .env.docker，請確保更新其中的變數值"
    else
        echo "  無法創建 .env.docker，範例文件不存在"
    fi
else
    echo "✓ .env.docker 文件存在"
fi

# 嘗試構建 Docker 映像
echo "正在測試 Docker 映像構建..."
if ! docker build -t concert-ticket-app-test . ; then
    echo "錯誤: Docker 映像構建失敗!"
    exit 1
else
    echo "✓ Docker 映像構建成功"
    # 清理測試映像
    docker rmi concert-ticket-app-test
fi

echo "===== Docker 配置測試完成 ====="
echo "你可以使用以下命令啟動應用："
echo "docker-compose up" 