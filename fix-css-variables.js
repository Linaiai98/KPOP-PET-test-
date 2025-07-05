// CSS变量批量替换脚本
// 用于修复虚拟宠物系统CSS变量冲突问题

const fs = require('fs');
const path = require('path');

// CSS变量映射表
const variableMap = {
    '--main-bg-color': '--vps-main-bg-color',
    '--main-bg-solid': '--vps-main-bg-solid',
    '--section-bg-color': '--vps-section-bg-color',
    '--text-color': '--vps-text-color',
    '--text-muted-color': '--vps-text-muted-color',
    '--text-light-color': '--vps-text-light-color',
    '--primary-accent-color': '--vps-primary-accent-color',
    '--primary-accent-hover-color': '--vps-primary-accent-hover-color',
    '--secondary-accent-color': '--vps-secondary-accent-color',
    '--tertiary-accent-color': '--vps-tertiary-accent-color',
    '--success-color': '--vps-success-color',
    '--warning-color': '--vps-warning-color',
    '--danger-color': '--vps-danger-color',
    '--info-color': '--vps-info-color',
    '--border-color': '--vps-border-color',
    '--border-accent-color': '--vps-border-accent-color',
    '--box-shadow': '--vps-box-shadow',
    '--box-shadow-light': '--vps-box-shadow-light',
    '--font-family': '--vps-font-family',
    '--border-radius': '--vps-border-radius',
    '--border-radius-small': '--vps-border-radius-small',
    '--health-color': '--vps-health-color',
    '--happiness-color': '--vps-happiness-color',
    '--hunger-color': '--vps-hunger-color',
    '--energy-color': '--vps-energy-color',
    '--experience-color': '--vps-experience-color'
};

function fixCSSVariables(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;
        
        // 替换所有CSS变量引用
        for (const [oldVar, newVar] of Object.entries(variableMap)) {
            const regex = new RegExp(`var\\(${oldVar.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')}\\)`, 'g');
            if (content.includes(`var(${oldVar})`)) {
                content = content.replace(regex, `var(${newVar})`);
                modified = true;
                console.log(`✅ 替换: ${oldVar} -> ${newVar}`);
            }
        }
        
        if (modified) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`🎉 文件已更新: ${filePath}`);
        } else {
            console.log(`ℹ️ 文件无需更新: ${filePath}`);
        }
        
        return modified;
    } catch (error) {
        console.error(`❌ 处理文件失败: ${filePath}`, error);
        return false;
    }
}

// 主函数
function main() {
    console.log('🔧 开始修复CSS变量冲突...');
    
    const cssFile = './style.css';
    
    if (fs.existsSync(cssFile)) {
        const modified = fixCSSVariables(cssFile);
        if (modified) {
            console.log('✅ CSS变量冲突修复完成！');
        } else {
            console.log('ℹ️ 未发现需要修复的CSS变量');
        }
    } else {
        console.error('❌ 找不到style.css文件');
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    main();
}

module.exports = { fixCSSVariables, variableMap };
