// frontend/js/audio/audioProcessing.js
import eventBus from '../core/eventBus.js';
import { state } from '../core/init.js'; // Corrected import path
import { AudioGestureBridge } from './AudioGestureBridge.js'; // Corrected import type
import audioService from '../services/AudioService.js';
import { deviceCapabilities } from '../utils/deviceCapabilities.js';

let cwtWorkletNode = null;
let proxyConnected = false;
let inputProxyNode = null;

// BasilaQ-127 Spec: Strict WASM
const ENGINE_STATUS = {
    WAITING: 'WAITING',
    READY: 'READY',
    FAILED: 'FAILED'
};
let currentStatus = ENGINE_STATUS.WAITING;

export function getAudioContext() {
    return audioService.getAudioContext() || new (window.AudioContext || window.webkitAudioContext)();
}

// GainNode Proxy - позволяет подключить микрофон ДО загрузки WASM
function getInputProxyNode(ctx) {
    if (!inputProxyNode) {
        inputProxyNode = ctx.createGain();
        inputProxyNode.gain.value = 1.0;
    }
    return inputProxyNode;
}

// Замыкание цепи
function connectGraph() {
    const audioContext = getAudioContext();
    if (inputProxyNode && cwtWorkletNode && !proxyConnected) {
        try {
            inputProxyNode.connect(cwtWorkletNode);
            // cwtWorkletNode.connect(audioContext.destination); // Optional monitoring
            proxyConnected = true;
            console.log('[AudioProcessing] 🔗 Chain Linked: Source -> Proxy -> WASM -> Output');
        } catch(e) {
            console.error("Graph connection error", e);
        }
    }
}

export async function initializeCwtWorklet(audioContext) {
    if (currentStatus === ENGINE_STATUS.READY) return true;
    
    if (!audioContext) audioContext = audioService.getAudioContext();

    console.log('[AudioProcessing] 🚀 Booting BasilaQ-127 Engine...');

    // 1. Config
    const caps = await deviceCapabilities.detect();
    const { sampleRate, chunkSize, numBins } = caps.optimal; // Expecting 128 bins

    // 2. Load WASM Module (Binary)
    const wasmModule = audioService.getWasmModule();
    if (!wasmModule) {
        console.error('[AudioProcessing] ❌ Critical: WASM Module not loaded in AudioService.');
        currentStatus = ENGINE_STATUS.FAILED;
        return false;
    }

    try {
        // 3. Create Worklet
        // Ensure module path matches your Vite/Server setup
        await audioContext.audioWorklet.addModule('/js/audio/cwtAudioWorklet.js');

        cwtWorkletNode = new AudioWorkletNode(audioContext, 'cwt-processor', {
            processorOptions: {
                sampleRate,
                numBins: 128, // Hardcoded for BasilaQ-127 logic
                chunkSize,
                channelCount: 2
            },
            numberOfInputs: 1,
            numberOfOutputs: 1,
            channelCount: 2
        });

        // 4. Send WASM to Worklet
        cwtWorkletNode.port.postMessage({ type: 'WASM_MODULE', module: wasmModule });

        // 5. Setup Listeners
        cwtWorkletNode.port.onmessage = (event) => {
            const { type, levels, angles } = event.data;

            if (type === 'WASM_READY') {
                currentStatus = ENGINE_STATUS.READY;
                console.log('[AudioProcessing] ✅ BasilaQ-127 Engine ONLINE.');
                connectGraph();
            } 
            else if (type === 'AUDIO_DATA') {
                // HOT PATH: 60 FPS
                processSpectralData(levels, angles);
            }
            else if (type === 'WASM_ERROR') {
                console.error('[AudioProcessing] WASM Runtime Error:', event.data.error);
                currentStatus = ENGINE_STATUS.FAILED;
            }
        };

    } catch (e) {
        console.error('[AudioProcessing] Init Failed:', e);
        currentStatus = ENGINE_STATUS.FAILED;
        return false;
    }

    return true;
}

// Обработка "горячих" данных (60 раз в секунду)
function processSpectralData(rawLevels, rawAngles) {
    // 1. Gesture Bridge (Модуляция руками)
    const modulation = state.multimodal?.gestureModulationData;
    const isSynth = state.audio?.isGestureSynthMode;

    const data = AudioGestureBridge.applyModulation(
        { levels: rawLevels, pans: rawAngles }, 
        modulation, 
        isSynth
    );

    // 2. Prepare Payload for Renderer
    // Рендерер ожидает 256 столбцов (128 левых + 128 правых)
    // Pan data тоже расширяем до 256 для удобства шейдера/рендерера
    const fullPans = new Float32Array(256);
    
    // Если из WASM пришло 128 углов (по одному на полутон)
    if (data.pans && data.pans.length === 128) {
        fullPans.set(data.pans, 0);   // Left side logic
        fullPans.set(data.pans, 128); // Right side logic
    } else {
        fullPans.set(data.pans);
    }

    const payload = {
        levels: data.levels, // 256 length (128L + 128R)
        pans: fullPans
    };

    // 3. Emit
    eventBus.emit('audioData', payload);
    
    // Debug Trace (раз в секунду)
    if (Math.random() < 0.015) { 
        // console.log(`[Audio] Peak dB: ${data.levels[60]} | Pan[60]: ${data.pans[60]}`);
    }
}

export async function setupAudioProcessing(sourceNode, audioContext, connectToOutput = true) {
    if (audioContext.state === 'suspended') await audioContext.resume();

    const proxy = getInputProxyNode(audioContext);
    sourceNode.connect(proxy);

    if (currentStatus !== ENGINE_STATUS.READY) {
        await initializeCwtWorklet(audioContext);
    } else {
        connectGraph();
    }

    if (connectToOutput) {
        sourceNode.connect(audioContext.destination);
    }
    
    return proxy;
}

export function isCwtActive() { return proxyConnected; }