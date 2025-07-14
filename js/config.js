// js/config.js

export const extensionName = "virtual-pet-system";
export const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

// 存储键
export const STORAGE_KEYS = {
    BUTTON_POS: "virtual-pet-button-position",
    ENABLED: "virtual-pet-enabled",
    PET_DATA: "virtual-pet-data",
    CUSTOM_AVATAR: "virtual-pet-custom-avatar",
    AI_SETTINGS: "virtual-pet-ai-settings",
    PERSONALITY_TYPE: "virtual-pet-personality-type",
    CUSTOM_PERSONALITY: "virtual-pet-custom-personality",
};

// Firebase 相关常量
export const FIREBASE_CONFIG = {
    apiKey: "AIzaSyA74TnN9IoyQjCncKOIOShWEktrL1hd96o",
    authDomain: "kpop-pett.firebaseapp.com",
    projectId: "kpop-pett",
    storageBucket: "kpop-pett.firebasestorage.app",
    messagingSenderId: "264650615774",
    appId: "1:264650615774:web:f500ff555183110c3f0b4f",
    measurementId: "G-3BH0GMJR3D"
};

// DOM IDs
export const DOM_IDS = {
    button: "virtual-pet-button",
    overlay: "virtual-pet-popup-overlay",
    popup: "virtual-pet-popup",
    closeButton: "virtual-pet-popup-close-button",
    toggle: "virtual-pet-enabled-toggle",
};

// 预设人设
export const PRESET_PERSONALITIES = {
    'default': "一只高冷但内心温柔的猫，喜欢被投喂，但嘴上不承认。说话时经常用'哼'开头，偶尔会露出可爱的一面。",
    'cheerful': "一只活泼可爱的小狗，总是充满活力，喜欢和主人玩耍。说话热情洋溢，经常用感叹号，喜欢撒娇卖萌。",
    'elegant': "一只优雅的龙，说话古典文雅，有着高贵的气质。喜欢用文言文或古风词汇，举止优雅，但内心其实很温暖。",
    'shy': "一只害羞的兔子，说话轻声细语，容易脸红。性格温柔内向，喜欢用'...'和颜文字，偶尔会结巴。",
    'smart': "一只聪明的鸟，喜欢说俏皮话，有时会调皮捣蛋。说话机智幽默，喜欢用双关语和小聪明，偶尔会炫耀知识。"
};
