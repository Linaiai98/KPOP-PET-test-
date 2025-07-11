// firebase-loader.js
// 负责加载所有Firebase相关脚本并启动服务

(function() {
    'use strict';

    console.log('🚀 Firebase Loader started.');

    // Firebase SDK 版本
    const firebaseVersion = '9.15.0'; // 可以根据需要更新

    // 需要加载的脚本列表
    const scriptsToLoad = [
        // Firebase App and Auth (使用compat版本以避免模块问题)
        `https://www.gstatic.com/firebasejs/${firebaseVersion}/firebase-app-compat.js`,
        `https://www.gstatic.com/firebasejs/${firebaseVersion}/firebase-auth-compat.js`,
        // Firestore Database
        `https://www.gstatic.com/firebasejs/${firebaseVersion}/firebase-firestore-compat.js`,
        // Firebase Storage
        `https://www.gstatic.com/firebasejs/${firebaseVersion}/firebase-storage-compat.js`,
        // 我们的配置文件和同步逻辑
        './firebase-config.js',
        './firebase-sync.js',
        './firebase-ui.js'
    ];

    // 动态加载脚本的函数
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.async = false; // 确保按顺序执行

            script.onload = () => {
                console.log(`✅ Script loaded: ${src}`);
                resolve();
            };
            script.onerror = () => {
                console.error(`❌ Failed to load script: ${src}`);
                reject(new Error(`Script load error for ${src}`));
            };
            (document.head || document.documentElement).appendChild(script);
        });
    }

    // 顺序加载所有脚本
    async function loadAllScripts() {
        for (const src of scriptsToLoad) {
            await loadScript(src);
        }
    }

    // 初始化Firebase服务
    async function initialize() {
        console.log('⏳ Loading all Firebase scripts...');
        await loadAllScripts();
        console.log('✅ All scripts loaded.');

        if (window.FirebaseService) {
            console.log('🔥 Initializing Firebase Service...');
            await window.FirebaseService.initialize();
        } else {
            console.error('❌ FirebaseService not found. Initialization failed.');
        }
    }

    // 启动初始化流程
    initialize();

    // 创建一个桥接对象，用于 index.js 和 firebase-sync.js 之间的通信
    const FirebaseBridge = {
        // 注册函数，供 index.js 调用
        register: function(name, func) {
            console.log(`[Bridge] Registering function: ${name}`);
            this[name] = func;
        },

        // 下面是供 firebase-sync.js 调用的接口
        // 这些函数将被 index.js 的实际实现所覆盖
        getLocalPetData: () => {
            console.warn('getLocalPetData not implemented');
            return null;
        },
        updateLocalPetData: (data, source) => {
            console.warn('updateLocalPetData not implemented');
        },
        getLocalAISettings: () => {
            console.warn('getLocalAISettings not implemented');
            return null;
        },
        updateLocalAISettings: (data, source) => {
            console.warn('updateLocalAISettings not implemented');
        },
        getLocalUISettings: () => {
            console.warn('getLocalUISettings not implemented');
            return null;
        },
        updateLocalUISettings: (data, source) => {
            console.warn('updateLocalUISettings not implemented');
        },
        showSyncNotification: (message) => {
            console.warn('showSyncNotification not implemented');
        },
    };

    // 将桥接对象暴露到全局
    window.FirebaseBridge = FirebaseBridge;

})();
