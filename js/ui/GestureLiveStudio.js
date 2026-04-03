/**
 * GestureLiveStudio.js — ТЗ v4.5 Этап 1
 * =======================================
 * Студия жестов в #gesture-area: 4 режима (Record, Edit, Test, Bind).
 * Расширяет существующий GestureUIManager, добавляя режимы и UI-табы.
 * 
 * Философия: Жест = основной язык управления. Пользователь сам создаёт жесты.
 */

import eventBus from '../core/eventBus.js';

// Mode constants
export const STUDIO_MODES = {
    RECORD: 'record',   // Запись сырой траектории пальцев + метаданные
    EDIT: 'edit',       // Работа с сохранёнными жестами
    TEST: 'test',       // Мгновенное выполнение жеста
    BIND: 'bind'        // Привязка жеста к команде платформы
};

export class GestureLiveStudio {
    constructor(gestureUIManager, commandEngine) {
        this.uiManager = gestureUIManager;
        this.commandEngine = commandEngine;
        this.gestureArea = document.getElementById('gesture-area');
        this.currentMode = STUDIO_MODES.RECORD;
        this.modeBar = null;

        // Recording data
        this.currentRecording = null;
        this.savedGestures = []; // Loaded from IndexedDB

        // IndexedDB
        this.db = null;
        this._initDB();

        // Build mode tabs UI
        this._buildModeBar();

        // Listen for events
        this._setupEventListeners();

        console.log('[GestureLiveStudio] Initialized. Mode:', this.currentMode);
    }

    // ─── IndexedDB (LocalTraceDB) ─────────────────────────────────

    async _initDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('LocalTraceDB', 1);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('gestures')) {
                    const store = db.createObjectStore('gestures', { keyPath: 'id', autoIncrement: true });
                    store.createIndex('name', 'name', { unique: false });
                    store.createIndex('createdAt', 'createdAt', { unique: false });
                }
                if (!db.objectStoreNames.contains('bindings')) {
                    const store = db.createObjectStore('bindings', { keyPath: 'gestureId' });
                    store.createIndex('commandId', 'commandId', { unique: false });
                }
            };
            request.onsuccess = (e) => {
                this.db = e.target.result;
                this._loadSavedGestures();
                console.log('[GestureLiveStudio] LocalTraceDB opened.');
                resolve(this.db);
            };
            request.onerror = (e) => {
                console.error('[GestureLiveStudio] IndexedDB error:', e.target.error);
                reject(e.target.error);
            };
        });
    }

    async _loadSavedGestures() {
        if (!this.db) return;
        const tx = this.db.transaction('gestures', 'readonly');
        const store = tx.objectStore('gestures');
        const request = store.getAll();
        request.onsuccess = () => {
            this.savedGestures = request.result || [];
            console.log(`[GestureLiveStudio] Loaded ${this.savedGestures.length} saved gestures.`);
            eventBus.emit('studio:gesturesLoaded', this.savedGestures);
            this._renderGestureList();
        };
    }

    async saveGesture(gestureData) {
        if (!this.db) return null;
        const record = {
            name: gestureData.name || `Жест ${Date.now()}`,
            trajectory: gestureData.trajectory,
            metadata: {
                handCount: gestureData.handCount || 1,
                duration: gestureData.duration || 0,
                fingerCount: gestureData.fingerCount || 5
            },
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        return new Promise((resolve) => {
            const tx = this.db.transaction('gestures', 'readwrite');
            const store = tx.objectStore('gestures');
            const request = store.add(record);
            request.onsuccess = () => {
                record.id = request.result;
                this.savedGestures.push(record);
                eventBus.emit('studio:gestureSaved', record);
                console.log(`[GestureLiveStudio] Gesture saved: ${record.name} (id=${record.id})`);
                resolve(record);
            };
        });
    }

    async saveBinding(gestureId, commandId, params = {}) {
        if (!this.db) return;
        const binding = { gestureId, commandId, params, createdAt: Date.now() };
        const tx = this.db.transaction('bindings', 'readwrite');
        tx.objectStore('bindings').put(binding);
        eventBus.emit('studio:bindingCreated', binding);
        console.log(`[GestureLiveStudio] Binding: gesture=${gestureId} → command=${commandId}`);
    }

    // ─── Gesture List UI ──────────────────────────────────────────

    _renderGestureList() {
        const listContainer = document.getElementById('gestureListContainer');
        if (!listContainer) return;

        if (!this.savedGestures || this.savedGestures.length === 0) {
            listContainer.innerHTML = '<div class="empty-gesture-list">Нет сохранённых жестов. Запишите первый жест!</div>';
            return;
        }

        listContainer.innerHTML = this.savedGestures.map(g => `
            <div class="gesture-list-item" data-gesture-id="${g.id}">
                <div class="gesture-thumbnail">
                    ${g.thumbnail ? `<img src="${g.thumbnail}" alt="${g.name}">` : '<div class="no-thumbnail">🖐️</div>'}
                </div>
                <div class="gesture-info">
                    <div class="gesture-name">${g.name}</div>
                    <div class="gesture-meta">
                        ${g.metadata?.duration ? `${(g.metadata.duration / 1000).toFixed(1)}с` : ''}
                        ${g.metadata?.handCount ? ` · ${g.metadata.handCount} рук(и)` : ''}
                    </div>
                </div>
            </div>
        `).join('');

        // Обработчик клика по жесту
        listContainer.querySelectorAll('.gesture-list-item').forEach(item => {
            item.addEventListener('click', async (e) => {
                e.stopPropagation();
                const gestureId = parseInt(item.dataset.gestureId);
                await this._loadGestureToPanel(gestureId);
            });
        });
    }

    async _loadGestureToPanel(gestureId) {
        const gesture = this.savedGestures.find(g => g.id === gestureId);
        if (!gesture) {
            console.warn('[GestureLiveStudio] Gesture not found:', gestureId);
            return;
        }

        console.log(`[GestureLiveStudio] Loading gesture to panel: ${gesture.name}`);

        // Загружаем траекторию в панель жестов
        if (this.uiManager && gesture.trajectory) {
            const paths = new Map();
            Object.entries(gesture.trajectory).forEach(([key, pts]) => {
                paths.set(key, pts.map(pt => ({ x: pt.x, y: pt.y, r: pt.r || 1 })));
            });

            // Эмитим событие для загрузки в GestureUIManager
            eventBus.emit('loadGestureToStudio', paths);

            // Разворачиваем панель жестов
            this.uiManager.animateGestureArea(true);

            // Панель жестов больше не скрывается до ручного сворачивания
            this.gestureArea.classList.add('active');
            this.gestureArea.classList.add('hands-detected');

            console.log(`[GestureLiveStudio] Gesture "${gesture.name}" loaded to panel.`);
        }
    }

    // ─── Mode Management ──────────────────────────────────────────

    setMode(mode) {
        if (!Object.values(STUDIO_MODES).includes(mode)) return;
        this.currentMode = mode;

        // Update UI
        if (this.modeBar) {
            this.modeBar.querySelectorAll('.studio-mode-tab').forEach(tab => {
                tab.classList.toggle('active', tab.dataset.mode === mode);
            });
        }

        // Update gesture area state
        if (this.gestureArea) {
            this.gestureArea.dataset.studioMode = mode;
        }

        eventBus.emit('studio:modeChanged', mode);
        console.log(`[GestureLiveStudio] Mode → ${mode}`);

        if (mode === STUDIO_MODES.BIND) {
            this._showBindingUI();
        } else {
            this._hideBindingUI();
        }
    }

    _showBindingUI() {
        const bindPanel = document.createElement('div');
        bindPanel.id = 'gesture-bind-panel';
        bindPanel.className = 'studio-bind-overlay';
        bindPanel.innerHTML = `
            <div class="bind-instruction">Выберите действие для привязки:</div>
            <button class="bind-option-btn" data-command="cmd:addHologram">
                <span class="btn-icon">+</span>
                <span class="btn-label">Добавить файл (Аудио)</span>
            </button>
        `;
        this.gestureArea.appendChild(bindPanel);

        bindPanel.querySelectorAll('.bind-option-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                await this.bindGesture(this.lastSavedId, btn.dataset.command);
                btn.classList.add('success');
                btn.innerHTML = '✅ Привязано к +';

                // Visual feedback on the target button (+)
                const targetBtn = document.getElementById('loadAudioButton');
                if (targetBtn) {
                    targetBtn.classList.add('pulse-binding-success');
                    setTimeout(() => targetBtn.classList.remove('pulse-binding-success'), 5000);
                }

                setTimeout(() => this.setMode(STUDIO_MODES.TEST), 1000);
            });
        });
    }

    _hideBindingUI() {
        document.getElementById('gesture-bind-panel')?.remove();
    }

    // ─── Mode Actions ─────────────────────────────────────────────

    /** RECORD: Start recording a new gesture trajectory */
    startRecording() {
        if (this.currentMode !== STUDIO_MODES.RECORD) this.setMode(STUDIO_MODES.RECORD);

        this.currentRecording = {
            trajectory: [],
            startTime: performance.now(),
            handCount: 0
        };

        // Delegate to existing GestureUIManager recording
        if (this.uiManager) {
            this.uiManager.startRecording();
        }

        eventBus.emit('studio:recordingStarted');
        console.log('[GestureLiveStudio] Recording started.');
    }

    /** RECORD: Stop and save the current recording */
    async stopRecording() {
        if (!this.currentRecording) return null;

        const recordingData = this.currentRecording;
        this.currentRecording = null; // Break the infinite loop immediately!

        const duration = performance.now() - recordingData.startTime;

        // Harvest trajectory from GestureUIManager's recorded paths
        if (this.uiManager && this.uiManager.recordedPaths) {
            const trajectoryData = {};
            this.uiManager.recordedPaths.forEach((path, key) => {
                trajectoryData[key] = path.map(pt => ({ x: pt.x, y: pt.y, r: pt.r }));
            });
            recordingData.trajectory = trajectoryData;
        }

        recordingData.duration = duration;

        // Stop UI recording (this emits the event again, but currentRecording is null now)
        if (this.uiManager && this.uiManager.isRecording !== false) {
            // We just call it safely, but it emits the event.
            try { this.uiManager.stopRecording(); } catch (e) { }
        }

        // Save to IndexedDB
        const saved = await this.saveGesture({
            name: `Жест ${new Date().toLocaleTimeString('ru-RU')}`,
            trajectory: recordingData.trajectory,
            duration: recordingData.duration,
            handCount: recordingData.handCount
        });

        eventBus.emit('studio:recordingStopped', saved);
        if (saved) this.lastSavedId = saved.id;
        console.log('[GestureLiveStudio] Recording stopped. Saved:', saved?.id);
        return saved;
    }

    /** TEST: Try to match current gesture against saved ones */
    async testGesture(trajectoryData) {
        if (!this.commandEngine) {
            console.warn('[GestureLiveStudio] No CommandEngine connected for testing.');
            return null;
        }
        const match = await this.commandEngine.matchGesture(trajectoryData);
        if (match) {
            eventBus.emit('studio:gestureMatched', match);
            console.log(`[GestureLiveStudio] Match found: ${match.commandId} (confidence: ${match.confidence})`);
        } else {
            eventBus.emit('studio:gestureUnmatched');
            console.log('[GestureLiveStudio] No match found.');
        }
        return match;
    }

    /** BIND: Bind a gesture to a command */
    async bindGesture(gestureId, commandId, params = {}) {
        await this.saveBinding(gestureId, commandId, params);
        if (this.commandEngine) {
            this.commandEngine.registerBinding(gestureId, commandId, params);
        }
    }

    // ─── UI Construction ──────────────────────────────────────────

    _buildModeBar() {
        // Use existing tabs from DOM instead of creating new ones
        const existingTabs = document.querySelectorAll('.gesture-tab');
        if (existingTabs.length > 0) {
            this.modeBar = document.querySelector('.gesture-tabs');
            
            existingTabs.forEach(tab => {
                tab.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const mode = tab.dataset.mode;
                    if (mode) this.setMode(mode);
                });
            });
            console.log('[GestureLiveStudio] Bound to existing .gesture-tabs');
        } else {
             console.warn('[GestureLiveStudio] .gesture-tabs not found in DOM.');
        }
    }

    _setupEventListeners() {
        // Listen for recording events from GestureUIManager
        eventBus.on('gestureRecordingStarted', () => {
            if (!this.currentRecording) {
                this.currentRecording = {
                    trajectory: [],
                    startTime: performance.now(),
                    handCount: this.uiManager?.detectedHands?.count || 0
                };
            }
        });

        eventBus.on('gestureRecordingStopped', async () => {
            if (this.currentRecording) {
                const saved = await this.stopRecording();

                // Logic based on mode
                if (this.currentMode === STUDIO_MODES.TEST && saved) {
                    await this.testGesture(saved.trajectory);
                } else if (this.currentMode === STUDIO_MODES.EDIT && saved) {
                    // Match to find which gesture to edit
                    const match = await this.commandEngine.matchGesture(saved.trajectory);
                    if (match) {
                        this.selectedGestureId = match.gestureId;
                        eventBus.emit('studio:editingStarted', match);
                        console.log(`[GestureLiveStudio] Editing gesture: ${match.gestureId}`);
                    }
                }
            }
        });

        // Hand detection: update hand count in current recording
        eventBus.on('handsDetected', (data) => {
            if (this.currentRecording) {
                this.currentRecording.handCount = data?.count || 0;
            }
        });
    }

    // ─── Lifecycle ────────────────────────────────────────────────

    destroy() {
        if (this.modeBar) {
            this.modeBar.remove();
            this.modeBar = null;
        }
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }
}

export default GestureLiveStudio;
