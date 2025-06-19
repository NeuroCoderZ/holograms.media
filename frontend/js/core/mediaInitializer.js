// frontend/js/core/mediaInitializer.js
// import { state } from './init.js'; // Removed direct import, appState will be used
import { MicrophoneManager } from '../audio/microphoneManager.js'; // Assuming MicrophoneManager class is exported
import { startVideoStream } from '../multimodal/handsTracking.js'; // startVideoStream will be adapted to take a stream

async function initializeMultimedia(appState) { // Added appState parameter
    try {
        console.log("Requesting multimedia permissions (mic & camera)...");
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, channelCount: 2 },
            video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
        });
        console.log("Multimedia permissions granted (audio and video).");

        appState.multimodal.currentStream = stream;

        if (appState.audio.audioContext && appState.audio.audioContext.state === 'suspended') {
            await appState.audio.audioContext.resume();
            console.log('AudioContext resumed.');
        } else if (!appState.audio.audioContext) {
            appState.audio.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log('AudioContext created.');
        }

        if (appState.microphoneManagerInstance) {
            // This method initializeWithStream will be added to MicrophoneManager class in a subsequent step
            await appState.microphoneManagerInstance.initializeWithStream(stream);
            console.log('Microphone initialized with shared stream.');

            const { analyserLeft, analyserRight } = appState.microphoneManagerInstance.getAnalysers();
            if (analyserLeft && analyserRight) {
                appState.audio.microphoneAnalysers = { left: analyserLeft, right: analyserRight };
                if (appState.audioAnalyzerLeftInstance) {
                    appState.audioAnalyzerLeftInstance.setAnalyserNode(analyserLeft);
                }
                if (appState.audioAnalyzerRightInstance) {
                    appState.audioAnalyzerRightInstance.setAnalyserNode(analyserRight);
                }
                appState.audio.activeSource = 'microphone'; // Set active source
                console.log('Microphone analysers set to global state and activeSource is microphone (audio/video stream).');
            } else {
                console.error('Failed to get analysers from microphoneManagerInstance after initializeWithStream (audio/video stream).');
            }
        } else {
            console.error('MicrophoneManager instance not found in state.');
        }

        // if (appState.multimodal.videoElementForHands && appState.multimodal.handsInstance) {
        //     // startVideoStream will be modified in a subsequent step to accept the stream
        //     // await startVideoStream(appState.multimodal.videoElementForHands, appState.multimodal.handsInstance, stream);
        //     // console.log('Video stream started with shared stream for hand tracking.');
        // } else {
        //     // console.error('videoElementForHands or handsInstance not ready for startVideoStream.');
        // }

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
                appState.multimodal.currentStream = audioStream;

                if (appState.audio.audioContext && appState.audio.audioContext.state === 'suspended') {
                    await appState.audio.audioContext.resume();
                    console.log('AudioContext resumed for audio-only.');
                } else if (!appState.audio.audioContext) {
                    appState.audio.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                    console.log('AudioContext created for audio-only.');
                }

                if (appState.microphoneManagerInstance) {
                    await appState.microphoneManagerInstance.initializeWithStream(audioStream);
                    console.log('Microphone initialized with audio-only stream.');

                    const { analyserLeft, analyserRight } = appState.microphoneManagerInstance.getAnalysers();
                    if (analyserLeft && analyserRight) {
                        appState.audio.microphoneAnalysers = { left: analyserLeft, right: analyserRight };
                        if (appState.audioAnalyzerLeftInstance) {
                            appState.audioAnalyzerLeftInstance.setAnalyserNode(analyserLeft);
                        }
                        if (appState.audioAnalyzerRightInstance) {
                            appState.audioAnalyzerRightInstance.setAnalyserNode(analyserRight);
                        }
                        appState.audio.activeSource = 'microphone'; // Set active source
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
