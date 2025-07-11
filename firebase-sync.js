// firebase-sync.js
// 负责监听本地数据变化事件，并触发FirebaseDataService进行数据上传

console.log("🔄 Firebase Sync Module loading...");

// 设置事件监听器来触发上传
function setupEventListeners() {
    console.log('[Sync] Setting up local data event listeners...');
    
    // 监听本地宠物数据保存事件，触发上传
    document.addEventListener('pet-data-saved', (event) => {
        console.log('[Sync] Caught pet-data-saved event. Uploading...');
        if (window.FirebaseDataService) {
            window.FirebaseDataService.uploadData('petData', event.detail);
        }
    });
    
    // 监听本地AI设置保存事件，触发上传
    document.addEventListener('ai-settings-saved', (event) => {
        console.log('[Sync] Caught ai-settings-saved event. Uploading...');
        if (window.FirebaseDataService) {
            window.FirebaseDataService.uploadData('aiSettings', event.detail);
        }
    });
    
    // 监听本地UI设置保存事件，触发上传
    document.addEventListener('ui-settings-saved', (event) => {
        console.log('[Sync] Caught ui-settings-saved event. Uploading...');
        if (window.FirebaseDataService) {
            window.FirebaseDataService.uploadData('uiSettings', event.detail);
        }
    });

    // 监听Firebase认证成功事件，启动数据服务
    document.addEventListener('firebase-auth-ready', (event) => {
        console.log('[Sync] Firebase auth ready. Initializing Data Service...');
        const user = event.detail.user;
        if (user && user.uid && window.FirebaseDataService) {
            window.FirebaseDataService.initialize(user.uid);
        } else {
            console.error("[Sync] Firebase auth ready, but user/UID or FirebaseDataService is missing!");
        }
    });
}

// 确保DOM加载完毕后设置监听器
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupEventListeners);
} else {
    setupEventListeners();
}

console.log("✅ Firebase Sync Module loaded.");
