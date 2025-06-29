# AI功能故障排除指南

## 🚨 常见问题

### 问题1：AI功能测试失败，显示403 Forbidden错误

**症状**：
- 控制台显示 `POST http://xxx:8000/api/completions/generate 403 (Forbidden)`
- AI撒娇和AI互动功能不工作
- 测试按钮显示"生成失败"

**原因分析**：
这个错误表明插件尝试直接调用HTTP API端点，但没有适当的权限或认证。

**解决方案**：

#### 方案1：检查SillyTavern AI配置
1. **打开SillyTavern设置**：点击右上角设置图标
2. **检查AI配置**：
   - 进入"AI Response Configuration"
   - 确认已选择并配置了AI模型（OpenAI、Claude、本地模型等）
   - 测试AI连接是否正常
3. **验证API密钥**：确保API密钥有效且有足够的配额

#### 方案2：使用诊断工具
```javascript
// 在浏览器控制台运行
diagnoseAIFeatures()
```

这会显示详细的诊断信息，包括：
- 可用的API方法
- 当前设置状态
- 具体的问题和建议

#### 方案3：检查SillyTavern版本
- 确保使用的是较新版本的SillyTavern
- 某些旧版本可能不支持 `generateQuietPrompt` 函数

### 问题2：AI功能启用但没有个性化回应

**症状**：
- AI功能开关已启用
- 但互动时仍显示默认消息
- 没有✨标识

**解决方案**：

#### 检查人设配置
1. **打开设置界面**：SillyTavern扩展设置 → 虚拟宠物系统
2. **检查人设内容**：确保人设文本框不为空
3. **保存人设**：点击"💾 保存人设"按钮
4. **测试功能**：点击"🧪 测试AI撒娇"或"🎮 测试AI互动"

#### 重置为默认人设
如果自定义人设有问题：
1. 点击"🔄 重置默认"按钮
2. 确认重置操作
3. 重新测试功能

### 问题3：AI回应质量不理想

**症状**：
- AI功能正常工作
- 但生成的内容不符合预期
- 回应过于简单或不符合人设

**解决方案**：

#### 优化人设描述
1. **增加细节**：提供更详细的性格、语言风格描述
2. **明确要求**：在人设中明确说明期望的回应风格
3. **提供示例**：在人设中给出具体的表达示例

#### 人设优化示例
```
你是一只可爱的猫娘宠物，名字叫小花。详细特点：

性格特征：
- 活泼可爱，有点小调皮
- 对主人非常依恋，喜欢撒娇
- 偶尔会害羞，但很快就会恢复活泼

语言特色：
- 经常使用"nya~"、"喵~"等猫咪叫声
- 称呼主人为"主人大人"或"主人"
- 语气可爱，经常使用"呀"、"哦"等语气词

情感表达：
- 开心时：会蹦蹦跳跳，发出"nya~"的叫声
- 感谢时：会害羞地低头，小声说谢谢
- 撒娇时：会用软糯的声音，眼睛水汪汪地看着主人

互动偏好：
- 喂食时：会开心地"nya~"叫，表达对食物的喜爱
- 玩耍时：会兴奋地邀请主人继续玩
- 休息时：会满足地蜷成一团，发出轻柔的呼噜声
```

## 🔧 高级故障排除

### 检查浏览器控制台

1. **打开开发者工具**：按F12
2. **查看Console标签**：寻找错误信息
3. **常见错误类型**：
   - `TypeError: window.generateQuietPrompt is not a function`
   - `403 Forbidden`
   - `Network Error`
   - `Timeout`

### 手动API测试

```javascript
// 测试SillyTavern API可用性
console.log("generateQuietPrompt:", typeof window.generateQuietPrompt);
console.log("Generate:", typeof window.Generate);
console.log("main_api:", typeof window.main_api);

// 尝试简单的API调用
if (typeof window.generateQuietPrompt === 'function') {
    window.generateQuietPrompt("说一句话").then(response => {
        console.log("API测试成功:", response);
    }).catch(error => {
        console.log("API测试失败:", error);
    });
}
```

### 网络和权限检查

1. **检查网络连接**：确保能正常访问AI服务
2. **检查防火墙设置**：确保没有阻止API请求
3. **检查浏览器权限**：确保允许跨域请求（如果需要）

## 🛠️ 临时解决方案

### 禁用AI功能
如果AI功能持续出现问题，可以临时禁用：

1. **在设置界面中**：
   - 取消勾选"启用AI撒娇功能"
   - 取消勾选"启用AI互动回应"

2. **通过控制台**：
```javascript
toggleAIAttention(false)
toggleAIInteractions(false)
```

### 使用默认消息
禁用AI功能后，系统会自动使用预设的默认消息：
- 撒娇消息：根据宠物类型显示不同的可爱消息
- 互动回应：简单但有效的回应消息

## 📞 获取帮助

### 自助诊断
```javascript
// 运行完整诊断
diagnoseAIFeatures()

// 检查系统状态
checkAttentionStatus()

// 测试基础功能
testVirtualPet()
```

### 收集错误信息
如果需要报告问题，请提供：
1. **浏览器控制台的完整错误信息**
2. **SillyTavern版本信息**
3. **使用的AI模型类型**
4. **诊断工具的输出结果**

### 社区支持
- 在GitHub Issues中搜索类似问题
- 提供详细的错误描述和环境信息
- 包含诊断工具的输出结果

## 💡 预防措施

### 定期检查
1. **定期运行诊断**：`diagnoseAIFeatures()`
2. **测试AI功能**：定期使用测试按钮验证功能
3. **备份人设**：保存重要的自定义人设到文本文件

### 最佳实践
1. **渐进式配置**：先使用默认设置，确认基础功能正常后再自定义
2. **简单测试**：每次修改设置后都进行简单测试
3. **保持更新**：使用最新版本的SillyTavern和插件

---

**记住**：AI功能是增强体验的额外功能，即使不工作也不影响基础的宠物养成功能。如果遇到持续问题，可以先禁用AI功能，享受传统的宠物互动体验。
