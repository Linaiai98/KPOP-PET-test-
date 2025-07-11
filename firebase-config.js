// WARNING: DO NOT COMMIT THIS FILE TO GITHUB.
// This file contains your Firebase project's credentials.
// It should be kept private.

const firebaseConfig = {
  apiKey: "AIzaSyA74TnN9IoyQjCncKOIOShWEktrL1hd96o",
  authDomain: "kpop-pett.firebaseapp.com",
  projectId: "kpop-pett",
  storageBucket: "kpop-pett.appspot.com", // Corrected domain
  messagingSenderId: "264650615774",
  appId: "1:264650615774:web:f500ff555183110c3f0b4f",
  measurementId: "G-3BH0GMJR3D"
};

// 导出配置供插件使用
window.firebaseConfig = firebaseConfig;

console.log('[Virtual Pet] Firebase config loaded');