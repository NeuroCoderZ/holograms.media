/**
 * config.js — Конфигурация Tria Cortex v2.6
 * Единая точка управления гиперпараметрами и feature flags.
 *
 * Терминология: см. docs/RU/Guides/Glossary.md
 *   Enkephalon — нейронное ядро (brain.rs)
 *   Lethe      — затухание весов (decay)
 *   Мнезис     — режим записи памяти (обучение)
 *   Soma       — блок памяти целиком
 */

export const TriaConfig = {

    // === Enkephalon: параметры нейронного ядра ===
    enkephalon: {
        inputDim: 63,        // 21 точка × 3 координаты (x, y, z)
        embeddingDim: 64,    // размер внутреннего представления
        intentDim: 25,       // размер вектора намерения
        learningRate: 0.01,  // η — скорость Hebbian-обновления
        decayRate: 0.001,    // λ — скорость Lethe (затухания)
    },

    // === Мнезис: управление режимом записи памяти ===
    mnesis: {
        autoStart: true,          // Мнезис активен по умолчанию (не требует кнопки)
        gestureThresholdMs: 3000, // минимальная активность жеста для начала записи
        audioThresholdDb: -40,    // порог громкости для активации Мнезиса
        inactivityPauseMs: 300000, // авто-пауза после 5 минут неактивности
        lowBatteryThreshold: 0.2,  // авто-пауза при заряде < 20%
        maxBlocksPerSession: 500,  // авто-пауза при достижении лимита Soma-блоков
    },

    // === Lethe: расписание затухания весов ===
    lethe: {
        intervalMs: 86400000, // 24 часа — период глобального Lethe-цикла
    },

    // === Хранилище (Hippocampus): уровни памяти ===
    storage: {
        l1RetentionDays: 7,   // горячая память → IndexedDB
        l2RetentionDays: 30,  // тёплая память → IndexedDB (сжатая)
        l3RetentionDays: 90,  // холодная память → Backblaze B2
        maxLocalSizeMb: 5.7,  // лимит локального хранилища
    },

    // === Feature Flags: включение/отключение компонентов ===
    features: {
        enkephalon: true,         // нейронное ядро WASM
        mnesis: true,             // запись памяти
        lethe: true,              // затухание весов
        contextLinks: false,      // Phase 3: связи между блоками (заморожено)
        holoGraph: false,         // Phase 4: блокчейн Obolos (заморожено)
        collectiveService: false, // Phase 3: Agora (заморожено)
    },

};
