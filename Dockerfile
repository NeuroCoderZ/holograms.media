# Финальный образ
FROM python:3.11-slim-bullseye

ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV PYTHONPATH=/app
WORKDIR /app

# Устанавливаем зависимости
COPY backend/requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    python -c "from mistralai.client import Mistral; print('Mistral import OK')"

# Устанавливаем системные зависимости для Hermes/Tria Cortex (если нужны, например git или curl)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    git \
    openssl \
    && rm -rf /var/lib/apt/lists/*

# Копируем необходимые файлы
COPY ./backend /app/backend
COPY ./js /app/js
COPY ./css /app/css
COPY ./public /app/public
COPY ./holocore/pkg /app/holocore/pkg

COPY ./index.html /app/index.html
COPY ./style.css /app/style.css
COPY ./favicon.ico /app/favicon.ico

# Копируем скрипт запуска
COPY ./start.sh /app/start.sh
RUN chmod +x /app/start.sh

EXPOSE 8000
EXPOSE 18789

CMD ["/app/start.sh"]
