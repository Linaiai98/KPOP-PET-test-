// Firebase数据同步模块
// 虚拟宠物系统 - 数据同步功能

console.log("🔄 Firebase同步模块开始加载...");

// 同步状态管理
let syncGate = {
    petData: false,
    aiSettings: false,
    uiSettings: false
};

let pendingSync = {
    petData: null,
    aiSettings: null,
    uiSettings: null
};

/**
 * 上传宠物数据到Firebase
 */
async function uploadPetDataToFirebase(petData) {
    if (!window.FirebaseService.isReady() || !window.FirebaseService.getCurrentUser()) {
        console.log("⏳ Firebase未就绪，将数据加入待同步队列");
        pendingSync.petData = petData;
        return false;
    }
    
    if (syncGate.petData) {
        console.log("🚫 宠物数据同步门控激活，跳过上传");
        return false;
    }
    
    try {
        const userId = window.FirebaseService.getCurrentUser().uid;
        const db = window.FirebaseService.getFirestore();
        
        const petDataRef = doc(db, 'users', userId, 'data', 'petData');
        
        const syncData = {
            ...petData,
            lastSyncTime: Date.now(),
            syncSource: 'local',
            version: petData.dataVersion || 4.0
        };
        
        await setDoc(petDataRef, syncData, { merge: true });
        
        console.log("✅ 宠物数据已上传到Firebase");
        
        // 清除待同步数据
        pendingSync.petData = null;
        
        return true;
        
    } catch (error) {
        console.error("❌ 上传宠物数据失败:", error);
        
        // 加入待同步队列
        pendingSync.petData = petData;
        
        return false;
    }
}

/**
 * 从Firebase下载宠物数据
 */
async function syncPetDataFromFirebase(userId) {
    if (!window.FirebaseService.isReady()) {
        console.log("⏳ Firebase未就绪，跳过宠物数据同步");
        return null;
    }
    
    try {
        const db = window.FirebaseService.getFirestore();
        const petDataRef = doc(db, 'users', userId, 'data', 'petData');
        const docSnap = await getDoc(petDataRef);
        
        if (docSnap.exists()) {
            const firebaseData = docSnap.data();
            console.log("📥 从Firebase获取到宠物数据");
            
            // 比较本地和云端数据，选择最新的
            const localData = getLocalPetData();
            const shouldUseFirebaseData = shouldUseRemoteData(localData, firebaseData);
            
            if (shouldUseFirebaseData) {
                console.log("🔄 使用Firebase数据更新本地");
                updateLocalPetData(firebaseData, 'firebase');
                return firebaseData;
            } else {
                console.log("📤 本地数据更新，上传到Firebase");
                await uploadPetDataToFirebase(localData);
                return localData;
            }
        } else {
            console.log("📤 Firebase无宠物数据，上传本地数据");
            const localData = getLocalPetData();
            if (localData) {
                await uploadPetDataToFirebase(localData);
            }
            return localData;
        }
        
    } catch (error) {
        console.error("❌ 同步宠物数据失败:", error);
        return null;
    }
}

/**
 * 处理远程宠物数据更新
 */
function handleRemotePetDataUpdate(firebaseData) {
    if (syncGate.petData) {
        console.log("🚫 宠物数据同步门控激活，忽略远程更新");
        return;
    }
    
    console.log("📥 收到远程宠物数据更新");
    
    const localData = getLocalPetData();
    const shouldUpdate = shouldUseRemoteData(localData, firebaseData);
    
    if (shouldUpdate) {
        console.log("🔄 应用远程宠物数据更新");
        updateLocalPetData(firebaseData, 'firebase');
        
        // 通知UI更新
        if (typeof window.updatePetDisplay === 'function') {
            window.updatePetDisplay();
        }
        
        // 显示同步通知
        showSyncNotification('宠物数据已从其他设备同步');
    }
}

/**
 * 上传AI设置到Firebase
 */
async function uploadAISettingsToFirebase(aiSettings) {
    if (!window.FirebaseService.isReady() || !window.FirebaseService.getCurrentUser()) {
        console.log("⏳ Firebase未就绪，将AI设置加入待同步队列");
        pendingSync.aiSettings = aiSettings;
        return false;
    }
    
    if (syncGate.aiSettings) {
        console.log("🚫 AI设置同步门控激活，跳过上传");
        return false;
    }
    
    try {
        const userId = window.FirebaseService.getCurrentUser().uid;
        const db = window.FirebaseService.getFirestore();
        
        const aiSettingsRef = doc(db, 'users', userId, 'data', 'aiSettings');
        
        // 敏感数据处理：API密钥简单加密
        const syncData = {
            ...aiSettings,
            apiKey: aiSettings.apiKey ? btoa(aiSettings.apiKey) : '', // Base64编码
            lastSyncTime: Date.now(),
            syncSource: 'local'
        };
        
        await setDoc(aiSettingsRef, syncData, { merge: true });
        
        console.log("✅ AI设置已上传到Firebase");
        
        // 清除待同步数据
        pendingSync.aiSettings = null;
        
        return true;
        
    } catch (error) {
        console.error("❌ 上传AI设置失败:", error);
        
        // 加入待同步队列
        pendingSync.aiSettings = aiSettings;
        
        return false;
    }
}

/**
 * 从Firebase下载AI设置
 */
async function syncAISettingsFromFirebase(userId) {
    if (!window.FirebaseService.isReady()) {
        console.log("⏳ Firebase未就绪，跳过AI设置同步");
        return null;
    }
    
    try {
        const db = window.FirebaseService.getFirestore();
        const aiSettingsRef = doc(db, 'users', userId, 'data', 'aiSettings');
        const docSnap = await getDoc(aiSettingsRef);
        
        if (docSnap.exists()) {
            const firebaseData = docSnap.data();
            
            // 解密API密钥
            if (firebaseData.apiKey) {
                try {
                    firebaseData.apiKey = atob(firebaseData.apiKey);
                } catch (e) {
                    console.warn("⚠️ API密钥解密失败，可能是旧格式");
                }
            }
            
            console.log("📥 从Firebase获取到AI设置");
            
            // 比较本地和云端数据
            const localData = getLocalAISettings();
            const shouldUseFirebaseData = shouldUseRemoteData(localData, firebaseData);
            
            if (shouldUseFirebaseData) {
                console.log("🔄 使用Firebase AI设置更新本地");
                updateLocalAISettings(firebaseData, 'firebase');
                return firebaseData;
            } else {
                console.log("📤 本地AI设置更新，上传到Firebase");
                await uploadAISettingsToFirebase(localData);
                return localData;
            }
        } else {
            console.log("📤 Firebase无AI设置，上传本地数据");
            const localData = getLocalAISettings();
            if (localData && Object.keys(localData).length > 0) {
                await uploadAISettingsToFirebase(localData);
            }
            return localData;
        }
        
    } catch (error) {
        console.error("❌ 同步AI设置失败:", error);
        return null;
    }
}

/**
 * 处理远程AI设置更新
 */
function handleRemoteAISettingsUpdate(firebaseData) {
    if (syncGate.aiSettings) {
        console.log("🚫 AI设置同步门控激活，忽略远程更新");
        return;
    }
    
    console.log("📥 收到远程AI设置更新");
    
    // 解密API密钥
    if (firebaseData.apiKey) {
        try {
            firebaseData.apiKey = atob(firebaseData.apiKey);
        } catch (e) {
            console.warn("⚠️ API密钥解密失败");
        }
    }
    
    const localData = getLocalAISettings();
    const shouldUpdate = shouldUseRemoteData(localData, firebaseData);
    
    if (shouldUpdate) {
        console.log("🔄 应用远程AI设置更新");
        updateLocalAISettings(firebaseData, 'firebase');
        
        // 通知UI更新
        if (typeof window.loadAISettings === 'function') {
            window.loadAISettings();
        }
        
        // 显示同步通知
        showSyncNotification('AI设置已从其他设备同步');
    }
}

/**
 * 判断是否应该使用远程数据
 */
function shouldUseRemoteData(localData, remoteData) {
    if (!localData) return true;
    if (!remoteData) return false;
    
    const localTime = localData.lastSyncTime || 0;
    const remoteTime = remoteData.lastSyncTime || 0;
    
    // 远程数据更新时使用远程数据
    return remoteTime > localTime;
}

/**
 * 上传UI设置到Firebase
 */
async function uploadUISettingsToFirebase(uiSettings) {
    if (!window.FirebaseService.isReady() || !window.FirebaseService.getCurrentUser()) {
        console.log("⏳ Firebase未就绪，将UI设置加入待同步队列");
        pendingSync.uiSettings = uiSettings;
        return false;
    }

    if (syncGate.uiSettings) {
        console.log("🚫 UI设置同步门控激活，跳过上传");
        return false;
    }

    try {
        const userId = window.FirebaseService.getCurrentUser().uid;
        const db = window.FirebaseService.getFirestore();

        const uiSettingsRef = doc(db, 'users', userId, 'data', 'uiSettings');

        const syncData = {
            ...uiSettings,
            lastSyncTime: Date.now(),
            syncSource: 'local'
        };

        // 如果包含头像数据，先上传到Cloud Storage
        if (uiSettings.customAvatar && window.FirebaseAvatarStorage) {
            try {
                console.log("🎨 检测到头像数据，上传到Cloud Storage...");
                const avatarResult = await window.FirebaseAvatarStorage.upload(uiSettings.customAvatar, userId);

                // 用URL替换Base64数据
                syncData.avatarUrl = avatarResult.url;
                syncData.avatarFileName = avatarResult.fileName;
                delete syncData.customAvatar; // 移除Base64数据

                console.log("✅ 头像已上传到Cloud Storage");
            } catch (avatarError) {
                console.warn("⚠️ 头像上传失败，跳过头像同步:", avatarError);
                delete syncData.customAvatar; // 移除失败的头像数据
            }
        }

        await setDoc(uiSettingsRef, syncData, { merge: true });

        console.log("✅ UI设置已上传到Firebase");

        // 清除待同步数据
        pendingSync.uiSettings = null;

        return true;

    } catch (error) {
        console.error("❌ 上传UI设置失败:", error);

        // 加入待同步队列
        pendingSync.uiSettings = uiSettings;

        return false;
    }
}

/**
 * 从Firebase下载UI设置
 */
async function syncUISettingsFromFirebase(userId) {
    if (!window.FirebaseService.isReady()) {
        console.log("⏳ Firebase未就绪，跳过UI设置同步");
        return null;
    }

    try {
        const db = window.FirebaseService.getFirestore();
        const uiSettingsRef = doc(db, 'users', userId, 'data', 'uiSettings');
        const docSnap = await getDoc(uiSettingsRef);

        if (docSnap.exists()) {
            const firebaseData = docSnap.data();
            console.log("📥 从Firebase获取到UI设置");

            // 如果有头像URL，下载头像
            if (firebaseData.avatarUrl && window.FirebaseAvatarStorage) {
                try {
                    console.log("🎨 检测到头像URL，下载头像...");
                    const avatarBase64 = await window.FirebaseAvatarStorage.downloadImageAsBase64(firebaseData.avatarUrl);
                    if (avatarBase64) {
                        firebaseData.customAvatar = avatarBase64;
                        console.log("✅ 头像已下载");
                    }
                } catch (avatarError) {
                    console.warn("⚠️ 头像下载失败:", avatarError);
                }
            }

            // 比较本地和云端数据
            const localData = getLocalUISettings();
            const shouldUseFirebaseData = shouldUseRemoteData(localData, firebaseData);

            if (shouldUseFirebaseData) {
                console.log("🔄 使用Firebase UI设置更新本地");
                updateLocalUISettings(firebaseData, 'firebase');
                return firebaseData;
            } else {
                console.log("📤 本地UI设置更新，上传到Firebase");
                await uploadUISettingsToFirebase(localData);
                return localData;
            }
        } else {
            console.log("📤 Firebase无UI设置，上传本地数据");
            const localData = getLocalUISettings();
            if (localData && Object.keys(localData).length > 0) {
                await uploadUISettingsToFirebase(localData);
            }
            return localData;
        }

    } catch (error) {
        console.error("❌ 同步UI设置失败:", error);
        return null;
    }
}

/**
 * 处理远程UI设置更新
 */
function handleRemoteUISettingsUpdate(firebaseData) {
    if (syncGate.uiSettings) {
        console.log("🚫 UI设置同步门控激活，忽略远程更新");
        return;
    }

    console.log("📥 收到远程UI设置更新");

    // 如果有头像URL，下载头像
    if (firebaseData.avatarUrl && window.FirebaseAvatarStorage) {
        window.FirebaseAvatarStorage.downloadImageAsBase64(firebaseData.avatarUrl)
            .then(avatarBase64 => {
                if (avatarBase64) {
                    firebaseData.customAvatar = avatarBase64;
                }
                applyUISettingsUpdate(firebaseData);
            })
            .catch(error => {
                console.warn("⚠️ 头像下载失败:", error);
                applyUISettingsUpdate(firebaseData);
            });
    } else {
        applyUISettingsUpdate(firebaseData);
    }
}

/**
 * 应用UI设置更新
 */
function applyUISettingsUpdate(firebaseData) {
    const localData = getLocalUISettings();
    const shouldUpdate = shouldUseRemoteData(localData, firebaseData);

    if (shouldUpdate) {
        console.log("🔄 应用远程UI设置更新");
        updateLocalUISettings(firebaseData, 'firebase');

        // 显示同步通知
        showSyncNotification('界面设置已从其他设备同步');
    }
}

/**
 * 同步所有待处理数据
 */
async function syncPendingData() {
    console.log("🔄 开始同步待处理数据...");

    const promises = [];

    if (pendingSync.petData) {
        promises.push(uploadPetDataToFirebase(pendingSync.petData));
    }

    if (pendingSync.aiSettings) {
        promises.push(uploadAISettingsToFirebase(pendingSync.aiSettings));
    }

    if (pendingSync.uiSettings) {
        promises.push(uploadUISettingsToFirebase(pendingSync.uiSettings));
    }

    try {
        await Promise.all(promises);
        console.log("✅ 待处理数据同步完成");
    } catch (error) {
        console.error("❌ 待处理数据同步失败:", error);
    }
}

/**
 * 显示同步通知
 */
function showSyncNotification(message) {
    if (typeof toastr !== 'undefined') {
        toastr.info(message, '🔄 数据同步', { timeOut: 3000 });
    } else {
        console.log(`🔄 ${message}`);
    }
}

// 导出同步功能
window.FirebaseSync = {
    // 宠物数据同步
    uploadPetData: uploadPetDataToFirebase,
    syncPetData: syncPetDataFromFirebase,

    // AI设置同步
    uploadAISettings: uploadAISettingsToFirebase,
    syncAISettings: syncAISettingsFromFirebase,

    // UI设置同步
    uploadUISettings: uploadUISettingsToFirebase,
    syncUISettings: syncUISettingsFromFirebase,

    // 通用同步
    syncPending: syncPendingData,

    // 同步门控控制
    setSyncGate: (type, value) => { syncGate[type] = value; },
    getSyncGate: (type) => syncGate[type],

    // 待同步数据状态
    getPendingSync: () => ({ ...pendingSync }),
    clearPendingSync: (type) => { pendingSync[type] = null; }
};

console.log("✅ Firebase同步模块加载完成");
