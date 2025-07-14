// js/firebase.js
import { FIREBASE_CONFIG } from './config.js';

let firebaseApp = null;
let firebaseAuth = null;
let firebaseDb = null;
let firebaseStorage = null;
let currentUser = null;
let isFirebaseInitialized = false;

/**
 * 动态加载Firebase SDK
 */
async function loadFirebaseSDK() {
    return new Promise((resolve, reject) => {
        if (typeof firebase !== 'undefined') {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js';
        script.onload = () => {
            const authScript = document.createElement('script');
            authScript.src = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js';
            authScript.onload = () => {
                const firestoreScript = document.createElement('script');
                firestoreScript.src = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js';
                firestoreScript.onload = () => {
                    const storageScript = document.createElement('script');
                    storageScript.src = 'https://www.gstatic.com/firebasejs/9.23.0/firebase-storage-compat.js';
                    storageScript.onload = resolve;
                    storageScript.onerror = reject;
                    document.head.appendChild(storageScript);
                };
                firestoreScript.onerror = reject;
                document.head.appendChild(firestoreScript);
            };
            authScript.onerror = reject;
            document.head.appendChild(authScript);
        };
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

/**
 * 初始化Firebase服务
 */
export async function initializeFirebase() {
    if (isFirebaseInitialized) return;

    await loadFirebaseSDK();

    try {
        firebaseApp = firebase.initializeApp(FIREBASE_CONFIG);
        firebaseAuth = firebase.auth();
        firebaseDb = firebase.firestore();
        firebaseStorage = firebase.storage();

        firebaseAuth.onAuthStateChanged(user => {
            currentUser = user;
            document.dispatchEvent(new CustomEvent('firebaseAuthStateChanged', { detail: { user } }));
        });

        isFirebaseInitialized = true;
        console.log("Firebase initialized successfully.");
    } catch (error) {
        console.error("Firebase initialization failed:", error);
        throw error;
    }
}

/**
 * 匿名登录
 */
export async function signInAnonymously() {
    if (!firebaseAuth) throw new Error("Firebase not initialized.");
    try {
        const userCredential = await firebaseAuth.signInAnonymously();
        currentUser = userCredential.user;
        return currentUser;
    } catch (error) {
        console.error("Firebase anonymous sign-in failed:", error);
        throw error;
    }
}

/**
 * 备份数据
 * @param {object} dataToBackup 
 */
export async function backupData(dataToBackup) {
    if (!currentUser) throw new Error("User not signed in.");
    const userDoc = firebaseDb.collection('users').doc(currentUser.uid);
    await userDoc.set(dataToBackup, { merge: true });
}

/**
 * 恢复数据
 * @returns {Promise<object>}
 */
export async function restoreData() {
    if (!currentUser) throw new Error("User not signed in.");
    const userDoc = firebaseDb.collection('users').doc(currentUser.uid);
    const docSnapshot = await userDoc.get();
    if (!docSnapshot.exists) {
        throw new Error("No backup data found in the cloud.");
    }
    return docSnapshot.data();
}

/**
 * 上传文件并获取URL
 * @param {string} path 
 * @param {File | Blob | string} file 
 * @returns {Promise<string>}
 */
export async function uploadFile(path, file) {
    if (!firebaseStorage || !currentUser) throw new Error("Firebase Storage not ready.");
    const storageRef = firebaseStorage.ref().child(path);
    
    if (typeof file === 'string' && file.startsWith('data:')) {
        await storageRef.putString(file, 'data_url');
    } else {
        await storageRef.put(file);
    }
    
    return await storageRef.getDownloadURL();
}
