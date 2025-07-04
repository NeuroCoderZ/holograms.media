// frontend/js/wasm/wasm_loader.js (примерная реализация)
export async function loadWasmModule(moduleName) {
    try {
        const wasmPath = `/js/wasm/${moduleName}`;
        const response = await fetch(wasmPath);
        const bytes = await response.arrayBuffer();
        const { instance } = await WebAssembly.instantiate(bytes);
        console.log(`WASM-модуль "${moduleName}" успешно загружен и инстанциирован.`);
        return instance.exports;
    } catch (error) {
        console.error(`Ошибка при загрузке WASM-модуля "${moduleName}":`, error);
        throw error;
    }
}
