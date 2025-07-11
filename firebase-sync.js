// Firebase数据同步模块 - **V2 (Simplified & Corrected)**
// 虚拟宠物系统 - 数据同步功能

console.log("🔄 Firebase Sync V2 (Simplified) loading...");

/**
 * 主初始化函数，在用户认证成功后调用
 * @param {string} userId - 当前用户的UID
 */
async function initSync(userId) {
    console.log(`[Sync] Initializing sync for user: ${userId}`);
    
    // 1. 启动初始数据同步
    await initialDataSync(userId);
    
    // 2. 设置实时数据监听器
    setupRealtimeListeners(userId);

    console.log("[Sync] ✅ Sync service fully initialized.");
}

/**
 * 执行首次数据拉取和推送
 * @param {string} userId 
 */
async function initialDataSync(userId) {
    console.log("[Sync] Performing initial data sync...");
    try {
        // 同步宠物数据、AI设置和UI设置
        await Promise.all([
            syncData('petData', userId),
            syncData('aiSettings', userId),
            syncData('uiSettings', userId)
        ]);
        console.log("[Sync] ✅ Initial data sync completed.");
    } catch (error) {
        console.error("[Sync] ❌ Initial data sync failed:", error);
    }
}

/**
 * 设置所有集合的实时监听器
 * @param {string} userId 
 */
function setupRealtimeListeners(userId) {
    const db = window.FirebaseService.getFirestore();
    
    // 监听宠物数据
    db.collection('users').doc(userId).collection('data').doc('petData')
      .onSnapshot(handleRemoteUpdate('petData'), handleSnapshotError('petData'));

    // 监听AI设置
    db.collection('users').doc(userId).collection('data').doc('aiSettings')
      .onSnapshot(handleRemoteUpdate('aiSettings'), handleSnapshotError('aiSettings'));

    // 监听UI设置
    db.collection('users').doc(userId).collection('data').doc('uiSettings')
      .onSnapshot(handleRemoteUpdate('uiSettings'), handleSnapshotError('uiSettings'));

    console.log("[Sync] ✅ Realtime listeners set up.");
}

/**
 * 通用数据同步函数 (拉取或推送)
 * @param {string} type - 数据类型 ('petData', 'aiSettings', 'uiSettings')
 * @param {string} userId 
 */
async function syncData(type, userId) {
    const db = window.FirebaseService.getFirestore();
    const docRef = db.collection('users').doc(userId).collection('data').doc(type);

    try {
        const docSnap = await docRef.get();

        if (docSnap.exists()) {
            const remoteData = docSnap.data();
            console.log(`[Sync] 📥 Fetched remote ${type}.`);
            
            // 触发事件，让主逻辑决定如何合并数据
            document.dispatchEvent(new CustomEvent('firebase-data-received', { 
                detail: { type, data: remoteData }
            }));

        } else {
            console.log(`[Sync] 📤 No remote ${type} found. Uploading local data.`);
            // 如果云端没有数据，则上传本地数据
            const localData = window.FirebaseBridge[`getLocal${capitalize(type)}`]();
            if (localData) {
                await uploadData(type, localData);
            }
        }
    } catch (error) {
        console.error(`[Sync] ❌ Failed to sync ${type}:`, error);
    }
}

/**
 * 通用数据上传函数
 * @param {string} type - 数据类型
 * @param {object} data - 要上传的数据
 */
async function uploadData(type, data) {
    if (!window.FirebaseService.isReady() || !window.FirebaseService.getCurrentUser()) {
        console.warn(`[Sync] Firebase not ready. Cannot upload ${type}.`);
        return;
    }

    const userId = window.FirebaseService.getCurrentUser().uid;
    const db = window.FirebaseService.getFirestore();
    const docRef = db.collection('users').doc(userId).collection('data').doc(type);

    const dataToUpload = {
        ...data,
        lastSyncTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
        syncSource: 'local'
    };

    try {
        await docRef.set(dataToUpload, { merge: true });
        console.log(`[Sync] ✅ Uploaded ${type} successfully.`);
    } catch (error) {
        console.error(`[Sync] ❌ Failed to upload ${type}:`, error);
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
        console.log(`[Sync] 📥 Received remote update for ${type}.`);
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
    console.error(`[Sync] ❌ Realtime listener error for ${type}:`, error);
};

/**
 * 辅助函数：首字母大写
 * @param {string} s 
 */
const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);


// --- Event Listeners --- //

// 监听认证成功事件，这是整个同步流程的起点
document.addEventListener('firebase-auth-ready', (event) => {
    console.log('[Sync] Auth is ready, initializing sync services...');
    const user = event.detail.user;
    if (user && user.uid) {
        initSync(user.uid);
    } else {
        console.error("[Sync] Auth ready event fired, but user or UID is missing!");
    }
});

// 监听本地数据保存事件，触发上传
document.addEventListener('pet-data-saved', (event) => uploadData('petData', event.detail));
document.addEventListener('ai-settings-saved', (event) => uploadData('aiSettings', event.detail));
document.addEventListener('ui-settings-saved', (event) => uploadData('uiSettings', event.detail));


console.log("✅ Firebase Sync V2 (Simplified) loaded.");