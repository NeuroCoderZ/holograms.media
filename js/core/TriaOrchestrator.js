import eventBus from './eventBus.js';

export class TriaOrchestrator {
    constructor(dbService, state) {
        this.state = state;
        this.commandEngine = state?.gestureCommandEngine;
        this.codeExecutor = state?.gestureToCodeExecutor;

        this.agents = {
            memory: null, // Инициализируется позже
            synthesis: null
        };

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
     * Основной метод обработки намерения пользователя (Intent).
     * @param {string} intent - Описание задачи (напр. "сделай голограмму ярче")
     * @param {object} gestureData - Траектория жеста для контекста
     */
    async handleIntent(intent, gestureData) {
        try {
            // В будущем здесь будет запрос к Gemini Flash 3
            // Сейчас имитируем генерацию кода для Stage 5 демо
            this.log(`Synthesizing solution for: ${intent}`);

            let generatedCode = "";
            if (intent.toLowerCase().includes('яркость') || intent.toLowerCase().includes('bright')) {
                generatedCode = "emit('hologram:updateBrightness', { value: 0.8 }); return 'Brightness updated';";
            } else {
                generatedCode = "console.log('Tria executing generic task...'); return 'Done';";
            }

            // Выполняем сгенерированный код
            if (this.codeExecutor) {
                await this.codeExecutor.executeTriaCode(generatedCode, { intent, gestureData });
            }

        } catch (error) {
            this.log(`❌ Intent processing failed: ${error.message}`, 'error');
        }
    }

    async processCommand(userInput) {
        this.log(`Orchestrating: ${userInput}`);
        // Логика интеграции с Memory/Synthesis агентами...
        eventBus.emit('tria:status', { message: 'Триа думает...', pulse: true });

        // Временный mock для Stage 5
        setTimeout(() => {
            eventBus.emit('tria:status', { message: 'Готово', pulse: false });
        }, 1000);
    }

    log(message, level = 'info') {
        eventBus.emit('tria:log', { message, level });
        console.log(`[TriaOrchestrator] ${message}`);
    }
}