// frontend/js/services/websocketService.js
import { state } from '../core/init.js'; // Для доступа к токену аутентификации

class WebSocketService {
    constructor() {
        this.socket = null;
        this.connectionPromise = null;
        this.url = null; // Будет установлено при первом connect
        this.token = null; // Кэшируем токен для переподключений
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5; // Максимальное количество попыток переподключения
        this.reconnectInterval = 3000; // Интервал между попытками в мс
    }

    async _initializeConnectionParams() {
        this.token = await state.auth?.currentUser?.getIdToken();
        if (!this.token) {
            console.error("WebSocketService: Не удалось получить токен аутентификации.");
            throw new Error("Auth token not available");
        }
        // Определяем протокол в зависимости от текущего window.location.protocol
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        this.url = `${protocol}//${window.location.host}/ws/v1/gesture-intent?token=${this.token}`;
    }


    async connect() {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            console.log("WebSocketService: Соединение уже установлено.");
            return Promise.resolve();
        }

        if (this.connectionPromise) {
            console.log("WebSocketService: Попытка подключения уже в процессе.");
            return this.connectionPromise;
        }

        this.connectionPromise = new Promise(async (resolve, reject) => {
            try {
                if (!this.url || !this.token) { // Получаем параметры только если их нет
                    await this._initializeConnectionParams();
                }
            } catch (error) {
                this.connectionPromise = null;
                reject(error);
                return;
            }

            console.log("WebSocketService: Попытка подключения к", this.url);
            this.socket = new WebSocket(this.url);

            this.socket.onopen = () => {
                console.log("WebSocketService: Соединение успешно установлено.");
                this.reconnectAttempts = 0; // Сбрасываем счетчик попыток при успешном соединении
                this.connectionPromise = null; // Очищаем promise после успешного соединения
                resolve();
            };

            this.socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log("[WebSocket Response]", data);
                    // TODO: В будущем здесь можно будет обрабатывать ответы от сервера,
                    // например, обновлять UI или состояние на основе ответа.
                    // eventBus.emit('websocket:message', data);
                } catch (e) {
                    console.error("WebSocketService: Ошибка парсинга JSON из сообщения:", e, event.data);
                }
            };

            this.socket.onerror = (error) => {
                console.error("WebSocketService: Ошибка WebSocket соединения.", error);
                // Не реджектим здесь, чтобы onclose мог попытаться переподключиться
                // this.connectionPromise = null; // Очищаем promise при ошибке
                // reject(error);
            };

            this.socket.onclose = (event) => {
                console.log(`WebSocketService: Соединение закрыто. Код: ${event.code}, Причина: '${event.reason}'`);
                this.socket = null;
                // this.connectionPromise = null; // Очищаем promise, чтобы разрешить новые попытки connect()

                if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) { // 1000 - нормальное закрытие
                    this.reconnectAttempts++;
                    console.log(`WebSocketService: Попытка переподключения ${this.reconnectAttempts}/${this.maxReconnectAttempts} через ${this.reconnectInterval / 1000}с...`);
                    setTimeout(() => {
                        this.connect().catch(err => console.error("WebSocketService: Ошибка при автоматическом переподключении:", err));
                    }, this.reconnectInterval);
                } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
                    console.error("WebSocketService: Достигнуто максимальное количество попыток переподключения.");
                    this.connectionPromise = null; // Даем возможность для ручного вызова connect
                    reject(new Error("Max reconnect attempts reached")); // Реджектим исходный промис, если он еще есть
                } else {
                    this.connectionPromise = null; // Успешное закрытие или нет попыток переподключения
                     resolve(); // Если это нормальное закрытие, промис должен разрешиться, чтобы не блокировать
                }
            };
        });

        // Важно: если connect вызывается повторно, а connectionPromise уже существует,
        // он должен быть возвращен. Если connectionPromise был очищен (например, после ошибки),
        // то создастся новый.
        return this.connectionPromise.catch(err => {
            this.connectionPromise = null; // Убедимся, что сбрасываем промис при финальной ошибке
            throw err; // Перебрасываем ошибку дальше
        });
    }

    sendIntent(intent, context = {}) {
        const payload = JSON.stringify({ intent, context });
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            console.warn("WebSocketService: Соединение не установлено. Попытка отправить после подключения...");
            this.connect()
                .then(() => {
                    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                        console.log("WebSocketService: Соединение установлено, отправка данных:", payload);
                        this.socket.send(payload);
                    } else {
                        console.error("WebSocketService: Не удалось отправить данные, соединение не открыто после попытки подключения.");
                    }
                })
                .catch(error => {
                    console.error("WebSocketService: Ошибка при попытке подключения перед отправкой:", error);
                });
            return;
        }
        console.log("WebSocketService: Отправка данных:", payload);
        this.socket.send(payload);
    }

    disconnect() {
        if (this.socket) {
            console.log("WebSocketService: Закрытие соединения по запросу.");
            this.reconnectAttempts = this.maxReconnectAttempts; // Предотвращаем переподключение при ручном закрытии
            this.socket.close(1000, "Client initiated disconnect"); // 1000 - Normal Closure
        }
    }
}

export const webSocketService = new WebSocketService();
