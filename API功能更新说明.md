# 🐾 虚拟宠物系统 - API选择功能更新

## 🎉 新增功能概览

### ✅ 主要功能
1. **API选择下拉框** - 支持5种不同的AI后端
2. **动态配置表单** - 根据API类型自动显示相应配置项
3. **连接测试功能** - 一键测试API配置是否正确
4. **多后端支持** - 统一的AI调用接口，支持无缝切换

---

## 🔌 支持的API类型

### 1. 🎭 SillyTavern当前API（默认）
- **描述**: 使用SillyTavern当前连接的AI模型
- **配置**: 无需额外配置
- **优点**: 开箱即用，与SillyTavern完全兼容

### 2. 🤖 OpenAI API
- **描述**: 直接调用OpenAI的GPT模型
- **配置项**:
  - API密钥（必需）
  - 模型选择：GPT-3.5 Turbo / GPT-4 / GPT-4 Turbo
- **测试**: 验证密钥格式和有效性

### 3. 🧠 Claude API
- **描述**: 使用Anthropic的Claude模型
- **配置项**:
  - API密钥（必需）
  - 模型选择：Haiku / Sonnet / Opus
- **测试**: 验证密钥格式和API访问

### 4. 🏠 本地模型API
- **描述**: 连接本地运行的AI模型
- **配置项**:
  - API地址（如：http://localhost:5000/v1/chat/completions）
- **测试**: 验证本地服务可访问性

### 5. ⚙️ 自定义API
- **描述**: 连接任意兼容OpenAI格式的API
- **配置项**:
  - API地址（必需）
  - API密钥（可选）
- **测试**: 验证自定义API的连通性

---

## 🛠️ 技术实现

### 核心函数
```javascript
// 统一AI调用接口
async function callAI(prompt, timeout = 10000)

// API类型特定调用函数
async function callOpenAIAPI(prompt, timeout)
async function callClaudeAPI(prompt, timeout)
async function callCustomAPI(prompt, timeout)
async function callSillyTavernAPI(prompt, timeout)

// 配置管理
function saveAPISettings(type, config)
function getAPIConfig()

// 连接测试
async function testAPIConnection(apiType)
```

### 数据存储
- `virtual-pet-api-type`: 当前选择的API类型
- `virtual-pet-api-config`: API配置信息（JSON格式）

---

## 🎯 使用方法

### 1. 打开设置面板
在SillyTavern的扩展设置中找到"虚拟宠物系统"部分

### 2. 选择API类型
在"AI API选择"下拉框中选择想要使用的API

### 3. 配置API参数
根据选择的API类型，填写相应的配置信息：
- OpenAI/Claude: 输入API密钥，选择模型
- 本地/自定义: 输入API地址和密钥（如需要）

### 4. 测试连接
点击"测试连接"按钮验证配置是否正确

### 5. 保存配置
点击"保存配置"按钮保存设置

### 6. 开始使用
配置完成后，宠物互动将使用选择的AI后端

---

## 🔧 测试功能

### 连接测试特性
- **实时验证**: 测试API密钥、地址的有效性
- **详细反馈**: 提供具体的错误信息和解决建议
- **状态指示**: 测试过程中显示"测试中..."状态
- **错误分类**: 区分不同类型的错误（密钥无效、网络问题等）

### 错误处理
- 401: API密钥无效
- 403: 访问权限不足
- 429: 请求频率过高
- 500: 服务器内部错误
- 网络错误: 连接超时或无法访问

---

## 📋 配置示例

### OpenAI API配置
```json
{
  "apiKey": "sk-your-openai-api-key",
  "model": "gpt-3.5-turbo"
}
```

### Claude API配置
```json
{
  "apiKey": "sk-ant-your-claude-api-key",
  "model": "claude-3-haiku-20240307"
}
```

### 本地API配置
```json
{
  "apiUrl": "http://localhost:5000/v1/chat/completions"
}
```

### 自定义API配置
```json
{
  "apiUrl": "https://api.example.com/v1/chat/completions",
  "apiKey": "your-custom-api-key"
}
```

---

## 🚀 优势特点

### 1. **向后兼容**
- 默认使用SillyTavern API，不影响现有用户
- 保持所有原有功能不变

### 2. **用户友好**
- 直观的下拉选择界面
- 动态配置表单，只显示必要选项
- 实时的连接测试和错误提示

### 3. **灵活扩展**
- 易于添加新的API类型
- 统一的调用接口，便于维护

### 4. **错误处理**
- 完善的错误捕获和回退机制
- 用户友好的错误提示
- 自动回退到默认回复

### 5. **配置管理**
- 持久化存储配置
- 配置验证和格式检查
- 一键测试连接功能

---

## 📝 注意事项

1. **API密钥安全**: 密钥以密码形式输入，但仍存储在本地浏览器中
2. **网络要求**: 云端API需要稳定的网络连接
3. **费用考虑**: OpenAI和Claude API按使用量收费
4. **模型限制**: 不同模型有不同的上下文长度和能力限制
5. **测试建议**: 配置完成后建议先进行连接测试

---

## 🎮 测试页面

已创建独立的测试页面 `api-test.html`，可以：
- 测试API选择和配置功能
- 模拟连接测试过程
- 查看和管理配置数据
- 验证UI交互逻辑

---

## 🔄 后续计划

1. **性能优化**: 添加请求缓存和重试机制
2. **更多API**: 支持更多AI服务提供商
3. **高级配置**: 添加温度、最大长度等参数调节
4. **使用统计**: 记录API使用情况和成功率
5. **批量测试**: 支持一键测试所有配置的API

---

这次更新为虚拟宠物系统带来了强大的AI后端选择能力，用户可以根据自己的需求、预算和技术环境选择最适合的AI服务！🎉
