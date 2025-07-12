// index.js - Reconstructed
import { auth, onAuthStateChanged } from './firebase-init.js';
import { uploadAvatar, getAvatarUrl } from './firebase-avatar-storage.js';
import { saveUserData, getUserData, subscribeToUserData } from './firebase-data-service.js';
import { setDeviceStatus } from './firebase-device-connection.js';
import { syncData, subscribeToSyncData } from './firebase-sync.js';
import './firebase-ui.js'; // Import firebase-ui to initialize the UI

// Main plugin logic
document.addEventListener('DOMContentLoaded', () => {
  console.log('KPOP-PET-test- plugin loaded.');

  // Example of how to use the new modules
  onAuthStateChanged(auth, user => {
    if (user) {
      console.log('User is signed in:', user);

      // You can add more logic here that depends on user authentication status
      // For example, loading user-specific data or enabling certain UI elements.

      // Example usage of the new functions
      getUserData().then(data => {
        console.log('User data:', data);
      });

      const unsubscribe = subscribeToUserData(data => {
        console.log('User data updated:', data);
      });

      setDeviceStatus('my-device-id', 'online');

    } else {
      console.log('User is signed out');
      // Handle signed out state, e.g., show sign-in UI
    }
  });

  // --- Placeholder for other plugin UI and logic ---
  // If your plugin had a floating window or other UI elements,
  // you would initialize them here. For example:
  // initializeFloatingWindow();
  // setupEventListeners();
  // --------------------------------------------------
});