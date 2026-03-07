# Архитектура Системы

Этот раздел содержит подробную информацию об архитектуре системы "holograms.media". Здесь собраны основные документы, описывающие архитектуру проекта, включая системные спецификации, интерфейсы модулей, API и стратегии тестирования.

## Структура Документов

### Основные Архитектурные Документы
- **AudioVisualizationArchitecture.md** - Архитектура системы визуализации аудиопотока с использованием CWT и Three.js
- **ModuleCatalog.MD** - Каталог модулей системы с описанием их назначения и взаимодействия
- **ModuleInterfaces.MD** - Спецификации интерфейсов между модулями
- **NetHoloGlyph_Protocol_v1.md** - Протокол NetHoloGlyph для обмена данными между клиентами
- **SystemDescription.MD** - Общее описание системы и её компонентов

### Спецификации API
- **ApiSpecifications/ApiEndpointsV1Description.json** - Спецификация API эндпоинтов версии 1

### Инфраструктура
- **Infrastructure/DeploymentStrategy.md** - Стратегия развертывания системы
- **Infrastructure/KoyebR2DeploymentGuide.md** - Руководство по развертыванию на Koyeb и Cloudflare R2
- **Infrastructure/CloudInfrastructureGuide.md** - Общий гайд по облачной инфраструктуре (CF Pages, R2, Koyeb)
- **Infrastructure/WebGPUMigrationGuide.md** - Руководство по миграции на WebGPU (R&D)

## Текущий Статус Реализации

### Завершенные Компоненты
- ✅ WebRTC клиент для P2P обмена данными (NetHoloGlyphClient)
- ✅ Серверный сервис NetHoloGlyphService для обработки сообщений
- ✅ Интеграция с HologramRenderer для отправки/приема квантов
- ✅ Система визуализации аудио с CWT анализом
- ✅ Управление жестами через MediaPipe Hands

### Компоненты в Разработке
- 🔄 Переход с JSON на Protocol Buffers для оптимизации производительности
- 🔄 Генерация protobuf файлов для Python и JavaScript
- 🔄 Реализация LZ4 сжатия для аудиоданных

## Ключевые Технологии

- **Frontend**: HTML5, CSS3, JavaScript ES6+, Three.js, WebGL, WebRTC, Monaco Editor
- **Backend (текущий)**: FastAPI (Koyeb), Astra DB (Free, 80GB). **План:** Cloudflare Workers + D1.
- **Хранение**: Cloudflare R2 (нулевой egress). Локально: `SQLiteEmbeddingService` (sql.js).
- **AI/ML**: TensorFlow.js, MediaPipe Hands, Tria (LLM-агенты)
- **Инфраструктура**: Cloudflare Pages, Koyeb (план: Workers/DO), GitHub Actions CI/CD
- **Блокчейн (R&D)**: Native HoloGraph Ledger (Spatial Consensus L1)

## Связи с Кодом

Все архитектурные решения в этих документах напрямую соответствуют реализации в коде проекта. Основные файлы для сравнения:
- `js/services/netHoloGlyphClient.js` - WebRTC клиент
- `backend/services/NetHoloGlyphService.py` - Серверный сервис
- `js/3d/hologramRenderer.js` - Визуализация голограмм
- `js/audio/waveletAnalyzer.js` - CWT анализ аудио
