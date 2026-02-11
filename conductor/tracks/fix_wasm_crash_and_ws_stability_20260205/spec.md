# Трек: Исправление WASM краша и стабилизация WebSocket

**Дата создания:** 2026-02-05
**Статус:** ✅ Завершен (Ретроспектива)

## Контекст
В проекте наблюдались две критические проблемы, блокирующие основной функционал:
1. **Визуализация аудио:** Не работала из-за ошибки инициализации WASM модуля `cwt_analyzer` в `AudioWorklet`.
2. **Жестовое управление:** WebSocket соединение `/ws/v1/gesture-intent` разрывалось с кодом 1006 при инициализации.

## Проблемы

### 1. WASM Instantiation Crash
**Симптом:**
```
[AudioService] ❌ WASM Engine Error: INSTANTIATION_CRASH: 
WebAssembly.instantiate(): Import #0 "wbg" "__wbindgen_number_new": 
function import requires a callable
```
**Причина:**
Модуль `BasilaQ-128` был скомпилирован с использованием `wasm-bindgen`, который генерирует JS-биндинги (glue code). Эти биндинги требуют доступа к объектам JS-среды (например, `window`, `Object`), которые отсутствуют в изолированном контексте `AudioWorkletGlobalScope`.

### 2. WebSocket Instability (Error 1006)
**Симптом:**
Клиент получал немедленный разрыв соединения при попытке подключиться к WebSocket.
**Причина:**
В `backend/routers/gestures_ws.py` использовалась зависимость `Depends(get_db)`. Функция `get_db` в `astra_connector.py` выбрасывала исключение (`raise Exception`), если переменные окружения Astra DB отсутствовали или соединение не удавалось. FastAPI обрабатывал это исключение до вызова `websocket.accept()`, что приводило к "грязному" закрытию сокета.

## Цели
1. **Pure WASM:** Пересобрать `holographic_core` (BasilaQ-128) без зависимостей от `wasm-bindgen`, используя только чистые C-экспорты.
2. **WASM Interface:** Обновить `cwtAudioWorklet.js` для прямой работы с памятью WASM (malloc/free/pointers).
3. **WS Robustness:** Обеспечить стабильное соединение WebSocket даже при отказе базы данных (Graceful degradation).
