# 部署指南

## 生产环境部署

### 1. 服务器要求
- Ubuntu 20.04+ / CentOS 8+ / RHEL 8+
- Node.js 16.0+
- 至少 2GB RAM
- 至少 10GB 存储空间

### 2. 环境准备

#### 安装 Node.js
```bash
# 使用 NVM 安装 Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
```

#### 安装 PM2 (进程管理器)
```bash
npm install -g pm2
```

#### 安装 Nginx (反向代理)
```bash
sudo apt update
sudo apt install nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 3. 部署应用

#### 克隆代码
```bash
cd /var/www
git clone <your-repository-url> stock-analyzer
cd stock-analyzer
```

#### 安装依赖
```bash
npm install
cd src/ui && npm install && npm run build && cd ../..
```

#### 配置环境变量
```bash
cp .env.example .env
nano .env
```

生产环境配置示例：
```
DATABASE_PATH=/var/www/stock-analyzer/data/stocks.db
PORT=3000
NODE_ENV=production
API_BASE_URL=http://yfinance_proxy:8080
LLM_API_ENDPOINT=your_llm_api_endpoint
LLM_API_KEY=your_llm_api_key
LLM_MODEL_NAME=your_llm_model_name
```

其中 `API_BASE_URL` 是远程股票数据API的地址，默认为 `http://yfinance_proxy:8080`。如果需要使用不同的API服务器，可以修改此配置项。

#### 创建数据目录
```bash
mkdir -p data
chmod 755 data
```

### 4. 配置 PM2

创建 PM2 配置文件 `ecosystem.config.js`：
```javascript
module.exports = {
  apps: [{
    name: 'stock-analyzer',
    script: './src/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max_old_space_size=1024'
  }]
};
```

创建日志目录：
```bash
mkdir -p logs
chmod 755 logs
```

启动应用：
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 5. 配置 Nginx

创建 Nginx 配置文件 `/etc/nginx/sites-available/stock-analyzer`：
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /var/www/stock-analyzer/src/ui/build;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
        
        # Cache static files
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # API 代理
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Increase timeouts for API calls
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript;
}
```

启用配置：
```bash
sudo ln -s /etc/nginx/sites-available/stock-analyzer /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. HTTPS 配置 (可选)

使用 Let's Encrypt 免费证书：
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 7. 数据库维护

设置定时清理旧数据的 cron 任务：
```bash
crontab -e
```

添加以下内容（每天凌晨2点清理30天前的数据）：
```
0 2 * * * cd /var/www/stock-analyzer && node -e "
const { db, initialize } = require('./src/database/init');
initialize((err) => {
  if (err) {
    console.error('Database initialization error:', err);
    process.exit(1);
  }

  // Clean up old data (older than 30 days)
  db.run('DELETE FROM daily_prices WHERE date < date(\"now\", \"-30 days\")', (err) => {
    if (err) {
      console.error('Error cleaning up old data:', err);
    } else {
      console.log('Old data cleaned up successfully');
    }
  });
  
  // Clean up old analysis (older than 30 days)
  db.run('DELETE FROM price_analysis WHERE analysis_date < date(\"now\", \"-30 days\")', (err) => {
    if (err) {
      console.error('Error cleaning up old analysis:', err);
    } else {
      console.log('Old analysis cleaned up successfully');
    }
  });
  
  db.close();
});
" >> logs/cleanup.log 2>&1
```

### 8. 监控和日志

#### 查看应用状态
```bash
pm2 status
pm2 logs stock-analyzer
```

#### 重启应用
```bash
pm2 restart stock-analyzer
```

#### 查看系统资源
```bash
pm2 monit
```

#### 查看访问日志
```bash
sudo tail -f /var/log/nginx/access.log
```

## 自动化部署脚本

项目包含一个自动化部署脚本 `deploy.sh`，可以简化部署过程。

### 使用方法

```bash
# 全新安装
sudo ./deploy.sh --setup

# 更新现有部署
sudo ./deploy.sh --update

# 回滚到上一个版本
sudo ./deploy.sh --rollback

# 查看当前状态
sudo ./deploy.sh --status
```

### 脚本功能

1. 自动安装系统依赖（Node.js, PM2, Nginx等）
2. 创建专用应用用户
3. 设置应用目录结构
4. 克隆或更新代码仓库
5. 安装应用依赖并构建前端
6. 配置环境变量
7. 设置PM2进程管理
8. 配置Nginx反向代理
9. 可选SSL证书配置
10. 设置定时清理任务
11. 备份和回滚功能

## Docker 部署

### 1. 创建 Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

# 安装依赖
COPY package*.json ./
RUN npm ci --only=production

# 构建前端
COPY src/ui ./src/ui
WORKDIR /app/src/ui
RUN npm ci && npm run build
WORKDIR /app

# 复制源代码
COPY src ./src

# 创建数据目录
RUN mkdir -p data logs

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["node", "src/index.js"]
```

### 2. 创建 docker-compose.yml

```yaml
version: '3.8'

services:
  stock-analyzer:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - API_BASE_URL=http://yfinance_proxy:8080
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./src/ui/build:/usr/share/nginx/html
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - stock-analyzer
    restart: unless-stopped
```

### 3. 使用 Docker 部署

```bash
# 构建和启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

## 故障排除

### 常见问题

1. **API调用失败**
   - 检查 LLM API 密钥是否正确
   - 确认 API 配额是否用完

2. **数据库连接错误**
   - 检查数据库文件路径是否正确
   - 确认目录权限是否足够

3. **前端无法访问API**
   - 检查 Nginx 代理配置
   - 确认防火墙设置

4. **内存不足**
   - 增加 PM2 的 max_memory_restart 设置
   - 优化数据查询和缓存

### 日志分析

```bash
# 应用错误日志
tail -f logs/err.log

# Nginx 访问日志
tail -f /var/log/nginx/access.log

# 系统资源监控
htop
df -h
```

### 性能优化

1. **数据库优化**
   - 定期清理旧数据
   - 添加适当索引

2. **缓存策略**
   - 为API响应添加缓存
   - 使用 Redis 缓存热点数据

3. **负载均衡**
   - 使用 PM2 cluster 模式
   - 考虑多实例部署

## 备份和恢复

### 数据备份
```bash
# 备份数据库
cp data/stocks.db backups/stocks-$(date +%Y%m%d).db

# 自动备份脚本
#!/bin/bash
BACKUP_DIR="/var/backups/stock-analyzer"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
cp /var/www/stock-analyzer/data/stocks.db $BACKUP_DIR/stocks-$DATE.db

# 保留最近30天的备份
find $BACKUP_DIR -name "stocks-*.db" -mtime +30 -delete
```

### 数据恢复
```bash
# 停止应用
pm2 stop stock-analyzer

# 恢复数据库
cp backups/stocks-20231201.db data/stocks.db

# 重启应用
pm2 start stock-analyzer
```