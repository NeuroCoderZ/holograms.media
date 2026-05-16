# Risk & Fallback Map — Holograms.Media v0.20.517+

> Стратегии деградации для всех точек отказа. Обновлено: май 2026.

---

## Таблица точек отказа

| # | Точка отказа | Вероятность | Влияние | Стратегия деградации | Мониторинг |
|---|-------------|-------------|---------|---------------------|------------|
| 1 | **Koyeb WebSocket 1006** | Высокая | Критическое | SSE/HTTP long-polling fallback; keepalive ping каждые 20с | `gestureIntentClient.js` — reconnect count |
| 2 | **Koyeb HTTP timeout (100с)** | Средняя | Высокое | Retry с exponential backoff; fallback на CloudStorage | `apiService.js` — error rate |
| 3 | **CSP блокировка стилей** | Средняя | Среднее | `https://cdn.jsdelivr.net` добавлен в `style-src`; inline fallback | Browser console CSP violations |
| 4 | **JWT 401 Unauthorized** | Средняя | Критическое | `fetchWithAuth()` interceptor; re-auth через Google; CloudStorage fallback | `auth.js` — `handle401Response()` |
| 5 | **LayoutManager race condition** | Высокая | Среднее | `MutationObserver` + retry (10 попыток, 200ms×N); `scheduleLayoutUpdate()` | Console: `[LayoutManager]` logs |
| 6 | **Camera onFrame crash** | Средняя | Высокое | `stream.active` check; try/catch; throttle 5s; graceful stop on WASM crash | `[HandsTracking]` error logs |
| 7 | **AudioWorklet WASM fallback** | Средняя | Среднее | Fallback-массивы (кэшированные, без аллокаций); throttled по target FPS | `[CwtWorklet] Fallback mode` |
| 8 | **AstraDB credits exhausted** | Низкая | Критическое | Fallback на CloudStorage/localStorage; KV cache в Cloudflare Workers | AstraDB dashboard — credit balance |
| 9 | **Mistral API 429** | Средняя | Высокое | Fallback на `mistral-small-latest`; queue + retry; cached responses | Hermes logs — `429` count |
| 10 | **Gemini Embedding 429** | Средняя | Среднее | Retry с exponential backoff (1s, 2s, 4s); cached embeddings | `hermes.js` — embed error rate |
| 11 | **Telegram Mini App viewport** | Низкая | Среднее | `viewportStableHeight` CSS var; `safeAreaInset` binding; `expand()` fallback | `[TG] viewportChanged` logs |
| 12 | **GestureUI auth offline** | Средняя | Среднее | Offline queue в localStorage; sync после login; `saveFallbackSession()` | `GestureUIManager` — queue length |

---

## Детальные стратегии

### 1. WebSocket 1006 (Koyeb)
**Проблема:** Koyeb рвёт WS-соединения при idle > 120с или деплое.
**Решение:**
- Клиент: `gestureIntentClient.js` — auto-reconnect с exponential backoff (1s → 2s → 4s → 8s, max 30s)
- Сервер: SSE endpoint `/events` как fallback (уже есть в FastAPI)
- Мониторинг: счётчик reconnect'ов, alert при > 5 за минуту

### 2. JWT 401
**Проблема:** Токен истекает, UI блокируется.
**Решение:**
- `isJwtExpired()` — проверка `exp` claim с 60с буфером
- `handle401Response()` — глобальный interceptor для всех fetch
- `fetchWithAuth()` — обёртка с авто-подстановкой `Authorization`
- При истечении: показать модалку входа, сохранить данные в CloudStorage

### 3. LayoutManager Race
**Проблема:** `updateHologramLayout` вызывается до готовности renderer/hologramRendererInstance.
**Решение:**
- `scheduleLayoutUpdate(appState)` — retry с `MutationObserver`
- MAX_LAYOUT_RETRIES = 10, LAYOUT_RETRY_DELAY = 200ms
- `resetLayoutState()` — сброс при навигации/релоаде

### 4. Camera onFrame
**Проблема:** MediaPipe Hands крашится при потере stream или WASM memory error.
**Решение:**
- `stream.active` check перед каждым кадром
- Throttle ошибок: 1 лог за 5 секунд
- Graceful stop при `memory`/`aborted` error
- Fallback: текстовый ввод жестов без камеры

### 5. AudioWorklet WASM
**Проблема:** WASM не загружается (MIME-type, network error).
**Решение:**
- Кэшированные fallback-массивы (`FALLBACK_LEVELS`, `FALLBACK_ANGLES`, `FALLBACK_CONFIDENCE`)
- Throttled отправка по target FPS (не каждый кадр!)
- Handshake: `WORKLET_READY` → `WASM_BUFFER` → `WASM_READY`
- Content-Type проверка: reject если `text/html`

### 6. AstraDB Credits
**Проблема:** Free plan credits exhausted → база suspend.
**Решение:**
- Fallback: CloudStorage (Telegram) + localStorage (browser)
- Cloudflare Workers KV cache для сессий
- Мониторинг: AstraDB dashboard → email alert при < 20% credits

---

## Мониторинг-чеклист

```bash
# Health check
curl -s https://neuroescrow-hermes.neurocoderz.workers.dev/health

# CI/CD status
gh run list --limit 5 --json status,conclusion

# Koyeb service status
curl -s https://holograms-media-dev-holograms-media-cb8383e3.koyeb.app/health

# AstraDB collections
curl -s $ASTRA_DB_ENDPOINT/api/json/v1/default_keyspace -H "Token: $ASTRA_DB_TOKEN" -d '{"findCollections":{}}'
```

---

## Версии

| Версия | Дата | Изменения |
|--------|------|-----------|
| v0.20.517 | 2026-05-16 | Initial Risk & Fallback Map |
