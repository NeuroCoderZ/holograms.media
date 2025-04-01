#!/bin/bash
# Путь к директории проекта
PROJECT_DIR="/root/holograms.media"
# Регулярное выражение для отслеживания файлов .js, .css, .html
FILE_PATTERN=".*\.(js|css|html)$"

echo "Отслеживание изменений в $PROJECT_DIR..."

# Используем inotifywait для отслеживания изменений
inotifywait -m "$PROJECT_DIR" -e modify -e create -e delete --include "$FILE_PATTERN" |
while read -r directory events filename; do
    echo "Обнаружено изменение: $filename ($events)"
    # Переходим в директорию проекта
    cd "$PROJECT_DIR"
    # Добавляем изменённые файлы в Git
    git add .
    # Создаём коммит
    git commit -m "Auto-commit: Updated $filename due to $events" --allow-empty
    echo "Автоматический коммит выполнен для $filename"
done
inotifywait -m -r "$PROJECT_DIR" -e modify -e create -e delete --include "$FILE_PATTERN" |
