# План реализации: Pure WASM & WS Stability

## Этап 1: Рефакторинг Rust (BasilaQ-128)
- [x] **Очистка зависимостей:** Удалить `wasm-bindgen` из `holocore/Cargo.toml`.
- [x] **Настройка экспортов:** Переписать `holocore/src/lib.rs` для использования `#[no_mangle] pub extern "C"`.
- [x] **Управление памятью:** Реализовать простые аллокаторы `malloc`/`free` внутри Rust.
- [x] **Сборка:** Скомпилировать в таргет `wasm32-unknown-unknown` с оптимизациями (`lto`, `strip`).
- [x] **Деплой:** Скопировать артефакт в `public/wasm/cwt_analyzer.wasm`.

## Этап 2: Обновление Frontend (AudioWorklet)
- [x] **Очистка импортов:** Удалить заглушки `wbg` из `cwtAudioWorklet.js`.
- [x] **Инициализация:** Переписать `initWasm` на использование чистого `WebAssembly.instantiate` с минимальным `env`.
- [x] **Валидация:** Добавить проверку наличия необходимых экспортов (`cwtanalyzer_new`, `process`) после инициализации.

## Этап 3: Стабилизация Backend (WebSocket)
- [x] **Astra Connector:** Модифицировать `get_db` в `backend/core/db/astra_connector.py`, чтобы возвращать `None` вместо `raise Exception` при сбое.
- [x] **WS Endpoint:** Обновить `backend/routers/gestures_ws.py`:
    - Вызывать `websocket.accept()` **до** проверки зависимостей.
    - Корректно обрабатывать случай `db is None` (отправлять JSON ошибку, но не рвать соединение молча).

## Результат
- Визуализация аудио работает через Pure WASM.
- WebSocket соединение устанавливается и корректно сообщает об ошибках БД, если они есть.
