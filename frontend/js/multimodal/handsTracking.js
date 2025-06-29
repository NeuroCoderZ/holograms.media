// handsTracking.js
import { Hands } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';

import { state } from '../core/init.js';
import eventBus from '../core/eventBus.js';
import { updateHologramLayout } from '../ui/layoutManager.js';
import { AtomicGestureClassifier } from '../gestures/AtomicGestureClassifier.js';
import { GestureSequencer } from '../gestures/GestureSequencer.js';
import { GESTURE_SEQUENCES } from '../config/gestureSequences.js';

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
const GRID_WIDTH = state.config?.GRID?.WIDTH || 130;
const GRID_HEIGHT = state.config?.GRID?.HEIGHT || 260;
const GRID_DEPTH = state.config?.GRID?.DEPTH || 130;

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

            setTimeout(() => {
                console.log(">>> Starting hands processing after delay");

                if (!handsInstance || typeof handsInstance.send !== 'function') {
                    console.error("MediaPipe Hands instance not properly initialized");
                    return;
                }

                // Используем Camera вместо ручного управления кадрами
                state.multimodal.cameraInstance = new Camera(videoElement, {
                    onFrame: async () => {
                        try {
                            if (!handsInstance || typeof handsInstance.send !== 'function') {
                                console.warn("MediaPipe Hands instance not available, skipping frame");
                                return;
                            }
                            await handsInstance.send({ image: videoElement });
                        } catch (handsError) {
                            console.error("Error in Camera onFrame handler:", handsError);
                        }
                    },
                    width: 320,
                    height: 240
                });
                
                // Запускаем камеру
                state.multimodal.cameraInstance.start();
                state.multimodal.isGestureCanvasReady = true;
                console.log("Camera processing started");

            }, 2000);
        };
    } catch (err) {
        console.error(">>> Error acquiring camera feed:", err.name, err.message);
        console.log("Skipping camera initialization due to error");
    }
}

// ... (остальной код onResults и других функций без изменений) ...

// Function to initialize MediaPipe Hands
export function initializeMediaPipeHands() {
    console.log("Инициализация MediaPipe Hands...");

    state.multimodal.videoElementForHands = document.getElementById('camera-view');
    if (!state.multimodal.videoElementForHands) {
        console.error("Error: videoElementForHands not found in DOM for handsTracking.");
        return;
    }

    state.multimodal.handsInstance = new Hands({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4/${file}`;
        },
        // Pass the existing WebGL context from Three.js to MediaPipe
        // This assumes state.renderer is a THREE.WebGLRenderer and has been initialized
        gl: state.renderer ? state.renderer.getContext() : undefined
    });

    // ... (остальная часть функции без изменений) ...
}

// Function to stop the video stream
export function stopVideoStream() {
    // ... (код функции без изменений) ...
}
