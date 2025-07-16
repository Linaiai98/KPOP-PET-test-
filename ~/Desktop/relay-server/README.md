# 虚拟宠物中继服务器 v2.0

## 📋 项目简介

这是一个专为虚拟宠物插件设计的中继服务器，用于解决第三方API的CORS跨域问题。服务器作为代理，接收来自插件的请求并转发到目标API，然后将响应返回给插件。

## 🔧 主要功能

- ✅ **API代理** - 转发HTTP请求到任意第三方API
- ✅ **CORS解决** - 完全解决跨域访问问题
- ✅ **多API支持** - 支持OpenAI、Claude、Google、DeepSeek等所有API
- ✅ **Web管理界面** - 美观的HTML管理面板和API测试工具
- ✅ **错误处理** - 完善的错误处理和日志记录
- ✅ **健康检查** - 提供服务器状态监控
- ✅ **安全防护** - 使用Helmet提供基础安全防护

## 🚀 快速开始

### 方法1: 一键启动（推荐）
```bash
# 双击运行
start.bat
```

### 方法2: 手动启动
```bash
# 1. 安装依赖
npm install

# 2. 启动服务器
npm start

# 3. 开发模式（自动重启）
npm run dev
```

## 📡 API端点

| 端点 | 方法 | 描述 |
|------|------|------|
| `/` | GET | Web管理界面 |
| `/health` | GET | 健康检查 |
| `/test` | GET | 测试端点 |
| `/test.html` | GET | API测试工具 |
| `/proxy` | POST | API代理（主要功能） |

## 🌐 Web管理界面

启动服务器后，在浏览器中访问 `http://localhost:3000` 即可看到：

- **📊 实时状态监控** - 服务器运行状态、运行时间、请求统计
- **🧪 API测试工具** - 内置的API测试界面，支持各种API预设
- **📝 实时日志** - 查看服务器操作日志
- **🔧 快速操作** - 一键健康检查、代理测试等功能

## 🔄 代理使用方法

### 请求格式
```javascript
POST http://154.12.38.33:3000/proxy
Content-Type: application/json

{
  "targetUrl": "https://api.openai.com/v1/chat/completions",
  "method": "POST",
  "headers": {
    "Authorization": "Bearer your-api-key",
    "Content-Type": "application/json"
  },
  "body": {
    "model": "gpt-3.5-turbo",
    "messages": [{"role": "user", "content": "Hello"}]
  }
}
```

### 响应格式
服务器会转发目标API的完整响应，包括状态码、响应头和响应体。

## 🧪 测试服务器

```bash
# 运行测试脚本
npm test

# 或者手动测试
node test.js
```

## 🔧 配置说明

### 环境变量（.env文件）
```env
PORT=3000                    # 服务器端口
NODE_ENV=production          # 环境模式
REQUEST_TIMEOUT=30000        # 请求超时时间（毫秒）
MAX_REQUEST_SIZE=10mb        # 最大请求体大小
CORS_ORIGIN=*               # CORS允许的来源
```

## 🛠️ 故障排除

### 常见问题

#### 1. 端口被占用
```bash
# 查看端口占用
netstat -ano | findstr :3000

# 杀死占用进程
taskkill /PID <进程ID> /F
```

#### 2. 依赖安装失败
```bash
# 清除缓存重新安装
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

#### 3. 防火墙问题
- 确保端口3000在防火墙中开放
- 检查云服务器安全组设置

## 📊 日志说明

服务器会输出详细的请求日志：
- 🔄 收到代理请求
- 🎯 目标URL和请求方法
- 📋 请求头和请求体
- ✅ 目标API响应状态
- ❌ 错误信息和处理

## 🔒 安全特性

- **Helmet安全头** - 自动添加安全HTTP头
- **请求大小限制** - 防止大文件攻击
- **超时保护** - 防止长时间挂起
- **错误隔离** - 不暴露内部错误信息

## 📈 性能优化

- **异步处理** - 所有请求都是异步处理
- **连接复用** - 使用axios的连接池
- **内存管理** - 自动垃圾回收
- **优雅关闭** - 支持SIGTERM和SIGINT信号

## 🌐 部署建议

### 本地开发
```bash
npm run dev
```

### 生产环境
```bash
# 使用PM2管理进程
npm install -g pm2
pm2 start server.js --name "relay-server"
pm2 startup
pm2 save
```

### Docker部署
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 📞 技术支持

如果遇到问题，请检查：
1. Node.js版本 >= 16.0.0
2. 网络连接正常
3. 防火墙和安全组配置
4. 目标API的可用性

## 📝 更新日志

### v2.0.0
- ✅ 重写服务器架构
- ✅ 改进错误处理
- ✅ 添加详细日志
- ✅ 优化CORS配置
- ✅ 增加健康检查
- ✅ 添加测试脚本
