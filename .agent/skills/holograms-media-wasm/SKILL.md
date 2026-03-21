---
name: holograms-media-wasm
description: Инструкции по сборке и оптимизации Rust/WASM модулей.
---

# 🦀 WASM & Rust Rules

## 🏗️ Сборка
- Использовать скрипт сборки (если есть) или стандартные методы оптимизации.
- **Принцип:** Сборка — это «черный ящик». Агент должен знать вход и выход, не перечитывая весь Cargo.toml без нужды.

## 🧮 Математика
- Модуль `holographic_core` — приоритетный.
- Учитывать кэширование FFT и обработку стерео (2 канала).

## ⚠️ Pure WASM — обязательные ограничения
- НЕТ wasm-bindgen. Это cdylib без wasm-bindgen.
- Экспорт: `#[no_mangle] pub extern "C" fn имя(...)`
- Сборка: `wasm-pack build --target web --release` в `holocore/`
- Перед сборкой: `wasm-pack --version`
- Нельзя: std::collections, std::sync — только no_std-совместимый код
