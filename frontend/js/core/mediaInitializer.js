// frontend/js/core/mediaInitializer.js
import { state } from './init.js';
import { MicrophoneManager } from '../audio/microphoneManager.js'; // Assuming MicrophoneManager class is exported
import { startVideoStream } from '../multimodal/handsTracking.js'; // startVideoStream will be adapted to take a stream

async function initializeMultimedia() {
    try {
        console.log("Requesting multimedia permissions (mic & camera)...");
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, channelCount: 2 },
            video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
        });
        console.log("Multimedia permissions granted (audio and video).");

        state.multimodal.currentStream = stream;

        if (state.audio.audioContext && state.audio.audioContext.state === 'suspended') {
            await state.audio.audioContext.resume();
            console.log('AudioContext resumed.');
        } else if (!state.audio.audioContext) {
            state.audio.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log('AudioContext created.');
        }

        if (state.microphoneManagerInstance) {
            // This method initializeWithStream will be added to MicrophoneManager class in a subsequent step
            await state.microphoneManagerInstance.initializeWithStream(stream);
            console.log('Microphone initialized with shared stream.');

            const { analyserLeft, analyserRight } = state.microphoneManagerInstance.getAnalysers();
            if (analyserLeft && analyserRight) {
                state.audio.microphoneAnalysers = { left: analyserLeft, right: analyserRight };
                if (state.audioAnalyzerLeftInstance) {
                    state.audioAnalyzerLeftInstance.setAnalyserNode(analyserLeft);
                }
                if (state.audioAnalyzerRightInstance) {
                    state.audioAnalyzerRightInstance.setAnalyserNode(analyserRight);
                }
                state.audio.activeSource = 'microphone'; // Set active source
                console.log('Microphone analysers set to global state and activeSource is microphone (audio/video stream).');
            } else {
                console.error('Failed to get analysers from microphoneManagerInstance after initializeWithStream (audio/video stream).');
            }
        } else {
            console.error('MicrophoneManager instance not found in state.');
        }

        if (state.multimodal.videoElementForHands && state.multimodal.handsInstance) {
            // startVideoStream will be modified in a subsequent step to accept the stream
            await startVideoStream(state.multimodal.videoElementForHands, state.multimodal.handsInstance, stream);
            console.log('Video stream started with shared stream for hand tracking.');
        } else {
            console.error('videoElementForHands or handsInstance not ready for startVideoStream.');
        }

    } catch (err) {
        console.error("Failed to get multimedia permissions:", err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
            alert("Multimedia access denied. Some features will be unavailable. Please check your browser settings.");
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
            alert("No camera/microphone found, or device is busy. Some features will be unavailable.");
        } else {
            console.log("Attempting to get audio-only permissions...");
            try {
                const audioStream = await navigator.mediaDevices.getUserMedia({
                    audio: { echoCancellation: true }
                });
                console.log("Audio-only permission granted.");
                state.multimodal.currentStream = audioStream;

                if (state.audio.audioContext && state.audio.audioContext.state === 'suspended') {
                    await state.audio.audioContext.resume();
                    console.log('AudioContext resumed for audio-only.');
                } else if (!state.audio.audioContext) {
                    state.audio.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    console.log('AudioContext created for audio-only.');
                }

                if (state.microphoneManagerInstance) {
                    await state.microphoneManagerInstance.initializeWithStream(audioStream);
                    console.log('Microphone initialized with audio-only stream.');

                    const { analyserLeft, analyserRight } = state.microphoneManagerInstance.getAnalysers();
                    if (analyserLeft && analyserRight) {
                        state.audio.microphoneAnalysers = { left: analyserLeft, right: analyserRight };
                        if (state.audioAnalyzerLeftInstance) {
                            state.audioAnalyzerLeftInstance.setAnalyserNode(analyserLeft);
                        }
                        if (state.audioAnalyzerRightInstance) {
                            state.audioAnalyzerRightInstance.setAnalyserNode(analyserRight);
                        }
                        state.audio.activeSource = 'microphone'; // Set active source
                        console.log('Microphone analysers set to global state and activeSource is microphone (audio-only stream).');
                    } else {
                        console.error('Failed to get analysers from microphoneManagerInstance after initializeWithStream (audio-only stream).');
                    }
                } else {
                    console.error('MicrophoneManager instance not found in state for audio-only fallback.');
                }
                alert("Successfully initialized audio. Video is unavailable.");

            } catch (audioErr) {
                console.error("Failed to get audio-only permissions:", audioErr);
                alert("Failed to initialize audio. Some features will be unavailable.");
            }
        }
    }
}

// setupFirstInteractionListener has been moved to MobileInput.js

export { initializeMultimedia };
