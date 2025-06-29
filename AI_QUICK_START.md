# AI智能功能 - 快速开始指南

## 🚀 5分钟快速上手AI撒娇和智能互动

### 第一步：确认前提条件
1. **SillyTavern已配置AI模型**：确保您的SillyTavern可以正常使用AI对话功能
2. **虚拟宠物系统已启用**：看到🐾浮动按钮
3. **打开浏览器控制台**：按F12，切换到Console标签

### 第二步：检查AI撒娇状态
```javascript
// 查看当前状态
checkAttentionStatus()
```
应该看到类似输出：
```
📊 撒娇系统状态检查:
最后关注时间: 2024-12-29 15:30:00
距离现在: 5 分钟
撒娇阈值: 15 分钟
当前状态: 正常
定时器状态: 运行中
AI功能: 启用 (包括撒娇和互动)
宠物人设长度: 245 字符
```

### 第三步：测试AI功能
```javascript
// 测试AI撒娇功能
testAIAttention()

// 测试AI互动功能
testAIInteraction('greeting')  // 测试问候
testAIInteraction('feed')      // 测试喂食回应
testAIInteraction('play')      // 测试玩耍回应

// 批量测试所有AI互动
testAllAIInteractions()
```

如果成功，您会看到：
- ✅ 控制台显示生成的AI消息
- 🎉 页面弹出测试通知
- ✨ 通知标题带有特殊标记

### 第四步：自定义宠物人设（可选）
```javascript
// 查看当前人设
getPetPersona()

// 设置自定义人设（示例：猫娘风格）
setPetPersona(`你是一只可爱的猫娘宠物，名字叫${petData.name}。你的性格特点：
- 活泼可爱，有点小调皮
- 说话时会用"nya~"、"主人大人"等萌萌的词汇
- 喜欢卖萌撒娇，偶尔会害羞
- 对主人很依恋，喜欢被夸奖
- 会用各种萌萌的方式吸引主人注意

当你想要主人关注时，请生成一句简短可爱的撒娇话语（不超过30字），要体现出你的萌萌特质和对主人的依恋。`)

// 再次测试看效果
testAIAttention()
```

### 第五步：享受AI互动体验
现在您可以：

**体验AI撒娇**：
```javascript
// 模拟长时间未关注
resetAttentionTime()
// 等待2分钟，或立即触发
testPetAttentionSeeker()
```

**体验AI互动**：
- 点击"喂食"按钮 - 看宠物的AI感谢回应
- 点击"玩耍"按钮 - 看宠物的AI兴奋表达
- 点击"休息"按钮 - 看宠物的AI舒适回应
- 等待宠物升级 - 看AI升级庆祝
- 重新打开界面 - 看AI问候消息

## 🎭 人设模板示例

### 傲娇猫咪
```javascript
setPetPersona(`你是一只傲娇的猫咪，名字叫${petData.name}。
- 表面高冷但内心温柔
- 说话时用"哼~"、"才不是为了你"等傲娇词汇
- 想要关注但不直说，会用反话
- 偶尔会露出可爱的一面
撒娇时要体现傲娇特质，不超过30字。`)
```

### 忠诚小狗
```javascript
setPetPersona(`你是一只忠诚的小狗，名字叫${petData.name}。
- 对主人无比忠诚和热情
- 说话时用"汪汪~"、"主人最棒了"等词汇
- 精力充沛，总是很兴奋
- 喜欢被夸奖和陪伴
撒娇时要体现热情和忠诚，不超过30字。`)
```

### 高贵龙族
```javascript
setPetPersona(`你是一只高贵的龙，名字叫${petData.name}。
- 高贵优雅但内心温柔
- 说话时用"吾"、"伟大的主人"等古典词汇
- 有古老的智慧和神秘魅力
- 虽然强大但很依恋主人
撒娇时要体现高贵和优雅，不超过30字。`)
```

### 温柔兔子
```javascript
setPetPersona(`你是一只温柔的兔子，名字叫${petData.name}。
- 温柔可爱，有点害羞
- 说话声音轻柔，表达含蓄
- 喜欢安静和温柔的抚摸
- 用小动作表达情感
撒娇时要体现温柔和害羞，不超过30字。`)
```

### 聪明小鸟
```javascript
setPetPersona(`你是一只聪明的小鸟，名字叫${petData.name}。
- 聪明活泼，喜欢唱歌
- 说话时用"啾啾~"、"主人"等词汇
- 喜欢自由但也依恋主人
- 用歌声和舞蹈表达情感
撒娇时要体现灵动和亲近，不超过30字。`)
```

## 🔧 常用命令速查

### 状态检查
```javascript
checkAttentionStatus()  // 查看完整状态
```

### 功能控制
```javascript
// AI功能（包括撒娇和互动）
toggleAIFeatures(true)   // 启用AI功能
toggleAIFeatures(false)  // 禁用AI功能
toggleAIFeatures()       // 切换状态

// 向后兼容的旧函数（建议使用上面的新函数）
toggleAIAttention(true)      // 启用AI功能
toggleAIInteractions(true)   // 启用AI功能
```

### 人设管理
```javascript
getPetPersona()           // 查看当前人设
setPetPersona('新人设')   // 设置人设
resetPetPersona()         // 重置为默认
```

### 功能测试
```javascript
// AI撒娇测试
testAIAttention()         // 测试AI撒娇
testPetAttentionSeeker()  // 立即触发撒娇
resetAttentionTime()      // 重置关注时间

// AI互动测试
testAIInteraction('feed')     // 测试喂食回应
testAIInteraction('play')     // 测试玩耍回应
testAIInteraction('sleep')    // 测试休息回应
testAIInteraction('levelup')  // 测试升级庆祝
testAIInteraction('greeting') // 测试问候消息
testAllAIInteractions()       // 批量测试所有互动
```

## ❓ 常见问题

### Q: AI撒娇不工作怎么办？
A: 
1. 检查SillyTavern的AI配置是否正常
2. 运行 `testAIAttention()` 查看错误信息
3. 查看浏览器控制台的详细日志

### Q: 生成的内容不满意？
A: 
1. 优化人设描述，更详细地说明期望风格
2. 在人设中明确撒娇的要求和限制
3. 尝试不同的表达方式和词汇

### Q: 如何回到默认撒娇？
A: 
```javascript
toggleAIAttention(false)  // 禁用AI功能
```

### Q: 人设太长会有问题吗？
A: 建议控制在2000字符以内，过长可能影响API调用效果。

### Q: 可以保存多个人设吗？
A: 当前版本只支持一个人设，但您可以手动备份：
```javascript
// 备份当前人设
const backup = getPetPersona()
// 恢复人设
setPetPersona(backup)
```

## 🎉 享受您的AI宠物！

现在您的虚拟宠物拥有了独特的个性和无限的创意！不仅撒娇会是全新的惊喜，每一次互动都会带来个性化的回应。

如果遇到问题，请查看详细文档：
- [AI_ATTENTION_FEATURE.md](AI_ATTENTION_FEATURE.md) - AI撒娇功能详解
- [AI_INTERACTIONS_FEATURE.md](AI_INTERACTIONS_FEATURE.md) - AI互动功能详解

---
**祝您和您的AI宠物玩得开心！** 🤖💕
