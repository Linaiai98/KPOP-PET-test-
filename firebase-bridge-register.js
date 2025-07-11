// firebase-bridge-register.js
// 负责将 index.js 中的函数注册到 FirebaseBridge

(function() {
    'use strict';

    function waitForDependencies(callback) {
        const interval = setInterval(() => {
            if (window.FirebaseBridge && 
                typeof window.petSystem !== 'undefined' &&
                typeof window.petSystem.loadPetData === 'function' &&
                typeof window.petSystem.savePetData === 'function' &&
                typeof window.petSystem.loadAISettings === 'function' &&
                typeof window.petSystem.saveAISettings === 'function' &&
                typeof window.petSystem.loadUISettings === 'function' &&
                typeof window.petSystem.saveUISettings === 'function' &&
                typeof window.petSystem.showNotification === 'function') {
                
                clearInterval(interval);
                callback();
            }
        }, 100); // 每100毫秒检查一次
    }

    function registerBridgeFunctions() {
        console.log('[Bridge] Registering functions from index.js to FirebaseBridge...');

        // 注册数据读取函数
        window.FirebaseBridge.register('getLocalPetData', window.petSystem.loadPetData);
        window.FirebaseBridge.register('getLocalAISettings', window.petSystem.loadAISettings);
        window.FirebaseBridge.register('getLocalUISettings', window.petSystem.loadUISettings);

        // 注册数据更新函数 (需要适配)
        window.FirebaseBridge.register('updateLocalPetData', (data, source) => {
            // 避免来自Firebase的更新再次触发上传
            window.petSystem.savePetData(data, true); // true表示这是一个来自同步的保存
        });
        window.FirebaseBridge.register('updateLocalAISettings', (data, source) => {
            window.petSystem.saveAISettings(data, true);
        });
        window.FirebaseBridge.register('updateLocalUISettings', (data, source) => {
            window.petSystem.saveUISettings(data, true);
        });

        // 注册通知函数
        window.FirebaseBridge.register('showSyncNotification', window.petSystem.showNotification);
        
        console.log('[Bridge] All functions registered successfully.');
    }

    waitForDependencies(registerBridgeFunctions);

})();
