// 虚拟宠物系统 - v2.1 (Refactored & Fixed)
// All modules are combined into a single file to ensure compatibility.

jQuery(async () => {
    console.log("🐾 虚拟宠物系统脚本开始加载 (v2.1 Fixed)...");

    // -----------------------------------------------------------------
    // Module: config.js
    // -----------------------------------------------------------------
    const extensionName = "virtual-pet-system";
    const extensionPath = `extensions/third-party/${extensionName}`;

    const STORAGE_KEYS = {
        BUTTON_POS: "virtual-pet-button-position",
        ENABLED: "virtual-pet-enabled",
        PET_DATA: "virtual-pet-data",
        CUSTOM_AVATAR: "virtual-pet-custom-avatar",
        AI_SETTINGS: "virtual-pet-ai-settings",
        PERSONALITY_TYPE: "virtual-pet-personality-type",
        CUSTOM_PERSONALITY: "virtual-pet-custom-personality",
    };

    const DOM_IDS = {
        button: "virtual-pet-button",
        overlay: "virtual-pet-popup-overlay",
        popup: "virtual-pet-popup",
        closeButton: "virtual-pet-popup-close-button",
    };

    const PRESET_PERSONALITIES = {
        'default': "一只高冷但内心温柔的猫...",
        'cheerful': "一只活泼可爱的小狗...",
        // ... other personalities
    };

    // -----------------------------------------------------------------
    // Module: pet.js
    // -----------------------------------------------------------------
    let petData = {};

    function loadPetData() {
        const defaultData = {
            name: "小宠物", type: "cat", level: 1, experience: 0, health: 80,
            happiness: 80, hunger: 80, energy: 80, created: Date.now(), lastUpdateTime: Date.now(),
        };
        const savedData = localStorage.getItem(STORAGE_KEYS.PET_DATA);
        petData = savedData ? { ...defaultData, ...JSON.parse(savedData) } : defaultData;
        petData.personality = getCurrentPersonality();
        return petData;
    }

    function savePetData() {
        localStorage.setItem(STORAGE_KEYS.PET_DATA, JSON.stringify(petData));
    }

    function updatePetData(updates) {
        petData = { ...petData, ...updates };
        savePetData();
        document.dispatchEvent(new CustomEvent('petDataUpdated', { detail: petData }));
    }
    
    function resetPetData() {
        const created = Date.now();
        petData = {
            ...petData, name: "小宠物", level: 1, experience: 0, health: 100,
            happiness: 100, hunger: 100, energy: 100, created: created, lastUpdateTime: created,
        };
        savePetData();
        document.dispatchEvent(new CustomEvent('petDataUpdated', { detail: petData }));
    }

    function getCurrentPersonality() {
        const selectedType = localStorage.getItem(STORAGE_KEYS.PERSONALITY_TYPE) || 'default';
        if (selectedType === 'custom') {
            return localStorage.getItem(STORAGE_KEYS.CUSTOM_PERSONALITY) || "一个可爱的虚拟宠物。";
        }
        return PRESET_PERSONALITIES[selectedType] || PRESET_PERSONALITIES.default;
    }


    // -----------------------------------------------------------------
    // Module: settings.js
    // -----------------------------------------------------------------
    let settings = {};
    
    function loadSettings() {
        const pet = { name: petData.name, type: petData.type };
        const ai = localStorage.getItem(STORAGE_KEYS.AI_SETTINGS) ? JSON.parse(localStorage.getItem(STORAGE_KEYS.AI_SETTINGS)) : {};
        settings = { pet, ai };
        return settings;
    }

    function savePetSettings(petConfig) {
        settings.pet = { ...settings.pet, ...petConfig };
        updatePetData({ name: settings.pet.name, type: settings.pet.type });
    }


    // -----------------------------------------------------------------
    // Module: ui.js
    // -----------------------------------------------------------------
    let popupContainer = null;

    async function loadTemplate(viewName) {
        // CRITICAL FIX: Use the correct full path for fetching templates.
        const response = await fetch(`${extensionPath}/templates/${viewName}.html`);
        if (!response.ok) throw new Error(`Failed to load template: ${viewName}`);
        return response.text();
    }

    async function switchView(viewName) {
        if (!popupContainer) popupContainer = document.getElementById(DOM_IDS.popup);
        try {
            popupContainer.innerHTML = await loadTemplate(viewName);
            document.dispatchEvent(new CustomEvent('viewChanged', { detail: { viewName } }));
        } catch (error) {
            console.error(error);
            popupContainer.innerHTML = `<p>Error loading view: ${viewName}. ${error.message}</p>`;
        }
    }

    function renderPetStatus() {
        const container = document.getElementById('pet-status-container');
        if (!container) return;
        const EMOJIS = { cat: '🐱', dog: '🐶', dragon: '🐉', rabbit: '🐰', bird: '🐦' };
        container.innerHTML = `
            <div class="pet-avatar"><span class="pet-emoji">${EMOJIS[petData.type] || '🐾'}</span>
                <div class="pet-name">${petData.name}</div><div class="pet-level">Lv. ${petData.level}</div></div>
            <div class="pet-stats">
                ${createStatBar('health', '❤️', petData.health)}
                ${createStatBar('happiness', '😊', petData.happiness)}
                ${createStatBar('hunger', '🍖', petData.hunger)}
                ${createStatBar('energy', '⚡️', petData.energy)}
            </div>`;
    }

    function createStatBar(id, label, value) {
        return `<div class="stat-bar"><label>${label}</label><div class="progress-bar"><div class="progress-fill ${id}" style="width: ${value}%;"></div></div><span>${value}%</span></div>`;
    }

    function togglePopup(show) {
        const overlay = document.getElementById(DOM_IDS.overlay);
        if (overlay) {
            overlay.style.display = show ? 'flex' : 'none';
            if (show) switchView('main-view');
        }
    }

    function makeDraggable(element) {
        let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        element.onmousedown = e => {
            e.preventDefault();
            pos3 = e.clientX; pos4 = e.clientY;
            document.onmouseup = () => {
                document.onmouseup = null; document.onmousemove = null;
                element.classList.remove('dragging');
                localStorage.setItem(STORAGE_KEYS.BUTTON_POS, JSON.stringify({top: element.style.top, left: element.style.left}));
            };
            document.onmousemove = ev => {
                ev.preventDefault();
                pos1 = pos3 - ev.clientX; pos2 = pos4 - ev.clientY;
                pos3 = ev.clientX; pos4 = ev.clientY;
                let newTop = Math.max(0, Math.min(element.offsetTop - pos2, window.innerHeight - element.offsetHeight));
                let newLeft = Math.max(0, Math.min(element.offsetLeft - pos1, window.innerWidth - element.offsetWidth));
                element.style.top = newTop + "px"; element.style.left = newLeft + "px";
            };
            element.classList.add('dragging');
        };
    }

    // -----------------------------------------------------------------
    // Module: main.js (as an initializer class)
    // -----------------------------------------------------------------
    class VirtualPetSystem {
        constructor() {
            this.isPopupOpen = false;
            this.floatingButton = null;
        }

        init() {
            console.log("🚀 Initializing Virtual Pet System...");
            loadPetData();
            loadSettings();
            this.createFloatingButton();
            this.createPopup();
            this.bindCoreEvents();
            this.startPetUpdateLoop();
            console.log("✅ Virtual Pet System Initialized");
        }

        createFloatingButton() {
            this.floatingButton = document.createElement('div');
            this.floatingButton.id = DOM_IDS.button;
            this.floatingButton.innerHTML = '🐾';
            document.body.appendChild(this.floatingButton);
            const savedPos = localStorage.getItem(STORAGE_KEYS.BUTTON_POS);
            if (savedPos) Object.assign(this.floatingButton.style, JSON.parse(savedPos));
            else Object.assign(this.floatingButton.style, { top: '200px', left: '20px' });
            makeDraggable(this.floatingButton);
        }

        createPopup() {
            const overlay = document.createElement('div');
            overlay.id = DOM_IDS.overlay;
            overlay.className = 'virtual-pet-popup-overlay';
            overlay.innerHTML = `<div id="${DOM_IDS.popup}" class="pet-popup-container"></div>`;
            document.body.appendChild(overlay);
        }

        bindCoreEvents() {
            this.floatingButton.addEventListener('click', () => {
                this.isPopupOpen = !this.isPopupOpen;
                togglePopup(this.isPopupOpen);
            });
            document.addEventListener('viewChanged', e => this.bindViewEvents(e.detail.viewName));
            document.addEventListener('petDataUpdated', () => this.isPopupOpen && renderPetStatus());
        }

        bindViewEvents(viewName) {
            const closeButton = document.getElementById(DOM_IDS.closeButton);
            if (closeButton) closeButton.onclick = () => { this.isPopupOpen = false; togglePopup(false); };
            document.querySelectorAll('.back-to-main-btn').forEach(btn => btn.onclick = () => switchView('main-view'));

            if (viewName === 'main-view') {
                renderPetStatus();
                document.getElementById('feed-pet-btn').onclick = () => updatePetData({ hunger: Math.min(100, petData.hunger + 15) });
                document.getElementById('play-pet-btn').onclick = () => updatePetData({ happiness: Math.min(100, petData.happiness + 15) });
                document.getElementById('goto-settings-btn').onclick = () => switchView('settings-view');
                document.getElementById('goto-pet-detail-btn').onclick = () => switchView('detail-view');
            } else if (viewName === 'settings-view') {
                const nameInput = document.getElementById('pet-name-input');
                const typeSelect = document.getElementById('pet-type-select');
                nameInput.value = settings.pet.name;
                typeSelect.value = settings.pet.type;
                document.getElementById('save-settings-btn').onclick = () => {
                    savePetSettings({ name: nameInput.value, type: typeSelect.value });
                    alert('Settings Saved!');
                };
                document.getElementById('reset-pet-btn').onclick = () => {
                    if (confirm('Are you sure?')) resetPetData();
                };
            }
        }

        startPetUpdateLoop() {
            setInterval(() => {
                const diffSeconds = (Date.now() - petData.lastUpdateTime) / 1000;
                if (diffSeconds > 60) {
                    updatePetData({
                        hunger: Math.max(0, petData.hunger - 1),
                        happiness: Math.max(0, petData.happiness - 1),
                        lastUpdateTime: Date.now(),
                    });
                }
            }, 60000);
        }
    }

    // Start the system
    const app = new VirtualPetSystem();
    app.init();
});
