#!/usr/bin/env python3
"""
txtcleaner.py - Скрипт для очистки текстовых файлов от "хлама"
Оставляет только полезную информацию для RAG на Cloudflare
"""

import json
import sys
import re
from typing import List, Dict, Any


def clean_json_chat(content: str) -> str:
    """
    Очищает JSON файл чата, извлекая только полезные сообщения
    """
    try:
        data = json.loads(content)
        cleaned_messages = []

        if 'messages' in data:
            for msg in data['messages']:
                if msg.get('type') in ['user', 'gemini']:
                    timestamp = msg.get('timestamp', '')[:19]  # YYYY-MM-DDTHH:MM:SS
                    content = msg.get('content', '').strip()

                    if content:
                        # Удаляем лишние пробелы и переносы строк
                        content = re.sub(r'\s+', ' ', content)
                        content = content.strip()

                        if content:
                            role = 'Пользователь' if msg['type'] == 'user' else 'Gemini'
                            cleaned_messages.append(f"[{timestamp}] {role}: {content}")

        return '\n\n'.join(cleaned_messages)

    except json.JSONDecodeError:
        # Если не JSON, обрабатываем как обычный текст
        return clean_text_content(content)


def clean_text_content(content: str) -> str:
    """
    Очищает обычный текстовый контент
    """
    # Удаляем множественные пробелы и переносы строк
    content = re.sub(r'\s+', ' ', content)

    # Удаляем строки с только пробелами или пустые
    lines = [line.strip() for line in content.split('\n') if line.strip()]

    # Удаляем повторяющиеся строки
    unique_lines = []
    seen = set()
    for line in lines:
        if line not in seen:
            unique_lines.append(line)
            seen.add(line)

    return '\n'.join(unique_lines)


def clean_logs_content(content: str) -> str:
    """
    Очищает логи, оставляя только важные сообщения
    """
    lines = content.split('\n')
    cleaned_lines = []

    for line in lines:
        line = line.strip()
        if line:
            # Удаляем технические детали, оставляем смысловые сообщения
            if not any(skip in line.lower() for skip in [
                'debug', 'info', 'warning', 'error',
                'timestamp', 'level', 'logger',
                'stack trace', 'exception'
            ]):
                # Удаляем множественные пробелы
                line = re.sub(r'\s+', ' ', line)
                cleaned_lines.append(line)

    return '\n'.join(cleaned_lines)


def detect_content_type(content: str) -> str:
    """
    Определяет тип контента для выбора метода очистки
    """
    content = content.strip()

    # Проверяем на JSON
    if content.startswith('{') and content.endswith('}'):
        try:
            json.loads(content)
            return 'json_chat'
        except:
            pass

    # Проверяем на логи
    if any(indicator in content.lower() for indicator in [
        'log', 'error', 'debug', 'info', 'warning'
    ]):
        return 'logs'

    return 'text'


def clean_content(content: str) -> str:
    """
    Основная функция очистки контента
    """
    content_type = detect_content_type(content)

    if content_type == 'json_chat':
        return clean_json_chat(content)
    elif content_type == 'logs':
        return clean_logs_content(content)
    else:
        return clean_text_content(content)


def main():
    """
    Основная функция скрипта
    """
    if len(sys.argv) > 1:
        # Читаем из файла
        filename = sys.argv[1]
        try:
            with open(filename, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            print(f"Ошибка чтения файла {filename}: {e}", file=sys.stderr)
            sys.exit(1)
    else:
        # Читаем из stdin
        content = sys.stdin.read()

    cleaned_content = clean_content(content)

    # Выводим очищенный контент
    print(cleaned_content)


if __name__ == '__main__':
    main()

