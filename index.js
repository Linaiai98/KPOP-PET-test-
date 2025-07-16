// 虚拟宠物系统 - SillyTavern插件
console.log("🐾 虚拟宠物系统脚本开始加载...");

// 使用 jQuery 确保在 DOM 加载完毕后执行我们的代码
jQuery(async () => {
    console.log("🐾 jQuery ready, 开始初始化...");

    // ... (所有其他代码保持不变) ...

    /**
     * 调用自定义API
     * @param {string} prompt - 要发送给AI的提示词
     * @param {object} settings - API配置设置
     * @param {number} timeout - 超时时间（毫秒）
     * @returns {Promise<string>} - AI生成的回复
     */
    async function callCustomAPI(prompt, settings, timeout = 30000) {
        console.log(`[${extensionName}] 调用自定义API: ${settings.apiType}，超时时间: ${timeout}ms`);
        const relayBaseUrl = 'http://154.12.38.33:3000/relay';

        let originalApiUrl = settings.apiUrl.replace(/\/+$/, ''); // 移除末尾斜杠
        const apiKey = settings.apiKey;
        const apiModel = settings.apiModel;

        if (!originalApiUrl || !apiModel) {
            throw new Error("API URL或模型未在设置中指定");
        }

        // 自动为兼容OpenAI的API添加端点
        if (settings.apiType === 'openai' || settings.apiType === 'custom' || !settings.apiType) {
            if (!originalApiUrl.toLowerCase().includes('/chat/completions')) {
                originalApiUrl += '/v1/chat/completions';
            }
        }
        
        // 使用查询参数模式构建最终的代理URL
        const encodedTargetUrl = encodeURIComponent(originalApiUrl);
        const proxyUrl = `${relayBaseUrl}?target=${encodedTargetUrl}`;
        
        console.log(`📡 (callCustomAPI) 正在通过中继发送请求至: ${originalApiUrl}`);

        const headers = {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        };

        const body = JSON.stringify({
            model: apiModel,
            messages: [{ role: "user", content: prompt }],
            max_tokens: 300,
            temperature: 0.7
        });

        const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: headers,
            body: body,
            signal: AbortSignal.timeout(timeout)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[${extensionName}] API 错误响应:`, errorText);
            throw new Error(`API请求失败 (${response.status})`);
        }

        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content?.trim();

        if (!reply) {
            console.warn(`[${extensionName}] API返回的数据中没有找到有效的回复内容。`, data);
            throw new Error('API返回数据格式不正确或内容为空');
        }
        
        return reply;
    }

    // ... (文件余下的部分，包括 init() 调用) ...
});