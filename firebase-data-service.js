
// firebase-data-service.js
import { db, auth } from './firebase-init.js';
import { doc, setDoc, getDoc, onSnapshot } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const getUserDocRef = (userId) => {
  return doc(db, "users", userId);
};

export const saveUserData = async (data) => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User not authenticated");
  }
  const userDocRef = getUserDocRef(user.uid);
  await setDoc(userDocRef, data, { merge: true });
};

export const getUserData = async () => {
  const user = auth.currentUser;
  if (!user) {
    return null;
  }
  const userDocRef = getUserDocRef(user.uid);
  const docSnap = await getDoc(userDocRef);
  return docSnap.exists() ? docSnap.data() : null;
};

export const subscribeToUserData = (callback) => {
  const user = auth.currentUser;
  if (!user) {
    return () => {}; // Return an empty unsubscribe function
  }
  const userDocRef = getUserDocRef(user.uid);
  return onSnapshot(userDocRef, (doc) => {
    callback(doc.data());
  });
};
