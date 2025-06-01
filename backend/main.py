# backend/main.py
# Этот файл экспортирует все Cloud Functions для Firebase CLI.

# Импорт существующих функций
from .cloud_functions.auth_sync.main import auth_sync_user
from .cloud_functions.process_chunk.main import process_chunk_storage
from .cloud_functions.tria_chat_handler.main import tria_chat_handler

# Импорт новой тестовой функции
from .cloud_functions.hello_world.main import hello_world

# Если в будущем появятся новые функции, их также нужно будет импортировать и добавить сюда,
# чтобы Firebase CLI мог их обнаружить и задеплоить.
# Например:
# from .cloud_functions.new_feature_xyz.main import new_feature_xyz_function

# Переменные, которые Firebase CLI будет искать (имена должны совпадать с именами функций)
# Это один из способов экспорта для Python Firebase Functions, когда source указывает на директорию
# и CLI ищет объекты с именами функций в главном модуле этой директории (main.py).
# Имена здесь должны совпадать с именами функций, которые вы хотите задеплоить.
# Фактически, простого импорта выше может быть достаточно, если декораторы функций
# правильно регистрируют их для Firebase. Этот явный "экспорт" через присваивание
# переменным с теми же именами добавляет слой явности.

# Для Firebase Functions v2 с Python runtime и source, указывающим на директорию,
# CLI обычно автоматически обнаруживает функции, декорированные, например, @https_fn.on_request(),
# в файлах main.py внутри этой директории или ее поддиректориях, если они правильно импортированы
# в главный main.py (тот, что в корне `source`).
# Поэтому, явное создание переменных ниже может быть избыточным, но не повредит.
            
# Убедимся, что функции доступны для импорта Firebase CLI
# (Хотя для Python обычно достаточно, чтобы они были определены и импортированы в области видимости main.py)
            
__all__ = [
    'auth_sync_user',
    'process_chunk_storage',
    'tria_chat_handler',
    'hello_world'
]