// js/utils/apiBase.js
//
// 2026-08-25 (карточки 1.6/1.3a/1.7): единая точка доступа к бэкенду.
// Раньше каждый сервис зашивал VITE_API_URL (= koyeb-домен напрямую) в бандл.
// Koyeb отдаёт контент преимущественно по IPv6 — у части посетителей таймауты,
// плюс WS-сигналинг был недоступен. Теперь CF Worker holograms-proxy на нашем
// домене маршрутизирует /api/* и /ws/* на Koyeb (IPv4 из сети Cloudflare).
// Поэтому фронт всегда ходит НА СВОЙ домен относительными путями.
// Локальная разработка (vite :5173) продолжает проксироваться через vite.config.

export function apiBase() {
    if (typeof window === 'undefined') return '';
    const host = window.location.hostname;
    // Локальная разработка: vite сам не проксирует /api -> используем локальный бэкенд
    if (host === 'localhost' || host === '127.0.0.1') {
        return 'http://localhost:8001';
    }
    // Прод и dev: относительные пути — запрос остаётся на нашем домене
    return '';
}

export function wsBase(path) {
    // path вида '/ws/signaling' -> wss://текущий-домен/ws/signaling
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}${path}`;
}

