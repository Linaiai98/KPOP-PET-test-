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

    // Firebase 相关常量
    const FIREBASE_CONFIG = {
        apiKey: "AIzaSyA74TnN9IoyQjCncKOIOShWEktrL1hd96o",
        authDomain: "kpop-pett.firebaseapp.com",
        projectId: "kpop-pett",
        storageBucket: "kpop-pett.firebasestorage.app",
        messagingSenderId: "264650615774",
        appId: "1:264650615774:web:f500ff555183110c3f0b4f",
        measurementId: "G-3BH0GMJR3D"
    };

    const FIREBASE_STORAGE_KEYS = {
        PET_DATA: "pet_data",
        AI_SETTINGS: "ai_settings",
        AVATAR: "avatar",
        USER_PROFILE: "user_profile",
        CONNECTION_CODES: "connection_codes"
    };
    
    // DOM IDs and Selectors
    const BUTTON_ID = "virtual-pet-button";
    const OVERLAY_ID = "virtual-pet-popup-overlay";
    const POPUP_ID = "virtual-pet-popup";
    const CLOSE_BUTTON_ID = "virtual-pet-popup-close-button";
    const TOGGLE_ID = "#virtual-pet-enabled-toggle";
    
    // DOM 元素引用
    let overlay, mainView, petView, settingsView, chatView;

    // 聊天功能变量
    let chatHistory = [];
    let petContainer;

    // 弹窗状态管理
    let isPopupOpen = false;

    // 自定义头像管理
    let customAvatarData = null;

    // 同步保存限制机制
    let lastSyncSaveTime = 0;
    const SYNC_SAVE_COOLDOWN = 2000; // 2秒冷却时间，避免频繁保存

    // Firebase 状态管理
    let firebaseApp = null;
    let firebaseAuth = null;
    let firebaseDb = null;
    let firebaseStorage = null;
    let currentUser = null;
    let isFirebaseInitialized = false;
    let connectionCode = null;
    let connectionCodeExpiry = null;

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
    // 2. Firebase 云端备份系统
    // -----------------------------------------------------------------

    /**
     * 初始化Firebase服务
     */
    async function initializeFirebase() {
        try {
            console.log(`[${extensionName}] 🔥 初始化Firebase服务...`);

            // 检查Firebase SDK是否已加载
            if (typeof firebase === 'undefined') {
                console.log(`[${extensionName}] 📦 加载Firebase SDK...`);
                await loadFirebaseSDK();
            }

            // 初始化Firebase应用
            if (!firebaseApp) {
                firebaseApp = firebase.initializeApp(FIREBASE_CONFIG);
                firebaseAuth = firebase.auth();
                firebaseDb = firebase.firestore();
                firebaseStorage = firebase.storage();

                // 初始化Analytics (可选)
                try {
                    if (firebase.analytics && FIREBASE_CONFIG.measurementId) {
                        firebase.analytics();
                        console.log(`[${extensionName}] 📊 Firebase Analytics已启用`);
                    }
                } catch (analyticsError) {
                    console.warn(`[${extensionName}] ⚠️ Firebase Analytics初始化失败:`, analyticsError);
                }

                console.log(`[${extensionName}] ✅ Firebase应用初始化成功`);
            }

            // 设置认证状态监听器
            firebaseAuth.onAuthStateChanged((user) => {
                currentUser = user;
                updateFirebaseStatus('auth_changed'); // Use a specific status to trigger UI update

                if (user) {
                    console.log(`[${extensionName}] 👤 用户已登录: ${user.uid}`);
                } else {
                    console.log(`[${extensionName}] 👤 用户未登录`);
                }
            });

            isFirebaseInitialized = true;
            updateFirebaseStatus('auth_changed'); // Initial check

            return true;
        } catch (error) {
            console.error(`[${extensionName}] ❌ Firebase初始化失败:`, error);
            updateFirebaseStatus('error', `初始化失败: ${error.message}`);
            return false;
        }
    }

    /**
     * 动态加载Firebase SDK
     */
    async function loadFirebaseSDK() {
        return new Promise((resolve, reject) => {
            // 检查是否已经加载了Firebase
            if (typeof firebase !== 'undefined') {
                console.log(`[${extensionName}] 📦 Firebase SDK已存在`);
                resolve();
                return;
            }

            // Firebase核心SDK (使用compat版本以保持兼容性)
            const coreScript = document.createElement('script');
            coreScript.src = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js';
            coreScript.onload = () => {
                // Firebase认证SDK
                const authScript = document.createElement('script');
                authScript.src = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js';
                authScript.onload = () => {
                    // Firebase Firestore SDK
                    const firestoreScript = document.createElement('script');
                    firestoreScript.src = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js';
                    firestoreScript.onload = () => {
                        // Firebase Storage SDK
                        const storageScript = document.createElement('script');
                        storageScript.src = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-storage-compat.js';
                        storageScript.onload = () => {
                            // Firebase Analytics SDK (可选)
                            const analyticsScript = document.createElement('script');
                            analyticsScript.src = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-analytics-compat.js';
                            analyticsScript.onload = () => {
                                console.log(`[${extensionName}] 📦 Firebase SDK加载完成`);
                                resolve();
                            };
                            analyticsScript.onerror = () => {
                                console.warn(`[${extensionName}] ⚠️ Firebase Analytics加载失败，继续使用其他功能`);
                                resolve(); // Analytics失败不影响其他功能
                            };
                            document.head.appendChild(analyticsScript);
                        };
                        storageScript.onerror = reject;
                        document.head.appendChild(storageScript);
                    };
                    firestoreScript.onerror = reject;
                    document.head.appendChild(firestoreScript);
                };
                authScript.onerror = reject;
                document.head.appendChild(authScript);
            };
            coreScript.onerror = reject;
            document.head.appendChild(coreScript);
        });
    }

    /**
     * 匿名登录Firebase
     */
    async function signInAnonymously() {
        try {
            if (!isFirebaseInitialized) {
                throw new Error('Firebase未初始化');
            }

            console.log(`[${extensionName}] 🔐 执行匿名登录...`);
            updateFirebaseStatus('connecting', '正在登录...');

            const userCredential = await firebaseAuth.signInAnonymously();
            currentUser = userCredential.user;

            console.log(`[${extensionName}] ✅ 匿名登录成功: ${currentUser.uid}`);

            // 创建用户配置文档
            await createUserProfile();

            updateFirebaseStatus('connected', '已连接');
            return currentUser;
        } catch (error) {
            console.error(`[${extensionName}] ❌ 匿名登录失败:`, error);
            updateFirebaseStatus('error', `登录失败: ${error.message}`);
            throw error;
        }
    }

    /**
     * 创建用户配置文档
     */
    async function createUserProfile() {
        try {
            if (!currentUser) return;

            const userDoc = firebaseDb.collection('users').doc(currentUser.uid);
            const docSnapshot = await userDoc.get();

            if (!docSnapshot.exists) {
                const userProfile = {
                    uid: currentUser.uid,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    deviceName: getDeviceName(),
                    lastActive: firebase.firestore.FieldValue.serverTimestamp(),
                    dataVersion: '1.0'
                };

                await userDoc.set(userProfile);
                console.log(`[${extensionName}] 👤 用户配置文档已创建`);
            } else {
                // 更新最后活跃时间
                await userDoc.update({
                    lastActive: firebase.firestore.FieldValue.serverTimestamp(),
                    deviceName: getDeviceName()
                });
                console.log(`[${extensionName}] 👤 用户配置文档已更新`);
            }
        } catch (error) {
            console.error(`[${extensionName}] ❌ 创建用户配置失败:`, error);
        }
    }

    /**
     * 获取设备名称
     */
    function getDeviceName() {
        const userAgent = navigator.userAgent;
        if (/iPad|iPhone|iPod/.test(userAgent)) {
            return 'iOS设备';
        } else if (/Android/.test(userAgent)) {
            return 'Android设备';
        } else if (/Windows/.test(userAgent)) {
            return 'Windows电脑';
        } else if (/Mac/.test(userAgent)) {
            return 'Mac电脑';
        } else {
            return '未知设备';
        }
    }

    /**
     * 生成设备连接码
     */
    async function generateConnectionCode() {
        try {
            if (!currentUser) {
                throw new Error('用户未登录');
            }

            console.log(`[${extensionName}] 🔑 生成连接码...`);

            // 生成6位随机连接码
            const code = generateRandomCode();
            const expiry = Date.now() + (5 * 60 * 1000); // 5分钟后过期

            // 保存连接码到Firestore
            const codeDoc = firebaseDb.collection('connectionCodes').doc(code);
            await codeDoc.set({
                userId: currentUser.uid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                expiresAt: new Date(expiry),
                used: false
            });

            connectionCode = code;
            connectionCodeExpiry = expiry;

            console.log(`[${extensionName}] ✅ 连接码生成成功: ${code}`);

            // 5分钟后自动清理过期连接码
            setTimeout(() => {
                cleanupExpiredCode(code);
            }, 5 * 60 * 1000);

            return code;
        } catch (error) {
            console.error(`[${extensionName}] ❌ 生成连接码失败:`, error);
            throw error;
        }
    }

    /**
     * 生成随机连接码
     */
    function generateRandomCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    /**
     * 清理过期连接码
     */
    async function cleanupExpiredCode(code) {
        try {
            const codeDoc = firebaseDb.collection('connectionCodes').doc(code);
            await codeDoc.delete();
            console.log(`[${extensionName}] 🧹 已清理过期连接码: ${code}`);
        } catch (error) {
            console.error(`[${extensionName}] ❌ 清理连接码失败:`, error);
        }
    }

    /**
     * 使用连接码连接到主设备
     */
    async function connectWithCode(code) {
        try {
            if (!isFirebaseInitialized) {
                throw new Error('Firebase未初始化');
            }

            console.log(`[${extensionName}] 🔗 尝试连接码: ${code}`);

            // 查找连接码
            const codeDoc = firebaseDb.collection('connectionCodes').doc(code.toUpperCase());
            const docSnapshot = await codeDoc.get();

            if (!docSnapshot.exists) {
                throw new Error('连接码不存在或已过期');
            }

            const codeData = docSnapshot.data();

            // 检查连接码是否过期
            if (codeData.expiresAt.toDate() < new Date()) {
                await codeDoc.delete();
                throw new Error('连接码已过期');
            }

            // 检查连接码是否已使用
            if (codeData.used) {
                throw new Error('连接码已被使用');
            }

            // 匿名登录
            await signInAnonymously();

            // 采用主设备的用户ID
            const primaryUserId = codeData.userId;

            // 标记连接码为已使用
            await codeDoc.update({
                used: true,
                usedAt: firebase.firestore.FieldValue.serverTimestamp(),
                secondaryUserId: currentUser.uid
            });

            // 从主设备同步数据
            await syncDataFromPrimary(primaryUserId);

            console.log(`[${extensionName}] ✅ 连接成功，数据已同步`);

            return true;
        } catch (error) {
            console.error(`[${extensionName}] ❌ 连接失败:`, error);
            throw error;
        }
    }

    /**
     * 从主设备同步数据
     */
    async function syncDataFromPrimary(primaryUserId) {
        try {
            console.log(`[${extensionName}] 📥 从主设备同步数据...`);

            const userDoc = firebaseDb.collection('users').doc(primaryUserId);
            const docSnapshot = await userDoc.get();

            if (!docSnapshot.exists) {
                throw new Error('主设备数据不存在');
            }

            const userData = docSnapshot.data();

            // 同步宠物数据
            if (userData.petData) {
                petData = { ...petData, ...userData.petData };
                savePetData();
                console.log(`[${extensionName}] ✅ 宠物数据已同步`);
            }

            // 同步AI设置
            if (userData.aiSettings) {
                localStorage.setItem(`${extensionName}-ai-settings`, JSON.stringify(userData.aiSettings));
                console.log(`[${extensionName}] ✅ AI设置已同步`);
            }

            // 同步头像 (优先使用avatarUrl)
            if (userData.avatarUrl) {
                customAvatarData = userData.avatarUrl;
                localStorage.setItem(STORAGE_KEY_CUSTOM_AVATAR, userData.avatarUrl);
                console.log(`[${extensionName}] ✅ 头像URL已同步`);
            } else if (userData.avatar) { // 兼容旧数据
                customAvatarData = userData.avatar;
                localStorage.setItem(STORAGE_KEY_CUSTOM_AVATAR, userData.avatar);
                console.log(`[${extensionName}] ✅ 旧版头像数据已同步`);
            }

            // 更新UI
            renderPetStatus();
            loadAISettings();
            loadCustomAvatar();

            toastr.success('所有数据已从主设备同步完成！', '🎉 同步成功');

        } catch (error) {
            console.error(`[${extensionName}] ❌ 数据同步失败:`, error);
            throw error;
        }
    }

    /**
     * 上传头像到Firebase Storage并返回URL
     * @param {string} dataUrl base64数据URL
     * @returns {Promise<string>} 头像的公开URL
     */
    async function uploadAvatarToStorage(dataUrl) {
        if (!currentUser || !firebaseStorage) {
            throw new Error('Firebase Storage未初始化或用户未登录');
        }
        console.log(`[${extensionName}] ☁️ 上传头像到Firebase Storage...`);

        const storageRef = firebaseStorage.ref().child(`avatars/${currentUser.uid}/avatar.png`);

        try {
            // Firebase Storage的putString方法可以直接处理data_url
            const uploadTask = await storageRef.putString(dataUrl, 'data_url');
            const downloadURL = await uploadTask.ref.getDownloadURL();
            
            console.log(`[${extensionName}] ✅ 头像上传成功，URL: ${downloadURL}`);
            return downloadURL;
        } catch (error) {
            console.error(`[${extensionName}] ❌ 头像上传失败:`, error);
            throw new Error(`头像上传失败: ${error.message}`);
        }
    }

    /**
     * 备份所有数据到Firebase
     */
    async function backupAllDataToFirebase() {
        try {
            if (!currentUser) {
                throw new Error('用户未登录');
            }

            console.log(`[${extensionName}] ☁️ 备份所有数据到Firebase...`);

            const userDoc = firebaseDb.collection('users').doc(currentUser.uid);

            // 准备备份数据
            const backupData = {
                lastBackup: firebase.firestore.FieldValue.serverTimestamp(),
                deviceName: getDeviceName(),
                dataVersion: '1.1' // 版本升级，表示使用Storage
            };

            // 备份宠物数据
            if (petData) {
                backupData.petData = {
                    ...petData,
                    lastSyncTime: Date.now()
                };
            }

            // 备份AI设置
            const aiSettings = localStorage.getItem(`${extensionName}-ai-settings`);
            if (aiSettings) {
                try {
                    backupData.aiSettings = JSON.parse(aiSettings);
                } catch (e) {
                    console.warn(`[${extensionName}] AI设置解析失败，跳过备份`);
                }
            }

            // 备份头像到Firebase Storage
            if (customAvatarData) {
                // 如果是base64数据, 则上传并获取URL
                if (customAvatarData.startsWith('data:image')) {
                    try {
                        const avatarUrl = await uploadAvatarToStorage(customAvatarData);
                        backupData.avatarUrl = avatarUrl;
                        // 上传成功后，可以更新本地存储为URL，减少未来重复上传
                        localStorage.setItem(STORAGE_KEY_CUSTOM_AVATAR, avatarUrl);
                        customAvatarData = avatarUrl;
                    } catch (uploadError) {
                        console.error(`[${extensionName}] ❌ 头像备份失败，跳过头像备份:`, uploadError);
                        toastr.warning('头像上传失败，本次备份将不包含头像。', '⚠️ 备份警告');
                    }
                } else if (customAvatarData.startsWith('http')) {
                    // 如果已经是URL，直接保存
                    backupData.avatarUrl = customAvatarData;
                }
            }

            // 执行备份
            await userDoc.set(backupData, { merge: true });

            console.log(`[${extensionName}] ✅ 数据备份完成`);
            toastr.success('所有数据已备份到云端！', '☁️ 备份成功');

            return true;
        } catch (error) {
            console.error(`[${extensionName}] ❌ 数据备份失败:`, error);
            toastr.error(`备份失败: ${error.message}`, '❌ 备份失败');
            throw error;
        }
    }

    /**
     * 从Firebase恢复数据
     */
    async function restoreDataFromFirebase() {
        try {
            if (!currentUser) {
                throw new Error('用户未登录');
            }

            console.log(`[${extensionName}] 📥 从Firebase恢复数据...`);

            const userDoc = firebaseDb.collection('users').doc(currentUser.uid);
            const docSnapshot = await userDoc.get();

            if (!docSnapshot.exists) {
                throw new Error('云端没有找到备份数据');
            }

            const userData = docSnapshot.data();
            let restoredCount = 0;

            // 恢复宠物数据
            if (userData.petData) {
                petData = { ...petData, ...userData.petData };
                savePetData();
                restoredCount++;
                console.log(`[${extensionName}] ✅ 宠物数据已恢复`);
            }

            // 恢复AI设置
            if (userData.aiSettings) {
                localStorage.setItem(`${extensionName}-ai-settings`, JSON.stringify(userData.aiSettings));
                restoredCount++;
                console.log(`[${extensionName}] ✅ AI设置已恢复`);
            }

            // 恢复头像 (优先使用avatarUrl)
            if (userData.avatarUrl) {
                customAvatarData = userData.avatarUrl;
                localStorage.setItem(STORAGE_KEY_CUSTOM_AVATAR, userData.avatarUrl);
                restoredCount++;
                console.log(`[${extensionName}] ✅ 头像URL已恢复`);
            } else if (userData.avatar) { // 兼容旧数据
                customAvatarData = userData.avatar;
                localStorage.setItem(STORAGE_KEY_CUSTOM_AVATAR, userData.avatar);
                restoredCount++;
                console.log(`[${extensionName}] ✅ 旧版头像数据已恢复`);
            }

            // 更新UI
            renderPetStatus();
            loadAISettings();
            loadCustomAvatar();
            updateAvatarDisplay();
            updateFloatingButtonAvatar();

            const lastBackup = userData.lastBackup ? userData.lastBackup.toDate().toLocaleString() : '未知';
            toastr.success(`已恢复 ${restoredCount} 项数据\n最后备份时间: ${lastBackup}`, '📥 恢复成功', { timeOut: 5000 });

            return restoredCount;
        } catch (error) {
            console.error(`[${extensionName}] ❌ 数据恢复失败:`, error);
            toastr.error(`恢复失败: ${error.message}`, '❌ 恢复失败');
            throw error;
        }
    }

    /**
     * 检查Firebase同步状态
     */
    async function checkFirebaseSyncStatus() {
        try {
            if (!currentUser) {
                return {
                    connected: false,
                    message: '未连接到云端'
                };
            }

            const userDoc = firebaseDb.collection('users').doc(currentUser.uid);
            const docSnapshot = await userDoc.get();

            if (!docSnapshot.exists) {
                return {
                    connected: true,
                    hasBackup: false,
                    message: '已连接，但没有备份数据'
                };
            }

            const userData = docSnapshot.data();
            const lastBackup = userData.lastBackup ? userData.lastBackup.toDate() : null;

            return {
                connected: true,
                hasBackup: true,
                lastBackup: lastBackup,
                hasPetData: !!userData.petData,
                hasAISettings: !!userData.aiSettings,
                hasAvatar: !!userData.avatar,
                deviceName: userData.deviceName,
                message: lastBackup ? `最后备份: ${lastBackup.toLocaleString()}` : '有备份数据'
            };
        } catch (error) {
            console.error(`[${extensionName}] ❌ 检查同步状态失败:`, error);
            return {
                connected: false,
                error: true,
                message: `检查失败: ${error.message}`
            };
        }
    }

    /**
     * 断开Firebase连接
     */
    async function disconnectFirebase() {
        try {
            if (currentUser) {
                await firebaseAuth.signOut();
                console.log(`[${extensionName}] 👋 已断开Firebase连接`);
            }

            currentUser = null;
            connectionCode = null;
            connectionCodeExpiry = null;

            updateFirebaseStatus('disconnected', '已断开连接');
            toastr.info('已断开云端连接', '🔌 断开连接');

            return true;
        } catch (error) {
            console.error(`[${extensionName}] ❌ 断开连接失败:`, error);
            throw error;
        }
    }

    /**
     * 更新Firebase状态显示（简化版）
     */
    function updateFirebaseStatus(status = 'disconnected', message = '') {
        const statusIcon = $('#firebase-status-icon');
        const statusText = $('#firebase-status-text');
        const primaryControls = $('#firebase-primary-controls');
        const secondaryControls = $('#firebase-secondary-controls');
        const managementControls = $('#firebase-management-controls');
        const initBtn = $('#firebase-init-btn');

        switch (status) {
            case 'connected':
                statusIcon.text('🟢');
                statusText.text(message || '已连接');
                initBtn.text('✅ 已连接').prop('disabled', true);
                primaryControls.show();
                // 连接成功后仍然显示从设备输入框，方便其他设备连接
                secondaryControls.show();
                managementControls.show();
                break;

            case 'connecting':
                statusIcon.text('🟡');
                statusText.text(message || '连接中...');
                initBtn.text('🔄 连接中...').prop('disabled', true);
                break;

            case 'error':
                statusIcon.text('🔴');
                statusText.text(message || '连接错误');
                initBtn.text('❌ 重试').prop('disabled', false);
                primaryControls.hide();
                managementControls.hide();
                secondaryControls.show();
                break;

            default: // disconnected
                statusIcon.text('⚪');
                statusText.text(message || '未连接');
                initBtn.text('🔗 连接').prop('disabled', false);
                primaryControls.hide();
                managementControls.hide();
                secondaryControls.show();
                break;
        }
    }

    /**
     * 绑定Firebase UI事件（简化版）
     */
    function bindFirebaseEvents() {
        // 初始化连接按钮
        $('#firebase-init-btn').on('click', async function() {
            try {
                updateFirebaseStatus('connecting', '连接中...');

                await initializeFirebase();
                await signInAnonymously();

                updateFirebaseStatus('connected', '已连接');
                toastr.success('云端备份已连接！', '☁️ 连接成功');

            } catch (error) {
                updateFirebaseStatus('error', '连接失败');
                toastr.error(`连接失败: ${error.message}`, '❌ 连接错误');
            }
        });

        // 生成连接码按钮
        $('#firebase-generate-code-btn').on('click', async function() {
            try {
                const code = await generateConnectionCode();
                $('#firebase-connection-code-text').val(code);
                $('#firebase-connection-code-display').show();
                toastr.success(`连接码已生成: ${code}`, '🔑 生成成功');
            } catch (error) {
                toastr.error(`生成失败: ${error.message}`, '❌ 错误');
            }
        });

        // 复制连接码按钮
        $('#firebase-copy-code-btn').on('click', function() {
            const code = $('#firebase-connection-code-text').val();
            navigator.clipboard.writeText(code).then(() => {
                toastr.success('连接码已复制！', '📋 复制成功');
            }).catch(() => {
                toastr.error('复制失败，请手动复制', '❌ 复制失败');
            });
        });

        // 连接同步按钮
        $('#firebase-connect-btn').on('click', async function() {
            const code = $('#firebase-connection-code-input').val().trim().toUpperCase();

            if (!code || code.length !== 6) {
                toastr.warning('请输入6位连接码', '⚠️ 输入错误');
                return;
            }

            try {
                updateFirebaseStatus('connecting', '连接中...');

                if (!isFirebaseInitialized) {
                    await initializeFirebase();
                }

                await connectWithCode(code);
                updateFirebaseStatus('connected', '已连接');
                $('#firebase-connection-code-input').val('');
                toastr.success('设备连接成功，数据已同步！', '🔗 连接成功');

            } catch (error) {
                updateFirebaseStatus('error', '连接失败');
                toastr.error(`连接失败: ${error.message}`, '❌ 连接错误');
            }
        });

        // 立即备份按钮
        $('#firebase-backup-now-btn').on('click', async function() {
            try {
                await backupAllDataToFirebase();
                toastr.success('数据已备份到云端！', '☁️ 备份成功');
            } catch (error) {
                toastr.error(`备份失败: ${error.message}`, '❌ 备份失败');
            }
        });

        // 恢复数据按钮
        $('#firebase-restore-btn').on('click', async function() {
            if (!confirm('确定要从云端恢复数据吗？这将覆盖当前数据！')) {
                return;
            }

            try {
                await restoreDataFromFirebase();
                toastr.success('数据已从云端恢复！', '📥 恢复成功');
            } catch (error) {
                toastr.error(`恢复失败: ${error.message}`, '❌ 恢复失败');
            }
        });

        // 断开连接按钮
        $('#firebase-disconnect-btn').on('click', async function() {
            if (!confirm('确定要断开云端连接吗？断开后将无法同步数据。')) {
                return;
            }

            try {
                await disconnectFirebase();
                updateFirebaseStatus('disconnected', '已断开连接');
                $('#firebase-connection-code-display').hide();
                toastr.info('已断开云端连接', '🔌 断开连接');
            } catch (error) {
                toastr.error(`断开失败: ${error.message}`, '❌ 错误');
            }
        });

        // 连接码输入框格式化
        $('#firebase-connection-code-input').on('input', function() {
            let value = $(this).val().toUpperCase().replace(/[^A-Z0-9]/g, '');
            if (value.length > 6) {
                value = value.substring(0, 6);
            }
            $(this).val(value);
        });

        // 连接码输入框回车键
        $('#firebase-connection-code-input').on('keypress', function(e) {
            if (e.which === 13) {
                $('#firebase-connect-btn').click();
            }
        });
    }

    // -----------------------------------------------------------------
    // 7. 预设人设定义
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

        // 绑定Firebase事件
        bindFirebaseEvents();

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
    function savePetData() {
        try {
            // 添加时间戳用于同步
            const dataWithTimestamp = {
                ...petData,
                lastSyncTime: Date.now()
            };

            localStorage.setItem(STORAGE_KEY_PET_DATA, JSON.stringify(dataWithTimestamp));

            // 同时保存到全局同步存储（如果可用）
            saveToSyncStorage(dataWithTimestamp);

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

    /**
     * 显示聊天视图
     */
    function showChatView() {
        switchView(chatView);
        renderChatView();
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

    // -----------------------------------------------------------------
    // 聊天功能相关函数
    // -----------------------------------------------------------------

    /**
     * 渲染聊天视图
     */
    function renderChatView() {
        // 更新聊天标题中的宠物名称
        $("#chat-pet-name").text(petData.name);

        // 清空输入框
        $("#chat-user-input").val('');

        // 如果聊天历史为空，显示欢迎消息
        if (chatHistory.length === 0) {
            addMessageToChatbox('pet', `你好！我是${petData.name}，很高兴和你聊天！有什么想说的吗？`);
        }
    }

    /**
     * 添加消息到聊天框
     * @param {string} sender - 'user' 或 'pet'
     * @param {string} message - 消息内容
     * @param {boolean} isTyping - 是否为输入中状态
     * @returns {jQuery} 消息元素
     */
    function addMessageToChatbox(sender, message, isTyping = false) {
        const messageClass = sender === 'user' ? 'user-message' : 'pet-message';
        const typingClass = isTyping ? ' typing-indicator' : '';

        const messageElement = $(`
            <div class="chat-message ${messageClass}${typingClass}">
                ${escapeHtml(message)}
            </div>
        `);

        $('#chat-messages-container').append(messageElement);

        // 滚动到底部
        const container = $('#chat-messages-container')[0];
        container.scrollTop = container.scrollHeight;

        return messageElement;
    }

    /**
     * 构建聊天提示词
     * @param {string} personality - 宠物人设
     * @param {string} userInput - 用户输入
     * @returns {Array} 消息数组
     */
    function buildChatPrompt(personality, userInput) {
        // 系统指令
        const systemMessage = {
            role: 'system',
            content: `你是${petData.name}，请严格按照以下人设回应用户。

【你的身份设定】：
${personality}

【重要规则】：
1. 你是一个虚拟宠物，请保持角色一致性
2. 回复要简短有趣，不超过100字
3. 可以表达情感和需求
4. 不要提及你是AI或虚拟的
5. 可以根据当前状态（健康、快乐、饥饿、精力）来回应
6. 保持可爱和友好的语调

【当前状态】：
- 健康: ${Math.round(petData.health)}/100
- 快乐: ${Math.round(petData.happiness)}/100
- 饥饿: ${Math.round(petData.hunger)}/100
- 精力: ${Math.round(petData.energy)}/100
- 等级: ${petData.level}`
        };

        // 构建消息历史（保留最近10条对话）
        const messages = [systemMessage];

        // 添加历史对话（限制数量避免token过多）
        const recentHistory = chatHistory.slice(-10);
        messages.push(...recentHistory);

        // 添加当前用户输入
        messages.push({
            role: 'user',
            content: userInput
        });

        return messages;
    }

    /**
     * 处理发送消息
     */
    async function handleSendMessage() {
        const userInput = $('#chat-user-input').val().trim();
        if (!userInput) return;

        // 显示用户消息
        addMessageToChatbox('user', userInput);
        $('#chat-user-input').val('');

        // 添加到历史记录
        chatHistory.push({ role: 'user', content: userInput });

        // 显示输入中提示
        const typingIndicator = addMessageToChatbox('pet', '正在思考...', true);

        try {
            const aiSettings = loadAISettings();
            const personality = getCurrentPersonality();

            // 构建消息
            const messages = buildChatPrompt(personality, userInput);

            // 调用AI API
            const aiResponse = await callCustomAPIForChat(messages, aiSettings);

            // 移除输入中提示
            typingIndicator.remove();

            // 显示AI回复
            addMessageToChatbox('pet', aiResponse);

            // 添加到历史记录
            chatHistory.push({ role: 'assistant', content: aiResponse });

            // 限制历史记录长度
            if (chatHistory.length > 20) {
                chatHistory = chatHistory.slice(-20);
            }

        } catch (error) {
            console.error(`[${extensionName}] Chat AI call failed:`, error);
            typingIndicator.remove();
            addMessageToChatbox('pet', "我好像有点累了，听不清你说什么...");
        }
    }

    /**
     * 为聊天功能调用自定义API
     * @param {Array} messages - 消息数组
     * @param {Object} settings - API设置
     * @returns {Promise<string>} AI回复
     */
    async function callCustomAPIForChat(messages, settings) {
        console.log(`[${extensionName}] 调用聊天API: ${settings.apiType}`);

        // 智能构建请求URL
        let apiUrl = settings.apiUrl;
        if (!apiUrl.includes('/chat/completions')) {
            if (apiUrl.endsWith('/')) {
                apiUrl = apiUrl + 'chat/completions';
            } else if (apiUrl.endsWith('/v1')) {
                apiUrl = apiUrl + '/chat/completions';
            } else {
                apiUrl = apiUrl + '/v1/chat/completions';
            }
        }

        const requestBody = {
            model: settings.apiModel || 'gpt-3.5-turbo',
            messages: messages,
            max_tokens: 150, // 聊天回复不需要太长
            temperature: 0.8, // 让回复更有趣一些
            stream: false
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.apiKey}`
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (data.choices && data.choices[0] && data.choices[0].message) {
            return data.choices[0].message.content.trim();
        } else {
            throw new Error('API返回格式错误');
        }
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

                        <!-- Firebase 云端备份设置 -->
                        <hr style="margin: 15px 0; border: none; border-top: 1px solid #444;">

                        <div class="flex-container">
                            <label style="display: block; margin-bottom: 8px; font-weight: bold;">
                                ☁️ 云端备份
                            </label>
                            <small class="notes" style="margin-bottom: 10px; display: block;">
                                跨设备同步宠物数据、AI设置和头像
                            </small>
                        </div>

                        <!-- 简化的状态和操作区域 -->
                        <div style="background: #f8f9fa; padding: 12px; border-radius: 6px; margin-bottom: 10px;">
                            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span id="firebase-status-icon">⚪</span>
                                    <span id="firebase-status-text" style="font-size: 0.9em;">未连接</span>
                                </div>
                                <button id="firebase-init-btn" class="firebase-btn firebase-btn-primary" style="padding: 6px 12px; font-size: 0.85em;">
                                    🔗 连接
                                </button>
                            </div>

                            <!-- 主设备功能 -->
                            <div id="firebase-primary-controls" style="display: none; margin-bottom: 10px;">
                                <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                                    <button id="firebase-generate-code-btn" class="firebase-btn firebase-btn-secondary" style="flex: 1; padding: 6px; font-size: 0.85em;">
                                        🔑 生成连接码
                                    </button>
                                    <button id="firebase-backup-now-btn" class="firebase-btn firebase-btn-success" style="flex: 1; padding: 6px; font-size: 0.85em;">
                                        ☁️ 备份
                                    </button>
                                </div>

                                <!-- 连接码显示 -->
                                <div id="firebase-connection-code-display" style="display: none; margin-bottom: 8px;">
                                    <label style="font-size: 0.85em; margin-bottom: 4px; display: block; color: #28a745; font-weight: bold;">
                                        🔑 连接码（分享给其他设备）
                                    </label>
                                    <div style="display: flex; gap: 8px; align-items: center;">
                                        <input type="text" id="firebase-connection-code-text" readonly
                                               style="flex: 1; padding: 8px; border: 2px solid #28a745; border-radius: 4px; background: #f8fff9; font-family: monospace; font-size: 16px; text-align: center; letter-spacing: 2px; font-weight: bold;">
                                        <button id="firebase-copy-code-btn" class="firebase-btn firebase-btn-outline" style="padding: 8px 12px; font-size: 0.85em;">
                                            📋 复制
                                        </button>
                                    </div>
                                    <small style="color: #28a745; margin-top: 4px; display: block; font-size: 0.8em; text-align: center;">
                                        ⏰ 有效期5分钟，请尽快在其他设备上使用
                                    </small>
                                </div>
                            </div>

                            <!-- 从设备功能 -->
                            <div id="firebase-secondary-controls">
                                <div style="display: flex; gap: 8px; align-items: center;">
                                    <input type="text" id="firebase-connection-code-input" placeholder="输入连接码"
                                           maxlength="6" style="flex: 1; padding: 6px; border: 1px solid #ddd; border-radius: 4px; font-family: monospace; font-size: 14px; text-align: center; text-transform: uppercase;">
                                    <button id="firebase-connect-btn" class="firebase-btn firebase-btn-primary" style="padding: 6px 12px; font-size: 0.85em;">
                                        连接
                                    </button>
                                </div>
                            </div>

                            <!-- 已连接后的管理功能 -->
                            <div id="firebase-management-controls" style="display: none; margin-top: 10px;">
                                <div style="display: flex; gap: 8px;">
                                    <button id="firebase-restore-btn" class="firebase-btn firebase-btn-info" style="flex: 1; padding: 6px; font-size: 0.85em;">
                                        📥 恢复
                                    </button>
                                    <button id="firebase-disconnect-btn" class="firebase-btn firebase-btn-danger" style="flex: 1; padding: 6px; font-size: 0.85em;">
                                        断开
                                    </button>
                                </div>
                            </div>
                        </div>
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
            chatView = $("#pet-chat-view");
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
        $("#goto-chat-btn").on("click touchend", (e) => {
            e.preventDefault();
            showChatView();
        });

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

        // 聊天相关按钮
        $("#chat-send-btn").on("click touchend", (e) => {
            e.preventDefault();
            handleSendMessage();
        });

        // 聊天输入框回车事件
        $("#chat-user-input").on("keypress", (e) => {
            if (e.which === 13 && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
            }
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

    // 插件初始化完成
    console.log(`[${extensionName}] ✅ 虚拟宠物系统初始化完成！`);

}); // jQuery ready 结束
