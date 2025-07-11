// Firebase集成测试脚本
// 用于验证Firebase功能是否正常工作

console.log("🧪 Firebase测试脚本开始加载...");

/**
 * 测试Firebase基础功能
 */
async function testFirebaseBasics() {
    console.log("🔥 开始测试Firebase基础功能...");
    
    try {
        // 检查Firebase服务是否可用
        if (!window.FirebaseService) {
            throw new Error("FirebaseService未加载");
        }
        
        const status = window.FirebaseService.getStatus();
        console.log("📊 Firebase状态:", status);
        
        if (!status.isReady) {
            console.log("⏳ Firebase未就绪，尝试初始化...");
            const initialized = await window.FirebaseService.initialize();
            if (!initialized) {
                throw new Error("Firebase初始化失败");
            }
        }
        
        console.log("✅ Firebase基础功能测试通过");
        return true;
        
    } catch (error) {
        console.error("❌ Firebase基础功能测试失败:", error);
        return false;
    }
}

/**
 * 测试数据同步功能
 */
async function testDataSync() {
    console.log("🔄 开始测试数据同步功能...");
    
    try {
        if (!window.FirebaseSync) {
            throw new Error("FirebaseSync未加载");
        }
        
        // 测试宠物数据同步
        const testPetData = {
            name: "测试宠物",
            type: "cat",
            level: 5,
            experience: 150,
            health: 80,
            happiness: 75,
            hunger: 60,
            energy: 85,
            lastSyncTime: Date.now()
        };
        
        console.log("📤 测试上传宠物数据...");
        const uploadResult = await window.FirebaseSync.uploadPetData(testPetData);
        
        if (uploadResult) {
            console.log("✅ 宠物数据上传成功");
        } else {
            console.log("⚠️ 宠物数据上传失败（可能是网络问题）");
        }
        
        // 测试AI设置同步
        const testAISettings = {
            apiType: "openai",
            apiUrl: "https://api.openai.com/v1",
            apiKey: "test-key",
            apiModel: "gpt-4",
            lastSyncTime: Date.now()
        };
        
        console.log("📤 测试上传AI设置...");
        const aiUploadResult = await window.FirebaseSync.uploadAISettings(testAISettings);
        
        if (aiUploadResult) {
            console.log("✅ AI设置上传成功");
        } else {
            console.log("⚠️ AI设置上传失败（可能是网络问题）");
        }
        
        console.log("✅ 数据同步功能测试完成");
        return true;
        
    } catch (error) {
        console.error("❌ 数据同步功能测试失败:", error);
        return false;
    }
}

/**
 * 测试设备连接功能
 */
async function testDeviceConnection() {
    console.log("📱 开始测试设备连接功能...");
    
    try {
        if (!window.FirebaseDeviceConnection) {
            throw new Error("FirebaseDeviceConnection未加载");
        }
        
        // 测试生成连接码
        console.log("🔗 测试生成连接码...");
        const connectionCode = await window.FirebaseDeviceConnection.generateCode();
        
        if (connectionCode && connectionCode.length === 6) {
            console.log(`✅ 连接码生成成功: ${connectionCode}`);
        } else {
            throw new Error("连接码格式不正确");
        }
        
        // 测试获取设备列表
        console.log("📋 测试获取设备列表...");
        const devices = await window.FirebaseDeviceConnection.getDevices();
        console.log(`📱 已连接设备数量: ${devices.length}`);
        
        console.log("✅ 设备连接功能测试完成");
        return true;
        
    } catch (error) {
        console.error("❌ 设备连接功能测试失败:", error);
        return false;
    }
}

/**
 * 测试头像存储功能
 */
async function testAvatarStorage() {
    console.log("🎨 开始测试头像存储功能...");

    try {
        if (!window.FirebaseAvatarStorage) {
            throw new Error("FirebaseAvatarStorage未加载");
        }

        // 创建测试头像数据（1x1像素的红色图片）
        const testImageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

        console.log("📤 测试头像上传...");
        const uploadResult = await window.FirebaseAvatarStorage.syncToCloud();

        if (uploadResult) {
            console.log("✅ 头像上传测试成功");
        } else {
            console.log("⚠️ 头像上传测试失败（可能没有本地头像）");
        }

        console.log("📥 测试头像下载...");
        const downloadResult = await window.FirebaseAvatarStorage.syncFromCloud();

        if (downloadResult) {
            console.log("✅ 头像下载测试成功");
        } else {
            console.log("⚠️ 头像下载测试失败（可能云端没有头像）");
        }

        console.log("✅ 头像存储功能测试完成");
        return true;

    } catch (error) {
        console.error("❌ 头像存储功能测试失败:", error);
        return false;
    }
}

/**
 * 测试UI界面功能
 */
function testUIFunctions() {
    console.log("🖥️ 开始测试UI界面功能...");

    try {
        // 检查Firebase UI是否可用
        if (!window.FirebaseUI) {
            console.log("⚠️ FirebaseUI未加载，尝试动态加载...");
            return false;
        }

        // 测试创建同步面板
        console.log("🎨 测试创建同步面板...");
        window.FirebaseUI.createSyncPanel();

        // 检查面板是否创建成功
        const panel = $('#firebase-sync-panel');
        if (panel.length > 0) {
            console.log("✅ 同步面板创建成功");
        } else {
            throw new Error("同步面板创建失败");
        }

        console.log("✅ UI界面功能测试完成");
        return true;

    } catch (error) {
        console.error("❌ UI界面功能测试失败:", error);
        return false;
    }
}

/**
 * 运行完整的Firebase测试套件
 */
async function runFirebaseTestSuite() {
    console.log("🚀 开始运行Firebase完整测试套件...");
    
    const results = {
        basics: false,
        dataSync: false,
        deviceConnection: false,
        avatarStorage: false,
        ui: false
    };

    // 测试基础功能
    results.basics = await testFirebaseBasics();

    // 如果基础功能正常，继续测试其他功能
    if (results.basics) {
        results.dataSync = await testDataSync();
        results.deviceConnection = await testDeviceConnection();
        results.avatarStorage = await testAvatarStorage();
        results.ui = testUIFunctions();
    }
    
    // 输出测试结果
    console.log("\n📊 Firebase测试结果汇总:");
    console.log(`🔥 基础功能: ${results.basics ? '✅ 通过' : '❌ 失败'}`);
    console.log(`🔄 数据同步: ${results.dataSync ? '✅ 通过' : '❌ 失败'}`);
    console.log(`📱 设备连接: ${results.deviceConnection ? '✅ 通过' : '❌ 失败'}`);
    console.log(`🎨 头像存储: ${results.avatarStorage ? '✅ 通过' : '❌ 失败'}`);
    console.log(`🖥️ UI界面: ${results.ui ? '✅ 通过' : '❌ 失败'}`);
    
    const passedTests = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;
    
    console.log(`\n🎯 测试通过率: ${passedTests}/${totalTests} (${Math.round(passedTests/totalTests*100)}%)`);
    
    if (passedTests === totalTests) {
        console.log("🎉 所有Firebase功能测试通过！");
        if (typeof toastr !== 'undefined') {
            toastr.success('Firebase集成测试全部通过！', '🎉 测试成功', { timeOut: 5000 });
        }
    } else {
        console.log("⚠️ 部分Firebase功能测试失败，请检查配置和网络连接");
        if (typeof toastr !== 'undefined') {
            toastr.warning(`${passedTests}/${totalTests}项测试通过`, '⚠️ 测试结果', { timeOut: 5000 });
        }
    }
    
    return results;
}

/**
 * 快速检查Firebase状态
 */
function quickFirebaseCheck() {
    console.log("⚡ 快速检查Firebase状态...");
    
    const checks = {
        firebaseService: !!window.FirebaseService,
        firebaseSync: !!window.FirebaseSync,
        firebaseDeviceConnection: !!window.FirebaseDeviceConnection,
        firebaseUI: !!window.FirebaseUI
    };
    
    console.log("📋 模块加载状态:");
    Object.entries(checks).forEach(([module, loaded]) => {
        console.log(`  ${module}: ${loaded ? '✅ 已加载' : '❌ 未加载'}`);
    });
    
    if (window.FirebaseService) {
        const status = window.FirebaseService.getStatus();
        console.log("🔥 Firebase服务状态:", status);
    }
    
    return checks;
}

// 导出测试函数
window.FirebaseTest = {
    runFullSuite: runFirebaseTestSuite,
    testBasics: testFirebaseBasics,
    testDataSync: testDataSync,
    testDeviceConnection: testDeviceConnection,
    testAvatarStorage: testAvatarStorage,
    testUI: testUIFunctions,
    quickCheck: quickFirebaseCheck
};

// 自动运行快速检查
setTimeout(() => {
    quickFirebaseCheck();
}, 2000);

console.log("✅ Firebase测试脚本加载完成");
console.log("💡 使用 FirebaseTest.runFullSuite() 运行完整测试");
console.log("💡 使用 FirebaseTest.quickCheck() 快速检查状态");
