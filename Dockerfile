# Этап 1: Используем официальный образ Python как базовый
FROM python:3.11-slim-bullseye

# Устанавливаем переменные окружения
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Устанавливаем рабочую директорию
WORKDIR /app

# Устанавливаем зависимости системы, если они нужны (например, для компиляции некоторых пакетов)
# RUN apt-get update && apt-get install -y build-essential

# Копируем только файл с зависимостями для использования кэша Docker
COPY backend/requirements.txt .

# Устанавливаем зависимости Python
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Копируем код бэкенда и скрипты в контейнер
COPY ./backend /app/backend
COPY ./scripts /app/scripts

# Запускаем скрипт верификации импортов
RUN python scripts/verify_imports.py

# Указываем, что контейнер будет слушать на порту 8000
# Koyeb автоматически пробросит трафик на этот порт
EXPOSE 8000

# Команда для запуска приложения.
CMD sh -c "uvicorn backend.app:app --host 0.0.0.0 --port ${PORT:-8000}"