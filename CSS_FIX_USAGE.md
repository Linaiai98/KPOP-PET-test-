# 🎨 CSS冲突修复使用说明

## 📋 问题描述

虚拟宠物插件的CSS样式影响了preset-manager-momo插件，导致其UI变成粉色且透明。

## ✅ 修复内容

### 1. **CSS变量作用域限制**
- 将所有CSS变量从`:root`移动到特定选择器
- 只影响虚拟宠物插件相关的元素

### 2. **变量重命名**
- 所有CSS变量添加`vps-`前缀
- 避免与其他插件的变量名冲突

### 3. **冲突检测增强**
- 添加CSS冲突自动检测功能
- 实时监控样式冲突问题

## 🧪 测试方法

### 自动测试
```javascript
// 在浏览器控制台运行
window.VirtualPetCSSTest.runAllTests();
```

### 手动验证
1. **检查preset-manager-momo插件**
   - 打开preset-manager-momo插件
   - 确认UI颜色恢复正常（不再是粉色）
   - 确认UI不再透明

2. **检查虚拟宠物插件**
   - 点击虚拟宠物按钮
   - 确认弹窗保持糖果色主题
   - 确认所有功能正常工作

3. **检查其他插件**
   - 打开其他SillyTavern插件
   - 确认没有受到样式影响

## 🔧 故障排除

### 如果preset-manager-momo仍然是粉色
1. **清除浏览器缓存**
   ```
   Ctrl + Shift + R (强制刷新)
   ```

2. **检查CSS加载顺序**
   ```javascript
   // 在控制台检查冲突
   window.VirtualPetSystem.debug.detectCSSConflicts();
   ```

3. **手动重新加载插件**
   - 在SillyTavern扩展管理中禁用虚拟宠物插件
   - 刷新页面
   - 重新启用插件

### 如果虚拟宠物插件样式异常
1. **检查CSS变量**
   ```javascript
   // 检查vps-变量是否正确加载
   const styles = getComputedStyle(document.querySelector('#virtual-pet-button'));
   console.log(styles.backgroundColor);
   ```

2. **重新加载样式文件**
   - 确保`style.css`文件已更新
   - 检查浏览器开发者工具中的样式

## 📊 验证清单

- [ ] preset-manager-momo插件UI颜色正常
- [ ] preset-manager-momo插件UI不透明
- [ ] 虚拟宠物按钮显示正常
- [ ] 虚拟宠物弹窗保持糖果色主题
- [ ] 其他SillyTavern插件未受影响
- [ ] 浏览器控制台无CSS冲突警告

## 🔍 调试命令

### 检测所有冲突
```javascript
window.VirtualPetSystem.debug.detectConflicts();
window.VirtualPetSystem.debug.detectCSSConflicts();
```

### 运行CSS测试
```javascript
window.VirtualPetCSSTest.runAllTests();
```

### 检查特定元素样式
```javascript
// 检查虚拟宠物按钮
const button = document.getElementById('virtual-pet-button');
console.log(getComputedStyle(button));

// 检查preset-manager元素（如果存在）
const presetManager = document.querySelector('[class*="preset-manager"]');
if (presetManager) {
    console.log(getComputedStyle(presetManager));
}
```

## 📞 技术支持

如果问题仍然存在，请提供以下信息：

1. **浏览器信息**
   - 浏览器类型和版本
   - 操作系统

2. **控制台输出**
   ```javascript
   // 运行并提供输出结果
   window.VirtualPetCSSTest.runAllTests();
   window.VirtualPetSystem.debug.detectCSSConflicts();
   ```

3. **插件状态**
   - 已安装的SillyTavern插件列表
   - 插件加载顺序

## 🎯 预期结果

修复完成后：
- ✅ preset-manager-momo插件恢复原有外观
- ✅ 虚拟宠物插件保持糖果色主题
- ✅ 所有插件功能正常
- ✅ 无CSS冲突警告
