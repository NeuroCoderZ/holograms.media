// frontend/js/services/gestureIntentClient.js
// WebSocket-клиент для отправки типизированных жестовых намерений на бэкенд.
// Подключение происходит ТОЛЬКО при наличии JWT-токена в localStorage.

class GestureIntentClient {
    constructor(url) {
        this.url = url;
        this.websocket = null;
        this.onMessageCallback = null;
        this._reconnectAttempts = 0;
        this._maxReconnectAttempts = 3;
        this._reconnectDelay = 5000;
    }

    /**
     * Возвращает JWT-токен из localStorage.
     * @returns {string|null}
     */
    _getToken() {
        return localStorage.getItem('jwtToken');
    }

    /**
     * Подключается к WebSocket только если пользователь авторизован.
     * При отсутствии токена — graceful skip (без ошибок в консоли).
     */
    connect() {
        const token = this._getToken();
        if (!token) {
            console.info('[GestureIntentClient] Нет JWT-токена — пропуск WS-соединения. Войдите через Google.');
            return;
        }

        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            console.warn('[GestureIntentClient] WebSocket уже подключён.');
            return;
        }

        // Добавляем токен в URL как query-параметр
        const urlWithToken = `${this.url}?token=${encodeURIComponent(token)}`;
        this.websocket = new WebSocket(urlWithToken);

        this.websocket.onopen = () => {
            console.log('[GestureIntentClient] WebSocket подключён.');
            this._reconnectAttempts = 0;
        };

        this.websocket.onmessage = (event) => {
            try {
                const message = JSON.parse(event.data);
                if (this.onMessageCallback) {
                    this.onMessageCallback(message);
                }
            } catch (e) {
                console.warn('[GestureIntentClient] Некорректный JSON:', event.data);
            }
        };

        this.websocket.onerror = () => {
            // Не логируем детали ошибки — это нормально при отсутствии бэкенда
            console.info('[GestureIntentClient] WS ошибка соединения (бэкенд недоступен или нет прав).');
        };

        this.websocket.onclose = (event) => {
            // Код 1006 = abnormal closure (сервер отверг до handshake = нет авторизации)
            // Код 1008 = policy violation (явный отказ в авторизации)
            const isAuthError = event.code === 1006 || event.code === 1008 || event.code === 4001;
            if (isAuthError) {
                console.info(`[GestureIntentClient] Соединение закрыто (code=${event.code}): требуется авторизация.`);
                return; // Не переподключаемся при ошибке авторизации
            }

            console.log(`[GestureIntentClient] WS закрыт (code=${event.code}).`);

            // Автоматическое переподключение при разрывах сети (не при auth ошибках)
            if (this._reconnectAttempts < this._maxReconnectAttempts && this._getToken()) {
                this._reconnectAttempts++;
                console.log(`[GestureIntentClient] Попытка переподключения ${this._reconnectAttempts}/${this._maxReconnectAttempts} через ${this._reconnectDelay / 1000}с...`);
                setTimeout(() => this.connect(), this._reconnectDelay);
            }
        };
    }

    sendIntent(intent, context = {}) {
        if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
            const message = { intent, context };
            this.websocket.send(JSON.stringify(message));
        } else {
            console.warn('[GestureIntentClient] WS не подключён. Команда не отправлена:', intent);
        }
    }

    onMessage(callback) {
        this.onMessageCallback = callback;
    }

    disconnect() {
        this._reconnectAttempts = this._maxReconnectAttempts; // Блокируем переподключение
        if (this.websocket) {
            this.websocket.close();
            this.websocket = null;
        }
    }

    /**
     * Подключиться после успешной авторизации.
     * Вызывается из auth.js после получения JWT.
     */
    connectAfterAuth() {
        this._reconnectAttempts = 0;
        this.connect();
    }
}

// [FIX] WebSocket должен идти на Koyeb backend, НЕ на Cloudflare Pages!
// VITE_API_URL = https://holograms-media-dev-...koyeb.app → wss://holograms-media-dev-...koyeb.app
const apiUrl = import.meta.env.VITE_API_URL || `${window.location.protocol}//${window.location.host}`;
const wsUrl = apiUrl.replace(/^https?:\/\//, (p) => p === 'https://' ? 'wss://' : 'ws://') + '/ws/v1/gesture-intent';

const gestureIntentClient = new GestureIntentClient(wsUrl);
export default gestureIntentClient;
