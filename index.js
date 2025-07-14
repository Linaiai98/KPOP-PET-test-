// 虚拟宠物系统 - SillyTavern插件 v2.3 (Internal Refactor)
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

    // -----------------------------------------------------------------
    // 2. 宠物数据管理器 (PetManager)
    // -----------------------------------------------------------------
    const PetManager = {
        data: {},
        
        loadData() {
            const defaultData = {
                name: "小宠物", type: "cat", level: 1, experience: 0,
                health: 80, happiness: 80, hunger: 80, energy: 80,
                created: Date.now(), lastUpdateTime: Date.now(),
            };
            const savedData = localStorage.getItem(STORAGE_KEY_PET_DATA);
            this.data = savedData ? { ...defaultData, ...JSON.parse(savedData) } : defaultData;
            console.log("Pet data loaded:", this.data);
        },

        saveData() {
            localStorage.setItem(STORAGE_KEY_PET_DATA, JSON.stringify(this.data));
            UIManager.renderStatus(); // UI更新与数据保存解耦
        },

        feed() {
            this.data.hunger = Math.min(100, this.data.hunger + 15);
            this.data.happiness = Math.min(100, this.data.happiness + 5);
            this.saveData();
            toastr.success(`${this.data.name} 吃得很开心！`);
        },

        play() {
            this.data.happiness = Math.min(100, this.data.happiness + 15);
            this.data.energy = Math.max(0, this.data.energy - 10);
            this.saveData();
            toastr.info(`你和 ${this.data.name} 一起玩耍。`);
        },

        reset() {
            if (confirm('确定要重置你的宠物吗？此操作不可撤销！')) {
                localStorage.removeItem(STORAGE_KEY_PET_DATA);
                this.loadData(); // Re-load default data
                this.saveData();
                toastr.success('宠物已��置!');
                UIManager.switchView('main');
            }
        },

        updateStatusDecay() {
            const diffSeconds = (Date.now() - this.data.lastUpdateTime) / 1000;
            if (diffSeconds > 300) { // 5分钟
                this.data.hunger = Math.max(0, this.data.hunger - 2);
                this.data.happiness = Math.max(0, this.data.happiness - 1);
                this.data.lastUpdateTime = Date.now();
                this.saveData();
            }
        }
    };

    // -----------------------------------------------------------------
    // 3. UI管理器 (UIManager)
    // -----------------------------------------------------------------
    const UIManager = {
        isPopupOpen: false,
        
        templates: {
            main: `...`, // Templates will be defined below
            settings: `...`,
            chat: `...`
        },

        initialize() {
            this.populateTemplates();
            $('body').append(`<div id="${OVERLAY_ID}" class="virtual-pet-popup-overlay"><div id="${POPUP_ID}" class="pet-popup-container"></div></div>`);
            $('body').append(`<div id="${BUTTON_ID}">🐾</div>`);
            this.bindGlobalEvents();
        },

        populateTemplates() {
            this.templates.main = `
                <div class="pet-popup-header"><div class="pet-popup-title">🐾 虚拟宠物</div><button id="vpet-close-btn" class="pet-popup-close-button">&times;</button></div>
                <div class="pet-popup-body">
                    <div class="pet-section" id="vpet-status-container"></div>
                    <div class="pet-section"><div class="pet-actions"><button id="feed-pet-btn" class="pet-button success">🍖 喂食</button><button id="play-pet-btn" class="pet-button warning">🎾 玩耍</button></div></div>
                    <div class="pet-section"><div class="pet-nav-buttons"><button id="goto-chat-btn" class="pet-button">💬 聊天</button><button id="goto-settings-btn" class="pet-button">⚙️ 设置</button></div></div>
                </div>`;
            this.templates.settings = `
                <div class="pet-popup-header"><div class="pet-popup-title">⚙️ 设置</div><button class="pet-button back-to-main-btn">&larr; 返回</button></div>
                <div class="pet-popup-body">
                    <div class="settings-container pet-section">
                        <div class="setting-item"><label for="pet-name-input">宠物名称:</label><input type="text" id="pet-name-input" maxlength="20"></div>
                        <div class="setting-item"><label for="pet-type-select">宠物类型:</label><select id="pet-type-select"><option value="cat">🐱 猫咪</option><option value="dog">🐶 小狗</option><option value="dragon">🐉 龙</option></select></div>
                        <div class="pet-actions"><button id="save-settings-btn" class="pet-button success">💾 保存</button><button id="reset-pet-btn" class="pet-button danger">🔄 重置</button></div>
                    </div>
                </div>`;
            this.templates.chat = `
                <div class="pet-popup-header"><div class="pet-popup-title">与 ${PetManager.data.name} 聊天</div><button class="pet-button back-to-main-btn">&larr; 返回</button></div>
                <div class="pet-popup-body" style="display:flex; flex-direction:column; height:450px;">
                    <div id="vpet-chat-messages" class="pet-section" style="flex-grow:1; overflow-y:auto;"></div>
                    <div class="pet-actions" style="margin-top:0;"><input type="text" id="vpet-chat-input" placeholder="输入消息..." style="width:100%;"><button id="vpet-chat-send-btn" class="pet-button">发送</button></div>
                </div>`;
        },

        bindGlobalEvents() {
            const floatingButton = $(`#${BUTTON_ID}`);
            const savedPos = localStorage.getItem(STORAGE_KEY_BUTTON_POS);
            if (savedPos) floatingButton.css(JSON.parse(savedPos));
            else floatingButton.css({ top: '200px', left: '20px' });

            this.makeDraggable(floatingButton);
            floatingButton.on('click', (e) => {
                if (floatingButton.is('.dragging')) return;
                this.togglePopup(!this.isPopupOpen);
            });
        },

        switchView(viewName) {
            const popup = $(`#${POPUP_ID}`);
            if (popup.length && this.templates[viewName]) {
                popup.html(this.templates[viewName]);
                this.bindViewEvents(viewName);
            }
        },

        bindViewEvents(viewName) {
            $(`#${POPUP_ID} .back-to-main-btn`).on('click', () => this.switchView('main'));
            $(`#${POPUP_ID} #vpet-close-btn`).on('click', () => this.togglePopup(false));

            switch (viewName) {
                case 'main':
                    this.renderStatus();
                    $('#feed-pet-btn').on('click', () => PetManager.feed());
                    $('#play-pet-btn').on('click', () => PetManager.play());
                    $('#goto-chat-btn').on('click', () => this.switchView('chat'));
                    $('#goto-settings-btn').on('click', () => this.switchView('settings'));
                    break;
                case 'settings':
                    $('#pet-name-input').val(PetManager.data.name);
                    $('#pet-type-select').val(PetManager.data.type);
                    $('#save-settings-btn').on('click', () => {
                        PetManager.data.name = $('#pet-name-input').val();
                        PetManager.data.type = $('#pet-type-select').val();
                        PetManager.saveData();
                        toastr.success('设置已保存!');
                        this.switchView('main');
                    });
                    $('#reset-pet-btn').on('click', () => PetManager.reset());
                    break;
                case 'chat':
                    $('#vpet-chat-send-btn').on('click', () => AIManager.handleSendMessage());
                    $('#vpet-chat-input').on('keypress', (e) => { if (e.which === 13) AIManager.handleSendMessage(); });
                    break;
            }
        },

        renderStatus() {
            if (!this.isPopupOpen) return;
            const container = $('#vpet-status-container');
            if (!container.length) return;

            const EMOJIS = { cat: '🐱', dog: '🐶', dragon: '🐉' };
            const pet = PetManager.data;
            container.html(`
                <div class="pet-avatar"><span class="pet-emoji">${EMOJIS[pet.type] || '🐾'}</span><div class="pet-name">${pet.name}</div><div class="pet-level">Lv. ${pet.level}</div></div>
                <div class="pet-stats">
                    ${this.createStatBar('health', '❤️', pet.health)}
                    ${this.createStatBar('happiness', '😊', pet.happiness)}
                    ${this.createStatBar('hunger', '🍖', pet.hunger)}
                    ${this.createStatBar('energy', '⚡️', pet.energy)}
                </div>`);
        },

        createStatBar(id, label, value) {
            return `<div class="stat-bar"><label>${label}</label><div class="progress-bar"><div class="progress-fill ${id}" style="width: ${value}%;"></div></div><span>${value}%</span></div>`;
        },

        togglePopup(show) {
            this.isPopupOpen = show;
            const overlay = $(`#${OVERLAY_ID}`);
            if (show) {
                overlay.fadeIn(200);
                this.switchView('main');
            } else {
                overlay.fadeOut(200);
            }
        },

        makeDraggable(element) {
            // Dragging logic remains the same
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
    };

    // -----------------------------------------------------------------
    // 4. AI管理器 (AIManager)
    // -----------------------------------------------------------------
    const AIManager = {
        chatHistory: [],

        async handleSendMessage() {
            const input = $('#vpet-chat-input');
            const userInput = input.val().trim();
            if (!userInput) return;

            this.addMessageToChatbox('user', userInput);
            input.val('');
            
            const typingIndicator = $('<div class="pet-chat-message pet-message-pet typing-indicator"><span>.</span><span>.</span><span>.</span></div>');
            $('#vpet-chat-messages').append(typingIndicator);
            $('#vpet-chat-messages').scrollTop($('#vpet-chat-messages')[0].scrollHeight);

            try {
                const aiResponse = await this.callAI(userInput);
                this.addMessageToChatbox('pet', aiResponse);
            } catch (error) {
                this.addMessageToChatbox('pet', "我好像有点累了，听不清你说什么...");
            } finally {
                typingIndicator.remove();
            }
        },

        addMessageToChatbox(sender, message) {
            const messageClass = sender === 'user' ? 'pet-message-user' : 'pet-message-pet';
            const chatbox = $('#vpet-chat-messages');
            chatbox.append(`<div class="pet-chat-message ${messageClass}">${message}</div>`);
            chatbox.scrollTop(chatbox[0].scrollHeight);
        },

        async callAI(userInput) {
            // This is a placeholder for the full AI call logic from the original file.
            // For this refactoring step, we keep it simple.
            console.log(`Calling AI with: ${userInput}`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate network delay
            return `你说的是“${userInput}”吗？`;
        }
    };

    // -----------------------------------------------------------------
    // 5. 初始化
    // -----------------------------------------------------------------
    function init() {
        PetManager.loadData();
        UIManager.initialize();
        
        // Start status decay loop
        setInterval(() => PetManager.updateStatusDecay(), 60000);

        console.log("🐾 虚拟宠物系统已成功初始化！");
    }

    init();
});