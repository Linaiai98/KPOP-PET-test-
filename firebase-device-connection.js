// Firebase设备连接系统
// 解决匿名认证跨设备用户身份统一问题

console.log("📱 Firebase设备连接模块开始加载...");

// 确保Firebase服务可用
function ensureFirebaseReady() {
    if (!window.FirebaseService || !window.FirebaseService.isReady()) {
        throw new Error("Firebase服务未就绪，请先初始化Firebase");
    }

    if (!window.FirebaseService.getCurrentUser()) {
        throw new Error("用户未认证，请先登录");
    }

    return {
        db: window.FirebaseService.getFirestore(),
        user: window.FirebaseService.getCurrentUser()
    };
}

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
    try {
        const { db, user } = ensureFirebaseReady();
        const userId = user.uid;
        
        // 生成6位随机连接码
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();

        // 设置连接码有效期（5分钟）
        const expiresAt = Date.now() + 5 * 60 * 1000;

        // 使用简化的存储方式（localStorage作为临时方案）
        const connectionCodeData = {
            userId: userId,
            createdAt: Date.now(),
            expiresAt: expiresAt,
            used: false,
            deviceInfo: {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language
            }
        };

        // 临时存储到localStorage（实际项目中应该存储到Firestore）
        localStorage.setItem(`connection-code-${code}`, JSON.stringify(connectionCodeData));

        // 更新本地状态
        deviceConnectionState.connectionCode = code;
        deviceConnectionState.isPrimaryDevice = true;

        console.log(`✅ 设备连接码已生成: ${code}`);
        console.log(`⏰ 连接码将在5分钟后过期`);

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
    if (!code || code.length !== 6) {
        throw new Error("连接码格式无效");
    }

    try {
        deviceConnectionState.isConnecting = true;

        // 从localStorage获取连接码数据（临时方案）
        const codeKey = `connection-code-${code.toUpperCase()}`;
        const codeDataStr = localStorage.getItem(codeKey);

        if (!codeDataStr) {
            throw new Error("连接码不存在或已过期");
        }

        const codeData = JSON.parse(codeDataStr);
        
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
        codeData.used = true;
        localStorage.setItem(codeKey, JSON.stringify(codeData));
        
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
        const deviceId = generateDeviceId();

        // 获取现有设备列表
        const devicesData = localStorage.getItem('connected-devices') || '[]';
        const devices = JSON.parse(devicesData);

        // 添加新设备
        const newDevice = {
            id: deviceId,
            deviceId: deviceId,
            userId: primaryUserId,
            connectedAt: Date.now(),
            lastActiveAt: Date.now(),
            deviceInfo: {
                userAgent: navigator.userAgent,
                platform: navigator.platform,
                language: navigator.language,
                screenResolution: `${screen.width}x${screen.height}`
            },
            isActive: true
        };

        devices.push(newDevice);
        localStorage.setItem('connected-devices', JSON.stringify(devices));

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
        // 从localStorage清理连接码
        const codeKey = `connection-code-${code}`;
        const codeDataStr = localStorage.getItem(codeKey);

        if (codeDataStr) {
            const codeData = JSON.parse(codeDataStr);
            if (!codeData.used) {
                localStorage.removeItem(codeKey);
                console.log(`🧹 已清理过期连接码: ${code}`);
            }
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
    try {
        // 简化版本：从localStorage获取设备信息
        const devicesData = localStorage.getItem('connected-devices') || '[]';
        const devices = JSON.parse(devicesData);

        // 过滤活跃设备
        const activeDevices = devices.filter(device => device.isActive);

        deviceConnectionState.connectedDevices = activeDevices;
        return activeDevices;

    } catch (error) {
        console.error("❌ 获取设备列表失败:", error);
        return [];
    }
}

/**
 * 断开设备连接
 */
async function disconnectDevice(deviceId) {
    try {
        // 简化版本：从localStorage更新设备状态
        const devicesData = localStorage.getItem('connected-devices') || '[]';
        const devices = JSON.parse(devicesData);

        // 找到并断开指定设备
        const deviceIndex = devices.findIndex(device => device.id === deviceId);
        if (deviceIndex !== -1) {
            devices[deviceIndex].isActive = false;
            devices[deviceIndex].disconnectedAt = Date.now();

            localStorage.setItem('connected-devices', JSON.stringify(devices));
            console.log(`📱 设备已断开连接: ${deviceId}`);
        }

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
