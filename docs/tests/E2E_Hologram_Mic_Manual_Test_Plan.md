# План E2E Тестирования Отображения Голограммы и Реакции на Микрофон

**ID для отчета:** [20240726-1029-031]
**Цель:** Подготовить план End-to-End тестирования для проверки отображения базовой голограммы и ее реакции на аудиовход с микрофона.

## Предусловия:
*   Фронтенд-приложение успешно развернуто и доступно в браузере.
*   Основные компоненты рендеринга голограммы (`hologramRenderer.js`, `sceneSetup.js`) и аудиообработки (`audioAnalyzer.js`, `audioVisualizer.js`, `microphoneManager.js`) интегрированы и функционируют.
*   Браузер, используемый для тестирования, имеет доступ к микрофону.

## Шаги Тестирования (Выполнять последовательно):

### Шаг 1: Открытие приложения и отображение базовой голограммы
*   **Действие:** Открыть фронтенд-приложение в веб-браузере.
*   **Ожидаемый результат:** На экране должна отображаться статическая или базовая анимированная голограмма. Не должно быть явных ошибок в консоли браузера, связанных с инициализацией 3D-сцены.
*   **Место проверки:** Пользовательский интерфейс (UI) приложения (центральная область), консоль браузера (для ошибок).
*   **Необходимые инструменты/данные:** Веб-браузер.

### Шаг 2: Предоставление доступа к микрофону
*   **Действие:** Нажать кнопку "Mic" (id=`micButton`) на левой панели. При первом использовании браузер должен запросить разрешение на доступ к микрофону.
*   **Ожидаемый результат:** Браузер запрашивает разрешение на использование микрофона. После предоставления разрешения кнопка "Mic" должна изменить свое состояние (например, добавить класс `active`, изменить цвет) или текст, указывая на то, что микрофон включен. В консоли браузера должны быть логи от `microphoneManager.js` о начале захвата аудио.
*   **Место проверки:** Пользовательский интерфейс (UI) приложения (`micButton`), системное диалоговое окно браузера, консоль браузера.
*   **Необходимые инструменты/данные:** Веб-браузер, микрофон.

### Шаг 3: Проверка реакции голограммы на звук с микрофона
*   **Действие:** Произнести что-либо в микрофон или включить рядом с ним источник звука (например, музыку).
*   **Ожидаемый результат:** Голограмма на экране должна визуально реагировать на изменение уровня звука (например, менять форму, размер, интенсивность цвета, пульсировать). Эта реакция должна быть динамической и соответствовать изменениям аудиосигнала.
*   **Место проверки:** Пользовательский интерфейс (UI) приложения (область голограммы), консоль браузера (для логов `audioAnalyzer.js` или `audioVisualizer.js`, если они выводят данные об уровне звука).
*   **Необходимые инструменты/данные:** Веб-браузер, микрофон, источник звука.

### Шаг 4: Проверка функциональности кнопки "Mic" (отключение)
*   **Действие:** Повторно нажать кнопку "Mic".
*   **Ожидаемый результат:** Захват аудио с микрофона должен быть остановлен. Кнопка "Mic" должна вернуться в исходное состояние (убрать класс `active`, изменить цвет/текст). Голограмма должна перестать реагировать на микрофонный ввод (вернуться к статическому состоянию или другому базовому поведению). В консоли браузера должны быть логи от `microphoneManager.js` о прекращении захвата аудио.
*   **Место проверки:** Пользовательский интерфейс (UI) приложения (`micButton`), консоль браузера.
*   **Необходимые инструменты/данные:** Веб-браузер.
