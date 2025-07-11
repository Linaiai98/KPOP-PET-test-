// firebase-data-service.js
// 负责所有Firebase数据（Firestore, Storage）的读写和同步逻辑

console.log("📊 Firebase Data Service Module loading...");

let syncListeners = new Map(); // 存储实时监听器

/**
 * 初始化数据服务
 * 在Firebase认证成功后调用
 * @param {string} userId - 当前用户的UID
 */
async function initializeDataService(userId) {
    console.log(`[DataService] Initializing for user: ${userId}`);
    
    // 启动初始数据同步
    await initialDataSync(userId);
    
    // 设置实时数据监听器
    setupRealtimeListeners(userId);

    console.log("[DataService] ✅ Data service fully initialized.");
}

/**
 * 执行首次数据拉取和推送
 * @param {string} userId 
 */
async function initialDataSync(userId) {
    console.log("[DataService] Performing initial data sync...");
    try {
        // 同步宠物数据、AI设置和UI设置
        await Promise.all([
            syncData('petData', userId),
            syncData('aiSettings', userId),
            syncData('uiSettings', userId)
        ]);
        console.log("[DataService] ✅ Initial data sync completed.");
    } catch (error) {
        console.error("[DataService] ❌ Initial data sync failed:", error);
    }
}

/**
 * 设置所有集合的实时监听器
 * @param {string} userId 
 */
function setupRealtimeListeners(userId) {
    const db = window.FirebaseCore.getFirestore();
    
    // 监听宠物数据
    const petDataUnsubscribe = db.collection('users').doc(userId).collection('data').doc('petData')
      .onSnapshot(handleRemoteUpdate('petData'), handleSnapshotError('petData'));
    syncListeners.set('petData', petDataUnsubscribe);

    // 监听AI设置
    const aiSettingsUnsubscribe = db.collection('users').doc(userId).collection('data').doc('aiSettings')
      .onSnapshot(handleRemoteUpdate('aiSettings'), handleSnapshotError('aiSettings'));
    syncListeners.set('aiSettings', aiSettingsUnsubscribe);

    // 监听UI设置
    const uiSettingsUnsubscribe = db.collection('users').doc(userId).collection('data').doc('uiSettings')
      .onSnapshot(handleRemoteUpdate('uiSettings'), handleSnapshotError('uiSettings'));
    syncListeners.set('uiSettings', uiSettingsUnsubscribe);

    console.log("[DataService] ✅ Realtime listeners set up.");
}

/**
 * 通用数据同步函数 (拉取或推送)
 * @param {string} type - 数据类型 ('petData', 'aiSettings', 'uiSettings')
 * @param {string} userId 
 */
async function syncData(type, userId) {
    const db = window.FirebaseCore.getFirestore();
    const docRef = db.collection('users').doc(userId).collection('data').doc(type);

    try {
        const docSnap = await docRef.get();

        if (docSnap.exists()) {
            const remoteData = docSnap.data();
            console.log(`[DataService] 📥 Fetched remote ${type}.`);
            
            // 触发事件，让主逻辑决定如何合并数据
            document.dispatchEvent(new CustomEvent('firebase-data-received', { 
                detail: { type, data: remoteData }
            }));

        } else {
            console.log(`[DataService] 📤 No remote ${type} found. Uploading local data.`);
            // 如果云端没有数据，则上传本地数据
            const localData = window.FirebaseBridge[`getLocal${capitalize(type)}`]();
            if (localData) {
                await uploadData(type, localData);
            }
        }
    } catch (error) {
        console.error(`[DataService] ❌ Failed to sync ${type}:`, error);
    }
}

/**
 * 通用数据上传函数
 * @param {string} type - 数据类型
 * @param {object} data - 要上传的数据
 */
async function uploadData(type, data) {
    if (!window.FirebaseCore.isReady() || !window.FirebaseCore.getCurrentUser()) {
        console.warn(`[DataService] Firebase not ready. Cannot upload ${type}.`);
        return;
    }

    const userId = window.FirebaseCore.getCurrentUser().uid;
    const db = window.FirebaseCore.getFirestore();
    const docRef = db.collection('users').doc(userId).collection('data').doc(type);

    const dataToUpload = {
        ...data,
        lastSyncTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
        syncSource: 'local'
    };

    try {
        await docRef.set(dataToUpload, { merge: true });
        console.log(`[DataService] ✅ Uploaded ${type} successfully.`);
    } catch (error) {
        console.error(`[DataService] ❌ Failed to upload ${type}:`, error);
    }
}

/**
 * 创建处理远程更新的高阶函数
 * @param {string} type - 数据类型
 */
const handleRemoteUpdate = (type) => (doc) => {
    if (doc.exists()) {
        const remoteData = doc.data();
        // 检查是否是本地回传的更新，避免无限循环
        if (remoteData.syncSource === 'local') {
            return; //忽略本地回传的更新
        }
        console.log(`[DataService] 📥 Received remote update for ${type}.`);
        document.dispatchEvent(new CustomEvent('firebase-data-received', { 
            detail: { type, data: remoteData }
        }));
    }
};

/**
 * 创建处理快照错误的高阶函数
 * @param {string} type - 数据类型
 */
const handleSnapshotError = (type) => (error) => {
    console.error(`[DataService] ❌ Realtime listener error for ${type}:`, error);
};

/**
 * 辅助函数：首字母大写
 * @param {string} s 
 */
const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * 清理数据服务监听器
 */
function cleanupDataServiceListeners() {
    console.log("🧹 Cleaning up Data Service listeners...");
    syncListeners.forEach((unsubscribe, key) => {
        try {
            unsubscribe();
            console.log(`✅ Unsubscribed from ${key} listener.`);
        } catch (error) {
            console.error(`❌ Failed to unsubscribe from ${key} listener:`, error);
        }
    });
    syncListeners.clear();
}

// 导出数据服务功能
window.FirebaseDataService = {
    initialize: initializeDataService,
    uploadData: uploadData,
    cleanup: cleanupDataServiceListeners
};

console.log("✅ Firebase Data Service Module loaded.");
