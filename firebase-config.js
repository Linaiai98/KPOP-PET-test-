// Firebase配置和初始化模块 - **V2 (Simplified)**
// 虚拟宠物系统 - Firebase集成

console.log("🔥 Firebase Config V2 (Simplified) loading...");

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA74TnN9IoyQjCncKOIOShWEktrL1hd96o",
  authDomain: "kpop-pett.firebaseapp.com",
  projectId: "kpop-pett",
  storageBucket: "kpop-pett.firebasestorage.app",
  messagingSenderId: "264650615774",
  appId: "1:264650615774:web:f500ff555183110c3f0b4f",
  measurementId: "G-3BH0GMJR3D"
};

// Global Firebase service variables
let app, auth, db, storage;
let currentUser = null;
let isFirebaseReady = false;

const FIREBASE_UID_KEY = 'kpop-pet-firebase-uid';

/**
 * Initializes the Firebase app and services.
 * This is the core connection function.
 */
async function initializeFirebase() {
    try {
        console.log("🔥 Initializing Firebase Core Services...");
        
        app = firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        db = firebase.firestore();
        storage = firebase.storage();
        
        console.log("✅ Firebase Core Services Initialized.");
        
        setupAuthListener();
        
        isFirebaseReady = true;
        return true;
        
    } catch (error) {
        console.error("❌ Firebase Initialization Failed:", error);
        isFirebaseReady = false;
        return false;
    }
}

/**
 * Sets up the listener for authentication state changes.
 * Handles anonymous login and user state updates.
 */
function setupAuthListener() {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            console.log("👤 User is authenticated:", user.uid);

            // Persist UID to local storage if it's new
            if (!localStorage.getItem(FIREBASE_UID_KEY)) {
                localStorage.setItem(FIREBASE_UID_KEY, user.uid);
                console.log(`[Auth] New anonymous user UID stored: ${user.uid}`);
            }

            // Notify other parts of the plugin that auth is complete
            document.dispatchEvent(new CustomEvent('firebase-auth-ready', { detail: { user } }));

        } else {
            currentUser = null;
            console.log("👤 User is not authenticated. Attempting anonymous sign-in...");
            try {
                await auth.signInAnonymously();
            } catch (error) {
                console.error("❌ Anonymous sign-in failed:", error);
            }
        }
    });

    // Re-authentication logic using stored UID
    const storedUid = localStorage.getItem(FIREBASE_UID_KEY);
    if (storedUid) {
        console.log(`[Auth] Found stored UID: ${storedUid}. Re-using identity.`);
        // Simulate user object and trigger auth-ready event
        const user = { uid: storedUid };
        currentUser = user;
        document.dispatchEvent(new CustomEvent('firebase-auth-ready', { detail: { user } }));
    } 
}

/**
 * Provides the current status of Firebase services.
 */
function getFirebaseStatus() {
    return {
        isReady: isFirebaseReady,
        isAuthenticated: !!currentUser,
        userId: currentUser?.uid || null,
    };
}

// Export the simplified FirebaseService
window.FirebaseService = {
    initialize: initializeFirebase,
    getStatus: getFirebaseStatus,
    isReady: () => isFirebaseReady,
    getCurrentUser: () => currentUser,
    getApp: () => app,
    getAuth: () => auth,
    getFirestore: () => db,
    getStorage: () => storage,
};

console.log("✅ Firebase Config V2 (Simplified) loaded.");