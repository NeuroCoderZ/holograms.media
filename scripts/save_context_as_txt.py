
import os
import re
import hashlib
from pathlib import Path

# Конфигурация
CHUNK_SIZE_TOKENS = 1500  # Как в основном скрипте
OUTPUT_FILE = "repomix_debug_full.txt"

def parse_repomix_to_txt(xml_path: str):
    """Парсит repomix-context.xml и сохраняет чанки в текстовый файл для отладки"""
    try:
        print(f"📄 Чтение {xml_path}...")
        with open(xml_path, 'r', encoding='utf-8', errors='ignore') as f:
             content = f.read()
        
        # Ищем блоки <file path="...">...</file>
        pattern = r'<file path="([^"]+)">\s*(.*?)\s*</file>'
        matches = list(re.finditer(pattern, content, re.DOTALL))
        
        print(f"🔍 Найдено {len(matches)} файлов. Сохранение в {OUTPUT_FILE}...")
        
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as out:
            for match in matches:
                file_path = match.group(1)
                file_content = match.group(2).strip()
                
                if not file_content:
                    continue

                out.write(f"\n{'='*50}\n")
                out.write(f"FILE: {file_path}\n")
                out.write(f"{'='*50}\n")
                out.write(file_content)
                out.write("\n\n")

        print(f"✅ Файл {OUTPUT_FILE} создан.")
        
    except Exception as e:
        print(f"❌ Ошибка: {e}")

if __name__ == '__main__':
    xml_path = Path(__file__).parent.parent / "repomix-context.xml"
    if xml_path.exists():
        parse_repomix_to_txt(str(xml_path))
    else:
        print(f"❌ {xml_path} не найден.")
