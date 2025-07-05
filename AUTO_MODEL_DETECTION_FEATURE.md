# 🤖 虚拟宠物插件 - 自动模型检测功能

## 🎯 功能概述

我们成功为虚拟宠物插件添加了自动获取后端API模型名称的功能，类似于SillyTavern的实现方式。现在用户可以：

1. **自动获取可用模型列表** - 从API提供商获取实时模型列表
2. **获取SillyTavern当前模型** - 直接读取SillyTavern当前使用的模型配置
3. **智能模型选择** - 下拉菜单 + 手动输入的双重选择方式

## 🔧 实现的功能

### 1. **智能模型下拉选择**

```html
<!-- 新的UI设计 -->
<label for="ai-model-select">
    模型名称:
    <button id="refresh-models-btn">🔄 刷新模型</button>
    <button id="get-sillytavern-model-btn">📥 获取当前</button>
</label>
<select id="ai-model-select">
    <option value="">请先配置API并点击刷新模型</option>
</select>
<input id="ai-model-input" placeholder="或手动输入模型名称">
```

### 2. **多API支持的模型获取**

```javascript
// 支持的API类型和对应的模型获取方式
const API_ENDPOINTS = {
    'openai': '/v1/models',           // OpenAI兼容API
    'anthropic': '预定义列表',         // Claude模型列表
    'google': '/v1beta/models',       // Google AI模型
    'custom': '/models'               // 通用端点
};
```

### 3. **SillyTavern集成**

```javascript
// 从SillyTavern获取当前模型信息
function getSillyTavernModelInfo() {
    // 方法1: 官方API
    if (window.SillyTavern?.getContext) {
        const context = window.SillyTavern.getContext();
        return {
            api: context.mainApi,
            model: context.currentModel
        };
    }
    
    // 方法2: DOM检测
    const apiElement = document.querySelector('#main_api');
    const modelElement = document.querySelector('#model_select');
    
    return {
        api: apiElement?.value,
        model: modelElement?.value
    };
}
```

## 📋 支持的API提供商

### **OpenAI兼容API**
- **端点**: `/v1/models`
- **认证**: `Authorization: Bearer {apiKey}`
- **响应格式**: `{ data: [{ id: "model-name" }] }`

### **Anthropic Claude**
- **模型列表**: 预定义（因为没有公开的模型列表API）
- **支持模型**:
  - `claude-3-5-sonnet-20241022` (Latest)
  - `claude-3-5-sonnet-20240620`
  - `claude-3-opus-20240229`
  - `claude-3-sonnet-20240229`
  - `claude-3-haiku-20240307`

### **Google AI**
- **端点**: `https://generativelanguage.googleapis.com/v1beta/models`
- **认证**: `x-goog-api-key: {apiKey}`
- **响应格式**: `{ models: [{ name: "models/gemini-pro" }] }`

### **自定义API**
- **端点**: `/models` (通用)
- **认证**: `Authorization: Bearer {apiKey}`
- **响应格式**: 自动检测数组或对象格式

## 🎮 使用方法

### **方法1: 自动获取模型列表**

1. 在AI配置中选择API类型（OpenAI/Claude/Google等）
2. 填写API URL和密钥
3. 点击 **🔄 刷新模型** 按钮
4. 从下拉菜单中选择所需模型

### **方法2: 获取SillyTavern当前模型**

1. 确保SillyTavern已正确配置API和模型
2. 点击 **📥 获取当前** 按钮
3. 插件会自动读取SillyTavern的当前配置

### **方法3: 手动输入**

1. 如果自动获取失败或需要特定模型
2. 在文本输入框中手动输入模型名称
3. 系统会优先使用下拉选择，其次使用手动输入

## 🔍 技术实现细节

### **模型过滤逻辑**

```javascript
// 智能过滤聊天模型
const chatModels = models.filter(model => {
    const id = model.id.toLowerCase();
    return !id.includes('embedding') && 
           !id.includes('whisper') && 
           !id.includes('tts') && 
           !id.includes('dall-e') &&
           (id.includes('gpt') || id.includes('claude') || 
            id.includes('gemini') || id.includes('chat'));
});
```

### **错误处理机制**

```javascript
// 多层回退处理
try {
    const models = await getAvailableModels(apiType, apiUrl, apiKey);
    // 成功获取模型列表
} catch (error) {
    // 显示友好的错误信息
    toastr.error(`获取模型列表失败: ${error.message}`);
    // 回退到手动输入模式
}
```

### **缓存优化**

- 避免重复请求相同API的模型列表
- 智能缓存机制，5分钟内复用结果
- 用户手动刷新时强制更新缓存

## 🎯 用户体验改进

### **智能提示**
- 加载状态：`🔄 正在获取模型列表...`
- 成功状态：`✅ 找到15个可用模型`
- 错误状态：`❌ 获取模型失败，请检查API配置`

### **双重选择机制**
- **优先级**: 下拉选择 > 手动输入
- **灵活性**: 支持下拉中没有的自定义模型
- **兼容性**: 兼容现有的手动配置方式

### **SillyTavern集成**
- **一键获取**: 直接读取SillyTavern当前配置
- **自动同步**: API类型和模型名称自动同步
- **无缝体验**: 无需重复配置

## 🚀 实际应用场景

### **场景1: 新用户配置**
1. 用户安装插件后首次配置
2. 填写API信息后点击"刷新模型"
3. 从下拉列表中选择合适的模型
4. 一键测试连接，开始使用

### **场景2: 现有SillyTavern用户**
1. 用户已在SillyTavern中配置好API
2. 点击"获取当前"按钮
3. 插件自动读取SillyTavern配置
4. 无需重复配置，直接使用

### **场景3: 高级用户自定义**
1. 用户需要使用特定的模型版本
2. 先尝试自动获取查看可用选项
3. 如果没有所需模型，手动输入
4. 系统智能处理两种输入方式

## 📊 功能对比

| 功能 | 之前 | 现在 |
|------|------|------|
| 模型配置 | 手动输入 | 下拉选择 + 手动输入 |
| 模型发现 | 用户自己查找 | 自动获取API模型列表 |
| SillyTavern集成 | 需要重复配置 | 一键获取当前配置 |
| 错误处理 | 基础提示 | 详细错误信息和建议 |
| 用户体验 | 需要技术知识 | 图形化操作，新手友好 |

## 🔮 未来扩展

1. **模型性能监控** - 跟踪不同模型的响应时间
2. **智能推荐** - 根据对话内容推荐最适合的模型
3. **模型切换** - 运行时动态切换模型
4. **成本优化** - 显示不同模型的使用成本
5. **模型对比** - 并排比较不同模型的回复质量

这个功能让虚拟宠物插件在AI模型管理方面达到了与SillyTavern相同的便利性水平，大大提升了用户体验！
