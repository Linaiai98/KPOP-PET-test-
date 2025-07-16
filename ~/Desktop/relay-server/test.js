const axios = require('axios');

const SERVER_URL = 'http://localhost:3000';

async function testRelayServer() {
    console.log('🧪 开始测试中继服务器...\n');
    
    try {
        // 1. 测试健康检查
        console.log('1️⃣ 测试健康检查端点...');
        const healthResponse = await axios.get(`${SERVER_URL}/health`);
        console.log('✅ 健康检查成功:', healthResponse.data);
        console.log('');
        
        // 2. 测试服务器信息
        console.log('2️⃣ 测试服务器信息端点...');
        const infoResponse = await axios.get(`${SERVER_URL}/`);
        console.log('✅ 服务器信息:', infoResponse.data);
        console.log('');
        
        // 3. 测试简单端点
        console.log('3️⃣ 测试简单测试端点...');
        const testResponse = await axios.get(`${SERVER_URL}/test`);
        console.log('✅ 测试端点成功:', testResponse.data);
        console.log('');
        
        // 4. 测试代理功能 - 使用httpbin.org
        console.log('4️⃣ 测试代理功能...');
        const proxyResponse = await axios.post(`${SERVER_URL}/proxy`, {
            targetUrl: 'https://httpbin.org/post',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: {
                test: 'relay-server-test',
                timestamp: new Date().toISOString()
            }
        });
        console.log('✅ 代理功能成功:', {
            status: proxyResponse.status,
            targetReceived: proxyResponse.data.json
        });
        console.log('');

        // 4.5. 测试虚拟宠物插件格式
        console.log('4️⃣.5️⃣ 测试虚拟宠物插件请求格式...');
        const petPluginTest = await axios.post(`${SERVER_URL}/proxy`, {
            targetUrl: 'https://httpbin.org/post',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer test-api-key'
            },
            body: {
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'user', content: '你好，我是虚拟宠物的主人' }
                ],
                max_tokens: 1000,
                temperature: 0.7
            }
        });
        console.log('✅ 虚拟宠物格式测试成功:', {
            status: petPluginTest.status,
            receivedBody: petPluginTest.data.json
        });
        console.log('');
        
        // 5. 测试错误处理
        console.log('5️⃣ 测试错误处理...');
        try {
            await axios.post(`${SERVER_URL}/proxy`, {
                targetUrl: 'https://nonexistent-api-endpoint-12345.com/test',
                method: 'POST'
            });
        } catch (error) {
            console.log('✅ 错误处理正常:', {
                status: error.response?.status,
                message: error.response?.data?.message
            });
        }
        console.log('');
        
        console.log('🎉 所有测试通过！中继服务器运行正常。');
        
    } catch (error) {
        console.error('❌ 测试失败:', error.message);
        if (error.code === 'ECONNREFUSED') {
            console.error('💡 请确保中继服务器正在运行: npm start');
        }
    }
}

// 运行测试
testRelayServer();
