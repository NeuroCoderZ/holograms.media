# План реализации: Исправление загрузки AudioWorklet

## Фаза 1: Исправление путей импорта
- [x] Задача: Модифицировать `js/services/AudioService.js`: внедрить импорт URL через Vite (`?url`).
    - [x] Удалить `const workletUrl = '/js/audio/cwtAudioWorklet.js'`.
    - [x] Добавить `import workletUrl from '../audio/cwtAudioWorklet.js?url'`.
- [x] Задача: Убедиться, что `this.context.audioWorklet.addModule(workletUrl)` использует импортированную переменную.

## Фаза 2: Верификация и Деплой
- [x] Задача: Проверить отсутствие синтаксических ошибок в `AudioService.js` (локальная сборка).
- [x] Задача: Выполнить коммит и пуш изменений для проверки на Cloudflare Pages.
- [x] Задача: Подтвердить успешную загрузку ворклета в консоли браузера (`WASM Constructor Success`).

## Фаза 3: Контрольная Точка (Checkpoint)
- [ ] Задача: Conductor - Ручная Верификация Пользователем 'Исправление AudioWorklet' (Протокол в workflow.md)
