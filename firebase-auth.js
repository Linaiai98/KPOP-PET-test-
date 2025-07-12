// Import necessary functions and services from firebase-init.js
import { auth, db, signInAnonymously, signOut, onAuthStateChanged, doc, setDoc, getDoc } from './firebase-init.js';

// --- DOM Elements ---
const loginButton = document.getElementById('firebase-login-btn');
const logoutButton = document.getElementById('firebase-logout-btn');
const getCodeButton = document.getElementById('firebase-get-code-btn');
const statusText = document.getElementById('firebase-sync-status-text');
const statusDot = document.getElementById('firebase-sync-status-dot');
const codeArea = document.getElementById('sync-code-area');
const codeDisplay = document.getElementById('sync-code-display');

let currentUserId = null;

// --- Auth Logic ---

// Listen for authentication state changes
onAuthStateChanged(auth, user => {
    if (user && user.isAnonymous) {
        // User is signed in anonymously
        console.log('Firebase: User is signed in anonymously.', user);
        currentUserId = user.uid;
        updateUI(true, user);
        // You can now load data from Firestore for this user
        // loadData(user.uid);
    } else {
        // User is signed out
        console.log('Firebase: User is signed out.');
        currentUserId = null;
        updateUI(false, null);
    }
});

// Sign-in function
loginButton.addEventListener('click', () => {
    if (currentUserId) return; // Already logged in
    signInAnonymously(auth)
        .catch((error) => {
            const errorCode = error.code;
            const errorMessage = error.message;
            console.error('Firebase: Anonymous sign-in failed', errorCode, errorMessage);
            statusText.textContent = `启用失败: ${errorMessage}`;
        });
});

// Sign-out function
logoutButton.addEventListener('click', () => {
    signOut(auth).catch((error) => {
        console.error('Firebase: Sign-out failed', error);
    });
});

// Get Sync Code function
getCodeButton.addEventListener('click', () => {
    if (currentUserId) {
        codeDisplay.value = currentUserId;
        codeArea.style.display = 'block';
    }
});


// --- UI Update Function ---
function updateUI(isLoggedIn, user) {
    if (isLoggedIn) {
        loginButton.style.display = 'none';
        logoutButton.style.display = 'inline-block';
        getCodeButton.style.display = 'inline-block';
        statusText.textContent = '已启用 - 同步已激活';
        statusDot.className = 'status-dot online';
    } else {
        loginButton.style.display = 'inline-block';
        logoutButton.style.display = 'none';
        getCodeButton.style.display = 'none';
        codeArea.style.display = 'none';
        codeDisplay.value = '';
        statusText.textContent = '未启用 - 同步未激活';
        statusDot.className = 'status-dot offline';
    }
}

// --- Data Sync Functions (Placeholders) ---

/**
 * Example function to save data to Firestore.
 * @param {string} userId - The user's unique ID.
 * @param {object} data - The data object to save.
 */
async function saveData(userId, data) {
    if (!userId) return;
    try {
        await setDoc(doc(db, "users", userId), data, { merge: true });
        console.log("Firebase: Data saved successfully for user:", userId);
    } catch (e) {
        console.error("Firebase: Error saving data: ", e);
    }
}

/**
 * Example function to load data from Firestore.
 * @param {string} userId - The user's unique ID.
 * @returns {object|null} - The loaded data or null if not found.
 */
async function loadData(userId) {
    if (!userId) return null;
    try {
        const docRef = doc(db, "users", userId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            console.log("Firebase: Data loaded:", docSnap.data());
            return docSnap.data();
        } else {
            console.log("Firebase: No such document for user:", userId);
            return null;
        }
    } catch (e) {
        console.error("Firebase: Error loading data: ", e);
        return null;
    }
}