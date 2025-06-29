// 虚拟宠物系统 - 卸载功能测试脚本
// 在浏览器控制台中运行此脚本来测试卸载功能

console.log("🧪 开始测试虚拟宠物系统卸载功能...");

/**
 * 测试卸载功能的完整性
 */
function testUninstallFunction() {
    console.log("\n=== 测试1: 检查卸载函数是否存在 ===");
    
    const functions = [
        'uninstallVirtualPetSystem',
        'checkVirtualPetLeftovers', 
        'forceCleanVirtualPetData'
    ];
    
    functions.forEach(funcName => {
        if (typeof window[funcName] === 'function') {
            console.log(`✅ ${funcName} - 函数存在`);
        } else {
            console.log(`❌ ${funcName} - 函数不存在`);
        }
    });
}

/**
 * 测试数据检查功能
 */
function testDataCheck() {
    console.log("\n=== 测试2: 检查数据检测功能 ===");
    
    if (typeof window.checkVirtualPetLeftovers === 'function') {
        try {
            const leftovers = window.checkVirtualPetLeftovers();
            console.log(`✅ 数据检查功能正常，发现 ${leftovers.length} 项数据`);
            return leftovers;
        } catch (error) {
            console.log(`❌ 数据检查功能出错: ${error.message}`);
            return null;
        }
    } else {
        console.log("❌ 数据检查函数不存在");
        return null;
    }
}

/**
 * 测试DOM元素检查
 */
function testDOMCheck() {
    console.log("\n=== 测试3: 检查DOM元素 ===");
    
    const selectors = [
        '#virtual-pet-button',
        '#virtual-pet-popup-overlay',
        '.virtual-pet-popup-overlay',
        '#virtual-pet-settings',
        '.pet-notification'
    ];
    
    let foundElements = 0;
    
    selectors.forEach(selector => {
        const elements = $(selector);
        if (elements.length > 0) {
            console.log(`🔍 ${selector} - 找到 ${elements.length} 个元素`);
            foundElements += elements.length;
        } else {
            console.log(`✅ ${selector} - 无元素`);
        }
    });
    
    return foundElements;
}

/**
 * 测试localStorage检查
 */
function testLocalStorageCheck() {
    console.log("\n=== 测试4: 检查localStorage ===");
    
    const keys = [
        'virtual-pet-button-position',
        'virtual-pet-enabled',
        'virtual-pet-data',
        'virtual-pet-custom-avatar',
        'virtual-pet-system-notifications',
        'virtual-pet-system-last-notification',
        'virtual-pet-system-auto-save'
    ];
    
    let foundKeys = 0;
    
    keys.forEach(key => {
        const value = localStorage.getItem(key);
        if (value !== null) {
            console.log(`🔍 ${key} - 存在数据`);
            foundKeys++;
        } else {
            console.log(`✅ ${key} - 无数据`);
        }
    });
    
    return foundKeys;
}

/**
 * 模拟卸载测试（不实际执行）
 */
function testUninstallSimulation() {
    console.log("\n=== 测试5: 模拟卸载过程 ===");
    
    console.log("📋 卸载过程将包括以下步骤：");
    console.log("1. 移除DOM元素");
    console.log("2. 清理localStorage数据");
    console.log("3. 解绑事件监听器");
    console.log("4. 移除CSS样式");
    console.log("5. 清理全局变量");
    
    console.log("\n⚠️  注意：这只是模拟，没有实际执行卸载");
    console.log("💡 要执行真正的卸载，请运行: uninstallVirtualPetSystem()");
}

/**
 * 运行所有测试
 */
function runAllTests() {
    console.log("🧪 虚拟宠物系统卸载功能测试");
    console.log("=====================================");
    
    testUninstallFunction();
    const leftovers = testDataCheck();
    const domElements = testDOMCheck();
    const storageKeys = testLocalStorageCheck();
    testUninstallSimulation();
    
    console.log("\n=== 测试总结 ===");
    console.log(`DOM元素数量: ${domElements}`);
    console.log(`localStorage键数量: ${storageKeys}`);
    console.log(`检测到的残留数据: ${leftovers ? leftovers.length : '未知'}`);
    
    if (domElements === 0 && storageKeys === 0) {
        console.log("✅ 系统干净，没有发现虚拟宠物系统数据");
    } else {
        console.log("🔍 发现虚拟宠物系统数据，可能需要清理");
        console.log("💡 运行 uninstallVirtualPetSystem() 进行清理");
    }
    
    console.log("\n📖 更多信息请查看 UNINSTALL.md 文档");
}

/**
 * 快速检查函数
 */
function quickCheck() {
    console.log("🔍 快速检查虚拟宠物系统状态...");
    
    const hasButton = $('#virtual-pet-button').length > 0;
    const hasData = localStorage.getItem('virtual-pet-data') !== null;
    const hasSettings = $('#virtual-pet-settings').length > 0;
    
    console.log(`浮动按钮: ${hasButton ? '存在' : '不存在'}`);
    console.log(`宠物数据: ${hasData ? '存在' : '不存在'}`);
    console.log(`设置面板: ${hasSettings ? '存在' : '不存在'}`);
    
    if (!hasButton && !hasData && !hasSettings) {
        console.log("✅ 系统已清理");
    } else {
        console.log("🔍 系统仍有数据");
    }
}

// 导出测试函数到全局作用域
window.testVirtualPetUninstall = runAllTests;
window.quickCheckVirtualPet = quickCheck;

// 自动运行测试
console.log("💡 可用的测试命令：");
console.log("- testVirtualPetUninstall() - 运行完整测试");
console.log("- quickCheckVirtualPet() - 快速检查状态");
console.log("- uninstallVirtualPetSystem() - 执行完整卸载");
console.log("- checkVirtualPetLeftovers() - 检查残留数据");

// 运行快速检查
quickCheck();
