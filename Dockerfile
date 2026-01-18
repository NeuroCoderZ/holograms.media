# Этап 1: "Строительный" этап - установка всех зависимостей
FROM python:3.11-slim-bullseye AS builder

# Устанавливаем переменные окружения
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /app

# Копируем только файл с зависимостями
COPY backend/requirements.txt .

# Устанавливаем зависимости. На этом этапе образ будет большим.
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Этап 2: "Финальный" этап - создание маленького образа
FROM python:3.11-slim-bullseye AS final

# Устанавливаем Node.js (нужен для GestureBot)
RUN apt-get update && apt-get install -y \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Устанавливаем переменные окружения
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

WORKDIR /app

# Копируем ТОЛЬКО установленные библиотеки из "строительного" этапа
# Это ключевой шаг для уменьшения размера
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Копируем наш код в финальный образ
COPY ./backend /app/backend
COPY ./scripts /app/scripts

# Указываем, что контейнер будет слушать на порту 8000
EXPOSE 8000

# Команда для запуска приложения.
CMD ["uvicorn", "backend.app:app", "--host", "0.0.0.0", "--port", "8000"]
