import os
import logging

logger = logging.getLogger(__name__)

def build_dynamic_context() -> str:
    """
    Динамически собирает документацию и исходный код проекта, 
    чтобы у Триа был полный контекст о том, как работает интерфейс и логика.
    """
    context_parts = []
    
    context_parts.append("# Tria Full Project Context\n")
    context_parts.append("Ты Триа — ИИ-ассистент проекта holograms.media. Ниже приведена полная актуальная документация и реальный исходный код проекта. Используй эти знания, чтобы точно отвечать на вопросы пользователя о том, как устроен проект, как работает интерфейс, какие технологии используются, и в чем философия проекта.\n\n")

    # Определяем корень проекта (считаем, что этот файл лежит в backend/services/)
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(current_dir, "..", ".."))
    
    # Директории и файлы для загрузки в контекст
    include_paths = [
        "docs",
        "js",
        "backend",
        "index.html",
        "vite.config.mjs"
    ]
    
    # То, что не нужно читать (бинарники, либы, скрытые папки)
    exclude_dirs = {".git", "node_modules", "venv", "__pycache__", ".agent", ".vscode", "public", ".gemini", "dist"}
    exclude_exts = {".png", ".jpg", ".jpeg", ".gif", ".mp3", ".wav", ".mp4", ".wasm", ".xml", ".lock", ".ico"}
    
    for path_name in include_paths:
        full_path = os.path.join(project_root, path_name)
        
        if not os.path.exists(full_path):
            continue
            
        if os.path.isfile(full_path):
            try:
                with open(full_path, "r", encoding="utf-8") as f:
                    content = f.read()
                    context_parts.append(f"## FILE: {path_name}\n```\n{content}\n```\n")
            except Exception as e:
                logger.error(f"Failed to read {path_name}: {e}")
            continue

        for root, dirs, files in os.walk(full_path):
            # Модифицируем in-place спсиок директорий, чтобы os.walk не заходил в исключённые
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            
            for file in files:
                ext = os.path.splitext(file)[1].lower()
                if ext in exclude_exts or "package-lock" in file or "repomix" in file:
                    continue
                    
                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, project_root)
                
                try:
                    with open(file_path, "r", encoding="utf-8") as f:
                        content = f.read()
                        context_parts.append(f"## FILE: {rel_path}\n```\n{content}\n```\n")
                except Exception as e:
                    pass # Пропускаем файлы с ошибками кодировки

    full_context = "\n".join(context_parts)
    logger.info(f"Built dynamic context: {len(full_context)} characters")
    return full_context
