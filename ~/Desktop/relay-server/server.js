const express = require('express');
const cors = require('cors');
const axios = require('axios');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 安全中间件
app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false
}));

// CORS配置 - 允许所有来源
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key', 'x-goog-api-key', 'anthropic-version'],
    credentials: false
}));

// 请求日志
app.use(morgan('combined'));

// 解析JSON请求体
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件服务
app.use(express.static('public'));

// 健康检查端点
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        uptime: process.uptime()
    });
});

// 服务器信息端点 - 重定向到HTML管理界面
app.get('/', (req, res) => {
    // 如果请求头包含 Accept: application/json，返回JSON
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
        res.json({
            name: 'Virtual Pet Relay Server',
            version: '2.0.0',
            description: '虚拟宠物插件中继服务器 - 解决API CORS问题',
            endpoints: {
                '/health': 'GET - 健康检查',
                '/proxy': 'POST - API代理',
                '/test': 'GET - 测试端点'
            },
            timestamp: new Date().toISOString()
        });
    } else {
        // 否则返回HTML管理界面
        res.sendFile('index.html', { root: './public' });
    }
});

// 测试端点
app.get('/test', (req, res) => {
    res.json({
        message: '中继服务器运行正常',
        timestamp: new Date().toISOString(),
        clientIP: req.ip,
        userAgent: req.get('User-Agent')
    });
});

// 主要的代理端点
app.post('/proxy', async (req, res) => {
    console.log('\n🔄 收到代理请求:', new Date().toISOString());
    console.log('📋 请求体:', JSON.stringify(req.body, null, 2));
    
    try {
        const { targetUrl, method = 'POST', headers = {}, body } = req.body;
        
        // 验证必需参数
        if (!targetUrl) {
            console.log('❌ 缺少目标URL');
            return res.status(400).json({
                error: 'Missing targetUrl',
                message: '请提供目标API的URL'
            });
        }
        
        console.log(`🎯 目标URL: ${targetUrl}`);
        console.log(`📤 请求方法: ${method}`);
        console.log(`📋 请求头:`, headers);
        
        // 构建axios请求配置
        const axiosConfig = {
            method: method.toLowerCase(),
            url: targetUrl,
            headers: {
                'User-Agent': 'Virtual-Pet-Relay-Server/2.0.0',
                ...headers
            },
            timeout: 30000, // 30秒超时
            validateStatus: () => true // 接受所有状态码
        };
        
        // 添加请求体（如果有）
        if (body && (method.toUpperCase() === 'POST' || method.toUpperCase() === 'PUT')) {
            axiosConfig.data = body;
        }
        
        console.log('🚀 发送请求到目标API...');
        
        // 发送请求到目标API
        const response = await axios(axiosConfig);
        
        console.log(`✅ 目标API响应: ${response.status} ${response.statusText}`);
        console.log('📦 响应头:', response.headers);
        
        // 转发响应
        res.status(response.status);
        
        // 设置响应头（过滤掉一些不需要的头）
        const excludeHeaders = ['content-encoding', 'transfer-encoding', 'connection'];
        Object.keys(response.headers).forEach(key => {
            if (!excludeHeaders.includes(key.toLowerCase())) {
                res.set(key, response.headers[key]);
            }
        });
        
        // 返回响应数据
        res.json(response.data);
        
    } catch (error) {
        console.error('❌ 代理请求失败:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.error('🔌 连接被拒绝 - 目标服务器可能未运行');
            res.status(503).json({
                error: 'Service Unavailable',
                message: '目标API服务器连接失败',
                details: error.message
            });
        } else if (error.code === 'ETIMEDOUT') {
            console.error('⏰ 请求超时');
            res.status(504).json({
                error: 'Gateway Timeout',
                message: '目标API请求超时',
                details: error.message
            });
        } else if (error.response) {
            // 目标API返回了错误响应
            console.error(`🚫 目标API错误: ${error.response.status} ${error.response.statusText}`);
            res.status(error.response.status).json({
                error: 'Target API Error',
                message: '目标API返回错误',
                status: error.response.status,
                statusText: error.response.statusText,
                data: error.response.data
            });
        } else {
            console.error('💥 未知错误:', error);
            res.status(500).json({
                error: 'Internal Server Error',
                message: '中继服务器内部错误',
                details: error.message
            });
        }
    }
});

// 错误处理中间件
app.use((error, req, res, next) => {
    console.error('💥 服务器错误:', error);
    res.status(500).json({
        error: 'Internal Server Error',
        message: '服务器内部错误',
        timestamp: new Date().toISOString()
    });
});

// 404处理
app.use((req, res) => {
    console.log(`❓ 404 - 未找到路径: ${req.method} ${req.path}`);
    res.status(404).json({
        error: 'Not Found',
        message: `路径 ${req.method} ${req.path} 不存在`,
        availableEndpoints: [
            'GET /',
            'GET /health',
            'GET /test',
            'POST /proxy'
        ],
        timestamp: new Date().toISOString()
    });
});

// 启动服务器
app.listen(PORT, '0.0.0.0', () => {
    console.log('\n🚀 虚拟宠物中继服务器启动成功!');
    console.log(`📡 服务器地址: http://0.0.0.0:${PORT}`);
    console.log(`🌐 外部访问: http://154.12.38.33:${PORT}`);
    console.log(`📋 可用端点:`);
    console.log(`   GET  /          - 服务器信息`);
    console.log(`   GET  /health    - 健康检查`);
    console.log(`   GET  /test      - 测试端点`);
    console.log(`   POST /proxy     - API代理`);
    console.log(`⏰ 启动时间: ${new Date().toISOString()}\n`);
});

// 优雅关闭
process.on('SIGTERM', () => {
    console.log('🛑 收到SIGTERM信号，正在关闭服务器...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('\n🛑 收到SIGINT信号，正在关闭服务器...');
    process.exit(0);
});
