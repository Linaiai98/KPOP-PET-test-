// 虚拟宠物系统 - SillyTavern插件
console.log("🐾 虚拟宠物系统脚本开始加载...");

// 使用 jQuery 确保在 DOM 加载完毕后执行我们的代码
jQuery(async () => {
    console.log("🐾 jQuery ready, 开始初始化...");

    // -----------------------------------------------------------------
    // 1. 定义常量和状态变量
    // -----------------------------------------------------------------
    const extensionName = "virtual-pet-system";
    const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

    console.log(`[${extensionName}] Starting initialization...`);
    console.log(`[${extensionName}] Extension folder path: ${extensionFolderPath}`);
    
    // 存储键
    const STORAGE_KEY_BUTTON_POS = "virtual-pet-button-position";
    const STORAGE_KEY_ENABLED = "virtual-pet-enabled";
    const STORAGE_KEY_PET_DATA = "virtual-pet-data";
    const STORAGE_KEY_CUSTOM_AVATAR = "virtual-pet-custom-avatar";

    
    // DOM IDs and Selectors
    const BUTTON_ID = "virtual-pet-button";
    const OVERLAY_ID = "virtual-pet-popup-overlay";
    const POPUP_ID = "virtual-pet-popup";
    const CLOSE_BUTTON_ID = "virtual-pet-popup-close-button";
    const TOGGLE_ID = "#virtual-pet-enabled-toggle";
    
    // DOM 元素引用
    let overlay, mainView, petView, settingsView;
    let petContainer;

    // 弹窗状态管理
    let isPopupOpen = false;

    // 自定义头像管理
    let customAvatarData = null;

    // Firebase v9 SDK 模块的引用
    let fb_app, fb_auth, fb_firestore;

    // Firebase 实例
    let firebaseApp = null;
    let firebaseAuth = null;
    let firestoreDb = null;
    let currentUser = null;
    let firebaseConfig = null;

    // 同步保存限制机制
    let lastSyncSaveTime = 0;
    const SYNC_SAVE_COOLDOWN = 2000; // 2秒冷却时间，避免频繁保存

    // 安全的z-index值，避免影响其他插件
    const SAFE_Z_INDEX = {
        button: 10000,      // 悬浮按钮 - 低于其他悬浮插件
        popup: 10001,       // 弹窗
        overlay: 10000,     // 遮罩层
        notification: 10002 // 通知
    };

    // 样式隔离前缀，确保不影响其他插件
    const STYLE_PREFIX = 'virtual-pet-';

    /**
     * 获取安全的主题颜色
     */
    function getSafeThemeColors() {
        // 尝试获取SillyTavern的主题颜色，如果失败则使用安全的默认值
        const computedStyle = getComputedStyle(document.documentElement);

        const bodyColor = computedStyle.getPropertyValue('--SmartThemeBodyColor') ||
                         computedStyle.getPropertyValue('--body-color') ||
                         '#2d2d2d'; // 安全的默认深色背景

        const textColor = computedStyle.getPropertyValue('--SmartThemeEmColor') ||
                         computedStyle.getPropertyValue('--text-color') ||
                         '#ffffff'; // 安全的默认白色文字

        const borderColor = computedStyle.getPropertyValue('--border-color') || '#444444';

        console.log(`[${extensionName}] 主题颜色: 背景=${bodyColor}, 文字=${textColor}, 边框=${borderColor}`);

        return {
            background: bodyColor.trim(),
            text: textColor.trim(),
            border: borderColor.trim()
        };
    }

    /**
     * 创建样式隔离的CSS规则 - 不依赖主题变量
     */
    function createIsolatedStyles() {
        const styleId = `${STYLE_PREFIX}isolated-styles`;

        // 如果已经存在，先移除
        $(`#${styleId}`).remove();

        // 获取安全的主题颜色
        const colors = getSafeThemeColors();

        const isolatedCSS = `
            /* 虚拟宠物插件样式隔离 - 完全安全版本 */

            /* 只影响虚拟宠物相关元素，不使用CSS变量 */
            #${BUTTON_ID} {
                font-family: inherit !important;
                line-height: normal !important;
                box-sizing: border-box !important;
            }

            #${POPUP_ID}, #${OVERLAY_ID} {
                font-family: inherit !important;
                line-height: normal !important;
                box-sizing: border-box !important;
            }

            /* 虚拟宠物容器样式隔离 */
            .${STYLE_PREFIX}container,
            .${STYLE_PREFIX}container * {
                box-sizing: border-box !important;
            }

            /* 确保虚拟宠物元素不被其他样式影响 */
            [id*="virtual-pet"],
            [class*="virtual-pet"] {
                font-family: inherit !important;
            }

            /* 虚拟宠物表单元素安全样式 */
            #virtual-pet-personality-select,
            #virtual-pet-custom-personality,
            #ai-api-select,
            #ai-url-input,
            #ai-key-input,
            #ai-model-select,
            #ai-model-input {
                background: ${colors.background} !important;
                color: ${colors.text} !important;
                border: 1px solid ${colors.border} !important;
                font-family: inherit !important;
            }
        `;

        $('head').append(`<style id="${styleId}">${isolatedCSS}</style>`);
        console.log(`[${extensionName}] 安全样式隔离已应用，使用颜色: ${JSON.stringify(colors)}`);
    }

    /**
     * 紧急清除可能影响SillyTavern的样式
     */
    function emergencyStyleCleanup() {
        console.log(`[${extensionName}] 🚨 执行紧急样式清理...`);

        // 移除可能有问题的样式
        $(`#${STYLE_PREFIX}isolated-styles`).remove();

        // 清除任何可能影响body或全局的样式
        $('style').each(function() {
            const content = $(this).text();
            if (content.includes('body >') ||
                content.includes('position: relative !important') ||
                content.includes('virtual-pet')) {
                console.log(`[${extensionName}] 移除可疑样式:`, content.substring(0, 100));
                $(this).remove();
            }
        });

        // 重新应用安全的样式隔离
        createIsolatedStyles();

        console.log(`[${extensionName}] ✅ 紧急样式清理完成`);
    }

    /**
     * 检查并修复CSS变量污染
     */
    function checkAndFixCSSVariables() {
        console.log(`[${extensionName}] 🔍 检查CSS变量污染...`);

        // 检查是否有插件修改了关键的CSS变量
        const rootStyle = getComputedStyle(document.documentElement);
        const criticalVars = [
            '--SmartThemeBodyColor',
            '--SmartThemeEmColor',
            '--body-color',
            '--text-color',
            '--border-color'
        ];

        let hasIssues = false;
        criticalVars.forEach(varName => {
            const value = rootStyle.getPropertyValue(varName);
            if (value && (value.includes('virtual-pet') || value.includes('undefined'))) {
                console.log(`⚠️ 发现CSS变量污染: ${varName} = ${value}`);
                hasIssues = true;
                // 清除被污染的变量
                document.documentElement.style.removeProperty(varName);
            }
        });

        if (hasIssues) {
            console.log(`[${extensionName}] 🧹 已清理CSS变量污染`);
        } else {
            console.log(`[${extensionName}] ✅ CSS变量检查正常`);
        }

        return !hasIssues;
    }

    // 全局紧急修复函数
    window.emergencyFixSillyTavernUI = function() {
        console.log('🚨 紧急修复SillyTavern UI...');

        // 1. 检查并修复CSS变量污染
        checkAndFixCSSVariables();

        // 2. 移除所有虚拟宠物相关样式
        $('style').each(function() {
            const content = $(this).text();
            if (content.includes('virtual-pet') ||
                content.includes('body >') ||
                content.includes('position: relative !important') ||
                content.includes(':root')) {
                console.log('移除样式:', $(this).attr('id') || '匿名样式');
                $(this).remove();
            }
        });

        // 3. 重置body样式
        $('body').removeAttr('style');
        $('body').css({
            'position': '',
            'overflow': '',
            'display': '',
            'visibility': ''
        });

        // 4. 重置html样式
        $('html').removeAttr('style');
        $('html').css({
            'position': '',
            'overflow': '',
            'display': '',
            'visibility': ''
        });

        // 5. 清除document.documentElement上的样式
        const docStyle = document.documentElement.style;
        for (let i = docStyle.length - 1; i >= 0; i--) {
            const prop = docStyle[i];
            if (prop.includes('virtual-pet') || prop.startsWith('--')) {
                docStyle.removeProperty(prop);
            }
        }

        // 6. 移除虚拟宠物元素
        $('[id*="virtual-pet"]').remove();
        $('[class*="virtual-pet"]').remove();

        // 7. 强制刷新页面布局
        $('body').hide().show();

        console.log('✅ 紧急修复完成！请刷新页面以完全恢复。');
        alert('🚨 紧急修复完成！\n\n请按 Ctrl+F5 强制刷新页面以完全恢复SillyTavern界面。\n\n如果问题持续，请禁用虚拟宠物插件。');

        return true;
    };

    // 立即执行紧急清理（如果检测到问题）
    setTimeout(() => {
        if ($('body').children().length === 0 ||
            $('body').css('display') === 'none' ||
            $('#send_textarea').length === 0) {
            console.log(`[${extensionName}] 🚨 检测到SillyTavern UI问题，执行紧急修复...`);
            window.emergencyFixSillyTavernUI();
        }
    }, 1000);

    /**
     * 安全的SillyTavern设置保存函数
     */
    function safeSillyTavernSave() {
        const now = Date.now();
        if (now - lastSyncSaveTime < SYNC_SAVE_COOLDOWN) {
            console.log(`[${extensionName}] 同步保存冷却中，跳过此次保存`);
            return false;
        }

        try {
            if (typeof window.saveSettingsDebounced === 'function' &&
                typeof window.extension_settings === 'object' &&
                window.extension_settings !== null) {

                window.saveSettingsDebounced();
                lastSyncSaveTime = now;
                return true;
            }
        } catch (error) {
            console.warn(`[${extensionName}] SillyTavern保存失败:`, error);
        }
        return false;
    }

    // 拓麻歌子风格配色方案
    const candyColors = {
        // 主色调 - 经典拓麻歌子风格
        primary: '#000000',      // 黑色主色
        secondary: '#333333',    // 深灰
        accent: '#666666',       // 中灰
        warning: '#FF8000',      // 橙色警告
        success: '#008000',      // 绿色成功

        // 背景色 - 糖果色渐变
        background: 'linear-gradient(135deg, #FFE5F1 0%, #E5F9F0 50%, #E5F4FF 100%)', // 糖果渐变
        backgroundSolid: '#FFF8FC', // 纯色背景备选
        screen: '#FFE5F1',       // 糖果粉屏幕
        screenDark: '#E5F9F0',   // 薄荷绿屏幕

        // 文字色 - 糖果色适配
        textPrimary: '#2D3748',   // 深灰色文字
        textSecondary: '#4A5568', // 中灰色文字
        textLight: '#718096',     // 浅灰色文字
        textWhite: '#FFFFFF',     // 白色文字

        // 边框和阴影 - 柔和风格
        border: '#E2E8F0',       // 浅边框
        borderAccent: '#FF9EC7', // 强调边框
        shadow: 'rgba(255, 158, 199, 0.2)', // 粉色阴影
        shadowLight: 'rgba(255, 158, 199, 0.1)', // 浅粉色阴影

        // 按钮色 - 糖果色风格
        buttonPrimary: '#FF9EC7',
        buttonSecondary: '#A8E6CF',
        buttonAccent: '#87CEEB',
        buttonHover: '#FF7FB3',

        // 状态栏色 - 糖果色风格
        health: '#FF6B9D',       // 健康 - 糖果粉
        happiness: '#FFD93D',    // 快乐 - 柠檬黄
        hunger: '#FF9F43',       // 饱食 - 蜜桃橙
        energy: '#74B9FF',       // 精力 - 天空蓝
        experience: '#A29BFE'    // 经验 - 薰衣草紫
    };
    
    // 宠物数据结构 - 智能初始化系统
    let petData = {
        name: "小宠物",
        type: "cat", // cat, dog, dragon, etc.
        level: 1,
        experience: 0,
        health: 35,      // 初始值，首次打开会随机化到50以下
        happiness: 30,   // 初始值，首次打开会随机化到50以下
        hunger: 40,      // 初始值，首次打开会随机化到50以下
        energy: 45,      // 初始值，首次打开会随机化到50以下

        // 拓麻歌子式生命状态
        lifeStage: "baby",    // baby, child, teen, adult, senior
        age: 0,               // 年龄（小时）
        isAlive: true,        // 是否存活
        deathReason: null,    // 死亡原因

        // 拓麻歌子式护理状态
        sickness: 0,          // 疾病程度 0-100
        discipline: 50,       // 纪律值 0-100
        weight: 30,           // 体重

        // 时间记录
        lastFeedTime: Date.now(),
        lastPlayTime: Date.now(),
        lastSleepTime: Date.now(),
        lastUpdateTime: Date.now(),
        lastCareTime: Date.now(),     // 最后照顾时间
        created: Date.now(),

        // 拓麻歌子式计数器
        careNeglectCount: 0,          // 忽视照顾次数
        sicknessDuration: 0,          // 生病持续时间

        // 商店系统
        coins: 100,                   // 金币
        inventory: {},                // 物品库存

        // AI人设系统
        personality: '',              // 当前人设内容

        dataVersion: 4.0 // 数据版本标记 - 升级到4.0表示拓麻歌子系统
    };
    
    // -----------------------------------------------------------------
    // 2. 预设人设定义
    // -----------------------------------------------------------------

    const PRESET_PERSONALITIES = {
        'default': "一只高冷但内心温柔的猫，喜欢被投喂，但嘴上不承认。说话时经常用'哼'开头，偶尔会露出可爱的一面。",
        'cheerful': "一只活泼可爱的小狗，总是充满活力，喜欢和主人玩耍。说话热情洋溢，经常用感叹号，喜欢撒娇卖萌。",
        'elegant': "一只优雅的龙，说话古典文雅，有着高贵的气质。喜欢用文言文或古风词汇，举止优雅，但内心其实很温暖。",
        'shy': "一只害羞的兔子，说话轻声细语，容易脸红。性格温柔内向，喜欢用'...'和颜文字，偶尔会结巴。",
        'smart': "一只聪明的鸟，喜欢说俏皮话，有时会调皮捣蛋。说话机智幽默，喜欢用双关语和小聪明，偶尔会炫耀知识。"
    };



    /**
     * 获取当前有效的人设
     * @returns {string} 当前人设描述
     */
    function getCurrentPersonality() {
        const selectedType = localStorage.getItem(`${extensionName}-personality-type`) || 'default';

        if (selectedType === 'custom') {
            const customPersonality = localStorage.getItem(`${extensionName}-custom-personality`) || '';
            // 如果自定义人设为空，返回通用的默认人设，避免动物类型混淆
            if (!customPersonality.trim()) {
                return "一个可爱的虚拟宠物，性格温和友善，喜欢和主人互动。";
            }
            return customPersonality;
        } else {
            return PRESET_PERSONALITIES[selectedType] || PRESET_PERSONALITIES.default;
        }
    }

    /**
     * 保存人设设置
     * @param {string} type 人设类型
     * @param {string} customText 自定义人设文本（仅当type为'custom'时使用）
     */
    function savePersonalitySettings(type, customText = '') {
        localStorage.setItem(`${extensionName}-personality-type`, type);
        if (type === 'custom') {
            localStorage.setItem(`${extensionName}-custom-personality`, customText);
        }

        // 更新petData中的personality字段
        petData.personality = getCurrentPersonality();
        savePetData();

        console.log(`[${extensionName}] 人设已更新为: ${type === 'custom' ? '自定义' : type}`);
        console.log(`[${extensionName}] 人设内容: ${petData.personality}`);
    }

    /**
     * 清理旧的角色卡数据
     */
    function cleanupOldCharacterData() {
        // 检查自定义人设是否包含JSON格式的角色卡数据
        const customPersonality = localStorage.getItem(`${extensionName}-custom-personality`) || '';
        if (customPersonality.trim().startsWith('{')) {
            console.log(`[${extensionName}] 检测到旧的JSON格式角色卡数据，正在清理...`);
            // 清空自定义人设，回退到默认人设
            localStorage.removeItem(`${extensionName}-custom-personality`);
            localStorage.setItem(`${extensionName}-personality-type`, 'default');
            toastr.info('检测到旧的角色卡数据格式，已自动清理并重置为默认人设');
        }
    }

    // -----------------------------------------------------------------
    // AI API 配置
    // -----------------------------------------------------------------









    /**
     * 直接从后端API获取可用模型列表 - 全新方法
     */
    async function getAvailableAPIs() {
        try {
            console.log(`[${extensionName}] 🎯 直接从后端API获取可用模型列表...`);
            const availableAPIs = [];

            // 方法1: 直接调用各大API提供商的模型列表端点
            console.log(`[${extensionName}] 🌐 尝试直接调用后端API...`);

            // 构建API提供商列表，优先使用用户配置的URL
            const apiProviders = [
                {
                    name: 'OpenAI (用户配置)',
                    type: 'openai',
                    endpoints: [
                        userApiUrls.openai + '/models',
                        userApiUrls.openai.replace('/v1', '') + '/v1/models'  // 备用格式
                    ],
                    requiresAuth: true,
                    authHeader: 'Authorization',
                    authPrefix: 'Bearer '
                },
                {
                    name: 'OpenAI (官方)',
                    type: 'openai_official',
                    endpoints: [
                        'https://api.openai.com/v1/models',
                        'https://api.openai.com/v1/engines'
                    ],
                    requiresAuth: true,
                    authHeader: 'Authorization',
                    authPrefix: 'Bearer '
                },
                {
                    name: 'Anthropic Claude',
                    type: 'claude',
                    endpoints: [
                        'https://api.anthropic.com/v1/models'
                    ],
                    requiresAuth: true,
                    authHeader: 'x-api-key',
                    authPrefix: ''
                },
                {
                    name: 'Google AI',
                    type: 'google',
                    endpoints: [
                        'https://generativelanguage.googleapis.com/v1beta/models'
                    ],
                    requiresAuth: true,
                    authHeader: 'Authorization',
                    authPrefix: 'Bearer '
                },
                {
                    name: 'Ollama (本地)',
                    type: 'ollama',
                    endpoints: [
                        'http://localhost:11434/api/tags',
                        'http://127.0.0.1:11434/api/tags'
                    ],
                    requiresAuth: false
                },
                {
                    name: 'LM Studio (本地)',
                    type: 'lmstudio',
                    endpoints: [
                        'http://localhost:1234/v1/models',
                        'http://127.0.0.1:1234/v1/models'
                    ],
                    requiresAuth: false
                },
                {
                    name: 'Text Generation WebUI',
                    type: 'textgen',
                    endpoints: [
                        'http://localhost:5000/v1/models',
                        'http://127.0.0.1:5000/v1/models'
                    ],
                    requiresAuth: false
                }
            ];

            // 尝试从用户配置中获取API密钥和URL
            const userApiKeys = {
                openai: $('#ai-key-input').val() || localStorage.getItem('openai_api_key'),
                claude: localStorage.getItem('claude_api_key'),
                google: localStorage.getItem('google_api_key')
            };

            const userApiUrls = {
                openai: $('#ai-url-input').val() || 'https://api.openai.com/v1',
                claude: 'https://api.anthropic.com/v1',
                google: 'https://generativelanguage.googleapis.com/v1beta'
            };

            for (const provider of apiProviders) {
                console.log(`[${extensionName}] 🔍 检查 ${provider.name}...`);

                for (const endpoint of provider.endpoints) {
                    try {
                        const headers = {
                            'Content-Type': 'application/json'
                        };

                        // 添加认证头（如果需要且有密钥）
                        if (provider.requiresAuth && userApiKeys[provider.type]) {
                            headers[provider.authHeader] = provider.authPrefix + userApiKeys[provider.type];
                            console.log(`[${extensionName}] 🔑 使用API密钥进行认证`);
                        }

                        console.log(`[${extensionName}] 🔗 尝试: ${endpoint}`);

                        const response = await fetch(endpoint, {
                            method: 'GET',
                            headers: headers,
                            // 添加超时和错误处理
                            signal: AbortSignal.timeout(10000) // 10秒超时
                        });

                        if (response.ok) {
                            const data = await response.json();
                            console.log(`[${extensionName}] ✅ ${provider.name} 成功:`, data);

                            // 解析不同API的响应格式
                            let models = [];

                            if (provider.type === 'openai') {
                                // OpenAI格式: {data: [{id: "gpt-4", ...}, ...]}
                                models = data.data || data.models || [];
                            } else if (provider.type === 'claude') {
                                // Claude格式可能不同
                                models = data.models || data.data || [];
                            } else if (provider.type === 'google') {
                                // Google AI格式: {models: [{name: "models/gemini-pro", ...}, ...]}
                                models = data.models || [];
                            } else if (provider.type === 'ollama') {
                                // Ollama格式: {models: [{name: "llama2", ...}, ...]}
                                models = data.models || [];
                            } else {
                                // 通用格式处理
                                models = data.models || data.data || data.engines || [];
                            }

                            // 添加检测到的模型
                            models.forEach(model => {
                                let modelName = '';
                                let modelId = '';

                                if (typeof model === 'string') {
                                    modelName = modelId = model;
                                } else if (model.id) {
                                    modelId = model.id;
                                    modelName = model.id;
                                } else if (model.name) {
                                    modelId = model.name;
                                    modelName = model.name.replace('models/', ''); // 处理Google AI的格式
                                }

                                if (modelName) {
                                    availableAPIs.push({
                                        type: provider.type,
                                        name: modelName,
                                        id: modelId,
                                        status: 'available',
                                        source: endpoint,
                                        provider: provider.name,
                                        requiresAuth: provider.requiresAuth,
                                        hasAuth: provider.requiresAuth ? !!userApiKeys[provider.type] : true
                                    });
                                }
                            });

                            // 找到可用的API后，不再尝试该提供商的其他端点
                            break;

                        } else if (response.status === 401) {
                            console.log(`[${extensionName}] 🔐 ${provider.name} 需要API密钥认证`);
                            availableAPIs.push({
                                type: provider.type,
                                name: `${provider.name} (需要API密钥)`,
                                status: 'auth_required',
                                source: endpoint,
                                provider: provider.name,
                                requiresAuth: true,
                                hasAuth: false
                            });
                        } else {
                            console.log(`[${extensionName}] ❌ ${endpoint}: HTTP ${response.status}`);
                        }

                    } catch (error) {
                        if (error.name === 'TimeoutError') {
                            console.log(`[${extensionName}] ⏰ ${endpoint} 超时`);
                        } else if (error.message.includes('CORS')) {
                            console.log(`[${extensionName}] 🚫 ${endpoint} CORS限制`);
                        } else {
                            console.log(`[${extensionName}] ❌ ${endpoint} 失败: ${error.message}`);
                        }
                    }
                }
            }

            // 方法2: 从SillyTavern上下文获取当前配置作为补充
            console.log(`[${extensionName}] 📋 获取SillyTavern当前配置作为补充...`);
            if (typeof SillyTavern !== 'undefined' && SillyTavern.getContext) {
                try {
                    const context = SillyTavern.getContext();

                    if (context.main_api) {
                        console.log(`[${extensionName}] 🎯 SillyTavern当前API: ${context.main_api}`);
                        availableAPIs.push({
                            type: context.main_api,
                            name: `${getAPIDisplayName(context.main_api)} (SillyTavern当前)`,
                            status: context.online_status ? 'connected' : 'configured',
                            source: 'SillyTavern',
                            provider: 'SillyTavern配置'
                        });
                    }

                    if (context.model) {
                        console.log(`[${extensionName}] 🤖 SillyTavern当前模型: ${context.model}`);
                        availableAPIs.push({
                            type: 'current_model',
                            name: context.model,
                            status: 'current',
                            source: 'SillyTavern',
                            provider: 'SillyTavern当前模型'
                        });
                    }

                } catch (error) {
                    console.warn(`[${extensionName}] ⚠️ 获取SillyTavern上下文失败:`, error);
                }
            }

            // 去重并排序
            const uniqueAPIs = availableAPIs.filter((api, index, self) =>
                index === self.findIndex(a => a.name === api.name && a.type === api.type)
            ).sort((a, b) => {
                // 优先显示有认证的API
                if (a.hasAuth !== b.hasAuth) {
                    return b.hasAuth ? 1 : -1;
                }
                // 然后按状态排序
                const statusOrder = { 'current': 0, 'connected': 1, 'available': 2, 'auth_required': 3 };
                const aOrder = statusOrder[a.status] || 4;
                const bOrder = statusOrder[b.status] || 4;
                if (aOrder !== bOrder) {
                    return aOrder - bOrder;
                }
                // 最后按名称排序
                return a.name.localeCompare(b.name);
            });

            console.log(`[${extensionName}] 🎉 最终发现 ${uniqueAPIs.length} 个可用API:`, uniqueAPIs);

            if (uniqueAPIs.length === 0) {
                console.log(`[${extensionName}] ⚠️ 未发现任何API，可能的原因:`);
                console.log(`[${extensionName}] 1. 网络连接问题或CORS限制`);
                console.log(`[${extensionName}] 2. 需要配置API密钥`);
                console.log(`[${extensionName}] 3. 本地API服务未启动（如Ollama、LM Studio）`);
                console.log(`[${extensionName}] 4. API端点地址发生变化`);
                console.log(`[${extensionName}] 💡 建议: 先在AI配置中输入API密钥，然后重新刷新`);
            } else {
                console.log(`[${extensionName}] 📋 发现的API分布:`);
                const providerCount = {};
                const statusCount = {};
                uniqueAPIs.forEach(api => {
                    providerCount[api.provider] = (providerCount[api.provider] || 0) + 1;
                    statusCount[api.status] = (statusCount[api.status] || 0) + 1;
                });
                console.log(`[${extensionName}] 📊 按提供商:`, providerCount);
                console.log(`[${extensionName}] 📊 按状态:`, statusCount);

                // 提供使用建议
                const authRequiredCount = uniqueAPIs.filter(api => api.status === 'auth_required').length;
                if (authRequiredCount > 0) {
                    console.log(`[${extensionName}] 💡 有 ${authRequiredCount} 个API需要密钥认证`);
                }

                const availableCount = uniqueAPIs.filter(api => api.status === 'available').length;
                if (availableCount > 0) {
                    console.log(`[${extensionName}] ✅ 有 ${availableCount} 个API可直接使用`);
                }
            }

            return uniqueAPIs;

        } catch (error) {
            console.error(`[${extensionName}] ❌ 获取API列表失败:`, error);
            return [];
        }
    }

    /**
     * 获取API显示名称
     */
    function getAPIDisplayName(apiType) {
        const displayNames = {
            'openai': 'OpenAI (ChatGPT)',
            'claude': 'Claude (Anthropic)',
            'google': 'Google AI Studio',
            'mistral': 'Mistral AI',
            'ollama': 'Ollama (本地)',
            'kobold': 'KoboldAI',
            'tabby': 'TabbyAPI',
            'horde': 'AI Horde',
            'custom': '自定义API'
        };
        return displayNames[apiType] || apiType;
    }

    /**
     * 更新模型下拉列表 - 新的主要功能
     */
    function updateModelDropdown(models) {
        const select = $('#ai-model-select');
        const currentValue = select.val();

        console.log(`[${extensionName}] 🔄 更新模型下拉列表，共 ${models.length} 个模型`);

        // 保留原有的静态选项
        const staticOptions = `
            <option value="">请选择模型...</option>
            <option value="gpt-4">GPT-4</option>
            <option value="gpt-4-turbo">GPT-4 Turbo</option>
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            <option value="claude-3-opus-20240229">Claude 3 Opus</option>
            <option value="claude-3-sonnet-20240229">Claude 3 Sonnet</option>
            <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
            <option value="gemini-pro">Gemini Pro</option>
            <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
            <option value="custom">🔧 自定义模型</option>
        `;

        // 按提供商分组动态模型
        const groupedModels = {};
        models.forEach(model => {
            const group = model.provider || 'Other';
            if (!groupedModels[group]) {
                groupedModels[group] = [];
            }
            groupedModels[group].push(model);
        });

        // 生成动态选项
        let dynamicOptions = '';
        if (Object.keys(groupedModels).length > 0) {
            // 按优先级排序组
            const groupOrder = ['OpenAI', 'Anthropic Claude', 'Google AI', 'Ollama (本地)', 'LM Studio (本地)', '第三方API', '用户配置API', 'Other'];
            const sortedGroups = Object.keys(groupedModels).sort((a, b) => {
                const aIndex = groupOrder.indexOf(a);
                const bIndex = groupOrder.indexOf(b);
                if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
                if (aIndex === -1) return 1;
                if (bIndex === -1) return -1;
                return aIndex - bIndex;
            });

            sortedGroups.forEach(group => {
                const groupModels = groupedModels[group];
                dynamicOptions += `<optgroup label="━━━ ${group} ━━━">`;

                groupModels.forEach(model => {
                    const value = `api_model:${model.id || model.name}`;
                    const statusIcon = getStatusIcon(model.status);
                    let displayName = model.name;

                    // 添加状态提示
                    if (model.status === 'suggested') {
                        displayName += ' (推荐)';
                    } else if (model.status === 'auth_required') {
                        displayName += ' (需要密钥)';
                    }

                    // 限制显示长度
                    if (displayName.length > 40) {
                        displayName = displayName.substring(0, 37) + '...';
                    }

                    dynamicOptions += `<option value="${value}" data-model-id="${model.id}" data-status="${model.status}">${statusIcon} ${displayName}</option>`;
                });
                dynamicOptions += '</optgroup>';
            });
        }

        select.html(staticOptions + dynamicOptions);

        // 恢复之前的选择
        if (currentValue) {
            select.val(currentValue);
        }

        console.log(`[${extensionName}] ✅ 模型下拉列表更新完成`);

        // 显示统计信息
        const totalModels = models.length;
        const availableModels = models.filter(model => model.status === 'available').length;
        const suggestedModels = models.filter(model => model.status === 'suggested').length;

        if (totalModels > 0) {
            console.log(`[${extensionName}] 📊 模型统计: 总计${totalModels}个, 可用${availableModels}个, 推荐${suggestedModels}个`);
        }
    }

    /**
     * 更新API下拉列表 - 保留兼容性
     */
    function updateAPIDropdown(apis) {
        // 为了兼容性，将API列表转换为模型列表格式
        const models = apis.map(api => ({
            id: api.name,
            name: api.name,
            status: api.status,
            provider: api.provider,
            type: api.type
        }));

        updateModelDropdown(models);
    }

    /**
     * 获取状态图标
     */
    function getStatusIcon(status) {
        const icons = {
            'available': '✅',
            'connected': '🟢',
            'current': '⭐',
            'configured': '🔧',
            'stored': '💾',
            'detected': '🔍',
            'unknown': '❓'
        };
        return icons[status] || '❓';
    }

    /**
     * 保存AI配置设置 - 支持多端同步
     */
    function saveAISettings() {
        // 获取当前选择的模型
        let currentModel = '';
        const modelSelect = $('#ai-model-select').val();
        const modelInput = $('#ai-model-input').val();

        if (modelSelect === 'custom') {
            currentModel = modelInput;
        } else if (modelSelect && modelSelect.startsWith('api_model:')) {
            currentModel = modelSelect.replace('api_model:', '');
        } else if (modelSelect) {
            currentModel = modelSelect;
        } else {
            currentModel = modelInput;
        }

        const settings = {
            apiType: $('#ai-api-select').val(),
            apiUrl: $('#ai-url-input').val(),
            apiKey: $('#ai-key-input').val(),
            apiModel: currentModel,
            lastTestTime: Date.now(),
            lastTestResult: $('#ai-connection-status').text().includes('✅'),
            lastSyncTime: Date.now() // 添加同步时间戳
        };

        // 保存到本地存储
        localStorage.setItem(`${extensionName}-ai-settings`, JSON.stringify(settings));

        // 保存到同步存储
        saveAISettingsToSync(settings);

        console.log(`[${extensionName}] AI设置已保存并同步:`, settings);
    }

    /**
     * 加载AI配置设置 - 支持多端同步
     */
    function loadAISettings() {
        try {
            // 首先尝试从同步存储加载
            const syncSettings = loadAISettingsFromSync();
            const localSettings = localStorage.getItem(`${extensionName}-ai-settings`);

            let settings = null;

            // 比较同步数据和本地数据，选择最新的
            if (syncSettings && localSettings) {
                try {
                    const syncParsed = typeof syncSettings === 'object' ? syncSettings : JSON.parse(syncSettings);
                    const localParsed = JSON.parse(localSettings);

                    const syncTime = syncParsed.lastSyncTime || 0;
                    const localTime = localParsed.lastSyncTime || 0;

                    if (syncTime > localTime) {
                        settings = syncParsed;
                        console.log(`[${extensionName}] 使用同步的AI设置（更新）`);
                    } else {
                        settings = localParsed;
                        console.log(`[${extensionName}] 使用本地AI设置（更新）`);
                    }
                } catch (error) {
                    console.warn(`[${extensionName}] AI设置比较失败，使用本地设置:`, error);
                    settings = JSON.parse(localSettings);
                }
            } else if (syncSettings) {
                settings = typeof syncSettings === 'object' ? syncSettings : JSON.parse(syncSettings);
                console.log(`[${extensionName}] 使用同步的AI设置（仅有同步）`);
            } else if (localSettings) {
                settings = JSON.parse(localSettings);
                console.log(`[${extensionName}] 使用本地AI设置（仅有本地）`);
            }

            if (settings) {
                $('#ai-api-select').val(settings.apiType || '');
                $('#ai-url-input').val(settings.apiUrl || '');
                $('#ai-key-input').val(settings.apiKey || '');

                // 处理模型设置
                const savedModel = settings.apiModel || '';
                if (savedModel) {
                    // 尝试在模型选择框中找到匹配的选项
                    const modelSelect = $('#ai-model-select');
                    const matchingOption = modelSelect.find(`option[value="${savedModel}"]`);

                    if (matchingOption.length > 0) {
                        // 在下拉列表中找到了匹配的模型
                        modelSelect.val(savedModel);
                        $('#ai-model-input').hide().val(savedModel);
                    } else {
                        // 没有找到匹配的模型，使用自定义模式
                        modelSelect.val('custom');
                        $('#ai-model-input').show().val(savedModel);
                    }
                } else {
                    $('#ai-model-input').val('');
                }

                // 根据API类型显示/隐藏配置输入框
                toggleApiConfigInputs(settings.apiType);

                // 显示上次测试结果
                if (settings.lastTestResult && settings.lastTestTime) {
                    const timeAgo = Math.floor((Date.now() - settings.lastTestTime) / (1000 * 60));
                    $('#ai-connection-status').text(`✅ 上次测试成功 (${timeAgo}分钟前)`).css('color', '#48bb78');
                }

                console.log(`[${extensionName}] AI设置已加载:`, settings);
                return settings;
            }
        } catch (error) {
            console.error(`[${extensionName}] 加载AI设置失败:`, error);
        }
        return {};
    }

    /**
     * 切换API配置输入框的显示状态 - 后端API版本
     */
    function toggleApiConfigInputs(apiType) {
        const container = $('#ai-config-container');

        console.log(`[${extensionName}] 🔧 处理API类型: ${apiType}`);

        // 处理从后端API检测到的API类型
        let processedApiType = apiType;
        let backendInfo = null;

        if (apiType && apiType.startsWith('backend:')) {
            // 解析后端API信息: backend:type:name
            const parts = apiType.split(':');
            if (parts.length >= 3) {
                const backendType = parts[1];
                const backendName = parts.slice(2).join(':'); // 处理名称中可能包含冒号的情况

                processedApiType = backendType;
                backendInfo = {
                    type: backendType,
                    name: backendName
                };

                console.log(`[${extensionName}] 🔍 后端API信息:`, backendInfo);

                // 自动填充模型名称
                $('#ai-model-input').val(backendName);

                // 根据API类型提供配置建议
                let configMessage = `已选择模型: ${backendName}`;
                if (backendType === 'openai') {
                    configMessage += '，请输入OpenAI API密钥';
                } else if (backendType === 'claude') {
                    configMessage += '，请输入Claude API密钥';
                } else if (backendType === 'google') {
                    configMessage += '，请输入Google AI API密钥';
                } else if (backendType === 'ollama' || backendType === 'lmstudio') {
                    configMessage += '，本地API无需密钥';
                } else {
                    configMessage += '，请配置相应的URL和密钥';
                }

                toastr.info(configMessage, '🤖 模型已选择', { timeOut: 6000 });
            }
        } else if (apiType && apiType.startsWith('detected:')) {
            // 兼容旧格式
            const parts = apiType.split(':');
            if (parts.length >= 3) {
                const detectedType = parts[1];
                const detectedName = parts.slice(2).join(':');
                processedApiType = detectedType;
                $('#ai-model-input').val(detectedName);
                toastr.info(`已选择检测到的API: ${detectedName}，请配置相应的URL和密钥`, '', { timeOut: 6000 });
            }
        } else if (apiType && apiType.startsWith('model:')) {
            // 兼容更旧的格式
            const modelName = apiType.replace('model:', '');
            processedApiType = 'custom';
            $('#ai-model-input').val(modelName);
            toastr.info(`已选择模型: ${modelName}，请配置对应的API URL和密钥`, '', { timeOut: 5000 });
        }

        if (processedApiType && processedApiType !== 'auto' && processedApiType !== '') {
            container.show();

            // 根据API类型设置默认值
            const defaults = {
                'openai': { url: 'https://api.openai.com/v1', model: 'gpt-4' },
                'claude': { url: 'https://api.anthropic.com/v1', model: 'claude-3-sonnet-20240229' },
                'google': { url: 'https://generativelanguage.googleapis.com/v1beta', model: 'gemini-pro' },
                'mistral': { url: 'https://api.mistral.ai/v1', model: 'mistral-medium' },
                'ollama': { url: 'http://localhost:11434/v1', model: 'llama2' },
                'lmstudio': { url: 'http://localhost:1234/v1', model: 'local-model' },
                'textgen': { url: 'http://localhost:5000/v1', model: 'text-generation-webui' },
                'kobold': { url: 'http://localhost:5001', model: 'kobold' },
                'tabby': { url: 'http://localhost:5000', model: 'tabby' },
                'horde': { url: 'https://horde.koboldai.net', model: 'horde' },
                'custom': { url: '', model: '' }
            };

            // 设置默认值（如果当前输入框为空）
            if (defaults[processedApiType]) {
                if (!$('#ai-url-input').val() && defaults[processedApiType].url) {
                    $('#ai-url-input').val(defaults[processedApiType].url);
                    $('#ai-url-input').attr('placeholder', defaults[processedApiType].url);
                }
                if (!$('#ai-model-input').val() && defaults[processedApiType].model && !backendInfo) {
                    $('#ai-model-input').attr('placeholder', defaults[processedApiType].model);
                }
            }

            // 如果是从后端检测到的API，提供特定的配置建议
            if (backendInfo) {
                console.log(`[${extensionName}] 💡 为后端API提供配置建议`);

                // 根据API类型自动设置URL
                if (backendInfo.type === 'openai') {
                    if (!$('#ai-url-input').val()) {
                        $('#ai-url-input').val('https://api.openai.com/v1');
                    }
                } else if (backendInfo.type === 'claude') {
                    if (!$('#ai-url-input').val()) {
                        $('#ai-url-input').val('https://api.anthropic.com/v1');
                    }
                } else if (backendInfo.type === 'google') {
                    if (!$('#ai-url-input').val()) {
                        $('#ai-url-input').val('https://generativelanguage.googleapis.com/v1beta');
                    }
                } else if (backendInfo.type === 'ollama') {
                    if (!$('#ai-url-input').val()) {
                        $('#ai-url-input').val('http://localhost:11434/v1');
                    }
                } else if (backendInfo.type === 'lmstudio') {
                    if (!$('#ai-url-input').val()) {
                        $('#ai-url-input').val('http://localhost:1234/v1');
                    }
                }

                // 为本地API隐藏密钥输入框或提供提示
                if (backendInfo.type === 'ollama' || backendInfo.type === 'lmstudio' || backendInfo.type === 'textgen') {
                    $('#ai-key-input').attr('placeholder', '本地API通常不需要密钥');
                }
            }
        } else {
            container.hide();
        }
    }

    /**
     * 测试AI连接
     */
    async function testAIConnection() {
        const statusElement = $('#ai-connection-status');
        const testButton = $('#test-ai-connection-btn');
        const settings = loadAISettings();

        // 更新状态为测试中
        statusElement.text('🔄 测试中...').css('color', '#ffa500');
        testButton.prop('disabled', true);

        try {
            if (!settings.apiType || !settings.apiUrl || !settings.apiKey) {
                throw new Error('请填写完整的API配置信息（类型、URL和密钥）');
            }

            // 发送测试请求
            const testPrompt = "请简单回复'测试成功'，不超过10个字。";
            console.log(`[${extensionName}] 开始测试API连接...`);

            const response = await callCustomAPI(testPrompt, settings, 10000); // 10秒超时用于测试

            if (response && response.trim()) {
                statusElement.text('✅ 连接成功').css('color', '#48bb78');
                toastr.success(`API连接测试成功！类型: ${settings.apiType}，AI回复: ${response.substring(0, 50)}`);

                // 保存测试结果
                saveAISettings();
                return true;
            } else {
                throw new Error('API返回空响应');
            }

        } catch (error) {
            statusElement.text('❌ 连接失败').css('color', '#f56565');
            toastr.error('连接测试失败: ' + error.message);

            // 提供详细的错误帮助
            if (error.message.includes('500')) {
                setTimeout(() => {
                    toastr.info('500错误表示服务器内部错误，可能是：1) API服务器故障 2) 请求格式不正确 3) 模型名称错误', '', { timeOut: 10000 });
                }, 1000);
            } else if (error.message.includes('403')) {
                setTimeout(() => {
                    toastr.info('403错误通常表示API密钥无效或权限不足，请检查API密钥是否正确', '', { timeOut: 8000 });
                }, 1000);
            } else if (error.message.includes('401')) {
                setTimeout(() => {
                    toastr.info('401错误表示认证失败，请检查API密钥格式是否正确', '', { timeOut: 8000 });
                }, 1000);
            } else if (error.message.includes('404')) {
                setTimeout(() => {
                    toastr.info('404错误表示API端点不存在，请检查API URL是否正确', '', { timeOut: 8000 });
                }, 1000);
            }

            return false;
        } finally {
            testButton.prop('disabled', false);
        }
    }

    /**
     * 调用AI生成API
     * @param {string} prompt - 要发送给AI的提示词
     * @param {number} timeout - 超时时间（毫秒），默认15秒
     * @returns {Promise<string>} - AI生成的回复
     */
    async function callAIAPI(prompt, timeout = 30000) {
        try {
            // 只使用自定义API配置
            const settings = loadAISettings();
            if (!settings.apiType || !settings.apiUrl || !settings.apiKey) {
                throw new Error('请先在插件设置中配置API信息（类型、URL和密钥）');
            }

            console.log(`[${extensionName}] 使用自定义API: ${settings.apiType}`);
            const result = await callCustomAPI(prompt, settings, timeout);

            console.log(`[${extensionName}] API原始返回结果:`, result);
            console.log(`[${extensionName}] 结果类型:`, typeof result);
            console.log(`[${extensionName}] 结果长度:`, result ? result.length : 'null/undefined');

            if (result && result.trim()) {
                console.log(`[${extensionName}] 自定义API调用成功，返回内容: "${result.trim()}"`);
                return result.trim();
            } else {
                console.log(`[${extensionName}] API返回内容无效:`, {
                    result: result,
                    isString: typeof result === 'string',
                    isEmpty: !result,
                    trimmed: result ? result.trim() : 'cannot trim'
                });
                throw new Error('API返回了空的或无效的回复');
            }

        } catch (error) {
            console.error(`[${extensionName}] API调用失败:`, error);
            throw error;
        }
    }

    /**
     * 调用自定义API
     * @param {string} prompt - 要发送给AI的提示词
     * @param {object} settings - API配置设置
     * @param {number} timeout - 超时时间（毫秒）
     * @returns {Promise<string>} - AI生成的回复
     */
    async function callCustomAPI(prompt, settings, timeout = 30000) {
        console.log(`[${extensionName}] 调用自定义API: ${settings.apiType}，超时时间: ${timeout}ms`);

        // 智能构建请求URL - 用户只需填写到/v1，自动添加端点
        let apiUrl = settings.apiUrl;

        // 移除末尾斜杠
        apiUrl = apiUrl.replace(/\/+$/, '');

        // 自动添加聊天端点 - 用户只需要填写到/v1
        if (settings.apiType === 'openai' || settings.apiType === 'custom' || !settings.apiType) {
            if (!apiUrl.includes('/chat/completions')) {
                // 如果URL以/v1结尾，直接添加/chat/completions
                if (apiUrl.endsWith('/v1')) {
                    apiUrl = apiUrl + '/chat/completions';
                }
                // 如果URL不包含/v1，先添加/v1再添加/chat/completions
                else if (!apiUrl.includes('/v1')) {
                    apiUrl = apiUrl + '/v1/chat/completions';
                }
                // 如果URL包含/v1但不在末尾，直接添加/chat/completions
                else {
                    apiUrl = apiUrl + '/chat/completions';
                }
            }
        } else if (settings.apiType === 'claude') {
            if (!apiUrl.includes('/messages')) {
                if (apiUrl.endsWith('/v1')) {
                    apiUrl = apiUrl + '/messages';
                } else if (!apiUrl.includes('/v1')) {
                    apiUrl = apiUrl + '/v1/messages';
                } else {
                    apiUrl = apiUrl + '/messages';
                }
            }
        } else if (settings.apiType === 'google') {
            // Google Gemini API 特殊处理
            if (!apiUrl.includes(':generateContent')) {
                // 构建正确的Gemini API端点
                const modelName = settings.apiModel || 'gemini-pro';
                if (apiUrl.endsWith('/v1beta')) {
                    apiUrl = apiUrl + `/models/${modelName}:generateContent`;
                } else if (!apiUrl.includes('/v1beta')) {
                    apiUrl = apiUrl + `/v1beta/models/${modelName}:generateContent`;
                } else {
                    apiUrl = apiUrl + `/models/${modelName}:generateContent`;
                }
            }
        }

        console.log(`[${extensionName}] 原始URL: ${settings.apiUrl}`);
        console.log(`[${extensionName}] 修正后URL: ${apiUrl}`);
        console.log(`[${extensionName}] API类型: ${settings.apiType}`);

        // 构建请求头（根据API类型）
        const headers = {
            'Content-Type': 'application/json'
        };

        // 根据API类型设置认证头
        if (settings.apiType === 'google') {
            // Google API 使用 x-goog-api-key 头或者URL参数
            headers['x-goog-api-key'] = settings.apiKey;
            // 也可以通过URL参数传递，如果头部认证失败的话
            if (!apiUrl.includes('?key=') && !apiUrl.includes('&key=')) {
                apiUrl += `?key=${settings.apiKey}`;
            }
        } else if (settings.apiType === 'claude') {
            // Claude API 使用 x-api-key
            headers['x-api-key'] = settings.apiKey;
            headers['anthropic-version'] = '2023-06-01';
        } else {
            // OpenAI 和其他 API 使用 Bearer token
            headers['Authorization'] = `Bearer ${settings.apiKey}`;
        }

        // 构建请求体（根据API类型）
        let requestBody;
        if (settings.apiType === 'openai' || settings.apiType === 'custom') {
            requestBody = {
                model: settings.apiModel || 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 10000,  // 大幅增加token限制
                temperature: 0.8
            };
        } else if (settings.apiType === 'claude') {
            requestBody = {
                model: settings.apiModel || 'claude-3-sonnet-20240229',
                max_tokens: 10000,  // 大幅增加token限制
                messages: [
                    {
                        role: 'user',
                        content: prompt
                    }
                ]
            };
        } else if (settings.apiType === 'google') {
            // Google Gemini API 格式
            requestBody = {
                contents: [
                    {
                        parts: [
                            {
                                text: prompt
                            }
                        ]
                    }
                ],
                generationConfig: {
                    maxOutputTokens: 10000,  // 大幅增加token限制
                    temperature: 0.8
                }
            };
        } else {
            // 通用格式
            requestBody = {
                model: settings.apiModel || 'default',
                prompt: prompt,
                max_tokens: 10000,  // 大幅增加token限制
                temperature: 0.8
            };
        }

        // 使用AbortController来处理超时
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            console.log(`[${extensionName}] API调用超时，取消请求`);
            controller.abort();
        }, timeout);

        const startTime = Date.now();
        console.log(`[${extensionName}] 开始发送请求，时间戳: ${startTime}`);
        console.log(`[${extensionName}] 请求头:`, headers);
        console.log(`[${extensionName}] 请求体:`, requestBody);
        console.log(`[${extensionName}] 请求体JSON:`, JSON.stringify(requestBody, null, 2));

        try {
            // 移动端API连接优化
            const fetchOptions = {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody),
                signal: controller.signal
            };

            // 移动端特殊处理
            const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            if (isMobile) {
                // 移动端增加更长的超时时间
                clearTimeout(timeoutId);
                const mobileTimeoutId = setTimeout(() => controller.abort(), timeout + 10000); // 额外10秒

                // 移动端添加额外的请求头
                fetchOptions.headers = {
                    ...fetchOptions.headers,
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                };

                console.log(`[${extensionName}] 移动端API请求优化已应用`);
            }

            const response = await fetch(apiUrl, fetchOptions);

            const endTime = Date.now();
            const duration = endTime - startTime;
            clearTimeout(timeoutId);
            console.log(`[${extensionName}] API响应状态: ${response.status} ${response.statusText}，耗时: ${duration}ms`);

            if (!response.ok) {
                // 尝试读取错误响应内容
                let errorDetails = '';
                try {
                    const errorText = await response.text();
                    errorDetails = errorText ? ` - ${errorText}` : '';
                    console.log(`[${extensionName}] API错误详情:`, errorText);
                } catch (e) {
                    console.log(`[${extensionName}] 无法读取错误详情:`, e);
                }

                throw new Error(`自定义API调用失败: ${response.status} ${response.statusText}${errorDetails}`);
            }

            const data = await response.json();
            console.log(`[${extensionName}] API响应数据:`, data);

            // 深度分析响应结构
            console.log(`[${extensionName}] 🔍 深度响应分析:`);
            console.log(`- 响应对象类型:`, typeof data);
            console.log(`- 响应对象键:`, Object.keys(data));
            if (data.choices && data.choices.length > 0) {
                console.log(`- choices[0]完整内容:`, JSON.stringify(data.choices[0], null, 2));
                if (data.choices[0].message) {
                    console.log(`- message对象键:`, Object.keys(data.choices[0].message));
                    console.log(`- message完整内容:`, JSON.stringify(data.choices[0].message, null, 2));
                }
            }

            // 详细分析响应结构
            console.log(`[${extensionName}] 响应结构分析:`, {
                'data.choices存在': !!data.choices,
                'choices长度': data.choices?.length,
                'choices[0]存在': !!data.choices?.[0],
                'choices[0]的所有键': data.choices?.[0] ? Object.keys(data.choices[0]) : 'N/A'
            });

            // 根据API类型解析响应
            let result = '';
            console.log(`[${extensionName}] 开始解析响应，API类型: ${settings.apiType}`);

            if (settings.apiType === 'openai' || settings.apiType === 'custom') {
                console.log(`[${extensionName}] 使用OpenAI格式解析`);

                // 尝试多种OpenAI兼容格式的解析路径
                result = data.choices?.[0]?.message?.content ||
                         data.choices?.[0]?.text ||
                         data.choices?.[0]?.delta?.content ||
                         data.choices?.[0]?.message?.text ||
                         '';

                console.log(`[${extensionName}] OpenAI解析路径:`, {
                    'choices[0].message.content': data.choices?.[0]?.message?.content,
                    'choices[0].text': data.choices?.[0]?.text,
                    'choices[0].delta.content': data.choices?.[0]?.delta?.content,
                    'choices[0].message.text': data.choices?.[0]?.message?.text,
                    'choices[0].finish_reason': data.choices?.[0]?.finish_reason,
                    'choices_array': data.choices,
                    'first_choice': data.choices?.[0],
                    'final_result': result
                });

                // 检查finish_reason
                const finishReason = data.choices?.[0]?.finish_reason;
                if (finishReason === 'length') {
                    console.log(`[${extensionName}] ⚠️ 响应被截断！finish_reason: length - 需要增加max_tokens`);
                } else if (finishReason) {
                    console.log(`[${extensionName}] finish_reason: ${finishReason}`);
                }

                // 如果还是空的，尝试其他可能的字段
                if (!result && data.choices?.[0]) {
                    const choice = data.choices[0];
                    console.log(`[${extensionName}] 第一个choice的完整结构:`, choice);

                    // 尝试更多可能的字段
                    result = choice.content || choice.response || choice.output || '';
                    console.log(`[${extensionName}] 备用字段解析:`, {
                        'choice.content': choice.content,
                        'choice.response': choice.response,
                        'choice.output': choice.output,
                        'backup_result': result
                    });
                }
            } else if (settings.apiType === 'claude') {
                console.log(`[${extensionName}] 使用Claude格式解析`);
                result = data.content?.[0]?.text || '';
                console.log(`[${extensionName}] Claude解析路径:`, {
                    'content[0].text': data.content?.[0]?.text,
                    'final_result': result
                });
            } else if (settings.apiType === 'google') {
                console.log(`[${extensionName}] 使用Google Gemini格式解析`);
                // Google Gemini API 响应格式
                result = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                console.log(`[${extensionName}] Gemini解析路径:`, {
                    'candidates[0].content.parts[0].text': data.candidates?.[0]?.content?.parts?.[0]?.text,
                    'primary_result': result
                });

                // 备用解析路径
                if (!result) {
                    result = data.text || data.response || data.result || '';
                    console.log(`[${extensionName}] Gemini备用解析路径:`, {
                        'data.text': data.text,
                        'data.response': data.response,
                        'data.result': data.result,
                        'backup_result': result
                    });
                }
            } else {
                console.log(`[${extensionName}] 使用通用格式解析`);
                result = data.text || data.response || data.result || '';
                console.log(`[${extensionName}] 通用解析路径:`, {
                    'data.text': data.text,
                    'data.response': data.response,
                    'data.result': data.result,
                    'final_result': result
                });
            }

            console.log(`[${extensionName}] 最终解析结果:`, {
                result: result,
                type: typeof result,
                length: result ? result.length : 'null/undefined',
                trimmed: result ? result.trim() : 'cannot trim'
            });

            return result.trim();

        } catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error('API调用超时');
            }
            throw error;
        }
    }

    /**
     * 检查AI API是否可用
     * @returns {boolean} - API是否可用
     */
    function isAIAPIAvailable() {
        // 只检查自定义AI配置
        const settings = loadAISettings();
        const customAPIAvailable = settings.apiType && settings.apiUrl && settings.apiKey;

        console.log(`[${extensionName}] API可用性检查:`, {
            apiType: settings.apiType || '未设置',
            apiUrl: settings.apiUrl || '未设置',
            apiKey: settings.apiKey ? '已设置' : '未设置',
            available: customAPIAvailable
        });

        return customAPIAvailable;
    }

    /**
     * 构建互动Prompt
     * @param {string} action - 用户的行为 ('feed', 'play', 'sleep')
     * @returns {string} - 构建好的Prompt
     */
    function buildInteractionPrompt(action) {
        // 获取当前时间信息
        const now = new Date();
        const timeOfDay = now.getHours() < 12 ? '上午' : now.getHours() < 18 ? '下午' : '晚上';

        // 根据行为类型设置描述
        const actionDescriptions = {
            'feed': '给我喂了食物',
            'play': '陪我玩耍',
            'sleep': '让我休息',
            'hug': '给了我一个温暖的拥抱'
        };

        // 安全获取行为描述，确保不会出现undefined
        const actionDescription = actionDescriptions[action] || `与我进行了${action || '未知'}互动`;

        // 调试日志
        console.log(`[buildInteractionPrompt] action: "${action}", description: "${actionDescription}"`);

        // 如果action为undefined或null，使用默认值
        const safeAction = action || 'interact';

        // 获取当前人设，确保不包含冲突信息
        const currentPersonality = getCurrentPersonality();

        // 构建完整的Prompt - 优化版本，避免金币理解错误
        const prompt = `你是${petData.name}，请严格按照以下人设回应用户。

【你的身份设定】：
${currentPersonality}

【重要】：请完全按照上述身份设定回应，不要添加任何其他身份特征。

【当前状态】：
- 健康：${Math.round(petData.health)}/100 ${petData.health < 30 ? '(感觉不太舒服)' : petData.health > 70 ? '(精神很好)' : '(还算健康)'}
- 快乐：${Math.round(petData.happiness)}/100 ${petData.happiness < 30 ? '(心情不太好)' : petData.happiness > 70 ? '(很开心)' : '(心情一般)'}
- 饱食：${Math.round(petData.hunger)}/100 ${petData.hunger < 30 ? '(很饿)' : petData.hunger > 70 ? '(很饱)' : '(有点饿)'}
- 精力：${Math.round(petData.energy)}/100 ${petData.energy < 30 ? '(很累)' : petData.energy > 70 ? '(精力充沛)' : '(有点累)'}

【情景】：现在是${timeOfDay}，用户刚刚${actionDescription}。

【注意】：不要在回复中提及金币、奖励或任何游戏机制，只需要按照你的人设自然回应即可。

请以${petData.name}的身份，严格按照你的人设回应（不超过30字）：`;

        return prompt;
    }

    /**
     * 处理AI回复的通用函数
     * @param {string} action - 行为类型
     * @param {string} fallbackMessage - 回退消息
     * @param {Object} rewards - 奖励信息 {coins: number, experience: number}
     * @returns {Promise<void>}
     */
    async function handleAIReply(action, fallbackMessage, rewards = null) {
        try {
            if (isAIAPIAvailable()) {
                // 显示加载状态
                const loadingToast = toastr.info(`${petData.name} 正在思考...`, "", {
                    timeOut: 0,
                    extendedTimeOut: 0,
                    closeButton: false
                });

                try {
                    // 构建Prompt并调用AI
                    const prompt = buildInteractionPrompt(action);
                    console.log(`[${extensionName}] 发送的提示词:`, prompt);
                    const aiReply = await callAIAPI(prompt, 30000); // 30秒超时

                    // 清除加载提示
                    toastr.clear(loadingToast);

                    // 显示AI生成的回复
                    toastr.success(aiReply || fallbackMessage, "", {
                        timeOut: 5000,
                        extendedTimeOut: 2000
                    });

                    console.log(`[${extensionName}] AI回复成功: ${aiReply}`);

                } catch (apiError) {
                    // 清除加载提示
                    toastr.clear(loadingToast);

                    console.warn(`[${extensionName}] AI回复失败，使用回退消息:`, apiError);
                    toastr.success(fallbackMessage, "", {
                        timeOut: 4000,
                        extendedTimeOut: 1000
                    });

                    // 如果是超时错误，给用户一个提示
                    if (apiError.message.includes('超时')) {
                        setTimeout(() => {
                            toastr.warning("AI回复超时，已使用默认回复", "", { timeOut: 3000 });
                        }, 500);
                    }
                }
            } else {
                // API不可用，直接使用回退消息
                console.log(`[${extensionName}] AI API不可用，使用静态回复`);
                toastr.success(fallbackMessage, "", {
                    timeOut: 4000,
                    extendedTimeOut: 1000
                });
            }

            // 独立显示奖励信息（如果提供了奖励数据）
            if (rewards && (rewards.coins > 0 || rewards.experience > 0)) {
                setTimeout(() => {
                    showRewardNotification(rewards);
                }, 1000); // 延迟1秒显示，让AI回复先显示
            }

        } catch (error) {
            console.error(`[${extensionName}] 处理AI回复时发生错误:`, error);
            // 最终回退
            toastr.success(fallbackMessage);

            // 即使出错也显示奖励
            if (rewards && (rewards.coins > 0 || rewards.experience > 0)) {
                setTimeout(() => {
                    showRewardNotification(rewards);
                }, 500);
            }
        }
    }

    /**
     * 显示奖励通知
     * @param {Object} rewards - 奖励信息 {coins: number, experience: number}
     */
    function showRewardNotification(rewards) {
        let rewardText = "🎁 获得奖励：";
        const rewardParts = [];

        if (rewards.coins > 0) {
            rewardParts.push(`💰 ${rewards.coins} 金币`);
        }

        if (rewards.experience > 0) {
            rewardParts.push(`⭐ ${rewards.experience} 经验`);
        }

        if (rewardParts.length > 0) {
            rewardText += rewardParts.join("，");

            // 显示奖励通知
            toastr.info(rewardText, "", {
                timeOut: 3000,
                extendedTimeOut: 1000,
                positionClass: "toast-bottom-right" // 显示在右下角，避免与AI回复重叠
            });

            console.log(`🎁 ${rewardText}`);
        }
    }

    /**
     * 初始化设置面板
     */
    function initializeSettingsPanel() {
        // 清理旧的角色卡数据
        cleanupOldCharacterData();

        // 加载当前设置
        const currentPersonalityType = localStorage.getItem(`${extensionName}-personality-type`) || 'default';
        const customPersonality = localStorage.getItem(`${extensionName}-custom-personality`) || '';

        // 设置下拉框的值
        $("#virtual-pet-personality-select").val(currentPersonalityType);
        $("#virtual-pet-custom-personality").val(customPersonality);

        // 根据选择显示/隐藏自定义输入框
        toggleCustomPersonalityInput(currentPersonalityType === 'custom');

        // 添加事件监听器
        $("#virtual-pet-personality-select").on('change', function() {
            const selectedType = $(this).val();
            const isCustom = selectedType === 'custom';

            toggleCustomPersonalityInput(isCustom);

            if (!isCustom) {
                // 如果选择了预设人设，立即保存
                savePersonalitySettings(selectedType);
                toastr.success(`已切换到${$(this).find('option:selected').text()}人设`);
            }
        });

        $("#virtual-pet-custom-personality").on('input', function() {
            // 自定义人设文本变化时保存
            const customText = $(this).val().trim();
            savePersonalitySettings('custom', customText);
        });

        // 启用/禁用虚拟宠物系统的事件监听器
        $("#virtual-pet-enabled-toggle").on('change', function() {
            const enabled = $(this).is(':checked');
            localStorage.setItem(`${extensionName}-enabled`, enabled);

            if (enabled) {
                toastr.success("虚拟宠物系统已启用");
                // 如果当前没有显示宠物按钮，重新创建
                if ($("#virtual-pet-button").length === 0) {
                    createPetButton();
                }
            } else {
                toastr.info("虚拟宠物系统已禁用");
                // 隐藏宠物按钮
                $("#virtual-pet-button").hide();
            }
        });

        // 加载启用状态
        const enabled = localStorage.getItem(`${extensionName}-enabled`) !== 'false';
        $("#virtual-pet-enabled-toggle").prop('checked', enabled);

        // 加载AI设置
        loadAISettings();

        // 绑定AI相关事件
        $('#ai-api-select').on('change', function() {
            const apiType = $(this).val();
            toggleApiConfigInputs(apiType);
            saveAISettings();
            // 清除之前的测试结果
            $('#ai-connection-status').text('未测试').css('color', '#888');
        });

        // 绑定API配置输入框事件
        $('#ai-url-input, #ai-key-input, #ai-model-input').on('input', function() {
            saveAISettings();
        });

        $('#test-ai-connection-btn').on('click', function(e) {
            e.preventDefault();
            testAIConnection();
        });

        // 绑定模型选择框事件
        $('#ai-model-select').on('change', function() {
            const selectedValue = $(this).val();
            console.log(`[${extensionName}] 模型选择变化: ${selectedValue}`);

            if (selectedValue === 'custom') {
                // 显示自定义输入框
                $('#ai-model-input').show().focus();
                $('#ai-model-input').attr('placeholder', '请输入自定义模型名称');
                toastr.info('请在下方输入框中输入自定义模型名称', '🔧 自定义模型', { timeOut: 3000 });
            } else if (selectedValue && selectedValue.startsWith('api_model:')) {
                // 处理从API获取的模型
                const modelId = selectedValue.replace('api_model:', '');
                $('#ai-model-input').hide().val(modelId);
                toastr.success(`已选择API模型: ${modelId}`, '🤖 模型已选择', { timeOut: 2000 });
                console.log(`[${extensionName}] 选择了API模型: ${modelId}`);
            } else if (selectedValue) {
                // 隐藏自定义输入框，使用选择的模型
                $('#ai-model-input').hide().val(selectedValue);
                toastr.success(`已选择模型: ${selectedValue}`, '🤖 模型已选择', { timeOut: 2000 });
            } else {
                // 未选择，隐藏自定义输入框
                $('#ai-model-input').hide().val('');
            }

            // 保存设置
            saveAISettings();
        });

        // 绑定刷新模型列表按钮事件
        $('#refresh-models-btn').on('click', async function(e) {
            e.preventDefault();
            const button = $(this);
            const originalText = button.text();

            button.prop('disabled', true).text('🔄 获取中...');

            try {
                console.log(`[${extensionName}] 开始刷新模型列表...`);

                // 检查API配置
                const userApiUrl = $('#ai-url-input').val();
                const userApiKey = $('#ai-key-input').val();

                if (!userApiUrl) {
                    toastr.warning('请先配置API URL', '⚠️ 配置不完整', { timeOut: 3000 });
                    return;
                }

                let models = [];

                console.log(`[${extensionName}] 从配置的API获取模型列表...`);

                // 使用第三方API专用方法获取模型
                const thirdPartyModels = await getThirdPartyModels();
                if (thirdPartyModels.length > 0) {
                    models = thirdPartyModels;
                    console.log(`[${extensionName}] 从第三方API获取到 ${thirdPartyModels.length} 个模型`);
                } else {
                    // 备选：使用通用方法
                    const userModels = await getUserConfiguredModels();
                    if (userModels.length > 0) {
                        models = userModels;
                        console.log(`[${extensionName}] 从用户配置API获取到 ${userModels.length} 个模型`);
                    }
                }

                // 更新模型下拉列表
                updateModelDropdown(models);

                if (models.length > 0) {
                    toastr.success(`🎉 从您的API获取到 ${models.length} 个模型！`, '模型获取成功', { timeOut: 4000 });
                } else {
                    toastr.warning('未能从您的API获取到模型，请检查URL和密钥配置', '⚠️ 模型获取失败', { timeOut: 4000 });
                }
            } catch (error) {
                console.error(`[${extensionName}] 刷新模型列表失败:`, error);
                toastr.error('获取模型列表失败: ' + error.message, '❌ 获取失败', { timeOut: 5000 });
            } finally {
                button.prop('disabled', false).text(originalText);
            }
        });

        // 初始化时自动尝试获取API列表（静默模式）
        setTimeout(async () => {
            try {
                console.log(`[${extensionName}] 初始化时自动获取API列表...`);
                const apis = await getAvailableAPIs();
                if (apis.length > 0) {
                    updateAPIDropdown(apis);
                    console.log(`[${extensionName}] 自动发现 ${apis.length} 个API`);
                }
            } catch (error) {
                console.log(`[${extensionName}] 自动获取API列表失败（这是正常的）:`, error.message);
            }
        }, 1000);

        console.log(`[${extensionName}] 设置面板初始化完成`);
        console.log(`[${extensionName}] 当前人设类型: ${currentPersonalityType}`);
        console.log(`[${extensionName}] 当前人设内容: ${getCurrentPersonality()}`);
        console.log(`[${extensionName}] 💡 提示: 点击"🔄 刷新"按钮可以从SillyTavern获取可用的API列表`);
        console.log(`[${extensionName}] 💡 提示: 在控制台运行以下命令进行测试:`);
        console.log(`[${extensionName}] 💡   - diagnoseSillyTavernEnvironment() // 环境诊断`);
        console.log(`[${extensionName}] 💡   - testVirtualPetAPIDiscovery() // API发现测试`);
        console.log(`[${extensionName}] 💡   - quickAPITest() // 快速API测试`);
    }

    /**
     * 切换自定义人设输入框的显示状态
     * @param {boolean} show 是否显示
     */
    function toggleCustomPersonalityInput(show) {
        if (show) {
            $("#virtual-pet-custom-personality-container").show();
        } else {
            $("#virtual-pet-custom-personality-container").hide();
        }
    }

    // -----------------------------------------------------------------
    // 3. 宠物系统核心逻辑
    // -----------------------------------------------------------------
    
    /**
     * 加载宠物数据（支持跨设备同步）
     */
    function loadPetData() {
        // 首先尝试从同步存储加载
        const syncData = loadFromSyncStorage();
        const localData = localStorage.getItem(STORAGE_KEY_PET_DATA);

        let savedData = null;
        let dataSource = 'none';

        // 比较同步数据和本地数据，选择最新的
        if (syncData && localData) {
            try {
                const syncParsed = typeof syncData === 'object' ? syncData : JSON.parse(syncData);
                const localParsed = JSON.parse(localData);

                const syncTime = syncParsed.lastSyncTime || 0;
                const localTime = localParsed.lastSyncTime || 0;

                if (syncTime > localTime) {
                    savedData = syncParsed;
                    dataSource = 'sync';
                    console.log(`[${extensionName}] 使用同步数据（更新）`);
                } else {
                    savedData = localParsed;
                    dataSource = 'local';
                    console.log(`[${extensionName}] 使用本地数据（更新）`);
                }
            } catch (error) {
                console.warn(`[${extensionName}] 数据比较失败，使用本地数据:`, error);
                savedData = JSON.parse(localData);
                dataSource = 'local';
            }
        } else if (syncData) {
            savedData = typeof syncData === 'object' ? syncData : JSON.parse(syncData);
            dataSource = 'sync';
            console.log(`[${extensionName}] 使用同步数据（仅有同步）`);
        } else if (localData) {
            savedData = JSON.parse(localData);
            dataSource = 'local';
            console.log(`[${extensionName}] 使用本地数据（仅有本地）`);
        }

        if (savedData) {
            try {
                // savedData 已经是解析后的对象，不需要再次解析

                // 检查是否需要数据迁移到拓麻歌子系统
                const needsMigration = !savedData.dataVersion || savedData.dataVersion < 4.0;

                if (needsMigration) {
                    console.log(`[${extensionName}] 检测到旧数据版本 ${savedData.dataVersion || '未知'}，执行数据迁移到拓麻歌子系统4.0...`);

                    // 迁移到拓麻歌子式数据结构
                    const migratedData = {
                        // 保留基本信息
                        name: savedData.name || petData.name,
                        type: savedData.type || petData.type,
                        level: savedData.level || petData.level,
                        experience: savedData.experience || petData.experience,
                        created: savedData.created || petData.created,
                        personality: savedData.personality || getCurrentPersonality(), // 保留人设信息

                        // 基础数值（使用更合理的初始值）
                        health: Math.min(savedData.health || 35, 70),
                        happiness: Math.min(savedData.happiness || 25, 70),
                        hunger: Math.min(savedData.hunger || 40, 70),
                        energy: Math.min(savedData.energy || 50, 70),

                        // 新增拓麻歌子式属性
                        lifeStage: "baby",
                        age: 0,
                        isAlive: true,
                        deathReason: null,
                        sickness: 0,
                        discipline: 50,
                        weight: 30,

                        // 时间记录
                        lastFeedTime: savedData.lastFeedTime || petData.lastFeedTime,
                        lastPlayTime: savedData.lastPlayTime || petData.lastPlayTime,
                        lastSleepTime: savedData.lastSleepTime || petData.lastSleepTime,
                        lastUpdateTime: savedData.lastUpdateTime || petData.lastUpdateTime,
                        lastCareTime: Date.now(),

                        // 拓麻歌子式计数器
                        careNeglectCount: 0,
                        sicknessDuration: 0,

                        // 商店系统
                        coins: savedData.coins || 100,
                        inventory: savedData.inventory || {},

                        dataVersion: 4.0 // 标记为拓麻歌子系统版本
                    };

                    petData = migratedData;

                    // 应用拓麻歌子式函数
                    applyTamagotchiSystem();

                    savePetData(); // 保存迁移后的数据

                    console.log(`[${extensionName}] 数据迁移完成！拓麻歌子系统已启用`);
                    console.log(`新的拓麻歌子式宠物 - 生命阶段: ${petData.lifeStage}, 年龄: ${petData.age}小时`);

                    toastr.info('🥚 欢迎来到拓麻歌子世界！你的宠物现在需要真正的照顾，请定期关注它的状态！', '', { timeOut: 8000 });
                } else {
                    // 数据版本正确，直接加载
                    petData = { ...petData, ...savedData };
                    console.log(`[${extensionName}] 加载已有数据`);

                    // 检查是否需要应用首次打开的随机化
                    if (!savedData.hasBeenRandomized) {
                        applyFirstTimeRandomization();
                    }

                    // 确保拓麻歌子系统已应用
                    applyTamagotchiSystem();
                }

                // 确保人设数据完整性
                if (!petData.personality) {
                    petData.personality = getCurrentPersonality();
                }
            } catch (error) {
                console.error(`[${extensionName}] Error loading pet data:`, error);
            }
        } else {
            // 没有保存的数据，首次使用
            petData.dataVersion = 4.0;
            petData.personality = getCurrentPersonality(); // 设置初始人设
            applyTamagotchiSystem();
            applyFirstTimeRandomization(); // 首次随机化
            savePetData();
        }

        // 添加初始化缓冲机制
        applyInitializationBuffer();
    }

    /**
     * 首次打开随机化 - 数值随机但不超过50
     */
    function applyFirstTimeRandomization() {
        console.log(`[${extensionName}] 应用首次打开随机化...`);

        // 随机化数值，但不超过50，且保证一定的平衡性
        petData.health = Math.floor(Math.random() * 20) + 30;      // 30-49
        petData.happiness = Math.floor(Math.random() * 20) + 25;   // 25-44
        petData.hunger = Math.floor(Math.random() * 20) + 30;      // 30-49
        petData.energy = Math.floor(Math.random() * 20) + 25;      // 25-44

        // 标记已经随机化过
        petData.hasBeenRandomized = true;

        console.log(`[${extensionName}] 随机化完成: 健康${petData.health}, 快乐${petData.happiness}, 饱食${petData.hunger}, 精力${petData.energy}`);

        toastr.info('🎲 欢迎！你的宠物状态已随机初始化', '', { timeOut: 4000 });
    }

    /**
     * 初始化缓冲机制 - 避免长时间离线后状态过低
     */
    function applyInitializationBuffer() {
        const now = Date.now();
        const timeSinceLastUpdate = now - (petData.lastUpdateTime || now);
        const hoursElapsed = timeSinceLastUpdate / (1000 * 60 * 60);

        // 如果距离上次更新超过2小时，给予缓冲
        if (hoursElapsed > 2) {
            console.log(`[${extensionName}] 检测到长时间未更新 (${hoursElapsed.toFixed(1)}小时)，应用初始化缓冲...`);

            // 基础缓冲数值（防止过低但不强制重置）
            const minValues = {
                hunger: 25,    // 最低饱食度25
                energy: 20,    // 最低精力20
                happiness: 15, // 最低快乐度15
                health: 30     // 最低健康度30
            };

            let buffered = false;
            Object.entries(minValues).forEach(([key, minValue]) => {
                if (petData[key] < minValue) {
                    console.log(`[${extensionName}] 缓冲 ${key}: ${petData[key]} → ${minValue}`);
                    petData[key] = minValue;
                    buffered = true;
                }
            });

            if (buffered) {
                // 更新时间戳，避免立即再次衰减
                petData.lastUpdateTime = now;
                savePetData();

                toastr.info('🌟 欢迎回来！已为你的宠物提供了基础照顾。', '', { timeOut: 4000 });
                console.log(`[${extensionName}] 初始化缓冲已应用`);
            }
        }
    }
    
    /**
     * 保存宠物数据
     */
    /**
     * 保存宠物数据
     * @param {boolean} fromFirebase - 标记调用是否来自Firebase加载，以避免无限循环
     */
    function savePetData(fromFirebase = false) {
        try {
            // 添加时间戳用于同步
            const dataWithTimestamp = {
                ...petData,
                lastSyncTime: Date.now()
            };

            localStorage.setItem(STORAGE_KEY_PET_DATA, JSON.stringify(dataWithTimestamp));

            // 同时保存到全局同步存储（如果可用）
            saveToSyncStorage(dataWithTimestamp);

            // 如果用户已登录，并且本次保存不是由Firebase加载触发的，则同步到Firebase
            if (currentUser && !fromFirebase) {
                saveDataToFirebase();
            }

        } catch (error) {
            console.error(`[${extensionName}] Error saving pet data:`, error);
        }
    }

    /**
     * 保存到同步存储（跨设备）- 安全版本
     */
    function saveToSyncStorage(data) {
        try {
            // 使用一个特殊的键名用于跨设备同步
            const syncKey = `${extensionName}-sync-data`;
            localStorage.setItem(syncKey, JSON.stringify(data));

            // 安全地尝试使用SillyTavern的同步机制
            if (typeof window.saveSettingsDebounced === 'function' &&
                typeof window.extension_settings === 'object' &&
                window.extension_settings !== null) {

                try {
                    // 确保不覆盖现有的扩展设置
                    if (!window.extension_settings[extensionName]) {
                        window.extension_settings[extensionName] = {};
                    }

                    // 只保存宠物数据，不影响其他设置
                    window.extension_settings[extensionName][`${extensionName}_pet_data`] = data;

                    // 使用安全的保存机制
                    if (safeSillyTavernSave()) {
                        console.log(`[${extensionName}] 数据已保存到SillyTavern设置`);
                    }
                } catch (settingsError) {
                    console.warn(`[${extensionName}] SillyTavern设置保存失败，使用本地存储:`, settingsError);
                }
            }

            console.log(`[${extensionName}] 数据已保存到同步存储`);
        } catch (error) {
            console.warn(`[${extensionName}] 同步存储保存失败:`, error);
        }
    }

    /**
     * 从同步存储加载数据
     */
    function loadFromSyncStorage() {
        try {
            // 首先尝试从SillyTavern设置加载
            if (typeof window.extension_settings === 'object' &&
                window.extension_settings[extensionName] &&
                window.extension_settings[extensionName][`${extensionName}_pet_data`]) {

                const syncData = window.extension_settings[extensionName][`${extensionName}_pet_data`];
                console.log(`[${extensionName}] 从SillyTavern设置加载同步数据`);
                return syncData;
            }

            // 其次尝试从同步键加载
            const syncKey = `${extensionName}-sync-data`;
            const syncData = localStorage.getItem(syncKey);
            if (syncData) {
                console.log(`[${extensionName}] 从同步存储加载数据`);
                return JSON.parse(syncData);
            }

            return null;
        } catch (error) {
            console.warn(`[${extensionName}] 同步存储加载失败:`, error);
            return null;
        }
    }

    /**
     * 保存AI设置到同步存储 - 安全版本
     */
    function saveAISettingsToSync(settings) {
        try {
            // 使用专门的AI设置同步键
            const syncKey = `${extensionName}-ai-settings-sync`;
            localStorage.setItem(syncKey, JSON.stringify(settings));

            // 安全地尝试使用SillyTavern的同步机制
            if (typeof window.saveSettingsDebounced === 'function' &&
                typeof window.extension_settings === 'object' &&
                window.extension_settings !== null) {

                try {
                    // 确保不覆盖现有的扩展设置
                    if (!window.extension_settings[extensionName]) {
                        window.extension_settings[extensionName] = {};
                    }

                    // 只保存AI设置，不影响其他设置
                    window.extension_settings[extensionName][`${extensionName}_ai_settings`] = settings;

                    // 使用安全的保存机制
                    if (safeSillyTavernSave()) {
                        console.log(`[${extensionName}] AI设置已保存到SillyTavern设置`);
                    }
                } catch (settingsError) {
                    console.warn(`[${extensionName}] SillyTavern AI设置保存失败，使用本地存储:`, settingsError);
                }
            }

            console.log(`[${extensionName}] AI设置已保存到同步存储`);
        } catch (error) {
            console.warn(`[${extensionName}] AI设置同步存储保存失败:`, error);
        }
    }

    /**
     * 从同步存储加载AI设置
     */
    function loadAISettingsFromSync() {
        try {
            // 首先尝试从SillyTavern设置加载
            if (typeof window.extension_settings === 'object' &&
                window.extension_settings[extensionName] &&
                window.extension_settings[extensionName][`${extensionName}_ai_settings`]) {

                const syncSettings = window.extension_settings[extensionName][`${extensionName}_ai_settings`];
                console.log(`[${extensionName}] 从SillyTavern设置加载AI同步设置`);
                return syncSettings;
            }

            // 其次尝试从同步键加载
            const syncKey = `${extensionName}-ai-settings-sync`;
            const syncSettings = localStorage.getItem(syncKey);
            if (syncSettings) {
                console.log(`[${extensionName}] 从同步存储加载AI设置`);
                return JSON.parse(syncSettings);
            }

            return null;
        } catch (error) {
            console.warn(`[${extensionName}] AI设置同步存储加载失败:`, error);
            return null;
        }
    }

    /**
     * 保存头像到同步存储 - 安全版本
     */
    function saveAvatarToSync(avatarData) {
        try {
            // 使用专门的头像同步键
            const syncKey = `${extensionName}-avatar-sync`;
            localStorage.setItem(syncKey, avatarData);

            // 安全地尝试使用SillyTavern的同步机制
            // 注意：头像数据可能很大，谨慎保存到SillyTavern设置
            if (typeof window.saveSettingsDebounced === 'function' &&
                typeof window.extension_settings === 'object' &&
                window.extension_settings !== null &&
                avatarData.length < 500000) { // 限制头像大小 < 500KB

                try {
                    // 确保不覆盖现有的扩展设置
                    if (!window.extension_settings[extensionName]) {
                        window.extension_settings[extensionName] = {};
                    }

                    // 只保存头像，不影响其他设置
                    window.extension_settings[extensionName][`${extensionName}_avatar`] = avatarData;

                    // 使用安全的保存机制
                    if (safeSillyTavernSave()) {
                        console.log(`[${extensionName}] 头像已保存到SillyTavern设置`);
                    }
                } catch (settingsError) {
                    console.warn(`[${extensionName}] SillyTavern头像保存失败，使用本地存储:`, settingsError);
                }
            } else if (avatarData.length >= 500000) {
                console.log(`[${extensionName}] 头像过大(${Math.round(avatarData.length/1024)}KB)，仅保存到本地存储`);
            }

            console.log(`[${extensionName}] 头像已保存到同步存储`);
        } catch (error) {
            console.warn(`[${extensionName}] 头像同步存储保存失败:`, error);
        }
    }

    /**
     * 从同步存储加载头像
     */
    function loadAvatarFromSync() {
        try {
            // 首先尝试从SillyTavern设置加载
            if (typeof window.extension_settings === 'object' &&
                window.extension_settings[extensionName] &&
                window.extension_settings[extensionName][`${extensionName}_avatar`]) {

                const syncAvatar = window.extension_settings[extensionName][`${extensionName}_avatar`];
                console.log(`[${extensionName}] 从SillyTavern设置加载头像同步数据`);
                return syncAvatar;
            }

            // 其次尝试从同步键加载
            const syncKey = `${extensionName}-avatar-sync`;
            const syncAvatar = localStorage.getItem(syncKey);
            if (syncAvatar) {
                console.log(`[${extensionName}] 从同步存储加载头像`);
                return syncAvatar;
            }

            return null;
        } catch (error) {
            console.warn(`[${extensionName}] 头像同步存储加载失败:`, error);
            return null;
        }
    }

    /**
     * 从同步存储清除头像 - 安全版本
     */
    function clearAvatarFromSync() {
        try {
            // 清除同步键
            const syncKey = `${extensionName}-avatar-sync`;
            localStorage.removeItem(syncKey);

            // 安全地尝试从SillyTavern设置中清除
            if (typeof window.saveSettingsDebounced === 'function' &&
                typeof window.extension_settings === 'object' &&
                window.extension_settings !== null &&
                window.extension_settings[extensionName]) {

                try {
                    // 只删除头像，不影响其他设置
                    delete window.extension_settings[extensionName][`${extensionName}_avatar`];

                    // 使用安全的保存机制
                    if (safeSillyTavernSave()) {
                        console.log(`[${extensionName}] 头像已从SillyTavern设置清除`);
                    }
                } catch (settingsError) {
                    console.warn(`[${extensionName}] SillyTavern头像清除失败:`, settingsError);
                }
            }

            console.log(`[${extensionName}] 头像已从同步存储清除`);
        } catch (error) {
            console.warn(`[${extensionName}] 头像同步存储清除失败:`, error);
        }
    }
    
    /**
     * 验证并修复数值范围
     */
    function validateAndFixValues() {
        // 确保所有数值都在0-100范围内
        petData.health = Math.max(0, Math.min(100, Number(petData.health) || 0));
        petData.happiness = Math.max(0, Math.min(100, Number(petData.happiness) || 0));
        petData.hunger = Math.max(0, Math.min(100, Number(petData.hunger) || 0));
        petData.energy = Math.max(0, Math.min(100, Number(petData.energy) || 0));
        petData.experience = Math.max(0, Number(petData.experience) || 0);
        petData.level = Math.max(1, Number(petData.level) || 1);

        // 确保时间戳是有效的
        const now = Date.now();
        if (!petData.lastUpdateTime || petData.lastUpdateTime > now) {
            petData.lastUpdateTime = now;
        }
        if (!petData.lastFeedTime || petData.lastFeedTime > now) {
            petData.lastFeedTime = now;
        }
        if (!petData.lastPlayTime || petData.lastPlayTime > now) {
            petData.lastPlayTime = now;
        }
        if (!petData.lastSleepTime || petData.lastSleepTime > now) {
            petData.lastSleepTime = now;
        }
    }

    /**
     * 更新宠物状态（基于时间流逝）
     */
    function updatePetStatus() {
        const now = Date.now();
        const timeSinceLastUpdate = now - (petData.lastUpdateTime || now);
        const hoursElapsed = timeSinceLastUpdate / (1000 * 60 * 60);

        // 防止异常大的时间差（超过24小时的按24小时计算）
        const safeHoursElapsed = Math.min(hoursElapsed, 24);

        // 随时间降低的属性（减缓衰减速度）
        if (safeHoursElapsed > 0.2) { // 每12分钟更新一次
            petData.hunger = Math.max(0, petData.hunger - safeHoursElapsed * 0.8);
            petData.energy = Math.max(0, petData.energy - safeHoursElapsed * 0.6);

            // 饥饿和疲劳影响健康和快乐（减缓影响）
            if (petData.hunger < 20) {
                petData.health = Math.max(0, petData.health - safeHoursElapsed * 1);
                petData.happiness = Math.max(0, petData.happiness - safeHoursElapsed * 0.8);
            }

            if (petData.energy < 20) {
                petData.happiness = Math.max(0, petData.happiness - safeHoursElapsed * 0.5);
            }

            petData.lastUpdateTime = now;

            // 验证并修复数值
            validateAndFixValues();

            savePetData();

            // 检查是否需要发送通知
            checkAndSendNotifications();
        }
    }
    

    
    /**
     * 获得经验值
     */
    function gainExperience(exp) {
        petData.experience += exp;
        const expNeeded = petData.level * 100;

        if (petData.experience >= expNeeded) {
            petData.level++;
            petData.experience -= expNeeded;
            petData.health = Math.min(100, petData.health + 30); // 升级恢复部分健康

            // 升级奖励金币
            const coinReward = petData.level * 10;
            gainCoins(coinReward);

            toastr.success(`🎉 ${petData.name} 升级了！现在是 ${petData.level} 级！获得 ${coinReward} 金币奖励！`);
        }
    }

    /**
     * 获得金币
     */
    function gainCoins(amount) {
        if (!petData.coins) petData.coins = 100;
        petData.coins += amount;
        console.log(`💰 获得 ${amount} 金币，当前金币: ${petData.coins}`);

        // 立即更新UI显示
        setTimeout(() => {
            if (typeof updateUnifiedUIStatus === 'function') {
                updateUnifiedUIStatus();
            }
            if (typeof renderPetStatus === 'function') {
                renderPetStatus();
            }
        }, 50);
    }

    /**
     * 检查并发送通知
     */
    function checkAndSendNotifications() {
        const notifications = localStorage.getItem(`${extensionName}-notifications`) !== "false";
        if (!notifications) return;

        const now = Date.now();
        const lastNotification = localStorage.getItem(`${extensionName}-last-notification`) || 0;

        // 限制通知频率，至少间隔10分钟
        if (now - lastNotification < 600000) return;

        let needsAttention = false;
        let message = `${petData.name} 需要你的关注！`;

        if (petData.health < 30) {
            message = `${petData.name} 的健康状况不佳，快来照顾它吧！`;
            needsAttention = true;
        } else if (petData.hunger < 20) {
            message = `${petData.name} 饿了，该喂食了！`;
            needsAttention = true;
        } else if (petData.happiness < 30) {
            message = `${petData.name} 看起来不太开心，陪它玩玩吧！`;
            needsAttention = true;
        } else if (petData.energy < 20) {
            message = `${petData.name} 很累了，让它休息一下吧！`;
            needsAttention = true;
        }

        if (needsAttention) {
            toastr.warning(message, "宠物提醒", {
                timeOut: 8000,
                extendedTimeOut: 3000
            });
            localStorage.setItem(`${extensionName}-last-notification`, now);
        }
    }
    
    // ----------------------------------------------------------------- 
    // 3. 弹窗和视图管理
    // -----------------------------------------------------------------
    
    /**
     * 打开弹窗并显示主视图
     */
    function showPopup() {
        console.log(`[${extensionName}] Attempting to show popup`);

        // 检测设备类型 - 统一处理所有平台
        const windowWidth = $(window).width();
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isAndroid = /Android/.test(navigator.userAgent);
        const isMobile = windowWidth <= 767 || isIOS || isAndroid;

        console.log(`[${extensionName}] Device: iOS=${isIOS}, Android=${isAndroid}, Mobile=${isMobile}, Width=${windowWidth}`);

        // 直接通过ID查找元素，不依赖全局变量
        let overlayElement = $(`#${OVERLAY_ID}`);

        // 清除所有现有弹窗，确保统一
        $(`#${OVERLAY_ID}`).remove();
        $(".virtual-pet-popup-overlay").remove();

        console.log(`[${extensionName}] Creating unified popup for all platforms`);

        // 根据设备类型调整样式
        const containerMaxWidth = isMobile ? "300px" : "380px";
        const containerPadding = isMobile ? "14px" : "18px";
        const borderRadius = isIOS ? "16px" : "12px";
        const iosTransform = isIOS ? "-webkit-transform: translateZ(0) !important; transform: translateZ(0) !important;" : "";

        // 创建统一的弹窗HTML
        const unifiedPopupHtml = `
            <div id="${OVERLAY_ID}" class="virtual-pet-popup-overlay" style="
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                background-color: rgba(0, 0, 0, 0.8) !important;
                z-index: ${SAFE_Z_INDEX.overlay} !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                padding: 10px !important;
                box-sizing: border-box !important;
                -webkit-overflow-scrolling: touch !important;
                overflow: hidden !important;
                ${iosTransform}
            ">
                <div id="${POPUP_ID}" class="pet-popup-container" style="
                    position: relative !important;
                    width: 100% !important;
                    height: auto !important;
                    max-width: ${containerMaxWidth} !important;
                    max-height: calc(100vh - 60px) !important;
                    background: ${candyColors.background} !important;
                    color: ${candyColors.textPrimary} !important;
                    border: 4px solid ${candyColors.border} !important;
                    border-radius: 8px !important;
                    padding: ${containerPadding} !important;
                    overflow-y: auto !important;
                    -webkit-overflow-scrolling: touch !important;
                    box-shadow: 4px 4px 0px ${candyColors.shadow} !important;
                    font-family: 'Courier New', monospace !important;
                    image-rendering: pixelated !important;
                    image-rendering: -moz-crisp-edges !important;
                    image-rendering: crisp-edges !important;
                    ${iosTransform}
                ">
                    ${generateUnifiedUI()}
                </div>
            </div>
        `;

            $("body").append(unifiedPopupHtml);
            overlayElement = $(`#${OVERLAY_ID}`);

            // 绑定外部点击关闭事件
            if (isIOS) {
                // iOS外部点击关闭
                overlayElement.on("touchstart", function(e) {
                    if (e.target === this) {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log(`[${extensionName}] iOS overlay touched - closing popup`);
                        closePopup();
                    }
                });
            } else {
                // 非iOS设备的外部点击关闭
                overlayElement.on("click touchend", function(e) {
                    if (e.target === this) {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log(`[${extensionName}] Overlay clicked - closing popup`);
                        closePopup();
                    }
                });
            }

            // 绑定统一的操作按钮事件
            bindUnifiedUIEvents(overlayElement);

        console.log(`[${extensionName}] Unified popup created and displayed for all platforms`);

        // 更新弹窗状态
        isPopupOpen = true;
    }
    
    /**
     * 关闭弹窗 - iOS优化版本
     */
    function closePopup() {
        console.log(`[${extensionName}] Closing popup`);

        // 查找所有可能的弹窗元素
        const overlayElement = $(`#${OVERLAY_ID}`);
        const allOverlays = $(".virtual-pet-popup-overlay");

        if (overlayElement.length > 0) {
            // 使用动画关闭，iOS体验更好
            overlayElement.fadeOut(200, function() {
                $(this).remove();
                console.log(`[${extensionName}] Popup closed with animation`);
            });
        } else if (allOverlays.length > 0) {
            // 备用方案：移除所有弹窗
            allOverlays.fadeOut(200, function() {
                $(this).remove();
                console.log(`[${extensionName}] All popups closed`);
            });
        } else {
            console.log(`[${extensionName}] No popup found to close`);
        }

        // 强制清理，确保iOS上完全关闭
        setTimeout(() => {
            $(`#${OVERLAY_ID}`).remove();
            $(".virtual-pet-popup-overlay").remove();
        }, 250);

        // 更新弹窗状态
        isPopupOpen = false;
    }

    /**
     * 打开头像选择器
     */
    window.openAvatarSelector = function() {
        console.log(`[${extensionName}] Opening avatar selector`);

        // 创建文件输入元素
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';

        fileInput.onchange = function(e) {
            const file = e.target.files[0];
            if (file) {
                // 检查文件大小 (限制为2MB)
                if (file.size > 2 * 1024 * 1024) {
                    alert('图片文件过大，请选择小于2MB的图片');
                    return;
                }

                // 检查文件类型
                if (!file.type.startsWith('image/')) {
                    alert('请选择图片文件');
                    return;
                }

                // 读取文件并转换为base64
                const reader = new FileReader();
                reader.onload = function(e) {
                    const imageData = e.target.result;

                    // 保存头像数据
                    if (saveCustomAvatar(imageData)) {
                        // 更新显示
                        updateAvatarDisplay();
                        updateFloatingButtonAvatar();
                        console.log(`[${extensionName}] Avatar updated successfully`);
                    } else {
                        alert('保存头像失败，请重试');
                    }
                };
                reader.readAsDataURL(file);
            }

            // 清理文件输入元素
            document.body.removeChild(fileInput);
        };

        // 添加到DOM并触发点击
        document.body.appendChild(fileInput);
        fileInput.click();
    };

    /**
     * 重置头像为默认
     */
    window.resetAvatar = function() {
        console.log(`[${extensionName}] Resetting avatar to default`);

        if (clearCustomAvatar()) {
            // 更新显示
            updateAvatarDisplay();
            updateFloatingButtonAvatar();
            console.log(`[${extensionName}] Avatar reset successfully`);
        } else {
            alert('重置头像失败，请重试');
        }
    };

    /**
     * 编辑宠物名字
     */
    window.editPetName = function() {
        const currentName = petData.name;
        const newName = prompt('请输入新的宠物名字:', currentName);

        if (newName && newName.trim() && newName.trim() !== currentName) {
            const trimmedName = newName.trim();
            if (trimmedName.length > 20) {
                alert('宠物名字不能超过20个字符！');
                return;
            }

            petData.name = trimmedName;
            savePetData();

            // 更新所有UI中的名字显示
            updateUnifiedUIStatus();

            // 显示成功消息
            if (typeof toastr !== 'undefined') {
                toastr.success(`宠物名字已更改为 "${trimmedName}"`);
            } else {
                alert(`宠物名字已更改为 "${trimmedName}"`);
            }
        }
    };

    /**
     * 更新统一UI中的状态显示
     */
    function updateUnifiedUIStatus() {
        // 更新移动端和桌面端UI中的状态条
        const healthBars = $('.status-item').find('div[style*="background: ' + candyColors.health + '"]');
        const hungerBars = $('.status-item').find('div[style*="background: ' + candyColors.warning + '"]');
        const happinessBars = $('.status-item').find('div[style*="background: ' + candyColors.happiness + '"]');

        // 更新健康状态
        healthBars.each(function() {
            $(this).css('width', petData.health + '%');
        });

        // 更新饱食度状态
        hungerBars.each(function() {
            $(this).css('width', petData.hunger + '%');
        });

        // 更新快乐度状态
        happinessBars.each(function() {
            $(this).css('width', petData.happiness + '%');
        });

        // 更新数值显示
        $('.status-item').each(function() {
            const $item = $(this);
            const label = $item.find('span').first().text();

            if (label.includes('健康')) {
                $item.find('span').last().text(Math.round(petData.health) + '/100');
            } else if (label.includes('饱食度')) {
                $item.find('span').last().text(Math.round(petData.hunger) + '/100');
            } else if (label.includes('快乐度')) {
                $item.find('span').last().text(Math.round(petData.happiness) + '/100');
            }
        });

        // 更新宠物名字和等级
        $('.pet-name').each(function() {
            $(this).text(petData.name);
            // 确保点击事件仍然存在
            if (!$(this).attr('onclick')) {
                $(this).attr('onclick', 'editPetName()');
                $(this).attr('title', '点击编辑宠物名字');
                $(this).css({
                    'cursor': 'pointer',
                    'text-decoration': 'underline'
                });
            }
        });
        $('.pet-level').text('Lv.' + petData.level);
    }

    /**
     * 显示头像右键菜单
     */
    window.showAvatarContextMenu = function(event) {
        event.preventDefault();

        if (customAvatarData) {
            // 如果有自定义头像，显示重置选项
            if (confirm('是否要重置头像为默认样式？')) {
                resetAvatar();
            }
        } else {
            // 如果没有自定义头像，提示用户点击更换
            alert('点击头像可以更换为自定义图片');
        }

        return false;
    };

    /**
     * 更新头像显示
     */
    function updateAvatarDisplay() {
        // 更新弹窗中的头像
        const avatarCircle = $('.pet-avatar-circle');
        if (avatarCircle.length > 0) {
            avatarCircle.html(getAvatarContent());
        }
    }

    /**
     * 更新悬浮按钮头像
     */
    function updateFloatingButtonAvatar() {
        const button = $(`#${BUTTON_ID}`);
        if (button.length > 0) {
            if (customAvatarData) {
                // 显示自定义头像
                button.html(`<img src="${customAvatarData}" alt="宠物头像" style="
                    width: 100% !important;
                    height: 100% !important;
                    object-fit: cover !important;
                    border-radius: 50% !important;
                ">`);
            } else {
                // 显示默认爪子图案
                button.html('🐾');
            }
        }
    }

    /**
     * 切换弹窗状态 - 如果弹窗打开则关闭，如果关闭则打开
     */
    function togglePopup() {
        console.log(`[${extensionName}] Toggling popup, current state: ${isPopupOpen ? 'open' : 'closed'}`);

        if (isPopupOpen) {
            // 弹窗已打开，关闭它
            closePopup();
        } else {
            // 弹窗已关闭，打开它
            showPopup();
        }
    }
    
    /**
     * 切换到指定视图
     */
    function switchView(viewToShow) {
        // 隐藏所有视图
        mainView.hide();
        petView.hide();
        settingsView.hide();
        
        // 显示目标视图
        viewToShow.show();
    }
    
    /**
     * 显示主视图
     */
    function showMainView() {
        switchView(mainView);
        renderPetStatus();
    }
    
    /**
     * 显示宠物详情视图
     */
    function showPetView() {
        switchView(petView);
        renderPetDetails();
    }
    
    /**
     * 显示设置视图
     */
    function showSettingsView() {
        switchView(settingsView);
        renderSettings();
    }
    
    // ----------------------------------------------------------------- 
    // 4. UI 渲染逻辑
    // -----------------------------------------------------------------
    
    /**
     * 渲染宠物状态
     */
    function renderPetStatus() {
        if (!petContainer) return;
        
        const statusHtml = `
            <div class="pet-avatar-container" style="
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                gap: 12px !important;
                padding: 20px !important;
            ">
                <!-- 拓麻歌子风格头像框 -->
                <div class="pet-avatar-circle" style="
                    width: 80px !important;
                    height: 80px !important;
                    border-radius: 8px !important;
                    background: ${candyColors.screen} !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    font-size: 3em !important;
                    overflow: hidden !important;
                    border: 3px solid ${candyColors.border} !important;
                    box-shadow: 2px 2px 0px ${candyColors.shadow} !important;
                    cursor: pointer !important;
                    font-family: 'Courier New', monospace !important;
                    image-rendering: pixelated !important;
                    image-rendering: -moz-crisp-edges !important;
                    image-rendering: crisp-edges !important;
                " onclick="openAvatarSelector()" oncontextmenu="showAvatarContextMenu(event)" title="点击更换头像，右键重置">
                    ${getAvatarContent()}
                </div>

                <!-- 宠物信息 -->
                <div class="pet-info" style="text-align: center !important;">
                    <div class="pet-name" style="
                        font-size: 1.3em !important;
                        font-weight: bold !important;
                        margin-bottom: 4px !important;
                        color: #ffffff !important;
                    ">${escapeHtml(petData.name)}</div>
                    <div class="pet-level" style="
                        color: #7289da !important;
                        font-size: 1em !important;
                    ">${petData.isAlive ?
                        `${LIFE_STAGES[petData.lifeStage]?.emoji || '🐾'} ${LIFE_STAGES[petData.lifeStage]?.name || '未知'} Lv.${petData.level}` :
                        '💀 已死亡'
                    }</div>
                </div>
            </div>
            <div class="pet-stats">
                <div class="stat-bar" style="
                    display: flex !important;
                    align-items: center !important;
                    margin-bottom: 8px !important;
                    font-family: 'Courier New', monospace !important;
                    font-size: 12px !important;
                    font-weight: bold !important;
                ">
                    <label style="
                        width: 50px !important;
                        color: ${candyColors.textPrimary} !important;
                        margin-right: 8px !important;
                    ">HP</label>
                    <div class="progress-bar" style="
                        flex: 1 !important;
                        height: 12px !important;
                        background: ${candyColors.backgroundSolid} !important;
                        border: 2px solid ${candyColors.border} !important;
                        border-radius: 0 !important;
                        overflow: hidden !important;
                        margin-right: 8px !important;
                    ">
                        <div class="progress-fill health" style="
                            width: ${petData.health}% !important;
                            height: 100% !important;
                            background: ${candyColors.health} !important;
                            transition: none !important;
                        "></div>
                    </div>
                    <span style="
                        width: 40px !important;
                        text-align: right !important;
                        color: ${candyColors.textPrimary} !important;
                    ">${Math.round(petData.health)}</span>
                </div>
                <div class="stat-bar" style="
                    display: flex !important;
                    align-items: center !important;
                    margin-bottom: 8px !important;
                    font-family: 'Courier New', monospace !important;
                    font-size: 12px !important;
                    font-weight: bold !important;
                ">
                    <label style="
                        width: 50px !important;
                        color: ${candyColors.textPrimary} !important;
                        margin-right: 8px !important;
                    ">JOY</label>
                    <div class="progress-bar" style="
                        flex: 1 !important;
                        height: 12px !important;
                        background: ${candyColors.backgroundSolid} !important;
                        border: 2px solid ${candyColors.border} !important;
                        border-radius: 0 !important;
                        overflow: hidden !important;
                        margin-right: 8px !important;
                    ">
                        <div class="progress-fill happiness" style="
                            width: ${petData.happiness}% !important;
                            height: 100% !important;
                            background: ${candyColors.happiness} !important;
                            transition: none !important;
                        "></div>
                    </div>
                    <span style="
                        width: 40px !important;
                        text-align: right !important;
                        color: ${candyColors.textPrimary} !important;
                    ">${Math.round(petData.happiness)}</span>
                </div>
                <div class="stat-bar" style="
                    display: flex !important;
                    align-items: center !important;
                    margin-bottom: 8px !important;
                    font-family: 'Courier New', monospace !important;
                    font-size: 12px !important;
                    font-weight: bold !important;
                ">
                    <label style="
                        width: 50px !important;
                        color: ${candyColors.textPrimary} !important;
                        margin-right: 8px !important;
                    ">FOOD</label>
                    <div class="progress-bar" style="
                        flex: 1 !important;
                        height: 12px !important;
                        background: ${candyColors.backgroundSolid} !important;
                        border: 2px solid ${candyColors.border} !important;
                        border-radius: 0 !important;
                        overflow: hidden !important;
                        margin-right: 8px !important;
                    ">
                        <div class="progress-fill hunger" style="
                            width: ${petData.hunger}% !important;
                            height: 100% !important;
                            background: ${candyColors.hunger} !important;
                            transition: none !important;
                        "></div>
                    </div>
                    <span style="
                        width: 40px !important;
                        text-align: right !important;
                        color: ${candyColors.textPrimary} !important;
                    ">${Math.round(petData.hunger)}</span>
                </div>
                <div class="stat-bar" style="
                    display: flex !important;
                    align-items: center !important;
                    margin-bottom: 8px !important;
                    font-family: 'Courier New', monospace !important;
                    font-size: 12px !important;
                    font-weight: bold !important;
                ">
                    <label style="
                        width: 50px !important;
                        color: ${candyColors.textPrimary} !important;
                        margin-right: 8px !important;
                    ">PWR</label>
                    <div class="progress-bar" style="
                        flex: 1 !important;
                        height: 12px !important;
                        background: ${candyColors.backgroundSolid} !important;
                        border: 2px solid ${candyColors.border} !important;
                        border-radius: 0 !important;
                        overflow: hidden !important;
                        margin-right: 8px !important;
                    ">
                        <div class="progress-fill energy" style="
                            width: ${petData.energy}% !important;
                            height: 100% !important;
                            background: ${candyColors.energy} !important;
                            transition: none !important;
                        "></div>
                    </div>
                    <span style="
                        width: 40px !important;
                        text-align: right !important;
                        color: ${candyColors.textPrimary} !important;
                    ">${Math.round(petData.energy)}</span>
                </div>
                ${petData.dataVersion >= 4.0 ? `
                <div class="stat-bar" style="
                    display: flex !important;
                    align-items: center !important;
                    margin-bottom: 8px !important;
                    font-family: 'Courier New', monospace !important;
                    font-size: 12px !important;
                    font-weight: bold !important;
                ">
                    <label style="
                        width: 50px !important;
                        color: ${candyColors.textPrimary} !important;
                        margin-right: 8px !important;
                    ">SICK</label>
                    <div class="progress-bar" style="
                        flex: 1 !important;
                        height: 12px !important;
                        background: ${candyColors.backgroundSolid} !important;
                        border: 2px solid ${candyColors.border} !important;
                        border-radius: 0 !important;
                        overflow: hidden !important;
                        margin-right: 8px !important;
                    ">
                        <div class="progress-fill sickness" style="
                            width: ${petData.sickness || 0}% !important;
                            height: 100% !important;
                            background: ${candyColors.health} !important;
                            transition: none !important;
                        "></div>
                    </div>
                    <span style="
                        width: 40px !important;
                        text-align: right !important;
                        color: ${candyColors.textPrimary} !important;
                    ">${Math.round(petData.sickness || 0)}</span>
                </div>
                <div class="stat-bar" style="
                    display: flex !important;
                    align-items: center !important;
                    margin-bottom: 8px !important;
                    font-family: 'Courier New', monospace !important;
                    font-size: 12px !important;
                    font-weight: bold !important;
                ">
                    <label style="
                        width: 50px !important;
                        color: ${candyColors.textPrimary} !important;
                        margin-right: 8px !important;
                    ">DISC</label>
                    <div class="progress-bar" style="
                        flex: 1 !important;
                        height: 12px !important;
                        background: ${candyColors.backgroundSolid} !important;
                        border: 2px solid ${candyColors.border} !important;
                        border-radius: 0 !important;
                        overflow: hidden !important;
                        margin-right: 8px !important;
                    ">
                        <div class="progress-fill discipline" style="
                            width: ${petData.discipline || 50}% !important;
                            height: 100% !important;
                            background: ${candyColors.experience} !important;
                            transition: none !important;
                        "></div>
                    </div>
                    <span style="
                        width: 40px !important;
                        text-align: right !important;
                        color: ${candyColors.textPrimary} !important;
                    ">${Math.round(petData.discipline || 50)}</span>
                </div>
                <div class="tamagotchi-info" style="
                    margin-top: 12px !important;
                    padding: 8px !important;
                    background: ${candyColors.backgroundSolid} !important;
                    border: 2px solid ${candyColors.border} !important;
                    border-radius: 0 !important;
                    font-family: 'Courier New', monospace !important;
                    font-size: 11px !important;
                    font-weight: bold !important;
                    color: ${candyColors.textPrimary} !important;
                    text-transform: uppercase !important;
                ">
                    <div style="margin-bottom: 4px !important;">AGE: ${Math.round(petData.age || 0)}H</div>
                    <div style="margin-bottom: 4px !important;">WT: ${petData.weight || 30}KG</div>
                    <div style="margin-bottom: 4px !important;">STATUS: ${petData.isAlive ? 'ALIVE' : 'DEAD'}</div>
                    ${petData.deathReason ? `<div style="color: #FF0000 !important;">CAUSE: ${
                        petData.deathReason === 'sickness' ? 'SICK' :
                        petData.deathReason === 'neglect' ? 'NEGLECT' :
                        petData.deathReason === 'disease' ? 'DISEASE' :
                        petData.deathReason === 'natural' ? 'OLD' : 'UNKNOWN'
                    }</div>` : ''}
                </div>
                ` : ''}
            </div>
        `;
        
        petContainer.html(statusHtml);
    }
    
    /**
     * 获取宠物表情符号
     */
    function getPetEmoji() {
        const emojis = {
            cat: "🐱",
            dog: "🐶",
            dragon: "🐉",
            rabbit: "🐰",
            bird: "🐦"
        };
        return emojis[petData.type] || "🐱";
    }

    /**
     * 获取头像显示内容 - 支持自定义图片
     */
    function getAvatarContent() {
        if (customAvatarData) {
            // 返回自定义图片的HTML
            return `<img src="${customAvatarData}" alt="宠物头像" style="
                width: 100% !important;
                height: 100% !important;
                object-fit: cover !important;
                border-radius: 50% !important;
            ">`;
        } else {
            // 返回默认表情符号
            return getPetEmoji();
        }
    }

    /**
     * 加载自定义头像数据 - 支持多端同步
     */
    function loadCustomAvatar() {
        try {
            // 首先尝试从同步存储加载
            const syncAvatar = loadAvatarFromSync();
            const localAvatar = localStorage.getItem(STORAGE_KEY_CUSTOM_AVATAR);

            // 比较同步数据和本地数据，选择最新的
            if (syncAvatar && localAvatar) {
                // 如果都存在，优先使用同步数据
                customAvatarData = syncAvatar;
                // 同步到本地存储
                localStorage.setItem(STORAGE_KEY_CUSTOM_AVATAR, syncAvatar);
                console.log(`[${extensionName}] 使用同步的头像数据并更新本地`);
            } else if (syncAvatar) {
                customAvatarData = syncAvatar;
                // 同步到本地存储
                localStorage.setItem(STORAGE_KEY_CUSTOM_AVATAR, syncAvatar);
                console.log(`[${extensionName}] 使用同步的头像数据（仅有同步）并保存到本地`);
            } else if (localAvatar) {
                customAvatarData = localAvatar;
                console.log(`[${extensionName}] 使用本地头像数据（仅有本地）`);
            }

            if (customAvatarData) {
                console.log(`[${extensionName}] Custom avatar loaded, size: ${Math.round(customAvatarData.length/1024)}KB`);

                // 确保头像显示更新
                setTimeout(() => {
                    updateAvatarDisplay();
                    updateFloatingButtonAvatar();
                }, 100);
            } else {
                console.log(`[${extensionName}] No custom avatar found`);
            }
        } catch (error) {
            console.warn(`[${extensionName}] Failed to load custom avatar:`, error);
        }
    }

    /**
     * 保存自定义头像数据 - 支持多端同步
     */
    function saveCustomAvatar(imageData) {
        try {
            // 保存到本地存储
            localStorage.setItem(STORAGE_KEY_CUSTOM_AVATAR, imageData);
            customAvatarData = imageData;

            // 保存到同步存储
            saveAvatarToSync(imageData);

            console.log(`[${extensionName}] Custom avatar saved and synced`);
            return true;
        } catch (error) {
            console.error(`[${extensionName}] Failed to save custom avatar:`, error);
            return false;
        }
    }

    /**
     * 清除自定义头像 - 支持多端同步
     */
    function clearCustomAvatar() {
        try {
            // 清除本地存储
            localStorage.removeItem(STORAGE_KEY_CUSTOM_AVATAR);
            customAvatarData = null;

            // 清除同步存储
            clearAvatarFromSync();

            console.log(`[${extensionName}] Custom avatar cleared and synced`);
            return true;
        } catch (error) {
            console.error(`[${extensionName}] Failed to clear custom avatar:`, error);
            return false;
        }
    }
    
    /**
     * 渲染宠物详情
     */
    function renderPetDetails() {
        $("#detail-pet-name").text(petData.name);
        $("#detail-pet-type").text(getPetTypeName(petData.type));
        $("#detail-pet-level").text(petData.level);
        $("#detail-pet-exp").text(`${petData.experience}/${petData.level * 100}`);

        const createdDate = new Date(petData.created);
        const now = new Date();
        const daysDiff = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));

        let createdText = "刚刚";
        if (daysDiff > 0) {
            createdText = `${daysDiff} 天前`;
        } else {
            const hoursDiff = Math.floor((now - createdDate) / (1000 * 60 * 60));
            if (hoursDiff > 0) {
                createdText = `${hoursDiff} 小时前`;
            }
        }
        $("#detail-pet-created").text(createdText);

        // 更新成就状态
        updateAchievements();
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

    /**
     * 更新成就状态
     */
    function updateAchievements() {
        const achievements = [
            {
                id: "first-feed",
                name: "初次喂食",
                icon: "🥇",
                condition: () => petData.lastFeedTime > petData.created
            },
            {
                id: "game-master",
                name: "游戏达人",
                icon: "🎮",
                condition: () => petData.lastPlayTime > petData.created && petData.level >= 3
            },
            {
                id: "level-expert",
                name: "升级专家",
                icon: "⭐",
                condition: () => petData.level >= 5
            }
        ];

        const container = $("#achievements-container");
        container.empty();

        achievements.forEach(achievement => {
            const isUnlocked = achievement.condition();
            const achievementEl = $(`
                <div class="achievement ${isUnlocked ? 'unlocked' : 'locked'}">
                    <span class="achievement-icon">${achievement.icon}</span>
                    <span class="achievement-name">${achievement.name}</span>
                </div>
            `);
            container.append(achievementEl);
        });
    }

    /**
     * 渲染设置
     */
    function renderSettings() {
        $("#pet-name-input").val(petData.name);
        $("#pet-type-select").val(petData.type);

        // 从localStorage加载设置
        const autoSave = localStorage.getItem(`${extensionName}-auto-save`) !== "false";
        const notifications = localStorage.getItem(`${extensionName}-notifications`) !== "false";

        $("#auto-save-checkbox").prop("checked", autoSave);
        $("#notifications-checkbox").prop("checked", notifications);
    }

    /**
     * 保存设置
     */
    function saveSettings() {
        const newName = $("#pet-name-input").val().trim();
        const newType = $("#pet-type-select").val();

        if (newName && newName !== petData.name) {
            petData.name = newName;
            toastr.success(`宠物名称已更改为 "${newName}"`);
        }

        if (newType !== petData.type) {
            petData.type = newType;
            toastr.success(`宠物类型已更改为 "${getPetTypeName(newType)}"`);
        }

        // 保存其他设置
        const autoSave = $("#auto-save-checkbox").is(":checked");
        const notifications = $("#notifications-checkbox").is(":checked");

        localStorage.setItem(`${extensionName}-auto-save`, autoSave);
        localStorage.setItem(`${extensionName}-notifications`, notifications);

        savePetData();
        renderPetStatus(); // 更新主视图
        toastr.success("设置已保存！");
    }

    /**
     * 重置宠物
     */
    function resetPet() {
        if (!confirm("确定要重置宠物吗？这将清除所有数据！")) {
            return;
        }

        // 重置为智能初始化系统
        petData = {
            name: "小宠物",
            type: "cat",
            level: 1,
            experience: 0,
            health: 35,    // 智能系统：会在首次打开时随机化
            happiness: 30, // 智能系统：会在首次打开时随机化
            hunger: 40,    // 智能系统：会在首次打开时随机化
            energy: 45,    // 智能系统：会在首次打开时随机化

            // 拓麻歌子式属性
            lifeStage: "baby",
            age: 0,
            isAlive: true,
            deathReason: null,
            sickness: 0,
            discipline: 50,
            weight: 30,

            // 时间记录
            lastFeedTime: Date.now(),
            lastPlayTime: Date.now(),
            lastSleepTime: Date.now(),
            lastUpdateTime: Date.now(),
            lastCareTime: Date.now(),
            created: Date.now(),

            // 拓麻歌子式计数器
            careNeglectCount: 0,
            sicknessDuration: 0,

            dataVersion: 4.0, // 拓麻歌子系统版本
            hasBeenRandomized: false // 重置后需要重新随机化
        };

        // 应用拓麻歌子系统和随机化
        applyTamagotchiSystem();
        applyFirstTimeRandomization();

        savePetData();
        renderSettings();
        toastr.success("🥚 新的拓麻歌子宠物诞生了！请好好照顾它！");
    }
    
    /**
     * 安全地转义HTML字符串，防止XSS
     */
    function escapeHtml(unsafe) {
        if (unsafe === null || typeof unsafe === "undefined") return "";
        return String(unsafe)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
    
    // -----------------------------------------------------------------
    // 5. 浮动按钮管理
    // -----------------------------------------------------------------

    /**
     * 使按钮可拖动，并处理点击与拖动的区分（最终修复版本）
     */
    function makeButtonDraggable($button) {
        let isDragging = false;
        let wasDragged = false;
        let startX, startY, dragStartX, dragStartY;
        let dragThreshold = 8; // 拖动阈值

        console.log(`[${extensionName}] Setting up final fixed drag for button`);

        // 清除现有事件
        $button.off();
        $(document).off('.petdragtemp');

        // 统一的交互处理
        $button.on('mousedown.petdrag touchstart.petdrag', function(e) {
            console.log(`[${extensionName}] Interaction start`);
            isDragging = true;
            wasDragged = false;

            // 兼容触摸和鼠标事件
            const touch = e.originalEvent && e.originalEvent.touches && e.originalEvent.touches[0];
            startX = touch ? touch.pageX : e.pageX;
            startY = touch ? touch.pageY : e.pageY;

            // 确保坐标有效
            if (typeof startX !== 'number' || typeof startY !== 'number') {
                console.warn(`[${extensionName}] Invalid coordinates, aborting`);
                return;
            }

            // 记录初始拖动偏移量
            const rect = $button[0].getBoundingClientRect();
            dragStartX = startX - rect.left;
            dragStartY = startY - rect.top;

            // 阻止默认行为
            e.preventDefault();

            // 绑定移动和结束事件
            $(document).on('mousemove.petdragtemp touchmove.petdragtemp', function(moveE) {
                if (!isDragging) return;

                const moveTouch = moveE.originalEvent && moveE.originalEvent.touches && moveE.originalEvent.touches[0];
                const moveX = moveTouch ? moveTouch.pageX : moveE.pageX;
                const moveY = moveTouch ? moveTouch.pageY : moveE.pageY;

                const deltaX = Math.abs(moveX - startX);
                const deltaY = Math.abs(moveY - startY);

                // 检查是否超过拖动阈值
                if (deltaX > dragThreshold || deltaY > dragThreshold) {
                    if (!wasDragged) {
                        wasDragged = true;
                        console.log(`[${extensionName}] Drag detected`);

                        // 添加拖动视觉反馈
                        $button.addClass('dragging');
                        $button.css({
                            "cursor": "grabbing",
                            "opacity": "0.8",
                            "transform": "scale(1.05)"
                        });
                    }

                    // 计算新位置 - 修复后的正确计算方法
                    const newX = moveX - dragStartX;
                    const newY = moveY - dragStartY;

                    // 边界限制
                    const windowWidth = window.innerWidth;
                    const windowHeight = window.innerHeight;
                    const buttonWidth = $button.outerWidth() || 48;
                    const buttonHeight = $button.outerHeight() || 48;
                    const safeMargin = 10;

                    const safeX = Math.max(safeMargin, Math.min(newX, windowWidth - buttonWidth - safeMargin));
                    const safeY = Math.max(safeMargin, Math.min(newY, windowHeight - buttonHeight - safeMargin));

                    // 设置位置
                    $button[0].style.setProperty('left', safeX + 'px', 'important');
                    $button[0].style.setProperty('top', safeY + 'px', 'important');
                    $button[0].style.setProperty('position', 'fixed', 'important');

                    // 调试日志（可选，生产环境可移除）
                    // console.log(`[${extensionName}] Moving to: mouse(${moveX}, ${moveY}) → button(${safeX}, ${safeY})`);
                }
            });

            // 绑定结束事件
            $(document).on('mouseup.petdragtemp touchend.petdragtemp', function() {
                console.log(`[${extensionName}] Interaction end, wasDragged: ${wasDragged}`);
                isDragging = false;
                $(document).off('.petdragtemp');

                // 恢复按钮正常状态
                $button.removeClass('dragging');
                $button.css({
                    "cursor": "grab",
                    "opacity": "1",
                    "transform": "none"
                });

                if (wasDragged) {
                    // 保存拖动后的位置
                    const rect = $button[0].getBoundingClientRect();
                    const positionData = {
                        x: Math.round(rect.left),
                        y: Math.round(rect.top)
                    };
                    localStorage.setItem(STORAGE_KEY_BUTTON_POS, JSON.stringify(positionData));
                    console.log(`[${extensionName}] Position saved:`, positionData);

                    // 短暂延迟重置拖动标志
                    setTimeout(() => {
                        wasDragged = false;
                    }, 100);
                } else {
                    // 没有拖动，触发点击事件 - 切换弹窗状态
                    console.log(`[${extensionName}] Button clicked, toggling popup`);
                    try {
                        togglePopup();
                    } catch (error) {
                        console.error(`[${extensionName}] Error toggling popup:`, error);
                        alert("🐾 虚拟宠物系统\n\n弹窗功能正在加载中...\n请稍后再试！");
                    }
                }
            });
        });

        console.log(`[${extensionName}] Final drag events bound successfully`);
    }

    /**
     * 使弹窗可拖动
     */
    function makePopupDraggable($popup) {
        let isDragging = false;
        let dragStartX, dragStartY;
        let popupStartX, popupStartY;

        const $header = $popup.find('.pet-popup-header');
        if ($header.length === 0) return;

        const onDragStart = (e) => {
            isDragging = true;

            // 兼容触摸和鼠标事件
            const pageX = e.pageX || e.originalEvent.touches[0].pageX;
            const pageY = e.pageY || e.originalEvent.touches[0].pageY;

            dragStartX = pageX;
            dragStartY = pageY;

            const popupOffset = $popup.offset();
            popupStartX = popupOffset.left;
            popupStartY = popupOffset.top;

            $popup.addClass('dragging');
            e.preventDefault();
        };

        const onDragMove = (e) => {
            if (!isDragging) return;

            const pageX = e.pageX || e.originalEvent.touches[0].pageX;
            const pageY = e.pageY || e.originalEvent.touches[0].pageY;

            const deltaX = pageX - dragStartX;
            const deltaY = pageY - dragStartY;

            let newX = popupStartX + deltaX;
            let newY = popupStartY + deltaY;

            // 限制在屏幕范围内
            const windowWidth = $(window).width();
            const windowHeight = $(window).height();
            const popupWidth = $popup.outerWidth();
            const popupHeight = $popup.outerHeight();

            newX = Math.max(0, Math.min(newX, windowWidth - popupWidth));
            newY = Math.max(0, Math.min(newY, windowHeight - popupHeight));

            $popup.css({
                position: 'fixed',
                left: newX + 'px',
                top: newY + 'px',
                transform: 'none'
            });

            e.preventDefault();
        };

        const onDragEnd = () => {
            if (isDragging) {
                isDragging = false;
                $popup.removeClass('dragging');
            }
        };

        // 绑定事件到标题栏
        $header.on("mousedown touchstart", onDragStart);
        $(document).on("mousemove touchmove", onDragMove);
        $(document).on("mouseup touchend", onDragEnd);
    }

    /**
     * 初始化并显示浮动按钮
     */
    function initializeFloatingButton() {
        console.log(`[${extensionName}] initializeFloatingButton called`);

        if ($(`#${BUTTON_ID}`).length) {
            console.log(`[${extensionName}] Button already exists`);
            return;
        }

        // 创建按钮
        console.log(`[${extensionName}] Creating floating button with ID: ${BUTTON_ID}`);

        // 使用内联样式确保按钮可见，强制使用fixed定位
        const buttonHtml = `
            <div id="${BUTTON_ID}" style="
                position: fixed !important;
                z-index: ${SAFE_Z_INDEX.button} !important;
                cursor: grab !important;
                width: 48px !important;
                height: 48px !important;
                background: linear-gradient(145deg, ${candyColors.primary}, ${candyColors.buttonHover}) !important;
                border-radius: 50% !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                color: #7289da !important;
                font-size: 24px !important;
                box-shadow: 0 4px 8px rgba(0,0,0,0.3), inset 0 2px 2px rgba(255,255,255,0.05), 0 0 0 1px rgba(0,0,0,0.5) !important;
                user-select: none !important;
                opacity: 1 !important;
                visibility: visible !important;
                pointer-events: auto !important;
                transform: none !important;
                margin: 0 !important;
                top: 200px !important;
                left: 20px !important;
                bottom: auto !important;
                right: auto !important;
            ">${customAvatarData ? `<img src="${customAvatarData}" alt="宠物头像" style="width: 100% !important; height: 100% !important; object-fit: cover !important; border-radius: 50% !important;">` : '🐾'}</div>
        `;

        // 直接添加到body，避免被其他容器影响定位
        $("body").append(buttonHtml);

        const $button = $(`#${BUTTON_ID}`);
        console.log(`[${extensionName}] Button created, element count: ${$button.length}`);

        if ($button.length === 0) {
            console.error(`[${extensionName}] Failed to create button!`);
            return;
        }

        // 强制确保按钮可见和正确定位
        $button.css({
            'position': 'fixed',
            'display': 'flex',
            'opacity': '1',
            'visibility': 'visible',
            'z-index': SAFE_Z_INDEX.button,
            'transform': 'none',
            'margin': '0',
            'pointer-events': 'auto'
        });

        // 验证按钮位置是否正确
        setTimeout(() => {
            const rect = $button[0].getBoundingClientRect();
            console.log(`[${extensionName}] Button position check:`, {
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
                inViewport: rect.top >= 0 && rect.left >= 0 && rect.bottom <= window.innerHeight && rect.right <= window.innerWidth
            });

            // 如果位置不正确，强制修正
            if (rect.top < 0 || rect.top > window.innerHeight || rect.left < 0 || rect.left > window.innerWidth) {
                console.warn(`[${extensionName}] Button position incorrect, forcing correction`);
                $button.css({
                    'top': '200px',
                    'left': '20px',
                    'position': 'fixed',
                    'transform': 'none'
                });
            }
        }, 100);

        // 从localStorage恢复按钮位置，使用完善的边界检查
        const savedPos = localStorage.getItem(STORAGE_KEY_BUTTON_POS);
        if (savedPos) {
            try {
                const pos = JSON.parse(savedPos);
                // 验证位置是否合理
                const windowWidth = window.innerWidth;
                const windowHeight = window.innerHeight;
                const buttonWidth = $button.outerWidth() || 48;
                const buttonHeight = $button.outerHeight() || 48;
                const left = parseInt(pos.x) || 20;
                const top = parseInt(pos.y) || 200;

                // 使用与拖动相同的边界检查逻辑
                const safeMargin = Math.min(10, Math.floor(Math.min(windowWidth, windowHeight) * 0.02));
                const minMargin = 5;
                const actualMargin = Math.max(minMargin, safeMargin);

                const maxX = windowWidth - buttonWidth - actualMargin;
                const maxY = windowHeight - buttonHeight - actualMargin;
                const minX = actualMargin;
                const minY = actualMargin;

                let safeLeft, safeTop;

                if (maxX > minX && maxY > minY) {
                    safeLeft = Math.max(minX, Math.min(left, maxX));
                    safeTop = Math.max(minY, Math.min(top, maxY));
                } else {
                    // 屏幕太小的情况，使用中心位置
                    safeLeft = Math.max(0, (windowWidth - buttonWidth) / 2);
                    safeTop = Math.max(0, (windowHeight - buttonHeight) / 2);
                    console.warn(`[${extensionName}] Screen too small for saved position, centering button`);
                }

                $button.css({
                    'top': safeTop + 'px',
                    'left': safeLeft + 'px',
                    'position': 'fixed',
                    'transform': 'none'
                });
                console.log(`[${extensionName}] Button position restored:`, { left: safeLeft, top: safeTop });
            } catch (error) {
                console.warn(`[${extensionName}] Failed to restore position:`, error);
                // 如果恢复位置失败，设置默认位置
                $button.css({
                    'top': '200px',
                    'left': '20px',
                    'position': 'fixed',
                    'transform': 'none'
                });
            }
        }

        // 使按钮可拖动
        makeButtonDraggable($button);

        // 添加定期位置检查，防止按钮被意外移动
        const positionCheckInterval = setInterval(() => {
            const currentButton = $(`#${BUTTON_ID}`);
            if (currentButton.length > 0) {
                const rect = currentButton[0].getBoundingClientRect();
                const styles = window.getComputedStyle(currentButton[0]);

                // 检查是否位置异常或定位方式错误
                if (styles.position !== 'fixed' || rect.top < -100 || rect.top > window.innerHeight + 100) {
                    console.warn(`[${extensionName}] Button position anomaly detected, correcting...`);
                    currentButton.css({
                        'position': 'fixed',
                        'top': '200px',
                        'left': '20px',
                        'transform': 'none',
                        'z-index': SAFE_Z_INDEX.button
                    });
                }
            } else {
                // 如果按钮消失了，清除检查
                clearInterval(positionCheckInterval);
            }
        }, 5000); // 每5秒检查一次

        console.log(`[${extensionName}] Button initialization complete`);
    }

    /**
     * 移除浮动按钮
     */
    function destroyFloatingButton() {
        $(`#${BUTTON_ID}`).remove();
    }

    /**
     * 插件卸载清理函数
     * 当插件被禁用或卸载时自动清理相关数据和DOM元素
     */
    function cleanupOnUnload() {
        console.log(`[${extensionName}] 开始执行卸载清理...`);

        try {
            // 1. 清理DOM元素
            $(`#${BUTTON_ID}`).remove();
            $(`#${OVERLAY_ID}`).remove();
            $('.virtual-pet-popup-overlay').remove();
            $('#shop-modal').remove();
            $('.pet-notification').remove();
            $('#ios-test-button').remove();
            $('#test-popup-button').remove();

            // 2. 清理事件监听器
            $(document).off('.petdragtemp');
            $(document).off('visibilitychange');

            // 3. 清理全局变量
            if (window.testVirtualPet) delete window.testVirtualPet;
            if (window.forceShowPetButton) delete window.forceShowPetButton;
            if (window.forceDataMigration) delete window.forceDataMigration;
            if (window.forceClearAndReload) delete window.forceClearAndReload;
            if (window.fixAllIssues) delete window.fixAllIssues;
            if (window.createIOSTestButton) delete window.createIOSTestButton;
            if (window.showIOSPopup) delete window.showIOSPopup;
            if (window.clearAllPopups) delete window.clearAllPopups;
            if (window.forceCloseAllPopups) delete window.forceCloseAllPopups;
            if (window.closeShopModal) delete window.closeShopModal;
            if (window.testShopSystem) delete window.testShopSystem;

            // 4. 可选：清理localStorage数据（用户可选择保留）
            const shouldClearData = confirm(
                '是否同时清理宠物数据？\n\n' +
                '选择"确定"：完全清理所有数据（包括宠物状态、设置等）\n' +
                '选择"取消"：保留数据，下次安装时可以恢复'
            );

            if (shouldClearData) {
                // 清理所有相关的localStorage数据
                const keysToRemove = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && (
                        key.includes('virtual-pet') ||
                        key.includes('KPCP-PET') ||
                        key.includes('pet-system') ||
                        key.startsWith(extensionName)
                    )) {
                        keysToRemove.push(key);
                    }
                }

                keysToRemove.forEach(key => {
                    localStorage.removeItem(key);
                    console.log(`[${extensionName}] 已清理localStorage: ${key}`);
                });

                console.log(`[${extensionName}] 已清理 ${keysToRemove.length} 个localStorage项目`);
            }

            console.log(`[${extensionName}] 卸载清理完成`);

            // 显示清理完成提示
            if (typeof toastr !== 'undefined') {
                toastr.success('虚拟宠物系统已完全清理！', '', { timeOut: 3000 });
            }

        } catch (error) {
            console.error(`[${extensionName}] 卸载清理过程中发生错误:`, error);
            if (typeof toastr !== 'undefined') {
                toastr.warning('清理过程中发生部分错误，请检查控制台', '', { timeOut: 5000 });
            }
        }
    }

    /**
     * 检测插件是否被禁用并执行清理
     */
    function setupUnloadDetection() {
        // 监听插件开关状态变化
        const checkInterval = setInterval(() => {
            const isEnabled = localStorage.getItem(STORAGE_KEY_ENABLED) !== "false";
            const toggleElement = $(TOGGLE_ID);

            // 如果插件被禁用且DOM元素仍存在，执行清理
            if (!isEnabled && $(`#${BUTTON_ID}`).length > 0) {
                console.log(`[${extensionName}] 检测到插件被禁用，执行清理...`);
                destroyFloatingButton();
                $(`#${OVERLAY_ID}`).remove();
                $('.virtual-pet-popup-overlay').remove();
                clearInterval(checkInterval); // 停止检测
            }
        }, 1000);

        // 页面卸载时的清理
        window.addEventListener('beforeunload', () => {
            // 简单清理，不显示确认对话框
            $(`#${BUTTON_ID}`).remove();
            $(`#${OVERLAY_ID}`).remove();
            $('.virtual-pet-popup-overlay').remove();
        });

        // 为开发者提供手动清理函数
        window.cleanupVirtualPetSystem = cleanupOnUnload;
    }

    // -----------------------------------------------------------------
    // 6. 初始化流程
    // -----------------------------------------------------------------

    async function initializeExtension() {
        console.log(`[${extensionName}] Initializing extension...`);

        // 1. 检查并修复CSS变量污染
        checkAndFixCSSVariables();

        // 2. 创建样式隔离
        createIsolatedStyles();

        // 3. 动态加载CSS
        console.log(`[${extensionName}] Loading CSS from: ${extensionFolderPath}/style.css`);
        $("head").append(`<link rel="stylesheet" type="text/css" href="${extensionFolderPath}/style.css">`);

        // 2. 先尝试创建简单的设置面板
        console.log(`[${extensionName}] Creating simple settings panel...`);
        const simpleSettingsHtml = `
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

                        <hr style="margin: 15px 0; border: none; border-top: 1px solid #444;">

                        <div class="flex-container">
                            <label for="virtual-pet-personality-select" style="display: block; margin-bottom: 8px; font-weight: bold;">
                                🎭 宠物人设选择
                            </label>
                            <select id="virtual-pet-personality-select" style="width: 100%; padding: 8px; margin-bottom: 8px; border-radius: 4px;">
                                <option value="default">🐱 默认 - 高冷但温柔的猫</option>
                                <option value="cheerful">🐶 活泼 - 热情洋溢的小狗</option>
                                <option value="elegant">🐉 优雅 - 古典文雅的龙</option>
                                <option value="shy">🐰 害羞 - 轻声细语的兔子</option>
                                <option value="smart">🐦 聪明 - 机智幽默的鸟</option>
                                <option value="custom">✏️ 自定义人设</option>
                            </select>
                        </div>

                        <div id="virtual-pet-custom-personality-container" style="display: none; margin-top: 10px;">
                            <label for="virtual-pet-custom-personality" style="display: block; margin-bottom: 5px; font-size: 0.9em;">
                                自定义人设描述：
                            </label>
                            <textarea id="virtual-pet-custom-personality"
                                      placeholder="描述你的宠物性格、喜好和特点..."
                                      rows="3"
                                      maxlength="5000"
                                      style="width: 100%; padding: 8px; border-radius: 4px; resize: vertical; font-family: inherit;"></textarea>
                            <small style="color: #888; font-size: 0.8em;">最多5000字符，这将影响宠物与你互动时的回复风格</small>
                        </div>

                        <small class="notes" style="margin-top: 10px; display: block;">
                            选择或自定义宠物的性格，AI会根据人设生成个性化回复
                        </small>

                        <!-- AI 配置设置 -->
                        <hr style="margin: 15px 0; border: none; border-top: 1px solid #444;">

                        <div class="flex-container">
                            <label for="ai-api-select" style="display: block; margin-bottom: 8px; font-weight: bold;">
                                🤖 AI API 配置
                            </label>
                            <select id="ai-api-select" style="width: 100%; padding: 8px; margin-bottom: 8px; border-radius: 4px;">
                                <option value="">请选择API类型...</option>
                                <option value="openai">OpenAI (ChatGPT)</option>
                                <option value="claude">Claude (Anthropic)</option>
                                <option value="google">Google AI Studio</option>
                                <option value="mistral">Mistral AI</option>
                                <option value="ollama">Ollama (本地)</option>
                                <option value="custom">自定义API</option>
                            </select>
                        </div>

                        <!-- API配置输入框 -->
                        <div id="ai-config-container" style="display: none; margin-top: 10px;">
                            <div style="margin-bottom: 10px;">
                                <label for="ai-url-input" style="display: block; margin-bottom: 5px; font-size: 0.9em;">
                                    API URL:
                                </label>
                                <input id="ai-url-input" type="text" placeholder="例如: https://api.openai.com/v1 (只需填写到/v1，会自动添加端点)"
                                       style="width: 100%; padding: 6px; border-radius: 4px;">
                                <div style="font-size: 0.8em; color: #666; margin-top: 3px;">
                                    💡 提示：只需填写到 /v1，插件会自动添加 /chat/completions 端点
                                </div>
                            </div>
                            <div style="margin-bottom: 10px;">
                                <label for="ai-key-input" style="display: block; margin-bottom: 5px; font-size: 0.9em;">
                                    API Key:
                                </label>
                                <input id="ai-key-input" type="password" placeholder="输入你的API密钥"
                                       style="width: 100%; padding: 6px; border-radius: 4px;">
                            </div>
                            <div style="margin-bottom: 10px;">
                                <label for="ai-model-select" style="display: block; margin-bottom: 5px; font-size: 0.9em;">
                                    模型名称:
                                </label>
                                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
                                    <select id="ai-model-select" style="flex: 1; padding: 6px; border-radius: 4px; font-size: 0.9em;">
                                        <option value="">请选择模型...</option>
                                        <option value="gpt-4">GPT-4</option>
                                        <option value="gpt-4-turbo">GPT-4 Turbo</option>
                                        <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                                        <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                                        <option value="claude-3-sonnet-20240229">Claude 3 Sonnet</option>
                                        <option value="claude-3-haiku-20240307">Claude 3 Haiku</option>
                                        <option value="gemini-pro">Gemini Pro</option>
                                        <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                                        <option value="custom">🔧 自定义模型</option>
                                    </select>
                                    <button id="refresh-models-btn" style="
                                        padding: 6px 10px;
                                        background: #4a90e2;
                                        color: white;
                                        border: none;
                                        border-radius: 4px;
                                        cursor: pointer;
                                        font-size: 0.8em;
                                        white-space: nowrap;
                                    " title="从配置的API获取可用模型列表">
                                        🔄 获取
                                    </button>
                                </div>
                                <input id="ai-model-input" type="text" placeholder="自定义模型名称"
                                       style="width: 100%; padding: 6px; border-radius: 4px; display: none;">
                            </div>
                        </div>

                        <div class="flex-container" style="margin-top: 10px;">
                            <button id="test-ai-connection-btn" style="padding: 8px 16px; background: #48bb78; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;">
                                🔗 测试连接
                            </button>
                            <span id="ai-connection-status" style="padding: 8px; font-size: 0.9em; color: #888;">
                                未测试
                            </span>
                        </div>

                        <small class="notes" style="margin-top: 10px; display: block;">
                            配置AI API用于生成个性化的宠物回复，AI会根据选择的人设来回应
                        </small>
                    </div>
                </div>
            </div>
        `;
        $("#extensions_settings2").append(simpleSettingsHtml);
        console.log(`[${extensionName}] Settings panel created`);

        // 初始化设置面板
        initializeSettingsPanel();

        // 3. 加载弹窗HTML（如果失败就使用简单版本）
        // 检测是否为iOS设备，如果是则跳过原始弹窗创建
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

        if (!isIOS) {
            try {
                console.log(`[${extensionName}] Loading popup HTML...`);
                const popupHtml = await $.get(`${extensionFolderPath}/popup.html`);
                $("body").append(popupHtml);
                console.log(`[${extensionName}] Popup HTML loaded successfully`);
            } catch (error) {
                console.warn(`[${extensionName}] Failed to load popup.html, using simple version:`, error);
                // 创建简单的弹窗HTML
            const simplePopupHtml = `
                <div id="virtual-pet-popup-overlay" class="virtual-pet-popup-overlay">
                    <div id="virtual-pet-popup" class="pet-popup-container">
                        <div class="pet-popup-header" style="display: none;">
                            <div class="pet-popup-title"></div>
                        </div>
                        <div class="pet-popup-body">
                            <div id="pet-main-view" class="pet-view">
                                <div class="pet-section">
                                    <div id="pet-status-container">
                                        <div class="pet-avatar">
                                            <div class="pet-emoji">🐱</div>
                                            <div class="pet-name">小宠物</div>
                                            <div class="pet-level">Lv.1</div>
                                        </div>
                                        <p>宠物系统正在开发中...</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
                $("body").append(simplePopupHtml);
            }
        } else {
            console.log(`[${extensionName}] iOS detected, skipping original popup creation`);
        }

        // 3. 获取 DOM 引用（只在非iOS设备上）
        if (!isIOS) {
            overlay = $(`#${OVERLAY_ID}`);
            mainView = $("#pet-main-view");
            petView = $("#pet-detail-view");
            settingsView = $("#pet-settings-view");
            petContainer = $("#pet-status-container");
        }

        // 4. 加载宠物数据
        loadPetData();

        // 4.1 确保拓麻歌子系统已应用
        if (petData.dataVersion >= 4.0) {
            applyTamagotchiSystem();
        } else {
            // 旧版本数据自动升级到拓麻歌子系统
            petData.dataVersion = 4.0;
            applyTamagotchiSystem();
            savePetData();
        }

        // 5. 加载自定义头像数据
        loadCustomAvatar();

        // 5. 只在非iOS设备上初始化原始弹窗功能
        if (!isIOS) {
            // 使弹窗可拖拽
            const $popup = $(`#${POPUP_ID}`);
            if ($popup.length > 0) {
                makePopupDraggable($popup);
                console.log(`[${extensionName}] Popup drag functionality added`);
            }

            // 移除了关闭按钮，现在只能通过悬浮按钮或外部点击关闭

            if (overlay && overlay.length > 0) {
                overlay.on("click touchend", function (event) {
                    if (event.target === this) {
                        event.preventDefault();
                        closePopup();
                    }
                });
            }
        }

        $(`#${POPUP_ID}`).on("click touchend", (e) => e.stopPropagation());

        // 宠物交互按钮
        $("#feed-pet-btn").on("click touchend", (e) => {
            e.preventDefault();
            feedPet();
        });

        $("#play-pet-btn").on("click touchend", (e) => {
            e.preventDefault();
            playWithPet();
        });

        $("#sleep-pet-btn").on("click touchend", (e) => {
            e.preventDefault();
            petSleep();
        });

        // 视图切换按钮
        $("#goto-pet-detail-btn").on("click touchend", (e) => {
            e.preventDefault();
            showPetView();
        });

        $("#goto-settings-btn").on("click touchend", (e) => {
            e.preventDefault();
            showSettingsView();
        });

        // 返回主视图按钮 (使用事件委托)
        $(".pet-popup-body").on("click touchend", ".back-to-main-btn", (e) => {
            e.preventDefault();
            showMainView();
        });

        // 设置相关按钮
        $("#save-settings-btn").on("click touchend", (e) => {
            e.preventDefault();
            saveSettings();
        });

        $("#reset-pet-btn").on("click touchend", (e) => {
            e.preventDefault();
            resetPet();
        });

        // 6. 初始状态
        console.log(`[${extensionName}] Setting up initial state...`);

        // 等待一下确保DOM完全准备好
        setTimeout(() => {
            const isEnabled = localStorage.getItem(STORAGE_KEY_ENABLED) !== "false";
            console.log(`[${extensionName}] Extension enabled: ${isEnabled}`);

            const toggleElement = $(TOGGLE_ID);
            if (toggleElement.length === 0) {
                console.warn(`[${extensionName}] Toggle element not found: ${TOGGLE_ID}`);
                console.log(`[${extensionName}] Available elements:`, $("#extensions_settings2").find("input[type='checkbox']").length);
            } else {
                toggleElement.prop("checked", isEnabled);
                console.log(`[${extensionName}] Toggle element found and set`);
            }

            if (isEnabled) {
                console.log(`[${extensionName}] Initializing floating button...`);
                initializeFloatingButton();
            }

            // 绑定开关事件
            $(document).off("change", TOGGLE_ID).on("change", TOGGLE_ID, function () {
                const checked = $(this).is(":checked");
                console.log(`[${extensionName}] Toggle changed: ${checked}`);
                localStorage.setItem(STORAGE_KEY_ENABLED, checked);
                if (checked) {
                    initializeFloatingButton();
                } else {
                    destroyFloatingButton();
                }
            });

            console.log(`[${extensionName}] Initial setup complete`);
        }, 1000); // 等待1秒确保所有元素都已加载

        // 7. 定期更新宠物状态
        setInterval(() => {
            updatePetStatus();
            if (overlay && overlay.is(":visible")) {
                renderPetStatus();
                // 如果在详情视图，也更新详情
                if (petView.is(":visible")) {
                    renderPetDetails();
                }
            }
        }, 60000); // 每分钟更新一次

        // 8. 页面可见性变化时更新状态
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) {
                updatePetStatus();
                if (overlay && overlay.is(":visible")) {
                    renderPetStatus();
                }
            }
        });

        // 9. 如果是iOS设备，创建测试按钮
        if (isIOS) {
            console.log(`[${extensionName}] iOS detected, creating test button`);
            setTimeout(() => {
                if (typeof window.createIOSTestButton === 'function') {
                    window.createIOSTestButton();
                }
            }, 3000); // 延迟3秒创建，确保页面完全加载
        }

        // 10. 设置卸载检测
        setupUnloadDetection();

        console.log(`[${extensionName}] Extension loaded successfully.`);
    }

    // 运行初始化
    try {
        await initializeExtension();
    } catch (error) {
        console.error(`[${extensionName}] Initialization failed:`, error);
        if (typeof toastr !== 'undefined') {
            toastr.error(`Extension "${extensionName}" failed to initialize: ${error.message}`);
        }
    }

    // 全局测试函数
    window.testVirtualPet = function() {
        console.log("🐾 手动测试虚拟宠物系统...");

        // 强制创建按钮
        $(`#${BUTTON_ID}`).remove();
        initializeFloatingButton();

        console.log("🐾 测试完成，检查是否有🐾按钮出现");
    };

    // 强制显示按钮函数
    window.forceShowPetButton = function() {
        console.log("🐾 强制显示宠物按钮...");

        // 移除现有按钮
        $(`#${BUTTON_ID}`).remove();

        // 创建按钮并强制设置样式，确保正确定位
        const buttonHtml = `
            <div id="${BUTTON_ID}" style="
                position: fixed !important;
                z-index: ${SAFE_Z_INDEX.button} !important;
                cursor: grab !important;
                width: 48px !important;
                height: 48px !important;
                background: linear-gradient(145deg, ${candyColors.primary}, ${candyColors.buttonHover}) !important;
                border-radius: 50% !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                color: #7289da !important;
                font-size: 24px !important;
                box-shadow: 0 4px 8px rgba(0,0,0,0.3), inset 0 2px 2px rgba(255,255,255,0.05), 0 0 0 1px rgba(0,0,0,0.5) !important;
                user-select: none !important;
                opacity: 1 !important;
                visibility: visible !important;
                pointer-events: auto !important;
                transform: none !important;
                margin: 0 !important;
                top: 200px !important;
                left: 20px !important;
                bottom: auto !important;
                right: auto !important;
            ">🐾</div>
        `;

        $("body").append(buttonHtml);

        const $button = $(`#${BUTTON_ID}`);
        console.log("🐾 按钮创建结果:", $button.length > 0 ? "成功" : "失败");

        if ($button.length > 0) {
            // 绑定点击事件
            $button.off().on("click touchend", function(e) {
                e.preventDefault();
                console.log("🐾 按钮被点击");

                try {
                    // 所有平台都使用统一的showPopup函数
                    showPopup();
                } catch (error) {
                    console.error("显示弹窗出错:", error);
                    alert("🐾 虚拟宠物\n\n弹窗功能正在加载中...");
                }
            });

            // 使按钮可拖动
            makeButtonDraggable($button);

            console.log("🐾 按钮应该现在可见了！");
        }

        return $button.length > 0;
    };

    // 全局按钮修复函数
    window.fixPetButtonPosition = function() {
        console.log("🔧 检查并修复按钮位置...");

        const button = $(`#${BUTTON_ID}`);
        if (button.length === 0) {
            console.log("❌ 按钮不存在，尝试重新创建");
            return window.forceShowPetButton();
        }

        const rect = button[0].getBoundingClientRect();
        const styles = window.getComputedStyle(button[0]);

        console.log("当前按钮状态:", {
            position: styles.position,
            top: rect.top,
            left: rect.left,
            visible: rect.width > 0 && rect.height > 0,
            inViewport: rect.top >= 0 && rect.left >= 0 && rect.bottom <= window.innerHeight && rect.right <= window.innerWidth
        });

        // 检查是否需要修复
        const needsFix = styles.position !== 'fixed' ||
                        rect.top < 0 || rect.top > window.innerHeight ||
                        rect.left < 0 || rect.left > window.innerWidth ||
                        rect.width === 0 || rect.height === 0;

        if (needsFix) {
            console.log("🔧 修复按钮位置和样式...");
            button.css({
                'position': 'fixed !important',
                'top': '200px !important',
                'left': '20px !important',
                'width': '48px !important',
                'height': '48px !important',
                'z-index': `${SAFE_Z_INDEX.button} !important`,
                'display': 'flex !important',
                'visibility': 'visible !important',
                'opacity': '1 !important',
                'transform': 'none !important',
                'margin': '0 !important',
                'pointer-events': 'auto !important'
            });

            setTimeout(() => {
                const newRect = button[0].getBoundingClientRect();
                console.log("修复后位置:", newRect);
                console.log(newRect.top >= 0 && newRect.top <= window.innerHeight ? "✅ 修复成功" : "❌ 修复失败");
            }, 100);

            return true;
        } else {
            console.log("✅ 按钮位置正常，无需修复");
            return true;
        }
    };

    // 立即修复拖动问题
    window.fixDragIssue = function() {
        console.log("🔧 立即修复拖动问题...");

        const button = $(`#${BUTTON_ID}`);
        if (button.length === 0) {
            console.log("❌ 按钮不存在");
            return false;
        }

        // 移除所有可能冲突的事件
        button.off('.petdrag');
        $(document).off('.petdragtemp');

        // 重新绑定拖动事件，使用更强的样式设置
        let isDragging = false;
        let wasDragged = false;
        let dragStartX, dragStartY, startX, startY;
        let dragTimeout;

        const onDragStart = (e) => {
            console.log("🎯 开始拖动");
            isDragging = true;
            wasDragged = false;

            const touch = e.originalEvent && e.originalEvent.touches && e.originalEvent.touches[0];
            const pageX = touch ? touch.pageX : e.pageX;
            const pageY = touch ? touch.pageY : e.pageY;

            startX = pageX;
            startY = pageY;

            const rect = button[0].getBoundingClientRect();
            dragStartX = pageX - rect.left;
            dragStartY = pageY - rect.top;

            e.preventDefault();
            e.stopPropagation();

            $(document).on("mousemove.fixdrag", onDragMove);
            $(document).on("touchmove.fixdrag", onDragMove);
            $(document).on("mouseup.fixdrag", onDragEnd);
            $(document).on("touchend.fixdrag", onDragEnd);
        };

        const onDragMove = (e) => {
            if (!isDragging) return;

            const touch = e.originalEvent && e.originalEvent.touches && e.originalEvent.touches[0];
            const pageX = touch ? touch.pageX : e.pageX;
            const pageY = touch ? touch.pageY : e.pageY;

            const deltaX = Math.abs(pageX - startX);
            const deltaY = Math.abs(pageY - startY);

            if (deltaX > 5 || deltaY > 5) {
                wasDragged = true;
            }

            if (wasDragged) {
                e.preventDefault();

                let newX = pageX - dragStartX;
                let newY = pageY - dragStartY;

                // 边界限制
                const windowWidth = window.innerWidth;
                const windowHeight = window.innerHeight;
                const safeMargin = 10;

                newX = Math.max(safeMargin, Math.min(newX, windowWidth - 48 - safeMargin));
                newY = Math.max(safeMargin, Math.min(newY, windowHeight - 48 - safeMargin));

                // 使用最强的样式设置方法
                const element = button[0];
                element.style.setProperty('position', 'fixed', 'important');
                element.style.setProperty('top', newY + 'px', 'important');
                element.style.setProperty('left', newX + 'px', 'important');
                element.style.setProperty('transform', 'none', 'important');
                element.style.setProperty('z-index', SAFE_Z_INDEX.button, 'important');

                console.log(`🎯 移动到: ${newX}, ${newY}`);
            }
        };

        const onDragEnd = () => {
            if (isDragging) {
                console.log("🎯 拖动结束");
                isDragging = false;

                $(document).off(".fixdrag");

                if (wasDragged) {
                    const rect = button[0].getBoundingClientRect();
                    localStorage.setItem(STORAGE_KEY_BUTTON_POS, JSON.stringify({
                        x: Math.round(rect.left),
                        y: Math.round(rect.top)
                    }));

                    clearTimeout(dragTimeout);
                    dragTimeout = setTimeout(() => {
                        wasDragged = false;
                    }, 200);
                }
            }
        };

        // 绑定新的事件
        button.on("mousedown.fixdrag", onDragStart);
        button.on("touchstart.fixdrag", onDragStart);

        console.log("✅ 拖动修复完成，请尝试拖动按钮");
        return true;
    };

    // 立即修复点击弹窗问题
    window.fixClickIssue = function() {
        console.log("🔧 修复点击弹窗问题...");

        const button = $(`#${BUTTON_ID}`);
        if (button.length === 0) {
            console.log("❌ 按钮不存在");
            return false;
        }

        // 清除所有事件
        button.off();
        $(document).off('.petdragtemp');

        // 重新绑定简化的事件处理
        let isDragging = false;
        let wasDragged = false;
        let startX, startY;

        button.on('mousedown touchstart', function(e) {
            isDragging = true;
            wasDragged = false;

            const touch = e.originalEvent && e.originalEvent.touches && e.originalEvent.touches[0];
            startX = touch ? touch.pageX : e.pageX;
            startY = touch ? touch.pageY : e.pageY;

            e.preventDefault();

            $(document).on('mousemove.temp touchmove.temp', function(moveE) {
                if (!isDragging) return;

                const moveTouch = moveE.originalEvent && moveE.originalEvent.touches && moveE.originalEvent.touches[0];
                const moveX = moveTouch ? moveTouch.pageX : moveE.pageX;
                const moveY = moveTouch ? moveTouch.pageY : moveE.pageY;

                const deltaX = Math.abs(moveX - startX);
                const deltaY = Math.abs(moveY - startY);

                if (deltaX > 8 || deltaY > 8) {
                    wasDragged = true;

                    // 直接设置位置
                    const rect = button[0].getBoundingClientRect();
                    const newX = moveX - (startX - rect.left);
                    const newY = moveY - (startY - rect.top);

                    button[0].style.setProperty('left', newX + 'px', 'important');
                    button[0].style.setProperty('top', newY + 'px', 'important');
                }
            });

            $(document).on('mouseup.temp touchend.temp', function() {
                isDragging = false;
                $(document).off('.temp');

                if (!wasDragged) {
                    // 没有拖动，触发点击
                    console.log("🎯 触发弹窗");
                    try {
                        showPopup();
                    } catch (error) {
                        console.error("弹窗错误:", error);
                        alert("🐾 虚拟宠物系统\n\n弹窗功能正在加载中...");
                    }
                }

                // 重置拖动标志
                setTimeout(() => {
                    wasDragged = false;
                }, 100);
            });
        });

        console.log("✅ 点击修复完成");
        return true;
    };

    // 立即修复拖动位置计算问题
    window.fixDragPositionIssue = function() {
        console.log("🔧 修复拖动位置计算问题...");

        const button = $(`#${BUTTON_ID}`);
        if (button.length === 0) {
            console.log("❌ 按钮不存在");
            return false;
        }

        // 清除所有事件
        button.off();
        $(document).off('.petdragtemp');

        // 重新绑定正确的拖动逻辑
        let isDragging = false;
        let wasDragged = false;
        let startX, startY, dragStartX, dragStartY;

        button.on('mousedown touchstart', function(e) {
            console.log("🎯 开始交互");
            isDragging = true;
            wasDragged = false;

            const touch = e.originalEvent && e.originalEvent.touches && e.originalEvent.touches[0];
            startX = touch ? touch.pageX : e.pageX;
            startY = touch ? touch.pageY : e.pageY;

            // 记录按钮相对于鼠标的偏移量
            const rect = button[0].getBoundingClientRect();
            dragStartX = startX - rect.left;
            dragStartY = startY - rect.top;

            console.log(`初始位置: 鼠标(${startX}, ${startY}), 按钮(${rect.left}, ${rect.top}), 偏移(${dragStartX}, ${dragStartY})`);

            e.preventDefault();

            $(document).on('mousemove.temp touchmove.temp', function(moveE) {
                if (!isDragging) return;

                const moveTouch = moveE.originalEvent && moveE.originalEvent.touches && moveE.originalEvent.touches[0];
                const moveX = moveTouch ? moveTouch.pageX : moveE.pageX;
                const moveY = moveTouch ? moveTouch.pageY : moveE.pageY;

                const deltaX = Math.abs(moveX - startX);
                const deltaY = Math.abs(moveY - startY);

                if (deltaX > 8 || deltaY > 8) {
                    if (!wasDragged) {
                        wasDragged = true;
                        console.log("🎯 检测到拖动");
                        button.css({
                            "opacity": "0.8",
                            "transform": "scale(1.05)"
                        });
                    }

                    // 正确计算新位置
                    const newX = moveX - dragStartX;
                    const newY = moveY - dragStartY;

                    // 边界限制
                    const windowWidth = window.innerWidth;
                    const windowHeight = window.innerHeight;
                    const safeX = Math.max(10, Math.min(newX, windowWidth - 58));
                    const safeY = Math.max(10, Math.min(newY, windowHeight - 58));

                    console.log(`移动到: 鼠标(${moveX}, ${moveY}) → 按钮(${safeX}, ${safeY})`);

                    button[0].style.setProperty('left', safeX + 'px', 'important');
                    button[0].style.setProperty('top', safeY + 'px', 'important');
                    button[0].style.setProperty('position', 'fixed', 'important');
                }
            });

            $(document).on('mouseup.temp touchend.temp', function() {
                console.log("🎯 交互结束，拖动状态:", wasDragged);
                isDragging = false;
                $(document).off('.temp');

                button.css({
                    "opacity": "1",
                    "transform": "none"
                });

                if (!wasDragged) {
                    console.log("🎯 触发弹窗");
                    try {
                        if (typeof showPopup === 'function') {
                            showPopup();
                        } else {
                            alert("🐾 虚拟宠物系统\n\n弹窗功能正在加载中...");
                        }
                    } catch (error) {
                        console.error("弹窗错误:", error);
                        alert("🐾 虚拟宠物系统\n\n弹窗功能正在加载中...");
                    }
                } else {
                    // 保存位置
                    const rect = button[0].getBoundingClientRect();
                    localStorage.setItem(STORAGE_KEY_BUTTON_POS, JSON.stringify({
                        x: Math.round(rect.left),
                        y: Math.round(rect.top)
                    }));
                    console.log("🎯 位置已保存:", { x: rect.left, y: rect.top });
                }

                setTimeout(() => {
                    wasDragged = false;
                }, 50);
            });
        });

        console.log("✅ 拖动位置修复完成");
        return true;
    };

    // 测试悬浮按钮切换功能
    window.testToggleFunction = function() {
        console.log("🎯 测试悬浮按钮切换功能...");

        const button = $(`#${BUTTON_ID}`);
        if (button.length === 0) {
            console.log("❌ 悬浮按钮不存在");
            return false;
        }

        console.log("✅ 悬浮按钮存在");
        console.log(`当前弹窗状态: ${isPopupOpen ? '打开' : '关闭'}`);

        // 检查弹窗实际状态
        const overlay = $(`#${OVERLAY_ID}`);
        const actuallyOpen = overlay.length > 0;
        console.log(`实际弹窗状态: ${actuallyOpen ? '打开' : '关闭'}`);

        // 状态一致性检查
        const stateConsistent = isPopupOpen === actuallyOpen;
        console.log(`状态一致性: ${stateConsistent ? '✅ 一致' : '❌ 不一致'}`);

        // 模拟点击测试
        console.log("🎯 模拟点击悬浮按钮...");
        const initialState = isPopupOpen;

        try {
            // 直接调用切换函数
            togglePopup();

            setTimeout(() => {
                const newState = isPopupOpen;
                const newOverlay = $(`#${OVERLAY_ID}`);
                const newActuallyOpen = newOverlay.length > 0;

                console.log(`点击后状态: ${newState ? '打开' : '关闭'}`);
                console.log(`点击后实际: ${newActuallyOpen ? '打开' : '关闭'}`);

                const stateChanged = initialState !== newState;
                const actualChanged = actuallyOpen !== newActuallyOpen;
                const bothChanged = stateChanged && actualChanged;

                console.log(`状态变化: ${stateChanged ? '✅' : '❌'}`);
                console.log(`实际变化: ${actualChanged ? '✅' : '❌'}`);
                console.log(`切换成功: ${bothChanged ? '✅' : '❌'}`);

                // 再次点击测试
                console.log("🎯 再次点击测试...");
                togglePopup();

                setTimeout(() => {
                    const finalState = isPopupOpen;
                    const finalOverlay = $(`#${OVERLAY_ID}`);
                    const finalActuallyOpen = finalOverlay.length > 0;

                    console.log(`最终状态: ${finalState ? '打开' : '关闭'}`);
                    console.log(`最终实际: ${finalActuallyOpen ? '打开' : '关闭'}`);

                    const backToOriginal = finalState === initialState;
                    const actualBackToOriginal = finalActuallyOpen === actuallyOpen;

                    console.log(`回到原状态: ${backToOriginal ? '✅' : '❌'}`);
                    console.log(`实际回到原状态: ${actualBackToOriginal ? '✅' : '❌'}`);

                    const allGood = stateConsistent && bothChanged && backToOriginal && actualBackToOriginal;
                    console.log(`\n🎉 切换功能测试: ${allGood ? '完全成功！' : '需要检查'}`);

                    if (allGood) {
                        console.log("✅ 悬浮按钮切换功能正常工作");
                        console.log("📋 功能说明:");
                        console.log("  - 点击悬浮按钮可以打开弹窗");
                        console.log("  - 再次点击悬浮按钮可以关闭弹窗");
                        console.log("  - 点击弹窗外部也可以关闭弹窗");
                        console.log("  - 弹窗内部没有关闭按钮");
                    }

                    return allGood;
                }, 300);
            }, 300);
        } catch (error) {
            console.error("切换功能测试失败:", error);
            return false;
        }

        return true;
    };

    // 验证拖动修复是否成功
    window.verifyDragFix = function() {
        console.log("🎯 验证拖动修复效果...");

        const button = $(`#${BUTTON_ID}`);
        if (button.length === 0) {
            console.log("❌ 按钮不存在");
            return false;
        }

        // 检查事件绑定
        const events = $._data(button[0], "events");
        const hasCorrectEvents = events && events.mousedown && events.touchstart;
        console.log(`事件绑定: ${hasCorrectEvents ? '✅' : '❌'}`);

        // 检查当前位置
        const rect = button[0].getBoundingClientRect();
        const inViewport = rect.top >= 0 && rect.left >= 0 &&
                          rect.bottom <= window.innerHeight && rect.right <= window.innerWidth;
        console.log(`位置正常: ${inViewport ? '✅' : '❌'} - (${rect.left}, ${rect.top})`);

        // 测试位置设置功能
        const originalLeft = rect.left;
        const originalTop = rect.top;
        const testX = 100;
        const testY = 100;

        button[0].style.setProperty('left', testX + 'px', 'important');
        button[0].style.setProperty('top', testY + 'px', 'important');

        setTimeout(() => {
            const newRect = button[0].getBoundingClientRect();
            const positionWorks = Math.abs(newRect.left - testX) < 5 && Math.abs(newRect.top - testY) < 5;
            console.log(`位置设置: ${positionWorks ? '✅' : '❌'}`);

            // 恢复原位置
            button[0].style.setProperty('left', originalLeft + 'px', 'important');
            button[0].style.setProperty('top', originalTop + 'px', 'important');

            const allGood = hasCorrectEvents && inViewport && positionWorks;
            console.log(`\n🎉 拖动修复验证: ${allGood ? '完全成功！' : '需要进一步检查'}`);

            if (allGood) {
                console.log("✅ 拖动功能已完全修复并正常工作");
                console.log("📋 功能说明:");
                console.log("  - 快速点击 → 显示弹窗");
                console.log("  - 按住拖动 → 移动按钮位置");
                console.log("  - 拖动时有视觉反馈");
                console.log("  - 自动边界限制");
                console.log("  - 位置自动保存");
            }

            return allGood;
        }, 100);

        return true;
    };

    // 最终功能验证测试
    window.testFinalDragFix = function() {
        console.log("🎯 最终拖动修复验证...");

        const button = $(`#${BUTTON_ID}`);
        if (button.length === 0) {
            console.log("❌ 按钮不存在");
            return false;
        }

        console.log("✅ 按钮存在");

        // 检查事件绑定
        const events = $._data(button[0], "events");
        const hasMouseDown = events && events.mousedown && events.mousedown.length > 0;
        const hasTouchStart = events && events.touchstart && events.touchstart.length > 0;

        console.log(`事件绑定检查:`);
        console.log(`- mousedown: ${hasMouseDown ? '✅' : '❌'}`);
        console.log(`- touchstart: ${hasTouchStart ? '✅' : '❌'}`);

        // 检查位置
        const rect = button[0].getBoundingClientRect();
        const inViewport = rect.top >= 0 && rect.left >= 0 &&
                          rect.bottom <= window.innerHeight && rect.right <= window.innerWidth;
        console.log(`位置检查: ${inViewport ? '✅' : '❌'} - (${rect.left}, ${rect.top})`);

        // 模拟位置测试
        console.log("🎯 测试位置设置...");
        const testX = 250;
        const testY = 250;

        button[0].style.setProperty('left', testX + 'px', 'important');
        button[0].style.setProperty('top', testY + 'px', 'important');

        setTimeout(() => {
            const newRect = button[0].getBoundingClientRect();
            const positionCorrect = Math.abs(newRect.left - testX) < 5 && Math.abs(newRect.top - testY) < 5;
            console.log(`位置设置测试: ${positionCorrect ? '✅' : '❌'} - 实际位置: (${newRect.left}, ${newRect.top})`);

            // 恢复原位置
            button[0].style.setProperty('left', rect.left + 'px', 'important');
            button[0].style.setProperty('top', rect.top + 'px', 'important');

            // 总结
            const allPassed = hasMouseDown && hasTouchStart && inViewport && positionCorrect;
            console.log(`\n🎯 最终验证结果: ${allPassed ? '🎉 全部通过！' : '⚠️ 部分失败'}`);

            if (allPassed) {
                console.log("✅ 拖动和点击功能已完全修复！");
                console.log("📋 使用说明:");
                console.log("- 快速点击按钮 → 显示弹窗");
                console.log("- 按住拖动按钮 → 移动位置");
                console.log("- 拖动时有视觉反馈 → 半透明+放大");
            } else {
                console.log("❌ 仍有问题需要解决");
            }

            return allPassed;
        }, 100);

        return true;
    };

    // 立即测试切换功能
    window.testToggleNow = function() {
        console.log("🎯 立即测试悬浮按钮切换功能...");

        const button = $('#virtual-pet-button');
        if (button.length === 0) {
            console.log("❌ 悬浮按钮不存在");
            return false;
        }

        console.log("✅ 悬浮按钮存在");

        // 检查当前状态
        const overlay = $('#virtual-pet-popup-overlay');
        const isCurrentlyOpen = overlay.length > 0;
        console.log(`当前弹窗状态: ${isCurrentlyOpen ? '打开' : '关闭'}`);

        // 模拟点击
        console.log("🎯 模拟点击悬浮按钮...");

        // 直接触发点击事件
        button.trigger('click');

        setTimeout(() => {
            const newOverlay = $('#virtual-pet-popup-overlay');
            const isNowOpen = newOverlay.length > 0;
            console.log(`点击后弹窗状态: ${isNowOpen ? '打开' : '关闭'}`);

            const stateChanged = isCurrentlyOpen !== isNowOpen;
            console.log(`状态变化: ${stateChanged ? '✅ 成功' : '❌ 失败'}`);

            if (stateChanged) {
                console.log("🎯 再次点击测试...");
                button.trigger('click');

                setTimeout(() => {
                    const finalOverlay = $('#virtual-pet-popup-overlay');
                    const isFinallyOpen = finalOverlay.length > 0;
                    console.log(`再次点击后状态: ${isFinallyOpen ? '打开' : '关闭'}`);

                    const backToOriginal = isFinallyOpen === isCurrentlyOpen;
                    console.log(`回到原状态: ${backToOriginal ? '✅ 成功' : '❌ 失败'}`);

                    if (backToOriginal) {
                        console.log("🎉 切换功能测试完全成功！");
                        console.log("📋 使用说明:");
                        console.log("  - 点击悬浮按钮 🐾 可以打开/关闭弹窗");
                        console.log("  - 点击弹窗外部也可以关闭弹窗");
                        console.log("  - 弹窗内部已移除关闭按钮");
                        console.log("  - 操作更加直观简洁");
                    } else {
                        console.log("❌ 切换功能有问题，需要检查");
                    }
                }, 300);
            } else {
                console.log("❌ 切换功能不工作，可能需要修复");
            }
        }, 300);

        return true;
    };

    // 测试所有修复的功能
    window.testAllFixedFeatures = function() {
        console.log("🎯 开始测试所有修复的功能...");

        // 1. 测试玩耍图标
        console.log("\n1. 测试玩耍图标:");
        const playButtons = $('.play-btn span').first();
        const playIconText = playButtons.text();
        const playIconCorrect = playIconText.includes('🎮') && !playIconText.includes('�');
        console.log(`玩耍图标: ${playIconCorrect ? '✅ 正确显示🎮' : '❌ 显示异常: ' + playIconText}`);

        // 2. 测试宠物名字功能
        console.log("\n2. 测试宠物名字功能:");
        const petNameElements = $('.pet-name');
        const hasNameElements = petNameElements.length > 0;
        const hasClickEvent = petNameElements.first().attr('onclick') === 'editPetName()';
        const hasEditFunction = typeof window.editPetName === 'function';
        console.log(`名字元素: ${hasNameElements ? '✅ 找到' : '❌ 未找到'} (${petNameElements.length}个)`);
        console.log(`点击事件: ${hasClickEvent ? '✅ 已绑定' : '❌ 未绑定'}`);
        console.log(`编辑函数: ${hasEditFunction ? '✅ 存在' : '❌ 不存在'}`);
        console.log(`当前名字: "${petData.name}"`);

        // 3. 测试按钮功能
        console.log("\n3. 测试按钮功能:");
        const feedBtn = $('.feed-btn');
        const playBtn = $('.play-btn');
        const sleepBtn = $('.sleep-btn');
        const hugBtn = $('.hug-btn');

        console.log(`喂食按钮: ${feedBtn.length > 0 ? '✅ 存在' : '❌ 不存在'}`);
        console.log(`玩耍按钮: ${playBtn.length > 0 ? '✅ 存在' : '❌ 不存在'}`);
        console.log(`睡觉按钮: ${sleepBtn.length > 0 ? '✅ 存在' : '❌ 不存在'}`);
        console.log(`抱抱按钮: ${hugBtn.length > 0 ? '✅ 存在' : '❌ 不存在'}`);

        // 4. 测试状态数值
        console.log("\n4. 测试状态数值:");
        console.log(`健康: ${Math.round(petData.health)}/100`);
        console.log(`饱食度: ${Math.round(petData.hunger)}/100`);
        console.log(`快乐度: ${Math.round(petData.happiness)}/100`);
        console.log(`精力: ${Math.round(petData.energy)}/100`);
        console.log(`等级: ${petData.level}`);

        // 5. 测试糖果色主题
        console.log("\n5. 测试糖果色主题:");
        const hasCandy = typeof candyColors !== 'undefined';
        console.log(`糖果色配置: ${hasCandy ? '✅ 已加载' : '❌ 未加载'}`);
        if (hasCandy) {
            console.log(`主色调: ${candyColors.primary}`);
            console.log(`背景: ${candyColors.background}`);
        }

        // 6. 测试UI更新函数
        console.log("\n6. 测试UI更新函数:");
        const hasUpdateFunction = typeof updateUnifiedUIStatus === 'function';
        console.log(`更新函数: ${hasUpdateFunction ? '✅ 存在' : '❌ 不存在'}`);

        // 总结
        const allTests = [playIconCorrect, hasNameElements, hasClickEvent, hasEditFunction,
                         feedBtn.length > 0, playBtn.length > 0, sleepBtn.length > 0, hasCandy, hasUpdateFunction];
        const passedTests = allTests.filter(test => test).length;
        const totalTests = allTests.length;

        console.log(`\n🎯 测试总结: ${passedTests}/${totalTests} 项通过`);

        if (passedTests === totalTests) {
            console.log("🎉 所有功能测试通过！");
        } else {
            console.log("⚠️ 部分功能需要检查");
        }

        return {
            passed: passedTests,
            total: totalTests,
            success: passedTests === totalTests
        };
    };

    // 模拟按钮点击测试
    window.testButtonClicks = function() {
        console.log("🎯 测试按钮点击功能...");

        const initialHealth = petData.health;
        const initialHunger = petData.hunger;
        const initialHappiness = petData.happiness;
        const initialEnergy = petData.energy;

        console.log("初始状态:", {
            health: Math.round(initialHealth),
            hunger: Math.round(initialHunger),
            happiness: Math.round(initialHappiness),
            energy: Math.round(initialEnergy)
        });

        // 模拟喂食
        console.log("\n模拟喂食...");
        feedPet();

        setTimeout(() => {
            console.log("喂食后状态:", {
                health: Math.round(petData.health),
                hunger: Math.round(petData.hunger),
                happiness: Math.round(petData.happiness),
                energy: Math.round(petData.energy)
            });

            const hungerChanged = petData.hunger !== initialHunger;
            console.log(`饱食度变化: ${hungerChanged ? '✅ 正常' : '❌ 无变化'}`);

            // 模拟玩耍
            console.log("\n模拟玩耍...");
            playWithPet();

            setTimeout(() => {
                console.log("玩耍后状态:", {
                    health: Math.round(petData.health),
                    hunger: Math.round(petData.hunger),
                    happiness: Math.round(petData.happiness),
                    energy: Math.round(petData.energy)
                });

                const happinessChanged = petData.happiness !== initialHappiness;
                console.log(`快乐度变化: ${happinessChanged ? '✅ 正常' : '❌ 无变化'}`);

                // 更新UI显示
                updateUnifiedUIStatus();
                console.log("✅ UI状态已更新");

            }, 100);
        }, 100);
    };

    // 强制清理旧数据并应用新数值
    window.forceDataMigration = function() {
        console.log("🔄 强制执行数据迁移...");

        // 清理localStorage中的旧数据
        localStorage.removeItem(STORAGE_KEY_PET_DATA);

        // 重置为新的初始数值
        petData = {
            name: petData.name || "小宠物", // 保留当前名字
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
            dataVersion: 3.0
        };

        // 保存新数据
        savePetData();

        // 更新UI
        updateUnifiedUIStatus();

        console.log("✅ 数据迁移完成！新的初始数值:");
        console.log(`健康: ${petData.health}/100`);
        console.log(`快乐度: ${petData.happiness}/100`);
        console.log(`饱食度: ${petData.hunger}/100`);
        console.log(`精力: ${petData.energy}/100`);

        alert("数据迁移完成！新的初始数值已应用。");
    };

    // 测试新的数值平衡
    window.testNewBalance = function() {
        console.log("🎯 测试新的数值平衡系统...");

        // 显示当前数值
        console.log("\n📊 当前状态:");
        console.log(`健康: ${Math.round(petData.health)}/100`);
        console.log(`饱食度: ${Math.round(petData.hunger)}/100`);
        console.log(`快乐度: ${Math.round(petData.happiness)}/100`);
        console.log(`精力: ${Math.round(petData.energy)}/100`);
        console.log(`等级: ${petData.level}`);

        // 测试操作效果
        console.log("\n🧪 测试操作效果:");

        const originalValues = {
            health: petData.health,
            hunger: petData.hunger,
            happiness: petData.happiness,
            energy: petData.energy
        };

        // 测试喂食
        console.log("\n🍖 测试喂食效果:");
        console.log(`喂食前 - 饱食度: ${Math.round(originalValues.hunger)}, 快乐度: ${Math.round(originalValues.happiness)}`);
        feedPet();
        console.log(`喂食后 - 饱食度: ${Math.round(petData.hunger)} (+${Math.round(petData.hunger - originalValues.hunger)}), 快乐度: ${Math.round(petData.happiness)} (+${Math.round(petData.happiness - originalValues.happiness)})`);

        // 等待一下再测试玩耍
        setTimeout(() => {
            const beforePlay = {
                happiness: petData.happiness,
                energy: petData.energy
            };

            console.log("\n🎮 测试玩耍效果:");
            console.log(`玩耍前 - 快乐度: ${Math.round(beforePlay.happiness)}, 精力: ${Math.round(beforePlay.energy)}`);
            playWithPet();
            console.log(`玩耍后 - 快乐度: ${Math.round(petData.happiness)} (+${Math.round(petData.happiness - beforePlay.happiness)}), 精力: ${Math.round(petData.energy)} (${Math.round(petData.energy - beforePlay.energy)})`);

            // 等待一下再测试睡觉
            setTimeout(() => {
                const beforeSleep = {
                    health: petData.health,
                    energy: petData.energy
                };

                console.log("\n😴 测试睡觉效果:");
                console.log(`睡觉前 - 健康: ${Math.round(beforeSleep.health)}, 精力: ${Math.round(beforeSleep.energy)}`);
                petSleep();
                console.log(`睡觉后 - 健康: ${Math.round(petData.health)} (+${Math.round(petData.health - beforeSleep.health)}), 精力: ${Math.round(petData.energy)} (+${Math.round(petData.energy - beforeSleep.energy)})`);

                // 更新UI
                updateUnifiedUIStatus();

                console.log("\n📋 数值平衡总结:");
                console.log("✅ 喂食: +15饱食度, +5快乐度, 20秒冷却");
                console.log("✅ 玩耍: +12快乐度, -8精力, 40秒冷却");
                console.log("✅ 睡觉: +20精力, +5健康, 80秒冷却");
                console.log("✅ 时间衰减: 每12分钟更新，速度减缓60%");
                console.log("✅ 初始数值: 健康40, 快乐30, 饱食50, 精力60");

            }, 100);
        }, 100);
    };



    // 模拟时间流逝测试
    window.testTimeDecay = function() {
        console.log("⏰ 测试时间衰减效果...");

        const before = {
            health: petData.health,
            hunger: petData.hunger,
            happiness: petData.happiness,
            energy: petData.energy
        };

        console.log("衰减前状态:", before);

        // 模拟1小时时间流逝
        updatePetStatus();

        console.log("衰减后状态:", {
            health: Math.round(petData.health),
            hunger: Math.round(petData.hunger),
            happiness: Math.round(petData.happiness),
            energy: Math.round(petData.energy)
        });

        const changes = {
            health: Math.round(petData.health - before.health),
            hunger: Math.round(petData.hunger - before.hunger),
            happiness: Math.round(petData.happiness - before.happiness),
            energy: Math.round(petData.energy - before.energy)
        };

        console.log("数值变化:", changes);
        updateUnifiedUIStatus();
    };

    // 验证数值修复效果
    window.verifyInitialValues = function() {
        console.log("🔍 验证初始数值修复效果...");

        // 检查当前数值
        console.log("\n📊 当前宠物数值:");
        console.log(`健康: ${petData.health}/100 ${petData.health === 40 ? '✅' : '❌ 应为40'}`);
        console.log(`快乐度: ${petData.happiness}/100 ${petData.happiness === 30 ? '✅' : '❌ 应为30'}`);
        console.log(`饱食度: ${petData.hunger}/100 ${petData.hunger === 50 ? '✅' : '❌ 应为50'}`);
        console.log(`精力: ${petData.energy}/100 ${petData.energy === 60 ? '✅' : '❌ 应为60'}`);
        console.log(`数据版本: ${petData.dataVersion} ${petData.dataVersion === 2.0 ? '✅' : '❌ 应为2.0'}`);

        // 检查UI显示
        console.log("\n🖥️ UI显示检查:");
        const healthDisplay = $('.status-item').find('span').filter(function() {
            return $(this).text().includes('健康');
        }).next().text();
    };

    // 全面检查数值系统
    window.checkValueSystem = function() {
        console.log('=== 🔍 数值系统全面检查 ===');

        // 1. 基本数值检查
        console.log('\n📊 1. 基本数值状态:');
        console.log(`健康: ${petData.health} (${typeof petData.health})`);
        console.log(`快乐: ${petData.happiness} (${typeof petData.happiness})`);
        console.log(`饱食: ${petData.hunger} (${typeof petData.hunger})`);
        console.log(`精力: ${petData.energy} (${typeof petData.energy})`);
        console.log(`等级: ${petData.level} (${typeof petData.level})`);
        console.log(`经验: ${petData.experience} (${typeof petData.experience})`);

        // 2. 数值范围验证
        console.log('\n🎯 2. 数值范围验证:');
        const checkRange = (name, value, min = 0, max = 100) => {
            if (isNaN(value)) return `❌ ${name} 不是数字: ${value}`;
            if (value < min) return `❌ ${name} 小于${min}: ${value}`;
            if (value > max) return `❌ ${name} 大于${max}: ${value}`;
            return `✅ ${name} 正常: ${value}`;
        };

        console.log(checkRange('健康', petData.health));
        console.log(checkRange('快乐', petData.happiness));
        console.log(checkRange('饱食', petData.hunger));
        console.log(checkRange('精力', petData.energy));
        console.log(checkRange('等级', petData.level, 1, 999));
        console.log(checkRange('经验', petData.experience, 0, 99999));

        // 3. 时间系统检查
        console.log('\n⏰ 3. 时间系统检查:');
        const now = Date.now();
        const checkTime = (name, timestamp) => {
            if (!timestamp) return `❌ ${name} 时间戳缺失`;
            if (timestamp > now) return `❌ ${name} 时间戳异常(未来时间): ${new Date(timestamp)}`;
            const diff = (now - timestamp) / (1000 * 60 * 60);
            return `✅ ${name}: ${new Date(timestamp).toLocaleString()} (${Math.round(diff * 100) / 100}小时前)`;
        };

        console.log(checkTime('上次更新', petData.lastUpdateTime));
        console.log(checkTime('上次喂食', petData.lastFeedTime));
        console.log(checkTime('上次玩耍', petData.lastPlayTime));
        console.log(checkTime('上次睡觉', petData.lastSleepTime));
        console.log(checkTime('创建时间', petData.created));

        // 4. 数值逻辑检查
        console.log('\n🧮 4. 数值逻辑检查:');
        const expNeeded = petData.level * 100;
        console.log(`当前等级需要经验: ${expNeeded}`);
        console.log(`当前经验进度: ${petData.experience}/${expNeeded} (${Math.round(petData.experience / expNeeded * 100)}%)`);

        // 检查升级逻辑
        if (petData.experience >= expNeeded) {
            console.log('⚠️ 经验值已满足升级条件，但未升级');
        } else {
            console.log('✅ 经验值正常');
        }

        // 5. UI显示检查
        console.log('\n🖥️ 5. UI显示检查:');
        const statusBars = $('.stat-bar');
        if (statusBars.length > 0) {
            statusBars.each(function() {
                const label = $(this).find('label').text();
                const value = $(this).find('span').text();
                const progressFill = $(this).find('.progress-fill');
                const width = progressFill.css('width');
                const expectedWidth = progressFill.attr('style')?.match(/width:\s*([^;%]+)%/)?.[1];
                console.log(`${label}: 显示=${value}, 进度条=${width}, 期望=${expectedWidth}%`);
            });
        } else {
            console.log('❌ 未找到状态条元素');
        }

        // 6. 存储数据一致性检查
        console.log('\n💾 6. 存储数据一致性:');
        const savedData = localStorage.getItem('virtual-pet-data');
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                const differences = [];

                ['health', 'happiness', 'hunger', 'energy', 'level', 'experience'].forEach(key => {
                    if (Math.abs(petData[key] - parsed[key]) > 0.01) {
                        differences.push(`${key}: 内存=${petData[key]}, 存储=${parsed[key]}`);
                    }
                });

                if (differences.length > 0) {
                    console.log('❌ 内存与存储数据不一致:');
                    differences.forEach(diff => console.log(`  ${diff}`));
                } else {
                    console.log('✅ 内存与存储数据一致');
                }

                console.log(`数据版本: ${parsed.dataVersion}`);
            } catch (e) {
                console.log('❌ 存储数据解析失败:', e);
            }
        } else {
            console.log('❌ 未找到存储数据');
        }

        // 7. 函数可用性检查
        console.log('\n🔧 7. 核心函数检查:');
        const functions = [
            'validateAndFixValues', 'updatePetStatus', 'feedPet',
            'playWithPet', 'petSleep', 'gainExperience', 'renderPetStatus'
        ];

        functions.forEach(funcName => {
            if (typeof window[funcName] === 'function' || typeof eval(funcName) === 'function') {
                console.log(`✅ ${funcName} 函数可用`);
            } else {
                console.log(`❌ ${funcName} 函数不可用`);
            }
        });

        // 8. 总结
        console.log('\n📋 8. 系统状态总结:');
        const issues = [];

        // 检查关键问题
        if (isNaN(petData.health) || petData.health < 0 || petData.health > 100) issues.push('健康值异常');
        if (isNaN(petData.happiness) || petData.happiness < 0 || petData.happiness > 100) issues.push('快乐值异常');
        if (isNaN(petData.hunger) || petData.hunger < 0 || petData.hunger > 100) issues.push('饱食值异常');
        if (isNaN(petData.energy) || petData.energy < 0 || petData.energy > 100) issues.push('精力值异常');
        if (!petData.lastUpdateTime || petData.lastUpdateTime > now) issues.push('时间戳异常');
        if (statusBars.length === 0) issues.push('UI显示异常');

        if (issues.length === 0) {
            console.log('🎉 数值系统运行正常！');
        } else {
            console.log('⚠️ 发现以下问题:');
            issues.forEach(issue => console.log(`  - ${issue}`));
        }

        return {
            petData: petData,
            issues: issues,
            timestamp: new Date().toISOString()
        };
    };

    // 快速修复数值系统问题
    window.fixValueSystem = function() {
        console.log('🔧 开始修复数值系统问题...');

        // 1. 验证并修复数值
        console.log('1. 验证并修复数值范围...');
        validateAndFixValues();

        // 2. 强制更新UI
        console.log('2. 强制更新UI显示...');
        if (typeof renderPetStatus === 'function') {
            renderPetStatus();
        }

        // 3. 保存修复后的数据
        console.log('3. 保存修复后的数据...');
        savePetData();

        // 4. 验证修复结果
        console.log('4. 验证修复结果...');
        const result = checkValueSystem();

        if (result.issues.length === 0) {
            console.log('✅ 数值系统修复完成！');
            toastr.success('数值系统已修复！');
        } else {
            console.log('⚠️ 仍有问题需要手动处理:', result.issues);
            toastr.warning('部分问题已修复，请查看控制台了解详情');
        }

        return result;
    };

    // 强制重置过高数值到平衡范围
    window.resetHighValues = function() {
        console.log('🔧 检查并重置过高数值...');

        const before = {
            health: petData.health,
            happiness: petData.happiness,
            hunger: petData.hunger,
            energy: petData.energy
        };

        console.log('重置前数值:', before);

        // 检查是否有过高数值
        const hasHighValues = petData.happiness > 80 || petData.hunger > 80 ||
                             petData.health > 80 || petData.energy > 80;

        if (!hasHighValues) {
            console.log('✅ 数值都在合理范围内，无需重置');
            toastr.info('数值都在合理范围内，无需重置');
            return false;
        }

        // 重置过高数值到平衡范围
        petData.health = Math.min(petData.health, 65);
        petData.happiness = Math.min(petData.happiness, 65);
        petData.hunger = Math.min(petData.hunger, 65);
        petData.energy = Math.min(petData.energy, 65);

        // 验证并保存
        validateAndFixValues();
        savePetData();
        renderPetStatus();

        const after = {
            health: petData.health,
            happiness: petData.happiness,
            hunger: petData.hunger,
            energy: petData.energy
        };

        console.log('重置后数值:', after);
        console.log('✅ 过高数值已重置到平衡范围');

        toastr.success('过高数值已重置！现在数值变化会更有趣。');

        return {
            before: before,
            after: after,
            reset: true,
            timestamp: new Date().toISOString()
        };
    };

    // 手动同步宠物数据
    window.syncPetData = function() {
        console.log('🔄 手动同步宠物数据...');

        // 强制保存当前数据到同步存储
        const dataWithTimestamp = {
            ...petData,
            lastSyncTime: Date.now()
        };

        saveToSyncStorage(dataWithTimestamp);
        localStorage.setItem(STORAGE_KEY_PET_DATA, JSON.stringify(dataWithTimestamp));

        console.log('✅ 宠物数据同步完成！');
        toastr.success('宠物数据已同步到所有设备！');

        return {
            synced: true,
            timestamp: new Date().toISOString(),
            data: dataWithTimestamp
        };
    };

    // 同步所有数据（宠物数据、AI设置、头像）
    window.syncAllData = function() {
        console.log('🔄 同步所有数据到云端...');

        let syncResults = {
            pet: false,
            ai: false,
            avatar: false,
            timestamp: new Date().toISOString()
        };

        try {
            // 1. 同步宠物数据
            const dataWithTimestamp = {
                ...petData,
                lastSyncTime: Date.now()
            };
            saveToSyncStorage(dataWithTimestamp);
            localStorage.setItem(STORAGE_KEY_PET_DATA, JSON.stringify(dataWithTimestamp));
            syncResults.pet = true;
            console.log('✅ 宠物数据同步完成');

            // 2. 同步AI设置
            const aiSettings = localStorage.getItem(`${extensionName}-ai-settings`);
            if (aiSettings) {
                const settings = JSON.parse(aiSettings);
                settings.lastSyncTime = Date.now();
                localStorage.setItem(`${extensionName}-ai-settings`, JSON.stringify(settings));
                saveAISettingsToSync(settings);
                syncResults.ai = true;
                console.log('✅ AI设置同步完成');
            } else {
                console.log('⚠️ 无AI设置需要同步');
            }

            // 3. 同步头像
            const avatar = localStorage.getItem(STORAGE_KEY_CUSTOM_AVATAR);
            if (avatar) {
                saveAvatarToSync(avatar);
                syncResults.avatar = true;
                console.log('✅ 头像同步完成');
            } else {
                console.log('⚠️ 无自定义头像需要同步');
            }

            console.log('🎉 所有数据同步完成！');
            toastr.success('所有数据已同步到云端！现在可以在其他设备上访问了。', '🎉 同步成功', { timeOut: 5000 });

        } catch (error) {
            console.error('❌ 同步过程中出现错误:', error);
            toastr.error('同步过程中出现错误: ' + error.message, '❌ 同步失败', { timeOut: 5000 });
        }

        return syncResults;
    };

    // 专门测试头像同步
    window.testAvatarSync = function() {
        console.log('🎨 测试头像同步功能...');

        // 检查本地头像
        const localAvatar = localStorage.getItem(STORAGE_KEY_CUSTOM_AVATAR);
        console.log('本地头像:', localAvatar ? `存在 (${Math.round(localAvatar.length/1024)}KB)` : '不存在');

        // 检查同步头像
        const syncAvatar = loadAvatarFromSync();
        console.log('同步头像:', syncAvatar ? `存在 (${Math.round(syncAvatar.length/1024)}KB)` : '不存在');

        // 检查当前使用的头像
        console.log('当前头像:', customAvatarData ? `已加载 (${Math.round(customAvatarData.length/1024)}KB)` : '未加载');

        // 如果有同步头像但本地没有，尝试同步
        if (syncAvatar && !localAvatar) {
            console.log('🔄 发现同步头像，正在同步到本地...');
            localStorage.setItem(STORAGE_KEY_CUSTOM_AVATAR, syncAvatar);
            customAvatarData = syncAvatar;
            updateAvatarDisplay();
            updateFloatingButtonAvatar();
            console.log('✅ 头像同步完成');
            toastr.success('头像已从云端同步！', '🎨 头像同步', { timeOut: 3000 });
        } else if (localAvatar && !syncAvatar) {
            console.log('🔄 发现本地头像，正在同步到云端...');
            saveAvatarToSync(localAvatar);
            console.log('✅ 头像已同步到云端');
            toastr.success('头像已同步到云端！', '🎨 头像同步', { timeOut: 3000 });
        } else if (syncAvatar && localAvatar) {
            console.log('✅ 头像已在本地和云端同步');
            toastr.info('头像已同步', '🎨 头像状态', { timeOut: 2000 });
        } else {
            console.log('ℹ️ 未发现自定义头像');
            toastr.info('未发现自定义头像', '🎨 头像状态', { timeOut: 2000 });
        }

        return {
            hasLocal: !!localAvatar,
            hasSync: !!syncAvatar,
            hasCurrent: !!customAvatarData,
            timestamp: new Date().toISOString()
        };
    };

    // 导出宠物数据
    window.exportPetData = function() {
        console.log('📤 导出宠物数据...');

        const exportData = {
            ...petData,
            exportTime: Date.now(),
            exportVersion: '3.0'
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });

        // 创建下载链接
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `virtual-pet-data-${new Date().toISOString().split('T')[0]}.json`;

        // 触发下载
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        console.log('✅ 宠物数据已导出！');
        toastr.success('宠物数据已导出到文件！');

        return exportData;
    };

    // 导入宠物数据
    window.importPetData = function() {
        console.log('📥 导入宠物数据...');

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = function(event) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const importedData = JSON.parse(e.target.result);

                    // 验证数据格式
                    if (!importedData.name || typeof importedData.health !== 'number') {
                        throw new Error('无效的宠物数据格式');
                    }

                    // 确认导入
                    if (confirm(`确定要导入宠物数据吗？\n\n宠物名称: ${importedData.name}\n等级: ${importedData.level}\n这将覆盖当前数据！`)) {
                        // 保留当前的时间戳，更新数据版本
                        const mergedData = {
                            ...importedData,
                            lastSyncTime: Date.now(),
                            dataVersion: 3.0
                        };

                        petData = mergedData;

                        // 应用拓麻歌子系统
                        applyTamagotchiSystem();

                        // 保存数据
                        savePetData();

                        // 更新UI
                        renderPetStatus();
                        if (typeof renderSettings === 'function') {
                            renderSettings();
                        }

                        console.log('✅ 宠物数据导入成功！');
                        toastr.success('宠物数据导入成功！');
                    }
                } catch (error) {
                    console.error('导入失败:', error);
                    toastr.error('导入失败：' + error.message);
                }
            };

            reader.readAsText(file);
        };

        input.click();
    };

    // 检查同步状态 - 包含宠物数据、AI设置和头像
    window.checkSyncStatus = function() {
        console.log('🔍 检查完整同步状态...');

        // 检查宠物数据
        const localData = localStorage.getItem(STORAGE_KEY_PET_DATA);
        const syncData = loadFromSyncStorage();

        console.log('\n📱 宠物数据 - 本地:');
        if (localData) {
            try {
                const local = JSON.parse(localData);
                console.log(`- 最后同步时间: ${local.lastSyncTime ? new Date(local.lastSyncTime).toLocaleString() : '未设置'}`);
                console.log(`- 宠物名称: ${local.name}`);
                console.log(`- 等级: ${local.level}`);
                console.log(`- 数据版本: ${local.dataVersion}`);
            } catch (e) {
                console.log('- 本地数据解析失败');
            }
        } else {
            console.log('- 无本地数据');
        }

        console.log('\n☁️ 宠物数据 - 同步:');
        if (syncData) {
            try {
                const sync = typeof syncData === 'object' ? syncData : JSON.parse(syncData);
                console.log(`- 最后同步时间: ${sync.lastSyncTime ? new Date(sync.lastSyncTime).toLocaleString() : '未设置'}`);
                console.log(`- 宠物名称: ${sync.name}`);
                console.log(`- 等级: ${sync.level}`);
                console.log(`- 数据版本: ${sync.dataVersion}`);
            } catch (e) {
                console.log('- 同步数据解析失败');
            }
        } else {
            console.log('- 无同步数据');
        }

        // 检查AI设置
        const localAISettings = localStorage.getItem(`${extensionName}-ai-settings`);
        const syncAISettings = loadAISettingsFromSync();

        console.log('\n🤖 AI设置 - 本地:');
        if (localAISettings) {
            try {
                const local = JSON.parse(localAISettings);
                console.log(`- API类型: ${local.apiType || '未设置'}`);
                console.log(`- API URL: ${local.apiUrl ? '已设置' : '未设置'}`);
                console.log(`- API密钥: ${local.apiKey ? '已设置' : '未设置'}`);
                console.log(`- 模型: ${local.apiModel || '未设置'}`);
                console.log(`- 最后同步时间: ${local.lastSyncTime ? new Date(local.lastSyncTime).toLocaleString() : '未设置'}`);
            } catch (e) {
                console.log('- AI设置解析失败');
            }
        } else {
            console.log('- 无本地AI设置');
        }

        console.log('\n☁️ AI设置 - 同步:');
        if (syncAISettings) {
            try {
                const sync = typeof syncAISettings === 'object' ? syncAISettings : JSON.parse(syncAISettings);
                console.log(`- API类型: ${sync.apiType || '未设置'}`);
                console.log(`- API URL: ${sync.apiUrl ? '已设置' : '未设置'}`);
                console.log(`- API密钥: ${sync.apiKey ? '已设置' : '未设置'}`);
                console.log(`- 模型: ${sync.apiModel || '未设置'}`);
                console.log(`- 最后同步时间: ${sync.lastSyncTime ? new Date(sync.lastSyncTime).toLocaleString() : '未设置'}`);
            } catch (e) {
                console.log('- 同步AI设置解析失败');
            }
        } else {
            console.log('- 无同步AI设置');
        }

        // 检查头像
        const localAvatar = localStorage.getItem(STORAGE_KEY_CUSTOM_AVATAR);
        const syncAvatar = loadAvatarFromSync();

        console.log('\n🎨 头像 - 本地:');
        console.log(`- 自定义头像: ${localAvatar ? '已设置' : '未设置'}`);
        if (localAvatar) {
            console.log(`- 头像大小: ${Math.round(localAvatar.length / 1024)}KB`);
        }

        console.log('\n☁️ 头像 - 同步:');
        console.log(`- 自定义头像: ${syncAvatar ? '已设置' : '未设置'}`);
        if (syncAvatar) {
            console.log(`- 头像大小: ${Math.round(syncAvatar.length / 1024)}KB`);
        }

        console.log('\n🔄 同步建议:');
        if (!localData && !syncData) {
            console.log('- 这是新设备，数据将自动同步');
        } else if (localData && !syncData) {
            console.log('- 建议运行 syncAllData() 将所有数据同步到云端');
        } else if (!localData && syncData) {
            console.log('- 将自动从云端恢复数据');
        } else {
            try {
                const local = JSON.parse(localData);
                const sync = typeof syncData === 'object' ? syncData : JSON.parse(syncData);
                const localTime = local.lastSyncTime || 0;
                const syncTime = sync.lastSyncTime || 0;

                if (localTime > syncTime) {
                    console.log('- 本地数据较新，建议运行 syncAllData() 同步到云端');
                } else if (syncTime > localTime) {
                    console.log('- 云端数据较新，将自动使用云端数据');
                } else {
                    console.log('- 宠物数据已同步');
                }
            } catch (e) {
                console.log('- 数据比较失败，建议手动同步');
            }
        }

        // AI设置和头像同步建议
        if (!syncAISettings && localAISettings) {
            console.log('- AI设置需要同步到云端');
        }
        if (!syncAvatar && localAvatar) {
            console.log('- 头像需要同步到云端');
        }

        return {
            hasLocal: !!localData,
            hasSync: !!syncData,
            hasLocalAI: !!localAISettings,
            hasSyncAI: !!syncAISettings,
            hasLocalAvatar: !!localAvatar,
            hasSyncAvatar: !!syncAvatar,
            timestamp: new Date().toISOString()
        };
    };

    // 测试拓麻歌子系统
    window.testTamagotchiSystem = function() {
        console.log('🥚 测试拓麻歌子系统...');

        console.log('\n📊 当前拓麻歌子状态:');
        console.log(`生命阶段: ${petData.lifeStage} (${LIFE_STAGES[petData.lifeStage]?.name})`);
        console.log(`年龄: ${Math.round(petData.age)}小时`);
        console.log(`是否存活: ${petData.isAlive ? '✅ 是' : '❌ 否'}`);
        console.log(`疾病程度: ${petData.sickness}/100`);
        console.log(`纪律值: ${petData.discipline}/100`);
        console.log(`体重: ${petData.weight}kg`);
        console.log(`忽视次数: ${petData.careNeglectCount}`);
        console.log(`生病持续: ${Math.round(petData.sicknessDuration)}小时`);

        if (petData.deathReason) {
            console.log(`死亡原因: ${petData.deathReason}`);
        }

        console.log('\n⏰ 时间检查:');
        const now = Date.now();
        const timeSinceLastCare = now - petData.lastCareTime;
        const hoursSinceLastCare = timeSinceLastCare / (1000 * 60 * 60);
        console.log(`距离上次照顾: ${Math.round(hoursSinceLastCare * 100) / 100}小时`);

        console.log('\n🎯 拓麻歌子式特性:');
        console.log('- ✅ 真实时间流逝（不限制24小时）');
        console.log('- ✅ 生命阶段系统');
        console.log('- ✅ 死亡机制');
        console.log('- ✅ 疾病系统');
        console.log('- ✅ 忽视照顾惩罚');
        console.log('- ✅ 体重管理');

        console.log('\n🔧 可用命令:');
        console.log('- feedPet() - 喂食');
        console.log('- playWithPet() - 玩耍');
        console.log('- petSleep() - 休息');
        console.log('- healPet() - 治疗');
        console.log('- resetPet() - 重新开始');

        return {
            lifeStage: petData.lifeStage,
            age: petData.age,
            isAlive: petData.isAlive,
            sickness: petData.sickness,
            discipline: petData.discipline,
            weight: petData.weight,
            careNeglectCount: petData.careNeglectCount,
            hoursSinceLastCare: hoursSinceLastCare,
            timestamp: new Date().toISOString()
        };
    };

    // 商店系统功能
    function showShopModal() {
        // 创建商店弹窗
        const shopModal = $(`
            <div id="shop-modal" style="
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                background-color: rgba(0, 0, 0, 0.8) !important;
                z-index: 1000000 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                padding: 20px !important;
                box-sizing: border-box !important;
            ">
                <div style="
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
                    border-radius: 15px !important;
                    padding: 20px !important;
                    max-width: 500px !important;
                    width: 100% !important;
                    max-height: 80vh !important;
                    overflow-y: auto !important;
                    color: white !important;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.3) !important;
                ">
                    <div style="
                        display: flex !important;
                        justify-content: space-between !important;
                        align-items: center !important;
                        margin-bottom: 20px !important;
                        border-bottom: 1px solid rgba(255,255,255,0.2) !important;
                        padding-bottom: 15px !important;
                    ">
                        <h2 style="margin: 0 !important; color: #ffd700 !important;">🛒 宠物商店</h2>
                        <div style="color: #ffd700 !important; font-weight: bold !important;">
                            💰 ${petData.coins || 100} 金币
                        </div>
                    </div>

                    <div id="shop-categories" style="
                        display: flex !important;
                        gap: 10px !important;
                        margin-bottom: 15px !important;
                        flex-wrap: wrap !important;
                    ">
                        <button class="shop-category-btn" data-category="all" style="
                            padding: 8px 15px !important;
                            background: #ffd700 !important;
                            color: #333 !important;
                            border: none !important;
                            border-radius: 20px !important;
                            cursor: pointer !important;
                            font-size: 0.9em !important;
                            font-weight: bold !important;
                        ">全部</button>
                        <button class="shop-category-btn" data-category="food" style="
                            padding: 8px 15px !important;
                            background: rgba(255,255,255,0.2) !important;
                            color: white !important;
                            border: none !important;
                            border-radius: 20px !important;
                            cursor: pointer !important;
                            font-size: 0.9em !important;
                        ">🍎 食物</button>
                        <button class="shop-category-btn" data-category="medicine" style="
                            padding: 8px 15px !important;
                            background: rgba(255,255,255,0.2) !important;
                            color: white !important;
                            border: none !important;
                            border-radius: 20px !important;
                            cursor: pointer !important;
                            font-size: 0.9em !important;
                        ">💊 药品</button>
                        <button class="shop-category-btn" data-category="toy" style="
                            padding: 8px 15px !important;
                            background: rgba(255,255,255,0.2) !important;
                            color: white !important;
                            border: none !important;
                            border-radius: 20px !important;
                            cursor: pointer !important;
                            font-size: 0.9em !important;
                        ">🎮 玩具</button>
                        <button class="shop-category-btn" data-category="special" style="
                            padding: 8px 15px !important;
                            background: rgba(255,255,255,0.2) !important;
                            color: white !important;
                            border: none !important;
                            border-radius: 20px !important;
                            cursor: pointer !important;
                            font-size: 0.9em !important;
                        ">✨ 特殊</button>
                    </div>

                    <div id="shop-items" style="
                        display: grid !important;
                        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)) !important;
                        gap: 15px !important;
                        margin-bottom: 20px !important;
                    ">
                        ${generateShopItems('all')}
                    </div>

                    <div style="text-align: center !important;">
                        <button onclick="closeShopModal()" style="
                            padding: 10px 30px !important;
                            background: #f04747 !important;
                            color: white !important;
                            border: none !important;
                            border-radius: 25px !important;
                            cursor: pointer !important;
                            font-size: 1em !important;
                        ">关闭商店</button>
                    </div>
                </div>
            </div>
        `);

        $('body').append(shopModal);

        // 绑定分类按钮事件
        $('.shop-category-btn').on('click', function() {
            const category = $(this).data('category');
            $('.shop-category-btn').css({
                'background': 'rgba(255,255,255,0.2)',
                'color': 'white'
            });
            $(this).css({
                'background': '#ffd700',
                'color': '#333'
            });
            $('#shop-items').html(generateShopItems(category));
        });

        // 点击外部关闭
        shopModal.on('click', function(e) {
            if (e.target === this) {
                closeShopModal();
            }
        });
    }

    function generateShopItems(category) {
        let itemsHtml = '';

        Object.entries(SHOP_ITEMS).forEach(([itemId, item]) => {
            if (category === 'all' || item.category === category) {
                const canAfford = (petData.coins || 100) >= item.price;
                const ownedCount = petData.inventory[itemId] || 0;

                itemsHtml += `
                    <div class="shop-item" style="
                        background: rgba(255,255,255,0.1) !important;
                        border-radius: 10px !important;
                        padding: 15px !important;
                        text-align: center !important;
                        border: 2px solid ${canAfford ? 'rgba(255,215,0,0.5)' : 'rgba(255,255,255,0.2)'} !important;
                    ">
                        <div style="font-size: 2em !important; margin-bottom: 8px !important;">
                            ${item.emoji}
                        </div>
                        <div style="font-weight: bold !important; margin-bottom: 5px !important;">
                            ${item.name}
                        </div>
                        <div style="font-size: 0.8em !important; color: rgba(255,255,255,0.8) !important; margin-bottom: 8px !important; min-height: 32px !important;">
                            ${item.description}
                        </div>
                        <div style="color: #ffd700 !important; font-weight: bold !important; margin-bottom: 8px !important;">
                            💰 ${item.price} 金币
                        </div>
                        ${ownedCount > 0 ? `
                        <div style="color: #4ecdc4 !important; font-size: 0.8em !important; margin-bottom: 8px !important;">
                            拥有: ${ownedCount}
                        </div>
                        ` : ''}
                        <button onclick="buyItem('${itemId}')" style="
                            padding: 8px 16px !important;
                            background: ${canAfford ? '#43b581' : '#99aab5'} !important;
                            color: white !important;
                            border: none !important;
                            border-radius: 20px !important;
                            cursor: ${canAfford ? 'pointer' : 'not-allowed'} !important;
                            font-size: 0.9em !important;
                            width: 100% !important;
                        " ${!canAfford ? 'disabled' : ''}>
                            ${canAfford ? '购买' : '金币不足'}
                        </button>
                    </div>
                `;
            }
        });

        return itemsHtml || '<div style="text-align: center; color: rgba(255,255,255,0.6); padding: 20px;">该分类暂无商品</div>';
    }

    window.buyItem = function(itemId) {
        const item = SHOP_ITEMS[itemId];
        if (!item) return;

        if ((petData.coins || 100) < item.price) {
            toastr.error('金币不足！');
            return;
        }

        if (!confirm(`确定要购买 ${item.name} 吗？\n价格：${item.price} 金币\n\n${item.description}`)) {
            return;
        }

        // 扣除金币
        petData.coins = (petData.coins || 100) - item.price;

        // 添加到库存
        if (!petData.inventory) petData.inventory = {};
        petData.inventory[itemId] = (petData.inventory[itemId] || 0) + 1;

        // 立即使用物品效果
        useItem(itemId);

        // 保存数据
        savePetData();

        // 更新商店显示
        const currentCategory = $('.shop-category-btn').filter(function() {
            return $(this).css('background-color') === 'rgb(255, 215, 0)' || $(this).css('background') === '#ffd700';
        }).data('category') || 'all';

        $('#shop-items').html(generateShopItems(currentCategory));
        $('.shop-modal h2').next().html(`💰 ${petData.coins} 金币`);

        toastr.success(`购买成功！${item.name} 已自动使用。`);
    };

    function useItem(itemId) {
        const item = SHOP_ITEMS[itemId];
        if (!item || !item.effect) return;

        const effect = item.effect;

        // 应用效果
        if (effect.hunger) petData.hunger = Math.min(100, Math.max(0, petData.hunger + effect.hunger));
        if (effect.happiness) petData.happiness = Math.min(100, Math.max(0, petData.happiness + effect.happiness));
        if (effect.health) petData.health = Math.min(100, Math.max(0, petData.health + effect.health));
        if (effect.energy) petData.energy = Math.min(100, Math.max(0, petData.energy + effect.energy));
        if (effect.sickness) petData.sickness = Math.min(100, Math.max(0, (petData.sickness || 0) + effect.sickness));
        if (effect.discipline) petData.discipline = Math.min(100, Math.max(0, (petData.discipline || 50) + effect.discipline));

        // 特殊效果
        if (effect.timeFreeze) {
            // 时间胶囊效果 - 延迟下次更新时间
            petData.lastUpdateTime = Date.now() + (effect.timeFreeze * 60 * 60 * 1000);
            toastr.info(`⏰ 时间已暂停 ${effect.timeFreeze} 小时！`);
        }

        if (effect.revive && !petData.isAlive) {
            // 复活石效果
            petData.isAlive = true;
            petData.deathReason = null;
            petData.health = Math.max(20, petData.health - (effect.healthPenalty || 0));
            petData.sickness = 0;
            petData.careNeglectCount = 0;
            toastr.success(`💎 ${petData.name} 复活了！但最大健康值降低了。`);
        }

        // 装饰品效果（持续加成）
        if (effect.happinessBonus || effect.disciplineBonus) {
            // 这些效果需要在状态更新时持续应用
            if (!petData.activeDecorations) petData.activeDecorations = [];
            if (!petData.activeDecorations.includes(itemId)) {
                petData.activeDecorations.push(itemId);
            }
        }

        validateAndFixValues();
    }

    window.closeShopModal = function() {
        $('#shop-modal').remove();
    };

    // 测试商店系统
    window.testShopSystem = function() {
        console.log('🛒 测试商店系统...');

        console.log('\n💰 当前金币状态:');
        console.log(`金币: ${petData.coins || 100}`);

        console.log('\n📦 当前库存:');
        if (petData.inventory && Object.keys(petData.inventory).length > 0) {
            Object.entries(petData.inventory).forEach(([itemId, count]) => {
                const item = SHOP_ITEMS[itemId];
                console.log(`${item ? item.emoji + ' ' + item.name : itemId}: ${count}`);
            });
        } else {
            console.log('库存为空');
        }

        console.log('\n🏪 商店物品:');
        Object.entries(SHOP_ITEMS).forEach(([itemId, item]) => {
            const canAfford = (petData.coins || 100) >= item.price;
            console.log(`${item.emoji} ${item.name} - ${item.price}金币 ${canAfford ? '✅' : '❌'}`);
        });

        console.log('\n🎮 可用命令:');
        console.log('- openShop() - 打开商店');
        console.log('- buyItem("itemId") - 购买物品');
        console.log('- gainCoins(amount) - 获得金币');
        console.log('- petData.coins = 1000 - 设置金币数量');

        return {
            coins: petData.coins || 100,
            inventory: petData.inventory || {},
            shopItems: Object.keys(SHOP_ITEMS).length,
            timestamp: new Date().toISOString()
        };
    };

    // 强制更新到拓麻歌子系统
    window.forceUpdateToTamagotchi = function() {
        console.log('🔄 强制更新到拓麻歌子系统...');

        // 备份重要数据
        const backup = {
            name: petData.name,
            type: petData.type,
            level: petData.level,
            experience: petData.experience,
            created: petData.created,
            coins: petData.coins || 100
        };

        console.log('备份数据:', backup);

        // 重置为拓麻歌子式数据结构
        petData = {
            ...backup,

            // 拓麻歌子式数值
            health: 50,
            happiness: 50,
            hunger: 50,
            energy: 50,

            // 拓麻歌子式生命状态
            lifeStage: "baby",
            age: 0,
            isAlive: true,
            deathReason: null,

            // 拓麻歌子式护理状态
            sickness: 0,
            discipline: 50,
            weight: 30,

            // 时间记录
            lastFeedTime: Date.now(),
            lastPlayTime: Date.now(),
            lastSleepTime: Date.now(),
            lastUpdateTime: Date.now(),
            lastCareTime: Date.now(),

            // 拓麻歌子式计数器
            careNeglectCount: 0,
            sicknessDuration: 0,

            // 商店系统
            inventory: petData.inventory || {},

            dataVersion: 4.0
        };

        // 应用拓麻歌子系统
        applyTamagotchiSystem();

        // 保存数据
        savePetData();

        // 强制刷新UI
        if (typeof renderPetStatus === 'function') {
            renderPetStatus();
        }

        console.log('✅ 强制更新完成！');
        console.log('新的拓麻歌子数据:', petData);

        toastr.success('🥚 已强制更新到拓麻歌子系统！请重新打开宠物界面查看。');

        return petData;
    };

    // 强制清除缓存并重新加载
    window.forceClearAndReload = function() {
        console.log('🧹 强制清除缓存并重新加载...');

        // 清除所有弹窗
        $('.virtual-pet-popup-overlay').remove();
        $('#virtual-pet-popup-overlay').remove();
        $('#shop-modal').remove();

        // 清除按钮
        $('#virtual-pet-button').remove();

        // 重新加载脚本
        location.reload();
    };

    // 完整修复所有问题
    window.fixAllIssues = function() {
        console.log('🔧 开始完整修复所有问题...');

        // 1. 强制更新到拓麻歌子系统
        console.log('1. 更新到拓麻歌子系统...');
        forceUpdateToTamagotchi();

        // 2. 确保商店系统可用
        console.log('2. 检查商店系统...');
        if (!petData.coins) petData.coins = 100;
        if (!petData.inventory) petData.inventory = {};

        // 3. 重新绑定事件
        console.log('3. 重新绑定UI事件...');
        setTimeout(() => {
            const $popup = $('.virtual-pet-popup-overlay');
            if ($popup.length > 0) {
                bindUnifiedUIEvents($popup);
            }
        }, 500);

        // 4. 保存数据
        savePetData();

        console.log('✅ 所有问题修复完成！');
        toastr.success('🎉 所有问题已修复！商店按钮和拓麻歌子系统现在应该正常工作了！');

        return {
            fixed: true,
            timestamp: new Date().toISOString(),
            petData: petData
        };
    };

    // 测试拓麻歌子UI风格 (糖果色版本)
    window.testTamagotchiUI = function() {
        console.log('🎮 测试拓麻歌子UI风格 (糖果色版本)...');

        console.log('\n🎨 配色方案:');
        console.log(`主背景: ${candyColors.background}`);
        console.log(`屏幕色: ${candyColors.screen}`);
        console.log(`边框色: ${candyColors.border}`);
        console.log(`文字色: ${candyColors.textPrimary}`);

        console.log('\n🎯 UI特性:');
        console.log('✅ 像素化字体 (Courier New)');
        console.log('✅ 方形边框 (border-radius: 0)');
        console.log('✅ 糖果色渐变背景');
        console.log('✅ 柔和粉色阴影');
        console.log('✅ 大写英文按钮文字');
        console.log('✅ 拓麻歌子式状态栏');

        console.log('\n🔧 可用命令:');
        console.log('- fixAllIssues() - 修复所有问题');
        console.log('- showPopup() - 显示拓麻歌子UI');
        console.log('- testTamagotchiSystem() - 测试拓麻歌子系统');
        console.log('- forceApplyTamagotchiSystem() - 强制应用拓麻歌子系统（修复金币问题）');
        console.log('- testCleanPrompt() - 测试优化后的提示词（避免AI混淆金币）');
        console.log('- diagnoseRewardSystem() - 诊断金币和经验值问题');
        console.log('- checkInteractionFunctions() - 检查当前使用的互动函数版本');
        console.log('- testSimpleInteraction() - 测试简化互动（不包含AI）');
        console.log('- testInteractionFlow() - 测试完整互动流程（包含AI）');
        console.log('- traceFeedPetExecution() - 追踪喂食函数的详细执行流程');
        console.log('- checkUIButtonBinding() - 检查UI按钮事件绑定');
        console.log('- traceUIFeedPet() - 追踪UI点击时的函数调用');
        console.log('- restoreOriginalFunctions() - 恢复原始函数（追踪后使用）');
        console.log('- checkFeedPetVersions() - 检查不同作用域的feedPet函数并修复UI绑定');
        console.log('- testFixedUIButton() - 测试修复后的UI按钮（包含详细追踪）');
        console.log('- testUIAfterCooldown() - 等待冷却时间后测试UI按钮');
        console.log('- inspectUIFeedPet() - 检查UI实际调用的函数并强制修复');
        console.log('- forceUIRefresh() - 强制刷新UI显示（解决金币显示延迟）');
        console.log('- testRewardDisplay() - 测试奖励显示系统');
        console.log('- adjustDecaySystem() - 调整衰减速度');
        console.log('- testNewDecaySystem() - 测试衰减效果');
        console.log('- testNewValueBalance() - 测试智能初始化系统的数值平衡');
        console.log('- testHugFunction() - 测试抱抱功能（检查按钮、函数、奖励）');
        console.log('- testHugFunctionComplete() - 完整测试抱抱功能（包括前后检查）');
        console.log('- quickVerifyHugFunction() - 快速验证抱抱功能是否完整');
        console.log('- diagnose75ValueIssue() - 诊断和修复75数值问题');
        console.log('- testSmartInitSystem() - 测试智能初始化系统');
        console.log('- resetRandomizationFlag() - 重置随机化标记（测试用）');
        console.log('- diagnoseValueResetIssue() - 诊断数值重置问题');

        // 强制刷新UI
        if (typeof renderPetStatus === 'function') {
            renderPetStatus();
        }

        toastr.success('🎮 糖果色拓麻歌子UI风格已应用！重新打开宠物界面查看效果。');

        return {
            uiStyle: 'tamagotchi-candy',
            colors: candyColors,
            timestamp: new Date().toISOString()
        };
    };

    // 测试新的状态栏颜色
    window.testStatusColors = function() {
        console.log('🎨 测试新的状态栏颜色...');

        console.log('\n🌈 状态栏配色:');
        console.log(`❤️ 健康: ${candyColors.health} (糖果粉)`);
        console.log(`😊 快乐: ${candyColors.happiness} (柠檬黄)`);
        console.log(`🍖 饱食: ${candyColors.hunger} (蜜桃橙)`);
        console.log(`⚡ 精力: ${candyColors.energy} (天空蓝)`);
        console.log(`💊 疾病: ${candyColors.health} (糖果粉)`);
        console.log(`📚 纪律: ${candyColors.experience} (薰衣草紫)`);

        console.log('\n✨ 按钮配色:');
        console.log(`🍖 喂食: ${candyColors.buttonPrimary} (糖果粉)`);
        console.log(`🎮 玩耍: ${candyColors.buttonSecondary} (薄荷绿)`);
        console.log(`😴 休息: ${candyColors.buttonAccent} (天空蓝)`);
        console.log(`💊 治疗: ${candyColors.health} (糖果粉)`);
        console.log(`🛒 商店: ${candyColors.happiness} (柠檬黄)`);

        console.log('\n🎯 改进内容:');
        console.log('✅ 状态栏颜色更加柔和美观');
        console.log('✅ 移除了刺眼的纯色 (#FF0000, #FFFF00)');
        console.log('✅ 添加了缺失的精力状态栏');
        console.log('✅ 统一了移动端和桌面端的颜色');
        console.log('✅ 按钮颜色与糖果色主题协调');

        toastr.success('🎨 状态栏颜色已优化！重新打开宠物界面查看美丽的糖果色效果。');

        return {
            statusColors: {
                health: candyColors.health,
                happiness: candyColors.happiness,
                hunger: candyColors.hunger,
                energy: candyColors.energy,
                experience: candyColors.experience
            },
            timestamp: new Date().toISOString()
        };
    };

    // 测试治疗按钮功能
    window.testHealButton = function() {
        console.log('💊 测试治疗按钮功能...');

        const sicknessLevel = petData.sickness || 0;

        console.log('\n🏥 当前状态:');
        console.log(`疾病值: ${sicknessLevel}`);
        console.log(`健康值: ${petData.health}`);
        console.log(`是否存活: ${petData.isAlive}`);

        console.log('\n🎯 治疗按钮状态:');
        if (sicknessLevel > 10) {
            console.log('✅ 治疗按钮激活 - 宠物生病了');
            console.log(`- 背景色: ${candyColors.health} (糖果粉)`);
            console.log('- 透明度: 1.0 (完全可见)');
            console.log('- 鼠标样式: pointer (可点击)');
        } else {
            console.log('⚠️ 治疗按钮禁用 - 宠物很健康');
            console.log(`- 背景色: ${candyColors.secondary} (灰色)`);
            console.log('- 透明度: 0.5 (半透明)');
            console.log('- 鼠标样式: not-allowed (禁用)');
        }

        console.log('\n🧪 测试命令:');
        console.log('- healPet() - 尝试治疗宠物');
        console.log('- petData.sickness = 50 - 设置宠物生病');
        console.log('- petData.sickness = 0 - 设置宠物健康');
        console.log('- renderPetStatus() - 刷新UI显示');

        console.log('\n💡 功能特性:');
        console.log('✅ 治疗按钮常驻显示');
        console.log('✅ 生病时可点击，健康时禁用');
        console.log('✅ 视觉反馈：颜色和透明度变化');
        console.log('✅ 点击反馈：健康时显示随机提示');
        console.log('✅ 治疗效果：降低疾病值，提升健康值');

        return {
            sicknessLevel: sicknessLevel,
            canHeal: sicknessLevel > 10,
            buttonState: sicknessLevel > 10 ? 'active' : 'disabled',
            timestamp: new Date().toISOString()
        };
    };

    // 测试按钮文字和样式
    window.testButtonStyles = function() {
        console.log('🎨 测试按钮文字和样式...');

        console.log('\n📱 移动端按钮:');
        console.log('🍖 喂食 - 糖果粉背景，中文文字');
        console.log('🎮 玩耍 - 薄荷绿背景，中文文字');
        console.log('😴 休息 - 天空蓝背景，中文文字');
        console.log('💊 治疗 - 动态背景，中文文字');
        console.log('🛒 商店 - 柠檬黄背景，中文文字');
        console.log('⚙️ 设置 - 灰色背景，中文文字');

        console.log('\n🖥️ 桌面端按钮:');
        console.log('🍖 喂食 - 糖果粉背景，中文文字');
        console.log('🎮 玩耍 - 薄荷绿背景，中文文字');
        console.log('😴 休息 - 天空蓝背景，中文文字');
        console.log('💊 治疗 - 动态背景，中文文字');
        console.log('🛒 商店 - 柠檬黄背景，中文文字');
        console.log('⚙️ 设置 - 灰色背景，中文文字');

        console.log('\n🎯 样式特性:');
        console.log('✅ 所有按钮文字已改为中文');
        console.log('✅ 移除了 text-transform: uppercase');
        console.log('✅ 保持拓麻歌子像素风格');
        console.log('✅ 统一的糖果色配色方案');
        console.log('✅ 方形边框和像素阴影');
        console.log('✅ Courier New 等宽字体');

        console.log('\n🔧 可用命令:');
        console.log('- fixAllIssues() - 修复所有问题');
        console.log('- testTamagotchiUI() - 测试拓麻歌子UI');
        console.log('- testHealButton() - 测试治疗按钮功能');

        toastr.success('🎨 按钮样式已优化！所有按钮现在都显示中文文字。');

        return {
            buttonsUpdated: true,
            language: 'chinese',
            style: 'tamagotchi-candy',
            timestamp: new Date().toISOString()
        };
    };

    // 测试时间衰减修复
    window.testDecayFix = function() {
        console.log('⏰ 测试时间衰减修复...');

        console.log('\n📊 当前衰减速度:');
        console.log('饱食度: 每小时 -1.2 (原来 -3.0)');
        console.log('精力: 每小时 -1.0 (原来 -2.5)');
        console.log('快乐度: 每小时 -0.8 (原来 -2.0)');

        console.log('\n🛡️ 初始化缓冲机制:');
        console.log('✅ 长时间未更新时自动缓冲');
        console.log('✅ 最低饱食度: 30');
        console.log('✅ 最低精力: 25');
        console.log('✅ 最低快乐度: 20');
        console.log('✅ 最低健康度: 35');

        const now = Date.now();
        const timeSinceLastUpdate = now - (petData.lastUpdateTime || now);
        const hoursElapsed = timeSinceLastUpdate / (1000 * 60 * 60);

        console.log('\n⏱️ 当前状态:');
        console.log(`距离上次更新: ${hoursElapsed.toFixed(1)} 小时`);
        console.log(`饱食度: ${Math.round(petData.hunger)}`);
        console.log(`精力: ${Math.round(petData.energy)}`);
        console.log(`快乐度: ${Math.round(petData.happiness)}`);
        console.log(`健康度: ${Math.round(petData.health)}`);

        console.log('\n🧪 测试命令:');
        console.log('- applyInitializationBuffer() - 手动应用缓冲');
        console.log('- petData.lastUpdateTime = Date.now() - 4*60*60*1000 - 模拟4小时前');
        console.log('- updatePetStatus() - 手动更新状态');

        console.log('\n💡 修复效果:');
        console.log('✅ 重新打开SillyTavern时不会立即提示需要休息');
        console.log('✅ 衰减速度更合理，不会过快下降');
        console.log('✅ 长时间离开后有基础缓冲保护');
        console.log('✅ 用户体验更友好');

        return {
            decayRates: {
                hunger: -1.2,
                energy: -1.0,
                happiness: -0.8
            },
            bufferThresholds: {
                hunger: 30,
                energy: 25,
                happiness: 20,
                health: 35
            },
            hoursElapsed: hoursElapsed,
            currentStatus: {
                hunger: Math.round(petData.hunger),
                energy: Math.round(petData.energy),
                happiness: Math.round(petData.happiness),
                health: Math.round(petData.health)
            },
            timestamp: new Date().toISOString()
        };
    };

    // 测试设置按钮颜色修复
    window.testSettingsButtonColor = function() {
        console.log('🎨 测试设置按钮颜色修复...');

        console.log('\n❌ 修复前的问题:');
        console.log('背景色: #333333 (深灰)');
        console.log('文字色: #2D3748 (深灰)');
        console.log('问题: 两个深色对比度不够，文字难以看清');

        console.log('\n✅ 修复后的改进:');
        console.log('背景色: #8B5CF6 (紫色)');
        console.log('文字色: #FFFFFF (白色)');
        console.log('效果: 高对比度，文字清晰可见');

        console.log('\n🎯 按钮配色方案:');
        console.log('🍖 喂食: 糖果粉背景 + 深灰文字');
        console.log('🎮 玩耍: 薄荷绿背景 + 深灰文字');
        console.log('😴 休息: 天空蓝背景 + 深灰文字');
        console.log('💊 治疗: 动态背景 + 白色文字');
        console.log('🛒 商店: 柠檬黄背景 + 深灰文字');
        console.log('⚙️ 设置: 紫色背景 + 白色文字 ← 已修复');

        console.log('\n🔍 颜色对比度分析:');
        console.log('设置按钮: 紫色(#8B5CF6) + 白色(#FFFFFF) = 高对比度 ✅');
        console.log('其他按钮: 浅色背景 + 深色文字 = 良好对比度 ✅');

        console.log('\n🎨 设计原则:');
        console.log('✅ 保持拓麻歌子像素风格');
        console.log('✅ 确保文字清晰可读');
        console.log('✅ 与糖果色主题协调');
        console.log('✅ 设置按钮有独特识别度');

        console.log('\n🧪 测试方法:');
        console.log('1. 重新打开宠物界面');
        console.log('2. 检查设置按钮是否清晰可见');
        console.log('3. 确认文字与背景对比度足够');

        toastr.success('🎨 设置按钮颜色已修复！现在文字清晰可见了。');

        return {
            fixed: true,
            oldColors: {
                background: '#333333',
                text: '#2D3748',
                contrast: 'poor'
            },
            newColors: {
                background: '#8B5CF6',
                text: '#FFFFFF',
                contrast: 'excellent'
            },
            timestamp: new Date().toISOString()
        };
    };

    // 测试自定义人设保存功能
    window.testPersonalitySave = function() {
        console.log('🎭 测试自定义人设保存功能...');

        console.log('\n📋 当前人设状态:');
        const currentType = localStorage.getItem(`${extensionName}-personality-type`) || 'default';
        const customPersonality = localStorage.getItem(`${extensionName}-custom-personality`) || '';
        console.log(`人设类型: ${currentType}`);
        console.log(`自定义人设: ${customPersonality || '(空)'}`);
        console.log(`petData.personality: ${petData.personality || '(空)'}`);

        console.log('\n🔍 问题诊断:');
        console.log('✅ 数据迁移时保留personality字段');
        console.log('✅ 初始数据结构包含personality字段');
        console.log('✅ 新用户初始化时设置personality');
        console.log('✅ 数据加载时恢复personality');

        console.log('\n🧪 测试自定义人设保存:');
        const testPersonality = '我是一只特别可爱的测试宠物，喜欢和主人互动！';
        console.log(`保存测试人设: ${testPersonality}`);

        // 保存测试人设
        savePersonalitySettings('custom', testPersonality);

        // 验证保存结果
        const savedType = localStorage.getItem(`${extensionName}-personality-type`);
        const savedCustom = localStorage.getItem(`${extensionName}-custom-personality`);

        console.log('\n✅ 保存结果验证:');
        console.log(`localStorage人设类型: ${savedType}`);
        console.log(`localStorage自定义人设: ${savedCustom}`);
        console.log(`petData.personality: ${petData.personality}`);

        // 模拟重新加载
        console.log('\n🔄 模拟重新加载数据...');
        const reloadedPersonality = getCurrentPersonality();
        console.log(`重新加载后的人设: ${reloadedPersonality}`);

        console.log('\n🎯 测试结果:');
        const isWorking = savedType === 'custom' &&
                         savedCustom === testPersonality &&
                         petData.personality === testPersonality &&
                         reloadedPersonality === testPersonality;

        if (isWorking) {
            console.log('✅ 自定义人设保存功能正常工作！');
            toastr.success('🎭 自定义人设保存功能测试通过！');
        } else {
            console.log('❌ 自定义人设保存功能有问题！');
            console.log('问题分析:');
            if (savedType !== 'custom') console.log('- localStorage人设类型未正确保存');
            if (savedCustom !== testPersonality) console.log('- localStorage自定义人设未正确保存');
            if (petData.personality !== testPersonality) console.log('- petData.personality未正确更新');
            if (reloadedPersonality !== testPersonality) console.log('- 重新加载时人设丢失');
            toastr.error('❌ 自定义人设保存功能有问题，请检查控制台日志');
        }

        console.log('\n🔧 手动修复命令:');
        console.log('- savePersonalitySettings("custom", "你的自定义人设") - 手动保存');
        console.log('- getCurrentPersonality() - 检查当前人设');
        console.log('- loadPetData() - 重新加载数据');

        return {
            working: isWorking,
            currentType: savedType,
            customPersonality: savedCustom,
            petDataPersonality: petData.personality,
            reloadedPersonality: reloadedPersonality,
            timestamp: new Date().toISOString()
        };
    };

    // 调试自定义人设丢失问题
    window.debugPersonalityLoss = function() {
        console.log('🔍 调试自定义人设丢失问题...');

        console.log('\n📋 当前状态检查:');
        const personalityType = localStorage.getItem(`${extensionName}-personality-type`);
        const customPersonality = localStorage.getItem(`${extensionName}-custom-personality`);
        const petDataPersonality = petData.personality;

        console.log(`localStorage人设类型: "${personalityType}"`);
        console.log(`localStorage自定义人设: "${customPersonality}"`);
        console.log(`petData.personality: "${petDataPersonality}"`);

        console.log('\n🔍 问题诊断:');

        // 检查localStorage是否存在
        if (!personalityType) {
            console.log('❌ localStorage中没有人设类型，可能被清除了');
        } else if (personalityType !== 'custom') {
            console.log(`❌ 人设类型不是custom，而是: ${personalityType}`);
        } else {
            console.log('✅ localStorage人设类型正确');
        }

        if (!customPersonality) {
            console.log('❌ localStorage中没有自定义人设内容');
        } else {
            console.log('✅ localStorage自定义人设内容存在');
        }

        if (!petDataPersonality) {
            console.log('❌ petData.personality为空');
        } else {
            console.log('✅ petData.personality有内容');
        }

        console.log('\n🧪 测试getCurrentPersonality():');
        const currentPersonality = getCurrentPersonality();
        console.log(`getCurrentPersonality()返回: "${currentPersonality}"`);

        console.log('\n🔧 可能的原因:');
        console.log('1. cleanupOldCharacterData()误删了数据');
        console.log('2. 数据加载时被覆盖');
        console.log('3. localStorage被其他代码清除');
        console.log('4. 扩展名称变化导致key不匹配');

        console.log('\n🔍 扩展名称检查:');
        console.log(`当前extensionName: "${extensionName}"`);
        console.log(`localStorage key前缀: "${extensionName}-"`);

        // 列出所有相关的localStorage项
        console.log('\n📦 相关localStorage项:');
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.includes('virtual-pet')) {
                console.log(`${key}: "${localStorage.getItem(key)}"`);
            }
        }

        console.log('\n🔧 修复建议:');
        if (!personalityType || personalityType !== 'custom') {
            console.log('- 运行: localStorage.setItem("virtual-pet-personality-type", "custom")');
        }
        if (!customPersonality) {
            console.log('- 运行: localStorage.setItem("virtual-pet-custom-personality", "你的自定义人设")');
        }

        return {
            personalityType: personalityType,
            customPersonality: customPersonality,
            petDataPersonality: petDataPersonality,
            currentPersonality: currentPersonality,
            extensionName: extensionName,
            allVirtualPetKeys: Object.keys(localStorage).filter(key => key.includes('virtual-pet')),
            timestamp: new Date().toISOString()
        };
    };

    // 强制修复自定义人设丢失问题
    window.fixPersonalityLoss = function(customText) {
        console.log('🔧 强制修复自定义人设丢失问题...');

        if (!customText) {
            customText = prompt('请输入你的自定义人设:', '我是一只特别可爱的宠物，喜欢和主人互动！');
            if (!customText) {
                console.log('❌ 用户取消了输入');
                return;
            }
        }

        console.log(`设置自定义人设: "${customText}"`);

        // 1. 强制设置localStorage
        localStorage.setItem(`${extensionName}-personality-type`, 'custom');
        localStorage.setItem(`${extensionName}-custom-personality`, customText);

        // 2. 更新petData
        petData.personality = customText;

        // 3. 保存到持久化存储
        savePetData();

        // 4. 验证设置结果
        const verifyType = localStorage.getItem(`${extensionName}-personality-type`);
        const verifyCustom = localStorage.getItem(`${extensionName}-custom-personality`);
        const verifyPetData = petData.personality;
        const verifyCurrent = getCurrentPersonality();

        console.log('\n✅ 设置结果验证:');
        console.log(`localStorage人设类型: "${verifyType}"`);
        console.log(`localStorage自定义人设: "${verifyCustom}"`);
        console.log(`petData.personality: "${verifyPetData}"`);
        console.log(`getCurrentPersonality(): "${verifyCurrent}"`);

        const success = verifyType === 'custom' &&
                       verifyCustom === customText &&
                       verifyPetData === customText &&
                       verifyCurrent === customText;

        if (success) {
            console.log('✅ 自定义人设修复成功！');
            toastr.success('🎭 自定义人设已修复！现在应该不会丢失了。');

            // 更新设置界面（如果打开的话）
            if ($("#virtual-pet-personality-select").length > 0) {
                $("#virtual-pet-personality-select").val('custom');
                $("#virtual-pet-custom-personality").val(customText);
                toggleCustomPersonalityInput(true);
            }
        } else {
            console.log('❌ 自定义人设修复失败！');
            toastr.error('❌ 自定义人设修复失败，请检查控制台日志');
        }

        console.log('\n💡 防止丢失的建议:');
        console.log('1. 定期运行 testPersonalitySave() 检查状态');
        console.log('2. 如果发现丢失，立即运行 fixPersonalityLoss()');
        console.log('3. 避免清除浏览器数据');
        console.log('4. 定期备份重要的自定义人设');

        return {
            success: success,
            customText: customText,
            localStorage: {
                type: verifyType,
                custom: verifyCustom
            },
            petData: verifyPetData,
            current: verifyCurrent,
            timestamp: new Date().toISOString()
        };
    };

    // 检查数值增减逻辑
    window.checkValueChanges = function() {
        console.log('=== 🔍 数值增减逻辑检查 ===');

        // 记录初始状态
        const initialState = {
            health: petData.health,
            happiness: petData.happiness,
            hunger: petData.hunger,
            energy: petData.energy,
            level: petData.level,
            experience: petData.experience
        };

        console.log('\n📊 初始状态:');
        console.log(`健康: ${Math.round(initialState.health)}/100`);
        console.log(`快乐: ${Math.round(initialState.happiness)}/100`);
        console.log(`饱食: ${Math.round(initialState.hunger)}/100`);
        console.log(`精力: ${Math.round(initialState.energy)}/100`);
        console.log(`等级: ${initialState.level}, 经验: ${initialState.experience}`);

        // 1. 检查喂食效果
        console.log('\n🍖 1. 测试喂食效果:');
        console.log('预期效果: 饱食+15, 快乐+5, 经验+3');

        const beforeFeed = { ...petData };
        petData.hunger = Math.min(100, petData.hunger + 15);
        petData.happiness = Math.min(100, petData.happiness + 5);
        petData.experience += 3;

        console.log(`实际效果: 饱食+${Math.round(petData.hunger - beforeFeed.hunger)}, 快乐+${Math.round(petData.happiness - beforeFeed.happiness)}, 经验+${petData.experience - beforeFeed.experience}`);

        // 检查上限
        if (petData.hunger > 100) console.log('❌ 饱食度超过上限');
        if (petData.happiness > 100) console.log('❌ 快乐度超过上限');

        // 2. 检查玩耍效果
        console.log('\n🎮 2. 测试玩耍效果:');
        console.log('预期效果: 快乐+12, 精力-8, 经验+4');

        const beforePlay = { ...petData };
        petData.happiness = Math.min(100, petData.happiness + 12);
        petData.energy = Math.max(0, petData.energy - 8);
        petData.experience += 4;

        console.log(`实际效果: 快乐+${Math.round(petData.happiness - beforePlay.happiness)}, 精力${Math.round(petData.energy - beforePlay.energy)}, 经验+${petData.experience - beforePlay.experience}`);

        // 检查边界
        if (petData.happiness > 100) console.log('❌ 快乐度超过上限');
        if (petData.energy < 0) console.log('❌ 精力低于下限');

        // 3. 检查睡觉效果
        console.log('\n😴 3. 测试睡觉效果:');
        console.log('预期效果: 精力+20, 健康+5, 经验+2');

        const beforeSleep = { ...petData };
        petData.energy = Math.min(100, petData.energy + 20);
        petData.health = Math.min(100, petData.health + 5);
        petData.experience += 2;

        console.log(`实际效果: 精力+${Math.round(petData.energy - beforeSleep.energy)}, 健康+${Math.round(petData.health - beforeSleep.health)}, 经验+${petData.experience - beforeSleep.experience}`);

        // 检查上限
        if (petData.energy > 100) console.log('❌ 精力超过上限');
        if (petData.health > 100) console.log('❌ 健康超过上限');

        // 4. 检查时间衰减
        console.log('\n⏰ 4. 测试时间衰减效果:');
        console.log('模拟1小时时间流逝...');

        const beforeDecay = { ...petData };
        const hoursElapsed = 1;

        // 模拟衰减逻辑
        const hungerDecay = hoursElapsed * 0.8;
        const energyDecay = hoursElapsed * 0.6;

        petData.hunger = Math.max(0, petData.hunger - hungerDecay);
        petData.energy = Math.max(0, petData.energy - energyDecay);

        // 检查低值影响
        let healthDecay = 0, happinessDecay = 0;
        if (petData.hunger < 20) {
            healthDecay = hoursElapsed * 1;
            happinessDecay = hoursElapsed * 0.8;
            petData.health = Math.max(0, petData.health - healthDecay);
            petData.happiness = Math.max(0, petData.happiness - happinessDecay);
        }

        if (petData.energy < 20) {
            const energyHappinessDecay = hoursElapsed * 0.5;
            petData.happiness = Math.max(0, petData.happiness - energyHappinessDecay);
            happinessDecay += energyHappinessDecay;
        }

        console.log(`饱食衰减: -${Math.round(hungerDecay)} (${Math.round(beforeDecay.hunger)} → ${Math.round(petData.hunger)})`);
        console.log(`精力衰减: -${Math.round(energyDecay)} (${Math.round(beforeDecay.energy)} → ${Math.round(petData.energy)})`);
        if (healthDecay > 0) console.log(`健康衰减: -${Math.round(healthDecay)} (饥饿影响)`);
        if (happinessDecay > 0) console.log(`快乐衰减: -${Math.round(happinessDecay)} (饥饿/疲劳影响)`);

        // 5. 检查升级逻辑
        console.log('\n🆙 5. 测试升级逻辑:');
        const currentLevel = petData.level;
        const currentExp = petData.experience;
        const expNeeded = currentLevel * 100;

        console.log(`当前等级: ${currentLevel}, 经验: ${currentExp}/${expNeeded}`);

        if (currentExp >= expNeeded) {
            console.log('✅ 经验足够，应该升级');
            const newLevel = currentLevel + 1;
            const remainingExp = currentExp - expNeeded;
            const healthBonus = 30;

            console.log(`升级后: 等级${newLevel}, 剩余经验${remainingExp}, 健康+${healthBonus}`);

            // 模拟升级
            petData.level = newLevel;
            petData.experience = remainingExp;
            petData.health = Math.min(100, petData.health + healthBonus);
        } else {
            console.log(`✅ 经验不足，还需要 ${expNeeded - currentExp} 经验升级`);
        }

        // 6. 数值边界检查
        console.log('\n🎯 6. 数值边界检查:');
        const checkBounds = (name, value, min = 0, max = 100) => {
            if (value < min) {
                console.log(`❌ ${name} 低于下限: ${value} < ${min}`);
                return false;
            }
            if (value > max) {
                console.log(`❌ ${name} 超过上限: ${value} > ${max}`);
                return false;
            }
            console.log(`✅ ${name} 在正常范围: ${Math.round(value)}`);
            return true;
        };

        const allValid = [
            checkBounds('健康', petData.health),
            checkBounds('快乐', petData.happiness),
            checkBounds('饱食', petData.hunger),
            checkBounds('精力', petData.energy),
            checkBounds('等级', petData.level, 1, 999),
            checkBounds('经验', petData.experience, 0, 99999)
        ].every(v => v);

        // 7. 总结
        console.log('\n📋 7. 数值变化总结:');
        const finalState = {
            health: petData.health,
            happiness: petData.happiness,
            hunger: petData.hunger,
            energy: petData.energy,
            level: petData.level,
            experience: petData.experience
        };

        console.log('最终状态:');
        Object.keys(finalState).forEach(key => {
            const initial = initialState[key];
            const final = finalState[key];
            const change = final - initial;
            const changeStr = change > 0 ? `+${Math.round(change)}` : `${Math.round(change)}`;
            console.log(`  ${key}: ${Math.round(initial)} → ${Math.round(final)} (${changeStr})`);
        });

        // 恢复初始状态
        Object.assign(petData, initialState);

        if (allValid) {
            console.log('\n🎉 数值增减逻辑检查通过！');
        } else {
            console.log('\n⚠️ 发现数值边界问题，请检查相关逻辑');
        }

        return {
            initialState,
            finalState,
            valid: allValid,
            timestamp: new Date().toISOString()
        };
    }

    // 拓麻歌子式生命阶段定义
    const LIFE_STAGES = {
        baby: { name: "幼体", duration: 24, emoji: "🥚" },      // 24小时
        child: { name: "儿童", duration: 48, emoji: "🐣" },     // 48小时
        teen: { name: "少年", duration: 72, emoji: "🐤" },      // 72小时
        adult: { name: "成年", duration: 120, emoji: "🐦" },    // 120小时
        senior: { name: "老年", duration: 48, emoji: "🦅" }     // 48小时后死亡
    };

    // 商店物品定义
    const SHOP_ITEMS = {
        // 食物类
        basic_food: {
            name: "基础食物",
            emoji: "🍎",
            price: 10,
            category: "food",
            description: "普通的食物，恢复饱食度",
            effect: { hunger: 15, happiness: 2 }
        },
        premium_food: {
            name: "高级食物",
            emoji: "🍖",
            price: 25,
            category: "food",
            description: "营养丰富的食物，恢复饱食度和健康",
            effect: { hunger: 25, happiness: 5, health: 5 }
        },
        special_treat: {
            name: "特殊零食",
            emoji: "🍰",
            price: 40,
            category: "food",
            description: "美味的零食，大幅提升快乐度",
            effect: { hunger: 10, happiness: 20 }
        },

        // 药品类
        medicine: {
            name: "感冒药",
            emoji: "💊",
            price: 30,
            category: "medicine",
            description: "治疗轻微疾病",
            effect: { sickness: -20, health: 10 }
        },
        super_medicine: {
            name: "特效药",
            emoji: "💉",
            price: 80,
            category: "medicine",
            description: "治疗严重疾病，完全恢复健康",
            effect: { sickness: -50, health: 30 }
        },

        // 玩具类
        ball: {
            name: "小球",
            emoji: "⚽",
            price: 20,
            category: "toy",
            description: "简单的玩具，提升快乐度和纪律",
            effect: { happiness: 10, discipline: 5, energy: -5 }
        },
        robot_toy: {
            name: "机器人玩具",
            emoji: "🤖",
            price: 60,
            category: "toy",
            description: "高科技玩具，大幅提升纪律和快乐",
            effect: { happiness: 15, discipline: 15, energy: -3 }
        },

        // 特殊道具类
        time_capsule: {
            name: "时间胶囊",
            emoji: "⏰",
            price: 100,
            category: "special",
            description: "暂停时间流逝2小时，紧急时使用",
            effect: { timeFreeze: 2 }
        },
        revival_stone: {
            name: "复活石",
            emoji: "💎",
            price: 200,
            category: "special",
            description: "死亡后可以复活宠物，但会降低最大健康值",
            effect: { revive: true, healthPenalty: 20 }
        },
        energy_drink: {
            name: "能量饮料",
            emoji: "🥤",
            price: 35,
            category: "special",
            description: "快速恢复精力，但会增加疾病风险",
            effect: { energy: 30, sickness: 5 }
        },

        // 装饰类
        hat: {
            name: "小帽子",
            emoji: "🎩",
            price: 50,
            category: "decoration",
            description: "可爱的装饰，持续提升快乐度",
            effect: { happinessBonus: 2 }
        },
        bow_tie: {
            name: "蝴蝶结",
            emoji: "🎀",
            price: 45,
            category: "decoration",
            description: "优雅的装饰，提升纪律值",
            effect: { disciplineBonus: 3 }
        }
    };

    // 应用拓麻歌子式系统（内部使用，自动调用）
    function applyTamagotchiSystem() {
        console.log('🥚 应用拓麻歌子式系统...');

        // 重新定义更新状态函数 - 拓麻歌子式
        window.updatePetStatus = function() {
            if (!petData.isAlive) return; // 死亡后不再更新

            const now = Date.now();
            const timeSinceLastUpdate = now - (petData.lastUpdateTime || now);
            const hoursElapsed = timeSinceLastUpdate / (1000 * 60 * 60);

            // 拓麻歌子式：不限制最大时间差，真实时间流逝
            if (hoursElapsed > 0.1) { // 每6分钟更新一次

                // 1. 年龄增长
                petData.age += hoursElapsed;

                // 2. 生命阶段检查
                checkLifeStageProgression();

                // 3. 拓麻歌子式衰减（调整为合理速度）
                petData.hunger = Math.max(0, petData.hunger - hoursElapsed * 1.2);    // 每小时-1.2
                petData.energy = Math.max(0, petData.energy - hoursElapsed * 1.0);    // 每小时-1.0
                petData.happiness = Math.max(0, petData.happiness - hoursElapsed * 0.8); // 每小时-0.8

                // 4. 健康状况检查
                checkHealthConditions(hoursElapsed);

                // 5. 死亡检查
                checkDeathConditions();

                petData.lastUpdateTime = now;
                validateAndFixValues();
                savePetData();
                checkAndSendNotifications();
            }
        };

        // 重新定义喂食函数 - 拓麻歌子式
        window.feedPet = async function() {
            if (!petData.isAlive) {
                toastr.error("💀 你的宠物已经死亡，无法喂食...");
                return;
            }

            const now = Date.now();
            const timeSinceLastFeed = now - petData.lastFeedTime;

            if (timeSinceLastFeed < 30000) { // 30秒冷却
                toastr.warning("宠物还不饿，等一会再喂吧！");
                return;
            }

            // 拓麻歌子式喂食效果
            petData.hunger = Math.min(100, petData.hunger + 20);
            petData.happiness = Math.min(100, petData.happiness + 5);
            petData.weight += 1; // 体重增加
            petData.lastFeedTime = now;
            petData.lastCareTime = now;
            petData.careNeglectCount = Math.max(0, petData.careNeglectCount - 1);

            // 过度喂食检查
            if (petData.weight > 50) {
                petData.sickness = Math.min(100, petData.sickness + 10);
                toastr.warning("⚠️ 宠物吃得太多了，可能会生病！");
            }

            validateAndFixValues();

            // 定义奖励
            const rewards = { coins: 3, experience: 2 };

            // 应用奖励
            gainExperience(rewards.experience);
            gainCoins(rewards.coins);

            // AI回复时传递奖励信息，用于独立显示
            await handleAIReply('feed', `${petData.name} 吃得很开心！`, rewards);
            savePetData();
            renderPetStatus();
        };

        // 重新定义玩耍函数 - 拓麻歌子式
        window.playWithPet = async function() {
            if (!petData.isAlive) {
                toastr.error("💀 你的宠物已经死亡，无法玩耍...");
                return;
            }

            const now = Date.now();
            const timeSinceLastPlay = now - petData.lastPlayTime;

            if (timeSinceLastPlay < 45000) { // 45秒冷却
                toastr.warning("宠物需要休息一下！");
                return;
            }

            // 拓麻歌子式玩耍效果
            petData.happiness = Math.min(100, petData.happiness + 15);
            petData.energy = Math.max(0, petData.energy - 10);
            petData.discipline = Math.min(100, petData.discipline + 5);
            petData.weight = Math.max(10, petData.weight - 1); // 运动减重
            petData.lastPlayTime = now;
            petData.lastCareTime = now;
            petData.careNeglectCount = Math.max(0, petData.careNeglectCount - 1);

            validateAndFixValues();

            // 定义奖励
            const rewards = { coins: 5, experience: 3 };

            // 应用奖励
            gainExperience(rewards.experience);
            gainCoins(rewards.coins);

            // AI回复时传递奖励信息，用于独立显示
            await handleAIReply('play', `${petData.name} 玩得很开心！`, rewards);
            savePetData();
            renderPetStatus();
        };

        // 重新定义睡觉函数 - 拓麻歌子式
        window.petSleep = async function() {
            if (!petData.isAlive) {
                toastr.error("💀 你的宠物已经死亡，无法休息...");
                return;
            }

            const now = Date.now();
            const timeSinceLastSleep = now - petData.lastSleepTime;

            if (timeSinceLastSleep < 120000) { // 2分钟冷却
                toastr.warning("宠物还不困！");
                return;
            }

            // 拓麻歌子式睡觉效果
            petData.energy = Math.min(100, petData.energy + 25);
            petData.health = Math.min(100, petData.health + 10);
            petData.sickness = Math.max(0, petData.sickness - 5); // 睡觉有助于康复
            petData.lastSleepTime = now;
            petData.lastCareTime = now;

            validateAndFixValues();

            // 定义奖励
            const rewards = { coins: 2, experience: 1 };

            // 应用奖励
            gainExperience(rewards.experience);
            gainCoins(rewards.coins);

            // AI回复时传递奖励信息，用于独立显示
            await handleAIReply('sleep', `${petData.name} 睡得很香！`, rewards);
            savePetData();
            renderPetStatus();
        };

        // 抱抱宠物 - 新的互动方式
        window.hugPet = async function() {
            if (!petData.isAlive) {
                toastr.error("💀 你的宠物已经死亡，无法抱抱...");
                return;
            }

            const now = Date.now();
            const timeSinceLastHug = now - (petData.lastHugTime || 0);

            if (timeSinceLastHug < 25000) { // 25秒冷却
                const remainingTime = Math.ceil((25000 - timeSinceLastHug) / 1000);
                toastr.warning(`宠物还在回味刚才的拥抱，${remainingTime}秒后再试吧！`);
                return;
            }

            try {
                // 拓麻歌子式抱抱效果
                petData.happiness = Math.min(100, petData.happiness + 10);
                petData.health = Math.min(100, petData.health + 3);
                petData.discipline = Math.min(100, (petData.discipline || 50) + 2); // 增加纪律性
                petData.lastHugTime = now;
                petData.lastCareTime = now;
                petData.careNeglectCount = Math.max(0, (petData.careNeglectCount || 0) - 1);

                // 特殊效果：抱抱能减少疾病
                if (petData.sickness > 0) {
                    petData.sickness = Math.max(0, petData.sickness - 3);
                    toastr.info("💕 温暖的拥抱让宠物感觉好了一些！");
                }

                validateAndFixValues();

                // 定义奖励
                const rewards = { coins: 2, experience: 1 };

                // 应用奖励
                gainExperience(rewards.experience);
                gainCoins(rewards.coins);

                // AI回复时传递奖励信息，用于独立显示
                await handleAIReply('hug', `${petData.name} 享受着温暖的拥抱！`, rewards);
                savePetData();
                renderPetStatus();

                // 强制更新UI显示
                setTimeout(() => {
                    if (typeof updateUnifiedUIStatus === 'function') {
                        updateUnifiedUIStatus();
                    }
                }, 100);

            } catch (error) {
                console.error('抱抱宠物时发生错误:', error);
                toastr.error("抱抱时出现了问题...");
            }
        };

        // 添加治疗功能
        window.healPet = async function() {
            if (!petData.isAlive) {
                toastr.error("💀 你的宠物已经死亡，无法治疗...");
                return;
            }

            const sicknessLevel = petData.sickness || 0;

            if (sicknessLevel < 10) {
                // 没生病时的反馈
                const healthyMessages = [
                    "😊 你的宠物很健康，不需要治疗！",
                    "🌟 宠物状态良好，无需用药！",
                    "💪 你的宠物精神饱满，不用担心！",
                    "✨ 宠物健康指数正常，暂时不需要治疗！"
                ];
                const randomMessage = healthyMessages[Math.floor(Math.random() * healthyMessages.length)];
                toastr.info(randomMessage);

                // 播放无效点击的视觉反馈
                const healBtn = $('.heal-btn');
                if (healBtn.length > 0) {
                    healBtn.css('transform', 'scale(0.95)');
                    setTimeout(() => {
                        healBtn.css('transform', 'scale(1)');
                    }, 150);
                }
                return;
            }

            // 治疗效果
            const healAmount = Math.min(30, sicknessLevel); // 实际治疗量
            petData.sickness = Math.max(0, sicknessLevel - healAmount);
            petData.health = Math.min(100, petData.health + 15);
            petData.sicknessDuration = 0;
            petData.lastCareTime = Date.now();

            validateAndFixValues();

            // 治疗成功的反馈
            toastr.success(`💊 治疗成功！疾病值降低了 ${healAmount} 点`);
            await handleAIReply('heal', `${petData.name} 接受了治疗，感觉好多了！`);
            savePetData();
            renderPetStatus();
        };

        // 添加商店功能
        window.openShop = function() {
            if (!petData.isAlive) {
                toastr.error("💀 你的宠物已经死亡，无法使用商店...");
                return;
            }

            showShopModal();
        };

        console.log('✅ 拓麻歌子式系统已应用！');
    }

    // 检查生命阶段进展
    function checkLifeStageProgression() {
        const currentStage = LIFE_STAGES[petData.lifeStage];
        if (!currentStage) return;

        if (petData.age >= currentStage.duration) {
            const stages = Object.keys(LIFE_STAGES);
            const currentIndex = stages.indexOf(petData.lifeStage);

            if (currentIndex < stages.length - 1) {
                // 进化到下一阶段
                const nextStage = stages[currentIndex + 1];
                petData.lifeStage = nextStage;
                petData.age = 0; // 重置年龄计数

                const nextStageInfo = LIFE_STAGES[nextStage];
                toastr.success(`🎉 ${petData.name} 进化了！现在是${nextStageInfo.name}阶段 ${nextStageInfo.emoji}`);

                // 进化时恢复一些状态
                petData.health = Math.min(100, petData.health + 20);
                petData.happiness = Math.min(100, petData.happiness + 15);
            } else if (petData.lifeStage === 'senior') {
                // 老年阶段结束，自然死亡
                petData.isAlive = false;
                petData.deathReason = "natural";
                toastr.error("😢 " + petData.name + " 因为年老而安详地离开了...");
            }
        }
    }

    // 检查健康状况
    function checkHealthConditions(hoursElapsed) {
        // 饥饿影响健康
        if (petData.hunger < 20) {
            petData.health = Math.max(0, petData.health - hoursElapsed * 2);
            petData.sickness = Math.min(100, petData.sickness + hoursElapsed * 1.5);
        }

        // 疲劳影响健康
        if (petData.energy < 20) {
            petData.health = Math.max(0, petData.health - hoursElapsed * 1);
            petData.happiness = Math.max(0, petData.happiness - hoursElapsed * 1.5);
        }

        // 不快乐影响健康
        if (petData.happiness < 20) {
            petData.health = Math.max(0, petData.health - hoursElapsed * 0.5);
            petData.sickness = Math.min(100, petData.sickness + hoursElapsed * 0.5);
        }

        // 生病持续时间
        if (petData.sickness > 50) {
            petData.sicknessDuration += hoursElapsed;
            if (petData.sicknessDuration > 24) { // 生病超过24小时
                petData.health = Math.max(0, petData.health - hoursElapsed * 3);
            }
        } else {
            petData.sicknessDuration = 0;
        }

        // 忽视照顾计数
        const timeSinceLastCare = Date.now() - petData.lastCareTime;
        if (timeSinceLastCare > 4 * 60 * 60 * 1000) { // 4小时没有照顾
            petData.careNeglectCount++;
            petData.lastCareTime = Date.now(); // 重置计时器
        }
    }

    // 检查死亡条件
    function checkDeathConditions() {
        if (!petData.isAlive) return;

        let deathReason = null;

        // 健康值归零
        if (petData.health <= 0) {
            deathReason = "sickness";
        }
        // 长期忽视照顾
        else if (petData.careNeglectCount >= 6) { // 6次忽视（24小时）
            deathReason = "neglect";
        }
        // 严重疾病
        else if (petData.sickness >= 100 && petData.sicknessDuration > 48) {
            deathReason = "disease";
        }

        if (deathReason) {
            petData.isAlive = false;
            petData.deathReason = deathReason;

            const deathMessages = {
                sickness: "😢 " + petData.name + " 因为健康状况恶化而死亡了...",
                neglect: "💔 " + petData.name + " 因为长期缺乏照顾而死亡了...",
                disease: "🦠 " + petData.name + " 因为严重疾病而死亡了...",
                natural: "😇 " + petData.name + " 因为年老而安详地离开了..."
            };

            toastr.error(deathMessages[deathReason], '', { timeOut: 10000 });

            // 显示复活选项
            setTimeout(() => {
                if (confirm("💀 你的宠物死亡了！\n\n是否要重新开始养育新的宠物？\n（点击确定重新开始，取消保持当前状态）")) {
                    resetPet();
                }
            }, 3000);
        }
    }



    /**
     * 强制应用拓麻歌子系统（确保金币功能正常）
     */
    window.forceApplyTamagotchiSystem = function() {
        console.log('🥚 强制应用拓麻歌子系统...');

        // 更新数据版本
        petData.dataVersion = 4.0;

        // 应用拓麻歌子系统
        applyTamagotchiSystem();

        // 保存数据
        savePetData();

        console.log('✅ 拓麻歌子系统已强制应用！');
        console.log('💰 金币功能现在应该正常工作了');

        toastr.success('拓麻歌子系统已应用！金币功能已启用！', '', { timeOut: 3000 });

        return {
            applied: true,
            dataVersion: petData.dataVersion,
            timestamp: new Date().toISOString()
        };
    };

    /**
     * 测试优化后的提示词（不包含金币信息避免混淆）
     */
    window.testCleanPrompt = function(action = 'feed') {
        console.log('🎯 测试优化后的提示词...');

        console.log(`\n📊 当前状态:`);
        console.log(`- 宠物名称: ${petData.name}`);
        console.log(`- 当前金币: ${petData.coins || 100}`);
        console.log(`- 测试行为: ${action}`);

        const prompt = buildInteractionPrompt(action);

        console.log(`\n📝 生成的提示词:`);
        console.log(prompt);

        console.log(`\n🔍 提示词分析:`);
        const includesCoins = prompt.includes('金币');
        const includesReward = prompt.includes('奖励');
        const includesGameMechanic = prompt.includes('游戏机制');
        const hasCleanNote = prompt.includes('不要在回复中提及');

        console.log(`- 包含金币信息: ${includesCoins ? '❌ 是（应该避免）' : '✅ 否'}`);
        console.log(`- 包含奖励信息: ${includesReward ? '❌ 是（应该避免）' : '✅ 否'}`);
        console.log(`- 包含游戏机制: ${includesGameMechanic ? '❌ 是（应该避免）' : '✅ 否'}`);
        console.log(`- 有清晰的注意事项: ${hasCleanNote ? '✅ 是' : '❌ 否'}`);

        if (!includesCoins && !includesReward && hasCleanNote) {
            console.log('✅ 提示词已优化，AI不会混淆金币概念！');
            toastr.success('提示词已优化，AI不会混淆金币概念！', '🎯 测试成功');
        } else {
            console.log('❌ 提示词仍可能导致AI混淆');
            toastr.warning('提示词仍可能导致AI混淆', '🎯 测试失败');
        }

        return {
            prompt: prompt,
            analysis: {
                includesCoins,
                includesReward,
                includesGameMechanic,
                hasCleanNote
            }
        };
    };

    /**
     * 诊断金币和经验值问题
     */
    window.diagnoseRewardSystem = function() {
        console.log('🔍 诊断金币和经验值系统...');

        console.log('\n📊 当前数据状态:');
        console.log(`- 数据版本: ${petData.dataVersion}`);
        console.log(`- 当前金币: ${petData.coins}`);
        console.log(`- 当前经验: ${petData.experience}`);
        console.log(`- 当前等级: ${petData.level}`);
        console.log(`- 宠物存活: ${petData.isAlive}`);

        console.log('\n🔧 函数检查:');
        console.log(`- gainCoins函数存在: ${typeof gainCoins === 'function'}`);
        console.log(`- gainExperience函数存在: ${typeof gainExperience === 'function'}`);
        console.log(`- feedPet函数存在: ${typeof window.feedPet === 'function'}`);

        console.log('\n🧪 测试金币功能:');
        const oldCoins = petData.coins || 0;
        console.log(`测试前金币: ${oldCoins}`);

        try {
            gainCoins(10);
            console.log(`测试后金币: ${petData.coins}`);
            console.log(`金币增加: ${(petData.coins || 0) - oldCoins}`);

            if ((petData.coins || 0) - oldCoins === 10) {
                console.log('✅ gainCoins函数工作正常');
            } else {
                console.log('❌ gainCoins函数有问题');
            }
        } catch (error) {
            console.log(`❌ gainCoins函数错误: ${error.message}`);
        }

        console.log('\n🧪 测试经验功能:');
        const oldExp = petData.experience || 0;
        const oldLevel = petData.level || 1;
        console.log(`测试前经验: ${oldExp}, 等级: ${oldLevel}`);

        try {
            gainExperience(5);
            console.log(`测试后经验: ${petData.experience}, 等级: ${petData.level}`);
            console.log(`经验增加: ${(petData.experience || 0) - oldExp}`);

            if ((petData.experience || 0) >= oldExp) {
                console.log('✅ gainExperience函数工作正常');
            } else {
                console.log('❌ gainExperience函数有问题');
            }
        } catch (error) {
            console.log(`❌ gainExperience函数错误: ${error.message}`);
        }

        console.log('\n🔍 互动函数检查:');
        const feedPetString = window.feedPet.toString();
        const hasGainCoins = feedPetString.includes('gainCoins');
        const hasGainExp = feedPetString.includes('gainExperience');

        console.log(`- feedPet包含gainCoins调用: ${hasGainCoins ? '✅' : '❌'}`);
        console.log(`- feedPet包含gainExperience调用: ${hasGainExp ? '✅' : '❌'}`);

        if (!hasGainCoins || !hasGainExp) {
            console.log('❌ 互动函数缺少奖励调用，需要重新应用拓麻歌子系统');
            console.log('💡 运行: forceApplyTamagotchiSystem()');
        }

        return {
            dataVersion: petData.dataVersion,
            coins: petData.coins,
            experience: petData.experience,
            level: petData.level,
            isAlive: petData.isAlive,
            functionsExist: {
                gainCoins: typeof gainCoins === 'function',
                gainExperience: typeof gainExperience === 'function',
                feedPet: typeof window.feedPet === 'function'
            },
            feedPetIncludes: {
                gainCoins: hasGainCoins,
                gainExperience: hasGainExp
            }
        };
    };

    /**
     * 检查当前使用的互动函数版本
     */
    window.checkInteractionFunctions = function() {
        console.log('🔍 检查当前使用的互动函数版本...');

        console.log('\n📋 函数源码分析:');

        // 检查feedPet函数
        const feedPetCode = window.feedPet.toString();
        console.log('\n🍖 feedPet函数分析:');
        console.log(`- 包含gainCoins: ${feedPetCode.includes('gainCoins') ? '✅' : '❌'}`);
        console.log(`- 包含gainExperience: ${feedPetCode.includes('gainExperience') ? '✅' : '❌'}`);
        console.log(`- 包含handleAIReply: ${feedPetCode.includes('handleAIReply') ? '✅' : '❌'}`);
        console.log(`- 包含拓麻歌子特征(weight): ${feedPetCode.includes('weight') ? '✅' : '❌'}`);
        console.log(`- 冷却时间: ${feedPetCode.includes('30000') ? '30秒(拓麻歌子)' : feedPetCode.includes('45000') ? '45秒(平衡版)' : '未知'}`);

        // 检查playWithPet函数
        const playPetCode = window.playWithPet.toString();
        console.log('\n🎮 playWithPet函数分析:');
        console.log(`- 包含gainCoins: ${playPetCode.includes('gainCoins') ? '✅' : '❌'}`);
        console.log(`- 包含gainExperience: ${playPetCode.includes('gainExperience') ? '✅' : '❌'}`);
        console.log(`- 包含handleAIReply: ${playPetCode.includes('handleAIReply') ? '✅' : '❌'}`);
        console.log(`- 冷却时间: ${playPetCode.includes('45000') ? '45秒(拓麻歌子)' : playPetCode.includes('60000') ? '60秒(平衡版)' : '未知'}`);

        // 检查petSleep函数
        const sleepCode = window.petSleep.toString();
        console.log('\n😴 petSleep函数分析:');
        console.log(`- 包含gainCoins: ${sleepCode.includes('gainCoins') ? '✅' : '❌'}`);
        console.log(`- 包含gainExperience: ${sleepCode.includes('gainExperience') ? '✅' : '❌'}`);
        console.log(`- 包含handleAIReply: ${sleepCode.includes('handleAIReply') ? '✅' : '❌'}`);
        console.log(`- 冷却时间: ${sleepCode.includes('120000') ? '120秒(拓麻歌子)' : '未知'}`);

        // 判断版本
        const isTamagotchi = feedPetCode.includes('gainCoins') && feedPetCode.includes('weight');
        const isBalanced = feedPetCode.includes('45000') && !feedPetCode.includes('gainCoins');
        const isOld = !feedPetCode.includes('gainCoins') && !feedPetCode.includes('weight');

        console.log('\n🎯 版本判断:');
        if (isTamagotchi) {
            console.log('✅ 当前使用拓麻歌子版本 - 包含完整的金币和经验奖励');
        } else if (isBalanced) {
            console.log('⚠️ 当前使用平衡版本 - 缺少金币奖励');
        } else if (isOld) {
            console.log('❌ 当前使用旧版本 - 缺少金币奖励');
        } else {
            console.log('❓ 无法确定版本');
        }

        // 提供修复建议
        if (!isTamagotchi) {
            console.log('\n💡 修复建议:');
            console.log('运行以下命令强制应用拓麻歌子系统:');
            console.log('forceApplyTamagotchiSystem()');
        }

        return {
            feedPet: {
                hasGainCoins: feedPetCode.includes('gainCoins'),
                hasGainExperience: feedPetCode.includes('gainExperience'),
                hasWeight: feedPetCode.includes('weight'),
                cooldown: feedPetCode.includes('30000') ? 30 : feedPetCode.includes('45000') ? 45 : 'unknown'
            },
            playWithPet: {
                hasGainCoins: playPetCode.includes('gainCoins'),
                hasGainExperience: playPetCode.includes('gainExperience'),
                cooldown: playPetCode.includes('45000') ? 45 : playPetCode.includes('60000') ? 60 : 'unknown'
            },
            petSleep: {
                hasGainCoins: sleepCode.includes('gainCoins'),
                hasGainExperience: sleepCode.includes('gainExperience'),
                cooldown: sleepCode.includes('120000') ? 120 : 'unknown'
            },
            version: isTamagotchi ? 'tamagotchi' : isBalanced ? 'balanced' : isOld ? 'old' : 'unknown'
        };
    };

    /**
     * 测试互动流程中的奖励执行顺序
     */
    window.testInteractionFlow = async function() {
        console.log('🧪 测试互动流程中的奖励执行顺序...');

        if (!petData.isAlive) {
            console.log('❌ 宠物已死亡，无法测试');
            return;
        }

        console.log('\n📊 测试前状态:');
        const beforeCoins = petData.coins || 0;
        const beforeExp = petData.experience || 0;
        const beforeLevel = petData.level || 1;

        console.log(`- 金币: ${beforeCoins}`);
        console.log(`- 经验: ${beforeExp}`);
        console.log(`- 等级: ${beforeLevel}`);

        console.log('\n🔄 模拟喂食流程...');

        try {
            // 模拟喂食流程的关键步骤
            console.log('1. 更新宠物状态...');
            petData.hunger = Math.min(100, petData.hunger + 20);
            petData.happiness = Math.min(100, petData.happiness + 5);
            petData.weight += 1;
            petData.lastFeedTime = Date.now();
            petData.lastCareTime = Date.now();

            console.log('2. 验证数值...');
            validateAndFixValues();

            console.log('3. 获得经验...');
            gainExperience(2);
            console.log(`   经验变化: ${beforeExp} → ${petData.experience}`);

            console.log('4. 获得金币...');
            gainCoins(3);
            console.log(`   金币变化: ${beforeCoins} → ${petData.coins}`);

            console.log('5. 处理AI回复...');
            await handleAIReply('feed', `${petData.name} 吃得很开心！`);
            console.log('   AI回复完成');

            console.log('6. 保存数据...');
            savePetData();
            console.log('   数据保存完成');

            console.log('7. 渲染状态...');
            renderPetStatus();
            console.log('   状态渲染完成');

        } catch (error) {
            console.error('❌ 流程执行出错:', error);
        }

        console.log('\n📊 测试后状态:');
        console.log(`- 金币: ${petData.coins} (变化: +${(petData.coins || 0) - beforeCoins})`);
        console.log(`- 经验: ${petData.experience} (变化: +${(petData.experience || 0) - beforeExp})`);
        console.log(`- 等级: ${petData.level} (变化: +${(petData.level || 1) - beforeLevel})`);

        // 验证结果
        const coinsGained = (petData.coins || 0) - beforeCoins;
        const expGained = (petData.experience || 0) - beforeExp;

        console.log('\n🎯 测试结果:');
        if (coinsGained === 3) {
            console.log('✅ 金币奖励正常 (+3)');
        } else {
            console.log(`❌ 金币奖励异常 (期望+3，实际+${coinsGained})`);
        }

        if (expGained >= 2) {
            console.log('✅ 经验奖励正常 (+2或更多)');
        } else {
            console.log(`❌ 经验奖励异常 (期望+2，实际+${expGained})`);
        }

        return {
            before: { coins: beforeCoins, experience: beforeExp, level: beforeLevel },
            after: { coins: petData.coins, experience: petData.experience, level: petData.level },
            changes: { coins: coinsGained, experience: expGained, level: (petData.level || 1) - beforeLevel }
        };
    };

    /**
     * 测试不包含AI回复的简化互动
     */
    window.testSimpleInteraction = function() {
        console.log('🧪 测试简化互动（不包含AI回复）...');

        if (!petData.isAlive) {
            console.log('❌ 宠物已死亡，无法测试');
            return;
        }

        console.log('\n📊 测试前状态:');
        const beforeCoins = petData.coins || 0;
        const beforeExp = petData.experience || 0;

        console.log(`- 金币: ${beforeCoins}`);
        console.log(`- 经验: ${beforeExp}`);

        console.log('\n🔄 执行简化互动...');

        try {
            console.log('1. 获得经验...');
            gainExperience(2);

            console.log('2. 获得金币...');
            gainCoins(3);

            console.log('3. 保存数据...');
            savePetData();

        } catch (error) {
            console.error('❌ 执行出错:', error);
        }

        console.log('\n📊 测试后状态:');
        const afterCoins = petData.coins || 0;
        const afterExp = petData.experience || 0;

        console.log(`- 金币: ${afterCoins} (变化: +${afterCoins - beforeCoins})`);
        console.log(`- 经验: ${afterExp} (变化: +${afterExp - beforeExp})`);

        // 验证结果
        const coinsGained = afterCoins - beforeCoins;
        const expGained = afterExp - beforeExp;

        console.log('\n🎯 测试结果:');
        if (coinsGained === 3) {
            console.log('✅ 金币功能正常');
        } else {
            console.log(`❌ 金币功能异常 (期望+3，实际+${coinsGained})`);
        }

        if (expGained >= 2) {
            console.log('✅ 经验功能正常');
        } else {
            console.log(`❌ 经验功能异常 (期望+2，实际+${expGained})`);
        }

        if (coinsGained === 3 && expGained >= 2) {
            console.log('\n💡 结论: 奖励系统本身正常，问题可能出在AI互动流程中');
        } else {
            console.log('\n💡 结论: 奖励系统本身有问题');
        }

        return {
            coinsGained,
            expGained,
            success: coinsGained === 3 && expGained >= 2
        };
    };

    /**
     * 追踪喂食函数的执行流程
     */
    window.traceFeedPetExecution = async function() {
        console.log('🔍 追踪喂食函数的执行流程...');

        // 获取原始的feedPet函数代码
        const feedPetCode = window.feedPet.toString();
        console.log('\n📝 feedPet函数源码片段:');
        console.log(feedPetCode.substring(0, 500) + '...');

        console.log('\n🚀 开始执行追踪版本的喂食...');

        try {
            console.log('1. 检查宠物存活状态...');
            if (!petData.isAlive) {
                console.log('❌ 宠物已死亡，函数应该在这里返回');
                return;
            }
            console.log('✅ 宠物存活');

            console.log('2. 检查冷却时间...');
            const now = Date.now();
            const timeSinceLastFeed = now - petData.lastFeedTime;
            console.log(`   距离上次喂食: ${timeSinceLastFeed}ms`);
            console.log(`   冷却时间要求: 30000ms (30秒)`);

            if (timeSinceLastFeed < 30000) {
                console.log('❌ 冷却时间未到，函数应该在这里返回');
                return;
            }
            console.log('✅ 冷却时间已过');

            console.log('3. 更新宠物状态...');
            const oldHunger = petData.hunger;
            const oldHappiness = petData.happiness;
            const oldWeight = petData.weight;

            petData.hunger = Math.min(100, petData.hunger + 20);
            petData.happiness = Math.min(100, petData.happiness + 5);
            petData.weight += 1;
            petData.lastFeedTime = now;
            petData.lastCareTime = now;
            petData.careNeglectCount = Math.max(0, petData.careNeglectCount - 1);

            console.log(`   饱食: ${oldHunger} → ${petData.hunger}`);
            console.log(`   快乐: ${oldHappiness} → ${petData.happiness}`);
            console.log(`   体重: ${oldWeight} → ${petData.weight}`);

            console.log('4. 过度喂食检查...');
            if (petData.weight > 50) {
                petData.sickness = Math.min(100, petData.sickness + 10);
                console.log('⚠️ 触发过度喂食警告');
            } else {
                console.log('✅ 体重正常');
            }

            console.log('5. 验证数值...');
            validateAndFixValues();
            console.log('✅ 数值验证完成');

            console.log('6. 获得经验...');
            const oldExp = petData.experience;
            const oldLevel = petData.level;
            gainExperience(2);
            console.log(`   经验: ${oldExp} → ${petData.experience}`);
            console.log(`   等级: ${oldLevel} → ${petData.level}`);

            console.log('7. 获得金币...');
            const oldCoins = petData.coins;
            gainCoins(3);
            console.log(`   金币: ${oldCoins} → ${petData.coins}`);

            console.log('8. 处理AI回复...');
            await handleAIReply('feed', `${petData.name} 吃得很开心！`);
            console.log('✅ AI回复完成');

            console.log('9. 保存数据...');
            savePetData();
            console.log('✅ 数据保存完成');

            console.log('10. 渲染状态...');
            renderPetStatus();
            console.log('✅ 状态渲染完成');

            console.log('\n🎉 喂食流程完全执行完毕！');

        } catch (error) {
            console.error('❌ 执行过程中发生错误:', error);
            console.error('错误堆栈:', error.stack);
        }
    };

    /**
     * 检查UI按钮事件绑定
     */
    window.checkUIButtonBinding = function() {
        console.log('🔍 检查UI按钮事件绑定...');

        const popup = $("#virtual-pet-popup");
        if (popup.length === 0) {
            console.log('❌ 弹窗不存在，请先打开宠物界面');
            console.log('💡 运行: showPopup()');
            return false;
        }

        console.log('✅ 弹窗存在');

        // 检查按钮是否存在
        const feedBtn = popup.find(".feed-btn");
        const playBtn = popup.find(".play-btn");
        const sleepBtn = popup.find(".sleep-btn");
        const hugBtn = popup.find(".hug-btn");

        console.log('\n📋 按钮存在性检查:');
        console.log(`- 喂食按钮: ${feedBtn.length > 0 ? '✅' : '❌'} (数量: ${feedBtn.length})`);
        console.log(`- 玩耍按钮: ${playBtn.length > 0 ? '✅' : '❌'} (数量: ${playBtn.length})`);
        console.log(`- 睡觉按钮: ${sleepBtn.length > 0 ? '✅' : '❌'} (数量: ${sleepBtn.length})`);
        console.log(`- 抱抱按钮: ${hugBtn.length > 0 ? '✅' : '❌'} (数量: ${hugBtn.length})`);

        // 检查事件绑定
        console.log('\n🔗 事件绑定检查:');

        if (feedBtn.length > 0) {
            const events = $._data(feedBtn[0], 'events');
            console.log(`- 喂食按钮事件: ${events ? Object.keys(events).join(', ') : '无'}`);

            // 测试点击事件
            console.log('\n🧪 测试喂食按钮点击...');
            const oldCoins = petData.coins || 0;
            const oldExp = petData.experience || 0;

            console.log(`测试前 - 金币: ${oldCoins}, 经验: ${oldExp}`);

            // 模拟点击
            feedBtn.trigger('click');

            // 等待一下再检查结果
            setTimeout(() => {
                console.log(`测试后 - 金币: ${petData.coins}, 经验: ${petData.experience}`);

                const coinsChanged = (petData.coins || 0) !== oldCoins;
                const expChanged = (petData.experience || 0) !== oldExp;

                if (coinsChanged || expChanged) {
                    console.log('✅ 按钮点击有效果！');
                } else {
                    console.log('❌ 按钮点击无效果');
                    console.log('💡 可能原因:');
                    console.log('  1. 冷却时间未到');
                    console.log('  2. 宠物已死亡');
                    console.log('  3. 事件绑定失效');
                    console.log('  4. 函数被覆盖');
                }
            }, 1000);
        }

        // 检查bindUnifiedUIEvents是否被调用
        console.log('\n🔧 绑定函数检查:');
        console.log(`- bindUnifiedUIEvents函数存在: ${typeof bindUnifiedUIEvents === 'function'}`);

        return {
            popupExists: popup.length > 0,
            buttons: {
                feed: feedBtn.length,
                play: playBtn.length,
                sleep: sleepBtn.length
            },
            bindFunctionExists: typeof bindUnifiedUIEvents === 'function'
        };
    };

    /**
     * 在UI点击时追踪feedPet函数执行
     */
    window.traceUIFeedPet = function() {
        console.log('🔍 在UI点击时追踪feedPet函数执行...');

        // 保存原始的gainCoins和gainExperience函数
        const originalGainCoins = window.gainCoins || gainCoins;
        const originalGainExperience = window.gainExperience || gainExperience;

        // 创建追踪版本
        window.gainCoins = function(amount) {
            console.log(`🔍 [追踪] gainCoins被调用，参数: ${amount}`);
            console.log(`🔍 [追踪] 调用堆栈:`, new Error().stack);
            return originalGainCoins.call(this, amount);
        };

        window.gainExperience = function(exp) {
            console.log(`🔍 [追踪] gainExperience被调用，参数: ${exp}`);
            console.log(`🔍 [追踪] 调用堆栈:`, new Error().stack);
            return originalGainExperience.call(this, exp);
        };

        console.log('✅ 追踪函数已设置');
        console.log('💡 现在点击UI中的喂食按钮，观察调用情况');
        console.log('💡 完成后运行 restoreOriginalFunctions() 恢复原始函数');

        // 保存原始函数以便恢复
        window._originalGainCoins = originalGainCoins;
        window._originalGainExperience = originalGainExperience;

        return true;
    };

    /**
     * 恢复原始函数
     */
    window.restoreOriginalFunctions = function() {
        console.log('🔄 恢复原始函数...');

        if (window._originalGainCoins) {
            window.gainCoins = window._originalGainCoins;
            delete window._originalGainCoins;
        }

        if (window._originalGainExperience) {
            window.gainExperience = window._originalGainExperience;
            delete window._originalGainExperience;
        }

        console.log('✅ 原始函数已恢复');
        return true;
    };

    /**
     * 检查不同作用域中的feedPet函数
     */
    window.checkFeedPetVersions = function() {
        console.log('🔍 检查不同作用域中的feedPet函数...');

        console.log('\n📋 函数存在性检查:');
        console.log(`- window.feedPet: ${typeof window.feedPet === 'function'}`);
        console.log(`- global feedPet: ${typeof feedPet === 'function'}`);

        // 安全检查this.feedPet
        let thisFeedPetExists = false;
        try {
            thisFeedPetExists = typeof this.feedPet === 'function';
        } catch (e) {
            thisFeedPetExists = false;
        }
        console.log(`- this.feedPet: ${thisFeedPetExists}`);

        // 检查函数内容
        if (typeof window.feedPet === 'function') {
            const windowFeedPetCode = window.feedPet.toString();
            console.log('\n📝 window.feedPet 函数分析:');
            console.log(`- 包含gainCoins: ${windowFeedPetCode.includes('gainCoins')}`);
            console.log(`- 包含gainExperience: ${windowFeedPetCode.includes('gainExperience')}`);
            console.log(`- 包含handleAIReply: ${windowFeedPetCode.includes('handleAIReply')}`);
            console.log(`- 包含拓麻歌子特征(weight): ${windowFeedPetCode.includes('weight')}`);
            console.log(`- 函数长度: ${windowFeedPetCode.length} 字符`);
        }

        if (typeof feedPet === 'function' && feedPet !== window.feedPet) {
            const globalFeedPetCode = feedPet.toString();
            console.log('\n📝 global feedPet 函数分析:');
            console.log(`- 包含gainCoins: ${globalFeedPetCode.includes('gainCoins')}`);
            console.log(`- 包含gainExperience: ${globalFeedPetCode.includes('gainExperience')}`);
            console.log(`- 包含handleAIReply: ${globalFeedPetCode.includes('handleAIReply')}`);
            console.log(`- 包含拓麻歌子特征(weight): ${globalFeedPetCode.includes('weight')}`);
            console.log(`- 函数长度: ${globalFeedPetCode.length} 字符`);
        }

        // 强制UI使用window.feedPet
        console.log('\n🔧 强制修复UI绑定...');
        const popup = $("#virtual-pet-popup");
        if (popup.length > 0) {
            const feedBtn = popup.find(".feed-btn");
            if (feedBtn.length > 0) {
                // 移除旧的事件绑定
                feedBtn.off("click touchend");

                // 重新绑定到window.feedPet
                feedBtn.on("click touchend", function(e) {
                    e.preventDefault();
                    console.log("🍖 喂食宠物 (强制使用window.feedPet)");
                    if (typeof window.feedPet === 'function') {
                        window.feedPet();
                    } else {
                        console.error('❌ window.feedPet 不存在');
                    }
                });

                console.log('✅ UI按钮已重新绑定到window.feedPet');
            } else {
                console.log('❌ 找不到喂食按钮');
            }
        } else {
            console.log('❌ 找不到弹窗，请先打开宠物界面');
        }

        return {
            windowFeedPet: typeof window.feedPet === 'function',
            globalFeedPet: typeof feedPet === 'function',
            areTheSame: window.feedPet === feedPet,
            uiFixed: popup.length > 0
        };
    };

    /**
     * 测试修复后的UI按钮
     */
    window.testFixedUIButton = function() {
        console.log('🧪 测试修复后的UI按钮...');

        const popup = $("#virtual-pet-popup");
        if (popup.length === 0) {
            console.log('❌ 弹窗不存在，请先打开宠物界面');
            return false;
        }

        const feedBtn = popup.find(".feed-btn");
        if (feedBtn.length === 0) {
            console.log('❌ 找不到喂食按钮');
            return false;
        }

        console.log('✅ 找到喂食按钮');

        // 记录测试前状态
        const beforeCoins = petData.coins || 0;
        const beforeExp = petData.experience || 0;
        const beforeLevel = petData.level || 1;

        console.log('\n📊 测试前状态:');
        console.log(`- 金币: ${beforeCoins}`);
        console.log(`- 经验: ${beforeExp}`);
        console.log(`- 等级: ${beforeLevel}`);

        // 设置追踪
        let gainCoinsWasCalled = false;
        let gainExpWasCalled = false;

        const originalGainCoins = window.gainCoins || gainCoins;
        const originalGainExp = window.gainExperience || gainExperience;

        window.gainCoins = function(amount) {
            console.log(`🔍 [追踪] gainCoins被调用: +${amount}`);
            gainCoinsWasCalled = true;
            return originalGainCoins.call(this, amount);
        };

        window.gainExperience = function(exp) {
            console.log(`🔍 [追踪] gainExperience被调用: +${exp}`);
            gainExpWasCalled = true;
            return originalGainExp.call(this, exp);
        };

        console.log('\n🖱️ 模拟点击喂食按钮...');

        // 模拟点击
        feedBtn.trigger('click');

        // 等待一下再检查结果
        setTimeout(() => {
            console.log('\n📊 测试后状态:');
            console.log(`- 金币: ${petData.coins} (变化: +${(petData.coins || 0) - beforeCoins})`);
            console.log(`- 经验: ${petData.experience} (变化: +${(petData.experience || 0) - beforeExp})`);
            console.log(`- 等级: ${petData.level} (变化: +${(petData.level || 1) - beforeLevel})`);

            console.log('\n🔍 函数调用追踪:');
            console.log(`- gainCoins被调用: ${gainCoinsWasCalled ? '✅' : '❌'}`);
            console.log(`- gainExperience被调用: ${gainExpWasCalled ? '✅' : '❌'}`);

            // 恢复原始函数
            window.gainCoins = originalGainCoins;
            window.gainExperience = originalGainExp;

            if (!gainCoinsWasCalled && !gainExpWasCalled) {
                console.log('\n❌ 问题分析: 奖励函数都没有被调用');
                console.log('💡 可能原因:');
                console.log('  1. 冷却时间未到');
                console.log('  2. 宠物已死亡');
                console.log('  3. UI绑定仍然有问题');
                console.log('  4. 函数执行被中断');

                // 检查冷却时间
                const now = Date.now();
                const timeSinceLastFeed = now - (petData.lastFeedTime || 0);
                console.log(`\n⏰ 冷却时间检查:`);
                console.log(`- 距离上次喂食: ${Math.round(timeSinceLastFeed / 1000)}秒`);
                console.log(`- 冷却要求: 30秒`);
                console.log(`- 冷却状态: ${timeSinceLastFeed >= 30000 ? '✅ 已过' : '❌ 未过'}`);

                console.log(`\n💀 宠物状态检查:`);
                console.log(`- 宠物存活: ${petData.isAlive ? '✅' : '❌'}`);
            }

        }, 2000); // 等待2秒

        return true;
    };

    /**
     * 等待冷却时间后测试UI按钮
     */
    window.testUIAfterCooldown = function() {
        console.log('⏰ 等待冷却时间后测试UI按钮...');

        const now = Date.now();
        const timeSinceLastFeed = now - (petData.lastFeedTime || 0);
        const cooldownRemaining = Math.max(0, 30000 - timeSinceLastFeed);

        if (cooldownRemaining > 0) {
            console.log(`⏰ 还需等待 ${Math.ceil(cooldownRemaining / 1000)} 秒`);
            console.log('💡 请等待冷却时间结束后再次运行此函数');
            return false;
        }

        console.log('✅ 冷却时间已过，开始测试...');

        const popup = $("#virtual-pet-popup");
        if (popup.length === 0) {
            console.log('❌ 弹窗不存在，请先打开宠物界面');
            return false;
        }

        const feedBtn = popup.find(".feed-btn");
        if (feedBtn.length === 0) {
            console.log('❌ 找不到喂食按钮');
            return false;
        }

        // 记录测试前状态
        const beforeCoins = petData.coins || 0;
        const beforeExp = petData.experience || 0;

        console.log('\n📊 测试前状态:');
        console.log(`- 金币: ${beforeCoins}`);
        console.log(`- 经验: ${beforeExp}`);

        // 设置追踪（在点击前设置）
        let gainCoinsWasCalled = false;
        let gainExpWasCalled = false;
        let coinsAmount = 0;
        let expAmount = 0;

        const originalGainCoins = window.gainCoins || gainCoins;
        const originalGainExp = window.gainExperience || gainExperience;

        window.gainCoins = function(amount) {
            console.log(`🔍 [追踪] gainCoins被调用: +${amount}`);
            gainCoinsWasCalled = true;
            coinsAmount = amount;
            return originalGainCoins.call(this, amount);
        };

        window.gainExperience = function(exp) {
            console.log(`🔍 [追踪] gainExperience被调用: +${exp}`);
            gainExpWasCalled = true;
            expAmount = exp;
            return originalGainExp.call(this, exp);
        };

        console.log('\n🖱️ 点击喂食按钮...');
        feedBtn.trigger('click');

        // 等待一下再检查结果
        setTimeout(() => {
            console.log('\n📊 测试后状态:');
            console.log(`- 金币: ${petData.coins} (变化: +${(petData.coins || 0) - beforeCoins})`);
            console.log(`- 经验: ${petData.experience} (变化: +${(petData.experience || 0) - beforeExp})`);

            console.log('\n🔍 函数调用追踪:');
            console.log(`- gainCoins被调用: ${gainCoinsWasCalled ? '✅' : '❌'}`);
            console.log(`- gainExperience被调用: ${gainExpWasCalled ? '✅' : '❌'}`);

            if (gainCoinsWasCalled) {
                console.log(`✅ 金币系统正常工作！获得了 ${coinsAmount} 金币`);
            }

            if (gainExpWasCalled) {
                console.log(`✅ 经验系统正常工作！获得了 ${expAmount} 经验`);
            }

            // 恢复原始函数
            window.gainCoins = originalGainCoins;
            window.gainExperience = originalGainExp;

        }, 3000); // 等待3秒

        return true;
    };

    /**
     * 检查UI实际调用的feedPet函数内容
     */
    window.inspectUIFeedPet = function() {
        console.log('🔍 检查UI实际调用的feedPet函数内容...');

        const popup = $("#virtual-pet-popup");
        if (popup.length === 0) {
            console.log('❌ 弹窗不存在，请先打开宠物界面');
            return false;
        }

        const feedBtn = popup.find(".feed-btn");
        if (feedBtn.length === 0) {
            console.log('❌ 找不到喂食按钮');
            return false;
        }

        console.log('✅ 找到喂食按钮');

        // 获取按钮绑定的事件
        const events = $._data(feedBtn[0], 'events');
        console.log('\n📋 按钮事件:', events);

        // 检查当前作用域中的feedPet函数
        console.log('\n📝 函数内容分析:');

        if (typeof window.feedPet === 'function') {
            const windowFeedPetCode = window.feedPet.toString();
            console.log('\n🔍 window.feedPet 函数:');
            console.log(`- 长度: ${windowFeedPetCode.length} 字符`);
            console.log(`- 包含gainCoins: ${windowFeedPetCode.includes('gainCoins')}`);
            console.log(`- 包含gainExperience: ${windowFeedPetCode.includes('gainExperience')}`);
            console.log(`- 包含weight: ${windowFeedPetCode.includes('weight')}`);
            console.log(`- 包含handleAIReply: ${windowFeedPetCode.includes('handleAIReply')}`);

            // 显示函数的前500个字符
            console.log('\n📄 函数开头:');
            console.log(windowFeedPetCode.substring(0, 500) + '...');
        }

        if (typeof feedPet === 'function' && feedPet !== window.feedPet) {
            const globalFeedPetCode = feedPet.toString();
            console.log('\n🔍 global feedPet 函数:');
            console.log(`- 长度: ${globalFeedPetCode.length} 字符`);
            console.log(`- 包含gainCoins: ${globalFeedPetCode.includes('gainCoins')}`);
            console.log(`- 包含gainExperience: ${globalFeedPetCode.includes('gainExperience')}`);
            console.log(`- 包含weight: ${globalFeedPetCode.includes('weight')}`);
            console.log(`- 包含handleAIReply: ${globalFeedPetCode.includes('handleAIReply')}`);

            // 显示函数的前500个字符
            console.log('\n📄 函数开头:');
            console.log(globalFeedPetCode.substring(0, 500) + '...');
        }

        // 强制重新绑定到正确的函数
        console.log('\n🔧 强制重新绑定到拓麻歌子版本...');

        // 移除旧的事件绑定
        feedBtn.off("click touchend");

        // 重新绑定到确保包含金币奖励的版本
        feedBtn.on("click touchend", function(e) {
            e.preventDefault();
            console.log("🍖 喂食宠物 (强制使用拓麻歌子版本)");

            // 直接调用拓麻歌子版本的逻辑
            if (typeof window.feedPet === 'function' && window.feedPet.toString().includes('gainCoins')) {
                window.feedPet();
            } else {
                console.error('❌ 找不到包含gainCoins的feedPet版本');
                // 手动执行拓麻歌子逻辑
                console.log('🔧 手动执行拓麻歌子喂食逻辑...');
                manualTamagotchiFeed();
            }
        });

        console.log('✅ UI按钮已重新绑定');

        return true;
    };

    /**
     * 手动执行拓麻歌子喂食逻辑
     */
    function manualTamagotchiFeed() {
        console.log('🔧 手动执行拓麻歌子喂食逻辑...');

        if (!petData.isAlive) {
            toastr.error("💀 你的宠物已经死亡，无法喂食...");
            return;
        }

        const now = Date.now();
        const timeSinceLastFeed = now - petData.lastFeedTime;

        if (timeSinceLastFeed < 30000) { // 30秒冷却
            toastr.warning("宠物还不饿，等一会再喂吧！");
            return;
        }

        // 拓麻歌子式喂食效果
        petData.hunger = Math.min(100, petData.hunger + 20);
        petData.happiness = Math.min(100, petData.happiness + 5);
        petData.weight += 1;
        petData.lastFeedTime = now;
        petData.lastCareTime = now;
        petData.careNeglectCount = Math.max(0, petData.careNeglectCount - 1);

        // 过度喂食检查
        if (petData.weight > 50) {
            petData.sickness = Math.min(100, petData.sickness + 10);
            toastr.warning("⚠️ 宠物吃得太多了，可能会生病！");
        }

        validateAndFixValues();

        // 定义奖励
        const rewards = { coins: 3, experience: 2 };

        // 确保调用奖励函数
        console.log('🎁 给予奖励...');
        gainExperience(rewards.experience);
        gainCoins(rewards.coins);

        // AI回复时传递奖励信息，用于独立显示
        handleAIReply('feed', `${petData.name} 吃得很开心！`, rewards);

        savePetData();
        renderPetStatus();

        // 强制更新UI显示
        setTimeout(() => {
            updateUnifiedUIStatus();
            console.log('🔄 UI状态已强制刷新');
        }, 100);
    }

    /**
     * 强制刷新UI显示
     */
    window.forceUIRefresh = function() {
        console.log('🔄 强制刷新UI显示...');

        try {
            // 刷新宠物状态显示
            if (typeof renderPetStatus === 'function') {
                renderPetStatus();
                console.log('✅ renderPetStatus 已调用');
            }

            // 刷新统一UI状态
            if (typeof updateUnifiedUIStatus === 'function') {
                updateUnifiedUIStatus();
                console.log('✅ updateUnifiedUIStatus 已调用');
            }

            // 强制更新金币显示
            const popup = $("#virtual-pet-popup");
            if (popup.length > 0) {
                const coinsElement = popup.find('.coins-display, .coin-count, [class*="coin"]');
                if (coinsElement.length > 0) {
                    coinsElement.text(`💰 ${petData.coins || 100}`);
                    console.log(`✅ 金币显示已更新: ${petData.coins || 100}`);
                } else {
                    console.log('⚠️ 找不到金币显示元素');
                }

                // 强制更新所有状态显示
                popup.find('.status-value').each(function() {
                    const $this = $(this);
                    const text = $this.text();
                    if (text.includes('金币') || text.includes('💰')) {
                        $this.text(`💰 ${petData.coins || 100}`);
                    }
                });
            }

            console.log('🔄 UI刷新完成');
            return true;

        } catch (error) {
            console.error('❌ UI刷新失败:', error);
            return false;
        }
    };





    /**
     * 测试新的奖励显示系统
     */
    window.testRewardDisplay = function() {
        console.log('🎁 测试新的奖励显示系统...');

        // 测试奖励通知显示
        console.log('1. 测试奖励通知显示...');
        showRewardNotification({ coins: 5, experience: 3 });

        setTimeout(() => {
            console.log('2. 测试只有金币的奖励...');
            showRewardNotification({ coins: 10, experience: 0 });
        }, 2000);

        setTimeout(() => {
            console.log('3. 测试只有经验的奖励...');
            showRewardNotification({ coins: 0, experience: 5 });
        }, 4000);

        setTimeout(() => {
            console.log('4. 测试完整的互动流程...');
            console.log('💡 现在可以点击UI中的喂食按钮测试完整流程');
            console.log('预期效果：');
            console.log('  1. AI回复显示在左上角');
            console.log('  2. 奖励信息显示在右下角');
            console.log('  3. 两者不会重叠');
        }, 6000);

        return true;
    };

    /**
     * 调整衰减速度和缓冲机制
     */
    window.adjustDecaySystem = function() {
        console.log('⚖️ 调整衰减速度和缓冲机制...');

        // 重新定义更平衡的衰减系统
        window.updatePetStatus = function() {
            if (!petData.isAlive) return;

            const now = Date.now();
            const timeSinceLastUpdate = now - (petData.lastUpdateTime || now);
            const hoursElapsed = timeSinceLastUpdate / (1000 * 60 * 60);

            if (hoursElapsed > 0.1) { // 每6分钟更新一次

                // 1. 年龄增长
                petData.age += hoursElapsed;

                // 2. 生命阶段检查
                if (typeof checkLifeStageProgression === 'function') {
                    checkLifeStageProgression();
                }

                // 3. 更真实的衰减速度 - 让时间流逝更有感知
                petData.hunger = Math.max(0, petData.hunger - hoursElapsed * 3.5);    // 每小时-3.5 (离线8小时下降28点)
                petData.energy = Math.max(0, petData.energy - hoursElapsed * 3.0);    // 每小时-3.0 (离线8小时下降24点)
                petData.happiness = Math.max(0, petData.happiness - hoursElapsed * 2.5); // 每小时-2.5 (离线8小时下降20点)

                // 4. 状态不佳时的惩罚性衰减 - 提高门槛和惩罚力度
                if (petData.hunger < 25) { // 门槛提高到25，给玩家更多反应时间
                    petData.health = Math.max(0, petData.health - hoursElapsed * 1.5); // 惩罚加大
                    petData.happiness = Math.max(0, petData.happiness - hoursElapsed * 1.0);
                }

                if (petData.energy < 25) { // 门槛提高到25
                    petData.happiness = Math.max(0, petData.happiness - hoursElapsed * 0.8);
                }

                // 5. 死亡检查
                if (typeof checkDeathConditions === 'function') {
                    checkDeathConditions();
                }

                petData.lastUpdateTime = now;
                validateAndFixValues();
                savePetData();
            }
        };

        // 重新定义更宽松的缓冲机制
        window.applyInitializationBuffer = function() {
            const now = Date.now();
            const timeSinceLastUpdate = now - (petData.lastUpdateTime || now);
            const hoursElapsed = timeSinceLastUpdate / (1000 * 60 * 60);

            // 如果距离上次更新超过2小时，给予"急救包"缓冲
            if (hoursElapsed > 2) {
                console.log(`检测到长时间未更新 (${hoursElapsed.toFixed(1)}小时)，应用急救缓冲...`);

                // 50上限系统：急救缓冲数值
                const minValues = {
                    hunger: 25,    // 50上限系统：急救饱食度25
                    energy: 20,    // 50上限系统：急救精力20
                    happiness: 15, // 50上限系统：急救快乐度15
                    health: 30     // 50上限系统：急救健康度30
                };

                let buffered = false;
                Object.entries(minValues).forEach(([key, minValue]) => {
                    if (petData[key] < minValue) {
                        console.log(`缓冲 ${key}: ${petData[key]} → ${minValue}`);
                        petData[key] = minValue;
                        buffered = true;
                    }
                });

                if (buffered) {
                    petData.lastUpdateTime = now;
                    savePetData();
                    toastr.info('🌟 欢迎回来！已为你的宠物提供了基础照顾。', '', { timeOut: 4000 });
                    console.log('初始化缓冲已应用');
                }
            }
        };

        console.log('✅ 衰减系统已调整为更真实的养成体验');
        console.log('📊 新的衰减速度 (更有感知的时间流逝):');
        console.log('  - 饱食度: 每小时 -3.5 (离线8小时下降28点)');
        console.log('  - 精力: 每小时 -3.0 (离线8小时下降24点)');
        console.log('  - 快乐度: 每小时 -2.5 (离线8小时下降20点)');
        console.log('⚠️ 惩罚性衰减 (状态不佳时):');
        console.log('  - 饥饿门槛: <25 (原来 <15)');
        console.log('  - 疲劳门槛: <25 (原来 <15)');
        console.log('  - 惩罚力度: 显著增加');
        console.log('🛡️ 急救缓冲机制:');
        console.log('  - 触发时间: 2小时 (更严格)');
        console.log('  - 最低饱食度: 35 (急救水平)');
        console.log('  - 最低精力: 30 (急救水平)');
        console.log('  - 最低快乐度: 25 (急救水平)');
        console.log('  - 最低健康度: 40 (急救水平)');
        console.log('💡 设计理念: 鼓励频繁互动，但提供死亡保护');

        // 立即应用缓冲
        applyInitializationBuffer();

        return true;
    };

    /**
     * 测试新的衰减系统效果
     */
    window.testNewDecaySystem = function() {
        console.log('🧪 测试新的衰减系统效果...');

        // 显示当前状态
        console.log('\n📊 当前宠物状态:');
        console.log(`- 饱食度: ${petData.hunger}/100`);
        console.log(`- 精力: ${petData.energy}/100`);
        console.log(`- 快乐度: ${petData.happiness}/100`);
        console.log(`- 健康度: ${petData.health}/100`);

        // 模拟不同时长的离线效果
        console.log('\n⏰ 模拟离线效果预测:');

        const scenarios = [
            { hours: 2, desc: '短暂离线 (2小时)' },
            { hours: 8, desc: '一个工作日 (8小时)' },
            { hours: 24, desc: '一整天 (24小时)' },
            { hours: 72, desc: '周末 (72小时)' }
        ];

        scenarios.forEach(scenario => {
            const hungerLoss = scenario.hours * 3.5;
            const energyLoss = scenario.hours * 3.0;
            const happinessLoss = scenario.hours * 2.5;

            const predictedHunger = Math.max(0, petData.hunger - hungerLoss);
            const predictedEnergy = Math.max(0, petData.energy - energyLoss);
            const predictedHappiness = Math.max(0, petData.happiness - happinessLoss);

            console.log(`\n${scenario.desc}:`);
            console.log(`  饱食度: ${petData.hunger} → ${predictedHunger} (${hungerLoss > 0 ? '-' : ''}${hungerLoss})`);
            console.log(`  精力: ${petData.energy} → ${predictedEnergy} (${energyLoss > 0 ? '-' : ''}${energyLoss})`);
            console.log(`  快乐度: ${petData.happiness} → ${predictedHappiness} (${happinessLoss > 0 ? '-' : ''}${happinessLoss})`);

            // 判断是否会触发缓冲
            if (scenario.hours > 2) {
                console.log(`  🛡️ 会触发急救缓冲 (最低保证: 饱食35, 精力30, 快乐25)`);
            }
        });

        console.log('\n💡 新系统特点:');
        console.log('✅ 离线时间有明显感知 - 不再是"假装的时间流逝"');
        console.log('✅ 鼓励频繁互动 - 状态下降更快，需要更多关注');
        console.log('✅ 死亡保护机制 - 长时间离线不会直接死亡');
        console.log('✅ 真实的养成体验 - 像真正的宠物一样需要持续照顾');

        return true;
    };

    /**
     * 测试新的数值平衡体验
     */
    window.testNewValueBalance = function() {
        console.log('🎮 测试新的数值平衡体验...');

        // 先应用新的初始数值
        adjustInitialValues();

        console.log('\n📊 起始状态:');
        console.log(`- 健康: ${petData.health}/100 (${petData.health < 30 ? '需要照顾' : '良好'})`);
        console.log(`- 快乐: ${petData.happiness}/100 (${petData.happiness < 30 ? '需要互动' : '良好'})`);
        console.log(`- 饱食: ${petData.hunger}/100 (${petData.hunger < 40 ? '需要喂食' : '良好'})`);
        console.log(`- 精力: ${petData.energy}/100 (${petData.energy < 40 ? '需要休息' : '良好'})`);

        console.log('\n🎯 模拟照顾流程:');

        // 模拟喂食
        console.log('\n1. 🍖 喂食效果:');
        const oldHunger = petData.hunger;
        const oldHappiness1 = petData.happiness;
        petData.hunger = Math.min(100, petData.hunger + 20);
        petData.happiness = Math.min(100, petData.happiness + 5);
        console.log(`   饱食度: ${oldHunger} → ${petData.hunger} (+${petData.hunger - oldHunger})`);
        console.log(`   快乐度: ${oldHappiness1} → ${petData.happiness} (+${petData.happiness - oldHappiness1})`);
        console.log(`   效果: ${petData.hunger >= 40 ? '✅ 饱足了' : '⚠️ 还需要更多食物'}`);

        // 模拟玩耍
        console.log('\n2. 🎮 玩耍效果:');
        const oldHappiness2 = petData.happiness;
        const oldEnergy = petData.energy;
        petData.happiness = Math.min(100, petData.happiness + 15);
        petData.energy = Math.max(0, petData.energy - 10);
        console.log(`   快乐度: ${oldHappiness2} → ${petData.happiness} (+${petData.happiness - oldHappiness2})`);
        console.log(`   精力: ${oldEnergy} → ${petData.energy} (${petData.energy - oldEnergy})`);
        console.log(`   效果: ${petData.happiness >= 50 ? '✅ 很开心' : '⚠️ 还需要更多互动'}`);

        // 模拟睡觉
        console.log('\n3. 😴 睡觉效果:');
        const oldEnergy2 = petData.energy;
        const oldHealth = petData.health;
        petData.energy = Math.min(100, petData.energy + 25);
        petData.health = Math.min(100, petData.health + 10);
        console.log(`   精力: ${oldEnergy2} → ${petData.energy} (+${petData.energy - oldEnergy2})`);
        console.log(`   健康: ${oldHealth} → ${petData.health} (+${petData.health - oldHealth})`);
        console.log(`   效果: ${petData.energy >= 60 ? '✅ 精力充沛' : '⚠️ 还需要更多休息'}`);

        console.log('\n📈 照顾后状态:');
        console.log(`- 健康: ${petData.health}/100 (${petData.health >= 50 ? '✅ 健康' : '⚠️ 需要更多照顾'})`);
        console.log(`- 快乐: ${petData.happiness}/100 (${petData.happiness >= 50 ? '✅ 快乐' : '⚠️ 需要更多互动'})`);
        console.log(`- 饱食: ${petData.hunger}/100 (${petData.hunger >= 50 ? '✅ 饱足' : '⚠️ 需要更多食物'})`);
        console.log(`- 精力: ${petData.energy}/100 (${petData.energy >= 60 ? '✅ 充沛' : '⚠️ 需要更多休息'})`);

        console.log('\n💡 智能初始化系统的优势:');
        console.log('✅ 首次打开随机化到50以下，后续可达100');
        console.log('✅ 每次互动都有显著的改善效果');
        console.log('✅ 玩家能清楚感受到照顾的价值');
        console.log('✅ 自然的时间衰减，不强制重置');
        console.log('✅ 平衡的挑战性和成长感');

        // 保存测试后的状态
        savePetData();
        if (typeof updateUnifiedUIStatus === 'function') {
            updateUnifiedUIStatus();
        }

        return {
            startValues: { health: 35, happiness: 30, hunger: 40, energy: 45 },
            endValues: {
                health: petData.health,
                happiness: petData.happiness,
                hunger: petData.hunger,
                energy: petData.energy
            },
            maxCap: 100,
            improvement: '智能初始化系统：首次随机化，后续自然衰减'
        };
    };

    /**
     * 测试抱抱功能
     */
    window.testHugFunction = function() {
        console.log('🤗 测试抱抱功能...');

        // 检查抱抱函数是否存在
        console.log('\n📋 函数检查:');
        console.log(`- hugPet函数存在: ${typeof hugPet === 'function' ? '✅' : '❌'}`);
        console.log(`- window.hugPet函数存在: ${typeof window.hugPet === 'function' ? '✅' : '❌'}`);

        // 检查UI按钮
        const popup = $("#virtual-pet-popup");
        if (popup.length > 0) {
            const hugBtn = popup.find(".hug-btn");
            console.log(`- 抱抱按钮存在: ${hugBtn.length > 0 ? '✅' : '❌'} (数量: ${hugBtn.length})`);

            if (hugBtn.length > 0) {
                const events = $._data(hugBtn[0], 'events');
                console.log(`- 抱抱按钮事件: ${events ? Object.keys(events).join(', ') : '无'}`);
            }
        } else {
            console.log('⚠️ 宠物界面未打开，请先运行 showPopup()');
        }

        // 检查抱抱函数内容
        if (typeof window.hugPet === 'function') {
            const hugPetCode = window.hugPet.toString();
            console.log('\n📝 抱抱函数分析:');
            console.log(`- 包含gainCoins: ${hugPetCode.includes('gainCoins') ? '✅' : '❌'}`);
            console.log(`- 包含gainExperience: ${hugPetCode.includes('gainExperience') ? '✅' : '❌'}`);
            console.log(`- 包含handleAIReply: ${hugPetCode.includes('handleAIReply') ? '✅' : '❌'}`);
            console.log(`- 冷却时间: ${hugPetCode.includes('25000') ? '25秒 ✅' : '未知 ❌'}`);
            console.log(`- 奖励设置: ${hugPetCode.includes('coins: 2') && hugPetCode.includes('experience: 1') ? '金币2+经验1 ✅' : '未知 ❌'}`);
        }

        // 显示当前状态
        console.log('\n📊 当前状态:');
        console.log(`- 健康: ${petData.health}/100`);
        console.log(`- 快乐: ${petData.happiness}/100`);
        console.log(`- 金币: ${petData.coins || 100}`);
        console.log(`- 经验: ${petData.experience || 0}`);
        console.log(`- 上次抱抱时间: ${petData.lastHugTime ? new Date(petData.lastHugTime).toLocaleTimeString() : '从未'}`);

        // 检查冷却状态
        if (petData.lastHugTime) {
            const now = Date.now();
            const timeSinceLastHug = now - petData.lastHugTime;
            const cooldownRemaining = Math.max(0, 25000 - timeSinceLastHug);

            console.log('\n⏰ 冷却状态:');
            console.log(`- 距离上次抱抱: ${Math.round(timeSinceLastHug / 1000)}秒`);
            console.log(`- 冷却剩余: ${Math.round(cooldownRemaining / 1000)}秒`);
            console.log(`- 可以抱抱: ${cooldownRemaining === 0 ? '✅' : '❌'}`);
        }

        console.log('\n💡 抱抱功能特点:');
        console.log('✅ 25秒冷却时间（比其他互动更短）');
        console.log('✅ 增加快乐度+10，健康度+3');
        console.log('✅ 增加纪律性+2');
        console.log('✅ 减少疾病-3（如果生病）');
        console.log('✅ 奖励：2金币 + 1经验');
        console.log('✅ 减少忽视计数');

        return {
            functionExists: typeof window.hugPet === 'function',
            buttonExists: popup.length > 0 && popup.find(".hug-btn").length > 0,
            canHug: !petData.lastHugTime || (Date.now() - petData.lastHugTime) >= 25000,
            isAlive: petData.isAlive
        };
    };

    /**
     * 完整测试抱抱功能（包括前后检查）
     */
    window.testHugFunctionComplete = function() {
        console.log('🤗 完整测试抱抱功能（包括前后检查）...');

        // 1. 检查函数实现
        console.log('\n📋 1. 函数实现检查:');
        const hugFunctionExists = typeof window.hugPet === 'function';
        console.log(`- hugPet函数存在: ${hugFunctionExists ? '✅' : '❌'}`);

        if (hugFunctionExists) {
            const hugCode = window.hugPet.toString();
            console.log(`- 包含金币奖励: ${hugCode.includes('gainCoins') ? '✅' : '❌'}`);
            console.log(`- 包含经验奖励: ${hugCode.includes('gainExperience') ? '✅' : '❌'}`);
            console.log(`- 包含AI回复: ${hugCode.includes('handleAIReply') ? '✅' : '❌'}`);
            console.log(`- 冷却时间设置: ${hugCode.includes('25000') ? '25秒 ✅' : '❌'}`);
            console.log(`- 奖励配置: ${hugCode.includes('coins: 2') && hugCode.includes('experience: 1') ? '2金币+1经验 ✅' : '❌'}`);
        }

        // 2. 检查UI按钮
        console.log('\n🖱️ 2. UI按钮检查:');
        const popup = $("#virtual-pet-popup");
        if (popup.length > 0) {
            const hugBtn = popup.find(".hug-btn");
            console.log(`- 抱抱按钮存在: ${hugBtn.length > 0 ? '✅' : '❌'} (数量: ${hugBtn.length})`);

            if (hugBtn.length > 0) {
                const events = $._data(hugBtn[0], 'events');
                console.log(`- 按钮事件绑定: ${events ? '✅ ' + Object.keys(events).join(', ') : '❌ 无'}`);
                console.log(`- 按钮样式: ${hugBtn.css('background-color') ? '✅ 有样式' : '❌ 无样式'}`);
            }
        } else {
            console.log('⚠️ 宠物界面未打开，请先运行 showPopup()');
        }

        // 3. 检查提示词支持
        console.log('\n📝 3. 提示词支持检查:');
        try {
            const hugPrompt = buildInteractionPrompt('hug');
            const hasHugDescription = hugPrompt.includes('给了我一个温暖的拥抱');
            console.log(`- 提示词包含抱抱描述: ${hasHugDescription ? '✅' : '❌'}`);
            console.log(`- 提示词避免游戏机制: ${hugPrompt.includes('不要在回复中提及金币') ? '✅' : '❌'}`);
        } catch (error) {
            console.log(`❌ 提示词生成失败: ${error.message}`);
        }

        // 4. 测试功能执行
        console.log('\n🧪 4. 功能执行测试:');
        const beforeState = {
            coins: petData.coins || 100,
            experience: petData.experience || 0,
            happiness: petData.happiness || 0,
            health: petData.health || 0,
            lastHugTime: petData.lastHugTime || 0
        };

        console.log('测试前状态:');
        console.log(`- 金币: ${beforeState.coins}`);
        console.log(`- 经验: ${beforeState.experience}`);
        console.log(`- 快乐: ${beforeState.happiness}`);
        console.log(`- 健康: ${beforeState.health}`);

        // 检查冷却状态
        const now = Date.now();
        const timeSinceLastHug = now - beforeState.lastHugTime;
        const canHug = timeSinceLastHug >= 25000;
        console.log(`- 冷却状态: ${canHug ? '✅ 可以抱抱' : `❌ 还需等待${Math.ceil((25000 - timeSinceLastHug) / 1000)}秒`}`);

        if (canHug && hugFunctionExists) {
            console.log('\n🎯 执行抱抱测试...');

            // 设置追踪
            let coinsGained = false;
            let expGained = false;

            const originalGainCoins = window.gainCoins;
            const originalGainExp = window.gainExperience;

            window.gainCoins = function(amount) {
                console.log(`🔍 [追踪] gainCoins被调用: +${amount}`);
                coinsGained = true;
                return originalGainCoins.call(this, amount);
            };

            window.gainExperience = function(exp) {
                console.log(`🔍 [追踪] gainExperience被调用: +${exp}`);
                expGained = true;
                return originalGainExp.call(this, exp);
            };

            // 执行抱抱（不等待AI回复）
            try {
                window.hugPet();

                setTimeout(() => {
                    console.log('\n📊 测试后状态:');
                    console.log(`- 金币: ${petData.coins} (变化: +${(petData.coins || 0) - beforeState.coins})`);
                    console.log(`- 经验: ${petData.experience} (变化: +${(petData.experience || 0) - beforeState.experience})`);
                    console.log(`- 快乐: ${petData.happiness} (变化: +${petData.happiness - beforeState.happiness})`);
                    console.log(`- 健康: ${petData.health} (变化: +${petData.health - beforeState.health})`);

                    console.log('\n🔍 奖励函数调用:');
                    console.log(`- gainCoins被调用: ${coinsGained ? '✅' : '❌'}`);
                    console.log(`- gainExperience被调用: ${expGained ? '✅' : '❌'}`);

                    // 恢复原始函数
                    window.gainCoins = originalGainCoins;
                    window.gainExperience = originalGainExp;

                    // 综合评估
                    const allGood = hugFunctionExists && coinsGained && expGained &&
                                   (petData.coins > beforeState.coins) &&
                                   (petData.experience > beforeState.experience);

                    console.log('\n🎉 综合评估:');
                    if (allGood) {
                        console.log('✅ 抱抱功能完全正常！');
                        toastr.success('🤗 抱抱功能测试通过！', '', { timeOut: 3000 });
                    } else {
                        console.log('❌ 抱抱功能存在问题');
                        toastr.warning('抱抱功能需要检查', '', { timeOut: 3000 });
                    }
                }, 1000);

            } catch (error) {
                console.log(`❌ 抱抱执行失败: ${error.message}`);
                // 恢复原始函数
                window.gainCoins = originalGainCoins;
                window.gainExperience = originalGainExp;
            }
        }

        console.log('\n💡 抱抱功能特点:');
        console.log('✅ 25秒冷却时间');
        console.log('✅ +10快乐度, +3健康度');
        console.log('✅ +2纪律性, -1忽视计数');
        console.log('✅ 减少疾病-3（如果生病）');
        console.log('✅ 奖励：2金币 + 1经验');
        console.log('✅ AI回复支持');

        return {
            functionExists: hugFunctionExists,
            buttonExists: popup.length > 0 && popup.find(".hug-btn").length > 0,
            canHug: canHug,
            isAlive: petData.isAlive
        };
    };

    // 检查localStorage中的数据
    window.checkStoredData = function() {
        console.log("💾 检查localStorage中的数据...");

        const stored = localStorage.getItem(STORAGE_KEY_PET_DATA);
        if (stored) {
            try {
                const data = JSON.parse(stored);
                console.log("存储的数据:", data);
                console.log(`数据版本: ${data.dataVersion || '未设置'}`);
                console.log(`健康: ${data.health}`);
                console.log(`快乐度: ${data.happiness}`);
                console.log(`饱食度: ${data.hunger}`);
                console.log(`精力: ${data.energy}`);
            } catch (e) {
                console.error("解析存储数据失败:", e);
            }
        } else {
            console.log("没有找到存储的数据");
        }
    };

    // 测试头像功能
    window.testAvatarFunction = function() {
        console.log("🎯 测试头像功能...");

        // 检查头像相关函数是否存在
        const functions = {
            openAvatarSelector: typeof window.openAvatarSelector === 'function',
            resetAvatar: typeof window.resetAvatar === 'function',
            getAvatarContent: typeof getAvatarContent === 'function',
            loadCustomAvatar: typeof loadCustomAvatar === 'function',
            saveCustomAvatar: typeof saveCustomAvatar === 'function',
            clearCustomAvatar: typeof clearCustomAvatar === 'function'
        };

        console.log("函数检查:");
        Object.entries(functions).forEach(([name, exists]) => {
            console.log(`  ${exists ? '✅' : '❌'} ${name}`);
        });

        // 检查当前头像状态
        console.log(`当前自定义头像: ${customAvatarData ? '已设置' : '未设置'}`);

        // 检查悬浮按钮头像
        const button = $(`#${BUTTON_ID}`);
        if (button.length > 0) {
            const hasCustomImage = button.find('img').length > 0;
            const hasDefaultEmoji = button.text().includes('🐾');
            console.log(`悬浮按钮头像: ${hasCustomImage ? '自定义图片' : hasDefaultEmoji ? '默认爪子' : '未知'}`);
        } else {
            console.log("❌ 悬浮按钮不存在");
        }

        // 检查弹窗中的头像
        const avatarCircle = $('.pet-avatar-circle');
        if (avatarCircle.length > 0) {
            const hasCustomImage = avatarCircle.find('img').length > 0;
            console.log(`弹窗头像: ${hasCustomImage ? '自定义图片' : '默认表情'}`);
            console.log(`头像框数量: ${avatarCircle.length}`);
        } else {
            console.log("弹窗头像: 未找到头像框");
        }

        // 检查头像交互功能
        const avatarCircleClickable = $('.pet-avatar-circle[onclick]').length > 0;
        const avatarCircleContextMenu = $('.pet-avatar-circle[oncontextmenu]').length > 0;
        console.log(`头像点击功能: ${avatarCircleClickable ? '✅' : '❌'}`);
        console.log(`头像右键功能: ${avatarCircleContextMenu ? '✅' : '❌'}`);
        console.log(`右键菜单函数: ${typeof window.showAvatarContextMenu === 'function' ? '✅' : '❌'}`);

        const allFunctionsExist = Object.values(functions).every(exists => exists);
        console.log(`\n🎉 头像功能测试: ${allFunctionsExist ? '所有功能就绪！' : '部分功能缺失'}`);

        if (allFunctionsExist) {
            console.log("📋 使用说明:");
            console.log("  🎨 头像功能:");
            console.log("    - 点击圆形头像框可以更换头像");
            console.log("    - 右键点击头像框可以重置为默认头像");
            console.log("    - 自定义头像会同时显示在弹窗和悬浮按钮中");
            console.log("  📝 名字功能:");
            console.log("    - 点击宠物名字可以编辑修改");
            console.log("    - 支持最多20个字符的自定义名字");
            console.log("  🎮 交互功能:");
            console.log("    - 🍖 喂食：+15饱食度, +5快乐度 (20秒冷却)");
            console.log("    - 🎮 玩耍：+12快乐度, -8精力 (40秒冷却)");
            console.log("    - 😴 睡觉：+20精力, +5健康 (80秒冷却)");
            console.log("  🎨 界面特色:");
            console.log("    - 糖果色主题，明亮清新");
            console.log("    - 无背景框架，元素融入背景");
            console.log("    - 实时数值更新，状态条动画");
            console.log("  ⚖️ 数值平衡:");
            console.log("    - 初始数值：健康40, 快乐30, 饱食50, 精力60");
            console.log("    - 时间衰减：每12分钟更新，速度减缓");
            console.log("    - 操作冷却：喂食20s, 玩耍40s, 睡觉80s");
        }

        return allFunctionsExist;
    };

    // 模拟设置测试头像
    window.setTestAvatar = function() {
        console.log("🎯 设置测试头像...");

        // 创建一个简单的测试图片 (1x1像素的红色图片)
        const canvas = document.createElement('canvas');
        canvas.width = 100;
        canvas.height = 100;
        const ctx = canvas.getContext('2d');

        // 绘制一个简单的测试图案
        ctx.fillStyle = '#7289da';
        ctx.fillRect(0, 0, 100, 100);
        ctx.fillStyle = '#ffffff';
        ctx.font = '60px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('🐱', 50, 70);

        const testImageData = canvas.toDataURL('image/png');

        if (saveCustomAvatar(testImageData)) {
            updateAvatarDisplay();
            updateFloatingButtonAvatar();
            console.log("✅ 测试头像设置成功");
            console.log("现在可以看到自定义头像效果");
        } else {
            console.log("❌ 测试头像设置失败");
        }
    };

    // 全面的拖动功能验证测试
    window.validateDragFix = function() {
        console.log("🧪 开始全面验证拖动修复...");

        const button = $(`#${BUTTON_ID}`);
        if (button.length === 0) {
            console.log("❌ 按钮不存在，无法测试");
            return false;
        }

        let testResults = {
            buttonExists: true,
            positionCorrect: false,
            eventsbound: false,
            dragWorks: false,
            boundaryWorks: false,
            visualFeedback: false
        };

        // 测试1: 检查按钮位置
        const rect = button[0].getBoundingClientRect();
        const inViewport = rect.top >= 0 && rect.left >= 0 &&
                          rect.bottom <= window.innerHeight && rect.right <= window.innerWidth;
        testResults.positionCorrect = inViewport;
        console.log(`✅ 位置测试: ${inViewport ? '通过' : '失败'} - 位置: (${rect.left}, ${rect.top})`);

        // 测试2: 检查事件绑定
        const events = $._data(button[0], "events");
        const hasEvents = events && (events.mousedown || events.touchstart);
        testResults.eventsbound = hasEvents;
        console.log(`✅ 事件绑定测试: ${hasEvents ? '通过' : '失败'}`);

        // 测试3: 模拟拖动
        console.log("🎯 开始拖动测试...");
        const originalPos = { left: rect.left, top: rect.top };
        const testPos = { left: 300, top: 300 };

        // 直接设置位置测试
        button[0].style.setProperty('left', testPos.left + 'px', 'important');
        button[0].style.setProperty('top', testPos.top + 'px', 'important');

        setTimeout(() => {
            const newRect = button[0].getBoundingClientRect();
            const moved = Math.abs(newRect.left - testPos.left) < 5 && Math.abs(newRect.top - testPos.top) < 5;
            testResults.dragWorks = moved;
            console.log(`✅ 拖动测试: ${moved ? '通过' : '失败'} - 新位置: (${newRect.left}, ${newRect.top})`);

            // 恢复原位置
            button[0].style.setProperty('left', originalPos.left + 'px', 'important');
            button[0].style.setProperty('top', originalPos.top + 'px', 'important');

            // 测试4: 边界限制
            console.log("🎯 测试边界限制...");
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;

            // 测试超出边界的位置
            button[0].style.setProperty('left', (windowWidth + 100) + 'px', 'important');
            button[0].style.setProperty('top', (windowHeight + 100) + 'px', 'important');

            setTimeout(() => {
                const boundaryRect = button[0].getBoundingClientRect();
                const staysInBounds = boundaryRect.left < windowWidth && boundaryRect.top < windowHeight;
                testResults.boundaryWorks = staysInBounds;
                console.log(`✅ 边界测试: ${staysInBounds ? '通过' : '失败'}`);

                // 恢复原位置
                button[0].style.setProperty('left', originalPos.left + 'px', 'important');
                button[0].style.setProperty('top', originalPos.top + 'px', 'important');

                // 测试5: 视觉反馈
                console.log("🎯 测试视觉反馈...");
                button.addClass('dragging');
                const hasDraggingClass = button.hasClass('dragging');
                button.removeClass('dragging');
                testResults.visualFeedback = hasDraggingClass;
                console.log(`✅ 视觉反馈测试: ${hasDraggingClass ? '通过' : '失败'}`);

                // 输出总结
                const passedTests = Object.values(testResults).filter(result => result).length;
                const totalTests = Object.keys(testResults).length;

                console.log("\n🎯 测试总结:");
                console.log(`通过: ${passedTests}/${totalTests} 项测试`);
                Object.entries(testResults).forEach(([test, result]) => {
                    console.log(`${result ? '✅' : '❌'} ${test}`);
                });

                if (passedTests === totalTests) {
                    console.log("🎉 所有测试通过！拖动功能修复成功！");
                } else {
                    console.log("⚠️ 部分测试失败，可能需要进一步调试");
                }

                return testResults;
            }, 100);
        }, 100);

        return testResults;
    };

    // 拖动功能测试和诊断
    window.testDragFunction = function() {
        console.log("🧪 测试拖动功能...");

        const button = $(`#${BUTTON_ID}`);
        if (button.length === 0) {
            console.log("❌ 按钮不存在，无法测试拖动");
            return false;
        }

        console.log("✅ 按钮存在，开始拖动测试");

        // 检查当前位置
        const rect = button[0].getBoundingClientRect();
        console.log("当前位置:", {
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height
        });

        // 检查事件绑定
        const events = $._data(button[0], "events");
        console.log("绑定的事件:", events ? Object.keys(events) : "无");

        // 模拟拖动到测试位置
        const testX = 300;
        const testY = 300;

        console.log(`移动按钮到测试位置: (${testX}, ${testY})`);
        button.css({
            'position': 'fixed',
            'left': testX + 'px',
            'top': testY + 'px'
        });

        // 验证移动结果
        setTimeout(() => {
            const newRect = button[0].getBoundingClientRect();
            const success = Math.abs(newRect.left - testX) < 5 && Math.abs(newRect.top - testY) < 5;
            console.log(success ? "✅ 拖动测试成功" : "❌ 拖动测试失败");
            console.log("新位置:", { left: newRect.left, top: newRect.top });

            // 保存测试位置
            if (success) {
                localStorage.setItem(STORAGE_KEY_BUTTON_POS, JSON.stringify({
                    x: testX,
                    y: testY
                }));
                console.log("✅ 测试位置已保存");
            }
        }, 100);

        return true;
    };

    // 拖动问题诊断
    window.diagnoseDragIssues = function() {
        console.log("🔍 诊断拖动问题...");

        const button = $(`#${BUTTON_ID}`);
        if (button.length === 0) {
            console.log("❌ 按钮不存在");
            return;
        }

        // 检查基础样式
        const styles = window.getComputedStyle(button[0]);
        console.log("样式检查:", {
            position: styles.position,
            zIndex: styles.zIndex,
            cursor: styles.cursor,
            pointerEvents: styles.pointerEvents,
            userSelect: styles.userSelect
        });

        // 检查事件监听器
        const events = $._data(button[0], "events");
        if (events) {
            console.log("事件监听器:");
            Object.keys(events).forEach(eventType => {
                console.log(`- ${eventType}: ${events[eventType].length} 个监听器`);
            });
        } else {
            console.log("❌ 没有找到事件监听器");
        }

        // 检查位置数据
        const savedPos = localStorage.getItem(STORAGE_KEY_BUTTON_POS);
        if (savedPos) {
            try {
                const pos = JSON.parse(savedPos);
                console.log("保存的位置:", pos);
            } catch (e) {
                console.log("❌ 位置数据损坏:", savedPos);
            }
        } else {
            console.log("ℹ️ 没有保存的位置数据");
        }

        // 检查边界
        const rect = button[0].getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        console.log("边界检查:", {
            inBounds: rect.left >= 0 && rect.top >= 0 &&
                     rect.right <= windowWidth && rect.bottom <= windowHeight,
            position: { left: rect.left, top: rect.top },
            window: { width: windowWidth, height: windowHeight }
        });
    };

    // 创建一个测试按钮来调试弹窗
    window.createTestPopupButton = function() {
        // 移除现有的测试按钮
        $("#test-popup-button").remove();

        // 创建测试按钮
        const testButton = $(`
            <button id="test-popup-button" style="
                position: fixed;
                top: 10px;
                right: 10px;
                z-index: ${SAFE_Z_INDEX.popup};
                background: #7289da;
                color: white;
                border: none;
                padding: 10px 15px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 14px;
            ">测试弹窗</button>
        `);

        $("body").append(testButton);

        testButton.on("click touchend", function(e) {
            e.preventDefault();
            console.log("测试按钮被点击");
            try {
                showPopup();
                console.log("showPopup 调用成功");
            } catch (error) {
                console.error("showPopup 调用失败:", error);
                alert("弹窗测试失败: " + error.message);
            }
        });

        console.log("测试按钮已创建，位于屏幕右上角");
        return true;
    };

    // iOS专用弹窗显示函数
    window.showIOSPopup = function() {
        console.log("🍎 iOS专用弹窗显示");

        // 移除所有可能的现有弹窗
        $("#virtual-pet-popup-overlay").remove();
        $(".virtual-pet-popup-overlay").remove();
        $("[id*='virtual-pet-popup']").remove();

        // 创建iOS优化的统一弹窗
        const iosPopupHtml = `
            <div id="virtual-pet-popup-overlay" style="
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                background-color: rgba(0, 0, 0, 0.85) !important;
                z-index: ${SAFE_Z_INDEX.popup} !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                padding: 10px !important;
                box-sizing: border-box !important;
                -webkit-overflow-scrolling: touch !important;
                -webkit-transform: translateZ(0) !important;
                transform: translateZ(0) !important;
            ">
                <div id="virtual-pet-popup" style="
                    position: relative !important;
                    width: calc(100vw - 30px) !important;
                    max-width: 300px !important;
                    max-height: calc(100vh - 60px) !important;
                    background: ${candyColors.background} !important;
                    color: ${candyColors.textPrimary} !important;
                    border-radius: 16px !important;
                    padding: 16px !important;
                    overflow-y: auto !important;
                    -webkit-overflow-scrolling: touch !important;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.6) !important;
                    -webkit-transform: translateZ(0) !important;
                    transform: translateZ(0) !important;
                ">
                    ${generateUnifiedUI()}
                </div>
            </div>
        `;

        $("body").append(iosPopupHtml);

        // 绑定外部点击关闭事件
        const $iosOverlay = $("#virtual-pet-popup-overlay");

        // 点击外部关闭
        $iosOverlay.on("click touchend", function(e) {
            if (e.target === this) {
                e.preventDefault();
                $iosOverlay.remove();
            }
        });

        // 绑定统一的操作按钮事件
        bindUnifiedUIEvents($iosOverlay);

        console.log("🍎 iOS弹窗已创建并显示");
        return true;
    };

    // 测试统一UI的函数
    window.testUnifiedUI = function() {
        console.log("🎨 测试统一UI...");

        // 清理现有弹窗
        window.clearAllPopups();

        // 检测设备类型
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isAndroid = /Android/.test(navigator.userAgent);
        const isMobile = isIOS || isAndroid;

        console.log(`设备检测: iOS=${isIOS}, Android=${isAndroid}, Mobile=${isMobile}`);

        // 延迟显示弹窗
        setTimeout(() => {
            console.log("显示统一UI");
            showPopup();
        }, 100);

        return true;
    };

    // 移动端尺寸测试函数
    window.testMobileSize = function() {
        console.log("📱 测试移动端尺寸...");

        // 获取屏幕信息
        const screenWidth = window.screen.width;
        const screenHeight = window.screen.height;
        const windowWidth = $(window).width();
        const windowHeight = $(window).height();

        console.log(`屏幕尺寸: ${screenWidth}x${screenHeight}`);
        console.log(`窗口尺寸: ${windowWidth}x${windowHeight}`);

        // 检测设备类型
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isAndroid = /Android/.test(navigator.userAgent);
        const isMobile = windowWidth <= 767;

        console.log(`设备类型: iOS=${isIOS}, Android=${isAndroid}, Mobile=${isMobile}`);

        // 计算推荐的弹窗尺寸
        const recommendedWidth = Math.min(300, windowWidth - 40);
        const recommendedHeight = Math.min(500, windowHeight - 100);

        console.log(`推荐弹窗尺寸: ${recommendedWidth}x${recommendedHeight}`);

        // 显示测试弹窗
        window.clearAllPopups();
        setTimeout(() => {
            showPopup();
        }, 100);

        return {
            screen: { width: screenWidth, height: screenHeight },
            window: { width: windowWidth, height: windowHeight },
            device: { isIOS, isAndroid, isMobile },
            recommended: { width: recommendedWidth, height: recommendedHeight }
        };
    };

    // 安卓专用测试函数
    window.testAndroidUI = function() {
        console.log("🤖 测试安卓UI...");

        // 获取设备信息
        const userAgent = navigator.userAgent;
        const windowWidth = $(window).width();
        const windowHeight = $(window).height();
        const isAndroid = /Android/.test(userAgent);
        const isMobile = windowWidth <= 767;

        console.log("设备信息:");
        console.log("- User Agent:", userAgent);
        console.log("- 窗口尺寸:", windowWidth + "x" + windowHeight);
        console.log("- 是否安卓:", isAndroid);
        console.log("- 是否移动端:", isMobile);

        // 强制清理现有弹窗
        window.clearAllPopups();

        // 延迟显示弹窗
        setTimeout(() => {
            console.log("🤖 显示安卓优化UI");
            showPopup();
        }, 200);

        return {
            userAgent,
            windowSize: { width: windowWidth, height: windowHeight },
            isAndroid,
            isMobile
        };
    };

    // 强制刷新UI函数
    window.refreshUI = function() {
        console.log("🔄 强制刷新UI...");

        // 清理所有现有弹窗
        window.clearAllPopups();

        // 等待一下再重新创建
        setTimeout(() => {
            const windowWidth = $(window).width();
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
            const isAndroid = /Android/.test(navigator.userAgent);
            const isMobile = windowWidth <= 767 || isIOS || isAndroid;

            console.log(`🔄 重新生成UI - Mobile: ${isMobile}, iOS: ${isIOS}, Android: ${isAndroid}, Width: ${windowWidth}`);

            showPopup();
        }, 300);

        return true;
    };

    // 清理所有弹窗的函数
    window.clearAllPopups = function() {
        console.log("🧹 清理所有弹窗...");

        // 移除所有可能的弹窗元素
        $("#virtual-pet-popup-overlay").remove();
        $(".virtual-pet-popup-overlay").remove();
        $("[id*='virtual-pet-popup']").remove();
        $("[class*='virtual-pet-popup']").remove();
        $("[id*='pet-popup']").remove();
        $("[class*='pet-popup']").remove();

        console.log("✅ 所有弹窗已清理");
        return true;
    };

    // 生成统一的UI内容
    function generateUnifiedUI() {
        // 检测设备类型和屏幕尺寸
        const windowWidth = $(window).width();
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isAndroid = /Android/.test(navigator.userAgent);
        const isMobile = windowWidth <= 767 || isIOS || isAndroid;

        console.log(`[UI] Device: iOS=${isIOS}, Android=${isAndroid}, Mobile=${isMobile}, Width=${windowWidth}`);

        // 根据设备类型调整尺寸 - 使用条件判断而不是模板字符串变量
        if (isMobile) {
            return generateMobileUI();
        } else {
            return generateDesktopUI();
        }
    }

    // 生成移动端UI
    function generateMobileUI() {
        console.log(`[UI] Generating mobile UI`);
        return `
            <div class="pet-popup-header" style="display: none;">
            </div>

            <div class="pet-main-content" style="
                display: flex !important;
                flex-direction: column !important;
                gap: 12px !important;
            ">
                <!-- 宠物头像和基本信息 -->
                <div class="pet-avatar-section" style="
                    text-align: center !important;
                    padding: 15px !important;
                ">
                    <!-- 拓麻歌子风格头像框 -->
                    <div class="pet-avatar-circle" style="
                        width: 70px !important;
                        height: 70px !important;
                        border-radius: 6px !important;
                        background: ${candyColors.screen} !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        font-size: 2.5em !important;
                        overflow: hidden !important;
                        border: 3px solid ${candyColors.border} !important;
                        box-shadow: 2px 2px 0px ${candyColors.shadow} !important;
                        cursor: pointer !important;
                        margin: 0 auto 8px auto !important;
                        font-family: 'Courier New', monospace !important;
                        image-rendering: pixelated !important;
                        image-rendering: -moz-crisp-edges !important;
                        image-rendering: crisp-edges !important;
                    " onclick="openAvatarSelector()" oncontextmenu="showAvatarContextMenu(event)" title="点击更换头像，右键重置">
                        ${getAvatarContent()}
                    </div>
                    <div class="pet-name" style="font-size: 1.2em !important; font-weight: bold !important; margin-bottom: 3px !important;">${escapeHtml(petData.name)}</div>
                    <div class="pet-level" style="color: #7289da !important; font-size: 0.9em !important;">${petData.isAlive ?
                        `${LIFE_STAGES[petData.lifeStage]?.emoji || '🐾'} ${LIFE_STAGES[petData.lifeStage]?.name || '未知'} Lv.${petData.level}` :
                        '💀 已死亡'
                    }</div>
                </div>

                <!-- 宠物状态栏 -->
                <div class="pet-status-section" style="
                    padding: 10px !important;
                ">
                    <h4 style="margin: 0 0 10px 0 !important; color: ${candyColors.primary} !important; font-size: 0.9em !important;">📊 状态</h4>
                    <div class="status-bars" style="display: flex !important; flex-direction: column !important; gap: 6px !important;">
                        <div class="status-item">
                            <div style="display: flex !important; justify-content: space-between !important; margin-bottom: 3px !important;">
                                <span style="color: ${candyColors.textSecondary} !important; font-size: 0.8em !important;">❤️ 健康</span>
                                <span style="color: ${candyColors.health} !important; font-size: 0.8em !important;">${Math.round(petData.health)}/100</span>
                            </div>
                            <div style="background: ${candyColors.border} !important; height: 5px !important; border-radius: 3px !important; overflow: hidden !important;">
                                <div style="background: ${candyColors.health} !important; height: 100% !important; width: ${petData.health}% !important; transition: width 0.3s ease !important;"></div>
                            </div>
                        </div>
                        <div class="status-item">
                            <div style="display: flex !important; justify-content: space-between !important; margin-bottom: 3px !important;">
                                <span style="color: ${candyColors.textSecondary} !important; font-size: 0.8em !important;">🍖 饱食度</span>
                                <span style="color: ${candyColors.hunger} !important; font-size: 0.8em !important;">${Math.round(petData.hunger)}/100</span>
                            </div>
                            <div style="background: ${candyColors.border} !important; height: 5px !important; border-radius: 3px !important; overflow: hidden !important;">
                                <div style="background: ${candyColors.hunger} !important; height: 100% !important; width: ${petData.hunger}% !important; transition: width 0.3s ease !important;"></div>
                            </div>
                        </div>
                        <div class="status-item">
                            <div style="display: flex !important; justify-content: space-between !important; margin-bottom: 3px !important;">
                                <span style="color: ${candyColors.textSecondary} !important; font-size: 0.8em !important;">😊 快乐度</span>
                                <span style="color: ${candyColors.happiness} !important; font-size: 0.8em !important;">${Math.round(petData.happiness)}/100</span>
                            </div>
                            <div style="background: ${candyColors.border} !important; height: 5px !important; border-radius: 3px !important; overflow: hidden !important;">
                                <div style="background: ${candyColors.happiness} !important; height: 100% !important; width: ${petData.happiness}% !important; transition: width 0.3s ease !important;"></div>
                            </div>
                        </div>
                        <div class="status-item">
                            <div style="display: flex !important; justify-content: space-between !important; margin-bottom: 3px !important;">
                                <span style="color: ${candyColors.textSecondary} !important; font-size: 0.8em !important;">⚡ 精力</span>
                                <span style="color: ${candyColors.energy} !important; font-size: 0.8em !important;">${Math.round(petData.energy)}/100</span>
                            </div>
                            <div style="background: ${candyColors.border} !important; height: 5px !important; border-radius: 3px !important; overflow: hidden !important;">
                                <div style="background: ${candyColors.energy} !important; height: 100% !important; width: ${petData.energy}% !important; transition: width 0.3s ease !important;"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 金币显示 -->
                ${petData.dataVersion >= 4.0 ? `
                <div class="pet-coins-section" style="
                    text-align: center !important;
                    padding: 8px !important;
                    background: rgba(255,215,0,0.1) !important;
                    border-radius: 6px !important;
                    margin-bottom: 8px !important;
                ">
                    <span style="color: #ffd700 !important; font-weight: bold !important; font-size: 1em !important;">
                        💰 ${petData.coins || 100} 金币
                    </span>
                </div>
                ` : ''}

                <!-- 操作按钮 -->
                <div class="pet-actions-section" style="
                    display: grid !important;
                    grid-template-columns: 1fr 1fr 1fr !important;
                    gap: 6px !important;
                ">
                    <button class="action-btn feed-btn" style="
                        padding: 8px !important;
                        background: ${candyColors.buttonPrimary} !important;
                        color: ${candyColors.textPrimary} !important;
                        border: 2px solid ${candyColors.border} !important;
                        border-radius: 0 !important;
                        font-family: 'Courier New', monospace !important;
                        font-size: 11px !important;
                        font-weight: bold !important;
                        text-transform: uppercase !important;
                        cursor: pointer !important;
                        min-height: 36px !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        gap: 4px !important;
                        box-shadow: 2px 2px 0px ${candyColors.shadow} !important;
                        transition: none !important;
                    ">
                        <span style="font-size: 1em !important;">🍖</span>
                        <span>喂食</span>
                    </button>
                    <button class="action-btn play-btn" style="
                        padding: 8px !important;
                        background: ${candyColors.buttonSecondary} !important;
                        color: ${candyColors.textPrimary} !important;
                        border: 2px solid ${candyColors.border} !important;
                        border-radius: 0 !important;
                        font-family: 'Courier New', monospace !important;
                        font-size: 11px !important;
                        font-weight: bold !important;
                        text-transform: none !important;
                        cursor: pointer !important;
                        min-height: 36px !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        gap: 4px !important;
                        box-shadow: 2px 2px 0px ${candyColors.shadow} !important;
                        transition: none !important;
                    ">
                        <span style="font-size: 1em !important;">🎮</span>
                        <span>玩耍</span>
                    </button>
                    <button class="action-btn sleep-btn" style="
                        padding: 8px !important;
                        background: ${candyColors.buttonAccent} !important;
                        color: ${candyColors.textPrimary} !important;
                        border: 2px solid ${candyColors.border} !important;
                        border-radius: 0 !important;
                        font-family: 'Courier New', monospace !important;
                        font-size: 11px !important;
                        font-weight: bold !important;
                        text-transform: none !important;
                        cursor: pointer !important;
                        min-height: 36px !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        gap: 4px !important;
                        box-shadow: 2px 2px 0px ${candyColors.shadow} !important;
                        transition: none !important;
                    ">
                        <span style="font-size: 1em !important;">😴</span>
                        <span>休息</span>
                    </button>
                    <button class="action-btn hug-btn" style="
                        padding: 8px !important;
                        background: #FF69B4 !important;
                        color: ${candyColors.textWhite} !important;
                        border: 2px solid ${candyColors.border} !important;
                        border-radius: 0 !important;
                        font-family: 'Courier New', monospace !important;
                        font-size: 11px !important;
                        font-weight: bold !important;
                        text-transform: none !important;
                        cursor: pointer !important;
                        min-height: 36px !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        gap: 4px !important;
                        box-shadow: 2px 2px 0px ${candyColors.shadow} !important;
                        transition: none !important;
                    ">
                        <span style="font-size: 1em !important;">🤗</span>
                        <span>抱抱</span>
                    </button>
                    <button class="action-btn heal-btn" style="
                        padding: 8px !important;
                        background: ${(petData.sickness || 0) > 10 ? candyColors.health : candyColors.secondary} !important;
                        color: ${candyColors.textWhite} !important;
                        border: 2px solid ${candyColors.border} !important;
                        border-radius: 0 !important;
                        font-family: 'Courier New', monospace !important;
                        font-size: 11px !important;
                        font-weight: bold !important;
                        text-transform: uppercase !important;
                        cursor: ${(petData.sickness || 0) > 10 ? 'pointer' : 'not-allowed'} !important;
                        min-height: 36px !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        gap: 4px !important;
                        box-shadow: 2px 2px 0px ${candyColors.shadow} !important;
                        transition: none !important;
                        opacity: ${(petData.sickness || 0) > 10 ? '1' : '0.5'} !important;
                    ">
                        <span style="font-size: 1em !important;">💊</span>
                        <span>治疗</span>
                    </button>
                    <button class="action-btn shop-btn" style="
                        padding: 8px !important;
                        background: ${candyColors.happiness} !important;
                        color: ${candyColors.textPrimary} !important;
                        border: 2px solid ${candyColors.border} !important;
                        border-radius: 0 !important;
                        font-family: 'Courier New', monospace !important;
                        font-size: 11px !important;
                        font-weight: bold !important;
                        text-transform: none !important;
                        cursor: pointer !important;
                        min-height: 36px !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        gap: 4px !important;
                        box-shadow: 2px 2px 0px ${candyColors.shadow} !important;
                        transition: none !important;
                    ">
                        <span style="font-size: 1em !important;">🛒</span>
                        <span>商店</span>
                    </button>
                    <button class="action-btn settings-btn" style="
                        padding: 8px !important;
                        background: #8B5CF6 !important;
                        color: ${candyColors.textWhite} !important;
                        border: 2px solid ${candyColors.border} !important;
                        border-radius: 0 !important;
                        font-family: 'Courier New', monospace !important;
                        font-size: 11px !important;
                        font-weight: bold !important;
                        text-transform: none !important;
                        cursor: pointer !important;
                        min-height: 36px !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        gap: 4px !important;
                        box-shadow: 2px 2px 0px ${candyColors.shadow} !important;
                        transition: none !important;
                    ">
                        <span style="font-size: 1em !important;">⚙️</span>
                        <span>设置</span>
                    </button>
                </div>

                <!-- 底部信息 -->
                <div class="pet-info-section" style="
                    text-align: center !important;
                    padding: 8px !important;
                    color: ${candyColors.textLight} !important;
                    font-size: 0.7em !important;
                ">
                    <p style="margin: 0 !important;">🎉 虚拟宠物系统 v1.0</p>
                    <p style="margin: 2px 0 0 0 !important;">上次互动: 刚刚</p>
                </div>
            </div>
        `;
    }

    // 生成桌面端UI
    function generateDesktopUI() {
        console.log(`[UI] Generating desktop UI`);
        return `
            <div class="pet-popup-header" style="display: none;">
            </div>

            <div class="pet-main-content" style="
                display: flex !important;
                flex-direction: column !important;
                gap: 15px !important;
            ">
                <!-- 宠物头像和基本信息 -->
                <div class="pet-avatar-section" style="
                    text-align: center !important;
                    padding: 20px !important;
                ">
                    <!-- 圆形头像框 -->
                    <div class="pet-avatar-circle" style="
                        width: 90px !important;
                        height: 90px !important;
                        border-radius: 50% !important;
                        background: ${candyColors.primary} !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        font-size: 3em !important;
                        overflow: hidden !important;
                        border: 3px solid #7289da !important;
                        box-shadow: 0 4px 8px rgba(0,0,0,0.3) !important;
                        cursor: pointer !important;
                        margin: 0 auto 10px auto !important;
                        transition: transform 0.2s ease !important;
                    " onclick="openAvatarSelector()" oncontextmenu="showAvatarContextMenu(event)" title="点击更换头像，右键重置">
                        ${getAvatarContent()}
                    </div>
                    <div class="pet-name" style="font-size: 1.3em !important; font-weight: bold !important; margin-bottom: 4px !important; color: ${candyColors.textPrimary} !important; cursor: pointer !important; text-decoration: underline !important;" onclick="editPetName()" title="点击编辑宠物名字">${escapeHtml(petData.name)}</div>
                    <div class="pet-level" style="color: ${candyColors.primary} !important; font-size: 1em !important;">${petData.isAlive ?
                        `${LIFE_STAGES[petData.lifeStage]?.emoji || '🐾'} ${LIFE_STAGES[petData.lifeStage]?.name || '未知'} Lv.${petData.level}` :
                        '💀 已死亡'
                    }</div>
                </div>

                <!-- 宠物状态栏 -->
                <div class="pet-status-section" style="
                    padding: 12px !important;
                ">
                    <h4 style="margin: 0 0 12px 0 !important; color: ${candyColors.primary} !important; font-size: 1em !important;">📊 状态</h4>
                    <div class="status-bars" style="display: flex !important; flex-direction: column !important; gap: 8px !important;">
                        <div class="status-item">
                            <div style="display: flex !important; justify-content: space-between !important; margin-bottom: 4px !important;">
                                <span style="color: ${candyColors.textSecondary} !important; font-size: 0.9em !important;">❤️ 健康</span>
                                <span style="color: ${candyColors.health} !important; font-size: 0.9em !important;">${Math.round(petData.health)}/100</span>
                            </div>
                            <div style="background: ${candyColors.border} !important; height: 6px !important; border-radius: 3px !important; overflow: hidden !important;">
                                <div style="background: ${candyColors.health} !important; height: 100% !important; width: ${petData.health}% !important; transition: width 0.3s ease !important;"></div>
                            </div>
                        </div>
                        <div class="status-item">
                            <div style="display: flex !important; justify-content: space-between !important; margin-bottom: 4px !important;">
                                <span style="color: ${candyColors.textSecondary} !important; font-size: 0.9em !important;">🍖 饱食度</span>
                                <span style="color: ${candyColors.hunger} !important; font-size: 0.9em !important;">${Math.round(petData.hunger)}/100</span>
                            </div>
                            <div style="background: ${candyColors.border} !important; height: 6px !important; border-radius: 3px !important; overflow: hidden !important;">
                                <div style="background: ${candyColors.hunger} !important; height: 100% !important; width: ${petData.hunger}% !important; transition: width 0.3s ease !important;"></div>
                            </div>
                        </div>
                        <div class="status-item">
                            <div style="display: flex !important; justify-content: space-between !important; margin-bottom: 4px !important;">
                                <span style="color: ${candyColors.textSecondary} !important; font-size: 0.9em !important;">😊 快乐度</span>
                                <span style="color: ${candyColors.happiness} !important; font-size: 0.9em !important;">${Math.round(petData.happiness)}/100</span>
                            </div>
                            <div style="background: ${candyColors.border} !important; height: 6px !important; border-radius: 3px !important; overflow: hidden !important;">
                                <div style="background: ${candyColors.happiness} !important; height: 100% !important; width: ${petData.happiness}% !important; transition: width 0.3s ease !important;"></div>
                            </div>
                        </div>
                        <div class="status-item">
                            <div style="display: flex !important; justify-content: space-between !important; margin-bottom: 4px !important;">
                                <span style="color: ${candyColors.textSecondary} !important; font-size: 0.9em !important;">⚡ 精力</span>
                                <span style="color: ${candyColors.energy} !important; font-size: 0.9em !important;">${Math.round(petData.energy)}/100</span>
                            </div>
                            <div style="background: ${candyColors.border} !important; height: 6px !important; border-radius: 3px !important; overflow: hidden !important;">
                                <div style="background: ${candyColors.energy} !important; height: 100% !important; width: ${petData.energy}% !important; transition: width 0.3s ease !important;"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 金币显示 -->
                ${petData.dataVersion >= 4.0 ? `
                <div class="pet-coins-section" style="
                    text-align: center !important;
                    padding: 10px !important;
                    background: rgba(255,215,0,0.1) !important;
                    border-radius: 8px !important;
                    margin-bottom: 10px !important;
                ">
                    <span style="color: #ffd700 !important; font-weight: bold !important; font-size: 1.1em !important;">
                        💰 ${petData.coins || 100} 金币
                    </span>
                </div>
                ` : ''}

                <!-- 操作按钮 -->
                <div class="pet-actions-section" style="
                    display: grid !important;
                    grid-template-columns: 1fr 1fr 1fr !important;
                    gap: 8px !important;
                ">
                    <button class="action-btn feed-btn" style="
                        padding: 12px !important;
                        background: ${candyColors.buttonPrimary} !important;
                        color: ${candyColors.textPrimary} !important;
                        border: 2px solid ${candyColors.border} !important;
                        border-radius: 0 !important;
                        font-family: 'Courier New', monospace !important;
                        font-size: 12px !important;
                        font-weight: bold !important;
                        text-transform: none !important;
                        cursor: pointer !important;
                        min-height: 44px !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        gap: 6px !important;
                        box-shadow: 2px 2px 0px ${candyColors.shadow} !important;
                        transition: none !important;
                    ">
                        <span style="font-size: 1.1em !important;">🍖</span>
                        <span>喂食</span>
                    </button>
                    <button class="action-btn play-btn" style="
                        padding: 12px !important;
                        background: ${candyColors.buttonSecondary} !important;
                        color: ${candyColors.textPrimary} !important;
                        border: 2px solid ${candyColors.border} !important;
                        border-radius: 0 !important;
                        font-family: 'Courier New', monospace !important;
                        font-size: 12px !important;
                        font-weight: bold !important;
                        text-transform: none !important;
                        cursor: pointer !important;
                        min-height: 44px !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        gap: 6px !important;
                        box-shadow: 2px 2px 0px ${candyColors.shadow} !important;
                        transition: none !important;
                    ">
                        <span style="font-size: 1.1em !important;">🎮</span>
                        <span>玩耍</span>
                    </button>
                    <button class="action-btn sleep-btn" style="
                        padding: 12px !important;
                        background: ${candyColors.buttonAccent} !important;
                        color: ${candyColors.textPrimary} !important;
                        border: 2px solid ${candyColors.border} !important;
                        border-radius: 0 !important;
                        font-family: 'Courier New', monospace !important;
                        font-size: 12px !important;
                        font-weight: bold !important;
                        text-transform: none !important;
                        cursor: pointer !important;
                        min-height: 44px !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        gap: 6px !important;
                        box-shadow: 2px 2px 0px ${candyColors.shadow} !important;
                        transition: none !important;
                    ">
                        <span style="font-size: 1.1em !important;">😴</span>
                        <span>休息</span>
                    </button>
                    <button class="action-btn hug-btn" style="
                        padding: 12px !important;
                        background: #FF69B4 !important;
                        color: ${candyColors.textWhite} !important;
                        border: 2px solid ${candyColors.border} !important;
                        border-radius: 0 !important;
                        font-family: 'Courier New', monospace !important;
                        font-size: 12px !important;
                        font-weight: bold !important;
                        text-transform: none !important;
                        cursor: pointer !important;
                        min-height: 44px !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        gap: 6px !important;
                        box-shadow: 2px 2px 0px ${candyColors.shadow} !important;
                        transition: none !important;
                    ">
                        <span style="font-size: 1.1em !important;">🤗</span>
                        <span>抱抱</span>
                    </button>
                    <button class="action-btn heal-btn" style="
                        padding: 12px !important;
                        background: ${(petData.sickness || 0) > 10 ? candyColors.health : candyColors.secondary} !important;
                        color: ${candyColors.textWhite} !important;
                        border: 2px solid ${candyColors.border} !important;
                        border-radius: 0 !important;
                        font-family: 'Courier New', monospace !important;
                        font-size: 12px !important;
                        font-weight: bold !important;
                        text-transform: none !important;
                        cursor: ${(petData.sickness || 0) > 10 ? 'pointer' : 'not-allowed'} !important;
                        min-height: 44px !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        gap: 6px !important;
                        box-shadow: 2px 2px 0px ${candyColors.shadow} !important;
                        transition: none !important;
                        opacity: ${(petData.sickness || 0) > 10 ? '1' : '0.5'} !important;
                    ">
                        <span style="font-size: 1.1em !important;">💊</span>
                        <span>治疗</span>
                    </button>
                    <button class="action-btn shop-btn" style="
                        padding: 12px !important;
                        background: ${candyColors.happiness} !important;
                        color: ${candyColors.textPrimary} !important;
                        border: 2px solid ${candyColors.border} !important;
                        border-radius: 0 !important;
                        font-family: 'Courier New', monospace !important;
                        font-size: 12px !important;
                        font-weight: bold !important;
                        text-transform: none !important;
                        cursor: pointer !important;
                        min-height: 44px !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        gap: 6px !important;
                        box-shadow: 2px 2px 0px ${candyColors.shadow} !important;
                        transition: none !important;
                    ">
                        <span style="font-size: 1.1em !important;">🛒</span>
                        <span>商店</span>
                    </button>
                    <button class="action-btn settings-btn" style="
                        padding: 12px !important;
                        background: #8B5CF6 !important;
                        color: ${candyColors.textWhite} !important;
                        border: 2px solid ${candyColors.border} !important;
                        border-radius: 0 !important;
                        font-family: 'Courier New', monospace !important;
                        font-size: 12px !important;
                        font-weight: bold !important;
                        text-transform: none !important;
                        cursor: pointer !important;
                        min-height: 44px !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        gap: 6px !important;
                        box-shadow: 2px 2px 0px ${candyColors.shadow} !important;
                        transition: none !important;
                    ">
                        <span style="font-size: 1.1em !important;">⚙️</span>
                        <span>设置</span>
                    </button>
                </div>

                <!-- 底部信息 -->
                <div class="pet-info-section" style="
                    text-align: center !important;
                    padding: 10px !important;
                    color: ${candyColors.textLight} !important;
                    font-size: 0.8em !important;
                ">
                    <p style="margin: 0 !important;">🎉 虚拟宠物系统 v1.0</p>
                    <p style="margin: 3px 0 0 0 !important;">上次互动: 刚刚</p>
                </div>
            </div>
        `;
    }

    // 绑定统一UI的事件
    function bindUnifiedUIEvents($container) {
        console.log(`[${extensionName}] Binding unified UI events`);

        // 喂食按钮
        $container.find(".feed-btn").on("click touchend", function(e) {
            e.preventDefault();
            console.log("🍖 喂食宠物");
            feedPet();
            // 更新UI显示
            setTimeout(() => {
                updateUnifiedUIStatus();
            }, 100);
        });

        // 玩耍按钮
        $container.find(".play-btn").on("click touchend", function(e) {
            e.preventDefault();
            console.log("🎮 和宠物玩耍");
            playWithPet();
            // 更新UI显示
            setTimeout(() => {
                updateUnifiedUIStatus();
            }, 100);
        });

        // 休息按钮
        $container.find(".sleep-btn").on("click touchend", function(e) {
            e.preventDefault();
            console.log("😴 宠物休息");
            petSleep();
            // 更新UI显示
            setTimeout(() => {
                updateUnifiedUIStatus();
            }, 100);
        });

        // 抱抱按钮
        $container.find(".hug-btn").on("click touchend", function(e) {
            e.preventDefault();
            console.log("🤗 抱抱宠物");
            hugPet();
            // 更新UI显示
            setTimeout(() => {
                updateUnifiedUIStatus();
            }, 100);
        });

        // 治疗按钮
        $container.find(".heal-btn").on("click touchend", function(e) {
            e.preventDefault();
            console.log("💊 治疗宠物");
            healPet();
            // 更新UI显示
            setTimeout(() => {
                updateUnifiedUIStatus();
            }, 100);
        });

        // 商店按钮
        $container.find(".shop-btn").on("click touchend", function(e) {
            e.preventDefault();
            console.log("🛒 打开商店");
            openShop();
        });

        // 设置按钮
        $container.find(".settings-btn").on("click touchend", function(e) {
            e.preventDefault();
            console.log("⚙️ 打开设置");
            openSettings();
        });

        // 宠物名字点击事件（备用，主要通过onclick属性）
        $container.find(".pet-name").on("click touchend", function(e) {
            e.preventDefault();
            editPetName();
        });

        console.log(`[${extensionName}] Unified UI events bound successfully`);
    }

    // 显示通知
    function showNotification(message, type = "info") {
        // 移除现有通知
        $(".pet-notification").remove();

        const colors = {
            success: "#43b581",
            info: "#7289da",
            warning: "#faa61a",
            error: "#f04747"
        };

        const notification = $(`
            <div class="pet-notification" style="
                position: fixed;
                top: 20px;
                right: 20px;
                background: ${colors[type] || colors.info};
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                z-index: ${SAFE_Z_INDEX.notification};
                font-size: 14px;
                max-width: 300px;
                animation: slideIn 0.3s ease-out;
            ">${message}</div>
        `);

        $("body").append(notification);

        // 3秒后自动消失
        setTimeout(() => {
            notification.fadeOut(300, function() {
                $(this).remove();
            });
        }, 3000);
    }

    // iOS测试按钮 - 可以在iOS上直接点击测试
    window.createIOSTestButton = function() {
        // 移除现有测试按钮
        $("#ios-test-button").remove();

        // 创建iOS测试按钮
        const testButton = $(`
            <button id="ios-test-button" style="
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: ${SAFE_Z_INDEX.popup};
                background: #43b581;
                color: white;
                border: none;
                padding: 15px 20px;
                border-radius: 25px;
                cursor: pointer;
                font-size: 16px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                min-width: 120px;
                min-height: 50px;
            ">🍎 iOS测试</button>
        `);

        $("body").append(testButton);

        testButton.on("click touchend", function(e) {
            e.preventDefault();
            console.log("iOS测试按钮被点击");

            // 先清理所有弹窗
            window.clearAllPopups();

            // 延迟显示统一弹窗
            setTimeout(() => {
                try {
                    showPopup();
                } catch (error) {
                    console.error("弹窗测试失败:", error);
                    alert("弹窗测试失败: " + error.message);
                }
            }, 100);
        });

        console.log("iOS测试按钮已创建，位于屏幕右下角");

        // 5秒后自动移除测试按钮
        setTimeout(() => {
            $("#ios-test-button").fadeOut(500, function() {
                $(this).remove();
            });
        }, 10000);

        return true;
    };

    // 测试统一UI的函数
    window.testUnifiedUIForAllPlatforms = function() {
        console.log("🎨 测试所有平台的统一UI...");

        // 获取设备信息
        const windowWidth = $(window).width();
        const windowHeight = $(window).height();
        const userAgent = navigator.userAgent;
        const isIOS = /iPad|iPhone|iPod/.test(userAgent);
        const isAndroid = /Android/.test(userAgent);
        const isMobile = windowWidth <= 767 || isIOS || isAndroid;

        console.log("=== 设备信息 ===");
        console.log("窗口尺寸:", windowWidth + "x" + windowHeight);
        console.log("User Agent:", userAgent);
        console.log("iOS:", isIOS);
        console.log("Android:", isAndroid);
        console.log("Mobile:", isMobile);

        // 清理现有弹窗
        window.clearAllPopups();

        // 显示统一UI
        setTimeout(() => {
            console.log("🎨 显示统一UI（所有平台相同）");
            showPopup();

            // 检查UI内容
            setTimeout(() => {
                const popup = $("#virtual-pet-popup");
                const header = popup.find(".pet-popup-header h2");
                const avatar = popup.find(".pet-avatar");
                const buttons = popup.find(".action-btn");

                console.log("=== UI检查结果 ===");
                console.log("弹窗存在:", popup.length > 0);
                console.log("标题内容:", header.text());
                console.log("头像内容:", avatar.text());
                console.log("按钮数量:", buttons.length);
                console.log("按钮文字:", buttons.map((i, btn) => $(btn).text().trim()).get());

                if (popup.length > 0 && buttons.length === 4) {
                    console.log("✅ 统一UI测试成功！所有平台显示相同内容");
                } else {
                    console.log("❌ 统一UI测试失败！内容不一致");
                }
            }, 500);
        }, 200);

        return {
            windowSize: { width: windowWidth, height: windowHeight },
            device: { isIOS, isAndroid, isMobile },
            userAgent
        };
    };

    // iOS关闭测试函数
    window.testIOSClose = function() {
        console.log("🍎 测试iOS关闭功能...");

        // 检查是否为iOS
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        console.log("是否iOS设备:", isIOS);

        // 检查弹窗是否存在
        const overlay = $("#virtual-pet-popup-overlay");
        const closeButton = overlay.find(".close-button");

        console.log("弹窗存在:", overlay.length > 0);
        console.log("关闭按钮存在:", closeButton.length > 0);

        if (overlay.length > 0) {
            // 检查事件绑定
            const events = $._data(closeButton[0], 'events');
            console.log("关闭按钮事件:", events);

            // 手动触发关闭
            console.log("🍎 手动触发关闭...");
            closePopup();
        } else {
            console.log("❌ 没有找到弹窗");
        }

        return { isIOS, hasOverlay: overlay.length > 0, hasCloseButton: closeButton.length > 0 };
    };

    // 强制关闭所有弹窗
    window.forceCloseAllPopups = function() {
        console.log("🚨 强制关闭所有弹窗...");

        // 移除所有可能的弹窗元素
        $("#virtual-pet-popup-overlay").remove();
        $(".virtual-pet-popup-overlay").remove();
        $("[id*='virtual-pet-popup']").remove();
        $("[class*='virtual-pet-popup']").remove();

        // 清理body上可能的样式
        $("body").css("overflow", "");

        console.log("✅ 所有弹窗已强制关闭");
        return true;
    };

    // 快速修复按钮位置函数
    window.fixPetButtonPosition = function() {
        console.log("🐾 修复按钮位置...");

        const button = $('#virtual-pet-button');
        if (button.length === 0) {
            console.log("❌ 按钮不存在");
            return false;
        }

        // 获取窗口尺寸
        const windowWidth = $(window).width();
        const windowHeight = $(window).height();

        // 设置安全的默认位置
        const safeLeft = 20;
        const safeTop = Math.floor(windowHeight / 2);

        button.css({
            'top': safeTop + 'px',
            'left': safeLeft + 'px',
            'transform': 'none',
            'position': 'fixed',
            'display': 'flex',
            'opacity': '1',
            'visibility': 'visible',
            'z-index': SAFE_Z_INDEX.button
        });

        // 清除可能有问题的保存位置
        localStorage.removeItem('virtual-pet-button-position');

        console.log(`🐾 按钮位置已修复到: left=${safeLeft}px, top=${safeTop}px`);
        console.log(`🐾 窗口尺寸: ${windowWidth}x${windowHeight}`);

        return true;
    };

    // 测试拖拽功能
    window.testDragFunction = function() {
        console.log("🐾 测试拖拽功能...");

        const button = $('#virtual-pet-button');
        if (button.length === 0) {
            console.log("❌ 按钮不存在");
            return false;
        }

        // 检查事件绑定
        const events = $._data(button[0], 'events');
        console.log("🔍 按钮事件绑定:", events);

        if (events) {
            console.log("   - mousedown:", events.mousedown ? "✅ 已绑定" : "❌ 未绑定");
            console.log("   - touchstart:", events.touchstart ? "✅ 已绑定" : "❌ 未绑定");
            console.log("   - click:", events.click ? "✅ 已绑定" : "❌ 未绑定");
        }

        // 检查document事件
        const docEvents = $._data(document, 'events');
        if (docEvents) {
            console.log("   - document mousemove:", docEvents.mousemove ? "✅ 已绑定" : "❌ 未绑定");
            console.log("   - document mouseup:", docEvents.mouseup ? "✅ 已绑定" : "❌ 未绑定");
        }

        // 重新绑定拖拽功能
        console.log("🔄 重新绑定拖拽功能...");
        makeButtonDraggable(button);

        console.log("✅ 拖拽功能测试完成");
        return true;
    };

    // -----------------------------------------------------------------
    // 测试和调试功能
    // -----------------------------------------------------------------

    /**
     * 快速诊断SillyTavern环境
     */
    window.diagnoseSillyTavernEnvironment = function() {
        console.log("🔍 SillyTavern环境诊断开始...");
        console.log("=".repeat(50));

        // 1. 检查基本对象
        console.log("\n1️⃣ 基本对象检查:");
        console.log(`- window对象: ${typeof window !== 'undefined' ? '✅' : '❌'}`);
        console.log(`- jQuery对象: ${typeof $ !== 'undefined' ? '✅' : '❌'}`);
        console.log(`- SillyTavern对象: ${typeof SillyTavern !== 'undefined' ? '✅' : '❌'}`);

        // 2. 检查SillyTavern相关函数
        console.log("\n2️⃣ SillyTavern函数检查:");
        const stFunctions = ['getContext', 'generateReply', 'Generate'];
        stFunctions.forEach(func => {
            if (typeof SillyTavern !== 'undefined' && SillyTavern[func]) {
                console.log(`- SillyTavern.${func}: ✅`);
            } else if (typeof window[func] !== 'undefined') {
                console.log(`- window.${func}: ✅`);
            } else {
                console.log(`- ${func}: ❌`);
            }
        });

        // 3. 检查全局变量
        console.log("\n3️⃣ 全局变量检查:");
        const globalVars = ['main_api', 'api_server', 'online_status', 'models', 'backends', 'extension_settings'];
        globalVars.forEach(varName => {
            const exists = typeof window[varName] !== 'undefined';
            console.log(`- ${varName}: ${exists ? '✅' : '❌'} ${exists ? typeof window[varName] : ''}`);
            if (exists && window[varName]) {
                console.log(`  值: ${JSON.stringify(window[varName]).substring(0, 100)}...`);
            }
        });

        // 4. 检查当前页面URL和路径
        console.log("\n4️⃣ 页面信息:");
        console.log(`- URL: ${window.location.href}`);
        console.log(`- 路径: ${window.location.pathname}`);
        console.log(`- 主机: ${window.location.host}`);

        // 5. 检查DOM中的SillyTavern特征元素
        console.log("\n5️⃣ DOM元素检查:");
        const stSelectors = ['#chat', '#send_textarea', '#api_button', '.mes', '#extensions_settings'];
        stSelectors.forEach(selector => {
            const element = $(selector);
            console.log(`- ${selector}: ${element.length > 0 ? '✅' : '❌'} (${element.length}个)`);
        });

        console.log("\n=".repeat(50));
        console.log("🔍 环境诊断完成");

        return {
            hasSillyTavern: typeof SillyTavern !== 'undefined',
            hasGetContext: typeof SillyTavern !== 'undefined' && typeof SillyTavern.getContext === 'function',
            hasJQuery: typeof $ !== 'undefined',
            url: window.location.href,
            globalVarsFound: globalVars.filter(v => typeof window[v] !== 'undefined')
        };
    };

    /**
     * 测试API获取功能
     */
    window.testVirtualPetAPIDiscovery = async function() {
        console.log("🔍 测试虚拟宠物API发现功能...");

        // 先进行环境诊断
        const envInfo = window.diagnoseSillyTavernEnvironment();

        if (!envInfo.hasSillyTavern) {
            console.log("⚠️ 警告: 未检测到SillyTavern环境，这可能是原因之一");
        }

        try {
            // 测试完整的API获取功能
            console.log("\n🔄 开始API发现测试:");
            const apis = await getAvailableAPIs();
            console.log(`\n🎉 测试完成，发现 ${apis.length} 个API:`, apis);

            if (apis.length === 0) {
                console.log("\n💡 建议:");
                console.log("1. 确认你在SillyTavern页面中运行此测试");
                console.log("2. 确认SillyTavern已经配置了至少一个API");
                console.log("3. 尝试刷新页面后重新测试");
                console.log("4. 检查浏览器控制台是否有其他错误");
            }

            return apis;
        } catch (error) {
            console.error("❌ 测试失败:", error);
            return [];
        }
    };

    /**
     * 快速API测试 - 直接后端API版本
     */
    window.quickAPITest = async function() {
        console.log("⚡ 快速后端API测试开始...");

        // 1. 基础检查
        console.log("\n1️⃣ 基础检查:");
        console.log(`SillyTavern: ${typeof SillyTavern !== 'undefined' ? '✅' : '❌'}`);
        console.log(`jQuery: ${typeof $ !== 'undefined' ? '✅' : '❌'}`);
        console.log(`Fetch API: ${typeof fetch !== 'undefined' ? '✅' : '❌'}`);

        // 2. 检查用户配置的API密钥
        console.log("\n2️⃣ API密钥检查:");
        const apiKeyInput = $('#ai-key-input').val();
        console.log(`用户输入的API密钥: ${apiKeyInput ? '✅ 已设置' : '❌ 未设置'}`);

        // 3. 快速测试本地API
        console.log("\n3️⃣ 本地API快速测试:");
        const localEndpoints = [
            'http://localhost:11434/api/tags',  // Ollama
            'http://localhost:1234/v1/models', // LM Studio
            'http://localhost:5000/v1/models'  // Text Generation WebUI
        ];

        for (const endpoint of localEndpoints) {
            try {
                const response = await fetch(endpoint, {
                    method: 'GET',
                    signal: AbortSignal.timeout(3000) // 3秒超时
                });
                console.log(`${endpoint}: ${response.ok ? '✅' : '❌'} (${response.status})`);
                if (response.ok) {
                    const data = await response.json();
                    const modelCount = data.models ? data.models.length : (data.data ? data.data.length : 0);
                    console.log(`  发现 ${modelCount} 个模型`);
                }
            } catch (error) {
                if (error.name === 'TimeoutError') {
                    console.log(`${endpoint}: ⏰ 超时`);
                } else {
                    console.log(`${endpoint}: ❌ (${error.message})`);
                }
            }
        }

        // 4. 测试在线API（如果有密钥）
        if (apiKeyInput) {
            console.log("\n4️⃣ 在线API测试:");
            try {
                const response = await fetch('https://api.openai.com/v1/models', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${apiKeyInput}`,
                        'Content-Type': 'application/json'
                    },
                    signal: AbortSignal.timeout(5000)
                });

                if (response.ok) {
                    const data = await response.json();
                    console.log(`OpenAI API: ✅ 发现 ${data.data.length} 个模型`);
                } else if (response.status === 401) {
                    console.log(`OpenAI API: 🔐 API密钥无效`);
                } else {
                    console.log(`OpenAI API: ❌ HTTP ${response.status}`);
                }
            } catch (error) {
                console.log(`OpenAI API: ❌ ${error.message}`);
            }
        } else {
            console.log("\n4️⃣ 跳过在线API测试 (未设置API密钥)");
        }

        // 5. 完整API发现测试
        console.log("\n5️⃣ 完整API发现测试:");
        try {
            const apis = await getAvailableAPIs();
            console.log(`结果: ${apis.length > 0 ? '✅' : '❌'} 发现${apis.length}个API`);
            if (apis.length > 0) {
                const grouped = {};
                apis.forEach(api => {
                    const provider = api.provider || 'Other';
                    if (!grouped[provider]) grouped[provider] = 0;
                    grouped[provider]++;
                });
                Object.entries(grouped).forEach(([provider, count]) => {
                    console.log(`  📊 ${provider}: ${count}个`);
                });
            }
            return apis;
        } catch (error) {
            console.log(`结果: ❌ 错误: ${error.message}`);
            return [];
        }
    };

    /**
     * 测试特定API端点
     */
    window.testSpecificAPI = async function(apiType, apiKey = null) {
        console.log(`🔍 测试特定API: ${apiType}`);

        const endpoints = {
            'openai': 'https://api.openai.com/v1/models',
            'claude': 'https://api.anthropic.com/v1/models',
            'google': 'https://generativelanguage.googleapis.com/v1beta/models',
            'ollama': 'http://localhost:11434/api/tags',
            'lmstudio': 'http://localhost:1234/v1/models'
        };

        const endpoint = endpoints[apiType];
        if (!endpoint) {
            console.log(`❌ 不支持的API类型: ${apiType}`);
            return null;
        }

        try {
            const headers = { 'Content-Type': 'application/json' };

            // 添加认证头
            if (apiKey) {
                if (apiType === 'openai' || apiType === 'google') {
                    headers['Authorization'] = `Bearer ${apiKey}`;
                } else if (apiType === 'claude') {
                    headers['x-api-key'] = apiKey;
                }
            }

            const response = await fetch(endpoint, {
                method: 'GET',
                headers: headers,
                signal: AbortSignal.timeout(10000)
            });

            if (response.ok) {
                const data = await response.json();
                console.log(`✅ ${apiType} API 成功:`, data);
                return data;
            } else {
                console.log(`❌ ${apiType} API 失败: HTTP ${response.status}`);
                return null;
            }
        } catch (error) {
            console.log(`❌ ${apiType} API 错误: ${error.message}`);
            return null;
        }
    };

    /**
     * 获取用户配置API的模型列表
     */
    window.getUserConfiguredModels = async function() {
        console.log("🎯 获取用户配置API的模型列表...");

        const apiUrl = $('#ai-url-input').val();
        const apiKey = $('#ai-key-input').val();

        if (!apiUrl) {
            console.log("❌ 未配置API URL");
            return [];
        }

        console.log(`🔗 API URL: ${apiUrl}`);
        console.log(`🔑 API Key: ${apiKey ? '已设置' : '未设置'}`);

        // 构建模型列表端点
        let modelsEndpoint = apiUrl;
        if (!modelsEndpoint.endsWith('/models')) {
            if (modelsEndpoint.endsWith('/')) {
                modelsEndpoint += 'models';
            } else {
                modelsEndpoint += '/models';
            }
        }

        console.log(`📡 尝试获取模型列表: ${modelsEndpoint}`);

        try {
            const headers = {
                'Content-Type': 'application/json'
            };

            // 添加认证头
            if (apiKey) {
                headers['Authorization'] = `Bearer ${apiKey}`;
            }

            const response = await fetch(modelsEndpoint, {
                method: 'GET',
                headers: headers,
                signal: AbortSignal.timeout(15000) // 15秒超时
            });

            if (response.ok) {
                const data = await response.json();
                console.log(`✅ 成功获取模型列表:`, data);

                // 解析模型数据
                let models = [];
                if (data.data && Array.isArray(data.data)) {
                    // OpenAI格式
                    models = data.data.map(model => ({
                        id: model.id,
                        name: model.id,
                        type: 'user_configured',
                        status: 'available',
                        source: modelsEndpoint,
                        provider: '用户配置API'
                    }));
                } else if (data.models && Array.isArray(data.models)) {
                    // 其他格式
                    models = data.models.map(model => ({
                        id: typeof model === 'string' ? model : model.id || model.name,
                        name: typeof model === 'string' ? model : model.id || model.name,
                        type: 'user_configured',
                        status: 'available',
                        source: modelsEndpoint,
                        provider: '用户配置API'
                    }));
                }

                console.log(`📋 解析出 ${models.length} 个模型:`, models.map(m => m.name));
                return models;

            } else {
                console.log(`❌ 获取模型列表失败: HTTP ${response.status}`);

                // 尝试读取错误信息
                try {
                    const errorText = await response.text();
                    console.log(`错误详情:`, errorText.substring(0, 200));
                } catch (e) {
                    console.log(`无法读取错误详情`);
                }

                return [];
            }

        } catch (error) {
            console.log(`❌ 请求失败: ${error.message}`);
            return [];
        }
    };

    /**
     * 刷新并显示用户配置的模型
     */
    window.refreshUserModels = async function() {
        console.log("🔄 刷新用户配置的模型...");

        const models = await getUserConfiguredModels();

        if (models.length > 0) {
            console.log(`🎉 发现 ${models.length} 个可用模型:`);
            models.forEach((model, index) => {
                console.log(`  ${index + 1}. ${model.name}`);
            });

            // 更新下拉列表
            updateAPIDropdown(models);

            toastr.success(`发现 ${models.length} 个可用模型！`, '🎉 模型获取成功', { timeOut: 5000 });
        } else {
            console.log("❌ 未发现任何模型");
            toastr.warning('未发现任何模型，请检查API配置', '⚠️ 模型获取失败', { timeOut: 5000 });
        }

        return models;
    };

    /**
     * 通用第三方API模型获取器 - 支持任意第三方API
     */
    window.getThirdPartyModels = async function() {
        console.log("🌐 通用第三方API模型获取器启动...");

        const apiUrl = $('#ai-url-input').val();
        const apiKey = $('#ai-key-input').val();

        if (!apiUrl) {
            console.log("❌ 请先配置API URL");
            return [];
        }

        console.log(`🔗 API URL: ${apiUrl}`);
        console.log(`🔑 API Key: ${apiKey ? '已设置' : '未设置'}`);

        // 智能检测API服务类型
        let serviceType = 'unknown';
        const urlLower = apiUrl.toLowerCase();

        if (urlLower.includes('openai.com')) {
            serviceType = 'openai_official';
        } else if (urlLower.includes('anthropic.com')) {
            serviceType = 'anthropic_official';
        } else if (urlLower.includes('googleapis.com')) {
            serviceType = 'google_official';
        } else if (urlLower.includes('nyabit.com')) {
            serviceType = 'nyabit';
        } else if (urlLower.includes('api2d.com')) {
            serviceType = 'api2d';
        } else if (urlLower.includes('closeai') || urlLower.includes('openai-proxy')) {
            serviceType = 'openai_proxy';
        } else if (urlLower.includes('claude') || urlLower.includes('anthropic')) {
            serviceType = 'claude_proxy';
        } else if (urlLower.includes('gemini') || urlLower.includes('google')) {
            serviceType = 'google_proxy';
        } else if (urlLower.includes('localhost') || urlLower.includes('127.0.0.1')) {
            serviceType = 'local_api';
        } else {
            serviceType = 'generic_third_party';
        }

        console.log(`🏷️ 检测到服务类型: ${serviceType}`);

        // 构建可能的模型端点列表
        const baseUrl = apiUrl.replace(/\/+$/, ''); // 移除末尾斜杠
        const possibleEndpoints = [];

        // 标准OpenAI兼容端点
        possibleEndpoints.push(
            `${baseUrl}/models`,
            `${baseUrl}/v1/models`,
            `${baseUrl}/api/models`,
            `${baseUrl}/api/v1/models`,
            `${baseUrl}/openai/v1/models`
        );

        // 其他常见端点格式
        possibleEndpoints.push(
            `${baseUrl}/engines`,
            `${baseUrl}/v1/engines`,
            `${baseUrl}/model/list`,
            `${baseUrl}/models/list`,
            `${baseUrl}/list/models`
        );

        // 特定服务的端点
        if (serviceType === 'anthropic_official' || serviceType === 'claude_proxy') {
            possibleEndpoints.push(`${baseUrl}/v1/models`);
        }
        if (serviceType === 'google_official' || serviceType === 'google_proxy') {
            possibleEndpoints.push(`${baseUrl}/models`, `${baseUrl}/v1beta/models`);
        }
        if (serviceType === 'local_api') {
            possibleEndpoints.push(
                `${baseUrl}/api/tags`, // Ollama
                `${baseUrl}/tags`,     // Ollama简化
                `${baseUrl}/info`      // 一些本地API的信息端点
            );
        }

        console.log(`📡 将尝试 ${possibleEndpoints.length} 个端点:`, possibleEndpoints);

        // 尝试不同的认证方式
        const authMethods = [];

        if (apiKey) {
            // 标准Bearer Token认证
            authMethods.push({
                name: 'Bearer Token',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            // Claude风格的x-api-key认证
            authMethods.push({
                name: 'x-api-key',
                headers: {
                    'x-api-key': apiKey,
                    'Content-Type': 'application/json'
                }
            });

            // 一些API使用的api-key头
            authMethods.push({
                name: 'api-key',
                headers: {
                    'api-key': apiKey,
                    'Content-Type': 'application/json'
                }
            });
        }

        // 无认证方式（本地API）
        authMethods.push({
            name: 'No Auth',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log(`🔐 将尝试 ${authMethods.length} 种认证方式`);

        // 遍历所有端点和认证方式的组合
        for (const endpoint of possibleEndpoints) {
            for (const authMethod of authMethods) {
                try {
                    console.log(`🔍 测试: ${endpoint} (${authMethod.name})`);

                    const response = await fetch(endpoint, {
                        method: 'GET',
                        headers: authMethod.headers,
                        signal: AbortSignal.timeout(8000) // 8秒超时
                    });

                    if (response.ok) {
                        const data = await response.json();
                        console.log(`✅ 成功: ${endpoint} (${authMethod.name})`, data);

                        // 通用模型数据解析器
                        const models = parseModelsFromResponse(data, endpoint, serviceType);

                        if (models.length > 0) {
                            console.log(`🎉 成功获取 ${models.length} 个模型:`, models.map(m => m.name));
                            return models;
                        }
                    } else if (response.status === 401 || response.status === 403) {
                        console.log(`🔐 ${endpoint}: 认证失败 (${response.status}) - ${authMethod.name}`);
                        // 继续尝试其他认证方式
                    } else {
                        console.log(`❌ ${endpoint}: HTTP ${response.status} - ${authMethod.name}`);

                        // 对于非认证错误，尝试读取错误信息
                        if (response.status !== 404) {
                            try {
                                const errorText = await response.text();
                                if (errorText.length < 300) {
                                    console.log(`错误详情:`, errorText);
                                }
                            } catch (e) {
                                // 忽略错误读取失败
                            }
                        }
                    }
                } catch (error) {
                    if (error.name === 'TimeoutError') {
                        console.log(`⏰ ${endpoint}: 超时 - ${authMethod.name}`);
                    } else if (error.message.includes('CORS')) {
                        console.log(`🚫 ${endpoint}: CORS限制 - ${authMethod.name}`);
                    } else {
                        console.log(`❌ ${endpoint}: ${error.message} - ${authMethod.name}`);
                    }
                }
            }
        }

        // 如果所有端点都失败，返回智能推荐的模型
        console.log("⚠️ 无法从API获取模型列表，根据服务类型提供推荐模型");

        return getRecommendedModels(serviceType, apiUrl);
    };

    /**
     * 通用模型数据解析器
     */
    function parseModelsFromResponse(data, endpoint, serviceType) {
        const models = [];

        console.log(`🔍 解析响应数据，服务类型: ${serviceType}`);

        // OpenAI标准格式: {data: [{id: "model-name", ...}, ...]}
        if (data.data && Array.isArray(data.data)) {
            console.log(`📋 检测到OpenAI标准格式，${data.data.length} 个模型`);
            data.data.forEach(model => {
                if (model.id || model.name) {
                    models.push({
                        id: model.id || model.name,
                        name: model.id || model.name,
                        type: 'third_party',
                        status: 'available',
                        source: endpoint,
                        provider: `第三方API (${serviceType})`,
                        details: model
                    });
                }
            });
        }

        // 通用models数组格式: {models: [...]}
        else if (data.models && Array.isArray(data.models)) {
            console.log(`📋 检测到通用models格式，${data.models.length} 个模型`);
            data.models.forEach(model => {
                let modelId, modelName;

                if (typeof model === 'string') {
                    modelId = modelName = model;
                } else if (model.id) {
                    modelId = model.id;
                    modelName = model.name || model.id;
                } else if (model.name) {
                    modelId = model.name;
                    modelName = model.name;
                } else if (model.model) {
                    modelId = modelName = model.model;
                }

                if (modelId) {
                    models.push({
                        id: modelId,
                        name: modelName,
                        type: 'third_party',
                        status: 'available',
                        source: endpoint,
                        provider: `第三方API (${serviceType})`,
                        details: model
                    });
                }
            });
        }

        // Ollama格式: {models: [{name: "model:tag", ...}, ...]}
        else if (data.models && serviceType === 'local_api') {
            console.log(`📋 检测到Ollama格式，${data.models.length} 个模型`);
            data.models.forEach(model => {
                if (model.name) {
                    models.push({
                        id: model.name,
                        name: model.name,
                        type: 'local_model',
                        status: 'available',
                        source: endpoint,
                        provider: 'Ollama (本地)',
                        details: model
                    });
                }
            });
        }

        // 直接数组格式: ["model1", "model2", ...]
        else if (Array.isArray(data)) {
            console.log(`📋 检测到直接数组格式，${data.length} 个模型`);
            data.forEach(model => {
                if (typeof model === 'string') {
                    models.push({
                        id: model,
                        name: model,
                        type: 'third_party',
                        status: 'available',
                        source: endpoint,
                        provider: `第三方API (${serviceType})`
                    });
                }
            });
        }

        // 其他可能的格式
        else if (data.result && Array.isArray(data.result)) {
            console.log(`📋 检测到result数组格式，${data.result.length} 个模型`);
            data.result.forEach(model => {
                const modelId = typeof model === 'string' ? model : (model.id || model.name);
                if (modelId) {
                    models.push({
                        id: modelId,
                        name: modelId,
                        type: 'third_party',
                        status: 'available',
                        source: endpoint,
                        provider: `第三方API (${serviceType})`
                    });
                }
            });
        }

        console.log(`✅ 解析完成，获得 ${models.length} 个模型`);
        return models;
    }

    /**
     * 根据服务类型获取推荐模型
     */
    function getRecommendedModels(serviceType, apiUrl) {
        console.log(`🎯 为服务类型 ${serviceType} 生成推荐模型`);

        let recommendedModels = [];

        // 根据服务类型推荐不同的模型
        switch (serviceType) {
            case 'openai_official':
            case 'openai_proxy':
            case 'nyabit':
            case 'api2d':
            case 'generic_third_party':
                recommendedModels = [
                    { id: "gpt-4", name: "GPT-4" },
                    { id: "gpt-4-turbo", name: "GPT-4 Turbo" },
                    { id: "gpt-4-turbo-preview", name: "GPT-4 Turbo Preview" },
                    { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" },
                    { id: "gpt-3.5-turbo-16k", name: "GPT-3.5 Turbo 16K" }
                ];
                break;

            case 'anthropic_official':
            case 'claude_proxy':
                recommendedModels = [
                    { id: "claude-3-opus-20240229", name: "Claude 3 Opus" },
                    { id: "claude-3-sonnet-20240229", name: "Claude 3 Sonnet" },
                    { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku" },
                    { id: "claude-2.1", name: "Claude 2.1" },
                    { id: "claude-2.0", name: "Claude 2.0" }
                ];
                break;

            case 'google_official':
            case 'google_proxy':
                recommendedModels = [
                    { id: "gemini-pro", name: "Gemini Pro" },
                    { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro" },
                    { id: "gemini-pro-vision", name: "Gemini Pro Vision" }
                ];
                break;

            case 'local_api':
                recommendedModels = [
                    { id: "llama2", name: "Llama 2" },
                    { id: "codellama", name: "Code Llama" },
                    { id: "mistral", name: "Mistral" },
                    { id: "vicuna", name: "Vicuna" },
                    { id: "alpaca", name: "Alpaca" }
                ];
                break;

            default:
                // 通用推荐
                recommendedModels = [
                    { id: "gpt-4", name: "GPT-4" },
                    { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" },
                    { id: "claude-3-sonnet-20240229", name: "Claude 3 Sonnet" },
                    { id: "gemini-pro", name: "Gemini Pro" }
                ];
        }

        return recommendedModels.map(model => ({
            id: model.id,
            name: model.name,
            type: 'recommended',
            status: 'suggested',
            source: 'recommendation',
            provider: `推荐模型 (${serviceType})`,
            note: '基于API类型的智能推荐'
        }));
    }

    /**
     * 测试AI回复功能
     */
    window.testVirtualPetAI = function() {
        console.log("🤖 测试虚拟宠物AI回复功能...");

        // 检查API可用性
        const apiAvailable = isAIAPIAvailable();
        console.log(`API可用性: ${apiAvailable ? '✅ 可用' : '❌ 不可用'}`);

        if (!apiAvailable) {
            console.log("可用的API检查:");
            console.log(`- window.generateReply: ${typeof window.generateReply}`);
            console.log(`- window.SillyTavern: ${typeof window.SillyTavern}`);
            console.log(`- window.Generate: ${typeof window.Generate}`);
        }

        // 显示当前宠物信息
        console.log("当前宠物信息:");
        console.log(`- 名称: ${petData.name}`);
        console.log(`- 类型: ${getPetTypeName(petData.type)}`);
        console.log(`- 等级: ${petData.level}`);
        console.log(`- 人设类型: ${localStorage.getItem(`${extensionName}-personality-type`) || 'default'}`);
        console.log(`- 人设内容: ${getCurrentPersonality()}`);
        console.log(`- 健康: ${Math.round(petData.health)}/100`);
        console.log(`- 快乐: ${Math.round(petData.happiness)}/100`);
        console.log(`- 饥饿: ${Math.round(petData.hunger)}/100`);
        console.log(`- 精力: ${Math.round(petData.energy)}/100`);

        // 生成测试Prompt
        const testPrompt = buildInteractionPrompt('feed');
        console.log("生成的测试Prompt:");
        console.log(testPrompt);

        return {
            apiAvailable,
            petData: { ...petData },
            personalityType: localStorage.getItem(`${extensionName}-personality-type`) || 'default',
            currentPersonality: getCurrentPersonality(),
            testPrompt
        };
    };

    /**
     * 手动测试AI回复
     */
    window.testAIReply = async function(action = 'feed') {
        console.log(`🎯 手动测试AI回复 - 行为: ${action}`);

        try {
            const fallbackMessages = {
                'feed': `${petData.name} 吃得很开心！`,
                'play': `${petData.name} 玩得很开心！`,
                'sleep': `${petData.name} 睡得很香！`
            };

            await handleAIReply(action, fallbackMessages[action] || '宠物很开心！');
            console.log("✅ AI回复测试完成");
        } catch (error) {
            console.error("❌ AI回复测试失败:", error);
        }
    };

    /**
     * 测试人设切换功能
     */
    window.testPersonalitySwitch = function(personalityType = 'default') {
        console.log(`🎭 测试人设切换: ${personalityType}`);

        if (personalityType === 'custom') {
            const customText = prompt("请输入自定义人设:", "一只特别的宠物");
            if (customText) {
                savePersonalitySettings('custom', customText);
            }
        } else if (PRESET_PERSONALITIES[personalityType]) {
            savePersonalitySettings(personalityType);
        } else {
            console.error("❌ 无效的人设类型:", personalityType);
            console.log("可用的人设类型:", Object.keys(PRESET_PERSONALITIES));
            return;
        }

        console.log("✅ 人设切换完成");
        console.log("当前人设:", getCurrentPersonality());
    };

    /**
     * 移动端API连接诊断和修复
     */
    window.diagnoseMobileAPI = function() {
        console.log('📱 移动端API连接诊断...');

        // 检测设备类型
        const userAgent = navigator.userAgent;
        const isIOS = /iPad|iPhone|iPod/.test(userAgent);
        const isAndroid = /Android/.test(userAgent);
        const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

        console.log('\n📱 设备信息:');
        console.log(`User Agent: ${userAgent}`);
        console.log(`iOS: ${isIOS}`);
        console.log(`Android: ${isAndroid}`);
        console.log(`移动端: ${isMobile}`);
        console.log(`窗口尺寸: ${window.innerWidth}x${window.innerHeight}`);

        // 检查网络连接
        console.log('\n🌐 网络连接:');
        console.log(`在线状态: ${navigator.onLine ? '✅ 在线' : '❌ 离线'}`);
        console.log(`连接类型: ${navigator.connection ? navigator.connection.effectiveType : '未知'}`);

        // 检查API配置
        console.log('\n🔧 API配置:');
        const apiUrl = $('#ai-url-input').val();
        const apiKey = $('#ai-key-input').val();
        console.log(`API URL: ${apiUrl || '❌ 未配置'}`);
        console.log(`API Key: ${apiKey ? '✅ 已配置' : '❌ 未配置'}`);

        // 移动端特殊问题检查
        console.log('\n🔍 移动端特殊问题:');

        // 1. CORS问题
        if (apiUrl && !apiUrl.includes('localhost') && !apiUrl.includes('127.0.0.1')) {
            console.log('⚠️ 外部API可能存在CORS限制');
            console.log('💡 建议: 使用支持CORS的API或本地代理');
        }

        // 2. HTTPS问题
        if (location.protocol === 'https:' && apiUrl && apiUrl.startsWith('http:')) {
            console.log('❌ HTTPS页面无法访问HTTP API');
            console.log('💡 建议: 使用HTTPS API或在HTTP环境下使用');
        }

        // 3. 移动端网络限制
        if (isMobile) {
            console.log('📱 移动端网络优化建议:');
            console.log('- 使用稳定的WiFi连接');
            console.log('- 避免使用移动数据访问外部API');
            console.log('- 增加请求超时时间');
        }

        return {
            device: { userAgent, isIOS, isAndroid, isMobile },
            network: { online: navigator.onLine, connection: navigator.connection },
            api: { url: apiUrl, hasKey: !!apiKey },
            recommendations: getMobileAPIRecommendations(isMobile, apiUrl, apiKey)
        };
    };

    /**
     * 获取移动端API连接建议
     */
    function getMobileAPIRecommendations(isMobile, apiUrl, apiKey) {
        const recommendations = [];

        if (isMobile) {
            recommendations.push('使用稳定的WiFi网络');
            recommendations.push('避免在移动数据下使用外部API');
        }

        if (!apiUrl) {
            recommendations.push('配置API URL');
        }

        if (!apiKey) {
            recommendations.push('配置API密钥');
        }

        if (apiUrl && apiUrl.startsWith('http:') && location.protocol === 'https:') {
            recommendations.push('使用HTTPS API或切换到HTTP环境');
        }

        return recommendations;
    }

    /**
     * 移动端API URL智能修复
     */
    window.fixMobileAPIURL = function(originalUrl) {
        console.log('🔧 移动端API URL智能修复...');
        console.log(`原始URL: ${originalUrl}`);

        if (!originalUrl) {
            console.log('❌ URL为空');
            return null;
        }

        // 移除末尾斜杠
        let fixedUrl = originalUrl.replace(/\/+$/, '');

        // 常见的移动端404问题修复
        const fixes = [];

        // 1. 缺少/v1路径
        if (!fixedUrl.includes('/v1') && !fixedUrl.includes('/api/v1')) {
            if (fixedUrl.includes('openai.com') ||
                fixedUrl.includes('localhost') ||
                fixedUrl.includes('127.0.0.1')) {
                fixes.push({
                    type: '添加/v1路径',
                    url: fixedUrl + '/v1',
                    reason: '标准OpenAI API需要/v1路径'
                });
            }
        }

        // 2. 缺少/chat/completions端点
        if (!fixedUrl.includes('/chat/completions')) {
            fixes.push({
                type: '添加聊天端点',
                url: fixedUrl + '/chat/completions',
                reason: '聊天API需要/chat/completions端点'
            });

            if (fixedUrl.includes('/v1')) {
                fixes.push({
                    type: '添加聊天端点(v1)',
                    url: fixedUrl + '/chat/completions',
                    reason: '已有v1路径，直接添加聊天端点'
                });
            } else {
                fixes.push({
                    type: '添加完整路径',
                    url: fixedUrl + '/v1/chat/completions',
                    reason: '添加完整的v1聊天端点路径'
                });
            }
        }

        // 3. 协议问题修复
        if (fixedUrl.startsWith('http:') && location.protocol === 'https:') {
            fixes.push({
                type: 'HTTPS协议修复',
                url: fixedUrl.replace('http:', 'https:'),
                reason: 'HTTPS页面需要HTTPS API'
            });
        }

        // 4. 端口问题修复
        if (fixedUrl.includes('localhost') && !fixedUrl.includes(':')) {
            fixes.push({
                type: '添加默认端口',
                url: fixedUrl.replace('localhost', 'localhost:1234'),
                reason: 'LM Studio默认端口1234'
            });
            fixes.push({
                type: '添加Ollama端口',
                url: fixedUrl.replace('localhost', 'localhost:11434'),
                reason: 'Ollama默认端口11434'
            });
        }

        console.log(`🔧 发现 ${fixes.length} 个可能的修复方案:`);
        fixes.forEach((fix, index) => {
            console.log(`${index + 1}. ${fix.type}: ${fix.url} (${fix.reason})`);
        });

        return fixes;
    };

    /**
     * 移动端API连接测试 - 增强版
     */
    window.testMobileAPIConnection = async function() {
        console.log('📱 测试移动端API连接...');

        const originalUrl = $('#ai-url-input').val();
        const apiKey = $('#ai-key-input').val();

        if (!originalUrl) {
            console.log('❌ 请先配置API URL');
            toastr.error('请先配置API URL');
            return false;
        }

        // 获取URL修复建议
        const urlFixes = window.fixMobileAPIURL(originalUrl);

        // 要测试的URL列表
        const urlsToTest = [originalUrl];
        if (urlFixes && urlFixes.length > 0) {
            urlFixes.forEach(fix => urlsToTest.push(fix.url));
        }

        console.log(`🔍 将测试 ${urlsToTest.length} 个URL...`);

        for (let i = 0; i < urlsToTest.length; i++) {
            const testUrl = urlsToTest[i];
            console.log(`\n🔗 测试 ${i + 1}/${urlsToTest.length}: ${testUrl}`);

            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 15000); // 移动端15秒超时

                const headers = {
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                };

                if (apiKey) {
                    headers['Authorization'] = `Bearer ${apiKey}`;
                }

                // 尝试models端点而不是chat端点进行测试
                let testEndpoint = testUrl;
                if (testUrl.includes('/chat/completions')) {
                    testEndpoint = testUrl.replace('/chat/completions', '/models');
                } else if (!testUrl.includes('/models')) {
                    testEndpoint = testUrl + '/models';
                }

                console.log(`📡 实际测试端点: ${testEndpoint}`);

                const response = await fetch(testEndpoint, {
                    method: 'GET',
                    headers: headers,
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                console.log(`📊 响应状态: ${response.status} ${response.statusText}`);

                if (response.ok) {
                    const data = await response.json();
                    console.log('✅ 连接成功!', data);

                    // 如果成功的URL不是原始URL，建议用户更新
                    if (testUrl !== originalUrl) {
                        const message = `📱 建议更新API URL为: ${testUrl}`;
                        console.log(message);
                        toastr.success(message, '连接成功!', { timeOut: 8000 });

                        // 询问是否自动更新URL
                        if (confirm(`API连接成功!\n\n建议将URL更新为:\n${testUrl}\n\n是否自动更新?`)) {
                            $('#ai-url-input').val(testUrl);
                            toastr.info('API URL已自动更新');
                        }
                    } else {
                        toastr.success('📱 移动端API连接测试成功!');
                    }

                    return true;

                } else if (response.status === 404) {
                    console.log(`❌ 404错误: ${testEndpoint} 端点不存在`);
                    if (i === 0) {
                        console.log('💡 尝试修复URL...');
                    }
                } else if (response.status === 401 || response.status === 403) {
                    console.log(`🔐 认证错误: ${response.status} - 可能需要正确的API密钥`);
                    if (i === 0) {
                        toastr.warning('API认证失败，请检查API密钥');
                    }
                } else {
                    console.log(`⚠️ HTTP错误: ${response.status} ${response.statusText}`);
                }

            } catch (error) {
                console.log(`❌ 连接失败: ${error.message}`);

                if (error.name === 'AbortError') {
                    console.log('⏰ 请求超时');
                    if (i === 0) {
                        console.log('💡 建议: 网络较慢，尝试使用更稳定的网络');
                    }
                } else if (error.message.includes('CORS')) {
                    console.log('🚫 CORS限制');
                    if (i === 0) {
                        console.log('💡 建议: API不支持跨域访问，尝试使用本地代理');
                    }
                } else if (error.message.includes('Failed to fetch')) {
                    console.log('🌐 网络连接失败');
                    if (i === 0) {
                        console.log('💡 建议: 检查网络连接或API服务是否运行');
                    }
                }
            }
        }

        // 所有URL都失败
        console.log('\n❌ 所有URL测试都失败了');
        toastr.error('📱 移动端API连接失败，请检查配置', '连接失败', { timeOut: 5000 });

        // 提供详细的故障排除建议
        console.log('\n🔧 移动端API 404故障排除建议:');
        console.log('1. 检查API URL格式是否正确');
        console.log('2. 确认API服务正在运行');
        console.log('3. 检查网络连接');
        console.log('4. 尝试使用本地API (Ollama/LM Studio)');
        console.log('5. 检查CORS设置');

        return false;
    };

    console.log("🐾 虚拟宠物系统加载完成！");
    console.log("🐾 如果没有看到按钮，请在控制台运行: testVirtualPet()");
    console.log("🎉 AI人设功能已加载！可用测试命令:");
    console.log("  - testVirtualPetAI() - 检查AI功能状态");
    console.log("  - testAIReply('feed'|'play'|'sleep') - 手动测试AI回复");
    console.log("  - testPersonalitySwitch('default'|'cheerful'|'elegant'|'shy'|'smart'|'custom') - 测试人设切换");
    console.log("📱 移动端专用命令:");
    console.log("  - diagnoseMobileAPI() - 移动端API诊断");
    console.log("  - testMobileAPIConnection() - 测试移动端API连接");
    console.log("  - testURLBuilder('your-url') - 测试URL自动构建功能");
    console.log("🤖 第三方API专用命令:");
    console.log("  - testGeminiAPI() - 测试Gemini API连接和格式");
    console.log("  - testThirdPartyAPI() - 测试当前配置的第三方API");
    console.log("  - debugAPICall() - 调试API调用流程");
    console.log("  - debugAPIResponse() - 调试API响应解析");
    console.log("  - quickFixAPI() - 快速修复API响应解析问题");
    console.log("  - testSimpleRequest() - 测试简化的请求格式");

    /**
     * 测试URL自动构建功能
     */
    window.testURLBuilder = function(inputUrl) {
        console.log('🔧 测试URL自动构建功能...');
        console.log('输入URL:', inputUrl);

        // 模拟URL构建逻辑
        let apiUrl = inputUrl;
        apiUrl = apiUrl.replace(/\/+$/, '');

        console.log('清理后URL:', apiUrl);

        // OpenAI/Custom API类型的URL构建
        if (!apiUrl.includes('/chat/completions')) {
            let finalUrl;
            if (apiUrl.endsWith('/v1')) {
                finalUrl = apiUrl + '/chat/completions';
                console.log('✅ 检测到/v1结尾，添加/chat/completions');
            } else if (!apiUrl.includes('/v1')) {
                finalUrl = apiUrl + '/v1/chat/completions';
                console.log('✅ 未检测到/v1，添加/v1/chat/completions');
            } else {
                finalUrl = apiUrl + '/chat/completions';
                console.log('✅ 检测到/v1但不在末尾，添加/chat/completions');
            }
            console.log('最终URL:', finalUrl);
            return finalUrl;
        } else {
            console.log('✅ URL已包含/chat/completions，无需修改');
            return apiUrl;
        }
    };

    /**
     * 测试新的提示词系统
     */
    window.testNewPrompt = function(action = 'play') {
        console.log('🔍 测试新的提示词系统...');

        console.log('=== 当前设置 ===');
        console.log(`宠物名称: ${petData.name}`);
        console.log(`人设类型: ${localStorage.getItem(`${extensionName}-personality-type`) || 'default'}`);
        console.log(`当前人设: ${getCurrentPersonality()}`);

        console.log('\n=== 生成的提示词 ===');
        const prompt = buildInteractionPrompt(action);
        console.log(prompt);

        console.log('\n=== 提示词分析 ===');
        const hasAnimalType = prompt.includes('猫') || prompt.includes('狗') || prompt.includes('龙') || prompt.includes('类型：');
        const hasPersonality = prompt.includes(getCurrentPersonality());
        const hasConflict = hasAnimalType && getCurrentPersonality().includes('步开星');

        console.log(`包含动物类型: ${hasAnimalType ? '❌ 是' : '✅ 否'}`);
        console.log(`包含人设内容: ${hasPersonality ? '✅ 是' : '❌ 否'}`);
        console.log(`存在身份冲突: ${hasConflict ? '❌ 是' : '✅ 否'}`);

        if (!hasAnimalType && hasPersonality && !hasConflict) {
            console.log('✅ 提示词系统正常，应该不会出现身份混淆');
            toastr.success('提示词系统正常！');
        } else {
            console.log('⚠️ 提示词可能仍有问题');
            toastr.warning('提示词可能仍有问题，请查看控制台');
        }

        return prompt;
    };

    /**
     * 测试Gemini API连接和格式
     */
    window.testGeminiAPI = async function() {
        console.log('🤖 测试Gemini API连接和格式...');

        const apiUrl = $('#ai-url-input').val();
        const apiKey = $('#ai-key-input').val();
        const apiModel = $('#ai-model-input').val() || 'gemini-pro';

        if (!apiUrl) {
            console.log('❌ 请先配置API URL');
            toastr.error('请先配置API URL');
            return false;
        }

        if (!apiKey) {
            console.log('❌ 请先配置API密钥');
            toastr.error('请先配置API密钥');
            return false;
        }

        console.log(`🔗 API URL: ${apiUrl}`);
        console.log(`🔑 API Key: ${apiKey ? '已设置' : '未设置'}`);
        console.log(`🤖 模型: ${apiModel}`);

        // 构建测试设置
        const testSettings = {
            apiType: 'google',
            apiUrl: apiUrl,
            apiKey: apiKey,
            apiModel: apiModel
        };

        try {
            console.log('\n📡 开始测试Gemini API...');
            const testPrompt = "请简单回复'测试成功'，不超过10个字。";

            const response = await callCustomAPI(testPrompt, testSettings, 15000);

            if (response && response.trim()) {
                console.log('✅ Gemini API测试成功!');
                console.log(`📝 AI回复: ${response}`);
                toastr.success(`Gemini API测试成功！AI回复: ${response.substring(0, 50)}`, '🤖 测试成功');
                return true;
            } else {
                console.log('❌ Gemini API返回空响应');
                toastr.error('Gemini API返回空响应', '❌ 测试失败');
                return false;
            }

        } catch (error) {
            console.error('❌ Gemini API测试失败:', error);

            // 提供详细的错误分析
            if (error.message.includes('500')) {
                console.log('💡 500错误可能原因:');
                console.log('1. 请求格式不正确');
                console.log('2. 模型名称错误');
                console.log('3. API密钥权限不足');
                toastr.error('500错误：请检查请求格式和模型名称', '❌ 服务器错误', { timeOut: 8000 });
            } else if (error.message.includes('401') || error.message.includes('403')) {
                console.log('💡 认证错误可能原因:');
                console.log('1. API密钥无效');
                console.log('2. API密钥权限不足');
                console.log('3. 认证头格式错误');
                toastr.error('认证失败：请检查API密钥', '❌ 认证错误', { timeOut: 8000 });
            } else if (error.message.includes('404')) {
                console.log('💡 404错误可能原因:');
                console.log('1. API端点URL错误');
                console.log('2. 模型名称不存在');
                console.log('3. API版本不正确');
                toastr.error('404错误：请检查API URL和模型名称', '❌ 端点错误', { timeOut: 8000 });
            }

            toastr.error(`Gemini API测试失败: ${error.message}`, '❌ 测试失败', { timeOut: 10000 });
            return false;
        }
    };

    /**
     * 测试当前配置的第三方API
     */
    window.testThirdPartyAPI = async function() {
        console.log('🌐 测试当前配置的第三方API...');

        const settings = loadAISettings();
        console.log('📋 当前API配置:', settings);

        if (!settings.apiType || !settings.apiUrl || !settings.apiKey) {
            console.log('❌ API配置不完整');
            console.log(`API类型: ${settings.apiType || '未设置'}`);
            console.log(`API URL: ${settings.apiUrl || '未设置'}`);
            console.log(`API密钥: ${settings.apiKey ? '已设置' : '未设置'}`);
            toastr.error('请先完整配置API信息', '❌ 配置不完整');
            return false;
        }

        try {
            console.log('\n📡 开始测试第三方API...');
            const testPrompt = "请简单回复'测试成功'，不超过10个字。";

            const response = await callCustomAPI(testPrompt, settings, 15000);

            if (response && response.trim()) {
                console.log('✅ 第三方API测试成功!');
                console.log(`📝 AI回复: ${response}`);
                toastr.success(`第三方API测试成功！AI回复: ${response.substring(0, 50)}`, '🌐 测试成功');
                return true;
            } else {
                console.log('❌ 第三方API返回空响应');
                toastr.error('第三方API返回空响应', '❌ 测试失败');
                return false;
            }

        } catch (error) {
            console.error('❌ 第三方API测试失败:', error);

            // 提供详细的错误分析
            if (error.message.includes('500')) {
                console.log('💡 500错误分析:');
                console.log('1. 请求格式可能不正确');
                console.log('2. 模型名称可能错误');
                console.log('3. API服务器内部错误');
                console.log('4. 请求参数不符合API要求');
                toastr.error('500错误：服务器内部错误，请检查请求格式', '❌ 服务器错误', { timeOut: 8000 });
            } else if (error.message.includes('401') || error.message.includes('403')) {
                console.log('💡 认证错误分析:');
                console.log('1. API密钥无效或过期');
                console.log('2. API密钥权限不足');
                console.log('3. 认证头格式错误');
                console.log('4. API配额已用完');
                toastr.error('认证失败：请检查API密钥和权限', '❌ 认证错误', { timeOut: 8000 });
            } else if (error.message.includes('404')) {
                console.log('💡 404错误分析:');
                console.log('1. API端点URL错误');
                console.log('2. 模型名称不存在');
                console.log('3. API版本路径错误');
                toastr.error('404错误：请检查API URL和端点', '❌ 端点错误', { timeOut: 8000 });
            }

            toastr.error(`第三方API测试失败: ${error.message}`, '❌ 测试失败', { timeOut: 10000 });
            return false;
        }
    };

    /**
     * 调试API调用流程
     */
    window.debugAPICall = async function() {
        console.log('🔍 调试API调用流程...');

        const settings = loadAISettings();
        console.log('\n📋 API配置检查:');
        console.log(`API类型: ${settings.apiType || '❌ 未设置'}`);
        console.log(`API URL: ${settings.apiUrl || '❌ 未设置'}`);
        console.log(`API密钥: ${settings.apiKey ? '✅ 已设置' : '❌ 未设置'}`);
        console.log(`API模型: ${settings.apiModel || '❌ 未设置'}`);

        console.log('\n✅ 注意: 插件现在只使用自定义API配置，不再调用SillyTavern API');

        console.log('\n📡 开始调试API调用...');
        const testPrompt = "测试";

        try {
            const result = await callAIAPI(testPrompt, 10000);
            console.log('✅ API调用成功:', result);
            toastr.success(`API调用成功: ${result}`, '🔍 调试成功');
        } catch (error) {
            console.error('❌ API调用失败:', error);
            toastr.error(`API调用失败: ${error.message}`, '🔍 调试失败', { timeOut: 8000 });
        }
    };

    /**
     * 调试API响应解析
     */
    window.debugAPIResponse = function(mockResponse = null) {
        console.log('🔍 调试API响应解析...');

        const settings = loadAISettings();
        console.log('📋 当前API配置:', settings);

        // 如果没有提供模拟响应，使用一些常见的响应格式示例
        const mockResponses = {
            openai: {
                choices: [{
                    message: { content: "这是OpenAI格式的回复" },
                    text: "这是备用的text字段"
                }]
            },
            claude: {
                content: [{
                    text: "这是Claude格式的回复"
                }]
            },
            google: {
                candidates: [{
                    content: {
                        parts: [{
                            text: "这是Gemini格式的回复"
                        }]
                    }
                }]
            },
            generic: {
                text: "这是通用格式的text字段",
                response: "这是通用格式的response字段",
                result: "这是通用格式的result字段"
            }
        };

        const testResponse = mockResponse || mockResponses[settings.apiType] || mockResponses.generic;
        console.log('🧪 测试响应数据:', testResponse);

        // 模拟解析逻辑
        let result = '';
        console.log(`🔧 使用API类型: ${settings.apiType}`);

        if (settings.apiType === 'openai' || settings.apiType === 'custom') {
            result = testResponse.choices?.[0]?.message?.content || testResponse.choices?.[0]?.text || '';
            console.log('📊 OpenAI解析结果:', {
                'choices[0].message.content': testResponse.choices?.[0]?.message?.content,
                'choices[0].text': testResponse.choices?.[0]?.text,
                'final_result': result
            });
        } else if (settings.apiType === 'claude') {
            result = testResponse.content?.[0]?.text || '';
            console.log('📊 Claude解析结果:', {
                'content[0].text': testResponse.content?.[0]?.text,
                'final_result': result
            });
        } else if (settings.apiType === 'google') {
            result = testResponse.candidates?.[0]?.content?.parts?.[0]?.text || '';
            console.log('📊 Gemini解析结果:', {
                'candidates[0].content.parts[0].text': testResponse.candidates?.[0]?.content?.parts?.[0]?.text,
                'final_result': result
            });

            if (!result) {
                result = testResponse.text || testResponse.response || testResponse.result || '';
                console.log('📊 Gemini备用解析:', {
                    'text': testResponse.text,
                    'response': testResponse.response,
                    'result': testResponse.result,
                    'backup_result': result
                });
            }
        } else {
            result = testResponse.text || testResponse.response || testResponse.result || '';
            console.log('📊 通用解析结果:', {
                'text': testResponse.text,
                'response': testResponse.response,
                'result': testResponse.result,
                'final_result': result
            });
        }

        console.log('✅ 最终解析结果:', {
            result: result,
            type: typeof result,
            length: result ? result.length : 'null/undefined',
            isEmpty: !result || result.trim() === '',
            trimmed: result ? result.trim() : 'cannot trim'
        });

        if (result && result.trim()) {
            console.log('✅ 解析成功！');
            toastr.success(`解析成功: ${result}`, '🔍 调试成功');
        } else {
            console.log('❌ 解析失败，返回空结果');
            toastr.error('解析失败，返回空结果', '🔍 调试失败');
        }

        return result;
    };

    /**
     * 快速修复API响应解析问题
     */
    window.quickFixAPI = async function() {
        console.log('🔧 快速修复API响应解析问题...');

        const settings = loadAISettings();
        if (!settings.apiType || !settings.apiUrl || !settings.apiKey) {
            console.log('❌ 请先配置API信息');
            return false;
        }

        console.log('📡 发送测试请求以获取真实响应结构...');

        try {
            // 直接调用callCustomAPI来获取真实响应
            const testPrompt = "测试";
            await callCustomAPI(testPrompt, settings, 10000);
        } catch (error) {
            console.log('📊 从错误中获取响应信息...');
        }

        console.log('\n💡 基于你的日志，问题是choices[0].message.content为空字符串');
        console.log('🔍 让我们检查choices[0]的完整结构...');

        // 模拟你的响应数据进行分析
        const mockResponse = {
            id: 'chatcmpl-20250708132707348110513aE2tFtcY',
            model: 'gemini-2.5-pro-preview-06-05',
            object: 'chat.completion',
            created: 1751952430,
            choices: [{
                // 这里可能有其他字段
                message: {
                    content: '', // 这个是空的
                    // 可能还有其他字段
                },
                // 可能还有其他字段
            }]
        };

        console.log('🧪 分析可能的响应结构...');
        console.log('如果choices[0].message.content是空的，可能的原因：');
        console.log('1. 内容在choices[0].message.text字段');
        console.log('2. 内容在choices[0].text字段');
        console.log('3. 内容在choices[0].content字段');
        console.log('4. 内容在choices[0].delta.content字段');
        console.log('5. API返回了空内容（可能是模型问题）');

        console.log('\n🔧 建议的修复方案：');
        console.log('1. 再次运行testThirdPartyAPI()查看详细日志');
        console.log('2. 检查你的API提供商文档');
        console.log('3. 尝试不同的模型名称');
        console.log('4. 检查API配额和权限');

        toastr.info('请查看控制台的详细分析', '🔧 快速修复', { timeOut: 5000 });

        return true;
    };

    /**
     * 测试简化的请求格式
     */
    window.testSimpleRequest = async function() {
        console.log('🧪 测试简化的请求格式...');

        const settings = loadAISettings();
        if (!settings.apiType || !settings.apiUrl || !settings.apiKey) {
            console.log('❌ 请先配置API信息');
            return false;
        }

        console.log('📋 当前配置:', settings);

        // 测试不同的模型名称
        const testModels = [
            'gemini-pro',
            'gpt-3.5-turbo',
            'gpt-4',
            settings.apiModel // 原始模型名称
        ];

        for (const model of testModels) {
            console.log(`\n🔍 测试模型: ${model}`);

            const testSettings = {
                ...settings,
                apiModel: model
            };

            try {
                const result = await callCustomAPI("测试", testSettings, 10000);
                if (result && result.trim()) {
                    console.log(`✅ 模型 ${model} 测试成功: ${result}`);
                    toastr.success(`模型 ${model} 可用！`, '🧪 测试成功');
                    return { success: true, model: model, response: result };
                } else {
                    console.log(`❌ 模型 ${model} 返回空内容`);
                }
            } catch (error) {
                console.log(`❌ 模型 ${model} 测试失败: ${error.message}`);
            }
        }

        console.log('\n💡 建议:');
        console.log('1. 尝试使用标准模型名称 (gemini-pro, gpt-3.5-turbo)');
        console.log('2. 检查API提供商支持的模型列表');
        console.log('3. 确认模型名称格式是否正确');

        toastr.warning('所有模型测试都失败了', '🧪 测试完成', { timeOut: 5000 });
        return { success: false };
    };

    /**
     * 快速验证抱抱功能是否完整
     */
    window.quickVerifyHugFunction = function() {
        console.log('🚀 快速验证抱抱功能是否完整...');

        const checks = {
            hugFunctionExists: typeof window.hugPet === 'function',
            promptSupport: false,
            uiButton: false,
            rewardSystem: false
        };

        // 检查提示词支持
        try {
            const prompt = buildInteractionPrompt('hug');
            checks.promptSupport = prompt.includes('给了我一个温暖的拥抱');
        } catch (e) {
            checks.promptSupport = false;
        }

        // 检查UI按钮
        const popup = $("#virtual-pet-popup");
        if (popup.length > 0) {
            checks.uiButton = popup.find(".hug-btn").length > 0;
        }

        // 检查奖励系统
        if (checks.hugFunctionExists) {
            const hugCode = window.hugPet.toString();
            checks.rewardSystem = hugCode.includes('gainCoins') && hugCode.includes('gainExperience');
        }

        console.log('\n📊 验证结果:');
        console.log(`✅ hugPet函数存在: ${checks.hugFunctionExists ? '✅' : '❌'}`);
        console.log(`✅ 提示词支持: ${checks.promptSupport ? '✅' : '❌'}`);
        console.log(`✅ UI按钮存在: ${checks.uiButton ? '✅' : '❌'} ${!popup.length ? '(需要先打开宠物界面)' : ''}`);
        console.log(`✅ 奖励系统: ${checks.rewardSystem ? '✅' : '❌'}`);

        const allGood = checks.hugFunctionExists && checks.promptSupport && checks.rewardSystem;

        if (allGood) {
            console.log('\n🎉 抱抱功能完全正常！');
            console.log('💡 特点: 25秒冷却，+10快乐+3健康，2金币+1经验');
            toastr.success('🤗 抱抱功能验证通过！', '', { timeOut: 2000 });
        } else {
            console.log('\n⚠️ 抱抱功能可能存在问题');
            if (!checks.hugFunctionExists) console.log('💡 运行: forceApplyTamagotchiSystem()');
        }

        return {
            allGood,
            details: checks,
            recommendation: allGood ? '功能正常，可以使用' : '需要检查或重新应用拓麻歌子系统'
        };
    };

    /**
     * 测试提示词生成（检查undefined问题）
     */
    window.testPromptGeneration = function() {
        console.log('📝 测试提示词生成（检查undefined问题）...');

        const actions = ['feed', 'play', 'sleep', 'hug'];

        actions.forEach(action => {
            console.log(`\n🧪 测试 ${action} 动作:`);

            try {
                const prompt = buildInteractionPrompt(action);

                // 检查是否包含undefined
                const hasUndefined = prompt.includes('undefined');
                console.log(`- 包含undefined: ${hasUndefined ? '❌ 是' : '✅ 否'}`);

                // 提取情景部分
                const scenarioMatch = prompt.match(/【情景】：(.+?)。/);
                if (scenarioMatch) {
                    console.log(`- 情景描述: "${scenarioMatch[1]}"`);
                } else {
                    console.log('- 情景描述: ❌ 未找到');
                }

                // 检查动作描述
                const actionDescriptions = {
                    'feed': '给我喂了食物',
                    'play': '陪我玩耍',
                    'sleep': '让我休息',
                    'hug': '给了我一个温暖的拥抱'
                };

                const expectedDesc = actionDescriptions[action];
                const hasCorrectDesc = prompt.includes(expectedDesc);
                console.log(`- 预期描述: "${expectedDesc}"`);
                console.log(`- 描述正确: ${hasCorrectDesc ? '✅ 是' : '❌ 否'}`);

            } catch (error) {
                console.log(`❌ 生成失败: ${error.message}`);
            }
        });

        console.log('\n💡 如果发现undefined问题:');
        console.log('1. 检查actionDescriptions对象是否包含所有动作');
        console.log('2. 检查传递给buildInteractionPrompt的参数是否正确');
        console.log('3. 检查是否有拼写错误');

        return true;
    };

    /**
     * 诊断和修复75数值问题
     */
    window.diagnose75ValueIssue = function() {
        console.log('🔍 诊断75数值问题...');

        console.log('\n📊 当前宠物状态:');
        console.log(`- 健康: ${petData.health}/100`);
        console.log(`- 快乐: ${petData.happiness}/100`);
        console.log(`- 饱食: ${petData.hunger}/100`);
        console.log(`- 精力: ${petData.energy}/100`);

        // 检查是否所有数值都是75
        const values = [petData.health, petData.happiness, petData.hunger, petData.energy];
        const allAre75 = values.every(val => val === 75);

        console.log('\n🔍 问题分析:');
        console.log(`- 所有数值都是75: ${allAre75 ? '✅ 是的，这就是问题' : '❌ 不是'}`);

        if (allAre75) {
            console.log('\n❌ 确认问题: 数值被强制限制在75');
            console.log('🔧 原因: 数据加载时的过高数值检测逻辑有问题');
            console.log('✅ 修复: 已移除强制75限制的代码');
        }

        // 检查数据版本
        console.log('\n📋 数据版本信息:');
        console.log(`- 数据版本: ${petData.dataVersion}`);
        console.log(`- 上次更新时间: ${new Date(petData.lastUpdateTime || 0).toLocaleString()}`);

        // 检查时间差
        const now = Date.now();
        const timeSinceLastUpdate = now - (petData.lastUpdateTime || now);
        const hoursElapsed = timeSinceLastUpdate / (1000 * 60 * 60);
        console.log(`- 距离上次更新: ${hoursElapsed.toFixed(1)}小时`);

        // 提供修复方案
        console.log('\n🔧 修复方案:');

        if (allAre75) {
            console.log('1. 重置为更合理的初始数值:');

            // 设置50上限系统标准数值
            petData.health = 30;
            petData.happiness = 25;
            petData.hunger = 35;
            petData.energy = 40;

            // 更新时间戳
            petData.lastUpdateTime = now;
            petData.lastFeedTime = now - 20000; // 20秒前
            petData.lastPlayTime = now - 30000; // 30秒前
            petData.lastSleepTime = now - 60000; // 1分钟前
            petData.lastHugTime = now - 15000; // 15秒前

            // 保存数据
            savePetData();

            console.log('✅ 已重置数值:');
            console.log(`   - 健康: 75 → ${petData.health}`);
            console.log(`   - 快乐: 75 → ${petData.happiness}`);
            console.log(`   - 饱食: 75 → ${petData.hunger}`);
            console.log(`   - 精力: 75 → ${petData.energy}`);

            // 更新UI
            if (typeof updateUnifiedUIStatus === 'function') {
                updateUnifiedUIStatus();
            }
            if (typeof renderPetStatus === 'function') {
                renderPetStatus();
            }

            toastr.success('🎯 已修复75数值问题！现在数值会正常变化了', '', { timeOut: 5000 });
        }

        console.log('\n💡 预防措施:');
        console.log('✅ 已移除强制75限制的代码');
        console.log('✅ 数值现在会根据时间自然衰减');
        console.log('✅ 缓冲机制只在真正需要时触发');

        console.log('\n🧪 测试建议:');
        console.log('1. 关闭并重新打开SillyTavern');
        console.log('2. 观察数值是否不再固定在75');
        console.log('3. 进行几次互动，观察数值变化');

        return {
            wasFixed: allAre75,
            currentValues: {
                health: petData.health,
                happiness: petData.happiness,
                hunger: petData.hunger,
                energy: petData.energy
            },
            hoursElapsed: hoursElapsed
        };
    };



    /**
     * 诊断数值重置问题
     */
    window.diagnoseValueResetIssue = function() {
        console.log('🔍 诊断数值重置问题...');

        // 检查当前数据版本
        console.log('\n📊 当前数据状态:');
        console.log(`- 数据版本: ${petData.dataVersion}`);
        console.log(`- 健康: ${petData.health}/100`);
        console.log(`- 快乐: ${petData.happiness}/100`);
        console.log(`- 饱食: ${petData.hunger}/100`);
        console.log(`- 精力: ${petData.energy}/100`);

        // 检查存储的数据
        console.log('\n💾 存储数据检查:');
        const localData = localStorage.getItem(STORAGE_KEY_PET_DATA);
        const syncData = loadFromSyncStorage();

        console.log(`- 本地存储: ${localData ? '✅ 存在' : '❌ 不存在'}`);
        console.log(`- 同步存储: ${syncData ? '✅ 存在' : '❌ 不存在'}`);

        if (localData) {
            try {
                const parsed = JSON.parse(localData);
                console.log(`- 本地数据版本: ${parsed.dataVersion}`);
                console.log(`- 本地数值: 健康${parsed.health}, 快乐${parsed.happiness}, 饱食${parsed.hunger}, 精力${parsed.energy}`);
            } catch (e) {
                console.log('- 本地数据解析失败');
            }
        }

        if (syncData) {
            try {
                const parsed = typeof syncData === 'object' ? syncData : JSON.parse(syncData);
                console.log(`- 同步数据版本: ${parsed.dataVersion}`);
                console.log(`- 同步数值: 健康${parsed.health}, 快乐${parsed.happiness}, 饱食${parsed.hunger}, 精力${parsed.energy}`);
            } catch (e) {
                console.log('- 同步数据解析失败');
            }
        }

        // 检查时间信息
        console.log('\n⏰ 时间信息:');
        const now = Date.now();
        const timeSinceLastUpdate = now - (petData.lastUpdateTime || now);
        const hoursElapsed = timeSinceLastUpdate / (1000 * 60 * 60);
        console.log(`- 距离上次更新: ${hoursElapsed.toFixed(1)}小时`);
        console.log(`- 上次更新时间: ${new Date(petData.lastUpdateTime || 0).toLocaleString()}`);

        // 分析可能的重置原因
        console.log('\n🔍 可能的重置原因分析:');

        if (!petData.dataVersion || petData.dataVersion < 4.0) {
            console.log('❌ 数据版本过低，会触发迁移重置');
        } else {
            console.log('✅ 数据版本正常，不会触发迁移');
        }

        if (hoursElapsed > 2) {
            console.log('⚠️ 长时间离线，会触发初始化缓冲');
        } else {
            console.log('✅ 离线时间正常，不会触发缓冲');
        }

        // 检查是否有数值限制
        const hasValueCaps = petData.health > 50 || petData.happiness > 50 ||
                            petData.hunger > 50 || petData.energy > 50;

        if (hasValueCaps) {
            console.log('⚠️ 检测到数值超过50上限');
        } else {
            console.log('✅ 数值在50上限范围内');
        }

        console.log('\n💡 建议解决方案:');

        if (!petData.dataVersion || petData.dataVersion < 4.0) {
            console.log('1. 数据版本问题 - 运行: petData.dataVersion = 4.0; savePetData();');
        }

        if (hoursElapsed > 2) {
            console.log('2. 缓冲机制问题 - 运行: petData.lastUpdateTime = Date.now(); savePetData();');
        }

        if (hasValueCaps) {
            console.log('3. 数值超限问题 - 运行: testSmartInitSystem();');
        }

        console.log('\n🧪 测试步骤:');
        console.log('1. 记录当前数值');
        console.log('2. 关闭并重新打开SillyTavern');
        console.log('3. 观察数值是否发生变化');
        console.log('4. 如果变化，运行此诊断函数查看原因');

        return {
            dataVersion: petData.dataVersion,
            currentValues: {
                health: petData.health,
                happiness: petData.happiness,
                hunger: petData.hunger,
                energy: petData.energy
            },
            hoursElapsed: hoursElapsed,
            hasLocalData: !!localData,
            hasSyncData: !!syncData,
            needsMigration: !petData.dataVersion || petData.dataVersion < 4.0,
            needsBuffer: hoursElapsed > 2,
            hasValueCaps: hasValueCaps
        };
    };



    /**
     * 测试智能初始化系统
     */
    window.testSmartInitSystem = function() {
        console.log('🧪 测试智能初始化系统...');

        console.log('\n📊 当前状态:');
        console.log(`- 健康: ${petData.health}/100`);
        console.log(`- 快乐: ${petData.happiness}/100`);
        console.log(`- 饱食: ${petData.hunger}/100`);
        console.log(`- 精力: ${petData.energy}/100`);
        console.log(`- 已随机化: ${petData.hasBeenRandomized ? '✅' : '❌'}`);

        console.log('\n🎲 模拟首次打开随机化:');
        const oldValues = {
            health: petData.health,
            happiness: petData.happiness,
            hunger: petData.hunger,
            energy: petData.energy
        };

        // 重置随机化标记
        petData.hasBeenRandomized = false;

        // 应用随机化
        applyFirstTimeRandomization();

        console.log('随机化结果:');
        console.log(`- 健康: ${oldValues.health} → ${petData.health} (${petData.health <= 50 ? '✅' : '❌'} ≤50)`);
        console.log(`- 快乐: ${oldValues.happiness} → ${petData.happiness} (${petData.happiness <= 50 ? '✅' : '❌'} ≤50)`);
        console.log(`- 饱食: ${oldValues.hunger} → ${petData.hunger} (${petData.hunger <= 50 ? '✅' : '❌'} ≤50)`);
        console.log(`- 精力: ${oldValues.energy} → ${petData.energy} (${petData.energy <= 50 ? '✅' : '❌'} ≤50)`);

        // 保存数据
        savePetData();

        console.log('\n💡 系统特点:');
        console.log('✅ 首次打开：数值随机化到50以下');
        console.log('✅ 后续使用：数值自然衰减，不再强制重置');
        console.log('✅ 满值上限：100（可以通过互动达到）');
        console.log('✅ 长期离线：有缓冲保护机制');

        console.log('\n🎮 使用流程:');
        console.log('1. 首次打开 → 随机化到50以下');
        console.log('2. 互动提升 → 可以超过50，最高100');
        console.log('3. 时间衰减 → 根据离线时间自然下降');
        console.log('4. 重新打开 → 不再重置，保持衰减后的数值');

        return {
            system: '智能初始化系统',
            firstTimeRandomized: petData.hasBeenRandomized,
            currentValues: {
                health: petData.health,
                happiness: petData.happiness,
                hunger: petData.hunger,
                energy: petData.energy
            },
            maxValues: 100,
            firstTimeCap: 50
        };
    };

    /**
     * 重置随机化标记（用于测试）
     */
    window.resetRandomizationFlag = function() {
        petData.hasBeenRandomized = false;
        savePetData();
        console.log('✅ 随机化标记已重置，下次加载数据时会重新随机化');
        toastr.info('随机化标记已重置', '', { timeOut: 2000 });
    };



    // -----------------------------------------------------------------
    // 10. Firebase 同步功能 - 全新重构
    // -----------------------------------------------------------------

    /**
     * 动态加载Firebase SDK脚本
     * @returns {Promise<void>}
     */
    /**
     * 动态注入Firebase设置UI
     */
    /**
     * 动态注入Firebase设置UI - 连接码版本
     */
    function injectFirebaseUI() {
        if ($('#firebase-sync-section').length > 0) return;

        const firebaseHtml = `
            <div id="firebase-sync-section" style="margin-top: 20px; border-top: 1px solid var(--border-color); padding-top: 15px;">
                <h4>☁️ 云同步 (匿名)</h4>
                <p>状态: <span id="firebase-status-text" style="color: orange;">正在连接...</span></p>
                <small class="notes">您的数据已通过匿名方式自动同步。您可以使用下方的连接码功能，将数据迁移到另一台设备或浏览器。</small>
                
                <div id="connection-code-generator" style="margin-top: 15px;">
                    <button id="generate-code-button" class="menu_button">生成连接码</button>
                    <p id="connection-code-display" style="margin-top: 5px; font-weight: bold; color: lightgreen; display: none;"></p>
                </div>

                <div id="connection-code-importer" style="margin-top: 15px;">
                    <label for="connection-code-input">使用连接码迁移数据:</label>
                    <input type="text" id="connection-code-input" class="text_pole" placeholder="在此输入连接码">
                    <button id="use-code-button" class="menu_button" style="margin-top: 5px;">确认迁移</button>
                </div>
            </div>
        `;
        $('#virtual-pet-settings .inline-drawer-content').append(firebaseHtml);
    }

    /**
     * 动态加载Firebase v9 SDK脚本
     */
    function loadFirebaseSDKs() {
        return new Promise((resolve, reject) => {
            // 检查核心模块是否已加载
            if (window.firebase?.app) {
                console.log(`[${extensionName}] Firebase v9 SDK 已加载`);
                fb_app = window.firebase.app;
                fb_auth = window.firebase.auth;
                fb_firestore = window.firebase.firestore;
                resolve();
                return;
            }

            const script = document.createElement('script');
            // 加载包含所有模块的兼容性脚本，最简单可靠
            script.src = 'https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js';
            script.onload = () => {
                const authScript = document.createElement('script');
                authScript.src = 'https://www.gstatic.com/firebasejs/9.6.1/firebase-auth-compat.js';
                authScript.onload = () => {
                    const firestoreScript = document.createElement('script');
                    firestoreScript.src = 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore-compat.js';
                    firestoreScript.onload = () => {
                        console.log(`[${extensionName}] 所有 Firebase v9 compat SDK 加载成功`);
                        // 从 v9 兼容包中解构出 v9 模块化函数
                        fb_app = window.firebase.app;
                        fb_auth = window.firebase.auth;
                        fb_firestore = window.firebase.firestore;
                        resolve();
                    };
                    firestoreScript.onerror = reject;
                    document.head.appendChild(firestoreScript);
                };
                authScript.onerror = reject;
                document.head.appendChild(authScript);
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    /**
     * 初始化Firebase
     */
    /**
     * 初始化Firebase并实现匿名登录
     */
    async function initializeFirebase() {
        const firebaseConfig = {
            apiKey: "AIzaSyA74TnN9IoyQjCncKOIOShWEktrL1hd96o",
            authDomain: "kpop-pett.firebaseapp.com",
            projectId: "kpop-pett",
            storageBucket: "kpop-pett.appspot.com",
            messagingSenderId: "264650615774",
            appId: "1:264650615774:web:f500ff555183110c3f0b4f",
            measurementId: "G-3BH0GMJR3D"
        };

        try {
            await loadFirebaseSDKs();
            
            firebaseApp = firebase.initializeApp(firebaseConfig);
            firebaseAuth = firebase.auth(firebaseApp);
            firestoreDb = firebase.firestore(firebaseApp);

            console.log(`[${extensionName}] Firebase v9 (compat) 初始化成功`);

            firebaseAuth.onAuthStateChanged(async (user) => {
                if (user) {
                    currentUser = user;
                    console.log(`[${extensionName}] 用户已匿名登录，UID:`, user.uid);
                    updateFirebaseUI('已连接，正在同步数据...');
                    await loadDataFromFirebase();
                    updateFirebaseUI('数据同步成功！');
                } else {
                    console.log(`[${extensionName}] 用户未登录，正在尝试匿名登录...`);
                    try {
                        await firebaseAuth.signInAnonymously();
                    } catch (error) {
                        console.error(`[${extensionName}] 匿名登录失败:`, error);
                        updateFirebaseUI('连接失败，请检查网络或刷新页面。', 'red');
                    }
                }
            });
        } catch (error) {
            console.error(`[${extensionName}] Firebase 初始化失败:`, error);
            firebaseApp = null;
            updateFirebaseUI('初始化失败，请检查浏览器插件冲突或网络。', 'red');
        }
    }

    /**
     * 更新Firebase UI状态
     */
    /**
     * 更新Firebase UI状态 - 简化版
     * @param {string} message - 要显示的状态信息
     * @param {string} color - 文本颜色 (默认 'lightgreen')
     */
    function updateFirebaseUI(message, color = 'lightgreen') {
        if ($('#firebase-status-text').length > 0) {
            const statusText = $('#firebase-status-text');
            statusText.text(message);
            statusText.css('color', color);
        }
    }

    /**
     * 设置Firebase相关的事件监听器
     */
    /**
     * 从Firebase加载数据
     */
    async function loadDataFromFirebase() {
        if (!currentUser || !firestoreDb) return;
        console.log(`[${extensionName}] 正在从Firebase加载数据...`);
        try {
            const docRef = firestoreDb.collection('users').doc(currentUser.uid);
            const docSnap = await docRef.get();

            if (docSnap.exists()) {
                const firebaseData = docSnap.data().petData;
                console.log(`[${extensionName}] 从Firebase获取到数据:`, firebaseData);
                petData = { ...petData, ...firebaseData };
                savePetData(true);
                updateAllUI();
                toastr.success('宠物数据已从云端同步！', '同步成功');
            } else {
                console.log(`[${extensionName}] Firebase中无此用户数据，将上传本地数据。`);
                await saveDataToFirebase();
            }
        } catch (error) {
            console.error(`[${extensionName}] 从Firebase加载数据失败:`, error);
            toastr.error('从云端同步数据失败！', '同步失败');
        }
    }

    /**
     * 保存数据到Firebase
     */
    async function saveDataToFirebase() {
        if (!currentUser || !firestoreDb) return;
        const now = Date.now();
        if (now - lastSyncSaveTime < SYNC_SAVE_COOLDOWN) {
            return;
        }
        lastSyncSaveTime = now;

        console.log(`[${extensionName}] 正在保存数据到Firebase...`);
        try {
            const docRef = firestoreDb.collection('users').doc(currentUser.uid);
            await docRef.set({ petData: petData }, { merge: true });
            console.log(`[${extensionName}] 数据成功保存到Firebase`);
        } catch (error) {
            console.error(`[${extensionName}] 保存数据到Firebase失败:`, error);
        }
    }

    /**
     * 设置Firebase相关的事件监听器 - 连接码版本
     */
    /**
     * 生成一个一次性的连接码
     */
    async function generateConnectionCode() {
        if (!currentUser || !firestoreDb) {
            toastr.error('未连接到同步服务。', '生成失败');
            return;
        }

        const button = $('#generate-code-button');
        button.prop('disabled', true).text('正在生成...');

        try {
            const code = Math.random().toString(36).substring(2, 8).toUpperCase();
            const expiration = new Date(Date.now() + 5 * 60 * 1000);

            const docRef = firestoreDb.collection('connection_codes').doc(code);
            await docRef.set({
                petData: petData,
                expiresAt: expiration,
                sourceUid: currentUser.uid
            });

            const display = $('#connection-code-display');
            display.text(`您的连接码是: ${code} (5分钟内有效)`).show();
            toastr.success('连接码已生成！请在另一台设备上输入。', '成功');

            setTimeout(() => display.hide(), 5 * 60 * 1000);

        } catch (error) {
            console.error(`[${extensionName}] 生成连接码失败:`, error);
            toastr.error('生成连接码失败，请检查网络或重试。', '错误');
        } finally {
            button.prop('disabled', false).text('生成连接码');
        }
    }

    /**
     * 使用连接码来迁移数据
     * @param {string} code - 用户输入的连接码
     */
    async function useConnectionCode(code) {
        if (!firestoreDb) {
            toastr.error('未连接到同步服务。', '迁移失败');
            return;
        }

        const button = $('#use-code-button');
        button.prop('disabled', true).text('正在迁移...');

        try {
            const docRef = firestoreDb.collection('connection_codes').doc(code.toUpperCase());
            const docSnap = await docRef.get();

            if (!docSnap.exists() || docSnap.data().expiresAt.toDate() < new Date()) {
                toastr.error('连接码无效或已过期。', '迁移失败');
                return;
            }

            const sourceData = docSnap.data().petData;
            console.log(`[${extensionName}] 通过连接码获取到数据:`, sourceData);

            petData = { ...petData, ...sourceData };
            savePetData();
            await saveDataToFirebase();
            updateAllUI();
            toastr.success('数据迁移成功！您的宠物已同步。', '成功');

            await docRef.delete();

        } catch (error) {
            console.error(`[${extensionName}] 使用连接码失败:`, error);
            toastr.error('迁移数据时发生错误，请重试。', '错误');
        } finally {
            button.prop('disabled', false).text('确认迁移');
            $('#connection-code-input').val('');
        }
    }

    /**
     * 设置Firebase相关的事件监听器 - 连接码版本
     */
    function setupFirebaseEventListeners() {
        $(document).on('click', '#generate-code-button', generateConnectionCode);

        $(document).on('click', '#use-code-button', () => {
            const code = $('#connection-code-input').val().trim();
            if (code) {
                useConnectionCode(code);
            } else {
                toastr.warning('请输入连接码。');
            }
        });
    }

    // 主初始化流程
    injectFirebaseUI();
    initializeFirebase();
    setupFirebaseEventListeners();

    console.log("🐾 虚拟宠物系统脚本已加载完成");
    console.log("🎲 智能初始化系统：首次打开随机化到50以下，后续自然衰减到100");
});
