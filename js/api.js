// js/api.js
import { getSettings } from './settings.js';

/**
 * 调用自定义AI API
 * @param {string} prompt - 发送给AI的提示
 * @param {object} [apiSettings=null] - API设置，如果未提供则从settings.js加载
 * @param {number} [timeout=15000] - 请求超时时间
 * @returns {Promise<string>} AI的回复
 */
export async function callCustomAPI(prompt, apiSettings = null, timeout = 15000) {
    const settings = apiSettings || getSettings().ai;

    if (!settings.apiType || !settings.apiUrl || !settings.apiKey) {
        throw new Error('API configuration is incomplete.');
    }

    const controller = new AbortController();
    const signal = controller.signal;
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(settings.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.apiKey}`
            },
            body: JSON.stringify({
                model: settings.apiModel,
                messages: [
                    { role: "system", content: "You are a virtual pet." },
                    { role: "user", content: prompt }
                ],
                max_tokens: 150,
            }),
            signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(`API Error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content.trim();

    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error('API request timed out.');
        }
        throw error;
    }
}

/**
 * 从后端API获取可用模型列表
 */
export async function getAvailableAPIs() {
    // This is a placeholder for the complex API discovery logic.
    // In a real scenario, you would implement the logic from the original index.js here.
    console.log("API discovery function called.");
    return [
        { type: 'openai', name: 'gpt-4', status: 'detected', provider: 'OpenAI' },
        { type: 'ollama', name: 'llama3', status: 'detected', provider: 'Ollama (local)' },
    ];
}
