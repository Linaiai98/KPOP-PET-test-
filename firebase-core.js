// firebase-core.js
// 负责Firebase核心SDK的加载、初始化和认证管理

console.log("🔥 Firebase Core Module loading...");

// Firebase项目配置 (从外部注入或直接定义)
let firebaseConfig = {};

// 全局Firebase服务实例
let app, auth, db, storage;
let currentUser = null;
let isFirebaseReady = false;

const FIREBASE_UID_KEY = 'kpop-pet-firebase-uid';

/**
 * 设置Firebase配置
 * @param {object} config - Firebase项目配置对象
 */
function setFirebaseConfig(config) {
    firebaseConfig = config;
    console.log("🔥 Firebase config set.");
}

/**
 * 初始化Firebase应用和核心服务
 * @returns {Promise<boolean>} - 初始化是否成功
 */
async function initializeFirebaseApp() {
    if (isFirebaseReady) {
        console.log("🔥 Firebase already initialized.");
        return true;
    }
    if (Object.keys(firebaseConfig).length === 0) {
        console.error("❌ Firebase config is not set. Cannot initialize.");
        return false;
    }

    try {
        console.log("🔥 Initializing Firebase App and Core Services...");
        
        // 确保firebase全局对象存在
        if (typeof firebase === 'undefined' || typeof firebase.initializeApp !== 'function') {
            console.error("❌ Firebase SDK not loaded. Cannot initialize app.");
            return false;
        }

        app = firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        db = firebase.firestore();
        storage = firebase.storage();
        
        console.log("✅ Firebase App and Core Services Initialized.");
        
        setupAuthListener();
        
        isFirebaseReady = true;
        return true;
        
    } catch (error) {
        console.error("❌ Firebase App Initialization Failed:", error);
        isFirebaseReady = false;
        return false;
    }
}

/**
 * 设置认证状态监听器
 * 处理匿名登录和用户状态更新
 */
function setupAuthListener() {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            console.log("👤 User is authenticated:", user.uid);

            // 如果是新匿名用户，将UID保存到localStorage
            if (!localStorage.getItem(FIREBASE_UID_KEY)) {
                localStorage.setItem(FIREBASE_UID_KEY, user.uid);
                console.log(`[Auth] New anonymous user UID stored: ${user.uid}`);
            }

            // 通知其他模块认证已就绪
            document.dispatchEvent(new CustomEvent('firebase-auth-ready', { detail: { user } }));

        } else {
            currentUser = null;
            console.log("👤 User is not authenticated. Attempting anonymous sign-in...");
            try {
                await auth.signInAnonymously();
            } catch (error) {
                console.error("❌ Anonymous sign-in failed:", error);
            }
        }
    });

    // 尝试使用存储的UID进行重新认证
    const storedUid = localStorage.getItem(FIREBASE_UID_KEY);
    if (storedUid) {
        console.log(`[Auth] Found stored UID: ${storedUid}. Attempting to re-use identity.`);
        // 模拟一个user对象，并触发auth-ready事件
        const user = { uid: storedUid };
        currentUser = user;
        document.dispatchEvent(new CustomEvent('firebase-auth-ready', { detail: { user } }));
    } 
}

/**
 * 提供Firebase服务的当前状态
 */
function getFirebaseStatus() {
    return {
        isReady: isFirebaseReady,
        isAuthenticated: !!currentUser,
        userId: currentUser?.uid || null,
    };
}

/**
 * 清理Firebase监听器 (如果需要)
 */
function cleanupFirebaseListeners() {
    // 目前没有直接的全局监听器需要清理，但保留此函数以备将来扩展
    console.log("🧹 Firebase Core: No specific listeners to clean up.");
}

// 导出核心Firebase服务
window.FirebaseCore = {
    setFirebaseConfig,
    initialize: initializeFirebaseApp,
    getStatus: getFirebaseStatus,
    isReady: () => isFirebaseReady,
    getCurrentUser: () => currentUser,
    getApp: () => app,
    getAuth: () => auth,
    getFirestore: () => db,
    getStorage: () => storage,
    cleanup: cleanupFirebaseListeners,
    FIREBASE_UID_KEY // 导出UID键，方便其他模块使用
};

console.log("✅ Firebase Core Module loaded.");
