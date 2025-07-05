// 测试虚拟宠物插件加载
console.log("🧪 开始测试插件加载...");

// 检查jQuery是否可用
if (typeof jQuery !== 'undefined') {
    console.log("✅ jQuery 可用");
    
    jQuery(document).ready(function() {
        console.log("✅ jQuery ready 事件触发");
        
        // 检查SillyTavern环境
        if (typeof window.extension_settings !== 'undefined') {
            console.log("✅ SillyTavern extension_settings 可用");
        } else {
            console.log("❌ SillyTavern extension_settings 不可用");
        }
        
        // 检查是否有虚拟宠物按钮
        const existingButton = $('#virtual-pet-button');
        if (existingButton.length > 0) {
            console.log("✅ 找到现有的虚拟宠物按钮");
        } else {
            console.log("❌ 未找到虚拟宠物按钮");
        }
        
        // 检查扩展设置
        const settingsPanel = $('#extensions_settings');
        if (settingsPanel.length > 0) {
            console.log("✅ 找到扩展设置面板");
            
            // 查找虚拟宠物设置
            const petSettings = settingsPanel.find('[data-extension="virtual-pet-system"]');
            if (petSettings.length > 0) {
                console.log("✅ 找到虚拟宠物设置");
            } else {
                console.log("❌ 未找到虚拟宠物设置");
            }
        } else {
            console.log("❌ 未找到扩展设置面板");
        }
        
        // 检查控制台错误
        console.log("🔍 请检查控制台是否有JavaScript错误");
        
        // 尝试手动创建一个测试按钮
        if ($('#test-virtual-pet-button').length === 0) {
            const testButton = $(`
                <div id="test-virtual-pet-button" style="
                    position: fixed;
                    top: 100px;
                    right: 20px;
                    width: 60px;
                    height: 60px;
                    background: #FF69B4;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    z-index: 9999;
                    font-size: 24px;
                ">🧪</div>
            `);
            
            testButton.click(function() {
                alert('测试按钮工作正常！这说明jQuery和DOM操作都没问题。');
            });
            
            $('body').append(testButton);
            console.log("✅ 创建了测试按钮（右上角的🧪）");
        }
    });
} else {
    console.log("❌ jQuery 不可用");
}

// 检查主插件文件是否有语法错误
console.log("🔍 检查主插件文件...");

// 尝试加载主插件的关键函数
try {
    // 检查是否有全局函数
    if (typeof window.testVirtualPet === 'function') {
        console.log("✅ 找到 testVirtualPet 函数");
    } else {
        console.log("❌ 未找到 testVirtualPet 函数");
    }
    
    if (typeof window.forceShowPetButton === 'function') {
        console.log("✅ 找到 forceShowPetButton 函数");
    } else {
        console.log("❌ 未找到 forceShowPetButton 函数");
    }
    
} catch (error) {
    console.error("❌ 检查全局函数时出错:", error);
}

console.log("🧪 插件加载测试完成");
