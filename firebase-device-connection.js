
// firebase-device-connection.js
import { db, auth } from './firebase-init.js';
import { doc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const getDeviceDocRef = (userId, deviceId) => {
  return doc(db, `users/${userId}/devices`, deviceId);
};

export const setDeviceStatus = async (deviceId, status) => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User not authenticated");
  }
  const deviceDocRef = getDeviceDocRef(user.uid, deviceId);
  await setDoc(deviceDocRef, {
    status: status,
    lastSeen: serverTimestamp()
  }, { merge: true });
};
