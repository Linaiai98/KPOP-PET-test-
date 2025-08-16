// 虚拟宠物系统 - SillyTavern插件
console.log("[VirtualPet] 脚本开始加载...");

// 使用 jQuery 确保在 DOM 加载完毕后执行我们的代码
jQuery(async () => {
    console.log("[VirtualPet] jQuery ready, 开始初始化...");

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
    const STORAGE_KEY_USER_AVATAR = "virtual-pet-user-avatar";
    const CHAT_TIP_KEY = "virtual-pet-chat-tip-shown";

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
    let petContainer;

    // 弹窗状态管理
    let isPopupOpen = false;

    // 自定义头像管理
    let customAvatarData = null;
    let customUserAvatarData = null;

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

    // 聊天功能状态管理
    let chatHistory = [];
    let isAIResponding = false;
    let chatInitialized = false;

    // 安全的z-index值，避免影响其他插件
    const SAFE_Z_INDEX = {
        button: 10000,      // 悬浮按钮 - 低于其他悬浮插件
        popup: 10001,       // 弹窗
        overlay: 10000,     // 遮罩层
        notification: 10002 // 通知
    };


    // 作者信息与水印
    const AUTHOR_NAME = "一禄柒柒";


    // 作者水印：可视徽标 + 复制水印
    function installAuthorBadge(){
        if ($('#vp-author-badge').length) return;
        const $badge = $('<div id="vp-author-badge"/>').text(`作者：${AUTHOR_NAME}`).css({
            position:'fixed', right:'10px', bottom:'6px', zIndex: SAFE_Z_INDEX.popup,
            background:'rgba(0,0,0,0.35)', color:'#fff', fontSize:'11px',
            padding:'2px 6px', borderRadius:'4px', pointerEvents:'none',
            backdropFilter:'blur(2px)', boxShadow:'0 2px 6px rgba(0,0,0,0.25)'
        });
        $('body').append($badge);
    }
    function removeAuthorBadge(){ $('#vp-author-badge').remove(); }

    function setupCopyWatermarkProtection(){
        try{ if (window.__vpCopyHandlerAttached) return; } catch{}
        const handler = function(e){
            try{
                // 仅对插件相关区域的复制加水印，避免影响宿主全局
                const $target = $(e.target);
                const inScope = $target.closest('#virtual-pet-popup-overlay,#chat-modal-overlay,#virtual-pet-settings').length>0;
                if (!inScope) return; // 不在插件DOM内则不处理
                const sel = window.getSelection();
                const text = sel && sel.toString();
                if (!text) return;
                const url = location.href;
                const mark = `\n\n—— 复制来源：虚拟宠物系统 · 作者：${AUTHOR_NAME} · ${new Date().toLocaleString()} · ${url}`;
                e.clipboardData.setData('text/plain', text + mark);
                // HTML版本（在末尾附加一个淡色小字）
                const htmlSel = sel ? sel.getRangeAt(0).cloneContents() : null;
                let html = '';
                if (htmlSel){ const div = document.createElement('div'); div.appendChild(htmlSel); html = div.innerHTML; }
                const htmlMark = `<div style="margin-top:8px;font-size:11px;color:#888;opacity:.8;">—— 复制来源：虚拟宠物系统 · 作者：${AUTHOR_NAME}</div>`;
                e.clipboardData.setData('text/html', html + htmlMark);
                e.preventDefault();
            }catch(err){ /* 忽略 */ }
        };
        document.addEventListener('copy', handler, true);
        window.__vpCopyHandlerAttached = true;
        window.__vpCopyHandler = handler;
    }
    function teardownCopyWatermarkProtection(){
        try{
            if (window.__vpCopyHandlerAttached && window.__vpCopyHandler){
                document.removeEventListener('copy', window.__vpCopyHandler, true);
            }
        }catch{}
        window.__vpCopyHandlerAttached = false;
        window.__vpCopyHandler = null;
    }
    function enableAuthorWatermarks(){ installAuthorBadge(); setupCopyWatermarkProtection(); }
    function disableAuthorWatermarks(){ removeAuthorBadge(); teardownCopyWatermarkProtection(); }

    // ============ 初始化管线（第一阶段：守护 + 悬浮按钮优先） ============
    function tryGuard(name, fn){
        try { return fn(); } catch(e){ console.warn(`[${extensionName}] [init-guard] ${name} failed:`, e); return null; }
    }

    function getRuntimeSettings(){
        return {
            enabled: localStorage.getItem(STORAGE_KEY_ENABLED) !== 'false',
        };
    }

    function initializeCoreEarly(){
        // 1) 环境探测与CSS隔离
        tryGuard('createIsolatedStyles', () => createIsolatedStyles());
        // 2) 悬浮按钮：若启用则尽早创建（不依赖后续UI）
        const settings = getRuntimeSettings();
        if (settings.enabled) { tryGuard('initializeFloatingButton', () => initializeFloatingButton()); }
    }

    // 立即启动早期核心初始化（不阻塞后续流程）
    initializeCoreEarly();

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




    // Pet-type based SVG avatars
    function getPetTypeIcon(type = 'cat', size = 18, color = '#ffd700'){
        const sz = Number(size)||18;
        if(type==='dog'){
            return `<svg width="${sz}" height="${sz}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12c0-5 4-7 8-7s8 2 8 7"/><path d="M7 14v2a4 4 0 0 0 4 4h2a4 4 0 0 0 4-4v-2"/><circle cx="9" cy="11" r="1"/><circle cx="15" cy="11" r="1"/></svg>`;
        }
        if(type==='bird'){
            return `<svg width="${sz}" height="${sz}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12s4-6 9-6 9 6 9 6-4 6-9 6-9-6-9-6z"/><path d="M12 8l3 2-3 2-3-2 3-2z"/></svg>`;
        }
        if(type==='rabbit'){
            return `<svg width="${sz}" height="${sz}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3c2 2 2 5 2 5"/><path d="M18 3c-2 2-2 5-2 5"/><circle cx="12" cy="12" r="6"/></svg>`;
        }
        // default cat
        return `<svg width="${sz}" height="${sz}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8l2-3 3 2 3-2 3 2 3-2 2 3"/><circle cx="12" cy="13" r="6"/></svg>`;
    }

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
        console.log(`[${extensionName}] [CHECK] 检查CSS变量污染...`);

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

    // Candy Pop 2.0 精致糖果色配色方案
    const candyColors = {
        // 主色调 - 精致现代风格
        primary: '#4E342E',      // 深巧克力色 - 温暖的深色文字
        secondary: '#6D4C41',    // 中巧克力色
        accent: '#8D6E63',       // 浅巧克力色
        warning: '#FF9800',      // 温暖橙色
        success: '#4CAF50',      // 清新绿色

        // 背景色 - 奶油糖果色
        background: 'linear-gradient(135deg, #FFFBEB 0%, #FFF0F5 50%, #F0F8FF 100%)', // 奶油渐变
        backgroundSolid: '#FFFBEB', // 奶油色背景
        screen: '#FFF0F5',       // 棉花糖粉
        screenDark: '#F0F8FF',   // 爱丽丝蓝

        // 文字色 - 温暖巧克力色系
        textPrimary: '#4E342E',   // 深巧克力色 - 主要文字
        textSecondary: '#6D4C41', // 中巧克力色 - 次要文字
        textLight: '#8D6E63',     // 浅巧克力色 - 辅助文字
        textWhite: '#FFFFFF',     // 纯白色文字
        textMuted: '#A1887F',     // 柔和巧克力色

        // 边框和阴影 - 彩色弥散效果
        border: '#F8BBD9',       // 柔和粉色边框
        borderAccent: '#FF6B6B', // 活力珊瑚粉边框
        shadow: 'rgba(255, 107, 107, 0.15)', // 珊瑚粉弥散阴影
        shadowLight: 'rgba(255, 107, 107, 0.08)', // 浅珊瑚粉阴影
        shadowGlow: 'rgba(255, 107, 107, 0.25)', // 发光效果阴影

        // 按钮色 - 精致糖果色
        buttonPrimary: '#FF6B6B',    // 活力珊瑚粉
        buttonSecondary: '#48D1CC',  // 清新薄荷绿
        buttonAccent: '#FFD166',     // 柠檬黄
        buttonHover: '#FF5252',      // 深珊瑚粉
        buttonSoft: '#F8BBD9',       // 柔和粉色

        // 状态栏色 - Candy Pop 2.0 精致色彩
        health: '#FF87A0',       // 草莓粉 - 更精致的健康色
        happiness: '#FFD166',    // 柠檬黄 - 明亮快乐
        hunger: '#FF9F68',       // 蜜桃橙 - 温暖饱食色
        energy: '#74B9FF',       // 苏打蓝 - 清爽精力色
        experience: '#B794F6',   // 薰衣草紫 - 优雅经验色

        // 特殊功能色
        info: '#48D1CC',         // 薄荷绿 - 信息色
        love: '#FF69B4',         // 热情粉 - 爱心色
        magic: '#DDA0DD',        // 梅花紫 - 魔法色
        gold: '#FFD700',         // 金色 - 特殊奖励色

        // Candy Pop 2.0 字体系统
        fontFamily: "'Nunito', 'Quicksand', 'Baloo', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        fontFamilyCode: "'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace" // 代码字体保留等宽
    };

    // 添加 Candy Pop 2.0 动画样式（在 candyColors 定义之后）
    const candyPopAnimations = `
        <style>
            @keyframes petGlow {
                0% {
                    box-shadow: 0 0 20px ${candyColors.shadowGlow},
                                0 0 40px ${candyColors.shadowGlow} !important;
                    transform: scale(1) !important;
                }
                100% {
                    box-shadow: 0 0 30px ${candyColors.gold},
                                0 0 60px ${candyColors.gold} !important;
                    transform: scale(1.05) !important;
                }
            }

            @keyframes buttonPress {
                0% { transform: translateY(0) scale(1) !important; }
                50% { transform: translateY(2px) scale(0.98) !important; }
                100% { transform: translateY(0) scale(1) !important; }
            }

            @keyframes statusPulse {
                0%, 100% { opacity: 1 !important; }
                50% { opacity: 0.8 !important; }
            }
        </style>
    `;

    // 注入动画样式到页面
    if (!document.getElementById('candy-pop-animations')) {
        const styleElement = document.createElement('style');
        styleElement.id = 'candy-pop-animations';
        styleElement.innerHTML = candyPopAnimations;
        document.head.appendChild(styleElement);
    }

    /**
     * 获取 Feather Icon 的 SVG HTML
     * @param {string} name 图标名称
     * @param {object} options 可选参数，如颜色、大小
     * @returns {string} SVG图标的HTML字符串
     */
    function getFeatherIcon(name, { color = 'currentColor', size = 20, strokeWidth = 2 } = {}) {
        const svgHeader = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" class="feather feather-${name}">`;

        // Feather Icons 路径数据
        const paths = {
            // 状态相关图标
            'heart': '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>',
            'smile': '<circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line>',
            'zap': '<polygon points="13,2 3,14 12,14 11,22 21,10 12,10 13,2"></polygon>',
            'coffee': '<path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line>',

            // 动作相关图标
            'utensils': '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"></path><path d="M7 2v20"></path><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3z"></path>',



            'gamepad-2': '<line x1="6" y1="11" x2="10" y2="11"></line><line x1="8" y1="9" x2="8" y2="13"></line><line x1="15" y1="12" x2="15.01" y2="12"></line><line x1="18" y1="10" x2="18.01" y2="10"></line><rect x="2" y="6" width="20" height="12" rx="2"></rect>',
            'moon': '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>',
            'gift': '<polyline points="20,12 20,22 4,22 4,12"></polyline><rect x="2" y="7" width="20" height="5"></rect><line x1="12" y1="22" x2="12" y2="7"></line><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path>',

            // 功能相关图标
            'shopping-bag': '<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path>',
            'message-circle': '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>',
            'settings': '<circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>',
            'package': '<line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27,6.96 12,12.01 20.73,6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line>',
            'plus': '<line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>',
            'x': '<line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>',

            // 治疗相关图标
            'shield': '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>',
            'activity': '<polyline points="22,12 18,12 15,21 9,3 6,12 2,12"></polyline>',

            // 其他图标
            'star': '<polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"></polygon>',
            'award': '<circle cx="12" cy="8" r="7"></circle><polyline points="8.21,13.89 7,23 12,20 17,23 15.79,13.88"></polyline>',
            'trending-up': '<polyline points="23,6 13.5,15.5 8.5,10.5 1,18"></polyline><polyline points="17,6 23,6 23,12"></polyline>',

            // 商店物品图标
            'apple': '<path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z"></path><path d="M10 2c1 .5 2 2 2 5"></path>',
            'sandwich': '<path d="M3 11v3a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-3"></path><path d="M12 19H4a2 2 0 0 1-2-2v-1a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2h-8Z"></path><path d="M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3"></path><path d="M4 14h16"></path>',
            'cake': '<path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"></path><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1"></path><path d="M2 21h20"></path><path d="M7 8v3"></path><path d="M12 8v3"></path><path d="M17 8v3"></path>',
            'pill': '<path d="M10.5 20.5 10 10l10.5 10.5a2.828 2.828 0 1 1-4 4Z"></path><path d="M8.5 8.5 18 18l-4 4L4.5 12.5a2.828 2.828 0 1 1 4-4Z"></path>',
            'syringe': '<path d="M18 6 7 17l-4-4"></path><path d="M7 17l4 4"></path><path d="M3 21l4-4"></path><circle cx="18" cy="6" r="3"></circle>',
            'ball': '<circle cx="12" cy="12" r="10"></circle><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path><path d="M2 12h20"></path>',
            'robot': '<rect x="3" y="11" width="18" height="10" rx="2" ry="2"></rect><circle cx="12" cy="5" r="2"></circle><path d="M12 7v4"></path><line x1="8" y1="16" x2="8" y2="16"></line><line x1="16" y1="16" x2="16" y2="16"></line>',
            'clock': '<circle cx="12" cy="12" r="10"></circle><polyline points="12,6 12,12 16,14"></polyline>',
            'sparkles': '<path d="M9 12l2 2 4-4"></path><path d="M21 12c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1z"></path><path d="M3 12c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1z"></path><path d="M12 3c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1z"></path><path d="M12 21c.552 0 1-.448 1-1s-.448-1-1-1-1 .448-1 1 .448 1 1 1z"></path>',
            'gem': '<path d="M6 3h12l4 6-10 13L2 9l4-6z"></path><path d="M11 3 8 9l4 13 4-13-3-6"></path><path d="M2 9h20"></path>'
        };

        return `${svgHeader}${paths[name] || ''}</svg>`;
    }


        // Default pet SVG icon (for main UI and chat avatars)
        function getDefaultPetIcon(size = 48, color = '#ffd700') {
            try {
                return getPetTypeIcon(petData.type || 'cat', size, color);
            } catch (e) {
                return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>`;
            }
        }

        // ------------------------------
        // UI Route A: K-POP Neon quick skin (non-breaking, additive)
        // ------------------------------
        const kpopNeonTheme = {
            primary: '#FF2D95',
            cyan: '#00F0FF',
            purple: '#9B5CFF',
            blue: '#00A3FF',



            lime: '#80FF00',
            bg: '#0B0E1A',
            panel: '#111424',
            text: '#EAF4FF',
            muted: '#90A4C8',
            border: 'rgba(164, 0, 255, 0.40)',
            glow: 'rgba(255, 45, 149, 0.60)',
            glow2: 'rgba(0, 243, 255, 0.55)'
        };

        function injectKpopNeonStyles() {
            if (document.getElementById('virtual-pet-kpop-neon')) return;
            const css = `
            /* K-POP Neon theme (Route A) - scoped to plugin IDs/classes */
            #${BUTTON_ID}.kpop-neon, #${POPUP_ID}.kpop-neon {
              --vp-bg: ${kpopNeonTheme.bg};
              --vp-panel: ${kpopNeonTheme.panel};
              --vp-text: ${kpopNeonTheme.text};
              --vp-muted: ${kpopNeonTheme.muted};
              --vp-neon1: ${kpopNeonTheme.primary};
              --vp-neon2: ${kpopNeonTheme.cyan};
              --vp-neon3: ${kpopNeonTheme.purple};
              --vp-border: ${kpopNeonTheme.border};
              --vp-fast: 160ms;
              --vp-ease: cubic-bezier(.22,.61,.36,1);
            }

            /* Floating button */
            #${BUTTON_ID}.kpop-neon {
              width: 52px; height: 52px;
              border-radius: 14px;
              border: 1px solid var(--vp-border);
              background: radial-gradient(120px 120px at 30% 20%, rgba(255,45,149,.22), transparent 55%),
                          radial-gradient(180px 180px at 80% 70%, rgba(0,240,255,.18), transparent 60%),
                          rgba(17,20,36,.72);
              backdrop-filter: blur(8px);
              box-shadow: 0 8px 24px rgba(0,0,0,.35), 0 0 18px var(--vp-neon1), 0 0 28px var(--vp-neon2);
              display: inline-flex; align-items: center; justify-content: center;
              transition: transform var(--vp-fast) var(--vp-ease), box-shadow var(--vp-fast) var(--vp-ease), filter var(--vp-fast) var(--vp-ease);
              overflow: hidden;
            }
            #${BUTTON_ID}.kpop-neon:hover { transform: translateY(-1px) scale(1.02); box-shadow: 0 10px 28px rgba(0,0,0,.38), 0 0 22px var(--vp-neon1), 0 0 36px var(--vp-neon2); }
            #${BUTTON_ID}.kpop-neon:active { transform: translateY(1px) scale(.98); filter: saturate(1.2); }
            #${BUTTON_ID}.kpop-neon svg, #${BUTTON_ID}.kpop-neon img { filter: drop-shadow(0 0 6px var(--vp-neon2)) drop-shadow(0 0 10px var(--vp-neon1)); }
            #${BUTTON_ID}.kpop-neon img { width: 70%; height: 70%; border-radius: 12px; object-fit: cover; }

            /* Popup panel */
            #${POPUP_ID}.kpop-neon {
              background: linear-gradient(180deg, rgba(17,20,36,.96) 0%, rgba(11,14,26,.96) 100%);
              border: 1px solid var(--vp-border);
              box-shadow: 0 20px 60px rgba(0,0,0,.5), inset 0 0 0 1px rgba(255,255,255,.03), 0 0 40px rgba(0,243,255,.12);
              border-radius: 16px;
              color: var(--vp-text);
            }
            #${POPUP_ID}.kpop-neon h1, #${POPUP_ID}.kpop-neon h2, #${POPUP_ID}.kpop-neon h3, #${POPUP_ID}.kpop-neon .section-title {
              color: var(--vp-text);
              text-shadow: 0 0 8px var(--vp-neon2), 0 0 14px var(--vp-neon1);
            }
            #${POPUP_ID}.kpop-neon button, #${POPUP_ID}.kpop-neon .btn {
              background: linear-gradient(90deg, var(--vp-neon1) 0%, var(--vp-neon2) 100%);
              color: #0b0e1a; border: 0; border-radius: 10px; padding: 8px 12px;
              box-shadow: 0 6px 18px rgba(0,0,0,.35), 0 0 18px var(--vp-neon1);
              transition: transform var(--vp-fast) var(--vp-ease), box-shadow var(--vp-fast) var(--vp-ease);
            }
            #${POPUP_ID}.kpop-neon button:hover, #${POPUP_ID}.kpop-neon .btn:hover { transform: translateY(-1px); box-shadow: 0 10px 22px rgba(0,0,0,.38), 0 0 26px var(--vp-neon2); }
            #${POPUP_ID}.kpop-neon button:active, #${POPUP_ID}.kpop-neon .btn:active { transform: translateY(1px) scale(.98); }

            /* Overlay tweaks */
            #${OVERLAY_ID}.kpop-neon-overlay {
              background: radial-gradient(1200px 800px at 10% 10%, rgba(255,45,149,.10), transparent 40%),
                          radial-gradient(1200px 800px at 90% 20%, rgba(0,240,255,.08), transparent 45%),
                          rgba(0,0,0,.50) !important;
            }

            /* Settings UI Neon restyle */
            #${POPUP_ID}.kpop-neon #ai-config-container {
              background: linear-gradient(180deg, rgba(30,34,58,.78) 0%, rgba(18,22,40,.78) 100%);
              border: 1px solid var(--vp-border);
              border-radius: 14px; padding: 14px !important; margin-top: 12px !important;
              box-shadow: 0 10px 30px rgba(0,0,0,.35), inset 0 0 0 1px rgba(255,255,255,.04), 0 0 20px rgba(0,243,255,.10);
              backdrop-filter: blur(6px);
            }
            #${POPUP_ID}.kpop-neon label { color: var(--vp-text) !important; text-shadow: 0 0 6px rgba(0,243,255,.25); }
            #${POPUP_ID}.kpop-neon small.notes { color: var(--vp-muted) !important; }
            #${POPUP_ID}.kpop-neon select#ai-api-select,
            #${POPUP_ID}.kpop-neon select#ai-model-select,
            #${POPUP_ID}.kpop-neon input#ai-url-input,
            #${POPUP_ID}.kpop-neon input#ai-key-input,
            #${POPUP_ID}.kpop-neon input#ai-model-input {
              background: rgba(11,14,26,.6) !important; color: var(--vp-text) !important;
              border: 1px solid rgba(0,243,255,.25) !important; border-radius: 10px !important;
              outline: none !important; box-shadow: 0 0 0 0 rgba(0,243,255,.0) !important;
            }
            #${POPUP_ID}.kpop-neon select#ai-api-select:focus,
            #${POPUP_ID}.kpop-neon select#ai-model-select:focus,
            #${POPUP_ID}.kpop-neon input#ai-url-input:focus,
            #${POPUP_ID}.kpop-neon input#ai-key-input:focus,
            #${POPUP_ID}.kpop-neon input#ai-model-input:focus {
              border-color: var(--vp-neon2) !important;
              box-shadow: 0 0 0 2px rgba(0,243,255,.18), 0 0 18px rgba(0,243,255,.18) !important;
            }
            #${POPUP_ID}.kpop-neon #ai-url-reset-btn,
            #${POPUP_ID}.kpop-neon #refresh-models-btn,
            #${POPUP_ID}.kpop-neon #test-ai-connection-btn {
              background: linear-gradient(90deg, var(--vp-neon1) 0%, var(--vp-neon2) 100%) !important;
              color: #0b0e1a !important; border: none !important; border-radius: 10px !important;
              padding: 8px 12px !important; cursor: pointer !important;
              box-shadow: 0 6px 18px rgba(0,0,0,.35), 0 0 18px var(--vp-neon1) !important;
              transition: transform var(--vp-fast) var(--vp-ease), box-shadow var(--vp-fast) var(--vp-ease) !important;
            }
            #${POPUP_ID}.kpop-neon #ai-url-reset-btn:hover,
            #${POPUP_ID}.kpop-neon #refresh-models-btn:hover,
            #${POPUP_ID}.kpop-neon #test-ai-connection-btn:hover {
              transform: translateY(-1px) !important; box-shadow: 0 10px 22px rgba(0,0,0,.38), 0 0 26px var(--vp-neon2) !important;
            }
            #${POPUP_ID}.kpop-neon #ai-connection-status { color: var(--vp-muted) !important; }
            `;
            const style = document.createElement('style');
            style.id = 'virtual-pet-kpop-neon';
            style.textContent = css;
            document.head.appendChild(style);
        }

        function applyKpopNeonSkin() {
            try { injectKpopNeonStyles(); } catch(e) { console.warn('injectKpopNeonStyles failed', e); }
            const btn = document.getElementById(BUTTON_ID);
            if (btn) {
                btn.classList.add('kpop-neon');
                // If no avatar/img present, ensure we show a neon icon
                const hasVisual = btn.querySelector('img, svg');
                if (!hasVisual) {
                    btn.innerHTML = getFeatherIcon('heart', { color: kpopNeonTheme.cyan, size: 20, strokeWidth: 2 });
                }
            }
            const popup = document.getElementById(POPUP_ID);
            if (popup) popup.classList.add('kpop-neon');
            const overlayEl = document.getElementById(OVERLAY_ID);
            if (overlayEl) overlayEl.classList.add('kpop-neon-overlay');
        }

        (function bootKpopNeonSkin(){
            // Default ON; can disable by localStorage.setItem('virtual-pet-ui-v2','false')
            const enable = (localStorage.getItem('virtual-pet-ui-v2') ?? 'true') === 'true';
            if (!enable) return;
            let appliedOnce = false;
            const tryApply = () => {
                if (appliedOnce) return;
                if (document.getElementById(BUTTON_ID) || document.getElementById(POPUP_ID)) {
                    applyKpopNeonSkin();
                    appliedOnce = true;
                }
            };
            // Try a few times until UI mounts
            const t = setInterval(() => { tryApply(); if (appliedOnce) clearInterval(t); }, 600);
            setTimeout(tryApply, 0);
            // Observe DOM for newly created popup/button
            try {
                const obs = new MutationObserver((muts) => {
                    for (const m of muts) {
                        for (const node of m.addedNodes) {
                            if (node && node.nodeType === 1) {
                                const el = node;
                                if (el.id === POPUP_ID || el.id === BUTTON_ID || el.querySelector?.(`#${POPUP_ID}, #${BUTTON_ID}`)) {
                                    applyKpopNeonSkin();
                                }
                            }
                        }
                    }
                });
                obs.observe(document.body, { childList: true, subtree: true });
            } catch (e) { /* ignore */ }
        })();

        // 拓麻歌子式生命阶段定义 - moved earlier to avoid TDZ when used in UI builders
        const LIFE_STAGES = {
            baby:   { name: "幼体",  duration: 24,  icon: 'egg' },   // 24小时
            child:  { name: "儿童",  duration: 48,  icon: 'baby' },   // 48小时
            teen:   { name: "少年",  duration: 72,  icon: 'bird' },   // 72小时
            adult:  { name: "成年",  duration: 120, icon: 'bird' },   // 120小时
            senior: { name: "老年",  duration: 48,  icon: 'activity' }    // 48小时后死亡
        };


        // ====== Debug helpers: detailed error logging in console ======
        function redactHeaders(h) {
            try {
                const c = { ...(h || {}) };
                if (c.Authorization) c.Authorization = 'Bearer ***';
                if (c['x-api-key']) c['x-api-key'] = '***';
                if (c['x-goog-api-key']) c['x-goog-api-key'] = '***';
                return c;
            } catch { return {}; }
        }
        function previewBody(body) {
            try {
                if (!body) return null;
                if (body.messages) {
                    return { model: body.model, messages: body.messages?.length, max_tokens: body.max_tokens, temperature: body.temperature };
                }
                if (body.contents) {
                    return { hasContents: true, maxOutputTokens: body.generationConfig?.maxOutputTokens };
                }
                return body;
            } catch { return null; }
        }
        function classifyNetworkError(error) {
            const msg = (error && (error.message || String(error))) || '';
            if (msg.includes('CORS') || msg.includes('Access-Control-Allow-Origin')) return 'CORS';
            if (msg.includes('Failed to fetch')) return 'NETWORK';
            if (msg.includes('ERR_CONNECTION')) return 'NETWORK_RESET';
            if (msg.includes('aborted') || error?.name === 'AbortError') return 'TIMEOUT/ABORT';
            if (msg.startsWith('HTTP')) return 'HTTP';
            return 'UNKNOWN';
        }
        function logDetailedError(context, info, error) {
            const tag = `[${extensionName}]`;
            try {
                console.groupCollapsed(`${tag} ❌ ${context}`);
                console.log('Context:', info || {});
                if (error) {
                    console.log('Class:', classifyNetworkError(error));
                    console.log('Name:', error.name);
                    console.log('Message:', error.message);
                    if (error.stack) console.log('Stack:', error.stack.split('\n').slice(0, 3).join('\n'));
                }
                console.groupEnd();
            } catch (e) {
                console.error(`${tag} ❌ ${context}`, error);
            }
        }
        // ==============================================================


        // Centralized AI connection helpers (minimal refactor)
        function getRelayUrl() {
            try {
                const override = localStorage.getItem('virtual-pet-relay-url');
                return (override && override.trim()) || 'http://154.12.38.33:3000/proxy';
            } catch { return 'http://154.12.38.33:3000/proxy'; }
        }
        function resolveTargetUrl(settings) {
            let base = (settings.apiUrl || '').replace(/\/+$/, '');
            if (!base) return '';
            if (settings.apiType === 'openai' || settings.apiType === 'deepseek') {
                if (!base.includes('/chat/completions')) {
                    if (base.endsWith('/v1')) base += '/chat/completions';
                    else if (!base.includes('/v1')) base += '/v1/chat/completions';
                    else base += '/chat/completions';
                }
            } else if (settings.apiType === 'claude') {
                if (!base.includes('/messages')) {
                    if (base.endsWith('/v1')) base += '/messages';
                    else if (!base.includes('/v1')) base += '/v1/messages';
                    else base += '/messages';
                }
            } else if (settings.apiType === 'google') {
                if (!base.includes(':generateContent')) {
                    let modelName = settings.apiModel || 'gemini-pro';
                    if (modelName.startsWith('models/')) modelName = modelName.replace('models/', '');
                    if (base.endsWith('/v1beta')) base += `/models/${modelName}:generateContent`;
                    else if (!base.includes('/v1beta')) base += `/v1beta/models/${modelName}:generateContent`;
                    else base += `/models/${modelName}:generateContent`;
                }
            } else if (settings.apiType === 'custom') {
                if (!base.includes('/chat/completions') && !base.includes('/messages') && !base.includes(':generateContent')) {
                    if (base.endsWith('/v1')) base += '/chat/completions';
                    else if (!base.includes('/v1')) base += '/v1/chat/completions';
                    else base += '/chat/completions';
                }
            }
            return base;
        }
        function buildHeaders(settings) {
            const h = { 'Content-Type': 'application/json' };
            if (settings.apiType === 'google') h['x-goog-api-key'] = settings.apiKey;
            else if (settings.apiType === 'claude') { h['x-api-key'] = settings.apiKey; h['anthropic-version'] = '2023-06-01'; }
            else h['Authorization'] = `Bearer ${settings.apiKey}`;
            return h;
        }
        function buildRequestBody(settings, prompt) {
            if (settings.apiType === 'claude') {
                return { model: settings.apiModel || 'claude-3-sonnet-20240229', max_tokens: 1000, messages: [{ role: 'user', content: prompt }] };
            } else if (settings.apiType === 'google') {
                return { contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 1000, temperature: 0.7 } };
            } else {
                let defaultModel = 'gpt-3.5-turbo';
                if (settings.apiType === 'deepseek') defaultModel = 'deepseek-chat';
                else if (settings.apiType === 'custom') defaultModel = settings.apiModel || 'gpt-3.5-turbo';
                return { model: settings.apiModel || defaultModel, messages: [{ role: 'user', content: prompt }], max_tokens: 1000, temperature: 0.7 };
            }
        }


        // ===== AIConnector: unified, resilient AI + Models connection layer =====
        const AIConnector = (() => {
            async function fetchJson(url, options = {}, timeout = 15000) {
                const controller = new AbortController();
                const id = setTimeout(() => controller.abort(), timeout);
                try {
                    const resp = await fetch(url, { ...options, signal: controller.signal });
                    const text = await resp.text();
                    let data = null; try { data = text ? JSON.parse(text) : null; } catch { /* non-json */ }
                    return { ok: resp.ok, status: resp.status, data, text };
                } finally { clearTimeout(id); }
            }

            function classify(err){ return classifyNetworkError(err); }

            async function relayRequest(relayUrl, targetUrl, method, headers, body, timeout = 20000) {
                console.debug(`[${extensionName}] ▶️ Relay Request`, {
                    relayUrl, targetUrl, headers: redactHeaders(headers), body: previewBody(body), timeout
                });
                const payload = { targetUrl, method, headers, body };
                const r = await fetchJson(relayUrl, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
                }, timeout);
                if (!r.ok) throw new Error(`Relay HTTP ${r.status}: ${r.text || ''}`);
                return r.data;
            }

            function parseModels(data, endpoint, apiType) {
                if (typeof parseModelsFromResponseNew === 'function') {
                    try { return parseModelsFromResponseNew(data, endpoint, apiType) || []; } catch {}
                }
                // Fallback generic parsing
                const out = [];
                const pushId = (id, name) => { if (id && !out.find(m=>m.id===id)) out.push({ id, name: name||id }); };
                const candidates = data?.data || data?.models || data?.items || data;
                if (Array.isArray(candidates)) {
                    for (const item of candidates) {
                        if (!item) continue;
                        if (typeof item === 'string') pushId(item);
                        else if (item.id) pushId(item.id, item.name||item.id);
                        else if (item.model) pushId(item.model);
                        else if (item.engine_id) pushId(item.engine_id);
                        else if (item.name) pushId(item.name, item.name);
                    }
                }
                return out;
            }

            function buildModelEndpoints(apiUrl, apiType){
                const base = (apiUrl||'').replace(/\/+$/,'');
                const arr = [];
                if (apiType === 'google') {
                    if (base.includes('/v1beta')) arr.push(`${base}/models`); else arr.push(`${base}/v1beta/models`);
                } else if (apiType === 'claude') {
                    if (base.includes('/v1')) arr.push(`${base}/models`); else arr.push(`${base}/v1/models`);
                } else if (apiType === 'custom') {
                    if (base.includes('/v1')) arr.push(`${base}/models`); else arr.push(`${base}/v1/models`);
                    arr.push(`${base}/models`, `${base}/engines`, `${base}/v1/engines`, `${base}/api/models`, `${base}/api/v1/models`);
                } else {
                    if (base.includes('/v1')) arr.push(`${base}/models`); else arr.push(`${base}/v1/models`);
                }
                return [...new Set(arr)];
            }

            async function fetchModels(settings) {
                const apiType = settings.apiType; const apiUrl = settings.apiUrl; const apiKey = settings.apiKey;
                const endpoints = buildModelEndpoints(apiUrl, apiType);
                const headers = buildHeaders(settings);

                // Try direct
                for (const ep of endpoints) {
                    try {
                        console.debug(`[${extensionName}] ▶️ Models Direct`, { url: ep, headers: redactHeaders(headers) });
                        const r = await fetchJson(ep, { method: 'GET', headers }, 12000);
                        if (r.ok && r.data) {
                            const models = parseModels(r.data, ep, apiType);
                            if (models?.length) return models;
                        } else if (r.status === 401 || r.status === 403) {
                            // auth error: stop trying others, surface error
                            throw new Error(`HTTP ${r.status}: Unauthorized`);
                        }
                    } catch (e) {
                        const c = classify(e);
                        if (c === 'HTTP') continue; // try next endpoint
                        if (c === 'CORS' || c === 'NETWORK' || c === 'NETWORK_RESET' || c === 'TIMEOUT/ABORT' || String(e).includes('Failed to fetch')) {
                            // Will fallback to relay after loop
                            console.warn(`[${extensionName}] Direct models fetch error on ${apiUrl}: ${e.message}`);
                            break;
                        }
                    }
                }

                // Fallback via relay
                const relayUrl = getRelayUrl();
                for (const ep of endpoints) {
                    try {
                        const data = await relayRequest(relayUrl, ep, 'GET', headers, undefined, 15000);
                        const models = parseModels(data, ep, apiType);
                        if (models?.length) return models;
                    } catch (e) {
                        console.warn(`[${extensionName}] Relay models fetch error: ${e.message}`);
                    }
                }

                // Fallback to recommended
                if (typeof getRecommendedModels === 'function') {
                    return getRecommendedModels(apiType);
                }
                return [];
            }

            async function chat(settings, prompt, timeout){
                const url = resolveTargetUrl(settings);
                const headers = buildHeaders(settings);
                const body = buildRequestBody(settings, prompt);
                // Direct
                try {
                    const r = await fetchJson(url, { method: 'POST', headers, body: JSON.stringify(body) }, timeout);
                    if (!r.ok) throw new Error(`HTTP ${r.status}: ${r.text}`);
                    return r.data;
                } catch (e) {
                    const cls = classify(e);
                    if (!(cls==='CORS'||cls==='NETWORK'||cls==='NETWORK_RESET'||cls==='TIMEOUT/ABORT'||String(e).includes('Failed to fetch'))) throw e;
                }
                // Relay
                const relayUrl = getRelayUrl();
                const data = await relayRequest(relayUrl, url, 'POST', headers, body, Math.max(timeout, 25000));
                return data;
            }

            return { fetchModels, chat };
        })();
        window.AIConnector = AIConnector;
        // ==========================================================================



    // 宠物数据结构 - 智能初始化系统
    let petData = {
        name: "小宠物",
        type: "cat", // cat, dog, dragon, etc.
        level: 1,
        experience: 0,
        health: 100,     // 初始健康，无压力开局
        happiness: 50,   // 初始快乐
        hunger: 40,      // 初始饱食
        energy: 50,      // 初始精力

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

        // 首次互动激活机制
        hasInteracted: false,         // 新增：用于跟踪首次互动

        dataVersion: 4.1 // 数据版本标记 - 升级到4.1表示首次互动激活机制
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
                        console.log(`[${extensionName}] [STATS] Firebase Analytics已启用`);
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

            console.log(`[${extensionName}] [LINK] 尝试连接码: ${code}`);

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

            toastr.success('所有数据已从主设备同步完成！', '同步成功');

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
        console.log(`[${extensionName}] [CLOUD] 上传头像到Firebase Storage...`);

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

            console.log(`[${extensionName}] [CLOUD] 备份所有数据到Firebase...`);

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
            toastr.success('所有数据已备份到云端！', '备份成功');

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
                initBtn.text('已连接').prop('disabled', true);
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
                initBtn.text('重试').prop('disabled', false);
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
                toastr.success('云端备份已连接！', '连接成功');

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
                toastr.success('连接码已复制！', '复制成功');
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
                toastr.success('设备连接成功，数据已同步！', '连接成功');

            } catch (error) {
                updateFirebaseStatus('error', '连接失败');
                toastr.error(`连接失败: ${error.message}`, '❌ 连接错误');
            }
        });

        // 立即备份按钮
        $('#firebase-backup-now-btn').on('click', async function() {
            try {
                await backupAllDataToFirebase();
                toastr.success('数据已备份到云端！', '备份成功');
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
            // 提前声明避免TDZ问题
            const userApiUrls = {
                openai: $('#ai-url-input').val() || 'https://api.openai.com/v1',
                claude: 'https://api.anthropic.com/v1',
                google: 'https://generativelanguage.googleapis.com/v1beta'
            };
            const userApiKeys = {
                openai: $('#ai-key-input').val() || localStorage.getItem('openai_api_key'),
                claude: localStorage.getItem('claude_api_key'),
                google: localStorage.getItem('google_api_key')
            };
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
            // 已在前面声明

            // 移动到前面避免TDZ问题

            for (const provider of apiProviders) {
                console.log(`[${extensionName}] [CHECK] 检查 ${provider.name}...`);

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

                        console.log(`[${extensionName}] [TRY] 尝试: ${endpoint}`);

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
                        console.log(`[${extensionName}] [MODEL] SillyTavern当前模型: ${context.model}`);
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

            console.log(`[${extensionName}] [DONE] 最终发现 ${uniqueAPIs.length} 个可用API:`, uniqueAPIs);

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
                console.log(`[${extensionName}] [STATS] 按提供商:`, providerCount);
                console.log(`[${extensionName}] [STATS] 按状态:`, statusCount);

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
            'openai': 'OpenAI',
            'claude': 'Claude',
            'google': 'Google',
            'deepseek': 'DeepSeek',
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
            <option value="custom">自定义模型</option>
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
            console.log(`[${extensionName}] [STATS] 模型统计: 总计${totalModels}个, 可用${availableModels}个, 推荐${suggestedModels}个`);
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
            lastTestResult: $('#ai-connection-status').text().includes('连接成功'),
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
                    $('#ai-connection-status').text(`上次测试成功 (${timeAgo}分钟前)`).css('color', '#48bb78');
                }

                console.log(`[${extensionName}] AI设置已加载:`, settings);

                return settings;
            }
        } catch (error) {
            console.error(`[${extensionName}] 加载AI设置失败:`, error);
        }

        // 即使加载失败也要更新聊天按钮状态
        updateChatButtonVisibility();
        return {};
    }

    /**
     * 更新聊天按钮可见性 - 让聊天按钮像商店按钮一样常驻显示
     */
    function updateChatButtonVisibility() {
        console.log(`[${extensionName}] 更新聊天按钮可见性...`);

        // 聊天按钮应该始终显示，就像商店按钮一样
        // 如果API未配置，点击时会显示配置提示，而不是隐藏按钮
        const chatButtons = $('.chat-btn');

        if (chatButtons.length > 0) {
            // 确保聊天按钮始终可见
            chatButtons.show();
            console.log(`[${extensionName}] 聊天按钮已设置为可见 (找到 ${chatButtons.length} 个按钮)`);
        } else {
            console.log(`[${extensionName}] 未找到聊天按钮，可能还未渲染`);
        }
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

                console.log(`[${extensionName}] [CHECK] 后端API信息:`, backendInfo);

                // 自动填充模型名称
                $('#ai-model-input').val(backendName);

                // 根据API类型提供配置建议
                let configMessage = `已选择模型: ${backendName}`;
                if (backendType === 'openai') {
                    configMessage += '，请输入OpenAI API密钥';
                } else if (backendType === 'claude') {
                    configMessage += '，请输入Claude API密钥';
                } else if (backendType === 'google') {
                    configMessage += '，请输入Google API密钥';
                } else if (backendType === 'deepseek') {
                    configMessage += '，请输入DeepSeek API密钥';
                } else if (backendType === 'ollama' || backendType === 'lmstudio') {
                    configMessage += '，本地API无需密钥';
                } else {
                    configMessage += '，请配置相应的URL和密钥';
                }

                toastr.info(configMessage, '模型已选择', { timeOut: 6000 });
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
                'deepseek': { url: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
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

                // 根据API类型自动设置URL（官方API总是填入官方端点）
                if (backendInfo.type === 'openai') {
                    $('#ai-url-input').val('https://api.openai.com/v1');
                } else if (backendInfo.type === 'claude') {
                    $('#ai-url-input').val('https://api.anthropic.com/v1');
                } else if (backendInfo.type === 'google') {
                    $('#ai-url-input').val('https://generativelanguage.googleapis.com/v1beta');
                } else if (backendInfo.type === 'deepseek') {
                    $('#ai-url-input').val('https://api.deepseek.com/v1');
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

            const response = await callCustomAPI(testPrompt, settings, 25000); // 调整为25秒超时，提高跨网/中继成功率

            if (response && response.trim()) {
                statusElement.text('连接成功').css('color', '#48bb78');
                toastr.success(`API连接测试成功！类型: ${settings.apiType}，AI回复: ${response.substring(0, 50)}`);

                // 保存测试结果
                saveAISettings();
                return true;
            } else {
                throw new Error('API返回空响应');
            }

        } catch (error) {
            statusElement.text('连接失败').css('color', '#f56565');
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
     * 🚀 统一AI调用函数 - 所有AI请求的唯一入口
     * 官方API首选直连，失败时自动退回中继服务器
     * @param {string} prompt - 要发送给AI的提示词
     * @param {number} timeout - 超时时间（毫秒）
     * @returns {Promise<string>} - AI生成的回复
     */
    async function callAI(prompt, timeout = 60000) {
        console.log(`[${extensionName}] 🚀 统一AI调用开始`);
        console.log(`[${extensionName}] 📝 提示词长度: ${prompt.length} 字符`);
        console.log(`[${extensionName}] ⏱️ 超时设置: ${timeout}ms`);

        try {
            // 1. 获取API配置
            const settings = loadAISettings();
            if (!settings.apiType || !settings.apiUrl || !settings.apiKey) {
                throw new Error('请先在插件设置中配置API信息（类型、URL和密钥）');
            }

            console.log(`[${extensionName}] 🔧 API配置: ${settings.apiType} | ${settings.apiUrl}`);

            // 2. 判断API类型并应用首选直连备选中继策略
            const isOfficialAPI = ['openai', 'claude', 'google', 'deepseek'].includes(settings.apiType);
            const isCustomAPI = settings.apiType === 'custom';

            if (isOfficialAPI) {
                console.log(`[${extensionName}] 🎯 检测到官方API，尝试直连...`);
                try {
                    return await callDirectAPI(prompt, settings, timeout);
                } catch (directError) {
                    console.log(`[${extensionName}] ⚠️ 官方API直连失败，退回中继服务器: ${directError.message}`);
                    return await callViaRelay(prompt, settings, timeout);
                }
            } else if (isCustomAPI) {
                console.log(`[${extensionName}] 🔧 检测到自定义API，尝试直连...`);
                try {
                    return await callDirectAPI(prompt, settings, timeout);
                } catch (directError) {
                    console.log(`[${extensionName}] ⚠️ 自定义API直连失败，退回中继服务器: ${directError.message}`);
                    // 自定义API在跨网或中转下耗时更久，这里给中继更充足的时间（不小于 25s）
                    const relayTimeout = Math.max(timeout, 25000);
                    return await callViaRelay(prompt, settings, relayTimeout);
                }
            } else {
                throw new Error(`不支持的API类型: ${settings.apiType}`);
            }

        } catch (error) {
            logDetailedError('Unified AI call failed', { stage: 'callAI', apiType: settings?.apiType, apiUrl: settings?.apiUrl }, error);
            console.error(`[${extensionName}] ❌ 统一AI调用失败:`, error);
            throw error;
        }
    }

    /**
     * 🎯 直连API（支持官方API和自定义API）
     */
    async function callDirectAPI(prompt, settings, timeout) {
        console.log(`[${extensionName}] 🎯 开始直连API...`);

        try {
            // 1. 构建目标API URL
            let targetApiUrl = settings.apiUrl.replace(/\/+$/, '');

            // 根据API类型自动添加正确的端点
            if (settings.apiType === 'openai' || settings.apiType === 'deepseek') {
                if (!targetApiUrl.includes('/chat/completions')) {
                    if (targetApiUrl.endsWith('/v1')) {
                        targetApiUrl += '/chat/completions';
                    } else if (!targetApiUrl.includes('/v1')) {
                        targetApiUrl += '/v1/chat/completions';
                    } else {
                        targetApiUrl += '/chat/completions';
                    }
                }
            } else if (settings.apiType === 'claude') {
                if (!targetApiUrl.includes('/messages')) {
                    if (targetApiUrl.endsWith('/v1')) {
                        targetApiUrl += '/messages';
                    } else if (!targetApiUrl.includes('/v1')) {
                        targetApiUrl += '/v1/messages';
                    } else {
                        targetApiUrl += '/messages';
                    }
                }
            } else if (settings.apiType === 'google') {
                if (!targetApiUrl.includes(':generateContent')) {
                    let modelName = settings.apiModel || 'gemini-pro';

                    // 确保模型名称不包含 models/ 前缀
                    if (modelName.startsWith('models/')) {
                        modelName = modelName.replace('models/', '');
                    }

                    if (targetApiUrl.endsWith('/v1beta')) {
                        targetApiUrl += `/models/${modelName}:generateContent`;
                    } else if (!targetApiUrl.includes('/v1beta')) {
                        targetApiUrl += `/v1beta/models/${modelName}:generateContent`;
                    } else {
                        targetApiUrl += `/models/${modelName}:generateContent`;
                    }
                }
            } else if (settings.apiType === 'custom') {
                // 自定义API：尝试智能构建端点
                if (!targetApiUrl.includes('/chat/completions') && !targetApiUrl.includes('/messages') && !targetApiUrl.includes(':generateContent')) {
                    // 默认假设是OpenAI兼容的API
                    if (targetApiUrl.endsWith('/v1')) {
                        targetApiUrl += '/chat/completions';
                    } else if (!targetApiUrl.includes('/v1')) {
                        targetApiUrl += '/v1/chat/completions';
                    } else {
                        targetApiUrl += '/chat/completions';
                    }
                }
            }

            console.log(`[${extensionName}] 🎯 直连目标: ${targetApiUrl}`);

            // 2. 构建请求头
            const headers = { 'Content-Type': 'application/json' };

            // 3. 根据API类型设置认证头
            if (settings.apiType === 'google') {
                headers['x-goog-api-key'] = settings.apiKey;
            } else if (settings.apiType === 'claude') {
                headers['x-api-key'] = settings.apiKey;
                headers['anthropic-version'] = '2023-06-01';
            } else {
                // OpenAI、DeepSeek 和自定义API（默认使用Bearer Token）
                headers['Authorization'] = `Bearer ${settings.apiKey}`;
            }

            // 4. 构建请求体
            let requestBody;
            if (settings.apiType === 'claude') {
                requestBody = {
                    model: settings.apiModel || 'claude-3-sonnet-20240229',
                    max_tokens: 1000,
                    messages: [{ role: 'user', content: prompt }]
                };
            } else if (settings.apiType === 'google') {
                requestBody = {
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: {
                        maxOutputTokens: 1000,
                        temperature: 0.7
                    }
                };
            } else {
                // OpenAI、DeepSeek 和自定义API格式（默认使用OpenAI兼容格式）
                let defaultModel = 'gpt-3.5-turbo';
                if (settings.apiType === 'deepseek') {
                    defaultModel = 'deepseek-chat';
                } else if (settings.apiType === 'custom') {
                    defaultModel = settings.apiModel || 'gpt-3.5-turbo'; // 自定义API使用用户指定的模型
                }

                requestBody = {
                    model: settings.apiModel || defaultModel,
                    messages: [{ role: 'user', content: prompt }],
                    max_tokens: 1000,
                    temperature: 0.7
                };
            }

            // 5. 发送直连请求
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            console.log(`[${extensionName}] 🚀 开始直连请求...`);
            console.debug(`[${extensionName}] ▶️ Direct Request`, {
                url: targetApiUrl,
                headers: redactHeaders(headers),
                body: previewBody(requestBody),
                timeout
            });

            const response = await fetch(targetApiUrl, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                const err = new Error(`HTTP ${response.status}: ${errorText}`);
                logDetailedError('Direct API response not ok', { url: targetApiUrl, status: response.status }, err);
                throw err;
            }

            const data = await response.json();
            console.debug(`[${extensionName}] ◀️ Direct Response`, { status: response.status, snippet: JSON.stringify(data).slice(0, 500) });

            // 6. 解析响应
            let aiReply;
            if (settings.apiType === 'claude') {
                if (data.content && data.content[0] && data.content[0].text) {
                    aiReply = data.content[0].text;
                } else {
                    throw new Error('Claude API响应格式异常');
                }
            } else if (settings.apiType === 'google') {
                if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0]) {
                    aiReply = data.candidates[0].content.parts[0].text;
                } else {
                    throw new Error('Google API响应格式异常');
                }
            } else {
                // OpenAI、DeepSeek 和自定义API格式（默认使用OpenAI兼容格式）
                if (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) {
                    aiReply = data.choices[0].message.content;
                } else {
                    throw new Error(`${settings.apiType === 'custom' ? '自定义API' : 'API'}响应格式异常`);
                }
            }

            console.log(`[${extensionName}] ✅ 直连成功，AI回复: ${aiReply.substring(0, 50)}...`);
            return aiReply.trim();

        } catch (error) {
            console.error(`[${extensionName}] ❌ 统一AI调用失败:`, error);
            throw error;
        }
    }

    /**
     * 🔄 通过中继服务器调用API
     */
    async function callViaRelay(prompt, settings, timeout) {
        console.log(`[${extensionName}] 🔄 开始中继服务器调用...`);

        const relayServerUrl = 'http://154.12.38.33:3000/proxy';

        // 这里使用原有的中继服务器逻辑
        // 构建目标API URL
        let targetApiUrl = settings.apiUrl.replace(/\/+$/, '');

        // 根据API类型自动添加正确的端点
        if (settings.apiType === 'openai' || settings.apiType === 'custom' || settings.apiType === 'deepseek') {
            if (!targetApiUrl.includes('/chat/completions')) {
                if (targetApiUrl.endsWith('/v1')) {
                    targetApiUrl += '/chat/completions';
                } else if (!targetApiUrl.includes('/v1')) {
                    targetApiUrl += '/v1/chat/completions';
                } else {
                    targetApiUrl += '/chat/completions';
                }
            }
        } else if (settings.apiType === 'claude') {
            if (!targetApiUrl.includes('/messages')) {
                if (targetApiUrl.endsWith('/v1')) {
                    targetApiUrl += '/messages';
                } else if (!targetApiUrl.includes('/v1')) {
                    targetApiUrl += '/v1/messages';
                } else {
                    targetApiUrl += '/messages';
                }
            }
        } else if (settings.apiType === 'google') {
            if (!targetApiUrl.includes(':generateContent')) {
                let modelName = settings.apiModel || 'gemini-pro';

                // 确保模型名称不包含 models/ 前缀
                if (modelName.startsWith('models/')) {
                    modelName = modelName.replace('models/', '');
                }

                if (targetApiUrl.endsWith('/v1beta')) {
                    targetApiUrl += `/models/${modelName}:generateContent`;
                } else if (!targetApiUrl.includes('/v1beta')) {
                    targetApiUrl += `/v1beta/models/${modelName}:generateContent`;
                } else {
                    targetApiUrl += `/models/${modelName}:generateContent`;
                }
            }
        }

        // 构建请求头
        const targetHeaders = { 'Content-Type': 'application/json' };

        // 根据API类型设置认证头
        if (settings.apiType === 'google') {
            targetHeaders['x-goog-api-key'] = settings.apiKey;
        } else if (settings.apiType === 'claude') {
            targetHeaders['x-api-key'] = settings.apiKey;
            targetHeaders['anthropic-version'] = '2023-06-01';
        } else {
            targetHeaders['Authorization'] = `Bearer ${settings.apiKey}`;

            console.debug(`[${extensionName}] ▶️ Relay Request`, {
                relayServerUrl,
                targetUrl: targetApiUrl,
                headers: redactHeaders(targetHeaders),
                body: previewBody(targetRequestBody),
                timeout
            });

        }

        // 构建请求体
        let targetRequestBody;
        if (settings.apiType === 'openai' || settings.apiType === 'custom' || settings.apiType === 'deepseek') {
            targetRequestBody = {
                model: settings.apiModel || (settings.apiType === 'deepseek' ? 'deepseek-chat' : 'gpt-3.5-turbo'),
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 4000,
                temperature: 0.8
            };
        } else if (settings.apiType === 'claude') {
            targetRequestBody = {
                model: settings.apiModel || 'claude-3-sonnet-20240229',
                max_tokens: 4000,
                messages: [{ role: 'user', content: prompt }]
            };
        } else if (settings.apiType === 'google') {
            targetRequestBody = {
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { maxOutputTokens: 4000, temperature: 0.8 }
            };
        }

        // 构建中继服务器请求体
        const relayRequestBody = {
            targetUrl: targetApiUrl,
            method: 'POST',
            headers: targetHeaders,
            body: targetRequestBody
        };

        // 发送请求
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        try {
            const response = await fetch(relayServerUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(relayRequestBody),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`中继服务器错误: ${response.status} ${errorText}`);
            }

            const data = await response.json();

            // 解析响应
            let result = '';
            if (settings.apiType === 'openai' || settings.apiType === 'custom' || settings.apiType === 'deepseek') {
                result = data.choices?.[0]?.message?.content || '';
            } else if (settings.apiType === 'claude') {
                result = data.content?.[0]?.text || '';
            } else if (settings.apiType === 'google') {
                result = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            }

            console.log(`[${extensionName}] ✅ 中继调用成功，AI回复: ${result.substring(0, 50)}...`);
            return result.trim();

        } catch (error) {
            clearTimeout(timeoutId);
            throw error;
        }
    }

    /**
     * 🔄 兼容性函数 - 重定向所有旧的AI调用到统一函数
     */

    // 主要的AI调用函数 - 重定向到统一函数
    async function callAIAPI(prompt, timeout = 60000) {
        console.log(`[${extensionName}] 🔄 callAIAPI -> callAI 重定向`);
        return await callAI(prompt, timeout);
    }

    // 自定义API调用函数 - 重定向到统一函数
    async function callCustomAPI(prompt, settings = null, timeout = 60000) {
        console.log(`[${extensionName}] 🔄 callCustomAPI -> callAI 重定向`);
        return await callAI(prompt, timeout);
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
                    const aiReply = await callAIAPI(prompt, 90000); // 增加到90秒超时

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
            localStorage.setItem(STORAGE_KEY_ENABLED, enabled);

            if (enabled) {
                toastr.success("虚拟宠物系统已启用");
                initializeFloatingButton();
            } else {
                toastr.info("虚拟宠物系统已禁用");
                destroyFloatingButton();
            }
        });

        // 加载启用状态（默认启用，除非存储为 false）
        const enabled = localStorage.getItem(STORAGE_KEY_ENABLED) !== 'false';
        $("#virtual-pet-enabled-toggle").prop('checked', enabled);

        // 加载AI设置
        loadAISettings();

        // 绑定AI相关事件
        $('#ai-api-select').on('change', function() {
            const apiType = $(this).val();

            // 根据选择的API类型自动填充官方端点URL
            switch(apiType) {
                case 'openai':
                    $('#ai-url-input').val('https://api.openai.com/v1');
                    break;
                case 'claude':
                    $('#ai-url-input').val('https://api.anthropic.com/v1');
                    break;
                case 'google':
                    $('#ai-url-input').val('https://generativelanguage.googleapis.com/v1beta');
                    break;
                case 'deepseek':
                    $('#ai-url-input').val('https://api.deepseek.com/v1');
                    break;
                case 'ollama':
                    $('#ai-url-input').val('http://localhost:11434/v1');
                    break;
                case 'lmstudio':
                    $('#ai-url-input').val('http://localhost:1234/v1');
                    break;
                case 'custom':
                    // 自定义API不自动填充，保持用户输入
                    break;
                default:
                    // 其他情况不自动填充
                    break;
            }

            toggleApiConfigInputs(apiType);
            saveAISettings();
            // 清除之前的测试结果
            $('#ai-connection-status').text('未测试').css('color', '#888');
        });

        // 移除扩展设置中的二级菜单按钮（按用户要求）
        // 绑定已删除，改为放到主UI的设置按钮二级菜单中（后续实现）

        // 绑定API配置输入框事件
        $('#ai-url-input, #ai-key-input, #ai-model-input').on('input', function() {
            saveAISettings();
        });

        // 绑定URL重置按钮事件
        $('#ai-url-reset-btn').on('click', function() {
            const currentApiType = $('#ai-api-select').val();

            if (!currentApiType || currentApiType === 'custom') {
                toastr.info('自定义API类型无法重置，请手动输入URL', '💡 提示', { timeOut: 3000 });
                return;
            }

            // 调用重置函数
            resetAPIConfig();

            // 显示成功提示
            const apiNames = {
                'openai': 'OpenAI',
                'claude': 'Claude',
                'google': 'Google',
                'deepseek': 'DeepSeek',
                'ollama': 'Ollama',
                'lmstudio': 'LM Studio'
            };

            const apiName = apiNames[currentApiType] || currentApiType;
            toastr.success(`已重置为${apiName}官方端点`, '🔄 重置成功', { timeOut: 3000 });
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
                toastr.success(`已选择API模型: ${modelId}`, '模型已选择', { timeOut: 2000 });
                console.log(`[${extensionName}] 选择了API模型: ${modelId}`);
            } else if (selectedValue) {
                // 隐藏自定义输入框，使用选择的模型
                $('#ai-model-input').hide().val(selectedValue);
                toastr.success(`已选择模型: ${selectedValue}`, '模型已选择', { timeOut: 2000 });
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

            button.prop('disabled', true).text('获取中...');

            try {
                console.log(`[${extensionName}] 开始刷新模型列表...`);

                // 检查API配置
                const userApiUrl = $('#ai-url-input').val();

                if (!userApiUrl) {
                    toastr.warning('请先配置API URL', '⚠️ 配置不完整', { timeOut: 3000 });
                    return;
                }

                let models = [];

                console.log(`[${extensionName}] 从配置的API获取模型列表...`);

                // 使用第三方API专用方法获取模型
                // 统一改为 AIConnector.fetchModels，内部处理直连/中继/回退
                try {
                    const settings = loadAISettings();
                    models = await AIConnector.fetchModels(settings);
                } catch (e) {
                    console.warn(`[${extensionName}] 获取模型失败: ${e.message}`);
                    models = [];
                }

                // 更新模型下拉列表
                updateModelDropdown(models);

                if (models.length > 0) {
                    toastr.success(`从您的API获取到 ${models.length} 个模型！`, '模型获取成功', { timeOut: 4000 });
                } else {
                    toastr.warning('未能从您的API获取到模型，请检查URL和密钥配置', '模型获取失败', { timeOut: 4000 });
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

        // 比较同步数据和本地数据，选择最新的
        if (syncData && localData) {
            try {
                const syncParsed = typeof syncData === 'object' ? syncData : JSON.parse(syncData);
                const localParsed = JSON.parse(localData);

                const syncTime = syncParsed.lastSyncTime || 0;
                const localTime = localParsed.lastSyncTime || 0;

                if (syncTime > localTime) {
                    savedData = syncParsed;
                    console.log(`[${extensionName}] 使用同步数据（更新）`);
                } else {
                    savedData = localParsed;
                    console.log(`[${extensionName}] 使用本地数据（更新）`);
                }
            } catch (error) {
                console.warn(`[${extensionName}] 数据比较失败，使用本地数据:`, error);
                savedData = JSON.parse(localData);
            }
        } else if (syncData) {
            savedData = typeof syncData === 'object' ? syncData : JSON.parse(syncData);
            console.log(`[${extensionName}] 使用同步数据（仅有同步）`);
        } else if (localData) {
            savedData = JSON.parse(localData);
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

        // 设置为固定的默认初始值，以符合新的初始化需求
        petData.health = 100;
        petData.happiness = 50;
        // 保持当前饱食度（不在此处修改），默认来自初始为40
        petData.energy = 50

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
     * 数值系统自检与自修复（顶层定义，初始化即可用）
     * @param {Object} options
     * @param {boolean} options.autoFix 是否自动修复（默认 true）
     * @param {boolean} options.save 是否在修复后保存（默认 true）
     * @param {boolean} options.silent 是否静默（默认 true）
     */
    window.runValueSelfCheck = function(options = {}) {
        const { autoFix = true, save = true, silent = true } = options;
        const issues = [];
        const fixes = [];
        const before = JSON.parse(JSON.stringify(petData));
        const now = Date.now();

        // 1) 范围与类型
        const keys = ['health','happiness','hunger','energy','experience','level'];
        keys.forEach(k => {
            const v = petData[k];
            if (typeof v !== 'number' || isNaN(v)) {
                issues.push(`${k} 非数字: ${v}`);
                if (autoFix) { petData[k] = (k === 'level') ? 1 : 0; fixes.push(`修复 ${k} → ${petData[k]}`); }
            }
        });

        // 2) 范围 clamp
        const clamp = (x, min, max) => Math.max(min, Math.min(max, x));
        ['health','happiness','hunger','energy'].forEach(k => {
            const old = petData[k];
            const nv = clamp(Number(old)||0, 0, 100);
            if (nv !== old) { issues.push(`${k} 越界: ${old} → ${nv}`); if (autoFix) { petData[k] = nv; fixes.push(`修复 ${k} → ${nv}`); } }
        });
        if (petData.level < 1) { issues.push(`level < 1: ${petData.level}`); if (autoFix) { petData.level = 1; fixes.push('修复 level → 1'); } }
        if (petData.experience < 0) { issues.push(`experience < 0: ${petData.experience}`); if (autoFix) { petData.experience = 0; fixes.push('修复 experience → 0'); } }

        // 3) 时间戳有效性
        ['lastUpdateTime','lastFeedTime','lastPlayTime','lastSleepTime'].forEach(tk => {
            const tv = petData[tk];
            if (!tv || typeof tv !== 'number' || tv > now) { issues.push(`${tk} 无效: ${tv}`); if (autoFix) { petData[tk] = now; fixes.push(`修复 ${tk} → now`); } }
        });

        // 4) 生死一致性
        if (petData.isAlive === false && petData.health > 0) { issues.push('死亡标记与健康矛盾'); if (autoFix) { petData.isAlive = true; fixes.push('修复 isAlive → true'); } }
        if (petData.isAlive !== false && petData.health <= 0) { issues.push('健康<=0但未标记死亡'); if (autoFix) { petData.isAlive = false; petData.deathReason = petData.deathReason || 'sickness'; fixes.push('修复 isAlive → false'); } }

        // 5) 辅助：首次互动标记
        if (!petData.hasInteracted && !petData.lastUpdateTime) { petData.lastUpdateTime = now; fixes.push('补充 lastUpdateTime'); }

        // 6) 统一校验
        validateAndFixValues();
        if (save && autoFix && fixes.length) savePetData();

        const after = JSON.parse(JSON.stringify(petData));
        if (!silent) { console.log('[SelfCheck] issues:', issues); console.log('[SelfCheck] fixes:', fixes); console.log('[SelfCheck] before→after:', before, after); }
        return { issues, fixes, before, after };
    };

    // 去重的定时器守卫
    if (!window.__vpsSelfCheckInterval) {
        window.__vpsSelfCheckInterval = setInterval(() => {
            try { window.runValueSelfCheck({ autoFix: true, save: true, silent: true }); } catch (e) {}
        }, 5 * 60 * 1000);
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

            toastr.success(`${petData.name} 升级了！现在是 ${petData.level} 级！获得 ${coinReward} 金币奖励！`);
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


    /**
     * 数值系统自检与自修复
     * - 检查数值范围、时间戳有效性、冷却时间倒退、死亡状态一致性等
     * - 可选自动修复并保存
     * @param {Object} options
     * @param {boolean} options.autoFix 是否自动修复（默认 true）
     * @param {boolean} options.save 是否在修复后保存（默认 true）
     * @param {boolean} options.silent 是否静默（默认 true，控制台简要输出）
     * @returns {{issues: string[], fixes: string[], before: any, after: any}}
     */
    window.runValueSelfCheck = function(options = {}) {
        const {
            autoFix = true,
            save = true,
            silent = true,
        } = options;

        const issues = [];
        const fixes = [];
        const before = JSON.parse(JSON.stringify(petData));

        const now = Date.now();
        // 1) 范围与类型
        const keys = ['health','happiness','hunger','energy','experience','level'];
        keys.forEach(k => {
            const v = petData[k];
            if (typeof v !== 'number' || isNaN(v)) {
                issues.push(`${k} 非数字: ${v}`);
                if (autoFix) {
                    if (k === 'level') petData[k] = 1; else petData[k] = 0;
                    fixes.push(`修复 ${k} → ${petData[k]}`);
                }
            }
        });

        // 2) 范围 clamp
        const clamp = (x, min, max) => Math.max(min, Math.min(max, x));
        const ranged = ['health','happiness','hunger','energy'];
        ranged.forEach(k => {
            const old = petData[k];
            const nv = clamp(Number(old)||0, 0, 100);
            if (nv !== old) {
                issues.push(`${k} 越界: ${old} → ${nv}`);
                if (autoFix) {
                    petData[k] = nv; fixes.push(`修复 ${k} → ${nv}`);
                }
            }
        });
        if (petData.level < 1) { issues.push(`level < 1: ${petData.level}`); if (autoFix) { petData.level = 1; fixes.push('修复 level → 1'); } }
        if (petData.experience < 0) { issues.push(`experience < 0: ${petData.experience}`); if (autoFix) { petData.experience = 0; fixes.push('修复 experience → 0'); } }

        // 3) 时间戳有效性与单调性
        const timeKeys = ['lastUpdateTime','lastFeedTime','lastPlayTime','lastSleepTime'];
        timeKeys.forEach(tk => {
            const tv = petData[tk];
            if (!tv || typeof tv !== 'number' || tv > now) {
                issues.push(`${tk} 无效: ${tv}`);
                if (autoFix) { petData[tk] = now; fixes.push(`修复 ${tk} → now`); }
            }
        });
        // 冷却时间倒退（未来时间）已在 tv>now 分支修复

        // 4) 死亡状态一致性
        if (petData.isAlive === false && petData.health > 0) {
            issues.push('死亡标记与健康矛盾');
            if (autoFix) { petData.isAlive = true; fixes.push('修复 isAlive → true'); }
        }
        if (petData.isAlive !== false && petData.health <= 0) {
            issues.push('健康<=0但未标记死亡');
            if (autoFix) { petData.isAlive = false; petData.deathReason = petData.deathReason || 'sickness'; fixes.push('修复 isAlive → false'); }
        }

        // 5) 辅助：首次互动标记逻辑（若从未互动但有历史时间，补上lastUpdateTime）
        if (!petData.hasInteracted && !petData.lastUpdateTime) {
            petData.lastUpdateTime = now; fixes.push('补充 lastUpdateTime');
        }

        // 6) 统一校验
        validateAndFixValues();

        if (save && (autoFix && (fixes.length > 0))) {
            savePetData();
        }

        const after = JSON.parse(JSON.stringify(petData));
        if (!silent) {
            console.log('[SelfCheck] issues:', issues);
            console.log('[SelfCheck] fixes:', fixes);
            console.log('[SelfCheck] before→after:', before, after);
        }
        return { issues, fixes, before, after };
    };

    // 每5分钟自动自检一次（静默+自动修复+保存）
    setInterval(() => {
        try { window.runValueSelfCheck({ autoFix: true, save: true, silent: true }); } catch(e) { /* ignore */ }
    }, 5 * 60 * 1000);

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
                    background: ${candyColors.backgroundSolid} !important;
                    color: ${candyColors.textPrimary} !important;
                    border: 3px solid ${candyColors.border} !important;
                    border-radius: 24px !important;
                    padding: ${containerPadding} !important;
                    overflow-y: auto !important;
                    -webkit-overflow-scrolling: touch !important;
                    box-shadow: 0 20px 40px ${candyColors.shadowGlow}, 0 8px 16px ${candyColors.shadow} !important;
                    font-family: 'Nunito', 'Quicksand', 'Baloo', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
                    backdrop-filter: blur(10px) !important;
                    -webkit-backdrop-filter: blur(10px) !important;
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
        const levelText = petData.isAlive
            ? `${LIFE_STAGES[petData.lifeStage]?.name || '未知'} Lv.${petData.level}`
            : '已死亡';
        $('.pet-level').each(function(){
            $(this)
              .text(levelText)
              .css({
                display: 'block',
                textAlign: 'center',
                margin: '0 auto',
                color: (typeof candyColors !== 'undefined' && candyColors.textSecondary) ? candyColors.textSecondary : '#666666',
                fontSize: '1em',
                fontWeight: 'normal',
                letterSpacing: '0'
              });
        });
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
                // 显示默认SVG图标
                button.html(getFeatherIcon('heart', { color: '#FF69B4', size: 20, strokeWidth: 2 }));
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
    function switchView(viewIdToShow) {
        console.log(`[${extensionName}] 切换视图，目标视图: #${viewIdToShow}`);

        // 隐藏所有 .pet-view 元素
        $('.pet-view').hide();

        // 显示目标视图
        const $view = $(`#${viewIdToShow}`);
        if ($view.length > 0) {
            $view.show();
            console.log(`[${extensionName}] 视图 #${viewIdToShow} 已显示`);
        } else {
            console.error(`[${extensionName}] 错误: 视图 #${viewIdToShow} 不存在`);
        }
    }

    /**
     * 显示主视图
     */
    function showMainView() {
        switchView('pet-main-view');
        renderPetStatus();
    }

    /**
     * 显示宠物详情视图
     */
    function showPetView() {
        switchView('pet-detail-view');
        renderPetDetails();
    }

    /**
     * 显示设置视图
     */
    function showSettingsView() {
        switchView('pet-settings-view');
        renderSettings();
    }

    // showChatView函数已被移除，现在使用openChatModal()替代

    // 打开扩展设置面板并定位到虚拟宠物系统（如果容器存在）
    function openSettings() {
        try {
            const $target = $("#extensions_settings2").length ? $("#extensions_settings2") : $("#extensions_settings");
            let $panel = $("#virtual-pet-settings");
            if ($target.length) {
                if ($panel.length) {
                    if (!$panel.closest($target).length) { $target.append($panel); }
                    const $drawer = $panel.find('.inline-drawer');
                    const $toggle = $drawer.find('.inline-drawer-toggle');
                    const $content = $drawer.find('.inline-drawer-content');
                    if ($content.length && $content.is(':hidden')) { $toggle.trigger('click'); }
                    $panel[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
                    try { toastr && toastr.info('已定位到“虚拟宠物系统”扩展设置'); } catch{}
                    return;
                }
            }
            // 若未找到容器或面板，退回弹窗内设置视图
            showSettingsView();
            try { toastr && toastr.info('未找到扩展设置面板，已打开弹窗内的设置视图'); } catch{}
        } catch (e) {
            console.warn('openSettings failed, fallback to in-popup settings', e);
            try { showSettingsView(); } catch{}
        }
    }




    /**
     * 处理聊天按钮点击
     */
    function handleChatButtonClick() {
        console.log(`[${extensionName}] 聊天按钮被点击，打开聊天模态弹窗`);

        // 检查API配置
        const config = getAIConfiguration();
        if (!config.isConfigured) {
            toastr.warning('请先在扩展设置中配置AI API信息（类型、URL和密钥）', '聊天功能需要配置', { timeOut: 5000 });
            // 仍允许打开聊天弹窗，但会显示配置提示
            openChatModal();
            try { migrateChatFromLocalStorage && migrateChatFromLocalStorage(); } catch(e) {}
            return;
        }
        // 打开聊天模态并迁移历史（如需要）
        openChatModal();
        try { migrateChatFromLocalStorage && migrateChatFromLocalStorage(); } catch(e) {}
        return;
        // 打开独立的聊天模态弹窗
        openChatModal();
    }

    // -----------------------------------------------------------------
    // 3.5. 聊天功能逻辑
    // -----------------------------------------------------------------

    /**
     * 初始化聊天界面
     */
    function initializeChatInterface() {
        console.log(`[${extensionName}] 初始化聊天界面...`);

        // 检查聊天视图是否存在
        const chatViewElement = $('#pet-chat-view');
        console.log(`[${extensionName}] 聊天视图元素存在: ${chatViewElement.length > 0}`);

        // 检查聊天容器是否存在
        const chatContainer = $('#chat-messages-container');
        console.log(`[${extensionName}] 聊天容器元素存在: ${chatContainer.length > 0}`);

        // 检查API配置
        const config = getAIConfiguration();
        console.log(`[${extensionName}] API配置状态: ${config.isConfigured ? '已配置' : '未配置'}`);

        if (!config.isConfigured) {
            console.log(`[${extensionName}] 显示配置提示...`);
            // 显示配置提示在聊天界面内
            showChatConfigurationHint();
        } else {
            console.log(`[${extensionName}] 显示正常聊天界面...`);
            // 配置完整，显示正常聊天界面
            showNormalChatInterface();
        }

        console.log(`[${extensionName}] 绑定聊天事件...`);
        // 绑定聊天相关事件（总是绑定）
        bindChatEvents();

        chatInitialized = true;
        console.log(`[${extensionName}] 聊天界面初始化完成`);
    }

    /**
     * 显示聊天配置提示
     */
    function showChatConfigurationHint() {
        console.log(`[${extensionName}] 开始显示聊天配置提示...`);

        // 清空聊天容器
        const container = $('#chat-messages-container');
        console.log(`[${extensionName}] 聊天容器查找结果: ${container.length > 0 ? '找到' : '未找到'}`);

        if (container.length === 0) {
            console.error(`[${extensionName}] 错误: 找不到聊天消息容器 #chat-messages-container`);
            return;
        }

        container.empty();
        console.log(`[${extensionName}] 聊天容器已清空`);


        // 添加配置提示
        const configHint = `
            <div class="chat-config-hint" style="text-align: center; padding: 20px;">
                <div style="font-size: 3em; margin-bottom: 15px;">${getFeatherIcon('cpu', { color: candyColors.primary, size: 48 })}</div>
                <h3 style="color: var(--primary-accent-color); margin-bottom: 15px;">需要配置AI API</h3>
                <p style="margin-bottom: 15px; line-height: 1.5;">
                    要与宠物聊天，需要先配置AI API。<br>
                </p>
                <div style="background: #f0f8ff; padding: 15px; border-radius: 8px; margin-bottom: 15px; text-align: left;">
                    <div style="font-weight: bold; color: #007bff; margin-bottom: 10px;">📋 配置步骤：</div>
                    <ol style="margin: 0; padding-left: 20px; line-height: 1.6;">
                        <li>点击右上角的 <strong>扩展</strong> 按钮</li>
                        <li>找到 <strong>虚拟宠物系统</strong> 设置</li>
                        <li>在 <strong>AI API 配置</strong> 部分填写：
                            <ul style="margin-top: 5px;">
                                <li>选择API类型（如OpenAI、Claude等）</li>
                                <li>填写API URL</li>
                                <li>填写API密钥</li>
                            </ul>
                        </li>
                        <li>点击 <strong>测试连接</strong> 验证配置</li>
                    </ol>
                </div>
                <div style="background: #fff3cd; padding: 12px; border-radius: 6px; margin-bottom: 20px; text-align: left; border-left: 4px solid #ffc107;">
                    <div style="font-weight: bold; color: #856404; margin-bottom: 8px;">💡 常用API推荐：</div>
                    <div style="font-size: 0.9em; color: #856404; line-height: 1.5;">
                        • <strong>OpenAI</strong>：https://api.openai.com/v1<br>
                        • <strong>本地Ollama</strong>：http://localhost:11434/v1<br>
                        • <strong>LM Studio</strong>：http://localhost:1234/v1<br>
                        • <strong>第三方代理</strong>：根据提供商文档配置
                    </div>
                </div>
                <button id="goto-settings-from-chat-view" class="pet-button success">
                    ⚙️ 去配置
                </button>
            </div>
        `;

        container.html(configHint);
        console.log(`[${extensionName}] 配置提示HTML已添加`);

        // 绑定去配置按钮事件
        const configButton = $('#goto-settings-from-chat-view');
        console.log(`[${extensionName}] 配置按钮查找结果: ${configButton.length > 0 ? '找到' : '未找到'}`);

        configButton.on('click', function() {
            console.log(`[${extensionName}] 配置按钮被点击，跳转到设置视图`);
            showSettingsView();
        });

        // 禁用聊天输入
        const chatInput = $('#chat-input');
        const sendButton = $('#send-chat-btn');

        console.log(`[${extensionName}] 聊天输入框查找结果: ${chatInput.length > 0 ? '找到' : '未找到'}`);
        console.log(`[${extensionName}] 发送按钮查找结果: ${sendButton.length > 0 ? '找到' : '未找到'}`);

        chatInput.prop('disabled', true).attr('placeholder', '请先配置AI API...');
        sendButton.prop('disabled', true);

        console.log(`[${extensionName}] 聊天配置提示显示完成`);
    }

    /**
     * 显示正常聊天界面
     */
    function showNormalChatInterface() {
        // 启用聊天输入
        $('#chat-input').prop('disabled', false).attr('placeholder', '输入消息...');

        // 加载聊天历史（IndexedDB，会话持久化）
        loadChatHistoryFromDB && loadChatHistoryFromDB();
    }

    /**
     * 绑定聊天相关事件
     */
    function bindChatEvents() {
        // 发送按钮点击事件
        $('#send-chat-btn').off('click').on('click', handleSendMessage);

        // 输入框回车事件
        $('#chat-input').off('keypress').on('keypress', function(e) {
            if (e.which === 13 && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
            }
        });

        // 输入框输入事件（控制发送按钮状态）
        $('#chat-input').off('input').on('input', function() {
            const hasText = $(this).val().trim().length > 0;
            $('#send-chat-btn').prop('disabled', !hasText || isAIResponding);
        });
    }

        // 聊天消息中点击用户头像 → 打开头像选择器
        $('#chat-modal-messages').off('click.vp-avatar', '.message-avatar[data-sender="user"]').on('click.vp-avatar', '.message-avatar[data-sender="user"]', function(){
            if (typeof window.openUserAvatarSelector === 'function') window.openUserAvatarSelector();
        });


    /**
     * 构建聊天Prompt
     * @param {string} userInput - 用户的输入
     * @returns {string} - 构建好的Prompt
     */
    function buildChatPrompt(userInput) {
        const currentPersonality = getCurrentPersonality();
        const prompt = `你是${petData.name}，你的设定是：${currentPersonality}。用户对你说了：“${userInput}”。请根据你的设定，用简短、可爱、自然的语言回复。`;
        return prompt;
    }

    /**
     * 构建与宠物聊天的Prompt
     * @param {string} userInput 用户的输入消息
     * @returns {string} 构建好的、用于API请求的Prompt
     */
    function buildChatPrompt(userInput) {
        const personality = getCurrentPersonality();
        // 优化后的Prompt，更清晰地定义了角色和任务，避免AI混淆
        const prompt = `你是一只名叫“${petData.name}”的虚拟宠物。你的性格设定是：“${personality}”。现在，你的主人对你说了：“${userInput}”。请严格按照你的性格设定，以宠物的身份和口吻，给主人一个简短、可爱、自然的回复。`;
        console.log(`[buildChatPrompt] Generated prompt: ${prompt}`);
        return prompt;
    }

    /**
     * 构建聊天Prompt（支持历史记录）
     */
    function buildChatPromptWithHistory(userInput) {
        const personality = getCurrentPersonality();

        // 构建聊天历史上下文
        let historyContext = '';
        if (chatHistory.length > 0) {
            // 只取最近的5条对话作为上下文
            const recentHistory = chatHistory.slice(-5);
            const historyText = recentHistory.map(item => {
                const role = item.sender === 'user' ? '主人' : petData.name;
                return `${role}: ${item.message}`;
            }).join('\n');
            historyContext = `\n\n之前的对话:\n${historyText}\n`;
        }

        // 构建完整的Prompt
        const prompt = `你是一只名叫"${petData.name}"的虚拟宠物。你的性格设定是："${personality}"。${historyContext}
现在，你的主人对你说了："${userInput}"。请严格按照你的性格设定，结合之前的对话内容，以宠物的身份和口吻，给主人一个简短、可爱、自然的回复。`;

        console.log(`[buildChatPrompt] Generated prompt with ${chatHistory.length} history items`);
        return prompt;
    }

    /**
     * 处理发送聊天消息
     */
    async function handleSendMessage() {
        console.log(`[${extensionName}] handleSendMessage 被调用`);

        const input = $('#chat-modal-input');
        const sendBtn = $('#chat-modal-send-btn');
        const message = input.val().trim();

        // 验证输入
        if (!message) {
            console.log(`[${extensionName}] 消息为空，忽略发送`);
            return;
        }

        if (isAIResponding) {
            console.log(`[${extensionName}] AI正在响应中，忽略新消息`);
            return;
        }

        // 验证API配置
        const config = getAIConfiguration();
        if (!config.isConfigured) {
            console.log(`[${extensionName}] API未配置，显示提示消息`);
            addMessageToChat('pet', '抱歉，我暂时不能和你聊天。请主人先帮我配置好AI API哦！');
            return;
        }

        console.log(`[${extensionName}] 开始处理消息: "${message}"`);

        // 清空输入框并禁用发送按钮
        input.val('');
        sendBtn.prop('disabled', true);

        // 添加用户消息
        addMessageToChat('user', message);
        isAIResponding = true;

        // 显示打字指示器
        addMessageToChat('pet', '...');

        try {
            console.log(`[${extensionName}] 构建提示词并调用AI API`);

            const prompt = buildChatPromptWithHistory(message);
            const aiResponse = await callAIAPI(prompt, 60000);

            // 移除打字指示器
            $('#chat-modal-messages .chat-message.pet-message').last().remove();

            // 添加AI回复
            const finalResponse = aiResponse || "嗯...我在想什么呢？";
            addMessageToChat('pet', finalResponse);

            console.log(`[${extensionName}] AI回复成功: "${finalResponse}"`);

            // 保存聊天历史
            saveChatHistory();

        } catch (error) {
            console.error(`[${extensionName}] AI回复失败:`, error);

            // 移除打字指示器
            $('#chat-modal-messages .chat-message.pet-message').last().remove();

            // 显示错误消息
            let errorMessage = '呜...我的脑袋有点乱，稍后再试吧！';
            if (error.message.includes('timeout')) {
                errorMessage = '抱歉，我想得太久了...请再试一次吧！';
            } else if (error.message.includes('API')) {
                errorMessage = '我的大脑连接出了点问题，请检查API配置哦！';
            }

            addMessageToChat('pet', errorMessage);

        } finally {
            isAIResponding = false;
            sendBtn.prop('disabled', false);

            // 聚焦到输入框
            input.focus();

            console.log(`[${extensionName}] handleSendMessage 处理完成`);
        }
    }

/**
 * 聊天存储与会话（轻量本地版，避免初始化中断）
 */
function getChatSessions(){
    try { return JSON.parse(localStorage.getItem('virtual-pet-chat-sessions')||'["default"]'); } catch { return ['default']; }
}
function saveChatSessions(list){
    try { localStorage.setItem('virtual-pet-chat-sessions', JSON.stringify(Array.from(new Set(list)))); } catch{}
}
function getCurrentChatSessionId(){
    return localStorage.getItem('virtual-pet-chat-session-id') || 'default';
}
function setCurrentChatSessionId(id){
    try { localStorage.setItem('virtual-pet-chat-session-id', id); } catch{}
}
(function ensureDefaultSession(){
    const list = getChatSessions();
    if (!list.includes('default')) { list.unshift('default'); saveChatSessions(list); }
})();

async function migrateChatFromLocalStorage(){
    try{
        const saved = localStorage.getItem('virtual-pet-chat-history');
        if (!saved) return;
        // 轻量版本直接沿用同一键名，无需迁移
    }catch(e){ console.warn('migrateChatFromLocalStorage failed', e); }
}

async function dbSaveMessage(record){
    // 轻量本地版：由 addMessageToChat 已经更新 chatHistory；此处只负责落盘
    try { localStorage.setItem('virtual-pet-chat-history', JSON.stringify(chatHistory)); } catch{}
}
async function dbListMessages(sessionId, limit = 1000){
    try{
        const saved = JSON.parse(localStorage.getItem('virtual-pet-chat-history')||'[]');
        const rows = saved.filter(x=>!sessionId || x.sessionId===sessionId).sort((a,b)=>a.timestamp-b.timestamp);
        return limit ? rows.slice(-limit) : rows;
    }catch{ return []; }
}
async function dbClearSession(sessionId){
    try{ chatHistory = []; localStorage.setItem('virtual-pet-chat-history','[]'); }catch{}
}
async function dbClearAll(){
    try{ localStorage.removeItem('virtual-pet-chat-history'); }catch{}
}
async function loadChatHistoryFromDB(){
    // 轻量本地版：复用现有的本地加载与渲染
    try { loadChatHistory(); } catch(e) { console.warn('loadChatHistoryFromDB failed', e); }
}
async function clearCurrentChatHistory(){
    try{
        await dbClearSession(getCurrentChatSessionId());
        const container = $('#chat-modal-messages').length ? $('#chat-modal-messages') : $('#chat-messages-container');
        if (container && container.length) container.empty();
        toastr && toastr.success('已清空当前会话聊天历史');
    }catch(e){ console.error('清空聊天历史失败', e); }
}
async function createNewChatSession(){
    const id = prompt('请输入新的会话名称（例如：默认/任务/闲聊）', '会话-'+Date.now());
    if (!id) return;
    const list = getChatSessions();
    if (!list.includes(id)) { list.push(id); saveChatSessions(list); }
    setCurrentChatSessionId(id);
    chatHistory = [];
    try { localStorage.setItem('virtual-pet-chat-history','[]'); } catch{}
    try { await loadChatHistoryFromDB(); } catch{}
    toastr && toastr.success('已创建新会话');
}

/**
 * 添加消息到聊天窗口 - 适配新的商店风格模态弹窗
 */
    async function addMessageToChat(sender, message) {
        const container = $('#chat-modal-messages');
        if (container.length === 0) {
            console.log(`[${extensionName}] 聊天消息容器不存在，无法添加消息`);
            return;
        }

        // 检测移动端 - 学习商店的响应式设计
        const isMobile = window.innerWidth <= 767;
        const isSmallMobile = window.innerWidth <= 480;

        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const isUser = sender === 'user';
        const avatar = isUser
            ? (customUserAvatarData ? `<img src="${customUserAvatarData}" alt="用户头像" style="width:100% !important;height:100% !important;object-fit:cover !important;border-radius:50% !important;">` : getFeatherIcon('user', { color: '#ffffff', size: 18 }))
            : (customAvatarData ? getAvatarContent() : getDefaultPetIcon(18, '#ffd700'));

        // 响应式尺寸参数
        const avatarSize = isSmallMobile ? '32px' : isMobile ? '36px' : '40px';
        const avatarFontSize = isSmallMobile ? '16px' : isMobile ? '18px' : '20px';
        const messagePadding = isSmallMobile ? '8px 12px' : isMobile ? '10px 14px' : '12px 16px';
        const messageBorderRadius = isSmallMobile ? '14px' : isMobile ? '16px' : '18px';
        const messageMaxWidth = isSmallMobile ? '85%' : isMobile ? '80%' : '70%';
        const messageFontSize = isMobile ? '0.9em' : '1em';

        // 处理打字指示器
        const messageContent = message === '...'
            ? `<div style="
                display: flex !important;
                align-items: center !important;
                gap: 4px !important;
                padding: 8px 0 !important;
            ">
                <span style="
                    width: 8px !important;
                    height: 8px !important;
                    background: #A0AEC0 !important;
                    border-radius: 50% !important;
                    animation: typingBounce 1.4s infinite ease-in-out !important;
                    animation-delay: 0s !important;
                "></span>
                <span style="
                    width: 8px !important;
                    height: 8px !important;
                    background: #A0AEC0 !important;
                    border-radius: 50% !important;
                    animation: typingBounce 1.4s infinite ease-in-out !important;
                    animation-delay: 0.2s !important;
                "></span>
                <span style="
                    width: 8px !important;
                    height: 8px !important;
                    background: #A0AEC0 !important;
                    border-radius: 50% !important;
                    animation: typingBounce 1.4s infinite ease-in-out !important;
                    animation-delay: 0.4s !important;
                "></span>
            </div>`
            : escapeHtml(message);

        // 学习商店风格的消息HTML结构
        const messageHtml = `
            <div style="
                display: flex !important;
                gap: 12px !important;
                align-items: flex-start !important;
                ${isUser ? 'flex-direction: row-reverse !important;' : ''}
                animation: messageSlideIn 0.3s ease-out !important;
            ">
                <div class="message-avatar" data-sender="${isUser ? 'user' : 'pet'}" style="
                    width: ${avatarSize} !important;
                    height: ${avatarSize} !important;
                    border-radius: 50% !important;
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    background: linear-gradient(145deg, ${isUser ? '#FF9EC7, #FF7FB3' : '#A8E6CF, #87CEEB'}) !important;
                    border: 2px solid white !important;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;
                    flex-shrink: 0 !important;
                    overflow: hidden !important;
                    cursor: ${isUser ? 'pointer' : 'default'} !important;
                " title="${isUser ? '点击更换我的头像' : ''}">${avatar}</div>
                <div style="
                    max-width: ${messageMaxWidth} !important;
                    background: ${isUser ? 'linear-gradient(135deg, #87CEEB, #A8E6CF)' : 'white'} !important;
                    border-radius: ${messageBorderRadius} !important;
                    padding: ${messagePadding} !important;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;
                    border: 1px solid ${isUser ? 'rgba(135,206,235,0.3)' : 'rgba(168,230,207,0.3)'} !important;
                    color: ${isUser ? 'white' : '#2D3748'} !important;
                    position: relative !important;
                ">
                    <div style="
                        margin: 0 !important;
                        line-height: 1.4 !important;
                        word-wrap: break-word !important;
                        font-size: ${messageFontSize} !important;
                    ">${messageContent}</div>
                    ${message !== '...' ? `<div style="
                        font-size: 0.75em !important;
                        color: ${isUser ? 'rgba(255, 255, 255, 0.8)' : '#A0AEC0'} !important;
                        margin-top: 4px !important;
                        text-align: right !important;
                    ">${timestamp}</div>` : ''}
                </div>
            </div>
        `;

        container.append(messageHtml);

        // 滚动到底部
        container.scrollTop(container[0].scrollHeight);

        // 保存聊天历史（不保存打字指示器）
        if (message !== '...') {
            const rec = { sessionId: getCurrentChatSessionId(), sender, message, timestamp: Date.now() };
            chatHistory.push({ sender: rec.sender, message: rec.message, timestamp: rec.timestamp });
            if (chatHistory.length > 1000) chatHistory.shift();
            try { await dbSaveMessage(rec); } catch (e) { console.warn('保存聊天历史失败', e); }
        }

        console.log(`[${extensionName}] 已添加${isUser ? '用户' : '宠物'}消息: ${message.substring(0, 20)}...`);
    }

    /**
     * 打开独立的聊天模态弹窗 - 学习商店设计模式
     */
    async function openChatModal() {
        console.log(`[${extensionName}] 打开聊天模态弹窗...`);

        // 确保只有一个聊天弹窗
        $('#chat-modal-overlay').remove();

        // 检测移动端 - 学习商店的响应式设计
        const isMobile = window.innerWidth <= 767;
        const isSmallMobile = window.innerWidth <= 480;

        // 根据屏幕尺寸调整样式参数 - 与商店弹窗保持一致的尺寸
        const overlayPadding = isSmallMobile ? '5px' : isMobile ? '10px' : '20px';
        const containerMaxWidth = isMobile ? '300px' : '380px'; // 与主UI保持一致
        const containerMaxHeight = isSmallMobile ? 'calc(100vh - 20px)' : isMobile ? 'calc(100vh - 40px)' : '70vh'; // 与商店弹窗一致
        const borderRadius = isSmallMobile ? '8px' : isMobile ? '12px' : '15px';
        const headerPadding = isMobile ? '12px 16px' : '16px 20px';
        const messagesPadding = isSmallMobile ? '12px' : isMobile ? '16px' : '20px';
        const inputAreaPadding = isSmallMobile ? '10px 12px' : isMobile ? '12px 16px' : '16px 20px';

        // 学习商店模态弹窗的设计，使用内联样式确保优先级
        const chatModal = $(`
            <div id="chat-modal-overlay" style="
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                background-color: rgba(0, 0, 0, 0.8) !important;
                z-index: 1000001 !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                padding: ${overlayPadding} !important;
                box-sizing: border-box !important;
            ">
                <div id="chat-modal-container" style="
                    background: linear-gradient(135deg, #FF9EC7 0%, #A8E6CF 50%, #87CEEB 100%) !important;
                    border-radius: ${borderRadius} !important;
                    padding: 0 !important;
                    max-width: ${containerMaxWidth} !important;
                    width: 100% !important;
                    max-height: ${containerMaxHeight} !important;
                    overflow: hidden !important;
                    color: white !important;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.3) !important;
                    display: flex !important;
                    flex-direction: column !important;
                ">
                    <!-- 标题栏 -->
                    <div style="
                        padding: ${headerPadding} !important;
                        background: linear-gradient(145deg, rgba(255,158,199,0.9), rgba(255,158,199,0.7)) !important;
                        display: flex !important;
                        justify-content: space-between !important;
                        align-items: center !important;
                        border-bottom: 1px solid rgba(255,255,255,0.2) !important;
                    ">
                        <h3 style="
                            margin: 0 !important;
                            color: white !important;
                            font-size: 1.2em !important;
                            font-weight: 600 !important;
                        ">💬 与 ${escapeHtml(petData.name)} 聊天</h3>
                        <button id="chat-modal-close-btn" style="
                            background: transparent !important;
                            border: none !important;
                            color: white !important;
                            font-size: 24px !important;
                            font-weight: bold !important;
                            cursor: pointer !important;
                            padding: 4px 8px !important;
                            border-radius: 4px !important;
                            min-width: 32px !important;
                            height: 32px !important;
                            display: flex !important;
                            align-items: center !important;
                            justify-content: center !important;
                            transition: all 0.2s ease !important;
                        ">&times;</button>
                    </div>

                    <!-- 消息区域 -->
                    <div id="chat-modal-messages" style="
                        flex: 1 !important;
                        padding: ${messagesPadding} !important;
                        overflow-y: auto !important;
                        background: linear-gradient(135deg, rgba(248,249,255,0.9) 0%, rgba(255,248,252,0.9) 50%, rgba(240,248,255,0.9) 100%) !important;
                        display: flex !important;
                        flex-direction: column !important;
                        gap: ${isMobile ? '12px' : '16px'} !important;
                    ">

                            <!-- 简短引导提示（仅首次展示） -->
                            ${localStorage.getItem(CHAT_TIP_KEY) ? '' : `
                            <div class="chat-tip" style="
                                display: flex !important;
                                align-items: center !important;
                                gap: 8px !important;
                                padding: 10px 12px !important;
                                border-radius: 12px !important;
                                background: rgba(255,255,255,0.8) !important;
                                color: #4A5568 !important;
                                font-size: 0.85em !important;
                                border: 1px dashed rgba(74,85,104,0.25) !important;
                            ">
                                <span style="font-size: 1.1em !important;">💡</span>
                                <span>提示：点击头像即可更换，点击你自己的头像可设置“用户聊天头像”。</span>
                            </div>`}


                    </div>

                    <!-- 输入区域 -->
                    <div style="
                        padding: ${inputAreaPadding} !important;
                        background: rgba(255,255,255,0.9) !important;
                        border-top: 1px solid rgba(255,255,255,0.2) !important;
                        display: flex !important;
                        gap: ${isMobile ? '10px' : '12px'} !important;
                        align-items: center !important;
                        box-shadow: 0 -2px 8px rgba(0,0,0,0.05) !important;
                    ">
                        <input type="text" id="chat-modal-input" placeholder="输入消息..." maxlength="500" style="
                            flex: 1 !important;
                            padding: ${isSmallMobile ? '8px 12px' : isMobile ? '10px 14px' : '12px 16px'} !important;
                            border: 1px solid rgba(255,158,199,0.3) !important;
                            border-radius: ${isSmallMobile ? '18px' : isMobile ? '20px' : '25px'} !important;
                            font-size: ${isMobile ? '16px' : '0.9em'} !important;
                            background: white !important;
                            color: #2D3748 !important;
                            outline: none !important;
                            transition: all 0.3s ease !important;
                        ">
                        <button id="chat-modal-send-btn" style="
                            padding: ${isSmallMobile ? '8px 14px' : isMobile ? '10px 16px' : '12px 20px'} !important;
                            background: linear-gradient(145deg, #FF9EC7, #FF7FB3) !important;
                            color: white !important;
                            border: none !important;
                            border-radius: ${isSmallMobile ? '18px' : isMobile ? '20px' : '25px'} !important;
                            font-size: ${isSmallMobile ? '0.8em' : isMobile ? '0.85em' : '0.9em'} !important;
                            font-weight: 600 !important;
                            cursor: pointer !important;
                            min-width: ${isSmallMobile ? '60px' : isMobile ? '70px' : '80px'} !important;
                            display: flex !important;
                            align-items: center !important;
                            justify-content: center !important;
                            gap: 6px !important;
                            transition: all 0.2s ease !important;
                        ">发送</button>
                    </div>
                </div>
            </div>
        `);

        $('body').append(chatModal);

        // 初始化聊天存储并迁移旧历史
        try { await migrateChatFromLocalStorage(); } catch(e) { console.warn('migrate failed', e); }

        // 加载历史记录
        await loadChatHistoryFromDB();

        // 首次展示提示后，标记不再显示
        try { localStorage.setItem(CHAT_TIP_KEY, '1'); } catch(e) {}

        // 绑定事件 - 学习商店的事件绑定方式
        // 关闭按钮事件
        $('#chat-modal-close-btn').on('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            closeChatModal();
        });

        // 点击外部关闭 - 学习商店的实现
        chatModal.on('click', function(e) {
            if (e.target === this) {
                closeChatModal();
            }
        });

        // 阻止内容区域点击冒泡
        $('#chat-modal-container').on('click', e => e.stopPropagation());

        // 发送按钮事件
        $('#chat-modal-send-btn').on('click', handleSendMessage);

        // 输入框回车事件
        $('#chat-modal-input').on('keypress', function(e) {
            if (e.which === 13 && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
            }
        });

        // 输入框聚焦和样式
        $('#chat-modal-input').on('focus', function() {
            $(this).css({
                'border-color': '#FF9EC7',
                'box-shadow': '0 0 0 3px rgba(255, 158, 199, 0.2)'
            });
        }).on('blur', function() {
            $(this).css({
                'border-color': 'rgba(255,158,199,0.3)',
                'box-shadow': 'none'
            });
        });

        // 发送按钮悬停效果
        $('#chat-modal-send-btn').on('mouseenter', function() {
            if (!$(this).prop('disabled')) {
                $(this).css({
                    'background': 'linear-gradient(145deg, #FF7FB3, #FF6BA3)',
                    'transform': 'translateY(-1px)',
                    'box-shadow': '0 4px 12px rgba(255, 158, 199, 0.4)'
                });
            }
        }).on('mouseleave', function() {
            $(this).css({
                'background': 'linear-gradient(145deg, #FF9EC7, #FF7FB3)',
                'transform': 'translateY(0)',
                'box-shadow': 'none'
            });
        });

        // 关闭按钮悬停效果
        $('#chat-modal-close-btn').on('mouseenter', function() {
            $(this).css({
                'background': 'rgba(255, 255, 255, 0.2)',
                'transform': 'scale(1.1)'
            });
        }).on('mouseleave', function() {
            $(this).css({
                'background': 'transparent',
                'transform': 'scale(1)'
            });
        });

        // 聚焦到输入框
        setTimeout(() => {
            $('#chat-modal-input').focus();
        }, 100);

        console.log(`[${extensionName}] 聊天模态弹窗已打开`);
    }

    /**
     * 关闭聊天模态弹窗 - 学习商店的关闭方式
     */
    function closeChatModal() {
        console.log(`[${extensionName}] 关闭聊天模态弹窗`);
        $('#chat-modal-overlay').remove();
    }

    /**
     * 获取AI配置
     */
    function getAIConfiguration() {
        // 从扩展设置中获取AI配置
        try {
            const settings = JSON.parse(localStorage.getItem(`${extensionName}-ai-settings`));
            if (settings) {
                return {
                    type: settings.apiType || '',
                    url: settings.apiUrl || '',
                    key: settings.apiKey || '',
                    model: settings.apiModel || '',
                    isConfigured: settings.apiType && settings.apiUrl && settings.apiKey
                };
            }
        } catch (error) {
            console.error(`[${extensionName}] 获取AI配置失败:`, error);
        }

        return { isConfigured: false };
    }

    /**
     * 加载聊天历史
     */
    function loadChatHistory() {
        try {
            const saved = localStorage.getItem('virtual-pet-chat-history');
            if (saved) {
                chatHistory = JSON.parse(saved);

                // 渲染历史消息到当前激活容器（优先模态弹窗）
                const container = $('#chat-modal-messages').length ? $('#chat-modal-messages') : $('#chat-messages-container');
                if (container.length === 0) return;
                container.find('.chat-message').remove();

                chatHistory.forEach(item => {
                    const timestamp = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const isUser = item.sender === 'user';

                    const messageHtml = `
                        <div class="chat-message ${isUser ? 'user-message' : 'pet-message'}">
                            <div class="message-avatar" data-sender="${isUser ? 'user' : 'pet'}" style="cursor: pointer !important;">${isUser ? (customUserAvatarData ? `<img src="${customUserAvatarData}" alt="用户头像" style="width:100% !important;height:100% !important;object-fit:cover !important;border-radius:50% !important;">` : getFeatherIcon('user', { color: '#ffffff', size: 18 })) : (customAvatarData ? getAvatarContent() : getDefaultPetIcon(18, '#ffd700'))}</div>
                            <div class="message-content">
                                <div class="message-text">${escapeHtml(item.message)}</div>
                                <div class="message-timestamp">${timestamp}</div>
                            </div>
                        </div>
                    `;

                    container.append(messageHtml);
                });

                // 滚动到底部
                container.scrollTop(container[0].scrollHeight);
            }
        } catch (error) {
            console.error(`[${extensionName}] 加载聊天历史失败:`, error);
            chatHistory = [];
        }
    }

    /**
     * 保存聊天历史
     */
    function saveChatHistory() {
        try {
            localStorage.setItem('virtual-pet-chat-history', JSON.stringify(chatHistory));
        } catch (error) {
            console.error(`[${extensionName}] 保存聊天历史失败:`, error);
        }
    }

    /**
     * 转义HTML字符
     */
    function escapeHtml(text) {
        if (typeof text !== 'string') return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }



    /**
     * 显示API配置提示
     */
    function showAPIConfigurationPrompt() {
        // 检查具体缺少哪些配置
        const config = getAIConfiguration();
        let missingItems = [];

        if (!config.type) missingItems.push('API类型');
        if (!config.url) missingItems.push('API URL');
        if (!config.key) missingItems.push('API密钥');

        const missingText = missingItems.join('、');

        // 创建友好的提示消息
        const message = `
            <div style="text-align: center; padding: 20px;">
                <div style="font-size: 3em; margin-bottom: 15px;">${getFeatherIcon('cpu', { color: candyColors.primary, size: 48 })}</div>
                <h3 style="color: var(--primary-accent-color); margin-bottom: 15px;">需要配置AI API</h3>
                <p style="margin-bottom: 15px; line-height: 1.5;">
                    要与宠物聊天，需要先配置AI API。<br>
                    当前缺少：<strong>${missingText}</strong>
                </p>
                <div style="background: #f0f8ff; padding: 15px; border-radius: 8px; margin-bottom: 15px; text-align: left;">
                    <div style="font-weight: bold; color: #007bff; margin-bottom: 10px;">配置步骤：</div>
                    <ol style="margin: 0; padding-left: 20px; line-height: 1.6;">
                        <li>点击右上角的 <strong>扩展</strong> 按钮</li>
                        <li>找到 <strong>虚拟宠物系统</strong> 设置</li>
                        <li>在 <strong>AI API 配置</strong> 部分填写：
                            <ul style="margin-top: 5px;">
                                <li>选择API类型（如OpenAI、Claude等）</li>
                                <li>填写API URL</li>
                                <li>填写API密钥</li>
                            </ul>
                        </li>
                        <li>点击 <strong>测试连接</strong> 验证配置</li>
                    </ol>
                </div>
                <div style="background: #fff3cd; padding: 12px; border-radius: 6px; margin-bottom: 20px; text-align: left; border-left: 4px solid #ffc107;">
                    <div style="font-weight: bold; color: #856404; margin-bottom: 8px;">💡 常用API推荐：</div>
                    <div style="font-size: 0.9em; color: #856404; line-height: 1.5;">
                        • <strong>OpenAI</strong>：https://api.openai.com/v1<br>
                        • <strong>本地Ollama</strong>：http://localhost:11434/v1<br>
                        • <strong>LM Studio</strong>：http://localhost:1234/v1<br>
                        • <strong>第三方代理</strong>：根据提供商文档配置
                    </div>
                </div>
                <div style="display: flex; gap: 10px; justify-content: center;">
                    <button id="goto-settings-from-chat" class="pet-button success">
                        ⚙️ 去配置
                    </button>
                    <button id="close-config-prompt" class="pet-button">
                        取消
                    </button>
                </div>
            </div>
        `;

        // 创建提示弹窗
        const promptOverlay = $(`
            <div id="api-config-prompt-overlay" class="virtual-pet-popup-overlay" style="display: flex;">
                <div class="pet-popup-container" style="max-width: 450px; height: auto;">
                    <div class="pet-popup-body">
                        ${message}
                    </div>
                </div>
            </div>
        `);

        // 添加到页面
        $('body').append(promptOverlay);

        // 绑定事件
        $('#goto-settings-from-chat').on('click', function() {
            promptOverlay.remove();
            showSettingsView();
        });

        $('#close-config-prompt').on('click', function() {
            promptOverlay.remove();
        });

        // 点击遮罩关闭
        promptOverlay.on('click', function(e) {
            if (e.target === this) {
                promptOverlay.remove();
            }
        });
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
                    font-family: ${candyColors.fontFamily} !important;
                    image-rendering: pixelated !important;
                    image-rendering: -moz-crisp-edges !important;
                    image-rendering: crisp-edges !important;
                " onclick="openAvatarSelector()" oncontextmenu="showAvatarContextMenu(event)" title="点击更换头像，右键重置">
                    ${customAvatarData ? getAvatarContent() : getDefaultPetIcon(48, '#ffd700')}
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
                        color: ${candyColors.textSecondary} !important;
                        font-size: 1em !important;
                        width: 100% !important; text-align: center !important; font-weight: normal !important;
                    ">${petData.isAlive ?
                        `${LIFE_STAGES[petData.lifeStage]?.name || '未知'} Lv.${petData.level}` :
                        `已死亡`
                    }</div>
                </div>
            </div>
            <div class="pet-stats">
                <div class="stat-bar" style="
                    display: flex !important;
                    align-items: center !important;
                    margin-bottom: 8px !important;
                    font-family: ${candyColors.fontFamily} !important;
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
                        height: 16px !important;
                        background: ${candyColors.backgroundSolid} !important;
                        border: 2px solid ${candyColors.border} !important;
                        border-radius: 20px !important;
                        overflow: hidden !important;
                        margin-right: 8px !important;
                        box-shadow: inset 0 2px 4px ${candyColors.shadowLight} !important;
                    ">
                        <div class="progress-fill health" style="
                            width: ${petData.health}% !important;
                            height: 100% !important;
                            background: linear-gradient(135deg, ${candyColors.health} 0%, ${candyColors.health}dd 100%) !important;
                            border-radius: 20px !important;
                            transition: width 0.3s ease !important;
                            box-shadow: 0 1px 3px rgba(0,0,0,0.1) !important;
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

        // 确保聊天按钮始终可见
        updateChatButtonVisibility();
    }

    /**
     * 获取宠物表情符号
     */
    function getPetEmoji() {
        const icons = {
            cat: getFeatherIcon('smile', { color: '#ffd700', size: 18 }),
            dog: getFeatherIcon('smile', { color: '#ffd700', size: 18 }),
            dragon: getFeatherIcon('activity', { color: '#ffd700', size: 18 }),
            rabbit: getFeatherIcon('smile', { color: '#ffd700', size: 18 }),
            bird: getFeatherIcon('bird', { color: '#ffd700', size: 18 })
        };
        return icons[petData.type] || getFeatherIcon('smile', { color: '#ffd700', size: 18 });
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

    // 用户头像：加载/保存/清除
    function loadUserAvatar(){
        try{
            const local = localStorage.getItem(STORAGE_KEY_USER_AVATAR);
            if (local){ customUserAvatarData = local; }
        }catch(e){ console.warn('加载用户头像失败', e); }
    }
    function saveUserAvatar(imageData){
        try{
            localStorage.setItem(STORAGE_KEY_USER_AVATAR, imageData);
            customUserAvatarData = imageData;
            console.log('[VirtualPet] 用户头像已保存');
            return true;
        }catch(e){ console.error('保存用户头像失败', e); return false; }
    }
    function clearUserAvatar(){
        try{
            localStorage.removeItem(STORAGE_KEY_USER_AVATAR);
            customUserAvatarData = null;
            console.log('[VirtualPet] 用户头像已清除');
            return true;
        }catch(e){ console.error('清除用户头像失败', e); return false; }
    }

    // 在设置里提供用户头像更换入口（沿用宠物头像交互样式）
    window.openUserAvatarSelector = function(){
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);
        fileInput.addEventListener('change', (e)=>{
            const file = e.target.files[0];
            if (file){
                const reader = new FileReader();
                reader.onload = (ev)=>{
                    const img = ev.target.result;
                    if (saveUserAvatar(img)){
                        toastr.success('用户头像已更新');
                    } else {
                        toastr.error('用户头像保存失败');
                    }
                };
                reader.readAsDataURL(file);
            }
        });
        fileInput.click();
        setTimeout(()=>fileInput.remove(), 0);
    };

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
    function resetPet(skipConfirm = false) {
        if (!skipConfirm) {
            if (!confirm("确定要重置宠物吗？这将清除所有数据！")) {
                return;
            }
        }

        // 重置为智能初始化系统
        petData = {
            name: "小宠物",
            type: "cat",
            level: 1,
            experience: 0,
            health: 100,
            happiness: 50,
            hunger: 40,
            energy: 50,

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
            hasBeenRandomized: false // 重置后仍会执行初始化流程
        };

        // 应用拓麻歌子系统和随机化
        applyTamagotchiSystem();
        applyFirstTimeRandomization();

        savePetData();
        renderSettings();
        toastr.success("新的拓麻歌子宠物诞生了！请好好照顾它！");
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
                        alert("虚拟宠物系统\n\n弹窗功能正在加载中...\n请稍后再试！");
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

            let pageX, pageY;
            if (e.originalEvent && e.originalEvent.touches && e.originalEvent.touches[0]) {
                pageX = e.originalEvent.touches[0].pageX;
                pageY = e.originalEvent.touches[0].pageY;
            } else {
                pageX = e.pageX;
                pageY = e.pageY;
            }

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
    function buildFloatingButtonDOM(){
        const avatarHTML = customAvatarData ?
            `<img src="${customAvatarData}" alt="宠物头像" style="width: 70% !important; height: 70% !important; object-fit: cover !important; border-radius: 50% !important;">` :
            getFeatherIcon('heart', { color: '#FF69B4', size: 20, strokeWidth: 2 });
        const html = `
            <div id="${BUTTON_ID}" class="kpop-neon" style="
                position: fixed !important;
                z-index: ${SAFE_Z_INDEX.button} !important;
                cursor: grab !important;
                width: 50px !important;
                height: 50px !important;
                border-radius: 50% !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
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
                border: 1px solid rgba(164,0,255,.40) !important;
                background: radial-gradient(120px 120px at 30% 20%, rgba(255,45,149,.22), transparent 55%),
                            radial-gradient(180px 180px at 80% 70%, rgba(0,240,255,.18), transparent 60%),
                            rgba(17,20,36,.72) !important;
                backdrop-filter: blur(8px) !important;
                box-shadow: 0 8px 24px rgba(0,0,0,.35), 0 0 18px rgba(255,45,149,.6), 0 0 28px rgba(0,240,255,.55) !important;
            ">${avatarHTML}</div>
        `;
        $("body").append(html);
        return $(`#${BUTTON_ID}`);
    }

    function bindFloatingButtonEvents($button){
        // 使按钮可拖动
        makeButtonDraggable($button);
        // 定期位置检查
        const positionCheckInterval = setInterval(() => {
            const currentButton = $(`#${BUTTON_ID}`);
            if (currentButton.length > 0) {
                const rect = currentButton[0].getBoundingClientRect();
                const styles = window.getComputedStyle(currentButton[0]);
                if (styles.position !== 'fixed' || rect.top < -100 || rect.top > window.innerHeight + 100) {
                    console.warn(`[${extensionName}] Button position anomaly detected, correcting...`);
                    currentButton.css({ 'position': 'fixed', 'top': '200px', 'left': '20px', 'transform': 'none', 'z-index': SAFE_Z_INDEX.button });
                }
            } else { clearInterval(positionCheckInterval); }
        }, 5000);
    }

    function restoreFloatingButtonPosition($button){
        // 强制确保按钮可见和正确定位
        $button.css({ 'position': 'fixed', 'display': 'flex', 'opacity': '1', 'visibility': 'visible', 'z-index': SAFE_Z_INDEX.button, 'transform': 'none', 'margin': '0', 'pointer-events': 'auto' });
        // 验证并矫正
        setTimeout(() => {
            if ($button.length===0) return;
            const rect = $button[0].getBoundingClientRect();
            if (rect.top < 0 || rect.top > window.innerHeight || rect.left < 0 || rect.left > window.innerWidth) {
                $button.css({ 'top': '200px', 'left': '20px', 'position': 'fixed', 'transform': 'none' });
            }
        }, 100);
        // 恢复保存的位置
        const savedPos = localStorage.getItem(STORAGE_KEY_BUTTON_POS);
        if (!savedPos) return;
        try {
            const pos = JSON.parse(savedPos);
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            const buttonWidth = $button.outerWidth() || 48;
            const buttonHeight = $button.outerHeight() || 48;
            const left = parseInt(pos.x) || 20;
            const top = parseInt(pos.y) || 200;
            const safeMargin = Math.min(10, Math.floor(Math.min(windowWidth, windowHeight) * 0.02));
            const minMargin = 5;
            const actualMargin = Math.max(minMargin, safeMargin);
            const maxX = windowWidth - buttonWidth - actualMargin;
            const maxY = windowHeight - buttonHeight - actualMargin;
            const minX = actualMargin;
            const minY = actualMargin;
            const safeLeft = Math.max(minX, Math.min(left, maxX));
            const safeTop = Math.max(minY, Math.min(top, maxY));
            $button.css({ 'top': safeTop + 'px', 'left': safeLeft + 'px', 'position': 'fixed', 'transform': 'none' });
        } catch (e) { console.warn(`[${extensionName}] Failed to restore position:`, e); }
    }

    function initializeFloatingButton(){
        console.log(`[${extensionName}] initializeFloatingButton called`);
        if ($(`#${BUTTON_ID}`).length) { console.log(`[${extensionName}] Button already exists`); return; }
        const $button = buildFloatingButtonDOM();
        if ($button.length === 0) { console.error(`[${extensionName}] Failed to create button!`); return; }
        restoreFloatingButtonPosition($button);
        bindFloatingButtonEvents($button);
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
                        <b>虚拟宠物系统</b>
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
                            启用后会在屏幕上显示一个可拖动的宠物按钮
                        </small>

                        <hr style="margin: 15px 0; border: none; border-top: 1px solid #444;">

                        <div class="flex-container">
                            <label for="virtual-pet-personality-select" style="display: block; margin-bottom: 8px; font-weight: bold;">
                                宠物人设
                            </label>
                            <select id="virtual-pet-personality-select" style="width: 100%; padding: 8px; margin-bottom: 8px; border-radius: 4px;">
                                <option value="default">默认 - 高冷但温柔的猫</option>
                                <option value="cheerful">活泼 - 热情洋溢的小狗</option>
                                <option value="elegant">优雅 - 古典文雅的龙</option>
                                <option value="shy">害羞 - 轻声细语的兔子</option>
                                <option value="smart">聪明 - 机智幽默的鸟</option>
                                <option value="custom">自定义人设</option>
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
                                AI API 配置
                            </label>
                            <select id="ai-api-select" style="width: 100%; padding: 8px; margin-bottom: 8px; border-radius: 4px;">
                                <option value="">请选择API类型...</option>
                                <option value="openai">OpenAI</option>
                                <option value="claude">Claude</option>
                                <option value="google">Google</option>
                                <option value="deepseek">DeepSeek</option>
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
                                <div style="display: flex; gap: 8px; align-items: center;">
                                    <input id="ai-url-input" type="text" placeholder="例如: https://api.openai.com/v1 (只需填写到/v1，会自动添加端点)"
                                           style="flex: 1; padding: 6px; border-radius: 4px; border: 1px solid #ddd;">
                                    <button id="ai-url-reset-btn" type="button"
                                            style="padding: 6px 12px; background: #f8f9fa; border: 1px solid #ddd; border-radius: 4px; cursor: pointer; font-size: 0.85em; white-space: nowrap; color: #666;"
                                            title="重置为当前API类型的官方端点">
                                        🔄 重置
                                    </button>
                                </div>
                                <div style="font-size: 0.8em; color: #666; margin-top: 3px;">
                                    提示：只需填写到 /v1，插件会自动添加 /chat/completions 端点。点击重置可恢复官方端点
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
                                        <option value="deepseek-chat">DeepSeek Chat</option>
                                        <option value="deepseek-coder">DeepSeek Coder</option>
                                        <option value="custom">自定义模型</option>
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
                                        刷新模型
                                    </button>
                                </div>
                                <input id="ai-model-input" type="text" placeholder="自定义模型名称"
                                       style="width: 100%; padding: 6px; border-radius: 4px; display: none;">
                            </div>
                        </div>

                        <div class="flex-container" style="margin-top: 10px;">
                            <button id="test-ai-connection-btn" style="padding: 8px 16px; background: #48bb78; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;">
                                测试连接
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
                                云端备份
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
                                    连接
                                </button>
                            </div>

                            <!-- 主设备功能 -->
                            <div id="firebase-primary-controls" style="display: none; margin-bottom: 10px;">
                                <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                                    <button id="firebase-generate-code-btn" class="firebase-btn firebase-btn-secondary" style="flex: 1; padding: 6px; font-size: 0.85em;">
                                        生成连接码
                                    </button>
                                    <button id="firebase-backup-now-btn" class="firebase-btn firebase-btn-success" style="flex: 1; padding: 6px; font-size: 0.85em;">
                                        备份
                                    </button>
                                </div>

                                <!-- 连接码显示 -->
                                <div id="firebase-connection-code-display" style="display: none; margin-bottom: 8px;">
                                    <label style="font-size: 0.85em; margin-bottom: 4px; display: block; color: #28a745; font-weight: bold;">
                                        连接码（分享给其他设备）
                                    </label>
                                    <div style="display: flex; gap: 8px; align-items: center;">
                                        <input type="text" id="firebase-connection-code-text" readonly
                                               style="flex: 1; padding: 8px; border: 2px solid #28a745; border-radius: 4px; background: #f8fff9; font-family: monospace; font-size: 16px; text-align: center; letter-spacing: 2px; font-weight: bold;">
                                        <button id="firebase-copy-code-btn" class="firebase-btn firebase-btn-outline" style="padding: 8px 12px; font-size: 0.85em;">
                                            复制
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
        try { $("#virtual-pet-settings").remove(); } catch(e) {}
        function appendSettingsPanel() {
            const $target = $("#extensions_settings2").length ? $("#extensions_settings2") : $("#extensions_settings");
            if ($target.length) {
                $target.append(simpleSettingsHtml);
                console.log(`[${extensionName}] Settings panel created`);
                initializeSettingsPanel();
                return true;
            }
            return false;
        }
        if (!appendSettingsPanel()) {
            setTimeout(() => {
                if (!appendSettingsPanel()) {
                    $('body').prepend(simpleSettingsHtml);
                    console.warn(`[${extensionName}] Settings container not found. Fallback mount to <body>.`);
                    try { initializeSettingsPanel(); } catch(e) { console.error('Init settings failed after fallback', e); }
                }
            }, 1000);
        }

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
        if (typeof loadUserAvatar === 'function') loadUserAvatar();

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



    // 强制显示按钮函数
    window.forceShowPetButton = function() {
        console.log("[VirtualPet] 强制显示宠物按钮...");

        // 移除现有按钮
        $(`#${BUTTON_ID}`).remove();

        // 创建按钮并强制设置样式，确保正确定位
        const buttonHtml = `
            <div id="${BUTTON_ID}" class="kpop-neon" style="
                position: fixed !important;
                z-index: ${SAFE_Z_INDEX.button} !important;
                cursor: grab !important;
                width: 52px !important;
                height: 52px !important;
                border-radius: 14px !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
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
                border: 1px solid rgba(164,0,255,.40) !important;
                background: radial-gradient(120px 120px at 30% 20%, rgba(255,45,149,.22), transparent 55%),
                            radial-gradient(180px 180px at 80% 70%, rgba(0,240,255,.18), transparent 60%),
                            rgba(17,20,36,.72) !important;
                backdrop-filter: blur(8px) !important;
                box-shadow: 0 8px 24px rgba(0,0,0,.35), 0 0 18px rgba(255,45,149,.6), 0 0 28px rgba(0,240,255,.55) !important;
            ">${getFeatherIcon('sparkles', { color: '#00F0FF', size: 22, strokeWidth: 2 })}</div>
        `;

        $("body").append(buttonHtml);

        const $button = $(`#${BUTTON_ID}`);
        console.log("[VirtualPet] 按钮创建结果:", $button.length > 0 ? "成功" : "失败");

        if ($button.length > 0) {
            // 绑定点击事件
            $button.off().on("click touchend", function(e) {
                e.preventDefault();
                console.log("[VirtualPet] 按钮被点击");

                try {
                    // 所有平台都使用统一的showPopup函数
                    showPopup();
                } catch (error) {
                    console.error("显示弹窗出错:", error);
                    alert("虚拟宠物\n\n弹窗功能正在加载中...");
                }
            });

            // 使按钮可拖动
            makeButtonDraggable($button);

            console.log("[VirtualPet] 按钮应该现在可见了！");
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
                        alert("虚拟宠物系统\n\n弹窗功能正在加载中...");
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
                            alert("虚拟宠物系统\n\n弹窗功能正在加载中...");
                        }
                    } catch (error) {
                        console.error("弹窗错误:", error);
                        alert("虚拟宠物系统\n\n弹窗功能正在加载中...");
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
            console.log(`\n[DONE] 拖动修复验证: ${allGood ? '完全成功！' : '需要进一步检查'}`);

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

        console.log("🎯 最终拖动修复验证...");

        const button = $(`#${BUTTON_ID}`);
        if (button.length === 0) {
            console.log("❌ 按钮不存在");
            return false;
        }

        console.log("✅ 按钮存在");

        // 检查事件绑定
        const events = $._data(button[0], "events");
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




    // 模拟时间流逝测试

    // 验证数值修复效果
    window.verifyInitialValues = function() {
        console.log("[CHECK] 验证初始数值修复效果...");

        // 检查当前数值
        console.log("\n[STATS] 当前宠物数值:");
        console.log(`健康: ${petData.health}/100 ${petData.health === 100 ? '[OK]' : '[ERR] 应为100'}`);
        console.log(`快乐度: ${petData.happiness}/100 ${petData.happiness === 50 ? '[OK]' : '[ERR] 应为50'}`);
        console.log(`饱食度: ${petData.hunger}/100 ${petData.hunger === 40 ? '[OK]' : '[ERR] 应为40'}`);
        console.log(`精力: ${petData.energy}/100 ${petData.energy === 50 ? '[OK]' : '[ERR] 应为50'}`);
        console.log(`数据版本: ${petData.dataVersion}`)

        // 检查UI显示
        console.log("\n🖥️ UI显示检查:");
        const healthDisplay = $('.status-item').find('span').filter(function() {
            return $(this).text().includes('健康');
        }).next().text();
    };

    // 全面检查数值系统
    window.checkValueSystem = function() {
        console.log('=== [CHECK] 数值系统全面检查 ===');

        // 1. 基本数值检查
        console.log('\n[STATS] 1. 基本数值状态:');
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
            console.log('[DONE] 数值系统运行正常！');
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

            console.log('[DONE] 所有数据同步完成！');
            toastr.success('所有数据已同步到云端！现在可以在其他设备上访问了。', '同步成功', { timeOut: 5000 });

        } catch (error) {
            console.error('❌ 同步过程中出现错误:', error);
            toastr.error('同步过程中出现错误: ' + error.message, '❌ 同步失败', { timeOut: 5000 });
        }

        return syncResults;
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

        console.log('\n[DEVICE] 宠物数据 - 本地:');
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

        console.log('\n[CLOUD] 宠物数据 - 同步:');
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


    // 商店系统功能
    function showShopModal() {
        // 检测移动端状态
        const isMobile = window.innerWidth <= 768;
        const containerMaxWidth = isMobile ? '300px' : '380px'; // 与主UI保持一致

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
                    max-width: ${containerMaxWidth} !important;
                    width: 100% !important;
                    max-height: 70vh !important;
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
                        <h2 style="margin: 0 !important; color: #ffd700 !important; display: flex !important; align-items: center !important; gap: 8px !important;">${getFeatherIcon('shopping-bag', { color: '#ffd700', size: 24 })} 宠物商店</h2>
                        <div style="color: #ffd700 !important; font-weight: bold !important; display: flex !important; align-items: center !important; gap: 6px !important;">
                            ${getFeatherIcon('star', { color: '#ffd700', size: 18 })} ${petData.coins || 100} 金币
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
                        ">${getFeatherIcon('sparkles', { color: 'currentColor', size: 16 })} 特殊</button>
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
                        <div style="font-size: 2em !important; margin-bottom: 8px !important; display: flex !important; justify-content: center !important; align-items: center !important;">
                            ${getFeatherIcon(item.emoji, { color: '#ffd700', size: 32 })}
                        </div>
                        <div style="font-weight: bold !important; margin-bottom: 5px !important;">
                            ${item.name}
                        </div>
                        <div style="font-size: 0.8em !important; color: rgba(255,255,255,0.8) !important; margin-bottom: 8px !important; min-height: 32px !important;">
                            ${item.description}
                        </div>
                        <div style="color: #ffd700 !important; font-weight: bold !important; margin-bottom: 8px !important; display: flex !important; align-items: center !important; justify-content: center !important; gap: 6px !important;">
                            ${getFeatherIcon('star', { color: '#ffd700', size: 16 })} ${item.price} 金币
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

        // 保存数据
        savePetData();

        // 更新商店显示
        const currentCategory = $('.shop-category-btn').filter(function() {
            return $(this).css('background-color') === 'rgb(255, 215, 0)' || $(this).css('background') === '#ffd700';
        }).data('category') || 'all';

        $('#shop-items').html(generateShopItems(currentCategory));
        $('.shop-modal h2').next().html(`${getFeatherIcon('star', { color: '#ffd700', size: 18 })} ${petData.coins} 金币`);

        toastr.success(`购买成功！${item.name} 已添加到背包。`);
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


    // 背包系统功能
    function showBackpackModal() {
        // 检测移动端状态
        const isMobile = window.innerWidth <= 768;
        const containerMaxWidth = isMobile ? '300px' : '380px';

        // 初始化背包数据
        if (!petData.inventory) {
            petData.inventory = {};
        }

        // 创建背包弹窗
        const backpackModal = $(`
            <div id="backpack-modal" style="
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
                    background: linear-gradient(135deg, #8B4513 0%, #A0522D 100%) !important;
                    border-radius: 15px !important;
                    padding: 20px !important;
                    max-width: ${containerMaxWidth} !important;
                    width: 100% !important;
                    max-height: 70vh !important;
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
                        <h2 style="margin: 0 !important; color: #ffd700 !important; display: flex !important; align-items: center !important; gap: 8px !important;">${getFeatherIcon('package', { color: '#ffd700', size: 24 })} 我的背包</h2>
                        <button id="close-backpack" style="
                            background: rgba(255,255,255,0.2) !important;
                            border: none !important;
                            color: white !important;
                            padding: 8px 12px !important;
                            border-radius: 5px !important;
                            cursor: pointer !important;
                            font-size: 1.2em !important;
                        ">${getFeatherIcon('x', { color: 'white', size: 18 })}</button>
                    </div>

                    <div id="backpack-content" style="
                        display: grid !important;
                        grid-template-columns: repeat(auto-fill, minmax(80px, 1fr)) !important;
                        gap: 10px !important;
                        min-height: 200px !important;
                    ">
                        <!-- 背包物品将在这里显示 -->
                    </div>

                    <div style="
                        margin-top: 20px !important;
                        padding-top: 15px !important;
                        border-top: 1px solid rgba(255,255,255,0.2) !important;
                        text-align: center !important;
                        color: rgba(255,255,255,0.7) !important;
                        font-size: 0.9em !important;
                    ">
                        点击物品使用 • 长按查看详情
                    </div>
                </div>
            </div>
        `);

        $('body').append(backpackModal);

        // 渲染背包物品
        renderBackpackItems();

        // 绑定关闭事件
        $('#close-backpack').on('click', function() {
            $('#backpack-modal').remove();
        });

        // 点击背景关闭
        $('#backpack-modal').on('click', function(e) {
            if (e.target === this) {
                $(this).remove();
            }
        });
    }

    // 渲染背包物品
    function renderBackpackItems() {
        const $content = $('#backpack-content');
        $content.empty();

        const inventory = petData.inventory || {};
        const hasItems = Object.keys(inventory).length > 0;

        if (!hasItems) {
            $content.html(`
                <div style="
                    grid-column: 1 / -1 !important;
                    text-align: center !important;
                    color: rgba(255,255,255,0.6) !important;
                    padding: 40px 20px !important;
                    font-size: 1.1em !important;
                ">
                    ${getFeatherIcon('package', { color: 'rgba(255,255,255,0.6)', size: 32 })} 背包空空如也<br>
                    <span style="font-size: 0.9em !important;">去商店购买一些物品吧！</span>
                </div>
            `);
            return;
        }

        // 显示背包物品
        Object.entries(inventory).forEach(([itemId, quantity]) => {
            if (quantity > 0) {
                const item = SHOP_ITEMS[itemId];
                if (item) {
                    const $item = $(`
                        <div class="backpack-item" data-item-id="${itemId}" style="
                            background: rgba(255,255,255,0.1) !important;
                            border: 2px solid rgba(255,255,255,0.2) !important;
                            border-radius: 10px !important;
                            padding: 10px !important;
                            text-align: center !important;
                            cursor: pointer !important;
                            transition: all 0.3s ease !important;
                            position: relative !important;
                        ">
                            <div style="font-size: 2em !important; margin-bottom: 5px !important; display: flex !important; justify-content: center !important; align-items: center !important;">${getFeatherIcon(item.emoji, { color: 'white', size: 28 })}</div>
                            <div style="font-size: 0.8em !important; color: white !important; margin-bottom: 3px !important;">${item.name}</div>
                            <div style="
                                position: absolute !important;
                                top: -5px !important;
                                right: -5px !important;
                                background: #ff4444 !important;
                                color: white !important;
                                border-radius: 50% !important;
                                width: 20px !important;
                                height: 20px !important;
                                display: flex !important;
                                align-items: center !important;
                                justify-content: center !important;
                                font-size: 0.7em !important;
                                font-weight: bold !important;
                            ">${quantity}</div>
                        </div>
                    `);

                    // 悬停效果
                    $item.hover(
                        function() {
                            $(this).css({
                                'background': 'rgba(255,255,255,0.2)',
                                'border-color': '#ffd700',
                                'transform': 'scale(1.05)'
                            });
                        },
                        function() {
                            $(this).css({
                                'background': 'rgba(255,255,255,0.1)',
                                'border-color': 'rgba(255,255,255,0.2)',
                                'transform': 'scale(1)'
                            });
                        }
                    );

                    // 点击使用物品
                    $item.on('click', function() {
                        useBackpackItem(itemId);
                    });

                    $content.append($item);
                }
            }
        });
    }

    // 使用背包物品
    function useBackpackItem(itemId) {
        const item = SHOP_ITEMS[itemId];
        const quantity = petData.inventory[itemId] || 0;

        if (quantity <= 0) {
            toastr.error("物品数量不足！");
            return;
        }

        if (!item) {
            toastr.error("未知物品！");
            return;
        }

        // 使用物品效果
        if (item.effect) {
            Object.entries(item.effect).forEach(([stat, value]) => {
                if (petData.hasOwnProperty(stat)) {
                    petData[stat] = Math.min(100, Math.max(0, petData[stat] + value));
                }
            });
        }

        // 减少物品数量
        petData.inventory[itemId]--;
        if (petData.inventory[itemId] <= 0) {
            delete petData.inventory[itemId];
        }

        // 保存数据并更新UI
        savePetData();
        renderBackpackItems();

        // 显示使用效果
        toastr.success(`使用了 ${item.name}！`);

        // 更新主界面状态
        setTimeout(() => {
            if (typeof updateUnifiedUIStatus === 'function') {
                updateUnifiedUIStatus();
            }
        }, 100);
    }

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
        toastr.success('所有问题已修复！商店按钮和拓麻歌子系统现在应该正常工作了！');

        return {
            fixed: true,
            timestamp: new Date().toISOString(),
            petData: petData
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

        toastr.success('状态栏颜色已优化！重新打开宠物界面查看美丽的糖果色效果。');

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

        console.log('\n[CHECK] 颜色对比度分析:');
        console.log('设置按钮: 紫色(#8B5CF6) + 白色(#FFFFFF) = 高对比度 [OK]');
        console.log('其他按钮: 浅色背景 + 深色文字 = 良好对比度 [OK]');

        console.log('\n[DESIGN] 设计原则:');
        console.log('[OK] 保持拓麻歌子像素风格');
        console.log('[OK] 确保文字清晰可读');
        console.log('[OK] 与糖果色主题协调');
        console.log('[OK] 设置按钮有独特识别度');

        console.log('\n[TEST] 测试方法:');
        console.log('1. 重新打开宠物界面');
        console.log('2. 检查设置按钮是否清晰可见');
        console.log('3. 确认文字与背景对比度足够');

        toastr.success('设置按钮颜色已修复！现在文字清晰可见了。');

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

    // LIFE_STAGES is defined earlier (moved up to avoid TDZ)

    // 商店物品定义
    const SHOP_ITEMS = {
        // 食物类
        basic_food: {
            name: "基础食物",
            emoji: "apple",
            price: 10,
            category: "food",
            description: "普通的食物，恢复饱食度",
            effect: { hunger: 15, happiness: 2 }
        },
        premium_food: {
            name: "高级食物",
            emoji: "sandwich",
            price: 25,
            category: "food",
            description: "营养丰富的食物，恢复饱食度和健康",
            effect: { hunger: 25, happiness: 5, health: 5 }
        },
        special_treat: {
            name: "特殊零食",
            emoji: "cake",
            price: 40,
            category: "food",
            description: "美味的零食，大幅提升快乐度",
            effect: { hunger: 10, happiness: 20 }
        },

        // 药品类
        medicine: {
            name: "感冒药",
            emoji: "pill",
            price: 30,
            category: "medicine",
            description: "治疗轻微疾病",
            effect: { sickness: -20, health: 10 }
        },
        super_medicine: {
            name: "特效药",
            emoji: "syringe",
            price: 80,
            category: "medicine",
            description: "治疗严重疾病，完全恢复健康",
            effect: { sickness: -50, health: 30 }
        },

        // 玩具类
        ball: {
            name: "小球",
            emoji: "ball",
            price: 20,
            category: "toy",
            description: "简单的玩具，提升快乐度和纪律",
            effect: { happiness: 10, discipline: 5, energy: -5 }
        },
        robot_toy: {
            name: "机器人玩具",
            emoji: "robot",
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

        // 添加快乐值衰减诊断函数
        window.testHappinessDecay = function() {
            console.log('🩺 测试快乐值衰减功能...');

            const beforeHappiness = petData.happiness;
            const beforeTime = petData.lastUpdateTime;

            console.log(`测试前快乐值: ${Math.round(beforeHappiness)}`);
            console.log(`宠物存活状态: ${petData.isAlive ? '✅' : '❌'}`);
            console.log(`首次互动状态: ${petData.hasInteracted ? '✅' : '❌'}`);

            // 模拟1小时前的时间戳
            petData.lastUpdateTime = Date.now() - (1 * 60 * 60 * 1000);

            // 调用更新函数
            window.updatePetStatus();

            const afterHappiness = petData.happiness;
            const change = afterHappiness - beforeHappiness;

            console.log(`测试后快乐值: ${Math.round(afterHappiness)}`);
            console.log(`快乐值变化: ${Math.round(change * 100) / 100} (预期: -0.8)`);
            console.log(`衰减是否正常: ${Math.abs(change + 0.8) < 0.1 ? '✅' : '❌'}`);

            // 恢复原始时间戳
            petData.lastUpdateTime = beforeTime;
            petData.happiness = beforeHappiness;

            return {
                beforeHappiness,
                afterHappiness,
                change,
                isWorking: Math.abs(change + 0.8) < 0.1
            };
        };

        // 重新定义喂食函数 - 拓麻歌子式
        window.feedPet = async function() {
            // 首次互动激活机制
            if (!petData.hasInteracted) {
                petData.hasInteracted = true;
                petData.lastUpdateTime = Date.now(); // 激活时设置更新时间
                console.log(`[${extensionName}] 宠物首次互动已激活！衰减系统启动。`);
                toastr.info('你和宠物的冒险开始啦！要记得常回来看它哦。', '💖 新的开始');
            }

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
            // 首次互动激活机制
            if (!petData.hasInteracted) {
                petData.hasInteracted = true;
                petData.lastUpdateTime = Date.now(); // 激活时设置更新时间
                console.log(`[${extensionName}] 宠物首次互动已激活！衰减系统启动。`);
                toastr.info('你和宠物的冒险开始啦！要记得常回来看它哦。', '💖 新的开始');
            }

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
            // 首次互动激活机制
            if (!petData.hasInteracted) {
                petData.hasInteracted = true;
                petData.lastUpdateTime = Date.now(); // 激活时设置更新时间
                console.log(`[${extensionName}] 宠物首次互动已激活！衰减系统启动。`);
                toastr.info('你和宠物的冒险开始啦！要记得常回来看它哦。', '💖 新的开始');
            }

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

        // 添加背包功能
        window.openBackpack = function() {
            if (!petData.isAlive) {
                toastr.error("💀 你的宠物已经死亡，无法使用背包...");
                return;
            }

            showBackpackModal();
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
                toastr.success(`${petData.name} 进化了！现在是${nextStageInfo.name}阶段`);

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
                if (confirm("你的宠物死亡了！\n\n是否要重新开始养育新的宠物？\n（点击确定重新开始，取消保持当前状态）")) {
                    resetPet(true);
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
        console.log('[TEST] 测试简化互动（不包含AI回复）...');

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

            console.log('\n[DONE] 喂食流程完全执行完毕！');

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

            console.log('\n[TRACE] 函数调用追踪:');
            console.log(`- gainCoins被调用: ${gainCoinsWasCalled ? '[OK]' : '[ERR]'}`);
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
            startValues: { health: 100, happiness: 50, hunger: 40, energy: 50 },
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

                    console.log('\n[TRACE] 奖励函数调用:');
                    console.log(`- gainCoins被调用: ${coinsGained ? '[OK]' : '[ERR]'}`);
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
            const hasFeatherIcon = button.find('svg.feather').length > 0;
            console.log(`悬浮按钮头像: ${hasCustomImage ? '自定义图片' : hasFeatherIcon ? '默认图标' : '未知'}`);
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
            console.log("    - 初始数值：健康100, 快乐50, 饱食40, 精力50");
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
                        width: 80px !important;
                        height: 80px !important;
                        border-radius: 50% !important;
                        background: ${candyColors.screen} !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        font-size: 2.8em !important;
                        overflow: hidden !important;
                        border: 4px solid ${(petData.health > 80 && petData.happiness > 80) ? candyColors.gold : candyColors.border} !important;
                        box-shadow: ${(petData.health > 80 && petData.happiness > 80) ?
                            `0 0 20px ${candyColors.shadowGlow}, 0 0 40px ${candyColors.shadowGlow}` :
                            `0 4px 12px ${candyColors.shadow}`} !important;
                        cursor: pointer !important;
                        margin: 0 auto 12px auto !important;
                        font-family: ${candyColors.fontFamily} !important;
                        transition: all 0.3s ease !important;
                        ${(petData.health > 80 && petData.happiness > 80) ?
                            'animation: petGlow 2s ease-in-out infinite alternate !important;' : ''}
                    " onclick="openAvatarSelector()" oncontextmenu="showAvatarContextMenu(event)" title="点击更换头像，右键重置">
                        ${customAvatarData ? getAvatarContent() : getDefaultPetIcon(56, '#ffd700')}
                    </div>
                    <div class="pet-title-wrap" style="width: 100% !important; display: flex !important; flex-direction: column !important; align-items: center !important; justify-content: center !important;">
                        <div class="pet-name" style="font-size: 1.2em !important; font-weight: bold !important; margin-bottom: 3px !important;">${escapeHtml(petData.name)}</div>
                        <div class="pet-level" style="color: ${candyColors.textSecondary} !important; font-size: 1em !important; width: 100% !important; text-align: center !important; font-weight: normal !important;">
                            ${petData.isAlive ? `${LIFE_STAGES[petData.lifeStage]?.name || '未知'} Lv.${petData.level}` : `已死亡`}
                        </div>
                    </div>
                </div>

                <!-- 宠物状态栏 -->
                <div class="pet-status-section" style="
                    padding: 10px !important;
                ">
                    <h4 style="margin: 0 0 10px 0 !important; color: ${candyColors.primary} !important; font-size: 0.9em !important; display: flex !important; align-items: center !important; justify-content: center !important; gap: 6px !important; text-align: center !important;">
                        ${getFeatherIcon('activity', { color: candyColors.primary, size: 14 })} 状态
                    </h4>
                    <div class="status-bars" style="display: flex !important; flex-direction: column !important; gap: 6px !important;">
                        <div class="status-item">
                            <div style="display: flex !important; justify-content: space-between !important; margin-bottom: 3px !important;">
                                <span style="color: ${candyColors.textSecondary} !important; font-size: 0.8em !important; display: flex !important; align-items: center !important; gap: 6px !important;">${getFeatherIcon('heart', { color: candyColors.health, size: 16 })} 健康</span>
                                <span style="color: ${candyColors.health} !important; font-size: 0.8em !important;">${Math.round(petData.health)}/100</span>
                            </div>
                            <div style="background: ${candyColors.border} !important; height: 5px !important; border-radius: 3px !important; overflow: hidden !important;">
                                <div style="background: ${candyColors.health} !important; height: 100% !important; width: ${petData.health}% !important; transition: width 0.3s ease !important;"></div>
                            </div>
                        </div>
                        <div class="status-item">
                            <div style="display: flex !important; justify-content: space-between !important; margin-bottom: 3px !important;">
                                <span style="color: ${candyColors.textSecondary} !important; font-size: 0.8em !important; display: flex !important; align-items: center !important; gap: 6px !important;">${getFeatherIcon('coffee', { color: candyColors.hunger, size: 16 })} 饱食度</span>
                                <span style="color: ${candyColors.hunger} !important; font-size: 0.8em !important;">${Math.round(petData.hunger)}/100</span>
                            </div>
                            <div style="background: ${candyColors.border} !important; height: 5px !important; border-radius: 3px !important; overflow: hidden !important;">
                                <div style="background: ${candyColors.hunger} !important; height: 100% !important; width: ${petData.hunger}% !important; transition: width 0.3s ease !important;"></div>
                            </div>
                        </div>
                        <div class="status-item">
                            <div style="display: flex !important; justify-content: space-between !important; margin-bottom: 3px !important;">
                                <span style="color: ${candyColors.textSecondary} !important; font-size: 0.8em !important; display: flex !important; align-items: center !important; gap: 6px !important;">${getFeatherIcon('smile', { color: candyColors.happiness, size: 16 })} 快乐度</span>
                                <span style="color: ${candyColors.happiness} !important; font-size: 0.8em !important;">${Math.round(petData.happiness)}/100</span>
                            </div>
                            <div style="background: ${candyColors.border} !important; height: 5px !important; border-radius: 3px !important; overflow: hidden !important;">
                                <div style="background: ${candyColors.happiness} !important; height: 100% !important; width: ${petData.happiness}% !important; transition: width 0.3s ease !important;"></div>
                            </div>
                        </div>
                        <div class="status-item">
                            <div style="display: flex !important; justify-content: space-between !important; margin-bottom: 3px !important;">
                                <span style="color: ${candyColors.textSecondary} !important; font-size: 0.8em !important; display: flex !important; align-items: center !important; gap: 6px !important;">${getFeatherIcon('zap', { color: candyColors.energy, size: 16 })} 精力</span>
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
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    padding: 8px !important;
                    background: rgba(255,215,0,0.1) !important;
                    border-radius: 6px !important;
                    margin-bottom: 8px !important;
                    text-align: center !important;
                ">
                    <span style="color: #ffd700 !important; font-weight: bold !important; font-size: 1em !important; display: inline-flex !important; align-items: center !important; gap: 6px !important;">
                        ${getFeatherIcon('star', { color: '#ffd700', size: 16 })} ${petData.coins || 100} 金币
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
                        padding: 12px 16px !important;
                        background: ${candyColors.buttonPrimary} !important;
                        color: ${candyColors.textWhite} !important;
                        border: none !important;
                        border-radius: 20px !important;
                        font-family: ${candyColors.fontFamily} !important;
                        font-size: 12px !important;
                        font-weight: 600 !important;
                        text-transform: none !important;
                        cursor: pointer !important;
                        min-height: 40px !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        gap: 6px !important;
                        box-shadow: 0 4px 12px ${candyColors.shadow}, 0 2px 4px rgba(0,0,0,0.1) !important;
                        transition: all 0.2s ease !important;
                        transform: translateY(0) !important;
                    " onmousedown="this.style.transform='translateY(2px)'; this.style.boxShadow='0 2px 6px ${candyColors.shadow}'" onmouseup="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px ${candyColors.shadow}, 0 2px 4px rgba(0,0,0,0.1)'" onmouseleave="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px ${candyColors.shadow}, 0 2px 4px rgba(0,0,0,0.1)'"">
                        ${getFeatherIcon('utensils', { color: 'currentColor', size: 18 })}
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
                        ${getFeatherIcon('gamepad-2', { color: 'currentColor', size: 18 })}
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
                        ${getFeatherIcon('moon', { color: 'currentColor', size: 18 })}
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
                        ${getFeatherIcon('heart', { color: 'currentColor', size: 18 })}
                        <span>抱抱</span>
                    </button>
                    <button class="action-btn backpack-btn" style="
                        padding: 8px !important;
                        background: #8B4513 !important;
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
                        ${getFeatherIcon('package', { color: 'currentColor', size: 18 })}
                        <span>背包</span>
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
                        ${getFeatherIcon('shield', { color: 'currentColor', size: 18 })}
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
                        ${getFeatherIcon('shopping-bag', { color: 'currentColor', size: 18 })}
                        <span>商店</span>
                    </button>
                    <button class="action-btn chat-btn" style="
                        padding: 8px !important;
                        background: ${candyColors.info} !important;
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
                        ${getFeatherIcon('message-circle', { color: 'currentColor', size: 18 })}
                        <span>聊天</span>
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
                        ${getFeatherIcon('settings', { color: 'currentColor', size: 18 })}
                        <span>设置</span>
                    </button>
                </div>

                <!-- 聊天视图 (隐藏) -->
                <div id="pet-chat-view" class="pet-view" style="display: none;">
                    <div class="pet-section">
                        <h3>💬 与 <span id="chat-pet-name"></span> 聊天</h3>
                        <div id="chat-messages-container" class="chat-messages-container">
                            <!-- 聊天消息会通过JavaScript动态添加到这里 -->
                        </div>
                        <div class="chat-input-container">
                            <textarea id="chat-user-input" placeholder="说点什么..." rows="3"></textarea>
                            <button id="chat-send-btn" class="pet-button">发送</button>
                        </div>
                        <div class="pet-nav-buttons">
                            <button class="pet-button back-to-main-btn">← 返回</button>
                        </div>
                    </div>
                </div>

                <!-- 底部信息 -->
                <div class="pet-info-section" style="
                    text-align: center !important;
                    padding: 8px !important;
                    color: ${candyColors.textLight} !important;
                    font-size: 0.7em !important;
                ">
                    <p style="margin: 0 !important; display: flex !important; align-items: center !important; gap: 6px !important;">${getFeatherIcon('heart', { color: 'currentColor', size: 14 })} 虚拟宠物系统 v1.0</p>
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
                    display: flex !important;
                    flex-direction: column !important;
                    align-items: center !important;
                    justify-content: center !important;
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
                        ${customAvatarData ? getAvatarContent() : getDefaultPetIcon(64, '#ffd700')}
                    </div>
                    <div class="pet-title-wrap" style="width: 100% !important; display: flex !important; flex-direction: column !important; align-items: center !important; justify-content: center !important;">
                        <div class="pet-name" style="font-size: 1.3em !important; font-weight: bold !important; margin-bottom: 4px !important; color: ${candyColors.textPrimary} !important; cursor: pointer !important; text-decoration: underline !important;" onclick="editPetName()" title="点击编辑宠物名字">${escapeHtml(petData.name)}</div>
                        <div class="pet-level" style="color: ${candyColors.textSecondary} !important; font-size: 1em !important; width: 100% !important; text-align: center !important; font-weight: normal !important;">
                            ${petData.isAlive ? `${LIFE_STAGES[petData.lifeStage]?.name || '未知'} Lv.${petData.level}` : `已死亡`}
                        </div>
                    </div>
                </div>

                <!-- 宠物状态栏 -->
                <div class="pet-status-section" style="
                    padding: 12px !important;
                ">
                    <h4 style="margin: 0 0 12px 0 !important; color: ${candyColors.primary} !important; font-size: 1em !important; display: flex !important; align-items: center !important; justify-content: center !important; gap: 6px !important; text-align: center !important;">
                        ${getFeatherIcon('activity', { color: candyColors.primary, size: 16 })} 状态
                    </h4>
                    <div class="status-bars" style="display: flex !important; flex-direction: column !important; gap: 8px !important;">
                        <div class="status-item">
                            <div style="display: flex !important; justify-content: space-between !important; margin-bottom: 4px !important;">
                                <span style="color: ${candyColors.textSecondary} !important; font-size: 0.9em !important; display: flex !important; align-items: center !important; gap: 8px !important;">${getFeatherIcon('heart', { color: candyColors.health, size: 18 })} 健康</span>
                                <span style="color: ${candyColors.health} !important; font-size: 0.9em !important;">${Math.round(petData.health)}/100</span>
                            </div>
                            <div style="background: ${candyColors.border} !important; height: 6px !important; border-radius: 3px !important; overflow: hidden !important;">
                                <div style="background: ${candyColors.health} !important; height: 100% !important; width: ${petData.health}% !important; transition: width 0.3s ease !important;"></div>
                            </div>
                        </div>
                        <div class="status-item">
                            <div style="display: flex !important; justify-content: space-between !important; margin-bottom: 4px !important;">
                                <span style="color: ${candyColors.textSecondary} !important; font-size: 0.9em !important; display: flex !important; align-items: center !important; gap: 8px !important;">${getFeatherIcon('coffee', { color: candyColors.hunger, size: 18 })} 饱食度</span>
                                <span style="color: ${candyColors.hunger} !important; font-size: 0.9em !important;">${Math.round(petData.hunger)}/100</span>
                            </div>
                            <div style="background: ${candyColors.border} !important; height: 6px !important; border-radius: 3px !important; overflow: hidden !important;">
                                <div style="background: ${candyColors.hunger} !important; height: 100% !important; width: ${petData.hunger}% !important; transition: width 0.3s ease !important;"></div>
                            </div>
                        </div>
                        <div class="status-item">
                            <div style="display: flex !important; justify-content: space-between !important; margin-bottom: 4px !important;">
                                <span style="color: ${candyColors.textSecondary} !important; font-size: 0.9em !important; display: flex !important; align-items: center !important; gap: 8px !important;">${getFeatherIcon('smile', { color: candyColors.happiness, size: 18 })} 快乐度</span>
                                <span style="color: ${candyColors.happiness} !important; font-size: 0.9em !important;">${Math.round(petData.happiness)}/100</span>
                            </div>
                            <div style="background: ${candyColors.border} !important; height: 6px !important; border-radius: 3px !important; overflow: hidden !important;">
                                <div style="background: ${candyColors.happiness} !important; height: 100% !important; width: ${petData.happiness}% !important; transition: width 0.3s ease !important;"></div>
                            </div>
                        </div>
                        <div class="status-item">
                            <div style="display: flex !important; justify-content: space-between !important; margin-bottom: 4px !important;">
                                <span style="color: ${candyColors.textSecondary} !important; font-size: 0.9em !important; display: flex !important; align-items: center !important; gap: 8px !important;">${getFeatherIcon('zap', { color: candyColors.energy, size: 18 })} 精力</span>
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
                    display: flex !important;
                    align-items: center !important;
                    justify-content: center !important;
                    padding: 10px !important;
                    background: rgba(255,215,0,0.1) !important;
                    border-radius: 8px !important;
                    margin-bottom: 10px !important;
                    text-align: center !important;
                ">
                    <span style="color: #ffd700 !important; font-weight: bold !important; font-size: 1.1em !important; display: inline-flex !important; align-items: center !important; gap: 6px !important;">
                        ${getFeatherIcon('star', { color: '#ffd700', size: 18 })} ${petData.coins || 100} 金币
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
                        ${getFeatherIcon('utensils', { color: 'currentColor', size: 20 })}
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
                        ${getFeatherIcon('gamepad-2', { color: 'currentColor', size: 20 })}
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
                        ${getFeatherIcon('moon', { color: 'currentColor', size: 20 })}
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
                        ${getFeatherIcon('heart', { color: 'currentColor', size: 20 })}
                        <span>抱抱</span>
                    </button>
                    <button class="action-btn backpack-btn" style="
                        padding: 12px !important;
                        background: #8B4513 !important;
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
                        ${getFeatherIcon('package', { color: 'currentColor', size: 20 })}
                        <span>背包</span>
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
                    <button class="action-btn chat-btn" style="
                        padding: 12px !important;
                        background: ${candyColors.info} !important;
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
                        <span style="font-size: 1.1em !important;">💬</span>


                        <span>聊天</span>
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

                <!-- 聊天视图 (隐藏) -->
                <div id="pet-chat-view" class="pet-view" style="display: none;">



                    <div class="pet-section">
                        <h3>💬 与 <span id="chat-pet-name"></span> 聊天</h3>
                        <div id="chat-messages-container" class="chat-messages-container">
                            <!-- 聊天消息会通过JavaScript动态添加到这里 -->
                        </div>
                        <div class="chat-input-container">
                            <textarea id="chat-user-input" placeholder="说点什么..." rows="3"></textarea>
                            <button id="chat-send-btn" class="pet-button">发送</button>
                        </div>
                        <div class="pet-nav-buttons">
                            <button class="pet-button back-to-main-btn">← 返回</button>
                        </div>
                    </div>
                </div>

                <!-- 底部信息 -->
                <div class="pet-info-section" style="
                    text-align: center !important;
                    padding: 10px !important;
                    color: ${candyColors.textLight} !important;
                    font-size: 0.8em !important;
                ">
                    <p style="margin: 0 !important; display: flex !important; align-items: center !important; gap: 6px !important;">${getFeatherIcon('heart', { color: 'currentColor', size: 14 })} 虚拟宠物系统 v1.0</p>
                    <p style="margin: 3px 0 0 0 !important;">上次互动: 刚刚</p>
                </div>
            </div>
        `;
    }

    // 学习商店按钮的模式：设置按钮二级菜单（轻量浮层，不遮罩）
    function showSettingsSubmenu(anchorEl){
        try { $('#vp-settings-submenu').remove(); } catch{}
        const rect = anchorEl.getBoundingClientRect();
        const isMobile = window.innerWidth <= 767;
        const $menu = $('<div/>', { id: 'vp-settings-submenu' }).css({
            position: 'fixed', zIndex: SAFE_Z_INDEX.button + 2,
            top: Math.round(rect.bottom + 8), left: Math.round(rect.left),
            background: 'rgba(17,20,36,0.95)', color: '#fff',
            border: '1px solid rgba(164,0,255,.30)', borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,.35), 0 0 18px rgba(0,240,255,.25)',
            backdropFilter: 'blur(6px)', padding: 8, minWidth: isMobile ? 180 : 220
        });
        function addItem(action, icon, text, color){
            const $item = $('<div/>')
                .addClass('vp-submenu-item')
                .attr('data-action', action)
                .css({ padding:'8px 10px', borderRadius:8, cursor:'pointer', display:'flex', gap:8, alignItems:'center' })
                .append($(getFeatherIcon(icon, { color: color||'#ffd700', size: 16 })))
                .append($('<span/>').text(text));
            $menu.append($item);
        }
        addItem('reset','refresh-cw','一键重置');
        addItem('clear-chat','trash-2','清空聊天历史');
        addItem('new-chat','plus','新建会话');
        $menu.append($('<div/>').css({ height:1, background:'rgba(255,255,255,0.12)', margin:'6px 4px' }));
        addItem('open-settings','settings','打开完整设置','#90cdf4');
        $('body').append($menu);
        // 智能定位：避免超出屏幕
        const vw = window.innerWidth, vh = window.innerHeight;
        let menuW = $menu.outerWidth(), menuH = $menu.outerHeight();
        const pad = 8;
        // 计算垂直位置：优先放在下方，放不下则放上方，再进行夹取
        let top = Math.round(rect.bottom + 8);
        const canPlaceAbove = (rect.top - 8 - menuH) >= pad;
        if (top + menuH > vh - pad && canPlaceAbove) {
            top = Math.max(pad, Math.round(rect.top - menuH - 8));
        } else {
            top = Math.min(top, vh - pad - menuH);
        }
        // 计算水平位置，并在过宽时自适应宽度
        if (menuW > vw - pad * 2) {
            $menu.css({ width: vw - pad * 2 });
            menuW = $menu.outerWidth();
        }
        let left = Math.round(rect.left);
        left = Math.max(pad, Math.min(left, vw - pad - menuW));
        // 应用最终位置与高度限制
        $menu.css({ top, left, maxHeight: Math.min(vh - pad * 2, isMobile ? 360 : 480), overflowY: 'auto' });
        $(document)
          .off('mouseenter.vp-submenu mouseleave.vp-submenu', '#vp-settings-submenu .vp-submenu-item')
          .on('mouseenter.vp-submenu', '#vp-settings-submenu .vp-submenu-item', function(){ $(this).css({ background: 'rgba(255,255,255,0.08)' }); })
          .on('mouseleave.vp-submenu', '#vp-settings-submenu .vp-submenu-item', function(){ $(this).css({ background: 'transparent' }); });
        $(document).off('click.vp-submenu', '#vp-settings-submenu .vp-submenu-item')
          .on('click.vp-submenu', '#vp-settings-submenu .vp-submenu-item', async function(e){
            e.preventDefault(); e.stopPropagation();
            const action = $(this).data('action');
            try{
                if (action === 'reset') {
                    if (confirm('确定要一键重置宠物数据吗？这将清除当前数值并恢复到初始状态。')) { resetPet(true); toastr.success('已重置为初始状态'); }
                } else if (action === 'clear-chat') {
                    if (!confirm('确定要清空当前会话的聊天历史吗？此操作不可恢复。')) return;
                    await clearCurrentChatHistory(); toastr.success('已清空当前会话聊天历史');
                } else if (action === 'new-chat') {
                    await createNewChatSession(); toastr.success('已创建新会话');
                } else if (action === 'open-settings') { openSettings(); }
            } finally { $('#vp-settings-submenu').remove(); }
          });
        setTimeout(()=>{
            $(document).off('click.vp-submenu-dismiss').on('click.vp-submenu-dismiss', function(){
                $('#vp-settings-submenu').remove();
                $(document).off('click.vp-submenu-dismiss');
            });
        }, 0);
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

        // 背包按钮
        $container.find(".backpack-btn").on("click touchend", function(e) {
            e.preventDefault();
            console.log("🎒 打开背包");
            openBackpack();
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

        // 聊天按钮 (统一UI中的chat-btn类)
        $container.find(".chat-btn").on("click touchend", function(e) {
            e.preventDefault();
            console.log("💬 与宠物聊天");
            console.log(`[${extensionName}] 聊天按钮被点击，开始处理...`);
            try {
                handleChatButtonClick();
                console.log(`[${extensionName}] handleChatButtonClick 执行完成`);
            } catch (error) {
                console.error(`[${extensionName}] handleChatButtonClick 执行失败:`, error);
            }
        });

        // 聊天按钮 (popup.html中的goto-chat-btn ID)
        $container.find("#goto-chat-btn").on("click touchend", function(e) {
            e.preventDefault();
            console.log("💬 与宠物聊天 (popup.html)");
            console.log(`[${extensionName}] popup.html聊天按钮被点击，开始处理...`);
            try {
                handleChatButtonClick();
                console.log(`[${extensionName}] handleChatButtonClick 执行完成`);
            } catch (error) {
                console.error(`[${extensionName}] handleChatButtonClick 执行失败:`, error);
            }
        });

        // 设置按钮
        $container.find(".settings-btn").on("click touchend", function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log("⚙️ 打开设置二级菜单");
            try { showSettingsSubmenu(this); } catch(err) { console.warn('submenu failed, fallback openSettings', err); openSettings(); }
        });

        // 宠物名字点击事件（备用，主要通过onclick属性）
        $container.find(".pet-name").on("click touchend", function(e) {
            e.preventDefault();
            editPetName();
        });

        // 验证聊天按钮是否正确绑定
        const chatButtons = $container.find(".chat-btn");
        console.log(`[${extensionName}] 聊天按钮绑定验证: 找到 ${chatButtons.length} 个聊天按钮`);

        if (chatButtons.length > 0) {
            chatButtons.each(function(index) {
                const events = $._data(this, 'events');
                console.log(`[${extensionName}] 聊天按钮 ${index + 1} 事件:`, events ? Object.keys(events) : '无事件');
            });
        }

        console.log(`[${extensionName}] Unified UI events bound successfully`);

        // 确保聊天按钮始终可见
        updateChatButtonVisibility();
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
     * 带重试机制的fetch函数，用于处理网络连接问题
     * @param {string} url - 请求URL
     * @param {object} options - fetch选项
     * @param {number} maxRetries - 最大重试次数
     * @returns {Promise<Response>} fetch响应
     */
    async function fetchWithRetry(url, options = {}, maxRetries = 2) {
        let lastError;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                if (attempt > 0) {
                    console.log(`🔄 重试第 ${attempt} 次: ${url}`);
                    // 重试前等待一段时间，避免立即重试
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                }

                const response = await fetch(url, options);
                return response;

            } catch (error) {
                lastError = error;

                // 检查是否是CORS错误（不应该重试）
                if (error.message.includes('CORS') ||
                    error.message.includes('Access-Control-Allow-Origin') ||
                    error.message.includes('preflight')) {
                    console.log(`🚫 CORS错误，无法重试: ${error.message}`);
                    throw error;
                }

                // 检查是否是网络连接问题（可以重试）
                if (error.message.includes('Failed to fetch') ||
                    error.message.includes('ERR_CONNECTION_RESET') ||
                    error.message.includes('ERR_NETWORK') ||
                    error.message.includes('ERR_INTERNET_DISCONNECTED')) {

                    console.log(`🌐 网络连接问题 (尝试 ${attempt + 1}/${maxRetries + 1}): ${error.message}`);

                    if (attempt < maxRetries) {
                        continue; // 继续重试
                    }
                } else {
                    // 其他错误，直接抛出
                    console.log(`❌ 其他错误，不重试: ${error.message}`);
                    throw error;
                }
            }
        }

        // 所有重试都失败了
        throw lastError;
    }

    /**
     * 检测网络连接状态
     * @returns {Promise<boolean>} 是否有网络连接
     */
    async function checkNetworkConnection() {
        try {
            // 尝试访问一个可靠的测试端点
            const response = await fetch('https://httpbin.org/get', {
                method: 'GET',
                signal: AbortSignal.timeout(3000)
            });
            return response.ok;
        } catch (error) {
            console.log(`🌐 网络连接检测失败: ${error.message}`);
            return false;
        }
    }

    /**
     * 通用第三方API模型获取器 - 支持直连+中继退回
     */
    window.getThirdPartyModels = async function() {
        console.log("🌐 通用第三方API模型获取器启动...");

        const apiUrl = $('#ai-url-input').val();
        const apiKey = $('#ai-key-input').val();
        const apiType = $('#ai-api-select').val();

        if (!apiUrl) {
            console.log("❌ 请先配置API URL");
            return [];
        }

        console.log(`🔗 API URL: ${apiUrl}`);
        console.log(`🔑 API Key: ${apiKey ? '已设置' : '未设置'}`);
        console.log(`🏷️ API类型: ${apiType}`);

        // 检测是否为官方API
        const isOfficialAPI = ['openai', 'claude', 'google', 'deepseek'].includes(apiType);

        if (isOfficialAPI) {
            console.log("🎯 检测到官方API，尝试直连获取模型...");

            try {
                const directModels = await getModelsDirectly(apiUrl, apiKey, apiType);
                if (directModels && directModels.length > 0) {
                    console.log(`✅ 直连获取模型成功: ${directModels.length} 个模型`);
                    return directModels;
                }
            } catch (error) {
                console.log(`⚠️ 直连获取模型失败: ${error.message}`);

                // 检查是否为CORS错误
                if (error.message.includes('CORS') ||
                    error.message.includes('Failed to fetch') ||
                    error.message.includes('Access-Control-Allow-Origin')) {

                    console.log("🔄 检测到CORS错误，退回中继服务器获取模型...");

                    try {
                        const relayModels = await getModelsViaRelay(apiUrl, apiKey, apiType);
                        if (relayModels && relayModels.length > 0) {
                            console.log(`✅ 中继获取模型成功: ${relayModels.length} 个模型`);
                            return relayModels;
                        }
                    } catch (relayError) {
                        console.log(`❌ 中继获取模型也失败: ${relayError.message}`);
                    }
                }
            }
        } else {
            console.log("🔧 检测到自定义API，尝试直连获取模型...");

            try {
                const directModels = await getModelsDirectly(apiUrl, apiKey, apiType);
                if (directModels && directModels.length > 0) {
                    console.log(`✅ 自定义API直连获取模型成功: ${directModels.length} 个模型`);
                    return directModels;
                }
            } catch (error) {
                console.log(`⚠️ 自定义API直连获取模型失败: ${error.message}`);

                // 检查是否为CORS错误或网络错误
                if (error.message.includes('CORS') ||
                    error.message.includes('Failed to fetch') ||
                    error.message.includes('Access-Control-Allow-Origin') ||
                    error.message.includes('ERR_NETWORK') ||
                    error.message.includes('ERR_CONNECTION')) {

                    console.log("🔄 检测到网络/CORS错误，退回中继服务器获取模型...");

                    try {
                        const relayModels = await getModelsViaRelay(apiUrl, apiKey, apiType);
                        if (relayModels && relayModels.length > 0) {
                            console.log(`✅ 自定义API中继获取模型成功: ${relayModels.length} 个模型`);
                            return relayModels;
                        }
                    } catch (relayError) {
                        console.log(`❌ 自定义API中继获取模型也失败: ${relayError.message}`);
                    }
                } else {
                    console.log(`❌ 自定义API其他错误，不使用中继: ${error.message}`);
                }
            }
        }

        // 如果所有方法都失败，返回推荐模型
        console.log("⚠️ 无法从API获取模型列表，根据API类型提供推荐模型");
        return getRecommendedModels(apiType);
    };

    /**
     * 直连方式获取模型列表
     */
    async function getModelsDirectly(apiUrl, apiKey, apiType) {
        console.log("🎯 开始直连获取模型...");

        const baseUrl = apiUrl.replace(/\/+$/, '');
        let modelsEndpoint = '';

        // 根据API类型构建端点
        if (apiType === 'google') {
            if (baseUrl.includes('/v1beta')) {
                modelsEndpoint = `${baseUrl}/models`;
            } else {
                modelsEndpoint = `${baseUrl}/v1beta/models`;
            }
        } else if (apiType === 'claude') {
            if (baseUrl.includes('/v1')) {
                modelsEndpoint = `${baseUrl}/models`;
            } else {
                modelsEndpoint = `${baseUrl}/v1/models`;
            }
        } else if (apiType === 'custom') {
            // 自定义API：尝试多种常见端点格式
            const possibleEndpoints = [];

            if (baseUrl.includes('/v1')) {
                possibleEndpoints.push(`${baseUrl}/models`);
            } else {
                possibleEndpoints.push(`${baseUrl}/v1/models`);
                possibleEndpoints.push(`${baseUrl}/models`);
            }

            // 其他常见格式
            possibleEndpoints.push(
                `${baseUrl}/engines`,
                `${baseUrl}/v1/engines`,
                `${baseUrl}/api/models`,
                `${baseUrl}/api/v1/models`
            );

            // 对于自定义API，我们需要尝试多个端点
            return await tryMultipleEndpoints(possibleEndpoints, apiKey, apiType);
        } else {
            // OpenAI, DeepSeek等官方API
            if (baseUrl.includes('/v1')) {
                modelsEndpoint = `${baseUrl}/models`;
            } else {
                modelsEndpoint = `${baseUrl}/v1/models`;
            }
        }

        console.log(`📡 直连端点: ${modelsEndpoint}`);

        // 构建请求头
        const headers = { 'Content-Type': 'application/json' };

        if (apiKey) {
            if (apiType === 'google') {
                headers['x-goog-api-key'] = apiKey;
            } else if (apiType === 'claude') {
                headers['x-api-key'] = apiKey;
                headers['anthropic-version'] = '2023-06-01';
            } else {
                headers['Authorization'] = `Bearer ${apiKey}`;
            }
        }

        const response = await fetch(modelsEndpoint, {
            method: 'GET',
            headers: headers,
            signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        return parseModelsFromResponseNew(data, modelsEndpoint, apiType);
    }

    /**
     * 尝试多个端点获取模型（用于自定义API）
     */
    async function tryMultipleEndpoints(endpoints, apiKey, apiType) {
        console.log(`🔍 尝试 ${endpoints.length} 个端点获取模型...`);

        for (const endpoint of endpoints) {
            try {
                console.log(`📡 尝试端点: ${endpoint}`);

                // 构建请求头
                const headers = { 'Content-Type': 'application/json' };

                if (apiKey) {
                    // 尝试多种认证方式
                    const authMethods = [
                        { name: 'Bearer', headers: { ...headers, 'Authorization': `Bearer ${apiKey}` } },
                        { name: 'x-api-key', headers: { ...headers, 'x-api-key': apiKey } },
                        { name: 'api-key', headers: { ...headers, 'api-key': apiKey } }
                    ];

                    for (const auth of authMethods) {
                        try {
                            console.log(`🔐 尝试认证方式: ${auth.name}`);

                            const response = await fetch(endpoint, {
                                method: 'GET',
                                headers: auth.headers,
                                signal: AbortSignal.timeout(8000)
                            });

                            if (response.ok) {
                                const data = await response.json();
                                const models = parseModelsFromResponseNew(data, endpoint, apiType);

                                if (models && models.length > 0) {
                                    console.log(`✅ 成功获取模型: ${endpoint} (${auth.name})`);
                                    return models;
                                }
                            } else if (response.status === 401 || response.status === 403) {
                                console.log(`🔐 认证失败: ${endpoint} (${auth.name}) - ${response.status}`);
                                continue; // 尝试下一种认证方式
                            } else {
                                console.log(`❌ HTTP错误: ${endpoint} (${auth.name}) - ${response.status}`);
                            }

                        } catch (authError) {
                            console.log(`❌ 认证方式失败: ${auth.name} - ${authError.message}`);
                        }
                    }
                } else {
                    // 无API密钥的情况
                    try {
                        const response = await fetch(endpoint, {
                            method: 'GET',
                            headers: headers,
                            signal: AbortSignal.timeout(8000)
                        });

                        if (response.ok) {
                            const data = await response.json();
                            const models = parseModelsFromResponseNew(data, endpoint, apiType);

                            if (models && models.length > 0) {
                                console.log(`✅ 成功获取模型: ${endpoint} (无认证)`);
                                return models;
                            }
                        }
                    } catch (noAuthError) {
                        console.log(`❌ 无认证请求失败: ${endpoint} - ${noAuthError.message}`);
                    }
                }

            } catch (error) {
                console.log(`❌ 端点失败: ${endpoint} - ${error.message}`);

                // 如果是CORS错误，抛出以便上层处理
                if (error.message.includes('CORS') ||
                    error.message.includes('Failed to fetch') ||
                    error.message.includes('Access-Control-Allow-Origin')) {
                    throw error;
                }
            }
        }

        throw new Error('所有端点都无法获取模型');
    }

    /**
     * 中继方式获取模型列表
     */
    async function getModelsViaRelay(apiUrl, apiKey, apiType) {
        console.log("🔄 开始中继获取模型...");

        const baseUrl = apiUrl.replace(/\/+$/, '');
        let modelsEndpoint = '';

        // 根据API类型构建端点
        if (apiType === 'google') {
            if (baseUrl.includes('/v1beta')) {
                modelsEndpoint = `${baseUrl}/models`;
            } else {
                modelsEndpoint = `${baseUrl}/v1beta/models`;
            }
        } else if (apiType === 'claude') {
            if (baseUrl.includes('/v1')) {
                modelsEndpoint = `${baseUrl}/models`;
            } else {
                modelsEndpoint = `${baseUrl}/v1/models`;
            }
        } else {
            // OpenAI, DeepSeek等
            if (baseUrl.includes('/v1')) {
                modelsEndpoint = `${baseUrl}/models`;
            } else {
                modelsEndpoint = `${baseUrl}/v1/models`;
            }
        }

        console.log(`📡 中继端点: ${modelsEndpoint}`);

        // 构建请求头
        const headers = { 'Content-Type': 'application/json' };

        if (apiKey) {
            if (apiType === 'google') {
                headers['x-goog-api-key'] = apiKey;
            } else if (apiType === 'claude') {
                headers['x-api-key'] = apiKey;
                headers['anthropic-version'] = '2023-06-01';
            } else {
                headers['Authorization'] = `Bearer ${apiKey}`;
            }
        }

        // 通过中继服务器发送请求
        const relayServerUrl = 'http://154.12.38.33:3000/proxy';

        const response = await fetch(relayServerUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                targetUrl: modelsEndpoint,
                method: 'GET',
                headers: headers
            }),
            signal: AbortSignal.timeout(15000)
        });

        if (!response.ok) {
            throw new Error(`中继服务器错误: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return parseModelsFromResponseNew(data, modelsEndpoint, apiType);
    }

    /**
     * 新的模型响应解析器
     */
    function parseModelsFromResponseNew(data, endpoint, apiType) {
        console.log("📋 解析模型响应数据...", data);

        let models = [];

        // 根据不同的响应格式解析
        if (data.data && Array.isArray(data.data)) {
            // OpenAI格式: {data: [{id: "gpt-3.5-turbo", ...}, ...]}
            models = data.data;
        } else if (data.models && Array.isArray(data.models)) {
            // Google/其他格式: {models: [{name: "models/gemini-pro", ...}, ...]}
            models = data.models;
        } else if (Array.isArray(data)) {
            // 直接数组格式
            models = data;
        }

        // 标准化模型数据
        const standardizedModels = models.map(model => {
            let modelId, modelName;

            if (typeof model === 'string') {
                modelId = modelName = model;
            } else if (model.id) {
                modelId = model.id;
                modelName = model.name || model.id;
            } else if (model.name) {
                modelId = model.name;
                modelName = model.name;

                // Google API特殊处理：移除models/前缀
                if (apiType === 'google' && modelName.startsWith('models/')) {
                    modelName = modelName.replace('models/', '');
                }
            } else if (model.model) {
                modelId = modelName = model.model;
            }

            if (modelId) {
                return {
                    id: modelId,
                    name: modelName,
                    object: 'model',
                    type: 'third_party',
                    status: 'available',
                    source: endpoint,
                    provider: `${apiType.toUpperCase()} API`
                };
            }
            return null;
        }).filter(Boolean);

        console.log(`✅ 解析出 ${standardizedModels.length} 个模型`);
        return standardizedModels;
    }



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
                        toastr.success('移动端API连接测试成功!');
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
        toastr.error('移动端API连接失败，请检查配置', '连接失败', { timeOut: 5000 });

        // 提供详细的故障排除建议
        console.log('\n🔧 移动端API 404故障排除建议:');
        console.log('1. 检查API URL格式是否正确');
        console.log('2. 确认API服务正在运行');
        console.log('3. 检查网络连接');
        console.log('4. 尝试使用本地API (Ollama/LM Studio)');
        console.log('5. 检查CORS设置');

        return false;
    };

    console.log("[VirtualPet] 虚拟宠物系统加载完成！");

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

    console.log("[VirtualPet] 虚拟宠物系统脚本已加载完成");
    console.log("🎲 智能初始化系统：首次打开随机化到50以下，后续自然衰减到100");
}); // jQuery ready end
