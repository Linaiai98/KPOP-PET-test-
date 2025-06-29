# 虚拟宠物系统 - 完整卸载指南

## 🗑️ 问题说明

当前版本的SillyTavern插件系统在卸载插件时可能会留下以下残留数据：

1. **空文件夹** - 导致重新安装时报错"存在同名文件夹"
2. **localStorage数据** - 宠物数据、设置、按钮位置等
3. **DOM元素** - 浮动按钮、弹窗、设置面板等
4. **事件监听器** - 可能导致内存泄漏
5. **全局变量** - 测试函数和工具函数

## 🔧 解决方案

我们为插件添加了完整的卸载清理机制，包含以下功能：

### 1. 自动清理函数

插件现在包含以下清理函数：

- `uninstallExtension()` - 完整卸载插件
- `checkForLeftoverData()` - 检查残留数据
- `destroyFloatingButton()` - 移除浮动按钮

### 2. 全局卸载工具

用户可以在浏览器控制台中使用以下命令：

```javascript
// 完全卸载插件（推荐）
uninstallVirtualPetSystem()

// 检查残留数据
checkVirtualPetLeftovers()

// 强制清理残留数据
forceCleanVirtualPetData()
```

## 📋 完整卸载步骤

### 方法一：使用自动卸载工具（推荐）

1. **打开浏览器控制台**
   - 按 `F12` 或右键选择"检查"
   - 切换到 "Console" 标签页

2. **运行卸载命令**
   ```javascript
   uninstallVirtualPetSystem()
   ```

3. **确认卸载**
   - 点击确认对话框
   - 等待清理完成

4. **删除文件夹**
   - 关闭SillyTavern
   - 删除文件夹：`SillyTavern/public/scripts/extensions/third-party/virtual-pet-system/`
   - 重启SillyTavern

### 方法二：手动卸载

1. **禁用插件**
   - 在SillyTavern扩展设置中取消勾选"启用虚拟宠物系统"

2. **清理localStorage数据**
   ```javascript
   // 在控制台中运行
   localStorage.removeItem('virtual-pet-button-position');
   localStorage.removeItem('virtual-pet-enabled');
   localStorage.removeItem('virtual-pet-data');
   localStorage.removeItem('virtual-pet-custom-avatar');
   localStorage.removeItem('virtual-pet-system-notifications');
   localStorage.removeItem('virtual-pet-system-last-notification');
   localStorage.removeItem('virtual-pet-system-auto-save');
   ```

3. **移除DOM元素**
   ```javascript
   // 在控制台中运行
   $('#virtual-pet-button').remove();
   $('#virtual-pet-popup-overlay').remove();
   $('.virtual-pet-popup-overlay').remove();
   $('#virtual-pet-settings').remove();
   ```

4. **删除文件夹**
   - 关闭SillyTavern
   - 删除整个插件文件夹
   - 重启SillyTavern

## 🔍 验证卸载

### 检查残留数据

运行以下命令检查是否还有残留数据：

```javascript
checkVirtualPetLeftovers()
```

### 预期结果

完全卸载后应该看到：
- ✅ 没有发现虚拟宠物系统的残留数据
- 页面上没有🐾浮动按钮
- 扩展设置中没有虚拟宠物系统选项
- localStorage中没有相关数据

## 🚨 故障排除

### 问题1：卸载后仍有残留数据

**解决方案**：
```javascript
// 强制清理
forceCleanVirtualPetData()
```

### 问题2：重新安装时报错"文件夹已存在"

**解决方案**：
1. 完全关闭SillyTavern
2. 手动删除文件夹：`scripts/extensions/third-party/virtual-pet-system/`
3. 重启SillyTavern
4. 重新安装插件

### 问题3：浮动按钮无法移除

**解决方案**：
```javascript
// 强制移除按钮
$('#virtual-pet-button').remove();
$('[id*="virtual-pet"]').remove();
```

### 问题4：localStorage数据无法清除

**解决方案**：
```javascript
// 清除所有相关数据
Object.keys(localStorage).forEach(key => {
    if (key.includes('virtual-pet')) {
        localStorage.removeItem(key);
    }
});
```

## 📝 预防措施

为了避免将来出现类似问题：

1. **定期备份数据**
   - 导出宠物数据到文件
   - 记录重要设置

2. **使用自动卸载工具**
   - 总是使用 `uninstallVirtualPetSystem()` 卸载
   - 不要直接删除文件夹

3. **验证卸载结果**
   - 卸载后运行 `checkVirtualPetLeftovers()`
   - 确认没有残留数据

## 💡 开发者说明

如果您是开发者，可以参考以下改进建议：

### 改进的卸载机制

```javascript
// 保存定时器ID以便清理
let statusUpdateInterval;
let positionCheckInterval;

// 在初始化时保存
statusUpdateInterval = setInterval(updatePetStatus, 60000);

// 在卸载时清理
if (statusUpdateInterval) {
    clearInterval(statusUpdateInterval);
}
```

### 更好的事件管理

```javascript
// 使用命名空间避免冲突
$(document).on('click.virtualPet', selector, handler);

// 卸载时清理
$(document).off('.virtualPet');
```

## 📞 获取帮助

如果卸载过程中遇到问题：

1. **查看控制台错误**
   - 打开浏览器控制台
   - 查看红色错误信息

2. **尝试强制清理**
   ```javascript
   forceCleanVirtualPetData()
   ```

3. **联系支持**
   - 在GitHub Issues中报告问题
   - 提供详细的错误信息和操作步骤

---

**注意**：完全卸载将删除所有宠物数据，包括等级、经验、自定义头像等。请在卸载前确认您不需要这些数据。
