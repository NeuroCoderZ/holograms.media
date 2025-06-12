// handsTracking.js

import * as THREE from 'three'; // Импортируем THREE для THREE.MathUtils
import { state } from '../core/init.js'; // Ensure state is imported
import { updateHologramLayout } from '../ui/layoutManager.js'; // Added import

// --- Constants ---
const HAND_CONNECTIONS = [ 
    [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
    [0, 5], [5, 6], [6, 7], [7, 8], // Index finger
    [5, 9], [9, 10], [10, 11], [11, 12], // Middle finger
    [9, 13], [13, 14], [14, 15], [15, 16], // Ring finger
    [0, 17], [13, 17], [17, 18], [18, 19], [19, 20] // Pinky finger and palm lines connecting to it. Note: script.js had [13,17] and [0,17] which makes more sense for palm.
];
const FINGER_TIP_INDICES = [4, 8, 12, 16, 20];

// GRID constants - use state.config if available, otherwise fallback
const GRID_WIDTH = state.config?.GRID?.WIDTH || 130;
const GRID_HEIGHT = state.config?.GRID?.HEIGHT || 260;
const GRID_DEPTH = state.config?.GRID?.DEPTH || 130; // Assuming DEPTH might be added to state.config.GRID


// --- MediaPipe Hands Variables ---
// currentStream will use state.multimodal.currentStream
// isGestureCanvasReady will use state.multimodal.isGestureCanvasReady

// Arrays for visualization (can be moved later)
let fingerTrails = []; // Array to store finger trail data
let fingerPositions = []; // Array to store current finger positions
let handSpheres = { left: [], right: [] }; // Массив для хранения сфер рук

// --- MediaPipe Hands Functions ---

// Function to start the video stream and initialize MediaPipe Hands processing
async function startVideoStream(videoElement, handsInstance, stream = null) { // NEW: stream parameter
    console.log(">>> Attempting to start video stream...");
    try {
        // Проверка поддержки WebGL2
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl2');
        if (!gl) {
            console.error("WebGL2 не поддерживается в этом браузере. MediaPipe Hands может не работать.");
            // Не показываем alert, чтобы не блокировать интерфейс
            // alert("WebGL2 is not supported in this browser. MediaPipe Hands may not work.");
            return;
        }

        // Дополнительная проверка на возможность создания текстуры
        try {
            const testTexture = gl.createTexture();
            if (!testTexture) {
                console.error("Не удалось создать тестовую WebGL текстуру. MediaPipe может не работать.");
                return;
            }
            gl.deleteTexture(testTexture);
        } catch (textureError) {
            console.error("Ошибка при создании тестовой WebGL текстуры:", textureError);
            return;
        }

        let mediaStreamToUse;

        if (stream) {
            console.log(">>> Using provided MediaStream for video.");
            mediaStreamToUse = stream;
            // If the provided stream might contain audio, and videoElement is not muted,
            // you might want to ensure only video plays.
            // For example, by cloning and using only video tracks:
            // const videoTracks = stream.getVideoTracks();
            // if (videoTracks.length > 0) {
            //   mediaStreamToUse = new MediaStream(videoTracks);
            // } else {
            //   console.error("Provided stream has no video tracks.");
            //   throw new Error("Provided stream has no video tracks.");
            // }
            // However, for now, direct use is fine as videoElement typically handles this.
            // videoElement.muted = true; // Another option if audio shouldn't play
        } else {
            console.log(">>> No stream provided, requesting new video-only stream via getUserMedia.");
            mediaStreamToUse = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 320 }, // Уменьшаем размер для снижения нагрузки
                    height: { ideal: 240 },
                    facingMode: 'user' // Используем фронтальную камеру для надежности
                }
            });
            console.log(">>> New video-only stream acquired successfully.");
        }

        videoElement.srcObject = mediaStreamToUse;
        state.multimodal.currentStream = mediaStreamToUse; // Store the stream being used

        // Используем onloadedmetadata и onloadeddata для большей надежности
        videoElement.onloadedmetadata = () => {
            console.log(">>> Video metadata loaded. Waiting for full data load...");
            videoElement.play();
        };

        videoElement.onloadeddata = () => {
            console.log(">>> Video data loaded. Waiting before starting hands processing...");

            // Увеличиваем задержку перед началом обработки для полной инициализации WebGL
            setTimeout(() => {
                console.log(">>> Starting hands processing after delay");

                // Проверяем готовность handsInstance перед использованием
                if (!handsInstance || typeof handsInstance.send !== 'function') {
                    console.error("MediaPipe Hands instance not properly initialized");
                    return;
                }

                // Создаем функцию обработки кадров с дополнительными проверками
                let processingActive = true;
                let errorCount = 0;
                const MAX_ERRORS = 5;

                // Определяем функцию обработки кадров
                const processVideoFrame = async () => {
                    if (!processingActive) return; // Проверка активности обработки

                    // Проверяем, что видео полностью загружено и готово
                    if (videoElement.readyState >= 3) {
                        try {
                            // Проверяем, что видео имеет ненулевые размеры
                            if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
                                console.warn("Video dimensions are zero, skipping frame");
                                requestAnimationFrame(processVideoFrame);
                                return;
                            }

                            // Дополнительная проверка готовности handsInstance перед каждым кадром
                            if (!handsInstance || typeof handsInstance.send !== 'function') {
                                console.warn("MediaPipe Hands instance not available for this frame, skipping");
                                requestAnimationFrame(processVideoFrame);
                                return;
                            }

                            // Оборачиваем в try-catch для отлова ошибок createTexture
                            await handsInstance.send({ image: videoElement });
                            errorCount = 0; // Сбрасываем счетчик ошибок при успешной обработке
                        } catch (handsError) {
                            console.error("Error sending frame to MediaPipe Hands:", handsError);
                            errorCount++;

                            // Более детальная обработка ошибок
                            const errorMessage = handsError.toString();

                            // Если ошибка связана с текстурами или WebGL
                            if (errorMessage.includes('createTexture') ||
                                errorMessage.includes('WebGL') ||
                                errorMessage.includes('texture') ||
                                errorCount > MAX_ERRORS) {

                                console.warn("WebGL texture error detected or too many errors, disabling hand tracking temporarily");
                                processingActive = false; // Останавливаем обработку

                                // Очищаем ресурсы перед повторной попыткой
                                try {
                                    if (handsInstance && typeof handsInstance.close === 'function') {
                                        handsInstance.close();
                                        console.log("Closed hands instance to free resources");
                                    }
                                } catch (closeError) {
                                    console.warn("Error while closing hands instance:", closeError);
                                }

                                // Пытаемся восстановить через 5 секунд
                                setTimeout(() => {
                                    console.log("Attempting to restart hand tracking...");
                                    processingActive = true;
                                    errorCount = 0;
                                    requestAnimationFrame(processVideoFrame);
                                }, 5000);
                                return;
                            }
                        }
                    }

                    if (processingActive) {
                        requestAnimationFrame(processVideoFrame);
                    }
                }

                // Запускаем обработку с небольшой задержкой
                setTimeout(() => {
                    processVideoFrame();
                    state.multimodal.isGestureCanvasReady = true; // Store in state
                }, 500);

            }, 2000); // Увеличиваем задержку до 2 секунд для лучшей инициализации WebGL
        };
    } catch (err) {
        console.error(">>> Error acquiring camera feed:", err.name, err.message);
        console.log("Skipping camera initialization due to error");
        // Не показываем alert, чтобы не блокировать интерфейс
        // alert(`Failed to acquire camera feed: ${err.name}: ${err.message}. Please ensure a camera is connected and permissions are granted.`);
    }
}

function onResults(results) {
    state.multimodal.lastHandData = results;
    // Use the reference from the state
    const gestureAreaElement = state.uiElements.containers.gestureArea;
    const handsArePresent = results.multiHandLandmarks && results.multiHandLandmarks.length > 0;
    state.multimodal.handsVisible = handsArePresent;

    if (gestureAreaElement) {
        // Toggle class instead of direct style manipulation for height
        if (handsArePresent) {
            gestureAreaElement.classList.add('hands-detected');
        } else {
            gestureAreaElement.classList.remove('hands-detected');
        }
        // The height will be controlled by CSS rules for #gesture-area and #gesture-area.hands-detected
        // console.log(`Gesture area class updated based on hands presence. Hands: ${handsArePresent}`);
    }
    // layoutManager.updateHologramLayout(); // <--- ЗАКОММЕНТИРОВАТЬ ЭТУ СТРОКУ

    // New logic for .visible class in landscape mode:
    if (gestureAreaElement) {
        const isLandscape = gestureAreaElement.classList.contains('landscape');

        if (isLandscape) {
            if (handsArePresent) {
                gestureAreaElement.classList.add('visible');
                // console.log('[HandsTracking] Hands detected in landscape, adding .visible to gesture-area.');
            } else {
                gestureAreaElement.classList.remove('visible');
                // console.log('[HandsTracking] No hands detected in landscape, removing .visible from gesture-area.');
            }
        } else {
            // In portrait mode, the .visible class (for landscape sliding) should be absent.
            gestureAreaElement.classList.remove('visible');
        }
    }

    if (!state.multimodal.isGestureCanvasReady) {
        // console.warn("onResults called but isGestureCanvasReady is false. Skipping draw.");
        return;
    }

    if (state.multimodal.handMeshGroup) {
        state.multimodal.handMeshGroup.clear();
    } else {
        console.error('handMeshGroup not initialized in onResults.');
        return;
    }
    
    if (gestureAreaElement) {
        gestureAreaElement.querySelectorAll('.finger-dot-on-line').forEach(dot => dot.remove());
    }


    if (handsArePresent) {
        for (const landmarks of results.multiHandLandmarks) {
            // --- 3D Hand Rendering ---
            const handPoints3D = landmarks.map(landmark => {
                // Transformation from script.js (lines 1040-1049)
                // Adjusting Z to be positive for "in front" and scale it
                const x = landmark.x * GRID_WIDTH - GRID_WIDTH / 2;
                const y = (1 - landmark.y) * GRID_HEIGHT - GRID_HEIGHT / 2; // Invert Y
                const z = (landmark.z * GRID_DEPTH * -1) + (GRID_DEPTH / 4); // Invert Z, scale, and offset
                return new THREE.Vector3(x, y, z);
            });

            // Create line material
            const lineMaterial = new THREE.LineBasicMaterial({
                color: 0xffffff, // White lines
                transparent: true,
                opacity: 0.8,
                linewidth: 2, // Note: linewidth might not be respected by all systems/drivers
            });

            // Create points material with vertex colors
            const pointsMaterial = new THREE.PointsMaterial({
                vertexColors: true,
                size: 1.0, // Adjusted for world units
                transparent: true,
                opacity: 0.8
            });

            // Create lines geometry
            const linesGeometry = new THREE.BufferGeometry().setFromPoints(
                HAND_CONNECTIONS.flatMap(conn => [handPoints3D[conn[0]], handPoints3D[conn[1]]])
            );
            const handLines = new THREE.LineSegments(linesGeometry, lineMaterial);
            handLines.renderOrder = 5; // Ensure hands are rendered on top
            state.multimodal.handMeshGroup.add(handLines);

            // Create points geometry and colors
            const pointsGeometry = new THREE.BufferGeometry().setFromPoints(handPoints3D);
            const colors = [];
            const white = new THREE.Color(0xffffff);
            const green = new THREE.Color(0x00ff00); // Green for fingertips

            for (let i = 0; i < handPoints3D.length; i++) {
                if (FINGER_TIP_INDICES.includes(i)) {
                    colors.push(green.r, green.g, green.b);
                } else {
                    colors.push(white.r, white.g, white.b);
                }
            }
            pointsGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
            const handPointsMesh = new THREE.Points(pointsGeometry, pointsMaterial);
            handPointsMesh.renderOrder = 5; // Ensure hands are rendered on top
            state.multimodal.handMeshGroup.add(handPointsMesh);

            // --- 2D Landmark Rendering on gesture-area ---
            if (gestureAreaElement) {
                const fingerTips = FINGER_TIP_INDICES.map(index => landmarks[index]);
                fingerTips.forEach(tip => {
                    const dot = document.createElement('div');
                    dot.className = 'finger-dot-on-line';
                    const gestureAreaHeight = gestureAreaElement.clientHeight;
                    const topPosition = tip.y * gestureAreaHeight; // Y is 0 at top, 1 at bottom for MediaPipe
                    // Scale Z from script.js: THREE.MathUtils.clamp(THREE.MathUtils.mapLinear(tip.z, -0.5, 0.1, 1.5, 0.5), 0.5, 1.5)
                    // tip.z is roughly -0.1 (close) to 0.1 (far) but can vary.
                    // We want scale to be larger when closer (z is more negative)
                    const scale = THREE.MathUtils.clamp(THREE.MathUtils.mapLinear(tip.z, -0.15, 0.15, 1.5, 0.5), 0.5, 1.5);

                    dot.style.top = `${topPosition - 3}px`; // -3 to center the dot
                    dot.style.transform = `scale(${scale})`;
                    gestureAreaElement.appendChild(dot);
                });
            }
        }
    }
}

// Function to initialize MediaPipe Hands
export function initializeMediaPipeHands() {
    // Проверяем, загружена ли библиотека Hands
    if (typeof Hands === 'undefined') {
        console.error('Библиотека MediaPipe Hands не загружена. Проверьте подключение скриптов в HTML.');
        return; // Прерываем выполнение, если библиотека не найдена
    }
    console.log("Инициализация MediaPipe Hands...");

    // Получаем видео элемент
    state.multimodal.videoElementForHands = document.getElementById('camera-view');
    if (!state.multimodal.videoElementForHands) {
        console.error("Error: videoElementForHands not found in DOM for handsTracking.");
        return;
    }

    // Создаем экземпляр MediaPipe Hands
    state.multimodal.handsInstance = new Hands({
        locateFile: (file) => {
            // Указываем путь к файлам MediaPipe
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4/${file}`;
        }
    });

    // Настраиваем параметры
    if (!state.multimodal.handsInstance) {
        console.error("Critical: MediaPipe Hands instance could not be created. Hand tracking cannot start.");
        return;
    }
    
    state.multimodal.handsInstance.setOptions({
        maxNumHands: 2,
        modelComplexity: 1, // consider making this configurable via state.config
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });

    // Устанавливаем обработчик результатов
    state.multimodal.handsInstance.onResults(onResults);

    // Initialize 3D hand group
    state.multimodal.handMeshGroup = new THREE.Group();
    if (state.scene) {
        state.scene.add(state.multimodal.handMeshGroup);
        console.log("handMeshGroup added to scene.");
    } else {
        console.error('state.scene is not available to add handMeshGroup. Ensure initializeMediaPipeHands is called after scene initialization.');
    }

    // Запускаем видеопоток и обработку
    if (state.multimodal.videoElementForHands && state.multimodal.handsInstance) {
        startVideoStream(state.multimodal.videoElementForHands, state.multimodal.handsInstance);
    } else {
        console.error("Video element or Hands instance not ready for startVideoStream");
    }
}

// Function to stop the video stream
export function stopVideoStream() {
    if (state.multimodal.currentStream) { // Use state
        state.multimodal.currentStream.getTracks().forEach(track => track.stop());
        console.log(">>> Video stream stopped.");
        state.multimodal.currentStream = null; // Update state
    }
    if (state.multimodal.videoElementForHands) { // Use state
        state.multimodal.videoElementForHands.srcObject = null;
    }
    
    if (state.multimodal.handsInstance && typeof state.multimodal.handsInstance.close === 'function') { // Use state
        state.multimodal.handsInstance.close();
        state.multimodal.handsInstance = null; // Update state
        console.log(">>> MediaPipe Hands instance closed.");
    }

    state.multimodal.isGestureCanvasReady = false; // Update state
    if (state.multimodal.handMeshGroup) {
        state.multimodal.handMeshGroup.clear(); // Clear 3D visuals
        console.log("handMeshGroup cleared.");
    }
    state.multimodal.handsVisible = false; // Update state
    state.multimodal.lastHandData = null; // Update state
}