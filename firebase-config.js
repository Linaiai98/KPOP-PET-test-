// Firebase配置和初始化模块
// 虚拟宠物系统 - Firebase集成

console.log("🔥 Firebase配置模块开始加载...");

// Firebase v9+ 模块化导入
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc, 
    onSnapshot, 
    collection,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
    enableNetwork,
    disableNetwork
} from "firebase/firestore";
import { 
    getStorage, 
    ref, 
    uploadBytes, 
    getDownloadURL, 
    deleteObject 
} from "firebase/storage";

// Firebase项目配置
const firebaseConfig = {
    apiKey: "AIzaSyA74TnN9IoyQjCncKOIOShWEktrL1hd96o",
    authDomain: "kpop-pett.firebaseapp.com",
    projectId: "kpop-pett",
    storageBucket: "kpop-pett.appspot.com", // 修正后的格式
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
async function initializeFirebase() {
    try {
        console.log("🔥 正在初始化Firebase服务...");
        
        // 初始化Firebase应用
        app = initializeApp(firebaseConfig);
        
        // 初始化各项服务
        auth = getAuth(app);
        db = getFirestore(app);
        storage = getStorage(app);
        
        console.log("✅ Firebase服务初始化成功");
        
        // 设置认证状态监听
        setupAuthListener();
        
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
    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            console.log("👤 用户已登录:", user.uid);
            
            // 触发数据同步
            onUserAuthenticated(user);
        } else {
            currentUser = null;
            console.log("👤 用户未登录");
            
            // 尝试匿名登录
            signInAnonymously(auth).catch((error) => {
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
        const userRef = doc(db, 'users', userId, 'profile', 'activity');
        await setDoc(userRef, {
            lastActiveAt: serverTimestamp(),
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
    const petDataRef = doc(db, 'users', userId, 'data', 'petData');
    const petDataUnsubscribe = onSnapshot(petDataRef, (doc) => {
        if (doc.exists()) {
            handleRemotePetDataUpdate(doc.data());
        }
    }, (error) => {
        console.error("❌ 宠物数据监听失败:", error);
    });
    
    // 监听AI设置变化
    const aiSettingsRef = doc(db, 'users', userId, 'data', 'aiSettings');
    const aiSettingsUnsubscribe = onSnapshot(aiSettingsRef, (doc) => {
        if (doc.exists()) {
            handleRemoteAISettingsUpdate(doc.data());
        }
    }, (error) => {
        console.error("❌ AI设置监听失败:", error);
    });
    
    // 监听UI设置变化
    const uiSettingsRef = doc(db, 'users', userId, 'data', 'uiSettings');
    const uiSettingsUnsubscribe = onSnapshot(uiSettingsRef, (doc) => {
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
