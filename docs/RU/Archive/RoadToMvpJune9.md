> **[DISCLAIMER]** This document outlines visionary concepts, research notes, or future plans. It does **not** describe the current, implemented architecture of the project. For an accurate description of the current system, please refer to `docs/architecture/SYSTEM_DESCRIPTION.MD`.
# ПЛАН "ROAD TO MVP" (Дедлайн: 9 июня 2025)

## Введение

Цель: к 9 июня 2025 года реализовать минимально жизнеспособный прототип (MVP) системы "holograms.media" с поддержкой базовых сценариев работы пользователя: загрузка и визуализация голограмм, аутентификация, чат с Триа, сохранение жестов/голограмм, хранение и обработка медиа-чанков.

План основан на Deep Research System Blueprint (см. `docs/02_RESEARCH/DEEP_RESEARCH_SYSTEM_BLUEPRINT_RU.md`) с учётом ОГРАНИЧЕНИЙ:
- **Запрет на сервисы Google Cloud, требующие банковскую карту.**
- **Используем только бесплатные уровни Firebase, Supabase/Neon и открытые AI API (Mistral/Devstral).**

---

## Ключевые цели MVP

1. Firebase Auth работает, фронтенд на Firebase Hosting.
2. Бэкенд FastAPI деплоится (Cloud Run или альтернатива без карты).
3. PostgreSQL (Supabase/Neon) с полной схемой из DRSB.
4. Загрузка "чанков" (медиа — в Firebase Storage, метаданные — в PostgreSQL).
5. MVP-логика Триа (боты на Python/Mistral, RAG, логирование).
6. Базовый ответ Триа на фронтенд.
7. Кнопки "Мои жесты", "Мои голограммы", "История чата" (CRUD через PostgreSQL).
8. Визуализация голограммы (реакция на микрофон) — работает!

---

## 10-дневный план (27 мая — 9 июня)

### День 1–2 (27–28 мая): Аудит, настройка окружения
- [S] Проверить конфиги подключения к PostgreSQL (Supabase/Neon), внести креды в `.env`, обновить `pg_connector.py`.
- [S] Проверить деплой FastAPI-бэкенда локально и на бесплатном облаке (Railway, Render, Fly.io или через Supabase Functions).
- [S] Проверить актуальность схемы `backend/db/schema.sql`, выполнить миграцию на выбранной БД.
- [S] Проверить, что frontend развёрнут на Firebase Hosting (связка с Firebase Auth).

### День 2–3: Базовые CRUD-эндпоинты и аутентификация
- [M] Реализовать CRUD-эндпоинты для:
  - пользователей (`/users`)
  - жестов (`/gestures`)
  - голограмм (`/holograms`)
  - чат-сессий (`/chat-sessions`)
- [S] Реализовать защиту эндпоинтов через Firebase JWT (см. FastAPI middleware).
- [S] Протестировать регистрацию/логин через фронтенд, связать UID с таблицей пользователей в PostgreSQL.

### День 3–4: Загрузка и хранение медиа-чанков
- [M] Реализовать backend-эндпоинт для загрузки файлов (аудио/видео) на Firebase Storage.
- [S] Сохранять метаданные чанка в `audiovisual_gestural_chunks`.
- [S] Протестировать на фронте: загрузка файла, обновление списка чанков пользователя.

### День 4–5: MVP-логика Триа (чат и обработка чанков)
- [M] Добавить базовую интеграцию Mistral API в `backend/tria_bots/`.
- [S] Реализовать простейший RAG (поиск по tria_knowledge_base/tria_memory_embeddings).
- [M] Реализовать endpoint `/tria/chat` — принимает текст, возвращает ответ с использованием Mistral + RAG.
- [S] Записывать все взаимодействия в `tria_learning_log`.

### День 5–6: Жесты и голограммы (UI + backend)
- [M] Реализовать CRUD "Мои жесты" и "Мои голограммы" (эндпоинты + фронтенд).
- [S] Протестировать сохранение, отображение, удаление (UI + backend).

### День 6–7: История чата, UX-улучшения
- [S] Реализовать загрузку истории чата пользователя (backend + frontend UI).
- [S] UX-фишки: индикаторы загрузки, обработка ошибок, всплывающие уведомления.

### День 7–8: Визуализация голограмм (Three.js, микрофон)
- [L] Доделать/отладить работу визуализации голограммы с реакцией на микрофон (frontend, см. PR #40).
- [S] Протестировать работу на разных устройствах и браузерах.

### День 8–9: Интеграция, тесты, багфиксы
- [M] Провести интеграционное тестирование: последовательность "загрузка чанка → обработка Триа → сохранение жеста → отображение голограммы".
- [S] Исправить баги, найденные по ходу работ.

### День 9–10: Документация, финальные проверки
- [S] Обновить README.md, добавить инструкции по запуску MVP.
- [S] Описать структуру БД, необходимые переменные окружения.
- [S] Подготовить презентацию/демо для тестовых пользователей.

---

## Таблица задач

| Задача | Файл/папка | Оценка | День |
|--------|------------|--------|------|
| Обновить .env и pg_connector.py под Supabase/Neon | backend/db/pg_connector.py, .env | S | 1 |
| Миграция схемы в БД | backend/db/schema.sql | S | 1 |
| CRUD users/gestures/holograms/sessions | backend/routes/, backend/models/ | M | 2–3 |
| Middleware для Firebase JWT | backend/main.py, utils/auth.py | S | 2–3 |
| Загрузка медиа-чанков | backend/routes/chunks.py, frontend/js/ | M | 3–4 |
| Интеграция Mistral API | backend/tria_bots/ | M | 4–5 |
| MVP RAG (поиск по pgvector) | backend/tria_bots/memory.py | S | 4–5 |
| Endpoint /tria/chat | backend/routes/tria.py | M | 4–5 |
| Логирование взаимодействий | backend/tria_bots/LearningBot.py | S | 4–5 |
| CRUD "Мои жесты/голограммы" UI | frontend/js/, backend/routes/ | M | 5–6 |
| История чата | backend/routes/chat.py, frontend/js/ | S | 6–7 |
| Визуализация голограммы | frontend/js/3d/, frontend/js/audio/ | L | 7–8 |
| Интеграционное тестирование | — | M | 8–9 |
| Документация | README.md, docs/ | S | 9–10 |

---

## Важные рекомендации

- **Все ключевые константы и DSN — только через env! Не коммить реальные креды.**
- **Для работы с pgvector: расширение должно быть включено!**
- **Mistral/Devstral API: используйте бесплатные ключи, не превышайте лимиты, логируйте ошибки.**
- **Бэкенд деплой — если Cloud Run требует карту, используйте Railway/Render/Fly.io/Heroku (free tier).**
- **Genkit/Vertex AI — только задел на будущее, MVP не тратит на это время.**
- **Все баги и недоработки фиксировать на лету — не ждать "последнего дня".**
- **Документация: сразу заполняйте структуру файлов и endpoint'ов по мере реализации.**

---

## Ресурсы

- DRSB: `docs/02_RESEARCH/DEEP_RESEARCH_SYSTEM_BLUEPRINT_RU.md`
- Примеры .env: `.env.example`
- Схема БД: `backend/db/schema.sql`
- Примеры интеграции Mistral: [docs](https://docs.mistral.ai/)
- Supabase: [https://supabase.com/docs/guides/database](https://supabase.com/docs/guides/database)

---

**Вперёд к MVP!**
