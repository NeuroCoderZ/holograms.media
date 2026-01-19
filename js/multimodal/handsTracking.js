// handsTracking.js
import { Camera } from 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3.1675466862/camera_utils.js';
import { Hands } from 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/hands.js';
import { drawConnectors, drawLandmarks } from 'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils@0.3.1675466124/drawing_utils.js';
import eventBus from '../core/eventBus.js';

import { state } from '../core/init.js';
// import { AtomicGestureClassifier } from '../gestures/AtomicGestureClassifier.js'; // Старый классификатор
// import { GestureSequencer } from '../gestures/GestureSequencer.js'; // Старый секвенсор
// import { GESTURE_SEQUENCES } from '../config/gestureSequences.js'; // Старые конфигурации последовательностей
import { GestureIntentClassifier } from '../ai/gestureIntentClassifier.js';
import { gestureManager } from '../managers/GestureManager.js';

// --- Constants ---
const HAND_CONNECTIONS = [
    [0, 1], [1, 2], [2, 3], [3, 4],
    [0, 5], [5, 6], [6, 7], [7, 8],
    [5, 9], [9, 10], [10, 11], [11, 12],
    [9, 13], [13, 14], [14, 15], [15, 16],
    [0, 17], [13, 17], [17, 18], [18, 19], [19, 20]
];
const FINGER_TIP_INDICES = [4, 8, 12, 16, 20];

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

                state.multimodal.cameraInstance = new Camera(videoElement, {
                    onFrame: async () => {
                        // 1. Safety Check: Dimensions
                        if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
                            // Video not ready yet, skip silently
                            return;
                        }

                        // 2. Concurrency Lock
                        if (isProcessing) return;
                        isProcessing = true;

                        try {
                            if (!handsInstance || typeof handsInstance.send !== 'function') {
                                // Throttle generic warning
                                if (Date.now() - lastErrorTime > 5000) {
                                    console.warn("MediaPipe Hands instance not available, skipping frame");
                                    lastErrorTime = Date.now();
                                }
                                isProcessing = false;
                                return;
                            }

                            await handsInstance.send({ image: videoElement });

                            // Reset error timer on success
                            if (lastErrorTime !== 0) lastErrorTime = 0;

                        } catch (handsError) {
                            // 3. Error Throttling (once per 2 seconds)
                            if (Date.now() - lastErrorTime > 2000) {
                                console.error("Error in Camera onFrame handler:", handsError);
                                lastErrorTime = Date.now();

                                // Optional: if error is fatal (WASM crash), we might want to stop/restart
                                if (handsError.message && handsError.message.includes('memory')) {
                                    console.error("Critical WASM error detected. Suggest reloading.");
                                }
                            }
                        } finally {
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
            zIndex: '1000', // Panels are 1001, so this will be blurred UNDER them
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

    state.multimodal.handsInstance = new Hands({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4/${file}`;
        }
    });

    state.multimodal.handsInstance.setOptions({
        selfieMode: true,
        maxNumHands: 2, // User asked for two hands if present
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7,
    });

    state.multimodal.handsInstance.onResults(onResults);

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
            // Debug Log once per second to avoid spam
            if (!window._lastHandLog || Date.now() - window._lastHandLog > 2000) {
                console.log("[HandsTracking] Drawing Hands. Landmarks count:", results.multiHandLandmarks.length);
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

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const handLandmarks = results.multiHandLandmarks[0];

        // --- GESTURE MANAGER INTEGRATION (State Machine) ---
        if (gestureManager) {
            gestureManager.processHandLandmarks(results.multiHandLandmarks, results.multiHandedness);
        }

        // --- ✅ НОВАЯ ЛОГИКА: Классификация, формирование deltaVector и применение к WebAudioEngine ---
        if (state.gestureIntentClassifier && state.webAudioEngine && (state.webAudioEngine.isInitialized || state.webAudioEngine.audioContext)) {
            state.gestureIntentClassifier.predict(handLandmarks).then(intent => {
                if (intent) {
                    // console.log(`[Gesture Intent Pipeline] Распознано намерение:`, intent.action);
                    let deltaVector = { gain: 0, pan: 0 };

                    switch (intent.action) {
                        case 'increase_volume': deltaVector.gain = 0.05; break;
                        case 'decrease_volume': deltaVector.gain = -0.05; break;
                        case 'pan_left': deltaVector.pan = -0.1; break;
                        case 'pan_right': deltaVector.pan = 0.1; break;
                    }

                    if (deltaVector.gain !== 0 || deltaVector.pan !== 0) {
                        state.webAudioEngine.applyDelta(deltaVector);
                    }
                }
            }).catch(e => { });
        }
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
}
