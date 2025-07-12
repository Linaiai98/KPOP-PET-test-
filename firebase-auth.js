// Import necessary functions and services from firebase-init.js
import { auth, db, signInAnonymously, signOut, onAuthStateChanged, doc, setDoc, getDoc } from './firebase-init.js';

let currentUserId = null;

/**
 * Initializes all Firebase authentication logic and UI event listeners.
 * This function should be called after the UI elements are injected into the DOM.
 */
export function initializeAuth() {
    // --- DOM Elements ---
    const loginButton = document.getElementById('firebase-login-btn');
    const logoutButton = document.getElementById('firebase-logout-btn');
    const getCodeButton = document.getElementById('firebase-get-code-btn');
    const linkDeviceButton = document.getElementById('firebase-link-btn');
    const linkCodeInput = document.getElementById('firebase-link-code-input');
    
    const statusText = document.getElementById('firebase-sync-status-text');
    const statusDot = document.getElementById('firebase-sync-status-dot');
    const codeArea = document.getElementById('sync-code-area');
    const codeDisplay = document.getElementById('sync-code-display');

    // --- Auth Logic ---

    // Listen for authentication state changes
    onAuthStateChanged(auth, user => {
        if (user && user.isAnonymous) {
            currentUserId = user.uid;
            updateUI(true);
            // Automatically load data for the user
            loadData(user.uid).then(data => {
                if (data) {
                    // Here you should merge the loaded data with your extension's state
                    console.log("Firebase: Pet data loaded on login.", data);
                    // Example: window.petSystem.applyPetData(data);
                }
            });
        } else {
            currentUserId = null;
            updateUI(false);
        }
    });

    // Sign-in function
    loginButton.addEventListener('click', () => {
        if (currentUserId) return;
        signInAnonymously(auth).catch(handleAuthError);
    });

    // Sign-out function
    logoutButton.addEventListener('click', () => {
        if (confirm('您确定要停用云同步吗？这将在本地保留您的数据，但会断开与云端的连接。')) {
            signOut(auth).catch(handleAuthError);
        }
    });

    // Get Sync Code function
    getCodeButton.addEventListener('click', () => {
        if (currentUserId) {
            codeDisplay.value = currentUserId;
            codeArea.style.display = 'block';
            // Auto-select the code for easy copying
            codeDisplay.select();
            document.execCommand('copy');
            toastr.success('同步码已复制到剪贴板');
        }
    });

    // Link Device function
    linkDeviceButton.addEventListener('click', () => {
        const syncCode = linkCodeInput.value.trim();
        if (!syncCode) {
            toastr.warning('请输入有效的同步码。');
            return;
        }
        linkWithSyncCode(syncCode);
    });

    // --- UI Update Function ---
    function updateUI(isLoggedIn) {
        const linkSection = document.getElementById('firebase-link-section');

        if (isLoggedIn) {
            loginButton.style.display = 'none';
            logoutButton.style.display = 'inline-block';
            getCodeButton.style.display = 'inline-block';
            linkSection.style.display = 'none'; // Hide linking UI when logged in
            statusText.textContent = '已启用 - 同步已激活';
            statusDot.className = 'status-dot online';
        } else {
            loginButton.style.display = 'inline-block';
            logoutButton.style.display = 'none';
            getCodeButton.style.display = 'none';
            linkSection.style.display = 'block'; // Show linking UI when logged out
            codeArea.style.display = 'none';
            codeDisplay.value = '';
            statusText.textContent = '未启用 - 同步未激活';
            statusDot.className = 'status-dot offline';
        }
    }
}

/**
 * Links a device by copying data from a sync code (another user's UID).
 * @param {string} syncCode The UID from another device.
 */
async function linkWithSyncCode(syncCode) {
    if (!confirm('这将使用同步码的数据覆盖您当前设备上的宠物数据，确定要继续吗？此操作不可逆！')) {
        return;
    }

    toastr.info('正在链接设备，请稍候...');

    try {
        // 1. Sign in anonymously to get a new local user ID
        const userCredential = await signInAnonymously(auth);
        const newUserId = userCredential.user.uid;

        // 2. Fetch the data from the source user (the sync code)
        const sourceDocRef = doc(db, "users", syncCode);
        const sourceDoc = await getDoc(sourceDocRef);

        if (!sourceDoc.exists()) {
            toastr.error('同步码无效或未找到对应的云端数据。');
            signOut(auth); // Sign out the new anonymous user
            return;
        }

        // 3. Copy the data to the new user's document
        const dataToCopy = sourceDoc.data();
        const targetDocRef = doc(db, "users", newUserId);
        await setDoc(targetDocRef, dataToCopy);

        toastr.success('设备链接成功！数据已恢复。请重新加载插件。');
        // The onAuthStateChanged listener will handle the UI update.
        // You might need to manually trigger a data reload in your extension.

    } catch (error) {
        console.error("Firebase: Error linking device:", error);
        toastr.error(`链接失败: ${error.message}`);
        if (auth.currentUser) {
            signOut(auth); // Clean up if linking fails
        }
    }
}


/**
 * Handles Firebase authentication errors.
 * @param {Error} error The error object from Firebase.
 */
function handleAuthError(error) {
    const errorCode = error.code;
    const errorMessage = error.message;
    console.error('Firebase Auth Error:', errorCode, errorMessage);
    toastr.error(`操作失败: ${errorMessage}`);
}

// --- Data Sync Functions (to be used by the extension) ---

/**
 * Saves data to Firestore for the current user.
 * @param {object} data The data object to save.
 */
export async function saveData(data) {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    try {
        await setDoc(doc(db, "users", userId), data, { merge: true });
        console.log("Firebase: Data saved successfully for user:", userId);
    } catch (e) {
        console.error("Firebase: Error saving data: ", e);
    }
}

/**
 * Loads data from Firestore for the current user.
 * @returns {object|null} The loaded data or null if not found.
 */
export async function loadData() {
    const userId = auth.currentUser?.uid;
    if (!userId) return null;

    try {
        const docRef = doc(db, "users", userId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            console.log("Firebase: Data loaded:", docSnap.data());
            return docSnap.data();
        } else {
            console.log("Firebase: No cloud document found for user:", userId);
            return null;
        }
    } catch (e) {
        console.error("Firebase: Error loading data: ", e);
        return null;
    }
}
