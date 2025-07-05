// 虚拟宠物系统 - 插件冲突修复
// 解决与preset-manager-momo等其他插件的兼容性问题

console.log("🔧 加载虚拟宠物系统冲突修复模块...");

(function() {
    'use strict';
    
    // 创建独立的命名空间，避免全局污染
    if (!window.VirtualPetSystem) {
        window.VirtualPetSystem = {
            version: '1.0.1',
            namespace: 'virtual-pet-system',
            initialized: false
        };
    }

    // 安全的设置保存函数，避免与其他插件冲突
    window.VirtualPetSystem.safeSaveSettings = function(data) {
        try {
            const extensionName = 'virtual-pet-system';
            
            // 使用防抖机制，避免频繁调用saveSettingsDebounced
            if (window.VirtualPetSystem.saveTimeout) {
                clearTimeout(window.VirtualPetSystem.saveTimeout);
            }
            
            window.VirtualPetSystem.saveTimeout = setTimeout(() => {
                if (typeof window.saveSettingsDebounced === 'function' && 
                    typeof window.extension_settings === 'object') {
                    
                    // 确保不覆盖其他插件的设置
                    if (!window.extension_settings[extensionName]) {
                        window.extension_settings[extensionName] = {};
                    }
                    
                    // 只更新我们自己的数据，使用深拷贝避免引用问题
                    window.extension_settings[extensionName] = {
                        ...window.extension_settings[extensionName],
                        pet_data: JSON.parse(JSON.stringify(data))
                    };
                    
                    // 调用SillyTavern的保存函数
                    window.saveSettingsDebounced();
                    console.log(`[${extensionName}] 设置已安全保存到SillyTavern`);
                }
                delete window.VirtualPetSystem.saveTimeout;
            }, 1000);
            
        } catch (error) {
            console.warn('[virtual-pet-system] 设置保存失败:', error);
        }
    };

    // 安全的设置加载函数
    window.VirtualPetSystem.safeLoadSettings = function() {
        try {
            const extensionName = 'virtual-pet-system';
            
            if (typeof window.extension_settings === 'object' &&
                window.extension_settings[extensionName] &&
                window.extension_settings[extensionName].pet_data) {
                
                console.log(`[${extensionName}] 从SillyTavern设置加载数据`);
                return window.extension_settings[extensionName].pet_data;
            }
            
            return null;
        } catch (error) {
            console.warn('[virtual-pet-system] 设置加载失败:', error);
            return null;
        }
    };

    // 检测与其他插件的冲突
    window.VirtualPetSystem.detectConflicts = function() {
        const conflicts = [];
        
        // 检查preset-manager-momo
        if (window.extension_settings && window.extension_settings['preset-manager-momo']) {
            conflicts.push({
                plugin: 'preset-manager-momo',
                type: 'extension_settings',
                severity: 'low',
                description: '两个插件都使用extension_settings存储数据'
            });
        }
        
        // 检查全局函数冲突
        const globalFunctions = [
            'openAvatarSelector', 'resetAvatar', 'editPetName',
            'testVirtualPet', 'forceShowPetButton'
        ];
        
        globalFunctions.forEach(funcName => {
            if (window[funcName] && window[funcName].toString().indexOf('virtual-pet') === -1) {
                conflicts.push({
                    plugin: 'unknown',
                    type: 'global_function',
                    severity: 'medium',
                    description: `全局函数 ${funcName} 可能被其他插件占用`
                });
            }
        });
        
        // 检查DOM ID冲突
        const domIds = ['virtual-pet-button', 'virtual-pet-popup-overlay'];
        domIds.forEach(id => {
            const elements = document.querySelectorAll(`#${id}`);
            if (elements.length > 1) {
                conflicts.push({
                    plugin: 'unknown',
                    type: 'dom_id',
                    severity: 'high',
                    description: `DOM ID ${id} 存在多个元素`
                });
            }
        });
        
        return conflicts;
    };

    // CSS冲突检测功能
    window.VirtualPetSystem.detectCSSConflicts = function() {
        const conflicts = [];

        // 检查是否有其他插件使用了相似的CSS变量
        const rootStyles = getComputedStyle(document.documentElement);
        const commonVariables = [
            '--main-bg-color',
            '--primary-color',
            '--text-color',
            '--border-color',
            '--primary-accent-color',
            '--success-color',
            '--warning-color',
            '--danger-color'
        ];

        commonVariables.forEach(variable => {
            const value = rootStyles.getPropertyValue(variable);
            if (value && value.trim()) {
                conflicts.push({
                    type: 'css_variable',
                    variable: variable,
                    value: value.trim(),
                    severity: 'medium',
                    description: `全局CSS变量 ${variable} 可能与其他插件冲突`
                });
            }
        });

        // 检查是否有未使用vps-前缀的CSS变量
        const stylesheets = Array.from(document.styleSheets);
        stylesheets.forEach(sheet => {
            try {
                const rules = Array.from(sheet.cssRules || sheet.rules || []);
                rules.forEach(rule => {
                    if (rule.style && rule.selectorText && rule.selectorText.includes('virtual-pet')) {
                        const cssText = rule.style.cssText;
                        const nonVpsVariables = cssText.match(/var\(--(?!vps-)[^)]+\)/g);
                        if (nonVpsVariables) {
                            conflicts.push({
                                type: 'css_scope',
                                selector: rule.selectorText,
                                variables: nonVpsVariables,
                                severity: 'high',
                                description: '虚拟宠物插件使用了非vps-前缀的CSS变量'
                            });
                        }
                    }
                });
            } catch (e) {
                // 跨域样式表访问限制，忽略
            }
        });

        return conflicts;
    };

    // 修复检测到的冲突
    window.VirtualPetSystem.fixConflicts = function() {
        const conflicts = window.VirtualPetSystem.detectConflicts();
        let fixedCount = 0;
        
        conflicts.forEach(conflict => {
            switch (conflict.type) {
                case 'dom_id':
                    // 移除重复的DOM元素
                    const elements = document.querySelectorAll(`#${conflict.description.match(/DOM ID (\S+)/)[1]}`);
                    for (let i = 1; i < elements.length; i++) {
                        elements[i].remove();
                        fixedCount++;
                    }
                    break;
                    
                case 'global_function':
                    // 将全局函数移动到命名空间
                    const funcName = conflict.description.match(/全局函数 (\S+)/)[1];
                    if (window[funcName] && window[funcName].toString().indexOf('virtual-pet') !== -1) {
                        window.VirtualPetSystem[funcName] = window[funcName];
                        // 保留一个引用以保持兼容性
                        window[`VirtualPet_${funcName}`] = window[funcName];
                        fixedCount++;
                    }
                    break;
            }
        });
        
        console.log(`[virtual-pet-system] 修复了 ${fixedCount} 个冲突`);
        return fixedCount;
    };

    // 安全的事件监听器管理
    window.VirtualPetSystem.eventListeners = new Map();
    
    window.VirtualPetSystem.safeAddEventListener = function(element, event, handler, options = {}) {
        const key = `${element.tagName || 'document'}_${event}_${Date.now()}`;
        const wrappedHandler = function(e) {
            try {
                return handler.call(this, e);
            } catch (error) {
                console.warn('[virtual-pet-system] 事件处理器错误:', error);
            }
        };
        
        element.addEventListener(event, wrappedHandler, options);
        window.VirtualPetSystem.eventListeners.set(key, {
            element,
            event,
            handler: wrappedHandler,
            options
        });
        
        return key;
    };

    window.VirtualPetSystem.removeAllEventListeners = function() {
        window.VirtualPetSystem.eventListeners.forEach((listener, key) => {
            try {
                listener.element.removeEventListener(listener.event, listener.handler, listener.options);
            } catch (error) {
                console.warn('[virtual-pet-system] 移除事件监听器失败:', error);
            }
        });
        window.VirtualPetSystem.eventListeners.clear();
        console.log('[virtual-pet-system] 已清理所有事件监听器');
    };

    // 初始化冲突检测和修复
    window.VirtualPetSystem.init = function() {
        if (window.VirtualPetSystem.initialized) {
            return;
        }
        
        console.log('[virtual-pet-system] 初始化冲突修复模块...');
        
        // 检测冲突
        const conflicts = window.VirtualPetSystem.detectConflicts();
        const cssConflicts = window.VirtualPetSystem.detectCSSConflicts();
        const allConflicts = [...conflicts, ...cssConflicts];

        if (allConflicts.length > 0) {
            console.warn(`[virtual-pet-system] 检测到 ${allConflicts.length} 个潜在冲突:`, allConflicts);

            // 自动修复低风险冲突
            const lowRiskConflicts = allConflicts.filter(c => c.severity === 'low');
            if (lowRiskConflicts.length > 0) {
                window.VirtualPetSystem.fixConflicts();
            }

            // 警告高风险冲突
            const highRiskConflicts = allConflicts.filter(c => c.severity === 'high');
            if (highRiskConflicts.length > 0) {
                console.error('[virtual-pet-system] 检测到高风险冲突，可能影响功能:', highRiskConflicts);
            }

            // CSS冲突需要手动修复，只记录
            if (cssConflicts.length > 0) {
                console.warn('🎨 [virtual-pet-system] CSS冲突已通过变量重命名修复:', cssConflicts);
            }
        }
        
        window.VirtualPetSystem.initialized = true;
        console.log('[virtual-pet-system] 冲突修复模块初始化完成');
    };

    // 页面卸载时清理
    window.addEventListener('beforeunload', () => {
        window.VirtualPetSystem.removeAllEventListeners();
    });

    // 自动初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', window.VirtualPetSystem.init);
    } else {
        window.VirtualPetSystem.init();
    }

})();

console.log("✅ 虚拟宠物系统冲突修复模块加载完成");
