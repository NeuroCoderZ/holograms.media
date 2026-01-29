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
## 🛠️ Пайплайн Деплоя (Best Practices)

### 1. Подготовка (Pre-flight)
- **WSL:** Убедиться, что работа идет в WSL (Bash).
- **Lock-file:** Проверить наличие `package-lock.json` в репозитории (критично для `npm ci` в CI).
- **Secrets:** Убедиться, что в GitHub Secrets добавлены `CLOUDFLARE_API_TOKEN` и `CLOUDFLARE_ACCOUNT_ID`.

### 2. Сборка и Деплой (Execution)
- **GitHub Actions First:** Не использовать встроенный авто-билдер Cloudflare Pages (он ненадежен). Использовать кастомный workflow (например, `cloudflare-deploy.yml`) с явным шагом `wrangler deployment`.
- **Ручной запуск:** Если авто-триггер не сработал, использовать:
  ```bash
  gh workflow run cloudflare-deploy.yml --ref master
  ```

### 3. Верификация (Verification Protocol)
- **Тайминг:** После запуска ждать минимум **60 секунд** перед проверкой.
- **Мониторинг CI:**
  ```bash
  gh run list --workflow=cloudflare-deploy.yml --limit 1
  ```
- **Проверка HTTP (Fast Check):**
  - Проверять не только `200 OK`, но и `Content-Type`.
  - Для WASM критично наличие `application/wasm`.
  ```bash
  curl -I https://holograms.media/wasm/file.wasm
  ```
- **Логи:** При ошибках смотреть `gh run view <run-id> --log`.
