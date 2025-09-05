# 使用官方 Nginx 鏡像作為基礎鏡像
FROM nginx:alpine

# 將 nginx 配置文件複製到容器中
COPY nginx.conf /etc/nginx/nginx.conf

# 將 web 文件複製到 nginx 的默認目錄中
COPY . /usr/share/nginx/html

# 暴露 28400 端口
EXPOSE 28400

# 啟動 nginx
CMD ["nginx", "-g", "daemon off;"]
