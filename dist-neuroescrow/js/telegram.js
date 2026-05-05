/**
 * Telegram WebApp Integration
 * Handles initData, CloudStorage, and bot communication
 */

const tg = window.Telegram.WebApp;

class TelegramIntegration {
    constructor() {
        this.user = null;
        this.initData = null;
        this.cloudStorage = tg.CloudStorage;
        this.init();
    }

    init() {
        // Expand to full screen
        tg.expand();
        
        // Set header color to match theme
        tg.setHeaderColor(tg.themeParams.bg_color || '#ffffff');
        tg.setBackgroundColor(tg.themeParams.bg_color || '#ffffff');
        
        // Parse initData
        this.initData = tg.initData;
        this.user = tg.initDataUnsafe.user || null;
        
        // Enable closing confirmation if needed
        tg.enableClosingConfirmation();
        
        // Ready event
        tg.ready();
        
        console.log('[Telegram] WebApp initialized', {
            user: this.user,
            platform: tg.platform,
            version: tg.version
        });
    }

    /**
     * Get user info from initData
     */
    getUser() {
        return this.user;
    }

    /**
     * Get user ID for API calls
     */
    getUserId() {
        return this.user ? this.user.id : null;
    }

    /**
     * Send data back to bot via sendData
     */
    sendData(data) {
        try {
            const json = JSON.stringify(data);
            tg.sendData(json);
            console.log('[Telegram] Data sent to bot:', data);
        } catch (e) {
            console.error('[Telegram] Failed to send data:', e);
        }
    }

    /**
     * Show popup alert
     */
    showAlert(message) {
        tg.showAlert(message);
    }

    /**
     * Show confirm dialog
     */
    showConfirm(message, callback) {
        tg.showConfirm(message, callback);
    }

    /**
     * Haptic feedback
     */
    haptic(type = 'light') {
        if (tg.HapticFeedback) {
            const validTypes = ['light', 'medium', 'heavy', 'rigid', 'soft'];
            const impactType = validTypes.includes(type) ? type : 'light';
            tg.HapticFeedback.impactOccurred(impactType);
        }
    }

    /**
     * Haptic notification feedback
     */
    hapticNotification(type = 'success') {
        if (tg.HapticFeedback) {
            const validTypes = ['success', 'warning', 'error'];
            const notifType = validTypes.includes(type) ? type : 'success';
            tg.HapticFeedback.notificationOccurred(notifType);
        }
    }

    /**
     * CloudStorage: Get item
     */
    async cloudGet(key) {
        return new Promise((resolve) => {
            this.cloudStorage.getItem(key, (err, value) => {
                if (err || !value) {
                    resolve(null);
                } else {
                    try {
                        resolve(JSON.parse(value));
                    } catch {
                        resolve(value);
                    }
                }
            });
        });
    }

    /**
     * CloudStorage: Set item
     */
    async cloudSet(key, value) {
        return new Promise((resolve) => {
            const str = typeof value === 'string' ? value : JSON.stringify(value);
            this.cloudStorage.setItem(key, str, (err, success) => {
                resolve(!err && success);
            });
        });
    }

    /**
     * CloudStorage: Remove item
     */
    async cloudRemove(key) {
        return new Promise((resolve) => {
            this.cloudStorage.removeItem(key, (err, success) => {
                resolve(!err && success);
            });
        });
    }

    /**
     * Set main button
     */
    setMainButton(text, visible = true, callback = null) {
        tg.MainButton.setText(text);
        if (visible) {
            tg.MainButton.show();
        } else {
            tg.MainButton.hide();
        }
        if (callback) {
            tg.MainButton.onClick(callback);
        }
    }

    /**
     * Close Mini App
     */
    close() {
        tg.close();
    }
}

// Singleton instance
const telegram = new TelegramIntegration();
