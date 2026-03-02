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

        const duration = performance.now() - this.currentRecording.startTime;

        // Harvest trajectory from GestureUIManager's recorded paths
        if (this.uiManager && this.uiManager.recordedPaths) {
            const trajectoryData = {};
            this.uiManager.recordedPaths.forEach((path, key) => {
                trajectoryData[key] = path.map(pt => ({ x: pt.x, y: pt.y, r: pt.r }));
            });
            this.currentRecording.trajectory = trajectoryData;
        }

        this.currentRecording.duration = duration;

        // Stop UI recording
        if (this.uiManager) {
            this.uiManager.stopRecording();
        }

        // Save to IndexedDB
        const saved = await this.saveGesture({
            name: `Жест ${new Date().toLocaleTimeString('ru-RU')}`,
            trajectory: this.currentRecording.trajectory,
            duration: this.currentRecording.duration,
            handCount: this.currentRecording.handCount
        });

        this.currentRecording = null;
        eventBus.emit('studio:recordingStopped', saved);
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
        if (!this.gestureArea) return;

        this.modeBar = document.createElement('div');
        this.modeBar.className = 'studio-mode-bar';
        this.modeBar.innerHTML = `
            <button class="studio-mode-tab active" data-mode="${STUDIO_MODES.RECORD}" title="Запись жеста">
                <span class="mode-icon">⏺</span><span class="mode-label">Запись</span>
            </button>
            <button class="studio-mode-tab" data-mode="${STUDIO_MODES.EDIT}" title="Редактирование жестов">
                <span class="mode-icon">✏️</span><span class="mode-label">Правка</span>
            </button>
            <button class="studio-mode-tab" data-mode="${STUDIO_MODES.TEST}" title="Тестирование жеста">
                <span class="mode-icon">▶</span><span class="mode-label">Тест</span>
            </button>
            <button class="studio-mode-tab" data-mode="${STUDIO_MODES.BIND}" title="Привязка к команде">
                <span class="mode-icon">🔗</span><span class="mode-label">Привязка</span>
            </button>
        `;

        // Insert at top of gesture area
        this.gestureArea.insertBefore(this.modeBar, this.gestureArea.firstChild);

        // Tab click handlers
        this.modeBar.querySelectorAll('.studio-mode-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.stopPropagation(); // Don't trigger gesture area click
                this.setMode(tab.dataset.mode);
            });
        });
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
