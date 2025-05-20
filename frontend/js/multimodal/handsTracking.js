// handsTracking.js

import * as THREE from 'three'; // Импортируем THREE для THREE.MathUtils

// --- MediaPipe Hands Variables ---
let hands = null; // Global reference to MediaPipe Hands controller
let currentStream = null; // To store the camera stream
let videoElementForHands = null; // Reference to the video element
let isGestureCanvasReady = false; // Flag for gesture canvas readiness

// Arrays for visualization (can be moved later)
let fingerTrails = []; // Array to store finger trail data
let fingerPositions = []; // Array to store current finger positions
let handSpheres = { left: [], right: [] }; // Массив для хранения сфер рук

// --- MediaPipe Hands Functions ---

// Function to start the video stream and initialize MediaPipe Hands processing
async function startVideoStream(videoElement, handsInstance) {
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

        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: { ideal: 320 }, // Уменьшаем размер для снижения нагрузки
                height: { ideal: 240 },
                facingMode: 'user' // Используем фронтальную камеру для надежности
            }
        });
        console.log(">>> Video stream acquired successfully (user camera).");
        videoElement.srcObject = stream;
        currentStream = stream; // Сохраняем поток для возможности остановки позже

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
                    isGestureCanvasReady = true;
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

// Placeholder for onResults function (needs to be implemented based on visualization needs)
// This function receives the results from MediaPipe Hands
function onResults(results) {
    // TODO: Implement visualization logic based on results
    // This part might need to be moved to gestureAreaVisualization.js

    // Пример обработки результатов (из старого кода)
    /*
    const gestureArea = document.getElementById('gesture-area'); // Получаем gestureArea
    if (!gestureArea) {
        console.error("Gesture area element not found!");
        return;
    }

    // Очищаем предыдущие точки
    gestureArea.querySelectorAll('.finger-dot-on-line').forEach(dot => dot.remove());

    // Проверь, есть ли вообще обнаруженные руки
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        // Внутри этой проверки пройдись циклом по results.multiHandLandmarks
        for (const landmarks of results.multiHandLandmarks) {
            // Внутри этого цикла возьми 5 ключевых точек кончиков пальцев
            const fingerTips = [landmarks[4], landmarks[8], landmarks[12], landmarks[16], landmarks[20]];

            // Пройдись циклом по fingerTips
            fingerTips.forEach(tip => {
                // Создай новый div
                const dot = document.createElement('div');
                // Добавь ему класс
                dot.className = 'finger-dot-on-line';
                // Вычисли позицию Y
                const gestureAreaHeight = gestureArea.clientHeight;
                const topPosition = tip.y * gestureAreaHeight;
                // Вычисли масштаб Z
                const scale = THREE.MathUtils.clamp(THREE.MathUtils.mapLinear(tip.z, -0.5, 0.1, 1.5, 0.5), 0.5, 1.5); // Близко (-0.5) -> 1.5, Далеко (0.1) -> 0.5
                // Установи стили точки
                dot.style.top = `${topPosition - 3}px`;
                dot.style.transform = `scale(${scale})`;
                // Добавь точку в gestureArea
                gestureArea.appendChild(dot);
            });
        }
    }
    */
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
    videoElementForHands = document.getElementById('camera-view');
    if (!videoElementForHands) {
        console.error("Video element #camera-view not found.");
        return;
    }

    // Создаем экземпляр MediaPipe Hands
    hands = new Hands({
        locateFile: (file) => {
            // Указываем путь к файлам MediaPipe
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4/${file}`;
        }
    });

    // Настраиваем параметры
    hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });

    // Устанавливаем обработчик результатов
    hands.onResults(onResults);

    // Запускаем видеопоток и обработку
    if (videoElementForHands && hands) {
        startVideoStream(videoElementForHands, hands);
    } else {
        console.error("Video element or Hands instance not ready for startVideoStream");
    }
}

// Function to stop the video stream
export function stopVideoStream() {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        console.log(">>> Video stream stopped.");
        currentStream = null;
    }
    if (videoElementForHands) {
        videoElementForHands.srcObject = null;
    }
    // TODO: Очистить ресурсы MediaPipe Hands, если необходимо
    if (hands && typeof hands.close === 'function') {
        hands.close();
        hands = null;
        console.log(">>> MediaPipe Hands instance closed.");
    }
}