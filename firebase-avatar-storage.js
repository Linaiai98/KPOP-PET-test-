
// firebase-avatar-storage.js
import { storage, auth } from './firebase-init.js';
import { ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js';

const getAvatarRef = (userId) => {
  return ref(storage, `avatars/${userId}/avatar.png`);
};

export const uploadAvatar = async (file) => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User not authenticated");
  }
  const avatarRef = getAvatarRef(user.uid);
  await uploadBytes(avatarRef, file);
  return await getDownloadURL(avatarRef);
};

export const getAvatarUrl = async () => {
  const user = auth.currentUser;
  if (!user) {
    return null; // Or a default avatar URL
  }
  try {
    const avatarRef = getAvatarRef(user.uid);
    return await getDownloadURL(avatarRef);
  } catch (error) {
    if (error.code === 'storage/object-not-found') {
      console.log("User does not have an avatar yet.");
      return null; // Or a default avatar URL
    }
    throw error;
  }
};
