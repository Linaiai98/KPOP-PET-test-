// 虚拟宠物系统 - SillyTavern插件 v2.2 (Fixed)
console.log("🐾 虚拟宠物系统脚本开始加载...");

jQuery(async () => {
    console.log("🐾 jQuery ready, 开始初始化...");

    // -----------------------------------------------------------------
    // 1. 定义常量和状态变量
    // -----------------------------------------------------------------
    const extensionName = "virtual-pet-system";
    const STORAGE_KEY_PET_DATA = "virtual-pet-data";
    const STORAGE_KEY_BUTTON_POS = "virtual-pet-button-position";
    const BUTTON_ID = "virtual-pet-button";
    const OVERLAY_ID = "virtual-pet-popup-overlay";
    const POPUP_ID = "virtual-pet-popup";

    let isPopupOpen = false;
    let petData = {};
    let chatHistory = [];

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
                    <button id="goto-chat-btn" class="vpet-button vpet-button-secondary">💬 聊天</button>
                    <button id="goto-settings-btn" class="vpet-button vpet-button-secondary">⚙️ 设置</button>
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
                    $('#goto-chat-btn').on('click', () => this.switchView('chat'));
                    $('#goto-settings-btn').on('click', () => this.switchView('settings'));
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

    function loadPetData() {
        const defaultData = {
            name: "小宠物", type: "cat", level: 1, experience: 0,
            health: 80, happiness: 80, hunger: 80, energy: 80,
            created: Date.now(), lastUpdateTime: Date.now(),
        };
        const savedData = localStorage.getItem(STORAGE_KEY_PET_DATA);
        petData = savedData ? { ...defaultData, ...JSON.parse(savedData) } : defaultData;
    }

    function savePetData() {
        localStorage.setItem(STORAGE_KEY_PET_DATA, JSON.stringify(petData));
        if (isPopupOpen) {
            renderPetStatus();
        }
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
        const personalities = { 'default': '一只高冷的猫，但内心温柔。', 'cheerful': '一只活泼的小狗。' };
        return personalities[type] || personalities.default;
    }

    async function callAI(userInput) {
        const aiSettings = loadAISettings();
        if (!aiSettings.apiUrl || !aiSettings.apiKey || !aiSettings.apiModel) {
            toastr.warning('AI未配置，请在扩展设置中填写API信息。');
            return "（我的主人还没帮我连接到AI大脑...）";
        }

        const personality = getCurrentPersonality();
        if (chatHistory.length > 6) chatHistory = chatHistory.slice(-6);
        chatHistory.push({ role: 'user', content: userInput });

        const messages = [
            { role: 'system', content: `你是一只名叫'${petData.name}'的虚拟宠物，你的性格是：${personality}。请用这个身份和用户对话，回答要简短可爱。` },
            ...chatHistory
        ];

        try {
            const response = await fetch(aiSettings.apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${aiSettings.apiKey}` },
                body: JSON.stringify({ model: aiSettings.apiModel, messages: messages, max_tokens: 100 })
            });
            if (!response.ok) throw new Error(`API Error: ${response.status}`);
            const data = await response.json();
            const aiResponse = data.choices[0]?.message?.content.trim() || "我不知道该说什么了...";
            chatHistory.push({ role: 'assistant', content: aiResponse });
            return aiResponse;
        } catch (error) {
            console.error('AI API Error:', error);
            return "我好像有点累了，听不清你说什么...";
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
        
        const typingIndicator = $('<div class="vpet-chat-message vpet-message-pet typing-indicator"><span>.</span><span>.</span><span>.</span></div>');
        $('#vpet-chat-messages').append(typingIndicator);
        $('#vpet-chat-messages').scrollTop($('#vpet-chat-messages')[0].scrollHeight);

        const aiResponse = await callAI(userInput);
        typingIndicator.remove();
        addMessageToChatbox('pet', aiResponse);
    }

    function renderPetStatus() {
        const container = $('#vpet-status-container');
        if (!container.length) return;
        const EMOJIS = { cat: '🐱', dog: '🐶', dragon: '🐉', rabbit: '🐰', bird: '🐦' };
        container.html(`
            <div class="vpet-avatar"><span class="vpet-emoji">${EMOJIS[petData.type] || '🐾'}</span><div class="vpet-name">${petData.name}</div><div class="vpet-level">Lv. ${petData.level}</div></div>
            <div class="vpet-stats">${createStatBar('health', '❤️', petData.health)}${createStatBar('happiness', '😊', petData.happiness)}${createStatBar('hunger', '🍖', petData.hunger)}${createStatBar('energy', '⚡️', petData.energy)}</div>`);
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
        toastr.success('设置已保存!');
        UIManager.switchView('main');
    }

    function resetPet() {
        if (confirm('确定要重置你的宠物吗？此操作不可撤销！')) {
            localStorage.removeItem(STORAGE_KEY_PET_DATA);
            init(); // Re-initialize to get default data
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
            pos3 = e.clientX; pos4 = e.clientY;
            $(document).on('mouseup', closeDragElement).on('mousemove', elementDrag);
            $(this).addClass('dragging');
        });
        function elementDrag(e) {
            pos1 = pos3 - e.clientX; pos2 = pos4 - e.clientY;
            pos3 = e.clientX; pos4 = e.clientY;
            let newTop = Math.max(0, Math.min(element.offset().top - pos2, window.innerHeight - element.outerHeight()));
            let newLeft = Math.max(0, Math.min(element.offset().left - pos1, window.innerWidth - element.outerWidth()));
            element.css({ top: newTop + 'px', left: newLeft + 'px' });
        }
        function closeDragElement() {
            $(document).off('mouseup', closeDragElement).off('mousemove', elementDrag);
            element.removeClass('dragging');
            localStorage.setItem(STORAGE_KEY_BUTTON_POS, JSON.stringify({ top: element.css('top'), left: element.css('left') }));
        }
    }

    // -----------------------------------------------------------------
    // 4. 初始化
    // -----------------------------------------------------------------
    function init() {
        loadPetData();

        $('body').append(`<div id="${OVERLAY_ID}" class="vpet-overlay"><div id="${POPUP_ID}" class="vpet-popup-container"></div></div>`);
        $('body').append(`<div id="${BUTTON_ID}">🐾</div>`);
        
        const floatingButton = $(`#${BUTTON_ID}`);
        const savedPos = localStorage.getItem(STORAGE_KEY_BUTTON_POS);
        if (savedPos) floatingButton.css(JSON.parse(savedPos));
        else floatingButton.css({ top: '200px', left: '20px' });

        makeDraggable(floatingButton);
        floatingButton.on('click', (e) => {
            if ($(e.currentTarget).is('.dragging')) return;
            togglePopup(!isPopupOpen);
        });

        setInterval(() => {
            const diffSeconds = (Date.now() - petData.lastUpdateTime) / 1000;
            if (diffSeconds > 300) {
                petData.hunger = Math.max(0, petData.hunger - 2);
                petData.happiness = Math.max(0, petData.happiness - 1);
                petData.lastUpdateTime = Date.now();
                savePetData();
            }
        }, 60000);
    }

    init();
});
