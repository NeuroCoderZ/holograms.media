# QWEN.md — Контекст Проекта Holograms Media

> **Версия:** 0.20.408 | **Дата:** 10 апреля 2026 | **Язык:** Русский

---

## ⚠️ ЯЗЫК ОТВЕТА — РУССКИЙ

**ВСЕГДА отвечать только на РУССКОМ языке**, где это только возможно.
Это критическое правило. Код, команды, логи, пути — остаются на английском.
Но все мысли, рассуждения, объяснения, планы, ответы — **исключительно на русском**.

---

## Обзор Проекта

**Holograms Media** — это мультимодальная XR-платформа для визуализации и взаимодействия со звуком в реальном времени. Проект использует **BasilaQ-128** — систему аудио-анализа через CWT (Continuous Wavelet Transform), преобразующую звук в 3D-голограмму с 128 частотными полосами, 128 уровнями громкости и 360° панорамой.

**Ключевая философия:** "1 unit = 1 ячейка = физический смысл". Каждая ячейка сетки имеет конкретное значение — полутона, громкость в dB SPL, угол панорамы.

### Текущий фокус (v0.20.408):
- **HoloEngine** — собственный WebGPU 3D-движок для визуализации BasilaQ-128
- **Замена Three.js** — постепенный переход на чистый WebGPU (уже 35KB vs 600KB Three.js)
- **Ядерный рефакторинг** — полный контроль над координатами, шейдерами и рендерингом

---

## Структура Проекта

```
C:\holograms.media/
├── js/                        # Frontend JavaScript
│   ├── audio/                 # Audio Engine (CWT Worklet, WASM)
│   │   ├── cwtAudioWorklet.js # AudioWorklet процессор
│   │   ├── audioProcessing.js # CWT pipeline
│   │   └── audioFilePlayer.js # MP3/WAV плеер
│   ├── engine/                # HoloEngine (НАШ WebGPU движок) ⭐
│   │   ├── Engine.js          # WebGPU инициализация, матрицы
│   │   ├── InstancedColumns.js# 256 инстанс-столбцов (L+R сетки)
│   │   ├── GridWireframe.js   # Сетки, оси, синяя точка
│   │   ├── HologramWebGPU.js  # Точка входа, render loop
│   │   └── columns.wgsl.js    # WGSL шейдеры столбцов
│   ├── 3d/                    # Three.js рендерер (пока ещё тут)
│   ├── core/                  # EventBus, init.js
│   ├── config/                # hologramConfig.js (semitones, цвета)
│   ├── services/              # AudioService.js
│   └── wasm/                  # WASM бинарники
├── src/                       # Исходники (Rust, Python)
│   └── holocore/              # Rust cdylib: cwt_analyzer.wasm
├── backend/                   # FastAPI сервер (Koyeb)
├── scripts/                   # Деплой, мониторинг, утилиты
│   ├── deploy.js              # npm run deploy
│   ├── monitor-server.js      # Локальная панель мониторинга (port 3001)
│   └── fullstack-monitor.mjs  # CLI мониторинг
├── public/                    # Статические файлы (WASM, иконки)
├── .github/workflows/         # CI/CD
├── docs/                      # Документация (RU)
├── logs/                      # Логи (client-errors.json)
└── dist/                      # Build output (Vite → Cloudflare Pages)
```

---

## Архитектура

### Frontend (Vite → Cloudflare Pages)
| Компонент | Технология | Назначение |
|-----------|-----------|------------|
| **HoloEngine** | WebGPU (чистый WGSL) | 3D рендеринг голограммы BasilaQ-128 |
| **CWT WASM** | Rust cdylib → .wasm | Анализ аудио: 128 полутонов, dB SPL, панорама |
| **AudioWorklet** | Web Audio API | Real-time audio pipeline |
| **EventBus** | Custom events | Связь аудио ↔ рендер ↔ жесты |
| **Three.js** | WebGL (пока) | Фоновая сцена (будет удалена) |

### Backend (FastAPI → Koyeb Docker)
| Компонент | Технология | Назначение |
|-----------|-----------|------------|
| **FastAPI** | Python 3.11 | REST API, WebRTC signaling |
| **TriaOrchestrator** | Darwin Critic | A/B candidates, субагент выбор |
| **AstraDB** | Vector DB (3072d COSINE) | Память Триа, эмбеддинги |

### CI/CD Pipeline
```
push → dev branch
  ├── GitHub Actions: npm run build (vite build)
  ├── Cloudflare Pages: deploy dist/ → dev.holograms.media
  └── Koyeb: Docker build → backend deploy
```

---

## Команды

| Команда | Описание |
|---------|----------|
| `npm run dev` | Vite dev server (port 8000) |
| `npm run build` | Vite production build |
| `npm run deploy` | `node scripts/deploy.js "описание"` |
| `node scripts/monitor-server.js` | Локальная панель мониторинга (http://localhost:3001) |
| `node scripts/fullstack-monitor.mjs` | CLI мониторинг (GitHub + CF + Koyeb) |
| `npm run test:unit` | Юнит-тесты |
| `npm run ctx` | Repomix контекст |

---

## Физика BasilaQ-128

| Ось | Параметр | Значение |
|-----|----------|----------|
| **Y** | Полутоны | 128 (C0 16.35Hz → G10 25kHz) |
| **Z** | Громкость | 128 уровней (1 dB SPL = 1 ячейка) |
| **X** | Панорама | 128 позиций (1.40625° = 1 ячейка) |

**Формулы:**
- `Z_scale = 128.0 + current_dB` (для dBFS [-128..0])
- `cellsToShift = Math.round(pan * 64)` → дискретное смещение
- `Intensity = Cells / 128` (яркость ячейки)

**Размеры ячеек (TORUS):**
- H_Y = 3.44м / 128 = 26.875 мм/ячейка
- D_Z = 1.72м / 128 = 13.4375 мм/ячейка
- Угловой шаг: 180°/128 = 1.40625°/ячейка

---

## Критические Константы

```
EMBED_DIM     = 3072  (НИКОГДА не менять!)
BASE_FREQ     = 16.352 Гц (C0)
SEMITONES     = 128
BRANCH        = dev (Cloudflare Pages смотрит только dev)
DEPLOY CMD    = node scripts/deploy.js "описание"
```

---

## Зависимости — Статус

| Пакет | Размер | Статус | План |
|-------|--------|--------|------|
| **three.js** | 600KB | 🔴 Удалить | HoloEngine заменяет |
| **@types/three** | — | 🔴 Удалить | Вместе с Three.js |
| **mpg123-decoder** | WASM | 🟡 Заменить | Свой WASM декодер |
| **wavefile** | — | 🟡 Удалить | Тестовая либа |
| **lamejs** | — | 🟡 Удалить | Свой энкодер |
| **axios** | 13KB | ✅ Оставить | HTTP запросы |
| **express** | — | ✅ Оставить | Backend |
| **vite** | — | ✅ Оставить | Сборка |
| **@types/webxr** | — | ✅ Оставить | Только типы |

---

## Правила Разработки

1. **ТОЛЬКО ДИФФ-ПАТЧИ** — никогда не переписывать файл целиком. Использовать `edit` с точным `old_string` и `new_string`. **Полная перезапись файла (`write_file`) ЗАПРЕЩЕНА** для существующих файлов.
2. **ДЕПЛОЙ КАЖДЫЕ 2–3 ФАЙЛА** — `node scripts/deploy.js "описание"`
3. **ЯЗЫК: РУССКИЙ** — всегда отвечать на русском
4. **ЛОКАЛЬНЫЕ ТЕСТЫ НЕ ПРОВОЖУ** — все проверки на серверах
5. **EMBED_DIM = 3072** — везде и всегда
6. **ЗАПРЕЩЕНО:** NPU, ONNX, TurboQuant в браузере, LoRA в браузере, ARC-AGI

---

## Защищённые Файлы (НЕ ТРОГАТЬ без явной необходимости)

- `GestureSynthesizer.js`
- `HyperbrainSynthesizer.js`
- `GestureVectorStore.js`
- `SpectralInpainter.js`
- `tria_worker.js`

---

## Мониторинг

### Локальная панель (рекомендуется)
```bash
node scripts/monitor-server.js
# Открой: http://localhost:3001
```
Показывает: GitHub Actions ✅/❌, Cloudflare деплой, Koyeb статус, Browser логи

### CLI мониторинг
```bash
node scripts/fullstack-monitor.mjs
```

### F12 Console → Файл
Браузерные логи пишутся в `logs/client-errors.json`. Для отправки логов:
```js
fetch('http://localhost:3001/api/logs', {
  method: 'POST',
  body: JSON.stringify({ msg: 'ошибка', level: 'error' })
});
```

---

## Текущее Состояние (v0.20.408)

### Что работает:
- ✅ CWT WASM анализатор (34KB)
- ✅ AudioWorklet pipeline
- ✅ HoloEngine WebGPU (столбцы, сетки, оси)
- ✅ GitHub Actions билд → Cloudflare Pages
- ✅ Koyeb backend (Docker)

### В процессе:
- 🔧 Полная замена Three.js → HoloEngine
- 🔧 Полное логирование каждого шага HoloEngine
- 🔧 Демо-столбцы hL=64 (видимые сразу)

### Известные проблемы:
- ❌ WASM бинарник на сервере старый (dBFS -128 вместо dB SPL 0..128)
- ❌ HoloEngine canvas может не инициализироваться при раннем импорте
- ❌ Два canvas конфликтуют (Three.js + WebGPU)

---

## Будущее (Roadmap)

| Этап | Описание |
|------|----------|
| **Ближайшее** | Убрать Three.js полностью, свой WASM декодер |
| **Среднее** | Видео-парсер (MP4/MKV → аудио), обратная генерация |
| **Далёкое** | Genie 3-подобная world model: жесты → 3D XR-сцены |
| **Мечта** | Триа как world model (аудио+жесты → генерирует 3D) |

---

*"Архитектура следует за интенцией. Код — это геометрия резонанса."*
