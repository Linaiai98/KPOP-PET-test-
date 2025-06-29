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
    const STORAGE_KEY_LAST_ATTENTION = "virtual-pet-last-attention";
    const STORAGE_KEY_PET_PERSONA = "virtual-pet-persona";
    const STORAGE_KEY_AI_ATTENTION = "virtual-pet-ai-attention-enabled";
    const STORAGE_KEY_AI_INTERACTIONS = "virtual-pet-ai-interactions-enabled";
    
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

    // 撒娇卖萌系统
    let lastAttentionTime = Date.now();
    let attentionTimer = null;
    let isShowingAttentionSeeker = false;

    // AI撒娇系统
    let petPersona = "";
    let aiAttentionEnabled = false;
    let isGeneratingAIAttention = false;

    // AI互动系统
    let aiInteractionsEnabled = false;
    let isGeneratingAIInteraction = false;

    // 糖果色配色方案
    const candyColors = {
        // 主色调 - 柔和的糖果色
        primary: '#FF9EC7',      // 糖果粉
        secondary: '#A8E6CF',    // 薄荷绿
        accent: '#87CEEB',       // 天空蓝
        warning: '#FFD93D',      // 柠檬黄
        success: '#98FB98',      // 淡绿色

        // 背景色
        background: 'linear-gradient(135deg, #FFE5F1 0%, #E5F9F0 50%, #E5F4FF 100%)', // 糖果渐变
        backgroundSolid: '#FFF8FC', // 纯色背景备选

        // 文字色
        textPrimary: '#2D3748',   // 深灰色文字
        textSecondary: '#4A5568', // 中灰色文字
        textLight: '#718096',     // 浅灰色文字
        textWhite: '#FFFFFF',     // 白色文字

        // 边框和阴影
        border: '#E2E8F0',       // 浅边框
        borderAccent: '#FF9EC7', // 强调边框
        shadow: 'rgba(255, 158, 199, 0.2)', // 粉色阴影
        shadowLight: 'rgba(255, 158, 199, 0.1)', // 浅粉色阴影

        // 按钮色
        buttonPrimary: '#FF9EC7',
        buttonSecondary: '#A8E6CF',
        buttonAccent: '#87CEEB',
        buttonHover: '#FF7FB3',

        // 状态栏色
        health: '#FF9EC7',       // 健康 - 糖果粉
        happiness: '#FFD93D',    // 快乐 - 柠檬黄
        energy: '#A8E6CF',       // 精力 - 薄荷绿
        experience: '#87CEEB'    // 经验 - 天空蓝
    };

    // 撒娇卖萌消息配置
    const attentionMessages = {
        // 根据宠物类型的不同表情
        cat: [
            "🐱 喵~ 主人，我想你了！",
            "🐾 主人不理我了吗？我好孤单...",
            "😿 喵呜~ 陪我玩一会儿嘛~",
            "🥺 主人，我乖乖的，你看看我好不好？",
            "😸 喵~ 我在这里等你很久了！",
            "🐱‍👤 主人，我想要你的关注~",
            "😽 喵喵~ 摸摸我的小脑袋吧！",
            "🙀 主人是不是忘记我了？"
        ],
        dog: [
            "🐶 汪汪~ 主人，我想你了！",
            "🐕 主人，陪我玩球球好不好？",
            "🥺 汪~ 我一直在等你呢！",
            "😊 主人，我今天很乖哦！",
            "🐕‍🦺 汪汪~ 我想要抱抱！",
            "🎾 主人，我们一起玩游戏吧！",
            "😍 汪~ 我最喜欢主人了！",
            "🐶 主人不理我，我要撒娇了~"
        ],
        dragon: [
            "🐉 吼~ 伟大的主人，小龙想念您了！",
            "✨ 主人，我的魔法需要您的关注才能发光！",
            "🔥 呼~ 主人，我为您守护了很久！",
            "💎 主人，我收集了闪亮的宝石想给您看！",
            "🌟 吼吼~ 主人的小龙在这里等您！",
            "🐲 主人，我想展示我新学的魔法！",
            "⚡ 主人，没有您的陪伴我好无聊~",
            "🏰 主人，我们的城堡需要您的关注！"
        ],
        rabbit: [
            "🐰 主人，小兔子想要胡萝卜~",
            "🥕 蹦蹦~ 主人，陪我跳跳好不好？",
            "😊 主人，我的耳朵在等你摸摸！",
            "🌸 主人，我找到了好看的花花！",
            "🐇 蹦~ 主人，我想要你的拥抱！",
            "💕 主人，小兔子最喜欢你了！",
            "🌿 主人，我们一起去草地上玩吧！",
            "🥰 主人，我乖乖的，你看看我~"
        ],
        bird: [
            "🐦 啾啾~ 主人，我想唱歌给你听！",
            "🎵 主人，我学了新的歌曲哦！",
            "🪶 主人，摸摸我漂亮的羽毛吧！",
            "🌤️ 啾~ 主人，今天天气真好，一起飞翔吧！",
            "🎶 主人，我想和你一起唱歌！",
            "🐤 啾啾~ 主人，我想要你的关注！",
            "🌈 主人，我看到了美丽的彩虹想分享给你！",
            "💫 啾~ 主人，我在天空中为你跳舞！"
        ]
    };

    // 撒娇动作配置
    const attentionActions = [
        "轻轻摇摆",
        "眨眨眼睛",
        "转圈圈",
        "跳跳舞",
        "摆尾巴",
        "点点头",
        "做鬼脸",
        "伸懒腰"
    ];

    // 默认人设模板
    const defaultPersonaTemplates = {
        cat: `你是一只可爱的虚拟宠物猫咪，名字叫{petName}。你的性格特点：
- 傲娇但内心温柔，喜欢撒娇
- 说话时会用"喵~"、"主人"等可爱的词汇
- 偶尔会有小脾气，但很快就会和好
- 喜欢被摸头和陪伴
- 会用各种可爱的方式表达想念主人

当你想要主人关注时，请生成一句简短可爱的撒娇话语（不超过30字），要体现出你的个性和对主人的依恋。`,

        dog: `你是一只忠诚的虚拟宠物小狗，名字叫{petName}。你的性格特点：
- 活泼开朗，对主人无比忠诚
- 说话时会用"汪~"、"主人"等词汇
- 精力充沛，喜欢玩耍和运动
- 总是很兴奋地迎接主人
- 会用热情的方式表达对主人的爱

当你想要主人关注时，请生成一句简短热情的话语（不超过30字），要体现出你的活力和对主人的热爱。`,

        dragon: `你是一只高贵的虚拟宠物龙，名字叫{petName}。你的性格特点：
- 高贵优雅但内心温柔
- 说话时会用"吼~"、"伟大的主人"等词汇
- 有着古老的智慧和神秘的魅力
- 虽然强大但很依恋主人
- 会用优雅的方式表达思念

当你想要主人关注时，请生成一句简短优雅的话语（不超过30字），要体现出你的高贵和对主人的依恋。`,

        rabbit: `你是一只温柔的虚拟宠物兔子，名字叫{petName}。你的性格特点：
- 温柔可爱，有点害羞
- 说话时声音轻柔，喜欢用"主人"称呼
- 喜欢安静的环境和温柔的抚摸
- 会用小动作表达情感
- 对主人很依恋但表达比较含蓄

当你想要主人关注时，请生成一句简短温柔的话语（不超过30字），要体现出你的温柔和对主人的依恋。`,

        bird: `你是一只聪明的虚拟宠物小鸟，名字叫{petName}。你的性格特点：
- 聪明活泼，喜欢唱歌
- 说话时会用"啾啾~"、"主人"等词汇
- 喜欢自由但也依恋主人
- 会用歌声和舞蹈表达情感
- 对主人很亲近，喜欢分享见闻

当你想要主人关注时，请生成一句简短动听的话语（不超过30字），要体现出你的灵动和对主人的亲近。`
    };
    
    // 宠物数据结构
    let petData = {
        name: "小宠物",
        type: "cat", // cat, dog, dragon, etc.
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
        dataVersion: 2.0 // 数据版本标记
    };
    
    // ----------------------------------------------------------------- 
    // 2. 宠物系统核心逻辑
    // -----------------------------------------------------------------
    
    /**
     * 加载宠物数据
     */
    function loadPetData() {
        const saved = localStorage.getItem(STORAGE_KEY_PET_DATA);
        if (saved) {
            try {
                const savedData = JSON.parse(saved);

                // 检查是否需要数据迁移（版本2.0 - 新的数值平衡）
                const needsMigration = !savedData.dataVersion || savedData.dataVersion < 2.0;

                if (needsMigration) {
                    console.log(`[${extensionName}] 检测到旧数据，执行数据迁移...`);

                    // 保留用户的自定义设置
                    const migratedData = {
                        ...petData, // 使用新的默认值
                        name: savedData.name || petData.name, // 保留自定义名字
                        type: savedData.type || petData.type, // 保留宠物类型
                        level: savedData.level || petData.level, // 保留等级
                        experience: savedData.experience || petData.experience, // 保留经验
                        created: savedData.created || petData.created, // 保留创建时间
                        lastFeedTime: savedData.lastFeedTime || petData.lastFeedTime,
                        lastPlayTime: savedData.lastPlayTime || petData.lastPlayTime,
                        lastSleepTime: savedData.lastSleepTime || petData.lastSleepTime,
                        lastUpdateTime: savedData.lastUpdateTime || petData.lastUpdateTime,
                        dataVersion: 2.0 // 标记为新版本数据
                    };

                    petData = migratedData;
                    savePetData(); // 保存迁移后的数据

                    console.log(`[${extensionName}] 数据迁移完成！新的初始数值已应用`);
                    console.log(`健康: ${petData.health}, 快乐: ${petData.happiness}, 饱食: ${petData.hunger}, 精力: ${petData.energy}`);
                } else {
                    // 数据版本正确，直接加载
                    petData = { ...petData, ...savedData };
                }
            } catch (error) {
                console.error(`[${extensionName}] Error loading pet data:`, error);
            }
        } else {
            // 没有保存的数据，添加版本标记
            petData.dataVersion = 2.0;
            savePetData();
        }
    }
    
    /**
     * 保存宠物数据
     */
    function savePetData() {
        try {
            localStorage.setItem(STORAGE_KEY_PET_DATA, JSON.stringify(petData));
        } catch (error) {
            console.error(`[${extensionName}] Error saving pet data:`, error);
        }
    }
    
    /**
     * 更新宠物状态（基于时间流逝）
     */
    function updatePetStatus() {
        const now = Date.now();
        const timeSinceLastUpdate = now - (petData.lastUpdateTime || now);
        const hoursElapsed = timeSinceLastUpdate / (1000 * 60 * 60);
        
        // 随时间降低的属性（减缓衰减速度）
        if (hoursElapsed > 0.2) { // 每12分钟更新一次
            petData.hunger = Math.max(0, petData.hunger - hoursElapsed * 0.8);
            petData.energy = Math.max(0, petData.energy - hoursElapsed * 0.6);

            // 饥饿和疲劳影响健康和快乐（减缓影响）
            if (petData.hunger < 20) {
                petData.health = Math.max(0, petData.health - hoursElapsed * 1);
                petData.happiness = Math.max(0, petData.happiness - hoursElapsed * 0.8);
            }

            if (petData.energy < 20) {
                petData.happiness = Math.max(0, petData.happiness - hoursElapsed * 0.5);
            }
            
            petData.lastUpdateTime = now;
            savePetData();

            // 检查是否需要发送通知
            checkAndSendNotifications();
        }
    }
    
    /**
     * 喂食宠物
     */
    async function feedPet() {
        const now = Date.now();
        const timeSinceLastFeed = now - petData.lastFeedTime;

        if (timeSinceLastFeed < 20000) { // 20秒冷却
            toastr.warning("宠物还不饿，等一会再喂吧！");
            return;
        }

        petData.hunger = Math.min(100, petData.hunger + 15);
        petData.happiness = Math.min(100, petData.happiness + 5);
        petData.lastFeedTime = now;

        // 获得经验
        gainExperience(3);

        // 更新关注时间
        updateLastAttentionTime();

        // 尝试生成AI互动消息
        let message = `${petData.name} 吃得很开心！`;
        let messageSource = "default";

        if (aiInteractionsEnabled && petPersona) {
            try {
                const aiMessage = await generateAIInteractionMessage('feed');
                if (aiMessage && aiMessage.length > 0) {
                    message = aiMessage;
                    messageSource = "AI";
                    console.log(`[${extensionName}] 使用AI喂食回应: ${message}`);
                }
            } catch (error) {
                console.error(`[${extensionName}] AI喂食回应生成失败:`, error);
            }
        }

        // 显示消息
        const title = messageSource === "AI" ? "喂食回应 ✨" : "喂食";
        toastr.success(message, title, {
            timeOut: messageSource === "AI" ? 6000 : 4000
        });

        savePetData();
        renderPetStatus();
    }
    
    /**
     * 和宠物玩耍
     */
    async function playWithPet() {
        const now = Date.now();
        const timeSinceLastPlay = now - petData.lastPlayTime;

        if (timeSinceLastPlay < 40000) { // 40秒冷却
            toastr.warning("宠物需要休息一下！");
            return;
        }

        petData.happiness = Math.min(100, petData.happiness + 12);
        petData.energy = Math.max(0, petData.energy - 8);
        petData.lastPlayTime = now;

        // 获得经验
        gainExperience(4);

        // 更新关注时间
        updateLastAttentionTime();

        // 尝试生成AI互动消息
        let message = `${petData.name} 玩得很开心！`;
        let messageSource = "default";

        if (aiInteractionsEnabled && petPersona) {
            try {
                const aiMessage = await generateAIInteractionMessage('play');
                if (aiMessage && aiMessage.length > 0) {
                    message = aiMessage;
                    messageSource = "AI";
                    console.log(`[${extensionName}] 使用AI玩耍回应: ${message}`);
                }
            } catch (error) {
                console.error(`[${extensionName}] AI玩耍回应生成失败:`, error);
            }
        }

        // 显示消息
        const title = messageSource === "AI" ? "玩耍回应 ✨" : "玩耍";
        toastr.success(message, title, {
            timeOut: messageSource === "AI" ? 6000 : 4000
        });

        savePetData();
        renderPetStatus();
    }
    
    /**
     * 让宠物休息
     */
    async function petSleep() {
        const now = Date.now();
        const timeSinceLastSleep = now - petData.lastSleepTime;

        if (timeSinceLastSleep < 80000) { // 80秒冷却
            toastr.warning("宠物还不困！");
            return;
        }

        petData.energy = Math.min(100, petData.energy + 20);
        petData.health = Math.min(100, petData.health + 5);
        petData.lastSleepTime = now;

        // 获得经验
        gainExperience(2);

        // 更新关注时间
        updateLastAttentionTime();

        // 尝试生成AI互动消息
        let message = `${petData.name} 睡得很香！`;
        let messageSource = "default";

        if (aiInteractionsEnabled && petPersona) {
            try {
                const aiMessage = await generateAIInteractionMessage('sleep');
                if (aiMessage && aiMessage.length > 0) {
                    message = aiMessage;
                    messageSource = "AI";
                    console.log(`[${extensionName}] 使用AI休息回应: ${message}`);
                }
            } catch (error) {
                console.error(`[${extensionName}] AI休息回应生成失败:`, error);
            }
        }

        // 显示消息
        const title = messageSource === "AI" ? "休息回应 ✨" : "休息";
        toastr.success(message, title, {
            timeOut: messageSource === "AI" ? 6000 : 4000
        });

        savePetData();
        renderPetStatus();
    }
    
    /**
     * 获得经验值
     */
    async function gainExperience(exp) {
        petData.experience += exp;
        const expNeeded = petData.level * 100;

        if (petData.experience >= expNeeded) {
            const oldLevel = petData.level;
            petData.level++;
            petData.experience -= expNeeded;
            petData.health = Math.min(100, petData.health + 30); // 升级恢复部分健康

            // 尝试生成AI升级消息
            let message = `🎉 ${petData.name} 升级了！现在是 ${petData.level} 级！`;
            let messageSource = "default";

            if (aiInteractionsEnabled && petPersona) {
                try {
                    const aiMessage = await generateAIInteractionMessage('levelup', {
                        oldLevel: oldLevel,
                        newLevel: petData.level
                    });
                    if (aiMessage && aiMessage.length > 0) {
                        message = `🎉 ${aiMessage}`;
                        messageSource = "AI";
                        console.log(`[${extensionName}] 使用AI升级庆祝: ${message}`);
                    }
                } catch (error) {
                    console.error(`[${extensionName}] AI升级庆祝生成失败:`, error);
                }
            }

            // 显示升级消息
            const title = messageSource === "AI" ? `升级到 ${petData.level} 级！✨` : "升级啦！";
            toastr.success(message, title, {
                timeOut: messageSource === "AI" ? 8000 : 5000
            });
        }
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

    /**
     * 更新最后关注时间
     */
    function updateLastAttentionTime() {
        lastAttentionTime = Date.now();
        localStorage.setItem(STORAGE_KEY_LAST_ATTENTION, lastAttentionTime);
        console.log(`[${extensionName}] 更新最后关注时间: ${new Date(lastAttentionTime).toLocaleTimeString()}`);
    }

    /**
     * 加载最后关注时间
     */
    function loadLastAttentionTime() {
        const saved = localStorage.getItem(STORAGE_KEY_LAST_ATTENTION);
        if (saved) {
            lastAttentionTime = parseInt(saved);
        } else {
            lastAttentionTime = Date.now();
            localStorage.setItem(STORAGE_KEY_LAST_ATTENTION, lastAttentionTime);
        }
        console.log(`[${extensionName}] 加载最后关注时间: ${new Date(lastAttentionTime).toLocaleTimeString()}`);
    }

    /**
     * 获取随机撒娇消息
     */
    function getRandomAttentionMessage() {
        const messages = attentionMessages[petData.type] || attentionMessages.cat;
        const randomIndex = Math.floor(Math.random() * messages.length);
        return messages[randomIndex];
    }

    /**
     * 加载宠物人设
     */
    function loadPetPersona() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_PET_PERSONA);
            if (saved) {
                petPersona = saved;
                console.log(`[${extensionName}] Pet persona loaded`);
            } else {
                // 使用默认人设模板
                const template = defaultPersonaTemplates[petData.type] || defaultPersonaTemplates.cat;
                petPersona = template.replace('{petName}', petData.name);
                savePetPersona();
            }
        } catch (error) {
            console.warn(`[${extensionName}] Failed to load pet persona:`, error);
            // 回退到默认模板
            const template = defaultPersonaTemplates[petData.type] || defaultPersonaTemplates.cat;
            petPersona = template.replace('{petName}', petData.name);
        }
    }

    /**
     * 保存宠物人设
     */
    function savePetPersona() {
        try {
            localStorage.setItem(STORAGE_KEY_PET_PERSONA, petPersona);
            console.log(`[${extensionName}] Pet persona saved`);
        } catch (error) {
            console.error(`[${extensionName}] Failed to save pet persona:`, error);
        }
    }

    /**
     * 更新人设中的宠物名字
     */
    function updatePersonaName(newName) {
        if (petPersona && petPersona.includes('{petName}')) {
            // 如果人设中还有模板标记，替换它
            petPersona = petPersona.replace('{petName}', newName);
            savePetPersona();

            // 更新设置界面中的人设文本
            if ($("#virtual-pet-persona-textarea").length > 0) {
                $("#virtual-pet-persona-textarea").val(petPersona);
            }

            console.log(`[${extensionName}] 人设中的宠物名字已更新为: ${newName}`);
        }
    }

    /**
     * 加载AI撒娇设置
     */
    function loadAIAttentionSettings() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_AI_ATTENTION);
            aiAttentionEnabled = saved !== "false"; // 默认启用
            console.log(`[${extensionName}] AI attention enabled: ${aiAttentionEnabled}`);
        } catch (error) {
            console.warn(`[${extensionName}] Failed to load AI attention settings:`, error);
            aiAttentionEnabled = false;
        }
    }

    /**
     * 保存AI撒娇设置
     */
    function saveAIAttentionSettings() {
        try {
            localStorage.setItem(STORAGE_KEY_AI_ATTENTION, aiAttentionEnabled);
            console.log(`[${extensionName}] AI attention settings saved: ${aiAttentionEnabled}`);
        } catch (error) {
            console.error(`[${extensionName}] Failed to save AI attention settings:`, error);
        }
    }

    /**
     * 加载AI互动设置
     */
    function loadAIInteractionSettings() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_AI_INTERACTIONS);
            aiInteractionsEnabled = saved !== "false"; // 默认启用
            console.log(`[${extensionName}] AI interactions enabled: ${aiInteractionsEnabled}`);
        } catch (error) {
            console.warn(`[${extensionName}] Failed to load AI interaction settings:`, error);
            aiInteractionsEnabled = false;
        }
    }

    /**
     * 保存AI互动设置
     */
    function saveAIInteractionSettings() {
        try {
            localStorage.setItem(STORAGE_KEY_AI_INTERACTIONS, aiInteractionsEnabled);
            console.log(`[${extensionName}] AI interaction settings saved: ${aiInteractionsEnabled}`);
        } catch (error) {
            console.error(`[${extensionName}] Failed to save AI interaction settings:`, error);
        }
    }

    /**
     * 获取随机撒娇动作
     */
    function getRandomAttentionAction() {
        const randomIndex = Math.floor(Math.random() * attentionActions.length);
        return attentionActions[randomIndex];
    }

    /**
     * 调用SillyTavern API生成AI撒娇消息
     */
    async function generateAIAttentionMessage() {
        if (!aiAttentionEnabled || !petPersona || isGeneratingAIAttention) {
            return null;
        }

        // 检查AI功能是否可用
        if (!checkAIAvailability()) {
            console.warn(`[${extensionName}] AI functionality not available for attention message`);
            // 只在第一次失败时显示提示，避免频繁弹窗
            if (!window.aiUnavailableWarningShown) {
                showAIUnavailableMessage("撒娇");
                window.aiUnavailableWarningShown = true;
                // 5分钟后重置警告状态
                setTimeout(() => {
                    window.aiUnavailableWarningShown = false;
                }, 300000);
            }
            return null;
        }

        isGeneratingAIAttention = true;

        try {
            console.log(`[${extensionName}] Generating AI attention message...`);

            // 构建提示词
            const prompt = `${petPersona}

现在你已经有一段时间没有得到主人的关注了，你想要撒娇求关注。请生成一句简短可爱的撒娇话语，要求：
1. 不超过30个字
2. 体现你的个性特点
3. 表达对主人的想念和渴望关注
4. 语气要可爱撒娇
5. 只返回撒娇的话语，不要其他内容

撒娇话语：`;

            // 尝试调用SillyTavern的API
            const response = await callSillyTavernAPI(prompt);

            if (response && response.trim()) {
                console.log(`[${extensionName}] AI attention message generated: ${response}`);
                return response.trim();
            } else {
                console.warn(`[${extensionName}] AI API returned empty response`);
                return null;
            }

        } catch (error) {
            console.error(`[${extensionName}] Error generating AI attention message:`, error);
            return null;
        } finally {
            isGeneratingAIAttention = false;
        }
    }

    /**
     * 调用SillyTavern API
     */
    async function callSillyTavernAPI(prompt) {
        console.log(`[${extensionName}] Attempting to call SillyTavern API...`);

        try {
            // 首先检查SillyTavern的全局对象和可用方法
            console.log(`[${extensionName}] Checking SillyTavern environment...`);
            console.log(`[${extensionName}] window.generateQuietPrompt:`, typeof window.generateQuietPrompt);
            console.log(`[${extensionName}] window.Generate:`, typeof window.Generate);
            console.log(`[${extensionName}] window.main_api:`, typeof window.main_api);
            console.log(`[${extensionName}] window.eventSource:`, typeof window.eventSource);

            // 方法1: 尝试使用generateQuietPrompt (SillyTavern的推荐方法)
            if (typeof window.generateQuietPrompt === 'function') {
                console.log(`[${extensionName}] Trying generateQuietPrompt...`);
                try {
                    // 使用简化的prompt以提高成功率
                    const simplePrompt = `请生成一句可爱的宠物话语（不超过20字）：`;
                    const response = await window.generateQuietPrompt(simplePrompt);

                    if (response && typeof response === 'string' && response.trim()) {
                        console.log(`[${extensionName}] generateQuietPrompt success: ${response.trim()}`);
                        return response.trim();
                    } else {
                        console.warn(`[${extensionName}] generateQuietPrompt returned empty or invalid response:`, response);
                    }
                } catch (error) {
                    console.warn(`[${extensionName}] generateQuietPrompt failed:`, error);
                }
            }

            // 方法1.5: 尝试直接使用SillyTavern的内部生成机制
            if (window.main_api && window.main_api.type) {
                console.log(`[${extensionName}] Detected API type: ${window.main_api.type}`);

                try {
                    // 根据API类型尝试不同的调用方式
                    if (window.main_api.type === 'openai' && window.Generate) {
                        console.log(`[${extensionName}] Trying OpenAI-style generation...`);

                        // 创建一个临时的消息来触发生成
                        const tempMessage = {
                            name: 'System',
                            is_user: false,
                            is_system: true,
                            mes: prompt
                        };

                        // 尝试使用SillyTavern的生成机制
                        const response = await window.Generate('quiet', '', false, false, prompt);
                        if (response && response.trim()) {
                            console.log(`[${extensionName}] OpenAI-style generation success`);
                            return response.trim();
                        }
                    }

                    // 尝试其他API类型
                    if (window.main_api.type === 'kobold' || window.main_api.type === 'novel') {
                        console.log(`[${extensionName}] Trying ${window.main_api.type} generation...`);

                        // 使用更简单的提示词
                        const simplePrompt = "说一句可爱的话：";
                        const response = await window.Generate('quiet', '', false, false, simplePrompt);
                        if (response && response.trim()) {
                            console.log(`[${extensionName}] ${window.main_api.type} generation success`);
                            return response.trim();
                        }
                    }
                } catch (error) {
                    console.warn(`[${extensionName}] API-specific generation failed:`, error);
                }
            }

            // 方法2: 尝试使用main_api对象
            if (window.main_api && typeof window.main_api === 'object') {
                console.log(`[${extensionName}] Trying main_api methods...`);

                // 检查main_api的可用方法
                console.log(`[${extensionName}] main_api methods:`, Object.keys(window.main_api));

                try {
                    // 尝试不同的main_api方法
                    const apiMethods = ['generate', 'sendMessage', 'chat', 'complete'];

                    for (const method of apiMethods) {
                        if (typeof window.main_api[method] === 'function') {
                            console.log(`[${extensionName}] Trying main_api.${method}...`);
                            try {
                                let response;

                                if (method === 'generate') {
                                    response = await window.main_api.generate(prompt, {
                                        max_tokens: 50,
                                        temperature: 0.8
                                    });
                                } else if (method === 'sendMessage') {
                                    response = await window.main_api.sendMessage(prompt);
                                } else if (method === 'chat') {
                                    response = await window.main_api.chat([{
                                        role: 'user',
                                        content: prompt
                                    }]);
                                } else if (method === 'complete') {
                                    response = await window.main_api.complete(prompt);
                                }

                                if (response) {
                                    // 处理不同格式的响应
                                    let text = '';
                                    if (typeof response === 'string') {
                                        text = response;
                                    } else if (response.text) {
                                        text = response.text;
                                    } else if (response.content) {
                                        text = response.content;
                                    } else if (response.message) {
                                        text = response.message;
                                    } else if (response.choices && response.choices[0]) {
                                        text = response.choices[0].text || response.choices[0].message?.content;
                                    }

                                    if (text && text.trim()) {
                                        console.log(`[${extensionName}] main_api.${method} success: ${text.trim()}`);
                                        return text.trim();
                                    }
                                }
                            } catch (error) {
                                console.warn(`[${extensionName}] main_api.${method} failed:`, error);
                            }
                        }
                    }
                } catch (error) {
                    console.warn(`[${extensionName}] main_api methods failed:`, error);
                }
            }

            // 方法3: 检查是否有chat相关的全局变量
            if (window.chat && Array.isArray(window.chat) && typeof window.Generate === 'function') {
                console.log(`[${extensionName}] Trying Generate function...`);
                try {
                    // 尝试使用Generate函数
                    const response = await window.Generate('', '', false, false, prompt);
                    if (response && typeof response === 'string' && response.trim()) {
                        console.log(`[${extensionName}] Generate function success`);
                        return response.trim();
                    }
                } catch (error) {
                    console.warn(`[${extensionName}] Generate function failed:`, error);
                }
            }

            // 方法4: 尝试使用事件系统
            if (window.eventSource && typeof window.eventSource.emit === 'function') {
                console.log(`[${extensionName}] Trying eventSource...`);
                try {
                    // 发送一个生成请求事件
                    window.eventSource.emit('generate_request', {
                        prompt: prompt,
                        max_length: 30
                    });

                    // 等待响应（这可能不会工作，但值得尝试）
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } catch (error) {
                    console.warn(`[${extensionName}] eventSource failed:`, error);
                }
            }

            // 如果所有方法都失败，尝试使用智能回退机制
            console.warn(`[${extensionName}] All API methods failed or unavailable. Trying fallback...`);

            // 尝试最后的回退方案：使用基于人设的智能预设回应
            if (petPersona && petPersona.length > 0) {
                console.log(`[${extensionName}] Using intelligent fallback based on persona...`);
                return generateIntelligentFallback(prompt);
            }

            console.warn(`[${extensionName}] Complete API failure. This might be because:`);
            console.warn(`[${extensionName}] 1. No AI model is configured in SillyTavern`);
            console.warn(`[${extensionName}] 2. The AI service is not running`);
            console.warn(`[${extensionName}] 3. There are permission issues with the API`);
            console.warn(`[${extensionName}] 4. The SillyTavern version doesn't support these API methods`);

            return null;

        } catch (error) {
            console.error(`[${extensionName}] API call failed:`, error);
            return null;
        }
    }

    /**
     * 智能回退机制 - 当API不可用时基于人设生成回应
     */
    function generateIntelligentFallback(prompt) {
        console.log(`[${extensionName}] Generating intelligent fallback response...`);

        try {
            // 分析人设中的关键词
            const persona = petPersona.toLowerCase();
            const petName = petData.name;
            const petType = petData.type;

            // 分析prompt中的互动类型
            let interactionType = 'attention';
            if (prompt.includes('喂食') || prompt.includes('feed')) {
                interactionType = 'feed';
            } else if (prompt.includes('玩耍') || prompt.includes('play')) {
                interactionType = 'play';
            } else if (prompt.includes('休息') || prompt.includes('sleep')) {
                interactionType = 'sleep';
            } else if (prompt.includes('升级') || prompt.includes('level')) {
                interactionType = 'levelup';
            } else if (prompt.includes('问候') || prompt.includes('greeting')) {
                interactionType = 'greeting';
            }

            // 根据人设特征和互动类型生成回应
            let responses = [];

            // 检查人设中的语言特色
            if (persona.includes('nya') || persona.includes('喵') || petType === 'cat') {
                responses = getCatResponses(interactionType, petName);
            } else if (persona.includes('汪') || persona.includes('woof') || petType === 'dog') {
                responses = getDogResponses(interactionType, petName);
            } else if (persona.includes('龙') || persona.includes('dragon') || petType === 'dragon') {
                responses = getDragonResponses(interactionType, petName);
            } else {
                responses = getGenericResponses(interactionType, petName);
            }

            let response = responses[Math.floor(Math.random() * responses.length)];

            // 根据人设中的性格特征调整语气
            if (persona.includes('害羞') || persona.includes('shy')) {
                response = response.replace('！', '...').replace('~', '...');
            } else if (persona.includes('活泼') || persona.includes('兴奋') || persona.includes('energetic')) {
                response = response + '！！';
            }

            console.log(`[${extensionName}] Intelligent fallback generated: ${response}`);
            return response;

        } catch (error) {
            console.error(`[${extensionName}] Error in intelligent fallback:`, error);
            return `${petData.name}想要主人的关注~`;
        }
    }

    /**
     * 获取猫咪类型的回应
     */
    function getCatResponses(type, name) {
        const responses = {
            attention: [
                `${name}想要主人的关注nya~`,
                `主人，${name}好想你呀喵~`,
                `${name}在这里等主人很久了nya！`,
                `主人大人，陪${name}玩一会儿嘛~`
            ],
            feed: [
                `谢谢主人的美食nya~`,
                `${name}最喜欢主人准备的食物了喵！`,
                `好香呀，${name}要开动了nya~`,
                `主人做的食物最好吃了喵~`
            ],
            play: [
                `和主人一起玩好开心nya~`,
                `${name}最喜欢和主人玩了喵！`,
                `再玩一会儿嘛nya~`,
                `主人陪${name}玩，${name}好幸福喵~`
            ],
            sleep: [
                `${name}要睡觉了nya~`,
                `谢谢主人让${name}休息喵~`,
                `${name}睡得好香nya...`,
                `主人晚安，${name}要做美梦了喵~`
            ],
            greeting: [
                `主人好呀nya~`,
                `${name}见到主人好开心喵！`,
                `主人来了nya！${name}等你很久了~`,
                `欢迎回来，主人大人喵~`
            ],
            levelup: [
                `${name}变强了nya！`,
                `谢谢主人，${name}升级了喵~`,
                `${name}现在更厉害了nya！`,
                `主人看，${name}成长了喵~`
            ]
        };
        return responses[type] || responses.attention;
    }

    /**
     * 获取狗狗类型的回应
     */
    function getDogResponses(type, name) {
        const responses = {
            attention: [
                `${name}好想主人汪！`,
                `主人回来了！${name}好开心汪~`,
                `${name}一直在等主人汪汪！`,
                `主人，和${name}一起玩吧汪~`
            ],
            feed: [
                `谢谢主人汪！好好吃~`,
                `${name}最爱主人准备的食物汪！`,
                `${name}要大口大口吃汪~`,
                `主人最好了汪汪！`
            ],
            play: [
                `和主人玩耍最开心了汪！`,
                `${name}好兴奋汪汪~`,
                `主人再陪${name}玩一会儿汪~`,
                `${name}最喜欢这个游戏汪！`
            ],
            sleep: [
                `${name}要乖乖睡觉汪~`,
                `谢谢主人，${name}好困汪...`,
                `${name}睡个好觉汪~`,
                `主人晚安汪，${name}要做好梦~`
            ],
            greeting: [
                `主人好汪！`,
                `${name}见到主人超开心汪汪！`,
                `主人回来了汪！${name}等你好久~`,
                `欢迎回家汪~`
            ],
            levelup: [
                `${name}变厉害了汪！`,
                `谢谢主人汪！${name}升级了~`,
                `${name}现在更强了汪汪！`,
                `主人看，${name}成长了汪~`
            ]
        };
        return responses[type] || responses.attention;
    }

    /**
     * 获取龙类型的回应
     */
    function getDragonResponses(type, name) {
        const responses = {
            attention: [
                `伟大的${name}需要您的关注！`,
                `${name}已经等待您很久了...`,
                `尊敬的主人，${name}想念您了`,
                `${name}的威严需要您的陪伴`
            ],
            feed: [
                `感谢您的供奉，${name}很满意`,
                `这份食物配得上${name}的身份`,
                `${name}接受您的敬意`,
                `您的用心${name}感受到了`
            ],
            play: [
                `${name}愿意与您共度时光`,
                `这个游戏还算有趣`,
                `${name}享受与您的互动`,
                `您的陪伴让${name}愉悦`
            ],
            sleep: [
                `${name}需要休息来恢复力量`,
                `伟大的${name}要进入梦境了`,
                `${name}将在睡梦中变得更强`,
                `感谢您让${name}安心休息`
            ],
            greeting: [
                `${name}向您致意`,
                `尊敬的主人，${name}恭候您的到来`,
                `${name}很高兴见到您`,
                `您的到来让${name}感到荣幸`
            ],
            levelup: [
                `${name}的力量得到了提升！`,
                `${name}已经进化到新的境界`,
                `伟大的${name}变得更加强大`,
                `${name}感谢您的培养`
            ]
        };
        return responses[type] || responses.attention;
    }

    /**
     * 获取通用类型的回应
     */
    function getGenericResponses(type, name) {
        const responses = {
            attention: [
                `${name}想要主人的关注~`,
                `主人，${name}好想你呀~`,
                `${name}在这里等主人很久了！`,
                `主人，陪${name}玩一会儿嘛~`
            ],
            feed: [
                `谢谢主人的食物~`,
                `${name}最喜欢主人准备的美食了！`,
                `好香呀，${name}要开动了~`,
                `主人做的最好吃了~`
            ],
            play: [
                `和主人一起玩好开心~`,
                `${name}最喜欢和主人玩了！`,
                `再玩一会儿嘛~`,
                `主人陪${name}玩，${name}好幸福~`
            ],
            sleep: [
                `${name}要睡觉了~`,
                `谢谢主人让${name}休息~`,
                `${name}睡得好香...`,
                `主人晚安，${name}要做美梦了~`
            ],
            greeting: [
                `主人好呀~`,
                `${name}见到主人好开心！`,
                `主人来了！${name}等你很久了~`,
                `欢迎回来，主人~`
            ],
            levelup: [
                `${name}变强了！`,
                `谢谢主人，${name}升级了~`,
                `${name}现在更厉害了！`,
                `主人看，${name}成长了~`
            ]
        };
        return responses[type] || responses.attention;
    }

    /**
     * 调用OpenAI API
     */
    async function callOpenAIAPI(prompt) {
        console.log(`[${extensionName}] Calling OpenAI API`);
        try {
            // 使用SillyTavern的OpenAI设置
            const response = await fetch('/api/openai/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: prompt }
                    ],
                    max_tokens: 50,
                    temperature: 0.8
                })
            });

            if (response.ok) {
                const data = await response.json();
                return data.choices?.[0]?.message?.content?.trim() || null;
            }
        } catch (error) {
            console.warn(`[${extensionName}] OpenAI API failed:`, error);
        }
        return null;
    }

    /**
     * 调用Kobold API
     */
    async function callKoboldAPI(prompt) {
        console.log(`[${extensionName}] Calling Kobold API`);
        try {
            const response = await fetch('/api/kobold/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt: prompt,
                    max_length: 50,
                    temperature: 0.8
                })
            });

            if (response.ok) {
                const data = await response.json();
                return data.results?.[0]?.text?.trim() || null;
            }
        } catch (error) {
            console.warn(`[${extensionName}] Kobold API failed:`, error);
        }
        return null;
    }

    /**
     * 调用NovelAI API
     */
    async function callNovelAIAPI(prompt) {
        console.log(`[${extensionName}] Calling NovelAI API`);
        try {
            const response = await fetch('/api/novelai/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    input: prompt,
                    parameters: {
                        max_length: 50,
                        temperature: 0.8
                    }
                })
            });

            if (response.ok) {
                const data = await response.json();
                return data.output?.trim() || null;
            }
        } catch (error) {
            console.warn(`[${extensionName}] NovelAI API failed:`, error);
        }
        return null;
    }

    /**
     * 调用TextGen WebUI API
     */
    async function callTextGenAPI(prompt) {
        console.log(`[${extensionName}] Calling TextGen WebUI API`);
        try {
            const response = await fetch('/api/textgenerationwebui/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt: prompt,
                    max_new_tokens: 50,
                    temperature: 0.8,
                    do_sample: true
                })
            });

            if (response.ok) {
                const data = await response.json();
                return data.results?.[0]?.text?.trim() || null;
            }
        } catch (error) {
            console.warn(`[${extensionName}] TextGen WebUI API failed:`, error);
        }
        return null;
    }

    /**
     * 检查AI功能是否可用
     */
    function checkAIAvailability() {
        const checks = {
            generateQuietPrompt: typeof window.generateQuietPrompt === 'function',
            Generate: typeof window.Generate === 'function',
            main_api: !!window.main_api,
            chat: window.chat && Array.isArray(window.chat)
        };

        console.log(`[${extensionName}] AI availability check:`, checks);

        return Object.values(checks).some(available => available);
    }

    /**
     * 显示AI不可用的提示
     */
    function showAIUnavailableMessage(interactionType) {
        const message = `AI功能暂时不可用，已启用智能回退模式。

🔧 如需完整AI功能，请确保：
1. SillyTavern已正确配置AI模型
2. AI服务正在运行
3. 网络连接正常

💡 当前使用基于人设的智能${interactionType}回应。`;

        if (typeof toastr !== 'undefined') {
            toastr.info(message, "AI智能回退模式", {
                timeOut: 10000,
                extendedTimeOut: 4000
            });
        }

        console.info(`[${extensionName}] ${message}`);
    }

    /**
     * 生成AI互动消息
     */
    async function generateAIInteractionMessage(interactionType, context = {}) {
        if (!aiInteractionsEnabled || !petPersona || isGeneratingAIInteraction) {
            return null;
        }

        // 检查AI功能是否可用
        if (!checkAIAvailability()) {
            console.warn(`[${extensionName}] AI functionality not available for ${interactionType}`);
            // 只在第一次失败时显示提示，避免频繁弹窗
            if (!window.aiUnavailableWarningShown) {
                showAIUnavailableMessage(interactionType);
                window.aiUnavailableWarningShown = true;
                // 5分钟后重置警告状态
                setTimeout(() => {
                    window.aiUnavailableWarningShown = false;
                }, 300000);
            }
            return null;
        }

        isGeneratingAIInteraction = true;

        try {
            console.log(`[${extensionName}] Generating AI interaction message for: ${interactionType}`);

            // 根据互动类型构建不同的提示词
            const prompt = buildInteractionPrompt(interactionType, context);

            // 调用API
            const response = await callSillyTavernAPI(prompt);

            if (response && response.trim()) {
                console.log(`[${extensionName}] AI interaction message generated: ${response}`);
                return response.trim();
            } else {
                console.warn(`[${extensionName}] AI API returned empty response for ${interactionType}`);
                return null;
            }

        } catch (error) {
            console.error(`[${extensionName}] Error generating AI interaction message:`, error);
            return null;
        } finally {
            isGeneratingAIInteraction = false;
        }
    }

    /**
     * 构建不同互动类型的提示词
     */
    function buildInteractionPrompt(interactionType, context) {
        const basePersona = petPersona;

        const interactionPrompts = {
            feed: `${basePersona}

现在主人给你喂食了！你感到很开心和满足。请生成一句表达感谢和开心的话语，要求：
1. 不超过25个字
2. 体现你对食物的喜爱和对主人的感谢
3. 符合你的性格特点
4. 语气要开心满足
5. 只返回话语内容，不要其他内容

回应：`,

            play: `${basePersona}

现在主人和你一起玩耍！你感到非常兴奋和快乐。请生成一句表达兴奋和快乐的话语，要求：
1. 不超过25个字
2. 体现你对玩耍的喜爱和兴奋
3. 符合你的性格特点
4. 语气要活泼兴奋
5. 只返回话语内容，不要其他内容

回应：`,

            sleep: `${basePersona}

现在主人让你休息睡觉！你感到很舒适和安心。请生成一句表达舒适和感谢的话语，要求：
1. 不超过25个字
2. 体现你的舒适和对主人关心的感谢
3. 符合你的性格特点
4. 语气要温柔舒适
5. 只返回话语内容，不要其他内容

回应：`,

            levelup: `${basePersona}

你刚刚升级了！现在是${context.newLevel || petData.level}级！你感到非常兴奋和自豪。请生成一句表达兴奋和成就感的话语，要求：
1. 不超过30个字
2. 体现你的兴奋和对成长的喜悦
3. 感谢主人的陪伴和照顾
4. 符合你的性格特点
5. 只返回话语内容，不要其他内容

回应：`,

            greeting: `${basePersona}

主人刚刚打开了你的界面来看你！你感到很开心被关注。请生成一句问候和表达开心的话语，要求：
1. 不超过25个字
2. 体现你见到主人的开心
3. 符合你的性格特点
4. 语气要亲切开心
5. 只返回话语内容，不要其他内容

回应：`
        };

        return interactionPrompts[interactionType] || interactionPrompts.greeting;
    }

    /**
     * 显示撒娇卖萌提示
     */
    async function showAttentionSeeker() {
        if (isShowingAttentionSeeker) return; // 防止重复显示

        isShowingAttentionSeeker = true;
        let message = "";
        let messageSource = "default";

        // 尝试生成AI撒娇消息
        if (aiAttentionEnabled && petPersona) {
            console.log(`[${extensionName}] 尝试生成AI撒娇消息...`);
            try {
                const aiMessage = await generateAIAttentionMessage();
                if (aiMessage && aiMessage.length > 0) {
                    message = aiMessage;
                    messageSource = "AI";
                    console.log(`[${extensionName}] 使用AI生成的撒娇消息: ${message}`);
                } else {
                    console.log(`[${extensionName}] AI生成失败，使用默认消息`);
                    message = getRandomAttentionMessage();
                }
            } catch (error) {
                console.error(`[${extensionName}] AI撒娇生成错误:`, error);
                message = getRandomAttentionMessage();
            }
        } else {
            message = getRandomAttentionMessage();
        }

        const action = getRandomAttentionAction();

        console.log(`[${extensionName}] 宠物开始撒娇 (${messageSource}): ${message}`);

        // 显示撒娇消息
        if (typeof toastr !== 'undefined') {
            const title = messageSource === "AI" ?
                `${petData.name} 正在${action} ✨` :
                `${petData.name} 正在${action}`;

            toastr.info(message, title, {
                timeOut: 8000, // AI消息显示时间稍长
                extendedTimeOut: 3000,
                onclick: function() {
                    // 点击通知时打开宠物界面
                    updateLastAttentionTime();
                    showPopup();
                }
            });
        }

        // 让按钮产生撒娇动画效果
        animateAttentionSeeker();

        // 3分钟后重置状态
        setTimeout(() => {
            isShowingAttentionSeeker = false;
        }, 180000);
    }

    /**
     * 按钮撒娇动画效果
     */
    function animateAttentionSeeker() {
        const button = $(`#${BUTTON_ID}`);
        if (button.length === 0) return;

        // 添加撒娇动画类
        button.addClass('attention-seeking');

        // 创建动画效果
        let animationCount = 0;
        const maxAnimations = 6; // 动画次数

        const animationInterval = setInterval(() => {
            if (animationCount >= maxAnimations) {
                clearInterval(animationInterval);
                button.removeClass('attention-seeking');
                return;
            }

            // 随机选择动画效果
            const animations = ['bounce', 'shake', 'pulse', 'swing'];
            const randomAnimation = animations[Math.floor(Math.random() * animations.length)];

            button.removeClass('bounce shake pulse swing')
                  .addClass(randomAnimation);

            setTimeout(() => {
                button.removeClass(randomAnimation);
            }, 800);

            animationCount++;
        }, 1200);

        // 改变按钮颜色表示需要关注
        button.css({
            'box-shadow': '0 0 20px rgba(255, 158, 199, 0.8), 0 4px 8px rgba(0,0,0,0.3)',
            'animation': 'attention-glow 2s ease-in-out infinite'
        });

        // 10秒后恢复正常样式
        setTimeout(() => {
            button.css({
                'box-shadow': '0 4px 8px rgba(0,0,0,0.3), inset 0 2px 2px rgba(255,255,255,0.05), 0 0 0 1px rgba(0,0,0,0.5)',
                'animation': 'none'
            });
        }, 10000);
    }

    /**
     * 检查是否需要撒娇
     */
    function checkAttentionNeeded() {
        const now = Date.now();
        const timeSinceLastAttention = now - lastAttentionTime;

        // 配置：多长时间没关注就开始撒娇（默认15分钟）
        const attentionThreshold = 15 * 60 * 1000; // 15分钟

        // 如果超过阈值且当前没有在撒娇，就开始撒娇
        if (timeSinceLastAttention > attentionThreshold && !isShowingAttentionSeeker) {
            console.log(`[${extensionName}] 宠物需要关注了，距离上次关注: ${Math.floor(timeSinceLastAttention / 60000)} 分钟`);
            showAttentionSeeker();
        }
    }

    /**
     * 启动撒娇检查定时器
     */
    function startAttentionTimer() {
        // 清除现有定时器
        if (attentionTimer) {
            clearInterval(attentionTimer);
        }

        // 每2分钟检查一次是否需要撒娇
        attentionTimer = setInterval(checkAttentionNeeded, 2 * 60 * 1000);
        console.log(`[${extensionName}] 撒娇检查定时器已启动`);
    }

    /**
     * 停止撒娇检查定时器
     */
    function stopAttentionTimer() {
        if (attentionTimer) {
            clearInterval(attentionTimer);
            attentionTimer = null;
            console.log(`[${extensionName}] 撒娇检查定时器已停止`);
        }
    }
    
    // ----------------------------------------------------------------- 
    // 3. 弹窗和视图管理
    // -----------------------------------------------------------------
    
    /**
     * 打开弹窗并显示主视图
     */
    async function showPopup() {
        console.log(`[${extensionName}] Attempting to show popup`);

        // 更新关注时间 - 用户打开弹窗表示关注宠物
        updateLastAttentionTime();

        // 尝试生成AI问候消息
        if (aiInteractionsEnabled && petPersona) {
            try {
                const aiMessage = await generateAIInteractionMessage('greeting');
                if (aiMessage && aiMessage.length > 0) {
                    console.log(`[${extensionName}] AI问候: ${aiMessage}`);
                    // 延迟显示问候，让弹窗先打开
                    setTimeout(() => {
                        if (typeof toastr !== 'undefined') {
                            toastr.info(aiMessage, `${petData.name} 的问候 ✨`, {
                                timeOut: 5000,
                                extendedTimeOut: 2000
                            });
                        }
                    }, 800);
                }
            } catch (error) {
                console.error(`[${extensionName}] AI问候生成失败:`, error);
            }
        }

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
                z-index: 999999 !important;
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
                    border-radius: ${borderRadius} !important;
                    padding: ${containerPadding} !important;
                    overflow-y: auto !important;
                    -webkit-overflow-scrolling: touch !important;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.5) !important;
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

            // 更新人设中的宠物名字
            updatePersonaName(trimmedName);

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
                <!-- 圆形头像框 -->
                <div class="pet-avatar-circle" style="
                    width: 80px !important;
                    height: 80px !important;
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
                    transition: transform 0.2s ease !important;
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
                    ">Lv.${petData.level}</div>
                </div>
            </div>
            <div class="pet-stats">
                <div class="stat-bar">
                    <label>健康</label>
                    <div class="progress-bar">
                        <div class="progress-fill health" style="width: ${petData.health}%"></div>
                    </div>
                    <span>${Math.round(petData.health)}/100</span>
                </div>
                <div class="stat-bar">
                    <label>快乐</label>
                    <div class="progress-bar">
                        <div class="progress-fill happiness" style="width: ${petData.happiness}%"></div>
                    </div>
                    <span>${Math.round(petData.happiness)}/100</span>
                </div>
                <div class="stat-bar">
                    <label>饥饿</label>
                    <div class="progress-bar">
                        <div class="progress-fill hunger" style="width: ${petData.hunger}%"></div>
                    </div>
                    <span>${Math.round(petData.hunger)}/100</span>
                </div>
                <div class="stat-bar">
                    <label>精力</label>
                    <div class="progress-bar">
                        <div class="progress-fill energy" style="width: ${petData.energy}%"></div>
                    </div>
                    <span>${Math.round(petData.energy)}/100</span>
                </div>
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
     * 加载自定义头像数据
     */
    function loadCustomAvatar() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY_CUSTOM_AVATAR);
            if (saved) {
                customAvatarData = saved;
                console.log(`[${extensionName}] Custom avatar loaded`);
            }
        } catch (error) {
            console.warn(`[${extensionName}] Failed to load custom avatar:`, error);
        }
    }

    /**
     * 保存自定义头像数据
     */
    function saveCustomAvatar(imageData) {
        try {
            localStorage.setItem(STORAGE_KEY_CUSTOM_AVATAR, imageData);
            customAvatarData = imageData;
            console.log(`[${extensionName}] Custom avatar saved`);
            return true;
        } catch (error) {
            console.error(`[${extensionName}] Failed to save custom avatar:`, error);
            return false;
        }
    }

    /**
     * 清除自定义头像
     */
    function clearCustomAvatar() {
        try {
            localStorage.removeItem(STORAGE_KEY_CUSTOM_AVATAR);
            customAvatarData = null;
            console.log(`[${extensionName}] Custom avatar cleared`);
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
     * 初始化设置界面
     */
    function initializeSettingsUI() {
        console.log(`[${extensionName}] Initializing settings UI...`);

        // 设置AI功能开关的初始状态（合并后的开关）
        const aiEnabled = aiAttentionEnabled && aiInteractionsEnabled;
        $("#virtual-pet-ai-features-toggle").prop("checked", aiEnabled);

        // 设置人设文本框的初始内容
        $("#virtual-pet-persona-textarea").val(petPersona);

        // 绑定合并后的AI功能开关事件
        $("#virtual-pet-ai-features-toggle").off("change").on("change", function() {
            const enabled = $(this).is(":checked");

            // 同时控制撒娇和互动功能
            aiAttentionEnabled = enabled;
            aiInteractionsEnabled = enabled;

            saveAIAttentionSettings();
            saveAIInteractionSettings();

            console.log(`[${extensionName}] AI功能: ${enabled ? '启用' : '禁用'} (包括撒娇和互动)`);

            if (enabled && !petPersona) {
                loadPetPersona();
            }
        });

        // 绑定人设保存按钮事件
        $("#virtual-pet-save-persona-btn").off("click").on("click", function() {
            const newPersona = $("#virtual-pet-persona-textarea").val().trim();

            if (newPersona.length === 0) {
                toastr.warning("人设内容不能为空！");
                return;
            }

            if (newPersona.length > 2000) {
                toastr.warning("人设内容过长，建议控制在2000字符以内！");
                return;
            }

            petPersona = newPersona;
            savePetPersona();
            toastr.success("宠物人设已保存！");
            console.log(`[${extensionName}] 人设已保存 (${newPersona.length} 字符)`);
        });

        // 绑定人设重置按钮事件
        $("#virtual-pet-reset-persona-btn").off("click").on("click", function() {
            if (confirm("确定要重置为默认人设吗？\n当前的自定义人设将会丢失。")) {
                const template = defaultPersonaTemplates[petData.type] || defaultPersonaTemplates.cat;
                const newPersona = template.replace('{petName}', petData.name);

                petPersona = newPersona;
                savePetPersona();
                $("#virtual-pet-persona-textarea").val(petPersona);

                toastr.success("已重置为默认人设！");
                console.log(`[${extensionName}] 人设已重置为默认`);
            }
        });

        // 绑定测试按钮事件
        $("#virtual-pet-test-ai-attention-btn").off("click").on("click", async function() {
            const btn = $(this);
            btn.prop("disabled", true).text("🔄 测试中...");

            try {
                const result = await window.testAIAttention();
                if (result) {
                    toastr.success("AI撒娇测试成功！");
                } else {
                    toastr.error("AI撒娇测试失败，请检查控制台日志。");
                }
            } catch (error) {
                console.error("AI撒娇测试错误:", error);
                toastr.error("AI撒娇测试出错！");
            } finally {
                btn.prop("disabled", false).text("🧪 测试AI撒娇");
            }
        });

        $("#virtual-pet-test-ai-interaction-btn").off("click").on("click", async function() {
            const btn = $(this);
            btn.prop("disabled", true).text("🔄 测试中...");

            try {
                const result = await window.testAIInteraction('greeting');
                if (result) {
                    toastr.success("AI互动测试成功！");
                } else {
                    toastr.error("AI互动测试失败，请检查控制台日志。");
                }
            } catch (error) {
                console.error("AI互动测试错误:", error);
                toastr.error("AI互动测试出错！");
            } finally {
                btn.prop("disabled", false).text("🎮 测试AI互动");
            }
        });

        console.log(`[${extensionName}] Settings UI initialized successfully`);
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

            // 如果用户使用的是默认人设，更新为新类型的默认人设
            const currentPersona = $("#virtual-pet-persona-textarea").val();
            const isDefaultPersona = !currentPersona || Object.values(defaultPersonaTemplates).some(template =>
                currentPersona.includes(template.substring(0, 50))
            );

            if (isDefaultPersona) {
                const template = defaultPersonaTemplates[newType] || defaultPersonaTemplates.cat;
                const newPersona = template.replace('{petName}', petData.name);
                petPersona = newPersona;
                savePetPersona();
                $("#virtual-pet-persona-textarea").val(petPersona);
                console.log(`[${extensionName}] 已更新为 ${newType} 类型的默认人设`);
            }
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

        // 重置为初始状态
        petData = {
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
            created: Date.now(),
            lastUpdateTime: Date.now(),
            dataVersion: 2.0 // 数据版本标记
        };

        savePetData();
        renderSettings();
        toastr.success("宠物已重置！");
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
            <div id="${BUTTON_ID}" title="虚拟宠物" style="
                position: fixed !important;
                z-index: 2147483647 !important;
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
            'z-index': '2147483647',
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
                        'z-index': '2147483647'
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
     * 完全卸载插件 - 清理所有数据和DOM元素
     */
    function uninstallExtension() {
        console.log(`[${extensionName}] Starting complete uninstall...`);

        try {
            // 1. 移除所有DOM元素
            console.log(`[${extensionName}] Removing DOM elements...`);
            $(`#${BUTTON_ID}`).remove();
            $(`#${OVERLAY_ID}`).remove();
            $(".virtual-pet-popup-overlay").remove();
            $("[id*='virtual-pet-popup']").remove();
            $("[class*='virtual-pet-popup']").remove();
            $("[id*='pet-popup']").remove();
            $("[class*='pet-popup']").remove();
            $("#virtual-pet-settings").remove();
            $(".pet-notification").remove();
            $("#test-popup-button").remove();
            $("#ios-test-button").remove();

            // 2. 清理localStorage数据
            console.log(`[${extensionName}] Clearing localStorage data...`);
            localStorage.removeItem(STORAGE_KEY_BUTTON_POS);
            localStorage.removeItem(STORAGE_KEY_ENABLED);
            localStorage.removeItem(STORAGE_KEY_PET_DATA);
            localStorage.removeItem(STORAGE_KEY_CUSTOM_AVATAR);
            localStorage.removeItem(STORAGE_KEY_LAST_ATTENTION);
            localStorage.removeItem(STORAGE_KEY_PET_PERSONA);
            localStorage.removeItem(STORAGE_KEY_AI_ATTENTION);
            localStorage.removeItem(STORAGE_KEY_AI_INTERACTIONS);
            localStorage.removeItem(`${extensionName}-notifications`);
            localStorage.removeItem(`${extensionName}-last-notification`);
            localStorage.removeItem(`${extensionName}-auto-save`);

            // 3. 解绑所有事件监听器
            console.log(`[${extensionName}] Unbinding event listeners...`);
            $(document).off('.petdragtemp');
            $(document).off("change", TOGGLE_ID);
            $(document).off("visibilitychange");

            // 4. 清理定时器
            console.log(`[${extensionName}] Clearing intervals...`);
            stopAttentionTimer(); // 停止撒娇检查定时器
            // 注意：其他定时器需要保存interval ID才能清理，当前代码没有保存
            // 建议在后续版本中改进

            // 5. 移除动态添加的CSS
            console.log(`[${extensionName}] Removing CSS...`);
            $(`link[href*="${extensionFolderPath}/style.css"]`).remove();

            // 6. 清理全局变量
            console.log(`[${extensionName}] Clearing global variables...`);
            if (window.testVirtualPet) delete window.testVirtualPet;
            if (window.forceShowPetButton) delete window.forceShowPetButton;
            if (window.openAvatarSelector) delete window.openAvatarSelector;
            if (window.resetAvatar) delete window.resetAvatar;
            if (window.editPetName) delete window.editPetName;
            if (window.showAvatarContextMenu) delete window.showAvatarContextMenu;
            if (window.clearAllPopups) delete window.clearAllPopups;
            if (window.forceCloseAllPopups) delete window.forceCloseAllPopups;
            if (window.createTestPopupButton) delete window.createTestPopupButton;
            if (window.showIOSPopup) delete window.showIOSPopup;
            if (window.createIOSTestButton) delete window.createIOSTestButton;
            if (window.forceDataMigration) delete window.forceDataMigration;

            console.log(`[${extensionName}] ✅ Complete uninstall finished successfully!`);

            // 显示成功消息
            if (typeof toastr !== 'undefined') {
                toastr.success("虚拟宠物系统已完全卸载！所有数据已清理。");
            } else {
                alert("虚拟宠物系统已完全卸载！所有数据已清理。");
            }

            return true;
        } catch (error) {
            console.error(`[${extensionName}] Error during uninstall:`, error);
            if (typeof toastr !== 'undefined') {
                toastr.error("卸载过程中出现错误，请手动清理残留数据。");
            }
            return false;
        }
    }

    /**
     * 检查是否存在残留数据
     */
    function checkForLeftoverData() {
        console.log(`[${extensionName}] Checking for leftover data...`);

        const leftoverItems = [];

        // 检查localStorage
        const storageKeys = [
            STORAGE_KEY_BUTTON_POS,
            STORAGE_KEY_ENABLED,
            STORAGE_KEY_PET_DATA,
            STORAGE_KEY_CUSTOM_AVATAR,
            `${extensionName}-notifications`,
            `${extensionName}-last-notification`,
            `${extensionName}-auto-save`
        ];

        storageKeys.forEach(key => {
            if (localStorage.getItem(key) !== null) {
                leftoverItems.push(`localStorage: ${key}`);
            }
        });

        // 检查DOM元素
        const domSelectors = [
            `#${BUTTON_ID}`,
            `#${OVERLAY_ID}`,
            ".virtual-pet-popup-overlay",
            "#virtual-pet-settings",
            ".pet-notification"
        ];

        domSelectors.forEach(selector => {
            if ($(selector).length > 0) {
                leftoverItems.push(`DOM: ${selector}`);
            }
        });

        if (leftoverItems.length > 0) {
            console.warn(`[${extensionName}] Found leftover data:`, leftoverItems);
            return leftoverItems;
        } else {
            console.log(`[${extensionName}] No leftover data found.`);
            return [];
        }
    }

    // -----------------------------------------------------------------
    // 6. 初始化流程
    // -----------------------------------------------------------------

    async function initializeExtension() {
        console.log(`[${extensionName}] Initializing extension...`);

        // 1. 动态加载CSS
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
                        <!-- 基础设置 -->
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

                        <!-- AI功能设置 -->
                        <h4 style="margin: 10px 0 5px 0; color: #fff;">🤖 AI智能功能</h4>

                        <div class="flex-container">
                            <label class="checkbox_label" for="virtual-pet-ai-features-toggle">
                                <input id="virtual-pet-ai-features-toggle" type="checkbox" checked>
                                <span>启用AI功能</span>
                            </label>
                        </div>
                        <small class="notes">
                            启用后宠物会使用AI生成个性化的撒娇消息和互动回应
                        </small>

                        <hr style="margin: 15px 0; border: none; border-top: 1px solid #444;">

                        <!-- 人设设置 -->
                        <h4 style="margin: 10px 0 5px 0; color: #fff;">🎭 宠物人设</h4>

                        <div style="margin: 10px 0;">
                            <label for="virtual-pet-persona-textarea" style="display: block; margin-bottom: 5px; color: #fff;">
                                自定义宠物人设：
                            </label>
                            <textarea
                                id="virtual-pet-persona-textarea"
                                placeholder="在这里输入您的宠物人设描述..."
                                style="width: 100%; height: 120px; background: #2a2a2a; color: #fff; border: 1px solid #555; border-radius: 4px; padding: 8px; resize: vertical; font-family: inherit; font-size: 12px;"
                            ></textarea>
                            <small class="notes">
                                描述宠物的性格、说话风格、行为特点等。留空将使用默认人设。
                            </small>
                        </div>

                        <div style="margin: 10px 0; display: flex; gap: 10px; flex-wrap: wrap;">
                            <button id="virtual-pet-save-persona-btn" class="menu_button" style="flex: 1; min-width: 100px;">
                                💾 保存人设
                            </button>
                            <button id="virtual-pet-reset-persona-btn" class="menu_button" style="flex: 1; min-width: 100px;">
                                🔄 重置默认
                            </button>
                        </div>

                        <div style="margin: 10px 0; display: flex; gap: 10px; flex-wrap: wrap;">
                            <button id="virtual-pet-test-ai-attention-btn" class="menu_button" style="flex: 1; min-width: 100px;">
                                🧪 测试AI撒娇
                            </button>
                            <button id="virtual-pet-test-ai-interaction-btn" class="menu_button" style="flex: 1; min-width: 100px;">
                                🎮 测试AI互动
                            </button>
                        </div>

                        <small class="notes">
                            💡 提示：设置人设后建议先测试效果。需要SillyTavern已配置AI模型。
                        </small>
                    </div>
                </div>
            </div>
        `;
        $("#extensions_settings2").append(simpleSettingsHtml);
        console.log(`[${extensionName}] Settings panel created`);

        // 初始化设置界面
        setTimeout(() => {
            initializeSettingsUI();
        }, 100);

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
                        <div class="pet-popup-header">
                            <div class="pet-popup-title">🐾</div>
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

        // 5. 加载自定义头像数据
        loadCustomAvatar();

        // 6. 加载撒娇系统数据
        loadLastAttentionTime();
        loadPetPersona();
        loadAIAttentionSettings();
        loadAIInteractionSettings();

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

                // 启动撒娇检查定时器
                startAttentionTimer();
            }

            // 绑定开关事件
            $(document).off("change", TOGGLE_ID).on("change", TOGGLE_ID, function () {
                const checked = $(this).is(":checked");
                console.log(`[${extensionName}] Toggle changed: ${checked}`);
                localStorage.setItem(STORAGE_KEY_ENABLED, checked);
                if (checked) {
                    initializeFloatingButton();
                    startAttentionTimer(); // 启动撒娇定时器
                } else {
                    destroyFloatingButton();
                    stopAttentionTimer(); // 停止撒娇定时器
                    // 当插件被禁用时，清理更多数据
                    closePopup(); // 关闭可能打开的弹窗
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
            <div id="${BUTTON_ID}" title="虚拟宠物" style="
                position: fixed !important;
                z-index: 2147483647 !important;
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
                'z-index': '2147483647 !important',
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
                element.style.setProperty('z-index', '2147483647', 'important');

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

        console.log(`喂食按钮: ${feedBtn.length > 0 ? '✅ 存在' : '❌ 不存在'}`);
        console.log(`玩耍按钮: ${playBtn.length > 0 ? '✅ 存在' : '❌ 不存在'}`);
        console.log(`睡觉按钮: ${sleepBtn.length > 0 ? '✅ 存在' : '❌ 不存在'}`);

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
            dataVersion: 2.0
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

    // 重置为新的初始数值进行测试
    window.resetToNewInitialValues = function() {
        console.log("🔄 重置为新的初始数值...");

        petData.health = 40;
        petData.happiness = 30;
        petData.hunger = 50;
        petData.energy = 60;
        petData.level = 1;
        petData.experience = 0;

        savePetData();
        updateUnifiedUIStatus();

        console.log("✅ 已重置为新的初始数值:");
        console.log(`健康: ${petData.health}/100`);
        console.log(`快乐度: ${petData.happiness}/100`);
        console.log(`饱食度: ${petData.hunger}/100`);
        console.log(`精力: ${petData.energy}/100`);
        console.log("现在可以测试新的数值平衡了！");
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

        const happinessDisplay = $('.status-item').find('span').filter(function() {
            return $(this).text().includes('快乐');
        }).next().text();

        console.log(`UI健康显示: ${healthDisplay}`);
        console.log(`UI快乐显示: ${happinessDisplay}`);

        // 检查是否需要迁移
        const needsMigration = petData.health === 100 || petData.happiness === 100;

        if (needsMigration) {
            console.log("\n⚠️ 检测到旧数值，建议执行数据迁移:");
            console.log("请运行: forceDataMigration()");
            return false;
        } else {
            console.log("\n✅ 数值修复成功！新的初始数值已正确应用。");
            return true;
        }
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
                z-index: 999999;
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
                z-index: 999999 !important;
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
            <div class="pet-popup-header" style="
                display: flex !important;
                justify-content: center !important;
                align-items: center !important;
                margin-bottom: 15px !important;
                padding-bottom: 12px !important;
                border-bottom: 1px solid #40444b !important;
            ">
                <h2 style="margin: 0 !important; color: #7289da !important; font-size: 1.2em !important;">🐾</h2>
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
                    <!-- 圆形头像框 -->
                    <div class="pet-avatar-circle" style="
                        width: 70px !important;
                        height: 70px !important;
                        border-radius: 50% !important;
                        background: ${candyColors.primary} !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        font-size: 2.5em !important;
                        overflow: hidden !important;
                        border: 2px solid #7289da !important;
                        box-shadow: 0 3px 6px rgba(0,0,0,0.3) !important;
                        cursor: pointer !important;
                        margin: 0 auto 8px auto !important;
                    " onclick="openAvatarSelector()" oncontextmenu="showAvatarContextMenu(event)" title="点击更换头像，右键重置">
                        ${getAvatarContent()}
                    </div>
                    <div class="pet-name" style="font-size: 1.2em !important; font-weight: bold !important; margin-bottom: 3px !important;">小宠物</div>
                    <div class="pet-level" style="color: #7289da !important; font-size: 0.9em !important;">Lv.1</div>
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
                                <span style="color: ${candyColors.warning} !important; font-size: 0.8em !important;">${Math.round(petData.hunger)}/100</span>
                            </div>
                            <div style="background: ${candyColors.border} !important; height: 5px !important; border-radius: 3px !important; overflow: hidden !important;">
                                <div style="background: ${candyColors.warning} !important; height: 100% !important; width: ${petData.hunger}% !important; transition: width 0.3s ease !important;"></div>
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
                    </div>
                </div>

                <!-- 操作按钮 -->
                <div class="pet-actions-section" style="
                    display: grid !important;
                    grid-template-columns: 1fr 1fr !important;
                    gap: 6px !important;
                ">
                    <button class="action-btn feed-btn" style="
                        padding: 10px !important;
                        background: #43b581 !important;
                        color: white !important;
                        border: none !important;
                        border-radius: 6px !important;
                        font-size: 12px !important;
                        cursor: pointer !important;
                        min-height: 40px !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        gap: 4px !important;
                        transition: background 0.2s ease !important;
                    ">
                        <span style="font-size: 1em !important;">🍖</span>
                        <span>喂食</span>
                    </button>
                    <button class="action-btn play-btn" style="
                        padding: 10px !important;
                        background: #7289da !important;
                        color: white !important;
                        border: none !important;
                        border-radius: 6px !important;
                        font-size: 12px !important;
                        cursor: pointer !important;
                        min-height: 40px !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        gap: 4px !important;
                        transition: background 0.2s ease !important;
                    ">
                        <span style="font-size: 1em !important;">🎮</span>
                        <span>玩耍</span>
                    </button>
                    <button class="action-btn sleep-btn" style="
                        padding: 10px !important;
                        background: #99aab5 !important;
                        color: white !important;
                        border: none !important;
                        border-radius: 6px !important;
                        font-size: 12px !important;
                        cursor: pointer !important;
                        min-height: 40px !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        gap: 4px !important;
                        transition: background 0.2s ease !important;
                    ">
                        <span style="font-size: 1em !important;">😴</span>
                        <span>休息</span>
                    </button>
                    <button class="action-btn settings-btn" style="
                        padding: 10px !important;
                        background: #f04747 !important;
                        color: white !important;
                        border: none !important;
                        border-radius: 6px !important;
                        font-size: 12px !important;
                        cursor: pointer !important;
                        min-height: 40px !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        gap: 4px !important;
                        transition: background 0.2s ease !important;
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
            <div class="pet-popup-header" style="
                display: flex !important;
                justify-content: center !important;
                align-items: center !important;
                margin-bottom: 20px !important;
                padding-bottom: 15px !important;
                border-bottom: 1px solid #40444b !important;
            ">
                <h2 style="margin: 0 !important; color: #7289da !important; font-size: 1.4em !important;">🐾</h2>
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
                    <div class="pet-name" style="font-size: 1.3em !important; font-weight: bold !important; margin-bottom: 4px !important; color: ${candyColors.textPrimary} !important; cursor: pointer !important; text-decoration: underline !important;" onclick="editPetName()" title="点击编辑宠物名字">${petData.name}</div>
                    <div class="pet-level" style="color: ${candyColors.primary} !important; font-size: 1em !important;">Lv.${petData.level}</div>
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
                                <span style="color: ${candyColors.warning} !important; font-size: 0.9em !important;">${Math.round(petData.hunger)}/100</span>
                            </div>
                            <div style="background: ${candyColors.border} !important; height: 6px !important; border-radius: 3px !important; overflow: hidden !important;">
                                <div style="background: ${candyColors.warning} !important; height: 100% !important; width: ${petData.hunger}% !important; transition: width 0.3s ease !important;"></div>
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
                    </div>
                </div>

                <!-- 操作按钮 -->
                <div class="pet-actions-section" style="
                    display: grid !important;
                    grid-template-columns: 1fr 1fr !important;
                    gap: 8px !important;
                ">
                    <button class="action-btn feed-btn" style="
                        padding: 12px !important;
                        background: #43b581 !important;
                        color: white !important;
                        border: none !important;
                        border-radius: 6px !important;
                        font-size: 13px !important;
                        cursor: pointer !important;
                        min-height: 44px !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        gap: 6px !important;
                        transition: background 0.2s ease !important;
                    ">
                        <span style="font-size: 1.1em !important;">🍖</span>
                        <span>喂食</span>
                    </button>
                    <button class="action-btn play-btn" style="
                        padding: 12px !important;
                        background: #7289da !important;
                        color: white !important;
                        border: none !important;
                        border-radius: 6px !important;
                        font-size: 13px !important;
                        cursor: pointer !important;
                        min-height: 44px !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        gap: 6px !important;
                        transition: background 0.2s ease !important;
                    ">
                        <span style="font-size: 1.1em !important;">🎮</span>
                        <span>玩耍</span>
                    </button>
                    <button class="action-btn sleep-btn" style="
                        padding: 12px !important;
                        background: #99aab5 !important;
                        color: white !important;
                        border: none !important;
                        border-radius: 6px !important;
                        font-size: 13px !important;
                        cursor: pointer !important;
                        min-height: 44px !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        gap: 6px !important;
                        transition: background 0.2s ease !important;
                    ">
                        <span style="font-size: 1.1em !important;">😴</span>
                        <span>休息</span>
                    </button>
                    <button class="action-btn settings-btn" style="
                        padding: 12px !important;
                        background: #f04747 !important;
                        color: white !important;
                        border: none !important;
                        border-radius: 6px !important;
                        font-size: 13px !important;
                        cursor: pointer !important;
                        min-height: 44px !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        gap: 6px !important;
                        transition: background 0.2s ease !important;
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

        // 设置按钮
        $container.find(".settings-btn").on("click touchend", function(e) {
            e.preventDefault();
            console.log("⚙️ 打开设置");
            showNotification("⚙️ 设置功能开发中...", "info");
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
                z-index: 999999;
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
                z-index: 999999;
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

                if (popup.length > 0 && header.text().includes("虚拟宠物") && buttons.length === 4) {
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
            'z-index': '2147483647'
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
    // 7. 全局卸载函数
    // -----------------------------------------------------------------

    /**
     * 全局卸载函数 - 供用户手动调用
     */
    window.uninstallVirtualPetSystem = function() {
        console.log("🗑️ 手动卸载虚拟宠物系统...");

        if (confirm("确定要完全卸载虚拟宠物系统吗？\n\n这将删除所有宠物数据、设置和保存的状态。\n此操作不可撤销！")) {
            const success = uninstallExtension();
            if (success) {
                console.log("✅ 虚拟宠物系统已完全卸载");

                // 额外提示用户删除文件夹
                setTimeout(() => {
                    if (confirm("卸载完成！\n\n为了完全移除插件，建议您：\n1. 删除插件文件夹：scripts/extensions/third-party/virtual-pet-system/\n2. 重启SillyTavern\n\n是否要查看详细说明？")) {
                        alert("请按以下步骤完成卸载：\n\n1. 关闭SillyTavern\n2. 删除文件夹：SillyTavern/public/scripts/extensions/third-party/virtual-pet-system/\n3. 重新启动SillyTavern\n\n这样可以确保插件完全移除，避免重新安装时的冲突。");
                    }
                }, 1000);
            }
        }
    };

    /**
     * 检查残留数据的全局函数
     */
    window.checkVirtualPetLeftovers = function() {
        console.log("🔍 检查虚拟宠物系统残留数据...");
        const leftovers = checkForLeftoverData();

        if (leftovers.length > 0) {
            console.warn("发现残留数据:", leftovers);
            alert(`发现 ${leftovers.length} 项残留数据：\n\n${leftovers.join('\n')}\n\n建议运行 uninstallVirtualPetSystem() 进行完全清理。`);
        } else {
            console.log("✅ 没有发现残留数据");
            alert("✅ 没有发现虚拟宠物系统的残留数据。");
        }

        return leftovers;
    };

    /**
     * 强制清理残留数据的全局函数
     */
    window.forceCleanVirtualPetData = function() {
        console.log("🧹 强制清理虚拟宠物系统数据...");

        if (confirm("这将强制清理所有虚拟宠物系统的数据和元素。\n确定继续吗？")) {
            const success = uninstallExtension();
            if (success) {
                alert("✅ 强制清理完成！");
            } else {
                alert("❌ 清理过程中出现错误，请检查控制台日志。");
            }
        }
    };

    /**
     * 测试撒娇功能的全局函数
     */
    window.testPetAttentionSeeker = function() {
        console.log("🐾 测试宠物撒娇功能...");

        // 强制触发撒娇
        showAttentionSeeker();

        console.log("✅ 撒娇测试完成！应该看到:");
        console.log("1. 撒娇消息通知");
        console.log("2. 按钮动画效果");
        console.log("3. 发光效果");
    };

    /**
     * 重置关注时间的全局函数
     */
    window.resetAttentionTime = function() {
        console.log("🕒 重置关注时间...");

        // 设置为很久以前，触发撒娇
        lastAttentionTime = Date.now() - (20 * 60 * 1000); // 20分钟前
        localStorage.setItem(STORAGE_KEY_LAST_ATTENTION, lastAttentionTime);

        console.log(`✅ 关注时间已重置为 ${Math.floor((Date.now() - lastAttentionTime) / 60000)} 分钟前`);
        console.log("💡 等待2分钟或运行 testPetAttentionSeeker() 查看撒娇效果");
    };

    /**
     * 查看撒娇状态的全局函数
     */
    window.checkAttentionStatus = function() {
        console.log("📊 撒娇系统状态检查:");

        const now = Date.now();
        const timeSinceLastAttention = now - lastAttentionTime;
        const minutesSince = Math.floor(timeSinceLastAttention / 60000);

        console.log(`最后关注时间: ${new Date(lastAttentionTime).toLocaleString()}`);
        console.log(`距离现在: ${minutesSince} 分钟`);
        console.log(`撒娇阈值: 15 分钟`);
        console.log(`当前状态: ${isShowingAttentionSeeker ? '正在撒娇' : '正常'}`);
        console.log(`定时器状态: ${attentionTimer ? '运行中' : '已停止'}`);
        console.log(`AI撒娇功能: ${aiAttentionEnabled ? '启用' : '禁用'}`);
        console.log(`宠物人设长度: ${petPersona.length} 字符`);

        if (minutesSince >= 15) {
            console.log("🐾 宠物需要关注了！");
        } else {
            console.log(`😊 还需要 ${15 - minutesSince} 分钟宠物才会撒娇`);
        }

        return {
            lastAttentionTime,
            minutesSinceLastAttention: minutesSince,
            isShowingAttentionSeeker,
            timerRunning: !!attentionTimer,
            aiAttentionEnabled,
            personaLength: petPersona.length
        };
    };

    /**
     * 设置宠物人设的全局函数
     */
    window.setPetPersona = function(newPersona) {
        if (!newPersona || typeof newPersona !== 'string') {
            console.error("❌ 人设内容不能为空且必须是字符串");
            return false;
        }

        if (newPersona.length > 2000) {
            console.warn("⚠️ 人设内容过长，建议控制在2000字符以内");
        }

        petPersona = newPersona;
        savePetPersona();

        console.log(`✅ 宠物人设已更新 (${newPersona.length} 字符)`);
        console.log("💡 新人设将在下次撒娇时生效");

        return true;
    };

    /**
     * 获取当前宠物人设的全局函数
     */
    window.getPetPersona = function() {
        console.log("📝 当前宠物人设:");
        console.log(petPersona);
        return petPersona;
    };

    /**
     * 重置为默认人设的全局函数
     */
    window.resetPetPersona = function() {
        const template = defaultPersonaTemplates[petData.type] || defaultPersonaTemplates.cat;
        const newPersona = template.replace('{petName}', petData.name);

        petPersona = newPersona;
        savePetPersona();

        console.log(`✅ 已重置为默认${petData.type}人设`);
        console.log("💡 新人设将在下次撒娇时生效");

        return true;
    };

    /**
     * 切换AI功能的全局函数（合并版本）
     */
    window.toggleAIFeatures = function(enabled) {
        if (typeof enabled === 'undefined') {
            // 如果没有指定，则切换状态
            const newState = !(aiAttentionEnabled && aiInteractionsEnabled);
            aiAttentionEnabled = newState;
            aiInteractionsEnabled = newState;
        } else {
            // 同时设置两个功能
            aiAttentionEnabled = !!enabled;
            aiInteractionsEnabled = !!enabled;
        }

        saveAIAttentionSettings();
        saveAIInteractionSettings();

        // 更新设置界面的开关状态
        if ($("#virtual-pet-ai-features-toggle").length > 0) {
            $("#virtual-pet-ai-features-toggle").prop("checked", aiAttentionEnabled && aiInteractionsEnabled);
        }

        console.log(`${(aiAttentionEnabled && aiInteractionsEnabled) ? '✅ 启用' : '❌ 禁用'} AI功能 (包括撒娇和互动)`);

        if (aiAttentionEnabled && !petPersona) {
            console.log("💡 正在加载默认人设...");
            loadPetPersona();
        }

        return aiAttentionEnabled && aiInteractionsEnabled;
    };

    /**
     * 切换AI撒娇功能的全局函数（保持向后兼容）
     */
    window.toggleAIAttention = function(enabled) {
        console.log("💡 建议使用 toggleAIFeatures() 来统一管理AI功能");
        return window.toggleAIFeatures(enabled);
    };

    /**
     * 测试AI撒娇功能的全局函数
     */
    window.testAIAttention = async function() {
        console.log("🤖 测试AI撒娇功能...");

        if (!aiAttentionEnabled) {
            console.log("❌ AI撒娇功能未启用，请先运行: toggleAIAttention(true)");
            return false;
        }

        if (!petPersona) {
            console.log("❌ 宠物人设为空，请先设置人设");
            return false;
        }

        try {
            console.log("🔄 正在生成AI撒娇消息...");
            const message = await generateAIAttentionMessage();

            if (message) {
                console.log(`✅ AI撒娇消息生成成功: ${message}`);

                // 显示测试消息
                if (typeof toastr !== 'undefined') {
                    toastr.success(message, `${petData.name} 的AI撒娇测试 ✨`, {
                        timeOut: 8000,
                        extendedTimeOut: 3000
                    });
                }

                return message;
            } else {
                console.log("❌ AI撒娇消息生成失败");
                return false;
            }
        } catch (error) {
            console.error("❌ AI撒娇测试失败:", error);
            return false;
        }
    };

    /**
     * 切换AI互动功能的全局函数（保持向后兼容）
     */
    window.toggleAIInteractions = function(enabled) {
        console.log("💡 建议使用 toggleAIFeatures() 来统一管理AI功能");
        return window.toggleAIFeatures(enabled);
    };

    /**
     * 测试AI互动功能的全局函数
     */
    window.testAIInteraction = async function(type = 'greeting') {
        console.log(`🎮 测试AI互动功能: ${type}`);

        if (!aiInteractionsEnabled) {
            console.log("❌ AI互动功能未启用，请先运行: toggleAIInteractions(true)");
            return false;
        }

        if (!petPersona) {
            console.log("❌ 宠物人设为空，请先设置人设");
            return false;
        }

        const validTypes = ['feed', 'play', 'sleep', 'levelup', 'greeting'];
        if (!validTypes.includes(type)) {
            console.log(`❌ 无效的互动类型，支持的类型: ${validTypes.join(', ')}`);
            return false;
        }

        try {
            console.log(`🔄 正在生成AI ${type} 互动消息...`);
            const context = type === 'levelup' ? { newLevel: petData.level + 1 } : {};
            const message = await generateAIInteractionMessage(type, context);

            if (message) {
                console.log(`✅ AI ${type} 互动消息生成成功: ${message}`);

                // 显示测试消息
                if (typeof toastr !== 'undefined') {
                    toastr.info(message, `${petData.name} 的AI ${type} 测试 ✨`, {
                        timeOut: 6000,
                        extendedTimeOut: 2000
                    });
                }

                return message;
            } else {
                console.log(`❌ AI ${type} 互动消息生成失败`);
                return false;
            }
        } catch (error) {
            console.error(`❌ AI ${type} 互动测试失败:`, error);
            return false;
        }
    };

    /**
     * 批量测试所有AI互动类型
     */
    window.testAllAIInteractions = async function() {
        console.log("🎮 批量测试所有AI互动功能...");

        const types = ['greeting', 'feed', 'play', 'sleep', 'levelup'];
        const results = {};

        for (const type of types) {
            console.log(`\n--- 测试 ${type} ---`);
            const result = await testAIInteraction(type);
            results[type] = result;

            // 间隔一秒避免API调用过快
            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        console.log("\n📊 测试结果汇总:");
        Object.entries(results).forEach(([type, result]) => {
            console.log(`${type}: ${result ? '✅ 成功' : '❌ 失败'}`);
        });

        return results;
    };

    /**
     * 测试智能回退功能
     */
    window.testIntelligentFallback = function() {
        console.log("🧪 测试智能回退功能...");

        if (!petPersona || petPersona.length === 0) {
            console.log("❌ 需要先设置宠物人设才能测试智能回退");
            return false;
        }

        const testTypes = ['attention', 'feed', 'play', 'sleep', 'greeting', 'levelup'];
        const results = {};

        testTypes.forEach(type => {
            const prompt = `测试${type}互动`;
            const response = generateIntelligentFallback(prompt);
            results[type] = response;
            console.log(`${type}: ${response}`);
        });

        if (typeof toastr !== 'undefined') {
            toastr.success("智能回退功能测试完成！请查看控制台输出。", "测试成功", {
                timeOut: 5000
            });
        }

        return results;
    };

    /**
     * AI功能诊断工具
     */
    window.diagnoseAIFeatures = function() {
        console.log("🔍 AI功能诊断开始...");
        console.log("=====================================");

        const diagnosis = {
            environment: {},
            settings: {},
            availability: {},
            recommendations: []
        };

        // 1. 环境检查
        console.log("\n📋 环境检查:");
        diagnosis.environment = {
            generateQuietPrompt: typeof window.generateQuietPrompt === 'function',
            Generate: typeof window.Generate === 'function',
            main_api: !!window.main_api,
            chat: window.chat && Array.isArray(window.chat),
            eventSource: !!(window.eventSource || window.EventSource)
        };

        Object.entries(diagnosis.environment).forEach(([key, value]) => {
            console.log(`${value ? '✅' : '❌'} ${key}: ${value}`);
        });

        // 2. 设置检查
        console.log("\n⚙️ 设置检查:");
        diagnosis.settings = {
            aiAttentionEnabled,
            aiInteractionsEnabled,
            personaLength: petPersona.length,
            personaValid: petPersona.length > 0
        };

        Object.entries(diagnosis.settings).forEach(([key, value]) => {
            console.log(`${key}: ${value}`);
        });

        // 3. 可用性评估
        console.log("\n🎯 可用性评估:");
        const hasAnyAPI = Object.values(diagnosis.environment).some(v => v);
        diagnosis.availability = {
            hasAnyAPI,
            canUseAI: hasAnyAPI && diagnosis.settings.personaValid,
            overallStatus: hasAnyAPI && diagnosis.settings.personaValid ? '可用' : '不可用'
        };

        Object.entries(diagnosis.availability).forEach(([key, value]) => {
            console.log(`${key}: ${value}`);
        });

        // 4. 建议
        console.log("\n💡 建议:");
        if (!hasAnyAPI) {
            diagnosis.recommendations.push("❌ 未检测到可用的AI API，请确保SillyTavern已正确配置AI模型");
            diagnosis.recommendations.push("🔧 检查SillyTavern的AI设置页面，确保已连接到AI服务");
            diagnosis.recommendations.push("🌐 确认网络连接正常，AI服务可访问");
        }

        if (!diagnosis.settings.aiAttentionEnabled) {
            diagnosis.recommendations.push("⚙️ AI撒娇功能未启用，请在设置中启用");
        }

        if (!diagnosis.settings.aiInteractionsEnabled) {
            diagnosis.recommendations.push("⚙️ AI互动功能未启用，请在设置中启用");
        }

        if (!diagnosis.settings.personaValid) {
            diagnosis.recommendations.push("📝 宠物人设为空，请在设置中编写人设或重置为默认");
        }

        if (diagnosis.recommendations.length === 0) {
            diagnosis.recommendations.push("✅ 所有检查通过，AI功能应该可以正常工作");
            diagnosis.recommendations.push("🧪 如果仍有问题，请尝试运行 testAIAttention() 或 testAIInteraction()");
        }

        diagnosis.recommendations.forEach(rec => console.log(rec));

        console.log("\n=====================================");
        console.log("🔍 AI功能诊断完成");

        return diagnosis;
    };

    console.log("🐾 虚拟宠物系统加载完成！");
    console.log("🐾 如果没有看到按钮，请在控制台运行: testVirtualPet()");
    console.log("🎛️ 设置管理：请在SillyTavern扩展设置中找到'🐾 虚拟宠物系统'进行配置");
    console.log("😽 撒娇功能：15分钟不理宠物会自动撒娇求关注！");
    console.log("🤖 AI功能：" + ((aiAttentionEnabled && aiInteractionsEnabled) ? "已启用" : "已禁用") + " (包括撒娇和互动)");
    console.log("🛡️ 智能回退：当AI不可用时自动使用基于人设的智能回应");
    console.log("💡 提示：所有AI和人设功能都可以在设置界面中管理，无需使用控制台命令");
    console.log("🔍 AI故障排除：diagnoseAIFeatures() | 智能回退测试：testIntelligentFallback()");
    console.log("⚙️ AI功能控制：toggleAIFeatures() | 人设管理：setPetPersona('人设')");
    console.log("💡 卸载提示：如需完全卸载，请在控制台运行：uninstallVirtualPetSystem()");
});

console.log("🐾 虚拟宠物系统脚本已加载完成");
