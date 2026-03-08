/**
 * AutoReloadService.js
 * --------------------
 * Автоматически проверяет наличие новой версии приложения на сервере.
 * Если версия (SHA коммита или timestamp) изменилась, сервис уведомляет пользователя
 * и перезагружает страницу для очистки кэша.
 */

class AutoReloadService {
    constructor() {
        this.currentVersion = null;
        this.checkInterval = 60000; // Проверка каждую минуту
        this.timer = null;
        this.versionUrl = '/version.json';
        this.isReloading = false;
    }

    /**
     * Запуск мониторинга обновлений.
     */
    async start() {
        try {
            // Получаем начальную версию
            const data = await this.fetchVersion();
            if (data) {
                this.currentVersion = data.version;
                console.log(`[AutoReload] Initial version: ${this.currentVersion} (${data.timestamp})`);

                // Запускаем цикл проверки
                this.scheduleCheck();
            }
        } catch (error) {
            console.error('[AutoReload] Failed to start:', error);
        }
    }

    scheduleCheck() {
        if (this.timer) clearTimeout(this.timer);
        this.timer = setTimeout(() => this.check(), this.checkInterval);
    }

    async fetchVersion() {
        try {
            // Добавляем timestamp для обхода кэша браузера при проверке самого json
            const response = await fetch(`${this.versionUrl}?t=${Date.now()}`, {
                cache: 'no-store'
            });
            if (!response.ok) return null;
            return await response.json();
        } catch (e) {
            return null;
        }
    }

    async check() {
        if (this.isReloading) return;

        const data = await this.fetchVersion();
        if (data && data.version && data.version !== this.currentVersion) {
            console.log(`[AutoReload] New version detected: ${data.version} (Current: ${this.currentVersion})`);
            this.triggerReload();
        } else {
            this.scheduleCheck();
        }
    }

    triggerReload() {
        this.isReloading = true;

        const message = "Обнаружено обновление системы. Страница будет перезагружена через 5 секунд...";

        if (window.showNotification) {
            window.showNotification(message, "info");
        } else {
            console.info(`[AutoReload] ${message}`);
        }

        setTimeout(() => {
            console.log("[AutoReload] Reloading page now...");
            // location.reload(true) - устарело в некоторых браузерах для форсирования кэша, 
            // но вместе с fetch(no-store) и обновленным index.html это сработает.
            window.location.reload();
        }, 5000);
    }

    stop() {
        if (this.timer) clearTimeout(this.timer);
    }
}

export const autoReloadService = new AutoReloadService();
export default autoReloadService;
