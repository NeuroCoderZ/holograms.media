# Архитектурный план протокола «NetHoloGlyph» (версия 1.0)

## 1. Общее описание

Протокол **NetHoloGlyph** предназначен для обмена "квантами" мультимодальных данных между клиентами и сервером в системе holograms.media. Каждый квант представляет собой атомарную единицу информации, описывающую изменение состояния звуковой голограммы, инициированное жестом пользователя, а также соответствующий этому изменению семантический и аудиовизуальный контекст.

Цель протокола — обеспечить надёжный, низколатентный обмен данными для совместной работы и синхронизации состояния голограмм в реальном времени.

## 2. Формат "Кванта" Данных (NetHoloGlyphQuantum)

Для определения структуры данных используется Protocol Buffers (protobuf) версии 3.

```protobuf
// nethologlyph_quantum_v1.proto
syntax = "proto3";

package holograms.media.nethologlyph.v1;

// Сообщение, описывающее изменение, инициированное жестом пользователя.
// Основано на концепции deltaVector из предыдущих обсуждений.
// Приблизительный размер: 60–120 байт.
message GestureDelta {
  // Уникальный идентификатор пользователя (например, CRC32 от Firebase UID или другой компактный ID).
  uint32 user_id = 1;
  // Монотонный тайм-штамп в микросекундах (локальное время клиента или синхронизированное).
  uint64 timestamp_us = 2;
  // Изменение параметра, связанного с осью X (например, панорама звука в градусах, или другая пространственная характеристика).
  float delta_x = 3;
  // Изменение параметра, связанного с осью Y (например, высота тона/частота в полутонах, или другая характеристика).
  float delta_y = 4;
  // Изменение параметра, связанного с осью Z (например, громкость в dB, или глубина эффекта).
  float delta_z = 5;
  // Дополнительные свободные параметры, которые могут быть использованы для специфических эффектов
  // (например, цвет, интенсивность модуляции, параметры фильтра и т.д.).
  repeated float extra_params = 6;
}

// Сообщение, описывающее изменение в семантическом эмбеддинге, связанном с жестом или звуком.
// Приблизительный размер: до 64 байт.
message EmbeddingDelta {
  // Идентификатор эмбеддинга (например, 8-байтный хэш от полного вектора эмбеддинга или его части).
  // Это позволяет ссылаться на полный эмбеддинг, хранящийся в базе данных (например, pgvector).
  bytes embedding_id = 1; // Может быть хешем или укороченным идентификатором
  // Разрежённый Δ-вектор, представляющий изменение в эмбеддинге.
  // Содержит индексы и значения только для тех компонент вектора, которые изменились.
  // Для примера, можно передавать только N наибольших по модулю изменений коэффициентов.
  // Здесь для простоты используем packed float, но на практике это может быть структура {index, value}.
  repeated float delta_vector = 2 [packed = true]; // Пример: [idx1, val1, idx2, val2, ...] или просто значения изменившихся компонент
}

// Сообщение, содержащее данные вейвлет-анализа для текущего аудио-фрейма.
// Приблизительный размер: до 80 байт (после сжатия).
message WaveletFrame {
  // Идентификатор кадра, если требуется для синхронизации или отладки.
  uint32 frame_id = 1;
  // Коэффициенты CWT (Continuous Wavelet Transform), сжатые с использованием LZ4.
  // Исходные данные (например, массив float32) квантуются (например, в int16) перед сжатием.
  bytes compressed_cwt_coefficients = 2; // LZ4-сжатые данные
  // Метаданные, описывающие параметры CWT, если они могут меняться
  // string mother_wavelet = 3; // тип вейвлета, если может меняться
  // float sample_rate = 4;    // частота дискретизации, если может меняться
}

// Основное сообщение "кванта" NetHoloGlyph.
// Объединяет информацию о жесте, семантическом изменении и аудиовизуальном представлении.
// Приблизительный итоговый размер: около 220 байт (без учета заголовков транспортного протокола).
message NetHoloGlyphQuantum {
  // Информация об управляющем жесте.
  GestureDelta gesture_input = 1;
  // Информация об изменении семантического эмбеддинга.
  // Может быть опциональным, если не каждое действие меняет эмбеддинг.
  EmbeddingDelta semantic_embedding_update = 2;
  // Данные вейвлет-анализа, представляющие текущее состояние звука/голограммы.
  WaveletFrame audio_wavelet_data = 3;
  // Уникальный идентификатор гологлифа или сессии, к которой относится этот квант.
  // Позволяет маршрутизировать и применять кванты к правильным объектам.
  string hologlyph_session_id = 4;
  // Опционально: идентификатор самого кванта, если требуется для отслеживания потерь или порядка.
  // string quantum_id = 5;
}

```

## 3. Сериализация и Сжатие

*   **Сериализация**: Protobuf 3. Для WebAssembly и критичных к производительности участков в будущем может рассматриваться FlatBuffers 2.0 (для zero-copy доступа).
*   **Сжатие данных внутри полей Protobuf**:
    *   `WaveletFrame.compressed_cwt_coefficients`: Исходные коэффициенты CWT (массив `float32`) квантуются в `int16` и затем сжимаются с использованием LZ4 frame-формата. Это позволяет значительно уменьшить объем передаваемых аудиоданных.
    *   `GestureDelta`: Данные жеста уже представлены в виде компактного Δ-вектора, дальнейшее специфическое сжатие не предполагается, кроме общего сжатия потока (см. ниже).
    *   `EmbeddingDelta`: Предполагается передача только значимых изменений (разрежённый Δ-вектор) или идентификатора полного эмбеддинга, хранящегося на сервере.

## 4. Транспортный Протокол и Частота Синхронизации

*   **Основной транспорт**: WebRTC DataChannel (SCTP поверх UDP) для минимизации задержек и обеспечения неупорядоченной (если применимо) или упорядоченной доставки "квантов". Целевая частота отправки: 20-30 fps (каждые 33-50 мс).
*   **Запасной/Сигнальный транспорт**: WebSockets (WSS) для авторизации, управления комнатами, передачи событий, не требующих низкой задержки, и как fallback для WebRTC, если соединение не может быть установлено.
*   **Сжатие потока**: Для WebRTC DataChannel может быть рассмотрено использование встроенных механизмов сжатия или дополнительное сжатие на уровне приложения (например, LZ4 stream) для всего потока квантов, если это даст существенный выигрыш поверх сжатия отдельных полей.

## 5. Обработка на Клиенте и Сервере

*   **Клиент**:
    *   Собирает данные жеста, формирует `GestureDelta`.
    *   Вызывает локальный `WebAudioEngine` для обработки аудио и получения `WaveletFrame`.
    *   (Опционально) Обновляет или запрашивает обновление `EmbeddingDelta`.
    *   Сериализует `NetHoloGlyphQuantum` и отправляет на сервер.
    *   Применяет локальные изменения оптимистично для мгновенного отклика.
    *   При получении авторитетного состояния от сервера или от других клиентов, выполняет сверку (reconciliation) и плавно корректирует локальное состояние.
*   **Сервер**:
    *   Принимает `NetHoloGlyphQuantum` от клиентов.
    *   Валидирует данные.
    *   (Опционально) Выполняет дополнительную обработку или агрегацию.
    *   Рассылает квант всем релевантным клиентам в сессии/комнате.
    *   Может выступать в роли авторитетного источника состояния или просто как ретранслятор.

## 6. XR-адаптация (Перспектива)

*   Для интеграции с XR-устройствами (например, на базе Unity или Android XR) будут разработаны соответствующие плагины или нативные реализации для работы с WebRTC DataChannel и десериализации Protobuf-сообщений.
    *   **Unity**: Использование C# библиотек для WebRTC и Protobuf (например, `protobuf-net`).
    *   **Android XR**: Нативные библиотеки WebRTC (ndk::webrtc) и C++ реализации Protobuf или FlatBuffers (`flatcc`).

## 7. Дорожная карта внедрения (Основные этапы)

1.  **M0 (Текущий этап)**: Определение формата Protobuf. Создание базового `WebAudioEngine` и интеграция с WASM CWT-анализатором. Локальная обработка жестов и обновление визуализации.
2.  **M1**: Реализация отправки и приема `NetHoloGlyphQuantum` через WebSockets (как начальный, более простой вариант транспорта) между клиентом и тестовым сервером (FastAPI).
3.  **M2**: Переход на WebRTC DataChannel для основного потока квантов. Реализация базовой синхронизации состояния между несколькими клиентами.
4.  **M3**: Внедрение CRDT (например, Yjs) для метаданных гологлифов (название, описание, права доступа), не для основного потока аудио-квантов.
5.  **M4**: Разработка плагинов для XR-платформ.

Этот документ описывает первоначальную версию протокола NetHoloGlyph. Ожидается, что протокол будет развиваться и дополняться по мере роста функциональности системы.
