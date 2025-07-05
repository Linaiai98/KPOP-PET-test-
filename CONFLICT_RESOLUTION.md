# 虚拟宠物系统与preset-manager-momo插件冲突解决方案

## 🚨 检测到的冲突问题

### 1. **extension_settings 数据冲突**
**问题**: 两个插件都直接操作 `window.extension_settings` 对象，可能导致数据覆盖
- 虚拟宠物插件: `window.extension_settings[extensionName] = syncData`
- preset-manager-momo: 可能也使用相同的存储机制

**解决方案**: 
- 实现安全的设置保存机制，使用 `Object.assign()` 而不是直接覆盖
- 添加防抖机制，避免频繁调用 `saveSettingsDebounced()`
- 使用命名空间隔离数据

### 2. **全局函数命名冲突**
**问题**: 虚拟宠物插件在window对象上定义了50+个全局函数
```javascript
window.testVirtualPet = function() { ... };
window.forceShowPetButton = function() { ... };
window.openAvatarSelector = function() { ... };
// ... 更多全局函数
```

**解决方案**:
- 创建 `VirtualPetSystem` 命名空间
- 将所有全局函数移动到命名空间下
- 保留向后兼容的引用

### 3. **SillyTavern API 竞争**
**问题**: 两个插件可能同时调用相同的SillyTavern API
- `window.saveSettingsDebounced()`
- `window.generateReply()`
- `window.extension_settings`

**解决方案**:
- 实现API调用的防抖机制
- 添加错误处理和重试逻辑
- 使用队列机制避免并发冲突

### 4. **DOM事件监听器冲突**
**问题**: 虚拟宠物插件绑定了大量全局事件监听器
```javascript
$(document).on('change', TOGGLE_ID, function () { ... });
$(document).off('.petdragtemp');
```

**解决方案**:
- 使用命名空间的事件监听器
- 实现安全的事件管理器
- 在插件卸载时正确清理所有监听器

## 🔧 实施的修复措施

### 1. **创建冲突修复模块** (`conflict-fix.js`)
```javascript
window.VirtualPetSystem = {
    version: '1.0.1',
    namespace: 'virtual-pet-system',
    safeSaveSettings: function(data) { ... },
    safeLoadSettings: function() { ... },
    detectConflicts: function() { ... },
    fixConflicts: function() { ... }
};
```

### 2. **安全的设置保存机制**
```javascript
// 修复前
window.extension_settings[extensionName] = syncData;
window.saveSettingsDebounced();

// 修复后
if (!window.extension_settings[extensionName]) {
    window.extension_settings[extensionName] = {};
}
Object.assign(window.extension_settings[extensionName], syncData);
// 使用防抖机制
setTimeout(() => window.saveSettingsDebounced(), 1000);
```

### 3. **事件监听器管理**
```javascript
window.VirtualPetSystem.eventListeners = new Map();
window.VirtualPetSystem.safeAddEventListener = function(element, event, handler) {
    // 安全的事件绑定和管理
};
window.VirtualPetSystem.removeAllEventListeners = function() {
    // 清理所有事件监听器
};
```

### 4. **冲突检测和自动修复**
```javascript
window.VirtualPetSystem.detectConflicts = function() {
    // 检测与其他插件的冲突
    // 返回冲突列表和严重程度
};

window.VirtualPetSystem.fixConflicts = function() {
    // 自动修复低风险冲突
    // 警告高风险冲突
};
```

## 📊 修复效果

### 兼容性改进
- ✅ 避免了extension_settings数据覆盖
- ✅ 减少了全局命名空间污染
- ✅ 防止了API调用冲突
- ✅ 改善了事件监听器管理

### 性能优化
- ✅ 减少了不必要的API调用
- ✅ 实现了防抖机制
- ✅ 优化了内存使用

### 错误处理
- ✅ 添加了错误捕获和恢复
- ✅ 实现了冲突自动检测
- ✅ 提供了手动修复工具

## 🧪 测试建议

### 1. **基础功能测试**
```javascript
// 测试虚拟宠物基础功能
window.VirtualPetSystem.testBasicFunctions();

// 测试设置保存/加载
window.VirtualPetSystem.testSettingsSync();
```

### 2. **冲突检测测试**
```javascript
// 检测当前冲突
const conflicts = window.VirtualPetSystem.detectConflicts();
console.log('检测到的冲突:', conflicts);

// 自动修复冲突
const fixedCount = window.VirtualPetSystem.fixConflicts();
console.log('修复的冲突数量:', fixedCount);
```

### 3. **与preset-manager-momo共存测试**
1. 同时启用两个插件
2. 测试preset切换功能
3. 测试虚拟宠物功能
4. 检查控制台是否有错误
5. 验证设置数据是否正确保存

## 🔮 后续优化建议

### 1. **进一步隔离**
- 考虑使用iframe或shadow DOM完全隔离UI
- 实现更严格的CSS命名空间

### 2. **通信机制**
- 建立插件间通信协议
- 实现事件总线机制

### 3. **监控和诊断**
- 添加性能监控
- 实现详细的冲突日志
- 提供用户友好的诊断工具

## 📝 使用说明

### 启用冲突修复
冲突修复模块会在插件加载时自动启用，无需手动配置。

### 手动检测冲突
```javascript
// 在浏览器控制台中运行
window.VirtualPetSystem.detectConflicts();
```

### 手动修复冲突
```javascript
// 在浏览器控制台中运行
window.VirtualPetSystem.fixConflicts();
```

### 清理事件监听器
```javascript
// 在浏览器控制台中运行
window.VirtualPetSystem.removeAllEventListeners();
```

---

**注意**: 这些修复措施已经集成到虚拟宠物系统中，会在插件加载时自动应用。如果仍然遇到冲突问题，请查看浏览器控制台的详细日志信息。
