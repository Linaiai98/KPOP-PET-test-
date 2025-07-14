// js/ui.js
import { DOM_IDS } from './config.js';
import { getPetData } from './pet.js';

let popupContainer = null;

/**
 * 加载视图模板
 * @param {string} viewName - 模板文件名 (e.g., 'main-view')
 * @returns {Promise<string>} HTML内容
 */
async function loadTemplate(viewName) {
    const response = await fetch(`templates/${viewName}.html`);
    if (!response.ok) {
        throw new Error(`Failed to load template: ${viewName}`);
    }
    return response.text();
}

/**
 * 切换视图
 * @param {string} viewName 
 */
export async function switchView(viewName) {
    if (!popupContainer) {
        popupContainer = document.getElementById(DOM_IDS.popup);
    }
    try {
        const template = await loadTemplate(viewName);
        popupContainer.innerHTML = template;
        // Re-bind events for the new view
        document.dispatchEvent(new CustomEvent('viewChanged', { detail: { viewName } }));
    } catch (error) {
        console.error(error);
        popupContainer.innerHTML = `<p>Error loading view: ${viewName}</p>`;
    }
}

/**
 * 渲染宠物状态
 */
export function renderPetStatus() {
    const petData = getPetData();
    const statusContainer = document.getElementById('pet-status-container');
    if (!statusContainer) return;

    statusContainer.innerHTML = `
        <div class="pet-avatar">
            <span class="pet-emoji">${getPetEmoji(petData.type)}</span>
            <div class="pet-name">${petData.name}</div>
            <div class="pet-level">Lv. ${petData.level}</div>
        </div>
        <div class="pet-stats">
            ${createStatBar('health', '❤️', petData.health)}
            ${createStatBar('happiness', '😊', petData.happiness)}
            ${createStatBar('hunger', '🍖', petData.hunger)}
            ${createStatBar('energy', '⚡️', petData.energy)}
        </div>
    `;
}

function createStatBar(id, label, value) {
    return `
        <div class="stat-bar" id="stat-${id}">
            <label>${label}</label>
            <div class="progress-bar">
                <div class="progress-fill ${id}" style="width: ${value}%;"></div>
            </div>
            <span>${value}%</span>
        </div>
    `;
}

function getPetEmoji(type) {
    const EMOJIS = {
        cat: '🐱',
        dog: '🐶',
        dragon: '🐉',
        rabbit: '🐰',
        bird: '🐦',
    };
    return EMOJIS[type] || '🐾';
}


/**
 * 显示/隐藏弹窗
 * @param {boolean} show 
 */
export function togglePopup(show) {
    const overlay = document.getElementById(DOM_IDS.overlay);
    if (overlay) {
        overlay.style.display = show ? 'flex' : 'none';
        if (show) {
            switchView('main-view');
        }
    }
}

/**
 * 初始化浮动按钮拖动功能
 */
export function makeDraggable(element) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    
    element.onmousedown = dragMouseDown;

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
        element.classList.add('dragging');
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        
        let newTop = element.offsetTop - pos2;
        let newLeft = element.offsetLeft - pos1;

        // Prevent dragging off-screen
        newTop = Math.max(0, Math.min(newTop, window.innerHeight - element.offsetHeight));
        newLeft = Math.max(0, Math.min(newLeft, window.innerWidth - element.offsetWidth));

        element.style.top = newTop + "px";
        element.style.left = newLeft + "px";
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
        element.classList.remove('dragging');
        // Save position
        localStorage.setItem('virtual-pet-button-position', JSON.stringify({top: element.style.top, left: element.style.left}));
    }
}
