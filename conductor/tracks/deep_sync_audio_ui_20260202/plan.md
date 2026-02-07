# План реализации: Глубокая синхронизация

## Фаза 1: Исправление ядра потока данных
- [ ] Задача: Модифицировать `js/audio/audioProcessing.js`:
    - [ ] Исправить импорт: `import eventBus from '../core/eventBus.js';`.
- [ ] Задача: Модифицировать `js/services/AudioService.js`:
    - [ ] Убедиться, что импорт: `import eventBus from '../core/eventBus.js';`.

## Фаза 2: Блокировка UI (Без смены форм)
- [ ] Задача: Модифицировать `css/_buttons.css`:
    - [ ] Для `#fullscreenButton`: зафиксировать `.icon-fullscreen` как единственную видимую иконку.
    - [ ] Настроить яркость и прозрачность для состояния `.active`.
- [ ] Задача: Модифицировать `js/platforms/desktop/desktopLayout.js`:
    - [ ] Обновить заголовки (titles) кнопки `#togglePanelsButton` («Скрыть панели» / «Показать панели»).

## Фаза 3: Автоматизация Workflow
- [ ] Задача: Обновить `conductor/workflow.md`:
    - [ ] Добавить правило `AUTO-CLOSE` для автоматической синхронизации и сохранения контекста.

## Фаза 4: Контрольная Точка (Checkpoint)
- [ ] Задача: Conductor - Ручная Верификация Пользователем (Протокол в workflow.md)
