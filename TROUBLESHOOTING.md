# 虚拟宠物系统 - 故障排除指南

## 🔍 悬浮窗不显示的排查步骤

### 第一步：检查文件结构

确保文件夹结构正确：
```
SillyTavern/
└── public/
    └── scripts/
        └── extensions/
            └── third-party/
                └── virtual-pet-system/  ← 文件夹名必须是这个
                    ├── manifest.json
                    ├── index.js
                    ├── style.css
                    ├── popup.html
                    ├── settings.html
                    └── README.md
```

**重要**：文件夹名必须是 `virtual-pet-system`，不能是其他名称！

### 第二步：检查浏览器控制台

1. 打开SillyTavern
2. 按F12打开开发者工具
3. 点击"Console"标签
4. 刷新页面
5. 查找以下信息：

**正常情况下应该看到：**
```
[virtual-pet-system] Starting initialization...
[virtual-pet-system] Initializing extension...
[virtual-pet-system] Loading CSS from: scripts/extensions/third-party/virtual-pet-system/style.css
[virtual-pet-system] Loading HTML files...
[virtual-pet-system] HTML files loaded successfully
[virtual-pet-system] Setting up initial state...
[virtual-pet-system] Extension enabled: true
[virtual-pet-system] Toggle element found and set
[virtual-pet-system] Initializing floating button...
[virtual-pet-system] initializeFloatingButton called
[virtual-pet-system] Creating floating button with ID: virtual-pet-button
[virtual-pet-system] Button created, element count: 1
[virtual-pet-system] Button set to default position
[virtual-pet-system] Button initialization complete
[virtual-pet-system] Extension loaded successfully.
```

### 第三步：常见错误及解决方案

#### 错误1：找不到HTML文件
```
[virtual-pet-system] Failed to load HTML files. Error: 404
```
**解决方案**：
- 检查文件夹名称是否为 `virtual-pet-system`
- 确认 `settings.html` 和 `popup.html` 文件存在
- 重启SillyTavern

#### 错误2：Toggle element not found
```
[virtual-pet-system] Toggle element not found: #virtual-pet-enabled-toggle
```
**解决方案**：
- settings.html文件没有正确加载
- 检查SillyTavern版本兼容性
- 手动刷新扩展设置页面

#### 错误3：Button created, element count: 0
```
[virtual-pet-system] Button created, element count: 0
```
**解决方案**：
- CSS样式冲突
- 检查是否有其他扩展干扰
- 尝试禁用其他扩展

### 第四步：手动启用插件

如果自动启用失败，尝试手动启用：

1. 进入SillyTavern扩展设置页面
2. 找到"虚拟宠物系统"选项
3. 手动勾选启用
4. 刷新页面

### 第五步：强制显示按钮

如果仍然不显示，在浏览器控制台中运行以下代码：

```javascript
// 检查插件是否加载
console.log('jQuery loaded:', typeof jQuery !== 'undefined');
console.log('Body element:', $('body').length);

// 手动创建按钮进行测试
$('body').append(`
<div id="virtual-pet-button-test" style="
    position: fixed;
    top: 50%;
    left: 20px;
    width: 56px;
    height: 56px;
    background: #7289da;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 28px;
    z-index: 999999;
    cursor: pointer;
">🐾</div>
`);

// 检查按钮是否创建成功
console.log('Test button created:', $('#virtual-pet-button-test').length);
```

### 第六步：检查CSS加载

在控制台运行：
```javascript
// 检查CSS是否加载
const cssLoaded = Array.from(document.styleSheets).some(sheet => 
    sheet.href && sheet.href.includes('virtual-pet-system')
);
console.log('CSS loaded:', cssLoaded);
```

### 第七步：检查扩展设置

1. 进入SillyTavern设置页面
2. 找到扩展设置区域
3. 确认看到"🐾 虚拟宠物系统"选项
4. 如果没有看到，说明插件没有正确加载

## 🔧 其他常见问题

### 问题：插件加载但功能不工作

**排查步骤**：
1. 检查localStorage是否可用
2. 确认没有JavaScript错误
3. 检查SillyTavern版本兼容性

### 问题：移动端显示异常

**排查步骤**：
1. 检查CSS媒体查询
2. 确认触摸事件正常
3. 测试不同屏幕尺寸

### 问题：与其他扩展冲突

**排查步骤**：
1. 禁用其他扩展逐一测试
2. 检查CSS选择器冲突
3. 查看JavaScript错误

## 📞 获取更多帮助

如果以上步骤都无法解决问题：

1. **收集信息**：
   - SillyTavern版本
   - 浏览器类型和版本
   - 控制台完整错误信息
   - 文件夹结构截图

2. **联系支持**：
   - 在GitHub Issues中提交问题
   - 提供详细的复现步骤
   - 附上控制台日志

## 🚀 快速修复命令

在浏览器控制台中运行以下命令进行快速诊断：

```javascript
// 完整诊断脚本
(function() {
    console.log('=== 虚拟宠物系统诊断 ===');
    console.log('jQuery:', typeof jQuery !== 'undefined');
    console.log('Body element:', $('body').length);
    console.log('Extensions settings:', $('#extensions_settings2').length);
    console.log('Virtual pet toggle:', $('#virtual-pet-enabled-toggle').length);
    console.log('Virtual pet button:', $('#virtual-pet-button').length);
    console.log('LocalStorage available:', typeof localStorage !== 'undefined');
    
    // 检查CSS
    const cssLoaded = Array.from(document.styleSheets).some(sheet => 
        sheet.href && sheet.href.includes('virtual-pet-system')
    );
    console.log('CSS loaded:', cssLoaded);
    
    // 检查存储的设置
    const enabled = localStorage.getItem('virtual-pet-enabled');
    console.log('Extension enabled in storage:', enabled);
    
    console.log('=== 诊断完成 ===');
})();
```

运行后将结果发送给开发者以获得更精确的帮助。
