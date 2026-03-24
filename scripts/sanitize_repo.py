
import re
import os
from pathlib import Path

# Конфигурация паттернов для маскировки
# Используем именованные группы для гибкости
PII_PATTERNS = [
    # 1. Hardware Specifics (User Request)
    (r'AMD Ryzen AI \d+ \d+', '[REDACTED_CPU]'),
    (r'realme GT Neo \d+', '[REDACTED_PHONE]'),
    (r'Ryzen AI \d+', '[REDACTED_CPU]'),
    
    # 2. Email Addresses (Generic)
    # Исключаем placeholder emails типа user@example.com
    (r'(?<!example\.com)([\w\.-]+@[\w\.-]+\.\w+)', '[REDACTED_EMAIL]'),
    
    # 3. Private Keys & Tokens (Heuristic)
    # Поиск длинных строк, похожих на ключи (sk-..., ghpH..., eyJ...)
    (r'(sk-[a-zA-Z0-9]{32,})', '[REDACTED_API_KEY]'),
    (r'(ghp_[a-zA-Z0-9]{36})', '[REDACTED_GITHUB_TOKEN]'),
    (r'(AstraCS:[a-zA-Z0-9_]+:[a-f0-9]{64})', '[REDACTED_ASTRA_TOKEN]'),
    
    # 4. IP Addresses (IPv4)
    (r'\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b', '[REDACTED_IP]'),
]

def sanitize_content(content: str) -> str:
    """Применяет набор regex-правил к тексту."""
    for pattern, replacement in PII_PATTERNS:
        content = re.sub(pattern, replacement, content)
    return content

def process_repomix_file(file_path: str):
    """
    Читает repomix-context.xml, маскирует данные и сохраняет обратно.
    """
    path = Path(file_path)
    if not path.exists():
        print(f"❌ File not found: {file_path}")
        return

    print(f"🛡️  Starting Sanitization for: {file_path}")
    
    try:
        # Читаем файл (utf-8, ignore errors чтобы не упасть на эмодзи)
        original_content = path.read_text(encoding='utf-8', errors='ignore')
        
        # Применяем маскировку
        sanitized_content = sanitize_content(original_content)
        
        # Проверяем, были ли изменения
        if original_content != sanitized_content:
            path.write_text(sanitized_content, encoding='utf-8')
            print("✅ Sanitization complete. Sensitive data masked.")
            
            # (Опционально) Статистика
            diff_size = len(original_content) - len(sanitized_content)
            print(f"📉 Content size changed by {diff_size} bytes")
        else:
            print("ℹ️  No sensitive patterns found. File remains unchanged.")
            
    except Exception as e:
        print(f"❌ Error during sanitization: {e}")

if __name__ == "__main__":
    # По умолчанию ищем repomix-context.xml в корне (на уровень выше scripts/)
    repo_root = Path(__file__).parent.parent
    target_file = repo_root / "repomix-context.xml"
    
    process_repomix_file(str(target_file))
