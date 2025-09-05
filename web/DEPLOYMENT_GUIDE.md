# Web 介面部署指南

本指南將幫助您部署 BreezyVoice 的 Web 介面部分。

## 前提條件

- 已安裝 Git
- 已註冊 GitHub 帳戶
- 已安裝 Docker (可選，用於容器化部署)

## 步驟 1: Fork 原始倉庫

1. 訪問原始倉庫: https://github.com/mtkresearch/BreezyVoice
2. 點擊右上角的 "Fork" 按鈕
3. 選擇您的帳戶作為目標帳戶
4. 等待 fork 完成

## 步驟 2: 克隆您的 Fork 到本地

```bash
# 將 YOUR_USERNAME 替換為您的 GitHub 用戶名
git clone https://github.com/YOUR_USERNAME/BreezyVoice.git
cd BreezyVoice
```

## 步驟 3: 添加上游倉庫

為了保持與原始倉庫的同步，請添加上游遠程倉庫：

```bash
git remote add upstream https://github.com/mtkresearch/BreezyVoice.git
```

## 步驟 4: 創建新分支（可選但推薦）

```bash
git checkout -b web-interface-deployment
```

## 步驟 5: 部署 Web 介面

### 選項 1: 使用 Docker（推薦）

1. 確保您在 BreezyVoice/web 目錄中
2. 構建 Docker 鏡像：

```bash
docker build -t breezyvoice-web .
```

3. 運行容器：

```bash
docker run -d -p 8080:80 --name breezyvoice-web-container breezyvoice-web
```

4. 打開瀏覽器訪問 http://localhost:8080

### 選項 2: 直接使用文件服務器

您可以使用任何 Web 服務器來提供 web 目錄中的文件，例如：

#### 使用 Python 內置服務器：

```bash
cd web
python -m http.server 8080
```

#### 使用 Node.js http-server：

```bash
cd web
npx http-server -p 8080
```

## 步驟 6: 推送更改到您的 Fork

如果您對文件進行了任何修改，請按照以下步驟推送：

```bash
# 添加更改
git add .

# 提交更改
git commit -m "Add web interface deployment files"

# 推送到您的 fork
git push origin main
# 或者如果您創建了新分支：
# git push origin web-interface-deployment
```

## 步驟 7: 保持與上游同步（可選）

定期同步您的 fork 以獲取最新的更改：

```bash
# 獲取上游更改
git fetch upstream

# 合併到您的本地 main 分支
git checkout main
git merge upstream/main

# 推送到您的 fork
git push origin main
```

## 注意事項

1. Web 介面假設後端 API 在 `/api/` 路徑下可用。Nginx 配置已設置代理將這些請求轉發到後端服務。
2. 如果您單獨部署前端和後端，請確保相應地調整代理設置。
3. 在生產環境中，您可能需要配置 SSL 證書和其他安全設置。
