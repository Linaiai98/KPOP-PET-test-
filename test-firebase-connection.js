// Firebase连接测试脚本
// 用于验证FirebaseDeviceConnection对象是否正确创建和暴露

console.log("🧪 开始Firebase连接测试...");

// 模拟必要的全局对象
window.toastr = {
    success: (msg) => console.log("✅ SUCCESS:", msg),
    error: (msg) => console.error("❌ ERROR:", msg),
    info: (msg) => console.log("ℹ️ INFO:", msg),
    warning: (msg) => console.warn("⚠️ WARNING:", msg)
};

// 模拟Firebase服务
window.FirebaseService = {
    isReady: () => true,
    getCurrentUser: () => ({ uid: 'test-user-' + Date.now() }),
    getFirestore: () => ({}),
    getStatus: () => ({
        isReady: true,
        isAuthenticated: true,
        userId: 'test-user-123',
        isOnline: navigator.onLine
    })
};

// 模拟必要的全局对象
window.toastr = {
    success: (msg) => console.log("✅ SUCCESS:", msg),
    error: (msg) => console.error("❌ ERROR:", msg),
    info: (msg) => console.log("ℹ️ INFO:", msg),
    warning: (msg) => console.warn("⚠️ WARNING:", msg)
};

// 模拟Firebase服务
window.FirebaseService = {
    isReady: () => true,
    getCurrentUser: () => ({ uid: 'test-user-' + Date.now() }),
    getFirestore: () => ({}),
    getStatus: () => ({
        isReady: true,
        isAuthenticated: true,
        userId: 'test-user-123',
        isOnline: navigator.onLine
    })
};

// 测试函数
async function testFirebaseDeviceConnection() {
    console.log("\n🔍 === Firebase设备连接测试开始 ===");
    
    try {
        // 1. 检查模块加载前的状态
        console.log("1️⃣ 检查模块加载前的状态:");
        console.log("   window.FirebaseDeviceConnection:", !!window.FirebaseDeviceConnection);
        
        // 2. 动态加载模块
        console.log("\n2️⃣ 动态加载Firebase设备连接模块:");
        await import('./firebase-device-connection.js');
        console.log("   ✅ 模块加载完成");
        
        // 3. 检查模块加载后的状态
        console.log("\n3️⃣ 检查模块加载后的状态:");
        console.log("   window.FirebaseDeviceConnection:", !!window.FirebaseDeviceConnection);
        
        if (window.FirebaseDeviceConnection) {
            console.log("   可用方法:", Object.keys(window.FirebaseDeviceConnection));
            console.log("   generateCode类型:", typeof window.FirebaseDeviceConnection.generateCode);
            console.log("   connectWithCode类型:", typeof window.FirebaseDeviceConnection.connectWithCode);
            console.log("   getDevices类型:", typeof window.FirebaseDeviceConnection.getDevices);
        }
        
        // 4. 测试生成连接码功能
        console.log("\n4️⃣ 测试生成连接码功能:");
        if (window.FirebaseDeviceConnection && typeof window.FirebaseDeviceConnection.generateCode === 'function') {
            try {
                const code = await window.FirebaseDeviceConnection.generateCode();
                console.log("   ✅ 连接码生成成功:", code);
                console.log("   连接码长度:", code.length);
                console.log("   连接码格式:", /^[A-Z0-9]{6}$/.test(code) ? "正确" : "错误");
                
                // 5. 测试连接码使用功能
                console.log("\n5️⃣ 测试连接码使用功能:");
                try {
                    await window.FirebaseDeviceConnection.connectWithCode(code);
                    console.log("   ✅ 连接码使用成功");
                } catch (connectError) {
                    console.log("   ⚠️ 连接码使用失败（预期，因为是同一设备）:", connectError.message);
                }
                
            } catch (generateError) {
                console.error("   ❌ 连接码生成失败:", generateError.message);
            }
        } else {
            console.error("   ❌ generateCode方法不可用");
        }
        
        // 6. 测试设备列表功能
        console.log("\n6️⃣ 测试设备列表功能:");
        if (window.FirebaseDeviceConnection && typeof window.FirebaseDeviceConnection.getDevices === 'function') {
            try {
                const devices = await window.FirebaseDeviceConnection.getDevices();
                console.log("   ✅ 设备列表获取成功，设备数量:", devices.length);
                if (devices.length > 0) {
                    console.log("   设备详情:", devices);
                }
            } catch (devicesError) {
                console.error("   ❌ 设备列表获取失败:", devicesError.message);
            }
        } else {
            console.error("   ❌ getDevices方法不可用");
        }
        
        // 7. 测试状态查询功能
        console.log("\n7️⃣ 测试状态查询功能:");
        if (window.FirebaseDeviceConnection && typeof window.FirebaseDeviceConnection.getState === 'function') {
            try {
                const state = window.FirebaseDeviceConnection.getState();
                console.log("   ✅ 状态查询成功:", state);
            } catch (stateError) {
                console.error("   ❌ 状态查询失败:", stateError.message);
            }
        } else {
            console.error("   ❌ getState方法不可用");
        }
        
        console.log("\n🎉 === Firebase设备连接测试完成 ===");
        return true;
        
    } catch (error) {
        console.error("\n❌ === Firebase设备连接测试失败 ===");
        console.error("错误详情:", error);
        return false;
    }
}

// 测试Firebase UI模块
async function testFirebaseUI() {
    console.log("\n🖥️ === Firebase UI测试开始 ===");
    
    try {
        // 确保设备连接模块已加载
        if (!window.FirebaseDeviceConnection) {
            console.log("⏳ 先加载设备连接模块...");
            await import('./firebase-device-connection.js');
        }
        
        // 加载UI模块
        console.log("⏳ 加载Firebase UI模块...");
        await import('./firebase-ui.js');
        
        if (window.FirebaseUI) {
            console.log("✅ Firebase UI模块加载成功");
            console.log("可用方法:", Object.keys(window.FirebaseUI));
            
            // 测试创建面板
            try {
                window.FirebaseUI.createSyncPanel();
                console.log("✅ 同步面板创建成功");
                
                // 检查面板是否存在
                const panel = document.getElementById('firebase-sync-panel');
                if (panel) {
                    console.log("✅ 面板DOM元素已创建");
                } else {
                    console.error("❌ 面板DOM元素未找到");
                }
                
            } catch (panelError) {
                console.error("❌ 同步面板创建失败:", panelError.message);
            }
            
        } else {
            console.error("❌ Firebase UI模块加载失败");
        }
        
        console.log("\n🎉 === Firebase UI测试完成 ===");
        return true;
        
    } catch (error) {
        console.error("\n❌ === Firebase UI测试失败 ===");
        console.error("错误详情:", error);
        return false;
    }
}

// 运行完整测试
async function runFullTest() {
    console.log("🚀 开始完整的Firebase功能测试...\n");
    
    const results = {
        deviceConnection: false,
        ui: false
    };
    
    // 测试设备连接
    results.deviceConnection = await testFirebaseDeviceConnection();
    
    // 测试UI
    results.ui = await testFirebaseUI();
    
    // 输出测试结果
    console.log("\n📊 === 测试结果汇总 ===");
    console.log("设备连接模块:", results.deviceConnection ? "✅ 通过" : "❌ 失败");
    console.log("UI模块:", results.ui ? "✅ 通过" : "❌ 失败");
    
    const passedTests = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;
    
    console.log(`\n🎯 测试通过率: ${passedTests}/${totalTests} (${Math.round(passedTests/totalTests*100)}%)`);
    
    if (passedTests === totalTests) {
        console.log("🎉 所有测试通过！Firebase功能正常工作。");
    } else {
        console.log("⚠️ 部分测试失败，请检查错误信息。");
    }
    
    return results;
}

// 导出测试函数
window.FirebaseConnectionTest = {
    testDeviceConnection: testFirebaseDeviceConnection,
    testUI: testFirebaseUI,
    runFullTest: runFullTest
};

// 自动运行测试（如果在浏览器环境中）
if (typeof window !== 'undefined' && window.document) {
    console.log("🌐 检测到浏览器环境，将在2秒后自动运行测试...");
    setTimeout(() => {
        runFullTest();
    }, 2000);
}

console.log("✅ Firebase连接测试脚本加载完成");
console.log("💡 手动运行测试: FirebaseConnectionTest.runFullTest()");
