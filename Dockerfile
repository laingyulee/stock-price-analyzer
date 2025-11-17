FROM node:24-alpine

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm install --only=production

# 复制源代码
COPY src ./src

# 构建前端
WORKDIR /app/src/ui
COPY src/ui/package*.json ./
RUN npm install && npm run build

WORKDIR /app

# 创建数据和日志目录
RUN mkdir -p data logs

# 环境变量
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_PATH=/app/data/stocks.db

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["node", "src/index.js"]