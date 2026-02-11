# План реализации: BasilaQ-128 Core

## Фаза 1: Рефакторинг Rust Core (`holocore/src/lib.rs`)
- [x] Задача: Внедрить структуру `RingBuffer` и обновить `CwtAnalyzer`.
- [x] Задача: Реализовать предварительный расчет 128 вейвлетов Морле при вызове `new(sample_rate, target_fps)`.
    - Использовать усеченную длину для каждого вейвлета (затухание гауссиана).
- [x] Задача: Оптимизировать метод `process` для накопления сэмплов и пакетного вычисления CWT по достижении порога кадра.
- [x] Задача: Реализовать расчет магнитуды (0..128) и межканальной разности фаз (Pan).
- [x] Task: Conductor - User Manual Verification 'Фаза 1: Rust Core' (Protocol in workflow.md)

## Фаза 2: Интеграция и Frontend
- [x] Задача: Обновить `js/utils/deviceCapabilities.js` для точного определения FPS.
- [x] Задача: Модифицировать `js/audio/audioProcessing.js` для передачи `detectedFPS` в ворклет.
- [x] Задача: Обновить `js/audio/cwtAudioWorklet.js` для поддержки нового интерфейса `cwtanalyzer_new`.
- [x] Task: Conductor - User Manual Verification 'Фаза 2: Интеграция' (Protocol in workflow.md)

## Фаза 3: Верификация физики
- [ ] Задача: Мануальное тестирование на Tria Laptop и realme GT Neo 6.
- [ ] Задача: Проверка соответствия диапазонов 0..128 и -1..1.
- [ ] Task: Conductor - User Manual Verification 'Фаза 3: Верификация' (Protocol in workflow.md)
