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

    // ... (所有原有的常量和状态变量保持不变) ...
    
    // 宠物数据结构
    let petData = {
        name: "小宠物",
        type: "cat",
        level: 1,
        experience: 0,
        health: 85,
        happiness: 80,
        hunger: 70,
        energy: 90,
        lastUpdateTime: Date.now(),
        // ... (其他宠物数据字段) ...
    };
    
    // -----------------------------------------------------------------
    // 2. 核心功能函数 (包括占位符)
    // -----------------------------------------------------------------

    function savePetData() { /* ... */ }
    function loadPetData() { /* ... */ }
    function updatePetStatus() { /* ... */ }
    function createPetButton() { /* ... */ }
    function createPopup() { /* ... */ }
    function togglePopup() { /* ... */ }
    // ... (所有其他核心功能函数保持不变) ...


    /**
     * 初始化设置面板
     */
    function initializeSettingsPanel() {
        // ... (所有原有的人设、AI配置等初始化逻辑保持不变) ...

        // 启用/禁用虚拟宠物系统的事件监听器
        $("#virtual-pet-enabled-toggle").on('change', function() {
            const enabled = $(this).is(':checked');
            localStorage.setItem(`${extensionName}-enabled`, enabled);
            if (enabled) {
                toastr.success("虚拟宠物系统已启用");
                if ($("#virtual-pet-button").length === 0) createPetButton();
            } else {
                toastr.info("虚拟宠物系统已禁用");
                $("#virtual-pet-button").hide();
            }
        });

        // 加载启用状态
        const enabled = localStorage.getItem(`${extensionName}-enabled`) !== 'false';
        $("#virtual-pet-enabled-toggle").prop('checked', enabled);

        // --- Firebase UI Injection ---
        injectFirebaseUI();

        console.log(`[${extensionName}] 设置面板初始化完成`);
    }

    /**
     * Injects the Firebase Sync UI into the settings panel and initializes auth logic.
     */
    function injectFirebaseUI() {
        if ($('#firebase-sync-section').length > 0) return;

        const firebaseHtml = `
            <div id="firebase-sync-section">
                <h4>☁️ 云同步设置</h4>
                <div id="firebase-sync-status">
                    <span id="firebase-sync-status-dot" class="status-dot offline"></span>
                    <span id="firebase-sync-status-text">未启用 - 同步未激活</span>
                </div>
                
                <div id="firebase-logged-in-view" style="display: none;">
                    <div class="firebase-sync-actions">
                        <button id="firebase-get-code-btn" class="firebase-btn btn-secondary">获取同步码</button>
                        <button id="firebase-logout-btn" class="firebase-btn btn-danger">停用同步</button>
                    </div>
                    <div id="sync-code-area" style="display: none;">
                        <label>您的同步码 (点击可复制):</label>
                        <input type="text" id="sync-code-display" class="firebase-input" readonly>
                    </div>
                </div>

                <div id="firebase-logged-out-view">
                    <div class="firebase-sync-actions">
                        <button id="firebase-login-btn" class="firebase-btn btn-primary">启用云同步</button>
                    </div>
                    <div id="firebase-link-section">
                        <label>已有同步码？</label>
                        <input type="text" id="firebase-link-code-input" class="firebase-input" placeholder="在此处粘贴同步码">
                        <button id="firebase-link-btn" class="firebase-btn btn-secondary">链接设备</button>
                    </div>
                </div>
                 <small class="notes">
                    启用同步可备份您的宠物数据。您也可以使用同步码在不同设备间迁移数据。
                </small>
            </div>
        `;

        $('#virtual-pet-settings .inline-drawer-content').append(firebaseHtml);

        const scriptPath = `${extensionFolderPath}/firebase-auth.js`;
        import(scriptPath)
            .then((authModule) => {
                authModule.initializeAuth();
                console.log(`[${extensionName}] Firebase auth module loaded and initialized.`);
            })
            .catch(err => {
                console.error(`[${extensionName}] Failed to load Firebase auth module:`, err);
            });
    }

    // -----------------------------------------------------------------
    // 5. 初始化
    // -----------------------------------------------------------------
    function init() {
        console.log(`[${extensionName}] Initializing...`);
        
        // 动态加载CSS
        $('head').append(`<link rel="stylesheet" type="text/css" href="${extensionFolderPath}/style.css">`);

        loadPetData();
        
        const enabled = localStorage.getItem(STORAGE_KEY_ENABLED) !== 'false';
        if (enabled) {
            createPetButton();
        }

        // 等待SillyTavern的UI完全加载后再初始化设置面板
        const settingsInterval = setInterval(() => {
            if ($('#extensions_settings').length > 0 && $('#virtual-pet-settings').length > 0) {
                clearInterval(settingsInterval);
                initializeSettingsPanel();
            }
        }, 100);

        // 启动宠物状态的周期性更新
        setInterval(updatePetStatus, 60000); // 每分钟更新一次
        
        console.log("🐾 虚拟宠物系统初始化完成!");
    }

    init();
});