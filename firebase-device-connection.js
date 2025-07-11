// Firebase设备连接系统
// 解决匿名认证跨设备用户身份统一问题

console.log("📱 Firebase设备连接模块开始加载...");

// 设备连接状态
let deviceConnectionState = {
    isPrimaryDevice: false,
    connectionCode: null,
    connectedDevices: [],
    isConnecting: false
};

/**
 * 生成设备连接码（主设备使用）
 */
async function generateDeviceConnectionCode() {
    if (!window.FirebaseService.isReady() || !window.FirebaseService.getCurrentUser()) {
        throw new Error("Firebase未就绪或用户未认证");
    }
    
    try {
        const userId = window.FirebaseService.getCurrentUser().uid;
        const db = window.FirebaseService.getFirestore();
        
        // 生成6位随机连接码
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        // 设置连接码有效期（5分钟）
        const expiresAt = Date.now() + 5 * 60 * 1000;
        
        const connectionCodeRef = doc(db, 'connectionCodes', code);
        await setDoc(connectionCodeRef, {
            userId: userId,
            createdAt: Date.now(),
            expiresAt: expiresAt,
            used: false,
            deviceInfo: {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language
            }
        });
        
        // 更新本地状态
        deviceConnectionState.connectionCode = code;
        deviceConnectionState.isPrimaryDevice = true;
        
        console.log(`✅ 设备连接码已生成: ${code}`);
        
        // 5分钟后自动清理
        setTimeout(() => {
            cleanupConnectionCode(code);
        }, 5 * 60 * 1000);
        
        return code;
        
    } catch (error) {
        console.error("❌ 生成设备连接码失败:", error);
        throw error;
    }
}

/**
 * 使用连接码连接设备（从设备使用）
 */
async function connectWithDeviceCode(code) {
    if (!window.FirebaseService.isReady()) {
        throw new Error("Firebase未就绪");
    }
    
    if (!code || code.length !== 6) {
        throw new Error("连接码格式无效");
    }
    
    try {
        deviceConnectionState.isConnecting = true;
        
        const db = window.FirebaseService.getFirestore();
        const connectionCodeRef = doc(db, 'connectionCodes', code.toUpperCase());
        const docSnap = await getDoc(connectionCodeRef);
        
        if (!docSnap.exists()) {
            throw new Error("连接码不存在或已过期");
        }
        
        const codeData = docSnap.data();
        
        // 检查连接码是否有效
        if (codeData.used) {
            throw new Error("连接码已被使用");
        }
        
        if (Date.now() > codeData.expiresAt) {
            throw new Error("连接码已过期");
        }
        
        // 获取主设备的用户ID
        const primaryUserId = codeData.userId;
        
        console.log(`🔗 正在连接到主设备用户: ${primaryUserId}`);
        
        // 标记连接码为已使用
        await setDoc(connectionCodeRef, { used: true }, { merge: true });
        
        // 采用主设备的用户数据
        await adoptPrimaryUserData(primaryUserId);
        
        // 记录设备连接
        await recordDeviceConnection(primaryUserId);
        
        // 更新本地状态
        deviceConnectionState.isPrimaryDevice = false;
        deviceConnectionState.isConnecting = false;
        
        console.log("✅ 设备连接成功");
        
        // 显示成功通知
        if (typeof toastr !== 'undefined') {
            toastr.success("设备连接成功！数据将自动同步", "🔗 设备连接", { timeOut: 5000 });
        }
        
        return true;
        
    } catch (error) {
        deviceConnectionState.isConnecting = false;
        console.error("❌ 设备连接失败:", error);
        throw error;
    }
}

/**
 * 采用主设备的用户数据
 */
async function adoptPrimaryUserData(primaryUserId) {
    try {
        const db = window.FirebaseService.getFirestore();
        
        console.log("📥 正在采用主设备数据...");
        
        // 获取主设备的所有数据
        const petDataRef = doc(db, 'users', primaryUserId, 'data', 'petData');
        const aiSettingsRef = doc(db, 'users', primaryUserId, 'data', 'aiSettings');
        const uiSettingsRef = doc(db, 'users', primaryUserId, 'data', 'uiSettings');
        
        const [petDataSnap, aiSettingsSnap, uiSettingsSnap] = await Promise.all([
            getDoc(petDataRef),
            getDoc(aiSettingsRef),
            getDoc(uiSettingsRef)
        ]);
        
        // 采用宠物数据
        if (petDataSnap.exists()) {
            const petData = petDataSnap.data();
            window.FirebaseSync.setSyncGate('petData', true);
            updateLocalPetData(petData, 'firebase');
            window.FirebaseSync.setSyncGate('petData', false);
            console.log("✅ 已采用主设备宠物数据");
        }
        
        // 采用AI设置
        if (aiSettingsSnap.exists()) {
            const aiSettings = aiSettingsSnap.data();
            
            // 解密API密钥
            if (aiSettings.apiKey) {
                try {
                    aiSettings.apiKey = atob(aiSettings.apiKey);
                } catch (e) {
                    console.warn("⚠️ API密钥解密失败");
                }
            }
            
            window.FirebaseSync.setSyncGate('aiSettings', true);
            updateLocalAISettings(aiSettings, 'firebase');
            window.FirebaseSync.setSyncGate('aiSettings', false);
            console.log("✅ 已采用主设备AI设置");
        }
        
        // 采用UI设置
        if (uiSettingsSnap.exists()) {
            const uiSettings = uiSettingsSnap.data();
            window.FirebaseSync.setSyncGate('uiSettings', true);
            updateLocalUISettings(uiSettings, 'firebase');
            window.FirebaseSync.setSyncGate('uiSettings', false);
            console.log("✅ 已采用主设备UI设置");
        }
        
        // 强制刷新UI
        if (typeof window.updatePetDisplay === 'function') {
            window.updatePetDisplay();
        }
        if (typeof window.loadAISettings === 'function') {
            window.loadAISettings();
        }
        
        console.log("🎉 主设备数据采用完成");
        
    } catch (error) {
        console.error("❌ 采用主设备数据失败:", error);
        throw error;
    }
}

/**
 * 记录设备连接信息
 */
async function recordDeviceConnection(primaryUserId) {
    try {
        const db = window.FirebaseService.getFirestore();
        const currentUser = window.FirebaseService.getCurrentUser();
        
        const deviceId = generateDeviceId();
        const deviceRef = doc(db, 'users', primaryUserId, 'devices', deviceId);
        
        await setDoc(deviceRef, {
            deviceId: deviceId,
            userId: currentUser.uid,
            connectedAt: Date.now(),
            lastActiveAt: Date.now(),
            deviceInfo: {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language,
                screenResolution: `${screen.width}x${screen.height}`
            },
            isActive: true
        });
        
        console.log(`📱 设备连接已记录: ${deviceId}`);
        
    } catch (error) {
        console.error("❌ 记录设备连接失败:", error);
    }
}

/**
 * 生成设备唯一标识
 */
function generateDeviceId() {
    // 基于设备特征生成唯一ID
    const deviceFingerprint = [
        navigator.userAgent,
        navigator.language,
        screen.width,
        screen.height,
        new Date().getTimezoneOffset()
    ].join('|');
    
    // 简单哈希
    let hash = 0;
    for (let i = 0; i < deviceFingerprint.length; i++) {
        const char = deviceFingerprint.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // 转换为32位整数
    }
    
    return Math.abs(hash).toString(36);
}

/**
 * 清理过期的连接码
 */
async function cleanupConnectionCode(code) {
    try {
        const db = window.FirebaseService.getFirestore();
        const connectionCodeRef = doc(db, 'connectionCodes', code);
        
        // 检查连接码是否仍然存在且未使用
        const docSnap = await getDoc(connectionCodeRef);
        if (docSnap.exists() && !docSnap.data().used) {
            await deleteDoc(connectionCodeRef);
            console.log(`🧹 已清理过期连接码: ${code}`);
        }
        
        // 清理本地状态
        if (deviceConnectionState.connectionCode === code) {
            deviceConnectionState.connectionCode = null;
        }
        
    } catch (error) {
        console.error("❌ 清理连接码失败:", error);
    }
}

/**
 * 获取已连接的设备列表
 */
async function getConnectedDevices() {
    if (!window.FirebaseService.isReady() || !window.FirebaseService.getCurrentUser()) {
        return [];
    }
    
    try {
        const userId = window.FirebaseService.getCurrentUser().uid;
        const db = window.FirebaseService.getFirestore();
        
        const devicesRef = collection(db, 'users', userId, 'devices');
        const q = query(devicesRef, where('isActive', '==', true), orderBy('connectedAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const devices = [];
        querySnapshot.forEach((doc) => {
            devices.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        deviceConnectionState.connectedDevices = devices;
        return devices;
        
    } catch (error) {
        console.error("❌ 获取设备列表失败:", error);
        return [];
    }
}

/**
 * 断开设备连接
 */
async function disconnectDevice(deviceId) {
    if (!window.FirebaseService.isReady() || !window.FirebaseService.getCurrentUser()) {
        throw new Error("Firebase未就绪或用户未认证");
    }
    
    try {
        const userId = window.FirebaseService.getCurrentUser().uid;
        const db = window.FirebaseService.getFirestore();
        
        const deviceRef = doc(db, 'users', userId, 'devices', deviceId);
        await setDoc(deviceRef, { 
            isActive: false, 
            disconnectedAt: Date.now() 
        }, { merge: true });
        
        console.log(`📱 设备已断开连接: ${deviceId}`);
        
        // 更新本地设备列表
        await getConnectedDevices();
        
        return true;
        
    } catch (error) {
        console.error("❌ 断开设备连接失败:", error);
        throw error;
    }
}

// 导出设备连接功能
window.FirebaseDeviceConnection = {
    // 连接码管理
    generateCode: generateDeviceConnectionCode,
    connectWithCode: connectWithDeviceCode,
    
    // 设备管理
    getDevices: getConnectedDevices,
    disconnectDevice: disconnectDevice,
    
    // 状态查询
    getState: () => ({ ...deviceConnectionState }),
    isPrimary: () => deviceConnectionState.isPrimaryDevice,
    isConnecting: () => deviceConnectionState.isConnecting,
    
    // 工具函数
    generateDeviceId: generateDeviceId
};

console.log("✅ Firebase设备连接模块加载完成");
