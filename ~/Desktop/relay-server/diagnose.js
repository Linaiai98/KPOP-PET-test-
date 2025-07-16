const axios = require('axios');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);
const SERVER_URL = 'http://localhost:3000';
const EXTERNAL_URL = 'http://154.12.38.33:3000';

async function diagnoseServer() {
    console.log('🔍 虚拟宠物中继服务器诊断工具\n');
    
    // 1. 检查Node.js环境
    console.log('1️⃣ 检查Node.js环境...');
    try {
        const { stdout: nodeVersion } = await execAsync('node --version');
        const { stdout: npmVersion } = await execAsync('npm --version');
        console.log(`✅ Node.js版本: ${nodeVersion.trim()}`);
        console.log(`✅ npm版本: ${npmVersion.trim()}`);
    } catch (error) {
        console.log('❌ Node.js环境检查失败:', error.message);
        return;
    }
    console.log('');
    
    // 2. 检查端口占用
    console.log('2️⃣ 检查端口占用...');
    try {
        const { stdout } = await execAsync('netstat -ano | findstr :3000');
        if (stdout.trim()) {
            console.log('⚠️ 端口3000已被占用:');
            console.log(stdout.trim());
        } else {
            console.log('✅ 端口3000可用');
        }
    } catch (error) {
        console.log('✅ 端口3000可用（未找到占用进程）');
    }
    console.log('');
    
    // 3. 检查依赖安装
    console.log('3️⃣ 检查依赖安装...');
    try {
        const fs = require('fs');
        if (fs.existsSync('./node_modules')) {
            console.log('✅ node_modules目录存在');
            const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
            const dependencies = Object.keys(packageJson.dependencies || {});
            console.log(`✅ 依赖包数量: ${dependencies.length}`);
            console.log(`📦 主要依赖: ${dependencies.slice(0, 5).join(', ')}`);
        } else {
            console.log('❌ node_modules目录不存在，请运行: npm install');
        }
    } catch (error) {
        console.log('❌ 依赖检查失败:', error.message);
    }
    console.log('');
    
    // 4. 测试本地连接
    console.log('4️⃣ 测试本地服务器连接...');
    try {
        const response = await axios.get(`${SERVER_URL}/health`, { timeout: 5000 });
        console.log('✅ 本地服务器连接成功');
        console.log(`📊 服务器状态: ${response.data.status}`);
        console.log(`⏰ 运行时间: ${Math.floor(response.data.uptime)}秒`);
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.log('❌ 本地服务器未启动');
            console.log('💡 请运行: npm start 或 start.bat');
        } else {
            console.log('❌ 本地连接失败:', error.message);
        }
    }
    console.log('');
    
    // 5. 测试外部连接
    console.log('5️⃣ 测试外部服务器连接...');
    try {
        const response = await axios.get(`${EXTERNAL_URL}/health`, { timeout: 10000 });
        console.log('✅ 外部服务器连接成功');
        console.log(`📊 外部服务器状态: ${response.data.status}`);
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.log('❌ 外部服务器连接被拒绝');
            console.log('💡 可能原因:');
            console.log('   - 服务器未在外部IP上启动');
            console.log('   - 防火墙阻止了连接');
            console.log('   - 安全组未开放端口3000');
        } else {
            console.log('❌ 外部连接失败:', error.message);
        }
    }
    console.log('');
    
    // 6. 测试代理功能
    console.log('6️⃣ 测试代理功能...');
    try {
        const response = await axios.post(`${SERVER_URL}/proxy`, {
            targetUrl: 'https://httpbin.org/get',
            method: 'GET'
        }, { timeout: 10000 });
        
        if (response.status === 200) {
            console.log('✅ 代理功能正常');
            console.log(`📡 目标API响应: ${response.data.url}`);
        } else {
            console.log(`⚠️ 代理响应异常: ${response.status}`);
        }
    } catch (error) {
        console.log('❌ 代理功能测试失败:', error.message);
    }
    console.log('');
    
    // 7. 网络连接测试
    console.log('7️⃣ 测试网络连接...');
    const testUrls = [
        'https://httpbin.org/get',
        'https://api.openai.com',
        'https://api.anthropic.com',
        'https://generativelanguage.googleapis.com'
    ];
    
    for (const url of testUrls) {
        try {
            await axios.get(url, { timeout: 5000 });
            console.log(`✅ ${url} - 可访问`);
        } catch (error) {
            console.log(`❌ ${url} - 无法访问: ${error.message}`);
        }
    }
    console.log('');
    
    // 8. 生成诊断报告
    console.log('📋 诊断总结:');
    console.log('========================================');
    console.log('如果遇到问题，请按以下步骤排查:');
    console.log('');
    console.log('1. 确保Node.js已安装且版本 >= 16.0.0');
    console.log('2. 运行 npm install 安装依赖');
    console.log('3. 运行 npm start 启动服务器');
    console.log('4. 检查防火墙和安全组设置');
    console.log('5. 确保端口3000未被其他程序占用');
    console.log('');
    console.log('📞 如需技术支持，请提供以上诊断信息');
    console.log('========================================');
}

// 运行诊断
diagnoseServer().catch(console.error);
