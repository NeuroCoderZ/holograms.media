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
        this.blinkOverlay = null; // Для эффекта моргания
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
        if (this.isReloading) return;
        this.isReloading = true;

        console.log(`[AutoReload] 🎆 Detonating Evolution: Syncing HoloQuants and reloading...`);

        // Показываем уведомление (если есть)
        if (window.showNotification) {
            window.showNotification("Триа обновляет реальность. Мм-морг!", "info");
        }

        // Запускаем эффект моргания
        this.showBlinkEffect();

        // Даем время на анимацию и отправку данных (Snapshot)
        // В будущем здесь будет вызов: await triaEvolutionConnector.sendSnapshot();
        setTimeout(() => {
            console.log("[AutoReload] Reloading page now...");
            window.location.reload();
        }, 1500); // 1.5 секунды на "моргание"
    }

    /**
     * Визуальный эффект закрывающегося глаза (Blink Transition)
     */
    showBlinkEffect() {
        if (this.blinkOverlay) return;

        // Создаем контейнер для моргания
        this.blinkOverlay = document.createElement('div');
        this.blinkOverlay.id = 'tria-blink-overlay';

        // Верхнее веко
        const eyelidTop = document.createElement('div');
        eyelidTop.className = 'eyelid eyelid-top';

        // Нижнее веко
        const eyelidBottom = document.createElement('div');
        eyelidBottom.className = 'eyelid eyelid-bottom';

        this.blinkOverlay.appendChild(eyelidTop);
        this.blinkOverlay.appendChild(eyelidBottom);
        document.body.appendChild(this.blinkOverlay);

        // Анимация запускается автоматически через CSS классы
        requestAnimationFrame(() => {
            this.blinkOverlay.classList.add('active');
        });
    }

    stop() {
        if (this.timer) clearTimeout(this.timer);
    }
}

export const autoReloadService = new AutoReloadService();
export default autoReloadService;
