# План реализации: Исправление целостности и димминга

## Фаза 1: Коррекция Rust Core (`holocore/src/lib.rs`)
- [x] Задача: Нормализовать свертку: `l_conv = l_conv * (1.0 / len as f32)`.
- [x] Задача: Реализовать Noise Gate для порога магнитуды 0.0001.
- [x] Задача: Установить `PRE_GAIN_DB = 20.0`.
- [x] Задача: Пересобрать WASM модуль и скопировать в `public/wasm/`.
- [x] Task: Conductor - User Manual Verification 'Фаза 1: Rust Core' (Protocol in workflow.md)

## Фаза 2: Исправление логики рендерера (`js/3d/hologramRenderer.js`)
- [x] Задача: Исправить перепутанные переменные в `updateVisuals` (заменить `leftMesh` на `rightMesh` в блоке правого канала).
- [x] Задача: Убедиться, что материалы столбцов инициализируются корректно с поддержкой `emissive`.
- [x] Задача: Проверить синхронизацию `emissive` цвета с цветом полутона.
- [x] Task: Conductor - User Manual Verification 'Фаза 2: Рендерер' (Protocol in workflow.md)

## Фаза 3: Верификация
- [ ] Задача: Проверка «мертвой тишины» (остается только обводка/каркас).
- [ ] Задача: Проверка стабильности панорамы в тишине.
- [ ] Task: Conductor - User Manual Verification 'Фаза 3: Верификация' (Protocol in workflow.md)