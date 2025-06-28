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
    const STORAGE_KEY_PET_AVATAR = "virtual-pet-avatar";
    
    // DOM IDs and Selectors - 确保全局可用
    const BUTTON_ID = "virtual-pet-floating-button";  // 修正按钮ID
    const OVERLAY_ID = "virtual-pet-popup-overlay";
    const POPUP_ID = "virtual-pet-popup";
    const CLOSE_BUTTON_ID = "virtual-pet-popup-close-button";
    const TOGGLE_ID = "#virtual-pet-enabled-toggle";

    // 将关键变量设为全局，确保移动端可用
    window.extensionName = extensionName;
    window.BUTTON_ID = BUTTON_ID;
    window.OVERLAY_ID = OVERLAY_ID;
    window.POPUP_ID = POPUP_ID;
    
    // DOM 元素引用
    let overlay, mainView, petView, settingsView;
    let petContainer;
    
    // 宠物数据结构
    let petData = {
        name: "小宠物",
        type: "cat", // cat, dog, dragon, etc.
        level: 1,
        experience: 0,
        health: 100,
        happiness: 100,
        hunger: 50,
        energy: 100,
        lastFeedTime: Date.now(),
        lastPlayTime: Date.now(),
        lastSleepTime: Date.now(),
        created: Date.now()
    };

    // 头像数据 - 默认使用🐱，确保全局可用
    let avatarData = {
        type: 'emoji', // 'emoji', 'image', 'url'
        value: '🐱',   // 默认小猫头像
        customName: '小猫' // 默认名称
    };

    // 设为全局变量，确保移动端可用
    window.avatarData = avatarData;

    // 预设头像选项
    const PRESET_AVATARS = [
        { type: 'emoji', value: '🐱', name: '小猫' },
        { type: 'emoji', value: '🐶', name: '小狗' },
        { type: 'emoji', value: '🐰', name: '兔子' },
        { type: 'emoji', value: '🐦', name: '小鸟' },
        { type: 'emoji', value: '🐸', name: '青蛙' },
        { type: 'emoji', value: '🐷', name: '小猪' },
        { type: 'emoji', value: '🐼', name: '熊猫' },
        { type: 'emoji', value: '🦊', name: '狐狸' },
        { type: 'emoji', value: '🐯', name: '老虎' },
        { type: 'emoji', value: '🦁', name: '狮子' },
        { type: 'emoji', value: '🐨', name: '考拉' },
        { type: 'emoji', value: '🐻', name: '熊' }
    ];

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
                petData = { ...petData, ...JSON.parse(saved) };
            } catch (error) {
                console.error(`[${extensionName}] Error loading pet data:`, error);
            }
        }

        // 加载头像数据
        loadAvatarData();
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
     * 加载头像数据
     */
    function loadAvatarData() {
        const saved = localStorage.getItem(STORAGE_KEY_PET_AVATAR);
        if (saved) {
            try {
                avatarData = { ...avatarData, ...JSON.parse(saved) };
                console.log(`[${extensionName}] Avatar data loaded:`, avatarData);
            } catch (error) {
                console.error(`[${extensionName}] Error loading avatar data:`, error);
            }
        }
    }

    /**
     * 保存头像数据
     */
    function saveAvatarData() {
        try {
            localStorage.setItem(STORAGE_KEY_PET_AVATAR, JSON.stringify(avatarData));
            console.log(`[${extensionName}] Avatar data saved:`, avatarData);
        } catch (error) {
            console.error(`[${extensionName}] Error saving avatar data:`, error);
        }
    }

    /**
     * 获取当前头像显示内容
     */
    function getCurrentAvatarDisplay() {
        try {
            // 确保avatarData存在，默认使用🐱
            if (!avatarData || !avatarData.type) {
                return '🐱';
            }

            switch (avatarData.type) {
                case 'emoji':
                    return avatarData.value || '🐱';
                case 'image':
                    if (!avatarData.value) return '🐱';
                    return `<img src="${avatarData.value}" style="
                        width: 100% !important;
                        height: 100% !important;
                        object-fit: cover !important;
                        border-radius: 50% !important;
                        border: 2px solid #7289da !important;
                        position: absolute !important;
                        top: 0 !important;
                        left: 0 !important;
                    " alt="宠物头像" onerror="this.style.display='none'; this.parentNode.innerHTML='🐱'; this.parentNode.style.fontSize='inherit';">`;
                case 'url':
                    if (!avatarData.value) return '🐱';
                    return `<img src="${avatarData.value}" style="
                        width: 100% !important;
                        height: 100% !important;
                        object-fit: cover !important;
                        border-radius: 50% !important;
                        border: 2px solid #7289da !important;
                        position: absolute !important;
                        top: 0 !important;
                        left: 0 !important;
                    " alt="宠物头像" onerror="this.style.display='none'; this.parentNode.innerHTML='🐱'; this.parentNode.style.fontSize='inherit';">`;
                default:
                    return '🐱';
            }
        } catch (error) {
            console.error(`[${extensionName}] Error getting current avatar display:`, error);
            return '🐱';
        }
    }

    /**
     * 设置头像
     */
    function setAvatar(type, value, customName = '') {
        avatarData = {
            type: type,
            value: value,
            customName: customName
        };
        saveAvatarData();

        // 更新UI中的头像显示
        updateAvatarInUI();

        console.log(`[${extensionName}] Avatar updated:`, avatarData);
        showNotification(`🎨 头像已更新为 ${customName || value}`, 'success');
    }

    /**
     * 更新UI中的头像显示
     */
    function updateAvatarInUI() {
        const avatarElements = $('.pet-avatar');
        const avatarDisplay = getCurrentAvatarDisplay();

        avatarElements.each(function() {
            if (avatarData.type === 'emoji') {
                $(this).html(avatarDisplay);
            } else {
                $(this).html(avatarDisplay);
            }
        });

        // 同时更新悬浮按钮的头像
        updateFloatingButtonAvatar();
    }

    /**
     * 获取悬浮按钮的头像显示内容
     */
    function getFloatingButtonAvatarDisplay() {
        try {
            // 确保avatarData存在，默认使用🐱
            if (!avatarData || !avatarData.type) {
                console.log(`[${extensionName}] Avatar data not found, using default cat`);
                return '🐱';
            }

            switch (avatarData.type) {
                case 'emoji':
                    return avatarData.value || '🐱';
                case 'image':
                    if (!avatarData.value) return '🐱';
                    return `<img src="${avatarData.value}" style="
                        width: 100% !important;
                        height: 100% !important;
                        object-fit: cover !important;
                        border-radius: 50% !important;
                        position: absolute !important;
                        top: 0 !important;
                        left: 0 !important;
                    " alt="宠物头像" onerror="this.parentNode.innerHTML='🐱'; this.parentNode.style.fontSize='24px';">`;
                case 'url':
                    if (!avatarData.value) return '🐱';
                    return `<img src="${avatarData.value}" style="
                        width: 100% !important;
                        height: 100% !important;
                        object-fit: cover !important;
                        border-radius: 50% !important;
                        position: absolute !important;
                        top: 0 !important;
                        left: 0 !important;
                    " alt="宠物头像" onerror="this.parentNode.innerHTML='🐱'; this.parentNode.style.fontSize='24px';">`;
                default:
                    return '🐱';
            }
        } catch (error) {
            console.error(`[${extensionName}] Error getting avatar display:`, error);
            return '🐱';
        }
    }

    /**
     * 更新悬浮按钮的头像
     */
    function updateFloatingButtonAvatar() {
        try {
            const floatingButton = $(`#${BUTTON_ID}`);
            if (floatingButton.length > 0) {
                const avatarDisplay = getFloatingButtonAvatarDisplay();
                floatingButton.html(avatarDisplay);

                // 更新标题
                const title = `虚拟宠物 - ${avatarData.customName || '我的宠物'}`;
                floatingButton.attr('title', title);

                console.log(`[${extensionName}] Floating button avatar updated to:`, avatarDisplay);
            } else {
                console.log(`[${extensionName}] Floating button not found for avatar update`);
            }
        } catch (error) {
            console.error(`[${extensionName}] Error updating floating button avatar:`, error);
        }
    }
    
    /**
     * 更新宠物状态（基于时间流逝）
     */
    function updatePetStatus() {
        const now = Date.now();
        const timeSinceLastUpdate = now - (petData.lastUpdateTime || now);
        const hoursElapsed = timeSinceLastUpdate / (1000 * 60 * 60);
        
        // 随时间降低的属性
        if (hoursElapsed > 0.1) { // 每6分钟更新一次
            petData.hunger = Math.max(0, petData.hunger - hoursElapsed * 2);
            petData.energy = Math.max(0, petData.energy - hoursElapsed * 1.5);
            
            // 饥饿和疲劳影响健康和快乐
            if (petData.hunger < 20) {
                petData.health = Math.max(0, petData.health - hoursElapsed * 3);
                petData.happiness = Math.max(0, petData.happiness - hoursElapsed * 2);
            }
            
            if (petData.energy < 20) {
                petData.happiness = Math.max(0, petData.happiness - hoursElapsed * 1);
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
    function feedPet() {
        const now = Date.now();
        const timeSinceLastFeed = now - petData.lastFeedTime;
        
        if (timeSinceLastFeed < 30000) { // 30秒冷却
            toastr.warning("宠物还不饿，等一会再喂吧！");
            return;
        }
        
        petData.hunger = Math.min(100, petData.hunger + 30);
        petData.happiness = Math.min(100, petData.happiness + 10);
        petData.lastFeedTime = now;
        
        // 获得经验
        gainExperience(5);
        
        toastr.success(`${petData.name} 吃得很开心！`);
        savePetData();
        renderPetStatus();
    }
    
    /**
     * 和宠物玩耍
     */
    function playWithPet() {
        const now = Date.now();
        const timeSinceLastPlay = now - petData.lastPlayTime;
        
        if (timeSinceLastPlay < 60000) { // 1分钟冷却
            toastr.warning("宠物需要休息一下！");
            return;
        }
        
        petData.happiness = Math.min(100, petData.happiness + 25);
        petData.energy = Math.max(0, petData.energy - 15);
        petData.lastPlayTime = now;
        
        // 获得经验
        gainExperience(8);
        
        toastr.success(`${petData.name} 玩得很开心！`);
        savePetData();
        renderPetStatus();
    }
    
    /**
     * 让宠物休息
     */
    function petSleep() {
        const now = Date.now();
        const timeSinceLastSleep = now - petData.lastSleepTime;
        
        if (timeSinceLastSleep < 120000) { // 2分钟冷却
            toastr.warning("宠物还不困！");
            return;
        }
        
        petData.energy = Math.min(100, petData.energy + 40);
        petData.health = Math.min(100, petData.health + 10);
        petData.lastSleepTime = now;
        
        // 获得经验
        gainExperience(3);
        
        toastr.success(`${petData.name} 睡得很香！`);
        savePetData();
        renderPetStatus();
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
            petData.health = 100; // 升级恢复健康
            toastr.success(`🎉 ${petData.name} 升级了！现在是 ${petData.level} 级！`);
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
    
    // ----------------------------------------------------------------- 
    // 3. 弹窗和视图管理
    // -----------------------------------------------------------------
    
    /**
     * 切换弹窗显示/隐藏
     */
    function togglePopup() {
        const overlayElement = $(`#${OVERLAY_ID}`);
        if (overlayElement.length > 0 && overlayElement.is(':visible')) {
            console.log(`[${extensionName}] Popup is visible, hiding it`);
            closePopup();
        } else {
            console.log(`[${extensionName}] Popup is hidden, showing it`);
            showPopup();
        }
    }

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
                    background-color: #2c2f33 !important;
                    color: white !important;
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

            // 点击外部关闭弹窗
            overlayElement.on("click touchstart", function(e) {
                if (e.target === this) {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log(`[${extensionName}] Overlay clicked - closing popup`);
                    closePopup();
                }
            });

            // 绑定统一的操作按钮事件
            bindUnifiedUIEvents(overlayElement);

        // 绑定头像点击事件
        bindAvatarClickEvent(overlayElement);

        console.log(`[${extensionName}] Unified popup created and displayed for all platforms`);
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
            <div class="pet-avatar">
                <div class="pet-emoji">${getPetEmoji()}</div>
                <div class="pet-name">${escapeHtml(petData.name)}</div>
                <div class="pet-level">Lv.${petData.level}</div>
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

        // 重置为初始状态
        petData = {
            name: "小宠物",
            type: "cat",
            level: 1,
            experience: 0,
            health: 100,
            happiness: 100,
            hunger: 50,
            energy: 100,
            lastFeedTime: Date.now(),
            lastPlayTime: Date.now(),
            lastSleepTime: Date.now(),
            created: Date.now(),
            lastUpdateTime: Date.now()
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
     * 使按钮可拖动，并处理点击与拖动的区分（安全版本）
     */
    function makeButtonDraggable($button) {
        let isDragging = false;
        let wasDragged = false;
        let dragStartX, dragStartY, startX, startY;
        let dragTimeout;

        console.log(`[${extensionName}] Setting up safe drag for button`);

        // 清除现有事件
        $button.off('mousedown touchstart click touchend');

        // 鼠标/触摸开始
        const onDragStart = (e) => {
            console.log(`[${extensionName}] Drag start`);
            isDragging = true;
            wasDragged = false;

            // 兼容触摸和鼠标事件
            const touch = e.originalEvent && e.originalEvent.touches && e.originalEvent.touches[0];
            const pageX = touch ? touch.pageX : e.pageX;
            const pageY = touch ? touch.pageY : e.pageY;

            startX = pageX;
            startY = pageY;
            dragStartX = pageX - $button.offset().left;
            dragStartY = pageY - $button.offset().top;

            $button.css("cursor", "grabbing");

            // 只阻止按钮本身的默认行为
            e.preventDefault();

            // 绑定临时的移动和结束事件
            $(document).on("mousemove.petdragtemp", onDragMove);
            $(document).on("touchmove.petdragtemp", onDragMove);
            $(document).on("mouseup.petdragtemp", onDragEnd);
            $(document).on("touchend.petdragtemp", onDragEnd);
        };

        // 鼠标/触摸移动
        const onDragMove = (e) => {
            if (!isDragging) return;

            const touch = e.originalEvent && e.originalEvent.touches && e.originalEvent.touches[0];
            const pageX = touch ? touch.pageX : e.pageX;
            const pageY = touch ? touch.pageY : e.pageY;

            // 检查是否超过阈值
            if (Math.abs(pageX - startX) > 5 || Math.abs(pageY - startY) > 5) {
                wasDragged = true;
            }

            if (wasDragged) {
                let newX = pageX - dragStartX;
                let newY = pageY - dragStartY;

                // 边界限制
                const windowWidth = $(window).width();
                const windowHeight = $(window).height();
                const buttonWidth = $button.outerWidth() || 48;
                const buttonHeight = $button.outerHeight() || 48;
                const safeMargin = 10;

                newX = Math.max(safeMargin, Math.min(newX, windowWidth - buttonWidth - safeMargin));
                newY = Math.max(safeMargin, Math.min(newY, windowHeight - buttonHeight - safeMargin));

                // 设置位置
                $button.css({
                    top: newY + 'px',
                    left: newX + 'px',
                });
            }
        };

        // 鼠标/触摸结束
        const onDragEnd = (e) => {
            if (isDragging) {
                console.log(`[${extensionName}] Drag end, wasDragged: ${wasDragged}`);
                isDragging = false;
                $button.css("cursor", "grab");

                // 立即清除临时事件
                $(document).off("mousemove.petdragtemp touchmove.petdragtemp mouseup.petdragtemp touchend.petdragtemp");

                if (wasDragged) {
                    // 保存位置
                    const currentLeft = $button.offset().left;
                    const currentTop = $button.offset().top;
                    localStorage.setItem(STORAGE_KEY_BUTTON_POS, JSON.stringify({
                        x: currentLeft + 'px',
                        y: currentTop + 'px',
                    }));
                    console.log(`[${extensionName}] Position saved:`, { x: currentLeft, y: currentTop });

                    // 延迟重置拖拽标志
                    clearTimeout(dragTimeout);
                    dragTimeout = setTimeout(() => {
                        wasDragged = false;
                    }, 100);
                }
            }
        };

        // 点击事件
        const onClick = (e) => {
            if (wasDragged) {
                console.log(`[${extensionName}] Click blocked due to drag`);
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
            console.log(`[${extensionName}] Button clicked, showing popup`);

            // 切换弹窗显示/隐藏
            try {
                togglePopup();
            } catch (error) {
                console.error(`[${extensionName}] Error toggling popup:`, error);
                // 如果出错，创建一个简单的弹窗
                alert("🐾 虚拟宠物系统\n\n弹窗功能正在加载中...\n请稍后再试！");
            }
        };

        // 绑定事件 - iOS优化
        $button.on("mousedown", onDragStart);
        $button.on("touchstart", onDragStart);
        $button.on("click", onClick);

        // iOS专用触摸事件
        $button.on("touchend", function(e) {
            if (!wasDragged) {
                e.preventDefault();
                console.log(`[${extensionName}] iOS touch end - showing popup`);

                try {
                    // 所有平台都使用统一的切换函数
                    togglePopup();
                } catch (error) {
                    console.error(`[${extensionName}] Popup error:`, error);
                    // 备用方案
                    alert("🐾 虚拟宠物\n\n弹窗功能正在加载中...\n请稍后再试！");
                }
            }
        });

        console.log(`[${extensionName}] Safe drag events bound successfully`);
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

        // 确保头像数据已加载
        loadAvatarData();
        console.log(`[${extensionName}] Avatar data loaded:`, avatarData);

        // 创建按钮
        console.log(`[${extensionName}] Creating floating button with ID: ${BUTTON_ID}`);

        // 获取当前头像显示内容
        const avatarDisplay = getFloatingButtonAvatarDisplay();
        console.log(`[${extensionName}] Avatar display content:`, avatarDisplay);

        // 根据头像类型调整按钮样式
        const isImageAvatar = avatarData.type === 'image' || avatarData.type === 'url';
        const buttonBackground = isImageAvatar ?
            'background: #2c2f33 !important;' :
            'background: linear-gradient(145deg, #2f3338, #212529) !important;';

        console.log(`[${extensionName}] Button background:`, buttonBackground);

        // 使用内联样式确保按钮可见，显示用户头像
        const buttonHtml = `
            <div id="${BUTTON_ID}" title="虚拟宠物 - ${avatarData.customName || '我的宠物'}" style="
                position: fixed !important;
                z-index: 2147483645 !important;
                cursor: grab !important;
                width: 48px !important;
                height: 48px !important;
                ${buttonBackground}
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
                top: 200px;
                left: 20px;
                overflow: hidden !important;
                position: relative !important;
            ">${avatarDisplay}</div>
        `;

        $("body").append(buttonHtml);

        const $button = $(`#${BUTTON_ID}`);
        console.log(`[${extensionName}] Button created, element count: ${$button.length}`);

        if ($button.length === 0) {
            console.error(`[${extensionName}] Failed to create button!`);
            return;
        }

        // 强制确保按钮可见
        $button.css({
            'display': 'flex',
            'opacity': '1',
            'visibility': 'visible'
        });

        // 从localStorage恢复按钮位置
        const savedPos = localStorage.getItem(STORAGE_KEY_BUTTON_POS);
        if (savedPos) {
            try {
                const pos = JSON.parse(savedPos);
                // 验证位置是否合理
                const windowWidth = $(window).width();
                const windowHeight = $(window).height();
                const left = parseInt(pos.x) || 20;
                const top = parseInt(pos.y) || windowHeight / 2;

                // 确保位置在屏幕范围内
                const safeLeft = Math.max(0, Math.min(left, windowWidth - 60));
                const safeTop = Math.max(0, Math.min(top, windowHeight - 60));

                $button.css({
                    top: safeTop + 'px',
                    left: safeLeft + 'px',
                    transform: 'none'
                });
                console.log(`[${extensionName}] Button position restored:`, { left: safeLeft, top: safeTop });
            } catch (error) {
                console.warn(`[${extensionName}] Failed to restore position:`, error);
                // 如果恢复位置失败，设置默认位置
                $button.css({
                    top: "50%",
                    left: "20px",
                    transform: "translateY(-50%)"
                });
            }
        } else {
            // 如果没有保存的位置，则设置一个默认位置
            $button.css({
                top: "50%",
                left: "20px",
                transform: "translateY(-50%)"
            });
        }

        // 使按钮可拖动
        makeButtonDraggable($button);

        console.log(`[${extensionName}] Button initialization complete`);
    }

    /**
     * 移除浮动按钮
     */
    function destroyFloatingButton() {
        $(`#${BUTTON_ID}`).remove();
    }

    // 移动端专用的强制初始化函数
    function mobileForceInit() {
        console.log("🔧 移动端强制初始化...");

        // 确保全局变量可用
        if (typeof window.extensionName === 'undefined') {
            window.extensionName = extensionName;
            window.BUTTON_ID = BUTTON_ID;
            window.OVERLAY_ID = OVERLAY_ID;
            window.avatarData = avatarData;
        }

        // 加载头像数据
        loadAvatarData();

        // 移除现有按钮
        $(`#${BUTTON_ID}`).remove();

        // 获取存储的头像数据
        const storedAvatar = localStorage.getItem(STORAGE_KEY_PET_AVATAR);
        let currentAvatarData = avatarData;

        if (storedAvatar) {
            try {
                currentAvatarData = JSON.parse(storedAvatar);
                window.avatarData = currentAvatarData;
            } catch (e) {
                console.log("头像数据解析失败，使用默认");
            }
        }

        // 获取存储的位置
        const savedPos = localStorage.getItem(STORAGE_KEY_BUTTON_POS);
        let position = { x: '20px', y: '200px' };
        if (savedPos) {
            try {
                position = JSON.parse(savedPos);
            } catch (e) {}
        }

        // 创建头像显示内容
        let avatarDisplay = '🐱';
        if (currentAvatarData.type === 'image' && currentAvatarData.value) {
            avatarDisplay = `<img src="${currentAvatarData.value}" style="
                width: 100% !important;
                height: 100% !important;
                object-fit: cover !important;
                border-radius: 50% !important;
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
            " alt="宠物头像" onerror="this.parentNode.innerHTML='🐱'; this.parentNode.style.fontSize='24px';">`;
        } else if (currentAvatarData.type === 'emoji') {
            avatarDisplay = currentAvatarData.value || '🐱';
        }

        // 创建按钮HTML
        const buttonHtml = `
            <div id="${BUTTON_ID}" title="虚拟宠物 - ${currentAvatarData.customName || '小猫'}" style="
                position: fixed !important;
                z-index: 2147483645 !important;
                cursor: grab !important;
                width: 48px !important;
                height: 48px !important;
                background: linear-gradient(145deg, #2f3338, #212529) !important;
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
                top: ${position.y} !important;
                left: ${position.x} !important;
                overflow: hidden !important;
            ">${avatarDisplay}</div>
        `;

        $("body").append(buttonHtml);

        // 绑定拖拽和点击事件
        const $button = $(`#${BUTTON_ID}`);
        if ($button.length > 0) {
            makeButtonDraggable($button);
            console.log("✅ 移动端按钮创建成功");
            return true;
        } else {
            console.log("❌ 移动端按钮创建失败");
            return false;
        }
    }

    // 确保关键函数全局可用，特别是移动端
    window.initializeFloatingButton = initializeFloatingButton;
    window.destroyFloatingButton = destroyFloatingButton;
    window.mobileForceInit = mobileForceInit;

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
        $("#extensions_settings2").append(simpleSettingsHtml);
        console.log(`[${extensionName}] Settings panel created`);

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
                            <div class="pet-popup-title">🐾 虚拟宠物</div>
                            <button id="virtual-pet-popup-close-button" class="pet-popup-close-button">&times;</button>
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

        // 5. 只在非iOS设备上初始化原始弹窗功能
        if (!isIOS) {
            // 使弹窗可拖拽
            const $popup = $(`#${POPUP_ID}`);
            if ($popup.length > 0) {
                makePopupDraggable($popup);
                console.log(`[${extensionName}] Popup drag functionality added`);
            }

            // 绑定事件 (同时绑定 click 和 touchend 以兼容移动端)
            $(`#${CLOSE_BUTTON_ID}`).on("click touchend", (e) => {
                e.preventDefault();
                e.stopPropagation(); // 防止触发拖拽
                closePopup();
            });

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
            // 默认启用，除非用户明确禁用
            const isEnabled = localStorage.getItem(STORAGE_KEY_ENABLED) !== "false";
            console.log(`[${extensionName}] Extension enabled: ${isEnabled}`);

            const toggleElement = $(TOGGLE_ID);
            if (toggleElement.length === 0) {
                console.warn(`[${extensionName}] Toggle element not found: ${TOGGLE_ID}`);
                console.log(`[${extensionName}] Available elements:`, $("#extensions_settings2").find("input[type='checkbox']").length);
                // 即使没有开关元素，也要显示悬浮按钮
                console.log(`[${extensionName}] No toggle found, but initializing floating button anyway...`);
                initializeFloatingButton();
            } else {
                toggleElement.prop("checked", isEnabled);
                console.log(`[${extensionName}] Toggle element found and set`);

                // 无论开关状态如何，都显示按钮（移动端友好）
                console.log(`[${extensionName}] Initializing floating button (mobile-friendly)...`);
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

        // 额外的保险措施：3秒后检查按钮是否存在，如果不存在就强制创建
        setTimeout(() => {
            const button = $(`#${BUTTON_ID}`);
            if (button.length === 0) {
                console.log(`[${extensionName}] Button not found after 3 seconds, force creating...`);
                initializeFloatingButton();
            } else {
                console.log(`[${extensionName}] Button exists, all good!`);
            }
        }, 3000);

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

        // 创建按钮并强制设置样式（参考momo尺寸）
        const buttonHtml = `
            <div id="${BUTTON_ID}" title="虚拟宠物" style="
                position: fixed !important;
                z-index: 2147483647 !important;
                cursor: grab !important;
                width: 48px !important;
                height: 48px !important;
                background: linear-gradient(145deg, #2f3338, #212529) !important;
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
                top: 200px;
                left: 20px;
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
                    // 所有平台都使用统一的切换函数
                    togglePopup();
                } catch (error) {
                    console.error("切换弹窗出错:", error);
                    alert("🐾 虚拟宠物\n\n弹窗功能正在加载中...");
                }
            });

            // 使按钮可拖动
            makeButtonDraggable($button);

            console.log("🐾 按钮应该现在可见了！");
        }

        return $button.length > 0;
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
                    background-color: #2c2f33 !important;
                    color: white !important;
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

        // 绑定统一的关闭事件
        const $iosOverlay = $("#virtual-pet-popup-overlay");
        $iosOverlay.find(".close-button").on("click touchend", function(e) {
            e.preventDefault();
            $iosOverlay.remove();
        });

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
                text-align: center !important;
                margin-bottom: 15px !important;
                padding-bottom: 12px !important;
                border-bottom: 1px solid #40444b !important;
            ">
                <h2 style="margin: 0 !important; color: #7289da !important; font-size: 1.2em !important;">🐾 虚拟宠物</h2>
                <p style="margin: 5px 0 0 0 !important; color: #99aab5 !important; font-size: 0.8em !important;">点击悬浮按钮收起界面</p>
            </div>

            <div class="pet-main-content" style="
                display: flex !important;
                flex-direction: column !important;
                gap: 12px !important;
            ">
                <!-- 居中的圆形头像 -->
                <div class="pet-avatar-section" style="
                    text-align: center !important;
                    margin-bottom: 15px !important;
                ">
                    <!-- 可点击的圆形头像 -->
                    <div class="pet-avatar-clickable" style="
                        width: 80px !important;
                        height: 80px !important;
                        border-radius: 50% !important;
                        overflow: hidden !important;
                        background: #2c2f33 !important;
                        border: 3px solid #7289da !important;
                        cursor: pointer !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        transition: all 0.2s ease !important;
                        position: relative !important;
                        -webkit-tap-highlight-color: transparent !important;
                        margin: 0 auto !important;
                    " title="点击更换头像">
                        <div class="pet-avatar" style="
                            width: 100% !important;
                            height: 100% !important;
                            display: flex !important;
                            align-items: center !important;
                            justify-content: center !important;
                            font-size: 2.5em !important;
                        ">${getCurrentAvatarDisplay()}</div>
                        <!-- 悬停提示 -->
                        <div class="avatar-hover-hint" style="
                            position: absolute !important;
                            bottom: -3px !important;
                            right: -3px !important;
                            width: 20px !important;
                            height: 20px !important;
                            background: #7289da !important;
                            border-radius: 50% !important;
                            display: flex !important;
                            align-items: center !important;
                            justify-content: center !important;
                            font-size: 10px !important;
                            color: white !important;
                            border: 2px solid #2c2f33 !important;
                        ">📷</div>
                    </div>
                </div>

                <!-- 宠物信息 -->
                <div class="pet-info-section" style="
                    text-align: center !important;
                    margin-bottom: 15px !important;
                ">
                    <div class="pet-name" style="font-size: 1.3em !important; font-weight: bold !important; margin-bottom: 5px !important; color: white !important;">小宠物</div>
                    <div class="pet-level" style="color: #7289da !important; font-size: 1em !important;">Lv.1</div>
                </div>

                <!-- 宠物状态栏 -->
                <div class="pet-status-section" style="
                    background: #40444b !important;
                    padding: 10px !important;
                    border-radius: 8px !important;
                ">
                    <h4 style="margin: 0 0 10px 0 !important; color: #7289da !important; font-size: 0.9em !important;">📊 状态</h4>
                    <div class="status-bars" style="display: flex !important; flex-direction: column !important; gap: 6px !important;">
                        <div class="status-item">
                            <div style="display: flex !important; justify-content: space-between !important; margin-bottom: 3px !important;">
                                <span style="color: #99aab5 !important; font-size: 0.8em !important;">❤️ 健康</span>
                                <span style="color: #43b581 !important; font-size: 0.8em !important;">85/100</span>
                            </div>
                            <div style="background: #2c2f33 !important; height: 5px !important; border-radius: 3px !important; overflow: hidden !important;">
                                <div style="background: #43b581 !important; height: 100% !important; width: 85% !important; transition: width 0.3s ease !important;"></div>
                            </div>
                        </div>
                        <div class="status-item">
                            <div style="display: flex !important; justify-content: space-between !important; margin-bottom: 3px !important;">
                                <span style="color: #99aab5 !important; font-size: 0.8em !important;">🍖 饱食度</span>
                                <span style="color: #faa61a !important; font-size: 0.8em !important;">60/100</span>
                            </div>
                            <div style="background: #2c2f33 !important; height: 5px !important; border-radius: 3px !important; overflow: hidden !important;">
                                <div style="background: #faa61a !important; height: 100% !important; width: 60% !important; transition: width 0.3s ease !important;"></div>
                            </div>
                        </div>
                        <div class="status-item">
                            <div style="display: flex !important; justify-content: space-between !important; margin-bottom: 3px !important;">
                                <span style="color: #99aab5 !important; font-size: 0.8em !important;">😊 快乐度</span>
                                <span style="color: #7289da !important; font-size: 0.8em !important;">75/100</span>
                            </div>
                            <div style="background: #2c2f33 !important; height: 5px !important; border-radius: 3px !important; overflow: hidden !important;">
                                <div style="background: #7289da !important; height: 100% !important; width: 75% !important; transition: width 0.3s ease !important;"></div>
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
                    background: #40444b !important;
                    border-radius: 6px !important;
                    color: #99aab5 !important;
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
                text-align: center !important;
                margin-bottom: 20px !important;
                padding-bottom: 15px !important;
                border-bottom: 1px solid #40444b !important;
            ">
                <h2 style="margin: 0 !important; color: #7289da !important; font-size: 1.4em !important;">🐾 虚拟宠物</h2>
                <p style="margin: 8px 0 0 0 !important; color: #99aab5 !important; font-size: 0.9em !important;">点击悬浮按钮收起界面</p>
            </div>

            <div class="pet-main-content" style="
                display: flex !important;
                flex-direction: column !important;
                gap: 15px !important;
            ">
                <!-- 居中的圆形头像 -->
                <div class="pet-avatar-section" style="
                    text-align: center !important;
                    margin-bottom: 20px !important;
                ">
                    <!-- 可点击的圆形头像 -->
                    <div class="pet-avatar-clickable" style="
                        width: 100px !important;
                        height: 100px !important;
                        border-radius: 50% !important;
                        overflow: hidden !important;
                        background: #2c2f33 !important;
                        border: 3px solid #7289da !important;
                        cursor: pointer !important;
                        display: flex !important;
                        align-items: center !important;
                        justify-content: center !important;
                        transition: all 0.2s ease !important;
                        position: relative !important;
                        margin: 0 auto !important;
                    " title="点击更换头像">
                        <div class="pet-avatar" style="
                            width: 100% !important;
                            height: 100% !important;
                            display: flex !important;
                            align-items: center !important;
                            justify-content: center !important;
                            font-size: 3em !important;
                        ">${getCurrentAvatarDisplay()}</div>
                        <!-- 悬停提示 -->
                        <div class="avatar-hover-hint" style="
                            position: absolute !important;
                            bottom: -3px !important;
                            right: -3px !important;
                            width: 24px !important;
                            height: 24px !important;
                            background: #7289da !important;
                            border-radius: 50% !important;
                            display: flex !important;
                            align-items: center !important;
                            justify-content: center !important;
                            font-size: 12px !important;
                            color: white !important;
                            border: 2px solid #2c2f33 !important;
                        ">📷</div>
                    </div>
                </div>

                <!-- 宠物信息 -->
                <div class="pet-info-section" style="
                    text-align: center !important;
                    margin-bottom: 20px !important;
                ">
                    <div class="pet-name" style="font-size: 1.4em !important; font-weight: bold !important; margin-bottom: 6px !important; color: white !important;">小宠物</div>
                    <div class="pet-level" style="color: #7289da !important; font-size: 1.1em !important;">Lv.1</div>
                </div>

                <!-- 宠物状态栏 -->
                <div class="pet-status-section" style="
                    background: #40444b !important;
                    padding: 12px !important;
                    border-radius: 8px !important;
                ">
                    <h4 style="margin: 0 0 12px 0 !important; color: #7289da !important; font-size: 1em !important;">📊 状态</h4>
                    <div class="status-bars" style="display: flex !important; flex-direction: column !important; gap: 8px !important;">
                        <div class="status-item">
                            <div style="display: flex !important; justify-content: space-between !important; margin-bottom: 4px !important;">
                                <span style="color: #99aab5 !important; font-size: 0.9em !important;">❤️ 健康</span>
                                <span style="color: #43b581 !important; font-size: 0.9em !important;">85/100</span>
                            </div>
                            <div style="background: #2c2f33 !important; height: 6px !important; border-radius: 3px !important; overflow: hidden !important;">
                                <div style="background: #43b581 !important; height: 100% !important; width: 85% !important; transition: width 0.3s ease !important;"></div>
                            </div>
                        </div>
                        <div class="status-item">
                            <div style="display: flex !important; justify-content: space-between !important; margin-bottom: 4px !important;">
                                <span style="color: #99aab5 !important; font-size: 0.9em !important;">🍖 饱食度</span>
                                <span style="color: #faa61a !important; font-size: 0.9em !important;">60/100</span>
                            </div>
                            <div style="background: #2c2f33 !important; height: 6px !important; border-radius: 3px !important; overflow: hidden !important;">
                                <div style="background: #faa61a !important; height: 100% !important; width: 60% !important; transition: width 0.3s ease !important;"></div>
                            </div>
                        </div>
                        <div class="status-item">
                            <div style="display: flex !important; justify-content: space-between !important; margin-bottom: 4px !important;">
                                <span style="color: #99aab5 !important; font-size: 0.9em !important;">😊 快乐度</span>
                                <span style="color: #7289da !important; font-size: 0.9em !important;">75/100</span>
                            </div>
                            <div style="background: #2c2f33 !important; height: 6px !important; border-radius: 3px !important; overflow: hidden !important;">
                                <div style="background: #7289da !important; height: 100% !important; width: 75% !important; transition: width 0.3s ease !important;"></div>
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
                        <span style="font-size: 1.1em !important;">�</span>
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
                    background: #40444b !important;
                    border-radius: 6px !important;
                    color: #99aab5 !important;
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
            // 这里可以添加喂食逻辑
            showNotification("🍖 宠物吃得很开心！", "success");
        });

        // 玩耍按钮
        $container.find(".play-btn").on("click touchend", function(e) {
            e.preventDefault();
            console.log("🎮 和宠物玩耍");
            // 这里可以添加玩耍逻辑
            showNotification("🎮 宠物玩得很开心！", "success");
        });

        // 休息按钮
        $container.find(".sleep-btn").on("click touchend", function(e) {
            e.preventDefault();
            console.log("😴 宠物休息");
            // 这里可以添加休息逻辑
            showNotification("😴 宠物正在休息...", "info");
        });

        // 设置按钮
        $container.find(".settings-btn").on("click touchend", function(e) {
            e.preventDefault();
            console.log("⚙️ 打开设置");
            showNotification("⚙️ 其他设置功能开发中...", "info");
        });

        console.log(`[${extensionName}] Unified UI events bound successfully`);
    }

    /**
     * 绑定头像点击事件
     */
    function bindAvatarClickEvent($container) {
        const avatarClickable = $container.find(".pet-avatar-clickable");

        // 创建隐藏的文件输入框
        const fileInput = $('<input type="file" accept="image/*" style="display: none;">');
        $("body").append(fileInput);

        // 头像点击事件
        avatarClickable.on("click touchend", function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log(`[${extensionName}] Avatar clicked - opening file selector`);

            // 触发文件选择
            fileInput.click();
        });

        // 文件选择事件
        fileInput.on("change", function(e) {
            const file = e.target.files[0];
            if (file) {
                console.log(`[${extensionName}] File selected:`, file.name);

                // 文件大小检查（5MB限制）
                if (file.size > 5 * 1024 * 1024) {
                    showNotification("❌ 图片文件不能超过5MB", "error");
                    return;
                }

                // 文件类型检查
                if (!file.type.startsWith('image/')) {
                    showNotification("❌ 请选择图片文件", "error");
                    return;
                }

                // 读取文件并设置头像
                const reader = new FileReader();
                reader.onload = function(e) {
                    const base64 = e.target.result;
                    setAvatar('image', base64, file.name);
                    showNotification(`🎨 头像已更新为 ${file.name}`, 'success');
                };
                reader.onerror = function() {
                    showNotification("❌ 图片读取失败", "error");
                };
                reader.readAsDataURL(file);
            }

            // 清空文件输入框，允许重复选择同一文件
            $(this).val('');
        });

        // 悬停效果
        avatarClickable.on("mouseenter", function() {
            $(this).css({
                "transform": "scale(1.05)",
                "border-color": "#5865f2"
            });
        }).on("mouseleave", function() {
            $(this).css({
                "transform": "scale(1)",
                "border-color": "#7289da"
            });
        });

        console.log(`[${extensionName}] Avatar click event bound`);
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
            'z-index': '2147483645'
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

    /**
     * 显示头像选择器
     */
    function showAvatarSelector() {
        console.log(`[${extensionName}] Showing avatar selector`);

        // 检测设备类型
        const windowWidth = $(window).width();
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isAndroid = /Android/.test(navigator.userAgent);
        const isMobile = windowWidth <= 767 || isIOS || isAndroid;

        // 清除现有的头像选择器
        $("#avatar-selector-overlay").remove();

        // 根据设备类型调整样式
        const containerMaxWidth = isMobile ? "320px" : "400px";
        const containerPadding = isMobile ? "16px" : "20px";
        const borderRadius = isIOS ? "16px" : "12px";
        const iosTransform = isIOS ? "-webkit-transform: translateZ(0) !important; transform: translateZ(0) !important;" : "";

        // 生成预设头像选项
        const presetAvatarsHtml = PRESET_AVATARS.map(avatar => `
            <div class="avatar-option" data-type="${avatar.type}" data-value="${avatar.value}" data-name="${avatar.name}" style="
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                padding: 12px !important;
                background: #40444b !important;
                border-radius: 8px !important;
                cursor: pointer !important;
                transition: all 0.2s ease !important;
                min-height: 80px !important;
                justify-content: center !important;
            ">
                <div style="font-size: 2em !important; margin-bottom: 4px !important;">${avatar.value}</div>
                <div style="font-size: 0.8em !important; color: #99aab5 !important; text-align: center !important;">${avatar.name}</div>
            </div>
        `).join('');

        // 创建头像选择器HTML（第一部分）
        const avatarSelectorHtml = `
            <div id="avatar-selector-overlay" style="
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
                <div id="avatar-selector-container" style="
                    position: relative !important;
                    width: 100% !important;
                    height: auto !important;
                    max-width: ${containerMaxWidth} !important;
                    max-height: calc(100vh - 60px) !important;
                    background-color: #2c2f33 !important;
                    color: white !important;
                    border-radius: ${borderRadius} !important;
                    padding: ${containerPadding} !important;
                    overflow-y: auto !important;
                    -webkit-overflow-scrolling: touch !important;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.5) !important;
                    ${iosTransform}
                ">
                    <!-- 头部 -->
                    <div style="
                        display: flex !important;
                        justify-content: space-between !important;
                        align-items: center !important;
                        margin-bottom: ${isMobile ? '15px' : '20px'} !important;
                        padding-bottom: ${isMobile ? '12px' : '15px'} !important;
                        border-bottom: 1px solid #40444b !important;
                    ">
                        <h2 style="margin: 0 !important; color: #7289da !important; font-size: ${isMobile ? '1.2em' : '1.4em'} !important;">🎨 选择头像</h2>
                        <button class="avatar-close-button" style="
                            background: rgba(255,255,255,0.1) !important;
                            border: none !important;
                            color: #99aab5 !important;
                            font-size: ${isMobile ? '24px' : '28px'} !important;
                            cursor: pointer !important;
                            padding: ${isMobile ? '10px' : '12px'} !important;
                            line-height: 1 !important;
                            min-width: ${isMobile ? '44px' : '48px'} !important;
                            min-height: ${isMobile ? '44px' : '48px'} !important;
                            display: flex !important;
                            align-items: center !important;
                            justify-content: center !important;
                            border-radius: 50% !important;
                            -webkit-tap-highlight-color: transparent !important;
                            touch-action: manipulation !important;
                        ">&times;</button>
                    </div>

                    <!-- 当前头像 -->
                    <div style="
                        text-align: center !important;
                        margin-bottom: ${isMobile ? '15px' : '20px'} !important;
                        padding: ${isMobile ? '12px' : '15px'} !important;
                        background: #40444b !important;
                        border-radius: 8px !important;
                    ">
                        <div style="margin-bottom: 8px !important; color: #99aab5 !important; font-size: 0.9em !important;">当前头像</div>
                        <div class="current-avatar-display" style="
                            font-size: ${isMobile ? '3em' : '4em'} !important;
                            margin-bottom: 8px !important;
                            width: ${isMobile ? '3em' : '4em'} !important;
                            height: ${isMobile ? '3em' : '4em'} !important;
                            display: flex !important;
                            align-items: center !important;
                            justify-content: center !important;
                            margin: 0 auto 8px auto !important;
                        ">${getCurrentAvatarDisplay()}</div>
                        <div style="color: #7289da !important; font-size: 0.9em !important;">${avatarData.customName || '默认头像'}</div>
                    </div>

                    <!-- 预设头像 -->
                    <div style="margin-bottom: ${isMobile ? '15px' : '20px'} !important;">
                        <h3 style="margin: 0 0 12px 0 !important; color: #7289da !important; font-size: 1em !important;">🎭 预设头像</h3>
                        <div class="avatar-grid" style="
                            display: grid !important;
                            grid-template-columns: repeat(auto-fit, minmax(80px, 1fr)) !important;
                            gap: ${isMobile ? '8px' : '10px'} !important;
                        ">
                            ${presetAvatarsHtml}
                        </div>
                    </div>

                    <!-- 自定义选项 -->
                    <div style="margin-bottom: ${isMobile ? '15px' : '20px'} !important;">
                        <h3 style="margin: 0 0 12px 0 !important; color: #7289da !important; font-size: 1em !important;">🖼️ 自定义头像</h3>
                        <div style="display: flex !important; flex-direction: column !important; gap: 10px !important;">
                            <input type="file" id="avatar-file-input" accept="image/*" style="
                                padding: 10px !important;
                                background: #40444b !important;
                                border: 1px solid #7289da !important;
                                border-radius: 6px !important;
                                color: white !important;
                                font-size: 14px !important;
                            ">
                            <input type="url" id="avatar-url-input" placeholder="输入图片URL..." style="
                                padding: 10px !important;
                                background: #40444b !important;
                                border: 1px solid #7289da !important;
                                border-radius: 6px !important;
                                color: white !important;
                                font-size: 14px !important;
                            ">
                            <button id="apply-custom-avatar" style="
                                padding: 12px !important;
                                background: #7289da !important;
                                color: white !important;
                                border: none !important;
                                border-radius: 6px !important;
                                font-size: 14px !important;
                                cursor: pointer !important;
                                transition: background 0.2s ease !important;
                            ">应用自定义头像</button>
                        </div>
                    </div>

                    <!-- 底部按钮 -->
                    <div style="
                        display: flex !important;
                        gap: 10px !important;
                        justify-content: flex-end !important;
                    ">
                        <button class="avatar-cancel-btn" style="
                            padding: 10px 20px !important;
                            background: #99aab5 !important;
                            color: white !important;
                            border: none !important;
                            border-radius: 6px !important;
                            font-size: 14px !important;
                            cursor: pointer !important;
                        ">取消</button>
                    </div>
                </div>
            </div>
        `;

        $("body").append(avatarSelectorHtml);
        const selectorOverlay = $("#avatar-selector-overlay");

        // 绑定事件
        bindAvatarSelectorEvents(selectorOverlay, isIOS);

        console.log(`[${extensionName}] Avatar selector displayed`);
    }

    /**
     * 绑定头像选择器事件
     */
    function bindAvatarSelectorEvents(selectorOverlay, isIOS) {
        // 关闭按钮事件
        const closeButton = selectorOverlay.find(".avatar-close-button");
        const cancelButton = selectorOverlay.find(".avatar-cancel-btn");

        function closeAvatarSelector() {
            selectorOverlay.fadeOut(200, function() {
                $(this).remove();
            });
        }

        if (isIOS) {
            closeButton.on("touchstart click", function(e) {
                e.preventDefault();
                e.stopPropagation();
                closeAvatarSelector();
            });
            cancelButton.on("touchstart click", function(e) {
                e.preventDefault();
                e.stopPropagation();
                closeAvatarSelector();
            });
        } else {
            closeButton.on("click", closeAvatarSelector);
            cancelButton.on("click", closeAvatarSelector);
        }

        // 外部点击关闭
        selectorOverlay.on("click", function(e) {
            if (e.target === this) {
                closeAvatarSelector();
            }
        });

        // 预设头像选择
        selectorOverlay.find(".avatar-option").on("click", function() {
            const type = $(this).data("type");
            const value = $(this).data("value");
            const name = $(this).data("name");

            // 高亮选中的头像
            selectorOverlay.find(".avatar-option").css("background", "#40444b");
            $(this).css("background", "#7289da");

            // 应用头像
            setAvatar(type, value, name);

            // 延迟关闭，让用户看到选择效果
            setTimeout(() => {
                closeAvatarSelector();
            }, 500);
        });

        // 文件上传
        selectorOverlay.find("#avatar-file-input").on("change", function(e) {
            const file = e.target.files[0];
            if (file) {
                if (file.size > 5 * 1024 * 1024) { // 5MB限制
                    showNotification("❌ 图片文件不能超过5MB", "error");
                    return;
                }

                const reader = new FileReader();
                reader.onload = function(e) {
                    const base64 = e.target.result;
                    setAvatar('image', base64, file.name);
                    closeAvatarSelector();
                };
                reader.readAsDataURL(file);
            }
        });

        // URL输入
        selectorOverlay.find("#apply-custom-avatar").on("click", function() {
            const url = selectorOverlay.find("#avatar-url-input").val().trim();
            if (url) {
                // 简单的URL验证
                if (!url.match(/^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i)) {
                    showNotification("❌ 请输入有效的图片URL", "error");
                    return;
                }

                setAvatar('url', url, '自定义图片');
                closeAvatarSelector();
            } else {
                showNotification("❌ 请输入图片URL", "error");
            }
        });

        // 悬停效果
        selectorOverlay.find(".avatar-option").on("mouseenter", function() {
            if ($(this).css("background-color") !== "rgb(114, 137, 218)") { // 不是选中状态
                $(this).css("background", "#5865f2");
            }
        }).on("mouseleave", function() {
            if ($(this).css("background-color") !== "rgb(114, 137, 218)") { // 不是选中状态
                $(this).css("background", "#40444b");
            }
        });
    }

    // 全局测试函数
    window.testAvatarSystem = function() {
        console.log("🎨 测试头像系统...");

        // 显示当前头像信息
        console.log("当前头像数据:", avatarData);
        console.log("当前头像显示:", getCurrentAvatarDisplay());

        // 测试设置不同类型的头像
        console.log("🧪 测试设置emoji头像...");
        setAvatar('emoji', '🐶', '小狗');

        setTimeout(() => {
            console.log("🧪 测试设置回默认头像...");
            setAvatar('emoji', '🐱', '小猫');
        }, 2000);

        return {
            currentAvatar: avatarData,
            presetCount: PRESET_AVATARS.length,
            display: getCurrentAvatarDisplay()
        };
    };

    window.showAvatarSelector = showAvatarSelector;
    window.togglePopup = togglePopup;

    // 诊断按钮问题的函数
    window.diagnoseButton = function() {
        console.log("🔍 诊断悬浮按钮问题...");

        // 检查按钮是否存在
        const button = $(`#${BUTTON_ID}`);
        console.log("按钮元素数量:", button.length);

        if (button.length > 0) {
            console.log("✅ 按钮存在");
            console.log("按钮HTML:", button[0].outerHTML);
            console.log("按钮样式:", button.attr('style'));
            console.log("按钮内容:", button.html());
            console.log("按钮位置:", {
                top: button.css('top'),
                left: button.css('left'),
                position: button.css('position'),
                zIndex: button.css('z-index')
            });
            console.log("按钮可见性:", {
                display: button.css('display'),
                visibility: button.css('visibility'),
                opacity: button.css('opacity')
            });
        } else {
            console.log("❌ 按钮不存在");
            console.log("尝试查找所有可能的按钮元素...");

            // 查找所有可能的按钮
            const allButtons = $('[id*="virtual-pet"]');
            console.log("找到的相关元素:", allButtons.length);
            allButtons.each(function(index) {
                console.log(`元素${index}:`, this.outerHTML);
            });
        }

        // 检查头像数据
        console.log("头像数据:", avatarData);

        // 检查头像显示函数
        try {
            const avatarDisplay = getFloatingButtonAvatarDisplay();
            console.log("头像显示内容:", avatarDisplay);
        } catch (error) {
            console.log("头像显示函数错误:", error);
        }

        return {
            buttonExists: button.length > 0,
            buttonCount: button.length,
            avatarData: avatarData,
            buttonId: BUTTON_ID
        };
    };

    // 测试新的头像点击功能
    window.testAvatarClick = function() {
        console.log("🎨 测试头像点击功能...");

        // 检查头像元素是否存在
        const avatarClickable = $(".pet-avatar-clickable");
        console.log("可点击头像元素数量:", avatarClickable.length);

        if (avatarClickable.length > 0) {
            console.log("✅ 头像元素存在");
            console.log("头像样式:", avatarClickable.attr('style'));
            console.log("头像提示:", avatarClickable.attr('title'));

            // 检查事件绑定
            const events = $._data(avatarClickable[0], 'events');
            console.log("头像事件绑定:", events);

            return {
                hasAvatar: true,
                avatarCount: avatarClickable.length,
                hasEvents: !!events,
                currentAvatar: avatarData
            };
        } else {
            console.log("❌ 头像元素不存在");
            return {
                hasAvatar: false,
                avatarCount: 0,
                hasEvents: false,
                currentAvatar: avatarData
            };
        }
    };

    // 测试悬浮按钮头像功能
    window.testFloatingButtonAvatar = function() {
        console.log("🎨 测试悬浮按钮头像功能...");

        // 检查悬浮按钮是否存在
        const floatingButton = $(`#${BUTTON_ID}`);
        console.log("悬浮按钮存在:", floatingButton.length > 0);

        if (floatingButton.length > 0) {
            console.log("当前头像数据:", avatarData);
            console.log("悬浮按钮内容:", floatingButton.html());
            console.log("悬浮按钮标题:", floatingButton.attr('title'));

            // 测试不同类型的头像
            console.log("🧪 测试emoji头像...");
            setAvatar('emoji', '🐶', '小狗');

            setTimeout(() => {
                console.log("悬浮按钮更新后内容:", floatingButton.html());

                console.log("🧪 测试回到默认头像...");
                setAvatar('emoji', '🐱', '小猫');

                setTimeout(() => {
                    console.log("最终悬浮按钮内容:", floatingButton.html());
                    console.log("✅ 悬浮按钮头像测试完成");
                }, 1000);
            }, 1000);

            return {
                hasButton: true,
                currentContent: floatingButton.html(),
                currentTitle: floatingButton.attr('title'),
                avatarData: avatarData
            };
        } else {
            console.log("❌ 悬浮按钮不存在");
            return {
                hasButton: false,
                currentContent: null,
                currentTitle: null,
                avatarData: avatarData
            };
        }
    };

    // 紧急修复函数 - 强制显示按钮
    window.emergencyFixButton = function() {
        console.log("🚨 紧急修复：强制显示悬浮按钮...");

        // 移除现有按钮
        $(`#${BUTTON_ID}`).remove();

        // 重置头像数据为默认值（小猫）
        avatarData = {
            type: 'emoji',
            value: '🐱',
            customName: '小猫'
        };

        // 创建简单的按钮HTML（显示小猫头像）
        const simpleButtonHtml = `
            <div id="${BUTTON_ID}" title="虚拟宠物 - 小猫" style="
                position: fixed !important;
                z-index: 2147483645 !important;
                cursor: grab !important;
                width: 48px !important;
                height: 48px !important;
                background: linear-gradient(145deg, #2f3338, #212529) !important;
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
                top: 200px !important;
                left: 20px !important;
            ">🐱</div>
        `;

        $("body").append(simpleButtonHtml);

        // 重新绑定基本事件和拖拽功能
        const $button = $(`#${BUTTON_ID}`);
        if ($button.length > 0) {
            // 绑定拖拽功能
            makeButtonDraggable($button);

            console.log("✅ 紧急修复完成！按钮已显示，拖拽功能已绑定");
            return true;
        } else {
            console.log("❌ 紧急修复失败");
            return false;
        }
    };

    // 测试默认猫头像功能
    window.testDefaultCatAvatar = function() {
        console.log("🐱 测试默认猫头像功能...");

        // 检查默认头像数据
        console.log("默认头像数据:", avatarData);

        // 检查悬浮按钮
        const button = $(`#${BUTTON_ID}`);
        if (button.length > 0) {
            console.log("悬浮按钮内容:", button.html());
            console.log("悬浮按钮标题:", button.attr('title'));

            if (button.html().includes('🐱')) {
                console.log("✅ 悬浮按钮正确显示猫头像");
            } else {
                console.log("❌ 悬浮按钮未显示猫头像");
            }
        } else {
            console.log("❌ 悬浮按钮不存在");
        }

        // 测试头像显示函数
        try {
            const currentDisplay = getCurrentAvatarDisplay();
            const floatingDisplay = getFloatingButtonAvatarDisplay();

            console.log("界面内头像显示:", currentDisplay);
            console.log("悬浮按钮头像显示:", floatingDisplay);

            if (currentDisplay === '🐱' && floatingDisplay === '🐱') {
                console.log("✅ 所有头像显示函数都返回猫头像");
            } else {
                console.log("❌ 头像显示函数返回值不一致");
            }
        } catch (error) {
            console.log("❌ 头像显示函数错误:", error);
        }

        return {
            avatarData: avatarData,
            buttonExists: button.length > 0,
            buttonContent: button.html(),
            currentDisplay: getCurrentAvatarDisplay(),
            floatingDisplay: getFloatingButtonAvatarDisplay()
        };
    };

    // 强制显示悬浮按钮的函数
    window.forceShowButton = function() {
        console.log("🚀 强制显示悬浮按钮...");

        // 移除现有按钮
        $(`#${BUTTON_ID}`).remove();

        // 确保头像数据已加载
        loadAvatarData();

        // 强制创建按钮
        initializeFloatingButton();

        // 验证按钮是否创建成功并绑定拖拽
        setTimeout(() => {
            const button = $(`#${BUTTON_ID}`);
            if (button.length > 0) {
                // 确保拖拽功能已绑定
                makeButtonDraggable(button);
                console.log("✅ 悬浮按钮强制显示成功！拖拽功能已绑定");
                return true;
            } else {
                console.log("❌ 悬浮按钮强制显示失败，尝试紧急修复...");
                emergencyFixButton();
                return false;
            }
        }, 500);
    };

    // 测试拖拽和头像显示修复
    window.testDragAndAvatarFix = function() {
        console.log("🔧 测试拖拽和头像显示修复...");

        // 检查悬浮按钮
        const button = $(`#${BUTTON_ID}`);
        console.log("悬浮按钮存在:", button.length > 0);

        if (button.length > 0) {
            // 检查拖拽事件
            const events = $._data(button[0], 'events');
            const hasDragEvents = events && (events.mousedown || events.touchstart);
            console.log("拖拽事件绑定:", !!hasDragEvents);

            // 检查按钮样式
            console.log("按钮cursor样式:", button.css('cursor'));
        }

        // 检查界面内头像
        const avatarClickable = $(".pet-avatar-clickable");
        console.log("可点击头像数量:", avatarClickable.length);

        if (avatarClickable.length > 0) {
            const avatar = avatarClickable.find(".pet-avatar");
            console.log("头像元素数量:", avatar.length);

            if (avatar.length > 0) {
                console.log("头像样式:", avatar.attr('style'));
                console.log("头像内容:", avatar.html());

                // 检查头像是否填满容器
                const avatarWidth = avatar.css('width');
                const avatarHeight = avatar.css('height');
                console.log("头像尺寸:", avatarWidth, "x", avatarHeight);

                if (avatarWidth === '100%' && avatarHeight === '100%') {
                    console.log("✅ 头像正确填满容器");
                } else {
                    console.log("❌ 头像未填满容器");
                }
            }
        }

        return {
            buttonExists: button.length > 0,
            hasDragEvents: button.length > 0 && !!$._data(button[0], 'events'),
            avatarCount: avatarClickable.length,
            avatarFillsContainer: avatarClickable.find(".pet-avatar").css('width') === '100%'
        };
    };

    // 测试新的居中UI布局
    window.testCenteredUILayout = function() {
        console.log("🎨 测试新的居中UI布局...");

        // 打开界面
        showPopup();

        setTimeout(() => {
            // 检查头像部分
            const avatarSection = $(".pet-avatar-section");
            const avatarClickable = $(".pet-avatar-clickable");
            const petInfo = $(".pet-info-section");

            console.log("=== UI布局检查 ===");
            console.log("头像区域数量:", avatarSection.length);
            console.log("可点击头像数量:", avatarClickable.length);
            console.log("宠物信息区域数量:", petInfo.length);

            if (avatarSection.length > 0) {
                console.log("头像区域样式:", avatarSection.attr('style'));
                console.log("头像区域text-align:", avatarSection.css('text-align'));
            }

            if (avatarClickable.length > 0) {
                console.log("头像尺寸:", {
                    width: avatarClickable.css('width'),
                    height: avatarClickable.css('height'),
                    margin: avatarClickable.css('margin')
                });

                // 检查是否居中
                const containerWidth = avatarClickable.parent().width();
                const avatarWidth = avatarClickable.outerWidth();
                const leftOffset = avatarClickable.offset().left - avatarClickable.parent().offset().left;
                const expectedCenter = (containerWidth - avatarWidth) / 2;

                console.log("居中检查:", {
                    容器宽度: containerWidth,
                    头像宽度: avatarWidth,
                    左偏移: leftOffset,
                    期望居中: expectedCenter,
                    是否居中: Math.abs(leftOffset - expectedCenter) < 5
                });
            }

            if (petInfo.length > 0) {
                console.log("宠物信息样式:", petInfo.attr('style'));
                console.log("宠物信息text-align:", petInfo.css('text-align'));
            }

            // 检查是否有背景方框
            const hasBackground = avatarSection.css('background-color') !== 'rgba(0, 0, 0, 0)' &&
                                 avatarSection.css('background-color') !== 'transparent';

            console.log("=== 布局验证 ===");
            console.log("✅ 头像居中:", avatarSection.css('text-align') === 'center');
            console.log("✅ 信息居中:", petInfo.css('text-align') === 'center');
            console.log("✅ 无背景方框:", !hasBackground);

            return {
                avatarCentered: avatarSection.css('text-align') === 'center',
                infoCentered: petInfo.css('text-align') === 'center',
                noBackground: !hasBackground,
                avatarSize: {
                    width: avatarClickable.css('width'),
                    height: avatarClickable.css('height')
                }
            };
        }, 1000);
    };

    // 全面的诊断测试函数 - 确保全局可用
    window.fullDiagnostic = function() {
        console.log("🔍 开始全面诊断虚拟宠物系统...");
        console.log("=".repeat(50));

        // 1. 基础环境检查
        console.log("📋 1. 基础环境检查");
        console.log("jQuery版本:", $.fn.jquery || "未找到");
        console.log("页面URL:", window.location.href);
        console.log("页面标题:", document.title);
        console.log("用户代理:", navigator.userAgent);

        // 2. 系统变量检查
        console.log("\n📋 2. 系统变量检查");
        console.log("extensionName:", typeof extensionName !== 'undefined' ? extensionName : "未定义");
        console.log("BUTTON_ID:", typeof BUTTON_ID !== 'undefined' ? BUTTON_ID : "未定义");
        console.log("OVERLAY_ID:", typeof OVERLAY_ID !== 'undefined' ? OVERLAY_ID : "未定义");
        console.log("avatarData:", typeof avatarData !== 'undefined' ? avatarData : "未定义");

        // 3. DOM元素检查
        console.log("\n📋 3. DOM元素检查");
        const body = $("body");
        console.log("body元素存在:", body.length > 0);
        console.log("body子元素数量:", body.children().length);

        // 查找所有可能的按钮元素
        const allButtons = $('[id*="virtual-pet"], [class*="virtual-pet"]');
        console.log("包含virtual-pet的元素数量:", allButtons.length);
        allButtons.each(function(index) {
            console.log(`元素${index + 1}:`, {
                id: this.id,
                class: this.className,
                tagName: this.tagName,
                style: this.style.cssText,
                visible: $(this).is(':visible')
            });
        });

        // 4. 按钮状态检查
        console.log("\n📋 4. 按钮状态检查");
        const targetButton = $(`#${BUTTON_ID}`);
        console.log("目标按钮存在:", targetButton.length > 0);

        if (targetButton.length > 0) {
            const button = targetButton[0];
            console.log("按钮详细信息:", {
                id: button.id,
                innerHTML: button.innerHTML,
                outerHTML: button.outerHTML.substring(0, 200) + "...",
                computed: {
                    display: $(button).css('display'),
                    visibility: $(button).css('visibility'),
                    opacity: $(button).css('opacity'),
                    position: $(button).css('position'),
                    zIndex: $(button).css('z-index'),
                    top: $(button).css('top'),
                    left: $(button).css('left'),
                    width: $(button).css('width'),
                    height: $(button).css('height')
                },
                boundingRect: button.getBoundingClientRect(),
                isVisible: $(button).is(':visible'),
                isInViewport: function() {
                    const rect = button.getBoundingClientRect();
                    return rect.top >= 0 && rect.left >= 0 &&
                           rect.bottom <= window.innerHeight &&
                           rect.right <= window.innerWidth;
                }()
            });

            // 检查事件绑定
            const events = $._data(button, 'events');
            console.log("绑定的事件:", events ? Object.keys(events) : "无");
        }

        // 5. CSS冲突检查
        console.log("\n📋 5. CSS冲突检查");
        const allStyles = document.styleSheets;
        console.log("样式表数量:", allStyles.length);

        // 检查可能冲突的CSS规则
        const potentialConflicts = [];
        try {
            for (let i = 0; i < allStyles.length; i++) {
                const sheet = allStyles[i];
                if (sheet.cssRules) {
                    for (let j = 0; j < sheet.cssRules.length; j++) {
                        const rule = sheet.cssRules[j];
                        if (rule.selectorText &&
                            (rule.selectorText.includes('virtual-pet') ||
                             rule.selectorText.includes('fixed') ||
                             rule.selectorText.includes('z-index'))) {
                            potentialConflicts.push({
                                selector: rule.selectorText,
                                cssText: rule.cssText.substring(0, 100) + "..."
                            });
                        }
                    }
                }
            }
        } catch (e) {
            console.log("CSS检查错误:", e.message);
        }
        console.log("潜在CSS冲突:", potentialConflicts.slice(0, 5)); // 只显示前5个

        // 6. 函数可用性检查
        console.log("\n📋 6. 函数可用性检查");
        const functions = [
            'initializeFloatingButton',
            'forceShowButton',
            'emergencyFixButton',
            'makeButtonDraggable',
            'loadAvatarData',
            'getCurrentAvatarDisplay'
        ];

        functions.forEach(funcName => {
            console.log(`${funcName}:`, typeof window[funcName] === 'function' ? "✅可用" : "❌不可用");
        });

        // 7. 存储检查
        console.log("\n📋 7. 本地存储检查");
        try {
            const storedData = localStorage.getItem('virtual-pet-data');
            const storedAvatar = localStorage.getItem('virtual-pet-avatar');
            const storedEnabled = localStorage.getItem('virtual-pet-enabled');
            const storedPosition = localStorage.getItem('virtual-pet-button-position');

            console.log("存储的宠物数据:", storedData ? JSON.parse(storedData) : "无");
            console.log("存储的头像数据:", storedAvatar ? JSON.parse(storedAvatar) : "无");
            console.log("启用状态:", storedEnabled);
            console.log("按钮位置:", storedPosition ? JSON.parse(storedPosition) : "无");
        } catch (e) {
            console.log("存储检查错误:", e.message);
        }

        // 8. 错误日志检查
        console.log("\n📋 8. 控制台错误检查");
        console.log("请检查控制台是否有红色错误信息");

        // 9. 建议的修复步骤
        console.log("\n🔧 建议的修复步骤:");
        console.log("1. 运行: forceShowButton()");
        console.log("2. 如果失败，运行: emergencyFixButton()");
        console.log("3. 检查控制台错误信息");
        console.log("4. 清除浏览器缓存并刷新");
        console.log("5. 如果仍有问题，运行: window.location.reload()");

        console.log("=".repeat(50));
        console.log("🔍 诊断完成！");

        return {
            buttonExists: targetButton.length > 0,
            buttonVisible: targetButton.length > 0 ? targetButton.is(':visible') : false,
            jqueryLoaded: typeof $ !== 'undefined',
            functionsAvailable: functions.filter(f => typeof window[f] === 'function').length,
            totalFunctions: functions.length
        };
    };

    console.log("🐱 虚拟宠物系统加载完成！默认使用小猫头像");
    console.log("🔍 如果按钮不显示，请运行完整诊断: fullDiagnostic()");
    console.log("🐾 快速修复按钮，请运行: forceShowButton()");
    console.log("🚨 紧急修复，请运行: emergencyFixButton()");
    console.log("🎨 测试新的居中UI布局，请运行: testCenteredUILayout()");

    // 自动尝试显示按钮 - 移动端友好
    setTimeout(() => {
        const button = $(`#${BUTTON_ID}`);
        if (button.length === 0) {
            console.log("🚀 自动尝试显示悬浮按钮...");

            // 检测设备类型
            const isMobile = window.innerWidth <= 767 || /iPad|iPhone|iPod|Android/.test(navigator.userAgent);

            if (isMobile) {
                console.log("📱 检测到移动设备，使用移动端初始化");
                mobileForceInit();
            } else {
                console.log("💻 检测到桌面设备，使用标准初始化");
                if (typeof forceShowButton === 'function') {
                    forceShowButton();
                } else {
                    initializeFloatingButton();
                }
            }
        } else {
            console.log("✅ 按钮已存在，无需创建");
        }
    }, 2000);

    // 额外的移动端保险措施
    setTimeout(() => {
        const button = $(`#${BUTTON_ID}`);
        const isMobile = window.innerWidth <= 767 || /iPad|iPhone|iPod|Android/.test(navigator.userAgent);

        if (button.length === 0 && isMobile) {
            console.log("📱 移动端最后尝试创建按钮...");
            mobileForceInit();
        }
    }, 5000);
});

console.log("🐾 虚拟宠物系统脚本已加载完成");
