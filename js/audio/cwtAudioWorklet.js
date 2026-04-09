// frontend/js/audio/cwtAudioWorklet.js
// BasilaQ-128 Engine
// STRICT WASM MODE.

let wasm = null;
let analyzerPtr = 0;
let cachedFloat32Memory = null;

// Пред-аллокация указателей (reuse)
let ptrs = { left: 0, right: 0, levels: 0, pans: 0, confidence: 0 };

// Кэшированные fallback-массивы (НЕ создаём новые каждый вызов!)
const FALLBACK_LEVELS = new Float32Array(256).fill(-128);
const FALLBACK_ANGLES = new Float32Array(128).fill(0);
const FALLBACK_CONFIDENCE = new Float32Array(128).fill(0);

function getFloat32Memory() {
    if (!cachedFloat32Memory || cachedFloat32Memory.buffer.byteLength === 0) {
        cachedFloat32Memory = new Float32Array(wasm.memory.buffer);
    }
    return cachedFloat32Memory;
}

class CwtProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super();
        this._hb = 0;
        this._initialized = false;
        this._killed = false; // Флаг для чистого завершения
        this._lastFpsLog = null;
        this._fallbackAccumulator = 0; // Throttle для fallback-пути
        this._cwtFallbackLog = false; // Diagnostic flag

        // Configuration from service
        this._sampleRate = options.processorOptions.sampleRate || 48000;
        this._targetFps = options.processorOptions.targetFps || 60;
        this._sourceType = options.processorOptions.sourceType || 0; // 0=file, 1=mic

        console.log(`[CwtWorklet] Initialized with SR: ${this._sampleRate}, FPS: ${this._targetFps}`);

        // === БЕЗОПАСНАЯ ИНИЦИАЛИЗАЦИЯ ПОРТА ===
        this.port.onmessage = async (event) => {
            const data = event.data;
            if (data.type === 'WASM_BUFFER') {
                this.port.postMessage({ type: 'LOG', msg: 'WASM_BUFFER_RECEIVED' });
                try {
                    await this.initWasm(data.buffer);
                } catch (err) {
                    this.port.postMessage({
                        type: 'WASM_ERROR',
                        error: 'INIT_FAILED: ' + (err.message || 'unknown')
                    });
                }
            } else if (data.type === 'SET_FPS' && wasm && analyzerPtr) {
                // Динамическое обновление FPS для адаптации под частоту экрана
                const newFps = data.fps;
                if (newFps > 0 && wasm.cwtanalyzer_set_fps) {
                    wasm.cwtanalyzer_set_fps(analyzerPtr, newFps);
                    this._targetFps = newFps;
                    // Rate-limited logging: once per 30 seconds
                    if (!this._lastFpsLog || Date.now() - this._lastFpsLog > 30000) {
                        this.port.postMessage({ type: 'LOG', msg: `FPS: ${newFps}` });
                        this._lastFpsLog = Date.now();
                    }
                }
            } else if (data.type === 'RESET') {
                // Полная смерть worklet (только при остановке приложения)
                if (wasm && analyzerPtr && wasm.cwtanalyzer_reset) {
                    wasm.cwtanalyzer_reset(analyzerPtr);
                }
                this._killed = true;
                this.port.postMessage({ type: 'LOG', msg: 'WASM_RESET_AND_KILL' });
            } else if (data.type === 'CLEAR') {
                // Мягкий сброс буферов БЕЗ убийства worklet
                // Используется при stop/play/sмене трека
                if (wasm && analyzerPtr && wasm.cwtanalyzer_reset) {
                    wasm.cwtanalyzer_reset(analyzerPtr);
                    this.port.postMessage({ type: 'LOG', msg: 'WASM_BUFFERS_CLEARED (worklet alive)' });
                }
                // Сбросим аккумуляторы для корректного подсчёта сэмплов
                this._sampleAccumulator = 0;
                this._fallbackAccumulator = 0;
            }
        };

        // HANDSHAKE: Notify service that we are ready
        this.port.postMessage({ type: 'WORKLET_READY' });
    }

    async initWasm(buffer) {
        this.port.postMessage({ type: 'LOG', msg: 'INSTANTIATION_START (from buffer)' });
        try {
            // ✅ ПРАВИЛЬНАЯ инициализация для чистого WASM (без wasm-bindgen)
            const result = await WebAssembly.instantiate(buffer, {
                env: {
                    abort: () => { this.port.postMessage({ type: 'LOG', msg: 'WASM_ABORT_CALLED' }); },
                    // Support standard C library names if needed
                    malloc: (size) => wasm.malloc(size),
                    free: (ptr, size) => wasm.free(ptr, size)
                }
            });

            wasm = result.instance.exports;

            // Проверка экспортов
            if (!wasm.cwtanalyzer_new || !wasm.cwtanalyzer_process) {
                throw new Error('Required WASM exports not found (cwtanalyzer_new/process)');
            }

            // Pass SR, FPS and SourceType to constructor
            analyzerPtr = wasm.cwtanalyzer_new(this._sampleRate, this._targetFps, this._sourceType);

            if (!analyzerPtr) {
                throw new Error('cwtanalyzer_new returned null');
            }

            // CRITICAL: Mark initialized BEFORE logging/buffer allocation
            this._initialized = true;

            this.port.postMessage({
                type: 'LOG',
                msg: `WASM Engine Created. Ptr: ${analyzerPtr}, SR: ${this._sampleRate}, FPS: ${this._targetFps}`
            });

            // Allocate buffers (Using the new malloc export)
            ptrs.left = wasm.malloc(128 * 4);
            ptrs.right = wasm.malloc(128 * 4);
            ptrs.levels = wasm.malloc(256 * 4);
            ptrs.pans = wasm.malloc(128 * 4);
            ptrs.confidence = wasm.malloc(128 * 4);

            // Already set: this._initialized = true; // Moved before buffer allocation
            this.port.postMessage({ type: 'WASM_READY' });
            this.port.postMessage({ type: 'LOG', msg: 'PIPELINE_FULLY_READY' });
        } catch (err) {
            this.port.postMessage({
                type: 'WASM_ERROR',
                error: 'INIT_FAILED: ' + (err.message || 'unknown error')
            });
        }
    }

    process(inputs, outputs) {
        // Зомби-защита: если получили RESET — умираем
        if (this._killed) return false;

        const input = inputs[0];

        if (!input || !input[0] || !wasm || !analyzerPtr || !this._initialized) {
        // DIAGNOSTIC: Почему fallback?
        const diagKey = `fallback_${Date.now()}`;
        if (!this._cwtFallbackLog) {
            console.log('[CwtWorklet] ⚠️ Fallback mode:', {
                hasInput: !!input,
                hasInput0: !!(input && input[0]),
                hasWasm: !!wasm,
                hasAnalyzerPtr: !!analyzerPtr,
                initialized: this._initialized,
                killed: this._killed
            });
            this._cwtFallbackLog = true;
        }
            
            // THROTTLED fallback: отправляем НЕ чаще target FPS (вместо 375/сек!)
            this._fallbackAccumulator += (input && input[0]) ? input[0].length : 128;
            const samplesPerFrame = this._sampleRate / (this._targetFps || 60);
            if (this._fallbackAccumulator >= samplesPerFrame) {
                this._fallbackAccumulator -= samplesPerFrame;
                // Используем кэшированные массивы — без аллокаций!
                this.port.postMessage({
                    type: 'AUDIO_DATA',
                    levels: FALLBACK_LEVELS,
                    angles: FALLBACK_ANGLES,
                    confidence: FALLBACK_CONFIDENCE,
                    timestamp: (typeof currentTime !== 'undefined') ? currentTime : 0,
                    isFallback: true
                });
            }
            return true;
        }

        // Pass-through
        if (outputs[0] && outputs[0][0]) {
            outputs[0][0].set(input[0]);
            if (input[1] && outputs[0][1]) outputs[0][1].set(input[1]);
        }

        try {
            // 1. WASM Memory Safety: Check if memory grew (buffer detached)
            // If the WASM instance resized its memory, the old 'cachedFloat32Memory' is now a detached buffer.
            // Accessing it will throw a TypeError. We must refresh the view.
            if (!cachedFloat32Memory || cachedFloat32Memory.buffer.byteLength === 0 || cachedFloat32Memory.length === 0) {
                cachedFloat32Memory = new Float32Array(wasm.memory.buffer);
            }
            let mem = cachedFloat32Memory;

            // Double check: if it's still detached, we can't proceed this frame
            if (mem.buffer.byteLength === 0) {
                return true;
            }

            const len = Math.min(input[0].length, 128);

            // BOUNDS CHECKING: Check if pointers are valid within current memory
            // ptrs.left is a byte offset. We access it as float32 index (divide by 4).
            // We need 'len' floats.
            if ((ptrs.left / 4) + len > mem.length || (ptrs.right / 4) + len > mem.length) {
                // Memory too small? This shouldn't happen if initialized correctly, 
                // but prevents crash if WASM state is corrupted
                return true;
            }

            // COPY INPUTS (Safe)
            mem.set(input[0].subarray(0, len), ptrs.left / 4);
            mem.set((input[1] || input[0]).subarray(0, len), ptrs.right / 4);

            // WASM PROCESSING
            wasm.cwtanalyzer_process(
                analyzerPtr,
                ptrs.left, len,
                ptrs.right, len,
                ptrs.levels, 256,
                ptrs.pans, 128,
                ptrs.confidence, 128
            );

            // READING OUTPUTS (Safe View Creation)
            // We create new TypedArrays on the SAME buffer. 
            // NOTE: If wasm grew during process(), mem might be detached again.
            // But standard WASM C functions usually don't grow memory implicitly unless allocating.
            // Our process function does NO allocation.

            // Bounds check for outputs
            if ((ptrs.levels / 4) + 256 > mem.length || (ptrs.pans / 4) + 128 > mem.length) {
                return true;
            }

            // ЗДЕСЬ БЫЛА УТЕЧКА FPS (PostMessage 375 раз в секунду при 48kHz / 128 сэмплов).
            // Оптимизируем отправку: используем накопитель, чтобы точно попадать в targetFps (Sample-Accurate)
            // ✅ СИНХРОНИЗАЦИЯ РЕЗОНАНСА (v253): Троттлинг под частоту экрана.
            // Теперь мы не спамим сообщениями, а подстраиваемся под герцовку монитора пользователя.
            if (this._sampleAccumulator === undefined) this._sampleAccumulator = 0;
            this._sampleAccumulator += len; 

            // Используем targetFps, который мы замерили на старте (по умолчанию 60).
            const targetFps = this._targetFps || 60; 
            const samplesPerFrame = this._sampleRate / targetFps;

            if (this._sampleAccumulator >= samplesPerFrame) {
                // Вычитаем ровно столько, сколько "потребил" один кадр отрисовки,
                // сохраняя остаток для следующего цикла (jitter protection)
                this._sampleAccumulator = Math.min(this._sampleAccumulator - samplesPerFrame, samplesPerFrame);
                
            // Извлекаем слайсы только тогда, когда пора отправлять
            const levels = new Float32Array(mem.buffer, ptrs.levels, 256).slice(); 
            const angles = new Float32Array(mem.buffer, ptrs.pans, 128).slice();
            const confidence = new Float32Array(mem.buffer, ptrs.confidence, 128).slice();

            // DIAGNOSTIC: проверить первые 4 значения levels
            if (!this._diagLogged) {
                this._diagLogged = true;
                const sample = Array.from(levels.slice(0, 8));
                const inputSample = Array.from(input[0].slice(0, 8));
                const inputRms = Math.sqrt(input[0].reduce((s, v) => s + v*v, 0) / input[0].length);
                console.log('[CwtWorklet] DIAGNOSTIC:', {
                    levelsFirst8: sample,
                    inputFirst8: inputSample,
                    inputRMS: inputRms.toFixed(6),
                    analyzerPtr,
                    sampleRate: this._sampleRate,
                    targetFps: this._targetFps,
                    ptrs: { left: ptrs.left, right: ptrs.right, levels: ptrs.levels, pans: ptrs.pans },
                    memLength: mem.length
                });
            }

            this.port.postMessage({
                    type: 'AUDIO_DATA',
                    levels,
                    angles,
                    confidence,
                    timestamp: (typeof currentTime !== 'undefined') ? currentTime : 0
                });
            }

        } catch (e) {
            // Молчаливая обработка ошибок: логируем раз в 5 секунд, чтобы не спамить
            if (this._hb % 300 === 0) {
                this.port.postMessage({
                    type: 'WASM_ERROR',
                    error: `PROCESS_ERROR: ${e.message || e.toString()}`
                });
            }
        }

        return true;
    }
}

registerProcessor('cwt-processor', CwtProcessor);
