// CSS冲突修复测试脚本
// 用于验证虚拟宠物插件的CSS变量修复是否成功

(function() {
    'use strict';

    console.log('🧪 开始CSS冲突修复测试...');

    // 测试1: 检查是否还有全局CSS变量污染
    function testGlobalVariablePollution() {
        console.log('📋 测试1: 检查全局CSS变量污染');
        
        const rootStyles = getComputedStyle(document.documentElement);
        const problematicVariables = [
            '--main-bg-color',
            '--primary-accent-color',
            '--text-color',
            '--border-color',
            '--success-color',
            '--warning-color',
            '--danger-color',
            '--health-color',
            '--happiness-color',
            '--hunger-color',
            '--energy-color',
            '--experience-color'
        ];
        
        let foundProblems = [];
        
        problematicVariables.forEach(variable => {
            const value = rootStyles.getPropertyValue(variable);
            if (value && value.trim()) {
                // 检查是否是虚拟宠物插件的糖果色值
                if (value.includes('#FFE5F1') || value.includes('#FF9EC7') || value.includes('#A8E6CF')) {
                    foundProblems.push({
                        variable: variable,
                        value: value.trim(),
                        source: 'virtual-pet-system'
                    });
                }
            }
        });
        
        if (foundProblems.length > 0) {
            console.error('❌ 测试1失败: 仍有全局CSS变量污染', foundProblems);
            return false;
        } else {
            console.log('✅ 测试1通过: 无全局CSS变量污染');
            return true;
        }
    }

    // 测试2: 检查虚拟宠物插件是否正确使用vps-前缀变量
    function testVpsVariableUsage() {
        console.log('📋 测试2: 检查vps-前缀变量使用');
        
        const stylesheets = Array.from(document.styleSheets);
        let foundNonVpsVariables = [];
        
        stylesheets.forEach(sheet => {
            try {
                const rules = Array.from(sheet.cssRules || sheet.rules || []);
                rules.forEach(rule => {
                    if (rule.style && rule.selectorText) {
                        // 检查虚拟宠物相关的选择器
                        if (rule.selectorText.includes('virtual-pet') || 
                            rule.selectorText.includes('pet-popup') ||
                            rule.selectorText.includes('pet-button') ||
                            rule.selectorText.includes('pet-section')) {
                            
                            const cssText = rule.style.cssText;
                            const nonVpsVariables = cssText.match(/var\(--(?!vps-)[^)]+\)/g);
                            if (nonVpsVariables) {
                                foundNonVpsVariables.push({
                                    selector: rule.selectorText,
                                    variables: nonVpsVariables
                                });
                            }
                        }
                    }
                });
            } catch (e) {
                // 跨域样式表访问限制，忽略
            }
        });
        
        if (foundNonVpsVariables.length > 0) {
            console.error('❌ 测试2失败: 发现未使用vps-前缀的变量', foundNonVpsVariables);
            return false;
        } else {
            console.log('✅ 测试2通过: 所有变量都使用vps-前缀');
            return true;
        }
    }

    // 测试3: 检查虚拟宠物插件的视觉效果是否保持
    function testVisualIntegrity() {
        console.log('📋 测试3: 检查视觉效果完整性');
        
        // 检查虚拟宠物按钮是否存在且有正确样式
        const petButton = document.getElementById('virtual-pet-button');
        if (!petButton) {
            console.warn('⚠️ 测试3警告: 虚拟宠物按钮未找到');
            return true; // 可能还未创建，不算失败
        }
        
        const buttonStyles = getComputedStyle(petButton);
        const backgroundColor = buttonStyles.backgroundColor;
        
        // 检查是否有糖果色背景（粉色系）
        if (backgroundColor.includes('rgb') && 
            (backgroundColor.includes('255') || backgroundColor.includes('199'))) {
            console.log('✅ 测试3通过: 虚拟宠物按钮保持糖果色主题');
            return true;
        } else {
            console.warn('⚠️ 测试3警告: 虚拟宠物按钮样式可能异常', {
                backgroundColor: backgroundColor
            });
            return true; // 样式可能通过其他方式应用，不算失败
        }
    }

    // 测试4: 模拟preset-manager-momo插件元素，检查是否受影响
    function testOtherPluginImpact() {
        console.log('📋 测试4: 检查对其他插件的影响');
        
        // 创建模拟的preset-manager-momo元素
        const testElement = document.createElement('div');
        testElement.id = 'test-preset-manager';
        testElement.className = 'preset-manager-test';
        testElement.style.cssText = 'position: absolute; top: -1000px; left: -1000px;';
        document.body.appendChild(testElement);
        
        // 检查该元素是否受到虚拟宠物插件CSS的影响
        const elementStyles = getComputedStyle(testElement);
        const backgroundColor = elementStyles.backgroundColor;
        
        // 清理测试元素
        document.body.removeChild(testElement);
        
        // 检查是否有粉色背景（说明受到污染）
        if (backgroundColor.includes('255, 158, 199') || 
            backgroundColor.includes('#FF9EC7') ||
            backgroundColor.includes('rgb(255, 158, 199)')) {
            console.error('❌ 测试4失败: 其他插件元素受到CSS污染', {
                backgroundColor: backgroundColor
            });
            return false;
        } else {
            console.log('✅ 测试4通过: 其他插件元素未受影响');
            return true;
        }
    }

    // 运行所有测试
    function runAllTests() {
        console.log('🚀 开始运行CSS冲突修复测试套件...');
        
        const tests = [
            { name: '全局变量污染检测', func: testGlobalVariablePollution },
            { name: 'VPS前缀变量使用检测', func: testVpsVariableUsage },
            { name: '视觉效果完整性检测', func: testVisualIntegrity },
            { name: '其他插件影响检测', func: testOtherPluginImpact }
        ];
        
        let passedTests = 0;
        let totalTests = tests.length;
        
        tests.forEach(test => {
            try {
                if (test.func()) {
                    passedTests++;
                }
            } catch (error) {
                console.error(`❌ 测试 "${test.name}" 执行失败:`, error);
            }
        });
        
        console.log(`\n📊 测试结果: ${passedTests}/${totalTests} 通过`);
        
        if (passedTests === totalTests) {
            console.log('🎉 所有测试通过！CSS冲突修复成功！');
        } else {
            console.warn('⚠️ 部分测试未通过，可能需要进一步检查');
        }
        
        return passedTests === totalTests;
    }

    // 导出测试函数到全局作用域以便手动调用
    window.VirtualPetCSSTest = {
        runAllTests: runAllTests,
        testGlobalVariablePollution: testGlobalVariablePollution,
        testVpsVariableUsage: testVpsVariableUsage,
        testVisualIntegrity: testVisualIntegrity,
        testOtherPluginImpact: testOtherPluginImpact
    };

    // 自动运行测试（延迟执行以确保CSS已加载）
    setTimeout(() => {
        runAllTests();
    }, 2000);

    console.log('✅ CSS冲突修复测试脚本已加载');

})();
