# Этап 1: "Строительный" этап для Python
FROM python:3.11-slim-bullseye AS builder

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    pip show mistralai

# Этап 2: Финальный образ
FROM python:3.11-slim-bullseye AS final

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV PYTHONPATH=/app
WORKDIR /app

# Копируем установленные библиотеки
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Копируем ТОЛЬКО необходимые файлы для запуска бэкенда и статики
COPY ./backend /app/backend
COPY ./js /app/js
COPY ./css /app/css
COPY ./public /app/public
# ВАЖНО: Копируем только pkg из holocore (только скомпилированный WASM)
COPY ./holocore/pkg /app/holocore/pkg

COPY ./index.html /app/index.html
COPY ./style.css /app/style.css
COPY ./favicon.ico /app/favicon.ico

EXPOSE 8000

# Очистка кэша APT после установки nodejs если он все же нужен, но тут он кажется лишним для FastAPI
# Если GestureBot реально нужен на бэкенде, его лучше запускать как отдельный сервис или оптимизировать
# Убираем установку Node.js и npm install так как это "хлам" для бэкенда

CMD ["uvicorn", "backend.app:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
