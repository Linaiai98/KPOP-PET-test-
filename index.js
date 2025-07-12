
// index.js
import { auth, onAuthStateChanged } from './firebase-init.js';
import { uploadAvatar, getAvatarUrl } from './firebase-avatar-storage.js';
import { saveUserData, getUserData, subscribeToUserData } from './firebase-data-service.js';
import { setDeviceStatus } from './firebase-device-connection.js';
import { syncData, subscribeToSyncData } from './firebase-sync.js';

// Example of how to use the new modules
onAuthStateChanged(auth, user => {
  if (user) {
    // User is signed in.
    console.log('User is signed in:', user);

    // Example usage of the new functions
    // You can replace these with your actual implementation

    // Get user data
    getUserData().then(data => {
      console.log('User data:', data);
    });

    // Subscribe to user data changes
    const unsubscribe = subscribeToUserData(data => {
      console.log('User data updated:', data);
    });

    // Set device status
    setDeviceStatus('my-device-id', 'online');

  } else {
    // User is signed out.
    console.log('User is signed out');
  }
});
