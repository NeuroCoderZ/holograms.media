/**
 * js/services/HolographicChatRoom.js
 * 
 * Управляет логикой голографических чатрумов (WebRTC P2P-кооперация).
 * Поддерживает 5 режимов: Синтезатор, Мастерская, Концерт, Студия, Обучение.
 */

import eventBus from '../core/eventBus.js';
import { state } from '../core/init.js';

export class HolographicChatRoom {
    constructor() {
        this.isActive = false;
        this.currentMode = null; // 'synth', 'workshop', 'concert', 'studio', 'edu'
        this.currentEnvironment = 'void'; // 'void', 'grid', 'panoramic'
        this.participants = new Map(); // id -> RTCPeerConnection/Stream

        // Настройка слушателей глобальной шины
        this._setupListeners();
    }

    _setupListeners() {
        eventBus.on('hub:join_room', (data) => this.joinRoom(data));
        eventBus.on('hub:leave_room', () => this.leaveRoom());
        eventBus.on('hub:change_environment', (env) => this.setEnvironment(env));
        
        // Интеграция с P2P слоем TriaCollectiveService
        eventBus.on('tria:peer_connected', (peerInfo) => this.onPeerJoined(peerInfo));
        eventBus.on('tria:peer_disconnected', (peerId) => this.onPeerLeft(peerId));
        eventBus.on('tria:peer_gesture_data', (data) => this.handlePeerGesture(data));
    }

    /**
     * Вход в чатрум (вызывается из UI модалки)
     */
    async joinRoom({ mode, environment }) {
        if (this.isActive) {
            await this.leaveRoom();
        }

        console.log(`[HolographicChatRoom] Вход в комнату. Режим: ${mode}, Среда: ${environment}`);
        
        this.isActive = true;
        this.currentMode = mode;
        this.setEnvironment(environment);

        // Уведомляем систему (UI, 3D Engine), что мы в мультиплеере
        eventBus.emit('ui:show_notification', { message: `Вы вошли в режим: ${this._getModeName(mode)}`, type: 'success' });
        
        // Инициализируем P2P коннект
        if (state.triaCollectiveService) {
            await state.triaCollectiveService.init(); // Подключаемся к сигнальному серверу
            state.triaCollectiveService.broadcastPresence({
                mode: this.currentMode,
                environment: this.currentEnvironment
            });
        }
        
        this._applyModeLogic();
    }

    /**
     * Смена визуальной среды (black void, grid-floor, etc)
     */
    setEnvironment(env) {
        this.currentEnvironment = env;
        console.log(`[HolographicChatRoom] Смена окружения на: ${env}`);
        
        // Эмитим событие для 3D рендерера (sceneSetup.js или HologramRenderer.js)
        eventBus.emit('scene:change_environment', { environment: env });
    }

    /**
     * Применение специфичной логики для выбранного режима
     */
    _applyModeLogic() {
        switch (this.currentMode) {
            case 'synth':
                // Синтезатор: совместная генерация. Включаем GestureSynthesizer.
                if (state.audio) {
                    state.audio.isGestureSynthMode = true;
                    import('../audio/GestureSynthesizer.js').then(({ gestureSynthesizer }) => {
                        gestureSynthesizer.initialize().then(() => gestureSynthesizer.start());
                    });
                }
                break;
            case 'workshop':
                // Мастерская: раздельные холсты
                break;
            case 'concert':
                // Концерт: один вещает, остальные смотрят и сдают compute
                break;
            case 'studio':
                // Студия: запись
                break;
            case 'edu':
                // Обучение: Учитель-ученик
                break;
            default:
                console.warn(`[HolographicChatRoom] Неизвестный режим: ${this.currentMode}`);
        }
    }

    /**
     * Обработка дата-стрима от другого участника (P2P)
     */
    handlePeerGesture(data) {
        if (!this.isActive) return;

        // В режиме "Синтезатор" мы берем чужие жесты и пропускаем через наш пространственный аудиодвижок
        if (this.currentMode === 'synth') {
            const peerPos = this._calculatePeerSpatialPosition(data.peerId); // Найти где стоит пир
            // Отправить данные в 3D сцену и синтезатор
            eventBus.emit('synth:peer_gesture', { ...data, position: peerPos });
        }
    }

    /**
     * Покинуть комнату
     */
    async leaveRoom() {
        if (!this.isActive) return;
        console.log('[HolographicChatRoom] Выход из комнаты.');
        
        this.isActive = false;
        this.currentMode = null;
        this.participants.clear();

        if (state.triaCollectiveService) {
            state.triaCollectiveService.disconnect();
        }

        // Возвращаем дефолтную среду
        this.setEnvironment('void');
        eventBus.emit('ui:show_notification', { message: 'Вы покинули голографический чатрум.', type: 'info' });
    }

    onPeerJoined(peerInfo) {
        if (!this.isActive) return;
        this.participants.set(peerInfo.id, peerInfo);
        console.log(`[HolographicChatRoom] Подключился участник: ${peerInfo.id}`);
        eventBus.emit('ui:update_participants', Array.from(this.participants.values()));
    }

    onPeerLeft(peerId) {
        if (!this.isActive) return;
        this.participants.delete(peerId);
        console.log(`[HolographicChatRoom] Ушел участник: ${peerId}`);
        eventBus.emit('ui:update_participants', Array.from(this.participants.values()));
    }

    _getModeName(modeStr) {
        const refs = {
            'synth': 'Синтезатор 🎹',
            'workshop': 'Мастерская 🔧',
            'concert': 'Концерт 🎸',
            'studio': 'Студия 🎬',
            'edu': 'Обучение 📚'
        };
        return refs[modeStr] || modeStr;
    }

    _calculatePeerSpatialPosition(peerId) {
        // Простая расстановка: пиры стоят полукругом
        const index = Array.from(this.participants.keys()).indexOf(peerId) || 0;
        const radius = 2.0;
        const angle = (index * 0.5) - 0.5; // rad
        return {
            x: Math.sin(angle) * radius,
            y: 1.5,
            z: Math.cos(angle) * -radius
        };
    }
}

// Экспортируем синглтон
export const holographicChatRoom = new HolographicChatRoom();
