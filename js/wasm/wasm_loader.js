export async function loadWasmModule(moduleName) {
    try {
        const wasmPath = `/js/wasm/${moduleName}`;
        const response = await fetch(wasmPath);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const bytes = await response.arrayBuffer();

        // Some WASM modules (like cwt_analyzer) require an imports object
        const { instance } = await WebAssembly.instantiate(bytes, {});
        console.log(`WASM-модуль "${moduleName}" успешно загружен и инстанциирован.`);
        return instance.exports;
    } catch (error) {
        console.error(`Ошибка при загрузке WASM-модуля "${moduleName}":`, error);
        throw error;
    }
}
