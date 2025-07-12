
// firebase-sync.js
import { db, auth } from './firebase-init.js';
import { doc, onSnapshot, setDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const getSyncDocRef = (userId) => {
  return doc(db, "sync", userId);
};

export const syncData = async (data) => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User not authenticated");
  }
  const syncDocRef = getSyncDocRef(user.uid);
  await setDoc(syncDocRef, data, { merge: true });
};

export const subscribeToSyncData = (callback) => {
  const user = auth.currentUser;
  if (!user) {
    return () => {}; // Return an empty unsubscribe function
  }
  const syncDocRef = getSyncDocRef(user.uid);
  return onSnapshot(syncDocRef, (doc) => {
    callback(doc.data());
  });
};
