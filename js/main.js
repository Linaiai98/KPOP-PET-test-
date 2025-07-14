// main.js - 虚拟宠物系统入口
import { DOM_IDS, STORAGE_KEYS } from './js/config.js';
import { loadPetData, updatePetData, resetPetData } from './js/pet.js';
import { togglePopup, switchView, renderPetStatus, makeDraggable } from './js/ui.js';
import { loadSettings, savePetSettings } from './js/settings.js';
// Firebase and other modules can be imported as needed

console.log("🐾 虚拟宠物系统脚本开始加载 (v2.0 Refactored)...");

class VirtualPetSystem {
    constructor() {
        this.petData = null;
        this.settings = null;
        this.isPopupOpen = false;
        this.floatingButton = null;
    }

    /**
     * 初始化系统
     */
    async init() {
        console.log("🚀 Initializing Virtual Pet System...");
        
        // 1. 加载数据和设置
        this.petData = loadPetData();
        this.settings = loadSettings();

        // 2. 创建UI元素
        this.createFloatingButton();
        this.createPopup();

        // 3. 绑定核心事件
        this.bindCoreEvents();
        
        // 4. 启动宠物状态更新循环
        this.startPetUpdateLoop();

        console.log("✅ Virtual Pet System Initialized");
    }

    /**
     * 动态加载CSS文件
     */
    loadCSS() {
        const cssFiles = [
            'css/theme.css',
            'css/main.css',
            'css/components.css'
        ];
        const extensionPath = `extensions/third-party/${name}`; // SillyTavern specific path
        
        cssFiles.forEach(file => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.type = 'text/css';
            link.href = `${extensionPath}/${file}`;
            document.head.appendChild(link);
        });
        console.log("🎨 CSS loaded dynamically.");
    }

    /**
     * 创建浮动按钮
     */
    createFloatingButton() {
        this.floatingButton = document.createElement('div');
        this.floatingButton.id = DOM_IDS.button;
        this.floatingButton.innerHTML = '🐾';
        document.body.appendChild(this.floatingButton);

        // 恢复按钮位置
        const savedPos = localStorage.getItem(STORAGE_KEYS.BUTTON_POS);
        if (savedPos) {
            const pos = JSON.parse(savedPos);
            this.floatingButton.style.top = pos.top;
            this.floatingButton.style.left = pos.left;
        } else {
            this.floatingButton.style.top = '200px';
            this.floatingButton.style.left = '20px';
        }
        
        makeDraggable(this.floatingButton);
    }

    /**
     * 创建弹窗骨架
     */
    createPopup() {
        const overlay = document.createElement('div');
        overlay.id = DOM_IDS.overlay;
        overlay.className = 'virtual-pet-popup-overlay';
        
        const popup = document.createElement('div');
        popup.id = DOM_IDS.popup;
        popup.className = 'pet-popup-container';

        overlay.appendChild(popup);
        document.body.appendChild(overlay);
    }

    /**
     * 绑定核心事件
     */
    bindCoreEvents() {
        // 点击浮动按钮打开/关闭弹窗
        this.floatingButton.addEventListener('click', () => {
            this.isPopupOpen = !this.isPopupOpen;
            togglePopup(this.isPopupOpen);
        });

        // 监听视图变化，为新视图绑定事件
        document.addEventListener('viewChanged', (e) => {
            this.bindViewEvents(e.detail.viewName);
        });

        // 监听宠物数据变化，更新UI
        document.addEventListener('petDataUpdated', () => {
            if (this.isPopupOpen) {
                renderPetStatus();
            }
        });
    }

    /**
     * 根据当前视图绑定事件
     * @param {string} viewName 
     */
    bindViewEvents(viewName) {
        // 公共事件
        const closeButton = document.getElementById(DOM_IDS.closeButton);
        if (closeButton) {
            closeButton.onclick = () => {
                this.isPopupOpen = false;
                togglePopup(false);
            };
        }
        
        const backButtons = document.querySelectorAll('.back-to-main-btn');
        backButtons.forEach(btn => btn.onclick = () => switchView('main-view'));

        // 特定视图事件
        switch (viewName) {
            case 'main-view':
                this.bindMainViewEvents();
                break;
            case 'settings-view':
                this.bindSettingsViewEvents();
                break;
            // ... other views
        }
    }

    bindMainViewEvents() {
        renderPetStatus(); // 初始渲染
        document.getElementById('feed-pet-btn').onclick = () => this.feedPet();
        document.getElementById('play-pet-btn').onclick = () => this.playWithPet();
        document.getElementById('goto-settings-btn').onclick = () => switchView('settings-view');
        document.getElementById('goto-pet-detail-btn').onclick = () => switchView('detail-view');
    }

    bindSettingsViewEvents() {
        const petNameInput = document.getElementById('pet-name-input');
        const petTypeSelect = document.getElementById('pet-type-select');
        
        petNameInput.value = this.settings.pet.name;
        petTypeSelect.value = this.settings.pet.type;

        document.getElementById('save-settings-btn').onclick = () => {
            savePetSettings({
                name: petNameInput.value,
                type: petTypeSelect.value
            });
            alert('Settings Saved!');
        };

        document.getElementById('reset-pet-btn').onclick = () => {
            if (confirm('Are you sure you want to reset your pet? This cannot be undone.')) {
                resetPetData();
                alert('Pet has been reset.');
            }
        };
    }

    /**
     * 宠物状态更新循环
     */
    startPetUpdateLoop() {
        setInterval(() => {
            const now = Date.now();
            const lastUpdate = this.petData.lastUpdateTime;
            const diffSeconds = (now - lastUpdate) / 1000;

            // 每分钟降低状态
            if (diffSeconds > 60) {
                const updates = {
                    hunger: Math.max(0, this.petData.hunger - 1),
                    happiness: Math.max(0, this.petData.happiness - 1),
                    lastUpdateTime: now,
                };
                updatePetData(updates);
            }
        }, 60000); // 每分钟检查一次
    }

    // --- 宠物交互 ---
    feedPet() {
        const updates = {
            hunger: Math.min(100, this.petData.hunger + 15),
            happiness: Math.min(100, this.petData.happiness + 5),
        };
        updatePetData(updates);
        console.log("Yum!");
    }

    playWithPet() {
        const updates = {
            happiness: Math.min(100, this.petData.happiness + 15),
            energy: Math.max(0, this.petData.energy - 10),
        };
        updatePetData(updates);
        console.log("Fun!");
    }
}

// 等待DOM加载完毕后��动
window.addEventListener('load', () => {
    const app = new VirtualPetSystem();
    app.init();
});
