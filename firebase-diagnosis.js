// Firebase诊断脚本
// 用于详细诊断Firebase初始化问题

console.log("🔬 Firebase诊断脚本开始...");

// 诊断函数
async function diagnoseFirebaseIssue() {
    console.log("\n🔍 === Firebase完整诊断开始 ===");
    
    const results = {
        step1_initial_check: false,
        step2_config_load: false,
        step3_service_available: false,
        step4_service_initialized: false,
        step5_user_authenticated: false,
        step6_device_connection_ready: false
    };
    
    try {
        // 步骤1: 初始状态检查
        console.log("\n1️⃣ 初始状态检查:");
        console.log("   window.FirebaseService:", !!window.FirebaseService);
        console.log("   window.FirebaseDeviceConnection:", !!window.FirebaseDeviceConnection);
        console.log("   window.FirebaseSync:", !!window.FirebaseSync);
        console.log("   window.FirebaseUI:", !!window.FirebaseUI);
        results.step1_initial_check = true;
        
        // 步骤2: 加载Firebase配置模块
        console.log("\n2️⃣ 加载Firebase配置模块:");
        if (!window.FirebaseService) {
            console.log("   正在加载firebase-config.js...");
            await import('./firebase-config.js');
            console.log("   ✅ firebase-config.js加载完成");
        }
        
        if (window.FirebaseService) {
            console.log("   ✅ FirebaseService对象已创建");
            console.log("   可用方法:", Object.keys(window.FirebaseService));
            results.step2_config_load = true;
        } else {
            throw new Error("FirebaseService对象未创建");
        }
        
        // 步骤3: 检查服务可用性
        console.log("\n3️⃣ 检查服务可用性:");
        const serviceStatus = window.FirebaseService.getStatus();
        console.log("   服务状态:", serviceStatus);
        results.step3_service_available = true;
        
        // 步骤4: 初始化Firebase服务
        console.log("\n4️⃣ 初始化Firebase服务:");
        if (!window.FirebaseService.isReady()) {
            console.log("   Firebase服务未初始化，开始初始化...");
            const initResult = await window.FirebaseService.initialize();
            console.log("   初始化结果:", initResult);
            
            if (initResult) {
                console.log("   ✅ Firebase服务初始化成功");
                results.step4_service_initialized = true;
            } else {
                throw new Error("Firebase服务初始化失败");
            }
        } else {
            console.log("   ✅ Firebase服务已初始化");
            results.step4_service_initialized = true;
        }
        
        // 步骤5: 检查用户认证
        console.log("\n5️⃣ 检查用户认证:");
        const currentUser = window.FirebaseService.getCurrentUser();
        if (currentUser) {
            console.log("   ✅ 用户已认证:", currentUser.uid);
            results.step5_user_authenticated = true;
        } else {
            console.log("   ⚠️ 用户未认证，等待匿名登录...");
            // 等待一段时间让匿名登录完成
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const userAfterWait = window.FirebaseService.getCurrentUser();
            if (userAfterWait) {
                console.log("   ✅ 用户认证成功:", userAfterWait.uid);
                results.step5_user_authenticated = true;
            } else {
                throw new Error("用户认证失败");
            }
        }
        
        // 步骤6: 加载设备连接模块并测试
        console.log("\n6️⃣ 加载设备连接模块并测试:");
        if (!window.FirebaseDeviceConnection) {
            console.log("   正在加载firebase-device-connection.js...");
            await import('./firebase-device-connection.js');
            console.log("   ✅ firebase-device-connection.js加载完成");
        }
        
        if (window.FirebaseDeviceConnection) {
            console.log("   ✅ FirebaseDeviceConnection对象已创建");
            console.log("   可用方法:", Object.keys(window.FirebaseDeviceConnection));
            
            // 测试生成连接码
            try {
                console.log("   测试生成连接码...");
                const code = await window.FirebaseDeviceConnection.generateCode();
                console.log("   ✅ 连接码生成成功:", code);
                results.step6_device_connection_ready = true;
            } catch (codeError) {
                console.error("   ❌ 连接码生成失败:", codeError.message);
                throw codeError;
            }
        } else {
            throw new Error("FirebaseDeviceConnection对象未创建");
        }
        
        console.log("\n🎉 === Firebase诊断完成，所有步骤成功 ===");
        
    } catch (error) {
        console.error("\n❌ === Firebase诊断失败 ===");
        console.error("失败步骤:", error.message);
        console.error("错误详情:", error);
    }
    
    // 输出诊断结果
    console.log("\n📊 === 诊断结果汇总 ===");
    Object.entries(results).forEach(([step, success]) => {
        const stepName = step.replace(/_/g, ' ').replace(/step\d+ /, '');
        console.log(`${success ? '✅' : '❌'} ${stepName}`);
    });
    
    const passedSteps = Object.values(results).filter(Boolean).length;
    const totalSteps = Object.keys(results).length;
    console.log(`\n🎯 诊断通过率: ${passedSteps}/${totalSteps} (${Math.round(passedSteps/totalSteps*100)}%)`);
    
    return results;
}

// 快速状态检查
function quickStatusCheck() {
    console.log("\n⚡ === 快速状态检查 ===");
    
    const status = {
        FirebaseService: !!window.FirebaseService,
        isReady: window.FirebaseService ? window.FirebaseService.isReady() : false,
        currentUser: window.FirebaseService ? !!window.FirebaseService.getCurrentUser() : false,
        FirebaseDeviceConnection: !!window.FirebaseDeviceConnection,
        generateCode: window.FirebaseDeviceConnection ? typeof window.FirebaseDeviceConnection.generateCode : 'N/A'
    };
    
    console.log("状态概览:", status);
    
    if (window.FirebaseService && window.FirebaseService.getStatus) {
        console.log("详细状态:", window.FirebaseService.getStatus());
    }
    
    return status;
}

// 模拟SillyTavern环境
function setupMockEnvironment() {
    console.log("🎭 设置模拟环境...");
    
    // 模拟toastr
    if (!window.toastr) {
        window.toastr = {
            success: (msg) => console.log("✅ TOASTR SUCCESS:", msg),
            error: (msg) => console.error("❌ TOASTR ERROR:", msg),
            info: (msg) => console.log("ℹ️ TOASTR INFO:", msg),
            warning: (msg) => console.warn("⚠️ TOASTR WARNING:", msg)
        };
    }
    
    // 模拟jQuery（如果需要）
    if (!window.$ && !window.jQuery) {
        console.log("⚠️ jQuery未加载，某些功能可能不可用");
    }
    
    console.log("✅ 模拟环境设置完成");
}

// 导出诊断函数
window.FirebaseDiagnosis = {
    diagnose: diagnoseFirebaseIssue,
    quickCheck: quickStatusCheck,
    setupMock: setupMockEnvironment
};

// 自动运行快速检查
setTimeout(() => {
    console.log("🔬 自动运行快速状态检查...");
    quickStatusCheck();
    
    console.log("\n💡 可用的诊断命令:");
    console.log("   FirebaseDiagnosis.diagnose() - 完整诊断");
    console.log("   FirebaseDiagnosis.quickCheck() - 快速检查");
    console.log("   FirebaseDiagnosis.setupMock() - 设置模拟环境");
}, 1000);

console.log("✅ Firebase诊断脚本加载完成");
