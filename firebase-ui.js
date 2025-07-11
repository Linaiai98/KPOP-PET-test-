// Firebase用户界面管理模块
// 虚拟宠物系统 - Firebase同步管理界面

console.log("🖥️ Firebase UI模块开始加载...");

/**
 * 创建Firebase同步状态面板
 */
function createFirebaseSyncPanel() {
    const panelHTML = `
        <div id="firebase-sync-panel" class="firebase-panel" style="display: none;">
            <div class="firebase-panel-header">
                <h3>🔥 Firebase同步管理</h3>
                <button id="firebase-panel-close" class="firebase-close-btn">×</button>
            </div>
            
            <div class="firebase-panel-content">
                <!-- 同步状态显示 -->
                <div class="firebase-status-section">
                    <h4>📊 同步状态</h4>
                    <div id="firebase-status-display">
                        <div class="status-item">
                            <span class="status-label">Firebase服务:</span>
                            <span id="firebase-service-status" class="status-value">检查中...</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">用户认证:</span>
                            <span id="firebase-auth-status" class="status-value">检查中...</span>
                        </div>
                        <div class="status-item">
                            <span class="status-label">网络状态:</span>
                            <span id="firebase-network-status" class="status-value">检查中...</span>
                        </div>
                    </div>
                </div>

                <!-- 设备连接管理 -->
                <div class="firebase-device-section">
                    <h4>📱 设备管理</h4>
                    
                    <!-- 生成连接码 -->
                    <div class="device-action-group">
                        <button id="generate-connection-code-btn" class="firebase-btn primary">
                            🔗 生成连接码
                        </button>
                        <div id="connection-code-display" style="display: none;">
                            <div class="connection-code-box">
                                <span class="connection-code-label">连接码:</span>
                                <span id="connection-code-value" class="connection-code"></span>
                                <button id="copy-connection-code-btn" class="firebase-btn small">复制</button>
                            </div>
                            <div class="connection-code-info">
                                <small>⏰ 连接码5分钟内有效，在其他设备上输入此码即可同步数据</small>
                            </div>
                        </div>
                    </div>

                    <!-- 使用连接码 -->
                    <div class="device-action-group">
                        <div class="input-group">
                            <input type="text" id="device-connection-code-input" 
                                   placeholder="输入6位连接码" maxlength="6" 
                                   style="text-transform: uppercase;">
                            <button id="connect-with-code-btn" class="firebase-btn secondary">
                                📲 连接设备
                            </button>
                        </div>
                    </div>

                    <!-- 已连接设备列表 -->
                    <div class="connected-devices-section">
                        <h5>已连接的设备</h5>
                        <div id="connected-devices-list">
                            <div class="loading-devices">正在加载设备列表...</div>
                        </div>
                    </div>
                </div>

                <!-- 数据同步管理 -->
                <div class="firebase-sync-section">
                    <h4>🔄 数据同步</h4>
                    
                    <div class="sync-actions">
                        <button id="sync-all-data-btn" class="firebase-btn success">
                            ⬆️ 同步所有数据
                        </button>
                        <button id="check-sync-status-btn" class="firebase-btn info">
                            📋 检查同步状态
                        </button>
                        <button id="force-download-btn" class="firebase-btn warning">
                            ⬇️ 强制下载云端数据
                        </button>
                    </div>

                    <div id="sync-progress" style="display: none;">
                        <div class="progress-bar">
                            <div id="sync-progress-fill" class="progress-fill"></div>
                        </div>
                        <div id="sync-progress-text" class="progress-text">同步中...</div>
                    </div>
                </div>

                <!-- 故障排除 -->
                <div class="firebase-troubleshoot-section">
                    <h4>🔧 故障排除</h4>
                    <div class="troubleshoot-actions">
                        <button id="reset-firebase-btn" class="firebase-btn danger">
                            🔄 重置Firebase连接
                        </button>
                        <button id="clear-local-data-btn" class="firebase-btn danger">
                            🗑️ 清除本地数据
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // 添加到页面
    $('body').append(panelHTML);

    // 添加样式
    addFirebasePanelStyles();

    // 绑定事件
    bindFirebasePanelEvents();

    console.log("✅ Firebase同步面板已创建");
}

/**
 * 添加Firebase面板样式
 */
function addFirebasePanelStyles() {
    const styles = `
        <style id="firebase-panel-styles">
        .firebase-panel {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 90%;
            max-width: 500px;
            max-height: 80vh;
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            z-index: 10003;
            overflow: hidden;
        }

        .firebase-panel-header {
            background: linear-gradient(135deg, #FF6B6B, #4ECDC4);
            color: white;
            padding: 15px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        .firebase-panel-header h3 {
            margin: 0;
            font-size: 18px;
        }

        .firebase-close-btn {
            background: none;
            border: none;
            color: white;
            font-size: 24px;
            cursor: pointer;
            padding: 0;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .firebase-close-btn:hover {
            background: rgba(255,255,255,0.2);
        }

        .firebase-panel-content {
            padding: 20px;
            max-height: calc(80vh - 70px);
            overflow-y: auto;
        }

        .firebase-panel-content h4 {
            margin: 0 0 15px 0;
            color: #333;
            font-size: 16px;
            border-bottom: 2px solid #f0f0f0;
            padding-bottom: 8px;
        }

        .firebase-panel-content h5 {
            margin: 15px 0 10px 0;
            color: #666;
            font-size: 14px;
        }

        .status-item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            padding: 8px;
            background: #f8f9fa;
            border-radius: 6px;
        }

        .status-label {
            font-weight: 500;
            color: #555;
        }

        .status-value {
            font-weight: bold;
        }

        .firebase-btn {
            padding: 10px 16px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            margin: 5px;
            transition: all 0.2s;
        }

        .firebase-btn.primary { background: #007bff; color: white; }
        .firebase-btn.secondary { background: #6c757d; color: white; }
        .firebase-btn.success { background: #28a745; color: white; }
        .firebase-btn.info { background: #17a2b8; color: white; }
        .firebase-btn.warning { background: #ffc107; color: #212529; }
        .firebase-btn.danger { background: #dc3545; color: white; }
        .firebase-btn.small { padding: 5px 10px; font-size: 12px; }

        .firebase-btn:hover {
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
        }

        .device-action-group {
            margin-bottom: 20px;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
        }

        .connection-code-box {
            display: flex;
            align-items: center;
            gap: 10px;
            margin: 10px 0;
            padding: 10px;
            background: white;
            border: 2px solid #28a745;
            border-radius: 6px;
        }

        .connection-code {
            font-family: 'Courier New', monospace;
            font-size: 18px;
            font-weight: bold;
            color: #28a745;
            letter-spacing: 2px;
        }

        .input-group {
            display: flex;
            gap: 10px;
            align-items: center;
        }

        .input-group input {
            flex: 1;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 6px;
            font-size: 14px;
        }

        .sync-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-bottom: 15px;
        }

        .troubleshoot-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
        }

        .progress-bar {
            width: 100%;
            height: 8px;
            background: #e9ecef;
            border-radius: 4px;
            overflow: hidden;
            margin-bottom: 10px;
        }

        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #28a745, #20c997);
            width: 0%;
            transition: width 0.3s ease;
        }

        .progress-text {
            text-align: center;
            font-size: 14px;
            color: #666;
        }

        .connected-device-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px;
            background: white;
            border: 1px solid #ddd;
            border-radius: 6px;
            margin-bottom: 8px;
        }

        .device-info {
            flex: 1;
        }

        .device-name {
            font-weight: 500;
            color: #333;
        }

        .device-details {
            font-size: 12px;
            color: #666;
        }
        </style>
    `;

    $('head').append(styles);
}

/**
 * 绑定Firebase面板事件
 */
function bindFirebasePanelEvents() {
    // 关闭面板
    $('#firebase-panel-close').on('click', () => {
        $('#firebase-sync-panel').hide();
    });

    // 生成连接码
    $('#generate-connection-code-btn').on('click', async () => {
        try {
            const code = await window.FirebaseDeviceConnection.generateCode();
            $('#connection-code-value').text(code);
            $('#connection-code-display').show();

            if (typeof toastr !== 'undefined') {
                toastr.success(`连接码已生成: ${code}`, '🔗 设备连接', { timeOut: 5000 });
            }
        } catch (error) {
            console.error("生成连接码失败:", error);
            if (typeof toastr !== 'undefined') {
                toastr.error('生成连接码失败: ' + error.message, '❌ 错误');
            }
        }
    });

    // 复制连接码
    $('#copy-connection-code-btn').on('click', () => {
        const code = $('#connection-code-value').text();
        navigator.clipboard.writeText(code).then(() => {
            if (typeof toastr !== 'undefined') {
                toastr.success('连接码已复制到剪贴板', '📋 复制成功');
            }
        });
    });

    // 使用连接码连接
    $('#connect-with-code-btn').on('click', async () => {
        const code = $('#device-connection-code-input').val().trim().toUpperCase();
        if (!code) {
            if (typeof toastr !== 'undefined') {
                toastr.warning('请输入连接码', '⚠️ 输入错误');
            }
            return;
        }

        try {
            await window.FirebaseDeviceConnection.connectWithCode(code);
            $('#device-connection-code-input').val('');
            updateFirebaseStatus();
            loadConnectedDevices();
        } catch (error) {
            console.error("设备连接失败:", error);
            if (typeof toastr !== 'undefined') {
                toastr.error('设备连接失败: ' + error.message, '❌ 连接失败');
            }
        }
    });

    // 同步所有数据
    $('#sync-all-data-btn').on('click', async () => {
        try {
            showSyncProgress('正在同步所有数据...', 0);

            // 同步宠物数据
            const petData = window.getLocalPetData();
            if (petData) {
                await window.FirebaseSync.uploadPetData(petData);
                updateSyncProgress(33);
            }

            // 同步AI设置
            const aiSettings = window.getLocalAISettings();
            if (aiSettings && Object.keys(aiSettings).length > 0) {
                await window.FirebaseSync.uploadAISettings(aiSettings);
                updateSyncProgress(66);
            }

            // 同步UI设置（包括头像）
            const uiSettings = window.getLocalUISettings();
            if (uiSettings) {
                await window.FirebaseSync.uploadUISettings(uiSettings);
                updateSyncProgress(100);
            }

            hideSyncProgress();
            if (typeof toastr !== 'undefined') {
                toastr.success('所有数据已同步到云端', '✅ 同步完成');
            }
        } catch (error) {
            hideSyncProgress();
            console.error("数据同步失败:", error);
            if (typeof toastr !== 'undefined') {
                toastr.error('数据同步失败: ' + error.message, '❌ 同步失败');
            }
        }
    });

    // 检查同步状态
    $('#check-sync-status-btn').on('click', () => {
        updateFirebaseStatus();
        if (typeof toastr !== 'undefined') {
            toastr.info('同步状态已更新', '📊 状态检查');
        }
    });

    // 重置Firebase连接
    $('#reset-firebase-btn').on('click', async () => {
        if (confirm('确定要重置Firebase连接吗？这将重新初始化所有Firebase服务。')) {
            try {
                if (window.FirebaseService) {
                    window.FirebaseService.cleanup();
                    await window.FirebaseService.initialize();
                    updateFirebaseStatus();
                    if (typeof toastr !== 'undefined') {
                        toastr.success('Firebase连接已重置', '🔄 重置完成');
                    }
                }
            } catch (error) {
                console.error("重置Firebase失败:", error);
                if (typeof toastr !== 'undefined') {
                    toastr.error('重置失败: ' + error.message, '❌ 重置失败');
                }
            }
        }
    });

    // 输入框自动转大写
    $('#device-connection-code-input').on('input', function() {
        this.value = this.value.toUpperCase();
    });
}

/**
 * 更新Firebase状态显示
 */
function updateFirebaseStatus() {
    if (!window.FirebaseService) {
        $('#firebase-service-status').text('❌ 未加载').css('color', '#dc3545');
        $('#firebase-auth-status').text('❌ 不可用').css('color', '#dc3545');
        $('#firebase-network-status').text('❌ 不可用').css('color', '#dc3545');
        return;
    }

    const status = window.FirebaseService.getStatus();

    // Firebase服务状态
    if (status.isReady) {
        $('#firebase-service-status').text('✅ 已就绪').css('color', '#28a745');
    } else {
        $('#firebase-service-status').text('❌ 未就绪').css('color', '#dc3545');
    }

    // 认证状态
    if (status.isAuthenticated) {
        $('#firebase-auth-status').text(`✅ 已认证 (${status.userId?.substring(0, 8)}...)`).css('color', '#28a745');
    } else {
        $('#firebase-auth-status').text('❌ 未认证').css('color', '#dc3545');
    }

    // 网络状态
    if (status.isOnline) {
        $('#firebase-network-status').text('✅ 在线').css('color', '#28a745');
    } else {
        $('#firebase-network-status').text('❌ 离线').css('color', '#dc3545');
    }
}

/**
 * 显示同步进度
 */
function showSyncProgress(text, progress = 0) {
    $('#sync-progress').show();
    $('#sync-progress-text').text(text);
    $('#sync-progress-fill').css('width', progress + '%');
}

/**
 * 更新同步进度
 */
function updateSyncProgress(progress) {
    $('#sync-progress-fill').css('width', progress + '%');
}

/**
 * 隐藏同步进度
 */
function hideSyncProgress() {
    $('#sync-progress').hide();
}

/**
 * 加载已连接设备列表
 */
async function loadConnectedDevices() {
    try {
        if (!window.FirebaseDeviceConnection) {
            $('#connected-devices-list').html('<div class="no-devices">Firebase设备连接功能不可用</div>');
            return;
        }

        const devices = await window.FirebaseDeviceConnection.getDevices();

        if (devices.length === 0) {
            $('#connected-devices-list').html('<div class="no-devices">暂无已连接的设备</div>');
            return;
        }

        let devicesHTML = '';
        devices.forEach(device => {
            const lastActive = new Date(device.lastActiveAt).toLocaleString();
            devicesHTML += `
                <div class="connected-device-item">
                    <div class="device-info">
                        <div class="device-name">📱 ${device.deviceInfo?.platform || '未知设备'}</div>
                        <div class="device-details">最后活跃: ${lastActive}</div>
                    </div>
                    <button class="firebase-btn danger small" onclick="disconnectDevice('${device.id}')">
                        断开
                    </button>
                </div>
            `;
        });

        $('#connected-devices-list').html(devicesHTML);
    } catch (error) {
        console.error("加载设备列表失败:", error);
        $('#connected-devices-list').html('<div class="error-devices">加载设备列表失败</div>');
    }
}

/**
 * 断开设备连接
 */
window.disconnectDevice = async function(deviceId) {
    if (confirm('确定要断开此设备的连接吗？')) {
        try {
            await window.FirebaseDeviceConnection.disconnectDevice(deviceId);
            loadConnectedDevices();
            if (typeof toastr !== 'undefined') {
                toastr.success('设备已断开连接', '📱 设备管理');
            }
        } catch (error) {
            console.error("断开设备失败:", error);
            if (typeof toastr !== 'undefined') {
                toastr.error('断开设备失败: ' + error.message, '❌ 操作失败');
            }
        }
    }
};

// 导出Firebase UI功能
window.FirebaseUI = {
    createSyncPanel: createFirebaseSyncPanel,
    showSyncPanel: () => {
        $('#firebase-sync-panel').show();
        updateFirebaseStatus();
        loadConnectedDevices();
    },
    hideSyncPanel: () => $('#firebase-sync-panel').hide(),
    updateStatus: updateFirebaseStatus
};

console.log("✅ Firebase UI模块加载完成");
