// Firebase头像云存储模块
// 虚拟宠物系统 - 头像文件上传和同步功能

console.log("🎨 Firebase头像存储模块开始加载...");

// 头像存储配置
const AVATAR_CONFIG = {
    maxSize: 500 * 1024, // 500KB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    compressionQuality: 0.8,
    maxDimensions: { width: 512, height: 512 }
};

/**
 * 上传头像到Firebase Cloud Storage
 */
async function uploadAvatarToStorage(imageData, userId) {
    if (!window.FirebaseService.isReady() || !window.FirebaseService.getCurrentUser()) {
        throw new Error("Firebase未就绪或用户未认证");
    }

    try {
        console.log("🎨 开始上传头像到Cloud Storage...");
        
        const storage = window.FirebaseService.getStorage();
        
        // 验证和处理图片数据
        const processedImageData = await processAvatarImage(imageData);
        
        // 创建文件引用
        const fileName = `avatar_${userId}_${Date.now()}.jpg`;
        const avatarRef = ref(storage, `avatars/${userId}/${fileName}`);
        
        // 将Base64转换为Blob
        const blob = base64ToBlob(processedImageData);
        
        console.log(`📤 上传文件: ${fileName}, 大小: ${Math.round(blob.size / 1024)}KB`);
        
        // 上传文件
        const uploadResult = await uploadBytes(avatarRef, blob, {
            contentType: 'image/jpeg',
            customMetadata: {
                uploadedAt: Date.now().toString(),
                deviceInfo: navigator.userAgent
            }
        });
        
        // 获取下载URL
        const downloadURL = await getDownloadURL(uploadResult.ref);
        
        console.log("✅ 头像上传成功，获取下载URL:", downloadURL);
        
        // 保存URL到Firestore
        await saveAvatarURLToFirestore(userId, downloadURL, fileName);
        
        return {
            url: downloadURL,
            fileName: fileName,
            size: blob.size,
            uploadedAt: Date.now()
        };
        
    } catch (error) {
        console.error("❌ 头像上传失败:", error);
        throw error;
    }
}

/**
 * 处理头像图片（压缩、调整尺寸）
 */
async function processAvatarImage(imageData) {
    return new Promise((resolve, reject) => {
        try {
            // 如果不是Base64格式，直接返回
            if (!imageData.startsWith('data:image/')) {
                resolve(imageData);
                return;
            }
            
            const img = new Image();
            img.onload = function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // 计算新尺寸（保持比例）
                const { width: maxWidth, height: maxHeight } = AVATAR_CONFIG.maxDimensions;
                let { width, height } = this;
                
                if (width > height) {
                    if (width > maxWidth) {
                        height = (height * maxWidth) / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = (width * maxHeight) / height;
                        height = maxHeight;
                    }
                }
                
                // 设置画布尺寸
                canvas.width = width;
                canvas.height = height;
                
                // 绘制图片
                ctx.drawImage(this, 0, 0, width, height);
                
                // 转换为Base64（JPEG格式，压缩）
                const compressedData = canvas.toDataURL('image/jpeg', AVATAR_CONFIG.compressionQuality);
                
                console.log(`🎨 图片处理完成: ${width}x${height}, 压缩率: ${AVATAR_CONFIG.compressionQuality}`);
                resolve(compressedData);
            };
            
            img.onerror = function() {
                reject(new Error("图片加载失败"));
            };
            
            img.src = imageData;
            
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * 将Base64转换为Blob
 */
function base64ToBlob(base64Data) {
    const byteCharacters = atob(base64Data.split(',')[1]);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: 'image/jpeg' });
}

/**
 * 保存头像URL到Firestore
 */
async function saveAvatarURLToFirestore(userId, downloadURL, fileName) {
    try {
        const db = window.FirebaseService.getFirestore();
        const avatarRef = doc(db, 'users', userId, 'data', 'avatar');
        
        const avatarData = {
            url: downloadURL,
            fileName: fileName,
            uploadedAt: Date.now(),
            lastSyncTime: Date.now(),
            syncSource: 'storage'
        };
        
        await setDoc(avatarRef, avatarData, { merge: true });
        
        console.log("✅ 头像URL已保存到Firestore");
        
    } catch (error) {
        console.error("❌ 保存头像URL到Firestore失败:", error);
        throw error;
    }
}

/**
 * 从Firebase下载头像
 */
async function downloadAvatarFromStorage(userId) {
    if (!window.FirebaseService.isReady()) {
        console.log("⏳ Firebase未就绪，跳过头像下载");
        return null;
    }
    
    try {
        const db = window.FirebaseService.getFirestore();
        const avatarRef = doc(db, 'users', userId, 'data', 'avatar');
        const docSnap = await getDoc(avatarRef);
        
        if (docSnap.exists()) {
            const avatarData = docSnap.data();
            console.log("📥 从Firebase获取到头像URL:", avatarData.url);
            
            // 下载图片并转换为Base64
            const base64Data = await downloadImageAsBase64(avatarData.url);
            
            if (base64Data) {
                // 更新本地存储
                updateLocalAvatar(base64Data, 'firebase');
                return base64Data;
            }
        } else {
            console.log("📭 Firebase中没有头像数据");
        }
        
        return null;
        
    } catch (error) {
        console.error("❌ 下载头像失败:", error);
        return null;
    }
}

/**
 * 下载图片并转换为Base64
 */
async function downloadImageAsBase64(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const blob = await response.blob();
        
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
        
    } catch (error) {
        console.error("❌ 下载图片失败:", error);
        return null;
    }
}

/**
 * 更新本地头像
 */
function updateLocalAvatar(base64Data, source = 'firebase') {
    try {
        if (source === 'firebase') {
            // 设置同步门控，防止循环同步
            if (window.FirebaseSync) {
                window.FirebaseSync.setSyncGate('avatar', true);
            }
        }
        
        // 更新本地存储
        localStorage.setItem('virtual-pet-custom-avatar', base64Data);
        
        // 更新全局变量
        if (typeof window.customAvatarData !== 'undefined') {
            window.customAvatarData = base64Data;
        }
        
        // 更新UI显示
        if (typeof window.updateAvatarDisplay === 'function') {
            window.updateAvatarDisplay();
        }
        if (typeof window.updateFloatingButtonAvatar === 'function') {
            window.updateFloatingButtonAvatar();
        }
        
        if (source === 'firebase') {
            // 释放同步门控
            if (window.FirebaseSync) {
                setTimeout(() => {
                    window.FirebaseSync.setSyncGate('avatar', false);
                }, 100);
            }
        }
        
        console.log("✅ 本地头像已更新");
        
    } catch (error) {
        console.error("❌ 更新本地头像失败:", error);
    }
}

/**
 * 删除云端头像
 */
async function deleteAvatarFromStorage(userId, fileName) {
    if (!window.FirebaseService.isReady()) {
        throw new Error("Firebase未就绪");
    }
    
    try {
        const storage = window.FirebaseService.getStorage();
        const avatarRef = ref(storage, `avatars/${userId}/${fileName}`);
        
        // 删除文件
        await deleteObject(avatarRef);
        
        // 删除Firestore记录
        const db = window.FirebaseService.getFirestore();
        const docRef = doc(db, 'users', userId, 'data', 'avatar');
        await deleteDoc(docRef);
        
        console.log("✅ 云端头像已删除");
        
    } catch (error) {
        console.error("❌ 删除云端头像失败:", error);
        throw error;
    }
}

/**
 * 同步头像（上传本地头像到云端）
 */
async function syncAvatarToCloud() {
    if (!window.FirebaseService.isReady() || !window.FirebaseService.getCurrentUser()) {
        console.log("⏳ Firebase未就绪，跳过头像同步");
        return false;
    }
    
    try {
        const localAvatar = localStorage.getItem('virtual-pet-custom-avatar');
        if (!localAvatar) {
            console.log("📭 没有本地头像需要同步");
            return false;
        }
        
        const userId = window.FirebaseService.getCurrentUser().uid;
        const result = await uploadAvatarToStorage(localAvatar, userId);
        
        console.log("✅ 头像已同步到云端:", result);
        
        if (typeof toastr !== 'undefined') {
            toastr.success('头像已同步到云端', '🎨 头像同步');
        }
        
        return true;
        
    } catch (error) {
        console.error("❌ 头像同步失败:", error);
        
        if (typeof toastr !== 'undefined') {
            toastr.error('头像同步失败: ' + error.message, '❌ 同步失败');
        }
        
        return false;
    }
}

/**
 * 从云端同步头像到本地
 */
async function syncAvatarFromCloud() {
    if (!window.FirebaseService.isReady() || !window.FirebaseService.getCurrentUser()) {
        console.log("⏳ Firebase未就绪，跳过头像同步");
        return false;
    }
    
    try {
        const userId = window.FirebaseService.getCurrentUser().uid;
        const avatarData = await downloadAvatarFromStorage(userId);
        
        if (avatarData) {
            console.log("✅ 头像已从云端同步到本地");
            
            if (typeof toastr !== 'undefined') {
                toastr.success('头像已从云端同步', '🎨 头像同步');
            }
            
            return true;
        } else {
            console.log("📭 云端没有头像数据");
            return false;
        }
        
    } catch (error) {
        console.error("❌ 从云端同步头像失败:", error);
        return false;
    }
}

// 导出头像存储功能
window.FirebaseAvatarStorage = {
    upload: uploadAvatarToStorage,
    download: downloadAvatarFromStorage,
    delete: deleteAvatarFromStorage,
    syncToCloud: syncAvatarToCloud,
    syncFromCloud: syncAvatarFromCloud,
    processImage: processAvatarImage,
    config: AVATAR_CONFIG
};

console.log("✅ Firebase头像存储模块加载完成");
