# Warden Security Skill

## Версия: 1.0.0
## Дата создания: 13.05.2026
## Назначение: Чеклист human review для AI-агентов перед модификацией критического кода

---

## 🎯 Цель

**Warden Security** — это skill для AI-агентов, который обеспечивает:
1. Автоматическую идентификацию красных зон
2. Оценку риска модификации
3. Подготовку diff для human review
4. Чеклист безопасности перед деплоем

---

## 🔍 ПРОЦЕДУРА WARDEN CHECK

### Этап 1: Идентификация зоны риска

Перед модификацией файла агент ОБЯЗАН выполнить:

```bash
# Проверка, является ли файл красной зоной
FILE_PATH="backend/auth/security.py"  # Пример

# Красные зоны (STOP: требуется ✅ Принято)
echo "$FILE_PATH" | grep -E "backend/auth|backend/core/db|backend/db|scripts/deploy|\.github/workflows|wallet\.py|tonconnect\.js|telegram\.js|\.env\."

# Жёлтые зоны (CAUTION: требуется верификация)
echo "$FILE_PATH" | grep -E "tria_rag_service|hologramRenderer|GestureSynthesizer|sync_knowledge_base"

# Зелёные зоны (OK: автономная модификация)
echo "$FILE_PATH" | grep -E "js/ui|css|docs|README|\.agent/skills|utils"
```

**Результат:**
- **Красная зона** → Переход к Этапу 2 (Human Review)
- **Жёлтая зона** → Переход к Этапу 3 (Верификация)
- **Зелёная зона** → Автономная модификация разрешена

---

### Этап 2: Human Review (Красные зоны)

Если файл в красной зоне, агент ОБЯЗАН:

#### 2.1. Прочитать текущее состояние
```bash
# Прочитать файл полностью
cat "$FILE_PATH"
```

#### 2.2. Подготовить точечный diff
```markdown
## 📋 ЗАПРОС НА МОДИФИКАЦИЮ КРАСНОЙ ЗОНЫ

**Файл:** `backend/auth/security.py`  
**Зона риска:** 🔴 Красная (Аутентификация)  
**Причина изменения:** Добавление rate limiting для JWT refresh endpoint

### Текущий код (строки 45-52):
\`\`\`python
@router.post("/refresh")
async def refresh_token(token: str):
    payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    new_token = create_access_token(payload["sub"])
    return {"access_token": new_token}
\`\`\`

### Предлагаемый код:
\`\`\`python
@router.post("/refresh")
@limiter.limit("5/minute")  # Rate limiting: 5 requests per minute
async def refresh_token(token: str, request: Request):
    payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    new_token = create_access_token(payload["sub"])
    return {"access_token": new_token}
\`\`\`

### Обоснование:
- Защита от brute-force атак на refresh endpoint
- Стандарт OWASP: rate limiting для auth endpoints
- Не ломает существующий flow (backward compatible)

### Риски:
- ⚠️ Легитимные пользователи могут получить 429 при частых обновлениях
- ✅ Митигация: лимит 5/min достаточен для нормального использования

### Верификация:
- [ ] Проверено на staging
- [ ] Логи не содержат секретов
- [ ] Backward compatibility сохранена

**Жду `✅ Принято` для применения.**
```

#### 2.3. Дождаться подтверждения
Агент НЕ ПРИМЕНЯЕТ изменения до получения `✅ Принято` от НейроКодера.

---

### Этап 3: Верификация (Жёлтые зоны)

Если файл в жёлтой зоне, агент может модифицировать, но ОБЯЗАН:

#### 3.1. Применить изменения
```bash
# Применить diff через str_replace или fs_write
```

#### 3.2. Запустить pre-deploy check
```bash
node scripts/pre-deploy-check.js
```

#### 3.3. Показать результат
```markdown
## ✅ ВЕРИФИКАЦИЯ ЖЁЛТОЙ ЗОНЫ

**Файл:** `backend/tria_agents/tria_rag_service.py`  
**Изменение:** Добавлено кеширование эмбеддингов

### Pre-deploy check:
\`\`\`
✅ Syntax check passed
✅ No hardcoded secrets found
✅ Import structure valid
⚠️ Warning: New dependency 'redis' added (requires update in requirements.txt)
\`\`\`

### Действия:
- [x] Добавлено `redis==5.0.0` в `backend/requirements.txt`
- [x] Обновлена документация в `docs/ARCH/RU/RAG_Caching.md`

**Готово к коммиту.**
```

---

## 📊 МЕТРИКИ РИСКА

Агент ОБЯЗАН оценить риск модификации по шкале:

| Уровень | Описание | Действие |
|---------|----------|----------|
| 🟢 **LOW** | UI, docs, utils | Автономная модификация |
| 🟡 **MEDIUM** | RAG, gesture, 3D | Модификация + верификация |
| 🔴 **HIGH** | Auth, DB, deploy | Human review обязателен |
| 🚨 **CRITICAL** | Секреты, платежи | Human review + security audit |

### Примеры оценки:

**Пример 1: Изменение цвета кнопки**
- Файл: `style.css`
- Зона: 🟢 Зелёная
- Риск: 🟢 LOW
- Действие: Автономная модификация

**Пример 2: Оптимизация RAG запросов**
- Файл: `backend/tria_agents/tria_rag_service.py`
- Зона: 🟡 Жёлтая
- Риск: 🟡 MEDIUM
- Действие: Модификация + `pre-deploy-check.js`

**Пример 3: Изменение JWT алгоритма**
- Файл: `backend/auth/security.py`
- Зона: 🔴 Красная
- Риск: 🚨 CRITICAL
- Действие: Human review + security audit

---

## 🛡️ ЧЕКЛИСТ БЕЗОПАСНОСТИ

Перед коммитом агент ОБЯЗАН проверить:

### Общие проверки:
- [ ] Нет хардкода секретов (`API_KEY`, `TOKEN`, `PASSWORD`)
- [ ] Нет `console.log()` / `print()` с чувствительными данными
- [ ] Нет закомментированного кода с секретами
- [ ] `.env.local` не добавлен в git
- [ ] `pre-deploy-check.js` прошёл успешно

### Для красных зон:
- [ ] Получено `✅ Принято` от НейроКодера
- [ ] Diff показан полностью (без сокращений)
- [ ] Обоснование изменения документировано
- [ ] Риски идентифицированы и митигированы
- [ ] Backward compatibility проверена

### Для жёлтых зон:
- [ ] `pre-deploy-check.js` прошёл без ошибок
- [ ] Warnings (если есть) объяснены
- [ ] Новые зависимости добавлены в `requirements.txt` / `package.json`
- [ ] Документация обновлена

---

## 🚨 ПРАВИЛО ОСТАНОВКИ

Агент ОБЯЗАН немедленно остановиться, если:

1. **Обнаружен секрет в коде:**
   ```python
   # ❌ STOP: Хардкод секрета
   GOOGLE_API_KEY = "AIzaSyC..."
   ```

2. **Модификация красной зоны без разрешения:**
   ```bash
   # ❌ STOP: Красная зона без ✅ Принято
   str_replace backend/auth/security.py ...
   ```

3. **Логирование чувствительных данных:**
   ```javascript
   // ❌ STOP: Логирование JWT
   console.log("User token:", jwt_token);
   ```

4. **Удаление критических файлов:**
   ```bash
   # ❌ STOP: Удаление деплой-скрипта
   rm scripts/deploy.js
   ```

**Действие при остановке:**
1. Показать НейроКодеру причину остановки
2. Дождаться инструкций
3. НЕ ПРИМЕНЯТЬ изменения

---

## 📚 ИНТЕГРАЦИЯ С DEPLOY WORKFLOW

Warden check интегрирован в `scripts/deploy.js`:

```javascript
// scripts/deploy.js (фрагмент)

// Шаг 1: Pre-deploy check (включает Warden)
console.log("🛡️ Running Warden Security Check...");
execSync("node scripts/pre-deploy-check.js", { stdio: "inherit" });

// Шаг 2: Проверка красных зон в diff
const diff = execSync("git diff --name-only HEAD").toString();
const redZones = diff.match(/backend\/auth|backend\/core\/db|scripts\/deploy|\.github\/workflows/);

if (redZones) {
  console.error("🚨 STOP: Red zone files detected in commit:");
  console.error(redZones);
  console.error("Human review required. Aborting deploy.");
  process.exit(1);
}

// Шаг 3: Продолжение деплоя...
```

---

## 🎓 ОБУЧЕНИЕ АГЕНТОВ

### Для новых агентов:

1. **Прочитать:**
   - [security-zones.md](.agent/instructions/security-zones.md)
   - [global.md](.agent/instructions/global.md)
   - [AGENTS.md](../../AGENTS.md)

2. **Практика:**
   - Идентифицировать зону риска для 10 файлов
   - Подготовить diff для красной зоны
   - Запустить `pre-deploy-check.js` для жёлтой зоны

3. **Тест:**
   - Попытаться модифицировать `backend/auth/security.py` без разрешения → STOP
   - Попытаться залогировать `GOOGLE_API_KEY` → STOP
   - Модифицировать `style.css` → OK

---

## 📞 КОНТАКТЫ

**Вопросы по Warden Security:**
- НейроКодер (neurocoderz@gmail.com)
- GitHub Issues: https://github.com/neurocoderz/holograms.media/issues

**Обновления skill:**
- Версия 1.0.0 (13.05.2026) — Initial release
- Следующая версия: TBD (автоматизация Warden check через pre-commit hook)

---

**Последнее обновление:** 13.05.2026  
**Автор:** Claude 4.5 Sonnet (Foundation & Safety Sprint v0.20.492)  
**Статус:** Активно
