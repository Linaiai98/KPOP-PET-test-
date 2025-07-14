// js/settings.js
import { STORAGE_KEYS } from './config.js';
import { getCurrentPersonality, getPetData, updatePetData } from './pet.js';

let settings = {
    pet: {
        name: '小宠物',
        type: 'cat',
        autoSave: true,
        notifications: true,
    },
    ai: {
        apiType: '',
        apiUrl: '',
        apiKey: '',
        apiModel: '',
    },
    personality: {
        type: 'default',
        customText: '',
    }
};

/**
 * 加载所有设置
 */
export function loadSettings() {
    // Load AI settings
    const aiSettings = localStorage.getItem(STORAGE_KEYS.AI_SETTINGS);
    if (aiSettings) {
        settings.ai = JSON.parse(aiSettings);
    }

    // Load personality settings
    const personalityType = localStorage.getItem(STORAGE_KEYS.PERSONALITY_TYPE);
    if (personalityType) {
        settings.personality.type = personalityType;
    }
    const customPersonality = localStorage.getItem(STORAGE_KEYS.CUSTOM_PERSONALITY);
    if (customPersonality) {
        settings.personality.customText = customPersonality;
    }
    
    // Pet settings are derived from petData
    const petData = getPetData();
    settings.pet.name = petData.name;
    settings.pet.type = petData.type;

    return settings;
}

/**
 * 保存AI设置
 * @param {object} aiConfig 
 */
export function saveAISettings(aiConfig) {
    settings.ai = { ...settings.ai, ...aiConfig };
    localStorage.setItem(STORAGE_KEYS.AI_SETTINGS, JSON.stringify(settings.ai));
}

/**
 * 保存宠物设置
 * @param {object} petConfig 
 */
export function savePetSettings(petConfig) {
    settings.pet = { ...settings.pet, ...petConfig };
    updatePetData({ name: settings.pet.name, type: settings.pet.type });
}

/**
 * 保存人设设置
 * @param {string} type 
 * @param {string} customText 
 */
export function savePersonalitySettings(type, customText = '') {
    settings.personality.type = type;
    localStorage.setItem(STORAGE_KEYS.PERSONALITY_TYPE, type);
    if (type === 'custom') {
        settings.personality.customText = customText;
        localStorage.setItem(STORAGE_KEYS.CUSTOM_PERSONALITY, customText);
    }
    // Update personality in petData
    updatePetData({ personality: getCurrentPersonality() });
}

/**
 * 获取当前所有设置
 * @returns {object}
 */
export function getSettings() {
    return settings;
}
