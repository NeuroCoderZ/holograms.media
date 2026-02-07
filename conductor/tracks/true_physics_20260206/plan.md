# План реализации: Истинная физика (Z-Dimming и Pan-Constraint)

## Фаза 1: Имплементация логики физики
- [x] Задача: Модифицировать ``js/3d/hologramRenderer.js``:
    - [x] Найти метод ``updateVisuals``.
    - [x] **Z-Logic (Dimming):**
        - [x] Рассчитать нормализованную амплитуду ``amplitude = depth / GRID_DEPTH``.
        - [x] Применить ``amplitude`` к ``material.emissiveIntensity``.
        - [x] Применить ``amplitude`` к HSL Lightness базового цвета: ``color.setHSL(h, s, baseL * amplitude)``.
        - [x] Гарантировать полное отключение свечения (True Black) при амплитуде < 1/128.
    - [x] **X-Logic (Constraint Pan):**
        - [x] Использовать ``semitoneConfig.width`` для каждой колонки.
        - [x] Рассчитать ``availableSpace = 128 - semitoneConfig.width``.
        - [x] Обновить формулу смещения: 
            - Left: ``newX = userData.initialX + (pan < 0 ? pan * availableSpace : 0)``.
            - Right: ``newX = userData.initialX + (pan > 0 ? pan * availableSpace : 0)``.
- [x] Task: Conductor - User Manual Verification 'Фаза 1: Физика' (Protocol in workflow.md)

## Фаза 2: Верификация
- [ ] Задача: Визуальная проверка затемнения на тихих участках аудио.
- [ ] Задача: Проверка ограничения движения басовых столбцов (должны стоять почти неподвижно при панорамировании).
- [ ] Task: Conductor - User Manual Verification 'Фаза 2: Верификация' (Protocol in workflow.md)
