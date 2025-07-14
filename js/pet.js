// js/pet.js
import { STORAGE_KEYS, PRESET_PERSONALITIES } from './config.js';

// 宠物数据结构
let petData = {
    name: "小宠物",
    type: "cat",
    level: 1,
    experience: 0,
    health: 35,
    happiness: 30,
    hunger: 40,
    energy: 45,
    lifeStage: "baby",
    age: 0,
    isAlive: true,
    deathReason: null,
    sickness: 0,
    discipline: 50,
    weight: 30,
    lastFeedTime: Date.now(),
    lastPlayTime: Date.now(),
    lastSleepTime: Date.now(),
    lastUpdateTime: Date.now(),
    lastCareTime: Date.now(),
    created: Date.now(),
    careNeglectCount: 0,
    sicknessDuration: 0,
    coins: 100,
    inventory: {},
    personality: '',
    dataVersion: 4.0
};

/**
 * 加载宠物数据
 */
export function loadPetData() {
    const savedData = localStorage.getItem(STORAGE_KEYS.PET_DATA);
    if (savedData) {
        try {
            const parsedData = JSON.parse(savedData);
            // 合并加载的数据，以防止未来添加新属性时出错
            petData = { ...petData, ...parsedData };
        } catch (error) {
            console.error("Error parsing pet data from localStorage", error);
        }
    }
    // 确保人设与数据同步
    petData.personality = getCurrentPersonality();
    return petData;
}

/**
 * 保存宠物数据
 */
export function savePetData() {
    localStorage.setItem(STORAGE_KEYS.PET_DATA, JSON.stringify(petData));
}

/**
 * 获取当前宠物数据
 * @returns {object}
 */
export function getPetData() {
    return petData;
}

/**
 * 更新宠物数据
 * @param {object} updates - 要更新的字段
 */
export function updatePetData(updates) {
    petData = { ...petData, ...updates };
    savePetData();
    // 在这里可以触发一个事件，通知UI更新
    document.dispatchEvent(new CustomEvent('petDataUpdated', { detail: petData }));
}

/**
 * 获取当前有效的人设
 * @returns {string} 当前人设描述
 */
export function getCurrentPersonality() {
    const selectedType = localStorage.getItem(STORAGE_KEYS.PERSONALITY_TYPE) || 'default';

    if (selectedType === 'custom') {
        const customPersonality = localStorage.getItem(STORAGE_KEYS.CUSTOM_PERSONALITY) || '';
        if (!customPersonality.trim()) {
            return "一个可爱的虚拟宠物，性格温和友善，喜欢和主人互动。";
        }
        return customPersonality;
    } else {
        return PRESET_PERSONALITIES[selectedType] || PRESET_PERSONALITIES.default;
    }
}

/**
 * 重置宠物数据
 */
export function resetPetData() {
    const created = Date.now();
    petData = {
        ...petData, // 保留一些基本设置，如类型
        name: "小宠物",
        level: 1,
        experience: 0,
        health: 100,
        happiness: 100,
        hunger: 100,
        energy: 100,
        created: created,
        lastUpdateTime: created,
    };
    savePetData();
    document.dispatchEvent(new CustomEvent('petDataUpdated', { detail: petData }));
}
