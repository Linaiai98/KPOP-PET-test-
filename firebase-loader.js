// firebase-loader.js
// 负责加载所有Firebase相关脚本并启动服务 - **V2 (Robust Version)**

(function() {
    'use strict';

    console.log('🚀 Firebase Loader V2 started.');

    // Firebase SDK 版本
    const firebaseVersion = '9.15.0'; // 保持版本一致

    // 需要加载的脚本列表
    const scriptsToLoad = [
        `https://www.gstatic.com/firebasejs/${firebaseVersion}/firebase-app-compat.js`,
        `https://www.gstatic.com/firebasejs/${firebaseVersion}/firebase-auth-compat.js`,
        `https://www.gstatic.com/firebasejs/${firebaseVersion}/firebase-firestore-compat.js`,
        `https://www.gstatic.com/firebasejs/${firebaseVersion}/firebase-storage-compat.js`,
        './firebase-config.js',
        './firebase-sync.js',
        './firebase-ui.js'
    ];

    // 动态加载脚本的函数
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            // 检查脚本是否已存在，避免重复加载
            if (document.querySelector(`script[src="${src}"]`)) {
                console.log(`[Loader] Script already exists: ${src}`);
                resolve();
                return;
            }
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
        console.log('⏳ Loading all Firebase-related scripts...');
        for (const src of scriptsToLoad) {
            try {
                await loadScript(src);
            } catch (error) {
                console.error(`[Loader] Stopping due to critical script load failure: ${src}`);
                // 如果关键脚本加载失败，则停止后续操作
                return false;
            }
        }
        console.log('✅ All scripts have been requested for loading.');
        return true;
    }

    // **核心改进：轮询检查并安全地初始化Firebase**
    async function safeInitializeFirebase() {
        const MAX_ATTEMPTS = 10;
        const RETRY_DELAY = 500; // ms

        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
            console.log(`[Initializer] Attempt ${attempt}/${MAX_ATTEMPTS} to initialize Firebase...`);

            // 检查Firebase核心对象和我们自己的服务是否都已准备好
            if (typeof firebase !== 'undefined' && typeof firebase.app === 'function' && window.FirebaseService) {
                console.log('[Initializer] ✅ Dependencies (firebase, FirebaseService) are ready!');
                
                const success = await window.FirebaseService.initialize();
                if (success) {
                    console.log('🎉 Firebase Service successfully initialized!');
                    return; // 初始化成功，退出循环
                } else {
                    console.error('[Initializer] 🔥 FirebaseService.initialize() returned false. Halting.');
                    return; // 初始化函数明确返回失败，停止重试
                }
            }

            // 如果未准备好，则等待后重试
            console.log(`[Initializer] ⏳ Dependencies not ready, waiting ${RETRY_DELAY}ms...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        }

        console.error(`[Initializer] ❌ Failed to initialize Firebase after ${MAX_ATTEMPTS} attempts. Please check the console for errors.`);
        alert('KPOP-PET插件错误：无法加载Firebase。请检查网络连接和浏览器控制台错误。');
    }

    // 启动整个流程
    async function main() {
        const scriptsLoaded = await loadAllScripts();
        if (scriptsLoaded) {
            await safeInitializeFirebase();
        } else {
            console.error("[Main] Could not proceed with initialization because script loading failed.");
        }
    }

    // 创建一个桥接对象，用于 index.js 和 firebase-sync.js 之间的通信
    // 这个部分保持不变
    const FirebaseBridge = {
        register: function(name, func) {
            console.log(`[Bridge] Registering function: ${name}`);
            this[name] = func;
        },
        getLocalPetData: () => { console.warn('getLocalPetData not implemented'); return null; },
        updateLocalPetData: (data, source) => { console.warn('updateLocalPetData not implemented'); },
        getLocalAISettings: () => { console.warn('getLocalAISettings not implemented'); return null; },
        updateLocalAISettings: (data, source) => { console.warn('updateLocalAISettings not implemented'); },
        getLocalUISettings: () => { console.warn('getLocalUISettings not implemented'); return null; },
        updateLocalUISettings: (data, source) => { console.warn('updateLocalUISettings not implemented'); },
        showSyncNotification: (message) => { console.warn('showSyncNotification not implemented'); },
    };
    window.FirebaseBridge = FirebaseBridge;

    // 启动
    main();

})();