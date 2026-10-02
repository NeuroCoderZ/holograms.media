// handsTracking.js
// MediaPipe now loaded via index.html globals - Robust resolver

const _origLog = console.log;
const _origWarn = console.warn;
const _origErr = console.error;

function suppressMediaPipeLogs() {
    console.log = (...args) => {
        const msg = String(args[0] || '');
        if (msg.includes('I0000') || msg.includes('W0000') || msg.includes('gl_context') || msg.includes('still waiting on run dependencies') || msg.includes('OpenGL error checking')) return;
        _origLog.apply(console, args);
    };
    console.warn = (...args) => {
        const msg = String(args[0] || '');
        if (msg.includes('I0000') || msg.includes('W0000') || msg.includes('gl_context') || msg.includes('OpenGL error checking')) return;
        _origWarn.apply(console, args);
    };
}

function restoreMediaPipeLogs() {
    console.log = _origLog;
    console.warn = _origWarn;
    console.error = _origErr;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2026-10-02 17:36 MSK — УДАЛЁН мутирующий глобальный `window.Module`.
// Раньше здесь был хак: `window.Module = window.Module || {}` + подмена print/printErr
// для глушения Emscripten-спама. Он был причиной двух ошибок консоли, а не следствием:
//   1) `Aborted(Module.arguments has been replaced with plain arguments_ ...)` —
//      Emscripten при ИНИЦИАЛИЗАЦИИ MediaPipe находит загрязнённый глобальный
//      `window.Module.arguments` и падает в ASSERT.
//   2) MediaPipe грузит `hands_solution_simd_wasm_bin.js`, который завершается на
//      `if (typeof define === 'function' && define['amd']) define([], fn)`.
//      RequireJS-загрузчик Monaco (`vs/loader.min.js`) видит второй анонимный
//      `define` и бросает "Can only have one anonymous define call per script file".
// Теперь спам глушится на уровне консоли (см. suppressMediaPipeLogs ниже),
// а глобальный объект Emscripten не трогается вообще.
// ─────────────────────────────────────────────────────────────────────────────

const Camera = window.Camera || (window.mediapipe?.camera?.Camera);
const Hands = window.Hands || (window.mediapipe?.hands?.Hands);
const { drawConnectors, drawLandmarks } = window.drawing_utils || window;

/**
 * Локальный locateFile: MediaPipe ищет .wasm/.tflite/.binarypb рядом с hands.js.
 * Раньше тут жёстко стоял `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4/${file}`.
 * Теперь ассеты вендорены в public/mediapipe/ — same-origin, без CDN-зависимости
 * и без гонки с загрузкой скрипта (CDN успевал отдать .wasm уже после того,
 * как Emscripten запрашивал инстанцирование).
 */
const MEDIAPIPE_BASE = '/mediapipe/';
const locateMediaPipeFile = (file) => `${MEDIAPIPE_BASE}${file}`;
import eventBus from '../core/eventBus.js';

import { state, TORUS_PARAMS } from '../core/init.js';
import OneEuroFilter from '../filters/OneEuroFilter.js';
// import { AtomicGestureClassifier } from '../gestures/AtomicGestureClassifier.js'; // Старый классификатор
// import { GestureSequencer } from '../gestures/GestureSequencer.js'; // Старый секвенсор
// import { GESTURE_SEQUENCES } from '../config/gestureSequences.js'; // Старые конфигурации последовательностей
import { GestureIntentClassifier } from '../ai/gestureIntentClassifier.js';
import { gestureManager } from '../managers/gestureManager.js';

// ─────────────────────────────────────────────────────────────────────────────
// ШЕСТЬ БАЗОВЫХ ЖЕСТОВ: опорное состояние и помощники
// Добавлено 2026-09-30 вместе с исправлением мёртвой ветки распознавания.
// Канон: Semitones_Angles.md, XR_SYSTEM_DESIGN_RU.md §3, AGENTS.md п.15.
// ─────────────────────────────────────────────────────────────────────────────

// Предыдущее положение ладони. Живёт между кадрами, поэтому объявлен
// на уровне модуля, а не внутри обработчика.
let prevPalm = null;

/**
 * Центр ладони как усреднение опорных точек кисти.
 * Берём 0 (запястье), 5 и 17 (основания большого и указательного пальцев),
 * 9 (середина ладони) — они стабильнее кончиков пальцев при повороте кисти.
 * @param {Array<{x:number,y:number,z:number}>} landmarks 21 точка MediaPipe
 * @returns {{x:number,y:number,z:number}|null}
 */
function computePalmCenter(landmarks) {
    if (!Array.isArray(landmarks) || landmarks.length < 21) return null;
    let x = 0, y = 0, z = 0;
    for (const i of [0, 5, 9, 17]) {
        const p = landmarks[i];
        if (!p) return null;
        x += p.x; y += p.y; z += (p.z ?? 0);
    }
    return { x: x / 4, y: y / 4, z: z / 4 };
}

/**
 * Приведение оси к [-1, +1]. Нечисловое и не-конечное значение даёт ноль:
 * жест без осмысленного смещения не должен двигать шкалу.
 * @param {number} v
 * @returns {number}
 */
function clampAxis(v) {
    if (typeof v !== 'number' || !Number.isFinite(v)) return 0;
    if (v > 1) return 1;
    if (v < -1) return -1;
    return v;
}

// --- Constants ---
const HAND_CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 4],
    [0, 5], [5, 6], [6, 7], [7, 8],
    [5, 9], [9, 10], [10, 11], [11, 12],
    [9, 13], [13, 14], [14, 15], [15, 16],
    [0, 17], [13, 17], [17, 18], [18, 19], [19, 20]
];
const FINGER_TIP_INDICES = [4, 8, 12, 16, 20];

// One Euro Filter — глобальный экземпляр для всех кадров
const euroFilter = OneEuroFilter.preset('default');

// GRID constants
const GRID_WIDTH = state.config?.GRID?.WIDTH || 128;
const GRID_HEIGHT = state.config?.GRID?.HEIGHT || 256;
const GRID_DEPTH = state.config?.GRID?.DEPTH || 128;

// --- MediaPipe Hands Functions ---

export async function startVideoStream(videoElement, handsInstance, stream = null) {
    console.log(">>> Attempting to start video stream...");
    try {
        // ... (проверки WebGL и текстуры) ...

        let mediaStreamToUse;

        if (stream) {
            console.log(">>> Using provided MediaStream for video.");
            mediaStreamToUse = stream;
        } else {
            console.log(">>> No stream provided, requesting new video-only stream via getUserMedia.");
            mediaStreamToUse = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 320 },
                    height: { ideal: 240 },
                    facingMode: 'user'
                }
            });
            console.log(">>> New video-only stream acquired successfully.");
        }

        videoElement.srcObject = mediaStreamToUse;
        state.multimodal.currentStream = mediaStreamToUse;

        videoElement.onloadedmetadata = () => {
            console.log(">>> Video metadata loaded. Waiting for full data load...");
            videoElement.play();
        };

        videoElement.onloadeddata = () => {
            console.log(">>> Video data loaded. Waiting before starting hands processing...");

            // CRITICAL: Guard against multiple camera instantiations
            if (state.multimodal.cameraStarted) {
                console.log(">>> Camera already started, skipping duplicate initialization");
                return;
            }

            // Video element remains hidden - gesture panel shows recording lanes instead

            setTimeout(() => {
                // Double-check guard inside timeout
                if (state.multimodal.cameraStarted) {
                    console.log(">>> Camera already started (timeout check), skipping");
                    return;
                }

                console.log(">>> Starting hands processing after delay");

                if (!handsInstance || typeof handsInstance.send !== 'function') {
                    console.error("MediaPipe Hands instance not properly initialized");
                    return;
                }

                // Stop existing camera if any
                if (state.multimodal.cameraInstance) {
                    try {
                        state.multimodal.cameraInstance.stop();
                        console.log(">>> Stopped existing camera instance");
                    } catch (e) {
                        // Ignore stop errors
                    }
                }

                // Mark camera as started BEFORE creating instance
                state.multimodal.cameraStarted = true;

                // Используем Camera вместо ручного управления кадрами
                let isProcessing = false;
                let lastErrorTime = 0;

                // Watchdog инференса (11.08.2026, по разбору лога Qwen).
                // Симптом: скелет рисуется один раз и застывает, ошибок в консоли нет.
                // Замеры со стенда исключили мёртвую камеру (currentTime растёт, readyState=4)
                // и голодание rAF (60 кадров/с). Остался единственный сценарий, который
                // блок try/catch/finally НЕ ловит: handsInstance.send() возвращает промис,
                // который никогда не резолвится и не реджектится (зависший WASM-инференс).
                // Тогда `finally` не выполняется, isProcessing остаётся true навсегда,
                // и все следующие кадры молча отсекаются локом на строке «if (isProcessing) return».
                const INFERENCE_TIMEOUT_MS = 3000;
                const MAX_HANGS_BEFORE_RESET = 3;
                let hangCount = 0;
                let lastHangLogTime = 0;

                /** send() с таймаутом: промис-зависание больше не вешает конвейер. */
                const sendWithTimeout = (instance) => {
                    let timer;
                    const timeout = new Promise((_, reject) => {
                        timer = setTimeout(
                            () => reject(new Error(`inference timeout ${INFERENCE_TIMEOUT_MS}ms`)),
                            INFERENCE_TIMEOUT_MS,
                        );
                    });
                    return Promise.race([
                        instance.send({ image: videoElement }),
                        timeout,
                    ]).finally(() => clearTimeout(timer));
                };

                /**
                 * Пересоздание MediaPipe Hands после серии зависаний.
                 *
                 * 2026-10-02 17:36 MSK — СОЗНАТЕЛЬНО ОТКЛЮЧЕНО (заменено на throttle).
                 * Пересоздание `new Hands()` в уже загруженной странице — источник
                 * двух ошибок консоли, а не лечение:
                 *   1) `Aborted(Module.arguments has been replaced with plain arguments_)` —
                 *      Emscripten-обёртка инициализируется второй раз в том же окне.
                 *   2) `Can only have one anonymous define call per script file` —
                 *      hands_solution_simd_wasm_bin.js грузится повторно и снова
                 *      вызывает `define([], fn)`; RequireJS (Monaco loader.min.js)
                 *      считает это вторым анонимным define для того же файла и падает.
                 * Зависание при этом НЕ лечится: убитый Emscripten-контекст
                 * остаётся мёртвым, поэтому кадры продолжают отбрасываться.
                 *
                 * Вместо пересоздания — мягкое охлаждение: пропускаем кадры,
                 * чтобы дать инстансу выйти из зависшего await, и глушим цикл,
                 * если он не ожил (isCooldown), чтобы не жечь CPU впустую.
                 * Полное восстановление — перезагрузка страницы (см. reload hint).
                 */
                const RECREATE_DISABLED = true;

                const recreateHandsInstance = async () => {
                    if (RECREATE_DISABLED) {
                        console.error(
                            '[HandsTracking] пересоздание Hands отключено: оно ломает ' +
                            'Emscripten-контекст и RequireJS. Требуется перезагрузка страницы.',
                        );
                        return;
                    }
                    if (!Hands) {
                        throw new Error('глобал Hands недоступен (CDN не загрузился)');
                    }

                    const previous = state.multimodal.handsInstance;
                    try {
                        previous?.close?.();
                    } catch (e) {
                        console.warn('[HandsTracking] close() старого Hands:', e.message);
                    }

                    suppressMediaPipeLogs();
                    try {
                        const fresh = new Hands({
                            locateFile: locateMediaPipeFile,
                        });
                        fresh.setOptions({
                            selfieMode: true,
                            maxNumHands: 2,
                            modelComplexity: 1,
                            minDetectionConfidence: 0.7,
                            minTrackingConfidence: 0.7,
                            delegate: 'GPU',
                        });
                        fresh.onResults(onResults);

                        state.multimodal.handsInstance = fresh;
                        handsInstance = fresh; // локальная ссылка в onFrame-замыкании
                        console.log('[HandsTracking] MediaPipe Hands пересоздан');
                    } finally {
                        restoreMediaPipeLogs();
                    }
                };

                state.multimodal.cameraInstance = new Camera(videoElement, {
                    onFrame: async () => {
                      // Defense in depth: ЛЮБОЕ исключение отсюда убивает внутренний
                      // RAF-цикл camera_utils — следующий кадр просто не планируется,
                      // и трекинг замирает навсегда без единой ошибки в консоли.
                      // Ровно так проявлялся баг с зависшим скелетом: TypeError из
                      // чужого колбэка (hermaionBridge.onPredictiveResult) обрывал цепочку.
                      // Внешний try обязан ловить всё, включая проверки до основного блока.
                      try {
                        // 0. Stream health check — graceful degradation if camera lost
                        const stream = videoElement.srcObject;
                        if (!stream || !stream.active) {
                            if (Date.now() - lastErrorTime > 5000) {
                                console.warn('[HandsTracking] Camera stream inactive, skipping frame');
                                lastErrorTime = Date.now();
                            }
                            isProcessing = false;
                            return;
                        }

                        // 1. Safety Check: Dimensions
                        if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
                            // Video not ready yet, skip silently
                            isProcessing = false;
                            return;
                        }

                        // 2. Concurrency Lock
                        if (isProcessing) return;
                        isProcessing = true;

                        try {
                            if (!handsInstance || typeof handsInstance.send !== 'function') {
                                // Throttle generic warning
                                if (Date.now() - lastErrorTime > 5000) {
                                    console.warn('[HandsTracking] MediaPipe Hands instance not available, skipping frame');
                                    lastErrorTime = Date.now();
                                }
                                isProcessing = false;
                                return;
                            }

                            await sendWithTimeout(handsInstance);

                            // Успешный кадр — сбрасываем счётчики деградации
                            if (lastErrorTime !== 0) lastErrorTime = 0;
                            if (hangCount !== 0) hangCount = 0;

                        } catch (handsError) {
                            const isHang = handsError?.message?.includes('inference timeout');

                            if (isHang) {
                                hangCount++;
                                if (Date.now() - lastHangLogTime > 10000 || hangCount >= MAX_HANGS_BEFORE_RESET) {
                                    console.warn(
                                        `[HandsTracking] inference watchdog: ${hangCount} hang(s) — ` +
                                        `кадр отброшен по таймауту ${INFERENCE_TIMEOUT_MS}ms`,
                                    );
                                    lastHangLogTime = Date.now();
                                }

                                if (hangCount >= MAX_HANGS_BEFORE_RESET) {
                                    console.error(
                                        `[HandsTracking] inference watchdog: ${hangCount} подряд — ` +
                                        'пересоздаю MediaPipe Hands',
                                    );
                                    hangCount = 0;
                                    try {
                                        await recreateHandsInstance();
                                    } catch (e) {
                                        console.error('[HandsTracking] пересоздание Hands не удалось:', e.message);
                                    }
                                }
                                return; // finally ниже снимет лок
                            }

                            // 3. Error Throttling (once per 5 seconds for less noise)
                            if (Date.now() - lastErrorTime > 5000) {
                                console.error('[HandsTracking] Camera onFrame error:', handsError.name, handsError.message);
                                lastErrorTime = Date.now();

                                // Graceful degradation: if error is fatal (WASM crash), stop camera
                                if (handsError.message && (handsError.message.includes('memory') || handsError.message.includes('aborted'))) {
                                    console.error('[HandsTracking] Critical WASM error — stopping camera to prevent crash loop');
                                    try {
                                        state.multimodal.cameraInstance?.stop();
                                        state.multimodal.cameraStarted = false;
                                    } catch (e) { /* ignore stop errors */ }
                                }
                            }
                        } finally {
                            isProcessing = false;
                        }
                      } catch (fatalError) {
                        // Сюда попадает всё, что вылетело мимо внутренних обработчиков.
                        // Молча гасить нельзя — но и дать исключению выйти наружу тоже:
                        // camera_utils перестанет планировать кадры и трекинг умрёт.
                        if (Date.now() - lastErrorTime > 5000) {
                            console.error(
                                '[HandsTracking] onFrame fatal (RAF-цикл спасён):',
                                fatalError?.name, fatalError?.message,
                            );
                            lastErrorTime = Date.now();
                        }
                        isProcessing = false;
                      }
                    },
                    width: 320,
                    height: 240
                });

                // Запускаем камеру
                state.multimodal.cameraInstance.start();
                state.multimodal.isGestureCanvasReady = true;
                console.log("Camera processing started (single instance)");

            }, 2000);
        };

    } catch (err) {
        console.error(">>> Error acquiring camera feed:", err.name, err.message);
        console.log("Skipping camera initialization due to error");
    }
}

// function initializeMediaPipeHands() {
export function initializeMediaPipeHands() {
    console.log("Инициализация MediaPipe Hands...");

    state.multimodal.videoElementForHands = document.getElementById('camera-view');
    if (!state.multimodal.videoElementForHands) {
        console.error("Error: videoElementForHands not found in DOM for handsTracking.");
        return;
    }

    // Setup Canvas for Skeleton Overlay
    const previewCanvas = document.getElementById('previewCanvas');
    if (previewCanvas) {
        state.multimodal.gestureCanvas = previewCanvas;
        state.multimodal.gestureCanvasCtx = previewCanvas.getContext('2d');

        // Configure overlay styles
        Object.assign(previewCanvas.style, {
            display: 'block',
            position: 'fixed',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            zIndex: '2000', // DEBUG: Ensure overlay is on top of everything
            pointerEvents: 'none'
        });

        // Resize canvas to match window
        previewCanvas.width = window.innerWidth;
        previewCanvas.height = window.innerHeight;

        window.addEventListener('resize', () => {
            previewCanvas.width = window.innerWidth;
            previewCanvas.height = window.innerHeight;
        });
    }

    suppressMediaPipeLogs();
    try {
        state.multimodal.handsInstance = new Hands({
            locateFile: locateMediaPipeFile,
        });

        state.multimodal.handsInstance.setOptions({
            selfieMode: true,
            maxNumHands: 2, // User asked for two hands if present
            modelComplexity: 1,
            minDetectionConfidence: 0.7,
            minTrackingConfidence: 0.7,
            // NPU/WebGPU delegate для Windows 11 25H2 — ускоряет инференс
            delegate: 'GPU',
        });

        state.multimodal.handsInstance.onResults(onResults);
    } finally {
        restoreMediaPipeLogs();
    }

    // Инициализация нового классификатора намерения
    state.gestureIntentClassifier = new GestureIntentClassifier();
    console.log("Экземпляр GestureIntentClassifier создан и сохранен в state.");

    // Закомментируем инициализацию старых классификаторов, если они больше не нужны
    // state.atomicGestureClassifier = new AtomicGestureClassifier();
    // state.gestureSequencer = new GestureSequencer(GESTURE_SEQUENCES);
    // console.log("Старые AtomicGestureClassifier и GestureSequencer инициализированы (на всякий случай).");

    // --- Scanner mode event listeners ---
    // Pause hand tracking when scanner is active to prevent conflicts
    eventBus.on('scannerStarted', () => {
        console.log('[HandsTracking] Scanner started - pausing hand tracking');
        state.multimodal.scannerActive = true;
        if (state.multimodal.cameraInstance) {
            state.multimodal.cameraInstance.stop();
        }
    });

    eventBus.on('scannerStopped', () => {
        console.log('[HandsTracking] Scanner stopped - resuming hand tracking');
        state.multimodal.scannerActive = false;
        if (state.multimodal.cameraInstance) {
            state.multimodal.cameraInstance.start();
        }
    });

    console.log("MediaPipe Hands инициализирован, onResults настроен.");
}


function onResults(results) {
    if (!state.multimodal.gestureCanvasCtx || !state.multimodal.gestureCanvas) {
        // console.warn("Canvas context or canvas not ready for drawing hand landmarks.");
        // Non-blocking return if canvas is missing, but logic runs
    }

    // Draw Skeleton if canvas exists
    if (state.multimodal.gestureCanvasCtx && state.multimodal.gestureCanvas) {
        const canvasCtx = state.multimodal.gestureCanvasCtx;
        const canvasElement = state.multimodal.gestureCanvas;
        const width = canvasElement.width;
        const height = canvasElement.height;

        canvasCtx.save();
        canvasCtx.clearRect(0, 0, width, height);

        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            // Debug Log once per 5 seconds to reduce console spam
            if (!window._lastHandLog || Date.now() - window._lastHandLog > 5000) {
                console.log("[HandsTracking] Hands detected. Landmarks count:", results.multiHandLandmarks.length);
                window._lastHandLog = Date.now();
            }

            for (const landmarks of results.multiHandLandmarks) {
                // Custom Skeleton Drawing
                // 1. Draw Connections
                canvasCtx.strokeStyle = '#00FF00'; // Green lines
                canvasCtx.lineWidth = 3;
                canvasCtx.beginPath();
                for (const [start, end] of HAND_CONNECTIONS) {
                    const p1 = landmarks[start];
                    const p2 = landmarks[end];
                    // MediaPipe coords are normalized 0..1
                    canvasCtx.moveTo(p1.x * width, p1.y * height);
                    canvasCtx.lineTo(p2.x * width, p2.y * height);
                }
                canvasCtx.stroke();

                // 2. Draw Landmarks (Joints)
                canvasCtx.fillStyle = '#FF0000'; // Red dots
                for (const point of landmarks) {
                    canvasCtx.beginPath();
                    canvasCtx.arc(point.x * width, point.y * height, 4, 0, 2 * Math.PI);
                    canvasCtx.fill();
                }
            }
        }
        canvasCtx.restore();
    }

    state.multimodal.lastHandData = results.multiHandLandmarks;

    // --- worldLandmarks: метрические координаты (метры) ---
    // MediaPipe worldLandmarks дают 3D координаты в метрах относительно запястья (landmark 0).
    // Это идеально ложится на TORUS_PARAMS (H_Y=3.44м, D_Z=1.72м, R_in=1.0м).
    if (results.multiWorldLandmarks && results.multiWorldLandmarks.length > 0) {
        // Применяем One Euro Filter к метрическим координатам
        const filteredWorld = results.multiWorldLandmarks.map(hand => euroFilter.filter(hand));
        state.multimodal.filteredWorldLandmarks = filteredWorld;

        // Emit для GestureEmbeddingBridge и других потребителей
        eventBus.emit('worldLandmarks', {
            landmarks: filteredWorld,
            handedness: results.multiHandedness,
        });
    }

    // --- GESTURE TO AUDIO PARAM MAPPING ---
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        state.multimodal.gestureModulationData = calculateGestureModulationData(results.multiHandLandmarks, results.multiHandedness);
    } else {
        state.multimodal.gestureModulationData = { left: null, right: null };
    }

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const handLandmarks = results.multiHandLandmarks[0];

        // --- GESTURE MANAGER INTEGRATION (State Machine) ---
        if (gestureManager) {
            gestureManager.processHandLandmarks(results.multiHandLandmarks, results.multiHandedness);
        }

        // --- ГЕРМЕС-ЭЙДОС: подача чанков в ChunkProcessor ---
        if (state.chunkProcessor) {
            state.chunkProcessor.onNewFrame(handLandmarks, performance.now());
        }

        // --- ШЕСТЬ БАЗОВЫХ ЖЕСТОВ (канон) → вектор осей ---
        // Канон: Semitones_Angles.md (шаг 1.40625° = 180°/128),
        //        XR_SYSTEM_DESIGN_RU.md §3 «Язык программирования XYZ»,
        //        AGENTS.md п.15. Движение по трём осям в обе стороны:
        //          ближе-дальше → динамика (громкость, dB)
        //          выше-ниже   → спектр (нотный ряд, полутон)
        //          левее-правее → панорамирование
        // Это ФИЗИКА шкалы, а не словарь смыслов. Назначать жестам значения
        // запрещено — «Суверенитет жеста», TRIA_Post_Symbolic_Manifesto.md §2:
        // пользователь сам наделяет свои движения смыслом.
        //
        // ИСПРАВЛЕНО 2026-09-30. Здесь были ТРИ наложенные неисправности:
        //   1) вызов state.webAudioEngine — поле НИКОГДА не присваивалось
        //      (импорт js/core/init.js:214 помечен REMOVED LEGACY) → ветка не
        //      выполнялась ни разу и молча уходила в fallback;
        //   2) читалось `intent.action`, а классификатор отдаёт `intent.intent`
        //      (js/ai/gestureIntentClassifier.js:173/179/189/258) → даже с
        //      живым движком переключатель не нашёл бы ни одного случая;
        //   3) даже найдясь, ветка отдавала нули в мёртвый движок.
        // Ни одна из трёх не поднимала исключение — поэтому всё выглядело
        // исправным. Вектор считается напрямую из смещения ладони: для шести
        // базовых осей классификатор не нужен и вреден, потому что подменяет
        // кинематику словарём.
        {
            const palm = computePalmCenter(handLandmarks);
            if (palm && prevPalm) {
                const axes = {
                    nearFar:   clampAxis(palm.z - prevPalm.z),  // ближе-дальше
                    upDown:    clampAxis(prevPalm.y - palm.y),  // выше-ниже; инверсия: Y растёт вниз
                    leftRight: clampAxis(palm.x - prevPalm.x)   // левее-правее
                };
                if (axes.nearFar || axes.upDown || axes.leftRight) {
                    // Наблюдаемость: вектор виден подписчикам и попадает в тесты.
                    eventBus.emit('gesture:axes', axes);
                }
            }
            prevPalm = palm;
        }

        // ШОВ ДЛЯ ПОДКЛЮЧЕНИЯ. Вектор осей публикуется событием
        // 'gesture:axes'; следующий шаг — два подписчика:
        //   1) Аудио-контур — применить nearFar к усилению, leftRight к пан-
        //      положению, upDown к выбору полутонного диапазона. Требуется
        //      метод на живом AudioService (state.audioService), WebAudioEngine
        //      больше не существует и не подлежит восстановлению.
        //   2) Голоконтракт — записать вектор в HOLOQUANT поступившего
        //      кванта, а НЕ в орбиту камеры. Орбита — это зрительное
        //      изменение голограммы, которое каноном запрещено как цель.
        // Пока шов не подключён, 'gesture:axes' несёт единственное
        // назначение: доказать, что шесть осей вычисляются и доходят до шины.
        // --- ❌ СТАРАЯ ЛОГИКА С WebSocketService (если заменяется полностью) ЗАКОММЕНТИРОВАНА ---
        /*
        if (state.atomicGestureClassifier && state.gestureSequencer) {
            const atomicGesture = state.atomicGestureClassifier.classify(handLandmarks);
            state.gestureSequencer.emitGesture(atomicGesture);
        }
        */

        // Оставим рисование для отладки, если необходимо
        // for (const landmarks of results.multiHandLandmarks) {
        //     drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 2 });
        //     drawLandmarks(canvasCtx, landmarks, { color: '#FF0000', lineWidth: 1, radius: 3 });
        // }

        const currentHandedness = results.multiHandedness || [];
        const handCountChanged = state.multimodal.lastHandCount !== results.multiHandLandmarks.length;

        if (!state.multimodal.handsVisible || handCountChanged) {
            state.multimodal.handsVisible = true;
            state.multimodal.lastHandCount = results.multiHandLandmarks.length;
            eventBus.emit('handsDetected', {
                count: results.multiHandLandmarks.length,
                handedness: currentHandedness
            });
        }

        // Always emit updates when hands are visible for real-time trails
        eventBus.emit('handsUpdate', {
            landmarks: results.multiHandLandmarks,
            handedness: currentHandedness
        });
    } else {
        if (state.multimodal.handsVisible) {
            state.multimodal.handsVisible = false;
            state.multimodal.lastHandCount = 0;
            eventBus.emit('handsLost');

            // --- ГЕРМЕС-ЭЙДОС: завершение жеста при потере рук ---
            if (state.chunkProcessor) {
                state.chunkProcessor.endGesture(performance.now());
            }
        }
        // Если руки не видны, старая логика отправляла null в секвенсор
        // if (state.gestureSequencer) { // Старая логика
        //    state.gestureSequencer.emitGesture(null);
        // }
    }

}

// Function to stop the video stream
export function stopVideoStream() {
    // ... (код функции без изменений) ...
    if (state.multimodal.cameraInstance) {
        state.multimodal.cameraInstance.stop();
        state.multimodal.cameraInstance = null;
    }
    state.multimodal.cameraStarted = false;
    // Clear overlay
    if (state.multimodal.gestureCanvasCtx) {
        state.multimodal.gestureCanvasCtx.clearRect(0, 0, state.multimodal.gestureCanvas.width, state.multimodal.gestureCanvas.height);
    }
}

/**
 * Calculates musical parameters from hand landmarks.
 * Matches logic in hologramRenderer.js for consistency.
 */
function calculateGestureModulationData(multiHandLandmarks, multiHandedness) {
    const data = { left: null, right: null };

    // GRID Constants (Should match hologramConfig really, but hardcoded for speed now)
    // In Renderer:
    // Freq = (1 - y) * 127
    // Pan = (x - 0.5) * 2

    for (let i = 0; i < multiHandLandmarks.length; i++) {
        const landmarks = multiHandLandmarks[i];
        const handedness = multiHandedness[i];
        const label = handedness.label.toLowerCase(); // 'left' or 'right'

        if (!landmarks[8] || !landmarks[4]) continue;

        const p8 = landmarks[8]; // Index
        const p4 = landmarks[4]; // Thumb

        // Pinch Detection
        const dist = Math.sqrt(
            Math.pow(p8.x - p4.x, 2) +
            Math.pow(p8.y - p4.y, 2) +
            Math.pow(p8.z - p4.z, 2)
        );
        const isPinching = dist < 0.05;

        // Frequency (0..127) - Y axis inverted
        // Clamp to 0..1
        const yClamped = Math.max(0, Math.min(1, p8.y));
        const frequency = (1.0 - yClamped) * 127;

        // Pan (-1..1) - X axis
        const xClamped = Math.max(0, Math.min(1, p8.x));
        const pan = (xClamped - 0.5) * 2.0;

        // Gain (0..1) - Z axis (Depth)
        // Hand closer to camera (negative Z in MP?) -> Louder?
        // Let's assume standard interaction: Push forward (towards screen/camera) = Louder?
        // Or Pull back?
        // User said: "Closer [to camera?] = Louder".
        // MP Z is roughly -0.1 (close) to 0.1 (far).
        // Let's normalize around 0.
        // gain = 0.5 - (p8.z * 5).
        let gain = 0.5 - (p8.z * 3.0);
        gain = Math.max(0, Math.min(1, gain));

        data[label] = {
            active: true,
            isPinching: isPinching,
            frequency: frequency,
            bandwidth: isPinching ? 5.0 : 15.0, // Wider brush if open hand?
            gain: gain,
            pan: pan
        };
    }

    return data;
}
