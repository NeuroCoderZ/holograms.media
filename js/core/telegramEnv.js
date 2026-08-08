// frontend/js/core/telegramEnv.js
/**
 * Единая точка истины: запущены ли мы РЕАЛЬНО внутри Telegram Mini App.
 *
 * ПОЧЕМУ ЭТО НУЖНО (баг до 08.08.2026):
 * скрипт https://telegram.org/js/telegram-web-app.js создаёт объект
 * `window.Telegram.WebApp` ВСЕГДА — в любом браузере, а не только внутри
 * Telegram. Поэтому проверка `!!(window.Telegram && window.Telegram.WebApp)`
 * давала `true` для обычных веб-посетителей, и приложение уходило в TG-режим:
 * `[Core] TG mode — skipping 3D scene, WebGPU, MediaPipe` →
 * `Animation loop cannot start: renderer is missing` → голограмма не рисовалась,
 * загрузка «зависала на глазе».
 *
 * ПРИЗНАКИ НАСТОЯЩЕГО TELEGRAM (по офиц. документации core.telegram.org/bots/webapps):
 *  - `platform` — «The name of the platform of the user's Telegram app»
 *    (android / ios / tdesktop / weba / webk / macos ...). Вне Telegram — "unknown".
 *  - `initData` — непустая строка сырых данных запуска. Вне Telegram — "".
 *  - Telegram передаёт параметры запуска в URL-хэше (`#tgWebAppData=...`,
 *    `tgWebAppPlatform=...`) — это самый ранний и надёжный маркер.
 */

const UNKNOWN_PLATFORM = 'unknown';

/**
 * @returns {boolean} true только если страница открыта внутри Telegram Mini App.
 */
export function isTelegramMiniApp() {
    const tg = typeof window !== 'undefined' && window.Telegram
        ? window.Telegram.WebApp
        : null;

    if (!tg) return false;

    // 1. Сырые данные запуска — самый надёжный признак.
    if (typeof tg.initData === 'string' && tg.initData.length > 0) return true;

    // 2. Заполненный initDataUnsafe (например, у некоторых клиентов/версий).
    if (tg.initDataUnsafe && Object.keys(tg.initDataUnsafe).length > 0) return true;

    // 3. Явно названная платформа Telegram-клиента (вне Telegram — "unknown").
    if (typeof tg.platform === 'string'
        && tg.platform
        && tg.platform !== UNKNOWN_PLATFORM) return true;

    // 4. Параметры запуска в URL-хэше, которые подставляет сам Telegram.
    if (typeof window !== 'undefined' && typeof window.location?.hash === 'string'
        && window.location.hash.includes('tgWebApp')) return true;

    return false;
}

/**
 * Диагностика для логов — почему принято то или иное решение.
 * @returns {{isTelegram: boolean, platform: string|null, initDataLen: number, hashMarker: boolean}}
 */
export function describeTelegramEnv() {
    const tg = typeof window !== 'undefined' && window.Telegram
        ? window.Telegram.WebApp
        : null;

    return {
        isTelegram: isTelegramMiniApp(),
        platform: tg && typeof tg.platform === 'string' ? tg.platform : null,
        initDataLen: tg && typeof tg.initData === 'string' ? tg.initData.length : 0,
        hashMarker: typeof window !== 'undefined'
            && typeof window.location?.hash === 'string'
            && window.location.hash.includes('tgWebApp'),
    };
}

export default isTelegramMiniApp;
