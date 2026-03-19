#!/bin/bash
# Скрипт сборки WASM модуля holographic_core

echo "🚀 Сборка holographic_core WASM модуля..."

# Проверяем наличие wasm-pack
if ! command -v wasm-pack > /dev/null 2>&1; then
    echo "❌ wasm-pack не установлен. Установите его:"
    echo "cargo install wasm-pack"
    exit 1
fi

# Сборка для веб
wasm-pack build --target web --out-dir pkg

echo "✅ Сборка завершена! Файлы в core/pkg/"
