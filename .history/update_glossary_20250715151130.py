import re
import os

def parse_markdown_glossary(content):
    terms = {}
    lines = content.split('\n')
    current_term_key = None
    current_definition_lines = []

    for line in lines:
        h3_term_match = re.match(r'### \*\*(.*?)\*\*', line)
        li_term_match = re.match(r'- \*\*(.*?)\*\*', line)

        if h3_term_match or li_term_match:
            if current_term_key:
                terms[current_term_key] = "\n".join(current_definition_lines).strip()
            current_term_key = (h3_term_match.group(1) if h3_term_match else li_term_match.group(1)).strip()
            current_definition_lines = [line] # Include the term line itself in its definition
        elif current_term_key is not None:
            current_definition_lines.append(line)
    if current_term_key:
        terms[current_term_key] = "\n".join(current_definition_lines).strip()
    return terms

def extract_terms_from_system_instruction(content):
    terms = {}
    
    sections = re.split(r'^(#+)\s*(.*)$', content, flags=re.MULTILINE)
    
    relevant_content = ""
    in_architecture_section = False
    in_data_flows_section = False

    for i in range(len(sections)):
        if sections[i].strip() == "2. Архитектура Системы":
            in_architecture_section = True
        elif sections[i].strip() == "3. Ключевые Потоки Данных":
            in_data_flows_section = True
        elif sections[i].strip().startswith("4."): # End of relevant sections
            in_architecture_section = False
            in_data_flows_section = False
        
        if in_architecture_section or in_data_flows_section:
            if i + 1 < len(sections):
                relevant_content += sections[i+1]

    lines = relevant_content.split('\n')
    current_term = None
    current_definition = []

    for line in lines:
        match = re.match(r'^\s*\*\*(.*?)\*\*\s*(\(.*?\))?:\s*(.*)', line)
        if match:
            if current_term:
                terms[current_term] = "\n".join(current_definition).strip()
            current_term = match.group(1).strip()
            current_definition = [line]
        elif current_term and line.strip():
            current_definition.append(line)
        elif not line.strip() and current_term:
            terms[current_term] = "\n".join(current_definition).strip()
            current_term = None
            current_definition = []
    
    if current_term:
        terms[current_term] = "\n".join(current_definition).strip()

    specific_terms = {
        "Vite": "Инструмент сборки и локальный dev-сервер для Frontend.",
        "npm": "Менеджер пакетов для JavaScript, используемый для управления зависимостями Frontend.",
        "Three.js": "JavaScript библиотека для создания и отображения 3D-графики в веб-браузере.",
        "JWT токены": "JSON Web Tokens, используемые для безопасной аутентификации и авторизации пользователей.",
        "Firebase Admin SDK": "Набор серверных библиотек для взаимодействия с сервисами Firebase, используется для проверки JWT токенов на бэкенде.",
        "LangChain": "Фреймворк для разработки приложений на основе больших языковых моделей (LLM). Упоминается как концептуальное влияние.",
        "LangGraph": "Расширение LangChain для создания более сложных и циклических графов LLM-приложений. Упоминается как концептуальное влияние.",
        "Web Speech API": "API браузера для распознавания речи (SpeechRecognition) и синтеза речи (SpeechSynthesis).",
        "Progressive Web Application (PWA)": "Веб-приложение, использующее современные веб-возможности для обеспечения пользовательского опыта, близкого к нативным приложениям.",
        "IndexedDB": "API браузера для хранения больших объемов структурированных данных на стороне клиента.",
        "Mistral Small": "Одна из моделей LLM, используемая для помощи в разработке и генерации документации."
    }
    terms.update(specific_terms)

    return terms

def main():
    new_glossary_content_raw = """
# Глоссарий RAG-системы "Агент Триа версия 3" с Gemma 3н

## Основные концепции RAG

### **RAG (Retrieval-Augmented Generation)**
Архитектурный паттерн, сочетающий поиск релевантной информации из базы знаний с последующей генерацией ответа с помощью языковой модели. Состоит из двух основных этапов: Retrieval (поиск) и Generation (генерация).

### **Chunking (Сегментация)**
Процесс разделения больших документов на небольшие фрагменты (chunks) для создания эмбеддингов. Оптимальный размер chunk'а обычно составляет 200-512 токенов для модели Gemma 3н.

### **Embedding (Эмбеддинг)**
Векторное представление текста в многомерном пространстве (обычно 384D или 768D), где семантически похожие тексты располагаются близко друг к другу.

### **Vector Database (Векторная база данных)**
Специализированная база данных для хранения и быстрого поиска векторных представлений. Включает индексы для approximate nearest neighbor (ANN) поиска.

## Метрики сходства

### **Косинусное сходство (Cosine Similarity)**
Метрика, измеряющая угол между двумя векторами. Значения от -1 до 1, где 1 означает идентичное направление векторов (максимальное сходство). Формула:
```
cosine_similarity(A, B) = (A · B) / (||A|| × ||B||)
```
**Преимущества**: Нормализован, не зависит от длины векторов.

### **Dot Product (Скалярное произведение)**
Прямое математическое произведение соответствующих компонентов векторов. Формула:
```
dot_product(A, B) = Σ(A[i] × B[i])
```
**Преимущества**: Быстрее вычисляется, учитывает как направление, так и величину векторов.

### **Евклидово расстояние (L2 Distance)**
Расстояние между точками в многомерном пространстве. Меньшие значения означают большее сходство.

## Компоненты системы

### **Vectorizer (Векторизатор)**
Модель, преобразующая текст в числовые векторы. Для Триа v3 используется all-MiniLM-L6-v2.tflite (384 измерения).

### **Retriever (Извлекатель)**
Компонент, выполняющий поиск наиболее релевантных документов по векторному запросу. Возвращает top-k результатов.

### **Generator (Генератор)**
Языковая модель (Gemma 3н), которая создает финальный ответ на основе найденного контекста и исходного вопроса.

### **Context Window (Контекстное окно)**
Максимальное количество токенов, которое модель может обработать за один раз. Для Gemma 3н обычно 8192 или 32768 токенов.

## Технические термины

### **FAISS (Facebook AI Similarity Search)**
Библиотека для эффективного поиска подобия и кластеризации плотных векторов. Поддерживает различные индексы (IndexFlatIP, IndexIVFFlat).

### **ScaNN (Scalable Nearest Neighbors)**
Библиотека Google для масштабируемого приближенного поиска ближайших соседей, оптимизированная для больших датасетов.

### **TFLite (TensorFlow Lite)**
Облегченная версия TensorFlow для мобильных и edge-устройств. Поддерживает квантизацию и аппаратное ускорение.

### **NNAPI (Neural Networks API)**
Android API для аппаратного ускорения машинного обучения на NPU/GPU/DSP.

### **Quantization (Квантизация)**
Процесс уменьшения точности весов модели (например, с float32 до int8) для снижения размера и ускорения работы.

## Алгоритмы поиска

### **KNN (K-Nearest Neighbors)**
Алгоритм поиска k ближайших соседей в векторном пространстве. Точный, но медленный для больших датасетов.

### **ANN (Approximate Nearest Neighbors)**
Приближенный поиск ближайших соседей. Быстрее KNN, но может пропустить некоторые релевантные результаты.

### **HNSW (Hierarchical Navigable Small World)**
Граф-алгоритм для ANN поиска, обеспечивающий хороший баланс между скоростью и точностью.

### **IVF (Inverted File Index)**
Индекс, разделяющий векторное пространство на кластеры для ускорения поиска.

## Оценка качества

### **Recall@k**
Доля релевантных документов среди первых k найденных результатов.

### **Precision@k**
Доля найденных релевантных документов от общего количества релевантных в топ-k.

### **MRR (Mean Reciprocal Rank)**
Средний обратный ранг первого релевантного результата.

### **NDCG (Normalized Discounted Cumulative Gain)**
Метрика, учитывающая как релевантность, так и позицию результата в ранжированном списке.

## Технологический стек Триа v3

### **LiteRT (Google AI Edge)**
Эволюция TensorFlow Lite, оптимизированная для edge AI с улучшенной поддержкой NPU.

### **Gemma 3н**
Новая версия языковой модели Google Gemma с улучшенной эффективностью и качеством генерации.

### **SQLite + векторные расширения**
Локальная база данных с поддержкой векторного поиска (sqlite-vec, pgvector-подобные решения).

### **NPU (Neural Processing Unit)**
Специализированный процессор для ускорения нейронных сетей (например, Qualcomm AI Engine, MediaTek APU).

## Архитектурные паттерны

### **Multi-stage Retrieval**
Двухэтапный поиск: сначала быстрый поиск по большому индексу, затем детальное ранжирование.

### **Hybrid Search**
Комбинирование семантического (векторного) и лексического (BM25, TF-IDF) поиска.

### **Reranking (Переранжирование)**
Повторное упорядочивание результатов поиска с помощью более сложной модели.

### **Query Expansion**
Расширение пользовательского запроса синонимами или связанными терминами.

## Специфичные для Триа термины

### **Эталонная память**
Основная база знаний системы Триа, содержащая проиндексированные эмбеддинги и метаданные.

### **Медленное обучение**
Процесс постепенного обновления базы знаний на основе новых взаимодействий пользователя.

### **Самоисцеление**
Способность системы автоматически диагностировать и исправлять ошибки в своей работе.

### **Holographic Memory**
Архитектурная концепция распределенного хранения знаний с возможностью восстановления из частей.

Этот глоссарий охватывает ключевые концепции для понимания и разработки RAG-системы "Агент Триа версия 3" с использованием модели Gemma 3н и современных технологий векторного поиска.
"""

    existing_glossary_path = 'docs/RU/Glossary.md'
    system_instruction_path = 'docs/SYSTEM_INSTRUCTION_CURRENT.md'

    with open(existing_glossary_path, 'r', encoding='utf-8') as f:
        existing_glossary_content = f.read()

    with open(system_instruction_path, 'r', encoding='utf-8') as f:
        system_instruction_content = f.read()

    # Parse all glossaries
    new_rag_terms = parse_markdown_glossary(new_glossary_content_raw)
    existing_old_terms = parse_markdown_glossary(existing_glossary_content)
    system_terms = extract_terms_from_system_instruction(system_instruction_content)

    # Combine terms with priority: System Instruction > New RAG > Old NEOLANG
    combined_terms = {}
    
    # Add old terms first (lowest priority)
    combined_terms.update(existing_old_terms)
    
    # Add new RAG terms (medium priority)
    combined_terms.update(new_rag_terms)
    
    # Add system instruction terms (highest priority)
    combined_terms.update(system_terms)

    # Reconstruct the glossary
    final_glossary_sections = []

    # Preserve the initial header and warning from the existing glossary
    header_match = re.match(r'(^> \*\*\[ВАЖНО\].*?^---)', existing_glossary_content, re.DOTALL | re.MULTILINE)
    if header_match:
        final_glossary_sections.append(header_match.group(1).strip())
    
    # Add the main title
    final_glossary_sections.append('# Глоссарий Проекта "Голографические Медиа"')

    # Section: Основные концепции RAG
    rag_concepts = [
        "RAG (Retrieval-Augmented Generation)", "Chunking (Сегментация)",
        "Embedding (Эмбеддинг)", "Vector Database (Векторная база данных)"
    ]
    section_content = []
    for term in rag_concepts:
        if term in combined_terms:
            section_content.append(combined_terms[term])
            del combined_terms[term]
    if section_content:
        final_glossary_sections.append('\n## Основные концепции RAG\n' + '\n'.join(section_content))

    # Section: Метрики сходства
    similarity_metrics = [
        "Косинусное сходство (Cosine Similarity)", "Dot Product (Скалярное произведение)",
        "Евклидово расстояние (L2 Distance)"
    ]
    section_content = []
    for term in similarity_metrics:
        if term in combined_terms:
            section_content.append(combined_terms[term])
            del combined_terms[term]
    if section_content:
        final_glossary_sections.append('\n## Метрики сходства\n' + '\n'.join(section_content))

    # Section: Компоненты системы (RAG)
    rag_components = [
        "Vectorizer (Векторизатор)", "Retriever (Извлекатель)",
        "Generator (Генератор)", "Context Window (Контекстное окно)"
    ]
    section_content = []
    for term in rag_components:
        if term in combined_terms:
            section_content.append(combined_terms[term])
            del combined_terms[term]
    if section_content:
        final_glossary_sections.append('\n## Компоненты системы (RAG)\n' + '\n'.join(section_content))

    # Section: Технические термины (RAG)
    rag_tech_terms = [
        "FAISS (Facebook AI Similarity Search)", "ScaNN (Scalable Nearest Neighbors)",
        "TFLite (TensorFlow Lite)", "NNAPI (Neural Networks API)", "Quantization (Квантизация)"
    ]
    section_content = []
    for term in rag_tech_terms:
        if term in combined_terms:
            section_content.append(combined_terms[term])
            del combined_terms[term]
    if section_content:
        final_glossary_sections.append('\n## Технические термины (RAG)\n' + '\n'.join(section_content))

    # Section: Алгоритмы поиска
    search_algorithms = [
        "KNN (K-Nearest Neighbors)", "ANN (Approximate Nearest Neighbors)",
        "HNSW (Hierarchical Navigable Small World)", "IVF (Inverted File Index)"
    ]
    section_content = []
    for term in search_algorithms:
        if term in combined_terms:
            section_content.append(combined_terms[term])
            del combined_terms[term]
    if section_content:
        final_glossary_sections.append('\n## Алгоритмы поиска\n' + '\n'.join(section_content))

    # Section: Оценка качества
    quality_metrics = [
        "Recall@k", "Precision@k", "MRR (Mean Reciprocal Rank)", "NDCG (Normalized Discounted Cumulative Gain)"
    ]
    section_content = []
    for term in quality_metrics:
        if term in combined_terms:
            section_content.append(combined_terms[term])
            del combined_terms[term]
    if section_content:
        final_glossary_sections.append('\n## Оценка качества\n' + '\n'.join(section_content))

    # Section: Технологический стек Триа v3
    tria_stack = [
        "LiteRT (Google AI Edge)", "Gemma 3н", "SQLite + векторные расширения", "NPU (Neural Processing Unit)"
    ]
    section_content = []
    for term in tria_stack:
        if term in combined_terms:
            section_content.append(combined_terms[term])
            del combined_terms[term]
    if section_content:
        final_glossary_sections.append('\n## Технологический стек Триа v3\n' + '\n'.join(section_content))

    # Section: Архитектурные паттерны (RAG)
    rag_patterns = [
        "Multi-stage Retrieval", "Hybrid Search", "Reranking (Переранжирование)", "Query Expansion"
    ]
    section_content = []
    for term in rag_patterns:
        if term in combined_terms:
            section_content.append(combined_terms[term])
            del combined_terms[term]
    if section_content:
        final_glossary_sections.append('\n## Архитектурные паттерны (RAG)\n' + '\n'.join(section_content))

    # Section: Специфичные для Триа термины (RAG)
    tria_specific_terms = [
        "Эталонная память", "Медленное обучение", "Самоисцеление", "Holographic Memory"
    ]
    section_content = []
    for term in tria_specific_terms:
        if term in combined_terms:
            section_content.append(combined_terms[term])
            del combined_terms[term]
    if section_content:
        final_glossary_sections.append('\n## Специфичные для Триа термины (RAG)\n' + '\n'.join(section_content))

    # Section: Основные Концепции и Компоненты Проекта (Holographic Media) - from old glossary
    old_project_concepts = [
        "Триа (Tria)", "Голограмма (Hologram) / Голографические Примитивы",
        "Комбинированный Аудио(Видео)-Жестовый Чанк (Interaction Chunk / Чанк)",
        "Технология Трехмерной Аудиовизуализации (ТТА)", "Жестовая операционная система (ЖОС)",
        "Absolute Zero Reasoning (AZR)", "HoloGraph (HG)",
        "Интеллектуальный Майнинг (Intelligent Mining)",
        "Proof-of-Contribution / Proof-of-Value",
        "Динамическая Семантическая Типизация (Dynamic Semantic Typing)",
        "\"Жидкий\" Код и Эволюционирующие Структуры (Liquid Code & Evolving Structures)",
        "Децентрализованная Сеть Исполнения (Decentralized Execution Network - DEN)"
    ]
    section_content = []
    for term in old_project_concepts:
        if term in combined_terms:
            section_content.append(combined_terms[term])
            del combined_terms[term]
    if section_content:
        final_glossary_sections.append('\n## Основные Концепции и Компоненты Проекта (Holographic Media)\n' + '\n'.join(section_content))

    # Section: Боты и Сервисы Триа (на базе NEOLANG WHITEGHOST) - from old glossary
    old_bots = [
        "GestureBot", "AudioBot", "MemoryBot", "LearningBot", "CoordinationService"
    ]
    section_content = []
    for term in old_bots:
        if term in combined_terms:
            section_content.append(combined_terms[term])
            del combined_terms[term]
    if section_content:
        final_glossary_sections.append('\n## Боты и Сервисы Триа (на базе NEOLANG WHITEGHOST)\n' + '\n'.join(section_content))

    # Section: Технологии Анализа Аудио (Вейвлеты в NEOLANG) - from old glossary
    old_audio_tech = [
        "Непрерывное Вейвлет-Преобразование (Continuous Wavelet Transform - CWT)",
        "Вейвлет Морле (Morlet Wavelet)", "FastCWTProcessor", "WaveletAnalyzer"
    ]
    section_content = []
    for term in old_audio_tech:
        if term in combined_terms:
            section_content.append(combined_terms[term])
            del combined_terms[term]
    if section_content:
        final_glossary_sections.append('\n## Технологии Анализа Аудио (Вейвлеты в NEOLANG)\n' + '\n'.join(section_content))

    # Section: Архитектура Системы (Holographic Media) - from SYSTEM_INSTRUCTION_CURRENT.md
    system_architecture_terms = [
        "Frontend (Firebase Hosting)", "Backend (FastAPI на Koyeb)",
        "Neon.tech PostgreSQL + pgvector", "Cloudflare R2", "Genkit",
        "Firebase Authentication", "Firebase Cloud Functions",
        "Vite", "npm", "Three.js", "JWT токены", "Firebase Admin SDK",
        "Koyeb", "Pydantic", "asyncpg", "boto3"
    ]
    section_content = []
    for term in system_architecture_terms:
        if term in combined_terms:
            section_content.append(combined_terms[term])
            del combined_terms[term]
    if section_content:
        final_glossary_sections.append('\n## Архитектура Системы (Holographic Media)\n' + '\n'.join(section_content))

    # Section: Мультимодальный Ввод и Обработка (Holographic Media) - from SYSTEM_INSTRUCTION_CURRENT.md and old glossary
    multimodal_terms = [
        "MediaPipe Hands", "AtomicGestureClassifier.js", "GestureSequencer.js",
        "CWT (Continuous Wavelet Transform)", "WASM (WebAssembly)",
        "AudioWorkletGlobalScope / AudioWorkletProcessor", "InstancedMesh (Three.js)",
        "SharedArrayBuffer / Atomics", "Web Speech API (SpeechRecognition / SpeechSynthesis)"
    ]
    section_content = []
    for term in multimodal_terms:
        if term in combined_terms:
            section_content.append(combined_terms[term])
            del combined_terms[term]
    if section_content:
        final_glossary_sections.append('\n## Мультимодальный Ввод и Обработка (Holographic Media)\n' + '\n'.join(section_content))

    # Section: Прочие Технологии и Инструменты
    # Add any remaining terms that haven't been categorized yet
    remaining_terms_content = []
    for term_key in sorted(combined_terms.keys()):
        remaining_terms_content.append(combined_terms[term_key])
    
    if remaining_terms_content:
        final_glossary_sections.append('\n## Прочие Технологии и Инструменты\n' + '\n'.join(remaining_terms_content))

    # Add the footer
    footer_match = re.search(r'(\*Этот глоссарий будет пополняться по мере развития проекта\.\*)', existing_glossary_content, re.DOTALL)
    if footer_match:
        final_glossary_sections.append('\n' + footer_match.group(1).strip())

    final_content = "\n\n".join(final_glossary_sections).strip()

    with open(existing_glossary_path, 'w', encoding='utf-8') as f:
        f.write(final_content)

if __name__ == '__main__':
    main()
