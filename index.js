// 虚拟宠物系统 - SillyTavern插件 v2.1 (Refactored & Unified)
console.log("🐾 虚拟宠物系统脚本开始加载...");

jQuery(async () => {
    console.log("🐾 jQuery ready, 开始初始化...");

    // -----------------------------------------------------------------
    // 1. 定义常量和状态变量
    // -----------------------------------------------------------------
    const extensionName = "virtual-pet-system";
    const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;
    
    // 存储键
    const STORAGE_KEY_BUTTON_POS = "virtual-pet-button-position";
    const STORAGE_KEY_ENABLED = "virtual-pet-enabled";
    const STORAGE_KEY_PET_DATA = "virtual-pet-data";
    const STORAGE_KEY_CUSTOM_AVATAR = "virtual-pet-custom-avatar";

    // DOM IDs
    const BUTTON_ID = "virtual-pet-button";
    const OVERLAY_ID = "virtual-pet-popup-overlay";
    const POPUP_ID = "virtual-pet-popup";

    // 弹窗状态管理
    let isPopupOpen = false;
    let petData = {};

    // -----------------------------------------------------------------
    // 2. 视图管理器 (View Manager)
    // -----------------------------------------------------------------
    const viewTemplates = {
        main: `
            <div class="vpet-header">
                <div class="vpet-title">🐾 虚拟宠物</div>
                <button id="vpet-close-btn" class="vpet-close-button">&times;</button>
            </div>
            <div class="vpet-body">
                <div class="vpet-section" id="vpet-status-container"></div>
                <div class="vpet-section">
                    <div class="vpet-actions">
                        <button id="feed-pet-btn" class="vpet-button vpet-button-success">🍖 喂食</button>
                        <button id="play-pet-btn" class="vpet-button vpet-button-warning">🎾 玩耍</button>
                    </div>
                </div>
                <div class="vpet-section vpet-nav-buttons">
                    <button id="goto-pet-detail-btn" class="vpet-button vpet-button-secondary">📊 详细</button>
                    <button id="goto-chat-btn" class="vpet-button vpet-button-secondary">💬 聊天</button>
                    <button id="goto-settings-btn" class="vpet-button vpet-button-secondary">⚙️ 设置</button>
                </div>
            </div>
        `,
        detail: `
            <div class="vpet-header">
                <div class="vpet-title">📊 宠物详情</div>
                <button class="vpet-button vpet-button-secondary back-to-main-btn">&larr; 返回</button>
            </div>
            <div class="vpet-body">
                <div class="vpet-section">
                    <div class="vpet-info-grid">
                        <div class="vpet-info-item"><label>名称:</label><span id="detail-pet-name"></span></div>
                        <div class="vpet-info-item"><label>类型:</label><span id="detail-pet-type"></span></div>
                        <div class="vpet-info-item"><label>等级:</label><span id="detail-pet-level"></span></div>
                        <div class="vpet-info-item"><label>经验:</label><span id="detail-pet-exp"></span></div>
                        <div class="vpet-info-item"><label>创建时间:</label><span id="detail-pet-created"></span></div>
                    </div>
                </div>
            </div>
        `,
        settings: `
            <div class="vpet-header">
                <div class="vpet-title">⚙️ 设置</div>
                <button class="vpet-button vpet-button-secondary back-to-main-btn">&larr; 返回</button>
            </div>
            <div class="vpet-body">
                <div class="vpet-section vpet-settings-container">
                    <div class="vpet-setting-item">
                        <label for="pet-name-input">宠物名称:</label>
                        <input type="text" id="pet-name-input" placeholder="输入宠物名称" maxlength="20">
                    </div>
                    <div class="vpet-setting-item">
                        <label for="pet-type-select">宠物类型:</label>
                        <select id="pet-type-select">
                            <option value="cat">🐱 猫咪</option>
                            <option value="dog">🐶 小狗</option>
                            <option value="dragon">🐉 龙</option>
                            <option value="rabbit">🐰 兔子</option>
                            <option value="bird">🐦 小鸟</option>
                        </select>
                    </div>
                    <div class="vpet-actions">
                        <button id="save-settings-btn" class="vpet-button vpet-button-success">💾 保存</button>
                        <button id="reset-pet-btn" class="vpet-button vpet-button-danger">🔄 重置</button>
                    </div>
                </div>
            </div>
        `,
        chat: `
            <div class="vpet-header">
                <div class="vpet-title">与 ${petData.name} 聊天</div>
                <button class="vpet-button vpet-button-secondary back-to-main-btn">&larr; 返回</button>
            </div>
            <div class="vpet-body vpet-chat-body">
                <div id="vpet-chat-messages" class="vpet-chat-messages">
                    <div class="vpet-chat-message vpet-message-pet">你好！想和我说什么呀？</div>
                </div>
                <div class="vpet-chat-input-container">
                    <input type="text" id="vpet-chat-input" placeholder="输入消息...">
                    <button id="vpet-chat-send-btn" class="vpet-button">发送</button>
                </div>
            </div>
        `
    };

    const UIManager = {
        switchView(viewName) {
            const popup = $(`#${POPUP_ID}`);
            if (popup.length && viewTemplates[viewName]) {
                popup.html(viewTemplates[viewName]);
                this.bindViewEvents(viewName);
            }
        },
        bindViewEvents(viewName) {
            $(`#${POPUP_ID} .back-to-main-btn`).on('click', () => this.switchView('main'));
            $(`#${POPUP_ID} #vpet-close-btn`).on('click', () => togglePopup(false));

            switch (viewName) {
                case 'main':
                    renderPetStatus();
                    $('#feed-pet-btn').on('click', feedPet);
                    $('#play-pet-btn').on('click', playWithPet);
                    $('#goto-pet-detail-btn').on('click', () => this.switchView('detail'));
                    $('#goto-chat-btn').on('click', () => this.switchView('chat'));
                    $('#goto-settings-btn').on('click', () => this.switchView('settings'));
                    break;
                case 'detail':
                    $('#detail-pet-name').text(petData.name);
                    $('#detail-pet-type').text(petData.type);
                    $('#detail-pet-level').text(petData.level);
                    $('#detail-pet-exp').text(`${petData.experience} / ${petData.level * 100}`);
                    $('#detail-pet-created').text(new Date(petData.created).toLocaleString());
                    break;
                case 'settings':
                    $('#pet-name-input').val(petData.name);
                    $('#pet-type-select').val(petData.type);
                    $('#save-settings-btn').on('click', saveSettings);
                    $('#reset-pet-btn').on('click', resetPet);
                    break;
                case 'chat':
                    $('#vpet-chat-send-btn').on('click', handleSendMessage);
                    $('#vpet-chat-input').on('keypress', (e) => {
                        if (e.which === 13) handleSendMessage();
                    });
                    break;
            }
        }
    };

    // -----------------------------------------------------------------
    // 3. 核心功能函数
    // -----------------------------------------------------------------
    
    let chatHistory = [];

    async function callAI(userInput) {
        // This is a placeholder for the actual AI call.
        // It uses the existing SillyTavern API if available.
        if (typeof SillyTavern.send === 'function') {
            try {
                const personality = localStorage.getItem('virtual-pet-custom-personality') || "你是一只可爱的虚拟宠物。";
                const prompt = `${personality}\n\n用户: ${userInput}\n${petData.name}:`;
                
                // We can't directly get a return value from SillyTavern's send,
                // so for this example, we'll simulate a response.
                // In a real implementation, this would need to listen for the response.
                console.log("Sending prompt to AI:", prompt);
                
                // Simulate AI response
                await new Promise(resolve => setTimeout(resolve, 1000));
                return `${petData.name}听到了你说的话！`;

            } catch (error) {
                console.error("AI call failed:", error);
                return "我好像有点累了，听不清你说什么...";
            }
        } else {
            // Fallback for when not in SillyTavern or API is not available
            await new Promise(resolve => setTimeout(resolve, 500));
            return "喵~ (AI功能未连接)";
        }
    }

    function addMessageToChatbox(sender, message) {
        const messageClass = sender === 'user' ? 'vpet-message-user' : 'vpet-message-pet';
        const chatbox = $('#vpet-chat-messages');
        chatbox.append(`<div class="vpet-chat-message ${messageClass}">${message}</div>`);
        chatbox.scrollTop(chatbox[0].scrollHeight);
    }

    async function handleSendMessage() {
        const input = $('#vpet-chat-input');
        const userInput = input.val().trim();
        if (!userInput) return;

        addMessageToChatbox('user', userInput);
        input.val('');
        
        // Add typing indicator
        const typingIndicator = $('<div class="vpet-chat-message vpet-message-pet typing-indicator"><span>.</span><span>.</span><span>.</span></div>');
        $('#vpet-chat-messages').append(typingIndicator);
        $('#vpet-chat-messages').scrollTop($('#vpet-chat-messages')[0].scrollHeight);

        const aiResponse = await callAI(userInput);
        
        // Remove typing indicator
        typingIndicator.remove();

        addMessageToChatbox('pet', aiResponse);
    }

    function loadAISettings() {
        const settings = localStorage.getItem('virtual-pet-ai-settings');
        return settings ? JSON.parse(settings) : {};
    }

    function getCurrentPersonality() {
        const type = localStorage.getItem('virtual-pet-personality-type') || 'default';
        if (type === 'custom') {
            return localStorage.getItem('virtual-pet-custom-personality') || '一只可爱的虚拟宠物';
        }
        // Simplified PRESET_PERSONALITIES for this example
        const personalities = { 'default': '一只高冷的猫' };
        return personalities[type];
    }

    function savePetData() {
        localStorage.setItem(STORAGE_KEY_PET_DATA, JSON.stringify(petData));
        renderPetStatus(); // Always re-render on data change
    }

    function renderPetStatus() {
        if (!isPopupOpen) return;
        const container = $('#vpet-status-container');
        if (!container.length) return;

        const EMOJIS = { cat: '🐱', dog: '🐶', dragon: '🐉', rabbit: '🐰', bird: '🐦' };
        container.html(`
            <div class="vpet-avatar">
                <span class="vpet-emoji">${EMOJIS[petData.type] || '🐾'}</span>
                <div class="vpet-name">${petData.name}</div>
                <div class="vpet-level">Lv. ${petData.level}</div>
            </div>
            <div class="vpet-stats">
                ${createStatBar('health', '❤️', petData.health)}
                ${createStatBar('happiness', '😊', petData.happiness)}
                ${createStatBar('hunger', '🍖', petData.hunger)}
                ${createStatBar('energy', '⚡️', petData.energy)}
            </div>
        `);
    }

    function createStatBar(id, label, value) {
        return `<div class="vpet-stat-bar"><label>${label}</label><div class="vpet-progress-bar"><div class="vpet-progress-fill" style="width: ${value}%;"></div></div><span>${value}%</span></div>`;
    }

    function feedPet() {
        petData.hunger = Math.min(100, petData.hunger + 15);
        petData.happiness = Math.min(100, petData.happiness + 5);
        savePetData();
        toastr.success(`${petData.name} 吃得很开心！`);
    }

    function playWithPet() {
        petData.happiness = Math.min(100, petData.happiness + 15);
        petData.energy = Math.max(0, petData.energy - 10);
        savePetData();
        toastr.info(`你和 ${petData.name} 一起玩耍。`);
    }
    
    function saveSettings() {
        petData.name = $('#pet-name-input').val();
        petData.type = $('#pet-type-select').val();
        savePetData();
        toastr.success('设置已���存!');
        UIManager.switchView('main');
    }

    function resetPet() {
        if (confirm('确定要重置你的宠物吗？此操作不可撤销！')) {
            localStorage.removeItem(STORAGE_KEY_PET_DATA);
            loadPetData();
            savePetData();
            toastr.success('宠物已重置!');
            UIManager.switchView('main');
        }
    }

    function togglePopup(show) {
        const overlay = $(`#${OVERLAY_ID}`);
        isPopupOpen = show;
        if (show) {
            overlay.fadeIn(200);
            UIManager.switchView('main');
        } else {
            overlay.fadeOut(200);
        }
    }

    function makeDraggable(element) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        element.on('mousedown', function(e) {
            e.preventDefault();
            pos3 = e.clientX;
            pos4 = e.clientY;
            $(document).on('mouseup', closeDragElement);
            $(document).on('mousemove', elementDrag);
            $(this).addClass('dragging');
        });

        function elementDrag(e) {
            e.preventDefault();
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            let newTop = Math.max(0, Math.min(element.offset().top - pos2, window.innerHeight - element.outerHeight()));
            let newLeft = Math.max(0, Math.min(element.offset().left - pos1, window.innerWidth - element.outerWidth()));
            element.css({ top: newTop + 'px', left: newLeft + 'px' });
        }

        function closeDragElement() {
            $(document).off('mouseup', closeDragElement);
            $(document).off('mousemove', elementDrag);
            element.removeClass('dragging');
            localStorage.setItem(STORAGE_KEY_BUTTON_POS, JSON.stringify({ top: element.css('top'), left: element.css('left') }));
        }
    }

    // -----------------------------------------------------------------
    // 4. 初始化
    // -----------------------------------------------------------------
    function init() {
        // 加载数据
        loadPetData();

        // 注入HTML
        $('body').append(`<div id="${OVERLAY_ID}" class="vpet-overlay"><div id="${POPUP_ID}" class="vpet-popup-container"></div></div>`);
        $('body').append(`<div id="${BUTTON_ID}">🐾</div>`);
        
        const floatingButton = $(`#${BUTTON_ID}`);
        
        // 恢复按钮位置
        const savedPos = localStorage.getItem(STORAGE_KEY_BUTTON_POS);
        if (savedPos) {
            floatingButton.css(JSON.parse(savedPos));
        } else {
            floatingButton.css({ top: '200px', left: '20px' });
        }

        // 绑定事件
        makeDraggable(floatingButton);
        floatingButton.on('click', (e) => {
            // 防止拖动结束时触发点击
            if ($(e.currentTarget).is('.dragging')) return;
            togglePopup(!isPopupOpen);
        });

        // 启动状态衰减循环
        setInterval(() => {
            const diffSeconds = (Date.now() - petData.lastUpdateTime) / 1000;
            if (diffSeconds > 300) { // 5分钟
                petData.hunger = Math.max(0, petData.hunger - 2);
                petData.happiness = Math.max(0, petData.happiness - 1);
                petData.lastUpdateTime = Date.now();
                savePetData();
            }
        }, 60000); // 每分钟检查一次
    }

    init();
});