# План реализации: Финальная синхронизация

## Фаза 1: Исправление EventBus и констант
- [ ] Задача: Модифицировать `js/audio/audioProcessing.js`:
    - [ ] Изменить импорт: `import eventBus from '../core/eventBus.js';`.
    - [ ] Убедиться в наличии декларации `wasmUrl`.
- [ ] Задача: Модифицировать `js/services/AudioService.js`:
    - [ ] Убедиться, что импорт: `import eventBus from '../core/eventBus.js';`.

## Фаза 2: Heartbeat Ворклета
- [ ] Задача: Модифицировать `js/audio/cwtAudioWorklet.js`:
    - [ ] Добавить `this.port.postMessage({ type: 'LOG', msg: 'Processing frame...' });` в `process()` (с дросселированием 1/100).

## Фаза 3: Абсолютная блокировка UI
- [ ] Задача: Модифицировать `css/_buttons.css`:
    - [ ] Скрыть `.icon-hide-panels` через `display: none !important;`.
    - [ ] Оставить только `.icon-show-panels`.
    - [ ] Установить правила `brightness` и `opacity` для `.show-mode`.

## Фаза 4: Контрольная Точка (Checkpoint)
- [ ] Задача: Conductor - Ручная Верификация Пользователем (Протокол в workflow.md)
