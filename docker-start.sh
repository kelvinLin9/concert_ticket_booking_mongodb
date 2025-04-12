#!/bin/bash

# 提供顏色輸出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 顯示菜單
echo -e "${GREEN}===== 音樂會票務系統 Docker 啟動工具 =====${NC}"
echo -e "請選擇運行模式:"
echo -e "  ${YELLOW}1${NC}) 開發模式 (代碼熱重載)"
echo -e "  ${YELLOW}2${NC}) 生產模式"
echo -e "  ${YELLOW}3${NC}) 測試 TypeScript 編譯"
echo -e "  ${YELLOW}4${NC}) 停止所有容器"
echo -e "  ${YELLOW}5${NC}) 清理 Docker 資源"
echo -e "  ${YELLOW}0${NC}) 退出"

# 獲取用戶選擇
read -p "請輸入選項 [0-5]: " option

case $option in
  1)
    echo -e "${GREEN}啟動開發模式...${NC}"
    docker-compose up
    ;;
    
  2)
    echo -e "${GREEN}啟動生產模式...${NC}"
    docker build -t concert-ticket-app .
    docker run -p 3000:3000 concert-ticket-app
    ;;
    
  3)
    echo -e "${GREEN}測試 TypeScript 編譯...${NC}"
    ./docker-typescript-test.sh
    ;;
    
  4)
    echo -e "${YELLOW}停止所有容器...${NC}"
    docker-compose down
    docker ps -a | grep concert-ticket-app | awk '{print $1}' | xargs -r docker stop
    echo -e "${GREEN}所有容器已停止${NC}"
    ;;
    
  5)
    echo -e "${YELLOW}清理 Docker 資源...${NC}"
    read -p "這將刪除未使用的映像、容器和卷。確定嗎? (y/n): " confirm
    if [ "$confirm" = "y" ]; then
      docker system prune -f
      echo -e "${GREEN}Docker 資源已清理${NC}"
    else
      echo -e "${YELLOW}已取消清理${NC}"
    fi
    ;;
    
  0)
    echo -e "${GREEN}謝謝使用，再見！${NC}"
    exit 0
    ;;
    
  *)
    echo -e "${RED}無效選項，請重新運行腳本${NC}"
    exit 1
    ;;
esac 