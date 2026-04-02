#!/bin/bash
# holocore/build_enkephalon.sh
# Скрипт сборки Enkephalon WASM модуля с динамическим FPS
# 
# ПАЙПЛАЙН:
# 1. Проверка наличия Rust и wasm-pack
# 2. Сборка holocore (включает brain.rs) в WASM
# 3. Копирование результата в public/wasm/
# 4. Обновление версии в version.json
#
# ОСОБЕННОСТИ:
# - brain.rs экспортирует функции: brain_new, brain_encode, brain_recall, brain_learn, brain_decay, brain_total_params, brain_export_weights, brain_import_weights
# - Все функции используют Pure WASM API (#[no_mangle], работа с указателями)
# - FPS передаётся динамически через параметры инициализации
# - wasm-opt ОТКЛЮЧЁН из-за ошибки с bulk memory на Windows

set -e

echo "🧠 Сборка Enkephalon WASM модуля..."
echo "========================================"

# 1. Проверка Rust
if ! command -v rustc &> /dev/null; then
    echo "❌ Rust не установлен. Установите через: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
    exit 1
fi
echo "✅ Rust версия: $(rustc --version)"

# 2. Проверка wasm-pack
if ! command -v wasm-pack &> /dev/null; then
    echo "❌ wasm-pack не установлен. Установите через: cargo install wasm-pack"
    exit 1
fi
echo "✅ wasm-pack версия: $(wasm-pack --version)"

# 3. Проверка целевой архитектуры wasm32
if ! rustup target list --installed | grep -q "wasm32-unknown-unknown"; then
    echo "📦 Установка целевой архитектуры wasm32..."
    rustup target add wasm32-unknown-unknown
fi

# 4. Сборка
echo "🚀 Запуск wasm-pack build..."
cd "$(dirname "$0")"

# Добавляем wasm-bindgen в Cargo.toml если нет
if ! grep -q "wasm-bindgen" Cargo.toml; then
    echo "📦 Добавление wasm-bindgen в зависимости..."
    sed -i 's/rustfft = "6.1"/rustfft = "6.1"\nwasm-bindgen = "0.2"/' Cargo.toml
fi

# Отключаем wasm-opt для Windows
if ! grep -q "wasm-opt = false" Cargo.toml; then
    echo "📦 Отключение wasm-opt для совместимости..."
    echo '[package.metadata.wasm-pack.profile.release]' >> Cargo.toml
    echo 'wasm-opt = false' >> Cargo.toml
fi

wasm-pack build --target web --out-dir pkg

# 5. Проверка результата
if [ -f "pkg/holographic_core_bg.wasm" ]; then
    echo "✅ WASM файл создан: pkg/holographic_core_bg.wasm"
    ls -lh pkg/
else
    echo "❌ Ошибка: WASM файл не найден"
    exit 1
fi

# 6. Копирование в public/wasm
echo "📦 Копирование в public/wasm..."
mkdir -p ../public/wasm
cp pkg/holographic_core_bg.wasm ../public/wasm/
cp pkg/holographic_core.js ../public/wasm/

echo ""
echo "========================================"
echo "✅ Enkephalon WASM готов!"
echo ""
echo "Функции brain.rs в сборке:"
echo "  - brain_new(input_dim, embedding_dim, intent_dim, seed)"
echo "  - brain_encode(ptr, input_ptr, input_len, output_ptr, output_len)"
echo "  - brain_recall(ptr, emb_ptr, emb_len, output_ptr, output_len)"
echo "  - brain_learn(ptr, emb_ptr, emb_len, intent_ptr, intent_len)"
echo "  - brain_decay(ptr)"
echo "  - brain_total_params(ptr)"
echo "  - brain_export_weights(ptr, output_ptr, output_len)"
echo "  - brain_import_weights(ptr, data_ptr, data_len)"
echo "========================================"
