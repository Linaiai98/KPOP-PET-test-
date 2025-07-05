# 🚨 虚拟宠物插件紧急修复指南

## ⚠️ 当前问题
- 插件的扩展设置消失了
- 悬浮按钮也没了
- 可能是语法错误导致整个插件无法加载

## 🔧 立即修复步骤

### **方法1: 使用修复脚本（推荐）**

1. **在浏览器控制台运行**:
   ```javascript
   // 加载修复脚本
   const script = document.createElement('script');
   script.src = 'scripts/extensions/third-party/virtual-pet-system/fix_plugin.js';
   document.head.appendChild(script);
   ```

2. **或者直接运行修复函数**:
   ```javascript
   fixVirtualPetPlugin();
   ```

### **方法2: 手动重新创建按钮**

在浏览器控制台中运行以下代码：

```javascript
// 清理现有元素
$('#virtual-pet-button').remove();
$('.virtual-pet-popup-overlay').remove();

// 创建临时按钮
const tempButton = $(`
    <div id="virtual-pet-button" style="
        position: fixed;
        top: 50%;
        right: 20px;
        width: 60px;
        height: 60px;
        background: #FF69B4;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        z-index: 10000;
        font-size: 24px;
        color: white;
    ">🐾</div>
`);

tempButton.on('click', function() {
    alert('虚拟宠物插件正在修复中，请刷新页面');
});

$('body').append(tempButton);
console.log('✅ 临时按钮已创建');
```

### **方法3: 重新加载插件**

1. **刷新页面**: 按 `F5` 或 `Ctrl+R`
2. **清除缓存**: `Ctrl+Shift+R`
3. **重新安装插件**:
   - 删除插件文件夹
   - 重新下载并安装

## 🔍 问题诊断

### **检查控制台错误**

在浏览器控制台中运行：

```javascript
// 检查是否有JavaScript错误
console.log("🔍 检查插件状态...");

// 检查jQuery
console.log("jQuery:", typeof jQuery !== 'undefined' ? '✅ 可用' : '❌ 不可用');

// 检查插件函数
const functions = [
    'testVirtualPet',
    'forceShowPetButton', 
    'fixStyleConflicts',
    'checkStyleConflicts'
];

functions.forEach(func => {
    console.log(`${func}:`, typeof window[func] === 'function' ? '✅ 存在' : '❌ 缺失');
});

// 检查DOM元素
console.log("按钮:", $('#virtual-pet-button').length > 0 ? '✅ 存在' : '❌ 缺失');
console.log("设置:", $('[data-extension="virtual-pet-system"]').length > 0 ? '✅ 存在' : '❌ 缺失');
```

### **检查文件完整性**

```javascript
// 检查主文件是否加载
fetch('scripts/extensions/third-party/virtual-pet-system/index.js')
    .then(response => {
        if (response.ok) {
            console.log('✅ 主文件可访问');
            return response.text();
        } else {
            console.log('❌ 主文件无法访问');
        }
    })
    .then(content => {
        if (content) {
            console.log(`文件大小: ${content.length} 字符`);
            console.log('文件开头:', content.substring(0, 100));
        }
    })
    .catch(error => {
        console.error('❌ 文件检查失败:', error);
    });
```

## 🛠️ 深度修复

### **重置插件数据**

```javascript
// 清除所有插件数据
const keys = Object.keys(localStorage).filter(key => 
    key.includes('virtual-pet') || key.includes('virtual_pet')
);

console.log('清除的数据键:', keys);
keys.forEach(key => localStorage.removeItem(key));

// 清除扩展设置
if (window.extension_settings && window.extension_settings['virtual-pet-system']) {
    delete window.extension_settings['virtual-pet-system'];
    if (typeof window.saveSettingsDebounced === 'function') {
        window.saveSettingsDebounced();
    }
}

console.log('✅ 插件数据已重置');
```

### **强制重新初始化**

```javascript
// 强制重新加载插件脚本
const oldScript = document.querySelector('script[src*="virtual-pet-system"]');
if (oldScript) {
    oldScript.remove();
}

const newScript = document.createElement('script');
newScript.src = 'scripts/extensions/third-party/virtual-pet-system/index.js?' + Date.now();
newScript.onload = function() {
    console.log('✅ 插件脚本重新加载完成');
};
newScript.onerror = function() {
    console.error('❌ 插件脚本加载失败');
};
document.head.appendChild(newScript);
```

## 📋 修复检查清单

### **修复后验证**
- [ ] 右侧出现🐾悬浮按钮
- [ ] 点击按钮能打开弹窗
- [ ] 扩展设置中有虚拟宠物选项
- [ ] 控制台没有JavaScript错误
- [ ] 插件功能正常工作

### **如果仍有问题**
- [ ] 检查浏览器兼容性
- [ ] 确认SillyTavern版本
- [ ] 检查其他插件冲突
- [ ] 重新下载插件文件
- [ ] 联系技术支持

## 🎯 快速恢复命令

**一键修复命令**（在控制台运行）：

```javascript
// 一键修复虚拟宠物插件
(function() {
    console.log('🚀 开始一键修复...');
    
    // 清理
    $('#virtual-pet-button, .virtual-pet-popup-overlay').remove();
    
    // 重新创建
    const btn = $('<div id="virtual-pet-button">🐾</div>').css({
        position: 'fixed', top: '50%', right: '20px',
        width: '60px', height: '60px', background: '#FF69B4',
        borderRadius: '50%', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', zIndex: 10000, fontSize: '24px', color: 'white'
    }).on('click', () => alert('插件修复中，请刷新页面'));
    
    $('body').append(btn);
    console.log('✅ 一键修复完成');
})();
```

## 🔄 最终解决方案

如果以上方法都无效：

1. **完全重新安装**:
   - 删除整个 `virtual-pet-system` 文件夹
   - 重新下载最新版本
   - 重新安装

2. **联系支持**:
   - 提供浏览器控制台错误信息
   - 说明操作系统和浏览器版本
   - 描述问题出现的具体步骤

## 💡 预防措施

- 定期备份插件设置
- 避免同时安装冲突的插件
- 保持SillyTavern和插件更新
- 定期清理浏览器缓存
