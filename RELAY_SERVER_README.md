# 虚拟宠物插件 - Node.js 中继服务器

## 🎯 功能说明

这个中继服务器解决了虚拟宠物插件在移动端和某些网络环境下无法直接访问第三方API的问题。

### 主要特性

- ✅ **API代理转发**：将插件的API请求转发到第三方服务
- ✅ **移动端优化**：解决移动设备网络连接问题
- ✅ **VPN绕过**：用户无需配置VPN即可访问受限API
- ✅ **错误处理**：完善的错误处理和重试机制
- ✅ **统计监控**：提供请求统计和服务器状态监控
- ✅ **CORS支持**：完整的跨域资源共享支持

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动服务器

```bash
# 生产环境
npm start

# 开发环境（自动重启）
npm run dev
```

### 3. 测试服务器

```bash
npm test
```

## 📡 服务器配置

### 默认配置

- **端口**: 3000
- **IP**: 0.0.0.0 (监听所有接口)
- **公网访问**: http://154.12.38.33:3000

### 环境变量

```bash
# 自定义端口
PORT=3000

# 生产环境
NODE_ENV=production
```

## 🔗 API端点

### 1. 健康检查

```http
GET /health
```

**响应示例**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 3600,
  "version": "1.0.0"
}
```

### 2. API代理

```http
POST /proxy
```

**请求体**:
```json
{
  "targetUrl": "https://api.openai.com/v1/chat/completions",
  "method": "POST",
  "headers": {
    "Content-Type": "application/json",
    "Authorization": "Bearer sk-..."
  },
  "body": {
    "model": "gpt-3.5-turbo",
    "messages": [{"role": "user", "content": "Hello"}]
  }
}
```

### 3. 统计信息

```http
GET /stats
```

**响应示例**:
```json
{
  "totalRequests": 150,
  "successRequests": 145,
  "errorRequests": 5,
  "successRate": "96.67%",
  "uptime": 7200,
  "memory": {...},
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## 🔧 插件集成

插件已自动配置为使用中继服务器。原来的API调用：

```javascript
// 原来的直连方式
fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: { ... },
  body: JSON.stringify({ ... })
})
```

现在通过中继服务器：

```javascript
// 通过中继服务器
fetch('http://154.12.38.33:3000/proxy', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    targetUrl: 'https://api.openai.com/v1/chat/completions',
    method: 'POST',
    headers: { ... },
    body: { ... }
  })
})
```

## 🛠️ 部署指南

### Windows服务器部署

1. **安装Node.js**
   - 下载并安装 Node.js 16+ 版本
   - 验证安装：`node --version`

2. **上传文件**
   - 将所有文件上传到服务器
   - 进入项目目录

3. **安装依赖**
   ```bash
   npm install
   ```

4. **启动服务**
   ```bash
   npm start
   ```

5. **配置防火墙**
   - 开放端口3000
   - 允许外部访问

### 使用PM2管理进程

```bash
# 安装PM2
npm install -g pm2

# 启动服务
pm2 start relay-server.js --name "virtual-pet-relay"

# 设置开机自启
pm2 startup
pm2 save

# 查看状态
pm2 status

# 查看日志
pm2 logs virtual-pet-relay
```

## 🔍 故障排除

### 常见问题

#### 1. 端口被占用
```bash
# 查看端口占用
netstat -ano | findstr :3000

# 杀死进程
taskkill /PID <进程ID> /F
```

#### 2. 防火墙阻拦
- 检查Windows防火墙设置
- 确保端口3000已开放
- 检查云服务器安全组设置

#### 3. 网络连接问题
```bash
# 测试本地连接
curl http://localhost:3000/health

# 测试公网连接
curl http://154.12.38.33:3000/health
```

### 调试模式

启用详细日志：

```bash
DEBUG=* npm start
```

## 📊 监控和维护

### 日志查看

```bash
# 实时查看日志
pm2 logs virtual-pet-relay --lines 100

# 查看错误日志
pm2 logs virtual-pet-relay --err
```

### 性能监控

```bash
# 查看进程状态
pm2 monit

# 重启服务
pm2 restart virtual-pet-relay

# 重载配置
pm2 reload virtual-pet-relay
```

## 🔒 安全建议

### 生产环境配置

1. **限制CORS来源**
   ```javascript
   app.use(cors({
     origin: ['chrome-extension://your-extension-id'],
     credentials: true
   }));
   ```

2. **添加请求限制**
   ```bash
   npm install express-rate-limit
   ```

3. **启用HTTPS**
   - 配置SSL证书
   - 使用反向代理（Nginx）

4. **监控和日志**
   - 配置日志轮转
   - 设置监控告警

## 📞 支持

如果遇到问题，请检查：

1. ✅ Node.js版本 >= 14.0.0
2. ✅ 所有依赖已正确安装
3. ✅ 防火墙和网络配置正确
4. ✅ 服务器有足够的内存和CPU资源

## 🎉 测试验证

在浏览器控制台运行：

```javascript
// 测试中继服务器连接
testRelayServer()

// 测试插件API调用
// 配置好API后，尝试与宠物聊天
```

现在你的虚拟宠物插件可以通过中继服务器稳定访问各种第三方API了！🚀
