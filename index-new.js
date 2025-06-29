// 虚拟宠物系统 - SillyTavern标准扩展
// 按照SillyTavern官方标准重构

// 导入SillyTavern标准API
import { extension_settings, getContext, loadExtensionSettings } from "../../../extensions.js";
import { saveSettingsDebounced } from "../../../../script.js";

// 扩展基本信息
const extensionName = "virtual-pet-system";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

console.log(`[${extensionName}] 🐾 虚拟宠物系统开始加载...`);

// 默认设置
const defaultSettings = {
    enabled: true,
    personalityType: 'default',
    customPersonality: '',
    apiMode: 'auto', // 'auto', 'native', 'manual'
    apiEndpoint: '/api/v1/generate',
    customApiUrl: '',
    petData: {
        name: "小宠物",
        type: "cat",
        level: 1,
        experience: 0,
        health: 40,
        happiness: 30,
        hunger: 50,
        energy: 60,
        lastFeedTime: Date.now(),
        lastPlayTime: Date.now(),
        lastSleepTime: Date.now(),
        lastUpdateTime: Date.now(),
        created: Date.now(),
        dataVersion: 2.0
    },
    buttonPosition: { x: 50, y: 50 },
    customAvatar: null
};

// 预设人设定义
const PRESET_PERSONALITIES = {
    'default': "一只高冷但内心温柔的猫，喜欢被投喂，但嘴上不承认。说话时经常用'哼'开头，偶尔会露出可爱的一面。",
    'cheerful': "一只活泼可爱的小狗，总是充满活力，喜欢和主人玩耍。说话热情洋溢，经常用感叹号，喜欢撒娇卖萌。",
    'elegant': "一只优雅的龙，说话古典文雅，有着高贵的气质。喜欢用文言文或古风词汇，举止优雅，但内心其实很温暖。",
    'shy': "一只害羞的兔子，说话轻声细语，容易脸红。性格温柔内向，喜欢用'...'和颜文字，偶尔会结巴。",
    'smart': "一只聪明的鸟，喜欢说俏皮话，有时会调皮捣蛋。说话机智幽默，喜欢用双关语和小聪明，偶尔会炫耀知识。"
};

// 糖果色配色方案
const candyColors = {
    primary: '#FF9EC7',
    secondary: '#A8E6CF',
    accent: '#87CEEB',
    warning: '#FFD93D',
    success: '#98FB98',
    background: 'linear-gradient(135deg, #FFE5F1 0%, #E5F9F0 50%, #E5F4FF 100%)',
    backgroundSolid: '#FFF8FC',
    textPrimary: '#2D3748',
    textSecondary: '#4A5568',
    textLight: '#718096',
    textWhite: '#FFFFFF',
    border: '#E2E8F0',
    borderAccent: '#FF9EC7',
    shadow: 'rgba(255, 158, 199, 0.2)',
    shadowLight: 'rgba(255, 158, 199, 0.1)',
    buttonPrimary: '#FF9EC7',
    buttonSecondary: '#A8E6CF',
    buttonAccent: '#87CEEB',
    buttonHover: '#FF7FB3',
    health: '#FF9EC7',
    happiness: '#FFD93D',
    energy: '#A8E6CF',
    experience: '#87CEEB'
};

// 全局状态
let isPopupOpen = false;
let petButton = null;

// -----------------------------------------------------------------
// 核心功能函数
// -----------------------------------------------------------------

/**
 * 获取扩展设置
 */
function getSettings() {
    if (!extension_settings[extensionName]) {
        extension_settings[extensionName] = structuredClone(defaultSettings);
    }
    
    // 确保所有默认键都存在（有助于更新后的兼容性）
    for (const key in defaultSettings) {
        if (extension_settings[extensionName][key] === undefined) {
            extension_settings[extensionName][key] = defaultSettings[key];
        }
    }
    
    return extension_settings[extensionName];
}

/**
 * 保存设置
 */
function saveSettings() {
    saveSettingsDebounced();
}

/**
 * 获取当前有效的人设
 */
function getCurrentPersonality() {
    const settings = getSettings();
    
    if (settings.personalityType === 'custom') {
        return settings.customPersonality || PRESET_PERSONALITIES.default;
    } else {
        return PRESET_PERSONALITIES[settings.personalityType] || PRESET_PERSONALITIES.default;
    }
}

/**
 * 智能探测SillyTavern的API配置 - 增强版
 * 参考SillyTavern的原生API配置方式
 */
function introspectSillyTavernAPI() {
    const results = {
        found: false,
        endpoint: null,
        source: null,
        confidence: 0,
        details: [],
        apiType: null,
        connectionInfo: null
    };

    console.log(`[${extensionName}] 🕵️ 开始智能探测SillyTavern的API配置...`);

    try {
        // 策略1: 使用SillyTavern的getContext()获取最新配置
        if (typeof getContext === 'function') {
            const ctx = getContext();
            results.details.push(`✅ 成功获取SillyTavern context`);

            // 检查context中的API相关信息
            if (ctx.api_server) {
                results.found = true;
                results.endpoint = ctx.api_server;
                results.source = 'getContext().api_server';
                results.confidence = 95;
                results.details.push(`🎯 从context获取API服务器: ${ctx.api_server}`);
            }

            // 检查连接信息
            if (ctx.connectionInfo || ctx.api_connection) {
                results.connectionInfo = ctx.connectionInfo || ctx.api_connection;
                results.details.push(`📡 找到连接信息: ${JSON.stringify(results.connectionInfo)}`);
            }

            // 检查API类型
            if (ctx.main_api || ctx.api_type) {
                results.apiType = ctx.main_api || ctx.api_type;
                results.details.push(`🔧 API类型: ${results.apiType}`);
            }
        }

        // 策略2: 检查SillyTavern的stores对象（新版本可能使用）
        if (window.stores && window.stores.connections) {
            results.details.push(`✅ 找到stores.connections对象`);

            const connections = window.stores.connections;
            if (connections.connections && Array.isArray(connections.connections)) {
                const activeConnection = connections.connections.find(conn => conn.active);
                if (activeConnection) {
                    results.found = true;
                    results.endpoint = activeConnection.endpoint || activeConnection.url;
                    results.source = 'stores.connections.active';
                    results.confidence = 90;
                    results.apiType = activeConnection.type;
                    results.details.push(`🎯 从活动连接获取: ${results.endpoint} (类型: ${results.apiType})`);
                }
            }
        }

        // 策略3: 检查传统的全局配置对象
        const globalCandidates = [
            { name: 'SillyTavern', paths: ['settings.api_endpoint', 'config.api_url', 'api.endpoint'] },
            { name: 'st', paths: ['api.endpoint', 'settings.endpoint'] },
            { name: 'config', paths: ['api_url', 'endpoint'] },
            { name: 'settings', paths: ['api_endpoint', 'generation_endpoint'] }
        ];

        for (const candidate of globalCandidates) {
            try {
                const obj = window[candidate.name];
                if (obj && typeof obj === 'object') {
                    results.details.push(`✓ 找到全局对象: window.${candidate.name}`);

                    // 检查预定义路径
                    for (const path of candidate.paths) {
                        const value = getNestedProperty(obj, path);
                        if (value && typeof value === 'string' && value.includes('/')) {
                            if (!results.found || results.confidence < 85) {
                                results.found = true;
                                results.endpoint = value;
                                results.source = `window.${candidate.name}.${path}`;
                                results.confidence = 85;
                                results.details.push(`🎯 在 ${results.source} 找到: ${value}`);
                            }
                        }
                    }

                    // 深度搜索
                    const apiConfig = searchForApiConfig(obj, candidate.name);
                    if (apiConfig.found && apiConfig.confidence > results.confidence) {
                        results.found = true;
                        results.endpoint = apiConfig.endpoint;
                        results.source = `window.${candidate.name}.${apiConfig.path}`;
                        results.confidence = apiConfig.confidence;
                        results.details.push(`🔍 深度搜索发现: ${results.endpoint}`);
                    }
                }
            } catch (error) {
                results.details.push(`✗ 访问 window.${candidate.name} 时出错: ${error.message}`);
            }
        }

        // 策略4: 检查localStorage中的配置
        try {
            const localStorageKeys = ['api_server', 'api_endpoint', 'main_api', 'selected_api'];
            for (const key of localStorageKeys) {
                const value = localStorage.getItem(key);
                if (value && value.includes('/')) {
                    results.details.push(`📦 localStorage中找到 ${key}: ${value}`);
                    if (!results.found || results.confidence < 60) {
                        results.found = true;
                        results.endpoint = value;
                        results.source = `localStorage.${key}`;
                        results.confidence = 60;
                    }
                }
            }
        } catch (error) {
            results.details.push(`✗ 检查localStorage时出错: ${error.message}`);
        }

    } catch (error) {
        results.details.push(`✗ 探测过程出错: ${error.message}`);
    }

    console.log(`[${extensionName}] 🕵️ 智能探测完成，结果:`, results);
    return results;
}

/**
 * 获取嵌套属性值
 */
function getNestedProperty(obj, path) {
    return path.split('.').reduce((current, key) => {
        return current && current[key] !== undefined ? current[key] : null;
    }, obj);
}

/**
 * 在对象中搜索API配置
 */
function searchForApiConfig(obj, objName) {
    const result = { found: false, endpoint: null, path: null, confidence: 0 };
    
    const apiKeywords = [
        'api_endpoint', 'apiEndpoint', 'api_url', 'apiUrl', 'endpoint',
        'generation_endpoint', 'textgen_endpoint', 'server_url', 'base_url'
    ];

    function deepSearch(currentObj, currentPath, depth = 0) {
        if (depth > 3 || !currentObj || typeof currentObj !== 'object') return;

        for (const key in currentObj) {
            try {
                const value = currentObj[key];
                const fullPath = currentPath ? `${currentPath}.${key}` : key;

                if (apiKeywords.includes(key.toLowerCase()) && typeof value === 'string') {
                    if (value.includes('/api/') || value.includes('/generate') || value.includes('/completions')) {
                        result.found = true;
                        result.endpoint = value;
                        result.path = fullPath;
                        result.confidence = 90;
                        return;
                    }
                }

                if (typeof value === 'string' && value.startsWith('/') && 
                    (value.includes('api') || value.includes('generate'))) {
                    result.found = true;
                    result.endpoint = value;
                    result.path = fullPath;
                    result.confidence = 70;
                    return;
                }

                if (typeof value === 'object' && value !== null) {
                    deepSearch(value, fullPath, depth + 1);
                    if (result.found) return;
                }
            } catch (error) {
                // 忽略访问错误
            }
        }
    }

    deepSearch(obj, objName);
    return result;
}

/**
 * 获取最佳API端点 - 支持新的API模式
 */
function getSmartApiEndpoint() {
    const settings = getSettings();

    console.log(`[${extensionName}] 获取API端点，当前模式: ${settings.apiMode}`);

    switch (settings.apiMode) {
        case 'native':
            // 原生模式不需要端点，直接返回标识
            console.log(`[${extensionName}] 🏠 使用原生调用模式`);
            return 'NATIVE_MODE';

        case 'manual':
            // 手动模式使用用户配置
            if (settings.apiEndpoint === 'custom') {
                if (settings.customApiUrl && settings.customApiUrl.trim()) {
                    console.log(`[${extensionName}] ⚙️ 使用自定义端点: ${settings.customApiUrl.trim()}`);
                    return settings.customApiUrl.trim();
                }
            } else {
                console.log(`[${extensionName}] ⚙️ 使用手动配置端点: ${settings.apiEndpoint}`);
                return settings.apiEndpoint;
            }
            break;

        case 'auto':
        default:
            // 智能模式：尝试运行时内省
            const introspection = introspectSillyTavernAPI();
            if (introspection.found && introspection.confidence >= 70) {
                console.log(`[${extensionName}] 🤖 智能探测发现端点: ${introspection.endpoint} (置信度: ${introspection.confidence}%)`);
                return introspection.endpoint;
            }

            // 如果内省有低置信度结果，也可以尝试
            if (introspection.found && introspection.confidence >= 50) {
                console.log(`[${extensionName}] 🤔 使用低置信度探测结果: ${introspection.endpoint} (置信度: ${introspection.confidence}%)`);
                return introspection.endpoint;
            }
            break;
    }

    // 最终回退到默认值
    console.log(`[${extensionName}] 📋 回退到默认端点: /api/v1/generate`);
    return '/api/v1/generate';
}

/**
 * 检查是否应该使用原生API调用
 */
function shouldUseNativeAPI() {
    const settings = getSettings();
    return settings.apiMode === 'native' || settings.apiMode === 'auto';
}

// -----------------------------------------------------------------
// 初始化函数
// -----------------------------------------------------------------

/**
 * 加载设置
 */
async function loadSettings() {
    // 初始化设置
    const settings = getSettings();
    
    console.log(`[${extensionName}] 设置已加载:`, settings);
    
    // 更新UI（如果存在）
    updateSettingsUI();
}

/**
 * 更新设置UI
 */
function updateSettingsUI() {
    const settings = getSettings();

    // 更新各种UI元素
    $("#virtual-pet-enabled-toggle").prop("checked", settings.enabled);
    $("#virtual-pet-personality-select").val(settings.personalityType);
    $("#virtual-pet-custom-personality").val(settings.customPersonality);
    $("#virtual-pet-api-mode-select").val(settings.apiMode);
    $("#virtual-pet-api-endpoint-select").val(settings.apiEndpoint);
    $("#virtual-pet-custom-api-url").val(settings.customApiUrl);

    // 显示/隐藏相关输入框
    toggleCustomPersonalityInput(settings.personalityType === 'custom');
    toggleCustomApiInput(settings.apiEndpoint === 'custom');

    // 显示/隐藏手动配置
    if (settings.apiMode === 'manual') {
        $("#virtual-pet-manual-config").show();
    } else {
        $("#virtual-pet-manual-config").hide();
    }

    // 更新API状态
    updateApiStatus();
}

/**
 * 切换自定义人设输入框
 */
function toggleCustomPersonalityInput(show) {
    if (show) {
        $("#virtual-pet-custom-personality-container").show();
    } else {
        $("#virtual-pet-custom-personality-container").hide();
    }
}

/**
 * 切换自定义API输入框
 */
function toggleCustomApiInput(show) {
    if (show) {
        $("#virtual-pet-custom-api-container").show();
    } else {
        $("#virtual-pet-custom-api-container").hide();
    }
}

// -----------------------------------------------------------------
// API调用功能
// -----------------------------------------------------------------

/**
 * 调用SillyTavern的AI生成API - 增强版
 * 参考SillyTavern的原生API调用方式
 */
async function callSillyTavernAPI(prompt, timeout = 10000) {
    return new Promise(async (resolve, reject) => {
        const timeoutId = setTimeout(() => {
            reject(new Error('API调用超时'));
        }, timeout);

        try {
            let result = null;

            // 策略1: 使用SillyTavern的原生生成函数
            const nativeFunctions = [
                'generateReply',
                'Generate',
                'generate',
                'sendMessage',
                'callGenerate'
            ];

            for (const funcName of nativeFunctions) {
                if (typeof window[funcName] === 'function') {
                    console.log(`[${extensionName}] 使用原生函数: ${funcName}`);
                    try {
                        result = await window[funcName](prompt);
                        if (result && typeof result === 'string' && result.trim()) {
                            break;
                        }
                    } catch (error) {
                        console.warn(`[${extensionName}] ${funcName} 调用失败:`, error);
                        continue;
                    }
                }
            }

            // 策略2: 使用SillyTavern对象的方法
            if (!result && typeof window.SillyTavern === 'object') {
                const stMethods = ['generateReply', 'generate', 'callAPI', 'sendRequest'];
                for (const method of stMethods) {
                    if (typeof window.SillyTavern[method] === 'function') {
                        console.log(`[${extensionName}] 使用SillyTavern.${method}`);
                        try {
                            result = await window.SillyTavern[method](prompt);
                            if (result && typeof result === 'string' && result.trim()) {
                                break;
                            }
                        } catch (error) {
                            console.warn(`[${extensionName}] SillyTavern.${method} 调用失败:`, error);
                            continue;
                        }
                    }
                }
            }

            // 策略3: 使用getContext()获取API调用方法
            if (!result && typeof getContext === 'function') {
                try {
                    const ctx = getContext();
                    if (ctx.generate && typeof ctx.generate === 'function') {
                        console.log(`[${extensionName}] 使用context.generate`);
                        result = await ctx.generate(prompt);
                    } else if (ctx.callAPI && typeof ctx.callAPI === 'function') {
                        console.log(`[${extensionName}] 使用context.callAPI`);
                        result = await ctx.callAPI(prompt);
                    }
                } catch (error) {
                    console.warn(`[${extensionName}] context API调用失败:`, error);
                }
            }

            // 策略4: 使用智能端点探测进行fetch调用
            if (!result) {
                const introspection = introspectSillyTavernAPI();
                const smartEndpoint = getSmartApiEndpoint();

                console.log(`[${extensionName}] 使用智能探测的端点: ${smartEndpoint}`);

                // 构建请求体，参考SillyTavern的格式
                const requestBody = {
                    prompt: prompt,
                    max_length: 100,
                    max_tokens: 100,
                    temperature: 0.8,
                    top_p: 0.9,
                    top_k: 40,
                    repetition_penalty: 1.1,
                    stop: ['\n\n', '用户:', 'User:', 'Human:']
                };

                // 根据API类型调整请求格式
                if (introspection.apiType) {
                    switch (introspection.apiType.toLowerCase()) {
                        case 'openai':
                        case 'openai-compatible':
                            requestBody.messages = [{ role: 'user', content: prompt }];
                            requestBody.model = 'gpt-3.5-turbo';
                            delete requestBody.prompt;
                            break;
                        case 'claude':
                        case 'anthropic':
                            requestBody.messages = [{ role: 'user', content: prompt }];
                            requestBody.model = 'claude-3-sonnet-20240229';
                            delete requestBody.prompt;
                            break;
                        case 'textgen':
                        case 'textgeneration':
                        case 'kobold':
                        default:
                            // 保持原有格式
                            break;
                    }
                }

                const response = await fetch(smartEndpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        // 添加可能需要的认证头
                        ...(introspection.connectionInfo && introspection.connectionInfo.headers ? introspection.connectionInfo.headers : {})
                    },
                    body: JSON.stringify(requestBody)
                });

                if (response.ok) {
                    const data = await response.json();

                    // 根据不同API类型解析响应
                    if (data.choices && data.choices[0]) {
                        // OpenAI格式
                        result = data.choices[0].message?.content || data.choices[0].text;
                    } else if (data.content && Array.isArray(data.content)) {
                        // Claude格式
                        result = data.content[0]?.text;
                    } else {
                        // 通用格式
                        result = data.text || data.response || data.result || data.generated_text;
                    }
                } else {
                    throw new Error(`API调用失败: ${response.status} ${response.statusText} (端点: ${smartEndpoint})`);
                }
            }

            clearTimeout(timeoutId);

            if (typeof result === 'string' && result.trim().length > 0) {
                resolve(result.trim());
            } else {
                reject(new Error('API返回了空的或无效的回复'));
            }

        } catch (error) {
            clearTimeout(timeoutId);
            console.error(`[${extensionName}] API调用失败:`, error);
            reject(error);
        }
    });
}

/**
 * 检查SillyTavern API是否可用
 */
function isSillyTavernAPIAvailable() {
    return (
        typeof window.generateReply === 'function' ||
        (typeof window.SillyTavern !== 'undefined' && window.SillyTavern.generateReply) ||
        typeof window.Generate === 'function'
    );
}

/**
 * 构建互动Prompt
 */
function buildInteractionPrompt(action) {
    const settings = getSettings();
    const petData = settings.petData;

    const now = new Date();
    const timeOfDay = now.getHours() < 12 ? '上午' : now.getHours() < 18 ? '下午' : '晚上';

    const actionDescriptions = {
        'feed': '给我喂了食物',
        'play': '陪我玩耍',
        'sleep': '让我休息'
    };

    const getStatusDescription = () => {
        const statuses = [];
        if (petData.health < 30) statuses.push('身体不太舒服');
        else if (petData.health > 80) statuses.push('身体很健康');
        if (petData.happiness < 30) statuses.push('心情不太好');
        else if (petData.happiness > 80) statuses.push('心情很愉快');
        if (petData.hunger < 30) statuses.push('很饿');
        else if (petData.hunger > 80) statuses.push('很饱');
        if (petData.energy < 30) statuses.push('很累');
        else if (petData.energy > 80) statuses.push('精力充沛');
        return statuses.length > 0 ? statuses.join('，') : '状态正常';
    };

    const prompt = `[系统指令：请你扮演以下角色并对用户的行为做出简短回应。回应应该符合角色性格，简洁生动，不超过30字。]

宠物信息：
- 名称：${petData.name}
- 类型：${getPetTypeName(petData.type)}
- 等级：${petData.level}级
- 人设：${getCurrentPersonality()}

当前状态：
- 健康：${Math.round(petData.health)}/100
- 快乐：${Math.round(petData.happiness)}/100
- 饥饿：${Math.round(petData.hunger)}/100
- 精力：${Math.round(petData.energy)}/100
- 状态描述：${getStatusDescription()}

情景：
现在是${timeOfDay}，用户刚刚${actionDescriptions[action]}。

请以${petData.name}的身份，根据上述人设和当前状态，对用户的行为做出简短的回应：`;

    return prompt;
}

/**
 * 获取宠物类型名称
 */
function getPetTypeName(type) {
    const typeNames = {
        cat: "猫咪",
        dog: "小狗",
        dragon: "龙",
        rabbit: "兔子",
        bird: "小鸟"
    };
    return typeNames[type] || "未知";
}

// -----------------------------------------------------------------
// 事件处理函数
// -----------------------------------------------------------------

/**
 * 处理启用/禁用切换
 */
function onEnabledToggle(event) {
    const enabled = Boolean($(event.target).prop("checked"));
    const settings = getSettings();
    settings.enabled = enabled;
    saveSettings();

    if (enabled) {
        toastr.success("虚拟宠物系统已启用");
        createPetButton();
    } else {
        toastr.info("虚拟宠物系统已禁用");
        if (petButton) {
            petButton.hide();
        }
    }
}

/**
 * 处理人设选择变化
 */
function onPersonalityChange(event) {
    const selectedType = $(event.target).val();
    const settings = getSettings();
    settings.personalityType = selectedType;

    toggleCustomPersonalityInput(selectedType === 'custom');

    if (selectedType !== 'custom') {
        saveSettings();
        toastr.success(`已切换到${$(event.target).find('option:selected').text()}人设`);
    }
}

/**
 * 处理自定义人设输入
 */
function onCustomPersonalityInput(event) {
    const customText = $(event.target).val().trim();
    const settings = getSettings();
    settings.customPersonality = customText;
    saveSettings();
}

/**
 * 处理API模式选择变化
 */
function onApiModeChange(event) {
    const selectedMode = $(event.target).val();
    const settings = getSettings();
    settings.apiMode = selectedMode;

    // 显示/隐藏手动配置
    if (selectedMode === 'manual') {
        $("#virtual-pet-manual-config").show();
    } else {
        $("#virtual-pet-manual-config").hide();
    }

    saveSettings();
    updateApiStatus();

    // 显示相应的提示
    switch (selectedMode) {
        case 'auto':
            toastr.success("已启用智能API集成");
            break;
        case 'native':
            toastr.success("已启用原生API调用");
            break;
        case 'manual':
            toastr.info("已切换到手动配置模式");
            break;
    }
}

/**
 * 处理API端点选择变化
 */
function onApiEndpointChange(event) {
    const selectedEndpoint = $(event.target).val();
    const settings = getSettings();
    settings.apiEndpoint = selectedEndpoint;

    toggleCustomApiInput(selectedEndpoint === 'custom');

    if (selectedEndpoint !== 'custom') {
        saveSettings();
        updateApiStatus();
        toastr.success(`API端点已设置为: ${selectedEndpoint}`);
    }
}

/**
 * 处理自定义API URL输入
 */
function onCustomApiUrlInput(event) {
    const customUrl = $(event.target).val().trim();
    const settings = getSettings();
    settings.customApiUrl = customUrl;
    saveSettings();
    updateApiStatus();
}

/**
 * 更新API状态显示
 */
function updateApiStatus() {
    const settings = getSettings();
    const statusElement = $("#virtual-pet-api-status");

    let statusText = "API: ";
    let statusColor = "#888";

    switch (settings.apiMode) {
        case 'auto':
            statusText += "智能集成";
            statusColor = "#28a745";
            break;
        case 'native':
            statusText += "原生调用";
            statusColor = "#007bff";
            break;
        case 'manual':
            if (settings.apiEndpoint === 'custom' && settings.customApiUrl) {
                statusText += `自定义 (${settings.customApiUrl})`;
            } else {
                statusText += `手动 (${settings.apiEndpoint})`;
            }
            statusColor = "#ffc107";
            break;
    }

    statusElement.text(statusText).css('color', statusColor);
}

/**
 * 测试API连接
 */
async function testApiConnection() {
    const testButton = $("#virtual-pet-test-api");
    const originalText = testButton.text();

    testButton.text("🔄 测试中...").prop('disabled', true);

    try {
        const testPrompt = "你好，这是一个API连接测试。请简短回复。";
        const result = await callSillyTavernAPI(testPrompt, 15000);

        toastr.success("API连接测试成功！", "连接测试", {
            timeOut: 5000
        });

        // 更新调试信息
        const debugContent = $("#virtual-pet-debug-content");
        const timestamp = new Date().toLocaleTimeString();
        debugContent.text(`[${timestamp}] ✅ API连接测试成功\n测试提示: ${testPrompt}\nAPI回复: ${result}\n\n${debugContent.text()}`);

    } catch (error) {
        toastr.error(`API连接测试失败: ${error.message}`, "连接测试", {
            timeOut: 8000
        });

        // 更新调试信息
        const debugContent = $("#virtual-pet-debug-content");
        const timestamp = new Date().toLocaleTimeString();
        debugContent.text(`[${timestamp}] ❌ API连接测试失败\n错误信息: ${error.message}\n\n${debugContent.text()}`);
    } finally {
        testButton.text(originalText).prop('disabled', false);
    }
}

/**
 * 刷新配置
 */
function refreshConfiguration() {
    const refreshButton = $("#virtual-pet-refresh-config");
    const originalText = refreshButton.text();

    refreshButton.text("🔄 刷新中...").prop('disabled', true);

    try {
        // 重新进行智能探测
        const introspection = introspectSillyTavernAPI();

        // 更新调试信息
        const debugContent = $("#virtual-pet-debug-content");
        const timestamp = new Date().toLocaleTimeString();

        let debugText = `[${timestamp}] 🔄 配置刷新完成\n\n`;
        debugText += `探测结果: ${introspection.found ? '✅ 成功' : '❌ 失败'}\n`;
        if (introspection.found) {
            debugText += `发现端点: ${introspection.endpoint}\n`;
            debugText += `来源: ${introspection.source}\n`;
            debugText += `置信度: ${introspection.confidence}%\n`;
            debugText += `API类型: ${introspection.apiType || '未知'}\n`;
        }
        debugText += `\n详细过程:\n`;
        introspection.details.forEach(detail => {
            debugText += `- ${detail}\n`;
        });
        debugText += `\n${debugContent.text()}`;

        debugContent.text(debugText);

        // 更新状态
        updateApiStatus();

        toastr.success("配置已刷新", "系统", {
            timeOut: 3000
        });

    } catch (error) {
        toastr.error(`配置刷新失败: ${error.message}`, "系统", {
            timeOut: 5000
        });
    } finally {
        refreshButton.text(originalText).prop('disabled', false);
    }
}

/**
 * 测试智能内省功能
 */
function testIntrospection() {
    console.log(`[${extensionName}] 🕵️ 开始测试智能内省...`);

    const results = introspectSillyTavernAPI();
    const smartEndpoint = getSmartApiEndpoint();

    let debugHtml = `<div style="color: #00ff00;">🕵️ 智能内省测试结果</div><br>`;
    debugHtml += `<strong>最终选择的端点:</strong> <span style="color: #ffff00;">${smartEndpoint}</span><br><br>`;

    debugHtml += `<strong>内省详情:</strong><br>`;
    debugHtml += `- 是否找到配置: ${results.found ? '✅ 是' : '❌ 否'}<br>`;
    if (results.found) {
        debugHtml += `- 发现的端点: <span style="color: #00ffff;">${results.endpoint}</span><br>`;
        debugHtml += `- 来源: ${results.source}<br>`;
        debugHtml += `- 置信度: ${results.confidence}%<br>`;
    }

    debugHtml += `<br><strong>探测过程:</strong><br>`;
    results.details.forEach(detail => {
        debugHtml += `- ${detail}<br>`;
    });

    $("#virtual-pet-debug-content").html(debugHtml);
    $("#virtual-pet-debug-info").show();

    if (results.found) {
        toastr.success(`智能探测成功！找到端点: ${results.endpoint}`, "内省测试", {
            timeOut: 5000
        });
    } else {
        toastr.warning("未找到API配置，将使用默认设置", "内省测试", {
            timeOut: 5000
        });
    }
}

/**
 * 切换调试信息显示
 */
function toggleDebugInfo() {
    const debugDiv = $("#virtual-pet-debug-info");
    if (debugDiv.is(':visible')) {
        debugDiv.hide();
        $("#virtual-pet-show-debug").text("🔍 显示调试信息");
    } else {
        debugDiv.show();
        $("#virtual-pet-show-debug").text("🙈 隐藏调试信息");
    }
}

// -----------------------------------------------------------------
// 宠物按钮和UI管理
// -----------------------------------------------------------------

/**
 * 创建宠物按钮
 */
function createPetButton() {
    const settings = getSettings();

    if (!settings.enabled) return;

    // 移除现有按钮
    $("#virtual-pet-button").remove();

    // 创建新按钮
    const buttonHtml = `
        <div id="virtual-pet-button" style="
            position: fixed !important;
            left: ${settings.buttonPosition.x}px !important;
            top: ${settings.buttonPosition.y}px !important;
            width: 48px !important;
            height: 48px !important;
            background: ${candyColors.primary} !important;
            border-radius: 50% !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            font-size: 24px !important;
            cursor: grab !important;
            z-index: 999999 !important;
            box-shadow: 0 4px 8px ${candyColors.shadow} !important;
            transition: transform 0.2s ease !important;
            user-select: none !important;
        " title="点击打开虚拟宠物">
            ${getAvatarContent()}
        </div>
    `;

    $("body").append(buttonHtml);
    petButton = $("#virtual-pet-button");

    // 绑定事件
    makeButtonDraggable(petButton);

    console.log(`[${extensionName}] 宠物按钮已创建`);
}

/**
 * 获取头像内容
 */
function getAvatarContent() {
    const settings = getSettings();

    if (settings.customAvatar) {
        return `<img src="${settings.customAvatar}" alt="宠物头像" style="
            width: 100% !important;
            height: 100% !important;
            object-fit: cover !important;
            border-radius: 50% !important;
        ">`;
    } else {
        return getPetEmoji(settings.petData.type);
    }
}

/**
 * 获取宠物表情符号
 */
function getPetEmoji(type) {
    const emojis = {
        cat: "🐱",
        dog: "🐶",
        dragon: "🐉",
        rabbit: "🐰",
        bird: "🐦"
    };
    return emojis[type] || "🐱";
}

/**
 * 使按钮可拖动
 */
function makeButtonDraggable($button) {
    let isDragging = false;
    let wasDragged = false;
    let startX, startY, dragStartX, dragStartY;
    let dragThreshold = 8;

    $button.off();
    $(document).off('.petdragtemp');

    $button.on('mousedown.petdrag touchstart.petdrag', function(e) {
        isDragging = true;
        wasDragged = false;

        const touch = e.originalEvent && e.originalEvent.touches && e.originalEvent.touches[0];
        startX = touch ? touch.pageX : e.pageX;
        startY = touch ? touch.pageY : e.pageY;

        if (typeof startX !== 'number' || typeof startY !== 'number') {
            return;
        }

        const rect = $button[0].getBoundingClientRect();
        dragStartX = startX - rect.left;
        dragStartY = startY - rect.top;

        e.preventDefault();

        $(document).on('mousemove.petdragtemp touchmove.petdragtemp', function(moveE) {
            if (!isDragging) return;

            const moveTouch = moveE.originalEvent && moveE.originalEvent.touches && moveE.originalEvent.touches[0];
            const moveX = moveTouch ? moveTouch.pageX : moveE.pageX;
            const moveY = moveTouch ? moveTouch.pageY : moveE.pageY;

            const deltaX = Math.abs(moveX - startX);
            const deltaY = Math.abs(moveY - startY);

            if (deltaX > dragThreshold || deltaY > dragThreshold) {
                if (!wasDragged) {
                    wasDragged = true;
                    $button.css({
                        "cursor": "grabbing",
                        "opacity": "0.8",
                        "transform": "scale(1.05)"
                    });
                }

                const newX = moveX - dragStartX;
                const newY = moveY - dragStartY;

                const windowWidth = window.innerWidth;
                const windowHeight = window.innerHeight;
                const buttonWidth = $button.outerWidth() || 48;
                const buttonHeight = $button.outerHeight() || 48;
                const safeMargin = 10;

                const safeX = Math.max(safeMargin, Math.min(newX, windowWidth - buttonWidth - safeMargin));
                const safeY = Math.max(safeMargin, Math.min(newY, windowHeight - buttonHeight - safeMargin));

                $button[0].style.setProperty('left', safeX + 'px', 'important');
                $button[0].style.setProperty('top', safeY + 'px', 'important');
                $button[0].style.setProperty('position', 'fixed', 'important');
            }
        });

        $(document).on('mouseup.petdragtemp touchend.petdragtemp', function() {
            isDragging = false;
            $(document).off('.petdragtemp');

            $button.css({
                "cursor": "grab",
                "opacity": "1",
                "transform": "none"
            });

            if (wasDragged) {
                const rect = $button[0].getBoundingClientRect();
                const settings = getSettings();
                settings.buttonPosition = {
                    x: Math.round(rect.left),
                    y: Math.round(rect.top)
                };
                saveSettings();

                setTimeout(() => {
                    wasDragged = false;
                }, 100);
            } else {
                // 点击事件
                showPopup();
            }
        });
    });
}

/**
 * 显示弹窗
 */
function showPopup() {
    if (isPopupOpen) return;

    console.log(`[${extensionName}] 显示宠物弹窗`);

    // 这里可以添加弹窗逻辑
    // 暂时使用简单的toastr提示
    const settings = getSettings();
    toastr.info(`${settings.petData.name} 向你打招呼！`, "虚拟宠物", {
        timeOut: 3000
    });

    isPopupOpen = true;
    setTimeout(() => {
        isPopupOpen = false;
    }, 3000);
}

// -----------------------------------------------------------------
// 主初始化函数
// -----------------------------------------------------------------

/**
 * 初始化扩展
 */
async function initializeExtension() {
    console.log(`[${extensionName}] 开始初始化扩展...`);

    try {
        // 1. 加载CSS
        console.log(`[${extensionName}] 加载CSS...`);
        $("head").append(`<link rel="stylesheet" type="text/css" href="${extensionFolderPath}/style.css">`);

        // 2. 加载设置HTML
        console.log(`[${extensionName}] 创建设置面板...`);
        const settingsHtml = await $.get(`${extensionFolderPath}/settings.html`);
        $("#extensions_settings2").append(settingsHtml);

        // 3. 绑定事件
        bindSettingsEvents();

        // 4. 加载设置
        await loadSettings();

        // 5. 创建宠物按钮
        createPetButton();

        console.log(`[${extensionName}] ✅ 扩展初始化完成`);

    } catch (error) {
        console.error(`[${extensionName}] ❌ 初始化失败:`, error);

        // 创建简化的设置面板
        createFallbackSettings();
    }
}

/**
 * 绑定设置事件
 */
function bindSettingsEvents() {
    // 启用/禁用切换
    $("#virtual-pet-enabled-toggle").on('change', onEnabledToggle);

    // 人设选择
    $("#virtual-pet-personality-select").on('change', onPersonalityChange);
    $("#virtual-pet-custom-personality").on('input', onCustomPersonalityInput);

    // API配置
    $("#virtual-pet-api-mode-select").on('change', onApiModeChange);
    $("#virtual-pet-api-endpoint-select").on('change', onApiEndpointChange);
    $("#virtual-pet-custom-api-url").on('input', onCustomApiUrlInput);

    // API测试和调试功能
    $("#virtual-pet-test-api").on('click', testApiConnection);
    $("#virtual-pet-refresh-config").on('click', refreshConfiguration);
    $("#virtual-pet-show-debug").on('click', toggleDebugInfo);

    console.log(`[${extensionName}] 设置事件已绑定`);
}

/**
 * 创建回退设置面板
 */
function createFallbackSettings() {
    const fallbackHtml = `
        <div id="virtual-pet-settings">
            <div class="inline-drawer">
                <div class="inline-drawer-toggle inline-drawer-header">
                    <b>🐾 虚拟宠物系统</b>
                    <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
                </div>
                <div class="inline-drawer-content">
                    <div class="flex-container">
                        <label class="checkbox_label" for="virtual-pet-enabled-toggle">
                            <input id="virtual-pet-enabled-toggle" type="checkbox" checked>
                            <span>启用虚拟宠物系统</span>
                        </label>
                    </div>
                    <small class="notes">
                        启用后会在屏幕上显示一个可拖动的宠物按钮（🐾）
                    </small>
                </div>
            </div>
        </div>
    `;

    $("#extensions_settings2").append(fallbackHtml);

    // 绑定基本事件
    $("#virtual-pet-enabled-toggle").on('change', onEnabledToggle);

    // 加载设置
    loadSettings();

    console.log(`[${extensionName}] 回退设置面板已创建`);
}

// -----------------------------------------------------------------
// jQuery入口点
// -----------------------------------------------------------------

jQuery(async () => {
    console.log(`[${extensionName}] jQuery ready, 开始初始化...`);
    await initializeExtension();
});
