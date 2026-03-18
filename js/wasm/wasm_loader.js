let _cachedInstance = null;

export async function loadWasmModule(moduleName) {
    try {
        if (_cachedInstance) return _cachedInstance.exports;

        const wasmPath = `/wasm/${moduleName}`;
        const response = await fetch(wasmPath);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const bytes = await response.arrayBuffer();

        // Безопасный вариант инициализации: 
        // 1. Пробуем без импортов (Rust Pure WASM обычно экспортирует свою память)
        // 2. Если падает с LinkError — пробуем с импортом env.memory
        let result;
        try {
            result = await WebAssembly.instantiate(bytes, {});
        } catch (e) {
            if (e instanceof WebAssembly.LinkError || e.message.includes('import')) {
                console.warn('[WasmLoader] Чистая инициализация не удалась, пробуем с env.memory');
                result = await WebAssembly.instantiate(bytes, {
                    env: {
                        memory: new WebAssembly.Memory({ initial: 256, maximum: 512 })
                    }
                });
            } else {
                throw e;
            }
        }
        
        _cachedInstance = result.instance;
        console.log(`[WasmLoader] WASM-модуль "${moduleName}" успешно загружен и инстанциирован.`);
        return _cachedInstance.exports;
    } catch (error) {
        console.error(`Ошибка при загрузке WASM-модуля "${moduleName}":`, error);
        throw error;
    }
}

/**
 * Возвращает уже загруженный инстанс WASM.
 */
export function getWasmInstance() {
    return _cachedInstance;
}
