// 虚拟宠物系统 - SillyTavern插件
console.log("🐾 虚拟宠物系统脚本开始加载...");

jQuery(async () => {
    console.log("🐾 jQuery ready, 开始初始化...");

    // ... (所有现有的常量和函数定义保持不变) ...
    const extensionName = "virtual-pet-system";
    // ...

    let chatHistory = []; // 用于保存聊天记录

    // 绑定UI事件
    function bindUIEvents() {
        // ... (所有现有的按钮绑定保持不变) ...

        // 新增：视图切换逻辑
        $('#goto-settings-btn').on('click', () => switchView('settings'));
        $('#goto-pet-detail-btn').on('click', () => switchView('detail'));
        $('#goto-chat-btn').on('click', () => switchView('chat'));
        $('.back-to-main-btn').on('click', () => switchView('main'));

        // 新增：聊天发送事件
        $('#chat-send-btn').on('click', handleSendMessage);
        $('#chat-user-input').on('keypress', function(e) {
            if (e.which === 13 && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
            }
        });
    }

    // 新增：视图切换函数
    function switchView(viewName) {
        $('.pet-view').hide(); // 隐藏所有视图
        const targetView = $(`#pet-${viewName}-view`);
        targetView.show();

        if (viewName === 'chat') {
            $('#chat-pet-name').text(petData.name);
            $('#chat-messages-container').empty(); // 清空旧消息
        }
    }

    // 新增：处理消息发送
    async function handleSendMessage() {
        const userInput = $('#chat-user-input').val().trim();
        if (!userInput) return;

        addMessageToChatbox('user', userInput);
        $('#chat-user-input').val('');

        const typingIndicator = addMessageToChatbox('pet', '<div class="typing-indicator"><span>.</span><span>.</span><span>.</span></div>', true);

        try {
            const aiSettings = loadAISettings();
            if (!aiSettings.apiUrl || !aiSettings.apiKey) {
                throw new Error("AI settings are not configured.");
            }

            const personality = getCurrentPersonality();
            const prompt = buildChatPrompt(personality, userInput);
            
            const response = await callCustomAPI(prompt, aiSettings);

            typingIndicator.remove();
            addMessageToChatbox('pet', response);
            chatHistory.push({ role: 'assistant', content: response });

        } catch (error) {
            console.error("Chat AI call failed:", error);
            typingIndicator.remove();
            addMessageToChatbox('pet', "我好像有点累了，没听清你说什么...");
        }
    }

    // 新增：添加到聊天框的辅助函数
    function addMessageToChatbox(sender, message, isTyping = false) {
        const messageClass = sender === 'user' ? 'user-message' : 'pet-message';
        const messageElement = $(`<div class="chat-message ${messageClass}">${message}</div>`);
        const container = $('#chat-messages-container');
        container.append(messageElement);
        container.scrollTop(container[0].scrollHeight);
        return messageElement;
    }
    
    // 新增：构建聊天Prompt
    function buildChatPrompt(personality, userInput) {
        if (chatHistory.length > 4) {
            chatHistory.shift(); // 保持历史记录简短
        }
        chatHistory.push({ role: 'user', content: userInput });

        const systemPrompt = { role: 'system', content: `你是一只名叫'${petData.name}'的虚拟宠物，你的性格是：${personality}。请用这个身份和用户对话，回答要简短可爱。` };
        
        return [systemPrompt, ...chatHistory];
    }

    // 修改 callCustomAPI 以接受消息数组
    async function callCustomAPI(messages, settings, timeout = 15000) {
        const controller = new AbortController();
        const signal = controller.signal;
        setTimeout(() => controller.abort(), timeout);

        const body = {
            model: settings.apiModel,
            messages: messages, // 直接使用消息数组
            max_tokens: 150
        };

        const response = await fetch(settings.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${settings.apiKey}`
            },
            body: JSON.stringify(body),
            signal
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API Error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content.trim() || "我不知道该说什么了...";
    }


    // ... (文件其余部分保持不变) ...
    // 在 `jQuery(async () => {` 的最后调用 bindUIEvents()
    bindUIEvents();
});