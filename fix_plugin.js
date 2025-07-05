// 虚拟宠物插件修复脚本
console.log("🔧 开始修复虚拟宠物插件...");

// 1. 清理现有的插件元素
function cleanupExistingElements() {
    console.log("🧹 清理现有元素...");
    
    // 移除现有按钮
    $('#virtual-pet-button').remove();
    
    // 移除现有弹窗
    $('#virtual-pet-popup-overlay').remove();
    $('.virtual-pet-popup-overlay').remove();
    
    // 移除测试按钮
    $('#test-virtual-pet-button').remove();
    $('#ios-test-button').remove();
    
    console.log("✅ 清理完成");
}

// 2. 重新创建基础按钮
function createBasicButton() {
    console.log("🐾 创建基础按钮...");
    
    const button = $(`
        <div id="virtual-pet-button" style="
            position: fixed;
            top: 50%;
            right: 20px;
            width: 60px;
            height: 60px;
            background: linear-gradient(135deg, #FFE5F1 0%, #E5F9F0 50%, #E5F4FF 100%);
            border: 3px solid #FF69B4;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            z-index: 10000;
            font-size: 24px;
            box-shadow: 0 4px 12px rgba(255, 105, 180, 0.3);
            transition: all 0.3s ease;
            user-select: none;
            -webkit-user-select: none;
        ">🐾</div>
    `);
    
    // 添加悬停效果
    button.hover(
        function() {
            $(this).css({
                'transform': 'scale(1.1)',
                'box-shadow': '0 6px 16px rgba(255, 105, 180, 0.4)'
            });
        },
        function() {
            $(this).css({
                'transform': 'scale(1)',
                'box-shadow': '0 4px 12px rgba(255, 105, 180, 0.3)'
            });
        }
    );
    
    // 添加点击事件
    button.on('click', function() {
        console.log("🐾 按钮被点击");
        showBasicPopup();
    });
    
    $('body').append(button);
    console.log("✅ 基础按钮创建完成");
}

// 3. 创建基础弹窗
function showBasicPopup() {
    console.log("🎪 显示基础弹窗...");
    
    // 移除现有弹窗
    $('.virtual-pet-popup-overlay').remove();
    
    const popup = $(`
        <div class="virtual-pet-popup-overlay" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 10001;
            display: flex;
            align-items: center;
            justify-content: center;
        ">
            <div style="
                background: linear-gradient(135deg, #FFE5F1 0%, #E5F9F0 50%, #E5F4FF 100%);
                border: 3px solid #FF69B4;
                border-radius: 16px;
                padding: 20px;
                max-width: 350px;
                width: 90%;
                text-align: center;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
            ">
                <h2 style="margin: 0 0 15px 0; color: #2D3748; font-family: 'Courier New', monospace;">🐾 虚拟宠物</h2>
                <p style="margin: 10px 0; color: #4A5568;">插件正在修复中...</p>
                <div style="margin: 15px 0;">
                    <button onclick="window.location.reload()" style="
                        background: #FF69B4;
                        color: white;
                        border: none;
                        padding: 8px 16px;
                        border-radius: 8px;
                        cursor: pointer;
                        margin: 5px;
                        font-family: 'Courier New', monospace;
                    ">刷新页面</button>
                    <button onclick="$('.virtual-pet-popup-overlay').remove()" style="
                        background: #6B7280;
                        color: white;
                        border: none;
                        padding: 8px 16px;
                        border-radius: 8px;
                        cursor: pointer;
                        margin: 5px;
                        font-family: 'Courier New', monospace;
                    ">关闭</button>
                </div>
                <div style="margin-top: 15px; font-size: 12px; color: #6B7280;">
                    <p>如果问题持续，请:</p>
                    <p>1. 刷新页面</p>
                    <p>2. 检查浏览器控制台错误</p>
                    <p>3. 重新安装插件</p>
                </div>
            </div>
        </div>
    `);
    
    // 点击外部关闭
    popup.on('click', function(e) {
        if (e.target === this) {
            $(this).remove();
        }
    });
    
    $('body').append(popup);
    console.log("✅ 基础弹窗显示完成");
}

// 4. 检查扩展设置
function checkExtensionSettings() {
    console.log("⚙️ 检查扩展设置...");
    
    // 检查是否在扩展设置中
    const settingsPanel = $('#extensions_settings');
    if (settingsPanel.length > 0) {
        console.log("✅ 找到扩展设置面板");
        
        // 查找虚拟宠物设置
        const petSettings = settingsPanel.find('[data-extension="virtual-pet-system"]');
        if (petSettings.length > 0) {
            console.log("✅ 找到虚拟宠物设置");
        } else {
            console.log("❌ 未找到虚拟宠物设置，尝试重新注册...");
            registerExtensionSettings();
        }
    } else {
        console.log("❌ 未找到扩展设置面板");
    }
}

// 5. 重新注册扩展设置
function registerExtensionSettings() {
    console.log("📝 重新注册扩展设置...");
    
    try {
        // 创建基础设置HTML
        const settingsHTML = `
            <div class="virtual-pet-settings">
                <h3>🐾 虚拟宠物系统</h3>
                <div style="margin: 10px 0;">
                    <label>
                        <input type="checkbox" id="virtual-pet-enabled-toggle" checked>
                        启用虚拟宠物系统
                    </label>
                </div>
                <div style="margin: 10px 0;">
                    <button onclick="window.location.reload()" style="
                        background: #FF69B4;
                        color: white;
                        border: none;
                        padding: 8px 16px;
                        border-radius: 4px;
                        cursor: pointer;
                    ">重新加载插件</button>
                </div>
                <div style="margin: 10px 0; font-size: 12px; color: #666;">
                    <p>状态: 正在修复中...</p>
                    <p>如果问题持续，请刷新页面</p>
                </div>
            </div>
        `;
        
        // 如果有扩展设置API，使用它
        if (typeof window.registerExtension === 'function') {
            window.registerExtension('virtual-pet-system', settingsHTML);
            console.log("✅ 使用API注册扩展设置");
        } else {
            console.log("❌ 扩展设置API不可用");
        }
    } catch (error) {
        console.error("❌ 注册扩展设置失败:", error);
    }
}

// 6. 主修复函数
function fixPlugin() {
    console.log("🚀 开始主修复流程...");
    
    // 等待jQuery准备就绪
    if (typeof jQuery !== 'undefined') {
        jQuery(document).ready(function() {
            console.log("✅ jQuery 准备就绪");
            
            // 执行修复步骤
            cleanupExistingElements();
            
            setTimeout(() => {
                createBasicButton();
                checkExtensionSettings();
                
                console.log("✅ 基础修复完成");
                console.log("💡 如果仍有问题，请刷新页面或重新安装插件");
            }, 500);
        });
    } else {
        console.error("❌ jQuery 不可用");
    }
}

// 7. 全局修复函数
window.fixVirtualPetPlugin = fixPlugin;

// 8. 自动执行修复
console.log("🔧 虚拟宠物插件修复脚本已加载");
console.log("💡 运行 fixVirtualPetPlugin() 来修复插件");

// 自动执行修复（延迟执行以确保页面加载完成）
setTimeout(fixPlugin, 1000);
