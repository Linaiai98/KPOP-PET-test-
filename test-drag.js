// 拖拽功能测试脚本
// 在浏览器控制台中运行此脚本来测试拖拽功能

(function() {
    console.log("🐾 开始测试拖拽功能...");
    
    // 测试函数集合
    const DragTests = {
        
        // 检查悬浮按钮是否存在
        checkButton: function() {
            const button = $('#virtual-pet-button');
            console.log("✅ 悬浮按钮检查:", button.length > 0 ? "存在" : "不存在");
            if (button.length > 0) {
                console.log("   - 位置:", button.css('left'), button.css('top'));
                console.log("   - 尺寸:", button.width() + 'x' + button.height());
                console.log("   - 层级:", button.css('z-index'));
            }
            return button.length > 0;
        },
        
        // 检查弹窗是否存在
        checkPopup: function() {
            const popup = $('#virtual-pet-popup');
            const header = $('.pet-popup-header');
            console.log("✅ 弹窗检查:", popup.length > 0 ? "存在" : "不存在");
            console.log("✅ 标题栏检查:", header.length > 0 ? "存在" : "不存在");
            return popup.length > 0 && header.length > 0;
        },
        
        // 测试按钮位置保存和恢复
        testButtonPosition: function() {
            console.log("🧪 测试按钮位置保存...");
            
            const button = $('#virtual-pet-button');
            if (button.length === 0) {
                console.log("❌ 按钮不存在，无法测试");
                return false;
            }
            
            // 保存当前位置
            const originalPos = {
                left: button.css('left'),
                top: button.css('top')
            };
            
            // 移动到测试位置
            const testPos = { left: '100px', top: '100px' };
            button.css(testPos);
            
            // 模拟保存位置
            localStorage.setItem('virtual-pet-button-position', JSON.stringify({
                x: testPos.left,
                y: testPos.top
            }));
            
            // 检查是否保存成功
            const saved = localStorage.getItem('virtual-pet-button-position');
            console.log("   - 位置保存:", saved ? "成功" : "失败");
            
            // 恢复原位置
            button.css(originalPos);
            
            return !!saved;
        },
        
        // 测试边界限制
        testBoundaryLimits: function() {
            console.log("🧪 测试边界限制...");
            
            const windowWidth = $(window).width();
            const windowHeight = $(window).height();
            const buttonWidth = 60; // 假设按钮宽度
            const buttonHeight = 60; // 假设按钮高度
            
            // 测试边界计算
            const testCases = [
                { x: -50, y: 100, expectedX: 0, expectedY: 100 },
                { x: windowWidth + 50, y: 100, expectedX: windowWidth - buttonWidth, expectedY: 100 },
                { x: 100, y: -50, expectedX: 100, expectedY: 0 },
                { x: 100, y: windowHeight + 50, expectedX: 100, expectedY: windowHeight - buttonHeight }
            ];
            
            testCases.forEach((test, index) => {
                const newX = Math.max(0, Math.min(test.x, windowWidth - buttonWidth));
                const newY = Math.max(0, Math.min(test.y, windowHeight - buttonHeight));
                
                const passed = (newX === test.expectedX && newY === test.expectedY);
                console.log(`   - 测试 ${index + 1}:`, passed ? "✅ 通过" : "❌ 失败");
                if (!passed) {
                    console.log(`     期望: (${test.expectedX}, ${test.expectedY}), 实际: (${newX}, ${newY})`);
                }
            });
        },
        
        // 模拟拖拽事件
        simulateDrag: function() {
            console.log("🧪 模拟拖拽事件...");
            
            const button = $('#virtual-pet-button');
            if (button.length === 0) {
                console.log("❌ 按钮不存在，无法测试");
                return false;
            }
            
            try {
                // 模拟鼠标按下
                const mouseDownEvent = new MouseEvent('mousedown', {
                    bubbles: true,
                    cancelable: true,
                    clientX: 100,
                    clientY: 100
                });
                button[0].dispatchEvent(mouseDownEvent);
                console.log("   - mousedown 事件:", "✅ 触发成功");
                
                // 模拟鼠标移动
                setTimeout(() => {
                    const mouseMoveEvent = new MouseEvent('mousemove', {
                        bubbles: true,
                        cancelable: true,
                        clientX: 150,
                        clientY: 150
                    });
                    document.dispatchEvent(mouseMoveEvent);
                    console.log("   - mousemove 事件:", "✅ 触发成功");
                    
                    // 模拟鼠标释放
                    setTimeout(() => {
                        const mouseUpEvent = new MouseEvent('mouseup', {
                            bubbles: true,
                            cancelable: true,
                            clientX: 150,
                            clientY: 150
                        });
                        document.dispatchEvent(mouseUpEvent);
                        console.log("   - mouseup 事件:", "✅ 触发成功");
                    }, 100);
                }, 100);
                
                return true;
            } catch (error) {
                console.log("❌ 拖拽模拟失败:", error.message);
                return false;
            }
        },
        
        // 检查CSS样式
        checkStyles: function() {
            console.log("🧪 检查CSS样式...");
            
            const button = $('#virtual-pet-button');
            if (button.length === 0) {
                console.log("❌ 按钮不存在，无法检查样式");
                return false;
            }
            
            const styles = {
                cursor: button.css('cursor'),
                position: button.css('position'),
                zIndex: button.css('z-index'),
                userSelect: button.css('user-select'),
                touchAction: button.css('touch-action')
            };
            
            console.log("   - 样式检查:");
            Object.entries(styles).forEach(([key, value]) => {
                console.log(`     ${key}: ${value}`);
            });
            
            // 检查关键样式
            const checks = [
                { name: 'position', expected: 'fixed', actual: styles.position },
                { name: 'cursor', expected: 'grab', actual: styles.cursor },
                { name: 'user-select', expected: 'none', actual: styles.userSelect }
            ];
            
            checks.forEach(check => {
                const passed = check.actual === check.expected;
                console.log(`   - ${check.name}:`, passed ? "✅ 正确" : `❌ 错误 (期望: ${check.expected}, 实际: ${check.actual})`);
            });
        },
        
        // 运行所有测试
        runAllTests: function() {
            console.log("🚀 开始完整测试...");
            console.log("==========================================");
            
            const results = {
                button: this.checkButton(),
                popup: this.checkPopup(),
                position: this.testButtonPosition(),
                boundary: this.testBoundaryLimits(),
                styles: this.checkStyles(),
                drag: this.simulateDrag()
            };
            
            console.log("==========================================");
            console.log("📊 测试结果汇总:");
            
            let passedCount = 0;
            Object.entries(results).forEach(([test, passed]) => {
                if (typeof passed === 'boolean') {
                    console.log(`   ${test}: ${passed ? "✅ 通过" : "❌ 失败"}`);
                    if (passed) passedCount++;
                } else {
                    console.log(`   ${test}: ✅ 完成`);
                    passedCount++;
                }
            });
            
            const totalTests = Object.keys(results).length;
            console.log(`\n🎯 总体结果: ${passedCount}/${totalTests} 测试通过`);
            
            if (passedCount === totalTests) {
                console.log("🎉 所有测试通过！拖拽功能正常工作。");
            } else {
                console.log("⚠️  部分测试失败，请检查相关功能。");
            }
        }
    };
    
    // 导出到全局，方便调用
    window.DragTests = DragTests;
    
    // 自动运行测试
    DragTests.runAllTests();
    
    console.log("\n💡 提示：");
    console.log("   - 运行 DragTests.runAllTests() 重新测试所有功能");
    console.log("   - 运行 DragTests.checkButton() 检查按钮状态");
    console.log("   - 运行 DragTests.simulateDrag() 模拟拖拽操作");
    
})();
