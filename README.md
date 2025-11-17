# 股票目标价分析器

股票目标价分析器是一个基于Node.js和React的智能股票分析系统，使用多种技术分析方法预测股票的目标价格。该项目采用前后端分离架构，后端使用Express框架提供API服务，前端使用React构建用户界面，支持实时股价分析、技术指标计算和目标价预测等功能。

## 功能特色

- **多因子目标价预测**：结合布林带、斐波那契回调、支撑阻力位、移动平均线等多种技术指标
- **LLM智能分析**：集成大语言模型进行深入的股票分析
- **详细的财务指标**：展示估值指标、盈利能力、财务健康状况、增长指标等
- **技术指标分析**：RSI、MACD、布林带、ADX等技术指标
- **可视化图表**：股价走势图、技术指标图表
- **分析师评级**：整合分析师目标价和推荐评级

## 部署选项

### 1. 传统部署

使用PM2和Nginx进行部署：

```bash
# 安装依赖
npm install

# 构建前端
npm run build

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件设置 API 密钥等配置

# 启动应用
npm start
```

### 2. 自动化部署脚本

项目包含一个自动化部署脚本，简化生产环境部署：

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

### 3. Docker部署

使用Docker进行容器化部署：

```bash
# 构建并启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

## 环境配置

创建 `.env` 文件配置以下变量：

```
DATABASE_PATH=./data/stocks.db
PORT=3000
NODE_ENV=development
API_BASE_URL=http://yfinance_proxy:8080
LLM_API_ENDPOINT=your_llm_api_endpoint
LLM_API_KEY=your_llm_api_key
LLM_MODEL_NAME=your_llm_model_name
```

其中 `API_BASE_URL` 是远程股票数据API的地址，默认为 `http://yfinance_proxy:8080。

## API接口

- `GET /api/health` - 健康检查
- `GET /api/stock/:symbol` - 获取股票数据
- `GET /api/analysis/:symbol` - 获取技术分析结果
- `POST /api/stock/:symbol/refresh` - 刷新股票数据
- `GET /api/llm-analysis/:symbol` - 获取LLM分析结果
- `POST /api/llm-analysis/:symbol/refresh` - 刷新LLM分析
- `GET /api/llm-analysis/:symbol/prompt` - 获取LLM分析的prompt

## 开发

### 启动开发服务器

```bash
npm run dev
```

### 运行测试

```bash
npm test
```

## 许可证

MIT License