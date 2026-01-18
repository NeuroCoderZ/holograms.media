# backend/tria_agents/tria_knowledge_extractor.py
import os
import re
import ast
import logging
from typing import List, Dict, Any, NamedTuple, Optional

logger = logging.getLogger(__name__)

class Pattern(NamedTuple):
    name: str
    regex: re.Pattern
    description: str
    file_type: Optional[str] = None

class DomainKnowledge(NamedTuple):
    patterns: List[str]
    relationships: List[Dict[str, Any]]
    business_rules: List[str]

class HolographicMediaKnowledgeExtractor:
    def __init__(self):
        self.patterns = [
            Pattern("Three.js Scene Setup", re.compile(r"new THREE\.(Scene|WebGLRenderer|PerspectiveCamera)"), "Инициализация сцены Three.js", "js"),
            Pattern("Nethologlyph Protocol", re.compile(r"NetHoloGlyphQuantum|GestureDelta|EmbeddingDelta|WaveletFrame"), "Структура данных протокола NetHoloGlyph", "proto"),
            Pattern("Hologram Renderer Update", re.compile(r"hologramRenderer\.updateVisuals"), "Обновление 3D визуализации голограммы", "js"),
            Pattern("MediaPipe Hands", re.compile(r"MediaPipe Hands|handsTracking\.js"), "Отслеживание рук с MediaPipe", "js"),
            Pattern("WebGPU Init", re.compile(r"navigator\.gpu\.requestAdapter"), "Инициализация WebGPU", "js"),
            Pattern("SQLite DB Access", re.compile(r"sqlite3\.connect"), "Доступ к SQLite базе данных", "py"),
            Pattern("FAISS Index", re.compile(r"faiss\.(read_index|IndexFlatL2|IndexIDMap2)"), "Работа с FAISS индексами", "py"),
            Pattern("BM25 Search", re.compile(r"BM25Okapi"), "Лексический поиск BM25", "py"),
            Pattern("Knowledge Graph Build", re.compile(r"networkx|nx\.Graph"), "Построение графа знаний", "py"),
            Pattern("Embedding Generation", re.compile(r"tf\.saved_model\.load|universal-sentence-encoder"), "Генерация эмбеддингов", "py"),
            Pattern("FastAPI App", re.compile(r"FastAPI\("), "Инициализация FastAPI приложения", "py"),
            Pattern("Asyncpg Database", re.compile(r"asyncpg\.connect"), "Подключение к PostgreSQL через asyncpg", "py"),
        ]
        logger.info("HolographicMediaKnowledgeExtractor initialized.")

    def extract_domain_knowledge(self, file_path: str, file_content: str) -> List[str]:
        """
        Извлекает доменные знания (паттерны) из содержимого файла.
        Возвращает список названий найденных паттернов.
        """
        found_patterns = []
        file_extension = os.path.splitext(file_path)[1].lstrip('.')

        for pattern in self.patterns:
            if pattern.file_type and pattern.file_type != file_extension:
                continue
            if pattern.regex.search(file_content):
                found_patterns.append(pattern.name)
        return found_patterns

    def _extract_relationships(self, file_path: str, file_content: str) -> List[Dict[str, Any]]:
        """
        Извлекает отношения между компонентами (например, импорты, вызовы функций).
        Это более сложная задача, требующая AST-парсинга.
        """
        relationships = []
        file_extension = os.path.splitext(file_path)[1].lstrip('.')

        if file_extension == 'py':
            try:
                tree = ast.parse(file_content)
                for node in ast.walk(tree):
                    if isinstance(node, (ast.Import, ast.ImportFrom)):
                        for alias in node.names:
                            imported_name = alias.name
                            relationships.append({
                                'source_file': file_path,
                                'target_module': imported_name,
                                'relation_type': 'imports'
                            })
                    elif isinstance(node, ast.Call):
                        if isinstance(node.func, ast.Name):
                            # Simple function call
                            relationships.append({
                                'source_file': file_path,
                                'target_function': node.func.id,
                                'relation_type': 'calls',
                                'line': node.lineno
                            })
                        elif isinstance(node.func, ast.Attribute):
                            # Method call (e.g., obj.method())
                            relationships.append({
                                'source_file': file_path,
                                'target_object': node.func.value.id if hasattr(node.func.value, 'id') else str(node.func.value),
                                'target_method': node.func.attr,
                                'relation_type': 'calls_method',
                                'line': node.lineno
                            })
                    elif isinstance(node, ast.ClassDef):
                        for base in node.bases:
                            if isinstance(base, ast.Name):
                                relationships.append({
                                    'source_file': file_path,
                                    'target_class': node.name,
                                    'relation_type': 'inherits_from',
                                    'base_class': base.id
                                })
            except SyntaxError as e:
                logger.error(f"Syntax error in Python file {file_path}: {e}")
        elif file_extension == 'js':
            # TODO: For JS, integrate with an external parser (e.g., esprima via subprocess)
            logger.warning(f"JS AST parsing not implemented for {file_path}. Skipping relationships extraction.")
            pass
        return relationships

    def _extract_business_rules(self, file_content: str) -> List[str]:
        # Simple extraction of comments that might contain business rules
        business_rules = []
        # Look for lines starting with # TODO: Business Rule: or similar
        for line in file_content.splitlines():
            if re.search(r"#\s*(TODO:)?\s*Business\s*Rule:?", line, re.IGNORECASE):
                business_rules.append(line.strip())
        return business_rules

    def analyze_codebase(self, codebase_root: str) -> DomainKnowledge:
        """
        Анализирует всю кодовую базу для извлечения доменных знаний.
        """
        all_patterns = set() # Use set to avoid duplicates
        all_relationships = []
        all_business_rules = []

        for root, _, files in os.walk(codebase_root):
            for file_name in files:
                file_path = os.path.join(root, file_name)
                # Extend file types as needed
                if file_path.endswith(('.py', '.js', '.md', '.proto', '.txt')):
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            content = f.read()

                        # Extract patterns
                        found_patterns = self.extract_domain_knowledge(file_path, content)
                        if found_patterns:
                            all_patterns.update(found_patterns)

                        # Extract relationships
                        found_relationships = self._extract_relationships(file_path, content)
                        if found_relationships:
                            all_relationships.extend(found_relationships)
                        
                        # Extract business rules
                        found_business_rules = self._extract_business_rules(content)
                        if found_business_rules:
                            all_business_rules.extend(found_business_rules)

                    except Exception as e:
                        logger.error(f"Error processing file {file_path}: {e}")

        return DomainKnowledge(list(all_patterns), all_relationships, all_business_rules)
