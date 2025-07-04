import { loadWasmModule } from '../wasm/wasm_loader.js';
import eventBus from '../core/eventBus.js';

const TARGET_FREQUENCIES = new Float32Array(130); // Placeholder, will need actual frequencies
const SAMPLE_RATE = 48000; // Assuming a common sample rate

// Populate TARGET_FREQUENCIES (example: logarithmic scale)
// This should match the expected input of the WASM module if it has specific frequency bins
// For now, a simple linear scale for placeholder purposes
for (let i = 0; i < 130; i++) {
    TARGET_FREQUENCIES[i] = 20 * Math.pow(2, (i / 12)); // Example: 130 steps over some octaves starting from 20Hz
}


export class WebAudioEngine {
    constructor() {
        this.audioContext = null;
        this.wasmExports = null;
        this.cwtNode = null;
        this.sourceNode = null;
        this.gainNode = null;
        this.pannerNode = null;
        this.isInitialized = false;
        this.eventBus = eventBus; // Using the global eventBus

        // For WASM memory management if needed
        this.wasmMemory = null;
        this.inputBufferPtr = null;
        this.outputDbLevelsPtr = null;
        this.outputPanAnglesPtr = null;
        this.targetFrequenciesPtr = null;

        // Define buffer sizes based on typical AudioWorklet processing (128 samples)
        // and WASM function expectations.
        // The WASM function `encode_audio_to_hologram` expects `left_channel` and `right_channel` arrays.
        // The AudioWorklet processor typically provides 128 samples per channel per process call.
        this.processingChunkSize = 128; // Standard AudioWorklet buffer size
    }

    async initialize() {
        if (this.isInitialized) return;

        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: SAMPLE_RATE // Specify sample rate
            });

            console.log("AudioContext created with sample rate:", this.audioContext.sampleRate);

            this.wasmExports = await loadWasmModule('cwt_analyzer.wasm');
            if (!this.wasmExports || !this.wasmExports.encode_audio_to_hologram) {
                console.error("Failed to load WASM module or `encode_audio_to_hologram` not found.");
                return;
            }
            console.log("WASM module loaded successfully. Exports:", this.wasmExports);

            // Allocate memory in WASM if it's not automatically handled by wasm-bindgen ABI
            // This is typical for functions taking slices/pointers directly.
            if (this.wasmExports.memory) {
                this.wasmMemory = this.wasmExports.memory;
                console.log("WASM memory accessible.");

                // Allocate buffers in WASM memory
                // Size is processingChunkSize * Float32Array.BYTES_PER_ELEMENT
                const bufferByteSize = this.processingChunkSize * Float32Array.BYTES_PER_ELEMENT;
                this.inputLeftChannelPtr = this.wasmExports.allocate_f32_array ? this.wasmExports.allocate_f32_array(this.processingChunkSize) : this.wasmExports.__wbindgen_malloc(bufferByteSize);
                this.inputRightChannelPtr = this.wasmExports.allocate_f32_array ? this.wasmExports.allocate_f32_array(this.processingChunkSize) : this.wasmExports.__wbindgen_malloc(bufferByteSize);

                // Output buffers: 130 for db levels (x2 for stereo), 130 for pan angles
                this.outputDbLevelsPtr = this.wasmExports.allocate_f32_array ? this.wasmExports.allocate_f32_array(260) : this.wasmExports.__wbindgen_malloc(260 * Float32Array.BYTES_PER_ELEMENT);
                this.outputPanAnglesPtr = this.wasmExports.allocate_f32_array ? this.wasmExports.allocate_f32_array(130) : this.wasmExports.__wbindgen_malloc(130 * Float32Array.BYTES_PER_ELEMENT);
                this.targetFrequenciesPtr = this.wasmExports.allocate_f32_array ? this.wasmExports.allocate_f32_array(130) : this.wasmExports.__wbindgen_malloc(130 * Float32Array.BYTES_PER_ELEMENT);

                console.log("WASM memory allocated: ", {
                    inputLeftChannelPtr: this.inputLeftChannelPtr,
                    inputRightChannelPtr: this.inputRightChannelPtr,
                    outputDbLevelsPtr: this.outputDbLevelsPtr,
                    outputPanAnglesPtr: this.outputPanAnglesPtr,
                    targetFrequenciesPtr: this.targetFrequenciesPtr
                });

                if (!this.inputLeftChannelPtr || !this.inputRightChannelPtr || !this.outputDbLevelsPtr || !this.outputPanAnglesPtr || !this.targetFrequenciesPtr) {
                     console.error("Failed to allocate memory in WASM heap for one or more buffers.");
                     // Attempt to free any successfully allocated buffers before returning
                    if (this.inputLeftChannelPtr && this.wasmExports.deallocate_f32_array) this.wasmExports.deallocate_f32_array(this.inputLeftChannelPtr, this.processingChunkSize);
                    else if (this.inputLeftChannelPtr && this.wasmExports.__wbindgen_free) this.wasmExports.__wbindgen_free(this.inputLeftChannelPtr, bufferByteSize);
                    // ... repeat for other buffers ...
                    return;
                }

                // Copy TARGET_FREQUENCIES to WASM memory
                new Float32Array(this.wasmMemory.buffer, this.targetFrequenciesPtr, 130).set(TARGET_FREQUENCIES);

            } else {
                console.warn("WASM module does not export memory. Direct memory manipulation might not be possible or needed if using wasm-bindgen's higher-level features.");
            }


            await this.audioContext.audioWorklet.addModule('/js/audio/cwtAudioWorklet.js');
            console.log("AudioWorklet module added.");

            this.cwtNode = new AudioWorkletNode(this.audioContext, 'cwt-processor', {
                processorOptions: {
                    wasmBytes: this.wasmExports, // Pass exports directly, or path to WASM if re-fetching in worklet
                    // Pass memory pointers if direct memory access is used
                    inputLeftChannelPtr: this.inputLeftChannelPtr,
                    inputRightChannelPtr: this.inputRightChannelPtr,
                    outputDbLevelsPtr: this.outputDbLevelsPtr,
                    outputPanAnglesPtr: this.outputPanAnglesPtr,
                    targetFrequenciesPtr: this.targetFrequenciesPtr,
                    processingChunkSize: this.processingChunkSize,
                    sampleRate: this.audioContext.sampleRate,
                    wasmMemoryBuffer: this.wasmMemory ? this.wasmMemory.buffer : null
                }
            });
            console.log("CWT AudioWorkletNode created.");

            this.cwtNode.port.onmessage = (event) => {
                if (event.data.type === 'cwtResult') {
                    this.eventBus.emit('cwtResult', event.data.payload);
                } else if (event.data.type === 'workletError') {
                    console.error('Error from CWT AudioWorklet:', event.data.payload);
                }
            };
            console.log("CWT Node message port listener set up.");

            // Basic audio graph: Source -> Gain -> Panner -> CWTNode -> Destination
            this.gainNode = this.audioContext.createGain();
            this.pannerNode = this.audioContext.createStereoPanner();

            this.gainNode.connect(this.pannerNode);
            this.pannerNode.connect(this.cwtNode);
            this.cwtNode.connect(this.audioContext.destination); // Connect CWT node to output to hear processed sound (or for analysis only)

            console.log("Audio graph (Gain -> Panner -> CWTNode -> Destination) configured.");

            this.isInitialized = true;
            console.log("WebAudioEngine initialized successfully.");

        } catch (error) {
            console.error("Error initializing WebAudioEngine:", error);
            this.isInitialized = false;
        }
    }

    connectSource(audioNode) {
        if (!this.isInitialized || !audioNode) {
            console.error("WebAudioEngine not initialized or sourceNode is invalid.");
            return;
        }
        if (this.sourceNode) {
            this.sourceNode.disconnect();
        }
        this.sourceNode = audioNode;
        this.sourceNode.connect(this.gainNode);
        console.log("Audio source connected to GainNode.");
    }

    applyDelta(deltaVector) {
        if (!this.isInitialized) {
            console.warn("WebAudioEngine not initialized. Cannot apply delta.");
            return;
        }

        if (deltaVector.gain !== undefined && this.gainNode) {
            // Ensure gain is within a reasonable range, e.g., 0 to 2
            this.gainNode.gain.setTargetAtTime(
                Math.max(0, Math.min(2, this.gainNode.gain.value + deltaVector.gain)),
                this.audioContext.currentTime,
                0.01 // timeConstant for smooth change
            );
            console.log("Applied gain delta:", deltaVector.gain, "New gain:", this.gainNode.gain.value);
        }

        if (deltaVector.pan !== undefined && this.pannerNode) {
            // Pan is -1 (left) to 1 (right)
            this.pannerNode.pan.setTargetAtTime(
                Math.max(-1, Math.min(1, this.pannerNode.pan.value + deltaVector.pan)),
                this.audioContext.currentTime,
                0.01 // timeConstant
            );
            console.log("Applied pan delta:", deltaVector.pan, "New pan:", this.pannerNode.pan.value);
        }
    }

    getAudioContext() {
        return this.audioContext;
    }

    // Cleanup method to release WASM memory if allocated
    cleanup() {
        if (this.wasmMemory && this.wasmExports && this.wasmExports.__wbindgen_free) {
            const bufferByteSize = this.processingChunkSize * Float32Array.BYTES_PER_ELEMENT;
            if (this.inputLeftChannelPtr) this.wasmExports.__wbindgen_free(this.inputLeftChannelPtr, bufferByteSize);
            if (this.inputRightChannelPtr) this.wasmExports.__wbindgen_free(this.inputRightChannelPtr, bufferByteSize);
            if (this.outputDbLevelsPtr) this.wasmExports.__wbindgen_free(this.outputDbLevelsPtr, 260 * Float32Array.BYTES_PER_ELEMENT);
            if (this.outputPanAnglesPtr) this.wasmExports.__wbindgen_free(this.outputPanAnglesPtr, 130 * Float32Array.BYTES_PER_ELEMENT);
            if (this.targetFrequenciesPtr) this.wasmExports.__wbindgen_free(this.targetFrequenciesPtr, 130 * Float32Array.BYTES_PER_ELEMENT);
            console.log("WASM memory deallocated.");
        }
    }
}

// Example of how it might be used in your application initialization
// async function main() {
//     const webAudioEngine = new WebAudioEngine();
//     await webAudioEngine.initialize();
//
//     if (webAudioEngine.isInitialized) {
//         // Example: Connect microphone input
//         try {
//             const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
//             const micSource = webAudioEngine.getAudioContext().createMediaStreamSource(stream);
//             webAudioEngine.connectSource(micSource);
//             console.log("Microphone connected to WebAudioEngine.");
//         } catch (err) {
//             console.error("Error accessing microphone:", err);
//         }
//     }
// }
// main();
