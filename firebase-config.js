// Firebase配置和初始化模块
// 虚拟宠物系统 - Firebase集成

console.log("🔥 Firebase配置模块开始加载...");

// 使用Firebase v9 compat版本，避免模块导入问题

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA74TnN9IoyQjCncKOIOShWEktrL1hd96o",
  authDomain: "kpop-pett.firebaseapp.com",
  projectId: "kpop-pett",
  storageBucket: "kpop-pett.firebasestorage.app",
  messagingSenderId: "264650615774",
  appId: "1:264650615774:web:f500ff555183110c3f0b4f",
  measurementId: "G-3BH0GMJR3D"
};

// 初始化Firebase服务
let app, auth, db, storage;
let currentUser = null;
let isFirebaseReady = false;
let syncListeners = new Map(); // 存储实时监听器

/**
 * 初始化Firebase服务
 */
const FIREBASE_UID_KEY = 'kpop-pet-firebase-uid';

async function initializeFirebase() {
    try {
        console.log("🔥 正在初始化Firebase服务...");
        
        // 初始化Firebase应用 (使用compat版本)
        app = firebase.initializeApp(firebaseConfig);

        // 初始化各项服务
        auth = firebase.auth();
        db = firebase.firestore();
        storage = firebase.storage();
        
        console.log("✅ Firebase服务初始化成功");
        
        // 设置认证状态监听
                // 优先从localStorage获取UID，实现跨设备同步
        const storedUid = localStorage.getItem(FIREBASE_UID_KEY);
        if (storedUid) {
            console.log(`[Firebase] Found stored UID: ${storedUid}. Re-using this identity.`);
            // 模拟一个user对象，因为我们已经有了UID，不需要再次登录
            const user = { uid: storedUid };
            await onUserAuthenticated(user);
            currentUser = user;
            isFirebaseReady = true;
            // 手动触发一次状态更新，让UI知道已经“登录”
            document.dispatchEvent(new CustomEvent('firebase-auth-state-changed', { detail: { user } }));
        } else {
            console.log('[Firebase] No stored UID found. Proceeding with standard anonymous login.');
            // 如果没有存储的UID，才进行正常的认证流程
            setupAuthListener();
        }
        
        // 设置网络状态监听
        setupNetworkListener();
        
        isFirebaseReady = true;
        return true;
        
    } catch (error) {
        console.error("❌ Firebase初始化失败:", error);
        
        // 提供用户友好的错误信息
        if (error.code === 'auth/api-key-not-valid') {
            console.error("🔑 API密钥无效，请检查Firebase配置");
        } else if (error.code === 'auth/project-not-found') {
            console.error("📁 Firebase项目未找到，请检查项目ID");
        } else if (error.message.includes('network')) {
            console.error("🌐 网络连接问题，请检查网络设置");
        }
        
        return false;
    }
}

/**
 * 设置认证状态监听器
 */
function setupAuthListener() {
    auth.onAuthStateChanged((user) => {
        // 当用户通过Firebase正常登录后，将UID保存到localStorage
        if (user && !localStorage.getItem(FIREBASE_UID_KEY)) {
            console.log(`[Firebase] New anonymous user created. Storing UID: ${user.uid}`);
            localStorage.setItem(FIREBASE_UID_KEY, user.uid);
        }
        if (user) {
            currentUser = user;
            console.log("👤 用户已登录:", user.uid);
            
            // 触发数据同步
                        onUserAuthenticated(user);
            // 触发事件，让UI更新
            document.dispatchEvent(new CustomEvent('firebase-auth-state-changed', { detail: { user } }));
        } else {
                        currentUser = null;
            console.log("👤 用户未登录");
            // 触发事件，让UI更新
            document.dispatchEvent(new CustomEvent('firebase-auth-state-changed', { detail: { user: null } }));
            
            // 尝试匿名登录
            auth.signInAnonymously().catch((error) => {
                console.error("❌ 匿名登录失败:", error);
            });
        }
    });
}

/**
 * 设置网络状态监听器
 */
function setupNetworkListener() {
    // 监听在线状态
    window.addEventListener('online', async () => {
        console.log("🌐 网络已连接，启用Firebase同步...");
        try {
            await enableNetwork(db);
            // 触发待同步数据的上传
            await syncPendingData();
        } catch (error) {
            console.error("❌ 启用网络同步失败:", error);
        }
    });
    
    // 监听离线状态
    window.addEventListener('offline', async () => {
        console.log("📴 网络已断开，禁用Firebase同步...");
        try {
            await disableNetwork(db);
        } catch (error) {
            console.error("❌ 禁用网络同步失败:", error);
        }
    });
}

/**
 * 用户认证成功后的处理
 */
async function onUserAuthenticated(user) {
    try {
        // 更新用户活跃状态
        await updateUserActivity(user.uid);
        
        // 开始监听用户数据变化
        setupUserDataListeners(user.uid);
        
        // 触发初始数据同步
        await initialDataSync(user.uid);
        
        console.log("🔄 用户数据同步已启动");
        
    } catch (error) {
        console.error("❌ 用户认证后处理失败:", error);
    }
}

/**
 * 更新用户活跃状态
 */
async function updateUserActivity(userId) {
    try {
        const userRef = db.collection('users').doc(userId).collection('profile').doc('activity');
        await userRef.set({
            lastActiveAt: firebase.firestore.FieldValue.serverTimestamp(),
            deviceInfo: {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language
            }
        }, { merge: true });
        
    } catch (error) {
        console.error("❌ 更新用户活跃状态失败:", error);
    }
}

/**
 * 设置用户数据实时监听器
 */
function setupUserDataListeners(userId) {
    // 监听宠物数据变化
    const petDataRef = db.collection('users').doc(userId).collection('data').doc('petData');
    const petDataUnsubscribe = petDataRef.onSnapshot((doc) => {
        if (doc.exists()) {
            handleRemotePetDataUpdate(doc.data());
        }
    }, (error) => {
        console.error("❌ 宠物数据监听失败:", error);
    });
    
    // 监听AI设置变化
    const aiSettingsRef = db.collection('users').doc(userId).collection('data').doc('aiSettings');
    const aiSettingsUnsubscribe = aiSettingsRef.onSnapshot((doc) => {
        if (doc.exists()) {
            handleRemoteAISettingsUpdate(doc.data());
        }
    }, (error) => {
        console.error("❌ AI设置监听失败:", error);
    });
    
    // 监听UI设置变化
    const uiSettingsRef = db.collection('users').doc(userId).collection('data').doc('uiSettings');
    const uiSettingsUnsubscribe = uiSettingsRef.onSnapshot((doc) => {
        if (doc.exists()) {
            handleRemoteUISettingsUpdate(doc.data());
        }
    }, (error) => {
        console.error("❌ UI设置监听失败:", error);
    });
    
    // 存储监听器以便后续清理
    syncListeners.set('petData', petDataUnsubscribe);
    syncListeners.set('aiSettings', aiSettingsUnsubscribe);
    syncListeners.set('uiSettings', uiSettingsUnsubscribe);
}

/**
 * 初始数据同步
 */
async function initialDataSync(userId) {
    try {
        console.log("🔄 开始初始数据同步...");
        
        // 同步宠物数据
        await syncPetDataFromFirebase(userId);
        
        // 同步AI设置
        await syncAISettingsFromFirebase(userId);
        
        // 同步UI设置（包括头像）
        await syncUISettingsFromFirebase(userId);
        
        console.log("✅ 初始数据同步完成");
        
    } catch (error) {
        console.error("❌ 初始数据同步失败:", error);
    }
}

/**
 * 检查Firebase服务状态
 */
function getFirebaseStatus() {
    return {
        isReady: isFirebaseReady,
        isAuthenticated: !!currentUser,
        userId: currentUser?.uid || null,
        isOnline: navigator.onLine,
        services: {
            app: !!app,
            auth: !!auth,
            firestore: !!db,
            storage: !!storage
        }
    };
}

/**
 * 清理Firebase监听器
 */
function cleanupFirebaseListeners() {
    console.log("🧹 清理Firebase监听器...");
    
    syncListeners.forEach((unsubscribe, key) => {
        try {
            unsubscribe();
            console.log(`✅ 已清理${key}监听器`);
        } catch (error) {
            console.error(`❌ 清理${key}监听器失败:`, error);
        }
    });
    
    syncListeners.clear();
}

// 导出Firebase服务和工具函数
window.FirebaseService = {
    // 初始化
    initialize: initializeFirebase,
    
    // 状态检查
    getStatus: getFirebaseStatus,
    isReady: () => isFirebaseReady,
    getCurrentUser: () => currentUser,
    
    // 服务实例
    getApp: () => app,
    getAuth: () => auth,
    getFirestore: () => db,
    getStorage: () => storage,
    
    // 清理
    cleanup: cleanupFirebaseListeners
};

console.log("✅ Firebase配置模块加载完成");
