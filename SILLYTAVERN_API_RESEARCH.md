# 🔍 SillyTavern API模型名称获取机制研究报告

## 📋 研究目标

研究SillyTavern是如何获取和管理后端API模型名称的，为虚拟宠物插件的AI集成提供技术参考。

## 🏗️ SillyTavern架构概述

### 1. **核心组件**
- **SillyTavern主程序** - 前端界面和核心逻辑
- **SillyTavern-Extras** - 扩展API服务器（已停止维护）
- **第三方插件** - 通过扩展API与主程序交互

### 2. **API层次结构**
```
用户界面 (SillyTavern Frontend)
    ↓
SillyTavern Core API
    ↓
Backend API Providers (OpenAI, Claude, etc.)
```

## 🔌 API模型检测机制

### 1. **Stable Diffusion模型检测**
根据SillyTavern-Extras文档，以下是获取模型列表的方法：

#### **获取可用模型列表**
```javascript
// API端点
GET /api/image/models

// 响应格式
{
    "models": [
        "model_name_1",
        "model_name_2",
        "model_name_3"
    ]
}
```

#### **获取当前加载的模型**
```javascript
// API端点
GET /api/image/model

// 响应格式
{
    "model": "current_model_name"
}
```

#### **切换模型**
```javascript
// API端点
POST /api/image/model

// 请求体
{
    "model": "target_model_name"
}

// 响应格式
{
    "previous_model": "old_model_name",
    "current_model": "new_model_name"
}
```

### 2. **TTS模型检测**

#### **Silero TTS**
```javascript
// 获取可用语音列表
GET /api/tts/speakers

// 响应格式
[
    {
        "name": "en_0",
        "preview_url": "http://127.0.0.1:5100/api/tts/sample/en_0",
        "voice_id": "en_0"
    }
]
```

#### **Coqui TTS**
```javascript
// 获取可用模型列表
GET /api/coqui-tts/list

// 响应格式
[
    "tts_models--en--jenny--jenny\\model.pth",
    "tts_models--en--ljspeech--fast_pitch\\model_file.pth",
    // ... 更多模型
]

// 加载特定模型
GET /api/coqui-tts/load
{
    "_model": "tts_models--en--jenny--jenny\\model.pth",
    "_gpu": "False",
    "_progress": "True"
}
```

### 3. **LLM模型检测推断**

虽然文档中没有直接的LLM模型检测API，但基于现有模式，SillyTavern可能使用以下方法：

#### **推测的API端点**
```javascript
// 可能的端点（基于模式推断）
GET /api/models          // 获取所有可用模型
GET /api/llm/models      // 获取LLM模型列表
GET /api/current-model   // 获取当前模型

// 可能的响应格式
{
    "models": [
        {
            "id": "gpt-4",
            "name": "GPT-4",
            "provider": "openai",
            "type": "chat"
        },
        {
            "id": "claude-3-sonnet",
            "name": "Claude 3 Sonnet",
            "provider": "anthropic",
            "type": "chat"
        }
    ]
}
```

## 🔧 技术实现分析

### 1. **前端检测机制**

基于虚拟宠物插件的实际代码分析，SillyTavern提供以下API访问方式：

```javascript
// 实际的SillyTavern全局对象结构
window.SillyTavern = {
    // 获取上下文信息的函数
    getContext: function() {
        return {
            mainApi: "openai",           // 当前API类型
            currentModel: "gpt-4",       // 当前模型
            // ... 其他上下文信息
        };
    }
}

// 从虚拟宠物插件代码中发现的实际用法
const context = SillyTavern.getContext();
const currentApi = context.mainApi;  // 获取当前API类型

// DOM元素访问（从插件代码中观察到的模式）
const mainApiElement = document.querySelector('#main_api');
const apiType = mainApiElement ? mainApiElement.value : null;
```

### 2. **DOM元素检测**

SillyTavern可能通过DOM元素存储模型信息：

```javascript
// 可能的DOM选择器
const apiSelect = document.querySelector('#main_api');
const modelSelect = document.querySelector('#model_select');
const currentModel = document.querySelector('#current_model_display');

// 获取当前API类型
const apiType = apiSelect ? apiSelect.value : null;

// 获取当前模型
const modelName = modelSelect ? modelSelect.value : null;
```

### 3. **事件监听机制**

```javascript
// 监听模型切换事件
document.addEventListener('modelChanged', function(event) {
    console.log('模型已切换到:', event.detail.modelName);
});

// 监听API切换事件
document.addEventListener('apiChanged', function(event) {
    console.log('API已切换到:', event.detail.apiType);
});
```

## 🎯 实际应用建议

### 1. **模型检测函数（基于实际插件代码）**

```javascript
function detectCurrentModel() {
    try {
        // 方法1: 使用SillyTavern官方API（推荐）
        if (window.SillyTavern && typeof window.SillyTavern.getContext === 'function') {
            const context = window.SillyTavern.getContext();
            return {
                api: context.mainApi,
                model: context.currentModel || null,
                context: context  // 完整上下文信息
            };
        }

        // 方法2: 检查DOM元素（回退方案）
        const apiElement = document.querySelector('#main_api');
        const modelElement = document.querySelector('#model_select, #models_select');

        return {
            api: apiElement ? apiElement.value : null,
            model: modelElement ? modelElement.value : null,
            context: null
        };
    } catch (error) {
        console.error('检测当前模型失败:', error);
        return { api: null, model: null, context: null };
    }
}
```

### 2. **模型列表获取**

```javascript
async function getAvailableModels() {
    try {
        // 方法1: 通过SillyTavern API
        if (window.SillyTavern && window.SillyTavern.api) {
            return await window.SillyTavern.api.getAvailableModels();
        }
        
        // 方法2: 直接调用后端API
        const response = await fetch('/api/models');
        if (response.ok) {
            const data = await response.json();
            return data.models || [];
        }
        
        // 方法3: 从DOM元素获取
        const modelSelect = document.querySelector('#model_select');
        if (modelSelect) {
            return Array.from(modelSelect.options).map(option => ({
                id: option.value,
                name: option.textContent
            }));
        }
        
        return [];
    } catch (error) {
        console.error('获取模型列表失败:', error);
        return [];
    }
}
```

### 3. **实时监控**

```javascript
function setupModelMonitoring() {
    // 定期检查模型变化
    let lastModel = null;
    
    setInterval(() => {
        const currentInfo = detectCurrentModel();
        if (currentInfo.model !== lastModel) {
            console.log('检测到模型变化:', lastModel, '->', currentInfo.model);
            lastModel = currentInfo.model;
            
            // 触发自定义事件
            document.dispatchEvent(new CustomEvent('virtualPetModelChanged', {
                detail: currentInfo
            }));
        }
    }, 5000); // 每5秒检查一次
}
```

## 📊 研究结论

### 1. **SillyTavern的模型管理特点**
- **模块化设计** - 不同类型的模型（LLM、TTS、图像生成）有独立的API端点
- **RESTful API** - 使用标准的HTTP方法进行模型查询和切换
- **实时更新** - 支持动态加载和切换模型
- **多提供商支持** - 统一接口支持多种AI服务提供商

### 2. **技术实现要点**
- **API优先** - 优先使用官方API获取模型信息
- **DOM回退** - 当API不可用时，从DOM元素获取信息
- **事件驱动** - 通过事件监听模型变化
- **错误处理** - 多层回退机制确保稳定性

### 3. **对虚拟宠物插件的启示**
- **集成策略** - 可以通过多种方式获取SillyTavern的模型信息
- **兼容性** - 需要考虑不同版本的SillyTavern可能有不同的API
- **用户体验** - 可以为用户提供当前模型信息和切换选项
- **扩展性** - 为未来的新模型类型预留接口

## 💡 虚拟宠物插件实际应用案例

基于虚拟宠物插件的实际代码，以下是SillyTavern API集成的具体实现：

```javascript
// 虚拟宠物插件中的实际API调用代码（从index.js提取）
async function callAIAPI(prompt, timeout = 30000) {
    try {
        let result = null;

        // 首先尝试自定义API配置
        if (settings.apiType && settings.apiUrl && settings.apiKey) {
            result = await callCustomAPI(prompt, settings, timeout);
        }

        // 如果自定义API失败或不可用，回退到SillyTavern API
        if (!result) {
            if (typeof window.generateReply === 'function') {
                // 方法1：直接调用generateReply函数
                console.log('使用generateReply API');
                result = await window.generateReply(prompt);
            } else if (typeof window.SillyTavern !== 'undefined' && window.SillyTavern.generateReply) {
                // 方法2：通过SillyTavern命名空间调用
                console.log('使用SillyTavern.generateReply API');
                result = await window.SillyTavern.generateReply(prompt);
            } else if (typeof window.Generate !== 'undefined') {
                // 方法3：使用Generate函数
                console.log('使用Generate API');
                result = await window.Generate(prompt);
            } else {
                // 方法4：尝试通过fetch调用SillyTavern的内部API
                console.log('尝试通过fetch调用SillyTavern内部API');
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeout);

                try {
                    const response = await fetch('/api/generate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ prompt: prompt }),
                        signal: controller.signal
                    });

                    clearTimeout(timeoutId);
                    if (response.ok) {
                        const data = await response.json();
                        result = data.text || data.response || data.result;
                    } else {
                        throw new Error(`SillyTavern API调用失败: ${response.status}`);
                    }
                } catch (error) {
                    clearTimeout(timeoutId);
                    if (error.name === 'AbortError') {
                        throw new Error('SillyTavern API调用超时');
                    }
                    throw error;
                }
            }
        }

        return result;
    } catch (error) {
        console.error('AI API调用失败:', error);
        throw error;
    }
}

// API可用性检测（从虚拟宠物插件实际代码提取）
function isAIAPIAvailable() {
    // 检查SillyTavern API
    const sillyTavernAvailable = (
        typeof window.generateReply === 'function' ||
        (typeof window.SillyTavern !== 'undefined' && window.SillyTavern.generateReply) ||
        typeof window.Generate === 'function'
    );

    // 检查自定义API配置
    const customAPIAvailable = settings.apiType && settings.apiUrl && settings.apiKey;

    return sillyTavernAvailable || customAPIAvailable;
}

// 模型信息显示功能
function updateModelDisplay() {
    const modelInfo = detectCurrentModel();
    const displayElement = document.querySelector('#vps-current-model-display');

    if (displayElement && modelInfo.api) {
        displayElement.textContent = `当前API: ${modelInfo.api}`;
        if (modelInfo.model) {
            displayElement.textContent += ` | 模型: ${modelInfo.model}`;
        }
    }
}

// 调试API状态（从虚拟宠物插件实际代码提取）
function debugAPIStatus() {
    const apiAvailable = isAIAPIAvailable();

    if (!apiAvailable) {
        console.log("可用的API检查:");
        console.log(`- window.generateReply: ${typeof window.generateReply}`);
        console.log(`- window.SillyTavern: ${typeof window.SillyTavern}`);
        console.log(`- window.Generate: ${typeof window.Generate}`);
    }

    return apiAvailable;
}
```

## 🔮 后续研究方向

1. **深入分析SillyTavern源码** - 获取更准确的API实现细节
2. **测试不同版本兼容性** - 确保插件在各版本SillyTavern中正常工作
3. **性能优化** - 减少模型检测的性能开销
4. **用户界面集成** - 在虚拟宠物界面中显示当前模型信息
5. **模型切换功能** - 允许用户从插件界面切换AI模型
6. **API状态监控** - 实时监控API连接状态和响应时间

## 📝 总结

这个研究为虚拟宠物插件的AI集成提供了重要的技术基础，通过分析SillyTavern-Extras的API文档和虚拟宠物插件的实际代码，我们了解了：

1. **SillyTavern的模块化API设计**
2. **多种模型类型的统一管理方式**
3. **插件与主程序的交互模式**
4. **实际可用的API调用方法**

这些信息可以帮助实现更智能的模型感知和适配功能，提升虚拟宠物插件的AI交互体验。
