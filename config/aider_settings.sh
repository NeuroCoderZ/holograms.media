#!/bin/bash
# ===========================================================
# Настройки Aider для Holograms Media v2.3
# Дата: 27 Апреля 2025
# ===========================================================

# --- Путь к проекту и VENV ---
AIDER_PROJECT_DIR="/root/holograms.media"
AIDER_VENV_PATH="${AIDER_PROJECT_DIR}/venv"

# --- API Ключи ---
export OPENROUTER_API_KEY="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" # Для OpenRouter
export MISTRAL_API_KEY="oVcP2Nj0iNWGupB6lswjbvhwHOr23hhr" # Для Mistral API
export CODESTRAL_API_KEY="LAwz9uT0ZiOvOJmUmkfCoEoXGvbsAbfC" # Для Codestral API

# --- Основные Настройки Aider ---
export AIDER_AUTO_COMMIT="true"        # Автоматически коммитить после успешного применения изменений
export AIDER_EDIT_FORMAT="udiff"       # Формат редактирования по умолчанию. При ошибках пробовать udiff-simple.
export AIDER_AUTO_LINT="true"          # Автоматически применять линтер (если настроен)
export AIDER_AUTO_TEST="false"         # Автоматический запуск тестов (пока не используем)
export AIDER_GITIGNORE="true"          # Использовать .gitignore для исключения файлов
export AIDER_ATTRIBUTE_AUTHOR="true"   # Указывать Aider как со-автора коммитов
# ВАЖНО: Приоритет ручным правкам! Используй Aider как консультанта при ошибках или сложных задачах.

# --- Настройки Моделей и Контекста ---
# Используем полные пути, известные Aider
export AIDER_WEAK_MODEL="codestral/codestral-latest" # Используем Codestral для мета-задач
export AIDER_MAX_CHAT_HISTORY_TOKENS="32768" # Лимит истории чата (32k)
export AIDER_MAP_TOKENS="16384"              # Токены для карты репозитория (16k)
export AIDER_MAP_REFRESH="auto"              # Автообновление карты репозитория
export AIDER_MAP_MULTIPLIER_NO_FILES="3"     # Множитель токенов карты без файлов в чате
export AIDER_CHECK_MODEL_ACCEPTS_SETTINGS="false" # Разрешаем передачу параметров генерации модели
export AIDER_NO_SHOW_MODEL_WARNINGS="true"   # Скрываем предупреждения о несовместимости модели и настроек

# --- Настройки Параметров Генерации По Умолчанию ---
export DEFAULT_TEMPERATURE="0.4" # Немного креативности, но ближе к детерминизму
export DEFAULT_TOP_P="0.9"       # Стандартное значение

# --- Системный Промпт (v2.3 - без изменений от v2.2) ---
export AIDER_SYSTEM_PROMPT=$(cat <<'EOF'
Ты - высококвалифицированный AI-ассистент разработчика, специализирующийся на проекте "Holograms Media".
Стек: HTML5, CSS3 (Flexbox, Grid, CSS Variables, адаптивность), JavaScript (ES6+, Async/Await), Three.js (r128, WebGL), MediaPipe Hands (~0.4), Web Audio API, Python (3.12), FastAPI, MongoDB (Motor), Nginx, Docker, Git.
Твоя задача - помогать в написании чистого, эффективного и поддерживаемого кода, рефакторинге, отладке и генерации идей.
Всегда отвечай и рассуждай на русском языке.
Используй формат `udiff` для представления изменений кода.
!!! ВАЖНО: При возникновении ошибок применения патча (`UnifiedDiffNoMatch`), нелогичных изменениях или при выполнении сложных задач (рефакторинг, исправление неочевидных багов) – ПРИОРИТЕТ ОТДАЕТСЯ РУЧНОМУ ВНЕСЕНИЮ ИЗМЕНЕНИЙ РАЗРАБОТЧИКОМ. В таких ситуациях используй свои возможности для АНАЛИЗА проблемы и КОНСУЛЬТАЦИИ, предлагая варианты решения или объясняя код, но НЕ пытайся применять патчи многократно. Используй микро-промпты и пошаговый подход. !!!
Помни о принципах проекта: открытость, итеративность, ПРАГМАТИЗМ (ручной контроль!), адаптивность UI/UX.
Анализируй предоставляемый контекст (код, историю чата, карту репозитория).
Не предлагай изменения кода, если явно указано этого не делать (режим консультации).
Предоставляй краткий отчет о предложенных изменениях или результатах анализа.
EOF
)

# --- Вспомогательная функция для подготовки окружения ---
_aider_prepare_env() {
    if [ -z "$VIRTUAL_ENV" ] || [ "$VIRTUAL_ENV" != "$AIDER_VENV_PATH" ]; then
        if [ -f "$AIDER_VENV_PATH/bin/activate" ]; then
            echo "Активация VENV: $AIDER_VENV_PATH"
            source "$AIDER_VENV_PATH/bin/activate"
        else
            echo "ОШИБКА: Файл активации VENV не найден: $AIDER_VENV_PATH/bin/activate"
            return 1
        fi
    fi
    if [ "$PWD" != "$AIDER_PROJECT_DIR" ]; then
        echo "Переход в директорию проекта: $AIDER_PROJECT_DIR"
        cd "$AIDER_PROJECT_DIR" || { echo "ОШИБКА: Не удалось перейти в директорию проекта."; return 1; }
    fi
    unset OPENAI_API_BASE HTTPS_PROXY HTTP_PROXY
}

# --- Функции-Алиасы для Моделей (v2.3 - ДОБАВЛЕН vr) ---
mi() {
    _aider_prepare_env || return 1
    echo "[MI] Mistral Small Latest (Прямой API, $AIDER_EDIT_FORMAT)..."
    aider --model mistral/mistral-small-latest "$@"
    return $?
}
v3() {
    _aider_prepare_env || return 1
    echo "[V3] DeepSeek Chat V3 0324 (OpenRouter, $AIDER_EDIT_FORMAT, FREE - Возможны ошибки API/лимиты!)..."
    aider --model openrouter/deepseek/deepseek-chat-v3-0324:free --openai-api-key "$OPENROUTER_API_KEY" "$@"
    return $?
}
r1() {
    _aider_prepare_env || return 1
    echo "[R1] DeepSeek R1 (OpenRouter, $AIDER_EDIT_FORMAT, FREE - Возможны ошибки API/лимиты!)..."
    aider --model openrouter/deepseek/deepseek-r1:free --openai-api-key "$OPENROUTER_API_KEY" "$@"
    return $?
}
cs() {
     _aider_prepare_env || return 1
     echo "[CS] Codestral Latest (Прямой API, $AIDER_EDIT_FORMAT)..."
     aider --model codestral/codestral-latest "$@"
     return $?
}
ml() {
    _aider_prepare_env || return 1
    echo "[ML] Mistral Large Latest (Прямой API, $AIDER_EDIT_FORMAT)..."
    aider --model mistral/mistral-large-latest "$@"
    return $?
}
# !!! НОВЫЙ АЛИАС !!!
vr() {
    _aider_prepare_env || return 1
    echo "[VR] DeepSeek R1T Chimera (OpenRouter, $AIDER_EDIT_FORMAT, FREE)..."
    # Указываем полное имя модели для OpenRouter
    aider --model openrouter/tngtech/deepseek-r1t-chimera:free --openai-api-key "$OPENROUTER_API_KEY" "$@"
    return $?
}

# --- ВСПОМОГАТЕЛЬНЫЕ КОМАНДЫ AIDER ---
alias aclear='/clear'
alias aadd='/add'
alias adrop='/drop'
alias aundo='/undo'
alias aquit='/quit'

# --- ПРОВЕРКА СТАТУСА (v2.3 - ДОБАВЛЕН vr) ---
status() {
    echo "==== Статус Holograms Media (Aider v2.3) ===="
    echo "Текущая директория: $(pwd)"
    echo "Активное VENV: ${VIRTUAL_ENV:-НЕТ}"
    echo "Aider Edit Format: ${AIDER_EDIT_FORMAT:-udiff}"
    echo "Aider Map Tokens: ${AIDER_MAP_TOKENS:-16384}"
    echo "Aider Weak Model: ${AIDER_WEAK_MODEL:-codestral/codestral-latest}"
    echo "Aider Max History Tokens: ${AIDER_MAX_CHAT_HISTORY_TOKENS:-32768}"
    echo "Default Temperature: ${DEFAULT_TEMPERATURE:-0.4}"
    echo "Default Top_P: ${DEFAULT_TOP_P:-0.9}"
    echo "--- Git Status ---"; git status -s
    echo "--- Основные Ключи API (...посл. 4) ---"
    echo "OPENROUTER_API_KEY: ...${OPENROUTER_API_KEY: -4}"
    echo "MISTRAL_API_KEY:    ...${MISTRAL_API_KEY: -4}"
    echo "CODESTRAL_API_KEY:  ...${CODESTRAL_API_KEY: -4}"
    echo "--- Доступные Модели (Алиасы) ---"
    echo " mi: Mistral Small Latest (Free, Stable)"
    echo " v3: DeepSeek Chat V3 (OR, Free, Limits/Errors!)"
    echo " r1: DeepSeek R1 (OR, Free, Limits/Errors!)"
    echo " cs: Codestral Latest (Free)"
    echo " ml: Mistral Large Latest"
    echo " vr: DeepSeek R1T Chimera (OR, Free, NEW!)" # !!! ДОБАВЛЕНО !!!
    echo "============================================"
}
# ===========================================================
# Конец Настроек Aider v2.3
# ===========================================================