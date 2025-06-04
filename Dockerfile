FROM python:3.12-slim

WORKDIR /app

# Копируем только то, что нужно для установки зависимостей бэкенда
COPY backend/requirements_render.txt ./backend/requirements_render.txt
RUN pip install --no-cache-dir -r ./backend/requirements_render.txt

# Копируем все остальное (включая папку backend с исходным кодом)
# Это скопирует 'backend' как '/app/backend', 'frontend' как '/app/frontend' и т.д.
COPY . .

# Переменная PORT будет предоставлена Render.
# EXPOSE директива здесь больше для информации, Render сам управляет портами.
# Uvicorn будет запущен на порту, указанном в переменной окружения PORT.

# Команда для запуска приложения. Render установит переменную окружения PORT.
CMD sh -c "uvicorn backend.app:app --host 0.0.0.0 --port $PORT"
