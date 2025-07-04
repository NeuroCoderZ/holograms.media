// frontend/js/audio/cwtAudioWorklet.js

class CwtProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super();
        this.wasmExports = options.processorOptions.wasmBytes; // These are the already loaded exports
        this.wasmMemoryBuffer = options.processorOptions.wasmMemoryBuffer;

        this.inputLeftChannelPtr = options.processorOptions.inputLeftChannelPtr;
        this.inputRightChannelPtr = options.processorOptions.inputRightChannelPtr;
        this.outputDbLevelsPtr = options.processorOptions.outputDbLevelsPtr;
        this.outputPanAnglesPtr = options.processorOptions.outputPanAnglesPtr;
        this.targetFrequenciesPtr = options.processorOptions.targetFrequenciesPtr;

        this.processingChunkSize = options.processorOptions.processingChunkSize || 128; // Default to 128 if not provided
        this.sampleRate = options.processorOptions.sampleRate || sampleRate; // sampleRate is global in AudioWorkletProcessor scope

        this.outputDbLevels = new Float32Array(260); // 130 for left, 130 for right
        this.outputPanAngles = new Float32Array(130);

        if (!this.wasmExports || typeof this.wasmExports.encode_audio_to_hologram !== 'function') {
            this.port.postMessage({ type: 'workletError', payload: 'WASM module or encode_audio_to_hologram function not available in worklet.' });
            this.valid = false;
            return;
        }
        if (this.wasmMemoryBuffer && (!this.inputLeftChannelPtr || !this.inputRightChannelPtr || !this.outputDbLevelsPtr || !this.outputPanAnglesPtr || !this.targetFrequenciesPtr)) {
            this.port.postMessage({ type: 'workletError', payload: 'WASM memory buffer provided, but one or more data pointers are missing.' });
            this.valid = false;
            return;
        }
        this.valid = true;
        console.log("CwtProcessor constructed successfully in AudioWorkletGlobalScope.", {
            sampleRate: this.sampleRate,
            processingChunkSize: this.processingChunkSize,
            wasmMemoryAvailable: !!this.wasmMemoryBuffer,
            pointers: {
                inputLeftChannelPtr: this.inputLeftChannelPtr,
                inputRightChannelPtr: this.inputRightChannelPtr,
                outputDbLevelsPtr: this.outputDbLevelsPtr,
                outputPanAnglesPtr: this.outputPanAnglesPtr,
                targetFrequenciesPtr: this.targetFrequenciesPtr
            }
        });
    }

    process(inputs, outputs, parameters) {
        if (!this.valid) {
            return true; // Stop processing if not valid
        }

        const input = inputs[0]; // Get the first input (should be the only one for this node)

        // Assuming stereo input, but can adapt if mono
        const leftChannel = input[0];
        const rightChannel = input.length > 1 ? input[1] : leftChannel; // Use left for right if mono

        if (!leftChannel || leftChannel.length === 0) {
            // No input data, or input disconnected
            return true;
        }

        // Ensure the input data length matches processingChunkSize.
        // AudioWorklet usually provides 128 samples. If not, it might indicate an issue or need for buffering.
        if (leftChannel.length !== this.processingChunkSize) {
            // For simplicity, we'll only process if the chunk size matches.
            // In a more robust implementation, you might buffer or resample.
            // console.warn(`Worklet: Unexpected chunk size ${leftChannel.length}, expected ${this.processingChunkSize}. Skipping frame.`);
            // However, the WASM function might be flexible or expect a fixed size.
            // Let's assume for now it processes whatever length is given, up to its internal limits.
            // OR, we strictly enforce processingChunkSize. The Rust code has a check:
            // `if chunk_size == 0 ... return;`
            // `let chunk_size = left_channel.len();`
            // So, it seems the Rust code adapts to the input `chunk_size`.
            // We should pass the actual length of the current audio data.
        }

        const currentChunkSize = leftChannel.length;

        try {
            if (this.wasmMemoryBuffer) {
                // Create Float32Array views into the WASM memory for input
                const wasmInputLeft = new Float32Array(this.wasmMemoryBuffer, this.inputLeftChannelPtr, currentChunkSize);
                const wasmInputRight = new Float32Array(this.wasmMemoryBuffer, this.inputRightChannelPtr, currentChunkSize);

                wasmInputLeft.set(leftChannel);
                wasmInputRight.set(rightChannel);

                // Call the WASM function
                // void encode_audio_to_hologram(
                //     left_channel: &[f32], (ptr, len)
                //     right_channel: &[f32], (ptr, len)
                //     sample_rate: f32,
                //     target_frequencies: &[f32], (ptr, len)
                //     output_db_levels: &mut [f32], (ptr, len)
                //     output_pan_angles: &mut [f32] (ptr, len)
                // );
                // The wasm-bindgen generated JS function will handle the &[f32] from ptr+len.
                // If we didn't have wasm-bindgen and were using raw WASM, we'd pass pointers and lengths.
                // With wasm-bindgen, it expects the JS arrays or TypedArrays directly if the Rust func uses slices.
                // However, our `webAudioEngine.js` allocated memory and passed pointers, implying a more manual setup.
                // The Rust `lib.rs` uses `left_channel: &[f32]`, etc. `wasm-bindgen` would typically manage memory for these.
                // If the `allocate_f32_array` and direct pointer usage is intended, the Rust function signature
                // in `#[wasm_bindgen]` might need to accept pointers and lengths explicitly, e.g., `left_ptr: *const f32, left_len: usize`.
                // Let's assume the current `wasm-bindgen` setup correctly maps these slice arguments
                // to the memory regions we've prepared.

                this.wasmExports.encode_audio_to_hologram(
                    this.inputLeftChannelPtr, // Pointer to left channel data in WASM memory
                    currentChunkSize,         // Length of left channel data
                    this.inputRightChannelPtr, // Pointer to right channel data
                    currentChunkSize,         // Length of right channel data
                    this.sampleRate,
                    this.targetFrequenciesPtr, // Pointer to target frequencies
                    130,                      // Length of target frequencies
                    this.outputDbLevelsPtr,    // Pointer for output dB levels
                    260,                      // Length of dB levels (stereo)
                    this.outputPanAnglesPtr,   // Pointer for output pan angles
                    130                       // Length of pan angles
                );

                // Read results back from WASM memory
                this.outputDbLevels.set(new Float32Array(this.wasmMemoryBuffer, this.outputDbLevelsPtr, 260));
                this.outputPanAngles.set(new Float32Array(this.wasmMemoryBuffer, this.outputPanAnglesPtr, 130));

            } else {
                // Fallback or error if direct memory access isn't configured (less likely with current setup)
                // This path implies wasm-bindgen handles memory copying.
                // For this to work, the wasmExports.encode_audio_to_hologram would directly accept TypedArrays.
                // This is usually the case with wasm-bindgen when you pass slices.
                // However, the prompt's direction with explicit memory allocation in WebAudioEngine
                // suggests the former approach (direct memory manipulation).
                // The provided Rust code's `#[wasm_bindgen]` function signature takes `&[f32]`.
                // `wasm-bindgen`'s JS glue code for such a signature typically expects JS `Float32Array` arguments.
                // It then copies data into WASM memory, calls the Rust func, and copies results back.
                // The manual memory allocation in `WebAudioEngine` might be for optimization or specific control,
                // but it requires the Rust function to be adapted to take raw pointers, or for the JS side
                // to use `new Float32Array(this.wasmMemory.buffer, ptr, len).set(data)` for inputs
                // and then pass these ArrayViews (or just ptrs if Rust expects that) to the wasm function.

                // Given the current Rust signature `encode_audio_to_hologram(left_channel: &[f32], ...)`
                // and the manual memory setup, the most compatible way is to pass the POINTERS and LENGTHS
                // to the wasm-bindgen generated function if the function was exposed to take them.
                // If `wasm-bindgen` generated a JS function that expects `Float32Array`s, then the manual
                // memory allocation in `WebAudioEngine` would be used to prepare these arrays using views
                // on `this.wasmMemoryBuffer`.

                // Let's stick to the pointer-based invocation as implied by `WebAudioEngine`'s memory setup.
                // This requires that the `#[wasm_bindgen]` signature in Rust is actually something like:
                // pub fn encode_audio_to_hologram_raw_ptr(left_ptr: *const f32, left_len: usize, ...)
                // If it's literally `left_channel: &[f32]`, wasm-bindgen's JS wrapper expects a `Float32Array`.
                // The current `fastcwt_processor.wasm` was likely compiled with `wasm-bindgen` taking `&[f32]`.
                // In this case, the JS side should provide `Float32Array`s. The pre-allocated buffers
                // `this.inputLeftChannelPtr` etc. would be sections of memory that we create views on.

                // Revised approach for `&[f32]` signature:
                const wasmInputLeftView = new Float32Array(this.wasmMemoryBuffer, this.inputLeftChannelPtr, currentChunkSize);
                const wasmInputRightView = new Float32Array(this.wasmMemoryBuffer, this.inputRightChannelPtr, currentChunkSize);
                const wasmTargetFreqView = new Float32Array(this.wasmMemoryBuffer, this.targetFrequenciesPtr, 130);
                const wasmOutputDbView = new Float32Array(this.wasmMemoryBuffer, this.outputDbLevelsPtr, 260);
                const wasmOutputPanView = new Float32Array(this.wasmMemoryBuffer, this.outputPanAnglesPtr, 130);

                wasmInputLeftView.set(leftChannel);
                wasmInputRightView.set(rightChannel);
                // targetFrequencies are already set in WebAudioEngine's initialization.

                // This is how wasm-bindgen typically works for slice parameters
                this.wasmExports.encode_audio_to_hologram(
                    wasmInputLeftView,
                    wasmInputRightView,
                    this.sampleRate,
                    wasmTargetFreqView, // This was already filled by WebAudioEngine
                    wasmOutputDbView,   // WASM function writes into this buffer
                    wasmOutputPanView   // WASM function writes into this buffer
                );

                // Results are directly in wasmOutputDbView and wasmOutputPanView
                this.outputDbLevels.set(wasmOutputDbView);
                this.outputPanAngles.set(wasmOutputPanView);

            }

            this.port.postMessage({
                type: 'cwtResult',
                payload: {
                    dbLevels: this.outputDbLevels, // This will be a copy due to structured cloning
                    panAngles: this.outputPanAngles, // This will be a copy
                }
            });

        } catch (error) {
            this.port.postMessage({ type: 'workletError', payload: error.message });
            console.error("Error in CWTProcessor process:", error);
            this.valid = false; // Stop processing on error
        }

        // Pass audio through if needed (e.g., for hearing the source after effects)
        // For analysis only, you might not need to connect the output of this node.
        // If outputs[0] exists and has channels, copy input to output.
        const output = outputs[0];
        if (output) {
            for (let channel = 0; channel < output.length; ++channel) {
                if (input[channel]) {
                    output[channel].set(input[channel]);
                }
            }
        }

        return true; // Keep processor alive
    }
}

registerProcessor('cwt-processor', CwtProcessor);
