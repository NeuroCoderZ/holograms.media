---
name: holograms-media-deploy
description: Правила развертывания на Cloudflare и Koyeb.
---

# 🚀 Deployment Rules

## ☁️ Инфраструктура
- **Cloudflare Pages:** Фронтенд.
- **Koyeb:** Бэкенд (FastAPI).

## 🛡️ Секреты
- Использовать `.env.local`.
- Не выводить значения ключей в чат.
- Для проверки связи использовать `curl.exe` (в Windows/PowerShell).

## 🛠️ Команды
- Всегда проверять статус API перед деплоем через `curl.exe`.
