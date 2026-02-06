# План реализации: Границы X и Z-Dimming

## Фаза 1: Анализ и Настройка Констант
- [ ] Задача: Прочитать `Semitones_Angles.md` и `js/config/hologramConfig.js`.
- [ ] Задача: Сверить расчет `initialX` в `_createColumn` (должно быть `-width` для Left и `0` для Right).
- [ ] Task: Conductor - User Manual Verification 'Фаза 1: Анализ' (Protocol in workflow.md)

## Фаза 2: Имплементация Логики
- [ ] Задача: Модифицировать `updateVisuals` в `js/3d/hologramRenderer.js`:
    - [ ] Санитизация `pan`: `Math.max(-1, Math.min(1, pan))`.
    - [ ] Расчет `availableSpace = GRID_WIDTH - semitoneConfig.width`.
    - [ ] Применение формулы: `newX = userData.initialX + (pan < 0 ? pan * availableSpace : 0)` (аналогично для Right).
    - [ ] **Z-Dimming**: `intensity = depth / GRID_DEPTH`. Обновление `emissiveIntensity` и базового цвета материала.
- [ ] Task: Conductor - User Manual Verification 'Фаза 2: Имплементация' (Protocol in workflow.md)

## Фаза 3: Верификация
- [ ] Задача: Проверка границ через принудительные значения `pan`.
- [ ] Задача: Визуальная проверка эффекта \"True Black\" при низкой громкости.
- [ ] Task: Conductor - User Manual Verification 'Фаза 3: Верификация' (Protocol in workflow.md)
