# Holograms Media

**Holograms Media** — это мультимодальная XR-платформа нового поколения, предназначенная для интуитивного взаимодействия с цифровой информацией через звук, жесты и 3D-визуализацию.

## 🚀 Особенности
- **Интуитивный Язык Жестов:** Управление звуком и визуализацией с помощью MediaPipe Hands.
- **Высокопроизводительное Ядро:** Анализ аудио в реальном времени с использованием Rust и WebAssembly (CWT-анализ).
- **Мультиплатформенность:** Адаптивные интерфейсы для Desktop, Mobile и XR-устройств.
- **Коллективный Интеллект (Tria):** AI-ассистент, обучающийся на потоке мультимодального взаимодействия.

## 🛠 Технологический Стек
### Frontend
- **Framework:** [Vite](https://vitejs.dev/) + Vanilla JS / ES Modules.
- **3D Engine:** [Three.js](https://threejs.org/).
- **CV / Gestures:** [MediaPipe Hands](https://google.github.io/mediapipe/solutions/hands).
- **Audio Engine:** AudioWorklet + Custom Rust/WASM (Continuous Wavelet Transform).

### Backend
- **API:** [FastAPI](https://fastapi.tiangolo.com/) (Python).
- **Database:** [DataStax AstraDB](https://www.datastax.com/products/datastax-astra) (Vector Search & NoSQL).
- **Storage:** [Backblaze B2](https://www.backblaze.com/b2/cloud-storage.html) (S3-compatible).
- **Hosting:** [Koyeb](https://www.koyeb.com/).

## 🏗 Структура Проекта
- `frontend/`: (Корень) Исходный код клиентской части.
- `backend/`: API-сервисы и логика Триа.
- `js/wasm/`: Модули на Rust, скомпилированные в WASM.
- `conductor/`: База знаний и треки разработки (локально).

## 🚦 Правила Разработки и Деплоя
- **master**: Главная ветка (Production). Авто-деплой на [holograms.media](https://holograms.media).
- **dev**: Ветка разработки (Development). Деплой на [dev.holograms.media](https://dev.holograms.media).
- Все правки осуществляются через ветку `dev` с последующим слиянием в `master`.

---
*Developed by **NeuroCoder** & Tria Collective Intelligence.*
