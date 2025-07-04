> **[ВАЖНО]** Этот документ описывает концептуальные, исследовательские или плановые материалы. Он **не описывает** текущую, внедренную архитектуру проекта. Для получения точного описания действующей системы, пожалуйста, обратитесь к файлу `docs/RU/Architecture/SystemDescription.md`.

**IMPORTANT NOTE: This glossary describes terms related to the "NEOLANG WHITEGHOST" conceptual framework, which was explored as a research/visionary direction for the project. The definitions herein DO NOT describe the currently implemented production architecture of the "Holographic Media" project (which is based on Python/FastAPI, JavaScript, Cloudflare R2, Neon.tech PostgreSQL, and Firebase). This document should be read with that specific context in mind. The original TODO comment regarding its potential deprecation is also relevant.**

---
<!-- TODO: REVIEW FOR DEPRECATION - This glossary appears to be based ENTIRELY on a 'NEOLANG WHITEGHOST' concept and a 'docs/WHITEGHOST.md' document. This is CONTRADICTORY to the observed current architecture (Python backend, JavaScript frontend, FastAPI, Neon.tech DB, Cloudflare R2/Backblaze B2, Firebase). Verify if WHITEGHOST.md is current, a future vision, or if this glossary is obsolete and should be archived or moved to research/vision. -->
# Глоссарий Проекта "Голографические Медиа"

Этот глоссарий содержит ключевые термины, используемые в проекте "Голографические Медиа". Определения основаны на документе `docs/WHITEGHOST.md` (версия, описывающая проект "Голографические Медиа").

## Основные Концепции и Компоненты Проекта

-   **Триа (Tria)**: Система AI, которая непрерывно обучается на взаимодействиях с пользователями, эволюционируя и улучшая свои коммуникативные и аналитические способности. Является ядром проекта "Голографические Медиа". Состоит из нескольких взаимосвязанных ботов (GestureBot, AudioBot, MemoryBot, LearningBot, CoordinationService), реализованных на NEOLANG WHITEGHOST. Принцип работы: "Триа собирает себя сама".
-   **Голограмма (Hologram) / Голографические Примитивы**: В контексте NEOLANG WHITEGHOST, это высокоуровневые абстракции для работы с трехмерными аудиовизуальными объектами. Позволяют декларативно описывать поведение и взаимодействие голограмм, которые могут автоматически реагировать на жесты или звуковые команды. Стандартная библиотека `NeoHolo` предоставляет набор таких примитивов. В более общем смысле проекта, это динамическая, интерактивная 3D-аудиовизуализация данных.
-   **Комбинированный Аудио(Видео)-Жестовый Чанк (Interaction Chunk / Чанк)**: Структурированный набор данных, типизированный в NEOLANG, фиксирующий каждое взаимодействие пользователя с системой (жест, голосовая команда, изменение состояния голограммы). Включает необработанные данные, семантические дескрипторы, контекст и обратную связь. Чанки сохраняются и используются LearningBot для обучения Триа.
-   **Технология Трехмерной Аудиовизуализации (ТТА)**: Общий термин, описывающий технологическую основу проекта "Голографические Медиа", позволяющую создавать и взаимодействовать с интерактивными трехмерными аудиовизуальными представлениями. NEOLANG WHITEGHOST предоставляет для этого Голографические Примитивы. (Термин ТТА как таковой не дан в WHITEGHOST.md, определение основано на общем контексте документа).
-   **Жестовая операционная система (ЖОС)**: Концепция системы управления, где основным способом ввода команд и взаимодействия являются жесты пользователя, интерпретируемые AI Триа с использованием GestureBot и Динамической Семантической Типизации NEOLANG. (Термин ЖОС как таковой не дан в WHITEGHOST.md, определение основано на описании GestureBot и философии проекта).
-   **Медленное обучение (Slow Learning)**: Подразумевается в принципе "Триа собирает себя сама" и работе LearningBot, который непрерывно обучается на "чанках" данных, анализирует эффективность, генерирует новые стратегии и адаптирует алгоритмы. Это процесс постепенной эволюции и глубокой адаптации системы. (Термин "Медленное обучение" явно не используется, но концепция описывается в контексте LearningBot и "жидкого кода").
-   **Absolute Zero Reasoning (AZR)**: Процесс, управляемый LearningBot в AI Триа, где Триа пытается решать новые задачи без предварительных знаний, способствуя самообучению и развитию. NEOLANG WHITEGHOST поддерживает это через "жидкий код" и метапрограммирование.
-   **HoloGraph (HG)**: Будущая децентрализованная экосистема, технологической основой для которой является NEOLANG WHITEGHOST. Включает экономические аспекты, такие как Интеллектуальный Майнинг и Proof-of-Contribution/Proof-of-Value, а также управление через смарт-контракты, написанные на NEOLANG.
-   **Интеллектуальный Майнинг (Intelligent Mining)**: Механизм в экосистеме HoloGraph, где пользователи вознаграждаются за предоставление качественных "чанков" данных для обучения Триа или вычислительных ресурсов для Децентрализованной Сети Исполнения (DEN). Ценность создается за счет улучшения AI и расширения возможностей системы.
-   **Proof-of-Contribution / Proof-of-Value**: Механизмы консенсуса и вознаграждения в экосистеме HoloGraph, основанные на доказательстве вклада пользователей (данные, разработка модулей для Триа на NEOLANG) и создании ценности (популярные голограммы, сервисы).
-   **Динамическая Семантическая Типизация (Dynamic Semantic Typing)**: Инновация NEOLANG WHITEGHOST, где типы данных несут семантическую нагрузку, понятную AI Триа (например, тип `ЖестРуки` с метаданными об эмоциональном окрасе). Используется Триа для глубокого понимания намерений пользователя.
-   **"Жидкий" Код и Эволюционирующие Структуры (Liquid Code & Evolving Structures)**: Концепция в NEOLANG WHITEGHOST, позволяющая структурам данных и логике программы изменяться во время выполнения под контролем AI Триа, используя метапрограммирование (MetaScript 2.0). Ключевая для самообучения Триа.
-   **Децентрализованная Сеть Исполнения (Decentralized Execution Network - DEN)**: Архитектура, для которой спроектирован NEOLANG WHITEGHOST, позволяющая распределять вычислительную нагрузку (рендеринг, AI-задачи) между устройствами пользователей и узлами сети. Использует протокол `GhostComm`.

## Боты и Сервисы Триа (на базе NEOLANG WHITEGHOST)

-   **GestureBot**: Анализирует данные жестов, используя Динамическую Семантическую Типизацию NEOLANG для интерпретации в контексте. Модели могут быть интегрированы с NEOLANG.
-   **AudioBot**: Обрабатывает входящий звук и синтезирует звуковые реакции голограмм. Использует специализированные типы NEOLANG для аудиопотоков и вейвлет-анализа.
-   **MemoryBot**: Отвечает за долговременную память Триа (база знаний о пользователе, предыдущих взаимодействиях, общие понятия). Реализован на NEOLANG с использованием встроенных средств для работы с графовыми базами данных и семантического поиска.
-   **LearningBot**: Ядро самообучения Триа. Использует "жидкий" код и метапрограммирование NEOLANG для анализа эффективности других ботов, генерации новых стратегий поведения и адаптации алгоритмов. Управляет процессом Absolute Zero Reasoning (AZR).
-   **CoordinationService**: Оркестрирует взаимодействие между ботами и внешними системами. Написан на NEOLANG, использует его возможности для асинхронного и параллельного выполнения (GhostThreads 2.0).

## Технологии Анализа Аудио (Вейвлеты в NEOLANG)

-   **Непрерывное Вейвлет-Преобразование (Continuous Wavelet Transform - CWT)**: NEOLANG WHITEGHOST предоставляет функции для выполнения CWT через библиотеку `NeoSignal` для получения детальных частотно-временных представлений сигналов.
-   **Вейвлет Морле (Morlet Wavelet)**: Один из типов вейвлетов, поддерживаемых библиотекой `NeoSignal` в NEOLANG WHITEGHOST для использования в CWT.
-   **FastCWTProcessor**: Оптимизированный компонент в NEOLANG WHITEGHOST для высокопроизводительной CWT-обработки в реальном времени, использующий параллелизм NEOLANG (GhostThreads).
-   **WaveletAnalyzer**: Высокоуровневый класс в NEOLANG WHITEGHOST (`NeoSignal`), инкапсулирующий логику анализа сигналов с помощью вейвлетов (выделение признаков, шумоподавление, классификация).

## Веб-Технологии и API (Интеграция с NEOLANG)

-   **AudioWorkletGlobalScope / AudioWorkletProcessor**: NEOLANG, скомпилированный в WebAssembly (WASM), может взаимодействовать с AudioWorkletProcessor для выполнения сложной логики AudioBot (вейвлет-анализ, синтез) на клиенте. `docs/WHITEGHOST.md` упоминает это как возможность. (Стандартное определение MDN, контекст использования дан в WHITEGHOST.md).
-   **InstancedMesh (Three.js)**: NEOLANG WHITEGHOST предоставляет бэкенд-логику и данные для управления объектами, такими как InstancedMesh, в Three.js/WebGPU на клиенте для визуализации голограмм. (Стандартное определение Three.js, контекст использования дан в WHITEGHOST.md).
-   **SharedArrayBuffer / Atomics**: Могут использоваться для эффективного обмена данными между основным потоком JavaScript и WASM-модулями NEOLANG (например, для AudioWorklet). `docs/WHITEGHOST.md` упоминает это как возможность. (Стандартное определение MDN, контекст использования дан в WHITEGHOST.md).
-   **LangChain / LangGraph**: `docs/WHITEGHOST.md` упоминает, что концепции и архитектурные подходы из этих фреймворков используются для проектирования взаимодействия ботов Триа, хотя ядро Триа пишется на NEOLANG для более глубокого контроля. (Отраслевое определение, контекст использования дан в WHITEGHOST.md).
-   **Интерактивный Тур (Interactive Tour)**: Упоминается в `docs/WHITEGHOST.md` как средство знакомства новых пользователей с системой "Голографические Медиа". (Общее определение, упомянуто в WHITEGHOST.md).
-   **Mistral Small**: Модель LLM, используемая для помощи в разработке NEOLANG, генерации документации и примеров, как указано в `docs/WHITEGHOST.md`. (Отраслевое определение, упомянуто в WHITEGHOST.md).
-   **Web Speech API (SpeechRecognition / SpeechSynthesis)**: NEOLANG WHITEGHOST может обрабатывать данные, полученные от SpeechRecognition на клиенте, и предоставлять текст/параметры для SpeechSynthesis. (Стандартное определение MDN, контекст использования дан в WHITEGHOST.md).
-   **Прогрессивное Веб-Приложение (Progressive Web Application - PWA)**: Бэкенд на NEOLANG WHITEGHOST может поддерживать функции PWA через API, например, управляя кешированием данных в IndexedDB на клиенте. (Стандартное определение, контекст использования дан в WHITEGHOST.md).
-   **IndexedDB**: Бэкенд на NEOLANG WHITEGHOST может управлять кешированием данных в IndexedDB на клиенте для поддержки PWA. (Стандартное определение MDN, контекст использования дан в WHITEGHOST.md).

## Прочие Упомянутые Технологии (в контексте WHITEGHOST.md)
Термины ниже не являются частью NEOLANG или проекта "Голографические Медиа" напрямую, но упомянуты в `docs/WHITEGHOST.md` в разделе сравнения или интеграции. Они не требуют детального определения в данном глоссарии, так как не являются ключевыми терминами *проекта*.
-   Firebase Ecosystem, Neon.tech PostgreSQL + pgvector, Backblaze B2, FastAPI on Koyeb, Docker, Genkit: Эти термины были в предыдущей версии глоссария, основанной на `SYSTEM_DESCRIPTION.md`. В текущем `WHITEGHOST.md` они не упоминаются как часть архитектуры NEOLANG или проекта "Голографические Медиа". Их определения удалены для соответствия основному источнику (`WHITEGHOST.md`).

*Этот глоссарий будет пополняться по мере развития проекта.*
