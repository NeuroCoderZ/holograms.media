import eventBus from './eventBus.js';
import uiContextManager from './UIContextManager.js';

export class TriaOrchestrator {
    constructor(dbService, state) {
        this.state = state;
        this.commandEngine = state?.gestureCommandEngine;
        this.codeExecutor = state?.gestureToCodeExecutor;

        this.agents = {
            memory: null, // Инициализируется позже
            synthesis: null
        };
        this._lastHermaionIntent = null;

        this._setupEventListeners();
        console.log('[TriaOrchestrator] Gesture-aware orchestration ready.');
    }

    _setupEventListeners() {
        // Слушаем события от Студии Жестов (Этап 1-3)
        eventBus.on('studio:gestureMatched', (match) => {
            this.log(`Gesture matched: ${match.commandId}`);
            // Если жест привязан к команде, выполняем её
            if (match.commandId) {
                this.commandEngine.executeCommand(match.commandId, match.params);
            }
        });

        // Слушаем запросы на генерацию кода по интенту (ТЗ v4.5 Stage 3)
        eventBus.on('tria:codeRequest', async ({ intent, gestureData }) => {
            this.log(`Processing intent: "${intent}"`);
            await this.handleIntent(intent, gestureData);
        });

        // Слушаем ввод промпта (Stage 5)
        eventBus.on('tria:userQuery', async (query) => {
            await this.processCommand(query);
        });
    }

    /**
     * Основной метод обработки намерения пользователя.
     * Принимает и старые строковые команды, и IntentEmbedding из HermaionBridge.
     * @param {string|object} intent - Описание задачи или IntentEmbedding
     * @param {object} gestureData - Траектория жеста для контекста
     */
    async handleIntent(intent, gestureData) {
        const normalized = this._normalizeIntent(intent, gestureData);
        this.log(`Processing intent: "${normalized.text}"`);
        try {
            // Маппинг паттернов на команды через конфиг (ТЗ v0.20 GA B-2)
            const intentMap = [
                { pattern: /bright(ness)?|свет|яркост/i, code: "emit('hologram:updateBrightness', { value: 0.8 }); return 'Brightness updated';" },
                { pattern: /color|цвет|colour/i, code: "emit('hologram:updateColor', { hue: 0.5 }); return 'Color updated';" },
                { pattern: /scale|размер|масштаб/i, code: "emit('hologram:updateScale', { factor: 1.5 }); return 'Scale updated';" },
                { pattern: /reset|сброс|restart/i, code: "emit('hologram:reset'); return 'Reset done';" },
            ];

            let generatedCode = "console.log('[TriaOrchestrator] Generic intent:', '" + normalized.text.replace(/'/g, "\\'") + "'); return 'Processing...';";
            for (const entry of intentMap) {
                if (entry.pattern.test(normalized.text)) {
                    generatedCode = entry.code;
                    break;
                }
            }

            if (this.codeExecutor) {
                await this.codeExecutor.executeTriaCode(generatedCode, {
                    intent: normalized.text,
                    gestureData: normalized.gestureData,
                    hermaion: normalized.embedding
                });
            }
        } catch (error) {
            this.log(`❌ Intent processing failed: ${error.message}`, 'error');
        }
    }

    _normalizeIntent(intent, gestureData = {}) {
        if (intent && typeof intent === 'object') {
            const isHermaion = intent.kind === 'hermaion.intent_embedding.v1'
                || intent.source === 'hermaion_bridge'
                || intent.intentType;

            if (isHermaion) {
                const embedding = typeof intent.toJSON === 'function' ? intent.toJSON() : intent;
                this._lastHermaionIntent = embedding;
                const text = typeof intent.toOrchestratorIntent === 'function'
                    ? intent.toOrchestratorIntent()
                    : intent.symbolicText || `gesture intent: ${intent.intentType || 'unknown'}`;
                return {
                    text,
                    gestureData: {
                        ...gestureData,
                        intentType: intent.intentType,
                        confidence: intent.confidence,
                        spatialPosition: intent.spatialPosition
                    },
                    embedding
                };
            }
        }

        return {
            text: String(intent || ''),
            gestureData: gestureData || {},
            embedding: null
        };
    }

    async processCommand(userInput) {
        this.log(`Orchestrating: "${userInput}"`);
        eventBus.emit('tria:status', { message: 'Триа думает...', pulse: true });

        try {
            // Отправляем на бэкенд-оркестратор через API (ТЗ v0.20 GA B-1)
            const token = localStorage.getItem('jwtToken');
            if (!token) {
                eventBus.emit('tria:status', { message: 'Требуется авторизация', pulse: false });
                this.log('Unauthorized prompt attempt.', 'warn');
                return;
            }

            const response = await fetch('/api/v1/tria/prompt', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    prompt: userInput,
                    session_id: null,
                    ui_context: uiContextManager.formatForPrompt(),
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            const triaAnswer = data.response || '[Tria] Пустой ответ';

            // Публикуем ответ в чат через eventBus
            eventBus.emit('tria:response', { message: triaAnswer });
            eventBus.emit('tria:status', { message: 'Готово', pulse: false });
            this.log(`Response received: "${triaAnswer.slice(0, 80)}..."`);

        } catch (error) {
            this.log(`processCommand error: ${error.message}`, 'error');
            eventBus.emit('tria:status', { message: `Ошибка: ${error.message}`, pulse: false });
        }
    }

    log(message, level = 'info') {
        eventBus.emit('tria:log', { message, level });
        console.log(`[TriaOrchestrator] ${message}`);
    }
}
